// Génère toutes les textures une fois au démarrage, pour Phaser (canvas) et pour l'interface HTML (data URL).

import type Phaser from 'phaser';
import { CROPS, CROP_IDS, type CropId } from '../game/crops';
import { SEASONS } from '../game/seasons';
import * as draw from './draw';
import { UI_ICONS } from './sprites';

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
  }
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
export const uiIconUrl = (name: keyof typeof UI_ICONS) => textureUrl(`ui_${name}`);
