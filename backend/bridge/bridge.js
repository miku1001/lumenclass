/**
 * LumenClass MQTT → Supabase bridge
 *
 * Runs on the same machine as the Mosquitto broker.
 * Subscribes to ESP8266 sensor topics and writes to Supabase.
 *
 * Start: node bridge.js
 * Keep alive: pm2 start bridge.js --name lumenclass-bridge
 *
 * Events recorded:
 *   • Zone occupancy / lights ON-OFF
 *   • Significant brightness transitions (dim / moderate / bright)
 *   • ESP8266 connection status changes
 *   • Supabase connection recovery (with downtime duration)
 */

import 'dotenv/config'
import mqtt from 'mqtt'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'

// ── Supabase client (secret key — server only, never in frontend) ─
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
)

// ── MQTT connection ───────────────────────────────────────────────
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId:        'lumenclass-bridge',
  reconnectPeriod: 3000,
})

// ── State tracking ────────────────────────────────────────────────
const ZONE_NAMES        = ['A', 'B', 'C', 'D']
let prevZoneStates      = null
let prevBrightnessLevel = null
let supabaseDownSince   = null  // timestamp when Supabase first became unreachable
const pendingEvents     = []    // events queued during Supabase downtime
let flushInterval       = null  // handle for the retry interval

// ── Persistent offline queue ──────────────────────────────────────
// Survives bridge restarts: events queued while Supabase was down are
// written to queue.json and reloaded on the next startup.
const QUEUE_FILE = new URL('./queue.json', import.meta.url).pathname

function saveQueue() {
  writeFileSync(QUEUE_FILE, JSON.stringify({ downSince: supabaseDownSince, events: pendingEvents }), 'utf8')
}

function clearQueue() {
  try { unlinkSync(QUEUE_FILE) } catch {}
}

// Load any events that were queued before a previous process exit
if (existsSync(QUEUE_FILE)) {
  try {
    const saved = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'))
    if (Array.isArray(saved.events) && saved.events.length) {
      pendingEvents.push(...saved.events)
      supabaseDownSince = saved.downSince ?? Date.now()
      console.log(`[bridge] Loaded ${pendingEvents.length} offline event(s) from disk — will flush on reconnect`)
      scheduleFlush()
    }
  } catch (e) {
    console.warn('[bridge] Could not read queue file:', e.message)
  }
}

// ── Brightness thresholds ─────────────────────────────────────────
const BRIGHTNESS_LEVELS = [
  { label: 'dim',      min: 0,   max: 300 },
  { label: 'moderate', min: 300, max: 700 },
  { label: 'bright',   min: 700, max: Infinity },
]

function brightnessLevel(lux) {
  return BRIGHTNESS_LEVELS.find(t => lux >= t.min && lux < t.max)?.label ?? null
}

// ── MQTT event handlers ───────────────────────────────────────────

mqttClient.on('connect', () => {
  console.log('[bridge] Connected to MQTT broker')
  mqttClient.subscribe('lumenclass/sensor/state')
  mqttClient.subscribe('lumenclass/status')
})

mqttClient.on('reconnect', () => console.log('[bridge] Reconnecting to MQTT…'))
mqttClient.on('error',     err => console.error('[bridge] MQTT error:', err.message))

mqttClient.on('message', async (topic, message) => {
  // ── ESP8266 connection status ─────────────────────────────────
  if (topic === 'lumenclass/status') {
    const status = message.toString()
    console.log(`[bridge] ESP8266 status: ${status}`)

    if (status === 'offline') {
      await logEvent('warn', 'ESP8266 disconnected',
        'The device is no longer reachable')
    } else if (status === 'online') {
      await logEvent('ok', 'ESP8266 connected',
        'The device is online and transmitting live data.')
    }
    return
  }

  if (topic !== 'lumenclass/sensor/state') return

  // ── Parse sensor payload ──────────────────────────────────────
  let data
  try { data = JSON.parse(message.toString()) } catch { return }

  // ── Zone occupancy: lights ON / OFF ───────────────────────────
  if (prevZoneStates) {
    for (let i = 0; i < (data.zones?.length ?? 0); i++) {
      const cur  = data.zones[i]
      const prev = prevZoneStates[i]
      if (!prev || cur.on === prev.on) continue

      const name = `Zone ${ZONE_NAMES[i] ?? i}`
      if (cur.on) {
        await logEvent('info', `${name} lights ON`,
          'Occupancy detected — motion-triggered activation.')
      } else {
        await logEvent('ok', `${name} lights OFF`,
          'No motion detected — zone returned to standby.')
      }
    }
  }
  prevZoneStates = data.zones ?? null

  // ── Brightness transitions ────────────────────────────────────
  const level = brightnessLevel(data.lux)
  if (level && level !== prevBrightnessLevel) {
    if (prevBrightnessLevel !== null) {
      await logEvent('info', `Brightness changed to ${level}`,
        `Ambient light crossed threshold — ${data.lux} lux (${prevBrightnessLevel} → ${level}).`)
    }
    prevBrightnessLevel = level
  }
})

// ── Event logger with queue-and-retry for Supabase downtime ──────
async function logEvent(type, title, body) {
  const event = { type, title, body, inserted_at: new Date().toISOString() }

  // Skip the network round-trip if Supabase is already known to be down
  if (supabaseDownSince) {
    pendingEvents.push(event)
    saveQueue()
    console.warn(`[bridge] Queued (Supabase down): ${title}`)
    return
  }

  const { error } = await supabase.from('alerts').insert(event)

  if (error) {
    console.error('[bridge] Supabase insert error:', error.message)
    supabaseDownSince = Date.now()
    pendingEvents.push(event)
    saveQueue()
    scheduleFlush()
    console.warn('[bridge] Supabase appears down — queuing events and retrying every 30 s')
  } else {
    console.log(`[bridge] Event [${type}]: ${title}`)
  }
}

// Starts a 30-second retry interval (idempotent — safe to call multiple times)
function scheduleFlush() {
  if (flushInterval) return
  flushInterval = setInterval(flushQueue, 30_000)
}

// Attempts to drain pendingEvents; cancels the interval on success
async function flushQueue() {
  if (!pendingEvents.length) {
    clearInterval(flushInterval); flushInterval = null
    supabaseDownSince = null
    return
  }

  console.log(`[bridge] Retrying flush of ${pendingEvents.length} queued event(s)…`)

  // Work through the queue; stop at the first failure so order is preserved
  while (pendingEvents.length) {
    const event = pendingEvents[0]
    const { error } = await supabase.from('alerts').insert(event)
    if (error) {
      console.error('[bridge] Flush attempt failed:', error.message)
      return  // Supabase still down — interval will retry in 30 s
    }
    pendingEvents.shift()
  }

  // Queue fully drained — log the recovery event and stop retrying
  clearInterval(flushInterval); flushInterval = null
  const mins = Math.round((Date.now() - supabaseDownSince) / 60_000)
  supabaseDownSince = null
  clearQueue()

  await supabase.from('alerts').insert({
    type:  'warn',
    title: 'Supabase connection restored',
    body:  `Cloud database reconnected after ~${mins} minute${mins !== 1 ? 's' : ''}. All events from the downtime period have been saved.`,
  })

  console.log('[bridge] Queue flushed — all events saved')
}

console.log('[bridge] LumenClass MQTT→Supabase bridge starting…')
console.log(`[bridge] Broker: ${process.env.MQTT_BROKER_URL}`)
console.log(`[bridge] Supabase: ${process.env.SUPABASE_URL}`)
