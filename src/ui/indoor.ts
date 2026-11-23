// Dans la maison : partagé entre la scène (la pièce, poser les meubles) et l'interface (barre des meubles, bouton Sortir).

import type { FurnitureId } from '../game/house';
import type { Game } from '../game/state';

class Indoor {
  /** La caméra montre l'intérieur de la maison. */
  active = false;
  /** Meuble « en main », prêt à être posé. */
  hand: FurnitureId | null = null;
  private listeners = new Set<() => void>();

  on(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  enter(): void {
    this.active = true;
    this.hand = null;
    this.emit();
  }

  /** Prend un meuble du stock en main (celui qu'on tenait retourne dans le stock). */
  take(game: Game, id: FurnitureId): void {
    if (this.hand) game.returnFurniture(this.hand);
    this.hand = game.takeFurniture(id) ? id : null;
    this.emit();
  }

  setHand(hand: FurnitureId | null): void {
    this.hand = hand;
    this.emit();
  }

  /** Repose le meuble en main dans le stock. */
  drop(game: Game): void {
    if (this.hand) game.returnFurniture(this.hand);
    this.setHand(null);
  }

  /** Sortir : le meuble en main retourne dans le stock. */
  leave(game: Game): void {
    if (this.hand) game.returnFurniture(this.hand);
    this.hand = null;
    this.active = false;
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const indoor = new Indoor();
