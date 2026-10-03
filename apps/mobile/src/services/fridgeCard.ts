import { clockText, pillsBySlot, pillSvg, pillWords, SLOTS, slotTimes } from '@mathaka/core';
import * as Print from 'expo-print';
import { SLOT_COLORS } from '../a11y/tokens';
import { getRepository } from '../db/bootstrap';
import { t, type StringKey } from '../i18n';
import { currentProfiles, getCalibration } from './calibrationService';
import { clock } from './clock';

// A large-print paper card for the fridge (works offline; a backup when the phone is off).

const esc = (s: string) => s.replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[m]!);
const MEAL = { before: 'elder.meal.before', after: 'elder.meal.after', any: 'elder.meal.any' } as const;

export async function fridgeCardHtml(): Promise<string> {
  const repo = await getRepository();
  const elder = await repo.getElder();
  if (!elder) throw new Error('No elder profile yet.');
  const lang = elder.language;
  const people = await repo.listPeople();
  const family = people.find((p) => p.role === 'family' && p.phone) ?? people.find((p) => p.phone);
  const bySlot = pillsBySlot(await repo.listSchedule(), await repo.listMedicines(), await currentProfiles());
  const times = slotTimes(elder);
  const cal = await getCalibration();

  const slots = SLOTS.filter((s) => bySlot[s].length).map((s) => {
    const rows = bySlot[s]
      .map((p, i) => {
        const pics = p.profile ? Array.from({ length: Math.max(1, Math.ceil(p.item.count)) }, (_, k) => pillSvg(p.profile!.spec, 64, `${s}${i}${k}`)).join('') : '';
        const count = p.item.count === 1 ? t(lang, 'elder.tablet') : t(lang, 'elder.tablets', { n: p.item.count });
        return `<div class="pill"><div class="pics">${pics}</div><div><div class="purpose">${esc(p.medicine.purpose[lang])}</div><div class="count">${esc(count)} · ${esc(t(lang, MEAL[p.item.meal]))}</div><div class="look">${esc(p.profile ? pillWords(lang, p.profile.spec) : '')}</div></div></div>`;
      })
      .join('');
    return `<section><div class="bar" style="background:${SLOT_COLORS[s]}"></div><div class="body"><h2>${esc(t(lang, `slot.${s}` as StringKey))} <span>${clockText(times[s])}</span></h2>${rows}</div></section>`;
  });

  const date = clock.now().toISOString().slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Sans Sinhala", "Noto Sans Tamil", "Noto Sans", Arial, sans-serif; color: #1B2030; }
  h1 { font-size: 34pt; margin: 0 0 10pt; }
  section { display: flex; border: 3px solid #22283A; border-radius: 14pt; margin: 0 0 10pt; overflow: hidden; page-break-inside: avoid; }
  .bar { width: 16pt; }
  .body { padding: 8pt 14pt; flex: 1; }
  h2 { font-size: 26pt; margin: 2pt 0 6pt; } h2 span { font-weight: normal; color: #3A4154; font-size: 20pt; }
  .pill { display: flex; gap: 12pt; align-items: center; margin: 6pt 0; }
  .pics { display: flex; gap: 4pt; min-width: 140pt; }
  .purpose { font-size: 20pt; font-weight: bold; } .count { font-size: 16pt; } .look { font-size: 13pt; color: #3A4154; }
  footer { font-size: 15pt; margin-top: 12pt; } footer small { display: block; color: #3A4154; font-size: 10pt; margin-top: 4pt; }
</style></head><body>
<h1>${esc(t(lang, 'card.title', { name: elder.preferredName }))}</h1>
${slots.join('\n')}
<footer>${family?.phone ? esc(t(lang, 'card.call', { family: family.name, phone: family.phone })) : ''}<small>${esc(t('en', 'card.made', { date, v: cal.version }))}</small></footer>
</body></html>`;
}

/** Open the phone's print screen (print, or "Save as PDF"). */
export async function printFridgeCard(): Promise<void> {
  await Print.printAsync({ html: await fridgeCardHtml() });
}
