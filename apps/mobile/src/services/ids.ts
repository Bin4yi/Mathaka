import * as Crypto from 'expo-crypto';

export function newId(prefix: string): string {
  return `${prefix}-${Crypto.randomUUID()}`;
}
