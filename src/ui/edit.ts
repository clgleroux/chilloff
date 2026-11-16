// Mode déco partagé entre la scène (poser, déplacer) et l'interface (bandeau, bouton Terminé).

import type { DecoId } from '../game/decor';

class EditMode {
  active = false;
  /** Déco « en main », prête à être posée. */
  hand: DecoId | null = null;
  private listeners = new Set<() => void>();

  on(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  start(hand: DecoId | null = null): void {
    this.active = true;
    this.hand = hand;
    this.emit();
  }

  setHand(hand: DecoId | null): void {
    this.hand = hand;
    this.emit();
  }

  /** L'appelant remet d'abord la déco en main dans l'inventaire. */
  stop(): void {
    this.active = false;
    this.hand = null;
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const edit = new EditMode();
