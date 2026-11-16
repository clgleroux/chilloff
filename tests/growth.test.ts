import { describe, expect, it } from 'vitest';
import { HOUR, MINUTE, WET_DURATION } from '../src/game/config';
import { CROPS } from '../src/game/crops';
import { advancePlant, growthStage, isRipe, timeUntilRipe, type PlantState } from '../src/game/growth';

const T0 = new Date(2026, 10, 16, 12, 0).getTime();

function plant(id: PlantState['id'] = 'radish'): PlantState {
  return { id, progress: 0, updatedAt: T0, plantedAt: T0 };
}

describe('pousse en temps réel', () => {
  it('pousse à vitesse normale sans eau', () => {
    const p = plant('radish'); // 8 min
    advancePlant(p, 0, T0 + 4 * MINUTE);
    expect(p.progress).toBe(4 * MINUTE);
    expect(isRipe(p)).toBe(false);
    advancePlant(p, 0, T0 + 8 * MINUTE);
    expect(isRipe(p)).toBe(true);
  });

  it('pousse deux fois plus vite sur une case arrosée', () => {
    const p = plant('radish');
    advancePlant(p, T0 + WET_DURATION, T0 + 4 * MINUTE);
    expect(isRipe(p)).toBe(true);
  });

  it("ne compte le bonus que pendant que la terre est mouillée (même hors-ligne)", () => {
    const p = plant('pumpkin'); // 6 h
    // Arrosée 4 h, absence de 5 h : 4 h × 2 + 1 h = 9 h de progression.
    advancePlant(p, T0 + 4 * HOUR, T0 + 5 * HOUR);
    expect(p.progress).toBe(9 * HOUR);
  });

  it("ne recule jamais si l'horloge revient en arrière", () => {
    const p = plant();
    advancePlant(p, 0, T0 + 2 * MINUTE);
    advancePlant(p, 0, T0 + 1 * MINUTE);
    expect(p.progress).toBe(2 * MINUTE);
    advancePlant(p, 0, T0 + 2 * MINUTE);
    expect(p.progress).toBe(3 * MINUTE);
  });

  it('passe par les 4 stades', () => {
    const p = plant('lettuce');
    const g = CROPS.lettuce.growTime;
    expect(growthStage(p)).toBe(0);
    p.progress = g * 0.3;
    expect(growthStage(p)).toBe(1);
    p.progress = g * 0.7;
    expect(growthStage(p)).toBe(2);
    p.progress = g * 5; // une plante mûre attend sagement
    expect(growthStage(p)).toBe(3);
  });

  it('calcule le temps restant avec et sans arrosage', () => {
    const p = plant('tomato'); // 1 h
    expect(timeUntilRipe(p, 0, T0)).toBe(1 * HOUR);
    expect(timeUntilRipe(p, T0 + WET_DURATION, T0)).toBe(30 * MINUTE);
    // Arrosage qui ne couvre que 10 min : 10 min × 2 = 20 min de progression, reste 40 min.
    expect(timeUntilRipe(p, T0 + 10 * MINUTE, T0)).toBe(50 * MINUTE);
  });
});
