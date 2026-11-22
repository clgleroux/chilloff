// La ferme, au bout du chemin : quatre bâtiments en ruine à rénover un par un (poulailler, clapier,
// bergerie, étable). Chaque bâtiment rénové accueille ses animaux, qui produisent en temps réel
// (œufs, laine angora, laine, lait). Leur donner un légume du panier les fait produire plus vite pendant
// quelques heures, comme l'arrosage au potager. Rien ne meurt, rien ne presse : les produits attendent.
// Fonctions pures, testées dans tests/farm.test.ts.

import { HOUR, MINUTE } from './config';
import type { Recipe } from './decor';

export type BuildingId = 'coop' | 'hutch' | 'sheepfold' | 'barn';
export type AnimalId = 'hen' | 'bunny' | 'sheep' | 'cow';
export type ProduceId = 'egg' | 'angora' | 'wool' | 'milk';

export interface BuildingDef {
  id: BuildingId;
  animal: AnimalId;
  produce: ProduceId;
  /** Prix de la rénovation (pièces et matériaux de cueillette). */
  renovation: Recipe;
  /** Prix d'un animal de plus. Le premier s'installe tout seul à la fin de la rénovation. */
  animalPrice: number;
  capacity: number;
  /** Temps entre deux récoltes, sans repas. */
  produceTime: number;
}

export interface ProduceDef {
  id: ProduceId;
  sellPrice: number;
}

/** Un repas (un légume du panier) : les animaux du bâtiment produisent 2× plus vite pendant 4 h. */
export const FED_DURATION = 4 * HOUR;
export const FED_SPEED_MULTIPLIER = 2;

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  coop: {
    id: 'coop', animal: 'hen', produce: 'egg', capacity: 4, animalPrice: 25, produceTime: 40 * MINUTE,
    renovation: { coins: 80, materials: { twig: 6, pebble: 3 } },
  },
  hutch: {
    id: 'hutch', animal: 'bunny', produce: 'angora', capacity: 4, animalPrice: 40, produceTime: 90 * MINUTE,
    renovation: { coins: 150, materials: { twig: 8, pebble: 4 } },
  },
  sheepfold: {
    id: 'sheepfold', animal: 'sheep', produce: 'wool', capacity: 3, animalPrice: 80, produceTime: 3 * HOUR,
    renovation: { coins: 300, materials: { twig: 10, pebble: 6 } },
  },
  barn: {
    id: 'barn', animal: 'cow', produce: 'milk', capacity: 3, animalPrice: 120, produceTime: 2 * HOUR,
    renovation: { coins: 500, materials: { twig: 12, pebble: 8 } },
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export const PRODUCE: Record<ProduceId, ProduceDef> = {
  egg: { id: 'egg', sellPrice: 8 },
  angora: { id: 'angora', sellPrice: 20 },
  wool: { id: 'wool', sellPrice: 45 },
  milk: { id: 'milk', sellPrice: 35 },
};

export const PRODUCE_IDS = Object.keys(PRODUCE) as ProduceId[];

export function isBuildingId(v: unknown): v is BuildingId {
  return typeof v === 'string' && v in BUILDINGS;
}

export function isProduceId(v: unknown): v is ProduceId {
  return typeof v === 'string' && v in PRODUCE;
}

export function buildingOf(produce: ProduceId): BuildingDef {
  return BUILDING_IDS.map((id) => BUILDINGS[id]).find((b) => b.produce === produce)!;
}

export interface BuildingState {
  renovated: boolean;
  animals: number;
  /** Progression vers la prochaine récolte, en ms (comme une plante). */
  progress: number;
  updatedAt: number;
  /** Les animaux ont mangé : ils produisent plus vite jusqu'à cet instant. */
  fedUntil: number;
}

export function newBuilding(now: number): BuildingState {
  return { renovated: false, animals: 0, progress: 0, updatedAt: now, fedUntil: 0 };
}

/** Fait avancer la production jusqu'à `now` (rien ne bouge tant que le bâtiment est vide). */
export function advanceBuilding(b: BuildingState, now: number): void {
  if (now <= b.updatedAt) {
    b.updatedAt = Math.min(b.updatedAt, now);
    return;
  }
  if (b.renovated && b.animals > 0) {
    const elapsed = now - b.updatedAt;
    const fedElapsed = Math.max(0, Math.min(now, b.fedUntil) - b.updatedAt);
    b.progress += elapsed + fedElapsed * (FED_SPEED_MULTIPLIER - 1);
  }
  b.updatedAt = now;
}

/** Les produits attendent : un par animal. */
export function isProduceReady(id: BuildingId, b: BuildingState): boolean {
  return b.renovated && b.animals > 0 && b.progress >= BUILDINGS[id].produceTime;
}

export function isFed(b: BuildingState, now: number): boolean {
  return b.fedUntil > now;
}

/** Temps réel restant avant la prochaine récolte (en ms), repas en cours compris. */
export function timeUntilProduce(id: BuildingId, b: BuildingState, now: number): number {
  const remaining = Math.max(0, BUILDINGS[id].produceTime - b.progress);
  if (remaining === 0) return 0;
  const fedLeft = Math.max(0, b.fedUntil - now);
  const boosted = fedLeft * FED_SPEED_MULTIPLIER;
  if (remaining <= boosted) return remaining / FED_SPEED_MULTIPLIER;
  return fedLeft + (remaining - boosted);
}
