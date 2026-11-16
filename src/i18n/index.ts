// Traductions FR / EN. Les clés `xxx_one` / `xxx_other` gèrent le pluriel via le paramètre `n`.

import { HOUR, MINUTE } from '../game/config';
import type { CropId } from '../game/crops';
import type { Lang } from '../game/state';
import type { Season } from '../game/seasons';
import { en } from './en';
import { fr } from './fr';

export type Dict = Record<string, string>;
const DICTS: Record<Lang, Dict> = { fr, en };

let current: Lang = 'fr';
const listeners = new Set<() => void>();

export function detectLang(): Lang {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  return langs.some((l) => l?.toLowerCase().startsWith('fr')) ? 'fr' : 'en';
}

export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  for (const fn of listeners) fn();
}

export function getLang(): Lang {
  return current;
}

export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

function plural(n: number): 'one' | 'other' {
  // En français, 0 et 1 sont au singulier.
  return current === 'fr' ? (n < 2 ? 'one' : 'other') : n === 1 ? 'one' : 'other';
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  const dict = DICTS[current];
  let k = key;
  if (typeof params.n === 'number' && `${key}_one` in dict) k = `${key}_${plural(params.n)}`;
  const template = dict[k] ?? DICTS.fr[k] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, p: string) => String(params[p] ?? `{${p}}`));
}

export const cropName = (id: CropId) => t(`crop.${id}`);
export const seasonName = (s: Season) => t(`season.${s}`);

/** Durée lisible : « 3 min », « 1 h 20 », « 2 j 4 h ». */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) return t('time.lessThanMinute');
  const totalMin = Math.ceil(ms / MINUTE);
  if (totalMin < 60) return t('time.minutes', { m: totalMin });
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (ms < 24 * HOUR) return m ? t('time.hoursMinutes', { h, m: String(m).padStart(2, '0') }) : t('time.hours', { h });
  const d = Math.floor(h / 24), rh = h % 24;
  return rh ? t('time.daysHours', { d, h: rh }) : t('time.days', { d });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(current === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
