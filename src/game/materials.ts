// Matériaux de cueillette : on les ramasse dans l'herbe, ils servent à fabriquer la déco.

import type { Season } from './seasons';

export type MaterialId = 'twig' | 'pebble' | 'daisy' | 'feather' | 'mushroom' | 'pinecone';

export interface MaterialDef {
  id: MaterialId;
  /** null = toute l'année. */
  season: Season | null;
  /** Valeur indicative (récompenses du courrier). */
  value: number;
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  twig: { id: 'twig', season: null, value: 2 },
  pebble: { id: 'pebble', season: null, value: 2 },
  daisy: { id: 'daisy', season: 'spring', value: 4 },
  feather: { id: 'feather', season: 'summer', value: 4 },
  mushroom: { id: 'mushroom', season: 'autumn', value: 4 },
  pinecone: { id: 'pinecone', season: 'winter', value: 4 },
};

export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export const SEASONAL_MATERIAL: Record<Season, MaterialId> = {
  spring: 'daisy',
  summer: 'feather',
  autumn: 'mushroom',
  winter: 'pinecone',
};

/** Ce qu'on trouve dans l'herbe selon la saison (poids relatifs). */
export function forageTable(season: Season): Array<[MaterialId, number]> {
  return [['twig', 4], ['pebble', 3], [SEASONAL_MATERIAL[season], 3]];
}

export function isMaterialId(v: unknown): v is MaterialId {
  return typeof v === 'string' && v in MATERIALS;
}
