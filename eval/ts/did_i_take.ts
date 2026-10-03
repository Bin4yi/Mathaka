/**
 * Runs the app's real "Did I take it?" + double-dose logic on the frozen cases.
 * Prints one JSON line per case (prediction + the exact sentence the elder would see).
 * Run: npx tsx eval/ts/did_i_take.ts eval/sets/did_i_take/cases.jsonl
 */
import fs from 'node:fs';
import {
  answerDidITake,
  decideTaken,
  elderText,
  isoClock,
  nextText,
  renderAnswer,
  SLOT_WORD,
  type DoseEvent,
  type Slot,
} from '../../packages/core/src';

const elder = { times: { wake: '06:30', breakfast: '08:00', lunch: '13:00', dinner: '19:30', sleep: '22:00' } };
const ctx = { lang: 'en' as const, name: 'Ammi', family: 'Nimal' };
const DAY = new Date(2026, 9, 2);
const at = (hm: string, dayOffset = 0) => {
  const [h, m] = hm.split(':').map(Number) as [number, number];
  return new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate() + dayOffset, h, m);
};
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const lines = fs.readFileSync(process.argv[2]!, 'utf8').trim().split('\n');
for (const line of lines) {
  const c = JSON.parse(line) as {
    id: string; now: string; active: Slot[]; action: 'ask' | 'took_it';
    events: [Slot, DoseEvent['status'], string, 'yesterday'?][];
  };
  const nowOffset = c.now < '05:00' ? 1 : 0; // "00:30" means just after midnight, the next day
  const now = at(c.now, nowOffset);
  const events: DoseEvent[] = c.events.map(([slot, status, hm, day], i) => {
    const d = at(hm, day === 'yesterday' ? nowOffset - 1 : nowOffset);
    return { id: `e${i}`, date: key(d), slot, status, source: 'button', at: d.toISOString() };
  });
  const t0 = performance.now();
  let pred: Record<string, unknown>;
  let text: string;
  if (c.action === 'ask') {
    const a = answerDidITake(now, elder, c.active, events);
    text = renderAnswer(ctx, a);
    pred = {
      kind: a.kind,
      slot: 'slot' in a ? a.slot : undefined,
      time: a.kind === 'taken' ? isoClock(a.takenAt) : undefined,
      next: 'next' in a && a.next ? (a.next.tomorrow ? `tomorrow ${a.next.slot}` : a.next.slot) : undefined,
    };
  } else {
    const d = decideTaken(now, elder, c.active, events);
    pred = {
      kind: d.kind,
      slot: 'slot' in d ? d.slot : undefined,
      time: d.kind === 'already_taken' ? isoClock(d.takenAt) : undefined,
      next: d.kind === 'nothing_open' && d.next ? d.next.slot : undefined,
    };
    text =
      d.kind === 'already_taken'
        ? elderText(ctx, 'answer.already', { slot: SLOT_WORD.en[d.slot], time: isoClock(d.takenAt), next: nextText('en', d.next) })
        : d.kind === 'log_taken'
          ? elderText(ctx, 'answer.logged')
          : elderText(ctx, 'answer.notNow', { next: nextText('en', d.next) });
  }
  const ms = performance.now() - t0;
  console.log(JSON.stringify({ id: c.id, pred, text, ms: Math.round(ms * 1000) / 1000 }));
}
