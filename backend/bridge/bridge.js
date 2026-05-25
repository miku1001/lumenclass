/**
 * LumenClass MQTT → Supabase bridge
 *
 * Runs on the same machine as the Mosquitto broker.
 * Subscribes to ESP8266 sensor topics and writes to Supabase.
 *
 * Start: node bridge.js
 * Keep alive: pm2 start bridge.js --name lumenclass-bridge
 */

import 'dotenv/config'
import mqtt from 'mqtt'
import { createClient } from '@supabase/supabase-js'

// ── Supabase client (service key — server only, never in frontend) ─
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

// ── MQTT connection ───────────────────────────────────────────────
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId:        'lumenclass-bridge',
  reconnectPeriod: 3000,
})

// ── Downsampling: write one sensor row every 10 s ─────────────────
const WRITE_EVERY_MS = 10_000
let lastWriteTs    = 0
let prevZoneStates = null   // track previous zone states to detect changes

// ── MQTT event handlers ───────────────────────────────────────────

mqttClient.on('connect', () => {
  console.log('[bridge] Connected to MQTT broker')
  mqttClient.subscribe('lumenclass/sensor/state')
  mqttClient.subscribe('lumenclass/status')
})

mqttClient.on('reconnect', () => console.log('[bridge] Reconnecting to MQTT…'))
mqttClient.on('error',     err => console.error('[bridge] MQTT error:', err.message))

mqttClient.on('message', async (topic, message) => {
  // ── Device online / offline ─────────────────────────────────────
  if (topic === 'lumenclass/status') {
    const status = message.toString()
    console.log(`[bridge] Device status: ${status}`)

    if (status === 'offline') {
      await insertAlert('warn', 'Edge node went offline',
        'ESP8266 disconnected from the MQTT broker. Lighting continues locally.')
    } else if (status === 'online') {
      await insertAlert('ok', 'Edge node came online',
        'ESP8266 connected to the MQTT broker. Live data stream active.')
    }
    return
  }

  if (topic !== 'lumenclass/sensor/state') return

  // ── Parse sensor payload ────────────────────────────────────────
  let data
  try { data = JSON.parse(message.toString()) } catch { return }

  const now = Date.now()

  // ── Detect and log zone state transitions ───────────────────────
  if (prevZoneStates) {
    for (let i = 0; i < (data.zones?.length ?? 0); i++) {
      const cur  = data.zones[i]
      const prev = prevZoneStates[i]
      if (!prev || cur.on !== prev.on || cur.override !== prev.override) {
        const triggeredBy = cur.override
          ? 'mqtt_cmd'
          : cur.on ? 'pir' : 'hold_expire'

        await supabase.from('zone_events').insert({
          zone_index:   i,
          zone_name:    `Zone ${['A','B','C','D'][i] ?? i}`,
          on_state:     cur.on,
          override:     cur.override,
          triggered_by: triggeredBy,
        })

        // Alert when a zone is manually overridden from the web app
        if (cur.override && !prev?.override) {
          await insertAlert('info',
            `Zone ${['A','B','C','D'][i] ?? i} manually forced ON`,
            'PIR automation bypassed via web dashboard.')
        }
        // Alert when override is cleared (zone returns to auto)
        if (!cur.override && prev?.override) {
          await insertAlert('ok',
            `Zone ${['A','B','C','D'][i] ?? i} returned to auto`,
            'PIR motion detection re-enabled for this zone.')
        }
      }
    }
  }
  prevZoneStates = data.zones ?? null

  // ── Downsample: write sensor row at most once per WRITE_EVERY_MS ─
  if (now - lastWriteTs < WRITE_EVERY_MS) return
  lastWriteTs = now

  const { error } = await supabase.from('sensor_readings').insert({
    lux:       data.lux,
    lux_raw:   data.lux_raw,
    duty:      data.duty,
    occupancy: data.occupancy,
    motion:    data.motion ?? [],
  })

  if (error) console.error('[bridge] Supabase insert error:', error.message)
  else console.log(`[bridge] Wrote sensor row — lux:${data.lux} duty:${data.duty} occ:${data.occupancy}`)
})

// ── Helper ────────────────────────────────────────────────────────
async function insertAlert(type, title, body) {
  const { error } = await supabase.from('alerts').insert({ type, title, body })
  if (error) console.error('[bridge] Alert insert error:', error.message)
  else console.log(`[bridge] Alert [${type}]: ${title}`)
}

console.log('[bridge] LumenClass MQTT→Supabase bridge starting…')
console.log(`[bridge] Broker: ${process.env.MQTT_BROKER_URL}`)
console.log(`[bridge] Supabase: ${process.env.SUPABASE_URL}`)
