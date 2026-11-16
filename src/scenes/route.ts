// Trajets du compagnon : lignes droites qui contournent le potager, la cabane et l'arbre. Sans Phaser (testé).

export interface Point { x: number; y: number }
interface Rect { x0: number; x1: number; y0: number; y1: number }

/** Le paillasson devant la porte de la cabane. */
export const DOORMAT: Point = { x: 40, y: 74 };
/** Zones que le corgi contourne (en position de ses pattes). */
export const OBSTACLES: Rect[] = [
  { x0: 44, x1: 148, y0: 82, y1: 184 }, // potager
  { x0: 12, x1: 68, y0: 22, y1: 67 }, // cabane
  { x0: 140, x1: 180, y0: 14, y1: 67 }, // l'arbre (pour ne jamais se cacher derrière son feuillage)
];
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

function clear(from: Point, points: Point[]): boolean {
  let prev = from;
  for (const p of points) {
    if (OBSTACLES.some((r) => segmentHits(prev, p, r))) return false;
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
export function route(from: Point, to: Point): Point[] {
  const options: Point[][] = [
    [{ x: to.x, y: from.y }, to],
    [{ x: from.x, y: to.y }, to],
    ...ROW_CORRIDORS.map((cy) => [{ x: from.x, y: cy }, { x: to.x, y: cy }, to]),
    ...COL_CORRIDORS.map((cx) => [{ x: cx, y: from.y }, { x: cx, y: to.y }, to]),
  ];
  const ok = options.filter((o) => clear(from, o)).sort((a, b) => length(from, a) - length(from, b));
  return ok[0] ?? [to];
}

