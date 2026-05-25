# MicroPython project for ESP8266
# 4 PIR sensors each control a corresponding LED.
# One LDR on A0 adjusts the shared MOSFET brightness via PWM based on ambient light.
# Sensor state is published over MQTT; zone override commands are received via MQTT.

import machine
import time
import network
import ujson
from umqtt.simple import MQTTClient

# ── WiFi credentials ──────────────────────────────────────────
WIFI_SSID     = 'ZTE_BETA_P72UEQ'
WIFI_PASSWORD = 'rRRG/09021995'

# ── MQTT broker (plain TCP port 1883) ─────────────────────────
MQTT_BROKER    = '192.168.1.13'   # change to your broker IP
MQTT_PORT      = 1883
MQTT_CLIENT_ID = b'esp8266-lumenclass'

TOPIC_STATE  = b'lumenclass/sensor/state'
TOPIC_STATUS = b'lumenclass/status'
TOPIC_ZONE   = b'lumenclass/zone/+/cmd'   # subscribed; + matches zone index

# ── Pin assignments ───────────────────────────────────────────
PIR_PINS       = [12, 13, 14, 5]   # D6, D7, D5, D1
LED_PINS       = [0, 2, 15, 16]    # D3, D4, D8, D0
MOSFET_GATE_PIN = 4                # D2

# ── LDR ──────────────────────────────────────────────────────
LDR_ADC = machine.ADC(0)           # A0

# ── PWM / brightness calibration ─────────────────────────────
PWM_FREQ               = 1000
# Hardware uses a pull-up LDR: bright room → HIGH raw (≈900), dark room → LOW raw (≈100).
# Higher reading = brighter ambient, so the flag is False.
LDR_READING_HIGHER_IS_DARK = False
LDR_BRIGHT_RAW         = 100
LDR_DARK_RAW           = 900
LED_MIN_DUTY           = 0
LED_MAX_DUTY           = 1023

# ── Motion hold ───────────────────────────────────────────────
MOTION_HOLD_MS = 10000

# ── Initialize hardware ───────────────────────────────────────
pirs = []
leds = []

for led_pin_no in LED_PINS:
    pin = machine.Pin(led_pin_no, machine.Pin.OUT)
    pin.value(0)
    leds.append(pin)

gate_pin   = machine.Pin(MOSFET_GATE_PIN, machine.Pin.OUT)
mosfet_pwm = machine.PWM(gate_pin)
mosfet_pwm.freq(PWM_FREQ)
mosfet_pwm.duty(0)

for p in PIR_PINS:
    pirs.append(machine.Pin(p, machine.Pin.IN))

last_motion_ts = [0] * len(pirs)

# None = PIR-driven auto; True/False = manual override from MQTT
zone_overrides = [None] * len(LED_PINS)
# Stays False until the PIR has fired at least once; prevents the
# hold-timer from triggering on the initial last_motion_ts = 0 value.
motion_triggered = [False] * len(LED_PINS)


# ── Helpers ───────────────────────────────────────────────────

def clamp(value, lower, upper):
    if value < lower: return lower
    if value > upper: return upper
    return value


def set_led_state(index, on):
    leds[index].value(1 if on else 0)


def set_shared_brightness(duty):
    mosfet_pwm.duty(clamp(duty, LED_MIN_DUTY, LED_MAX_DUTY))


def all_off():
    for i in range(len(leds)):
        set_led_state(i, False)
    set_shared_brightness(0)


def read_ambient_raw(samples=5):
    total = 0
    for _ in range(samples):
        total += LDR_ADC.read()
    return total // samples


def ambient_to_duty(raw_value):
    bright_raw = min(LDR_BRIGHT_RAW, LDR_DARK_RAW)
    dark_raw   = max(LDR_BRIGHT_RAW, LDR_DARK_RAW)
    if dark_raw == bright_raw:
        return LED_MAX_DUTY
    clamped = clamp(raw_value, bright_raw, dark_raw)
    if LDR_READING_HIGHER_IS_DARK:
        ratio = (clamped - bright_raw) / (dark_raw - bright_raw)
    else:
        ratio = (dark_raw - clamped) / (dark_raw - bright_raw)
    return clamp(LED_MIN_DUTY + int(ratio * (LED_MAX_DUTY - LED_MIN_DUTY)), LED_MIN_DUTY, LED_MAX_DUTY)


# ── WiFi ──────────────────────────────────────────────────────

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Connecting to WiFi:', WIFI_SSID)
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        for _ in range(20):
            if wlan.isconnected():
                break
            time.sleep(1)
    if wlan.isconnected():
        print('WiFi connected:', wlan.ifconfig()[0])
        return True
    print('WiFi connection failed — running without MQTT')
    return False


# ── MQTT ──────────────────────────────────────────────────────

def mqtt_callback(topic, msg):
    # Receives: lumenclass/zone/{index}/cmd  payload: {"on": true/false}
    try:
        parts = topic.decode().split('/')
        if len(parts) == 4 and parts[3] == 'cmd':
            idx = int(parts[2])
            if 0 <= idx < len(LED_PINS):
                data = ujson.loads(msg)
                # None clears the override (returns to PIR-auto)
                zone_overrides[idx] = data.get('on', None)
    except Exception:
        pass


def connect_mqtt():
    client = MQTTClient(
        MQTT_CLIENT_ID, MQTT_BROKER, port=MQTT_PORT, keepalive=60,
    )
    client.set_last_will(TOPIC_STATUS, b'offline', retain=True)
    client.set_callback(mqtt_callback)
    client.connect()
    client.subscribe(TOPIC_ZONE)
    client.publish(TOPIC_STATUS, b'online', retain=True)
    print('MQTT connected to', MQTT_BROKER)
    return client


# ── Main loop ─────────────────────────────────────────────────

def run_controller(interval_ms=200):
    mqtt_client    = None
    publish_tick   = 0
    reconnect_tick = 0
    PUBLISH_EVERY   = 5    # publish every 5 × 200 ms ≈ 1 s
    RECONNECT_EVERY = 150  # retry MQTT every 150 × 200 ms = 30 s

    if connect_wifi():
        try:
            mqtt_client = connect_mqtt()
        except Exception as e:
            print('MQTT connect failed:', e)

    try:
        while True:
            now          = time.ticks_ms()
            ambient_raw  = read_ambient_raw()
            ambient_duty = ambient_to_duty(ambient_raw)
            any_led_on   = False
            led_states   = []

            for i, pir in enumerate(pirs):
                pir_high = bool(pir.value())
                if pir_high:
                    last_motion_ts[i]  = now
                    motion_triggered[i] = True

                override = zone_overrides[i]
                if override is not None:
                    on = override
                elif not motion_triggered[i]:
                    on = False  # no PIR event yet — stay off
                elif pir_high:
                    on = True
                elif time.ticks_diff(now, last_motion_ts[i]) < MOTION_HOLD_MS:
                    on = True
                else:
                    on = False

                set_led_state(i, on)
                if on:
                    any_led_on = True
                led_states.append(on)

            set_shared_brightness(ambient_duty if any_led_on else 0)

            if mqtt_client is not None:
                publish_tick += 1
                try:
                    if publish_tick >= PUBLISH_EVERY:
                        publish_tick = 0
                        # Ambient lux: derived directly from raw LDR (NOT from duty).
                        # High raw = bright room → lux 1000; low raw = dark → lux 0.
                        # This is the inverse of ambient_duty, giving complementary chart series.
                        _br = min(LDR_BRIGHT_RAW, LDR_DARK_RAW)
                        _dk = max(LDR_BRIGHT_RAW, LDR_DARK_RAW)
                        lux_est = int(clamp((ambient_raw - _br) / (_dk - _br), 0.0, 1.0) * 1000)
                        payload = ujson.dumps({
                            'lux':       lux_est,
                            'lux_raw':   ambient_raw,
                            'duty':      ambient_duty,
                            'motion':    [bool(p.value()) for p in pirs],
                            'occupancy': sum(led_states),
                            'zones': [
                                {'on': led_states[i], 'override': zone_overrides[i] is not None}
                                for i in range(len(leds))
                            ],
                        })
                        # retain=True so a reconnecting subscriber gets the last state immediately
                        mqtt_client.publish(TOPIC_STATE, payload.encode(), retain=True)
                    mqtt_client.check_msg()
                except Exception as e:
                    print('MQTT error:', e)
                    mqtt_client = None
                    reconnect_tick = 0  # start reconnect countdown immediately
            else:
                # Periodically attempt to reconnect WiFi + MQTT
                reconnect_tick += 1
                if reconnect_tick >= RECONNECT_EVERY:
                    reconnect_tick = 0
                    wlan = network.WLAN(network.STA_IF)
                    if not wlan.isconnected():
                        print('WiFi lost — reconnecting...')
                        connect_wifi()
                    try:
                        mqtt_client = connect_mqtt()
                        publish_tick = 0
                        print('MQTT reconnected')
                    except Exception as e:
                        print('MQTT reconnect failed:', e)

            time.sleep_ms(interval_ms)

    except KeyboardInterrupt:
        pass
    finally:
        all_off()
        if mqtt_client:
            try:
                mqtt_client.publish(TOPIC_STATUS, b'offline', retain=True)
                mqtt_client.disconnect()
            except Exception:
                pass


if __name__ == '__main__':
    all_off()
    print('LumenClass PIR + LDR + MOSFET + MQTT controller starting')
    run_controller()
