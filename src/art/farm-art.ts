// Pixel art de la ferme : bâtiments (en ruine ou rénovés, selon la saison), clôtures des enclos,
// animaux, produits et panneaux. Les bâtiments et les clôtures sont dessinés par code ; les petits
// sprites suivent la convention de living-sprites.ts (1 caractère = 1 pixel, '.' = transparent).

import type { AnimalId, BuildingId, ProduceId } from '../game/farm';
import type { Season } from '../game/seasons';
import type { Box, PaddockLayout } from '../game/world';
import { OUTLINE, Painter, rng, shade } from './draw';
import type { PixelSprite } from './living-sprites';

const K = OUTLINE;

/** Complète chaque ligne à droite et ajoute des lignes vides en haut, jusqu'à `w` × `h`. */
function fit(rows: string[], w: number, h: number, bottom = 1): string[] {
  const out = rows.map((r) => r.padEnd(w, '.'));
  for (let i = 0; i < bottom; i++) out.push('.'.repeat(w));
  while (out.length < h) out.unshift('.'.repeat(w));
  return out;
}

// ---------------------------------------------------------------------------
// Animaux (tournés vers la gauche ; on les retourne quand ils vont à droite)

export const ANIMAL_SPRITES: Record<AnimalId, PixelSprite> = {
  hen: {
    palette: { k: K, w: '#fffaf0', W: '#e4d8c4', r: '#e8403a', y: '#f5b41f', o: '#f0a03a' },
    rows: fit([
      '.....rr',
      '....rrrk',
      '....kwwwk',
      '...ykwkwwk',
      '..yykwwwwk',
      '....rkwwwk...kk',
      '.....kwwwwkkkwwk',
      '.....kwwwwwwwwwk',
      '.....kwwwWwwwwWk',
      '......kwwWWWWWk',
      '.......kkkkkkk',
      '........o...o',
      '.......oo..oo',
    ], 16, 16),
  },
  bunny: {
    palette: { k: K, c: '#fff4ec', C: '#e8d4c4', b: '#b88a64', p: '#f0a0b0', w: '#ffffff' },
    rows: fit([
      '.....kkkk',
      '....kcccck',
      '...kbkcckcck',
      '..kbbkcccccck',
      '..kbbkcpcccckkk',
      '...kkkcccccccCck',
      '....kccccccccCCk',
      '....kcccbbbccCwk',
      '....kccbbbbcCwwk',
      '....kcccccccCCCk',
      '.....kcckkkkcck',
      '.....kkk....kk',
    ], 16, 16),
  },
  sheep: {
    palette: { k: K, w: '#fbf6ea', W: '#e2d8c4', d: '#4a4050', e: '#ffffff' },
    rows: fit([
      '......kkk.kkk',
      '....kkwwwkwwwkk',
      '..kkwwwwwwwwwwwk',
      '.kddkwwwwwwwwwWk',
      'kdddkwwwwwwwwWWk',
      'kdedkwwwwwwwwwWk',
      'kdddkwwwwwwwwWk',
      '.kdkkWwwwwwwWWk',
      '..k.kWWWWWWWWk',
      '.....kkkkkkkk',
      '......kd..kd',
      '......kd..kd',
      '......kk..kk',
    ], 16, 16),
  },
  cow: {
    palette: { k: K, w: '#ffffff', W: '#e4e4ee', b: '#3b2a35', p: '#f4a8b8', P: '#d87890', y: '#f0e0b0' },
    rows: fit([
      '.k....k',
      'kyk..kyk',
      '.kkkkkk',
      '.kwbwwwk.kkkkkkkkkkkkkk',
      '.kwkwwkwkwwwbbbwwwwwwwwk',
      '.kwwwwwkwwwbbbbbwwwbbwWk',
      '..kpppkwwwwwbbbwwwbbbbWk',
      '..kpPpkwwwwwwwwwwwwbbwWkk',
      '...kkkWwwbbwwwwwwwwwwWWkb',
      '.....kWwbbbwwwwwwwwwWWWk',
      '.....kWWwbwwwwwwwpPwWWk',
      '......kWWWWWWWWWWppWWk',
      '......kWk.kWk....kWk.kWk',
      '......kWk.kWk....kWk.kWk',
      '......kbk.kbk....kbk.kbk',
    ].map((r) => r.slice(0, 24)), 24, 16),
  },
};

// ---------------------------------------------------------------------------
// Produits (16×16)

export const PRODUCE_SPRITES: Record<ProduceId, PixelSprite> = {
  egg: {
    palette: { k: K, w: '#fff6e4', h: '#ffffff', c: '#e8d2a8' },
    rows: fit([
      '......kkkk',
      '.....khwwwk',
      '....khwwwwck',
      '....kwwwwwck',
      '...kwwwwwwwck',
      '...kwwwwwwwck',
      '...kwwwwwwcck',
      '....kwwwwcck',
      '.....kcccck',
      '......kkkk',
    ], 16, 16, 2),
  },
  angora: {
    palette: { k: K, w: '#fff4f8', p: '#f8c8dc', P: '#e8a0c0' },
    rows: fit([
      '......kkk',
      '....kkwwwkk',
      '..kkwwppwwwk',
      '.kwwwwwwwwwwkk',
      'kwwppwwwwwppwwk',
      'kwwwwwwwwwwwwwk',
      'kwwwwwwppwwwwPk',
      '.kwwwwwwwwwwPk',
      '..kkwwwwwwPPk',
      '....kkkkkkkk',
    ], 16, 16, 2),
  },
  wool: {
    palette: { k: K, w: '#f8ecd0', l: '#d8bf94', L: '#b89c70' },
    rows: fit([
      '.....kkkkk',
      '...kkwwlwwkk',
      '..kwwlwwlwwwk',
      '.kwlwwlwwlwwwk',
      '.kwwlwwlwwlwwk',
      'kwlwwlwwlwwlwwk',
      'kwwlwwlwwlwwlwk',
      'kwwwlwwlwwlwwLk',
      '.kwwwlwwlwwlLk',
      '.kwwwwlwwlwLLk',
      '..kwwwwlwLLk.kk',
      '...kkLLLLkk.kLk',
      '.....kkkkkkkkk',
    ], 16, 16, 1),
  },
  milk: {
    palette: { k: K, w: '#ffffff', g: '#dde4ee', b: '#5a9ad8', B: '#3f6ab4', h: '#eaf4ff' },
    rows: fit([
      '......kkkk',
      '......kBBk',
      '......kkkk',
      '......kwwk',
      '.....kwwwgk',
      '....kwhwwwgk',
      '....kwhwwwgk',
      '....kbbbbbBk',
      '....kbwwwbBk',
      '....kbbbbbBk',
      '....kwwwwwgk',
      '....kwwwwggk',
      '.....kkkkkk',
    ], 16, 16, 1),
  },
};

// ---------------------------------------------------------------------------
// Panneaux du chemin (16×24) : vers la ferme (une plume de poule), vers le jardin (une pousse)

const SIGN_PALETTE = { k: K, b: '#c89a64', B: '#8a5a34', l: '#e0b67e', w: '#fffaf0', r: '#e8403a', g: '#6cc45a', G: '#3f8a3e' };
export const SIGN_SPRITES: Record<'toFarm' | 'toGarden', PixelSprite> = {
  toFarm: {
    palette: SIGN_PALETTE,
    rows: fit([
      '.kkkkkkkkkkk',
      '.kllllllllllk',
      '.kbbbrbbbbbbbk',
      '.kbbwwwbbbbbbbk',
      '.kbbwwwbbbbbbk',
      '.kBBBBBBBBBBk',
      '.kkkkkkkkkkk',
      '......kbBk',
      '......kbBk',
      '......kbBk',
      '......kbBk',
      '......kbBk',
      '......kbBk',
      '.....kkbBkk',
      '....kGgggGk',
    ], 16, 24, 1),
  },
  toGarden: {
    palette: SIGN_PALETTE,
    rows: fit([
      '....kkkkkkkkkkk',
      '...kllllllllllk',
      '..kbbbbbbbgbbbk',
      '.kbbbbbbbgGgbbk',
      '..kbbbbbbbGbbbk',
      '...kBBBBBBBBBBk',
      '....kkkkkkkkkkk',
      '.......kbBk',
      '.......kbBk',
      '.......kbBk',
      '.......kbBk',
      '.......kbBk',
      '.......kbBk',
      '......kkbBkk',
      '.....kGgggGk',
    ], 16, 24, 1),
  },
};

// ---------------------------------------------------------------------------
// Bâtiments

/** Couleur d'un bâtiment à l'abandon : passée, grisée, un peu plus sombre. */
function aged(hex: string, ruined: boolean): string {
  if (!ruined) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const grey = (r + g + b) / 3;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round((v * 0.45 + grey * 0.55) * 0.8)));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

interface Tones { base: string; dark: string; light: string }

function tones(hex: string, ruined: boolean): Tones {
  const base = aged(hex, ruined);
  return { base, dark: shade(base, -0.25), light: shade(base, 0.18) };
}

/** Toit à deux pentes, rangées de tuiles (ou de chaume), de `top` à `top + h`. */
function gable(p: Painter, cx: number, top: number, h: number, halfTop: number, halfBottom: number, t: Tones, rows = 3): void {
  for (let y = 0; y < h; y++) {
    const half = Math.round(halfTop + ((halfBottom - halfTop) * y) / Math.max(1, h - 1));
    for (let x = cx - half; x < cx + half; x++) {
      const row = Math.floor(y / rows);
      const edge = (x + row * 2) % 6 === 0;
      let c = row % 2 === 0 ? t.base : t.dark;
      if (edge) c = t.dark;
      if (y % rows === 0 && !edge) c = t.light;
      p.px(x, top + y, c);
    }
  }
}

/** Mur de planches verticales. */
function boards(p: Painter, x: number, y: number, w: number, h: number, t: Tones, every = 4): void {
  p.rect(x, y, w, h, t.base);
  for (let i = x; i < x + w; i++) {
    const k = (i - x) % every;
    if (k === 0) for (let j = y; j < y + h; j++) p.px(i, j, t.dark);
    else if (k === 1) for (let j = y; j < y + h; j++) p.px(i, j, t.light);
  }
}

/** Mur de pierres. */
function stones(p: Painter, x: number, y: number, w: number, h: number, t: Tones): void {
  p.rect(x, y, w, h, t.base);
  for (let j = 0; j < h; j++) {
    const course = Math.floor(j / 4);
    for (let i = 0; i < w; i++) {
      if (j % 4 === 3) p.px(x + i, y + j, t.dark);
      else if ((i + course * 3) % 7 === 0) p.px(x + i, y + j, t.dark);
      else if (j % 4 === 0 && (i + course) % 5 === 1) p.px(x + i, y + j, t.light);
    }
  }
}

/** Les marques de l'abandon : trous dans le toit, planches arrachées, lierre qui grimpe. */
function ruin(p: Painter, seed: number, roof: Box, wall: Box): void {
  const r = rng(seed);
  const hole = '#2a1e26', rafter = '#5a3a28';
  for (let n = 0; n < 3; n++) {
    const cx = roof.x0 + 3 + Math.floor(r() * (roof.x1 - roof.x0 - 6));
    const cy = roof.y0 + 3 + Math.floor(r() * (roof.y1 - roof.y0 - 5));
    const rad = 1.5 + r() * 1.6;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
      if (x * x + y * y <= rad * rad && p.has(cx + x, cy + y)) p.px(cx + x, cy + y, x === 0 ? rafter : hole);
    }
  }
  for (let n = 0; n < 3; n++) {
    const x = wall.x0 + 2 + Math.floor(r() * (wall.x1 - wall.x0 - 4));
    const y0 = wall.y0 + Math.floor(r() * (wall.y1 - wall.y0) * 0.5);
    for (let y = y0; y < Math.min(wall.y1, y0 + 4 + Math.floor(r() * 5)); y++) p.px(x, y, hole);
  }
  const ivy = ['#4f8a3a', '#6cb35a', '#3a6a30'];
  for (const x0 of [wall.x0, wall.x1 - 1]) {
    let x = x0;
    for (let y = wall.y1 - 1; y > wall.y1 - (wall.y1 - wall.y0) * 0.8; y--) {
      p.px(x, y, ivy[Math.floor(r() * 3)]);
      if (r() < 0.5) p.px(x + (x0 === wall.x0 ? 1 : -1), y, ivy[Math.floor(r() * 3)]);
      if (r() < 0.25) x += x0 === wall.x0 ? 1 : -1;
    }
  }
}

/** Planches clouées en croix sur une ouverture. */
function boardedUp(p: Painter, x: number, y: number, w: number, h: number): void {
  const wood = aged('#a8784a', true), dark = aged('#7a4a2e', true);
  for (let i = 0; i < w; i++) {
    const a = y + Math.round((i * (h - 1)) / (w - 1)), b = y + h - 1 - Math.round((i * (h - 1)) / (w - 1));
    p.px(x + i, a, wood); p.px(x + i, a + 1, dark);
    p.px(x + i, b, wood); p.px(x + i, b - 1, dark);
  }
}

function snowRoof(p: Painter, cx: number, top: number, rows: number, halfTop: number, halfBottom: number, h: number): void {
  for (let y = 0; y < rows; y++) {
    const half = Math.round(halfTop + ((halfBottom - halfTop) * y) / Math.max(1, h - 1));
    for (let x = cx - half; x < cx + half; x++) if (y < rows - 1 || (x * 7 + y) % 3 !== 0) p.px(x, top + y, y === rows - 1 ? '#d8e4f0' : '#ffffff');
  }
}

export const BUILDING_SIZE: Record<BuildingId, [number, number]> = {
  coop: [30, 28], hutch: [32, 24], sheepfold: [48, 38], barn: [56, 44],
};

function coop(season: Season, ruined: boolean): HTMLCanvasElement {
  const [W, H] = BUILDING_SIZE.coop;
  const p = new Painter(W, H);
  const wall = tones('#e8c080', ruined), roof = tones('#c8583a', ruined);
  boards(p, 4, 12, 22, 14, wall, 3);
  // Petite rampe et pattes
  p.rect(5, 26, 2, 2, wall.dark); p.rect(23, 26, 2, 2, wall.dark);
  gable(p, 15, 1, 12, 4, 14, roof);
  for (let x = 1; x < 29; x++) p.px(x, 12, shade(roof.dark, -0.2));
  // Porte ronde
  p.rect(13, 17, 5, 9, '#3b2a35'); p.rect(12, 18, 7, 7, '#3b2a35');
  p.px(14, 18, '#5a3a48');
  // Fenêtre
  p.rect(6, 15, 4, 4, '#5a3420'); p.rect(7, 16, 2, 2, ruined ? '#2a1e26' : '#9fd0e8');
  if (!ruined) { p.rect(20, 22, 4, 2, '#f5d76e'); p.px(21, 21, '#f5d76e'); } // un peu de paille
  if (ruined) { ruin(p, 11, { x0: 3, x1: 27, y0: 2, y1: 12 }, { x0: 4, x1: 26, y0: 12, y1: 26 }); boardedUp(p, 12, 17, 7, 9); }
  if (season === 'winter') snowRoof(p, 15, 1, 4, 4, 14, 12);
  p.outline();
  return p.canvas;
}

function hutch(season: Season, ruined: boolean): HTMLCanvasElement {
  const [W, H] = BUILDING_SIZE.hutch;
  const p = new Painter(W, H);
  const wood = tones('#b88454', ruined), roof = tones('#5a8a4a', ruined);
  // Pieds
  p.rect(4, 19, 2, 4, wood.dark); p.rect(26, 19, 2, 4, wood.dark);
  // Caisse
  p.rect(2, 8, 28, 12, wood.base);
  p.rect(2, 19, 28, 1, wood.dark);
  // Grillage à gauche
  p.rect(4, 10, 15, 8, '#3b2a35');
  for (let y = 10; y < 18; y++) for (let x = 4; x < 19; x++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) p.px(x, y, ruined ? '#6a6070' : '#c8ccd8');
  // Porte en bois à droite
  boards(p, 21, 10, 7, 8, wood, 3);
  p.px(22, 14, '#ffd75a');
  // Toit en pente
  for (let y = 0; y < 7; y++) for (let x = 0; x < 32; x++) {
    const c = y === 0 ? roof.light : y % 2 ? roof.base : roof.dark;
    if (x >= y / 2 && x <= 31 - y / 2) p.px(x, 2 + y, c);
  }
  if (ruined) {
    ruin(p, 23, { x0: 1, x1: 31, y0: 2, y1: 9 }, { x0: 2, x1: 30, y0: 9, y1: 19 });
    for (let x = 6; x < 17; x += 3) p.px(x, 12, '#2a1e26'); // grillage troué
  }
  if (season === 'winter') for (let x = 0; x < 32; x++) { p.px(x, 2, '#ffffff'); if (x % 3) p.px(x, 3, '#ffffff'); }
  p.outline();
  return p.canvas;
}

function sheepfold(season: Season, ruined: boolean): HTMLCanvasElement {
  const [W, H] = BUILDING_SIZE.sheepfold;
  const p = new Painter(W, H);
  const wall = tones('#cfc6b4', ruined), thatch = tones('#e0b64a', ruined), wood = tones('#946040', ruined);
  stones(p, 4, 16, 40, 21, wall);
  gable(p, 24, 1, 16, 6, 23, thatch, 2);
  for (let x = 1; x < 47; x++) p.px(x, 16, shade(thatch.dark, -0.2));
  // Double porte en bois
  p.rect(17, 23, 14, 14, '#5a3420');
  boards(p, 18, 24, 6, 13, wood, 3);
  boards(p, 24, 24, 6, 13, wood, 3);
  // Lucarne
  p.rect(21, 8, 6, 5, '#5a3420'); p.rect(22, 9, 4, 3, ruined ? '#2a1e26' : '#3b2a35');
  if (ruined) { ruin(p, 37, { x0: 3, x1: 45, y0: 2, y1: 16 }, { x0: 4, x1: 44, y0: 17, y1: 36 }); boardedUp(p, 18, 24, 12, 13); }
  if (season === 'winter') snowRoof(p, 24, 1, 5, 6, 23, 16);
  p.outline();
  return p.canvas;
}

function barn(season: Season, ruined: boolean): HTMLCanvasElement {
  const [W, H] = BUILDING_SIZE.barn;
  const p = new Painter(W, H);
  const wall = tones('#c04a3a', ruined), roof = tones('#6a5a6a', ruined), trim = aged('#fff6e4', ruined);
  boards(p, 4, 18, 48, 25, wall, 4);
  // Toit « à la Mansart » : deux pentes de chaque côté
  for (let y = 0; y < 19; y++) {
    const half = y < 8 ? 10 + y * 1.4 : 21 + (y - 8) * 0.6;
    for (let x = Math.round(28 - half); x < Math.round(28 + half); x++) {
      const c = y % 3 === 0 ? roof.light : (x + y) % 5 === 0 ? roof.dark : roof.base;
      p.px(x, 1 + y, c);
    }
  }
  for (let x = 2; x < 54; x++) p.px(x, 19, shade(roof.dark, -0.2));
  // Grande porte avec la croix blanche
  p.rect(19, 27, 18, 16, trim);
  p.rect(20, 28, 16, 14, wall.dark);
  for (let i = 0; i < 16; i++) {
    const y1 = 28 + Math.round((i * 13) / 15), y2 = 41 - Math.round((i * 13) / 15);
    p.px(20 + i, y1, trim); p.px(20 + i, y2, trim);
  }
  p.rect(27, 28, 1, 14, trim);
  // Fenêtre du grenier, avec de la paille
  p.rect(23, 10, 10, 7, trim);
  p.rect(24, 11, 8, 5, '#3b2a35');
  if (!ruined) { p.rect(24, 14, 8, 2, '#f5d76e'); p.px(26, 13, '#f5d76e'); p.px(29, 13, '#f5d76e'); }
  if (ruined) { ruin(p, 51, { x0: 6, x1: 50, y0: 2, y1: 18 }, { x0: 4, x1: 52, y0: 20, y1: 42 }); boardedUp(p, 20, 28, 16, 14); }
  if (season === 'winter') for (let y = 0; y < 4; y++) {
    const half = 10 + y * 1.4;
    for (let x = Math.round(28 - half); x < Math.round(28 + half); x++) if (y < 3 || x % 3) p.px(x, 1 + y, y === 3 ? '#d8e4f0' : '#ffffff');
  }
  p.outline();
  return p.canvas;
}

export function building(id: BuildingId, season: Season, ruined: boolean): HTMLCanvasElement {
  return { coop, hutch, sheepfold, barn }[id](season, ruined);
}

// ---------------------------------------------------------------------------
// Clôtures des enclos : l'arrière (haut et côtés) et l'avant (bas) sont deux images, pour que les animaux
// passent devant l'une et derrière l'autre.

/** Marge de l'image autour du rectangle de la clôture (poteaux qui dépassent, contour). */
export const FENCE_PAD = { x: 3, top: 11, bottom: 3 } as const;
const GATE_HALF = 8;

export function paddockFence(layout: PaddockLayout, part: 'back' | 'front', season: Season, ruined: boolean): HTMLCanvasElement {
  const f = layout.fence;
  const w = f.x1 - f.x0 + 2 * FENCE_PAD.x, h = f.y1 - f.y0 + FENCE_PAD.top + FENCE_PAD.bottom;
  const p = new Painter(w, h);
  const ox = FENCE_PAD.x - f.x0, oy = FENCE_PAD.top - f.y0; // monde → image
  const wood = tones('#b07848', ruined);
  const r = rng(layout.gateX * 7 + (part === 'back' ? 1 : 2));
  const gateY = layout.side === 'top' ? f.y1 : f.y0;
  const inGate = (x: number) => x > layout.gateX - GATE_HALF && x < layout.gateX + GATE_HALF;
  const broken = () => ruined && r() < 0.35;

  const post = (x: number, y: number) => {
    if (ruined && r() < 0.15) return; // un poteau tombé
    const tall = ruined && r() < 0.4 ? 5 : 8;
    p.rect(ox + x, oy + y - tall, 2, tall + 1, wood.base);
    p.px(ox + x, oy + y - tall, wood.light);
    p.px(ox + x + 1, oy + y - tall + 1, wood.dark);
  };
  const railH = (y: number, xa: number, xb: number) => {
    for (let x = xa; x < xb; x += 8) {
      if (broken()) continue;
      for (let i = x; i < Math.min(xb, x + 8); i++) {
        if (inGate(i) && y === gateY) continue;
        for (const ry of [y - 6, y - 3]) { p.px(ox + i, oy + ry, wood.light); p.px(ox + i, oy + ry + 1, wood.dark); }
      }
    }
  };
  const side = (y: number) => {
    railH(y, f.x0, f.x1 + 2);
    for (let x = f.x0; x <= f.x1; x += 8) if (!(inGate(x) || inGate(x + 1)) || y !== gateY) post(x, y);
    if (y === gateY) { post(layout.gateX - GATE_HALF - 1, y); post(layout.gateX + GATE_HALF - 1, y); }
  };

  if (part === 'back') {
    // Côtés : une rambarde fine d'un poteau à l'autre.
    for (const x of [f.x0, f.x1]) {
      for (let y = f.y0; y < f.y1; y++) if (!(ruined && (y >> 3) % 3 === 1)) { p.px(ox + x, oy + y - 6, wood.light); p.px(ox + x + 1, oy + y - 6, wood.dark); }
      for (let y = f.y0 + 10; y < f.y1 - 4; y += 10) post(x, y);
    }
    side(f.y0);
    if (ruined) {
      // Les herbes folles ont tout envahi.
      const g = season === 'winter' ? ['#8aa88a', '#6a8a6a'] : season === 'autumn' ? ['#a89a4a', '#7a7a3a'] : ['#5aa34a', '#3f8a3e'];
      for (let n = 0; n < 26; n++) {
        const x = f.x0 + 3 + Math.floor(r() * (f.x1 - f.x0 - 6)), y = f.y0 + 4 + Math.floor(r() * (f.y1 - f.y0 - 6));
        p.px(ox + x, oy + y, g[0]); p.px(ox + x - 1, oy + y - 1, g[1]); p.px(ox + x + 1, oy + y - 2, g[0]); p.px(ox + x, oy + y - 1, g[1]);
      }
    }
  } else {
    side(f.y1);
  }
  if (season === 'winter' && !ruined) {
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (p.has(x, y) && !p.has(x, y - 1) && (x + y) % 2) p.px(x, y, '#ffffff');
  }
  p.outline();
  return p.canvas;
}
