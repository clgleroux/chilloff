// Le compagnon : un petit corgi qui se promène dans le jardin.
// Les câlins font monter l'amitié (5 cœurs), chaque cœur débloque un accessoire.

import { MINUTE } from './config';

export type AccessoryId = 'bandana' | 'bow' | 'strawhat' | 'flowercrown' | 'scarf';

/** Dans l'ordre où on les débloque : 1 cœur → bandana, …, 5 cœurs → écharpe. */
export const ACCESSORY_IDS: readonly AccessoryId[] = ['bandana', 'bow', 'strawhat', 'flowercrown', 'scarf'];

/** Points d'amitié nécessaires pour chaque cœur. */
export const HEART_THRESHOLDS: readonly number[] = [3, 8, 15, 25, 40];

/** Un câlin compte pour l'amitié au plus toutes les 3 min (les autres font juste des cœurs). */
export const PET_COOLDOWN = 3 * MINUTE;
/** Le premier câlin du jour compte double. */
export const DAILY_PET_BONUS = 2;

/** Le corgi creuse et déterre une trouvaille toutes les 6 à 10 min (le jour). */
export const DIG_INTERVAL: [number, number] = [6 * MINUTE, 10 * MINUTE];
/** Les trouvailles déterrées peuvent dépasser un peu le maximum de la cueillette. */
export const DIG_EXTRA_FORAGE = 2;

export const NAME_MAX_LENGTH = 16;

export function heartsFor(friendship: number): number {
  return HEART_THRESHOLDS.filter((t) => friendship >= t).length;
}

/** Points restants avant le prochain cœur (0 si tous les cœurs sont gagnés). */
export function pointsToNextHeart(friendship: number): number {
  const next = HEART_THRESHOLDS.find((t) => friendship < t);
  return next === undefined ? 0 : next - friendship;
}

export function accessoryHearts(id: AccessoryId): number {
  return ACCESSORY_IDS.indexOf(id) + 1;
}

export function isAccessoryId(v: unknown): v is AccessoryId {
  return typeof v === 'string' && (ACCESSORY_IDS as readonly string[]).includes(v);
}
