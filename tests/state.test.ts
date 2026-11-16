import { describe, expect, it } from 'vitest';
import { HOUR, MINUTE, STARTING_TILLED } from '../src/game/config';
import { CROPS } from '../src/game/crops';
import { daysUntilNextSeason, getSeason } from '../src/game/seasons';
import { Game, SAVE_KEY, createNewGame, plotIndex } from '../src/game/state';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(k: string) { return this.data.get(k) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

const AUTUMN = new Date(2026, 10, 16, 12, 0).getTime(); // 16 novembre

describe('saisons', () => {
  it('suivent le vrai calendrier', () => {
    expect(getSeason(new Date(2026, 10, 16))).toBe('autumn');
    expect(getSeason(new Date(2026, 11, 1))).toBe('winter');
    expect(getSeason(new Date(2027, 1, 28))).toBe('winter');
    expect(getSeason(new Date(2027, 2, 1))).toBe('spring');
    expect(getSeason(new Date(2027, 6, 14))).toBe('summer');
  });

  it("comptent les jours jusqu'à la saison suivante", () => {
    expect(daysUntilNextSeason(new Date(2026, 10, 16))).toBe(15);
    expect(daysUntilNextSeason(new Date(2026, 11, 25))).toBe(66); // hiver → 1er mars 2027
  });
});

describe('partie', () => {
  it('démarre avec des graines rapides de la saison', () => {
    const s = createNewGame(AUTUMN);
    expect(s.seeds.beet).toBe(6);
    expect(s.selectedSeed).toBe('beet');
    expect(s.plots.filter((t) => t.tilled)).toHaveLength(STARTING_TILLED.length);
  });

  it('boucle complète : planter, arroser, récolter, vendre', () => {
    let now = AUTUMN;
    const { game } = Game.load(new MemoryStorage(), () => now);
    const i = plotIndex(1, 2);
    expect(game.plant(i).ok).toBe(true);
    expect(game.water(i).ok).toBe(true);
    expect(game.water(i)).toEqual({ ok: false, reason: 'alreadyWet' });
    expect(game.harvest(i)).toEqual({ ok: false, reason: 'notRipe' });

    now += CROPS.beet.growTime / 2; // arrosée : 2× plus vite
    game.tick();
    const h = game.harvest(i);
    expect(h).toEqual({ ok: true, crop: 'beet', first: true });
    expect(game.state.basket.beet).toBe(1);
    expect(game.state.journal.crops.beet?.count).toBe(1);

    const coins = game.state.coins;
    expect(game.sellAll()).toEqual({ ok: true, earned: CROPS.beet.sellPrice });
    expect(game.state.coins).toBe(coins + CROPS.beet.sellPrice);
  });

  it("refuse de planter hors du potager défriché ou sans graines", () => {
    const { game } = Game.load(new MemoryStorage(), () => AUTUMN);
    expect(game.plant(plotIndex(0, 0))).toEqual({ ok: false, reason: 'notTilled' });
    game.state.seeds = {};
    expect(game.plant(plotIndex(1, 2))).toEqual({ ok: false, reason: 'noSeeds' });
  });

  it("ne vend que les graines de la saison", () => {
    const { game } = Game.load(new MemoryStorage(), () => AUTUMN);
    expect(game.buySeeds('radish', 1)).toEqual({ ok: false, reason: 'outOfSeason' });
    expect(game.buySeeds('pumpkin', 1).ok).toBe(true);
    expect(game.buySeeds('pumpkin', 100)).toEqual({ ok: false, reason: 'notEnoughCoins' });
  });

  it('défriche une case contre des pièces', () => {
    const { game } = Game.load(new MemoryStorage(), () => AUTUMN);
    const cost = game.tillCost();
    const before = game.state.coins;
    expect(game.till(plotIndex(0, 0))).toEqual({ ok: true, cost });
    expect(game.state.coins).toBe(before - cost);
    expect(game.tillCost()).toBeGreaterThan(cost);
  });

  it("sauvegarde automatiquement et fait pousser pendant l'absence", () => {
    const storage = new MemoryStorage();
    let now = AUTUMN;
    const first = Game.load(storage, () => now).game;
    first.plant(plotIndex(1, 2));
    first.plant(plotIndex(2, 2));

    now += 2 * HOUR;
    const { game, report } = Game.load(storage, () => now);
    expect(report.isNew).toBe(false);
    expect(report.awayMs).toBe(2 * HOUR);
    expect(report.readyCount).toBe(2);
    expect(game.harvest(plotIndex(1, 2)).ok).toBe(true);
  });

  it('signale le changement de saison au retour', () => {
    const storage = new MemoryStorage();
    let now = AUTUMN;
    Game.load(storage, () => now);
    now = new Date(2026, 11, 2, 9, 0).getTime();
    const { report } = Game.load(storage, () => now);
    expect(report.seasonChanged).toEqual({ from: 'autumn', to: 'winter' });
  });

  it('survit à une sauvegarde abîmée sans la perdre', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{oups');
    const { game, report } = Game.load(storage, () => AUTUMN);
    expect(report.isNew).toBe(true);
    expect(game.state.coins).toBeGreaterThan(0);
    expect(storage.getItem('chilloff.save.corrupt')).toBe('{oups');
  });

  it('ne compte pas une absence de quelques minutes comme un retour', () => {
    const storage = new MemoryStorage();
    let now = AUTUMN;
    Game.load(storage, () => now);
    now += 2 * MINUTE;
    expect(Game.load(storage, () => now).report.awayMs).toBe(0);
  });
});
