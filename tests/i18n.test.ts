// Le français et l'anglais doivent toujours avoir les mêmes textes (consigne du CLAUDE.md).
import { expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
it('mêmes clés', () => {
  const a = Object.keys(fr).sort(), b = Object.keys(en).sort();
  expect(a.filter((k) => !b.includes(k))).toEqual([]);
  expect(b.filter((k) => !a.includes(k))).toEqual([]);
});
