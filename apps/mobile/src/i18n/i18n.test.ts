import { LANGS } from '@mathaka/core';
import { en } from './en';
import { si } from './si';
import { ta } from './ta';
import { t } from './index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('fills placeholders', () => {
    expect(t('en', 'elder.hello', { name: 'Ammi' })).toBe('Hello, Ammi');
    expect(t('si', 'elder.hello', { name: 'Ammi' })).toContain('Ammi');
  });

  it('every language uses the same placeholders as English', () => {
    for (const [lang, table] of [['si', si], ['ta', ta]] as const) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect({ lang, key, p: placeholders(table[key]) }).toEqual({ lang, key, p: placeholders(en[key]) });
      }
    }
  });

  it('no string is empty', () => {
    for (const lang of LANGS) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) expect(t(lang, key).trim()).not.toBe('');
    }
  });
});
