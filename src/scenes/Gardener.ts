// Le jardinier : chaque toucher (une case du potager, une trouvaille, l'arbre, la boîte aux lettres, un visiteur,
// le corgi) lui confie une tâche. Il marche jusqu'à la chose, se tourne vers elle, travaille (arrosoir, binette…)
// puis passe à la suivante : plusieurs touchers s'enchaînent dans une file d'attente.
// Au repos il cligne des yeux, regarde autour de lui, s'étire. La nuit, il rentre dormir dans la cabane
// et en ressort dès qu'on lui demande quelque chose.

import Phaser from 'phaser';
import type { Game } from '../game/state';
import { approach, DOORSTEP, GARDENER_OBSTACLES, route, type Point } from './route';

export type Tool = 'can' | 'hoe';

export interface Job {
  /** Une même chose (une trouvaille, l'arbre…) ne se demande qu'une fois. Sans clé : toujours ajoutée. */
  key?: string;
  /** Pied de la chose à toucher, relu au départ et à l'arrivée. null : elle est partie, on passe. */
  target(): Point | null;
  /** Outil en main, choisi juste avant d'agir (selon l'état de la case à ce moment-là). */
  tool?(): Tool | null;
  /** Au moment de partir vers la chose (le corgi s'arrête pour l'attendre). */
  start?(): void;
  /** L'action elle-même. false : on vide la file (plus de pièces, plus de graines…). */
  act(): boolean | void;
  /** Petit repère au sol tant que la tâche attend. */
  marker?: Phaser.GameObjects.Image;
}

type Mode = 'inside' | 'door' | 'idle' | 'walk' | 'work';
type Frame = 'front' | 'blink' | 'walkA' | 'walkB' | 'work';

const SPEED = 64; // pixels par seconde : assez vif pour une pause de 5 minutes
/** Sur le chemin, devant la porte. */
const FRONT_DOOR: Point = { x: 41, y: 74 };
const HOME_SPOT: Point = { x: 58, y: 76 };
/** Durée d'un geste : jusqu'à l'action, puis un petit temps avant la suite. */
const WORK_BEFORE = 260;
const WORK_AFTER = 200;
/** La nuit, sans rien à faire, il rentre se coucher au bout de ce temps. */
const BEDTIME_AFTER = 6000;

/** Position de la main dans le dessin de profil (tourné vers la gauche), par rapport aux pieds. */
const HAND = { x: -6, y: -10 };
const TOOL_ORIGIN: Record<Tool, [number, number]> = { can: [0.75, 0.2], hoe: [0.62, 0.38] };

export class Gardener {
  readonly img: Phaser.GameObjects.Image;
  private toolImg: Phaser.GameObjects.Image;
  private queue: Job[] = [];
  private current: Job | null = null;
  private mode: Mode = 'idle';
  private path: Point[] = [];
  private arrive: (() => void) | null = null;
  private frameClock = 0;
  private step: 'walkA' | 'walkB' = 'walkA';
  private idleClock = 0;
  private nextFidget = 2500;
  private pose: Frame = 'front';
  private poseTimer = 0;
  private retries = 0;
  private lastFrame = '';

  constructor(private scene: Phaser.Scene, private garden: Game, private baseDepth: number) {
    const start = garden.night ? FRONT_DOOR : HOME_SPOT;
    this.img = scene.add.image(start.x, start.y, 'gardener_front').setOrigin(0.5, 1);
    this.toolImg = scene.add.image(0, 0, 'tool_can').setVisible(false);
    if (garden.night) this.goInside(true);
  }

  /** Il a quelque chose à faire (ou est en train de le faire). */
  get busy(): boolean {
    return !!this.current || this.queue.length > 0;
  }

  has(key: string): boolean {
    return this.current?.key === key || this.queue.some((j) => j.key === key);
  }

  /** Nombre de tâches en attente dont la clé commence par `prefix`. */
  count(prefix: string): number {
    return [this.current, ...this.queue].filter((j) => j?.key?.startsWith(prefix)).length;
  }

  /** Ajoute une tâche à la file. false si la même chose est déjà demandée. */
  add(job: Job): boolean {
    if (job.key && this.has(job.key)) { job.marker?.destroy(); return false; }
    this.queue.push(job);
    if (this.mode === 'inside') this.comeOut();
    // Au repos, ou en train de rentrer se coucher : il s'y met tout de suite.
    else if (this.mode === 'idle' || (this.mode === 'walk' && !this.current)) this.next();
    return true;
  }

  /**
   * Oublie tout ce qui attend (plus de graines, plus de pièces…). Le geste en cours se termine ;
   * avec `stopWalking` (mode déco), il s'arrête aussi s'il était encore en chemin.
   */
  clear(stopWalking = false): void {
    for (const j of this.queue) j.marker?.destroy();
    this.queue = [];
    if (stopWalking && this.current && this.mode === 'walk') {
      this.current.marker?.destroy();
      this.current = null;
      this.path = [];
      this.arrive = null;
      this.rest();
    }
  }

  update(delta: number): void {
    this.frameClock += delta;
    switch (this.mode) {
      case 'walk': this.walk(delta); break;
      case 'idle': this.idle(delta); break;
      case 'inside':
        // Au matin, il ressort de lui-même.
        if (!this.garden.night) { this.idleClock += delta; if (this.idleClock > 2500) this.comeOut(); }
        break;
      default: break;
    }
    this.img.setDepth(this.baseDepth + this.img.y + 0.4);
    this.toolImg.setDepth(this.img.depth + 0.01);
  }

  // --- La file ---------------------------------------------------------------

  private next(): void {
    this.hideTool();
    const job = this.queue.shift() ?? null;
    this.current = job;
    if (!job) { this.rest(); return; }
    const target = job.target();
    if (!target) { this.drop(job); return; }
    job.start?.();
    this.retries = 0;
    const { at, face } = approach(target, this.here());
    this.goTo(at, () => this.work(job, face));
  }

  private drop(job: Job): void {
    job.marker?.destroy();
    this.current = null;
    this.next();
  }

  private work(job: Job, face: -1 | 1): void {
    const target = job.target();
    if (!target) { this.drop(job); return; }
    // La chose a bougé en chemin (le corgi) : on la rejoint, sans s'acharner.
    const again = approach(target, this.here());
    if (Phaser.Math.Distance.Between(again.at.x, again.at.y, this.img.x, this.img.y) > 8 && this.retries < 3) {
      this.retries++;
      this.goTo(again.at, () => this.work(job, again.face));
      return;
    }
    this.mode = 'work';
    this.img.setFlipX(face === 1);
    this.render('work');
    const tool = job.tool?.() ?? null;
    if (tool) this.showTool(tool);
    this.scene.time.delayedCall(WORK_BEFORE, () => {
      job.marker?.destroy();
      if (job.act() === false) this.clear();
      this.scene.time.delayedCall(WORK_AFTER, () => { this.current = null; this.next(); });
    });
  }

  // --- Déplacements ----------------------------------------------------------

  private here(): Point {
    return { x: this.img.x, y: this.img.y };
  }

  private goTo(target: Point, arrive: () => void): void {
    // Un petit geste du repos (s'étirer, sautiller) s'arrête net quand il se met en route.
    this.scene.tweens.killTweensOf(this.img);
    this.img.setScale(1);
    this.path = route(this.here(), target, GARDENER_OBSTACLES);
    this.arrive = arrive;
    this.mode = 'walk';
  }

  private walk(delta: number): void {
    const next = this.path[0];
    if (!next) {
      const done = this.arrive;
      this.arrive = null;
      if (done) done(); else this.rest();
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
    if (this.frameClock > 120) { this.frameClock = 0; this.step = this.step === 'walkA' ? 'walkB' : 'walkA'; }
    this.render(this.step);
  }

  // --- La cabane -------------------------------------------------------------

  /** Il sort de la cabane : il apparaît sur le seuil et descend sur le chemin. */
  private comeOut(): void {
    this.mode = 'door';
    this.img.setPosition(DOORSTEP.x, DOORSTEP.y).setAlpha(0).setVisible(true).setFlipX(false);
    this.render('front');
    this.scene.tweens.add({
      targets: this.img, y: FRONT_DOOR.y, alpha: 1, duration: 450, ease: 'Sine.easeOut',
      onComplete: () => { this.mode = 'idle'; this.idleClock = 0; this.next(); },
    });
  }

  private goInside(instant = false): void {
    this.hideTool();
    const vanish = () => {
      this.mode = 'door';
      this.render('front');
      this.scene.tweens.add({
        targets: this.img, y: DOORSTEP.y, alpha: 0, duration: instant ? 0 : 450, ease: 'Sine.easeIn',
        onComplete: () => {
          this.img.setVisible(false);
          this.mode = 'inside';
          this.idleClock = 0;
          if (this.queue.length) this.comeOut(); // on l'a appelé pendant qu'il rentrait
        },
      });
    };
    if (instant) { this.img.setPosition(FRONT_DOOR.x, FRONT_DOOR.y); vanish(); return; }
    this.goTo(FRONT_DOOR, vanish);
  }

  // --- Au repos --------------------------------------------------------------

  private rest(): void {
    this.mode = 'idle';
    this.idleClock = 0;
    this.pose = 'front';
    this.poseTimer = 0;
    this.nextFidget = 1500 + Math.random() * 3000;
    this.render('front');
  }

  private idle(delta: number): void {
    this.idleClock += delta;
    if (this.garden.night && this.idleClock > BEDTIME_AFTER) { this.goInside(); return; }
    if (this.poseTimer > 0) {
      this.poseTimer -= delta;
      if (this.poseTimer <= 0) this.pose = 'front';
    } else if (this.idleClock > this.nextFidget) {
      this.fidget();
      this.nextFidget = this.idleClock + 2500 + Math.random() * 4000;
    }
    this.render(this.pose);
  }

  /** Un petit geste : cligner des yeux, regarder à gauche ou à droite, s'étirer, sautiller. */
  private fidget(): void {
    const r = Math.random();
    if (r < 0.4) { this.pose = 'blink'; this.poseTimer = 150; }
    else if (r < 0.7) { this.pose = 'walkB'; this.poseTimer = 1200 + Math.random() * 1200; this.img.setFlipX(Math.random() < 0.5); }
    else if (r < 0.87) {
      this.scene.tweens.add({ targets: this.img, scaleY: 1.08, scaleX: 0.95, duration: 380, yoyo: true, hold: 250, ease: 'Sine.easeInOut' });
    } else {
      this.scene.tweens.add({ targets: this.img, y: this.img.y - 2, duration: 110, yoyo: true, repeat: 1 });
    }
  }

  // --- Dessin ------------------------------------------------------------------

  private render(frame: Frame): void {
    const key = `gardener_${frame}`;
    if (key !== this.lastFrame) { this.img.setTexture(key); this.lastFrame = key; }
  }

  private showTool(tool: Tool): void {
    const flip = this.img.flipX;
    const [ox, oy] = TOOL_ORIGIN[tool];
    const t = this.toolImg;
    this.scene.tweens.killTweensOf(t);
    t.setTexture(`tool_${tool}`).setFlipX(flip).setOrigin(flip ? 1 - ox : ox, oy).setAngle(0).setVisible(true);
    t.setPosition(this.img.x + (flip ? -HAND.x : HAND.x), this.img.y + HAND.y);
    const dir = flip ? -1 : 1;
    if (tool === 'can') this.scene.tweens.add({ targets: t, angle: -28 * dir, duration: 200, ease: 'Sine.easeOut' });
    else {
      t.setAngle(35 * dir);
      this.scene.tweens.add({ targets: t, angle: -10 * dir, duration: 160, delay: 60, ease: 'Quad.easeIn' });
    }
  }

  private hideTool(): void {
    this.scene.tweens.killTweensOf(this.toolImg);
    this.toolImg.setVisible(false);
  }
}
