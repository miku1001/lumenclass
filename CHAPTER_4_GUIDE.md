# Chapter 4 Writing Guide — Testing, Results & Interpretations
## LumenClass: ESP8266-Based Smart Classroom Lighting System

> **Purpose of this document:** This is a writing guide only. It lays out the structure, suggested content, and data points to gather so you can write a complete Chapter 4. Replace all bracketed `[placeholder]` values with your actual measured data before submitting.

---

## Overview of the System Under Test

Before writing each section, keep this architecture in mind so your framing is consistent throughout the chapter.

```
PIR Sensors (×4) ──┐
LDR (×1)          ─┤──→ ESP8266 (MicroPython, main.py)
                   │       │  MQTT publish: lumenclass/sensor/state
MOSFET PWM ←───────┘       │  MQTT publish: lumenclass/status
LEDs (×4) ←── MOSFET        ↓
                       Mosquitto MQTT Broker (192.168.1.13:1883)
                              │ WebSocket (port 9001)
                              ↓
                       React Dashboard (App.jsx)
                              │ Supabase Realtime
                              ↓
                       Alerts & Events Log
```

**Key system parameters to reference:**
- Loop interval: 200 ms
- PIR debounce threshold: 3 consecutive HIGH reads = 600 ms minimum
- Motion hold timeout: 10,000 ms (10 s) after last detected motion
- LDR ADC range: 100 (bright) → 900 (dark)
- PWM duty range: 0 → 1023
- MQTT publish rate: every 5 loops ≈ 1 s
- MQTT reconnect interval: every 150 loops = 30 s
- Chart history window: 60 × 10 s = 10-minute rolling window

---

## Part 1: Test Approaches and Procedures

### 1.1 Test Plan Overview

This section establishes the test strategy. Write a short paragraph explaining that testing was structured in three phases: **hardware-level unit tests** (individual component verification), **firmware-level integration tests** (subsystem interaction), and **system-level end-to-end tests** (full pipeline including dashboard).

Mention that `backend/test.py` was used as the primary hardware self-test harness, and that the full `backend/main.py` firmware was deployed for integration and system tests.

---

### 1.2 Test Categories

#### Test Category 1 — Hardware Unit Tests (`test.py`)

These tests isolate each physical component before firmware deployment. Cite `backend/test.py` which provides a menu-driven interactive test harness with six options:

| Test ID | Test Name | Description | Pass Criterion |
|---------|-----------|-------------|----------------|
| HW-01 | Sequential LED Test | Activates LEDs 1–4 one at a time with MOSFET held at full duty (1023) | Each LED visibly illuminates in sequence with 800 ms on, 200 ms off |
| HW-02 | PIR Sensor 1 Live Test | Monitors GPIO 5 (D1) in real time; toggles LED 1 on motion | LED 1 turns ON when motion enters PIR 1 FOV; turns OFF when motion clears |
| HW-03 | PIR Sensor 2 Live Test | Monitors GPIO 14 (D5) | LED 2 responds correctly |
| HW-04 | PIR Sensor 3 Live Test | Monitors GPIO 12 (D6) | LED 3 responds correctly |
| HW-05 | PIR Sensor 4 Live Test | Monitors GPIO 13 (D7) | LED 4 responds correctly |
| HW-06 | All LEDs + LDR Auto-Brightness | All LEDs on; PWM driven by live ADC readings from A0 | Duty value changes inversely with ambient light; serial output shows A0 and duty live |

**Procedure for HW-06 (important — describe in detail):**
1. Run `test.py` and select option `6`.
2. Cover the LDR completely and record the A0 value (expected ≈ 900, duty ≈ 1023).
3. expose the LDR to direct light and record the A0 value (expected ≈ 100, duty ≈ 0).
4. Compare against the calibration formula in `ambient_to_duty()`:
   `duty = (dark_raw - clamped) / (dark_raw - bright_raw) × 1023`

---

#### Test Category 2 — Firmware Module Tests (`main.py`)

These test individual software modules within the firmware:

| Test ID | Module | What to Test | How |
|---------|--------|--------------|-----|
| FW-01 | `clamp()` | Returns `lower` when `value < lower`, `upper` when `value > upper`, `value` otherwise | Trace with serial print |
| FW-02 | `read_ambient_raw()` | Averages 5 ADC samples | Print loop; compare to single-read variance |
| FW-03 | `ambient_to_duty()` | Correct duty for known raw values | Serial print `ambient_raw` and `ambient_duty` simultaneously |
| FW-04 | PIR debounce | Rejects a single HIGH spike; only accepts ≥3 consecutive HIGHs | Manually tap PIR briefly vs. hold; observe `motion_triggered` update |
| FW-05 | Motion hold timer | LED stays ON for 10 s after motion clears | Record time from last PIR HIGH to LED OFF via MQTT timestamp |
| FW-06 | `zone_overrides` | MQTT command `{"on": true}` forces LED on; `{"on": null}` returns to PIR-auto | Publish via `mosquitto_pub`; observe zone in dashboard |

---

#### Test Category 3 — Integration Tests (ESP8266 ↔ MQTT Broker ↔ Dashboard)

| Test ID | Integration Point | Test Procedure | Expected Outcome |
|---------|-------------------|----------------|------------------|
| INT-01 | WiFi connection | Power on ESP8266; observe serial for "WiFi connected" | IP address printed; MQTT connection follows |
| INT-02 | MQTT publish | Trigger motion on any PIR; subscribe to `lumenclass/sensor/state` with `mosquitto_sub` | JSON payload with `lux`, `duty`, `motion`, `occupancy`, `zones` arrives within 1 s |
| INT-03 | MQTT subscribe | Publish `{"on": true}` to `lumenclass/zone/0/cmd` | Zone 0 LED turns ON regardless of PIR state |
| INT-04 | MQTT override clear | Publish `{"on": null}` to `lumenclass/zone/0/cmd` | Zone 0 returns to PIR-driven behavior |
| INT-05 | Dashboard WebSocket | Open dashboard; observe edge pill indicator | "ESP8266 connected" label and green dot appear |
| INT-06 | Chart population | Wait 2 minutes after MQTT connects | Chart shows live amber (lux) and teal (duty) lines |
| INT-07 | MQTT reconnect | Disconnect broker for >30 s; reconnect | Firmware reconnects within 30 s; chart resumes |
| INT-08 | Supabase alerts | Trigger a system event | Alert row appears in "Recent Alerts" card and Alerts page |

---

#### Test Category 4 — System-Level Tests (End-to-End)

| Test ID | Scenario | Steps | Pass Criterion |
|---------|----------|-------|----------------|
| SYS-01 | Occupancy detection → dimming | Enter Room 204 area; wave in front of PIR 1 | Dashboard KPI "Occupancy" increments; PWM duty adjusts to LDR reading within 1 s |
| SYS-02 | Auto-off after vacancy | Leave area for 15 s | LED turns OFF 10 s after last PIR HIGH; dashboard occupancy drops to 0 |
| SYS-03 | Daylight-driven dimming | Gradually brighten ambient light while occupied | Duty decreases as lux increases; chart series diverge |
| SYS-04 | Manual override from dashboard | Toggle a zone card switch ON | LED activates immediately; zone tag changes from "AUTO" to "MANUAL" |
| SYS-05 | Offline resilience | Disconnect internet (keep LAN alive) | Lighting automation continues uninterrupted; MQTT data still flows |
| SYS-06 | Complete network loss | Disconnect LAN | LEDs continue last known state; firmware queues reconnect every 30 s |

---

### 1.3 Quality Metrics

Define these metrics before presenting results (use them as column headers in your results tables):

| Metric | Definition | Target |
|--------|------------|--------|
| PIR Response Latency | Time from motion to LED activation (ms) | ≤ 800 ms (debounce limit) |
| PIR False Positive Rate | Spurious triggers per hour with no motion | < 2 per hour |
| PIR False Negative Rate | Missed detections when motion present | < 5% of trials |
| LDR Accuracy | Deviation of lux estimate from reference meter | ± [X] lux |
| MQTT Publish Latency | Time from sensor state change to broker receipt | ≤ 1,200 ms (1 loop cycle + publish) |
| Dashboard Update Lag | Time from MQTT publish to visible UI change | ≤ 500 ms |
| MQTT Reconnect Time | Time to re-establish connection after dropout | ≤ 35 s |
| PWM Linearity | Duty response across LDR range | R² ≥ 0.95 vs. linear model |

---

## Part 2: Presentation of Results

### 2.1 Hardware Unit Test Results

Present a summary table of `test.py` runs:

**Table 2.1 — Hardware Unit Test Summary**

| Test ID | Component Tested | Trials | Pass | Fail | Pass Rate |
|---------|-----------------|--------|------|------|-----------|
| HW-01 | LED Sequential | [N] | [N] | [N] | [%] |
| HW-02 | PIR Sensor 1 | [N] | [N] | [N] | [%] |
| HW-03 | PIR Sensor 2 | [N] | [N] | [N] | [%] |
| HW-04 | PIR Sensor 3 | [N] | [N] | [N] | [%] |
| HW-05 | PIR Sensor 4 | [N] | [N] | [N] | [%] |
| HW-06 | LDR + MOSFET PWM | [N] | [N] | [N] | [%] |

---

### 2.2 PIR Sensor Performance

Run a controlled trial: walk through the detection zone 20 times per sensor, once from each approach angle (frontal, lateral). Record:

**Table 2.2 — PIR Detection Performance (per zone)**

| Zone | GPIO | Trials | True Positives | False Positives | False Negatives | Avg. Response Time (ms) |
|------|------|--------|----------------|-----------------|-----------------|-------------------------|
| Zone 1 (Front-Left) | D1 | 20 | [N] | [N] | [N] | [ms] |
| Zone 2 (Front-Right) | D5 | 20 | [N] | [N] | [N] | [ms] |
| Zone 3 (Back-Right) | D6 | 20 | [N] | [N] | [N] | [ms] |
| Zone 4 (Back-Left) | D7 | 20 | [N] | [N] | [N] | [ms] |

**How to measure response time:** Use `mosquitto_sub -t lumenclass/sensor/state` and note the timestamp of the first payload where the corresponding `motion` array element changes to `true`. Compare against your known time of entering the zone.

---

### 2.3 LDR Brightness Control

Record ADC and PWM duty at several ambient light levels using a reference lux meter.

**Table 2.3 — LDR-to-PWM Duty Mapping**

| Ambient Light (reference lux) | LDR Raw ADC (A0) | Computed Duty | Duty % | Expected Duty % |
|-------------------------------|-----------------|---------------|--------|-----------------|
| ~0 (complete dark) | [~900] | [~1023] | ~100% | 100% |
| ~100 | [N] | [N] | [%] | [%] |
| ~300 | [N] | [N] | [%] | [%] |
| ~500 | [N] | [N] | [%] | [%] |
| ~700 | [N] | [N] | [%] | [%] |
| ~900 | [N] | [N] | [%] | [%] |
| ~1000 (bright room) | [~100] | [~0] | ~0% | 0% |

> **Figure suggestion:** Plot Duty % (y-axis) vs. Ambient Lux (x-axis). Show the theoretical inverse-linear curve alongside your measured points. This visually confirms the `ambient_to_duty()` formula is behaving correctly.

---

### 2.4 MQTT Communication Performance

**Table 2.4 — MQTT Latency Measurements**

| Metric | Measured Value | Target | Result |
|--------|----------------|--------|--------|
| Avg. publish latency (ESP8266 → broker) | [ms] | ≤ 1,200 ms | PASS/FAIL |
| Avg. dashboard update lag (broker → UI) | [ms] | ≤ 500 ms | PASS/FAIL |
| Reconnect time after 30 s broker dropout | [s] | ≤ 35 s | PASS/FAIL |
| Zone override command round-trip time | [ms] | ≤ 2,000 ms | PASS/FAIL |

---

### 2.5 Integration Test Results

**Table 2.5 — Integration Test Summary**

| Test ID | Test Description | Result | Notes |
|---------|-----------------|--------|-------|
| INT-01 | WiFi connection | PASS/FAIL | |
| INT-02 | MQTT publish (sensor state) | PASS/FAIL | |
| INT-03 | MQTT subscribe (zone override ON) | PASS/FAIL | |
| INT-04 | MQTT override clear (return to auto) | PASS/FAIL | |
| INT-05 | Dashboard WebSocket connection | PASS/FAIL | |
| INT-06 | Chart live data population | PASS/FAIL | |
| INT-07 | MQTT auto-reconnect | PASS/FAIL | |
| INT-08 | Supabase alert logging | PASS/FAIL | |

---

### 2.6 System-Level Test Results

**Table 2.6 — End-to-End System Test Summary**

| Test ID | Scenario | Result | Observed Behavior |
|---------|----------|--------|-------------------|
| SYS-01 | Occupancy detection → dimming | PASS/FAIL | |
| SYS-02 | Auto-off after vacancy (10 s hold) | PASS/FAIL | |
| SYS-03 | Daylight-driven dimming | PASS/FAIL | |
| SYS-04 | Manual override from dashboard | PASS/FAIL | |
| SYS-05 | Offline resilience (LAN only) | PASS/FAIL | |
| SYS-06 | Complete network loss | PASS/FAIL | |

---

### 2.7 Suggested Figures

Include at minimum the following figures in this section:

1. **Figure 4.1 — PIR Response Latency Distribution**: Box plot or histogram of response times across 4 zones and N trials.
2. **Figure 4.2 — LDR-to-PWM Duty Curve**: Scatter plot of measured points overlaid with theoretical inverse-linear curve.
3. **Figure 4.3 — Dashboard Screenshot (Room 204, Live Data)**: Capture during active testing; annotate KPIs, chart, and zone card states.
4. **Figure 4.4 — MQTT Publish Timeline**: Timeline diagram showing sensor → broker → dashboard latency stages.
5. **Figure 4.5 — MQTT Reconnect Behavior**: Chart or annotated log showing connection drop and automatic recovery.

---

## Part 3: Interpretations and Discussion

### 3.1 PIR Sensor Accuracy and Debounce Effectiveness

**Discuss the following:**

The debounce algorithm in `main.py` (lines 195–204) requires 3 consecutive HIGH readings over 600 ms before accepting motion. Discuss how this design choice trades off **response speed** against **false positive rejection**:

- If your false positive rate was low (< 2/hr), explain this as evidence that the 600 ms debounce window successfully filters electrical noise and brief thermal artifacts common in HC-SR501-class sensors.
- If response latency averaged near 800 ms, explain this is the theoretical floor imposed by the debounce window and is an intentional design trade-off.
- If any false negatives occurred (motion missed), discuss whether these correlated with oblique approach angles or distance from sensor, both known limitations of passive infrared detection.

**Reference expectation:** The HC-SR501 datasheet specifies a detection range of up to 7 m and a 110° detection cone. Missed detections at the periphery of this cone are expected behavior, not firmware failures.

---

### 3.2 LDR-Based Adaptive Dimming

**Discuss the following:**

The `ambient_to_duty()` function implements an inverse-linear mapping between raw ADC input and PWM duty:

```
ratio = (dark_raw - clamped) / (dark_raw - bright_raw)
duty  = LED_MIN_DUTY + int(ratio × (LED_MAX_DUTY - LED_MIN_DUTY))
```

- If your measured curve closely matched the theoretical line (R² ≥ 0.95), interpret this as confirming that the LDR voltage divider is behaving linearly within the expected ADC range and that no noise correction is required.
- If the curve showed non-linearity at extremes (near 0 lux or near peak lux), explain this is a known characteristic of photoresistor response curves, which are logarithmic in nature. The linear firmware model is a reasonable approximation for the mid-range where the system spends most operational time.
- Discuss the practical implication: as ambient daylight increases toward 1000 lux, the LEDs dim toward 0% duty, **saving energy proportionally**. This is the core energy-saving mechanism of the system.

---

### 3.3 MQTT Communication Reliability

**Discuss the following:**

- The firmware publishes sensor state every ~1 second (5 loops × 200 ms). Discuss whether your measured publish latency fell within this window and what factors could cause variance (WiFi contention, broker queue depth, ESP8266 heap constraints).
- The `retain=True` flag on `TOPIC_STATE` and `TOPIC_STATUS` ensures that a reconnecting subscriber (browser tab refresh, brief network drop) immediately receives the last known state. If your INT-07 reconnect test passed, discuss this as evidence of **graceful recovery** without data loss from the user perspective.
- If MQTT reconnect required longer than 35 s in any trial, discuss the root cause (WiFi DHCP re-acquisition delay is the most common cause on ESP8266) and whether the 30-second retry interval in `main.py` (line 176: `RECONNECT_EVERY = 150`) is appropriate for classroom environments.

---

### 3.4 Edge-First Architecture Validation

**Discuss the following — this is a central argument of your study:**

The firmware is deliberately designed so that **all automation logic runs locally on the ESP8266**, independent of the dashboard, broker, or internet connectivity. Evidence of this:

- `zone_overrides` default to `None` (PIR-auto), not to a cloud-fetched value.
- `motion_triggered` and `last_motion_ts` are maintained entirely in device memory.
- `set_shared_brightness()` and `set_led_state()` are called from the main loop regardless of MQTT connection state.

Your SYS-05 and SYS-06 results should directly validate this design. If lighting continued to function during broker disconnection:

> "The test confirmed that lighting automation is not predicated on cloud connectivity. The dashboard provides visibility and control augmentation, not dependency. This aligns with edge-computing principles where latency-critical decisions must not require round-trips to remote infrastructure."

If SYS-06 showed any disruption to LED behavior during network loss, investigate whether `zone_overrides` retained stale `True` values and discuss this as a minor firmware improvement opportunity.

---

### 3.5 Dashboard Real-Time Responsiveness

**Discuss the following:**

The React dashboard (App.jsx) implements three real-time data streams:

1. **MQTT WebSocket** — sensor state and zone data (via `useMQTT` hook, lines 287–343)
2. **Supabase Realtime** — alert events (via `useAlerts` hook, lines 436–465)
3. **Chart history** — 10-minute rolling window via `useChartHistory` (lines 391–412)

If your dashboard update lag was within 500 ms, discuss this as confirming that WebSocket push notifications are suitable for non-safety-critical building automation dashboards.

Discuss the **stale data detection mechanism** (lines 635–646): the dashboard polls every 5 seconds and flags data as stale if no MQTT message has arrived in 30 seconds, even when the WebSocket connection remains technically open. Explain why this is important: a connected-but-silent broker does not mean the ESP8266 is functioning.

---

### 3.6 Manual Override and Return-to-Auto

**Discuss the following:**

The zone toggle in the dashboard publishes either `{"on": true}` (force on) or `{"on": null}` (return to PIR-auto) to `lumenclass/zone/{i}/cmd`. The design of using `null` — rather than `{"on": false}` — to clear overrides is significant:

- `{"on": false}` would permanently force a zone OFF, which is undesirable in a classroom where the system should resume automatic detection.
- `{"on": null}` means "remove the override entry entirely," allowing the PIR state machine to resume control.

If your INT-03 and INT-04 tests passed, this confirms the override protocol is correctly bidirectional. Discuss any observed delay between publishing the override command and the LED responding; this should equal roughly one MQTT round-trip plus one 200 ms firmware loop cycle.

---

### 3.7 Overall System Performance Against Objectives

Conclude Part 3 with a table that maps each test outcome back to your study's objectives. Use this format:

**Table 3.1 — Objectives vs. Test Outcomes**

| Study Objective | Related Tests | Result | Interpretation |
|----------------|---------------|--------|----------------|
| Automate lighting based on occupancy | HW-02 to HW-05, SYS-01, SYS-02 | [ACHIEVED/PARTIAL/NOT ACHIEVED] | [Your interpretation] |
| Reduce energy via ambient light sensing | HW-06, SYS-03, Table 2.3 | [ACHIEVED/PARTIAL/NOT ACHIEVED] | [Your interpretation] |
| Enable remote monitoring and override | INT-02 to INT-06, SYS-04 | [ACHIEVED/PARTIAL/NOT ACHIEVED] | [Your interpretation] |
| Maintain operation during network loss | SYS-05, SYS-06 | [ACHIEVED/PARTIAL/NOT ACHIEVED] | [Your interpretation] |
| Log events for audit and analysis | INT-08, Table 2.6 | [ACHIEVED/PARTIAL/NOT ACHIEVED] | [Your interpretation] |

---

## Appendix Notes for Chapter 4

Include the following as appendices or inline figures where appropriate:

- **Appendix A:** Raw serial output from `test.py` HW-06 session (A0 and duty readings over time)
- **Appendix B:** Sample MQTT payload from `lumenclass/sensor/state`:
  ```json
  {
    "lux": 342,
    "lux_raw": 612,
    "duty": 411,
    "motion": [true, false, false, true],
    "occupancy": 2,
    "zones": [
      {"on": true,  "override": false},
      {"on": false, "override": false},
      {"on": false, "override": false},
      {"on": true,  "override": false}
    ]
  }
  ```
- **Appendix C:** Dashboard screenshots with annotations (KPI panel, chart, zone control, alerts page)
- **Appendix D:** Wiring diagram from `backend/WIRING.md` (already documented; cite it directly)
