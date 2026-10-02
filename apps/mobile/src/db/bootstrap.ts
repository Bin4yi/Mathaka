import { buildDemoData } from '@mathaka/core';
import { DEMO_MODE } from '../config';
import { clock } from '../services/clock';
import { createRepository } from './createRepository';
import type { Repository } from './repository';

let repo: Repository | null = null;
let starting: Promise<Repository> | null = null;

/** Open storage once, run migrations, and seed demo data on first launch in DEMO_MODE. */
export function getRepository(): Promise<Repository> {
  if (repo) return Promise.resolve(repo);
  starting ??= (async () => {
    const r = createRepository();
    await r.init();
    if (DEMO_MODE && !(await r.getElder())) await r.importDemo(buildDemoData(clock.now()));
    repo = r;
    return r;
  })();
  return starting;
}

/** Family settings → "Reset demo data". */
export async function resetDemoData(): Promise<void> {
  const r = await getRepository();
  const role = await r.getSetting('deviceRole');
  await r.resetAll();
  if (role) await r.setSetting('deviceRole', role);
  if (DEMO_MODE) await r.importDemo(buildDemoData(clock.now()));
}
