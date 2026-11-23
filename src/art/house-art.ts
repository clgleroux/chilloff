// Pixel art de la maison : les meubles (en texte, comme les décos) et la pièce elle-même
// (murs, fenêtres sur le jardin selon la saison et l'heure, plancher, porte), dessinée par code.

import type { FurnitureId } from '../game/house';
import { DOOR_COL, ROOM_COLS, ROOM_ROWS, WINDOW_COLS } from '../game/house';
import type { Season } from '../game/seasons';
import { OUTLINE, Painter, rng, shade } from './draw';
import type { PixelSprite } from './living-sprites';

const E = '.'.repeat(16);
const K = OUTLINE;

/** Complète par le haut jusqu'à `h` lignes, avec `bottom` lignes vides en bas. */
function pad(rows: string[], h: number, bottom = 1): string[] {
  const out = [...rows];
  for (let i = 0; i < bottom; i++) out.push(E);
  while (out.length < h) out.unshift(E);
  return out;
}

const WOOD = { o: '#c89a64', O: '#a8784a', B: '#7a5232' };

// ---------------------------------------------------------------------------
// Meubles : 16×16, ou 16×24 s'ils sont hauts. Les cadres du mur sont centrés dans leur case.

export const FURNITURE_SPRITES: Record<FurnitureId, PixelSprite> = {
  chair: {
    palette: { k: K, w: '#d8a870', b: '#b07848', B: '#7a5232' },
    rows: pad([
      '....kkkkkkkk....',
      '....kwwwwwwk....',
      '....kbBbbBbk....',
      '....kbBbbBbk....',
      '....kbBbbBbk....',
      '...kkkkkkkkkk...',
      '...kwwwwwwwwk...',
      '...kbbbbbbbbk...',
      '...kkkkkkkkkk...',
      '...kBk....kBk...',
      '...kBk....kBk...',
      '...kkk....kkk...',
    ], 16),
  },
  table: {
    palette: { k: K, w: '#d8a870', b: '#b07848', B: '#7a5232', r: '#f4e4c8', R: '#d86a5a' },
    rows: pad([
      '.kkkkkkkkkkkkkk.',
      'kwwwwwwwwwwwwwwk',
      'kwwwrrrrrrrrwwwk',
      'kwwwrRrRrRrRwwwk',
      'kbbbrRrRrRrRbbbk',
      'kkkkkkkkkkkkkkkk',
      '.kBk........kBk.',
      '.kBk........kBk.',
      '.kBk........kBk.',
      '.kkk........kkk.',
    ], 16),
  },
  houseplant: {
    palette: { k: K, g: '#6cc45a', G: '#3f8a3e', t: '#d4764a', T: '#a8502e' },
    rows: pad([
      '.......kk.......',
      '......kgGk......',
      '..kk..kgGk..kk..',
      '.kgGk.kgGk.kgGk.',
      '.kggGkkgGkkgGGk.',
      '..kggGkgGkgGGk..',
      '...kkgGgGgGkk...',
      '.kk..kgGgGk..kk.',
      'kgGkkkggGGkkkgGk',
      '.kgggGgGgGgGggk.',
      '..kkkgGgGgGkkk..',
      '.....kkGGkk.....',
      '...kkkkkkkkkk...',
      '...kttttttttk...',
      '...kTTTTTTTTk...',
      '....kttttttk....',
      '....kTTTTTTk....',
      '.....kkkkkk.....',
    ], 24),
  },
  painting: {
    palette: { k: K, ...WOOD, s: '#9fd0e8', y: '#ffe27a', g: '#8fd16a', G: '#5aa34a' },
    rows: [
      E,
      E,
      '..kkkkkkkkkkkk..',
      '..koooooooooOk..',
      '..kokkkkkkkkOk..',
      '..koksssssykOk..',
      '..koksssssskOk..',
      '..koksggssskOk..',
      '..kokgGGgggkOk..',
      '..kokGGGGgGkOk..',
      '..kokkkkkkkkOk..',
      '..kOOOOOOOOOOk..',
      '..kkkkkkkkkkkk..',
      E,
      E,
      E,
    ],
  },
  rug: {
    palette: { k: K, R: '#b84a3a', r: '#e07a5a', w: '#f4e4c8' },
    rows: pad([
      '..kkkkkkkkkkkk..',
      '.kRRRRRRRRRRRRk.',
      '.kRwwwwwwwwwwRk.',
      '.kRwrrwwwwrrwRk.',
      '.kRwwwrrrrwwwRk.',
      '.kRwrrwwwwrrwRk.',
      '.kRwwwwwwwwwwRk.',
      '.kRRRRRRRRRRRRk.',
      '..kkkkkkkkkkkk..',
    ], 16, 2),
  },
  lamp: {
    palette: { k: K, y: '#ffd27a', Y: '#e8a83a', w: '#fff6d0', d: '#6a6a7a' },
    rows: pad([
      '....kkkkkkkk....',
      '...kyyyyyyyyk...',
      '..kyywyyyyyYYk..',
      '..kYYYYYYYYYYk..',
      '...kkkkkkkkkk...',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '.....kkkkkk.....',
      '....kddddddk....',
      '....kkkkkkkk....',
    ], 24),
  },
  bookshelf: {
    palette: { k: K, o: '#a8784a', r: '#d86a5a', R: '#a8443a', b: '#7fa8d8', B: '#5a80b8', g: '#8fc46a', G: '#5a943e', y: '#ffd27a', Y: '#d8a83a' },
    rows: pad([
      '.kkkkkkkkkkkkkk.',
      '.kooooooooooook.',
      '.kokkkkkkkkkkok.',
      '.kokrrbbgkyykok.',
      '.kokrrbbgkyykok.',
      '.kokRRBBGkYYkok.',
      '.kooooooooooook.',
      '.kokkkkkkkkkkok.',
      '.kokgykkrrbbkok.',
      '.kokgykkrrbbkok.',
      '.kokGYkkRRBBkok.',
      '.kooooooooooook.',
      '.kokkkkkkkkkkok.',
      '.kokbbrrkggykok.',
      '.kokbbrrkggykok.',
      '.kokBBRRkGGYkok.',
      '.kooooooooooook.',
      '.kkkkkkkkkkkkkk.',
    ], 24),
  },
  armchair: {
    palette: { k: K, f: '#e8a0a8', F: '#c47080', c: '#fff0e0', C: '#f0d0b8', B: '#7a5232' },
    rows: pad([
      '..kkkkkkkkkkkk..',
      '.kffffffffffffk.',
      '.kfFFFFFFFFFFfk.',
      'kkkfFFFFFFFFfkkk',
      'kffkkkkkkkkkkffk',
      'kffkcccccccckffk',
      'kfFkcCCCCCCckFfk',
      'kfFkkkkkkkkkkFfk',
      'kFFFFFFFFFFFFFFk',
      'kkkkkkkkkkkkkkkk',
      '.kBk........kBk.',
      '.kkk........kkk.',
    ], 16),
  },
  clock: {
    palette: { k: K, ...WOOD, w: '#fff6e0' },
    rows: [
      E,
      E,
      '.....kkkkkk.....',
      '....kooooook....',
      '...kowwwwwwok...',
      '..kowwwkwwwwok..',
      '..kowwwkwwwwok..',
      '..kowwwkkkwwok..',
      '..kowwwwwwwwok..',
      '..kOwwwwwwwwOk..',
      '...kOwwwwwwOk...',
      '....kOOOOOOk....',
      '.....kkkkkk.....',
      E,
      E,
      E,
    ],
  },
  bed: {
    palette: { k: K, ...WOOD, w: '#fff6e8', W: '#e0d4c4', b: '#7fa8d8', c: '#5a80b8' },
    rows: pad([
      '.kkkkkkkkkkkkkk.',
      '.kooooooooooook.',
      '.kOOOOOOOOOOOOk.',
      '.kOkkkkkkkkkkOk.',
      '.kOkwwwwwwwwkOk.',
      '.kOkWWWWWWWWkOk.',
      '.kOkkkkkkkkkkOk.',
      '.kObbbbbbbbbbOk.',
      '.kObcbbbbbbcbOk.',
      '.kObbbbbbbbbbOk.',
      '.kObcbbbbbbcbOk.',
      '.kObbbbbbbbbbOk.',
      '.kObbbbbbbbbbOk.',
      '.kOccccccccccOk.',
      '.kooooooooooook.',
      '.kkkkkkkkkkkkkk.',
      '.kBk........kBk.',
      '.kkk........kkk.',
    ], 24),
  },
  stove: {
    palette: { k: K, D: '#4a4a5a', d: '#6a6a7a', o: '#e8682a', y: '#ffd27a', Y: '#fff1b8' },
    rows: pad([
      '......kkkk......',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '...kkkkddkkkk...',
      '..kDDDDDDDDDDk..',
      '..kDdddddddDDk..',
      '..kDkkkkkkkkDk..',
      '..kDkooyyookDk..',
      '..kDkoyYYyokDk..',
      '..kDkkkkkkkkDk..',
      '..kDDDDDDDDDDk..',
      '..kkkkkkkkkkkk..',
      '..kDk......kDk..',
      '..kkk......kkk..',
    ], 24),
  },
};

/** Le lit, la nuit, quand le jardinier y dort. */
export const BED_SLEEP: PixelSprite = {
  palette: { ...FURNITURE_SPRITES.bed.palette, s: '#f4c8a0', h: '#e8c060', H: '#b08a3a' },
  rows: FURNITURE_SPRITES.bed.rows.map((row, y) => {
    const top = FURNITURE_SPRITES.bed.rows.findIndex((r) => r !== E);
    if (y === top + 4) return '.kOkwwkhhkwwkOk.';
    if (y === top + 5) return '.kOkWkHssHkWkOk.';
    if (y === top + 6) return '.kOkkkkkkkkkkOk.';
    return row;
  }),
};

// ---------------------------------------------------------------------------
// La pièce : murs, fenêtres, plancher, porte. Une image par saison, de jour et de nuit.

export const ROOM_W = ROOM_COLS * 16;
export const ROOM_H = ROOM_ROWS * 16;

const VIEW: Record<Season, { sky: string; leaf: string; leafDark: string; ground: string }> = {
  spring: { sky: '#9fd0e8', leaf: '#8fd16a', leafDark: '#5aa34a', ground: '#8fd16a' },
  summer: { sky: '#8ccbf0', leaf: '#5aa34a', leafDark: '#3a7a3c', ground: '#7cc45a' },
  autumn: { sky: '#b8d4e0', leaf: '#f0a03a', leafDark: '#c4602a', ground: '#b9b45c' },
  winter: { sky: '#c8dceb', leaf: '#4a7a6a', leafDark: '#2f5a4e', ground: '#ffffff' },
};

export function room(season: Season, night: boolean): HTMLCanvasElement {
  const p = new Painter(ROOM_W, ROOM_H);
  const paper = { base: '#f0dcc0', stripe: '#e4c8a4', dot: '#d8a88a' };
  const plank = { base: '#c89a64', dark: '#a8784a', line: '#7a5232', light: '#dcb47e' };

  // Papier peint à rayures, avec une plinthe.
  p.rect(0, 0, ROOM_W, 32, paper.base);
  for (let x = 0; x < ROOM_W; x += 6) p.rect(x, 0, 2, 30, paper.stripe);
  for (let x = 3; x < ROOM_W; x += 12) for (let y = 4; y < 28; y += 8) p.px(x + ((y / 8) % 2) * 6, y, paper.dot);
  p.rect(0, 0, ROOM_W, 2, '#8a5a3a');
  p.rect(0, 28, ROOM_W, 3, plank.dark);
  p.rect(0, 28, ROOM_W, 1, plank.light);
  p.rect(0, 31, ROOM_W, 1, plank.line);

  // Fenêtres sur le jardin.
  const v = VIEW[season];
  for (const col of WINDOW_COLS) {
    const x = col * 16 + 1, y = 5;
    p.rect(x, y, 14, 18, '#7a4a2e');
    const sky = night ? '#26305a' : v.sky;
    p.rect(x + 2, y + 2, 10, 14, sky);
    if (night) {
      p.px(x + 4, y + 4, '#fff6d0'); p.px(x + 9, y + 6, '#fff6d0'); p.px(x + 6, y + 3, '#c8d4ff');
    } else {
      // Un bout d'arbre et d'herbe derrière la vitre.
      for (let i = 0; i < 6; i++) p.rect(x + 2 + i * 2, y + 9 - (i % 3), 2, 3, i % 2 ? v.leaf : v.leafDark);
      p.px(x + 3, y + 3, '#ffffff'); p.px(x + 4, y + 3, '#ffffff');
    }
    p.rect(x + 2, y + 12, 10, 4, night ? shade(v.ground, -0.6) : v.ground);
    p.rect(x + 6, y + 2, 2, 14, '#7a4a2e');
    p.rect(x + 2, y + 8, 10, 1, '#7a4a2e');
    p.rect(x - 1, y + 17, 16, 2, plank.light); // rebord
    // Rideaux
    const curtain = '#d86a5a';
    p.rect(x - 1, y - 1, 3, 15, curtain);
    p.rect(x + 12, y - 1, 3, 15, curtain);
    p.rect(x - 1, y - 2, 16, 2, '#8a5a3a');
  }

  // Plancher en lattes.
  const r = rng(season.length * 13 + 5);
  p.rect(0, 32, ROOM_W, 6 * 16, plank.base);
  for (let y = 32; y < 128; y += 6) {
    p.rect(0, y + 5, ROOM_W, 1, plank.line);
    p.rect(0, y, ROOM_W, 1, plank.light);
    const offset = Math.floor(r() * 24);
    for (let x = offset; x < ROOM_W; x += 24 + Math.floor(r() * 12)) p.rect(x, y, 1, 5, plank.line);
    for (let i = 0; i < 3; i++) p.px(r() * ROOM_W, y + 2 + r() * 2, plank.dark);
  }
  // Ombre du mur sur le plancher.
  p.rect(0, 32, ROOM_W, 2, 'rgba(60, 30, 20, 0.25)');

  // Bas du mur, avec la porte vers le jardin et un paillasson.
  p.rect(0, 128, ROOM_W, ROOM_H - 128, '#8a5a3a');
  p.rect(0, 128, ROOM_W, 2, '#a8784a');
  const dx = DOOR_COL * 16;
  p.rect(dx + 1, 128, 14, ROOM_H - 128, night ? '#26305a' : VIEW[season].ground);
  p.rect(dx + 1, 128, 1, ROOM_H - 128, '#5a3420');
  p.rect(dx + 14, 128, 1, ROOM_H - 128, '#5a3420');
  p.rect(dx + 2, 118, 12, 8, '#b07848');
  for (let x = dx + 3; x < dx + 13; x += 2) p.rect(x, 119, 1, 6, '#8a5a3a');

  // Murs de côté, un peu plus sombres.
  p.rect(0, 32, 2, 96, 'rgba(60, 30, 20, 0.18)');
  p.rect(ROOM_W - 2, 32, 2, 96, 'rgba(60, 30, 20, 0.18)');
  return p.canvas;
}
