# ESP8266 PIR to LED Wiring Guide

This document describes the hardware wiring used by `main.py` for a MicroPython ESP8266 project where 4 PIR motion sensors each control their own LED channel, while one shared LDR and one MOSFET set the brightness of all active LEDs.

## Components

- 1 x ESP8266 development board
- 4 x PIR motion sensors
- 1 x LDR photoresistor
- 1 x resistor for the LDR voltage divider
- 1 x N-channel MOSFET for shared LED dimming control
- 4 x LEDs
- 4 x current-limiting resistors for the LEDs, typically 220 ohm to 330 ohm
- Jumper wires and a breadboard
- A stable 3.3V or 5V power source, depending on the PIR module and board setup

## GPIO Pin Assignments

The script uses raw GPIO numbers, not board labels. On common NodeMCU-style boards, these map like this:

| Function | GPIO | Common Board Label |
| --- | ---: | --- |
| PIR sensor 1 input | 12 | D6 |
| PIR sensor 2 input | 13 | D7 |
| PIR sensor 3 input | 14 | D5 |
| PIR sensor 4 input | 5 | D1 |
| LED 1 enable | 0 | D3 |
| LED 2 enable | 2 | D4 |
| LED 3 enable | 15 | D8 |
| LED 4 enable | 16 | D0 |
| MOSFET gate | 4 | D2 |
| LDR analog input | A0 | A0 |

## Wiring Rules

- Each PIR sensor needs `VCC`, `GND`, and `OUT`.
- Each PIR `OUT` wire goes to its assigned ESP8266 GPIO input.
- All PIR grounds must connect to the ESP8266 ground.
- Each LED gets its own enable pin so each PIR-controlled LED remains independent.
- One MOSFET provides the shared brightness control for the whole LED bank.
- Each LED still needs its own series resistor to limit current.
- The LDR must be wired as a voltage divider into A0.
- Do not feed 5V directly into any ESP8266 GPIO pin.

## PIR Sensor Connections

Wire the PIR sensors like this:

| PIR Sensor | VCC | GND | OUT to ESP8266 |
| --- | --- | --- | --- |
| PIR 1 | 3.3V or 5V, per module spec | GND | GPIO 12 (D6) |
| PIR 2 | 3.3V or 5V, per module spec | GND | GPIO 13 (D7) |
| PIR 3 | 3.3V or 5V, per module spec | GND | GPIO 14 (D5) |
| PIR 4 | 3.3V or 5V, per module spec | GND | GPIO 5 (D1) |

Notes:

- Many PIR modules such as HC-SR501 can be powered from 5V, but their output must still stay within ESP8266-safe logic levels.
- If your PIR module outputs 5V logic, use a level shifter or voltage divider before connecting it to the ESP8266.

## LED and MOSFET Connections

Wire the LED bank like this:

1. ESP8266 GPIO 0 (D3) -> LED 1 enable path
2. ESP8266 GPIO 2 (D4) -> LED 2 enable path
3. ESP8266 GPIO 15 (D8) -> LED 3 enable path
4. ESP8266 GPIO 16 (D0) -> LED 4 enable path
5. ESP8266 GPIO 4 (D2) -> MOSFET gate
6. MOSFET source -> GND
7. MOSFET drain -> the shared LED cathode return path
8. Each LED anode -> its own current-limiting resistor -> LED supply voltage

Use a common ground between the ESP8266, the MOSFET, the PIR sensors, the LDR divider, and the LED supply.

## LDR Connections

Wire the LDR as a voltage divider into A0:

| LDR Part | Connection |
| --- | --- |
| One side of LDR | 3.3V or the board's ADC reference divider input, depending on your board |
| Other side of LDR | A0 through the divider node |
| Fixed resistor | A0 divider node to GND |

Notes:

- The ESP8266 ADC input must stay within the board's supported range.
- If your board does not expose raw 0-1V on A0, use the onboard divider exactly as required by that board.
- Calibrate `LDR_BRIGHT_RAW` and `LDR_DARK_RAW` in `main.py` after reading real values from your divider.

## Text Wiring Diagram

```text
ESP8266 / NodeMCU

PIR side:

  GPIO12 (D6) <--------- OUT PIR 1
  GPIO13 (D7) <--------- OUT PIR 2
  GPIO14 (D5) <--------- OUT PIR 3
  GPIO5  (D1) <--------- OUT PIR 4

  3.3V or 5V ----------- VCC PIR 1 / PIR 2 / PIR 3 / PIR 4
  GND ------------------ GND PIR 1 / PIR 2 / PIR 3 / PIR 4

LED side:

  GPIO0  (D3) --[enable]-------> LED 1 enable
  GPIO2  (D4) --[enable]-------> LED 2 enable
  GPIO15 (D8) --[enable]-------> LED 3 enable
  GPIO16 (D0) --[enable]-------> LED 4 enable

  GPIO4  (D2) ---> MOSFET gate
  MOSFET source ---------------- GND
  MOSFET drain ----------------- LED cathode return

  LED 1 anode --[220-330 ohm]--> LED supply
  LED 2 anode --[220-330 ohm]--> LED supply
  LED 3 anode --[220-330 ohm]--> LED supply
  LED 4 anode --[220-330 ohm]--> LED supply

All grounds must be common.
```

## ASCII Overview Diagram

```text
                    +----------------------+
                    |      ESP8266         |
                    |                      |
 PIR 1 OUT -------->| GPIO12 (D6)         |----[resistor]----> LED 1 anode
 PIR 2 OUT -------->| GPIO13 (D7)         |----[resistor]----> LED 2 anode
 PIR 3 OUT -------->| GPIO14 (D5)         |----[resistor]----> LED 3 anode
 PIR 4 OUT -------->| GPIO5  (D1)         |----[resistor]----> LED 4 anode
                    |                      |
PIR VCC ---------->| 3.3V or 5V          |
PIR GND ---------->| GND                 |-------------------> MOSFET source and LDR divider ground
                     A0 <----------------- LDR divider node
                    +----------------------+

Each PIR sensor has 3 wires: VCC, GND, OUT.
Each LED is independently enabled by software and uses the shared MOSFET for brightness.
```

## Board Notes

- The pin labels in the code are GPIO numbers, which is the safest way to wire the board.
- If you are using a different ESP8266 board than a NodeMCU-style board, check the pin mapping for that specific board before connecting wires.
- GPIO0, GPIO2, and GPIO15 can affect boot behavior on some ESP8266 boards, so double-check your module wiring if the board fails to boot.

## Power Checklist

- Connect all sensor grounds and LED grounds to the ESP8266 GND.
- Power the board with enough current for Wi-Fi plus sensors and LEDs.
- Verify the PIR output voltage is safe for the ESP8266 input pins.
- Use resistors on every LED.

## Matching The Code

The wiring above matches these settings in `main.py`:

- `PIR_PINS = [12, 13, 14, 5]`
- `LED_PINS = [4, 0, 2, 16]`
- `LED_ACTIVE_HIGH = True`

If you change the hardware wiring, update those arrays in the script to match.