import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AiFormatError, decisionFromLabel, parseJsonLoose, prompt, runJsonTask } from './prompts';
import { Sha256, sha256Hex } from './sha256';

test('sha256 matches node:crypto, also when fed in odd chunks', () => {
  for (const len of [0, 1, 55, 56, 63, 64, 65, 1000, 100_003]) {
    const data = Uint8Array.from({ length: len }, (_, i) => (i * 131 + 7) & 255);
    const expect = createHash('sha256').update(data).digest('hex');
    assert.equal(sha256Hex(data), expect, `len ${len}`);
    const h = new Sha256();
    for (let i = 0; i < len; i += 777) h.update(data.subarray(i, i + 777));
    assert.equal(h.digestHex(), expect, `chunked len ${len}`);
  }
});

test('prompt fills variables', () => {
  const p = prompt('weekly_summary', { language: 'Sinhala', name: 'Ammi', facts: '- 25 taken' });
  assert.match(p.user, /in Sinhala for the family of Ammi/);
  assert.match(p.user, /- 25 taken/);
});

test('loose JSON parsing handles code fences', () => {
  assert.deepEqual(parseJsonLoose('```json\n{"text":"5","confidence":0.9}\n```'), { text: '5', confidence: 0.9 });
});

test('runJsonTask retries once, then fails clearly', async () => {
  let calls = 0;
  const ok = await runJsonTask('pill_imprint', prompt('pill_imprint'), async () => (++calls === 1 ? 'sorry' : '{"text":"10","confidence":0.8}'));
  assert.deepEqual(ok, { text: '10', confidence: 0.8 });
  assert.equal(calls, 2);
  await assert.rejects(runJsonTask('pill_imprint', prompt('pill_imprint'), async () => 'still not json'), AiFormatError);
});

test('decision from a label: unknown labels are rejected', () => {
  const d = decisionFromLabel({ label: 'yes', confidence: 0.9 }, ['yes', 'no', 'unsure']);
  assert.equal(d.label, 'yes');
  assert.ok(Math.abs(d.probs.no! - 0.05) < 1e-9);
  assert.throws(() => decisionFromLabel({ label: 'take another', confidence: 1 }, ['yes', 'no']));
});
