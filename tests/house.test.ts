import { describe, expect, it } from 'vitest';
import { DECOS } from '../src/game/decor';
import { FURNITURE, FURNITURE_IDS, DOOR_COL, FLOOR_ROWS, WALL_ROW, WINDOW_COLS, roomSpotFits } from '../src/game/house';
import { Game, SAVE_KEY, parseSave } from '../src/game/state';
import { WORKSHOP_COLS, WORKSHOP_ROWS, gardenTiles, isStaticBlocked } from '../src/game/world';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(k: string) { return this.data.get(k) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

const AUTUMN = new Date(2026, 10, 16, 12, 0).getTime();

function setup() {
  const clock = { now: AUTUMN };
  const storage = new MemoryStorage();
  const { game } = Game.load(storage, () => clock.now, () => 0.5);
  game.state.coins = 1000;
  game.state.materials = { twig: 20, pebble: 20 };
  return { game, clock, storage };
}

describe('la remise de l’atelier', () => {
  it('occupe ses cases dans le jardin : rien ne s’y pose, rien n’y pousse', () => {
    for (let col = WORKSHOP_COLS[0]; col <= WORKSHOP_COLS[1]; col++) {
      for (let row = WORKSHOP_ROWS[0]; row <= WORKSHOP_ROWS[1]; row++) {
        expect(isStaticBlocked(col, row)).toBe(true);
        expect(gardenTiles().some(([c, r]) => c === col && r === row)).toBe(false);
      }
    }
  });

  it('renvoie à l’atelier une déco qui était posée là, dans une ancienne sauvegarde', () => {
    const { game } = setup();
    const raw = JSON.parse(JSON.stringify(game.state));
    raw.decor.placed = [{ uid: 1, id: 'bench', col: 6, row: 3 }];
    delete raw.house;
    const state = parseSave(JSON.stringify(raw), AUTUMN)!;
    expect(state.decor.placed).toHaveLength(0);
    expect(state.decor.inventory.bench).toBe(1);
    expect(state.house).toEqual({ placed: [], inventory: {} });
  });
});

describe('démonter à l’atelier', () => {
  it('rend tous les matériaux de la recette, mais pas les pièces', () => {
    const { game } = setup();
    game.state.decor.inventory = { bench: 2 };
    game.state.materials = {};
    const coins = game.state.coins;
    const r = game.dismantle('bench');
    expect(r).toEqual({ ok: true, materials: DECOS.bench.recipe.materials });
    expect(game.state.materials).toEqual({ twig: 6, pebble: 2 });
    expect(game.state.decor.inventory.bench).toBe(1);
    expect(game.state.coins).toBe(coins);
  });

  it('ne rend ni les légumes ni les produits de la ferme', () => {
    const { game } = setup();
    game.state.decor.inventory = { jackolantern: 1 };
    game.state.house.inventory = { rug: 1 };
    game.state.materials = {};
    game.dismantle('jackolantern');
    expect(game.state.materials).toEqual({ twig: 1 });
    expect(game.state.basket).toEqual({});
    expect(game.dismantle('rug')).toEqual({ ok: true, materials: {} });
    expect(game.state.produce).toEqual({});
    expect(game.state.house.inventory).toEqual({});
  });

  it('refuse ce qu’on n’a pas en stock (une déco posée se range d’abord)', () => {
    const { game } = setup();
    game.state.decor.inventory = { lantern: 1 };
    expect(game.takeDeco('lantern')).toBe(true);
    game.placeDeco('lantern', 0, 5);
    expect(game.dismantle('lantern')).toEqual({ ok: false, reason: 'notFound' });
    expect(game.dismantle('bed')).toEqual({ ok: false, reason: 'notFound' });
  });

  it('démonte aussi les meubles', () => {
    const { game } = setup();
    game.state.house.inventory = { bed: 1 };
    game.state.materials = {};
    expect(game.dismantle('bed').ok).toBe(true);
    expect(game.state.materials).toEqual(FURNITURE.bed.recipe.materials);
    expect(game.state.house.inventory.bed).toBeUndefined();
  });
});

describe('les meubles de la maison', () => {
  it('se fabriquent avec des matériaux, des pièces, et parfois des produits de la ferme', () => {
    const { game } = setup();
    expect(game.craft('table')).toEqual({ ok: true, item: 'table' });
    expect(game.state.house.inventory.table).toBe(1);
    expect(game.state.decor.inventory).toEqual({});

    expect(game.canCraft('rug')).toBe(false);
    expect(game.craft('rug')).toEqual({ ok: false, reason: 'missingItems' });
    game.state.produce = { wool: 3 };
    expect(game.craft('rug').ok).toBe(true);
    expect(game.state.produce).toEqual({ wool: 1 });

    game.state.coins = 0;
    expect(game.craft('stove')).toEqual({ ok: false, reason: 'notEnoughCoins' });
  });

  it('chaque meuble a une recette', () => {
    for (const id of FURNITURE_IDS) {
      const r = FURNITURE[id].recipe;
      expect(Object.keys(r.materials ?? {}).length + Object.keys(r.produce ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('se posent sur le plancher, ou au mur pour les cadres, jamais devant la porte ni sous une fenêtre', () => {
    expect(roomSpotFits('floor', 0, FLOOR_ROWS[0])).toBe(true);
    expect(roomSpotFits('floor', DOOR_COL, FLOOR_ROWS[1])).toBe(false);
    expect(roomSpotFits('floor', 0, WALL_ROW)).toBe(false);
    expect(roomSpotFits('floor', 8, 3)).toBe(false);
    expect(roomSpotFits('wall', 0, WALL_ROW)).toBe(true);
    expect(roomSpotFits('wall', WINDOW_COLS[0], WALL_ROW)).toBe(false);
    expect(roomSpotFits('wall', 0, 3)).toBe(false);
  });

  it('se posent, se reprennent en main et se replacent', () => {
    const { game } = setup();
    game.state.house.inventory = { chair: 2, painting: 1 };
    expect(game.takeFurniture('chair')).toBe(true);
    expect(game.placeFurniture('chair', 2, 4).ok).toBe(true);
    expect(game.takeFurniture('chair')).toBe(true);
    expect(game.placeFurniture('chair', 2, 4)).toEqual({ ok: false, reason: 'blocked' });
    expect(game.placeFurniture('chair', 2, 5).ok).toBe(true);
    expect(game.canPlaceFurniture('painting', 2, 4)).toBe(false);
    expect(game.takeFurniture('painting')).toBe(true);
    expect(game.placeFurniture('painting', 2, WALL_ROW).ok).toBe(true);

    expect(game.pickUpFurniture(2, 4)).toBe('chair');
    expect(game.furnitureAt(2, 4)).toBeUndefined();
    game.returnFurniture('chair');
    expect(game.state.house.inventory).toEqual({ chair: 1 });
    expect(game.state.house.placed).toHaveLength(2);
  });

  it('restent en place au rechargement, et un meuble mal placé retourne à l’atelier', () => {
    const { game, storage, clock } = setup();
    game.state.house.inventory = { bed: 1, lamp: 1 };
    game.takeFurniture('bed');
    game.placeFurniture('bed', 0, 2);
    const raw = JSON.parse(storage.getItem(SAVE_KEY)!);
    raw.house.placed.push({ uid: 99, id: 'lamp', col: DOOR_COL, row: FLOOR_ROWS[1] }, { uid: 100, id: 'nope', col: 1, row: 3 });
    storage.setItem(SAVE_KEY, JSON.stringify(raw));
    const { game: again } = Game.load(storage, () => clock.now, () => 0.5);
    expect(again.state.house.placed.map((d) => d.id)).toEqual(['bed']);
    expect(again.state.house.inventory).toEqual({ lamp: 2 });
  });
});
