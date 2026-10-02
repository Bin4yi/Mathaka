import { z } from 'zod';
import type { Alert, DoseEvent, Lang, QuestionEvent } from './types';

// Elder phone -> family phone over the home Wi-Fi (no cloud). One JSON line per message.
// Merging is idempotent (by id), so sending the same events twice is harmless.

export const PairingSchema = z.object({
  v: z.literal(1),
  host: z.string().min(3),
  port: z.number().int().min(1024).max(65535),
  token: z.string().min(16),
  family: z.string(),
});
export type Pairing = z.infer<typeof PairingSchema>;

export const PAIR_PREFIX = 'mathaka-pair:';

export function pairingToQr(p: Pairing): string {
  return PAIR_PREFIX + JSON.stringify(p);
}

export function pairingFromQr(text: string): Pairing | null {
  if (!text.startsWith(PAIR_PREFIX)) return null;
  try {
    const r = PairingSchema.safeParse(JSON.parse(text.slice(PAIR_PREFIX.length)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

const Ev = z.object({
  id: z.string(),
  date: z.string(),
  slot: z.enum(['morning', 'noon', 'evening', 'night']),
  status: z.enum(['due', 'taken', 'missed', 'prevented_double', 'unsure']),
  source: z.enum(['button', 'box', 'camera', 'family', 'seed']),
  at: z.string().nullable(),
});
const Al = z.object({
  id: z.string(),
  kind: z.enum(['missed', 'unsure_check', 'new_pill', 'low_stock', 'clinic_soon', 'unsure_answer']),
  date: z.string(),
  slot: z.enum(['morning', 'noon', 'evening', 'night']).optional(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
  data: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
const Q = z.object({ id: z.string(), at: z.string(), date: z.string(), intent: z.enum(['did_i_take', 'when_next', 'which_pills', 'other']), via: z.enum(['button', 'voice']) });

export const ElderLogMessageSchema = z.object({
  type: z.literal('elder-log'),
  token: z.string(),
  sentAt: z.string(),
  events: z.array(Ev),
  alerts: z.array(Al),
  questions: z.array(Q),
  /** medicine id -> tablets left (the elder phone counts down) */
  remaining: z.record(z.string(), z.number()),
});
export type ElderLogMessage = z.infer<typeof ElderLogMessageSchema>;

export type MergeTarget = {
  events: Map<string, DoseEvent>;
  alerts: Map<string, Alert>;
  questions: Map<string, QuestionEvent>;
};

/** What is new or changed in `msg` compared with what the family phone already has. */
export function diffElderLog(have: MergeTarget, msg: ElderLogMessage) {
  const events = msg.events.filter((e) => JSON.stringify(have.events.get(e.id)) !== JSON.stringify(e));
  // the family may have marked an alert as read: keep their readAt
  const alerts = msg.alerts
    .filter((a) => !have.alerts.has(a.id))
    .map((a) => a as Alert);
  const questions = msg.questions.filter((q) => !have.questions.has(q.id));
  return { events: events as DoseEvent[], alerts, questions: questions as QuestionEvent[] };
}

// ---------- SMS alert text (family-facing, short, plain) ----------

const SLOT: Record<Lang, Record<string, string>> = {
  en: { morning: 'morning', noon: 'noon', evening: 'evening', night: 'night' },
  si: { morning: 'උදේ', noon: 'දවල්', evening: 'හවස', night: 'රෑ' },
  ta: { morning: 'காலை', noon: 'மதிய', evening: 'மாலை', night: 'இரவு' },
};

const SMS: Record<Lang, Record<'missed' | 'unsure' | 'new_pill' | 'low_stock' | 'other', string>> = {
  en: {
    missed: 'Mathaka: {name} did not confirm the {slot} medicine ({date}). Please call to check.',
    unsure: 'Mathaka: {name} asked about the {slot} medicine and the log is not clear. Please call.',
    new_pill: 'Mathaka: {name} showed a pill that looks new. Please check the pills and calibrate again.',
    low_stock: 'Mathaka: {medicine} is running low ({n} left). Please refill.',
    other: 'Mathaka: please check {name}\'s medicine app.',
  },
  si: {
    missed: 'Mathaka: {name} {date} {slot} බෙහෙත ගත් බව තහවුරු කළේ නැත. කරුණාකර කතා කරන්න.',
    unsure: 'Mathaka: {name} {slot} බෙහෙත ගැන ඇහුවා, සටහන පැහැදිලි නැත. කරුණාකර කතා කරන්න.',
    new_pill: 'Mathaka: {name} අලුත් වගේ පෙත්තක් පෙන්නුවා. පෙති බලා නැවත සකසන්න.',
    low_stock: 'Mathaka: {medicine} අඩුයි (ඉතිරි {n}). කරුණාකර නැවත ගන්න.',
    other: 'Mathaka: කරුණාකර {name}ගේ බෙහෙත් යෙදුම බලන්න.',
  },
  ta: {
    missed: 'Mathaka: {name} {date} {slot} மருந்தை உறுதிப்படுத்தவில்லை. தயவுசெய்து அழைக்கவும்.',
    unsure: 'Mathaka: {name} {slot} மருந்தைப் பற்றி கேட்டார், பதிவு தெளிவாக இல்லை. அழைக்கவும்.',
    new_pill: 'Mathaka: {name} புதிதாகத் தெரியும் மாத்திரையைக் காட்டினார். சரிபார்க்கவும்.',
    low_stock: 'Mathaka: {medicine} குறைவாக உள்ளது ({n} மீதம்). நிரப்பவும்.',
    other: 'Mathaka: {name} இன் மருந்து செயலியைப் பார்க்கவும்.',
  },
};

/** One short SMS for one alert, in the family's language. Never medical advice. */
export function alertSms(lang: Lang, elderName: string, alert: Pick<Alert, 'kind' | 'slot' | 'date' | 'data'>, medicineName = ''): string {
  const key =
    alert.kind === 'missed' ? 'missed'
    : alert.kind === 'unsure_answer' || alert.kind === 'unsure_check' ? 'unsure'
    : alert.kind === 'new_pill' ? 'new_pill'
    : alert.kind === 'low_stock' ? 'low_stock'
    : 'other';
  const vars: Record<string, string> = {
    name: elderName,
    slot: alert.slot ? SLOT[lang][alert.slot]! : '',
    date: alert.date.slice(5),
    medicine: medicineName,
    n: String(alert.data?.remaining ?? ''),
  };
  return SMS[lang][key].replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
