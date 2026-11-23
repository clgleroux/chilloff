// Décorations : fabriquées à l'atelier, posées librement dans l'herbe, certaines attirent des visiteurs.

import type { CropId } from './crops';
import type { ProduceId } from './farm';
import type { MaterialId } from './materials';
import type { Season } from './seasons';

export type DecoId =
  | 'stepstone' | 'birdhouse' | 'flowerbed' | 'bench' | 'lantern' | 'pond'
  | 'daisypot' | 'scarecrow' | 'leafpile' | 'jackolantern' | 'snowman';

export interface Recipe {
  materials?: Partial<Record<MaterialId, number>>;
  crops?: Partial<Record<CropId, number>>;
  /** Produits de la ferme (laine pour un tapis…). */
  produce?: Partial<Record<ProduceId, number>>;
  coins?: number;
  /** Ne se fabrique qu'à cette saison (le bonhomme de neige…). */
  season?: Season;
}

export interface DecoDef {
  id: DecoId;
  recipe: Recipe;
  /** Sprite de 16×24 au lieu de 16×16. */
  tall: boolean;
  /** S'allume la nuit. */
  glow: boolean;
}

export const DECOS: Record<DecoId, DecoDef> = {
  stepstone: { id: 'stepstone', tall: false, glow: false, recipe: { materials: { pebble: 2 } } },
  birdhouse: { id: 'birdhouse', tall: true, glow: false, recipe: { materials: { twig: 4 }, coins: 10 } },
  flowerbed: { id: 'flowerbed', tall: false, glow: false, recipe: { materials: { twig: 2, pebble: 2 }, coins: 20 } },
  bench: { id: 'bench', tall: false, glow: false, recipe: { materials: { twig: 6, pebble: 2 }, coins: 25 } },
  lantern: { id: 'lantern', tall: true, glow: true, recipe: { materials: { twig: 2, pebble: 3 }, coins: 30 } },
  pond: { id: 'pond', tall: false, glow: false, recipe: { materials: { pebble: 6 }, coins: 30 } },
  daisypot: { id: 'daisypot', tall: false, glow: false, recipe: { materials: { daisy: 3, pebble: 1 } } },
  scarecrow: { id: 'scarecrow', tall: true, glow: false, recipe: { materials: { feather: 3, twig: 4 } } },
  leafpile: { id: 'leafpile', tall: false, glow: false, recipe: { materials: { twig: 4, mushroom: 2 } } },
  jackolantern: { id: 'jackolantern', tall: false, glow: true, recipe: { crops: { pumpkin: 1 }, materials: { twig: 1 } } },
  snowman: { id: 'snowman', tall: true, glow: false, recipe: { materials: { pinecone: 2, twig: 2 }, season: 'winter' } },
};

export const DECO_IDS = Object.keys(DECOS) as DecoId[];

export function isDecoId(v: unknown): v is DecoId {
  return typeof v === 'string' && v in DECOS;
}
