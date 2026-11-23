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

import { approach, GARDENER_OBSTACLES, REACH, WALK_AREA } from '../src/scenes/route';
import { WORKSHOP_DOOR } from '../src/game/world';

describe('le jardinier', () => {
  const free = (p: Point) =>
    p.x >= WALK_AREA.x0 && p.x <= WALK_AREA.x1 && p.y >= WALK_AREA.y0 && p.y <= WALK_AREA.y1
    && !GARDENER_OBSTACLES.some((r) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1);

  it('se tient à côté d’une case du potager, du côté d’où il vient, tourné vers elle', () => {
    const tile = { x: 88, y: 128 };
    expect(approach(tile, { x: 20, y: 128 })).toEqual({ at: { x: 88 - REACH, y: 128 }, face: 1 });
    expect(approach(tile, { x: 180, y: 60 })).toEqual({ at: { x: 88 + REACH, y: 128 }, face: -1 });
  });

  it('touche la boîte aux lettres depuis le côté libre (pas dans la cabane)', () => {
    const { at, face } = approach({ x: 72, y: 64 }, { x: 20, y: 120 });
    expect(free(at)).toBe(true);
    expect(at.x).toBeGreaterThan(72);
    expect(face).toBe(-1);
  });

  it('va à la remise de l’atelier par le chemin, devant sa porte', () => {
    const { at } = approach(WORKSHOP_DOOR, { x: 20, y: 120 });
    expect(free(at)).toBe(true);
    expect(at.y).toBeGreaterThan(WORKSHOP_DOOR.y);
    expect(Math.abs(at.x - WORKSHOP_DOOR.x)).toBeLessThanOrEqual(REACH);
  });

  it('secoue l’arbre et salue les oiseaux perchés depuis le bas', () => {
    for (const target of [{ x: 160, y: 62 }, { x: 153, y: 36 }]) {
      const { at } = approach(target, { x: 60, y: 76 });
      expect(free(at)).toBe(true);
      expect(at.y).toBeGreaterThan(62);
    }
  });

  it('reste dans le jardin près des bords', () => {
    for (const target of [{ x: 8, y: 192 }, { x: 184, y: 192 }, { x: 8, y: 80 }]) {
      expect(free(approach(target, { x: 96, y: 100 }).at)).toBe(true);
    }
  });

  it('traverse le potager mais contourne la cabane', () => {
    const from = { x: 100, y: 190 }, to = { x: 30, y: 74 };
    const path = route(from, to, GARDENER_OBSTACLES);
    let prev = from;
    for (const p of path) {
      for (let i = 0; i <= 20; i++) {
        const x = prev.x + ((p.x - prev.x) * i) / 20, y = prev.y + ((p.y - prev.y) * i) / 20;
        expect(GARDENER_OBSTACLES.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1)).toBe(false);
      }
      prev = p;
    }
    expect(route({ x: 40, y: 120 }, { x: 160, y: 120 }, GARDENER_OBSTACLES)).toHaveLength(2);
  });
});

import { BUILDING_IDS } from '../src/game/farm';
import { paddockGate } from '../src/game/world';

describe('le jardinier va à la ferme', () => {
  const free = (p: Point) =>
    p.x >= WALK_AREA.x0 && p.x <= WALK_AREA.x1 && p.y >= WALK_AREA.y0 && p.y <= WALK_AREA.y1
    && !GARDENER_OBSTACLES.some((r) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1);
  it('rejoint chaque enclos par l’allée, sans traverser les clôtures ni la cabane', () => {
    for (const id of BUILDING_IDS) {
      for (const from of [{ x: 58, y: 76 }, { x: 100, y: 190 }, { x: 20, y: 130 }]) {
        const { at } = approach(paddockGate(id), from);
        expect(free(at), `${id} depuis ${JSON.stringify(from)}`).toBe(true);
        const path = route(from, at, GARDENER_OBSTACLES);
        expect(path.at(-1)).toEqual(at);
        let prev = from;
        for (const p of path) {
          for (let i = 0; i <= 40; i++) {
            const x = prev.x + ((p.x - prev.x) * i) / 40, y = prev.y + ((p.y - prev.y) * i) / 40;
            expect(GARDENER_OBSTACLES.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1), `${id} : (${x}, ${y})`).toBe(false);
          }
          prev = p;
        }
      }
    }
  });
});
