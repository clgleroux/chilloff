import { describe, expect, it } from 'vitest';
import { HOUR, MINUTE } from '../src/game/config';
import { BUILDINGS, FED_DURATION, PRODUCE, isProduceReady, timeUntilProduce } from '../src/game/farm';
import { makeLetter } from '../src/game/letters';
import { Game, parseSave } from '../src/game/state';
import { PADDOCKS, isStaticBlocked } from '../src/game/world';

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

describe('la ferme', () => {
  it('commence en ruine, et se rénove avec des pièces et des matériaux', () => {
    const { game } = setup();
    expect(game.state.farm.coop).toMatchObject({ renovated: false, animals: 0 });
    expect(game.adopt('coop')).toEqual({ ok: false, reason: 'notRenovated' });

    game.state.materials = { twig: 1 };
    expect(game.renovate('coop')).toEqual({ ok: false, reason: 'missingItems' });
    game.state.materials = { twig: 20, pebble: 20 };
    game.state.coins = 10;
    expect(game.renovate('coop')).toEqual({ ok: false, reason: 'notEnoughCoins' });

    game.state.coins = 1000;
    expect(game.renovate('coop')).toEqual({ ok: true });
    const r = BUILDINGS.coop.renovation;
    expect(game.state.coins).toBe(1000 - r.coins!);
    expect(game.state.materials.twig).toBe(20 - r.materials!.twig!);
    // Le premier animal s'installe tout seul.
    expect(game.state.farm.coop).toMatchObject({ renovated: true, animals: 1 });
    expect(game.renovate('coop')).toEqual({ ok: false, reason: 'alreadyRenovated' });
  });

  it('accueille des animaux jusqu’à la capacité du bâtiment', () => {
    const { game } = setup();
    game.renovate('barn');
    const { capacity, animalPrice } = BUILDINGS.barn;
    const coins = game.state.coins;
    for (let n = 2; n <= capacity; n++) expect(game.adopt('barn')).toEqual({ ok: true, animals: n });
    expect(game.adopt('barn')).toEqual({ ok: false, reason: 'full' });
    expect(game.state.coins).toBe(coins - (capacity - 1) * animalPrice);
  });

  it('produit en temps réel, un produit par animal, qui attend qu’on vienne le chercher', () => {
    const { game, clock } = setup();
    game.renovate('coop');
    game.adopt('coop');
    expect(game.collectProduce('coop')).toEqual({ ok: false, reason: 'notRipe' });

    clock.now += BUILDINGS.coop.produceTime - MINUTE;
    game.tick();
    expect(isProduceReady('coop', game.state.farm.coop)).toBe(false);
    clock.now += MINUTE;
    game.tick();
    expect(isProduceReady('coop', game.state.farm.coop)).toBe(true);

    // Rien ne se perd, même après une longue absence.
    clock.now += 10 * HOUR;
    game.tick();
    expect(game.collectProduce('coop')).toEqual({ ok: true, produce: 'egg', n: 2, first: true });
    expect(game.state.produce.egg).toBe(2);
    expect(game.state.journal.produce.egg?.count).toBe(2);
    expect(isProduceReady('coop', game.state.farm.coop)).toBe(false);
    expect(game.collectProduce('coop').ok).toBe(false);
  });

  it('prévient quand des produits sont prêts', () => {
    const { game, clock } = setup();
    const events: string[] = [];
    game.onEvent((e) => events.push(e.type));
    game.renovate('hutch');
    clock.now += BUILDINGS.hutch.produceTime;
    game.tick();
    game.tick();
    expect(events.filter((e) => e === 'produceReady')).toHaveLength(1);
  });

  it('un repas (le légume le moins cher du panier) fait produire plus vite pendant quelques heures', () => {
    const { game, clock } = setup();
    game.renovate('sheepfold');
    expect(game.feed('sheepfold')).toEqual({ ok: false, reason: 'nothingToEat' });
    game.state.basket = { pumpkin: 1, beet: 2 };
    expect(game.feed('sheepfold')).toEqual({ ok: true, crop: 'beet' });
    expect(game.state.basket).toEqual({ pumpkin: 1, beet: 1 });
    expect(game.feed('sheepfold')).toEqual({ ok: false, reason: 'alreadyFed' });

    const T = BUILDINGS.sheepfold.produceTime; // 3 h : 4 h de repas suffisent largement
    expect(timeUntilProduce('sheepfold', game.state.farm.sheepfold, clock.now)).toBe(T / 2);
    clock.now += T / 2;
    game.tick();
    expect(isProduceReady('sheepfold', game.state.farm.sheepfold)).toBe(true);
    clock.now += FED_DURATION;
    expect(game.feed('sheepfold').ok).toBe(true); // le repas est fini : on peut en redonner un
  });

  it('les produits se vendent, seuls ou avec le reste du panier', () => {
    const { game } = setup();
    game.state.produce = { egg: 3, milk: 1 };
    game.state.basket = { beet: 1 };
    const coins = game.state.coins;
    expect(game.sellProduce('egg', 1)).toEqual({ ok: true, earned: PRODUCE.egg.sellPrice });
    const r = game.sellAll();
    expect(r).toEqual({ ok: true, earned: 2 * PRODUCE.egg.sellPrice + PRODUCE.milk.sellPrice + 7 });
    expect(game.state.produce).toEqual({});
    expect(game.state.coins).toBe(coins + 3 * PRODUCE.egg.sellPrice + PRODUCE.milk.sellPrice + 7);
  });

  it('les voisins demandent des produits de la ferme une fois qu’elle tourne', () => {
    let seen = false;
    for (let i = 0; i < 40; i++) {
      let k = i;
      const random = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
      const letter = makeLetter(10 + i, 'autumn', random, AUTUMN, ['egg']);
      if (letter.wants.some((w) => w.kind === 'produce' && w.id === 'egg')) seen = true;
    }
    expect(seen).toBe(true);
    // Sans ferme, jamais de demande de produits.
    for (let i = 0; i < 40; i++) {
      const letter = makeLetter(10 + i, 'autumn', Math.random, AUTUMN);
      expect(letter.wants.some((w) => w.kind === 'produce')).toBe(false);
    }
  });

  it('se sauvegarde et se recharge', () => {
    const { game, clock, storage } = setup();
    game.renovate('coop');
    game.state.basket = { beet: 1 };
    game.feed('coop');
    game.state.produce = { egg: 4 };
    game.save();
    const loaded = Game.load(storage, () => clock.now).game.state;
    expect(loaded.farm.coop).toMatchObject({ renovated: true, animals: 1 });
    expect(loaded.farm.coop.fedUntil).toBe(clock.now + FED_DURATION);
    expect(loaded.farm.barn.renovated).toBe(false);
    expect(loaded.produce).toEqual({ egg: 4 });
  });

  it('une ancienne sauvegarde (sans ferme) se charge avec une ferme en ruine', () => {
    const old = JSON.stringify({ version: 2, plots: [], coins: 50, decor: { placed: [{ id: 'bench', col: 11, row: 3 }], inventory: {} } });
    const s = parseSave(old, AUTUMN)!;
    expect(Object.values(s.farm).every((b) => !b.renovated && b.animals === 0)).toBe(true);
    expect(s.produce).toEqual({});
    // Le panneau de la ferme occupe désormais cette case : le banc revient dans l'atelier.
    expect(s.decor.placed).toEqual([]);
    expect(s.decor.inventory.bench).toBe(1);
  });

  it('les enclos tiennent dans la ferme et ne se chevauchent pas', () => {
    const boxes = Object.values(PADDOCKS);
    for (const p of boxes) {
      expect(p.yard.x0).toBeGreaterThan(p.fence.x0);
      expect(p.yard.x1).toBeLessThan(p.fence.x1);
      expect(p.yard.y1).toBeLessThan(p.fence.y1);
      expect(p.gateX).toBeGreaterThan(p.fence.x0);
      expect(p.gateX).toBeLessThan(p.fence.x1);
    }
    for (const a of boxes) for (const b of boxes) {
      if (a === b) continue;
      const overlap = a.fence.x0 < b.fence.x1 && b.fence.x0 < a.fence.x1 && a.fence.y0 < b.fence.y1 && b.fence.y0 < a.fence.y1;
      expect(overlap, `${a.id} / ${b.id}`).toBe(false);
    }
    expect(isStaticBlocked(11, 3)).toBe(true); // le panneau
    expect(isStaticBlocked(11, 4)).toBe(true); // le chemin va jusqu'au bord
  });
});
