import {
  addDays,
  alertSms,
  dateKey,
  diffElderLog,
  pairingToQr,
  type Alert,
  type ElderLogMessage,
  type Pairing,
} from '@mathaka/core';
import * as Crypto from 'expo-crypto';
import { DEMO_MODE } from '../config';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';
import { clock } from './clock';
import { LINK_PORT, linkSupported, localIp, sendToFamily, startLinkServer } from './linkServer';
import { sendSms } from './sms';

// Family <-> elder phone, with no cloud server:
//  1. same Wi-Fi: the elder phone sends its log to the family phone (paired by QR)
//  2. otherwise: SMS from the elder phone (no mobile data needed)

export type LinkSettings = {
  /** family phone: secret for incoming messages */
  token?: string;
  /** elder phone: where the family phone listens */
  pairing?: Pairing;
  lastSentAt?: string;
  lastReceivedAt?: string;
  /** SMS alerts on/off. Off by default in demo mode (the demo numbers are fake). */
  smsEnabled: boolean;
};

const KEY = 'link';

export async function getLink(): Promise<LinkSettings> {
  const repo = await getRepository();
  return { smsEnabled: !DEMO_MODE, ...((await repo.getSetting<LinkSettings>(KEY)) ?? {}) };
}

async function setLink(patch: Partial<LinkSettings>): Promise<LinkSettings> {
  const repo = await getRepository();
  const next = { ...(await getLink()), ...patch };
  await repo.setSetting(KEY, next);
  useAppStore.getState().bumpData();
  return next;
}

export const setSmsEnabled = (on: boolean) => setLink({ smsEnabled: on });

// ---------- family phone ----------

/** QR text the elder phone scans to pair. Null if the phone has no Wi-Fi address. */
export async function familyPairingQr(familyName: string): Promise<string | null> {
  const host = await localIp();
  if (!host) return null;
  let { token } = await getLink();
  if (!token) {
    token = Crypto.randomUUID().replace(/-/g, '');
    await setLink({ token });
  }
  return pairingToQr({ v: 1, host, port: LINK_PORT, token, family: familyName });
}

/** Merge an elder phone's log into this (family) phone. Safe to receive twice. */
export async function receiveElderLog(msg: ElderLogMessage): Promise<number> {
  const repo = await getRepository();
  const from = dateKey(addDays(clock.now(), -14));
  const have = {
    events: new Map((await repo.listDoseEvents(from, '9999-12-31')).map((e) => [e.id, e])),
    alerts: new Map((await repo.listAlerts()).map((a) => [a.id, a])),
    questions: new Map(msg.questions.length ? (await repo.listQuestionEvents(msg.questions[0]!.date)).map((q) => [q.id, q]) : []),
  };
  const d = diffElderLog(have, msg);
  for (const e of d.events) await repo.saveDoseEvent(e);
  for (const a of d.alerts) await repo.saveAlert(a);
  for (const q of d.questions) await repo.addQuestionEvent(q);
  for (const m of await repo.listMedicines()) {
    const left = msg.remaining[m.id];
    if (left !== undefined && left !== m.remainingCount) await repo.saveMedicine({ ...m, remainingCount: left });
  }
  await setLink({ lastReceivedAt: clock.now().toISOString() });
  return d.events.length + d.alerts.length + d.questions.length;
}

/** Family phone: listen on the home Wi-Fi (dev/preview build only). */
export async function startFamilyListener(): Promise<boolean> {
  if (!linkSupported()) return false;
  const { token } = await getLink();
  if (!token) return false;
  startLinkServer(token, async (m) => {
    await receiveElderLog(m);
  });
  return true;
}

// ---------- elder phone ----------

export async function savePairing(p: Pairing): Promise<void> {
  await setLink({ pairing: p });
  void pushLogToFamily();
}

async function buildLog(token: string): Promise<ElderLogMessage> {
  const repo = await getRepository();
  const now = clock.now();
  const events = await repo.listDoseEvents(dateKey(addDays(now, -7)), dateKey(now));
  const alerts = (await repo.listAlerts()).filter((a) => a.date >= dateKey(addDays(now, -7)));
  const questions = await repo.listQuestionEvents(dateKey(now));
  const remaining = Object.fromEntries((await repo.listMedicines()).map((m) => [m.id, m.remainingCount]));
  return { type: 'elder-log', token, sentAt: now.toISOString(), events, alerts, questions, remaining };
}

/** Elder phone: send the last week of the log to the family phone. */
export async function pushLogToFamily(): Promise<boolean> {
  if (useAppStore.getState().role !== 'elder') return false;
  const { pairing } = await getLink();
  if (!pairing) return false;
  const ok = await sendToFamily(pairing, await buildLog(pairing.token));
  if (ok) await setLink({ lastSentAt: clock.now().toISOString() });
  return ok;
}

/**
 * A new alert on the elder phone: tell the family. Wi-Fi first; if that fails, SMS to the
 * family members with a phone number. The delivery is written on the alert.
 */
export async function deliverAlert(alert: Alert): Promise<'wifi' | 'sms' | 'pending' | 'local'> {
  const repo = await getRepository();
  if (useAppStore.getState().role !== 'elder') return 'local'; // same phone as the family: nothing to send
  let via: 'wifi' | 'sms' | 'pending' = 'pending';
  if (await pushLogToFamily()) via = 'wifi';
  else {
    const link = await getLink();
    const elder = await repo.getElder();
    const people = (await repo.listPeople()).filter((p) => p.phone && p.role === 'family');
    if (link.smsEnabled && elder && people.length) {
      const med = (await repo.listMedicines()).find((m) => m.id === String(alert.data?.medicineId ?? ''));
      const lang = useAppStore.getState().uiLang;
      const text = alertSms(lang, elder.preferredName, alert, med?.purpose[lang] ?? '');
      let sent = 0;
      for (const p of people) {
        try {
          if ((await sendSms(p.phone!, text, false)) === 'sent') sent++;
        } catch {
          // try the next person
        }
      }
      if (sent) via = 'sms';
    }
  }
  await repo.saveAlert({ ...alert, data: { ...(alert.data ?? {}), delivered: via } });
  return via;
}

/** Retry alerts that could not be delivered yet (app start, background task). */
export async function deliverPending(): Promise<number> {
  const repo = await getRepository();
  let n = 0;
  for (const a of await repo.listAlerts()) {
    if (a.data?.delivered === 'pending' && !a.readAt) {
      if ((await deliverAlert(a)) !== 'pending') n++;
    }
  }
  return n;
}
