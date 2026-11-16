// Petits outils de dessin pixel par pixel sur <canvas>, et décors générés par code
// (herbe, terre, chemin, clôture, cabane, arbres…), déclinés pour chaque saison.

import type { CropDef } from '../game/crops';
import type { Season } from '../game/seasons';
import { CROP_ICONS, PLANT_FRAMES, PLANT_H, PLANT_W, SEED_FRAME, SPROUT_FRAME } from './sprites';

export const OUTLINE = '#3b2a35';

export class Painter {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly mask: Uint8Array;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.mask = new Uint8Array(w * h);
  }

  px(x: number, y: number, color: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, 1, 1);
    this.mask[y * this.w + x] = 1;
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color);
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.mask[y * this.w + x] === 1;
  }

  /** Dessine un sprite texte ('.' = transparent). */
  strings(rows: string[], palette: Record<string, string>, ox = 0, oy = 0): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === '.' || c === ' ') continue;
        const color = palette[c];
        if (color) this.px(ox + x, oy + y, color);
      }
    });
  }

  /** Ajoute un contour d'un pixel autour de tout ce qui est déjà dessiné. */
  outline(color = OUTLINE): void {
    const add: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.has(x, y)) continue;
        if (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1)) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.px(x, y, color);
  }
}

/** Générateur pseudo-aléatoire déterministe (mêmes décors à chaque chargement). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------
// Palettes de saison

interface Foliage { base: string; dark: string; light: string; extra?: string; snow?: boolean }

export const GRASS: Record<Season, { base: string; dark: string; light: string; blade: string }> = {
  spring: { base: '#8fd16a', dark: '#6cb35a', light: '#b5e88a', blade: '#4f9a4a' },
  summer: { base: '#7cc45a', dark: '#5aa34a', light: '#a2dc72', blade: '#3f8a3e' },
  autumn: { base: '#b9b45c', dark: '#97924a', light: '#d4cc7a', blade: '#7a7a3a' },
  winter: { base: '#e9f1f8', dark: '#c9d7e6', light: '#ffffff', blade: '#8aa88a' },
};

const FOLIAGE: Record<Season, Foliage> = {
  spring: { base: '#8fd16a', dark: '#5aa34a', light: '#c4f0a0', extra: '#ffc0d8' },
  summer: { base: '#5aa34a', dark: '#3a7a3c', light: '#8fd16a' },
  autumn: { base: '#f0a03a', dark: '#c4602a', light: '#ffd27a', extra: '#d84a2a' },
  winter: { base: '#4a7a6a', dark: '#2f5a4e', light: '#6f9a88', snow: true },
};

export const BACKDROP: Record<Season, string> = {
  spring: '#5f9e4a', summer: '#4f8e3e', autumn: '#8a8442', winter: '#b8c8da',
};

// ---------------------------------------------------------------------------
// Tuiles 16×16

export function grassTile(season: Season, variant: number): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const c = GRASS[season];
  const r = rng(variant * 977 + season.length * 31);
  p.rect(0, 0, 16, 16, c.base);
  for (let i = 0; i < 16; i++) p.px(r() * 16, r() * 16, c.dark);
  for (let i = 0; i < 10; i++) p.px(r() * 16, r() * 16, c.light);
  // Touffes d'herbe (qui percent la neige en hiver).
  const tufts = variant % 2 === 0 ? 2 : 1;
  for (let i = 0; i < tufts; i++) {
    const x = 2 + Math.floor(r() * 11), y = 3 + Math.floor(r() * 11);
    p.px(x, y, c.blade); p.px(x, y - 1, c.blade);
    p.px(x + 2, y, c.blade); p.px(x + 2, y - 1, c.blade); p.px(x + 2, y - 2, c.blade);
    p.px(x + 1, y, c.dark);
  }
  if (variant === 3) seasonalDetail(p, season, r);
  return p.canvas;
}

function seasonalDetail(p: Painter, season: Season, r: () => number): void {
  const x = 4 + Math.floor(r() * 7), y = 4 + Math.floor(r() * 7);
  switch (season) {
    case 'spring': // petite fleur
      p.px(x, y - 1, '#ffffff'); p.px(x - 1, y, '#ffffff'); p.px(x + 1, y, '#ffffff'); p.px(x, y + 1, '#ffffff');
      p.px(x, y, '#ffd75a');
      p.px(x + 4, y + 3, '#ffc0d8'); p.px(x + 5, y + 3, '#f07aa8');
      break;
    case 'summer': // trèfle
      p.px(x, y, '#3f8a3e'); p.px(x + 1, y, '#3f8a3e'); p.px(x, y + 1, '#3f8a3e'); p.px(x + 1, y + 1, '#5aa34a');
      p.px(x + 4, y + 2, '#fff1a8');
      break;
    case 'autumn': // feuilles mortes
      p.px(x, y, '#e86a1a'); p.px(x + 1, y, '#ffb04a'); p.px(x, y + 1, '#c4602a');
      p.px(x + 4, y + 3, '#d84a2a'); p.px(x + 5, y + 3, '#a83a1a');
      break;
    case 'winter': // creux dans la neige
      p.px(x, y, '#b0c4d8'); p.px(x + 1, y, '#b0c4d8'); p.px(x + 2, y + 1, '#c9d7e6');
      break;
  }
}

export function soilTile(wet: boolean): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const c = wet
    ? { edge: '#3e2418', base: '#5e3a26', furrow: '#47291b', light: '#74482e', glint: '#8fa6bd' }
    : { edge: '#5a3420', base: '#8a5636', furrow: '#6e4228', light: '#a86e48', glint: '#a86e48' };
  p.rect(1, 0, 14, 16, c.edge);
  p.rect(0, 1, 16, 14, c.edge);
  p.rect(1, 1, 14, 14, c.base);
  for (const y of [4, 8, 12]) {
    for (let x = 2; x < 14; x++) {
      p.px(x, y, c.furrow);
      if ((x + y) % 5 !== 0) p.px(x, y - 1, c.light);
    }
  }
  const r = rng(wet ? 7 : 3);
  for (let i = 0; i < 6; i++) p.px(2 + r() * 12, 2 + r() * 12, c.furrow);
  if (wet) for (let i = 0; i < 3; i++) p.px(2 + r() * 12, 2 + r() * 12, c.glint);
  return p.canvas;
}

/** Case du potager pas encore défrichée : herbes folles, cailloux et repères d'angle. */
export function wildOverlay(variant: number): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const r = rng(variant * 131 + 5);
  const mark = 'rgba(90, 52, 32, 0.45)';
  for (const [x, y] of [[0, 0], [15, 0], [0, 15], [15, 15]] as const) {
    p.px(x, y, mark);
    p.px(x === 0 ? 1 : 14, y, mark);
    p.px(x, y === 0 ? 1 : 14, mark);
  }
  const x = 3 + Math.floor(r() * 8), y = 4 + Math.floor(r() * 7);
  p.px(x, y, '#8a8a96'); p.px(x + 1, y, '#a8a8b4'); p.px(x, y + 1, '#6a6a78'); p.px(x + 1, y + 1, '#8a8a96');
  const wx = 2 + Math.floor(r() * 11), wy = 6 + Math.floor(r() * 7);
  p.px(wx, wy, '#3f7a3c'); p.px(wx - 1, wy - 1, '#3f7a3c'); p.px(wx + 1, wy - 1, '#3f7a3c'); p.px(wx, wy - 2, '#5aa34a');
  return p.canvas;
}

export function pathTile(variant: number): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const r = rng(variant * 53 + 11);
  p.rect(0, 1, 16, 14, '#d9b98c');
  for (let x = 0; x < 16; x++) {
    if (r() > 0.35) p.px(x, 0, '#d9b98c');
    if (r() > 0.35) p.px(x, 15, '#d9b98c');
  }
  for (let i = 0; i < 10; i++) p.px(r() * 16, 1 + r() * 14, '#c4a274');
  for (let i = 0; i < 4; i++) {
    const x = 1 + r() * 13, y = 2 + r() * 11;
    p.px(x, y, '#a88a62'); p.px(x + 1, y, '#ecd2a8');
  }
  return p.canvas;
}

export function fenceTile(season: Season): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const wood = '#b07848', dark = '#7a4a2e', light = '#d09a68';
  for (const y of [6, 10]) {
    p.rect(0, y, 16, 2, wood);
    for (let x = 0; x < 16; x++) p.px(x, y, light);
    p.rect(0, y + 2, 16, 1, dark);
  }
  p.rect(6, 3, 4, 11, wood);
  p.rect(6, 3, 1, 11, light);
  p.rect(9, 3, 1, 11, dark);
  p.px(6, 3, OUTLINE); p.px(9, 3, OUTLINE);
  if (season === 'winter') {
    p.rect(7, 2, 2, 1, '#ffffff');
    p.rect(6, 3, 4, 1, '#ffffff');
    for (let x = 0; x < 16; x += 1) if (x < 6 || x > 9) p.px(x, 6, '#ffffff');
  }
  p.outline();
  return p.canvas;
}

// ---------------------------------------------------------------------------
// Grands éléments

export const CABIN_W = 48;
export const CABIN_H = 44;

export function cabin(season: Season, night: boolean): HTMLCanvasElement {
  const p = new Painter(CABIN_W, CABIN_H);
  const roof = { base: '#b4523a', dark: '#8a3a2c', light: '#d4765a' };
  const plank = { base: '#c89a64', dark: '#a8784a', line: '#7a5232', light: '#dcb47e' };

  // Cheminée (derrière le toit)
  p.rect(33, 2, 6, 10, '#9a5a4a');
  p.rect(33, 2, 6, 2, '#b87262');
  p.rect(38, 4, 1, 8, '#6e3a30');

  // Murs
  p.rect(5, 18, 38, 25, plank.base);
  for (let y = 18; y < 43; y++) {
    if ((y - 18) % 4 === 3) for (let x = 5; x < 43; x++) p.px(x, y, plank.line);
    else if ((y - 18) % 4 === 0) for (let x = 5; x < 43; x++) p.px(x, y, plank.light);
  }
  p.rect(5, 18, 2, 25, plank.dark);
  p.rect(41, 18, 2, 25, plank.dark);

  // Toit à deux pentes, avec tuiles
  for (let y = 0; y < 19; y++) {
    const half = Math.round(9 + (y * 15) / 18);
    const x0 = 24 - half, x1 = 24 + half;
    for (let x = x0; x < x1; x++) {
      const row = Math.floor(y / 3);
      const edge = (x + row * 2) % 6 === 0;
      let col = row % 2 === 0 ? roof.base : roof.dark;
      if (edge) col = roof.dark;
      if (y % 3 === 0 && !edge) col = roof.light;
      p.px(x, y + 1, col);
    }
  }
  // Bordure basse du toit
  for (let x = 0; x < 48; x++) p.px(x, 19, '#6e2a20');

  // Porte
  p.rect(20, 29, 9, 14, '#7a4a2e');
  p.rect(21, 30, 7, 12, '#946040');
  p.rect(24, 30, 1, 12, '#7a4a2e');
  p.px(26, 36, '#ffd75a');
  p.rect(19, 28, 11, 1, '#5a3420');
  p.rect(19, 28, 1, 15, '#5a3420');
  p.rect(29, 28, 1, 15, '#5a3420');

  // Fenêtres (chaudes la nuit)
  const glass = night ? '#ffd27a' : '#9fd0e8';
  const glassLight = night ? '#fff1b8' : '#d4f0ff';
  for (const wx of [9, 33]) {
    p.rect(wx - 1, 23, 8, 8, '#5a3420');
    p.rect(wx, 24, 6, 6, glass);
    p.px(wx, 24, glassLight); p.px(wx + 1, 24, glassLight); p.px(wx, 25, glassLight);
    p.rect(wx + 2, 24, 1, 6, '#5a3420');
    p.rect(wx, 26, 6, 1, '#5a3420');
  }
  // Jardinière sous la fenêtre de droite
  p.rect(31, 31, 10, 2, '#7a4a2e');
  const flowers = season === 'winter' ? ['#2f5a4e', '#4a7a6a'] : season === 'autumn' ? ['#e86a1a', '#ffb04a'] : ['#f07aa8', '#ffe27a'];
  for (let x = 32; x < 40; x += 2) { p.px(x, 30, flowers[0]); p.px(x + 1, 30, flowers[1]); }

  // Neige sur le toit en hiver
  if (season === 'winter') {
    for (let y = 0; y < 5; y++) {
      const half = Math.round(9 + (y * 15) / 18);
      for (let x = 24 - half; x < 24 + half; x++) if (y < 3 || (x * 7 + y) % 3 !== 0) p.px(x, y + 1, y === 4 ? '#d8e4f0' : '#ffffff');
    }
    p.rect(33, 1, 6, 2, '#ffffff');
    for (let x = 1; x < 47; x++) if (x % 5 !== 0) p.px(x, 18, '#ffffff');
  }
  p.outline();
  return p.canvas;
}

export const TREE_W = 32;
export const TREE_H = 44;

export function tree(season: Season, seed = 1): HTMLCanvasElement {
  const p = new Painter(TREE_W, TREE_H);
  const f = FOLIAGE[season];
  const r = rng(seed * 17 + 3);

  // Tronc
  p.rect(13, 28, 6, 15, '#8a5a3a');
  p.rect(13, 28, 2, 15, '#a8744c');
  p.rect(17, 28, 2, 15, '#6a4028');
  p.rect(11, 41, 10, 2, '#7a4a2e');

  // Feuillage : union de disques, ombré en bas à droite
  const blobs: Array<[number, number, number]> = [[16, 13, 11], [8, 20, 7.5], [24, 20, 7.5], [16, 23, 8.5]];
  const inBlob = (x: number, y: number) => blobs.some(([cx, cy, rad]) => (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad);
  for (let y = 0; y < 34; y++) {
    for (let x = 0; x < TREE_W; x++) {
      if (!inBlob(x, y)) continue;
      const lightSide = !inBlob(x - 2, y - 2);
      const darkSide = !inBlob(x + 2, y + 3);
      let col = f.base;
      if (darkSide) col = f.dark;
      else if (lightSide) col = f.light;
      else if (r() < 0.08) col = f.dark;
      else if (r() < 0.06) col = f.light;
      if (f.snow && (!inBlob(x, y - 2) || (!inBlob(x, y - 3) && r() < 0.7))) col = '#ffffff';
      p.px(x, y, col);
    }
  }
  if (f.extra) {
    for (let i = 0; i < 14; i++) {
      const x = 4 + Math.floor(r() * 24), y = 4 + Math.floor(r() * 24);
      if (inBlob(x, y) && inBlob(x + 1, y)) { p.px(x, y, f.extra); p.px(x + 1, y, shade(f.extra, 0.25)); }
    }
  }
  p.outline();
  return p.canvas;
}

export function bush(season: Season, seed = 1): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const f = FOLIAGE[season];
  const r = rng(seed * 29 + 7);
  const blobs: Array<[number, number, number]> = [[8, 9, 6], [4, 11, 4], [12, 11, 4]];
  const inBlob = (x: number, y: number) => blobs.some(([cx, cy, rad]) => (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad);
  for (let y = 1; y < 15; y++) {
    for (let x = 0; x < 16; x++) {
      if (!inBlob(x, y)) continue;
      let col = !inBlob(x + 1, y + 2) ? f.dark : !inBlob(x - 1, y - 1) ? f.light : f.base;
      if (col === f.base && r() < 0.1) col = f.dark;
      if (f.snow && !inBlob(x, y - 2)) col = '#ffffff';
      p.px(x, y, col);
    }
  }
  if (f.extra) { p.px(6, 7, f.extra); p.px(10, 9, f.extra); p.px(4, 11, f.extra); }
  p.outline();
  return p.canvas;
}

// ---------------------------------------------------------------------------
// Plantes et effets

function cropPalette(crop: CropDef): Record<string, string> {
  const { leaf, fruit, accent } = crop.palette;
  return {
    k: OUTLINE,
    l: leaf[0], g: leaf[1], G: leaf[2],
    f: fruit[0], F: fruit[1], R: fruit[2],
    a: accent, A: shade(accent, -0.35),
    w: '#fffaf0',
    s: '#c89a64', S: '#8a5a34',
    m: '#8a5a3a', M: '#6a4028',
    y: '#e8c890',
  };
}

/** Les 4 stades d'une plante : graine, pousse, croissance, mûre. */
export function plantFrames(crop: CropDef): HTMLCanvasElement[] {
  const pal = cropPalette(crop);
  const shape = PLANT_FRAMES[crop.shape];
  return [SEED_FRAME, SPROUT_FRAME, shape.grow, shape.ripe].map((rows) => {
    const p = new Painter(PLANT_W, PLANT_H);
    p.strings(rows, pal);
    return p.canvas;
  });
}

export function cropIcon(crop: CropDef): HTMLCanvasElement {
  const p = new Painter(16, 16);
  p.strings(CROP_ICONS[crop.shape], cropPalette(crop));
  return p.canvas;
}

export function sparkle(): HTMLCanvasElement {
  const p = new Painter(7, 7);
  p.strings(
    ['...w...', '...y...', '..yYy..', 'wyYwYyw', '..yYy..', '...y...', '...w...'],
    { w: '#ffffff', y: '#fff1a8', Y: '#ffd75a' },
  );
  return p.canvas;
}

export function drop(): HTMLCanvasElement {
  const p = new Painter(3, 5);
  p.strings(['.b.', '.b.', 'bBb', 'bBb', '.b.'], { b: '#7fc4ff', B: '#d8f0ff' });
  return p.canvas;
}

export function cursor(): HTMLCanvasElement {
  const p = new Painter(18, 18);
  const c = '#fffaf0';
  for (const [x, y, dx, dy] of [[0, 0, 1, 1], [17, 0, -1, 1], [0, 17, 1, -1], [17, 17, -1, -1]] as const) {
    for (let i = 0; i < 4; i++) { p.px(x + dx * i, y, c); p.px(x, y + dy * i, c); }
  }
  return p.canvas;
}
