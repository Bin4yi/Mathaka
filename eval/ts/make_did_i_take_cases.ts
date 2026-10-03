/**
 * Writes eval/sets/did_i_take/cases.jsonl ONCE. Expected answers are written by hand
 * below (not computed by the app), so the test does not just check itself.
 * Elder day: breakfast 08:00, lunch 13:00, dinner 19:30, sleep 22:00 (night dose 21:30).
 * Run: npx tsx eval/ts/make_did_i_take_cases.ts   (refuses to overwrite a frozen file)
 */
import fs from 'node:fs';
import path from 'node:path';

type Ev = [slot: string, status: 'taken' | 'unsure' | 'prevented_double', at: string, day?: 'yesterday'];
type Case = {
  id: string;
  now: string;
  active?: string[];
  events: Ev[];
  action: 'ask' | 'took_it';
  expect: { kind: string; slot?: string; time?: string; next?: string };
  note: string;
};

const ALL = ['morning', 'noon', 'evening', 'night'];
const C: Case[] = [
  { id: 'd01', now: '06:00', events: [], action: 'ask', expect: { kind: 'not_yet', next: 'morning' }, note: 'before the morning window' },
  { id: 'd02', now: '07:00', events: [], action: 'ask', expect: { kind: 'not_yet', next: 'morning' }, note: 'window opens 07:30' },
  { id: 'd03', now: '07:40', events: [], action: 'ask', expect: { kind: 'due_now', slot: 'morning' }, note: 'window open, before time' },
  { id: 'd04', now: '08:10', events: [], action: 'ask', expect: { kind: 'due_now', slot: 'morning' }, note: 'due' },
  { id: 'd05', now: '08:29', events: [], action: 'ask', expect: { kind: 'due_now', slot: 'morning' }, note: 'last minute before family alert' },
  { id: 'd06', now: '08:35', events: [], action: 'ask', expect: { kind: 'ask_family', slot: 'morning' }, note: 'late -> human' },
  { id: 'd07', now: '08:10', events: [['morning', 'taken', '08:05']], action: 'ask', expect: { kind: 'taken', slot: 'morning', time: '8:05', next: 'noon' }, note: 'just taken' },
  { id: 'd08', now: '11:00', events: [['morning', 'taken', '08:12']], action: 'ask', expect: { kind: 'taken', slot: 'morning', time: '8:12', next: 'noon' }, note: 'taken hours ago' },
  { id: 'd09', now: '12:45', events: [['morning', 'taken', '08:00']], action: 'ask', expect: { kind: 'due_now', slot: 'noon' }, note: 'noon window open' },
  { id: 'd10', now: '12:45', events: [], action: 'ask', expect: { kind: 'due_now', slot: 'noon' }, note: 'morning missed, answer is about now' },
  { id: 'd11', now: '13:40', events: [['morning', 'taken', '08:00']], action: 'ask', expect: { kind: 'ask_family', slot: 'noon' }, note: 'noon late' },
  { id: 'd12', now: '13:20', events: [['morning', 'taken', '08:00'], ['noon', 'taken', '13:05']], action: 'ask', expect: { kind: 'taken', slot: 'noon', time: '1:05', next: 'evening' }, note: '' },
  { id: 'd13', now: '18:00', events: [['morning', 'taken', '08:00'], ['noon', 'taken', '13:05']], action: 'ask', expect: { kind: 'taken', slot: 'noon', time: '1:05', next: 'evening' }, note: 'late afternoon still noon window' },
  { id: 'd14', now: '19:10', events: [['morning', 'taken', '08:00'], ['noon', 'taken', '13:00']], action: 'ask', expect: { kind: 'due_now', slot: 'evening' }, note: '' },
  { id: 'd15', now: '20:05', events: [['morning', 'taken', '08:00'], ['noon', 'taken', '13:00']], action: 'ask', expect: { kind: 'ask_family', slot: 'evening' }, note: 'evening late' },
  { id: 'd16', now: '20:30', events: [['evening', 'taken', '19:40']], action: 'ask', expect: { kind: 'taken', slot: 'evening', time: '7:40', next: 'night' }, note: '' },
  { id: 'd17', now: '21:10', events: [['evening', 'taken', '19:40']], action: 'ask', expect: { kind: 'due_now', slot: 'night' }, note: '' },
  { id: 'd18', now: '21:45', events: [['night', 'taken', '21:35']], action: 'ask', expect: { kind: 'taken', slot: 'night', time: '9:35', next: 'tomorrow morning' }, note: 'next is tomorrow' },
  { id: 'd19', now: '22:05', events: [['evening', 'taken', '19:40']], action: 'ask', expect: { kind: 'ask_family', slot: 'night' }, note: 'night late' },
  { id: 'd20', now: '23:30', events: [['night', 'taken', '21:40']], action: 'ask', expect: { kind: 'taken', slot: 'night', time: '9:40', next: 'tomorrow morning' }, note: '' },
  { id: 'd21', now: '23:30', events: [], action: 'ask', expect: { kind: 'ask_family', slot: 'night' }, note: 'never taken today' },
  { id: 'd22', now: '07:45', events: [['morning', 'unsure', '07:40']], action: 'ask', expect: { kind: 'ask_family', slot: 'morning' }, note: 'unsure log -> human' },
  { id: 'd23', now: '13:00', active: ['morning', 'night'], events: [['morning', 'taken', '08:05']], action: 'ask', expect: { kind: 'taken', slot: 'morning', time: '8:05', next: 'night' }, note: 'no noon medicine' },
  { id: 'd24', now: '13:00', active: ['morning', 'night'], events: [], action: 'ask', expect: { kind: 'ask_family', slot: 'morning' }, note: 'long morning window, late' },
  { id: 'd25', now: '15:00', active: ['morning'], events: [['morning', 'taken', '08:20']], action: 'ask', expect: { kind: 'taken', slot: 'morning', time: '8:20', next: 'tomorrow morning' }, note: 'only one dose a day' },
  { id: 'd26', now: '10:00', active: ['night'], events: [], action: 'ask', expect: { kind: 'not_yet', next: 'night' }, note: 'only a night dose' },
  { id: 'd27', now: '08:10', events: [['morning', 'taken', '08:05']], action: 'took_it', expect: { kind: 'already_taken', slot: 'morning', time: '8:05' }, note: 'double dose stopped' },
  { id: 'd28', now: '08:10', events: [], action: 'took_it', expect: { kind: 'log_taken', slot: 'morning' }, note: '' },
  { id: 'd29', now: '06:30', events: [], action: 'took_it', expect: { kind: 'nothing_open', next: 'morning' }, note: 'nothing due' },
  { id: 'd30', now: '13:10', events: [['noon', 'taken', '13:02']], action: 'took_it', expect: { kind: 'already_taken', slot: 'noon', time: '1:02' }, note: '' },
  { id: 'd31', now: '21:50', events: [['night', 'taken', '21:40']], action: 'took_it', expect: { kind: 'already_taken', slot: 'night', time: '9:40' }, note: '' },
  { id: 'd32', now: '21:50', events: [], action: 'took_it', expect: { kind: 'log_taken', slot: 'night' }, note: '' },
  { id: 'd33', now: '12:20', events: [['morning', 'taken', '08:00']], action: 'took_it', expect: { kind: 'already_taken', slot: 'morning', time: '8:00' }, note: 'still the morning window' },
  { id: 'd34', now: '12:40', events: [['morning', 'taken', '08:00']], action: 'took_it', expect: { kind: 'log_taken', slot: 'noon' }, note: 'noon window opened' },
  { id: 'd35', now: '19:05', events: [['noon', 'taken', '13:00']], action: 'took_it', expect: { kind: 'log_taken', slot: 'evening' }, note: '' },
  { id: 'd36', now: '08:40', events: [], action: 'took_it', expect: { kind: 'log_taken', slot: 'morning' }, note: 'late is still allowed in the window' },
  { id: 'd37', now: '10:00', events: [['morning', 'taken', '08:05'], ['morning', 'prevented_double', '09:30']], action: 'ask', expect: { kind: 'taken', slot: 'morning', time: '8:05', next: 'noon' }, note: 'first time counts' },
  { id: 'd38', now: '00:30', events: [['night', 'taken', '21:40', 'yesterday']], action: 'ask', expect: { kind: 'not_yet', next: 'morning' }, note: 'new day after midnight' },
  { id: 'd39', now: '12:30', events: [['morning', 'taken', '08:00']], action: 'ask', expect: { kind: 'due_now', slot: 'noon' }, note: 'boundary: noon opens 12:30' },
  { id: 'd40', now: '19:00', events: [['noon', 'taken', '13:00']], action: 'ask', expect: { kind: 'due_now', slot: 'evening' }, note: 'boundary: evening opens 19:00' },
];

const out = path.resolve('eval/sets/did_i_take/cases.jsonl');
if (fs.existsSync(out)) {
  console.error(`${out} exists (frozen). Not overwriting.`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, C.map((c) => JSON.stringify({ ...c, active: c.active ?? ALL })).join('\n') + '\n');
console.log(`${C.length} cases -> ${out}`);
