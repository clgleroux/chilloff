// Pousse en temps réel. Fonctions pures, testées dans tests/growth.test.ts.
//
// Une plante accumule de la « progression » (en ms). Sans eau, 1 ms réelle = 1 ms de progression ;
// sur une case arrosée, 1 ms réelle = WET_SPEED_MULTIPLIER ms. La plante est mûre quand
// progression ≥ temps de pousse. Rien ne fane, rien ne meurt : une plante mûre attend.

import { WET_SPEED_MULTIPLIER } from './config';
import { CROPS, type CropId } from './crops';

export interface PlantState {
  id: CropId;
  /** Progression accumulée, en ms. */
  progress: number;
  /** Dernier instant où la progression a été calculée. */
  updatedAt: number;
  plantedAt: number;
}

export interface PlotTile {
  tilled: boolean;
  plant: PlantState | null;
  /** La terre est mouillée jusqu'à cet instant (0 = sèche). */
  wetUntil: number;
}

export type GrowthStage = 0 | 1 | 2 | 3;

/** Fait avancer la plante jusqu'à `now`, en tenant compte de l'arrosage. */
export function advancePlant(plant: PlantState, wetUntil: number, now: number): void {
  if (now <= plant.updatedAt) {
    // Horloge revenue en arrière (changement d'heure, réglage manuel) : on ne retire rien.
    plant.updatedAt = Math.min(plant.updatedAt, now);
    return;
  }
  const elapsed = now - plant.updatedAt;
  const wetElapsed = Math.max(0, Math.min(now, wetUntil) - plant.updatedAt);
  plant.progress += elapsed + wetElapsed * (WET_SPEED_MULTIPLIER - 1);
  plant.updatedAt = now;
}

export function growthRatio(plant: PlantState): number {
  return Math.min(1, plant.progress / CROPS[plant.id].growTime);
}

export function isRipe(plant: PlantState): boolean {
  return plant.progress >= CROPS[plant.id].growTime;
}

/** 0 = graine, 1 = pousse, 2 = croissance, 3 = mûre. */
export function growthStage(plant: PlantState): GrowthStage {
  const r = growthRatio(plant);
  if (r >= 1) return 3;
  if (r < 0.15) return 0;
  if (r < 0.55) return 1;
  return 2;
}

/** Temps réel restant avant maturité (en ms), arrosage en cours compris. */
export function timeUntilRipe(plant: PlantState, wetUntil: number, now: number): number {
  const remaining = Math.max(0, CROPS[plant.id].growTime - plant.progress);
  if (remaining === 0) return 0;
  const wetLeft = Math.max(0, wetUntil - now);
  const boostedProgress = wetLeft * WET_SPEED_MULTIPLIER;
  if (remaining <= boostedProgress) return remaining / WET_SPEED_MULTIPLIER;
  return wetLeft + (remaining - boostedProgress);
}

export function isWet(tile: PlotTile, now: number): boolean {
  return tile.wetUntil > now;
}
