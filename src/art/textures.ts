// Génère toutes les textures une fois au démarrage, pour Phaser (canvas) et pour l'interface HTML (data URL).

import type Phaser from 'phaser';
import { CROPS, CROP_IDS, type CropId } from '../game/crops';
import { SEASONS } from '../game/seasons';
import * as draw from './draw';
import { ACCESSORY_IDS, type AccessoryId } from '../game/companion';
import {
  ACCESSORY_SPRITES, CHECK_BADGE, CORGI_FRAMES, CORGI_PALETTE, DECO_SPRITES, EXTRA_UI_ICONS, GARDENER_FRAMES,
  GARDENER_PALETTE, GARDENER_TOOLS, HEART, HOLE, MAILBOX_SPRITES, MATERIAL_SPRITES, VISITOR_SPRITES, ZZZ,
  type CorgiFrame, type PixelSprite,
} from './living-sprites';
import { UI_ICONS } from './sprites';
import { ANIMAL_SPRITES, PRODUCE_SPRITES, SIGN_SPRITES, building, paddockFence } from './farm-art';
import { BUILDING_IDS, type BuildingId } from '../game/farm';
import { PADDOCKS } from '../game/world';

function sprite(s: PixelSprite): HTMLCanvasElement {
  const p = new draw.Painter(s.rows[0].length, s.rows.length);
  p.strings(s.rows, s.palette);
  return p.canvas;
}

/** Le corgi, avec ou sans accessoire. Clé : corgi_<accessoire|none>_<pose>. */
function corgi(frame: CorgiFrame, accessory: AccessoryId | null): HTMLCanvasElement {
  const p = new draw.Painter(16, 16);
  p.strings(CORGI_FRAMES[frame], CORGI_PALETTE);
  if (accessory) {
    const a = ACCESSORY_SPRITES[accessory];
    const [x, y] = frame === 'sleep' ? a.anchor.sleep : a.anchor.walk;
    p.strings(a.rows, a.palette, x, y);
  }
  return p.canvas;
}

/** Halo lumineux (lanternes, lucioles) : dégradé doux, affiché en mode additif la nuit. */
function glow(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
  g.addColorStop(0, 'rgba(255, 214, 120, 0.75)');
  g.addColorStop(0.45, 'rgba(255, 190, 90, 0.25)');
  g.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 48, 48);
  return c;
}

/** Petite ombre sous les objets posés dans l'herbe. */
function shadow(): HTMLCanvasElement {
  const p = new draw.Painter(12, 4);
  for (let x = 1; x < 11; x++) for (let y = 0; y < 4; y++) {
    const dx = (x - 5.5) / 5.5, dy = (y - 1.5) / 2;
    if (dx * dx + dy * dy <= 1) p.px(x, y, 'rgba(40, 30, 40, 0.22)');
  }
  return p.canvas;
}

export const GRASS_VARIANTS = 4;
export const WILD_VARIANTS = 3;
export const PATH_VARIANTS = 2;
export const TREE_VARIANTS = 2;

type CanvasMap = Map<string, HTMLCanvasElement>;

let cache: CanvasMap | null = null;
const urlCache = new Map<string, string>();

function buildAll(): CanvasMap {
  const m: CanvasMap = new Map();
  for (const s of SEASONS) {
    for (let v = 0; v < GRASS_VARIANTS; v++) m.set(`grass_${s}_${v}`, draw.grassTile(s, v));
    for (let v = 0; v < TREE_VARIANTS; v++) m.set(`tree_${s}_${v}`, draw.tree(s, v + 1));
    m.set(`bush_${s}`, draw.bush(s));
    m.set(`fence_${s}`, draw.fenceTile(s));
    m.set(`cabin_${s}_day`, draw.cabin(s, false));
    m.set(`cabin_${s}_night`, draw.cabin(s, true));
    for (const id of BUILDING_IDS) {
      for (const ruined of [true, false]) {
        const state = ruined ? 'ruin' : 'ok';
        m.set(`farm_${id}_${s}_${state}`, building(id, s, ruined));
        for (const part of ['back', 'front'] as const) m.set(`fence_${id}_${part}_${s}_${state}`, paddockFence(PADDOCKS[id], part, s, ruined));
      }
    }
  }
  for (const [id, sp] of Object.entries(ANIMAL_SPRITES)) m.set(`animal_${id}`, sprite(sp));
  for (const [id, sp] of Object.entries(PRODUCE_SPRITES)) m.set(`produce_${id}`, sprite(sp));
  for (const [id, sp] of Object.entries(SIGN_SPRITES)) m.set(`sign_${id}`, sprite(sp));
  m.set('soil_dry', draw.soilTile(false));
  m.set('soil_wet', draw.soilTile(true));
  for (let v = 0; v < WILD_VARIANTS; v++) m.set(`wild_${v}`, draw.wildOverlay(v));
  for (let v = 0; v < PATH_VARIANTS; v++) m.set(`path_${v}`, draw.pathTile(v));
  for (const id of CROP_IDS) {
    draw.plantFrames(CROPS[id]).forEach((c, stage) => m.set(`plant_${id}_${stage}`, c));
    m.set(`icon_${id}`, draw.cropIcon(CROPS[id]));
  }
  for (const [name, icon] of Object.entries(UI_ICONS)) {
    const p = new draw.Painter(16, 16);
    p.strings(icon.rows, icon.palette);
    m.set(`ui_${name}`, p.canvas);
  }
  for (const [id, sp] of Object.entries(MATERIAL_SPRITES)) m.set(`mat_${id}`, sprite(sp));
  for (const [id, sp] of Object.entries(DECO_SPRITES)) m.set(`deco_${id}`, sprite(sp));
  for (const [id, sp] of Object.entries(VISITOR_SPRITES)) m.set(`vis_${id}`, sprite(sp));
  for (const [id, sp] of Object.entries(MAILBOX_SPRITES)) m.set(`mailbox_${id}`, sprite(sp));
  for (const [id, sp] of Object.entries(EXTRA_UI_ICONS)) m.set(`ui_${id}`, sprite(sp));
  for (const acc of [null, ...ACCESSORY_IDS]) {
    for (const frame of Object.keys(CORGI_FRAMES) as CorgiFrame[]) m.set(`corgi_${acc ?? 'none'}_${frame}`, corgi(frame, acc));
  }
  for (const [frame, rows] of Object.entries(GARDENER_FRAMES)) m.set(`gardener_${frame}`, sprite({ rows, palette: GARDENER_PALETTE }));
  for (const [id, sp] of Object.entries(GARDENER_TOOLS)) m.set(`tool_${id}`, sprite(sp));
  const ready = new draw.Painter(16, 16);
  ready.strings(EXTRA_UI_ICONS.letter.rows, EXTRA_UI_ICONS.letter.palette);
  ready.strings(CHECK_BADGE.rows, CHECK_BADGE.palette, 10, 0);
  m.set('ui_letter_ready', ready.canvas);
  m.set('fx_zzz', sprite(ZZZ));
  m.set('fx_hole', sprite(HOLE));
  m.set('fx_heart', sprite(HEART));
  m.set('fx_glow', glow());
  m.set('fx_shadow', shadow());
  const puff = new draw.Painter(8, 6);
  puff.strings(['..www...', '.wwWww..', 'wwWWwww.', 'wWWWWwww', '.wwwwww.', '..ww.w..'], { w: '#f4ece0', W: '#ffffff' });
  m.set('fx_puff', puff.canvas);
  m.set('fx_sparkle', draw.sparkle());
  m.set('fx_drop', draw.drop());
  m.set('fx_cursor', draw.cursor());
  return m;
}

export function allCanvases(): CanvasMap {
  cache ??= buildAll();
  return cache;
}

export function registerTextures(scene: Phaser.Scene): void {
  for (const [key, canvas] of allCanvases()) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  }
}

/** Image d'une texture pour l'interface HTML (à afficher avec image-rendering: pixelated). */
export function textureUrl(key: string): string {
  let url = urlCache.get(key);
  if (!url) {
    const canvas = allCanvases().get(key);
    url = canvas ? canvas.toDataURL() : '';
    urlCache.set(key, url);
  }
  return url;
}

export const cropIconUrl = (id: CropId) => textureUrl(`icon_${id}`);
export const uiIconUrl = (name: keyof typeof UI_ICONS | keyof typeof EXTRA_UI_ICONS) => textureUrl(`ui_${name}`);
export const materialIconUrl = (id: string) => textureUrl(`mat_${id}`);
export const decoIconUrl = (id: string) => textureUrl(`deco_${id}`);
export const visitorIconUrl = (id: string) => textureUrl(`vis_${id}`);
export const corgiUrl = (accessory: AccessoryId | null, frame: CorgiFrame = 'walkA') => textureUrl(`corgi_${accessory ?? 'none'}_${frame}`);
export const produceIconUrl = (id: string) => textureUrl(`produce_${id}`);
export const animalIconUrl = (id: string) => textureUrl(`animal_${id}`);
export const buildingUrl = (id: BuildingId, season: string, renovated: boolean) => textureUrl(`farm_${id}_${season}_${renovated ? 'ok' : 'ruin'}`);
