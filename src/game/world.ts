// Plan du jardin (en cases de 16 px) : ce qui est fixe, où l'on peut poser, cueillir, recevoir des visiteurs.
//
//   col 0 1 2 3 4 5 6 7 8 9 10 11
//   row 1   [cabane]          [arbre]
//   row 3   [cabane] ✉        [arbre] ⇢   (panneau vers la ferme)
//   row 4       = = = chemin = = = = = ⇢ la ferme, à droite (cols 12 à 23)
//   row 5..10        [potager 6×6]
//   row 11 ❀                       ❀      (buissons dans les coins)
//   row 12 # # # # clôture # # # # #

import { PLOT_COLS, PLOT_ORIGIN, PLOT_ROWS, TILE, WORLD_COLS } from './config';
import type { BuildingId } from './farm';

export const GARDEN_MIN_ROW = 1;
export const GARDEN_MAX_ROW = 11;

export const MAILBOX_TILE = { col: 4, row: 3 } as const;
export const TREE_POS = { x: 10 * TILE, footY: 4 * TILE - 2 } as const;
/** Où se posent les visiteurs de l'arbre : au pied du tronc, ou perchés dans le feuillage. */
export const TREE_SPOTS = {
  base: { x: TREE_POS.x + 14, y: TREE_POS.footY + 1 },
  perch: { x: TREE_POS.x - 7, y: TREE_POS.footY - 26 },
} as const;
/** Cases où tombe une brindille quand on secoue l'arbre. */
export const TREE_DROP_TILES: ReadonlyArray<[number, number]> = [[8, 3], [11, 2], [8, 2], [11, 1], [8, 1]];

export const BUSH_TILES: ReadonlyArray<[number, number]> = [[0, 11], [11, 11]];
export const PATH_ROW = 4;
/** Le chemin part de la cabane, longe le potager et file jusqu'au bord droit du jardin (vers la ferme). */
export const PATH_COLS: [number, number] = [2, WORLD_COLS - 1];

/** Le panneau au bout du chemin, qui montre la ferme. */
export const GARDEN_SIGN_TILE = { col: WORLD_COLS - 1, row: PATH_ROW - 1 } as const;

export function isPlotTile(col: number, row: number): boolean {
  return col >= PLOT_ORIGIN.col && col < PLOT_ORIGIN.col + PLOT_COLS && row >= PLOT_ORIGIN.row && row < PLOT_ORIGIN.row + PLOT_ROWS;
}

/** Cases occupées par le décor fixe (ou hors du jardin). */
export function isStaticBlocked(col: number, row: number): boolean {
  if (col < 0 || col >= WORLD_COLS || row < GARDEN_MIN_ROW || row > GARDEN_MAX_ROW) return true;
  if (col >= 1 && col <= 3 && row >= 1 && row <= 3) return true; // cabane
  // La boîte aux lettres, et la case au-dessus où flotte la bulle du courrier (gardée libre pour bien la toucher).
  if (col === MAILBOX_TILE.col && (row === MAILBOX_TILE.row || row === MAILBOX_TILE.row - 1)) return true;
  if ((col === 9 || col === 10) && row >= 1 && row <= 3) return true; // arbre
  if (row === PATH_ROW && col >= PATH_COLS[0] && col <= PATH_COLS[1]) return true;
  if (BUSH_TILES.some(([c, r]) => c === col && r === row)) return true;
  if (col === GARDEN_SIGN_TILE.col && row === GARDEN_SIGN_TILE.row) return true;
  return isPlotTile(col, row);
}

/** Pied d'un objet posé sur une case (centre bas). */
export function tileFoot(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: (row + 1) * TILE };
}

export function gardenTiles(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let row = GARDEN_MIN_ROW; row <= GARDEN_MAX_ROW; row++) {
    for (let col = 0; col < WORLD_COLS; col++) if (!isStaticBlocked(col, row)) out.push([col, row]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// La ferme : à droite du jardin, au bout du chemin. Le chemin la traverse (l'allée) ; deux enclos au-dessus
// (poulailler, clapier), deux en dessous (bergerie, étable). Tout est en pixels du monde.
//
//   col 12 ⇠ [poulailler]   [clapier]
//   row 4  = = = = = allée = = = = = =
//          [bergerie]       [étable]

export const FARM_COL0 = WORLD_COLS;
export const FARM_COLS = 12;
export const FARM_X = FARM_COL0 * TILE;
/** Les pieds du jardinier quand il marche sur le chemin et l'allée. */
export const LANE_Y = 74;
/** Le panneau de la ferme, qui montre le chemin du retour au jardin. */
export const FARM_SIGN = { x: FARM_X + 8, y: PATH_ROW * TILE } as const;
export const GARDEN_SIGN = { x: GARDEN_SIGN_TILE.col * TILE + 8, y: PATH_ROW * TILE } as const;

export interface Box { x0: number; x1: number; y0: number; y1: number }

export interface PaddockLayout {
  id: BuildingId;
  /** Rectangle de la clôture (le bâtiment est dedans). */
  fence: Box;
  /** Bâtiment : coin gauche et pied. */
  house: { x: number; footY: number; w: number; h: number };
  /** Où se promènent les animaux (pieds). */
  yard: Box;
  /** Ouverture dans la clôture, côté allée. */
  gateX: number;
  side: 'top' | 'bottom';
}

const X = FARM_X;
export const PADDOCKS: Record<BuildingId, PaddockLayout> = {
  coop: {
    id: 'coop', side: 'top', gateX: X + 72,
    fence: { x0: X + 20, x1: X + 92, y0: 20, y1: 60 },
    house: { x: X + 23, footY: 52, w: 30, h: 28 },
    yard: { x0: X + 58, x1: X + 86, y0: 34, y1: 56 },
  },
  hutch: {
    id: 'hutch', side: 'top', gateX: X + 122,
    fence: { x0: X + 104, x1: X + 184, y0: 20, y1: 60 },
    house: { x: X + 148, footY: 50, w: 32, h: 24 },
    yard: { x0: X + 110, x1: X + 142, y0: 34, y1: 56 },
  },
  sheepfold: {
    id: 'sheepfold', side: 'bottom', gateX: X + 74,
    fence: { x0: X + 8, x1: X + 88, y0: 88, y1: 184 },
    house: { x: X + 12, footY: 132, w: 48, h: 38 },
    yard: { x0: X + 16, x1: X + 82, y0: 142, y1: 178 },
  },
  barn: {
    id: 'barn', side: 'bottom', gateX: X + 114,
    fence: { x0: X + 104, x1: X + 184, y0: 88, y1: 184 },
    house: { x: X + 124, footY: 134, w: 56, h: 44 },
    yard: { x0: X + 110, x1: X + 178, y0: 146, y1: 178 },
  },
};

/** Là où le jardinier se tient pour s'occuper d'un enclos : devant l'ouverture, sur l'allée. */
export function paddockGate(id: BuildingId): { x: number; y: number } {
  return { x: PADDOCKS[id].gateX, y: LANE_Y };
}
