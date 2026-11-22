// Trajets du compagnon et du jardinier : lignes droites qui contournent la cabane et l'arbre (et le potager
// pour le corgi ; le jardinier, lui, marche entre les rangs). Sans Phaser (testé).

export interface Point { x: number; y: number }
export interface Rect { x0: number; x1: number; y0: number; y1: number }

/** Le paillasson devant la porte de la cabane. */
export const DOORMAT: Point = { x: 40, y: 74 };
/** Zones que le corgi contourne (en position de ses pattes). */
const CABIN: Rect = { x0: 12, x1: 68, y0: 22, y1: 67 };
const TREE: Rect = { x0: 140, x1: 180, y0: 14, y1: 67 }; // pour ne jamais se cacher derrière son feuillage
export const OBSTACLES: Rect[] = [
  { x0: 44, x1: 148, y0: 82, y1: 184 }, // potager
  CABIN,
  TREE,
];
/** Le jardinier passe dans le potager : il ne contourne que la cabane et l'arbre. */
export const GARDENER_OBSTACLES: Rect[] = [CABIN, TREE];
/** Là où le jardinier peut se tenir (pieds), dans l'herbe entre la cabane et la clôture. */
export const WALK_AREA: Rect = { x0: 6, x1: 186, y0: 24, y1: 190 };
/** Le seuil de la porte de la cabane, où le jardinier entre et sort. */
export const DOORSTEP: Point = { x: 41, y: 66 };
/** Distance entre les pieds du jardinier et ce qu'il touche, quand il se tient à côté. */
export const REACH = 12;
/** Allées pour faire le tour : le chemin du haut, l'herbe du bas, les côtés. */
const ROW_CORRIDORS = [74, 188];
const COL_CORRIDORS = [6, 186];

function segmentHits(a: Point, b: Point, r: Rect): boolean {
  if (a.y === b.y) {
    if (a.y <= r.y0 || a.y >= r.y1) return false;
    return Math.max(a.x, b.x) > r.x0 && Math.min(a.x, b.x) < r.x1;
  }
  if (a.x <= r.x0 || a.x >= r.x1) return false;
  return Math.max(a.y, b.y) > r.y0 && Math.min(a.y, b.y) < r.y1;
}

function clear(from: Point, points: Point[], obstacles: Rect[]): boolean {
  let prev = from;
  for (const p of points) {
    if (obstacles.some((r) => segmentHits(prev, p, r))) return false;
    prev = p;
  }
  return true;
}

function length(from: Point, points: Point[]): number {
  let prev = from, total = 0;
  for (const p of points) { total += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y); prev = p; }
  return total;
}

/** Un trajet en lignes droites (horizontales/verticales) qui évite les obstacles. */
export function route(from: Point, to: Point, obstacles: Rect[] = OBSTACLES): Point[] {
  const options: Point[][] = [
    [{ x: to.x, y: from.y }, to],
    [{ x: from.x, y: to.y }, to],
    ...ROW_CORRIDORS.map((cy) => [{ x: from.x, y: cy }, { x: to.x, y: cy }, to]),
    ...COL_CORRIDORS.map((cx) => [{ x: cx, y: from.y }, { x: cx, y: to.y }, to]),
  ];
  const ok = options.filter((o) => clear(from, o, obstacles)).sort((a, b) => length(from, a) - length(from, b));
  return ok[0] ?? [to];
}

function inside(p: Point, r: Rect): boolean {
  return p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1;
}

function walkable(p: Point): boolean {
  const a = WALK_AREA;
  return p.x >= a.x0 && p.x <= a.x1 && p.y >= a.y0 && p.y <= a.y1 && !GARDENER_OBSTACLES.some((r) => inside(p, r));
}

/**
 * Où le jardinier se tient pour toucher `target` (le pied de la chose) : juste à côté, à gauche ou à droite
 * (le côté le plus proche d'où il vient), tourné vers elle. Une chose dans la cabane ou dans l'arbre
 * se touche depuis le bas. `face` : -1 s'il regarde à gauche, 1 à droite.
 */
export function approach(target: Point, from: Point): { at: Point; face: -1 | 1 } {
  let t = { ...target };
  for (const r of GARDENER_OBSTACLES) if (inside(t, r)) t = { x: t.x, y: r.y1 + 5 };
  t = { x: Math.min(WALK_AREA.x1, Math.max(WALK_AREA.x0, t.x)), y: Math.min(WALK_AREA.y1, Math.max(WALK_AREA.y0, t.y)) };
  const sides: Array<-1 | 1> = from.x <= t.x ? [-1, 1] : [1, -1];
  for (const side of sides) {
    const at = { x: Math.round(t.x + side * REACH), y: Math.round(t.y) };
    if (walkable(at)) return { at, face: side === -1 ? 1 : -1 };
  }
  const below = { x: Math.round(t.x), y: Math.round(Math.min(WALK_AREA.y1, t.y + 6)) };
  return { at: below, face: from.x <= t.x ? 1 : -1 };
}
