import { resetDemoData } from '../db/bootstrap';
import { fridgeCardHtml } from '../services/fridgeCard';

jest.mock('expo-print', () => ({ printAsync: jest.fn() }));

test('fridge card: elder name, every slot, pill pictures, family phone, no drug names for the elder', async () => {
  await resetDemoData();
  const html = await fridgeCardHtml();
  expect(html).toContain('Ammi');
  expect(html).toContain('සීනි බෙහෙත'); // sugar medicine (purpose, in the elder's language)
  expect((html.match(/<section>/g) ?? []).length).toBe(4);
  expect((html.match(/<svg/g) ?? []).length).toBe(7); // 7 schedule items x 1 tablet
  expect(html).toContain('+94770000001');
  expect(html).not.toContain('Metformin');
});
