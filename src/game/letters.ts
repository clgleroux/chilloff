// Courrier des voisins : de petites demandes sans délai. On répond quand on veut, ou on décline poliment.

import { CROPS, cropsForSeason, type CropId } from './crops';
import type { DecoId } from './decor';
import { MATERIALS, SEASONAL_MATERIAL, type MaterialId } from './materials';
import type { Season } from './seasons';

export type CharacterId = 'rose' | 'leon' | 'capucine' | 'basile';
export const CHARACTERS: readonly CharacterId[] = ['rose', 'leon', 'capucine', 'basile'];

export type Want = { kind: 'crop'; id: CropId; n: number } | { kind: 'material'; id: MaterialId; n: number };

export interface LetterReward {
  coins: number;
  deco?: DecoId;
  materials?: Partial<Record<MaterialId, number>>;
}

export interface Letter {
  id: number;
  from: CharacterId;
  /** Clé de traduction du texte. */
  text: string;
  wants: Want[];
  reward: LetterReward;
  arrivedAt: number;
  /** Lue : la bulle au-dessus de la boîte se cache jusqu'à ce qu'on ait de quoi répondre. */
  read: boolean;
}

const GIFT_DECOS: DecoId[] = ['stepstone', 'flowerbed', 'lantern', 'bench'];

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function between(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function wantValue(w: Want): number {
  return (w.kind === 'crop' ? CROPS[w.id].sellPrice : MATERIALS[w.id].value) * w.n;
}

/**
 * Les trois premières lettres servent de tutoriel (cueillette → déco, récolte, matériaux de saison),
 * les suivantes sont tirées au hasard parmi ce que la saison permet.
 */
export function makeLetter(index: number, season: Season, random: () => number, now: number): Letter {
  const seasonal = cropsForSeason(season).sort((a, b) => a.growTime - b.growTime);
  const special = SEASONAL_MATERIAL[season];

  if (index === 0) {
    return { id: index, from: 'rose', text: 'letter.intro.0', arrivedAt: now, read: false,
      wants: [{ kind: 'material', id: 'twig', n: 3 }], reward: { coins: 10, deco: 'birdhouse' } };
  }
  if (index === 1) {
    return { id: index, from: 'capucine', text: 'letter.intro.1', arrivedAt: now, read: false,
      wants: [{ kind: 'crop', id: seasonal[0].id, n: 2 }], reward: { coins: 20, materials: { pebble: 2 } } };
  }
  if (index === 2) {
    return { id: index, from: 'leon', text: 'letter.intro.2', arrivedAt: now, read: false,
      wants: [{ kind: 'material', id: 'pebble', n: 2 }, { kind: 'material', id: special, n: 1 }],
      reward: { coins: 15, deco: 'flowerbed' } };
  }

  const options: Array<() => Want> = [
    () => ({ kind: 'crop', id: seasonal[0].id, n: between(2, 4, random) }),
    () => ({ kind: 'crop', id: seasonal[0].id, n: between(2, 4, random) }),
    () => ({ kind: 'crop', id: seasonal[1].id, n: between(1, 2, random) }),
    () => ({ kind: 'crop', id: seasonal[2].id, n: 1 }),
    () => ({ kind: 'material', id: 'twig', n: between(2, 4, random) }),
    () => ({ kind: 'material', id: 'pebble', n: between(2, 4, random) }),
    () => ({ kind: 'material', id: special, n: between(1, 2, random) }),
  ];
  const wants: Want[] = [];
  const count = random() < 0.6 ? 1 : 2;
  for (let tries = 0; wants.length < count && tries < 10; tries++) {
    const w = pick(options, random)();
    if (!wants.some((x) => x.kind === w.kind && x.id === w.id)) wants.push(w);
  }
  const value = wants.reduce((sum, w) => sum + wantValue(w), 0);
  const reward: LetterReward = { coins: Math.round(value * 1.5) + 5 };
  if (random() < 0.2) reward.deco = pick(GIFT_DECOS, random);
  const from = pick(CHARACTERS, random);
  return { id: index, from, text: `letter.${from}.${index % 3}`, wants, reward, arrivedAt: now, read: false };
}
