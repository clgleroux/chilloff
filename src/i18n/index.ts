// Traductions FR / EN. Les clés `xxx_one` / `xxx_other` gèrent le pluriel via le paramètre `n`.

import { HOUR, MINUTE } from '../game/config';
import type { CropId } from '../game/crops';
import type { AccessoryId } from '../game/companion';
import type { DecoId } from '../game/decor';
import type { BuildingId, ProduceId } from '../game/farm';
import type { MaterialId } from '../game/materials';
import type { GiftResult, Lang } from '../game/state';
import type { VisitorId } from '../game/visitors';
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
export const materialName = (id: MaterialId) => t(`material.${id}`);
export const decoName = (id: DecoId) => t(`deco.${id}`);
export const visitorName = (id: VisitorId) => t(`visitor.${id}`);
export const accessoryName = (id: AccessoryId) => t(`accessory.${id}`);
export const buildingName = (id: BuildingId) => t(`building.${id}`);
export const produceName = (id: ProduceId) => t(`produce.${id}`);

/** « +5 pièces · +2 Brindille » */
export function giftLabel(g: GiftResult): string {
  const parts: string[] = [];
  if (g.coins) parts.push(t('gift.coins', { n: g.coins }));
  if (g.material) parts.push(t('gift.material', { n: g.material[1], name: materialName(g.material[0]) }));
  if (g.seeds) parts.push(t('gift.seeds', { n: g.seeds[1], name: cropName(g.seeds[0]) }));
  return parts.join(' · ');
}

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
