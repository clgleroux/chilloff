// La ferme dans la scène : quatre enclos au bout du chemin. Un bâtiment en ruine attend qu'on le rénove ;
// une fois rénové, ses animaux se promènent dans l'enclos, et leurs produits apparaissent dans l'herbe quand
// ils sont prêts. Toucher le bâtiment : le jardinier y va et ouvre sa fiche (rénover, adopter).
// Toucher l'enclos, un animal ou un produit : il y va et s'en occupe (ramasser, sinon donner à manger).

import Phaser from 'phaser';
import { BUILDING_SIZE, FENCE_PAD } from '../art/farm-art';
import { BUILDINGS, BUILDING_IDS, isFed, isProduceReady, timeUntilProduce, type BuildingId } from '../game/farm';
import { isNight, type Season } from '../game/seasons';
import type { Game } from '../game/state';
import { LANE_Y, PADDOCKS, paddockGate } from '../game/world';
import { cropName, formatDuration, produceName, t } from '../i18n';
import type { Job } from './Gardener';

/** Ce que la ferme demande à la scène du jardin : le jardinier, les bulles, les petits effets. */
export interface FarmHost {
  ask(job: Job): void;
  marker(col: number, row: number): Phaser.GameObjects.Image;
  toast(message: string): void;
  openBuilding(id: BuildingId): void;
  pop(img: Phaser.GameObjects.Image): void;
  wiggle(img: Phaser.GameObjects.Image): void;
  flyIcon(x: number, y: number, key: string): void;
  heart(x: number, y: number): void;
  zzz(x: number, y: number): void;
  puff(x: number, y: number): void;
}

/** Vitesse de promenade (pixels par seconde). */
const SPEED: Record<BuildingId, number> = { coop: 12, hutch: 16, sheepfold: 7, barn: 5 };
/** Les produits sont un peu plus petits que leur icône. */
const PRODUCE_SCALE = 0.75;

interface Animal {
  img: Phaser.GameObjects.Image;
  target: { x: number; y: number } | null;
  timer: number;
}

interface PaddockView {
  id: BuildingId;
  back: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Image;
  house: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
  animals: Animal[];
  products: Phaser.GameObjects.Image[];
  sparkle: Phaser.GameObjects.Image;
  renovated: boolean;
  ready: boolean;
}

export class Farm {
  private views = {} as Record<BuildingId, PaddockView>;
  private season: Season;

  constructor(
    private scene: Phaser.Scene,
    private garden: Game,
    private host: FarmHost,
    private depth: { soil: number; objects: number; fx: number },
  ) {
    this.season = garden.season;
    for (const id of BUILDING_IDS) this.views[id] = this.build(id);
    this.refresh(false);
  }

  private textureState(id: BuildingId): string {
    return this.garden.state.farm[id].renovated ? 'ok' : 'ruin';
  }

  private build(id: BuildingId): PaddockView {
    const L = PADDOCKS[id];
    const f = L.fence;
    const st = this.textureState(id);
    const s = this.season;
    const back = this.scene.add.image(f.x0 - FENCE_PAD.x, f.y0 - FENCE_PAD.top, `fence_${id}_back_${s}_${st}`).setOrigin(0, 0)
      .setDepth(this.depth.objects + f.y0 - 1);
    const front = this.scene.add.image(f.x0 - FENCE_PAD.x, f.y0 - FENCE_PAD.top, `fence_${id}_front_${s}_${st}`).setOrigin(0, 0)
      .setDepth(this.depth.objects + f.y1);
    const [w] = BUILDING_SIZE[id];
    const house = this.scene.add.image(L.house.x + w / 2, L.house.footY, `farm_${id}_${s}_${st}`).setOrigin(0.5, 1)
      .setDepth(this.depth.objects + L.house.footY);
    house.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapHouse(id));

    const zone = this.scene.add.zone(f.x0, f.y0 - 8, f.x1 - f.x0 + 2, f.y1 - f.y0 + 10).setOrigin(0, 0);
    zone.setDepth(this.depth.soil + 0.6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapPaddock(id));

    const sparkle = this.scene.add.image(0, 0, 'fx_sparkle').setDepth(this.depth.fx - 1).setVisible(false);
    this.scene.tweens.add({ targets: sparkle, alpha: { from: 1, to: 0.2 }, scale: { from: 1, to: 0.6 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const view: PaddockView = { id, back, front, house, zone, animals: [], products: [], sparkle, renovated: st === 'ok', ready: false };
    return view;
  }

  // --- Toucher -----------------------------------------------------------------

  private gateMarker(id: BuildingId): Phaser.GameObjects.Image {
    return this.host.marker(Math.floor(PADDOCKS[id].gateX / 16), Math.floor(LANE_Y / 16));
  }

  /** Le bâtiment : sa fiche (rénover s'il est en ruine, sinon adopter un animal). */
  private tapHouse(id: BuildingId): void {
    this.host.ask({
      key: `house:${id}`, marker: this.gateMarker(id), target: () => paddockGate(id),
      act: () => { this.host.wiggle(this.views[id].house); this.host.openBuilding(id); },
    });
  }

  /** L'enclos, un animal ou un produit : s'en occuper. */
  private tapPaddock(id: BuildingId): void {
    if (!this.garden.state.farm[id].renovated) { this.tapHouse(id); return; }
    this.host.ask({ key: `farm:${id}`, marker: this.gateMarker(id), target: () => paddockGate(id), act: () => this.tend(id) });
  }

  /** Une seule chose par toucher : ramasser ce qui attend, sinon donner à manger, sinon dire où ils en sont. */
  private tend(id: BuildingId): void {
    const g = this.garden;
    const def = BUILDINGS[id];
    const view = this.views[id];
    const collected = g.collectProduce(id);
    if (collected.ok) {
      view.products.forEach((p, k) => this.scene.time.delayedCall(k * 120, () => this.host.flyIcon(p.x, p.y - 6, `produce_${def.produce}`)));
      const name = produceName(collected.produce);
      this.host.toast(collected.first ? t('toast.firstProduce', { name }) : t('farm.collected', { n: collected.n, name }));
      this.refresh();
      return;
    }
    if (!isFed(g.state.farm[id], g.now())) {
      const fed = g.feed(id);
      if (fed.ok) {
        const y = PADDOCKS[id].yard;
        this.host.flyIcon((y.x0 + y.x1) / 2, (y.y0 + y.y1) / 2, `icon_${fed.crop}`);
        for (const a of view.animals) this.host.heart(a.img.x, a.img.y - a.img.height);
        // On dit ce qui a été mangé (jamais de légume qui disparaît en silence), pas ce que ça change.
        this.host.toast(t(`farm.fed.${id}`, { crop: cropName(fed.crop) }));
        return;
      }
    }
    for (const a of view.animals) this.host.wiggle(a.img);
    const b = g.state.farm[id];
    const time = formatDuration(timeUntilProduce(id, b, g.now()));
    this.host.toast(t(isFed(b, g.now()) ? `farm.statusFed.${id}` : `farm.status.${id}`, { time }));
  }

  // --- Mise à jour ----------------------------------------------------------------

  setSeason(season: Season): void {
    this.season = season;
    for (const id of BUILDING_IDS) this.applyTextures(id);
  }

  private applyTextures(id: BuildingId): void {
    const v = this.views[id];
    const st = this.textureState(id);
    v.back.setTexture(`fence_${id}_back_${this.season}_${st}`);
    v.front.setTexture(`fence_${id}_front_${this.season}_${st}`);
    v.house.setTexture(`farm_${id}_${this.season}_${st}`);
  }

  /** Aligne la ferme sur l'état : rénovation, nouveaux animaux, produits prêts. `animate` : petits effets. */
  refresh(animate = true): void {
    const farm = this.garden.state.farm;
    for (const id of BUILDING_IDS) {
      const v = this.views[id];
      const b = farm[id];
      if (b.renovated !== v.renovated) {
        v.renovated = b.renovated;
        this.applyTextures(id);
        if (animate && b.renovated) this.celebrate(id);
      }
      while (v.animals.length < b.animals) this.addAnimal(id, animate);
      while (v.animals.length > b.animals) v.animals.pop()!.img.destroy();
      const ready = isProduceReady(id, b);
      const count = ready ? b.animals : 0;
      if (v.products.length !== count) this.layProducts(id, count, animate);
      v.ready = ready;
    }
  }

  private celebrate(id: BuildingId): void {
    const v = this.views[id];
    const L = PADDOCKS[id];
    const [w, h] = BUILDING_SIZE[id];
    this.host.pop(v.house);
    for (let k = 0; k < 6; k++) {
      this.scene.time.delayedCall(k * 70, () => this.host.puff(L.house.x + 4 + Math.random() * (w - 8), L.house.footY - Math.random() * h));
    }
  }

  private spotIn(id: BuildingId): { x: number; y: number } {
    const y = PADDOCKS[id].yard;
    return { x: Math.round(y.x0 + Math.random() * (y.x1 - y.x0)), y: Math.round(y.y0 + Math.random() * (y.y1 - y.y0)) };
  }

  private addAnimal(id: BuildingId, animate: boolean): void {
    const v = this.views[id];
    const at = this.spotIn(id);
    const img = this.scene.add.image(at.x, at.y, `animal_${BUILDINGS[id].animal}`).setOrigin(0.5, 1);
    img.setFlipX(Math.random() < 0.5).setDepth(this.depth.objects + at.y);
    img.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapPaddock(id));
    v.animals.push({ img, target: null, timer: 800 + Math.random() * 2500 });
    if (animate) {
      this.host.pop(img);
      this.scene.time.delayedCall(300, () => this.host.heart(img.x, img.y - 16));
    }
  }

  /** Les produits qui attendent dans l'herbe (un par animal), en rang le long du bas de l'enclos. */
  private layProducts(id: BuildingId, count: number, animate: boolean): void {
    const v = this.views[id];
    for (const p of v.products) p.destroy();
    v.products = [];
    const y = PADDOCKS[id].yard;
    const key = `produce_${BUILDINGS[id].produce}`;
    for (let k = 0; k < count; k++) {
      const x = Math.round(y.x0 + ((k + 0.5) * (y.x1 - y.x0)) / count);
      const py = y.y1 - (k % 2) * 7;
      const img = this.scene.add.image(x, py, key).setOrigin(0.5, 1).setScale(PRODUCE_SCALE).setDepth(this.depth.objects + py - 0.2);
      img.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapPaddock(id));
      if (animate) {
        img.setScale(0);
        this.scene.tweens.add({ targets: img, scale: PRODUCE_SCALE, duration: 300, delay: k * 90, ease: 'Back.easeOut' });
      }
      v.products.push(img);
    }
    const first = v.products[0];
    v.sparkle.setVisible(!!first);
    if (first) v.sparkle.setPosition(first.x + 6, first.y - 13);
  }

  /** Les animaux se promènent tranquillement ; la nuit, ils dorment là où ils sont. */
  update(delta: number): void {
    const night = isNight(new Date(this.garden.now()));
    for (const id of BUILDING_IDS) {
      for (const a of this.views[id].animals) {
        a.timer -= delta;
        if (night) {
          if (a.timer <= 0) { a.timer = 3000 + Math.random() * 4000; this.host.zzz(a.img.x - 4, a.img.y - a.img.height + 2); }
          continue;
        }
        if (a.target) {
          const step = (SPEED[id] * delta) / 1000;
          const dx = a.target.x - a.img.x, dy = a.target.y - a.img.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= step) { a.img.setPosition(a.target.x, a.target.y); a.target = null; a.timer = 1500 + Math.random() * 4000; }
          else a.img.setPosition(a.img.x + (dx / dist) * step, a.img.y + (dy / dist) * step);
          if (Math.abs(dx) > 0.5) a.img.setFlipX(dx > 0); // dessinés tournés vers la gauche
          a.img.setDepth(this.depth.objects + a.img.y);
        } else if (a.timer <= 0) {
          if (Math.random() < 0.6) a.target = this.spotIn(id);
          else { this.fidget(id, a); a.timer = 1200 + Math.random() * 2500; }
        }
      }
    }
  }

  /** Un petit geste sur place : picorer, sautiller, brouter. */
  private fidget(id: BuildingId, a: Animal): void {
    const img = a.img;
    if (this.scene.tweens.isTweening(img)) return;
    if (id === 'coop') {
      const dir = img.flipX ? 1 : -1;
      this.scene.tweens.add({ targets: img, angle: 18 * dir, duration: 90, yoyo: true, repeat: 1, onComplete: () => img.setAngle(0) });
    } else if (id === 'hutch') {
      this.scene.tweens.add({ targets: img, y: img.y - 4, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    } else {
      this.scene.tweens.add({ targets: img, scaleY: 0.92, duration: 500, yoyo: true, hold: 600, ease: 'Sine.easeInOut', onComplete: () => img.setScale(1) });
    }
  }
}
