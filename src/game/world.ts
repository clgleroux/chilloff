// Plan du jardin (en cases de 16 px) : ce qui est fixe, où l'on peut poser, cueillir, recevoir des visiteurs.
//
//   col 0 1 2 3 4 5 6 7 8 9 10 11
//   row 1   [cabane]          [arbre]
//   row 3   [cabane] ✉        [arbre]
//   row 4       = = = chemin = = =
//   row 5..10        [potager 6×6]
//   row 11 ❀                       ❀      (buissons dans les coins)
//   row 12 # # # # clôture # # # # #

import { PLOT_COLS, PLOT_ORIGIN, PLOT_ROWS, TILE, WORLD_COLS } from './config';

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
export const TREE_DROP_TILES: ReadonlyArray<[number, number]> = [[11, 3], [8, 3], [11, 2], [8, 2], [11, 4], [10, 4]];

export const BUSH_TILES: ReadonlyArray<[number, number]> = [[0, 11], [11, 11]];
export const PATH_ROW = 4;
export const PATH_COLS: [number, number] = [2, PLOT_ORIGIN.col + PLOT_COLS];

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
