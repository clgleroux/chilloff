import { describe, expect, it } from 'vitest';
import { OBSTACLES, route, type Point } from '../src/scenes/route';

function crosses(from: Point, path: Point[]): boolean {
  let prev = from;
  for (const p of path) {
    // On échantillonne le segment : aucun point ne doit tomber dans un obstacle.
    for (let i = 0; i <= 20; i++) {
      const x = prev.x + ((p.x - prev.x) * i) / 20, y = prev.y + ((p.y - prev.y) * i) / 20;
      if (OBSTACLES.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1)) return true;
    }
    prev = p;
  }
  return false;
}

describe('promenade du corgi', () => {
  it('contourne le potager pour passer d’un côté à l’autre', () => {
    const from = { x: 24, y: 128 }, to = { x: 168, y: 128 };
    const path = route(from, to);
    expect(path.at(-1)).toEqual(to);
    expect(path.length).toBeGreaterThan(1);
    expect(crosses(from, path)).toBe(false);
  });

  it('va tout droit quand rien ne gêne', () => {
    expect(route({ x: 8, y: 100 }, { x: 8, y: 180 })).toHaveLength(2);
  });

  it('rejoint le paillasson depuis le bas du jardin sans traverser la cabane ni le potager', () => {
    const from = { x: 120, y: 190 }, to = { x: 40, y: 74 };
    expect(crosses(from, route(from, to))).toBe(false);
  });
});
