# Mathaka pill box (optional, Arduino + ESP32)

A cheap 4-slot pill box that **lights the slot that is due now**. The elder presses that slot's button, or opens its lid, to say "I took it". The phone still does every check (double-dose guard, missed doses, family alerts). The box only shows and listens, and it never decides anything.

The box is optional. Without it, the app shows the same box on screen (the "virtual pill box").

## Parts (about LKR 3,000 / US$10)

| Part | Count | Note |
|---|---|---|
| ESP32 dev board (ESP32-DevKitC or similar) | 1 | Bluetooth LE built in |
| 5 mm LEDs (yellow, orange, purple, blue: the slot colours) | 4 | one per slot |
| 220 Ω resistors | 4 | one per LED |
| Push buttons **or** reed switches + small magnets | 4 | buttons = `PRESS n`; reed switch in each lid = `LID n OPEN` |
| A 4-slot weekly pill box, USB power bank or 5 V phone charger | 1 | |

## Wiring

```
ESP32            slot 1 (morning)   slot 2 (noon)   slot 3 (evening)   slot 4 (night)
GPIO16 ─220Ω─▶|─ GND   (LED 1)
GPIO17 ─220Ω─▶|─ GND   (LED 2)
GPIO18 ─220Ω─▶|─ GND   (LED 3)
GPIO19 ─220Ω─▶|─ GND   (LED 4)

GPIO25 ──[button 1 / reed 1]── GND     (internal pull-up, no resistor needed)
GPIO26 ──[button 2 / reed 2]── GND
GPIO27 ──[button 3 / reed 3]── GND
GPIO33 ──[button 4 / reed 4]── GND
```

For lid switches, set `#define INPUT_MODE_LID 1` at the top of the sketch. Glue a reed switch under each lid's edge and a small magnet on the lid, so the switch is closed when the lid is shut.

## Flash it (Arduino IDE)

1. Install the **Arduino IDE 2**.
2. Add the ESP32 boards: **Boards Manager** → search "esp32" → install **esp32 by Espressif Systems** (2.x or 3.x both work).
3. Open `firmware/esp32/mathaka_box/mathaka_box.ino`.
4. Choose **Tools → Board → ESP32 Dev Module** and your COM port, then click **Upload**.
5. Open the **Serial Monitor** (115200 baud). You should see `HELLO mathaka-box v1`, and the 4 LEDs do a quick "hello" wave.

## Try it without hardware (Wokwi, in the browser)

1. Go to <https://wokwi.com/projects/new/esp32>.
2. Paste the sketch into `sketch.ino`, and paste `diagram.json` from this folder into `diagram.json`.
3. Press **Play**. In the serial monitor type `LIGHT 1`: the morning LED turns on. `BLINK 4` blinks the night LED (1 flash per second at most). Click button 2: the monitor prints `PRESS 2`.

Wokwi does not simulate Bluetooth, so the phone link needs a real board. The protocol is the same over BLE and Serial, so everything else can be tested here.

## Connect it to the app

Open **Family → Settings → Pill box → Find the pill box** on the elder phone. This needs the Mathaka dev/preview build, because Bluetooth is a native module. After that:

- the app sends `ALL_OFF` + `LIGHT n` when a slot opens, and `BLINK n` when the dose is late;
- pressing the lit slot = "I took it" (the same double-dose guard as the screen button);
- pressing or opening another slot does nothing for the elder; the family gets a quiet alert ("a different slot was opened").

## Protocol (also in `packages/core/src/box.ts`)

| Direction | Line | Meaning |
|---|---|---|
| phone → box | `LIGHT n` / `BLINK n` / `OFF n` / `ALL_OFF` | n = 1 morning, 2 noon, 3 evening, 4 night |
| box → phone | `PRESS n` | button n pressed |
| box → phone | `LID n OPEN` / `LID n CLOSE` | lid switch n |
| box → phone | `HELLO mathaka-box v1` | on start and when the phone connects |

BLE: service `6e1a0001-6d61-7468-616b-612d626f7821`, write characteristic `…0002…`, notify characteristic `…0003…`.

## Safety

- The box never decides anything. It only shows and listens; the app applies the same rules as the touch screen.
- Blinking is limited to 1 flash per second.
- A lit slot turns itself off after 3 hours, in case the phone is gone.
- A slot lock can be added later as one more command (`LOCK n`) without changing the rest.
