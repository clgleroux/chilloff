import { HOUR, MINUTE } from './config';
import type { Season } from './seasons';

/**
 * Forme de la plante : chaque forme a ses propres dessins (pousse, croissance, mûre, icône).
 * Les couleurs viennent de la palette de la culture.
 */
export type CropShape = 'root' | 'leafy' | 'bush' | 'stake' | 'flower' | 'gourd' | 'stalk';

export interface CropPalette {
  /** Feuillage : clair, moyen, foncé. */
  leaf: [string, string, string];
  /** Fruit / légume / fleur : clair, moyen, foncé. */
  fruit: [string, string, string];
  /** Couleur d'accent (cœur de fleur, collet…). */
  accent: string;
}

export interface CropDef {
  id: CropId;
  season: Season;
  shape: CropShape;
  /** Temps de pousse sans arrosage. */
  growTime: number;
  seedPrice: number;
  sellPrice: number;
  palette: CropPalette;
}

export type CropId =
  | 'radish' | 'lettuce' | 'strawberry'
  | 'basil' | 'tomato' | 'sunflower'
  | 'beet' | 'cabbage' | 'pumpkin'
  | 'garlic' | 'leek' | 'snowdrop';

const LEAF_GREEN: [string, string, string] = ['#9be06a', '#5bb44a', '#2f7a3c'];
const LEAF_DARK: [string, string, string] = ['#6fbf5a', '#3f8f45', '#235e36'];

export const CROPS: Record<CropId, CropDef> = {
  // Printemps
  radish: {
    id: 'radish', season: 'spring', shape: 'root', growTime: 8 * MINUTE, seedPrice: 2, sellPrice: 5,
    palette: { leaf: LEAF_GREEN, fruit: ['#ff8fa8', '#e2435e', '#9c2342'], accent: '#fff1e8' },
  },
  lettuce: {
    id: 'lettuce', season: 'spring', shape: 'leafy', growTime: 45 * MINUTE, seedPrice: 5, sellPrice: 15,
    palette: { leaf: ['#d4f58c', '#9bd85a', '#5a9e3c'], fruit: ['#e8fbb0', '#b8e870', '#78b84a'], accent: '#f4ffd8' },
  },
  strawberry: {
    id: 'strawberry', season: 'spring', shape: 'bush', growTime: 4 * HOUR, seedPrice: 12, sellPrice: 42,
    palette: { leaf: LEAF_DARK, fruit: ['#ff7a7a', '#e0303f', '#99192e'], accent: '#ffe27a' },
  },
  // Été
  basil: {
    id: 'basil', season: 'summer', shape: 'leafy', growTime: 10 * MINUTE, seedPrice: 3, sellPrice: 7,
    palette: { leaf: LEAF_DARK, fruit: ['#7fd46a', '#3f9e48', '#1f6a34'], accent: '#c8f0a0' },
  },
  tomato: {
    id: 'tomato', season: 'summer', shape: 'stake', growTime: 1 * HOUR, seedPrice: 8, sellPrice: 24,
    palette: { leaf: LEAF_GREEN, fruit: ['#ff8a5c', '#e8402a', '#9e2420'], accent: '#5bb44a' },
  },
  sunflower: {
    id: 'sunflower', season: 'summer', shape: 'flower', growTime: 5 * HOUR, seedPrice: 14, sellPrice: 48,
    palette: { leaf: LEAF_GREEN, fruit: ['#ffe45c', '#f5b41f', '#c47a12'], accent: '#6b3e1f' },
  },
  // Automne
  beet: {
    id: 'beet', season: 'autumn', shape: 'root', growTime: 12 * MINUTE, seedPrice: 3, sellPrice: 7,
    palette: { leaf: ['#9be06a', '#5bb44a', '#8a2a4a'], fruit: ['#c2406e', '#8a1f4f', '#561236'], accent: '#e87aa0' },
  },
  cabbage: {
    id: 'cabbage', season: 'autumn', shape: 'leafy', growTime: 90 * MINUTE, seedPrice: 8, sellPrice: 26,
    palette: { leaf: ['#a8e0c0', '#6cb894', '#3c7a68'], fruit: ['#d0f0dc', '#94d4b0', '#5a9c84'], accent: '#eafff2' },
  },
  pumpkin: {
    id: 'pumpkin', season: 'autumn', shape: 'gourd', growTime: 6 * HOUR, seedPrice: 15, sellPrice: 55,
    palette: { leaf: LEAF_DARK, fruit: ['#ffb04a', '#f07a1a', '#a84a10'], accent: '#6b8f2a' },
  },
  // Hiver
  garlic: {
    id: 'garlic', season: 'winter', shape: 'root', growTime: 10 * MINUTE, seedPrice: 2, sellPrice: 6,
    palette: { leaf: ['#b8e0a0', '#7fb86a', '#4a7a44'], fruit: ['#fffaf0', '#e8dcc8', '#b0a088'], accent: '#d8b8d8' },
  },
  leek: {
    id: 'leek', season: 'winter', shape: 'stalk', growTime: 1 * HOUR, seedPrice: 7, sellPrice: 20,
    palette: { leaf: ['#8ed08a', '#4f9a5a', '#2c6a44'], fruit: ['#f8fff0', '#d8ecc8', '#a8c49a'], accent: '#c8e8b0' },
  },
  snowdrop: {
    id: 'snowdrop', season: 'winter', shape: 'flower', growTime: 5 * HOUR, seedPrice: 12, sellPrice: 45,
    palette: { leaf: ['#9ed0a0', '#5a9a6a', '#2f6a4a'], fruit: ['#ffffff', '#e4ecf4', '#a8b8cc'], accent: '#9ad06a' },
  },
};

export const CROP_IDS = Object.keys(CROPS) as CropId[];

export function cropsForSeason(season: Season): CropDef[] {
  return CROP_IDS.map((id) => CROPS[id]).filter((c) => c.season === season);
}

export function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && value in CROPS;
}
