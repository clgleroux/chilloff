// État du jeu, actions du joueur et sauvegarde automatique (localStorage).

import {
  PLOT_COLS, PLOT_ROWS, STARTING_COINS, STARTING_SEEDS, STARTING_TILLED,
  WELCOME_BACK_AFTER, WET_DURATION, tillCost,
} from './config';
import { CROPS, CROP_IDS, cropsForSeason, isCropId, type CropId } from './crops';
import { advancePlant, isRipe, type PlantState, type PlotTile } from './growth';
import { SEASONS, dayKey, getSeason, type Season } from './seasons';

export type Lang = 'fr' | 'en';

export interface CropJournalEntry {
  count: number;
  firstAt: number;
}

export interface GameState {
  version: 1;
  createdAt: number;
  updatedAt: number;
  coins: number;
  plots: PlotTile[];
  seeds: Partial<Record<CropId, number>>;
  basket: Partial<Record<CropId, number>>;
  selectedSeed: CropId | null;
  lastSeason: Season;
  journal: {
    crops: Partial<Record<CropId, CropJournalEntry>>;
    totalHarvests: number;
    coinsEarned: number;
    daysPlayed: number;
    lastDay: string;
  };
  settings: {
    lang: Lang | null;
  };
}

export type FailReason =
  | 'notTilled' | 'occupied' | 'empty' | 'noSeedSelected' | 'noSeeds'
  | 'notRipe' | 'alreadyRipe' | 'alreadyWet' | 'alreadyTilled' | 'notEnoughCoins'
  | 'outOfSeason' | 'nothingToSell';

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; reason: FailReason };

export type GameEvent =
  | { type: 'seasonChanged'; from: Season; to: Season }
  | { type: 'ripened'; index: number; crop: CropId }
  | { type: 'newDay' };

export interface LoadReport {
  isNew: boolean;
  awayMs: number;
  readyCount: number;
  seasonChanged: { from: Season; to: Season } | null;
}

export const SAVE_KEY = 'chilloff.save.v1';
const CORRUPT_KEY = 'chilloff.save.corrupt';

export function plotIndex(col: number, row: number): number {
  return row * PLOT_COLS + col;
}

export function createNewGame(now: number): GameState {
  const plots: PlotTile[] = Array.from({ length: PLOT_COLS * PLOT_ROWS }, () => ({
    tilled: false, plant: null, wetUntil: 0,
  }));
  for (const [c, r] of STARTING_TILLED) plots[plotIndex(c, r)].tilled = true;

  const season = getSeason(new Date(now));
  // Graines de départ : la culture la plus rapide de la saison en cours.
  const starter = cropsForSeason(season).sort((a, b) => a.growTime - b.growTime)[0];

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    coins: STARTING_COINS,
    plots,
    seeds: { [starter.id]: STARTING_SEEDS },
    basket: {},
    selectedSeed: starter.id,
    lastSeason: season,
    journal: { crops: {}, totalHarvests: 0, coinsEarned: 0, daysPlayed: 1, lastDay: dayKey(new Date(now)) },
    settings: { lang: null },
  };
}

// ---------------------------------------------------------------------------
// Lecture prudente d'une sauvegarde : tout ce qui est invalide est remplacé par une valeur sûre.

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function cropCounts(v: unknown): Partial<Record<CropId, number>> {
  const out: Partial<Record<CropId, number>> = {};
  if (v && typeof v === 'object') {
    for (const [k, n] of Object.entries(v)) {
      if (isCropId(k) && typeof n === 'number' && n > 0) out[k] = Math.floor(n);
    }
  }
  return out;
}

export function parseSave(raw: string, now: number): GameState | null {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.version !== 1 || !Array.isArray(data.plots)) return null;

  const base = createNewGame(now);
  const plots: PlotTile[] = base.plots.map((fallback, i) => {
    const p = data.plots[i];
    if (!p || typeof p !== 'object') return fallback;
    let plant: PlantState | null = null;
    if (p.plant && isCropId(p.plant.id)) {
      plant = {
        id: p.plant.id,
        progress: Math.max(0, num(p.plant.progress, 0)),
        updatedAt: num(p.plant.updatedAt, now),
        plantedAt: num(p.plant.plantedAt, now),
      };
    }
    return { tilled: !!p.tilled || !!plant, plant, wetUntil: num(p.wetUntil, 0) };
  });

  const j = data.journal ?? {};
  const journalCrops: GameState['journal']['crops'] = {};
  if (j.crops && typeof j.crops === 'object') {
    for (const [k, e] of Object.entries<any>(j.crops)) {
      if (isCropId(k) && e && typeof e.count === 'number') {
        journalCrops[k] = { count: Math.max(0, Math.floor(e.count)), firstAt: num(e.firstAt, now) };
      }
    }
  }

  return {
    version: 1,
    createdAt: num(data.createdAt, now),
    updatedAt: num(data.updatedAt, now),
    coins: Math.max(0, Math.floor(num(data.coins, base.coins))),
    plots,
    seeds: cropCounts(data.seeds),
    basket: cropCounts(data.basket),
    selectedSeed: isCropId(data.selectedSeed) ? data.selectedSeed : null,
    lastSeason: SEASONS.includes(data.lastSeason) ? data.lastSeason : base.lastSeason,
    journal: {
      crops: journalCrops,
      totalHarvests: Math.max(0, num(j.totalHarvests, 0)),
      coinsEarned: Math.max(0, num(j.coinsEarned, 0)),
      daysPlayed: Math.max(1, num(j.daysPlayed, 1)),
      lastDay: typeof j.lastDay === 'string' ? j.lastDay : base.journal.lastDay,
    },
    settings: {
      lang: data.settings?.lang === 'fr' || data.settings?.lang === 'en' ? data.settings.lang : null,
    },
  };
}

// ---------------------------------------------------------------------------

export class Game {
  state: GameState;
  private changeListeners = new Set<(s: GameState) => void>();
  private eventListeners = new Set<(e: GameEvent) => void>();
  private ripeKnown: boolean[];

  constructor(
    state: GameState,
    private storage: Storage | null = null,
    private clock: () => number = () => Date.now(),
  ) {
    this.state = state;
    this.ripeKnown = state.plots.map((t) => !!t.plant && isRipe(t.plant));
  }

  /** Charge la partie (ou en crée une) et calcule ce qui s'est passé pendant l'absence. */
  static load(storage: Storage | null, clock: () => number = () => Date.now()): { game: Game; report: LoadReport } {
    const now = clock();
    let state: GameState | null = null;
    let isNew = true;
    const raw = safeGet(storage, SAVE_KEY);
    if (raw) {
      state = parseSave(raw, now);
      if (state) isNew = false;
      else safeSet(storage, CORRUPT_KEY, raw); // on garde une copie, on ne perd jamais rien
    }
    state ??= createNewGame(now);

    const awayMs = isNew ? 0 : Math.max(0, now - state.updatedAt);
    const game = new Game(state, storage, clock);
    game.advanceAll(now, false);

    const season = getSeason(new Date(now));
    let seasonChanged: LoadReport['seasonChanged'] = null;
    if (season !== state.lastSeason) {
      seasonChanged = { from: state.lastSeason, to: season };
      state.lastSeason = season;
    }
    game.touchDay(now, false);

    const readyCount = state.plots.filter((t) => t.plant && isRipe(t.plant)).length;
    game.ripeKnown = state.plots.map((t) => !!t.plant && isRipe(t.plant));
    game.save();
    return {
      game,
      report: { isNew, awayMs: awayMs >= WELCOME_BACK_AFTER ? awayMs : 0, readyCount, seasonChanged },
    };
  }

  now(): number {
    return this.clock();
  }

  get season(): Season {
    return getSeason(new Date(this.now()));
  }

  onChange(fn: (s: GameState) => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  onEvent(fn: (e: GameEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  /** Appelé régulièrement : fait pousser, détecte les plantes qui mûrissent et le changement de saison. */
  tick(): void {
    const now = this.now();
    this.advanceAll(now, true);
    const season = getSeason(new Date(now));
    if (season !== this.state.lastSeason) {
      const from = this.state.lastSeason;
      this.state.lastSeason = season;
      this.emitEvent({ type: 'seasonChanged', from, to: season });
    }
    this.touchDay(now, true);
  }

  private advanceAll(now: number, emit: boolean): void {
    this.state.plots.forEach((tile, i) => {
      if (!tile.plant) return;
      advancePlant(tile.plant, tile.wetUntil, now);
      const ripe = isRipe(tile.plant);
      if (ripe && !this.ripeKnown[i] && emit) {
        this.emitEvent({ type: 'ripened', index: i, crop: tile.plant.id });
      }
      this.ripeKnown[i] = ripe;
    });
  }

  private touchDay(now: number, emit: boolean): void {
    const key = dayKey(new Date(now));
    if (key !== this.state.journal.lastDay) {
      this.state.journal.lastDay = key;
      this.state.journal.daysPlayed += 1;
      if (emit) this.emitEvent({ type: 'newDay' });
    }
  }

  // --- Actions du joueur ----------------------------------------------------

  tillCost(): number {
    return tillCost(this.state.plots.filter((t) => t.tilled).length);
  }

  till(index: number): ActionResult<{ cost: number }> {
    const tile = this.state.plots[index];
    if (tile.tilled) return { ok: false, reason: 'alreadyTilled' };
    const cost = this.tillCost();
    if (this.state.coins < cost) return { ok: false, reason: 'notEnoughCoins' };
    this.state.coins -= cost;
    tile.tilled = true;
    this.commit();
    return { ok: true, cost };
  }

  plant(index: number, cropId: CropId | null = this.state.selectedSeed): ActionResult<{ crop: CropId }> {
    const tile = this.state.plots[index];
    if (!tile.tilled) return { ok: false, reason: 'notTilled' };
    if (tile.plant) return { ok: false, reason: 'occupied' };
    if (!cropId) return { ok: false, reason: 'noSeedSelected' };
    if (!this.state.seeds[cropId]) return { ok: false, reason: 'noSeeds' };
    const now = this.now();
    this.state.seeds[cropId]! -= 1;
    if (this.state.seeds[cropId] === 0) delete this.state.seeds[cropId];
    tile.plant = { id: cropId, progress: 0, updatedAt: now, plantedAt: now };
    this.ripeKnown[index] = false;
    this.commit();
    return { ok: true, crop: cropId };
  }

  water(index: number): ActionResult {
    const tile = this.state.plots[index];
    if (!tile.plant) return { ok: false, reason: 'empty' };
    if (isRipe(tile.plant)) return { ok: false, reason: 'alreadyRipe' };
    const now = this.now();
    if (tile.wetUntil > now) return { ok: false, reason: 'alreadyWet' };
    advancePlant(tile.plant, tile.wetUntil, now);
    tile.wetUntil = now + WET_DURATION;
    this.commit();
    return { ok: true };
  }

  harvest(index: number): ActionResult<{ crop: CropId; first: boolean }> {
    const tile = this.state.plots[index];
    if (!tile.plant) return { ok: false, reason: 'empty' };
    advancePlant(tile.plant, tile.wetUntil, this.now());
    if (!isRipe(tile.plant)) return { ok: false, reason: 'notRipe' };
    const crop = tile.plant.id;
    tile.plant = null;
    this.ripeKnown[index] = false;
    this.state.basket[crop] = (this.state.basket[crop] ?? 0) + 1;
    const entry = this.state.journal.crops[crop];
    const first = !entry;
    this.state.journal.crops[crop] = { count: (entry?.count ?? 0) + 1, firstAt: entry?.firstAt ?? this.now() };
    this.state.journal.totalHarvests += 1;
    this.commit();
    return { ok: true, crop, first };
  }

  buySeeds(cropId: CropId, qty: number): ActionResult<{ cost: number }> {
    if (CROPS[cropId].season !== this.season) return { ok: false, reason: 'outOfSeason' };
    const cost = CROPS[cropId].seedPrice * qty;
    if (this.state.coins < cost) return { ok: false, reason: 'notEnoughCoins' };
    this.state.coins -= cost;
    this.state.seeds[cropId] = (this.state.seeds[cropId] ?? 0) + qty;
    if (!this.state.selectedSeed || !this.state.seeds[this.state.selectedSeed]) this.state.selectedSeed = cropId;
    this.commit();
    return { ok: true, cost };
  }

  sell(cropId: CropId, qty: number): ActionResult<{ earned: number }> {
    const have = this.state.basket[cropId] ?? 0;
    const n = Math.min(have, qty);
    if (n <= 0) return { ok: false, reason: 'nothingToSell' };
    const earned = CROPS[cropId].sellPrice * n;
    this.state.basket[cropId] = have - n;
    if (this.state.basket[cropId] === 0) delete this.state.basket[cropId];
    this.state.coins += earned;
    this.state.journal.coinsEarned += earned;
    this.commit();
    return { ok: true, earned };
  }

  sellAll(): ActionResult<{ earned: number }> {
    let earned = 0;
    for (const id of CROP_IDS) {
      const n = this.state.basket[id] ?? 0;
      if (n > 0) earned += CROPS[id].sellPrice * n;
    }
    if (earned === 0) return { ok: false, reason: 'nothingToSell' };
    this.state.basket = {};
    this.state.coins += earned;
    this.state.journal.coinsEarned += earned;
    this.commit();
    return { ok: true, earned };
  }

  selectSeed(cropId: CropId): void {
    this.state.selectedSeed = cropId;
    this.commit();
  }

  setLang(lang: Lang): void {
    this.state.settings.lang = lang;
    this.commit();
  }

  reset(): void {
    const lang = this.state.settings.lang;
    this.state = createNewGame(this.now());
    this.state.settings.lang = lang;
    this.ripeKnown = this.state.plots.map(() => false);
    this.commit();
  }

  // --- Sauvegarde -------------------------------------------------------------

  save(): void {
    this.state.updatedAt = this.now();
    safeSet(this.storage, SAVE_KEY, JSON.stringify(this.state));
  }

  private commit(): void {
    this.save();
    for (const fn of this.changeListeners) fn(this.state);
  }

  private emitEvent(e: GameEvent): void {
    for (const fn of this.eventListeners) fn(e);
    for (const fn of this.changeListeners) fn(this.state);
  }
}

function safeGet(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Stockage plein ou indisponible (navigation privée) : le jeu continue sans sauvegarde.
  }
}
