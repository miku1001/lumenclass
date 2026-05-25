import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import mqtt from 'mqtt'
import './App.css'
import { supabase } from './supabase.js'

// ─── MQTT BROKER URL ─────────────────────────────────────────
// Set VITE_MQTT_BROKER_URL in .env (e.g. ws://localhost:9001)
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || ''

// ─── CHART HISTORY SETTINGS ──────────────────────────────────
const BUCKET_MS   = 10_000  // one data point per 10 s
const MAX_BUCKETS = 60      // 60 × 10 s = 10-minute rolling window

// ─── DATA ────────────────────────────────────────────────────
// r204 is the room wired to the ESP8266 — its KPIs and zones receive live MQTT data.
const ROOMS = [
  { id: 'r204', label: 'Room 204', sub: 'Floor 2 · East Wing' },
  { id: 'r101', label: 'Room 101', sub: 'Floor 1 · Entrance' },
  { id: 'r305', label: 'Room 305', sub: 'Floor 3 · Lab Wing' },
  { id: 'r212', label: 'Room 212', sub: 'Floor 2 · West Wing' },
  { id: 'r408', label: 'Room 408', sub: 'Floor 4 · Admin' },
]

const ROOM_DATA = {
  r204: {
    title: 'Room 204 — Lighting Overview',
    desc: 'Live daylight & occupancy monitoring with edge-driven automation',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '—',  unit: 'lux',     lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: '—',        trendCls: 'up', val: '—',  unit: 'present', lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'alert', trend: '1 active', trendCls: 'dn', val: '3',  unit: 'today',   lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Front — Left Corner',  meta: 'PIR zone 1',  on: false, dim: 0,  tag: 'AUTO' },
      { id: 'zB', name: 'Front — Right Corner',   meta: 'PIR zone 2',  on: false, dim: 0,  tag: 'AUTO' },
      { id: 'zH', name: 'Back — Right Corner',   meta: 'PIR zone 3',  on: false, dim: 0,  tag: 'AUTO' },
      { id: 'zC', name: 'Back — Left Corner', meta: 'PIR zone 4',  on: false, dim: 0,  tag: 'AUTO' },
    ],
    sensorLux: '—',
    sensorDecision: '—',
    sensorDecisionNote: 'Waiting for edge data…',
  },
  r101: {
    title: 'Room 101 — Lighting Overview',
    desc: 'Entrance area with motion-triggered lighting automation',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '390', unit: 'lux',       lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '8',   unit: 'present',   lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 22%',    trendCls: 'up', val: '2.1', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '0 active',  trendCls: 'up', val: '1',  unit: 'today',     lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Entry',     meta: 'Occupied · full brightness',   on: true,  dim: 100, tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Lobby',     meta: 'Partial motion · dimmed',      on: true,  dim: 55,  tag: 'AUTO' },
      { id: 'zH', name: 'Exit lights',        meta: 'Always on · safety override',  on: true,  dim: 80,  tag: 'AUTO' },
      { id: 'zC', name: 'Zone C — Corridor',  meta: 'Low traffic · standby',        on: true,  dim: 25,  tag: 'AUTO' },
    ],
    sensorLux: '390',
    sensorDecision: 'Full ON → 100%',
    sensorDecisionNote: 'Low daylight, occupancy high',
  },
  r305: {
    title: 'Room 305 — Lighting Overview',
    desc: 'Lab wing with precision dimming for sensitive equipment',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '610', unit: 'lux',       lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '14',  unit: 'present',   lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 45%',    trendCls: 'up', val: '6.2', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '2 active',  trendCls: 'dn', val: '5',  unit: 'today',     lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'C1', name: 'Corner-1', meta: 'meta', on: true,  dim: 50, tag: 'AUTO' },
      { id: 'C2', name: 'Corner-2', meta: 'meta', on: true,  dim: 15, tag: 'AUTO' },
      { id: 'C3', name: 'Corner-3', meta: 'Neta', on: false, dim: 0,  tag: 'OFF'  },
      { id: 'C4', name: 'Corner-4', meta: 'meta', on: false, dim: 0,  tag: 'OFF'  },
    ],
    sensorLux: '610',
    sensorDecision: 'Dimming → 50%',
    sensorDecisionNote: 'Moderate daylight in lab area',
  },
  r212: {
    title: 'Room 212 — Lighting Overview',
    desc: 'West wing classroom with afternoon sun exposure',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'BRIGHT',   trendCls: 'up', val: '920', unit: 'lux',       lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '31',  unit: 'present',   lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 61%',    trendCls: 'up', val: '8.8', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '0 active',  trendCls: 'up', val: '0',  unit: 'today',     lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Front',  meta: 'High daylight · heavily dimmed',    on: true, dim: 15, tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Rear',   meta: 'Good daylight · moderately dimmed', on: true, dim: 30, tag: 'AUTO' },
      { id: 'zH', name: 'Hallway',         meta: 'Occupied · auto-level',             on: true, dim: 60, tag: 'AUTO' },
      { id: 'zC', name: 'Zone C — Window', meta: 'Direct sun · deep dimming',         on: true, dim: 10, tag: 'AUTO' },
    ],
    sensorLux: '920',
    sensorDecision: 'Dimming → 15%',
    sensorDecisionNote: 'Peak afternoon sun — max saving',
  },
  r408: {
    title: 'Room 408 — Lighting Overview',
    desc: 'Admin office on top floor with skylight access',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '540', unit: 'lux',       lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'LOW OCC',   trendCls: 'dn', val: '4',   unit: 'present',   lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 53%',    trendCls: 'up', val: '5.4', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '1 active',  trendCls: 'dn', val: '2',  unit: 'today',     lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Desks',   meta: 'Occupied · auto-dimmed',        on: true, dim: 40, tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Meeting', meta: 'Unoccupied · standby mode',     on: true, dim: 10, tag: 'AUTO' },
      { id: 'zH', name: 'Stairwell',        meta: 'Safety light · always active',  on: true, dim: 70, tag: 'AUTO' },
      { id: 'zC', name: 'Zone C — Archive', meta: 'Low use · dimmed',              on: true, dim: 20, tag: 'AUTO' },
    ],
    sensorLux: '540',
    sensorDecision: 'Dimming → 40%',
    sensorDecisionNote: 'Skylight assists ambient level',
  },
}

// ─── ICONS ───────────────────────────────────────────────────
const Icon = ({ name, ...props }) => {
  const icons = {
    sun: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" strokeLinecap="round"/>
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <circle cx="9" cy="8" r="3"/>
        <circle cx="17" cy="9" r="2.4"/>
        <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 18c0-2 1.5-3.5 4-3.5s4 1.3 4 3.3" strokeLinecap="round"/>
      </svg>
    ),
    zap: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round"/>
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
      </svg>
    ),
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <rect x="3" y="3" width="7" height="9" rx="1.5"/>
        <rect x="14" y="3" width="7" height="5" rx="1.5"/>
        <rect x="14" y="12" width="7" height="9" rx="1.5"/>
        <rect x="3" y="16" width="7" height="5" rx="1.5"/>
      </svg>
    ),
    analytics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M3 17l5-6 4 3 5-7 4 5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    zone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M12 2 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-5Z" strokeLinejoin="round"/>
      </svg>
    ),
    devices: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a8 8 0 0 0-1.7 1l-2.4-1-2 3.5L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.4 2.5h4l.4-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5Z"/>
      </svg>
    ),
    bulb: (color = '#C97E05') => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    chevronDown: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 8v.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    warn: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
        <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round"/>
        <path d="M12 9v4M12 17h.01" strokeLinecap="round"/>
      </svg>
    ),
    moon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    sunSmall: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
      </svg>
    ),
    lightThreshold: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2" strokeLinecap="round"/>
      </svg>
    ),
    edgeDecision: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z"/>
        <path d="M9 21h6" strokeLinecap="round"/>
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 2" strokeLinecap="round"/>
      </svg>
    ),
    cloud: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    roomPin: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round"/>
        <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/>
        <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/>
      </svg>
    ),
    close: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
        <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
        <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
      </svg>
    ),
  }
  return icons[name] || null
}

// ─── CLOCK ───────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds()
      const ap = h >= 12 ? 'PM' : 'AM'
      h = h % 12 || 12
      const p = n => String(n).padStart(2, '0')
      setTime(`${p(h)}:${p(m)}:${p(s)} ${ap}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ─── MQTT HOOK ───────────────────────────────────────────────
// Connects to the broker via WebSocket (required for browsers).
// Returns live sensor state published by the ESP8266 and a
// function to send zone override commands back to it.
function useMQTT(brokerUrl) {
  const [status, setStatus]         = useState('disconnected')
  const [liveData, setLiveData]     = useState(null)
  const [espStatus, setEspStatus]   = useState(null) // 'online' | 'offline' | null (unknown)
  const clientRef                   = useRef(null)

  const publishZoneCmd = useCallback((zoneIndex, on) => {
    const client = clientRef.current
    if (client?.connected) {
      // on=true  → force LED on (override active)
      // on=false → send null, which clears the override and returns zone to PIR auto
      client.publish(
        `lumenclass/zone/${zoneIndex}/cmd`,
        JSON.stringify({ on: on ? true : null }),
        { qos: 1 },
      )
    }
  }, [])

  useEffect(() => {
    if (!brokerUrl) return

    const client = mqtt.connect(brokerUrl, {
      clientId:        `lumenclass-web-${Math.random().toString(16).slice(2, 8)}`,
      keepalive:       60,
      reconnectPeriod: 3000,
    })
    clientRef.current = client
    setStatus('connecting')

    client.on('connect', () => {
      setStatus('connected')
      client.subscribe('lumenclass/sensor/state')
      client.subscribe('lumenclass/status')
    })

    client.on('message', (topic, message) => {
      if (topic === 'lumenclass/sensor/state') {
        try { setLiveData(JSON.parse(message.toString())) } catch {}
      } else if (topic === 'lumenclass/status') {
        const s = message.toString()
        if (s === 'online' || s === 'offline') setEspStatus(s)
      }
    })

    // Browser WebSocket events — do NOT reset espStatus here.
    // The ESP8266's broker connection is independent of the browser's connection.
    client.on('reconnect', () => setStatus('connecting'))
    client.on('error',     () => setStatus('error'))
    client.on('offline',   () => setStatus('disconnected'))
    client.on('close',     () => setStatus('disconnected'))

    return () => { client.end() }
  }, [brokerUrl])

  return { status, liveData, espStatus, publishZoneCmd }
}

// ─── ZONE CARD ───────────────────────────────────────────────
// onToggle(newOn) — optional; when provided the toggle publishes
// an MQTT override command instead of only updating local state.
function ZoneCard({ zone, onToggle }) {
  const [on, setOn]   = useState(zone.on)
  const [dim, setDim] = useState(zone.dim)

  useEffect(() => { setOn(zone.on); setDim(zone.dim) }, [zone])

  const handleToggle = () => {
    const next = !on
    setOn(next)
    onToggle?.(next)
  }

  return (
    <div className={`zone ${on ? 'on' : ''}`}>
      <div className="zone-top">
        <div className="zone-name">
          <span className="zbulb">
            <svg viewBox="0 0 24 24" fill="none" stroke={on ? '#C97E05' : '#9DACB9'} strokeWidth="2">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          {zone.name}
        </div>
        <button className={`toggle-switch ${on ? 'on' : ''}`} onClick={handleToggle} />
      </div>
      <div className="zmeta">{zone.meta}</div>
      <div className="dim-row">
        <span>{on ? `${dim}%` : '0%'}</span>
        <div className="bar">
          <div className="bar-fill" style={{ width: on ? `${dim}%` : '0%' }} />
        </div>
        {zone.tag === 'OFF'
          ? <span className="off-tag">OFF</span>
          : <span className="auto-tag">{zone.tag}</span>
        }
      </div>
    </div>
  )
}

// ─── CHART HISTORY HOOK ──────────────────────────────────────
// Accumulates a rolling MAX_BUCKETS-point history from live MQTT data.
// seed (optional): pre-populated buckets from Supabase to fill history on load.
function useChartHistory(liveData) {
  const histRef = useRef([])
  const [snap, setSnap] = useState([])

  useEffect(() => {
    if (!liveData) return
    const id   = Math.floor(Date.now() / BUCKET_MS)
    const h    = histRef.current
    const last = h[h.length - 1]
    if (last?.id === id) {
      last.lux  = (last.lux  * last.n + liveData.lux)  / (last.n + 1)
      last.duty = (last.duty * last.n + liveData.duty) / (last.n + 1)
      last.n++
    } else {
      h.push({ id, lux: liveData.lux, duty: liveData.duty, n: 1 })
      if (h.length > MAX_BUCKETS) h.shift()
    }
    setSnap(h.slice())
  }, [liveData])

  return snap
}


// ─── SUPABASE: ALERTS ────────────────────────────────────────
const ALERT_ICON   = { ok: 'check', info: 'info', warn: 'warn', error: 'warn' }
const FALLBACK_ALERTS = [
  { id: 1, type: 'ok',   title: 'Zone A auto-dimmed to 35%',           body: 'Daylight crossed 700 lux — ESP8266 reduced output locally.',           inserted_at: null },
  { id: 2, type: 'info', title: 'Hallway light switched OFF',           body: 'No occupancy detected for 12 minutes — local automation turned off.',  inserted_at: null },
  { id: 3, type: 'warn', title: 'Brief connectivity drop — handled',    body: 'Internet lost 47s. Lighting responded locally; synced on reconnect.',  inserted_at: null },
]

function formatAlertTime(iso) {
  if (!iso) return ''
  const d  = new Date(iso)
  let h    = d.getHours(), m = d.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

// Fetches recent alerts from Supabase and subscribes to new inserts in realtime.
// Falls back to FALLBACK_ALERTS when Supabase is not configured.
// Re-fetches the full list every time the channel (re)subscribes so that events
// flushed by the bridge during a downtime period are never missed.
function useAlerts() {
  const [rows, setRows] = useState(supabase ? [] : FALLBACK_ALERTS)

  useEffect(() => {
    if (!supabase) return

    async function fetchAll() {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .order('inserted_at', { ascending: false })
        .limit(200)
      if (data?.length) setRows(data)
    }

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' },
        payload => setRows(prev => [payload.new, ...prev].slice(0, 200))
      )
      .subscribe(status => {
        // Fires on initial connect AND every reconnect — catches events missed during downtime
        if (status === 'SUBSCRIBED') fetchAll()
      })

    return () => supabase.removeChannel(channel)
  }, [])

  return rows
}

// ─── SUPABASE: CONNECTION STATUS ─────────────────────────────
function useSupabaseStatus() {
  const [status, setStatus] = useState(supabase ? 'connecting' : 'disconnected')

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('_status_probe')
      .subscribe(s => {
        if (s === 'SUBSCRIBED')     setStatus('connected')
        else if (s === 'TIMED_OUT' || s === 'CHANNEL_ERROR' || s === 'CLOSED') setStatus('disconnected')
      })
    return () => supabase.removeChannel(channel)
  }, [])

  return status
}

// ─── EDGE PILL ───────────────────────────────────────────────
function EdgePill({ status, edgeLabel }) {
  return (
    <div className="edge-pill">
      <span className={`dot dot--${status}`} />
      <div className="edge-pill-text">
        <b>{edgeLabel}</b>
      </div>
    </div>
  )
}

// ─── CHART HELPERS ───────────────────────────────────────────
const CW = 620, CH = 210, CY_TOP = 20, CY_BOT = 190

function toY(value, maxVal) {
  return CY_BOT - Math.min(value / maxVal, 1) * (CY_BOT - CY_TOP)
}

function buildLinePath(history, getValue, maxVal) {
  if (history.length < 2) return null
  const bw = CW / MAX_BUCKETS
  return history.map((b, i) => {
    const age = history.length - 1 - i
    const x   = (CW - age * bw).toFixed(1)
    const y   = toY(getValue(b), maxVal).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

function buildFillPath(linePath, firstX) {
  return `${linePath} L${CW},${CY_BOT} L${firstX.toFixed(1)},${CY_BOT} Z`
}

// ─── CHART SVG ───────────────────────────────────────────────
// history: array of { lux, duty } bucket objects (from useChartHistory).
// Falls back to a dimmed static illustration when history is empty.
function DaylightChart({ history }) {
  const hasData  = history.length >= 2
  const bw       = CW / MAX_BUCKETS
  const firstX   = CW - (history.length - 1) * bw

  const luxPath  = hasData ? buildLinePath(history, b => b.lux,  1000) : null
  const dutyPath = hasData ? buildLinePath(history, b => b.duty, 1023) : null
  const luxFill  = luxPath  ? buildFillPath(luxPath,  firstX) : null
  const dutyFill = dutyPath ? buildFillPath(dutyPath, firstX) : null

  const last     = history[history.length - 1]
  const luxDotY  = last ? toY(last.lux,  1000) : null
  const dutyDotY = last ? toY(last.duty, 1023) : null

  // Axis labels: 5 evenly spaced clock times across the 10-min window
  const now = Date.now()
  const axisLabels = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const t  = new Date(now - (1 - frac) * MAX_BUCKETS * BUCKET_MS)
    const h  = t.getHours() % 12 || 12
    const m  = String(t.getMinutes()).padStart(2, '0')
    const ap = t.getHours() >= 12 ? 'PM' : 'AM'
    return { x: frac * CW, label: `${h}:${m} ${ap}` }
  })

  return (
    <svg className="chart" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none">
      <line className="gridline" x1="0" y1="20"  x2={CW} y2="20"/>
      <line className="gridline" x1="0" y1="65"  x2={CW} y2="65"/>
      <line className="gridline" x1="0" y1="110" x2={CW} y2="110"/>
      <line className="gridline" x1="0" y1="155" x2={CW} y2="155"/>
      <defs>
        <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2A310" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#F2A310" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1FB6A6" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#1FB6A6" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {hasData ? (
        <>
          {luxFill  && <path d={luxFill}  fill="url(#gAmber)"/>}
          {luxPath  && <path d={luxPath}  fill="none" stroke="#F2A310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
          {dutyFill && <path d={dutyFill} fill="url(#gTeal)"/>}
          {dutyPath && <path d={dutyPath} fill="none" stroke="#1FB6A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
          <circle cx={CW} cy={luxDotY}  r="4" fill="#F2A310"/>
          <circle cx={CW} cy={dutyDotY} r="4" fill="#1FB6A6"/>
        </>
      ) : (
        // Dimmed static illustration shown before live data arrives
        <>
          <path d="M0,170 C70,160 90,70 150,46 C210,24 250,20 310,30 C370,40 420,80 470,120 C520,158 570,168 620,172 L620,210 L0,210 Z" fill="url(#gAmber)" opacity="0.35"/>
          <path d="M0,170 C70,160 90,70 150,46 C210,24 250,20 310,30 C370,40 420,80 470,120 C520,158 570,168 620,172" fill="none" stroke="#F2A310" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
          <path d="M0,55 C70,60 90,135 150,150 C210,162 250,165 310,158 C370,150 420,120 470,92 C520,64 570,56 620,52 L620,210 L0,210 Z" fill="url(#gTeal)" opacity="0.35"/>
          <path d="M0,55 C70,60 90,135 150,150 C210,162 250,165 310,158 C370,150 420,120 470,92 C520,64 570,56 620,52" fill="none" stroke="#1FB6A6" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
          <text className="axis-lab" x={CW / 2} y={CH / 2 + 4} textAnchor="middle" style={{ fontSize: 11 }}>
            Waiting for live data…
          </text>
        </>
      )}

      {axisLabels.map(({ x, label }, i) => (
        <text
          key={i}
          className="axis-lab"
          x={x === 0 ? 2 : x === CW ? CW - 2 : x}
          y="205"
          textAnchor={x === 0 ? 'start' : x === CW ? 'end' : 'middle'}
        >
          {label}
        </text>
      ))}
    </svg>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [dark, setDark]                   = useState(false)
  const [activeNav, setActiveNav]         = useState('Dashboard')
  const [selectedRoom, setSelectedRoom]   = useState(ROOMS[0])
  const [dropOpen, setDropOpen]           = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropRef = useRef(null)
  const clock   = useClock()

  const { status: mqttStatus, liveData, espStatus, publishZoneCmd } = useMQTT(MQTT_BROKER_URL)
  const supabaseStatus = useSupabaseStatus()
  const chartHistory = useChartHistory(selectedRoom.id === 'r204' ? liveData : null)
  const alertRows    = useAlerts()

  // Inject local synthetic alerts for Supabase realtime status changes.
  // These are not persisted — they reflect the current browser session only.
  const [localAlerts, setLocalAlerts]   = useState([])
  const [alertDateFilter, setAlertDateFilter] = useState('all')
  const [customFrom, setCustomFrom]     = useState('')
  const [customTo, setCustomTo]         = useState('')
  const [alertPage, setAlertPage]       = useState(1)
  const ALERTS_PER_PAGE = 10
  const prevSupabaseStatusRef = useRef(null)
  useEffect(() => {
    const prev = prevSupabaseStatusRef.current
    prevSupabaseStatusRef.current = supabaseStatus
    if (prev === null || prev === supabaseStatus) return
    const entry = supabaseStatus === 'connected'
      ? { id: `sb-${Date.now()}`, type: 'ok',   title: 'Supabase connected',    body: 'Cloud database realtime connection established.',           inserted_at: new Date().toISOString() }
      : { id: `sb-${Date.now()}`, type: 'warn',  title: 'Supabase disconnected', body: 'Cloud database realtime connection lost. Reconnecting…', inserted_at: new Date().toISOString() }
    setLocalAlerts(prev => [entry, ...prev].slice(0, 5))
  }, [supabaseStatus])

  // Stale detection: MQTT says connected but no data for >30 s
  const lastDataTsRef = useRef(0)
  const [isStale, setIsStale] = useState(false)
  useEffect(() => {
    if (liveData) { lastDataTsRef.current = Date.now(); setIsStale(false) }
  }, [liveData])
  useEffect(() => {
    if (mqttStatus !== 'connected') { setIsStale(false); return }
    const id = setInterval(() => {
      setIsStale(lastDataTsRef.current > 0 && Date.now() - lastDataTsRef.current > 30_000)
    }, 5000)
    return () => clearInterval(id)
  }, [mqttStatus])

  // Merge live ESP8266 data into r204; all other rooms stay static.
  const data = useMemo(() => {
    const base = ROOM_DATA[selectedRoom.id]
    if (selectedRoom.id !== 'r204' || !liveData) return base

    const dimPct = Math.round((liveData.duty / 1023) * 100)

    const kpis = base.kpis.map(k => {
      if (k.icon === 'sun') {
        return { ...k, val: String(liveData.lux ?? k.val), trend: 'DAYLIGHT' }
      }
      if (k.icon === 'users') {
        const occ = liveData.occupancy ?? 0
        return { ...k, val: String(occ), trend: occ > 0 ? 'OCCUPIED' : 'VACANT', trendCls: occ > 0 ? 'up' : 'dn' }
      }
      return k
    })

    const zones = base.zones.map((z, i) => {
      const lz = liveData.zones?.[i]
      if (!lz) return z
      const meta = lz.override
        ? 'Manual ON · PIR bypassed'
        : lz.on ? 'Motion detected · auto' : 'No motion · standby'
      return { ...z, on: lz.on, dim: lz.on ? dimPct : 0, tag: lz.override ? 'MANUAL' : 'AUTO', meta }
    })

    return {
      ...base,
      kpis,
      zones,
      sensorLux:          String(liveData.lux ?? base.sensorLux),
      sensorDecision:     liveData.occupancy > 0 ? `Dimming → ${dimPct}%` : 'OFF',
      sensorDecisionNote: liveData.occupancy > 0 ? 'Occupancy detected · auto-brightness active' : 'No motion detected',
    }
  }, [selectedRoom.id, liveData])

  // Patch alert KPI with live counts from the event log.
  const displayData = useMemo(() => {
    const today = new Date().toDateString()
    const todayCount = alertRows.filter(r =>
      new Date(r.inserted_at).toDateString() === today
    ).length
    const kpis = data.kpis.map(k =>
      k.icon !== 'alert' ? k : {
        ...k,
        val:      String(todayCount),
        trend:    todayCount > 0 ? `${todayCount} today` : 'none',
        trendCls: todayCount > 0 ? 'dn' : 'up',
      }
    )
    return { ...data, kpis }
  }, [data, alertRows, localAlerts])

  // Edge pill — ESP8266 device status (from lumenclass/status topic)
  // Falls back to broker connection state until the first device message arrives.
  const isEdgeLive = espStatus === 'online' || (espStatus === null && mqttStatus === 'connected')
  const edgeStatus = isStale                          ? 'stale'
                   : isEdgeLive                       ? 'connected'
                   : mqttStatus === 'connecting'      ? 'connecting'
                   : 'disconnected'
  const edgeLabel  = isStale        ? 'ESP8266 stale'
                   : isEdgeLive    ? 'ESP8266 connected'
                   : mqttStatus === 'connecting' ? 'ESP8266 connecting…'
                   : 'ESP8266 disconnected'

  // Cloud chip — Supabase connection status
  const isLive    = supabaseStatus === 'connected'
  const chipLabel = supabaseStatus === 'connected' ? 'Live' : supabaseStatus === 'connecting' ? 'Connecting…' : 'Offline'

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNavClick = label => {
    setActiveNav(label)
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const navItems = [
    { section: 'Monitor', items: [
      { label: 'Dashboard', icon: 'dashboard' },
      { label: 'Alerts & Events', icon: 'shield' },
    ]}
  ]

  const mapAlert = row => ({
    id:          row.id,
    type:        row.type,
    icon:        ALERT_ICON[row.type] ?? 'info',
    title:       row.title,
    body:        row.body,
    time:        formatAlertTime(row.inserted_at),
    inserted_at: row.inserted_at ?? null,
  })

  // Dashboard widget: local session alerts + DB rows, newest first
  const alertItems = [...localAlerts, ...alertRows]
    .sort((a, b) => {
      if (!a.inserted_at) return -1
      if (!b.inserted_at) return  1
      return new Date(b.inserted_at) - new Date(a.inserted_at)
    })
    .map(mapAlert)

  // Alerts & Events page: DB rows only so count matches Supabase
  const dbAlertItems = alertRows
    .slice()
    .sort((a, b) => new Date(b.inserted_at) - new Date(a.inserted_at))
    .map(mapAlert)

  // Reset to first page whenever filter or source data changes
  const prevFilterRef = useRef(alertDateFilter)
  if (prevFilterRef.current !== alertDateFilter) {
    prevFilterRef.current = alertDateFilter
    if (alertPage !== 1) setAlertPage(1)
  }

  const filteredAlertItems = dbAlertItems.filter(a => {
    if (alertDateFilter === 'all') return true
    const d = new Date(a.inserted_at)
    const today     = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (alertDateFilter === 'today')     return d >= today
    if (alertDateFilter === 'yesterday') return d >= yesterday && d < today
    if (alertDateFilter === 'custom') {
      const from = customFrom ? new Date(customFrom) : null
      const to   = customTo   ? new Date(customTo + 'T23:59:59') : null
      return (!from || d >= from) && (!to || d <= to)
    }
    return true
  })

  const totalAlertPages  = Math.max(1, Math.ceil(filteredAlertItems.length / ALERTS_PER_PAGE))
  const pagedAlertItems  = filteredAlertItems.slice((alertPage - 1) * ALERTS_PER_PAGE, alertPage * ALERTS_PER_PAGE)

  const pageMeta = activeNav === 'Alerts & Events'
    ? { title: 'Alerts Center', desc: 'All device events, warnings, and activity stream' }
    : { title: displayData.title, desc: displayData.desc }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="lumen-root">
        <div className="app">

          {/* ── MOBILE MENU OVERLAY ── */}
          {mobileMenuOpen && (
            <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
                <div className="mobile-menu-header">
                  <div className="brand" style={{ margin: 0 }}>
                    <div className="brand-mark">
                      <svg viewBox="0 0 24 24" fill="none" width="21" height="21">
                        <path d="M9 21h6M10 21v-3M14 21v-3M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" stroke="#16202B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="brand-text">
                      <h1>LumenClass</h1>
                      <span>Smart Lighting</span>
                    </div>
                  </div>
                  <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>
                    <Icon name="close" style={{ width: 20, height: 20 }} />
                  </button>
                </div>

                <div className="mobile-menu-content">
                  {navItems.map(group => (
                    <div key={group.section}>
                      <div className="nav-label">{group.section}</div>
                      {group.items.map(item => (
                        <div
                          key={item.label}
                          className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
                          onClick={() => handleNavClick(item.label)}
                        >
                          <Icon name={item.icon} />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mobile-menu-footer">
                  <EdgePill status={edgeStatus} edgeLabel={edgeLabel} />
                </div>
              </div>
            </div>
          )}

          {/* ── SIDEBAR ── */}
          <aside className="side">
            <div className="brand">
              <div className="brand-mark">
                <svg viewBox="0 0 24 24" fill="none" width="21" height="21">
                  <path d="M9 21h6M10 21v-3M14 21v-3M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" stroke="#16202B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="brand-text">
                <h1>LumenClass</h1>
                <span>Smart Lighting</span>
              </div>
            </div>

            {navItems.map(group => (
              <div key={group.section} style={{ position: 'relative', zIndex: 1 }}>
                <div className="nav-label">{group.section}</div>
                {group.items.map(item => (
                  <div
                    key={item.label}
                    className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.label)}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </div>
                ))}
              </div>
            ))}

            <div className="side-foot">
              <EdgePill status={edgeStatus} edgeLabel={edgeLabel} />
            </div>
          </aside>

          {/* ── MAIN ── */}
          <main className="main">

            {/* Topbar */}
            <div className="topbar">
              <div className="topbar-left">
                <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} title="Open menu">
                  <Icon name="menu" style={{ width: 20, height: 20 }} />
                </button>
                <div>
                  <h2>{pageMeta.title}</h2>
                  <p>{pageMeta.desc}</p>
                </div>
              </div>
              <div className="top-actions">
                {/* Room dropdown */}
                <div className="room-dropdown-wrap" ref={dropRef}>
                  <button
                    className={`room-btn ${dropOpen ? 'open' : ''}`}
                    onClick={() => setDropOpen(v => !v)}
                  >
                    <Icon name="roomPin" style={{ width: 13, height: 13, color: 'var(--amber)' }} />
                    {selectedRoom.label}
                    <Icon name="chevronDown" style={{ width: 12, height: 12 }} />
                  </button>
                  {dropOpen && (
                    <div className="room-dropdown">
                      {ROOMS.map(room => (
                        <div
                          key={room.id}
                          className={`room-option ${selectedRoom.id === room.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedRoom(room); setDropOpen(false) }}
                        >
                          <span className="room-option-dot" />
                          <div>
                            <div style={{ fontWeight: 600 }}>{room.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{room.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live / offline chip */}
                <div className={`chip ${isLive ? 'online' : ''}`}>
                  <Icon name="cloud" style={{ width: 13, height: 13 }} />
                  {chipLabel}
                </div>

                {/* Clock */}
                <div className="chip">
                  <Icon name="clock" style={{ width: 13, height: 13 }} />
                  <span className="clock">{clock}</span>
                </div>

                {/* Dark mode toggle */}
                <button className="dark-toggle" onClick={() => setDark(v => !v)} title="Toggle dark mode">
                  {dark
                    ? <Icon name="sunSmall" style={{ width: 16, height: 16 }} />
                    : <Icon name="moon"     style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
            </div>

            {activeNav === 'Dashboard' && (
              <>
                {/* KPIs */}
                <div className="kpis items-center justify-center min-h-screen">
                  {displayData.kpis.map((k, i) => (
                    <div key={i} className={`kpi ${k.cls}`}>
                      <div className="ic"><Icon name={k.icon} stroke="currentColor" /></div>
                      <div className={`trend ${k.trendCls}`}>{todayLabel}</div>
                      <div className="val">{k.val} <small>{k.unit}</small></div>
                      <div className="lab">{k.lab}</div>
                    </div>
                  ))}
                </div>

                {/* Card grid */}
                <div className="grid">

                  {/* Chart card */}
                  <div className="card">
                    <div className="card-h">
                      <div>
                        <h3>Daylight vs. Lighting Output</h3>
                        <span className="sub">{chartHistory.length > 0 ? 'Last 10 min · live MQTT data' : 'Last 10 min · live MQTT data'}</span>
                      </div>
                      <div className="legend">
                        <span className="legend-item">
                          <span className="legend-dot" style={{ background: 'var(--amber)' }} />
                          Daylight
                        </span>
                        <span className="legend-item">
                          <span className="legend-dot" style={{ background: 'var(--teal)' }} />
                          Light output
                        </span>
                      </div>
                    </div>
                    <div className="chart-wrap">
                      <DaylightChart history={chartHistory} />
                    </div>
                    <div className="sensors">
                      <div className="sensor">
                        <div className="sensor-label">
                          <Icon name="lightThreshold" />
                          Light threshold
                        </div>
                        <div className="sensor-val">{displayData.sensorLux} <small>lux</small></div>
                        <div className="dim-row" style={{ marginTop: 10 }}>
                          <div className="bar">
                            <div className="bar-fill" style={{ width: `${Math.min((parseInt(displayData.sensorLux) / 1000) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="sensor">
                        <div className="sensor-label">
                          <Icon name="edgeDecision" />
                          Edge decision
                        </div>
                        <div className="sensor-val" style={{ fontSize: 18, color: 'var(--tealD)' }}>
                          {displayData.sensorDecision}
                        </div>
                        <div className="zmeta" style={{ marginTop: 8 }}>{displayData.sensorDecisionNote}</div>
                      </div>
                    </div>
                  </div>

                  {/* Zone control card */}
                  <div className="card">
                    <div className="card-h">
                      <div>
                        <h3>Zone Control</h3>
                        <span className="sub">{displayData.zones.length} zones · manual override</span>
                      </div>
                    </div>
                    <div className="zones">
                      {displayData.zones.map((zone, i) => (
                        <ZoneCard
                          key={zone.id + selectedRoom.id}
                          zone={zone}
                          onToggle={selectedRoom.id === 'r204' ? on => publishZoneCmd(i, on) : undefined}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="card span2">
                    <div className="card-h">
                      <div>
                        <h3>Recent Alerts &amp; Events</h3>
                        <span className="sub">edge events · MQTT stream</span>
                      </div>
                      <button className="view-alerts" onClick={() => setActiveNav('Alerts & Events')}>
                        View all
                      </button>
                    </div>
                    <div className="alerts">
                      {alertItems.slice(0, 5).map(alert => (
                        <div key={alert.id} className={`alert ${alert.type}`}>
                          <div className="ad"><Icon name={alert.icon} stroke={alert.type === 'ok' ? 'var(--good)' : undefined} /></div>
                          <div>
                            <b>{alert.title}</b>
                            <p>{alert.body}</p>
                          </div>
                          <time>{alert.time}</time>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="footer-note">
                    <div className="fi">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width="18" height="18" stroke="var(--amber)">
                        <path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z"/>
                        <path d="M9 21h6" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <b>Edge-first by design</b>
                      <p>All threshold decisions, dimming, and on/off switching run on the ESP8266. This dashboard adds visibility, history, and remote control on top — the lighting keeps working even with no internet.</p>
                    </div>
                  </div>

                </div>{/* /grid */}
              </>
            )}

            {activeNav === 'Alerts & Events' && (
              <div className="alerts-page">
                <div className="card">
                  <div className="card-h">
                    <div>
                      <h3>All Alerts</h3>
                      <span className="sub">{filteredAlertItems.length} event{filteredAlertItems.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>


                  {/* Date filter bar */}
                  <div className="alert-filter-bar">
                    <div className="alert-filter-chips">
                      {['all', 'today', 'yesterday'].map(f => (
                        <button
                          key={f}
                          className={`alert-filter-chip ${alertDateFilter === f ? 'active' : ''}`}
                          onClick={() => setAlertDateFilter(f)}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                      <button
                        className={`alert-filter-chip ${alertDateFilter === 'custom' ? 'active' : ''}`}
                        onClick={() => setAlertDateFilter('custom')}
                      >
                        Custom range
                      </button>
                    </div>
                    {alertDateFilter === 'custom' && (
                      <div className="alert-filter-range">
                        <input
                          type="date"
                          className="alert-date-input"
                          value={customFrom}
                          onChange={e => setCustomFrom(e.target.value)}
                        />
                        <span className="alert-range-sep">to</span>
                        <input
                          type="date"
                          className="alert-date-input"
                          value={customTo}
                          onChange={e => setCustomTo(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="alerts">
                    {filteredAlertItems.length === 0 ? (
                      <div className="alerts-empty">No events for this date range.</div>
                    ) : pagedAlertItems.map(alert => (
                      <div key={`page-${alert.id}`} className={`alert ${alert.type}`}>
                        <div className="ad"><Icon name={alert.icon} stroke={alert.type === 'ok' ? 'var(--good)' : undefined} /></div>
                        <div>
                          <b>{alert.title}</b>
                          <p>{alert.body}</p>
                        </div>
                        <time>{alert.time}</time>
                      </div>
                    ))}
                  </div>

                  {totalAlertPages > 1 && (
                    <div className="alert-pagination">
                      <button
                        className="alert-page-btn"
                        disabled={alertPage === 1}
                        onClick={() => setAlertPage(p => p - 1)}
                      >
                        ‹ Prev
                      </button>
                      <div className="alert-page-numbers">
                        {Array.from({ length: totalAlertPages }, (_, i) => i + 1)
                          .filter(n => n === 1 || n === totalAlertPages || Math.abs(n - alertPage) <= 1)
                          .reduce((acc, n, idx, arr) => {
                            if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…')
                            acc.push(n)
                            return acc
                          }, [])
                          .map((n, i) =>
                            n === '…'
                              ? <span key={`ellipsis-${i}`} className="alert-page-ellipsis">…</span>
                              : <button
                                  key={n}
                                  className={`alert-page-num ${alertPage === n ? 'active' : ''}`}
                                  onClick={() => setAlertPage(n)}
                                >{n}</button>
                          )
                        }
                      </div>
                      <button
                        className="alert-page-btn"
                        disabled={alertPage === totalAlertPages}
                        onClick={() => setAlertPage(p => p + 1)}
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
