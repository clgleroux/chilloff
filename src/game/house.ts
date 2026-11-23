// L'intérieur de la maison : une pièce qu'on décore avec des meubles fabriqués à l'atelier.
// Les meubles se posent sur le plancher, ou au mur pour les cadres et l'horloge.
//
// Plan de la pièce (en cases de 16 px, repère propre à la pièce) :
//
//   col  0 1 2 3 4 5 6 7
//   row 0  mur  ▢       ▢      (deux fenêtres, cols 1 et 6)
//   row 1  mur : cadres, horloge (pas sous les fenêtres)
//   row 2..7  plancher
//   row 8  bas du mur, avec la porte (col 3) ; la case du plancher devant la porte reste libre
//
// Quelques petits secrets, que le jeu ne dit pas : la nuit, le jardinier dort dans le lit s'il y en a un,
// et le corgi vient dormir sur le tapis. Le poêle et la lampe éclairent la pièce le soir.

import type { Recipe } from './decor';

export type FurnitureId =
  | 'bed' | 'rug' | 'table' | 'chair' | 'armchair' | 'bookshelf'
  | 'stove' | 'lamp' | 'houseplant' | 'painting' | 'clock';

export interface FurnitureDef {
  id: FurnitureId;
  recipe: Recipe;
  /** Sur le plancher, ou accroché au mur. */
  spot: 'floor' | 'wall';
  /** Sprite de 16×24 au lieu de 16×16. */
  tall: boolean;
  /** S'allume le soir. */
  glow: boolean;
  /** Posé à plat (le tapis) : dessiné sous le reste. */
  flat: boolean;
}

const f = (id: FurnitureId, recipe: Recipe, o: Partial<Pick<FurnitureDef, 'spot' | 'tall' | 'glow' | 'flat'>> = {}): FurnitureDef =>
  ({ id, recipe, spot: o.spot ?? 'floor', tall: o.tall ?? false, glow: o.glow ?? false, flat: o.flat ?? false });

export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  chair: f('chair', { materials: { twig: 3 }, coins: 5 }),
  table: f('table', { materials: { twig: 5 }, coins: 15 }),
  houseplant: f('houseplant', { materials: { pebble: 2 }, coins: 10 }, { tall: true }),
  painting: f('painting', { materials: { twig: 2 }, coins: 25 }, { spot: 'wall' }),
  rug: f('rug', { produce: { wool: 2 }, coins: 10 }, { flat: true }),
  lamp: f('lamp', { materials: { twig: 2, pebble: 2 }, coins: 30 }, { tall: true, glow: true }),
  bookshelf: f('bookshelf', { materials: { twig: 8 }, coins: 35 }, { tall: true }),
  armchair: f('armchair', { materials: { twig: 4 }, produce: { angora: 2 }, coins: 20 }),
  clock: f('clock', { materials: { twig: 2, pebble: 2 }, coins: 40 }, { spot: 'wall' }),
  bed: f('bed', { materials: { twig: 8 }, coins: 40 }, { tall: true }),
  stove: f('stove', { materials: { pebble: 8 }, coins: 50 }, { tall: true, glow: true }),
};

export const FURNITURE_IDS = Object.keys(FURNITURE) as FurnitureId[];

export function isFurnitureId(v: unknown): v is FurnitureId {
  return typeof v === 'string' && v in FURNITURE;
}

export const ROOM_COLS = 8;
/** Le mur (2 rangées), le plancher (6 rangées) et le bas du mur avec la porte. */
export const ROOM_ROWS = 9;
export const WALL_ROW = 1;
export const FLOOR_ROWS: [number, number] = [2, 7];
export const WINDOW_COLS: readonly number[] = [1, 6];
export const DOOR_COL = 3;

/** La case peut-elle recevoir ce genre de meuble (sans regarder ce qui y est déjà posé) ? */
export function roomSpotFits(spot: FurnitureDef['spot'], col: number, row: number): boolean {
  if (col < 0 || col >= ROOM_COLS) return false;
  if (spot === 'wall') return row === WALL_ROW && !WINDOW_COLS.includes(col);
  if (row < FLOOR_ROWS[0] || row > FLOOR_ROWS[1]) return false;
  return !(col === DOOR_COL && row === FLOOR_ROWS[1]); // devant la porte
}
