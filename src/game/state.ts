// État du jeu, actions du joueur et sauvegarde automatique (localStorage).

import {
  FORAGE_AT_START, FORAGE_INTERVAL, FORAGE_MAX, LETTER_DELAY, LETTER_SKIP_DELAY,
  PLOT_COLS, PLOT_ROWS, STARTING_COINS, STARTING_SEEDS, STARTING_TILLED, TREE_SHAKE_COOLDOWN,
  VISITOR_GIFT_CHANCE, VISITOR_INTERVAL, VISITOR_MAX, VISITOR_STAY,
  WELCOME_BACK_AFTER, WET_DURATION, tillCost,
} from './config';
import {
  ACCESSORY_IDS, DAILY_PET_BONUS, DIG_EXTRA_FORAGE, DIG_INTERVAL, NAME_MAX_LENGTH, PET_COOLDOWN,
  accessoryHearts, heartsFor, isAccessoryId, type AccessoryId,
} from './companion';
import { CROPS, CROP_IDS, cropsForSeason, isCropId, type CropId } from './crops';
import { DECOS, isDecoId, type DecoId, type Recipe } from './decor';
import {
  BUILDINGS, BUILDING_IDS, PRODUCE, PRODUCE_IDS, FED_DURATION, advanceBuilding, isFed, isProduceId, isProduceReady, newBuilding,
  type BuildingId, type BuildingState, type ProduceId,
} from './farm';
import { advancePlant, isRipe, type PlantState, type PlotTile } from './growth';
import { FURNITURE, isFurnitureId, roomSpotFits, type FurnitureId } from './house';
import { CHARACTERS, makeLetter, type Letter, type Want } from './letters';
import { forageTable, isMaterialId, type MaterialId } from './materials';
import { SEASONS, dayKey, getSeason, isNight, type Season } from './seasons';
import { VISITORS, VISITOR_IDS, isVisitorId, visitorAwake, type VisitorDef, type VisitorId } from './visitors';
import { TREE_DROP_TILES, TREE_SPOTS, gardenTiles, isStaticBlocked, tileFoot } from './world';

export type Lang = 'fr' | 'en';

export interface JournalEntry {
  count: number;
  firstAt: number;
}

export interface ForageItem {
  uid: number;
  id: MaterialId;
  col: number;
  row: number;
}

export interface PlacedDeco {
  uid: number;
  id: DecoId;
  col: number;
  row: number;
}

/** Un meuble posé dans la maison (case dans le repère de la pièce). */
export interface PlacedFurniture {
  uid: number;
  id: FurnitureId;
  col: number;
  row: number;
}

/** Ce qui se fabrique et se démonte à l'atelier : une déco du jardin ou un meuble de la maison. */
export type CraftId = DecoId | FurnitureId;

export interface VisitorInstance {
  uid: number;
  id: VisitorId;
  /** Pied du sprite, en pixels du monde. */
  x: number;
  y: number;
  /** Case occupée (pour ne pas empiler les visiteurs). */
  col: number;
  row: number;
  /** Perché (sur un nichoir, dans l'arbre) : dessiné au-dessus du reste. */
  perch: boolean;
  arrivedAt: number;
  leavesAt: number;
}

export interface CompanionState {
  /** null tant qu'on ne l'a pas encore nommé (au premier câlin). */
  name: string | null;
  friendship: number;
  /** Dernier câlin compté pour l'amitié. */
  lastPetAt: number;
  /** Jour (AAAA-MM-JJ) du dernier câlin, pour le bonus du premier câlin du jour. */
  lastPetDay: string;
  accessory: AccessoryId | null;
  nextDigAt: number;
}

export interface GameState {
  version: 2;
  createdAt: number;
  updatedAt: number;
  coins: number;
  plots: PlotTile[];
  seeds: Partial<Record<CropId, number>>;
  basket: Partial<Record<CropId, number>>;
  selectedSeed: CropId | null;
  lastSeason: Season;
  materials: Partial<Record<MaterialId, number>>;
  forage: ForageItem[];
  nextForageAt: number;
  decor: { placed: PlacedDeco[]; inventory: Partial<Record<DecoId, number>> };
  /** L'intérieur de la maison : meubles posés et meubles fabriqués pas encore posés. */
  house: { placed: PlacedFurniture[]; inventory: Partial<Record<FurnitureId, number>> };
  visitors: VisitorInstance[];
  nextVisitorAt: number;
  letter: Letter | null;
  nextLetterAt: number;
  lettersDone: number;
  treeShakeAt: number;
  nextUid: number;
  companion: CompanionState;
  /** La ferme au bout du chemin : un état par bâtiment. */
  farm: Record<BuildingId, BuildingState>;
  /** Produits de la ferme ramassés, en attente d'être vendus ou donnés. */
  produce: Partial<Record<ProduceId, number>>;
  journal: {
    crops: Partial<Record<CropId, JournalEntry>>;
    visitors: Partial<Record<VisitorId, JournalEntry>>;
    produce: Partial<Record<ProduceId, JournalEntry>>;
    totalHarvests: number;
    coinsEarned: number;
    daysPlayed: number;
    lastDay: string;
    forageCount: number;
    lettersDelivered: number;
  };
  settings: {
    lang: Lang | null;
  };
}

export type FailReason =
  | 'notTilled' | 'occupied' | 'empty' | 'noSeedSelected' | 'noSeeds'
  | 'notRipe' | 'alreadyRipe' | 'alreadyWet' | 'alreadyTilled' | 'notEnoughCoins'
  | 'outOfSeason' | 'nothingToSell' | 'notFound' | 'missingItems' | 'noLetter' | 'blocked'
  | 'notRenovated' | 'alreadyRenovated' | 'full' | 'alreadyFed' | 'nothingToEat';

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; reason: FailReason };

export interface GiftResult {
  coins?: number;
  material?: [MaterialId, number];
  seeds?: [CropId, number];
}

export type GameEvent =
  | { type: 'seasonChanged'; from: Season; to: Season }
  | { type: 'ripened'; index: number; crop: CropId }
  | { type: 'produceReady'; building: BuildingId }
  | { type: 'letterArrived' }
  | { type: 'letterReady' }
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

function newFarm(now: number): Record<BuildingId, BuildingState> {
  return Object.fromEntries(BUILDING_IDS.map((id) => [id, newBuilding(now)])) as Record<BuildingId, BuildingState>;
}

function newCompanion(now: number): CompanionState {
  return { name: null, friendship: 0, lastPetAt: 0, lastPetDay: '', accessory: null, nextDigAt: now + DIG_INTERVAL[0] };
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
    version: 2,
    createdAt: now,
    updatedAt: now,
    coins: STARTING_COINS,
    plots,
    seeds: { [starter.id]: STARTING_SEEDS },
    basket: {},
    selectedSeed: starter.id,
    lastSeason: season,
    materials: {},
    forage: [],
    // Dans le passé : quelques trouvailles attendent déjà dans l'herbe au premier lancement.
    nextForageAt: now - FORAGE_AT_START * FORAGE_INTERVAL[1],
    decor: { placed: [], inventory: {} },
    house: { placed: [], inventory: {} },
    visitors: [],
    nextVisitorAt: now,
    letter: null,
    nextLetterAt: now,
    lettersDone: 0,
    treeShakeAt: 0,
    nextUid: 1,
    companion: newCompanion(now),
    farm: newFarm(now),
    produce: {},
    journal: {
      crops: {}, visitors: {}, produce: {}, totalHarvests: 0, coinsEarned: 0, daysPlayed: 1,
      lastDay: dayKey(new Date(now)), forageCount: 0, lettersDelivered: 0,
    },
    settings: { lang: null },
  };
}

// ---------------------------------------------------------------------------
// Lecture prudente d'une sauvegarde (v1 ou v2) : tout ce qui est invalide est remplacé par une valeur sûre.

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function counts<K extends string>(v: unknown, isKey: (k: unknown) => k is K): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  if (v && typeof v === 'object') {
    for (const [k, n] of Object.entries(v)) {
      if (isKey(k) && typeof n === 'number' && n > 0) out[k] = Math.floor(n);
    }
  }
  return out;
}

function journalEntries<K extends string>(v: unknown, isKey: (k: unknown) => k is K, now: number): Partial<Record<K, JournalEntry>> {
  const out: Partial<Record<K, JournalEntry>> = {};
  if (v && typeof v === 'object') {
    for (const [k, e] of Object.entries<any>(v)) {
      if (isKey(k) && e && typeof e.count === 'number') {
        out[k] = { count: Math.max(0, Math.floor(e.count)), firstAt: num(e.firstAt, now) };
      }
    }
  }
  return out;
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

function parseCompanion(c: any, now: number): CompanionState {
  const base = newCompanion(now);
  if (!c || typeof c !== 'object') return base;
  const friendship = Math.max(0, Math.floor(num(c.friendship, 0)));
  const accessory = isAccessoryId(c.accessory) && heartsFor(friendship) >= accessoryHearts(c.accessory) ? c.accessory : null;
  return {
    name: typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, NAME_MAX_LENGTH) : null,
    friendship,
    lastPetAt: num(c.lastPetAt, 0),
    lastPetDay: typeof c.lastPetDay === 'string' ? c.lastPetDay : '',
    accessory,
    nextDigAt: num(c.nextDigAt, base.nextDigAt),
  };
}

function parseFarm(f: any, now: number): Record<BuildingId, BuildingState> {
  const farm = newFarm(now);
  if (!f || typeof f !== 'object') return farm;
  for (const id of BUILDING_IDS) {
    const b = f[id];
    if (!b || typeof b !== 'object' || !b.renovated) continue;
    farm[id] = {
      renovated: true,
      animals: Math.min(BUILDINGS[id].capacity, Math.max(1, Math.floor(num(b.animals, 1)))),
      progress: Math.max(0, num(b.progress, 0)),
      updatedAt: num(b.updatedAt, now),
      fedUntil: num(b.fedUntil, 0),
    };
  }
  return farm;
}

export function parseSave(raw: string, now: number): GameState | null {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.plots)) return null;

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
  let uid = Math.max(1, Math.floor(num(data.nextUid, 1)));
  const taken = new Set<string>();
  const freeTile = (col: unknown, row: unknown) =>
    typeof col === 'number' && typeof row === 'number' && !isStaticBlocked(col, row) && !taken.has(`${col},${row}`);

  const placed: PlacedDeco[] = [];
  const inventory = counts(data.decor?.inventory, isDecoId);
  for (const d of arr(data.decor?.placed)) {
    if (isDecoId(d?.id) && freeTile(d.col, d.row)) {
      placed.push({ uid: uid++, id: d.id, col: d.col, row: d.row });
      taken.add(`${d.col},${d.row}`);
    } else if (isDecoId(d?.id)) {
      // Sa case n'est plus libre (le chemin vers la ferme, par exemple) : la déco revient dans l'atelier.
      const id: DecoId = d.id;
      inventory[id] = (inventory[id] ?? 0) + 1;
    }
  }
  const furniture: PlacedFurniture[] = [];
  const furnitureStock = counts(data.house?.inventory, isFurnitureId);
  const roomTaken = new Set<string>();
  for (const d of arr(data.house?.placed)) {
    if (!isFurnitureId(d?.id)) continue;
    const id: FurnitureId = d.id;
    const ok = typeof d.col === 'number' && typeof d.row === 'number'
      && roomSpotFits(FURNITURE[id].spot, d.col, d.row) && !roomTaken.has(`${d.col},${d.row}`);
    if (ok) {
      furniture.push({ uid: uid++, id, col: d.col, row: d.row });
      roomTaken.add(`${d.col},${d.row}`);
    } else {
      furnitureStock[id] = (furnitureStock[id] ?? 0) + 1; // plus de place : le meuble attend à l'atelier
    }
  }
  const forage: ForageItem[] = [];
  for (const f of arr(data.forage)) {
    if (isMaterialId(f?.id) && freeTile(f.col, f.row)) {
      forage.push({ uid: uid++, id: f.id, col: f.col, row: f.row });
      taken.add(`${f.col},${f.row}`);
    }
  }
  const visitors: VisitorInstance[] = [];
  for (const v of arr(data.visitors)) {
    if (isVisitorId(v?.id) && typeof v.x === 'number' && typeof v.y === 'number') {
      visitors.push({
        uid: uid++, id: v.id, x: v.x, y: v.y, col: num(v.col, -1), row: num(v.row, -1), perch: !!v.perch,
        arrivedAt: num(v.arrivedAt, now), leavesAt: num(v.leavesAt, now),
      });
    }
  }

  let letter: Letter | null = null;
  const l = data.letter;
  if (l && CHARACTERS.includes(l.from) && typeof l.text === 'string' && Array.isArray(l.wants)) {
    const wants: Want[] = l.wants.filter((w: any) =>
      w && typeof w.n === 'number' && w.n > 0 &&
      ((w.kind === 'crop' && isCropId(w.id)) || (w.kind === 'material' && isMaterialId(w.id)) || (w.kind === 'produce' && isProduceId(w.id))));
    if (wants.length) {
      letter = {
        id: num(l.id, 0), from: l.from, text: l.text, wants, arrivedAt: num(l.arrivedAt, now), read: !!l.read,
        reward: {
          coins: Math.max(0, Math.floor(num(l.reward?.coins, 0))),
          deco: isDecoId(l.reward?.deco) ? l.reward.deco : undefined,
          materials: counts(l.reward?.materials, isMaterialId),
        },
      };
    }
  }

  return {
    version: 2,
    createdAt: num(data.createdAt, now),
    updatedAt: num(data.updatedAt, now),
    coins: Math.max(0, Math.floor(num(data.coins, base.coins))),
    plots,
    seeds: counts(data.seeds, isCropId),
    basket: counts(data.basket, isCropId),
    selectedSeed: isCropId(data.selectedSeed) ? data.selectedSeed : null,
    lastSeason: SEASONS.includes(data.lastSeason) ? data.lastSeason : base.lastSeason,
    materials: counts(data.materials, isMaterialId),
    forage,
    // Une ancienne sauvegarde (v1) découvre le jardin vivant avec quelques trouvailles déjà là.
    nextForageAt: num(data.nextForageAt, base.nextForageAt),
    decor: { placed, inventory },
    house: { placed: furniture, inventory: furnitureStock },
    visitors,
    nextVisitorAt: num(data.nextVisitorAt, now),
    letter,
    nextLetterAt: num(data.nextLetterAt, now),
    lettersDone: Math.max(0, Math.floor(num(data.lettersDone, 0))),
    treeShakeAt: num(data.treeShakeAt, 0),
    nextUid: uid,
    companion: parseCompanion(data.companion, now),
    farm: parseFarm(data.farm, now),
    produce: counts(data.produce, isProduceId),
    journal: {
      crops: journalEntries(j.crops, isCropId, now),
      visitors: journalEntries(j.visitors, isVisitorId, now),
      produce: journalEntries(j.produce, isProduceId, now),
      totalHarvests: Math.max(0, num(j.totalHarvests, 0)),
      coinsEarned: Math.max(0, num(j.coinsEarned, 0)),
      daysPlayed: Math.max(1, num(j.daysPlayed, 1)),
      lastDay: typeof j.lastDay === 'string' ? j.lastDay : base.journal.lastDay,
      forageCount: Math.max(0, num(j.forageCount, 0)),
      lettersDelivered: Math.max(0, num(j.lettersDelivered, 0)),
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
  private produceKnown: Partial<Record<BuildingId, boolean>> = {};
  private letterWasReady = false;

  constructor(
    state: GameState,
    private storage: Storage | null = null,
    private clock: () => number = () => Date.now(),
    private random: () => number = Math.random,
  ) {
    this.state = state;
    this.ripeKnown = state.plots.map((t) => !!t.plant && isRipe(t.plant));
    this.rememberProduce();
    this.letterWasReady = this.canDeliver();
  }

  private rememberProduce(): void {
    for (const id of BUILDING_IDS) this.produceKnown[id] = isProduceReady(id, this.state.farm[id]);
  }

  /** Charge la partie (ou en crée une) et calcule ce qui s'est passé pendant l'absence. */
  static load(
    storage: Storage | null,
    clock: () => number = () => Date.now(),
    random: () => number = Math.random,
  ): { game: Game; report: LoadReport } {
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
    const game = new Game(state, storage, clock, random);
    game.advanceAll(now, false);

    const season = getSeason(new Date(now));
    let seasonChanged: LoadReport['seasonChanged'] = null;
    if (season !== state.lastSeason) {
      seasonChanged = { from: state.lastSeason, to: season };
      state.lastSeason = season;
    }
    game.touchDay(now, false);
    game.updateWorld(now, true, false);

    const readyCount = state.plots.filter((t) => t.plant && isRipe(t.plant)).length;
    game.ripeKnown = state.plots.map((t) => !!t.plant && isRipe(t.plant));
    game.rememberProduce();
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

  get night(): boolean {
    return isNight(new Date(this.now()));
  }

  onChange(fn: (s: GameState) => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  onEvent(fn: (e: GameEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  /** Appelé chaque seconde : pousse, saison, et vie du jardin (trouvailles, visiteurs, courrier). */
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
    if (this.updateWorld(now, false, true)) this.commit();
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
    for (const id of BUILDING_IDS) {
      advanceBuilding(this.state.farm[id], now);
      const ready = isProduceReady(id, this.state.farm[id]);
      if (ready && !this.produceKnown[id] && emit) this.emitEvent({ type: 'produceReady', building: id });
      this.produceKnown[id] = ready;
    }
  }

  private touchDay(now: number, emit: boolean): void {
    const key = dayKey(new Date(now));
    if (key !== this.state.journal.lastDay) {
      this.state.journal.lastDay = key;
      this.state.journal.daysPlayed += 1;
      if (emit) this.emitEvent({ type: 'newDay' });
    }
  }

  // --- Le jardin vivant -------------------------------------------------------

  private between([min, max]: [number, number]): number {
    return min + this.random() * (max - min);
  }

  private pickWeighted<T>(items: Array<[T, number]>): T | null {
    const total = items.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return null;
    let r = this.random() * total;
    for (const [item, w] of items) {
      r -= w;
      if (r < 0) return item;
    }
    return items[items.length - 1][0];
  }

  /** Une case d'herbe libre : pas de déco, pas de trouvaille, pas de visiteur. */
  isTileFree(col: number, row: number, ignoreVisitors = false): boolean {
    if (isStaticBlocked(col, row)) return false;
    const s = this.state;
    if (s.decor.placed.some((d) => d.col === col && d.row === row)) return false;
    if (s.forage.some((f) => f.col === col && f.row === row)) return false;
    if (!ignoreVisitors && s.visitors.some((v) => v.col === col && v.row === row)) return false;
    return true;
  }

  private randomFreeTile(candidates: Array<[number, number]> = gardenTiles()): [number, number] | null {
    const free = candidates.filter(([c, r]) => this.isTileFree(c, r));
    return free.length ? free[Math.floor(this.random() * free.length) % free.length] : null;
  }

  private spawnForage(id?: MaterialId, candidates?: Array<[number, number]>): ForageItem | null {
    const material = id ?? this.pickWeighted(forageTable(this.season));
    const tile = this.randomFreeTile(candidates);
    if (!material || !tile) return null;
    const item: ForageItem = { uid: this.state.nextUid++, id: material, col: tile[0], row: tile[1] };
    this.state.forage.push(item);
    return item;
  }

  /** Où un visiteur pourrait se poser maintenant (null s'il n'a pas de place). */
  private visitorSpot(def: VisitorDef): Omit<VisitorInstance, 'uid' | 'id' | 'arrivedAt' | 'leavesAt'> | null {
    const s = this.state;
    const spot = def.spot;
    if (spot.kind === 'tree') {
      const p = spot.perch ? TREE_SPOTS.perch : TREE_SPOTS.base;
      const key = spot.perch ? -2 : -3; // cases virtuelles de l'arbre
      if (s.visitors.some((v) => v.col === key)) return null;
      return { x: p.x, y: p.y, col: key, row: key, perch: spot.perch };
    }
    if (spot.kind === 'grass') {
      const tile = this.randomFreeTile();
      if (!tile) return null;
      const foot = tileFoot(tile[0], tile[1]);
      return { x: foot.x + Math.round(this.random() * 4 - 2), y: foot.y - 1, col: tile[0], row: tile[1], perch: false };
    }
    const decos = s.decor.placed.filter((d) => d.id === spot.deco);
    if (spot.perch) {
      const free = decos.filter((d) => !s.visitors.some((v) => v.perch && v.col === d.col && v.row === d.row));
      if (!free.length) return null;
      const d = free[Math.floor(this.random() * free.length) % free.length];
      const foot = tileFoot(d.col, d.row);
      return { x: foot.x, y: foot.y - 22, col: d.col, row: d.row, perch: true };
    }
    const around: Array<[number, number]> = [];
    for (const d of decos) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dc || dr) around.push([d.col + dc, d.row + dr]);
    }
    const tile = this.randomFreeTile(around);
    if (!tile) return null;
    const foot = tileFoot(tile[0], tile[1]);
    return { x: foot.x, y: foot.y - 1, col: tile[0], row: tile[1], perch: false };
  }

  private spawnVisitor(now: number): VisitorInstance | null {
    const s = this.state;
    const season = this.season;
    const night = isNight(new Date(now));
    const candidates: Array<[VisitorDef, number]> = VISITOR_IDS
      .map((id) => VISITORS[id])
      .filter((d) => d.seasons.includes(season) && visitorAwake(d, night) && !s.visitors.some((v) => v.id === d.id))
      // Les visiteurs jamais vus viennent un peu plus souvent : la collection avance.
      .map((d) => [d, d.weight * (s.journal.visitors[d.id] ? 1 : 1.6)]);
    while (candidates.length) {
      const def = this.pickWeighted(candidates);
      if (!def) return null;
      const spot = this.visitorSpot(def);
      if (spot) {
        const v: VisitorInstance = { uid: s.nextUid++, id: def.id, arrivedAt: now, leavesAt: now + this.between(VISITOR_STAY), ...spot };
        s.visitors.push(v);
        return v;
      }
      candidates.splice(candidates.findIndex(([d]) => d === def), 1);
    }
    return null;
  }

  /** Fait vivre le jardin jusqu'à `now`. `catchUp` : retour après une absence. Renvoie true si quelque chose a changé. */
  updateWorld(now: number, catchUp: boolean, emit: boolean): boolean {
    const s = this.state;
    let changed = false;

    // Trouvailles : elles ne disparaissent jamais, il y en a juste un nombre maximum.
    while (now >= s.nextForageAt && s.forage.length < FORAGE_MAX) {
      if (!this.spawnForage()) break;
      s.nextForageAt += this.between(FORAGE_INTERVAL);
      changed = true;
    }
    if (now >= s.nextForageAt) s.nextForageAt = now + this.between(FORAGE_INTERVAL);

    // Visiteurs : ils repartent tranquillement ; d'autres arrivent.
    const night = isNight(new Date(now));
    const season = this.season;
    const before = s.visitors.length;
    s.visitors = s.visitors.filter((v) => {
      const def = VISITORS[v.id];
      return v.leavesAt > now && def.seasons.includes(season) && visitorAwake(def, night);
    });
    if (s.visitors.length !== before) changed = true;
    if (now >= s.nextVisitorAt) {
      const arrivals = catchUp ? 2 : 1;
      for (let i = 0; i < arrivals && s.visitors.length < VISITOR_MAX; i++) if (this.spawnVisitor(now)) changed = true;
      s.nextVisitorAt = now + this.between(VISITOR_INTERVAL);
    }

    // Courrier
    if (!s.letter && now >= s.nextLetterAt) {
      const produce = BUILDING_IDS.filter((id) => s.farm[id].renovated).map((id) => BUILDINGS[id].produce);
      s.letter = makeLetter(s.lettersDone, this.season, this.random, now, produce);
      changed = true;
      if (emit) this.emitEvent({ type: 'letterArrived' });
    }
    return changed;
  }

  // --- Potager ----------------------------------------------------------------

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
    const first = this.addJournal(this.state.journal.crops, crop);
    this.state.journal.totalHarvests += 1;
    this.commit();
    return { ok: true, crop, first };
  }

  private addJournal<K extends string>(entries: Partial<Record<K, JournalEntry>>, key: K): boolean {
    const entry = entries[key];
    entries[key] = { count: (entry?.count ?? 0) + 1, firstAt: entry?.firstAt ?? this.now() };
    return !entry;
  }

  // --- Boutique ---------------------------------------------------------------

  buySeeds(cropId: CropId, qty: number): ActionResult<{ cost: number }> {
    if (CROPS[cropId].season !== this.season) return { ok: false, reason: 'outOfSeason' };
    const cost = CROPS[cropId].seedPrice * qty;
    if (this.state.coins < cost) return { ok: false, reason: 'notEnoughCoins' };
    this.state.coins -= cost;
    this.addSeeds(cropId, qty);
    this.commit();
    return { ok: true, cost };
  }

  private addSeeds(cropId: CropId, qty: number): void {
    this.state.seeds[cropId] = (this.state.seeds[cropId] ?? 0) + qty;
    if (!this.state.selectedSeed || !this.state.seeds[this.state.selectedSeed]) this.state.selectedSeed = cropId;
  }

  sell(cropId: CropId, qty: number): ActionResult<{ earned: number }> {
    const have = this.state.basket[cropId] ?? 0;
    const n = Math.min(have, qty);
    if (n <= 0) return { ok: false, reason: 'nothingToSell' };
    const earned = CROPS[cropId].sellPrice * n;
    this.state.basket[cropId] = have - n;
    if (this.state.basket[cropId] === 0) delete this.state.basket[cropId];
    this.earn(earned);
    this.commit();
    return { ok: true, earned };
  }

  sellAll(): ActionResult<{ earned: number }> {
    let earned = 0;
    for (const id of CROP_IDS) {
      const n = this.state.basket[id] ?? 0;
      if (n > 0) earned += CROPS[id].sellPrice * n;
    }
    for (const id of PRODUCE_IDS) {
      const n = this.state.produce[id] ?? 0;
      if (n > 0) earned += PRODUCE[id].sellPrice * n;
    }
    if (earned === 0) return { ok: false, reason: 'nothingToSell' };
    this.state.basket = {};
    this.state.produce = {};
    this.earn(earned);
    this.commit();
    return { ok: true, earned };
  }

  sellProduce(id: ProduceId, qty: number): ActionResult<{ earned: number }> {
    const have = this.state.produce[id] ?? 0;
    const n = Math.min(have, qty);
    if (n <= 0) return { ok: false, reason: 'nothingToSell' };
    const earned = PRODUCE[id].sellPrice * n;
    this.state.produce[id] = have - n;
    if (this.state.produce[id] === 0) delete this.state.produce[id];
    this.earn(earned);
    this.commit();
    return { ok: true, earned };
  }

  private earn(coins: number): void {
    this.state.coins += coins;
    this.state.journal.coinsEarned += coins;
  }

  selectSeed(cropId: CropId): void {
    this.state.selectedSeed = cropId;
    this.commit();
  }

  // --- Cueillette, arbre, visiteurs -------------------------------------------

  private addMaterial(id: MaterialId, n: number): void {
    this.state.materials[id] = (this.state.materials[id] ?? 0) + n;
  }

  collect(uid: number): ActionResult<{ material: MaterialId }> {
    const i = this.state.forage.findIndex((f) => f.uid === uid);
    if (i < 0) return { ok: false, reason: 'notFound' };
    const [item] = this.state.forage.splice(i, 1);
    this.addMaterial(item.id, 1);
    this.state.journal.forageCount += 1;
    this.commit();
    return { ok: true, material: item.id };
  }

  /** Secouer l'arbre : des feuilles tombent toujours, une brindille de temps en temps. */
  shakeTree(): { dropped: ForageItem | null } {
    const now = this.now();
    if (now < this.state.treeShakeAt) return { dropped: null };
    const id: MaterialId = this.season === 'winter' && this.random() < 0.5 ? 'pinecone' : 'twig';
    const dropped = this.spawnForage(id, [...TREE_DROP_TILES]);
    if (!dropped) return { dropped: null };
    this.state.treeShakeAt = now + TREE_SHAKE_COOLDOWN;
    this.commit();
    return { dropped };
  }

  greet(uid: number): ActionResult<{ visitor: VisitorId; first: boolean; gift: GiftResult | null }> {
    const i = this.state.visitors.findIndex((v) => v.uid === uid);
    if (i < 0) return { ok: false, reason: 'notFound' };
    const [v] = this.state.visitors.splice(i, 1);
    const first = this.addJournal(this.state.journal.visitors, v.id);
    let gift: GiftResult | null = null;
    if (first || this.random() < VISITOR_GIFT_CHANCE) {
      const g = VISITORS[v.id].gift;
      gift = {};
      if (g.coins) {
        gift.coins = Math.round(this.between(g.coins));
        this.earn(gift.coins);
      }
      if (g.material) {
        gift.material = g.material;
        this.addMaterial(g.material[0], g.material[1]);
      }
      if (g.seeds) {
        const quick = cropsForSeason(this.season).sort((a, b) => a.growTime - b.growTime)[0];
        gift.seeds = [quick.id, g.seeds];
        this.addSeeds(quick.id, g.seeds);
      }
    }
    // Le prochain visiteur ne tarde pas trop après un salut.
    this.state.nextVisitorAt = Math.min(this.state.nextVisitorAt, this.now() + VISITOR_INTERVAL[0]);
    this.commit();
    return { ok: true, visitor: v.id, first, gift };
  }

  // --- Atelier et déco ----------------------------------------------------------

  /** Ce qui manque pour une recette (vide = on peut fabriquer). */
  missingFor(recipe: Recipe): Array<{ kind: 'material' | 'crop' | 'produce' | 'coins' | 'season'; id?: string; missing: number }> {
    const s = this.state;
    const out: Array<{ kind: 'material' | 'crop' | 'produce' | 'coins' | 'season'; id?: string; missing: number }> = [];
    for (const [id, n] of Object.entries(recipe.materials ?? {}) as Array<[MaterialId, number]>) {
      const have = s.materials[id] ?? 0;
      if (have < n) out.push({ kind: 'material', id, missing: n - have });
    }
    for (const [id, n] of Object.entries(recipe.crops ?? {}) as Array<[CropId, number]>) {
      const have = s.basket[id] ?? 0;
      if (have < n) out.push({ kind: 'crop', id, missing: n - have });
    }
    for (const [id, n] of Object.entries(recipe.produce ?? {}) as Array<[ProduceId, number]>) {
      const have = s.produce[id] ?? 0;
      if (have < n) out.push({ kind: 'produce', id, missing: n - have });
    }
    if ((recipe.coins ?? 0) > s.coins) out.push({ kind: 'coins', missing: (recipe.coins ?? 0) - s.coins });
    if (recipe.season && recipe.season !== this.season) out.push({ kind: 'season', id: recipe.season, missing: 1 });
    return out;
  }

  /** La recette d'une déco ou d'un meuble. */
  recipeOf(id: CraftId): Recipe {
    return isFurnitureId(id) ? FURNITURE[id].recipe : DECOS[id].recipe;
  }

  /** Le stock (fabriqué, pas encore posé) d'une déco ou d'un meuble. */
  stockOf(id: CraftId): number {
    return (isFurnitureId(id) ? this.state.house.inventory[id] : this.state.decor.inventory[id]) ?? 0;
  }

  private addStock(id: CraftId, n: number): void {
    const inv: Partial<Record<CraftId, number>> = isFurnitureId(id) ? this.state.house.inventory : this.state.decor.inventory;
    inv[id] = (inv[id] ?? 0) + n;
    if (!inv[id]) delete inv[id];
  }

  canCraft(id: CraftId): boolean {
    return this.missingFor(this.recipeOf(id)).length === 0;
  }

  craft<T extends CraftId>(id: T): ActionResult<{ item: T }> {
    const recipe = this.recipeOf(id);
    const missing = this.missingFor(recipe);
    if (missing.length) return { ok: false, reason: missing[0].kind === 'coins' ? 'notEnoughCoins' : missing[0].kind === 'season' ? 'outOfSeason' : 'missingItems' };
    this.pay(recipe);
    this.addStock(id, 1);
    this.commit();
    return { ok: true, item: id };
  }

  /** Ce que rend le démontage : tous les matériaux de cueillette de la recette (ni pièces, ni légumes, ni produits). */
  salvageOf(id: CraftId): Partial<Record<MaterialId, number>> {
    return { ...(this.recipeOf(id).materials ?? {}) };
  }

  /** Démonte une déco ou un meuble pas encore posé : on récupère ses matériaux. */
  dismantle(id: CraftId): ActionResult<{ materials: Partial<Record<MaterialId, number>> }> {
    if (this.stockOf(id) <= 0) return { ok: false, reason: 'notFound' };
    this.addStock(id, -1);
    const materials = this.salvageOf(id);
    for (const [m, n] of Object.entries(materials) as Array<[MaterialId, number]>) this.addMaterial(m, n);
    this.commit();
    return { ok: true, materials };
  }

  private pay(recipe: Recipe): void {
    const s = this.state;
    for (const [m, n] of Object.entries(recipe.materials ?? {}) as Array<[MaterialId, number]>) {
      s.materials[m] = (s.materials[m] ?? 0) - n;
      if (!s.materials[m]) delete s.materials[m];
    }
    for (const [c, n] of Object.entries(recipe.crops ?? {}) as Array<[CropId, number]>) {
      s.basket[c] = (s.basket[c] ?? 0) - n;
      if (!s.basket[c]) delete s.basket[c];
    }
    for (const [p, n] of Object.entries(recipe.produce ?? {}) as Array<[ProduceId, number]>) {
      s.produce[p] = (s.produce[p] ?? 0) - n;
      if (!s.produce[p]) delete s.produce[p];
    }
    s.coins -= recipe.coins ?? 0;
  }

  /** Prend une déco de l'inventaire « en main » pour la poser. */
  takeDeco(id: DecoId): boolean {
    const inv = this.state.decor.inventory;
    if (!inv[id]) return false;
    inv[id]! -= 1;
    if (!inv[id]) delete inv[id];
    this.commit();
    return true;
  }

  returnDeco(id: DecoId): void {
    const inv = this.state.decor.inventory;
    inv[id] = (inv[id] ?? 0) + 1;
    this.commit();
  }

  canPlace(col: number, row: number): boolean {
    return this.isTileFree(col, row, true);
  }

  placeDeco(id: DecoId, col: number, row: number): ActionResult<{ uid: number }> {
    if (!this.canPlace(col, row)) return { ok: false, reason: 'blocked' };
    const uid = this.state.nextUid++;
    this.state.decor.placed.push({ uid, id, col, row });
    this.commit();
    return { ok: true, uid };
  }

  decoAt(col: number, row: number): PlacedDeco | undefined {
    return this.state.decor.placed.find((d) => d.col === col && d.row === row);
  }

  /** Retire une déco posée (elle passe « en main »). */
  pickUpDeco(col: number, row: number): DecoId | null {
    const placed = this.state.decor.placed;
    const i = placed.findIndex((d) => d.col === col && d.row === row);
    if (i < 0) return null;
    const [d] = placed.splice(i, 1);
    // Un oiseau perché sur ce nichoir s'envole.
    this.state.visitors = this.state.visitors.filter((v) => !(v.perch && v.col === col && v.row === row));
    this.commit();
    return d.id;
  }

  // --- La maison ---------------------------------------------------------------

  furnitureAt(col: number, row: number): PlacedFurniture | undefined {
    return this.state.house.placed.find((d) => d.col === col && d.row === row);
  }

  canPlaceFurniture(id: FurnitureId, col: number, row: number): boolean {
    return roomSpotFits(FURNITURE[id].spot, col, row) && !this.furnitureAt(col, row);
  }

  /** Prend un meuble du stock « en main » pour le poser. */
  takeFurniture(id: FurnitureId): boolean {
    if (!this.state.house.inventory[id]) return false;
    this.addStock(id, -1);
    this.commit();
    return true;
  }

  returnFurniture(id: FurnitureId): void {
    this.addStock(id, 1);
    this.commit();
  }

  placeFurniture(id: FurnitureId, col: number, row: number): ActionResult<{ uid: number }> {
    if (!this.canPlaceFurniture(id, col, row)) return { ok: false, reason: 'blocked' };
    const uid = this.state.nextUid++;
    this.state.house.placed.push({ uid, id, col, row });
    this.commit();
    return { ok: true, uid };
  }

  /** Retire un meuble posé (il passe « en main »). */
  pickUpFurniture(col: number, row: number): FurnitureId | null {
    const placed = this.state.house.placed;
    const i = placed.findIndex((d) => d.col === col && d.row === row);
    if (i < 0) return null;
    const [d] = placed.splice(i, 1);
    this.commit();
    return d.id;
  }

  // --- Courrier ---------------------------------------------------------------

  have(w: Want): number {
    if (w.kind === 'crop') return this.state.basket[w.id] ?? 0;
    if (w.kind === 'produce') return this.state.produce[w.id] ?? 0;
    return this.state.materials[w.id] ?? 0;
  }

  canDeliver(): boolean {
    return !!this.state.letter && this.state.letter.wants.every((w) => this.have(w) >= w.n);
  }

  deliverLetter(): ActionResult<{ letter: Letter }> {
    const s = this.state;
    const letter = s.letter;
    if (!letter) return { ok: false, reason: 'noLetter' };
    if (!this.canDeliver()) return { ok: false, reason: 'missingItems' };
    for (const w of letter.wants) {
      const bag: Partial<Record<string, number>> = w.kind === 'crop' ? s.basket : w.kind === 'produce' ? s.produce : s.materials;
      bag[w.id] = (bag[w.id] ?? 0) - w.n;
      if (!bag[w.id]) delete bag[w.id];
    }
    this.earn(letter.reward.coins);
    if (letter.reward.deco) s.decor.inventory[letter.reward.deco] = (s.decor.inventory[letter.reward.deco] ?? 0) + 1;
    for (const [m, n] of Object.entries(letter.reward.materials ?? {}) as Array<[MaterialId, number]>) this.addMaterial(m, n);
    s.letter = null;
    s.lettersDone += 1;
    s.journal.lettersDelivered += 1;
    s.nextLetterAt = this.now() + this.between(LETTER_DELAY);
    this.commit();
    return { ok: true, letter };
  }

  /** Décliner poliment : pas de pénalité, une autre lettre arrive un peu plus tard. */
  skipLetter(): void {
    const s = this.state;
    if (!s.letter) return;
    s.letter = null;
    s.lettersDone += 1;
    s.nextLetterAt = this.now() + LETTER_SKIP_DELAY;
    this.commit();
  }

  markLetterRead(): void {
    const letter = this.state.letter;
    if (!letter || letter.read) return;
    letter.read = true;
    this.letterWasReady = this.canDeliver();
    this.commit();
  }

  // --- Ferme -----------------------------------------------------------------

  /** Rénover un bâtiment : le premier animal s'installe aussitôt. */
  renovate(id: BuildingId): ActionResult {
    const b = this.state.farm[id];
    if (b.renovated) return { ok: false, reason: 'alreadyRenovated' };
    const recipe = BUILDINGS[id].renovation;
    const missing = this.missingFor(recipe);
    if (missing.length) return { ok: false, reason: missing.some((m) => m.kind === 'coins') ? 'notEnoughCoins' : 'missingItems' };
    this.pay(recipe);
    const now = this.now();
    this.state.farm[id] = { renovated: true, animals: 1, progress: 0, updatedAt: now, fedUntil: 0 };
    this.commit();
    return { ok: true };
  }

  adopt(id: BuildingId): ActionResult<{ animals: number }> {
    const b = this.state.farm[id];
    const def = BUILDINGS[id];
    if (!b.renovated) return { ok: false, reason: 'notRenovated' };
    if (b.animals >= def.capacity) return { ok: false, reason: 'full' };
    if (this.state.coins < def.animalPrice) return { ok: false, reason: 'notEnoughCoins' };
    advanceBuilding(b, this.now());
    this.state.coins -= def.animalPrice;
    b.animals += 1;
    this.commit();
    return { ok: true, animals: b.animals };
  }

  /** Ramasser les produits qui attendent (un par animal). */
  collectProduce(id: BuildingId): ActionResult<{ produce: ProduceId; n: number; first: boolean }> {
    const b = this.state.farm[id];
    if (!b.renovated) return { ok: false, reason: 'notRenovated' };
    advanceBuilding(b, this.now());
    if (!isProduceReady(id, b)) return { ok: false, reason: 'notRipe' };
    const produce = BUILDINGS[id].produce;
    const n = b.animals;
    b.progress = 0;
    this.produceKnown[id] = false;
    this.state.produce[produce] = (this.state.produce[produce] ?? 0) + n;
    const journal = this.state.journal.produce;
    const first = !journal[produce];
    journal[produce] = { count: (journal[produce]?.count ?? 0) + n, firstAt: journal[produce]?.firstAt ?? this.now() };
    this.commit();
    return { ok: true, produce, n, first };
  }

  /** Ce que les animaux mangeraient maintenant : le légume le moins cher du panier. */
  farmFood(): CropId | null {
    const owned = CROP_IDS.filter((c) => (this.state.basket[c] ?? 0) > 0);
    owned.sort((a, b) => CROPS[a].sellPrice - CROPS[b].sellPrice);
    return owned[0] ?? null;
  }

  /** Donner un légume du panier aux animaux d'un bâtiment. */
  feed(id: BuildingId): ActionResult<{ crop: CropId }> {
    const b = this.state.farm[id];
    if (!b.renovated) return { ok: false, reason: 'notRenovated' };
    const now = this.now();
    if (isFed(b, now)) return { ok: false, reason: 'alreadyFed' };
    const crop = this.farmFood();
    if (!crop) return { ok: false, reason: 'nothingToEat' };
    advanceBuilding(b, now);
    this.state.basket[crop]! -= 1;
    if (!this.state.basket[crop]) delete this.state.basket[crop];
    b.fedUntil = now + FED_DURATION;
    this.commit();
    return { ok: true, crop };
  }

  // --- Compagnon --------------------------------------------------------------

  get companionHearts(): number {
    return heartsFor(this.state.companion.friendship);
  }

  /** Un câlin : compte pour l'amitié au plus toutes les 3 min ; le premier du jour compte double. */
  petCompanion(): { counted: boolean; dailyBonus: boolean; hearts: number; unlocked: AccessoryId | null } {
    const c = this.state.companion;
    const now = this.now();
    const heartsBefore = heartsFor(c.friendship);
    const today = dayKey(new Date(now));
    const dailyBonus = c.lastPetDay !== today;
    const counted = dailyBonus || now >= c.lastPetAt + PET_COOLDOWN;
    if (counted) {
      c.friendship += dailyBonus ? DAILY_PET_BONUS : 1;
      c.lastPetAt = now;
      c.lastPetDay = today;
      this.commit();
    }
    const hearts = heartsFor(c.friendship);
    const unlocked = hearts > heartsBefore ? ACCESSORY_IDS[hearts - 1] : null;
    return { counted, dailyBonus: counted && dailyBonus, hearts, unlocked };
  }

  nameCompanion(name: string): string {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
    if (!clean) return this.state.companion.name ?? '';
    this.state.companion.name = clean;
    this.commit();
    return clean;
  }

  setAccessory(id: AccessoryId | null): boolean {
    if (id && this.companionHearts < accessoryHearts(id)) return false;
    this.state.companion.accessory = id;
    this.commit();
    return true;
  }

  /** Le corgi a-t-il envie de creuser ? (le jour, pas trop souvent, pas si l'herbe déborde déjà de trouvailles) */
  canDig(): boolean {
    const now = this.now();
    return !isNight(new Date(now)) && now >= this.state.companion.nextDigAt
      && this.state.forage.length < FORAGE_MAX + DIG_EXTRA_FORAGE;
  }

  /** Le corgi a fini de creuser sur cette case : une trouvaille apparaît. */
  companionDig(col: number, row: number): ForageItem | null {
    if (!this.canDig()) return null;
    const c = this.state.companion;
    if (!this.isTileFree(col, row)) {
      c.nextDigAt = this.now() + 30_000; // il réessaiera un peu plus loin
      return null;
    }
    const id = this.pickWeighted(forageTable(this.season));
    if (!id) return null;
    const item: ForageItem = { uid: this.state.nextUid++, id, col, row };
    this.state.forage.push(item);
    c.nextDigAt = this.now() + this.between(DIG_INTERVAL);
    this.commit();
    return item;
  }

  // --- Divers -----------------------------------------------------------------

  setLang(lang: Lang): void {
    this.state.settings.lang = lang;
    this.commit();
  }

  reset(): void {
    const lang = this.state.settings.lang;
    this.state = createNewGame(this.now());
    this.state.settings.lang = lang;
    this.ripeKnown = this.state.plots.map(() => false);
    this.rememberProduce();
    this.updateWorld(this.now(), true, false);
    this.commit();
  }

  save(): void {
    this.state.updatedAt = this.now();
    safeSet(this.storage, SAVE_KEY, JSON.stringify(this.state));
  }

  private commit(): void {
    this.save();
    for (const fn of this.changeListeners) fn(this.state);
    // Une lettre déjà lue devient faisable : on prévient (une seule fois).
    const ready = this.canDeliver();
    if (ready && !this.letterWasReady && this.state.letter?.read) {
      this.letterWasReady = ready;
      this.emitEvent({ type: 'letterReady' });
    }
    this.letterWasReady = ready;
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
