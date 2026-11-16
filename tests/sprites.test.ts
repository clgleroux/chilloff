import { describe, expect, it } from 'vitest';
import { CROP_ICONS, ICON_SIZE, PLANT_FRAMES, PLANT_H, PLANT_W, SEED_FRAME, SPROUT_FRAME, UI_ICONS } from '../src/art/sprites';

const PLANT_CHARS = new Set('.klgGfFRaAwsSmMy');

function checkGrid(name: string, rows: string[], w: number, h: number, chars?: Set<string>) {
  expect(rows, `${name} : nombre de lignes`).toHaveLength(h);
  rows.forEach((r, i) => {
    expect(r.length, `${name} ligne ${i} : « ${r} »`).toBe(w);
    if (chars) for (const c of r) expect(chars.has(c), `${name} ligne ${i} : caractère « ${c} »`).toBe(true);
  });
}

describe('pixel art', () => {
  it('les plantes font 16×24 et n’utilisent que des couleurs connues', () => {
    checkGrid('graine', SEED_FRAME, PLANT_W, PLANT_H, PLANT_CHARS);
    checkGrid('pousse', SPROUT_FRAME, PLANT_W, PLANT_H, PLANT_CHARS);
    for (const [shape, f] of Object.entries(PLANT_FRAMES)) {
      checkGrid(`${shape}/croissance`, f.grow, PLANT_W, PLANT_H, PLANT_CHARS);
      checkGrid(`${shape}/mûre`, f.ripe, PLANT_W, PLANT_H, PLANT_CHARS);
    }
  });

  it('les icônes font 16×16', () => {
    for (const [shape, rows] of Object.entries(CROP_ICONS)) checkGrid(`icône ${shape}`, rows, ICON_SIZE, ICON_SIZE, PLANT_CHARS);
    for (const [name, icon] of Object.entries(UI_ICONS)) {
      checkGrid(`ui ${name}`, icon.rows, ICON_SIZE, ICON_SIZE, new Set(['.', ...Object.keys(icon.palette)]));
    }
  });
});

import { DECOS } from '../src/game/decor';
import { DECO_SPRITES, EXTRA_UI_ICONS, HEART, MAILBOX_SPRITES, MATERIAL_SPRITES, VISITOR_SPRITES, type PixelSprite } from '../src/art/living-sprites';

function checkSprite(name: string, s: PixelSprite, w: number, h: number) {
  checkGrid(name, s.rows, w, h, new Set(['.', ...Object.keys(s.palette)]));
}

describe('pixel art du jardin vivant', () => {
  it('matériaux, visiteurs et icônes font 16×16', () => {
    for (const [k, s] of Object.entries(MATERIAL_SPRITES)) checkSprite(`matériau ${k}`, s, 16, 16);
    for (const [k, s] of Object.entries(VISITOR_SPRITES)) checkSprite(`visiteur ${k}`, s, 16, 16);
    for (const [k, s] of Object.entries(EXTRA_UI_ICONS)) checkSprite(`icône ${k}`, s, 16, 16);
    checkSprite('cœur', HEART, 7, 6);
  });

  it('les décos font 16×16 ou 16×24 (hautes), la boîte aux lettres 16×24', () => {
    for (const [k, s] of Object.entries(DECO_SPRITES)) checkSprite(`déco ${k}`, s, 16, DECOS[k as keyof typeof DECOS].tall ? 24 : 16);
    for (const [k, s] of Object.entries(MAILBOX_SPRITES)) checkSprite(`boîte ${k}`, s, 16, 24);
  });
});
