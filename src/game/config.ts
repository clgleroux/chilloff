// Réglages globaux du jeu. Toutes les durées sont en millisecondes.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** Taille d'une case en pixels (avant zoom). */
export const TILE = 16;

/** Le monde visible : 12 × 13 cases. */
export const WORLD_COLS = 12;
export const WORLD_ROWS = 13;

/** Le potager : 6 × 6 cases, placé dans le monde à partir de cette case. */
export const PLOT_COLS = 6;
export const PLOT_ROWS = 6;
export const PLOT_ORIGIN = { col: 3, row: 5 } as const;

/** Cases défrichées au départ (indices dans le potager) : les 2 rangées du milieu, 4 colonnes centrales. */
export const STARTING_TILLED: ReadonlyArray<[col: number, row: number]> = [
  [1, 2], [2, 2], [3, 2], [4, 2],
  [1, 3], [2, 3], [3, 3], [4, 3],
];

/** Une case arrosée le reste 4 h ; pendant ce temps la plante pousse 2× plus vite. */
export const WET_DURATION = 4 * HOUR;
export const WET_SPEED_MULTIPLIER = 2;

export const STARTING_COINS = 20;
export const STARTING_SEEDS = 6;

/** Prix pour défricher une nouvelle case : augmente doucement avec la taille du potager. */
export function tillCost(tilledCount: number): number {
  return 10 + Math.max(0, tilledCount - STARTING_TILLED.length) * 4;
}

/** Au-delà de cette absence, on affiche un petit « bon retour ». */
export const WELCOME_BACK_AFTER = 5 * MINUTE;

// --- Le jardin vivant ---------------------------------------------------------

/** Cueillette : une trouvaille apparaît toutes les 2 à 4 min, 5 au maximum dans l'herbe. */
export const FORAGE_MAX = 5;
export const FORAGE_INTERVAL: [number, number] = [2 * MINUTE, 4 * MINUTE];
/** Trouvailles déjà présentes au tout début d'une partie. */
export const FORAGE_AT_START = 4;

/** Visiteurs : un nouveau toutes les 2 à 5 min, 3 au maximum, ils restent 20 à 40 min. */
export const VISITOR_MAX = 3;
export const VISITOR_INTERVAL: [number, number] = [2 * MINUTE, 5 * MINUTE];
export const VISITOR_STAY: [number, number] = [20 * MINUTE, 40 * MINUTE];
/** Après la première rencontre, un visiteur laisse un cadeau une fois sur deux environ. */
export const VISITOR_GIFT_CHANCE = 0.6;

/** Courrier : une nouvelle lettre 3 à 6 min après avoir répondu à la précédente. Jamais de délai pour répondre. */
export const LETTER_DELAY: [number, number] = [3 * MINUTE, 6 * MINUTE];
export const LETTER_SKIP_DELAY = 2 * MINUTE;

/** Secouer l'arbre fait tomber une brindille, au plus toutes les 4 min. */
export const TREE_SHAKE_COOLDOWN = 4 * MINUTE;
