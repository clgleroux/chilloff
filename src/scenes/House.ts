// L'intérieur de la maison. La pièce est dessinée loin sous le jardin, hors de vue : la caméra s'y rend
// quand le jardinier passe la porte de la cabane (voir GardenScene). On y pose et déplace les meubles
// fabriqués à l'atelier : un toucher sur un meuble le prend en main, un toucher sur une case libre le pose,
// un toucher sur la porte ramène au jardin.
// Petits secrets (rien ne les annonce) : la nuit, le jardinier dort dans le lit s'il y en a un,
// et le corgi vient dormir sur le tapis ; le poêle et la lampe éclairent la pièce le soir.

import Phaser from 'phaser';
import { TILE } from '../game/config';
import { DOOR_COL, FLOOR_ROWS, FURNITURE, ROOM_COLS, ROOM_ROWS, WALL_ROW, roomSpotFits } from '../game/house';
import type { Season } from '../game/seasons';
import type { Game, PlacedFurniture } from '../game/state';
import { t } from '../i18n';
import { indoor } from '../ui/indoor';

/** Coin haut gauche de la pièce, en pixels du monde (bien en dessous du jardin et de sa forêt). */
export const HOUSE_X = 0;
export const HOUSE_Y = 40 * TILE;
export const ROOM_W = ROOM_COLS * TILE;
export const ROOM_H = ROOM_ROWS * TILE;

export interface HouseHooks {
  toast(message: string): void;
  pop(img: Phaser.GameObjects.Image): void;
  wiggle(img: Phaser.GameObjects.Image): void;
  zzz(x: number, y: number): void;
  /** On a touché la porte : retour au jardin. */
  leave(): void;
}

interface Depths { ground: number; soil: number; grid: number; objects: number; fx: number; light: number }

interface FurnitureView {
  img: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
}

/** Pied d'un meuble posé sur le plancher ; un cadre du mur est centré un peu au-dessus de la plinthe. */
function spotOf(d: { id: PlacedFurniture['id']; col: number; row: number }): { x: number; y: number; wall: boolean } {
  const x = HOUSE_X + d.col * TILE + TILE / 2;
  if (FURNITURE[d.id].spot === 'wall') return { x, y: HOUSE_Y + WALL_ROW * TILE + 2, wall: true };
  return { x, y: HOUSE_Y + (d.row + 1) * TILE, wall: false };
}

export class House {
  private roomImg: Phaser.GameObjects.Image;
  private dim: Phaser.GameObjects.Rectangle;
  private grid: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image;
  private gardenerImg: Phaser.GameObjects.Image;
  private corgiImg: Phaser.GameObjects.Image;
  private views = new Map<number, FurnitureView>();
  private season: Season;
  private night = false;
  private lightLevel = 0;

  constructor(private scene: Phaser.Scene, private garden: Game, private hooks: HouseHooks, private depths: Depths) {
    this.season = garden.season;
    // Tout autour de la pièce, l'ombre : on ne voit que l'intérieur.
    scene.add.rectangle(HOUSE_X - 40 * TILE, HOUSE_Y - 16 * TILE, ROOM_W + 80 * TILE, ROOM_H + 50 * TILE, 0x2a1d17)
      .setOrigin(0, 0).setDepth(depths.ground - 1);
    this.roomImg = scene.add.image(HOUSE_X, HOUSE_Y, `room_${this.season}_day`).setOrigin(0, 0).setDepth(depths.ground);
    this.dim = scene.add.rectangle(HOUSE_X, HOUSE_Y, ROOM_W, ROOM_H, 0x1a1a4a, 0).setOrigin(0, 0).setDepth(depths.fx - 10);
    this.grid = scene.add.graphics().setDepth(depths.grid);
    this.ghost = scene.add.image(0, 0, 'furn_chair').setOrigin(0.5, 1).setAlpha(0.7).setDepth(depths.fx).setVisible(false);

    const door = { x: HOUSE_X + DOOR_COL * TILE + TILE / 2, y: HOUSE_Y + (FLOOR_ROWS[1] + 1) * TILE };
    this.gardenerImg = scene.add.image(door.x, door.y - 2, 'gardener_front').setOrigin(0.5, 1).setDepth(depths.objects + door.y);
    this.corgiImg = scene.add.image(0, 0, 'corgi_none_sleep').setOrigin(0.5, 1).setVisible(false);

    // Le jardinier cligne des yeux de temps en temps, et un « z » s'envole de ceux qui dorment.
    scene.time.addEvent({
      delay: 2600, loop: true, callback: () => {
        if (!indoor.active) return;
        if (this.gardenerImg.visible) {
          this.gardenerImg.setTexture('gardener_blink');
          scene.time.delayedCall(150, () => this.gardenerImg.setTexture('gardener_front'));
        }
        const bed = this.sleepingBed();
        if (bed) this.hooks.zzz(bed.img.x + 2, bed.img.y - 20);
        if (this.corgiImg.visible) scene.time.delayedCall(900, () => this.hooks.zzz(this.corgiImg.x + 4, this.corgiImg.y - 10));
      },
    });
    indoor.on(() => this.onHandChanged());
  }

  /** Le centre de la pièce et sa taille, pour la caméra. */
  get center(): { x: number; y: number } {
    return { x: HOUSE_X + ROOM_W / 2, y: HOUSE_Y + ROOM_H / 2 };
  }

  setSeason(season: Season): void {
    this.season = season;
    this.updateRoom();
  }

  /** Le soir, la pièce s'assombrit un peu et les lumières s'allument. */
  setTime(night: boolean, lightLevel: number): void {
    this.night = night;
    this.lightLevel = lightLevel;
    this.dim.setFillStyle(0x1a1a4a, lightLevel >= 1 ? 0.3 : lightLevel > 0 ? 0.12 : 0);
    for (const v of this.views.values()) v.glow?.setAlpha(lightLevel * 0.9);
    this.updateRoom();
    this.refresh();
  }

  private updateRoom(): void {
    this.roomImg.setTexture(`room_${this.season}_${this.night ? 'night' : 'day'}`);
  }

  refresh(): void {
    const placed = this.garden.state.house.placed;
    const alive = new Set(placed.map((d) => d.uid));
    for (const [uid, v] of this.views) {
      if (alive.has(uid)) continue;
      v.img.destroy();
      v.glow?.destroy();
      this.views.delete(uid);
    }
    for (const d of placed) if (!this.views.has(d.uid)) this.views.set(d.uid, this.make(d));

    // La nuit, le jardinier dort dans le lit (s'il y en a un), et le corgi sur le tapis.
    const sleeping = this.garden.night;
    const bed = placed.find((d) => d.id === 'bed');
    for (const d of placed) {
      if (d.id !== 'bed') continue;
      this.views.get(d.uid)!.img.setTexture(sleeping && d === bed ? 'furn_bed_sleep' : 'furn_bed');
    }
    this.gardenerImg.setVisible(!(sleeping && bed));
    const rug = sleeping ? placed.find((d) => d.id === 'rug') : undefined;
    if (rug) {
      const at = spotOf(rug);
      const acc = this.garden.state.companion.accessory;
      this.corgiImg.setTexture(`corgi_${acc ?? 'none'}_sleep`).setPosition(at.x, at.y - 3)
        .setDepth(this.depths.objects + at.y + 0.2).setVisible(true);
    } else this.corgiImg.setVisible(false);
    if (indoor.hand) this.drawGrid();
  }

  private make(d: PlacedFurniture): FurnitureView {
    const def = FURNITURE[d.id];
    const at = spotOf(d);
    const img = this.scene.add.image(at.x, at.y, `furn_${d.id}`).setOrigin(0.5, at.wall ? 0.5 : 1);
    if (def.flat) img.setDepth(this.depths.soil);
    else img.setDepth(this.depths.objects + (at.wall ? HOUSE_Y + 2 * TILE : at.y));
    let glow: Phaser.GameObjects.Image | undefined;
    if (def.glow) {
      glow = this.scene.add.image(at.x, at.y - (d.id === 'lamp' ? 20 : 10), 'fx_glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.depths.light).setScale(d.id === 'stove' ? 1.3 : 0.9)
        .setAlpha(this.lightLevel * 0.9);
      this.scene.tweens.add({ targets: glow, scale: `+=0.1`, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.hooks.pop(img);
    return { img, glow };
  }

  private sleepingBed(): FurnitureView | undefined {
    for (const v of this.views.values()) if (v.img.texture.key === 'furn_bed_sleep') return v;
    return undefined;
  }

  // --- Toucher ---------------------------------------------------------------

  /** La case touchée ; le haut du mur compte comme le mur (là où pendent les cadres). */
  private tileAt(wx: number, wy: number): { col: number; row: number } {
    const row = Math.floor((wy - HOUSE_Y) / TILE);
    return { col: Math.floor((wx - HOUSE_X) / TILE), row: row === 0 ? WALL_ROW : row };
  }

  /** Un toucher dans la maison : la porte, un meuble à prendre, une case où poser celui qu'on tient. */
  tap(wx: number, wy: number): void {
    const { col, row } = this.tileAt(wx, wy);
    if (col === DOOR_COL && (row === ROOM_ROWS - 1 || row === FLOOR_ROWS[1])) { this.hooks.leave(); return; }
    const g = this.garden;
    const hand = indoor.hand;
    if (hand) {
      if (g.canPlaceFurniture(hand, col, row)) {
        g.placeFurniture(hand, col, row);
        // S'il en reste d'autres, on garde le même meuble en main pour continuer à poser.
        indoor.setHand(g.state.house.inventory[hand] && g.takeFurniture(hand) ? hand : null);
      } else if (g.furnitureAt(col, row)) {
        this.hooks.toast(t('house.occupied'));
      } else {
        this.hooks.toast(t('edit.cantPlace'));
      }
      return;
    }
    const picked = g.pickUpFurniture(col, row);
    if (picked) indoor.setHand(picked);
    else if (this.gardenerImg.visible && Math.abs(wx - this.gardenerImg.x) < 8 && wy < this.gardenerImg.y && wy > this.gardenerImg.y - 24) {
      this.hooks.wiggle(this.gardenerImg);
    }
  }

  /** Au survol (souris) : le meuble en main suit le pointeur, rouge là où il ne tient pas. */
  hover(wx: number, wy: number): void {
    const hand = indoor.hand;
    if (!hand) { this.ghost.setVisible(false); return; }
    const { col, row } = this.tileAt(wx, wy);
    if (col < 0 || col >= ROOM_COLS || row < 0 || row >= ROOM_ROWS) { this.ghost.setVisible(false); return; }
    const at = spotOf({ id: hand, col, row });
    this.ghost.setTexture(`furn_${hand}`).setOrigin(0.5, at.wall ? 0.5 : 1).setPosition(at.x, at.y).setVisible(true);
    this.ghost.setTint(this.garden.canPlaceFurniture(hand, col, row) ? 0xffffff : 0xff7a7a);
  }

  private onHandChanged(): void {
    if (indoor.hand) this.drawGrid();
    else { this.grid.clear(); this.ghost.setVisible(false); }
  }

  /** Les cases où le meuble en main peut aller. */
  private drawGrid(): void {
    const g = this.grid;
    g.clear();
    const hand = indoor.hand;
    if (!hand) return;
    for (let row = 0; row < ROOM_ROWS; row++) {
      for (let col = 0; col < ROOM_COLS; col++) {
        if (!roomSpotFits(FURNITURE[hand].spot, col, row) || this.garden.furnitureAt(col, row)) continue;
        g.fillStyle(0xffffff, 0.2).fillRect(HOUSE_X + col * TILE + 1, HOUSE_Y + row * TILE + 1, TILE - 2, TILE - 2);
      }
    }
  }
}
