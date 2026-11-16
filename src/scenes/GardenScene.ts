// La scène du jardin : décor, potager, interactions au toucher/clic, petits effets.

import Phaser from 'phaser';
import { BACKDROP, rng } from '../art/draw';
import { GRASS_VARIANTS, PATH_VARIANTS, TREE_VARIANTS, WILD_VARIANTS, registerTextures } from '../art/textures';
import { PLOT_COLS, PLOT_ORIGIN, PLOT_ROWS, TILE, WORLD_COLS, WORLD_ROWS } from '../game/config';
import { growthStage, isRipe, isWet, timeUntilRipe } from '../game/growth';
import type { Season } from '../game/seasons';
import type { Game } from '../game/state';
import { cropName, formatDuration, t } from '../i18n';

export interface SceneHooks {
  toast(message: string): void;
  confirmTill(cost: number, onConfirm: () => void): void;
  openShop(tab: 'buy' | 'sell'): void;
}

const WORLD_W = WORLD_COLS * TILE;
const WORLD_H = WORLD_ROWS * TILE;
/** Le décor déborde du monde jouable pour remplir les grands écrans. */
const MARGIN_COLS = 14;
const MARGIN_ROWS = 10;

const DEPTH_GROUND = 0;
const DEPTH_SOIL = 1;
const DEPTH_OBJECTS = 10; // + y du pied de l'objet
const DEPTH_FX = 5000;
const DEPTH_NIGHT = 6000;

interface PlotView {
  soil: Phaser.GameObjects.Image;
  wild: Phaser.GameObjects.Image;
  plant: Phaser.GameObjects.Image;
  sparkle: Phaser.GameObjects.Image;
  lastKey: string;
}

interface SeasonalImage {
  img: Phaser.GameObjects.Image;
  key: (s: Season) => string;
}

export class GardenScene extends Phaser.Scene {
  private views: PlotView[] = [];
  private seasonal: SeasonalImage[] = [];
  private cabinImg!: Phaser.GameObjects.Image;
  private cursorImg!: Phaser.GameObjects.Image;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private season!: Season;
  private night = false;
  private wateredHintShown = false;

  constructor(private garden: Game, private hooks: SceneHooks) {
    super('garden');
  }

  create(): void {
    registerTextures(this);
    this.season = this.garden.season;

    this.buildGround();
    this.buildDecor();
    this.buildPlot();

    this.cursorImg = this.add.image(0, 0, 'fx_cursor').setOrigin(0, 0).setDepth(DEPTH_FX).setVisible(false);
    this.nightOverlay = this.add
      .rectangle(-MARGIN_COLS * TILE, -MARGIN_ROWS * TILE, WORLD_W + 2 * MARGIN_COLS * TILE, WORLD_H + 2 * MARGIN_ROWS * TILE, 0x1a1a4a, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_NIGHT);

    this.applySeason(this.season);
    this.updateTimeOfDay();
    this.layout();
    this.refresh();

    this.scale.on('resize', () => this.layout());
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('gameout', () => this.cursorImg.setVisible(false));

    this.garden.onChange(() => this.refresh());
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refresh() });
    this.time.addEvent({ delay: 30_000, loop: true, callback: () => this.updateTimeOfDay() });
  }

  // --- Construction du décor ------------------------------------------------

  private buildGround(): void {
    const r = rng(42);
    for (let row = -MARGIN_ROWS; row < WORLD_ROWS + MARGIN_ROWS; row++) {
      for (let col = -MARGIN_COLS; col < WORLD_COLS + MARGIN_COLS; col++) {
        const v = r() < 0.12 ? 3 : Math.floor(r() * (GRASS_VARIANTS - 1));
        const img = this.add.image(col * TILE, row * TILE, `grass_${this.season}_${v}`).setOrigin(0, 0).setDepth(DEPTH_GROUND);
        this.seasonal.push({ img, key: (s) => `grass_${s}_${v}` });
      }
    }
    // Chemin devant la cabane, qui longe le haut du potager.
    for (let col = 2; col <= PLOT_ORIGIN.col + PLOT_COLS; col++) {
      this.add.image(col * TILE, 4 * TILE, `path_${col % PATH_VARIANTS}`).setOrigin(0, 0).setDepth(DEPTH_GROUND + 0.5);
    }
  }

  private buildDecor(): void {
    // Cabane en haut à gauche : sa porte donne sur le chemin.
    this.cabinImg = this.add.image(TILE, 4 * TILE, `cabin_${this.season}_day`).setOrigin(0, 1);
    this.cabinImg.setDepth(DEPTH_OBJECTS + 4 * TILE);

    // Arbres et buissons du jardin.
    this.addTree(10 * TILE, 4 * TILE - 2, 0);
    this.addBush(0, 5 * TILE);
    this.addBush(11 * TILE, 5 * TILE);
    this.addBush(0, 11 * TILE);
    this.addBush(11 * TILE, 11 * TILE);

    // Clôture en bas du jardin.
    for (let col = 0; col < WORLD_COLS; col++) {
      const img = this.add.image(col * TILE, 12 * TILE, `fence_${this.season}`).setOrigin(0, 0);
      img.setDepth(DEPTH_OBJECTS + 13 * TILE);
      this.seasonal.push({ img, key: (s) => `fence_${s}` });
    }

    // Une rangée d'arbres en haut et en bas encadre le jardin (visible sur les écrans en hauteur)…
    const r = rng(7);
    for (let x = -56; x <= WORLD_W + 56; x += 22 + Math.floor(r() * 8)) {
      this.addTree(x, -4 + Math.floor(r() * 10), Math.floor(r() * TREE_VARIANTS));
      this.addTree(x + 11, WORLD_H + 34 + Math.floor(r() * 10), Math.floor(r() * TREE_VARIANTS));
    }
    // … et une forêt douce tout autour, pour les grands écrans.
    for (let row = -MARGIN_ROWS + 1; row < WORLD_ROWS + MARGIN_ROWS; row += 2) {
      for (let col = -MARGIN_COLS; col < WORLD_COLS + MARGIN_COLS; col += 2) {
        const inside = col >= -2 && col <= WORLD_COLS + 1 && row >= -4 && row <= WORLD_ROWS + 5;
        if (inside || r() > 0.6) continue;
        const x = col * TILE + Math.floor(r() * 12), y = row * TILE + Math.floor(r() * 12);
        if (r() < 0.75) this.addTree(x, y, Math.floor(r() * TREE_VARIANTS));
        else this.addBush(x, y - TILE);
      }
    }
  }

  private addTree(x: number, footY: number, variant: number): void {
    const img = this.add.image(x, footY, `tree_${this.season}_${variant}`).setOrigin(0.5, 1);
    img.setDepth(DEPTH_OBJECTS + footY);
    this.seasonal.push({ img, key: (s) => `tree_${s}_${variant}` });
  }

  private addBush(x: number, y: number): void {
    const img = this.add.image(x, y, `bush_${this.season}`).setOrigin(0, 0);
    img.setDepth(DEPTH_OBJECTS + y + TILE);
    this.seasonal.push({ img, key: (s) => `bush_${s}` });
  }

  private buildPlot(): void {
    for (let i = 0; i < PLOT_COLS * PLOT_ROWS; i++) {
      const col = i % PLOT_COLS, row = Math.floor(i / PLOT_COLS);
      const x = (PLOT_ORIGIN.col + col) * TILE, y = (PLOT_ORIGIN.row + row) * TILE;
      const soil = this.add.image(x, y, 'soil_dry').setOrigin(0, 0).setDepth(DEPTH_SOIL);
      const wild = this.add.image(x, y, `wild_${(col * 7 + row * 3) % WILD_VARIANTS}`).setOrigin(0, 0).setDepth(DEPTH_SOIL);
      // Les plantes font 16×24 : le pied est en bas de la case, le haut déborde sur la case du dessus.
      const plant = this.add.image(x + TILE / 2, y + TILE + 1, 'plant_radish_0').setOrigin(0.5, 1);
      plant.setDepth(DEPTH_OBJECTS + y + TILE).setVisible(false);
      const sparkle = this.add.image(x + 12, y - 2, 'fx_sparkle').setDepth(DEPTH_FX - 1).setVisible(false);
      this.tweens.add({
        targets: sparkle, alpha: { from: 1, to: 0.2 }, scale: { from: 1, to: 0.6 },
        duration: 700 + (i % 5) * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.views.push({ soil, wild, plant, sparkle, lastKey: '' });
    }
  }

  // --- Mise à jour ----------------------------------------------------------

  /** Taille d'écran : zoom entier pour des pixels nets, monde centré. */
  private layout(): void {
    const cam = this.cameras.main;
    const { width, height } = this.scale.gameSize;
    cam.setSize(width, height);
    const fit = Math.min(width / WORLD_W, height / WORLD_H);
    const zoom = fit >= 1 ? Math.floor(fit) : fit;
    cam.setZoom(Math.max(0.25, zoom));
    cam.centerOn(WORLD_W / 2, WORLD_H / 2);
  }

  refresh(): void {
    const now = this.garden.now();
    const plots = this.garden.state.plots;
    plots.forEach((tile, i) => {
      const v = this.views[i];
      v.soil.setVisible(tile.tilled);
      v.wild.setVisible(!tile.tilled);
      if (tile.tilled) v.soil.setTexture(isWet(tile, now) ? 'soil_wet' : 'soil_dry');
      if (tile.plant) {
        const key = `plant_${tile.plant.id}_${growthStage(tile.plant)}`;
        if (key !== v.lastKey) {
          v.plant.setTexture(key);
          if (v.lastKey) this.pop(v.plant);
          v.lastKey = key;
        }
        v.plant.setVisible(true);
        v.sparkle.setVisible(isRipe(tile.plant));
      } else {
        v.plant.setVisible(false);
        v.sparkle.setVisible(false);
        v.lastKey = '';
      }
    });
    const season = this.garden.season;
    if (season !== this.season) this.applySeason(season);
  }

  private applySeason(season: Season): void {
    this.season = season;
    for (const s of this.seasonal) s.img.setTexture(s.key(season));
    this.cabinImg.setTexture(`cabin_${season}_${this.night ? 'night' : 'day'}`);
    this.cameras.main.setBackgroundColor(BACKDROP[season]);
  }

  /** Teinte selon l'heure réelle : aube et soir dorés, nuit bleutée avec fenêtres allumées. */
  private updateTimeOfDay(): void {
    const h = new Date(this.garden.now()).getHours() + new Date(this.garden.now()).getMinutes() / 60;
    let color = 0x1a1a4a, alpha = 0;
    if (h >= 21.5 || h < 5.5) { color = 0x1a1a4a; alpha = 0.38; }
    else if (h >= 19 || h < 7) { color = 0xff8a4a; alpha = 0.14; }
    this.nightOverlay.setFillStyle(color, alpha);
    this.night = h >= 19 || h < 7;
    this.cabinImg.setTexture(`cabin_${this.season}_${this.night ? 'night' : 'day'}`);
  }

  // --- Interactions ---------------------------------------------------------

  private plotIndexAt(p: Phaser.Input.Pointer): number {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const col = Math.floor(wp.x / TILE) - PLOT_ORIGIN.col;
    const row = Math.floor(wp.y / TILE) - PLOT_ORIGIN.row;
    if (col < 0 || row < 0 || col >= PLOT_COLS || row >= PLOT_ROWS) return -1;
    return row * PLOT_COLS + col;
  }

  private showCursor(index: number): void {
    if (index < 0) { this.cursorImg.setVisible(false); return; }
    const col = index % PLOT_COLS, row = Math.floor(index / PLOT_COLS);
    this.cursorImg.setPosition((PLOT_ORIGIN.col + col) * TILE - 1, (PLOT_ORIGIN.row + row) * TILE - 1).setVisible(true);
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) return;
    const i = this.plotIndexAt(p);
    this.showCursor(i);
    this.input.setDefaultCursor(i >= 0 ? 'pointer' : 'default');
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    const i = this.plotIndexAt(p);
    if (i < 0) return;
    this.showCursor(i);
    if (p.wasTouch) this.time.delayedCall(250, () => this.cursorImg.setVisible(false));
    this.actOn(i);
  }

  /** Une seule action par toucher, selon l'état de la case. */
  private actOn(i: number): void {
    const g = this.garden;
    const tile = g.state.plots[i];
    const view = this.views[i];

    if (!tile.tilled) {
      const cost = g.tillCost();
      this.hooks.confirmTill(cost, () => {
        const res = g.till(i);
        if (res.ok) { this.dust(view.soil); this.pop(view.soil); this.hooks.toast(t('toast.tilled')); }
        else if (res.reason === 'notEnoughCoins') this.hooks.toast(t('toast.notEnoughCoins'));
      });
      return;
    }

    if (!tile.plant) {
      const res = g.plant(i);
      if (res.ok) { view.lastKey = `plant_${res.crop}_0`; view.plant.setTexture(view.lastKey).setVisible(true); this.pop(view.plant); }
      else if (res.reason === 'noSeeds') {
        this.hooks.toast(t('toast.noSeeds', { crop: cropName(g.state.selectedSeed!) }));
        this.hooks.openShop('buy');
      } else if (res.reason === 'noSeedSelected') this.hooks.toast(t('toast.noSeedSelected'));
      return;
    }

    if (isRipe(tile.plant)) {
      const res = g.harvest(i);
      if (res.ok) {
        this.flyIcon(view.plant.x, view.plant.y - TILE, `icon_${res.crop}`);
        if (res.first) this.hooks.toast(t('toast.firstHarvest', { crop: cropName(res.crop) }));
      }
      return;
    }

    if (!isWet(tile, g.now()) && g.water(i).ok) {
      this.splash(view.soil);
      if (!this.wateredHintShown) {
        this.wateredHintShown = true;
        this.hooks.toast(t('toast.watered'));
        return;
      }
    }
    const now = g.now();
    const left = timeUntilRipe(tile.plant, tile.wetUntil, now);
    this.hooks.toast(t('toast.growingWet', { crop: cropName(tile.plant.id), time: formatDuration(left) }));
    this.wiggle(view.plant);
  }

  // --- Petits effets --------------------------------------------------------

  private pop(img: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(img);
    img.setScale(1, 0.6);
    this.tweens.add({ targets: img, scaleY: 1, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private wiggle(img: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(img);
    img.setAngle(0);
    this.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 1, onComplete: () => img.setAngle(0) });
  }

  private splash(soil: Phaser.GameObjects.Image): void {
    for (let k = 0; k < 6; k++) {
      const d = this.add.image(soil.x + 3 + Math.random() * 10, soil.y - 6 - Math.random() * 6, 'fx_drop').setDepth(DEPTH_FX);
      this.tweens.add({
        targets: d, y: d.y + 10 + Math.random() * 4, alpha: 0, duration: 380 + Math.random() * 200,
        delay: k * 40, ease: 'Quad.easeIn', onComplete: () => d.destroy(),
      });
    }
  }

  private dust(soil: Phaser.GameObjects.Image): void {
    for (let k = 0; k < 8; k++) {
      const d = this.add.rectangle(soil.x + 8, soil.y + 10, 1, 1, 0x8a5636).setDepth(DEPTH_FX);
      const a = (Math.PI * 2 * k) / 8;
      this.tweens.add({
        targets: d, x: d.x + Math.cos(a) * 9, y: d.y + Math.sin(a) * 5 - 3, alpha: 0, duration: 420,
        ease: 'Quad.easeOut', onComplete: () => d.destroy(),
      });
    }
  }

  private flyIcon(x: number, y: number, key: string): void {
    const icon = this.add.image(x, y, key).setDepth(DEPTH_FX);
    this.tweens.add({
      targets: icon, y: y - 18, alpha: { from: 1, to: 0 }, scale: { from: 1, to: 1.2 },
      duration: 750, ease: 'Cubic.easeOut', onComplete: () => icon.destroy(),
    });
  }
}
