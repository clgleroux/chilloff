import { describe, expect, it } from 'vitest';
import { FORAGE_MAX, MINUTE } from '../src/game/config';
import { DECOS } from '../src/game/decor';
import { Game, SAVE_KEY, createNewGame, parseSave } from '../src/game/state';
import { isStaticBlocked } from '../src/game/world';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(k: string) { return this.data.get(k) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

/** Hasard reproductible. */
function seeded(seed = 1): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const AUTUMN_DAY = new Date(2026, 10, 16, 14, 0).getTime();
const AUTUMN_NIGHT = new Date(2026, 10, 16, 23, 0).getTime();

function newGame(now = AUTUMN_DAY, seed = 1) {
  let t = now;
  const { game } = Game.load(new MemoryStorage(), () => t, seeded(seed));
  return { game, advance: (ms: number) => { t += ms; game.tick(); } };
}

describe('jardin vivant', () => {
  it('une nouvelle partie a déjà de quoi cliquer : trouvailles, un visiteur, une lettre', () => {
    const { game } = newGame();
    expect(game.state.forage.length).toBeGreaterThanOrEqual(3);
    expect(game.state.visitors.length).toBeGreaterThanOrEqual(1);
    expect(game.state.letter?.from).toBe('rose');
    for (const f of game.state.forage) expect(isStaticBlocked(f.col, f.row)).toBe(false);
  });

  it('les trouvailles se ramassent et reviennent avec le temps, sans dépasser le maximum', () => {
    const { game, advance } = newGame();
    const first = game.state.forage[0];
    const res = game.collect(first.uid);
    expect(res).toEqual({ ok: true, material: first.id });
    expect(game.state.materials[first.id]).toBe(1);
    for (let i = 0; i < 30; i++) advance(5 * MINUTE);
    expect(game.state.forage.length).toBe(FORAGE_MAX);
  });

  it('saluer un visiteur : il entre au journal et laisse un cadeau la première fois', () => {
    const { game } = newGame();
    const v = game.state.visitors[0];
    const coins = game.state.coins;
    const res = game.greet(v.uid);
    expect(res.ok && res.first).toBe(true);
    expect(res.ok && res.gift).toBeTruthy();
    expect(game.state.journal.visitors[v.id]?.count).toBe(1);
    expect(game.state.visitors.find((x) => x.uid === v.uid)).toBeUndefined();
    const materials = Object.values(game.state.materials).reduce((a, b) => a + (b ?? 0), 0);
    const seeds = Object.values(game.state.seeds).reduce((a, b) => a + (b ?? 0), 0);
    expect(game.state.coins > coins || materials > 0 || seeds > 6).toBe(true);
  });

  it('la nuit, ce sont les visiteurs nocturnes qui viennent', () => {
    const { game } = newGame(AUTUMN_NIGHT);
    expect(game.state.visitors.map((v) => v.id)).toContain('owl');
  });

  it('la première lettre demande des brindilles et offre un nichoir', () => {
    const { game } = newGame();
    expect(game.canDeliver()).toBe(false);
    expect(game.deliverLetter()).toEqual({ ok: false, reason: 'missingItems' });
    game.state.materials.twig = 3;
    const coins = game.state.coins;
    expect(game.deliverLetter().ok).toBe(true);
    expect(game.state.materials.twig).toBeUndefined();
    expect(game.state.coins).toBe(coins + 10);
    expect(game.state.decor.inventory.birdhouse).toBe(1);
    expect(game.state.letter).toBeNull();
  });

  it('une nouvelle lettre arrive quelques minutes après, et on peut décliner sans pénalité', () => {
    const { game, advance } = newGame();
    game.state.materials.twig = 3;
    game.deliverLetter();
    advance(7 * MINUTE);
    expect(game.state.letter?.from).toBe('capucine');
    expect(game.state.letter?.wants[0]).toEqual({ kind: 'crop', id: 'beet', n: 2 });
    const coins = game.state.coins;
    game.skipLetter();
    expect(game.state.coins).toBe(coins);
    advance(3 * MINUTE);
    expect(game.state.letter).not.toBeNull();
  });

  it('fabriquer et poser une déco, puis la déplacer', () => {
    const { game } = newGame();
    expect(game.craft('birdhouse')).toEqual({ ok: false, reason: 'missingItems' });
    game.state.materials.twig = 4;
    expect(game.craft('birdhouse')).toEqual({ ok: true, deco: 'birdhouse' });
    expect(game.state.coins).toBe(20 - (DECOS.birdhouse.recipe.coins ?? 0));
    expect(game.takeDeco('birdhouse')).toBe(true);
    expect(game.placeDeco('birdhouse', 4, 3)).toEqual({ ok: false, reason: 'blocked' }); // boîte aux lettres
    expect(game.placeDeco('birdhouse', 3, 7)).toEqual({ ok: false, reason: 'blocked' }); // potager
    game.state.forage = [];
    expect(game.placeDeco('birdhouse', 0, 6).ok).toBe(true);
    expect(game.decoAt(0, 6)?.id).toBe('birdhouse');
    expect(game.pickUpDeco(0, 6)).toBe('birdhouse');
    expect(game.decoAt(0, 6)).toBeUndefined();
  });

  it('le bonhomme de neige ne se fabrique qu’en hiver', () => {
    const { game } = newGame();
    game.state.materials = { pinecone: 2, twig: 2 };
    expect(game.craft('snowman')).toEqual({ ok: false, reason: 'outOfSeason' });
  });

  it('un nichoir posé attire une mésange perchée dessus', () => {
    const { game, advance } = newGame();
    game.state.forage = [];
    game.state.decor.inventory.birdhouse = 1;
    game.takeDeco('birdhouse');
    game.placeDeco('birdhouse', 0, 7);
    let seen = false;
    for (let i = 0; i < 80 && !seen; i++) {
      for (const v of [...game.state.visitors]) if (v.id !== 'bluetit') game.greet(v.uid);
      advance(5 * MINUTE);
      seen = game.state.visitors.some((v) => v.id === 'bluetit' && v.perch && v.col === 0 && v.row === 7);
    }
    expect(seen).toBe(true);
  });

  it('secouer l’arbre fait tomber une brindille, puis il faut attendre un peu', () => {
    const { game } = newGame();
    const res = game.shakeTree();
    expect(res.dropped?.id).toBe('twig');
    expect(game.shakeTree().dropped).toBeNull();
  });

  it('une sauvegarde v1 est migrée sans rien perdre', () => {
    const v1 = { ...createNewGame(AUTUMN_DAY), version: 1, coins: 123 } as Record<string, unknown>;
    for (const k of ['materials', 'forage', 'nextForageAt', 'decor', 'visitors', 'nextVisitorAt', 'letter', 'nextLetterAt', 'lettersDone', 'treeShakeAt', 'nextUid']) delete v1[k];
    const parsed = parseSave(JSON.stringify(v1), AUTUMN_DAY);
    expect(parsed?.version).toBe(2);
    expect(parsed?.coins).toBe(123);
    expect(parsed?.decor.placed).toEqual([]);

    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(v1));
    const { game, report } = Game.load(storage, () => AUTUMN_DAY, seeded(3));
    expect(report.isNew).toBe(false);
    expect(game.state.forage.length).toBeGreaterThan(0);
    expect(game.state.letter).not.toBeNull();
  });
});

describe('courrier lu', () => {
  it('une lettre lue reste dans la boîte, et prévient quand on a de quoi répondre', () => {
    const { game } = newGame();
    const events: string[] = [];
    game.onEvent((e) => events.push(e.type));
    expect(game.state.letter?.read).toBe(false);
    game.markLetterRead();
    expect(game.state.letter?.read).toBe(true);
    game.state.forage = [{ uid: 9001, id: 'twig', col: 0, row: 6 }, { uid: 9002, id: 'twig', col: 0, row: 7 }, { uid: 9003, id: 'twig', col: 0, row: 8 }];
    game.collect(9001);
    game.collect(9002);
    expect(events).not.toContain('letterReady');
    game.collect(9003);
    expect(events.filter((e) => e === 'letterReady')).toHaveLength(1);
  });

  it('la case au-dessus de la boîte aux lettres reste libre', () => {
    expect(isStaticBlocked(4, 2)).toBe(true);
  });
});

describe('compagnon', () => {
  it('se nomme au premier câlin, nom nettoyé et raccourci', () => {
    const { game } = newGame();
    expect(game.state.companion.name).toBeNull();
    expect(game.nameCompanion('   ')).toBe('');
    expect(game.nameCompanion('  Mini   Biscotte  ')).toBe('Mini Biscotte');
    expect(game.nameCompanion('Un nom vraiment beaucoup trop long')).toHaveLength(16);
  });

  it('les câlins comptent toutes les 3 min, le premier du jour double', () => {
    const { game, advance } = newGame();
    expect(game.petCompanion()).toMatchObject({ counted: true, dailyBonus: true });
    expect(game.state.companion.friendship).toBe(2);
    expect(game.petCompanion().counted).toBe(false); // juste des cœurs
    advance(3 * MINUTE);
    expect(game.petCompanion()).toMatchObject({ counted: true, dailyBonus: false, hearts: 1, unlocked: 'bandana' });
  });

  it('les accessoires se débloquent avec les cœurs', () => {
    const { game } = newGame();
    expect(game.setAccessory('strawhat')).toBe(false);
    game.state.companion.friendship = 15;
    expect(game.companionHearts).toBe(3);
    expect(game.setAccessory('strawhat')).toBe(true);
    expect(game.setAccessory('scarf')).toBe(false);
    expect(game.state.companion.accessory).toBe('strawhat');
  });

  it('creuse de temps en temps le jour et déterre une trouvaille', () => {
    const { game, advance } = newGame();
    expect(game.canDig()).toBe(false);
    advance(6 * MINUTE);
    game.state.forage = [];
    expect(game.canDig()).toBe(true);
    expect(game.companionDig(4, 3)).toBeNull(); // la boîte aux lettres : il réessaiera ailleurs
    advance(MINUTE);
    const item = game.companionDig(0, 6);
    expect(item && [item.col, item.row]).toEqual([0, 6]);
    expect(game.canDig()).toBe(false);
  });

  it('ne creuse pas la nuit', () => {
    const { game, advance } = newGame(AUTUMN_NIGHT);
    advance(20 * MINUTE);
    expect(game.canDig()).toBe(false);
  });
});
