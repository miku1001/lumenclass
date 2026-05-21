import { useState, useEffect, useRef } from 'react'
import './App.css'

// ─── DATA ────────────────────────────────────────────────────
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
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '742', unit: 'lux',     lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '23',  unit: 'present', lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'alert', trend: '1 active',  trendCls: 'dn', val: '3',  unit: 'today',   lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Front',  meta: 'Occupied · auto-dimmed by daylight', on: true,  dim: 35,  tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Rear',   meta: 'Occupied · lower daylight at rear',  on: true,  dim: 68,  tag: 'AUTO' },
      { id: 'zH', name: 'Hallway light',   meta: 'No motion 12 min · switched off',    on: false, dim: 0,   tag: 'OFF' },
      { id: 'zC', name: 'Zone C — Window', meta: 'Partial daylight · gentle dimming',  on: true,  dim: 45,  tag: 'AUTO' },
    ],
    sensorLux: '500',
    sensorDecision: 'Dimming → 35%',
    sensorDecisionNote: 'Sufficient daylight detected',
  },
  r101: {
    title: 'Room 101 — Lighting Overview',
    desc: 'Entrance area with motion-triggered lighting automation',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '390', unit: 'lux',     lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '8',   unit: 'present', lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 22%',    trendCls: 'up', val: '2.1', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '0 active',  trendCls: 'up', val: '1',  unit: 'today',   lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Entry',  meta: 'Occupied · full brightness',          on: true,  dim: 100, tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Lobby',  meta: 'Partial motion · dimmed',             on: true,  dim: 55,  tag: 'AUTO' },
      { id: 'zH', name: 'Exit lights',     meta: 'Always on · safety override',         on: true,  dim: 80,  tag: 'AUTO' },
      { id: 'zC', name: 'Zone C — Corridor', meta: 'Low traffic · standby',             on: true,  dim: 25,  tag: 'AUTO' },
    ],
    sensorLux: '390',
    sensorDecision: 'Full ON → 100%',
    sensorDecisionNote: 'Low daylight, occupancy high',
  },
  r305: {
    title: 'Room 305 — Lighting Overview',
    desc: 'Lab wing with precision dimming for sensitive equipment',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '610', unit: 'lux',     lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '14',  unit: 'present', lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 45%',    trendCls: 'up', val: '6.2', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '2 active',  trendCls: 'dn', val: '5',  unit: 'today',   lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'C1', name: 'Corner-1', meta: 'meta', on: true,  dim: 50,  tag: 'AUTO' },
      { id: 'C2', name: 'Corner-2', meta: 'meta', on: true,  dim: 15,  tag: 'AUTO' },
      { id: 'C3', name: 'Corner-3', meta: 'Neta', on: false, dim: 0,   tag: 'OFF' },
      { id: 'C4', name: 'Corner-4', meta: 'meta', on: false, dim: 0,   tag: 'OFF' },
    ],
    sensorLux: '610',
    sensorDecision: 'Dimming → 50%',
    sensorDecisionNote: 'Moderate daylight in lab area',
  },
  r212: {
    title: 'Room 212 — Lighting Overview',
    desc: 'West wing classroom with afternoon sun exposure',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'BRIGHT',   trendCls: 'up', val: '920', unit: 'lux',     lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'OCCUPIED',  trendCls: 'up', val: '31',  unit: 'present', lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 61%',    trendCls: 'up', val: '8.8', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '0 active',  trendCls: 'up', val: '0',  unit: 'today',   lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Front',    meta: 'High daylight · heavily dimmed',    on: true,  dim: 15,  tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Rear',     meta: 'Good daylight · moderately dimmed', on: true,  dim: 30,  tag: 'AUTO' },
      { id: 'zH', name: 'Hallway',            meta: 'Occupied · auto-level',             on: true,  dim: 60,  tag: 'AUTO' },
      { id: 'zC', name: 'Zone C — Window',   meta: 'Direct sun · deep dimming',          on: true,  dim: 10,  tag: 'AUTO' },
    ],
    sensorLux: '920',
    sensorDecision: 'Dimming → 15%',
    sensorDecisionNote: 'Peak afternoon sun — max saving',
  },
  r408: {
    title: 'Room 408 — Lighting Overview',
    desc: 'Admin office on top floor with skylight access',
    kpis: [
      { cls: 'k1', icon: 'sun',   trend: 'DAYLIGHT', trendCls: 'up', val: '540', unit: 'lux',     lab: 'Ambient brightness (LDR)' },
      { cls: 'k2', icon: 'users', trend: 'LOW OCC',   trendCls: 'dn', val: '4',   unit: 'present', lab: 'Occupancy (PIR motion)' },
      { cls: 'k3', icon: 'zap',   trend: '↓ 53%',    trendCls: 'up', val: '5.4', unit: 'kWh saved', lab: 'Energy saved today' },
      { cls: 'k4', icon: 'alert', trend: '1 active',  trendCls: 'dn', val: '2',  unit: 'today',   lab: 'Alerts & events' },
    ],
    zones: [
      { id: 'zA', name: 'Zone A — Desks',    meta: 'Occupied · auto-dimmed',             on: true,  dim: 40,  tag: 'AUTO' },
      { id: 'zB', name: 'Zone B — Meeting',  meta: 'Unoccupied · standby mode',          on: true,  dim: 10,  tag: 'AUTO' },
      { id: 'zH', name: 'Stairwell',          meta: 'Safety light · always active',      on: true,  dim: 70,  tag: 'AUTO' },
      { id: 'zC', name: 'Zone C — Archive',  meta: 'Low use · dimmed',                   on: true,  dim: 20,  tag: 'AUTO' },
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
    cloudCheck: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" {...props}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
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

// ─── ZONE CARD ───────────────────────────────────────────────
function ZoneCard({ zone }) {
  const [on, setOn] = useState(zone.on)
  const [dim, setDim] = useState(zone.dim)

  useEffect(() => { setOn(zone.on); setDim(zone.dim) }, [zone])

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
        <button className={`toggle-switch ${on ? 'on' : ''}`} onClick={() => setOn(v => !v)} />
      </div>
      <div className="zmeta">{zone.meta}</div>
      <div className="dim-row">
        <span>{on ? `${dim}%` : '0%'}</span>
        <div className="bar">
          <div className="bar-fill" style={{ width: on ? `${dim}%` : '0%' }} />
        </div>
        {on
          ? <span className="auto-tag">{zone.tag}</span>
          : <span className="off-tag">OFF</span>
        }
      </div>
    </div>
  )
}

// ─── CHART SVG ───────────────────────────────────────────────
function DaylightChart() {
  return (
    <svg className="chart" viewBox="0 0 620 210" preserveAspectRatio="none">
      <line className="gridline" x1="0" y1="20"  x2="620" y2="20"/>
      <line className="gridline" x1="0" y1="65"  x2="620" y2="65"/>
      <line className="gridline" x1="0" y1="110" x2="620" y2="110"/>
      <line className="gridline" x1="0" y1="155" x2="620" y2="155"/>
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
      {/* Daylight fill */}
      <path d="M0,170 C70,160 90,70 150,46 C210,24 250,20 310,30 C370,40 420,80 470,120 C520,158 570,168 620,172 L620,210 L0,210 Z" fill="url(#gAmber)"/>
      <path d="M0,170 C70,160 90,70 150,46 C210,24 250,20 310,30 C370,40 420,80 470,120 C520,158 570,168 620,172" fill="none" stroke="#F2A310" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Light output fill */}
      <path d="M0,55 C70,60 90,135 150,150 C210,162 250,165 310,158 C370,150 420,120 470,92 C520,64 570,56 620,52 L620,210 L0,210 Z" fill="url(#gTeal)"/>
      <path d="M0,55 C70,60 90,135 150,150 C210,162 250,165 310,158 C370,150 420,120 470,92 C520,64 570,56 620,52" fill="none" stroke="#1FB6A6" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Dots */}
      <circle cx="310" cy="30" r="4" fill="#F2A310"/>
      <circle cx="310" cy="158" r="4" fill="#1FB6A6"/>
      {/* Axis labels */}
      <text className="axis-lab" x="2"   y="205">6AM</text>
      <text className="axis-lab" x="148" y="205">9AM</text>
      <text className="axis-lab" x="298" y="205">12PM</text>
      <text className="axis-lab" x="448" y="205">3PM</text>
      <text className="axis-lab" x="590" y="205">6PM</text>
    </svg>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0])
  const [dropOpen, setDropOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropRef = useRef(null)
  const clock = useClock()

  const data = ROOM_DATA[selectedRoom.id]

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu when nav item clicked
  const handleNavClick = (label) => {
    setActiveNav(label)
    setMobileMenuOpen(false)
  }

  // Manage body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const navItems = [
    { section: 'Monitor', items: [
      { label: 'Dashboard', icon: 'dashboard' },
      { label: 'Alerts', icon: 'shield' },
    ]}
  ]

  const alertItems = [
    {
      type: 'ok',
      icon: 'check',
      title: `Zone A auto-dimmed to ${data.zones[0]?.dim ?? 35}%`,
      body: 'Daylight crossed 700 lux — ESP32 reduced output locally to save energy.',
      time: '10:41 AM',
    },
    {
      type: 'info',
      icon: 'info',
      title: 'Hallway light switched OFF',
      body: 'No occupancy detected for 12 minutes — local automation turned the zone off.',
      time: '10:29 AM',
    },
    {
      type: 'warn',
      icon: 'warn',
      title: 'Brief connectivity drop — handled offline',
      body: 'Internet lost for 47s. Lighting kept responding locally; readings buffered and synced on reconnect.',
      time: '09:58 AM',
    },
  ]

  const pageMeta = activeNav === 'Alerts'
    ? { title: 'Alerts Center', desc: 'All device events, warnings, and activity stream' }
    : { title: data.title, desc: data.desc }

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
                  <div className="edge-pill">
                    <span className="dot live" />
                    <div className="edge-pill-text">
                      <b>Edge node online</b>
                      <small>ESP32 · local control active</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SIDEBAR ── */}
          <aside className="side">
            {/* Brand */}
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

            {/* Nav */}
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

            {/* Footer */}
            <div className="side-foot">
              <div className="edge-pill">
                <span className="dot live" />
                <div className="edge-pill-text">
                  <b>Edge node online</b>
                  <small>ESP32 · local control active</small>
                </div>
              </div>
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

                {/* Cloud synced */}
                <div className="chip online">
                  <Icon name="cloudCheck" style={{ width: 13, height: 13 }} />
                  Cloud synced
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
                    : <Icon name="moon" style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
            </div>

            {activeNav === 'Dashboard' && (
              <>
                {/* KPIs */}
                <div className="kpis items-center justify-center min-h-screen">
                  {data.kpis.map((k, i) => (
                    <div key={i} className={`kpi ${k.cls}`}>
                      <div className="ic"><Icon name={k.icon} stroke="currentColor" /></div>
                      <div className={`trend ${k.trendCls}`}>{k.trend}</div>
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
                        <span className="sub">Last 12 hours · auto-dimming response</span>
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
                      <DaylightChart />
                    </div>
                    <div className="sensors">
                      <div className="sensor">
                        <div className="sensor-label">
                          <Icon name="lightThreshold" />
                          Light threshold
                        </div>
                        <div className="sensor-val">{data.sensorLux} <small>lux</small></div>
                        <div className="dim-row" style={{ marginTop: 10 }}>
                          <div className="bar">
                            <div className="bar-fill" style={{ width: `${Math.min((parseInt(data.sensorLux) / 1000) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="sensor">
                        <div className="sensor-label">
                          <Icon name="edgeDecision" />
                          Edge decision
                        </div>
                        <div className="sensor-val" style={{ fontSize: 18, color: 'var(--tealD)' }}>
                          {data.sensorDecision}
                        </div>
                        <div className="zmeta" style={{ marginTop: 8 }}>{data.sensorDecisionNote}</div>
                      </div>
                    </div>
                  </div>

                  {/* Zone control card */}
                  <div className="card">
                    <div className="card-h">
                      <div>
                        <h3>Zone Control</h3>
                        <span className="sub">{data.zones.length} zones · manual override</span>
                      </div>
                    </div>
                    <div className="zones">
                      {data.zones.map(zone => (
                        <ZoneCard key={zone.id + selectedRoom.id} zone={zone} />
                      ))}
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="card span2">
                    <div className="card-h">
                      <div>
                        <h3>Recent Activity &amp; Alerts</h3>
                        <span className="sub">edge events · MQTT stream</span>
                      </div>
                      <button className="view-alerts" onClick={() => setActiveNav('Alerts')}>
                        View all alerts
                      </button>
                    </div>
                    <div className="alerts">
                      {alertItems.map((alert, i) => (
                        <div key={`${alert.type}-${i}`} className={`alert ${alert.type}`}>
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
                      <p>All threshold decisions, dimming, and on/off switching run on the ESP32. This dashboard adds visibility, history, and remote control on top — the lighting keeps working even with no internet.</p>
                    </div>
                  </div>

                </div>{/* /grid */}
              </>
            )}

            {activeNav === 'Alerts' && (
              <div className="alerts-page">
                <div className="card">
                  <div className="card-h">
                    <div>
                      <h3>All Alerts</h3>
                      <span className="sub">edge events · MQTT stream</span>
                    </div>
                  </div>
                  <div className="alerts">
                    {alertItems.map((alert, i) => (
                      <div key={`page-${alert.type}-${i}`} className={`alert ${alert.type}`}>
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
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}