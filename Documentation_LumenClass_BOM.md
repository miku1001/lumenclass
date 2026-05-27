# LumenClass — Bill of Materials (BOM)

**Smart Classroom Lighting System · Hardware Components**
*Prepared for: Room 204 Prototype Build*
*Currency: Philippine Peso (₱) · Prices based on May 2026 market survey*

---

## How to Use This Document

This Bill of Materials lists every physical part needed to build the LumenClass hardware. For each item you will find:

- A plain-language description of what the part is and what it does in the project
- The exact quantity needed
- How many to buy (some parts are sold in packs — buying a small pack is often cheaper per piece than buying individually)
- An estimated price range based on current listings on **Shopee**, **Lazada**, and local Philippine electronics stores such as Circuit Rocks, Plusivo, and MakerPH
- Buying tips to help you get the best value

Prices are estimates and may vary by seller, location, and promotions. Always compare a few listings before purchasing.

---

## Component List at a Glance

| # | Component | Qty Needed | Recommended Buy Qty | Est. Unit / Pack Price | Est. Total |
|---|---|:---:|:---:|:---:|:---:|
| 1 | Breadboard (830 holes) | 2 | 2 pcs | ₱85 – ₱95 each | ₱170 – ₱190 |
| 2 | Breadboard Wires Set (Jumper + Flat) | 1 set | 1 set | ₱120 – ₱180 per set | ₱120 – ₱180 |
| 3 | White LED (5mm) | 4 | 1 pack of 10 | ₱29 – ₱55 per pack | ₱29 – ₱55 |
| 4 | PIR Motion Sensor HC-SR501 | 4 | 4 pcs | ₱74 – ₱85 each | ₱296 – ₱340 |
| 5 | IRLZ44N MOSFET | 1 | 1 pc | ₱60 – ₱80 each | ₱60 – ₱80 |
| 6 | LDR (Light Dependent Resistor) | 1 | 1 pc or small pack | ₱9 – ₱30 each | ₱9 – ₱30 |
| 7 | 330-Ohm Resistor (1/4 Watt) | 5 | 1 pack of 10 | ₱19 – ₱25 per pack | ₱19 – ₱25 |
| 8 | ESP8266 NodeMCU (V3) | 1 | 1 pc | ₱160 – ₱225 each | ₱160 – ₱225 |
| 9 | Micro USB Data Cable | 1 | 1 pc | ₱35 – ₱79 each | ₱35 – ₱79 |
| | | | | **TOTAL ESTIMATE** | **₱898 – ₱1,204** |

---

## Detailed Component Descriptions

---

### 1. Breadboard (830 Holes)

**Quantity needed:** 2 pieces

**What it is:**
A breadboard is a rectangular plastic board full of tiny holes arranged in rows. It lets you connect electronic components together temporarily — no soldering required. Components and wires simply press into the holes and make electrical contact. All connections can be rearranged or undone at any time.

**What it does in this project:**
Both breadboards are used as the main building platform. All sensors, resistors, LEDs, and the microcontroller are placed and wired on the breadboards. Two boards are used because the full LumenClass circuit — with four PIR sensors, four LEDs, one LDR, one MOSFET, and one ESP8266 — requires more space than a single board comfortably provides.

**Specification to look for:**
830-point (830-hole) full-size solderless breadboard. Look for descriptions like "830 tie-points," "SYB-120," or "MB-102" — these all refer to the same standard size.

| | |
|---|---|
| **Qty to buy** | 2 pieces |
| **Estimated price** | ₱85 – ₱95 per piece |
| **Estimated total** | ₱170 – ₱190 |
| **Where to buy** | Plusivo (₱84), MakerPH (₱88), Circuit Rocks, Shopee, Lazada |

> **Buying tip:** Plusivo.ph regularly discounts these to around ₱84. On Shopee and Lazada, search "830 breadboard" or "MB-102 breadboard" and filter by Philippine-based sellers for faster delivery.

---

### 2. Breadboard Wires Set (Jumper Wires + Flat Wires)

**Quantity needed:** 1 complete set

**What it is:**
Wires used specifically for connecting components on a breadboard. There are two types used in this project:

- **Flexible jumper wires (also called Dupont wires):** Short wires with plastic-tipped ends that plug into the breadboard holes. They come in male-to-male, male-to-female, and female-to-female types and are used for connections between the breadboard and the ESP8266 pins or sensor headers.
- **Rigid flat wires (also called solid-core breadboard wires or hook-up wires):** Short, stiff wires in assorted lengths with bare metal ends that press into breadboard holes. They are used for neat, direct connections between nearby points on the breadboard itself.

**What it does in this project:**
These wires form all the electrical connections between the ESP8266, the four PIR sensors, the four LEDs, the LDR, the MOSFET, and the resistors. Without wires, the components have no way to communicate with each other.

**Specification to look for:**
A jumper wire set of at least 40–65 pieces in assorted colors and lengths (typically labeled as "40-pin" or "65pcs Dupont wires"), and a rigid wire set with multiple lengths (typically labeled as "breadboard jumper wire kit" or "solid core wire set").

| | |
|---|---|
| **Qty to buy** | 1 set (covering both flexible and rigid types) |
| **Estimated price** | ₱120 – ₱180 for a combined set |
| **Where to buy** | Plusivo jumper set (₱64–₱98), MakerPH 65pcs set (₱98), Circuit Rocks, Makerlab PH, Shopee |

> **Buying tip:** Many sellers bundle both wire types together in a single "breadboard starter wire kit." This is the most cost-effective option. If purchasing separately: flexible jumper wires cost around ₱64–₱98 per set, and rigid wires around ₱50–₱80 per set. Buying both separately still comes to around ₱120–₱180 total.

---

### 3. White LED (5mm)

**Quantity needed:** 4 pieces

**What it is:**
An LED (Light-Emitting Diode) is a small electronic light source. It only allows electricity to flow in one direction, and when it does, it emits light. The 5mm size refers to the diameter of the dome-shaped top.

**What it does in this project:**
One white LED represents each of the four lighting zones in Room 204 (Front-Left, Front-Right, Back-Left, Back-Right corners). In the physical prototype, each LED turns on when its corresponding PIR sensor detects motion, and its brightness is controlled by the shared MOSFET based on ambient light from the LDR.

**Specification to look for:**
5mm white LED, standard brightness (no special requirements). Sometimes labeled as "5mm white diffused LED" or "5mm white clear LED."

| | |
|---|---|
| **Qty to buy** | 1 pack of 10 (you only need 4, but packs of 10 are far cheaper per piece than buying 4 individually) |
| **Estimated price** | ₱29 – ₱55 per pack of 10 |
| **Estimated total** | ₱29 – ₱55 |
| **Where to buy** | Circuit Rocks (5pcs for ₱29), Shopee, Lazada, MakerPH |

> **Buying tip:** Circuit Rocks sells 5mm LEDs in packs of 5 for ₱29 — two packs gets you 10 pieces for ₱58, more than enough for this project and future repairs. On Shopee, search "5mm white LED 10pcs" for best value.

---

### 4. PIR Motion Sensor HC-SR501

**Quantity needed:** 4 pieces

**What it is:**
A PIR (Passive Infrared) motion sensor is a small module roughly the size of a coin. It has a white dome on top (the lens) and detects heat radiation emitted by people moving within its field of view. It outputs a HIGH signal (a small voltage) when it detects movement, and a LOW signal when no movement is detected. It has two small dials on the back that let you adjust how far it can sense (up to 7 meters) and how long it stays "triggered" after detecting motion.

**What it does in this project:**
One sensor is placed in each of the four corners of Room 204. When a person enters or moves within a zone, that zone's sensor sends a signal to the ESP8266, which turns on the LED for that zone. When no motion is detected for 10 seconds, the LED turns off automatically.

**Specification to look for:**
HC-SR501 (exact model). It operates on 5V power and outputs a 3.3V logic signal — compatible with the ESP8266. Do not substitute with other PIR modules as pinout and logic levels may differ.

| | |
|---|---|
| **Qty to buy** | 4 pieces |
| **Estimated price** | ₱74 – ₱85 per piece |
| **Estimated total** | ₱296 – ₱340 |
| **Where to buy** | Plusivo (₱74 each), MakerPH (₱75 each), Circuit Rocks (₱85 each), Shopee, Lazada |

> **Buying tip:** Plusivo and MakerPH offer the best per-unit pricing for individual pieces. On Shopee, search "HC-SR501 PIR sensor" — many sellers offer a 2-pack at a slight discount. Make sure to buy the HC-SR501 specifically, not generic "PIR modules," as wiring and sensitivity settings differ.

---

### 5. IRLZ44N MOSFET

**Quantity needed:** 1 piece

**What it is:**
A MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor) is a type of electronic switch. Unlike a regular on/off switch, it can also act as a dimmer — the ESP8266 sends it rapid pulses of varying speed (called PWM, or Pulse Width Modulation) to set the brightness level anywhere from fully off to fully on.

The IRLZ44N is specifically designed to be controlled by low-voltage logic (3.3V), which is exactly what the ESP8266 outputs. This makes it ideal for this project without needing extra circuitry to boost the control signal.

**What it does in this project:**
The MOSFET sits between the ESP8266 and the LED bank. The ESP8266 reads the LDR's brightness value and then tells the MOSFET how bright to run all four LEDs together. In a dark room, the MOSFET drives the LEDs at high brightness. In a bright room, it dims them to save energy.

**Specification to look for:**
IRLZ44N in TO-220 package (the rectangular black plastic body with a metal tab on top and three metal legs at the bottom). Do not substitute with IRFZ44N — that model requires a higher voltage to turn on fully and does not work reliably with 3.3V logic from the ESP8266.

| | |
|---|---|
| **Qty to buy** | 1 piece (buy 2–3 as spares — they are cheap and easy to accidentally damage) |
| **Estimated price** | ₱60 – ₱80 per piece |
| **Estimated total** | ₱60 – ₱80 |
| **Where to buy** | Shopee (search "IRLZ44N"), Lazada, local electronics stores |

> **Buying tip:** Single-piece listings on Shopee cost around ₱64. Some sellers offer packs of 5 for ₱85–₱111 — a pack is worth buying since these small components can be damaged if wired incorrectly, and having spares on hand avoids delays. **Double-check the model number: IRLZ44N, not IRFZ44N.**

---

### 6. LDR (Light Dependent Resistor)

**Quantity needed:** 1 piece

**What it is:**
An LDR is a small disc-shaped electronic component (usually 5mm in diameter) whose electrical resistance changes depending on how much light shines on it. In bright light, its resistance drops. In darkness, its resistance is very high. The ESP8266 reads this resistance value through its analog input pin to determine how bright the room is.

**What it does in this project:**
The single LDR is placed in the room to continuously measure ambient light. The ESP8266 uses this reading to calculate how bright the LEDs need to be — the brighter the room (more natural light), the lower the LED brightness is set. This is the core energy-saving mechanism of the system.

**Specification to look for:**
5mm LDR, any standard model such as GL5528 or GL5516. Both are widely available and work the same way in this circuit. No special specifications are required.

| | |
|---|---|
| **Qty to buy** | 1 piece (buy a small pack if available at similar cost) |
| **Estimated price** | ₱9 – ₱30 per piece |
| **Estimated total** | ₱9 – ₱30 |
| **Where to buy** | Shopee (₱9–₱20 each), Circuit Rocks component bundles, Lazada, MakerPH |

> **Buying tip:** This is one of the cheapest components in the project. On Shopee, search "LDR 5mm GL5528" or "photoresistor 5mm." Some sellers offer 5-piece packs for as little as ₱30 — a smart buy since LDRs are fragile and easy to break. Createlabz Store on Shopee is one example offering individual pieces starting at ₱9.

---

### 7. 330-Ohm Resistor (1/4 Watt)

**Quantity needed:** 5 pieces

**What it is:**
A resistor is a tiny cylindrical component with colored stripes that limits the flow of electric current in a circuit. The "330-ohm" refers to how much it limits current, and "1/4 watt" refers to how much power it can safely handle. These are among the most common components in electronics.

**What it does in this project:**
Four resistors are placed in series with the four LEDs to prevent excess current from burning them out — LEDs without a resistor will immediately overheat and fail. The fifth resistor is used in the LDR voltage divider circuit, which is how the ESP8266 reads the room's brightness as a measurable number.

**Specification to look for:**
330Ω (ohm), 1/4W (quarter watt), carbon film or metal film, through-hole (the standard type with two wire legs). The color code is Orange-Orange-Brown-Gold.

| | |
|---|---|
| **Qty to buy** | 1 pack of 10 (cheapest way to get 5; extras are always useful) |
| **Estimated price** | ₱19 – ₱25 per pack of 10 |
| **Estimated total** | ₱19 – ₱25 |
| **Where to buy** | Circuit Rocks (10-packs of common values for ₱19), Shopee, Lazada, MakerPH |

> **Buying tip:** Circuit Rocks sells packs of 10 resistors in common values (220Ω, 1KΩ, etc.) for ₱19 per pack — their 330Ω pack is similarly priced. Resistors are also commonly available in assortment kits (e.g., "300pcs 30-value resistor kit" for around ₱140) which is a worthwhile investment if you plan to build more circuits.

---

### 8. ESP8266 NodeMCU (V3)

**Quantity needed:** 1 piece

**What it is:**
The ESP8266 NodeMCU is a small development board about the size of a credit card cut in half. At its core is a microcontroller chip (the ESP8266) that can run programs, read sensor inputs, control outputs, and connect to WiFi. The "NodeMCU V3" version includes a USB connection port and built-in support circuitry that makes it easy to connect to a computer for programming.

**What it does in this project:**
This is the brain of the entire LumenClass hardware system. It:
- Reads signals from all four PIR motion sensors and decides whether to turn each LED zone on or off
- Reads the LDR value and calculates the correct brightness level
- Controls the MOSFET to set that brightness
- Connects to the local WiFi network and communicates with the dashboard over MQTT
- Receives override commands from the dashboard when a user manually toggles a zone

**Specification to look for:**
ESP8266 NodeMCU V3 with CH340G USB chip (the most common version). It connects to a computer via Micro USB cable. Some newer versions use a USB-C port — either is fine, but make sure the data cable you buy matches the port on your board.

| | |
|---|---|
| **Qty to buy** | 1 piece |
| **Estimated price** | ₱160 – ₱225 per piece |
| **Estimated total** | ₱160 – ₱225 |
| **Where to buy** | Circuit Rocks (₱225 for V3 CH340), e-Gizmo (₱160), BigGo/Shopee (₱160–₱199), Makerlab PH, Lazada |

> **Buying tip:** The most important thing is to buy from a reputable seller to avoid counterfeit boards that may not program correctly. Circuit Rocks and Makerlab PH are trusted Philippine retailers. On Shopee, look for sellers with many reviews and at least 4.5-star ratings. The CH340 chipset version (₱160–₱225) is the most common and well-supported. Avoid the very cheapest listings (under ₱100) as these are often low-quality clones.

---

### 9. Micro USB Data Cable (for ESP8266)

**Quantity needed:** 1 piece

**What it is:**
A standard Micro USB cable — the same type used to charge older Android phones. It has a small trapezoidal connector on one end (the Micro USB end, which plugs into the ESP8266) and a standard rectangular USB-A connector on the other end (which plugs into a computer or power adapter).

**What it does in this project:**
The cable serves two purposes:
1. **Programming:** During setup, it connects the ESP8266 to a computer so the LumenClass firmware can be loaded onto the board.
2. **Power:** During normal operation, the same cable can power the ESP8266 from a USB power adapter or a computer's USB port.

**Important:** Make sure to buy a **data cable**, not a **charge-only cable**. Charge-only cables look identical but have only two wires inside instead of four — they can power the board but cannot transfer the program to it. A data cable is clearly labeled as such.

**Specification to look for:**
Micro USB to USB-A, data + charge, at least 0.5 meters long. If the NodeMCU board you purchase has a USB-C port instead of Micro USB, buy a USB-C cable instead.

| | |
|---|---|
| **Qty to buy** | 1 piece |
| **Estimated price** | ₱35 – ₱79 per piece |
| **Estimated total** | ₱35 – ₱79 |
| **Where to buy** | Shopee, Lazada, any electronics or mobile accessories store |

> **Buying tip:** Many electronics sellers on Shopee include a Micro USB cable when you buy a NodeMCU board — check the listing description before buying a cable separately. If not included, search "Micro USB data cable Arduino NodeMCU" on Shopee. Cables in the ₱35–₱59 range from established sellers are reliable for this purpose.

---

## Total Cost Summary

| Component | Qty Needed | Buy Qty | Est. Total |
|---|:---:|:---:|:---:|
| Breadboard (830-hole) | 2 pcs | 2 pcs | ₱170 – ₱190 |
| Breadboard Wires Set | 1 set | 1 set | ₱120 – ₱180 |
| White LED 5mm | 4 pcs | 1 pack of 10 | ₱29 – ₱55 |
| PIR Motion Sensor HC-SR501 | 4 pcs | 4 pcs | ₱296 – ₱340 |
| IRLZ44N MOSFET | 1 pc | 1 pc | ₱60 – ₱80 |
| LDR (Light Dependent Resistor) | 1 pc | 1–5 pcs | ₱9 – ₱30 |
| 330-Ohm Resistor 1/4W | 5 pcs | 1 pack of 10 | ₱19 – ₱25 |
| ESP8266 NodeMCU V3 | 1 pc | 1 pc | ₱160 – ₱225 |
| Micro USB Data Cable | 1 pc | 1 pc | ₱35 – ₱79 |
| | | **TOTAL** | **₱898 – ₱1,204** |

**Typical build cost: approximately ₱1,000 – ₱1,100** when purchasing from mid-range sellers on Shopee or from local electronics stores such as Circuit Rocks or Plusivo.

---

## Where to Buy in the Philippines

| Store | Type | Website / Access |
|---|---|---|
| **Shopee Philippines** | Online marketplace (many sellers) | shopee.ph |
| **Lazada Philippines** | Online marketplace (many sellers) | lazada.com.ph |
| **Circuit Rocks** | Dedicated electronics store (Manila) | circuit.rocks |
| **Plusivo Philippines** | Electronics components (ships nationwide) | plusivo.ph |
| **MakerPH** | Electronics components (ships nationwide) | makerph.com |
| **Makerlab PH** | Electronics components (ships nationwide) | makerlab.ph |
| **e-Gizmo** | Electronics components (Manila) | e-gizmo.net |

> **General advice:** For the PIR sensors and ESP8266 board, buying from a dedicated electronics store (Circuit Rocks, MakerPH, or Makerlab PH) is recommended as they stock genuine components and offer reliable support. For basic passive components like resistors, LEDs, and the LDR, Shopee or Lazada is typically fine and often cheaper.

---

## Important Reminders

1. **Check your ESP8266's USB port type before buying a cable.** Most NodeMCU V3 boards use Micro USB, but some newer variants use USB-C. Inspect the board listing photos carefully.

2. **Do not substitute the MOSFET model.** The IRLZ44N is specifically chosen because it can be turned fully on by the 3.3V output of the ESP8266. The similar-looking IRFZ44N requires 5V–10V to turn on fully and will not work correctly in this circuit.

3. **Handle the LDR and LEDs with care.** These are fragile components. Bend their legs slowly and never force a component into a breadboard hole — press gently and straight down.

4. **Buy a few spares of the cheapest items.** Resistors (₱19 for 10), LEDs (₱29 for 10), and the LDR (₱9–₱30) are very inexpensive. It is good practice to have extras in case of accidental damage during building or testing.

5. **Verify seller ratings on Shopee and Lazada.** Aim for sellers with at least 4.5 stars and a significant number of completed orders, especially for the ESP8266 board and PIR sensors.

---

*Prices surveyed May 2026. Actual prices may vary by seller, location, and promotions.*
*For the latest pricing, search each component on [shopee.ph](https://shopee.ph) or [lazada.com.ph](https://lazada.com.ph).*
