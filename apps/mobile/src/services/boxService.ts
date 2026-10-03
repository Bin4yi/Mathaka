import { base64ToBytes, BOX, bytesToBase64, formatCommand, parseEvent, type BoxCommand, type BoxEvent } from '@mathaka/core';
import { PermissionsAndroid, Platform } from 'react-native';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';

// Optional Bluetooth pill box (firmware/esp32/mathaka_box). react-native-ble-plx is native:
// it exists only in the dev/preview build, so it is loaded lazily.

type BlePlx = typeof import('react-native-ble-plx');
type Manager = InstanceType<BlePlx['BleManager']>;
type Device = Awaited<ReturnType<Manager['connectToDevice']>>;

let plx: BlePlx | null | undefined;
let manager: Manager | null = null;
let device: Device | null = null;
let listener: ((e: BoxEvent) => void) | null = null;
let lastSent = '';

function ble(): BlePlx | null {
  if (plx === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module
      plx = require('react-native-ble-plx') as BlePlx;
    } catch {
      plx = null;
    }
  }
  return plx;
}

export function boxSupported(): boolean {
  return Platform.OS !== 'web' && ble() !== null;
}

export function boxConnected(): boolean {
  return device !== null;
}

/** The box's events go to the dose logic (set once by the app). */
export function onBoxEvent(fn: (e: BoxEvent) => void): void {
  listener = fn;
}

const ascii = (s: string) => bytesToBase64(Uint8Array.from(s, (c) => c.charCodeAt(0) & 0x7f));
const fromAscii = (b64: string) => String.fromCharCode(...base64ToBytes(b64));

async function permissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const p = PermissionsAndroid.PERMISSIONS;
  const want = Number(Platform.Version) >= 31 ? [p.BLUETOOTH_SCAN, p.BLUETOOTH_CONNECT] : [p.ACCESS_FINE_LOCATION];
  const res = await PermissionsAndroid.requestMultiple(want);
  return want.every((k) => res[k] === PermissionsAndroid.RESULTS.GRANTED);
}

function getManager(): Manager | null {
  const m = ble();
  if (!m) return null;
  manager ??= new m.BleManager();
  return manager;
}

async function attach(d: Device): Promise<void> {
  const connected = await d.discoverAllServicesAndCharacteristics();
  connected.monitorCharacteristicForService(BOX.service, BOX.event, (err, ch) => {
    if (err || !ch?.value) return;
    const e = parseEvent(fromAscii(ch.value));
    if (e && listener) listener(e);
  });
  connected.onDisconnected(() => {
    device = null;
    useAppStore.getState().bumpData();
  });
  device = connected;
  lastSent = '';
  const repo = await getRepository();
  await repo.setSetting('box', { id: connected.id, name: connected.name ?? BOX.name });
  useAppStore.getState().bumpData();
}

/** Scan up to 15 s for "mathaka-box" and connect. */
export async function findAndConnectBox(): Promise<'connected' | 'not_found' | 'no_permission' | 'unsupported'> {
  const m = getManager();
  if (!m) return 'unsupported';
  if (!(await permissions())) return 'no_permission';
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      m.stopDeviceScan();
      resolve('not_found');
    }, 15_000);
    void m.startDeviceScan([BOX.service], null, (err, d) => {
      if (err) {
        clearTimeout(timer);
        m.stopDeviceScan();
        resolve('not_found');
        return;
      }
      if (!d || (d.name !== BOX.name && d.localName !== BOX.name)) return;
      clearTimeout(timer);
      m.stopDeviceScan();
      d.connect()
        .then(attach)
        .then(() => resolve('connected'))
        .catch(() => resolve('not_found'));
    });
  });
}

/** App start: reconnect to the box we paired before (quietly). */
export async function reconnectBox(): Promise<boolean> {
  const m = getManager();
  if (!m || device) return !!device;
  const saved = await (await getRepository()).getSetting<{ id: string }>('box');
  if (!saved) return false;
  try {
    await attach(await m.connectToDevice(saved.id, { timeout: 8000 }));
    return true;
  } catch {
    return false;
  }
}

export async function forgetBox(): Promise<void> {
  await device?.cancelConnection().catch(() => {});
  device = null;
  await (await getRepository()).setSetting('box', null);
  useAppStore.getState().bumpData();
}

/** Send the slot lights. Skips sending if nothing changed. */
export async function sendBox(cmds: BoxCommand[]): Promise<void> {
  if (!device) return;
  const lines = cmds.map(formatCommand);
  const key = lines.join('|');
  if (key === lastSent) return;
  try {
    for (const line of lines) {
      await device.writeCharacteristicWithResponseForService(BOX.service, BOX.command, ascii(line));
    }
    lastSent = key;
  } catch {
    // the box went away; the screen still works
  }
}
