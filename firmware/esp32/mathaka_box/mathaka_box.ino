/*
  Mathaka pill box — ESP32 + 4 LEDs + 4 buttons (or 4 lid reed switches)
  -----------------------------------------------------------------------
  The phone lights the slot that is due now. The elder presses that slot's button
  (or opens its lid) to say "I took it". The app does the double-dose check.

  Same plain-text protocol over BLE and over USB Serial (115200 baud), one command per line:
    phone -> box:  LIGHT n | BLINK n | OFF n | ALL_OFF        (n = 1 morning, 2 noon, 3 evening, 4 night)
    box -> phone:  PRESS n | LID n OPEN | LID n CLOSE | HELLO mathaka-box v1

  Board: any ESP32 dev board, Arduino IDE with the "esp32" core by Espressif (2.x or 3.x).
  Wiring: see README.md. Try it with no hardware: Wokwi (diagram.json in this folder; Serial only).
  Licence: Apache-2.0 (Mathaka).
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---- choose the inputs ----
// 0 = push buttons (sends PRESS n)
// 1 = lid reed switches, magnet on the lid (sends LID n OPEN / LID n CLOSE)
#define INPUT_MODE_LID 0

// Same UUIDs as packages/core/src/box.ts
#define SERVICE_UUID "6e1a0001-6d61-7468-616b-612d626f7821"
#define COMMAND_UUID "6e1a0002-6d61-7468-616b-612d626f7821"
#define EVENT_UUID   "6e1a0003-6d61-7468-616b-612d626f7821"

const int SLOTS = 4;
const int LED_PIN[SLOTS] = {16, 17, 18, 19};   // morning, noon, evening, night (220 ohm resistor each)
const int IN_PIN[SLOTS]  = {25, 26, 27, 33};   // to GND, internal pull-up: LOW = pressed / lid closed on magnet

// Blinking is slow on purpose: max 1 flash per second (photosensitivity safety).
const unsigned long BLINK_HALF_MS = 500;
const unsigned long DEBOUNCE_MS = 40;
// a lit slot turns itself off after 3 hours, in case the phone is gone
const unsigned long AUTO_OFF_MS = 3UL * 60UL * 60UL * 1000UL;

enum LedMode { OFF, ON, BLINK };
LedMode mode[SLOTS] = {OFF, OFF, OFF, OFF};
unsigned long litSince[SLOTS] = {0, 0, 0, 0};

int lastRaw[SLOTS];
int stable[SLOTS];
unsigned long changedAt[SLOTS];

BLECharacteristic *eventChar = nullptr;
bool phoneConnected = false;
bool sayHello = false;

// ---------- output: to BLE (if connected) and always to Serial ----------
void sendEvent(const String &line) {
  Serial.println(line);
  if (phoneConnected && eventChar) {
    eventChar->setValue(line.c_str());
    eventChar->notify();
  }
}

// ---------- commands ----------
void setMode(int i, LedMode m) {
  mode[i] = m;
  litSince[i] = (m == OFF) ? 0 : millis();
  if (m == OFF) digitalWrite(LED_PIN[i], LOW);
  if (m == ON) digitalWrite(LED_PIN[i], HIGH);
}

void handleCommand(String line) {
  line.trim();
  line.toUpperCase();
  if (line == "ALL_OFF") {
    for (int i = 0; i < SLOTS; i++) setMode(i, OFF);
    return;
  }
  int sp = line.indexOf(' ');
  if (sp < 0) return;
  String cmd = line.substring(0, sp);
  int n = line.substring(sp + 1).toInt();
  if (n < 1 || n > SLOTS) return;  // ignore anything we do not understand
  int i = n - 1;
  if (cmd == "LIGHT") setMode(i, ON);
  else if (cmd == "BLINK") setMode(i, BLINK);
  else if (cmd == "OFF") setMode(i, OFF);
}

// ---------- BLE ----------
class ServerEvents : public BLEServerCallbacks {
  void onConnect(BLEServer *s) override {
    phoneConnected = true;
    sayHello = true;
  }
  void onDisconnect(BLEServer *s) override {
    phoneConnected = false;
    BLEDevice::startAdvertising();  // let the phone find us again
  }
};

class CommandWrites : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    // getValue() is std::string on core 2.x and String on 3.x: c_str() works for both
    handleCommand(String(c->getValue().c_str()));
  }
};

void setupBle() {
  BLEDevice::init("mathaka-box");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerEvents());
  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *command = service->createCharacteristic(
      COMMAND_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  command->setCallbacks(new CommandWrites());
  eventChar = service->createCharacteristic(EVENT_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  eventChar->addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

// ---------- setup / loop ----------
void setup() {
  Serial.begin(115200);
  for (int i = 0; i < SLOTS; i++) {
    pinMode(LED_PIN[i], OUTPUT);
    digitalWrite(LED_PIN[i], LOW);
    pinMode(IN_PIN[i], INPUT_PULLUP);
    lastRaw[i] = stable[i] = digitalRead(IN_PIN[i]);
    changedAt[i] = 0;
  }
  // a short hello wave so the family knows every LED works
  for (int i = 0; i < SLOTS; i++) { digitalWrite(LED_PIN[i], HIGH); delay(150); digitalWrite(LED_PIN[i], LOW); }
  setupBle();
  sendEvent("HELLO mathaka-box v1");
}

String serialLine;

void loop() {
  unsigned long now = millis();

  // commands typed on USB Serial (also how the Wokwi simulator is driven)
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (serialLine.length()) handleCommand(serialLine);
      serialLine = "";
    } else if (serialLine.length() < 32) {
      serialLine += ch;
    }
  }

  if (sayHello) {  // after the phone connects, give it a moment to subscribe
    delay(300);
    sendEvent("HELLO mathaka-box v1");
    sayHello = false;
  }

  for (int i = 0; i < SLOTS; i++) {
    // LEDs
    if (mode[i] != OFF && now - litSince[i] > AUTO_OFF_MS) setMode(i, OFF);
    if (mode[i] == BLINK) digitalWrite(LED_PIN[i], ((now / BLINK_HALF_MS) % 2) ? HIGH : LOW);

    // inputs, debounced
    int raw = digitalRead(IN_PIN[i]);
    if (raw != lastRaw[i]) {
      lastRaw[i] = raw;
      changedAt[i] = now;
    }
    if (raw != stable[i] && now - changedAt[i] > DEBOUNCE_MS) {
      stable[i] = raw;
#if INPUT_MODE_LID
      // reed switch closed by the lid magnet = LOW; lid lifted = HIGH
      sendEvent(String("LID ") + (i + 1) + (raw == HIGH ? " OPEN" : " CLOSE"));
#else
      if (raw == LOW) sendEvent(String("PRESS ") + (i + 1));
#endif
    }
  }
  delay(5);
}
