import * as Crypto from 'expo-crypto';

let counter = 0;

/** Unique id. The counter + time keep ids unique even where randomUUID is stubbed (tests). */
export function newId(prefix: string): string {
  counter += 1;
  let uuid = '';
  try {
    uuid = Crypto.randomUUID() ?? '';
  } catch {
    // ignore: counter + time are enough on one device
  }
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${uuid}`;
}
