import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertSms, diffElderLog, pairingFromQr, pairingToQr, type ElderLogMessage } from './link';
import type { Alert, DoseEvent } from './types';

test('pairing QR round trip; junk is rejected', () => {
  const p = { v: 1 as const, host: '192.168.1.5', port: 8790, token: 'abcdefghijklmnop1234', family: 'Nimal' };
  assert.deepEqual(pairingFromQr(pairingToQr(p)), p);
  assert.equal(pairingFromQr('https://example.com'), null);
  assert.equal(pairingFromQr('mathaka-pair:{"v":1,"host":"x"}'), null);
});

test('merging is idempotent and keeps the family read mark', () => {
  const ev: DoseEvent = { id: 'e1', date: '2026-10-02', slot: 'morning', status: 'taken', source: 'button', at: '2026-10-02T02:35:00Z' };
  const al: Alert = { id: 'a1', kind: 'missed', date: '2026-10-02', slot: 'noon', createdAt: 'x', readAt: null };
  const msg: ElderLogMessage = { type: 'elder-log', token: 't', sentAt: 'now', events: [ev], alerts: [al], questions: [], remaining: {} };
  const empty = { events: new Map(), alerts: new Map(), questions: new Map() };
  assert.equal(diffElderLog(empty, msg).events.length, 1);
  const have = { events: new Map([[ev.id, ev]]), alerts: new Map([[al.id, { ...al, readAt: 'read' }]]), questions: new Map() };
  const d = diffElderLog(have, msg);
  assert.equal(d.events.length, 0);
  assert.equal(d.alerts.length, 0);
});

test('SMS texts are short and never tell anyone to take a pill', () => {
  for (const lang of ['en', 'si', 'ta'] as const) {
    for (const kind of ['missed', 'unsure_answer', 'new_pill', 'low_stock', 'clinic_soon'] as const) {
      const s = alertSms(lang, 'Ammi', { kind, slot: 'evening', date: '2026-10-02', data: { remaining: 5 } }, 'heart medicine');
      assert.ok(s.length <= 160, `${lang} ${kind}: ${s.length}`);
      assert.ok(!/\{\w+\}/.test(s), s);
      assert.ok(!/take (another|one more)/i.test(s));
    }
  }
  assert.equal(alertSms('en', 'Ammi', { kind: 'missed', slot: 'evening', date: '2026-10-02' }), 'Mathaka: Ammi did not confirm the evening medicine (10-02). Please call to check.');
});
