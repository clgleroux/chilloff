// Petits visiteurs du jardin : certains passent d'eux-mêmes, d'autres sont attirés par une déco.
// On les salue d'un toucher : ils s'inscrivent au journal et laissent parfois un cadeau.

import type { DecoId } from './decor';
import type { MaterialId } from './materials';
import { SEASONS, type Season } from './seasons';

export type VisitorId =
  | 'sparrow' | 'squirrel' | 'robin' | 'owl' | 'rabbit'
  | 'bluetit' | 'butterfly' | 'frog' | 'hedgehog' | 'cat' | 'firefly';

export type TimeOfDay = 'day' | 'night' | 'any';

export type VisitorSpot =
  | { kind: 'grass' }
  | { kind: 'tree'; perch: boolean }
  | { kind: 'deco'; deco: DecoId; perch?: boolean };

export interface Gift {
  coins?: [min: number, max: number];
  material?: [MaterialId, number];
  /** Graines de la culture rapide de la saison. */
  seeds?: number;
}

export interface VisitorDef {
  id: VisitorId;
  seasons: readonly Season[];
  time: TimeOfDay;
  spot: VisitorSpot;
  /** Fréquence relative. */
  weight: number;
  gift: Gift;
}

const ALL = SEASONS;

export const VISITORS: Record<VisitorId, VisitorDef> = {
  sparrow: { id: 'sparrow', seasons: ALL, time: 'day', spot: { kind: 'grass' }, weight: 4, gift: { coins: [2, 5] } },
  squirrel: { id: 'squirrel', seasons: ['spring', 'summer', 'autumn'], time: 'day', spot: { kind: 'tree', perch: false }, weight: 3, gift: { material: ['twig', 2] } },
  robin: { id: 'robin', seasons: ['autumn', 'winter'], time: 'day', spot: { kind: 'grass' }, weight: 3, gift: { coins: [3, 6] } },
  owl: { id: 'owl', seasons: ALL, time: 'night', spot: { kind: 'tree', perch: true }, weight: 3, gift: { material: ['feather', 1] } },
  rabbit: { id: 'rabbit', seasons: ['spring', 'summer'], time: 'day', spot: { kind: 'grass' }, weight: 2, gift: { seeds: 2 } },
  bluetit: { id: 'bluetit', seasons: ALL, time: 'day', spot: { kind: 'deco', deco: 'birdhouse', perch: true }, weight: 4, gift: { coins: [4, 8] } },
  butterfly: { id: 'butterfly', seasons: ['spring', 'summer'], time: 'day', spot: { kind: 'deco', deco: 'flowerbed' }, weight: 4, gift: { material: ['daisy', 1] } },
  frog: { id: 'frog', seasons: ['spring', 'summer'], time: 'any', spot: { kind: 'deco', deco: 'pond' }, weight: 4, gift: { coins: [5, 10] } },
  hedgehog: { id: 'hedgehog', seasons: ['spring', 'autumn'], time: 'any', spot: { kind: 'deco', deco: 'leafpile' }, weight: 4, gift: { material: ['mushroom', 2] } },
  cat: { id: 'cat', seasons: ALL, time: 'any', spot: { kind: 'deco', deco: 'bench' }, weight: 4, gift: { coins: [6, 12] } },
  firefly: { id: 'firefly', seasons: ['summer'], time: 'night', spot: { kind: 'deco', deco: 'lantern' }, weight: 5, gift: { coins: [8, 15] } },
};

export const VISITOR_IDS = Object.keys(VISITORS) as VisitorId[];

export function isVisitorId(v: unknown): v is VisitorId {
  return typeof v === 'string' && v in VISITORS;
}

export function visitorAwake(def: VisitorDef, night: boolean): boolean {
  return def.time === 'any' || (def.time === 'night') === night;
}
