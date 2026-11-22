// La scène du jardin : décor, potager, jardin vivant (trouvailles, visiteurs, déco, courrier),
// interactions au toucher/clic et petits effets. Chaque toucher confie une tâche au jardinier,
// qui marche jusqu'à la chose avant d'agir (voir Gardener.ts).

import Phaser from 'phaser';
import { BACKDROP, rng } from '../art/draw';
import { LEAF_BITS } from '../art/living-sprites';
import { GRASS_VARIANTS, PATH_VARIANTS, TREE_VARIANTS, WILD_VARIANTS, registerTextures } from '../art/textures';
import { PLOT_COLS, PLOT_ORIGIN, PLOT_ROWS, TILE, WORLD_COLS, WORLD_ROWS, tillCost } from '../game/config';
import { DECOS } from '../game/decor';
import { growthStage, isRipe, isWet, timeUntilRipe } from '../game/growth';
import type { Season } from '../game/seasons';
import type { ForageItem, Game, GiftResult, PlacedDeco, VisitorInstance } from '../game/state';
import { GARDEN_MAX_ROW, GARDEN_MIN_ROW, MAILBOX_TILE, TREE_POS, tileFoot } from '../game/world';
import { cropName, formatDuration, giftLabel, materialName, t, visitorName } from '../i18n';
import { edit } from '../ui/edit';
import { Corgi } from './Corgi';
import { Gardener, type Job, type Tool } from './Gardener';

export interface SceneHooks {
  toast(message: string): void;
  /** `reserved` : pièces déjà promises aux cases que le jardinier va défricher. */
  confirmTill(cost: number, reserved: number, onConfirm: () => void): void;
  openShop(tab: 'buy' | 'sell'): void;
  openLetter(): void;
  /** Premier câlin : on choisit le nom du compagnon. */
  nameCompanion(): void;
}

const WORLD_W = WORLD_COLS * TILE;
const WORLD_H = WORLD_ROWS * TILE;
/** Le décor déborde du monde jouable pour remplir les grands écrans. */
const MARGIN_COLS = 14;
const MARGIN_ROWS = 10;

const DEPTH_GROUND = 0;
const DEPTH_SOIL = 1;
const DEPTH_EDIT_GRID = 2;
const DEPTH_OBJECTS = 10; // + y du pied de l'objet
const DEPTH_PERCHED = DEPTH_OBJECTS + 2000;
const DEPTH_FX = 5000;
const DEPTH_NIGHT = 6000;
const DEPTH_LIGHT = 6001;

interface PlotView {
  soil: Phaser.GameObjects.Image;
  wild: Phaser.GameObjects.Image;
  plant: Phaser.GameObjects.Image;
  sparkle: Phaser.GameObjects.Image;
  lastKey: string;
}

interface ThingView {
  img: Phaser.GameObjects.Image;
  extras: Phaser.GameObjects.GameObject[];
  glow?: Phaser.GameObjects.Image;
}

interface SeasonalImage {
  img: Phaser.GameObjects.Image;
  key: (s: Season) => string;
}

export class GardenScene extends Phaser.Scene {
  private views: PlotView[] = [];
  private seasonal: SeasonalImage[] = [];
  private forageViews = new Map<number, ThingView>();
  private decoViews = new Map<number, ThingView>();
  private visitorViews = new Map<number, ThingView>();
  private cabinImg!: Phaser.GameObjects.Image;
  private mainTree!: Phaser.GameObjects.Image;
  private mailbox!: Phaser.GameObjects.Image;
  private letterBubble!: Phaser.GameObjects.Image;
  private cursorImg!: Phaser.GameObjects.Image;
  private ghost!: Phaser.GameObjects.Image;
  private editGrid!: Phaser.GameObjects.Graphics;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private season!: Season;
  private night = false;
  /** 0 le jour, 0,5 à l'aube et au crépuscule, 1 la nuit : intensité des lumières. */
  private lightLevel = 0;
  private wateredHintShown = false;
  private corgi!: Corgi;
  private gardener!: Gardener;

  constructor(private garden: Game, private hooks: SceneHooks) {
    super('garden');
  }

  create(): void {
    registerTextures(this);
    this.season = this.garden.season;

    this.buildGround();
    this.buildDecor();
    this.buildPlot();
    this.corgi = new Corgi(this, this.garden, {
      onTap: () => {
        if (edit.active) return;
        this.ask({
          key: 'corgi', target: () => ({ x: this.corgi.img.x, y: this.corgi.img.y }),
          start: () => this.corgi.wait(), act: () => this.petCorgi(),
        });
      },
      onDug: (item) => this.onDug(item),
      dust: (x, y) => this.dirt(x, y),
      zzz: (x, y) => this.zzz(x, y),
    }, DEPTH_OBJECTS);
    this.gardener = new Gardener(this, this.garden, DEPTH_OBJECTS);

    this.editGrid = this.add.graphics().setDepth(DEPTH_EDIT_GRID);
    this.cursorImg = this.add.image(0, 0, 'fx_cursor').setOrigin(0, 0).setDepth(DEPTH_FX).setVisible(false);
    this.ghost = this.add.image(0, 0, 'deco_stepstone').setOrigin(0.5, 1).setAlpha(0.7).setDepth(DEPTH_FX).setVisible(false);
    this.nightOverlay = this.add
      .rectangle(-MARGIN_COLS * TILE, -MARGIN_ROWS * TILE, WORLD_W + 2 * MARGIN_COLS * TILE, WORLD_H + 2 * MARGIN_ROWS * TILE, 0x1a1a4a, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_NIGHT);

    this.applySeason(this.season);
    this.updateTimeOfDay();
    this.layout();
    this.refresh();

    this.scale.on('resize', () => this.layout());
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => this.onPointerDown(p, over));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('gameout', () => { this.cursorImg.setVisible(false); this.ghost.setVisible(false); });

    this.garden.onChange(() => this.refresh());
    edit.on(() => this.onEditChanged());
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refresh() });
    this.time.addEvent({ delay: 30_000, loop: true, callback: () => this.updateTimeOfDay() });
  }

  update(_time: number, delta: number): void {
    this.corgi.update(Math.min(delta, 100));
    this.gardener.update(Math.min(delta, 100));
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

    // Boîte aux lettres à côté de la porte, avec une bulle quand une lettre attend.
    const mb = tileFoot(MAILBOX_TILE.col, MAILBOX_TILE.row);
    this.mailbox = this.add.image(mb.x, mb.y, 'mailbox_down').setOrigin(0.5, 1).setDepth(DEPTH_OBJECTS + mb.y);
    const openMail = () => {
      if (edit.active) return;
      this.ask({
        key: 'mail', marker: this.marker(MAILBOX_TILE.col, MAILBOX_TILE.row), target: () => mb,
        act: () => { this.wiggle(this.mailbox); this.hooks.openLetter(); },
      });
    };
    // Zone de toucher plus large que le dessin (qui est fin), pour ne jamais la rater.
    this.mailbox.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-4, 2, 24, 22), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true })
      .on('pointerdown', openMail);
    this.letterBubble = this.add.image(mb.x, mb.y - 30, 'ui_letter').setDepth(DEPTH_FX - 2).setVisible(false);
    this.letterBubble.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-2, -2, 20, 20), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true })
      .on('pointerdown', openMail);
    this.tweens.add({ targets: this.letterBubble, y: mb.y - 33, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // L'arbre du jardin : on peut le secouer.
    this.mainTree = this.addTree(TREE_POS.x, TREE_POS.footY, 0);
    this.mainTree.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!edit.active) this.ask({ key: 'tree', target: () => ({ x: TREE_POS.x, y: TREE_POS.footY }), act: () => this.shakeTree() });
    });

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

  private addTree(x: number, footY: number, variant: number): Phaser.GameObjects.Image {
    const img = this.add.image(x, footY, `tree_${this.season}_${variant}`).setOrigin(0.5, 1);
    img.setDepth(DEPTH_OBJECTS + footY);
    this.seasonal.push({ img, key: (s) => `tree_${s}_${variant}` });
    return img;
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
    const s = this.garden.state;
    s.plots.forEach((tile, i) => {
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

    this.sync(this.forageViews, s.forage, (f) => this.makeForage(f));
    this.sync(this.decoViews, s.decor.placed, (d) => this.makeDeco(d));
    this.sync(this.visitorViews, s.visitors, (v) => this.makeVisitor(v));

    this.mailbox.setTexture(s.letter ? 'mailbox_up' : 'mailbox_down');
    this.updateBubble();
    if (edit.active) this.drawEditGrid();

    const season = this.garden.season;
    if (season !== this.season) this.applySeason(season);
  }

  /** Aligne les sprites sur l'état : crée ce qui est nouveau, efface en douceur ce qui est parti. */
  private sync<T extends { uid: number }>(views: Map<number, ThingView>, items: T[], make: (item: T) => ThingView): void {
    const alive = new Set(items.map((i) => i.uid));
    for (const [uid, view] of views) {
      if (alive.has(uid)) continue;
      views.delete(uid);
      this.fadeOut(view);
    }
    for (const item of items) if (!views.has(item.uid)) views.set(item.uid, make(item));
  }

  private applySeason(season: Season): void {
    this.season = season;
    for (const s of this.seasonal) s.img.setTexture(s.key(season));
    this.cabinImg.setTexture(`cabin_${season}_${this.night ? 'night' : 'day'}`);
    this.cameras.main.setBackgroundColor(BACKDROP[season]);
  }

  /** Teinte selon l'heure réelle : aube et soir dorés, nuit bleutée avec fenêtres et lanternes allumées. */
  private updateTimeOfDay(): void {
    const d = new Date(this.garden.now());
    const h = d.getHours() + d.getMinutes() / 60;
    let color = 0x1a1a4a, alpha = 0;
    this.lightLevel = 0;
    if (h >= 21.5 || h < 5.5) { color = 0x1a1a4a; alpha = 0.38; this.lightLevel = 1; }
    else if (h >= 19 || h < 7) { color = 0xff8a4a; alpha = 0.14; this.lightLevel = 0.5; }
    this.nightOverlay.setFillStyle(color, alpha);
    this.night = h >= 19 || h < 7;
    this.cabinImg.setTexture(`cabin_${this.season}_${this.night ? 'night' : 'day'}`);
    for (const v of this.decoViews.values()) v.glow?.setAlpha(this.lightLevel * 0.9);
  }

  // --- Trouvailles, déco, visiteurs -------------------------------------------

  private makeForage(f: ForageItem): ThingView {
    const foot = tileFoot(f.col, f.row);
    const shadow = this.add.image(foot.x, foot.y - 3, 'fx_shadow').setDepth(DEPTH_SOIL + 0.5);
    const img = this.add.image(foot.x, foot.y - 2, `mat_${f.id}`).setOrigin(0.5, 1).setDepth(DEPTH_OBJECTS + foot.y);
    img.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (edit.active) return;
      this.ask({
        key: `forage:${f.uid}`, marker: this.marker(f.col, f.row),
        target: () => (this.garden.state.forage.some((x) => x.uid === f.uid) ? foot : null),
        act: () => this.collect(f.uid),
      });
    });
    this.appear(img);
    this.tweens.add({ targets: img, y: foot.y - 3, duration: 900 + (f.uid % 5) * 120, yoyo: true, repeat: -1, ease: 'Stepped' });
    return { img, extras: [shadow] };
  }

  private makeDeco(d: PlacedDeco): ThingView {
    const foot = tileFoot(d.col, d.row);
    const img = this.add.image(foot.x, foot.y, `deco_${d.id}`).setOrigin(0.5, 1).setDepth(DEPTH_OBJECTS + foot.y - 0.5);
    img.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!edit.active) this.wiggle(img); });
    let glow: Phaser.GameObjects.Image | undefined;
    if (DECOS[d.id].glow) {
      const gy = d.id === 'lantern' ? foot.y - 17 : foot.y - 6;
      glow = this.add.image(foot.x, gy, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_LIGHT).setAlpha(this.lightLevel * 0.9);
      this.tweens.add({ targets: glow, scale: { from: 0.95, to: 1.08 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.pop(img);
    return { img, extras: glow ? [glow] : [], glow };
  }

  private makeVisitor(v: VisitorInstance): ThingView {
    const img = this.add.image(v.x, v.y, `vis_${v.id}`).setOrigin(0.5, 1);
    img.setDepth(v.perch ? DEPTH_PERCHED : DEPTH_OBJECTS + v.y + 0.25);
    if (v.uid % 2 === 0) img.setFlipX(true);
    img.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (edit.active) return;
      // Un visiteur perché se salue depuis le pied de son perchoir.
      const at = v.perch ? tileFoot(v.col, v.row) : { x: v.x, y: v.y };
      this.ask({
        key: `visitor:${v.uid}`,
        target: () => (this.garden.state.visitors.some((x) => x.uid === v.uid) ? at : null),
        act: () => this.greet(v.uid),
      });
    });
    const extras: Phaser.GameObjects.GameObject[] = [];
    if (v.id === 'firefly') {
      const glow = this.add.image(v.x, v.y - 6, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_LIGHT).setScale(0.6);
      this.tweens.add({ targets: [img, glow], y: '-=4', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
      extras.push(glow);
    } else if (v.id === 'butterfly') {
      this.tweens.add({ targets: img, scaleX: { from: 1, to: 0.4 }, duration: 220, yoyo: true, repeat: -1, repeatDelay: 300 });
    } else if (!v.perch || v.id === 'bluetit') {
      // Petits sauts de temps en temps.
      this.tweens.add({ targets: img, y: v.y - 2, duration: 120, yoyo: true, repeat: -1, repeatDelay: 1800 + (v.uid % 7) * 400 });
    }
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 500 });
    return { img, extras };
  }

  private collect(uid: number): void {
    const view = this.forageViews.get(uid);
    const res = this.garden.collect(uid);
    if (!res.ok || !view) return;
    this.forageViews.delete(uid);
    this.flyIcon(view.img.x, view.img.y - 8, `mat_${res.material}`);
    this.destroyView(view);
  }

  private greet(uid: number): void {
    const view = this.visitorViews.get(uid);
    const res = this.garden.greet(uid);
    if (!res.ok || !view) return;
    this.visitorViews.delete(uid);
    const { x, y } = view.img;
    this.heart(x, y - 16);
    if (res.gift) this.flyGift(x, y - 10, res.gift);
    // Le visiteur repart en sautillant.
    this.tweens.killTweensOf(view.img);
    this.tweens.add({ targets: view.img, y: y - 10, alpha: 0, duration: 450, delay: 150, ease: 'Quad.easeIn', onComplete: () => this.destroyView(view) });
    for (const e of view.extras) this.tweens.add({ targets: e, alpha: 0, duration: 400 });

    const gift = res.gift ? giftLabel(res.gift) : '';
    if (res.first) this.hooks.toast(`${t('toast.newVisitor', { name: visitorName(res.visitor) })}${gift ? ` ${gift}` : ''}`);
    else if (gift) this.hooks.toast(`${visitorName(res.visitor)} : ${gift}`);
  }

  private shakeTree(): void {
    const tree = this.mainTree;
    this.tweens.killTweensOf(tree);
    tree.setAngle(0);
    this.tweens.add({ targets: tree, angle: { from: -2, to: 2 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => tree.setAngle(0) });
    this.fallingLeaves(tree.x, tree.y - 30);
    const res = this.garden.shakeTree();
    if (res.dropped) {
      const view = this.forageViews.get(res.dropped.uid);
      if (view) {
        const targetY = view.img.y;
        view.img.y = tree.y - 26;
        this.tweens.killTweensOf(view.img);
        this.tweens.add({ targets: view.img, y: targetY, duration: 500, ease: 'Bounce.easeOut' });
      }
    }
  }

  // --- Mode déco ---------------------------------------------------------------

  private onEditChanged(): void {
    if (edit.active) {
      this.gardener.clear(true);
      this.drawEditGrid();
      if (edit.hand) this.ghost.setTexture(`deco_${edit.hand}`);
    } else {
      this.editGrid.clear();
      this.ghost.setVisible(false);
    }
    this.updateBubble();
  }

  /** Bulle du courrier : une lettre pas encore lue, ou une lettre lue qu'on peut maintenant donner (coche verte). */
  private updateBubble(): void {
    const letter = this.garden.state.letter;
    const ready = !!letter && this.garden.canDeliver();
    this.letterBubble.setTexture(ready ? 'ui_letter_ready' : 'ui_letter');
    this.letterBubble.setVisible(!!letter && (!letter.read || ready) && !edit.active);
  }

  private drawEditGrid(): void {
    const g = this.editGrid;
    g.clear();
    for (let row = GARDEN_MIN_ROW; row <= GARDEN_MAX_ROW; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const deco = this.garden.decoAt(col, row);
        if (deco) {
          g.lineStyle(1, 0xffd75a, 0.9).strokeRect(col * TILE + 0.5, row * TILE + 0.5, TILE - 1, TILE - 1);
        } else if (this.garden.canPlace(col, row)) {
          g.fillStyle(0xffffff, 0.16).fillRect(col * TILE + 1, row * TILE + 1, TILE - 2, TILE - 2);
        }
      }
    }
  }

  private onEditTap(col: number, row: number): void {
    const g = this.garden;
    if (edit.hand) {
      if (g.canPlace(col, row)) {
        const id = edit.hand;
        g.placeDeco(id, col, row);
        // S'il en reste d'autres, on garde la même déco en main pour continuer à poser.
        if (g.state.decor.inventory[id] && g.takeDeco(id)) edit.setHand(id);
        else { edit.setHand(null); this.ghost.setVisible(false); }
      } else if (g.decoAt(col, row)) {
        this.hooks.toast(t('edit.occupied'));
      } else {
        this.hooks.toast(t('edit.cantPlace'));
      }
      return;
    }
    const picked = g.pickUpDeco(col, row);
    if (picked) edit.setHand(picked);
  }

  // --- Interactions ---------------------------------------------------------

  private tileAt(p: Phaser.Input.Pointer): { col: number; row: number } {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    return { col: Math.floor(wp.x / TILE), row: Math.floor(wp.y / TILE) };
  }

  private plotIndexAt(p: Phaser.Input.Pointer): number {
    const { col: c, row: r } = this.tileAt(p);
    const col = c - PLOT_ORIGIN.col, row = r - PLOT_ORIGIN.row;
    if (col < 0 || row < 0 || col >= PLOT_COLS || row >= PLOT_ROWS) return -1;
    return row * PLOT_COLS + col;
  }

  private showCursorAt(col: number, row: number): void {
    this.cursorImg.setPosition(col * TILE - 1, row * TILE - 1).setVisible(true);
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) return;
    if (edit.active) {
      const { col, row } = this.tileAt(p);
      const inGarden = col >= 0 && col < WORLD_COLS && row >= GARDEN_MIN_ROW && row <= GARDEN_MAX_ROW;
      if (inGarden) this.showCursorAt(col, row);
      else this.cursorImg.setVisible(false);
      if (edit.hand && inGarden) {
        const foot = tileFoot(col, row);
        this.ghost.setPosition(foot.x, foot.y).setVisible(true);
        this.ghost.setTint(this.garden.canPlace(col, row) ? 0xffffff : 0xff7a7a);
      } else this.ghost.setVisible(false);
      return;
    }
    const i = this.plotIndexAt(p);
    if (i >= 0) this.showCursorAt(PLOT_ORIGIN.col + (i % PLOT_COLS), PLOT_ORIGIN.row + Math.floor(i / PLOT_COLS));
    else this.cursorImg.setVisible(false);
    this.input.setDefaultCursor(i >= 0 ? 'pointer' : 'default');
  }

  private onPointerDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (edit.active) {
      const { col, row } = this.tileAt(p);
      this.onEditTap(col, row);
      return;
    }
    if (over.length) return; // une trouvaille, un visiteur, la boîte aux lettres… a déjà réagi
    const i = this.plotIndexAt(p);
    if (i < 0) return;
    this.showCursorAt(PLOT_ORIGIN.col + (i % PLOT_COLS), PLOT_ORIGIN.row + Math.floor(i / PLOT_COLS));
    if (p.wasTouch) this.time.delayedCall(250, () => this.cursorImg.setVisible(false));
    this.tapPlot(i);
  }

  // --- Le jardinier -------------------------------------------------------------

  /** Confie une tâche au jardinier (une même chose n'est demandée qu'une fois). */
  private ask(job: Job): void {
    this.gardener.add(job);
  }

  /** Petit repère au sol sur une case où le jardinier a quelque chose à faire. */
  private marker(col: number, row: number): Phaser.GameObjects.Image {
    return this.add.image(col * TILE - 1, row * TILE - 1, 'fx_cursor').setOrigin(0, 0).setAlpha(0.45).setDepth(DEPTH_FX - 3);
  }

  private tapPlot(i: number): void {
    const g = this.garden;
    const col = PLOT_ORIGIN.col + (i % PLOT_COLS), row = PLOT_ORIGIN.row + Math.floor(i / PLOT_COLS);
    const job = (key?: string): Job => ({
      key, marker: this.marker(col, row), target: () => tileFoot(col, row),
      tool: () => this.toolFor(i), act: () => this.actOn(i),
    });
    // Défricher coûte des pièces : on confirme tout de suite, le jardinier s'en charge ensuite.
    // (Si la case est déjà promise au défrichage, un nouveau toucher demande la suite : planter.)
    if (!g.state.plots[i].tilled && !this.gardener.has(`till:${i}`)) {
      const pending = this.gardener.count('till:');
      const tilled = g.state.plots.filter((p) => p.tilled).length;
      let reserved = 0;
      for (let k = 0; k < pending; k++) reserved += tillCost(tilled + k);
      this.hooks.confirmTill(tillCost(tilled + pending), reserved, () => this.ask(job(`till:${i}`)));
      return;
    }
    this.ask(job());
  }

  /** L'outil en main au moment d'agir sur une case. */
  private toolFor(i: number): Tool | null {
    const tile = this.garden.state.plots[i];
    if (!tile.tilled) return 'hoe';
    if (tile.plant && !isRipe(tile.plant) && !isWet(tile, this.garden.now())) return 'can';
    return null;
  }

  /**
   * Une seule action par toucher, selon l'état de la case quand le jardinier y arrive.
   * false : quelque chose manque (pièces, graines), la suite de la file est oubliée.
   */
  private actOn(i: number): boolean {
    const g = this.garden;
    const tile = g.state.plots[i];
    const view = this.views[i];

    if (!tile.tilled) {
      const res = g.till(i);
      if (res.ok) { this.dust(view.soil); this.pop(view.soil); this.hooks.toast(t('toast.tilled')); return true; }
      if (res.reason === 'notEnoughCoins') this.hooks.toast(t('toast.notEnoughCoins'));
      return false;
    }

    if (!tile.plant) {
      const res = g.plant(i);
      if (res.ok) { view.lastKey = `plant_${res.crop}_0`; view.plant.setTexture(view.lastKey).setVisible(true); this.pop(view.plant); return true; }
      if (res.reason === 'noSeeds') {
        this.hooks.toast(t('toast.noSeeds', { crop: cropName(g.state.selectedSeed!) }));
        this.hooks.openShop('buy');
      } else if (res.reason === 'noSeedSelected') this.hooks.toast(t('toast.noSeedSelected'));
      return false;
    }

    if (isRipe(tile.plant)) {
      const res = g.harvest(i);
      if (res.ok) {
        this.flyIcon(view.plant.x, view.plant.y - TILE, `icon_${res.crop}`);
        if (res.first) this.hooks.toast(t('toast.firstHarvest', { crop: cropName(res.crop) }));
      }
      return true;
    }

    if (!isWet(tile, g.now()) && g.water(i).ok) {
      this.splash(view.soil);
      if (!this.wateredHintShown) {
        this.wateredHintShown = true;
        this.hooks.toast(t('toast.watered'));
        return true;
      }
    }
    const now = g.now();
    const left = timeUntilRipe(tile.plant, tile.wetUntil, now);
    this.hooks.toast(t('toast.growingWet', { crop: cropName(tile.plant.id), time: formatDuration(left) }));
    this.wiggle(view.plant);
    return true;
  }

  // --- Petits effets --------------------------------------------------------

  private pop(img: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(img);
    img.setScale(1, 0.6);
    this.tweens.add({ targets: img, scaleY: 1, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private appear(img: Phaser.GameObjects.Image): void {
    img.setScale(0);
    this.tweens.add({ targets: img, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  private wiggle(img: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(img);
    img.setAngle(0);
    this.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 1, onComplete: () => img.setAngle(0) });
  }

  private fadeOut(view: ThingView): void {
    const targets = [view.img, ...view.extras];
    this.tweens.killTweensOf(targets);
    this.tweens.add({ targets, alpha: 0, duration: 350, onComplete: () => this.destroyView(view) });
  }

  private destroyView(view: ThingView): void {
    this.tweens.killTweensOf([view.img, ...view.extras]);
    view.img.destroy();
    for (const e of view.extras) e.destroy();
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

  private fallingLeaves(x: number, y: number): void {
    const color = Phaser.Display.Color.HexStringToColor(LEAF_BITS[this.season]).color;
    for (let k = 0; k < 7; k++) {
      const leaf = this.add.rectangle(x - 12 + Math.random() * 24, y - Math.random() * 10, 2, 1, color).setDepth(DEPTH_FX);
      this.tweens.add({
        targets: leaf, y: leaf.y + 24 + Math.random() * 10, x: leaf.x + (Math.random() * 12 - 6), alpha: 0,
        duration: 900 + Math.random() * 500, delay: k * 60, ease: 'Sine.easeIn', onComplete: () => leaf.destroy(),
      });
    }
  }

  // --- Compagnon --------------------------------------------------------------

  private petCorgi(): void {
    const g = this.garden;
    const res = g.petCompanion();
    const { x, y } = this.corgi.img;
    for (let i = 0; i < (res.counted ? 3 : 1); i++) this.time.delayedCall(i * 140, () => this.heart(x + (i - 1) * 6, y - 14));
    this.corgi.petted();
    const name = g.state.companion.name;
    if (!name) { this.hooks.nameCompanion(); return; }
    if (this.corgi.sleeping) this.hooks.toast(t('companion.sleeping', { name }));
    // Laisser découvrir : un cœur de plus se ressent, l'accessoire se découvre dans le journal.
    else if (res.unlocked) this.hooks.toast(t('companion.unlocked', { name }));
    else if (res.dailyBonus) this.hooks.toast(t('companion.daily', { name }));
    else if (res.counted) this.hooks.toast(t('companion.happy', { name }));
  }

  private onDug(item: ForageItem): void {
    const foot = tileFoot(item.col, item.row);
    const hole = this.add.image(foot.x, foot.y - 3, 'fx_hole').setDepth(DEPTH_SOIL + 0.4);
    this.tweens.add({ targets: hole, alpha: 0, delay: 20_000, duration: 2000, onComplete: () => hole.destroy() });
    const name = this.garden.state.companion.name;
    if (name) this.hooks.toast(t('companion.dug', { name, material: materialName(item.id) }));
  }

  private dirt(x: number, y: number): void {
    for (let k = 0; k < 3; k++) {
      const d = this.add.rectangle(x, y, 1, 1, k % 2 ? 0x6e4228 : 0x8a5636).setDepth(DEPTH_FX);
      this.tweens.add({
        targets: d, x: x + (Math.random() * 10 - 5), y: y - 3 - Math.random() * 5, alpha: 0, duration: 380,
        ease: 'Quad.easeOut', onComplete: () => d.destroy(),
      });
    }
  }

  private zzz(x: number, y: number): void {
    const z = this.add.image(x, y, 'fx_zzz').setDepth(DEPTH_NIGHT + 2).setScale(0.6);
    this.tweens.add({ targets: z, x: x + 5, y: y - 10, scale: 1, alpha: { from: 1, to: 0 }, duration: 1600, onComplete: () => z.destroy() });
  }

  private heart(x: number, y: number): void {
    const h = this.add.image(x, y, 'fx_heart').setDepth(DEPTH_FX);
    this.tweens.add({ targets: h, y: y - 12, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Cubic.easeOut', onComplete: () => h.destroy() });
  }

  private flyGift(x: number, y: number, gift: GiftResult): void {
    const keys: string[] = [];
    if (gift.coins) keys.push('ui_coin');
    if (gift.material) keys.push(`mat_${gift.material[0]}`);
    if (gift.seeds) keys.push(`icon_${gift.seeds[0]}`);
    keys.forEach((k, i) => this.time.delayedCall(i * 150, () => this.flyIcon(x + (i - (keys.length - 1) / 2) * 10, y, k)));
  }

  private flyIcon(x: number, y: number, key: string): void {
    const icon = this.add.image(x, y, key).setDepth(DEPTH_FX);
    this.tweens.add({
      targets: icon, y: y - 18, alpha: { from: 1, to: 0 }, scale: { from: 1, to: 1.2 },
      duration: 750, ease: 'Cubic.easeOut', onComplete: () => icon.destroy(),
    });
  }
}
