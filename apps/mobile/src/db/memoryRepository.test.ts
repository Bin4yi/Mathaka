import { buildDemoData, dateKey } from '@mathaka/core';
import { MemoryRepository } from './memoryRepository';

const NOW = new Date(2026, 9, 2, 9, 0);

describe('MemoryRepository', () => {
  it('stores and reads demo data', async () => {
    const repo = new MemoryRepository();
    await repo.init();
    await repo.importDemo(buildDemoData(NOW));

    expect((await repo.getElder())?.preferredName).toBe('Ammi');
    expect(await repo.listMedicines()).toHaveLength(4);
    expect(await repo.listPillProfiles()).toHaveLength(4);
    const events = await repo.listDoseEvents('2026-09-25', '2026-10-01');
    expect(events.length).toBeGreaterThanOrEqual(28);
    expect(await repo.listDoseEvents(dateKey(NOW), dateKey(NOW))).toHaveLength(0);
  });

  it('returns copies, so callers cannot change stored rows by accident', async () => {
    const repo = new MemoryRepository();
    await repo.importDemo(buildDemoData(NOW));
    const elder = (await repo.getElder())!;
    elder.preferredName = 'changed';
    expect((await repo.getElder())?.preferredName).toBe('Ammi');
  });

  it('keeps settings and lists alerts newest first', async () => {
    const repo = new MemoryRepository();
    await repo.setSetting('deviceRole', 'elder');
    expect(await repo.getSetting('deviceRole')).toBe('elder');
    expect(await repo.getSetting('missing')).toBeNull();

    await repo.importDemo(buildDemoData(NOW));
    const alerts = await repo.listAlerts();
    const times = alerts.map((a) => a.createdAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('resetAll clears everything', async () => {
    const repo = new MemoryRepository();
    await repo.importDemo(buildDemoData(NOW));
    await repo.resetAll();
    expect(await repo.getElder()).toBeNull();
    expect(await repo.listMedicines()).toHaveLength(0);
  });
});
