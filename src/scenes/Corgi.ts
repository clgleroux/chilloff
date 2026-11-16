// Le corgi dans la scène : il se promène en contournant le potager et la cabane, renifle, fait la sieste,
// creuse pour déterrer une trouvaille, et dort devant la porte la nuit. Un toucher = un câlin.

import Phaser from 'phaser';
import type { ForageItem, Game } from '../game/state';
import { gardenTiles, tileFoot } from '../game/world';
import { DOORMAT, route, type Point } from './route';

type Mode = 'idle' | 'walk' | 'dig' | 'nap' | 'sleep' | 'petted';

const SPEED = 20; // pixels par seconde

export interface CorgiEvents {
  onTap(): void;
  onDug(item: ForageItem): void;
  dust(x: number, y: number): void;
  zzz(x: number, y: number): void;
}

export class Corgi {
  readonly img: Phaser.GameObjects.Image;
  private mode: Mode = 'idle';
  private timer = 1500;
  private path: Point[] = [];
  private arrive: (() => void) | null = null;
  private frameClock = 0;
  private stepFrame: 'walkA' | 'walkB' = 'walkA';
  private effectClock = 0;
  private digTile: [number, number] | null = null;
  private lastKey = '';

  constructor(private scene: Phaser.Scene, private garden: Game, private events: CorgiEvents, private baseDepth: number) {
    const start = garden.night ? DOORMAT : this.randomSpot() ?? DOORMAT;
    this.img = scene.add.image(start.x, start.y, 'corgi_none_walkA').setOrigin(0.5, 1);
    this.img.setInteractive({ useHandCursor: true }).on('pointerdown', () => events.onTap());
    if (garden.night) this.setMode('sleep');
    this.render('walkA');
  }

  get sleeping(): boolean {
    return this.mode === 'sleep' || this.mode === 'nap';
  }

  /** Un câlin : il s'arrête, content (sauf s'il dort : il continue sa sieste). */
  petted(): void {
    if (this.sleeping) return;
    this.path = [];
    this.setMode('petted', 1800);
    this.scene.tweens.add({ targets: this.img, y: this.img.y - 3, duration: 110, yoyo: true, repeat: 1 });
  }

  update(delta: number): void {
    this.timer -= delta;
    this.frameClock += delta;
    this.effectClock += delta;
    switch (this.mode) {
      case 'idle':
      case 'petted':
        this.render('walkA');
        if (this.timer <= 0) this.decide();
        break;
      case 'walk':
        this.walk(delta);
        break;
      case 'dig':
        if (this.frameClock > 110) { this.frameClock = 0; this.stepFrame = this.stepFrame === 'walkA' ? 'walkB' : 'walkA'; }
        this.render(this.stepFrame);
        if (this.effectClock > 160) { this.effectClock = 0; this.events.dust(this.img.x + (this.img.flipX ? 6 : -6), this.img.y - 1); }
        if (this.timer <= 0) this.finishDig();
        break;
      case 'nap':
      case 'sleep':
        this.render('sleep');
        if (this.effectClock > 1700) { this.effectClock = 0; this.events.zzz(this.img.x + (this.img.flipX ? -4 : 4), this.img.y - 10); }
        if (this.mode === 'nap' && this.timer <= 0) this.setMode('idle', 1200);
        if (this.mode === 'sleep' && !this.garden.night) this.setMode('idle', 800);
        break;
    }
    // Juste sous ce qui est posé sur sa case : une trouvaille reste toujours ramassable.
    this.img.setDepth(this.baseDepth + this.img.y + 0.3);
  }

  private render(frame: 'walkA' | 'walkB' | 'sleep'): void {
    const key = `corgi_${this.garden.state.companion.accessory ?? 'none'}_${frame}`;
    if (key !== this.lastKey) {
      this.img.setTexture(key);
      this.lastKey = key;
    }
  }

  private setMode(mode: Mode, duration = 0): void {
    this.mode = mode;
    this.timer = duration;
    this.effectClock = 0;
  }

  private decide(): void {
    if (this.garden.night) {
      this.goTo(DOORMAT, () => { this.img.setFlipX(true); this.setMode('sleep'); });
      return;
    }
    if (this.garden.canDig()) {
      const tile = this.randomTile();
      if (tile) {
        this.goTo(tileFoot(tile[0], tile[1]), () => { this.digTile = tile; this.setMode('dig', 1700); });
        return;
      }
    }
    const r = Math.random();
    if (r < 0.12) { this.setMode('nap', 9000 + Math.random() * 7000); return; }
    if (r < 0.3) { this.setMode('idle', 1500 + Math.random() * 2500); return; } // il renifle l'herbe
    const spot = this.randomSpot();
    if (spot) this.goTo(spot, () => this.setMode('idle', 1500 + Math.random() * 3000));
    else this.setMode('idle', 2000);
  }

  private finishDig(): void {
    const tile = this.digTile;
    this.digTile = null;
    if (tile) {
      const item = this.garden.companionDig(tile[0], tile[1]);
      if (item) this.events.onDug(item);
    }
    this.setMode('idle', 1500);
  }

  private randomTile(): [number, number] | null {
    const free = gardenTiles().filter(([c, r]) => this.garden.isTileFree(c, r));
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  private randomSpot(): Point | null {
    const tile = this.randomTile();
    if (!tile) return null;
    const foot = tileFoot(tile[0], tile[1]);
    return { x: foot.x + Math.round(Math.random() * 6 - 3), y: foot.y - 2 };
  }

  private goTo(target: Point, arrive: () => void): void {
    this.path = route({ x: this.img.x, y: this.img.y }, target);
    this.arrive = arrive;
    this.setMode('walk');
  }

  private walk(delta: number): void {
    const next = this.path[0];
    if (!next) {
      const done = this.arrive;
      this.arrive = null;
      if (done) done(); else this.setMode('idle', 1000);
      return;
    }
    const step = (SPEED * delta) / 1000;
    const dx = next.x - this.img.x, dy = next.y - this.img.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= step) {
      this.img.setPosition(next.x, next.y);
      this.path.shift();
    } else {
      this.img.setPosition(this.img.x + (dx / dist) * step, this.img.y + (dy / dist) * step);
    }
    if (Math.abs(dx) > 0.5) this.img.setFlipX(dx > 0); // dessiné tourné vers la gauche
    if (this.frameClock > 150) { this.frameClock = 0; this.stepFrame = this.stepFrame === 'walkA' ? 'walkB' : 'walkA'; }
    this.render(this.stepFrame);
  }
}
