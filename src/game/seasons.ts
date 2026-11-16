// Les saisons suivent le vrai calendrier (hémisphère nord, saisons météorologiques).

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** Mois (0 = janvier) de début de chaque saison. */
const SEASON_START_MONTH: Record<Season, number> = {
  spring: 2, // mars
  summer: 5, // juin
  autumn: 8, // septembre
  winter: 11, // décembre
};

export function getSeason(date: Date): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export function nextSeason(season: Season): Season {
  return SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length];
}

/** Nombre de jours (entiers, ≥ 1) avant le début de la saison suivante. */
export function daysUntilNextSeason(date: Date): number {
  const next = nextSeason(getSeason(date));
  const startMonth = SEASON_START_MONTH[next];
  let year = date.getFullYear();
  if (startMonth <= date.getMonth()) year += 1;
  const start = new Date(year, startMonth, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.round((start.getTime() - today.getTime()) / 86_400_000));
}

/** Clé de jour local (AAAA-MM-JJ), pour compter les jours joués. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** La nuit (et les visiteurs nocturnes) : de 20 h à 7 h. */
export function isNight(date: Date): boolean {
  const h = date.getHours();
  return h >= 20 || h < 7;
}
