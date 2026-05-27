# LumenClass — User Manual

**Smart Classroom Lighting System**
*Dashboard · Alerts · Zone Control · Edge Automation*

---

## Table of Contents

1. [What is LumenClass?](#1-what-is-lumenclass)
2. [How the System Works](#2-how-the-system-works)
3. [Navigating the Dashboard](#3-navigating-the-dashboard)
4. [Status Indicators](#4-status-indicators)
5. [Selecting a Room](#5-selecting-a-room)
6. [Dashboard — KPI Cards](#6-dashboard--kpi-cards)
7. [Dashboard — Daylight Chart](#7-dashboard--daylight-chart)
8. [Dashboard — Zone Control](#8-dashboard--zone-control)
9. [Dashboard — Recent Alerts Widget](#9-dashboard--recent-alerts-widget)
10. [Alerts & Events Page](#10-alerts--events-page)
11. [Dark Mode](#11-dark-mode)
12. [Offline Resilience](#12-offline-resilience)
13. [Event Types Reference](#13-event-types-reference)
14. [Hardware at a Glance](#14-hardware-at-a-glance)

---

## 1. What is LumenClass?

LumenClass is a smart lighting management system designed for classrooms. It automatically adjusts and controls the lighting in a room based on two inputs:

- **Occupancy** — passive infrared (PIR) motion sensors detect whether anyone is present in each zone of the room.
- **Ambient brightness** — a light sensor (LDR) measures how much natural daylight is available.

When a zone is occupied and the room is dark, the lights turn on at full brightness. As natural light increases, the system dims the lights proportionally to save energy. When no motion is detected for 10 seconds, the lights for that zone switch off automatically. All of this happens locally on the device — no internet connection is required for the lights to function.

The dashboard gives teachers, administrators, and facility managers a live view of what every room is doing, a history of all events, and manual override controls when needed.

---

## 2. How the System Works

Understanding the system's three layers helps you interpret what you see on the dashboard.

### Layer 1 — The Hardware (Room 204)

A small microcontroller (ESP8266) is installed in Room 204. It is wired to:

- **4 PIR motion sensors**, one covering each corner of the room (Front-Left, Front-Right, Back-Left, Back-Right).
- **1 ambient light sensor (LDR)** that reads how bright the room is at any moment.
- **4 LED lighting zones**, each independently enabled or disabled based on its PIR sensor.
- **1 shared brightness controller (MOSFET)** that sets the dimming level for all active zones together.

The microcontroller runs its own internal logic. It decides whether each zone's light should be on or off and at what brightness — all locally, within milliseconds. Internet connectivity does not affect this decision-making.

### Layer 2 — The Bridge (Background Service)

A background service runs on the local server alongside the wireless broker. Its job is to watch for significant events — a zone turning on, the brightness category changing, the device going offline — and write a record of each event to the cloud database. This is what populates the Alerts & Events log.

If the cloud database is unreachable, the bridge queues every event to disk and uploads them all in order the moment the connection is restored. No events are lost.

### Layer 3 — The Dashboard (This Application)

The web dashboard connects to two sources simultaneously:

- **The wireless broker** (MQTT over WebSocket) — for live, second-by-second sensor data from the hardware.
- **The cloud database** (Supabase) — for the persistent history of all events and alerts.

Changes you make on the dashboard — such as manually turning a zone on or off — are sent directly to the hardware over the same wireless connection and take effect within a second.

### Communication Flow

```
Room Sensors → ESP8266 → WiFi → MQTT Broker ──→ Bridge Service → Cloud Database
                                      │                                    │
                                      └─── Dashboard (live data) ◄─────── ┘
                                                                   (alerts history)
```

---

## 3. Navigating the Dashboard

When you open LumenClass, you land on the **Dashboard** page. The layout has two main areas:

### Sidebar (left)

The sidebar contains the navigation menu. There are two pages:

| Menu Item | Purpose |
|---|---|
| **Dashboard** | Live sensor data, zone controls, and recent event summary for the selected room |
| **Alerts & Events** | Complete searchable, paginated history of all system events |

On a mobile device or small screen, the sidebar is hidden by default. Tap the **menu icon (☰)** in the top-left corner to open it as an overlay panel.

### Top Bar (right side)

The top bar contains the **room selector**, **connection status chips**, the **live clock**, and the **dark mode toggle**. These are described in detail in the sections below.

---

## 4. Status Indicators

Two status chips are always visible in the top bar. They tell you the health of the connections between the dashboard and the rest of the system.

### ESP8266 Device Pill (bottom of sidebar)

| Status Label | Meaning |
|---|---|
| **ESP8266 connected** | The hardware device is online and sending live data. |
| **ESP8266 connecting…** | The dashboard is attempting to reach the wireless broker. |
| **ESP8266 stale** | The broker connection is open, but no new data has arrived from the device for more than 30 seconds. The device may have frozen or lost power. |
| **ESP8266 disconnected** | The dashboard cannot reach the wireless broker. Live data is unavailable. |

> **Note:** If the ESP8266 is stale or disconnected, the lighting automation in Room 204 continues to work normally — it does not depend on the dashboard connection. Only the live display on the dashboard is affected.

### Cloud Chip (top bar)

| Label | Meaning |
|---|---|
| **Live** | The dashboard is connected to the cloud database. Alerts update in real time. |
| **Connecting…** | The dashboard is establishing a connection to the cloud database. |
| **Offline** | The cloud database is unreachable. The alerts list shows the last successfully loaded data. |

---

## 5. Selecting a Room

The **room selector button** in the top bar (labelled with a pin icon) lets you switch between rooms. Click or tap it to open the dropdown.

| Room | Location | Data |
|---|---|---|
| Room 204 | Floor 2 · East Wing | **Live** — connected to the ESP8266 hardware |
| Room 101 | Floor 1 · Entrance | Static demonstration data |
| Room 305 | Floor 3 · Lab Wing | Static demonstration data |
| Room 212 | Floor 2 · West Wing | Static demonstration data |
| Room 408 | Floor 4 · Admin | Static demonstration data |

Only **Room 204** displays real-time sensor readings, live zone states, and a live chart. The other rooms show representative data that illustrates how the interface would look when those rooms are instrumented.

Switching rooms updates the KPI cards, zone control panel, and chart for that room. The Alerts & Events log is shared across all rooms.

---

## 6. Dashboard — KPI Cards

At the top of the Dashboard page, a row of KPI (Key Performance Indicator) cards gives you an at-a-glance summary of the selected room's current state.

### Room 204 (live)

| Card | What It Shows |
|---|---|
| **Ambient Brightness** | The current light level in lux as measured by the LDR sensor. Higher values mean more natural daylight. |
| **Occupancy** | The number of zones where motion was recently detected. This reflects how many lighting zones are currently considered occupied. |
| **Alerts & Events** | The total number of system events recorded in the cloud database today. |

### Other Rooms (static)

KPI cards for non-live rooms include an additional **Energy Saved** card showing estimated kWh saved through automated dimming. This card is not currently shown for Room 204 as live energy metering is not yet wired in.

---

## 7. Dashboard — Daylight Chart

The chart section is visible when **Room 204** is selected. It shows two data series rolling across a 10-minute window, updating every 10 seconds.

| Series | Colour | What It Represents |
|---|---|---|
| **Daylight** | Amber | Ambient lux level from the LDR sensor (scale: 0–1000 lux) |
| **Light Output** | Teal | PWM duty cycle of the MOSFET, representing how hard the LED bank is working (scale: 0–100%) |

When the room is bright, the Daylight line rises and the Light Output line falls — the system dims the lights because natural light is doing the work. When the room darkens, the two lines invert.

**If the chart shows "Waiting for live data…"**, the dashboard has not yet received any sensor updates from the device. This is normal for a few seconds after the page loads, or if the ESP8266 is currently offline.

### Below the Chart — Sensor Details

Two readouts appear under the chart:

- **Light Threshold** — the exact lux value currently reported by the sensor, shown with a fill bar.
- **Edge Decision** — the action the ESP8266 has taken based on that reading, such as *Dimming → 50%* or *OFF*. A note below it explains the reason (e.g., *Moderate daylight in lab area*).

---

## 8. Dashboard — Zone Control

The Zone Control card shows the four lighting zones in the selected room. Each zone card displays:

- The zone's **name** and **location** (e.g., Front — Left Corner, PIR zone 1).
- Its current **on/off state** (the bulb icon glows amber when on).
- A **status note** — whether the zone is responding to motion automatically, manually overridden, or in standby.
- A **brightness bar** showing the current dim level as a percentage.
- A **mode badge**: `AUTO` (PIR-driven) or `MANUAL` (override active) or `OFF`.

### Toggling a Zone

Click or tap the **toggle switch** on any zone card to switch it between on and off.

- **Turning a zone ON manually** sends an override command to the ESP8266. The zone's LED turns on immediately and stays on regardless of whether the PIR sensor detects motion. The badge changes to `MANUAL`.
- **Turning a zone OFF manually** clears the override and returns the zone to PIR-automatic mode. The ESP8266 will then turn the light back on or off based on motion as normal. The badge returns to `AUTO`.

> **Room 204 only:** Manual toggles send real commands to the hardware. For other rooms, the toggle updates the visual state locally but does not communicate with any device.

---

## 9. Dashboard — Recent Alerts Widget

At the bottom of the Dashboard grid, the **Recent Alerts & Events** card shows the five most recent system events from the cloud database alongside any connection status events from the current browser session.

Each entry shows:
- An **icon** indicating the event type.
- A **title** and a **brief description** of what happened.
- The **time** the event occurred.

To see the full history, click **View all** in the card header. This navigates to the Alerts & Events page.

---

## 10. Alerts & Events Page

The Alerts & Events page shows a complete, paginated log of every event recorded by the system.

### What Gets Recorded

The system automatically creates an event record whenever any of the following occur:

| Event | Example Message |
|---|---|
| A zone's lights turn **on** | *Zone A lights ON — Occupancy detected, motion-triggered activation.* |
| A zone's lights turn **off** | *Zone B lights OFF — No motion detected, zone returned to standby.* |
| Brightness level **changes category** | *Brightness changed to bright — Ambient light crossed threshold, 750 lux (moderate → bright).* |
| ESP8266 goes **offline** | *ESP8266 disconnected — The device is no longer reachable.* |
| ESP8266 comes back **online** | *ESP8266 connected — The device is online and transmitting live data.* |
| Cloud database connection **restored** | *Supabase connection restored — Reconnected after ~3 minutes. All events from the downtime have been saved.* |

### Filtering Events

Use the filter bar above the list to narrow the results by date:

| Filter | Shows |
|---|---|
| **All** | Every recorded event |
| **Today** | Events from midnight today to now |
| **Yesterday** | Events from the previous calendar day |
| **Custom range** | Events between two dates you specify |

When you select **Custom range**, two date pickers appear. Fill in a start date, an end date, or both. Leaving one blank means "no limit" on that side.

Changing the filter automatically resets the view to page 1.

### Pagination

Events are displayed **10 per page**. The pagination bar at the bottom of the list shows:

- **Prev** and **Next** buttons to move one page at a time.
- Numbered page buttons. If there are many pages, ellipsis (…) is shown to collapse distant page numbers, always keeping the first page, last page, and pages immediately around the current page visible.

The subtitle in the card header always shows the **total number of matching events** for the current filter, regardless of which page you are on.

### Real-Time Updates

New events appear automatically as they happen — you do not need to refresh the page. When the cloud database reconnects after a period of being offline, the page re-fetches the full event list to ensure all events that were queued and flushed during the downtime are immediately visible.

---

## 11. Dark Mode

Click the **moon icon (🌙)** in the top-right corner of the top bar to switch the interface to dark mode. Click the **sun icon** to switch back to light mode. The setting applies immediately and is not saved between sessions.

---

## 12. Offline Resilience

LumenClass is designed to keep working even when connectivity is lost.

### Lighting continues without internet

The ESP8266 runs all automation logic locally. If the WiFi drops, the MQTT broker goes down, or the internet connection fails entirely:

- PIR sensors continue to detect motion.
- The LDR continues to read ambient light.
- Zones continue to turn on and off automatically.
- Brightness continues to adjust with daylight.

The only thing that stops is the live display on the dashboard and the logging of new events to the cloud database.

### Events are queued, not lost

When the cloud database is unreachable, the bridge service queues every event to disk. The queue persists across server restarts. As soon as the connection is restored:

1. All queued events are uploaded to the database in the order they occurred.
2. A **"Supabase connection restored"** event is added to the log, noting how long the database was unreachable.
3. The dashboard automatically re-fetches the full event list, so the Alerts & Events page updates without any manual refresh.

### Dashboard reconnects automatically

If the dashboard loses its connection to either the MQTT broker or the cloud database, it reconnects automatically in the background. The status chips in the top bar change to **"Connecting…"** while reconnection is in progress and return to their normal state once re-established.

---

## 13. Event Types Reference

Every event in the Alerts & Events log is tagged with one of four types, each with its own colour and icon:

| Type | Colour | Icon | Meaning |
|---|---|---|---|
| **ok** | Green | ✓ Checkmark | A positive or normal outcome. Examples: lights turned off cleanly, connection restored. |
| **info** | Blue | ℹ Info | A routine system activity worth noting. Examples: lights turned on due to motion, brightness category changed. |
| **warn** | Yellow | ⚠ Triangle | Something that may need attention. Examples: device went offline, connection lost. |
| **error** | Red | ⚠ Triangle | A significant fault. Reserved for serious failures requiring investigation. |

---

## 14. Hardware at a Glance

This section is for reference only and is not required for day-to-day use of the dashboard.

### Components in Room 204

| Component | Quantity | Role |
|---|---|---|
| ESP8266 microcontroller | 1 | Runs automation logic, connects to WiFi and MQTT |
| PIR motion sensor | 4 | Detects occupancy in each corner zone |
| LDR photoresistor | 1 | Measures ambient light level |
| N-channel MOSFET | 1 | Controls shared LED brightness via PWM |
| LED | 4 | One per zone — Front-Left, Front-Right, Back-Left, Back-Right |

### Zone to Sensor Mapping

| Dashboard Zone Name | Sensor |
|---|---|
| Front — Left Corner | PIR Zone 1 (GPIO 12 / D6) |
| Front — Right Corner | PIR Zone 2 (GPIO 13 / D7) |
| Back — Right Corner | PIR Zone 3 (GPIO 14 / D5) |
| Back — Left Corner | PIR Zone 4 (GPIO 5 / D1) |

### Brightness Levels

The bridge service translates raw lux readings into three named levels for logging purposes:

| Level | Lux Range | Typical Scenario |
|---|---|---|
| **Dim** | 0 – 299 lux | Night, heavily curtained room |
| **Moderate** | 300 – 699 lux | Overcast daylight, early morning |
| **Bright** | 700 lux and above | Direct sunlight, clear midday |

An event is only recorded when the level **changes** — not on every reading. A transition from *moderate* to *bright* logs one event; staying at *bright* for an hour logs nothing further.

### Motion Hold Behaviour

When a PIR sensor detects motion, its zone's light turns on. If motion stops, the light remains on for a **10-second hold period** before switching off. This prevents the lights from flickering when someone is still in the room but momentarily out of the sensor's field of view.

---

*LumenClass — Edge-first smart lighting for classrooms.*
*All threshold decisions, dimming, and on/off switching run on the ESP8266.*
*The dashboard adds visibility, history, and remote control on top.*
