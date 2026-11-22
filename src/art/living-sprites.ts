// Pixel art du jardin vivant : matériaux de cueillette, décorations, visiteurs, boîte aux lettres.
// Même convention que sprites.ts : 1 caractère = 1 pixel, '.' = transparent, chaque dessin a sa palette.

import type { DecoId } from '../game/decor';
import type { MaterialId } from '../game/materials';
import type { VisitorId } from '../game/visitors';

export interface PixelSprite {
  rows: string[];
  palette: Record<string, string>;
}

const E = '.'.repeat(16);
const K = '#3b2a35';

/** Complète par le haut jusqu'à `h` lignes, avec `bottom` lignes vides en bas. */
function pad(rows: string[], h: number, bottom = 1): string[] {
  const out = [...rows];
  for (let i = 0; i < bottom; i++) out.push(E);
  while (out.length < h) out.unshift(E);
  return out;
}

// ---------------------------------------------------------------------------
// Matériaux (16×16)

export const MATERIAL_SPRITES: Record<MaterialId, PixelSprite> = {
  twig: {
    palette: { k: K, b: '#b07848', B: '#7a4a2e', l: '#c89a64', g: '#6cc45a', G: '#3f8a3e' },
    rows: pad([
      '............kk..',
      '...........klBk.',
      '..........kbBk..',
      '.....kk..kbBk...',
      '....kggkkbBk....',
      '....kgGkbBk.....',
      '.....kkbBk......',
      '.....kbBk.......',
      '....kbBk........',
      '...kbBk.........',
      '..kbBk..........',
      '..kBk...........',
      '...k............',
    ], 16),
  },
  pebble: {
    palette: { k: K, w: '#e4e4ee', g: '#aeaebe', G: '#7e7e92' },
    rows: pad([
      '......kkkk......',
      '....kkwggggk....',
      '...kwwgggggGk...',
      '...kwggggggGGk..',
      '..kgggggggGGGk..',
      '..kGgggggGGGGk..',
      '...kGGGGGGGGk...',
      '....kkkkkkkk....',
    ], 16, 2),
  },
  daisy: {
    palette: { k: K, w: '#ffffff', y: '#ffe27a', Y: '#f5b41f', g: '#6cc45a', G: '#3f8a3e' },
    rows: pad([
      '......kwwk......',
      '...kk.kwwk.kk...',
      '..kwwkkyykkwwk..',
      '..kwwkyYYykwwk..',
      '...kkkyYYykkk...',
      '...kwwkyykwwk...',
      '...kwwkkkkwwk...',
      '....kk.kgk.kk...',
      '.......kgk......',
      '.....kgGkgk.....',
      '......kkkgk.....',
      '........kk......',
    ], 16, 2),
  },
  feather: {
    palette: { k: K, w: '#ffffff', b: '#a8d0f0', S: '#8a6a5a' },
    rows: pad([
      '............kk..',
      '...........kwwk.',
      '..........kwwbk.',
      '.........kwwbbk.',
      '........kwwbbk..',
      '.......kwwbbk...',
      '......kwwbbk....',
      '.....kwwbbk.....',
      '....kwbbbk......',
      '...kwbbk........',
      '..kSkk..........',
      '.kSk............',
      'kSk.............',
    ], 16, 2),
  },
  mushroom: {
    palette: { k: K, r: '#e0443a', R: '#a82a2a', w: '#fff6e2', c: '#f6e7c8', C: '#d8c4a0' },
    rows: pad([
      '......kkkk......',
      '....kkrrrrkk....',
      '...krrwrrrrrk...',
      '..krwwrrrwrrRk..',
      '..krrrrrwwrRRk..',
      '..kRrrrrrrRRRk..',
      '...kkkkkkkkkk...',
      '.....kcccck.....',
      '.....kccCck.....',
      '.....kcccCk.....',
      '....kkcCCCkk....',
      '.....kkkkkk.....',
    ], 16, 2),
  },
  pinecone: {
    palette: { k: K, b: '#c08a52', B: '#7a4a2e' },
    rows: pad([
      '.......kk.......',
      '.....kkbbkk.....',
      '....kbBkkbBk....',
      '....kBbBbBbk....',
      '...kbBkbBkbBk...',
      '...kBbBbBbBbk...',
      '...kbBkbBkbBk...',
      '....kBbBbBbk....',
      '....kbBkbBkk....',
      '.....kBbBbk.....',
      '......kkkk......',
    ], 16, 2),
  },
};

// ---------------------------------------------------------------------------
// Décorations (16×16, ou 16×24 pour les hautes)

const PUMPKIN = { k: K, f: '#ffb04a', F: '#f07a1a', R: '#a84a10', a: '#6b8f2a', y: '#fff1a8' };

export const DECO_SPRITES: Record<DecoId, PixelSprite> = {
  stepstone: {
    palette: { k: K, w: '#ece8e0', g: '#c8c2b4', G: '#9e988c' },
    rows: [
      E, E, E,
      '.....kkkk.......',
      '....kwggGk......',
      '....kgggGk......',
      '.....kkkk.......',
      E,
      '.........kkkk...',
      '........kwggGk..',
      '........kgggGk..',
      '.........kkkk...',
      '..kkkk..........',
      '.kwggGk.........',
      '.kgGGGk.........',
      '..kkkk..........',
    ],
  },
  birdhouse: {
    palette: { k: K, r: '#c45a3e', R: '#8a3a2c', w: '#dcb47e', b: '#c89a64', B: '#a8784a' },
    rows: pad([
      '.......kk.......',
      '......krrk......',
      '.....krrrRk.....',
      '....krrrrRRk....',
      '...krrrrrRRRk...',
      '..kkkkkkkkkkkk..',
      '...kwwwwwwwBk...',
      '...kwbbkkbbBk...',
      '...kwbbkkbbBk...',
      '...kwbbbbbbBk...',
      '...kwbbbbbbBk...',
      '...kkkkkkkkkk...',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '.....kkbBkk.....',
      '.....kbbBBk.....',
      '.....kkkkkk.....',
    ], 24),
  },
  flowerbed: {
    palette: { k: K, p: '#ffc0d8', P: '#f07aa8', y: '#ffe27a', Y: '#f5b41f', g: '#6cc45a', G: '#3f8a3e', w: '#d48a6a', b: '#b4664a', B: '#8a4a38', m: '#6e4228', M: '#4a2c1c' },
    rows: pad([
      '...kk...kk...kk.',
      '..kpPk.kyYk.kpPk',
      '...gg...gg...gg.',
      '..gGg..gGg..gGg.',
      'kkkkkkkkkkkkkkkk',
      'kwwwwwwwwwwwwwwk',
      'kbmmmmmmmmmmmmbk',
      'kbmMmmMmmmMmmMbk',
      'kBBBBBBBBBBBBBBk',
      'kkkkkkkkkkkkkkkk',
    ], 16),
  },
  bench: {
    palette: { k: K, w: '#d8a870', b: '#b07848', B: '#7a5232' },
    rows: pad([
      'kkkkkkkkkkkkkkkk',
      'kwwwwwwwwwwwwwwk',
      'kbbbbbbbbbbbbbbk',
      'kkkkkkkkkkkkkkkk',
      'kBk..........kBk',
      'kkkkkkkkkkkkkkkk',
      'kwwwwwwwwwwwwwwk',
      'kbbbbbbbbbbbbbbk',
      'kkkkkkkkkkkkkkkk',
      '.kBk........kBk.',
      '.kkk........kkk.',
    ], 16),
  },
  lantern: {
    palette: { k: K, d: '#4a4a5a', D: '#2e2e3a', y: '#ffd27a', Y: '#f5b41f', w: '#fff6d0' },
    rows: pad([
      '.......kk.......',
      '......kkkk......',
      '.....kddddk.....',
      '....kkddddkk....',
      '....kyyyyyyk....',
      '....kywyyyYk....',
      '....kywyyyYk....',
      '....kyyyyYYk....',
      '....kkddddkk....',
      '.....kddddk.....',
      '......kdDk......',
      '......kdDk......',
      '......kdDk......',
      '......kdDk......',
      '......kdDk......',
      '......kdDk......',
      '......kdDk......',
      '....kkddDDkk....',
      '....kkkkkkkk....',
    ], 24),
  },
  pond: {
    palette: { k: K, s: '#b8b8c4', S: '#8a8a98', b: '#5fa8d8', B: '#3f7ab4', w: '#bfe3ff', g: '#6cc45a', G: '#2f7a3c' },
    rows: pad([
      '....ssssssss....',
      '..sskkkkkkkkss..',
      '.skbbbwbbbbbbks.',
      'skbbwwbbbbgGbbks',
      'skbbbbbbbbGgbbks',
      'skBbbbbbbbbbbBks',
      'skBBbbbbbbbbBBks',
      '.skBBBbbbbBBBks.',
      '..sskkkkkkkkss..',
      '....SSSSSSSS....',
    ], 16),
  },
  daisypot: {
    palette: { k: K, w: '#ffffff', y: '#ffe27a', g: '#6cc45a', u: '#e89a6a', t: '#d47a4a', T: '#a8543a' },
    rows: pad([
      '...kk.....kk....',
      '..kwwk.kk.kwwk..',
      '..kwykkwwkkywk..',
      '...kkkwyywkkk...',
      '....g.kwwk.g....',
      '....g..kk..g....',
      '....gg.gg.gg....',
      '...kkkkkkkkkk...',
      '...kuuuuuuuuk...',
      '....kttttttk....',
      '....kttttTTk....',
      '....kttttTTk....',
      '.....kTTTTk.....',
      '.....kkkkkk.....',
    ], 16),
  },
  scarecrow: {
    palette: { k: K, h: '#a8844a', H: '#7a5a2a', f: '#a8d0f0', s: '#ecd4a4', S: '#c8a878', b: '#5a8ac4', B: '#3f6a9e', w: '#a8744c' },
    rows: pad([
      '.....kkkkkk.....',
      '.....khhhhkf....',
      '...kkkhhhHkkk...',
      '..khhhhhhhhHHk..',
      '...kkkkkkkkkk...',
      '....kssssssk....',
      '....kskssksk....',
      '....ksssSSSk....',
      '....kskkkkSk....',
      '.....kssSSk.....',
      'kwwwkbbbbbbkwwwk',
      'kkkkbBbbbbBbkkkk',
      '...kbBbbbbBbk...',
      '...kbbBbbBbbk...',
      '...kkbbbbbbkk...',
      '.....kkwwkk.....',
      '......kwwk......',
      '......kwwk......',
      '......kwwk......',
      '.....kkwwkk.....',
      '....kkkkkkkk....',
    ], 24),
  },
  leafpile: {
    palette: { k: K, o: '#ffb04a', O: '#e86a1a', r: '#c4602a', R: '#a83a1a', y: '#ffd27a' },
    rows: pad([
      '......kkkk......',
      '....kkoOrokk....',
      '...koOyoOrOok...',
      '..kOoryOooOryk..',
      '.koOrOoyOrOoOrk.',
      '.kRoOrOoRoOyrOk.',
      'kRrOoRrOoOrRoORk',
      'kkkkkkkkkkkkkkkk',
    ], 16),
  },
  jackolantern: {
    palette: PUMPKIN,
    rows: pad([
      '.......kk.......',
      '......kak.......',
      '...kkkkakkkkk...',
      '..kffkfFfkfFFk..',
      '.kfFFkFFFkFFRRk.',
      '.kFyyFFFFFyyFRk.',
      '.kFFFFFyFFFFRRk.',
      '.kFyFyFyFyFyRRk.',
      '.kFFyyyyyyyFRRk.',
      '..kRRRRRRRRRRk..',
      '...kkkkkkkkkk...',
    ], 16),
  },
  snowman: {
    palette: { k: K, d: '#4a3a4a', w: '#ffffff', W: '#d0deec', o: '#f07a1a', b: '#7a4a2e', r: '#e0443a' },
    rows: pad([
      '.....kkkkkk.....',
      '.....kddddk.....',
      '....kkkkkkkk....',
      '....kwwwwwwk....',
      '...kwwkwwkwWk...',
      '...kwwwwoowWk...',
      '...kwWwwwwWWk...',
      '....krrrrrrk....',
      '.b..kwwwwwWk..b.',
      '..bkwwwwwwwWkb..',
      '..kwwwwwkwwwWk..',
      '.kwwwwwwwwwwWWk.',
      '.kwwwwwwkwwwWWk.',
      '.kwwwwwwwwwWWWk.',
      '.kWwwwwwwwWWWWk.',
      '..kWWWWWWWWWWk..',
      '...kkkkkkkkkk...',
    ], 24),
  },
};

// ---------------------------------------------------------------------------
// Visiteurs (16×16, le pied en bas du dessin)

const BIRD = [
  '....kkk.........',
  '...kbbBk........',
  '..ykbkbBkkkk....',
  '...kccbBBbbBk...',
  '...kcccbBbBBBk..',
  '....kcccBBBk.kk.',
  '.....kkkkkk.....',
  '......y..y......',
];

export const VISITOR_SPRITES: Record<VisitorId, PixelSprite> = {
  sparrow: { palette: { k: K, b: '#a8744c', B: '#7a4a2e', c: '#f0d8b0', y: '#f5b41f' }, rows: pad(BIRD, 16) },
  robin: { palette: { k: K, b: '#9a7a5a', B: '#6a4e36', c: '#f07a3a', y: '#f5b41f' }, rows: pad(BIRD, 16) },
  bluetit: { palette: { k: K, b: '#5a9ad8', B: '#3f6ab4', c: '#ffe27a', y: '#3b2a35' }, rows: pad(BIRD, 16) },
  squirrel: {
    palette: { k: K, o: '#e8892a', O: '#c4602a', c: '#f6e0c0' },
    rows: pad([
      '..k.k...........',
      '.kokok.....kkk..',
      'kooooOk...kOOOk.',
      'kokooOk...kOooOk',
      'koooOOkk.kOooOOk',
      '.kccOOOOkkOoOOk.',
      '..kcccOOOOOOOk..',
      '..kcccOOOOOOk...',
      '...kccOOOOOk....',
      '...kOkkkkOOk....',
      '...kk....kk.....',
    ], 16),
  },
  owl: {
    palette: { k: K, b: '#8a6a4a', B: '#5a4030', c: '#d8b890', w: '#f6e7c8', y: '#ffd75a' },
    rows: pad([
      '...kk......kk...',
      '...kbk....kbk...',
      '...kbbkkkkbbk...',
      '..kbwwwbbwwwbk..',
      '..kbwkybbykwbk..',
      '..kbwwwbbwwwbk..',
      '..kbbbbyybbbbk..',
      '..kbcBcbbcBcbk..',
      '..kbcccBBcccbk..',
      '..kbBcccccBcbk..',
      '...kbcBccBcbk...',
      '....kbbbbbbk....',
      '....kykkkkyk....',
    ], 16),
  },
  rabbit: {
    palette: { k: K, w: '#e8dcc8', W: '#b8a890', p: '#f0a0b0' },
    rows: pad([
      '....kk..kk......',
      '...kwpk.kwpk....',
      '...kwpk.kwpk....',
      '...kwwkkkwwk....',
      '..kwwwwwwwwwk...',
      '..kwkwwwwkwwk...',
      '..kwwwppwwwwk...',
      '...kwwwwwwwk....',
      '..kwwwwwwwwwkk..',
      '.kwwwwwwwwwwwWk.',
      '.kwwwwwwwwwwWWk.',
      '.kwwwwwwwwwWWWk.',
      '..kwwkkkkkwWWk..',
      '..kkk.....kkk...',
    ], 16),
  },
  butterfly: {
    palette: { k: K, p: '#ffd75a', P: '#f5a01f', y: '#ffffff', b: '#3b2a35' },
    rows: pad([
      '......k..k......',
      '.kkk...kk...kkk.',
      'kpPpk..kk..kpPpk',
      'kpyPpkkbbkkpPypk',
      'kpPPppkbbkppPPpk',
      '.kppPPkbbkPPppk.',
      '..kkpPkbbkPpkk..',
      '..kpPpkbbkpPpk..',
      '..kpypkkkkpypk..',
      '...kkk....kkk...',
      E, E,
    ], 16),
  },
  frog: {
    palette: { k: K, g: '#6cc45a', G: '#3f8a3e', l: '#d4f0a0', w: '#ffffff' },
    rows: pad([
      '...kk......kk...',
      '..kwkk....kkwk..',
      '..kkgGkkkkGgkk..',
      '.kgggggggggggGk.',
      '.kgkkkkkkkkkgGk.',
      'kgglllllllllgGGk',
      'kgGlllllllllgGGk',
      '.kgGGggggggGGGk.',
      'kgGk.kkkkkk.kGgk',
      'kkkk........kkkk',
    ], 16),
  },
  hedgehog: {
    palette: { k: K, s: '#8a6a4a', S: '#5a4030', c: '#e8c8a0' },
    rows: pad([
      '......kkkkk.....',
      '....kkSsSsSkk...',
      '...kSsSsSsSsSk..',
      '..kcSsSsSsSsSsk.',
      '.kccckSsSsSsSsk.',
      'kkcckcSsSsSsSsk.',
      '.kccccSsSsSsSk..',
      '..kkckkkkkkckk..',
    ], 16),
  },
  cat: {
    palette: { k: K, g: '#a0a0b0', G: '#6a6a7e', w: '#ececf4', e: '#8ad06a', p: '#f0a0b0' },
    rows: pad([
      '...kk...kk......',
      '...kgk.kgk......',
      '...kgkkkgk......',
      '..kgggggggk.....',
      '..kgegggegk.....',
      '..kggwpwggk.....',
      '...kgwwwgk......',
      '...kgggggk......',
      '..kgggwgggk.....',
      '..kggwwwggk..kk.',
      '..kggwwwggk.kGk.',
      '..kgGwwwGgkkGk..',
      '..kGGkkkGGGGk...',
      '...kkk..kkkk....',
    ], 16),
  },
  firefly: {
    palette: { k: K, w: '#d8f0ff', y: '#f0ff8a', Y: '#b8e84a' },
    rows: pad([
      '......k.k.......',
      '.....wkkkw......',
      '....wwkkkww.....',
      '.....wkykw......',
      '......yYy.......',
      '.......y........',
      E, E,
    ], 16),
  },
};

// ---------------------------------------------------------------------------
// Boîte aux lettres (16×24) : drapeau levé quand une lettre attend.

const MAILBOX_PALETTE = { k: K, w: '#8ab4e8', b: '#5a8ac4', B: '#3f6a9e', r: '#e0443a', p: '#a8744c', P: '#7a4a2e' };
const MAILBOX_POST = [
  '......kpPk......',
  '......kpPk......',
  '......kpPk......',
  '......kpPk......',
  '......kpPk......',
  '......kpPk......',
  '.....kkpPkk.....',
  '.....kkkkkk.....',
];

export const MAILBOX_SPRITES: Record<'up' | 'down', PixelSprite> = {
  up: {
    palette: MAILBOX_PALETTE,
    rows: pad([
      '....kkkkkk......',
      '...kwwwwwwk.....',
      '..kwbbbbbbBk.kk.',
      '..kwbbbbbbBk.krk',
      '..kwbbbbbbBkkrrk',
      '..kwbbbbbbBk.kk.',
      '..kwbbbbbbBk.k..',
      '..kBBBBBBBBk.k..',
      '..kkkkkkkkkk....',
      ...MAILBOX_POST,
    ], 24),
  },
  down: {
    palette: MAILBOX_PALETTE,
    rows: pad([
      '....kkkkkk......',
      '...kwwwwwwk.....',
      '..kwbbbbbbBk....',
      '..kwbbbbbbBk....',
      '..kwbbbbbbBk....',
      '..kwbbbbbbBk....',
      '..kwbbbbbbBkkkkk',
      '..kBBBBBBBBkrrrk',
      '..kkkkkkkkkkkkkk',
      ...MAILBOX_POST,
    ], 24),
  },
};

// ---------------------------------------------------------------------------
// Icônes d'interface et petits effets

export const EXTRA_UI_ICONS: Record<'letter' | 'hammer' | 'paw', PixelSprite> = {
  letter: {
    palette: { k: K, w: '#fff6e2', W: '#e8d3a8', r: '#e0443a' },
    rows: [
      E, E, E,
      '.kkkkkkkkkkkkkk.',
      '.kwkwwwwwwwwkwk.',
      '.kwwkwwwwwwkwwk.',
      '.kwwwkwwwwkwwwk.',
      '.kwwwwkrrkwwwwk.',
      '.kwwwwwrrwwwwwk.',
      '.kwwwwwwwwwwwwk.',
      '.kWWWWWWWWWWWWk.',
      '.kkkkkkkkkkkkkk.',
      E, E, E, E,
    ],
  },
  hammer: {
    palette: { k: K, g: '#d0d0e0', G: '#8888a0', b: '#c89a64', B: '#8a5a34' },
    rows: [
      E,
      '...kkkkkkkk.....',
      '..kggggggGGk....',
      '..kgGGGGGGGk....',
      '...kkkkbkkk.....',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kbBk......',
      '......kBBk......',
      '......kkkk......',
      E, E,
    ],
  },
  paw: {
    palette: { k: K, p: '#c8a07a', P: '#9a7452' },
    rows: [
      E, E,
      '....kk....kk....',
      '...kppk..kppk...',
      '...kpPk..kpPk...',
      '.kk.kk.kk.kk.kk.',
      'kppk..kppk..kppk',
      'kpPk..kpPk..kpPk',
      '.kk..kkkkkk..kk.',
      '....kppppppk....',
      '...kppppppPPk...',
      '...kpppppPPPk...',
      '....kPPPPPPk....',
      '.....kkkkkk.....',
      E, E,
    ],
  },
};

export const HEART: PixelSprite = {
  palette: { r: '#ff6a8a', R: '#d83a5a', w: '#ffffff' },
  rows: ['.rr.rr.', 'rwrrrrR', 'rrrrrrR', '.rrrrR.', '..rRR..', '...R...'],
};

export const LEAF_BITS: Record<string, string> = {
  spring: '#9be06a', summer: '#5aa34a', autumn: '#f07a1a', winter: '#ffffff',
};

// ---------------------------------------------------------------------------
// Le compagnon : un corgi (dessiné tourné vers la gauche, retourné par la scène).

export type CorgiFrame = 'walkA' | 'walkB' | 'sleep';

export const CORGI_PALETTE: Record<string, string> = {
  k: K, o: '#e8892a', O: '#c4602a', c: '#fff1dc', C: '#e8d4b8', p: '#f0a0b0',
};

const CORGI_TOP = [
  E, E,
  '..k...k.........',
  '.kpk.kpk........',
  '.koookook.......',
  'koooooooOk......',
  'kokoooooOkkkkkk.',
  'kcccooooOoooooOk',
  'kccccoooooooooOk',
  '.kcccccooooooOOk',
  '..kccccccccccOk.',
  '...kkccccccckk..',
];

export const CORGI_FRAMES: Record<CorgiFrame, string[]> = {
  walkA: [...CORGI_TOP, '...kOk...kOk....', '...kkk...kkk....', E, E],
  walkB: [...CORGI_TOP, '....kOk.kOk.....', '....kkk.kkk.....', E, E],
  sleep: [
    E, E, E, E, E, E, E,
    '..k...k.........',
    '.kpk.kpk........',
    '.koookookkkkkk..',
    'kooooooooooooOOk',
    'kokkoooooooooOOk',
    'kccccooooooooOOk',
    '.kccccccccccccCk',
    '..kkkkkkkkkkkkk.',
    E,
  ],
};

export interface AccessorySprite extends PixelSprite {
  /** Coin haut-gauche de l'accessoire dans le dessin du corgi, debout et couché. */
  anchor: { walk: [number, number]; sleep: [number, number] };
}

export const ACCESSORY_SPRITES: Record<'bandana' | 'bow' | 'strawhat' | 'flowercrown' | 'scarf', AccessorySprite> = {
  bandana: {
    palette: { r: '#e0443a', R: '#a82a2a' },
    rows: ['rrrrrr', '.rRrr.', '..rr..'],
    anchor: { walk: [5, 9], sleep: [5, 12] },
  },
  bow: {
    palette: { p: '#ff8ab4', P: '#e0507a', k: K },
    rows: ['pP.Pp', 'PPkPP', 'pP.Pp'],
    anchor: { walk: [2, 3], sleep: [2, 8] },
  },
  strawhat: {
    palette: { y: '#f0d27a', Y: '#d8b050', r: '#c4503a', k: K },
    rows: ['..kkkkk..', '.kyYYYyk.', 'kkrrrrrkk', 'yyyyyyyyy'],
    anchor: { walk: [0, 1], sleep: [0, 6] },
  },
  flowercrown: {
    palette: { p: '#ff8ab4', w: '#ffffff', y: '#ffe27a', g: '#5bb44a' },
    rows: ['p.w.y.p', 'gpgwgyg'],
    anchor: { walk: [1, 3], sleep: [1, 8] },
  },
  scarf: {
    palette: { b: '#5a8ac4', B: '#3f6a9e', w: '#ffffff' },
    rows: ['bwbwbwb', 'BbwbwbB', '..bw...', '..wb...'],
    anchor: { walk: [4, 8], sleep: [4, 11] },
  },
};

export const ZZZ: PixelSprite = { palette: { z: '#d8f0ff' }, rows: ['zzzz', '..z.', '.z..', 'zzzz'] };

export const HOLE: PixelSprite = {
  palette: { d: '#6e4228', D: '#3e2418' },
  rows: ['.dddddddd.', 'dDDDDDDDDd', 'dDDDDDDDDd', '.dddddddd.'],
};

/** Petite coche verte : la lettre peut être donnée. */
export const CHECK_BADGE: PixelSprite = {
  palette: { k: K, g: '#5aa34a', w: '#ffffff' },
  rows: ['.kkkk.', 'kggggk', 'kgggwk', 'kwgwgk', 'kgwggk', '.kkkk.'],
};

// ---------------------------------------------------------------------------
// Le jardinier (16×24) : de face au repos, de profil (tourné vers la gauche, retourné par la scène)
// quand il marche ou travaille. Chapeau de paille et salopette.

export type GardenerFrame = 'front' | 'blink' | 'walkA' | 'walkB' | 'work';

export const GARDENER_PALETTE: Record<string, string> = {
  k: K, y: '#f0d27a', Y: '#d8b050', r: '#c4503a', h: '#7a4a2e', s: '#f2c49a', S: '#d89a70', e: K,
  p: '#f0a0b0', w: '#fff1dc', b: '#5a8ac4', B: '#3f6a9e', d: '#6e4228',
};

const HAT = [
  E, E,
  '......kkkk......',
  '.....kyYYyk.....',
  '....kyyYYyyk....',
  '...kkrrrrrrkk...',
  '.kyyyyyyyyyyyyk.',
];

const FRONT_BODY = [
  '....kpsssspk....',
  '.....kssssk.....',
  '...kkwwSSwwkk...',
  '..kwwbwwwwbwwk..',
  '..kwwbbbbbbwwk..',
  '..kwkbbbbbbkwk..',
  '..kskbbbbbbksk..',
  '...kkbbbbbbkk...',
  '....kbbbbbbk....',
  '....kbbkkbbk....',
  '....kBBkkBBk....',
  '....kddkkddk....',
  '...kddk..kddk...',
  '...kkkk..kkkk...',
  E,
];

const SIDE_HEAD = [
  '..kkkkhhhhhkkk..',
  '....kseshhhk....',
  '...ksspssshk....',
  '....kkssssk.....',
  '.....kwSwwk.....',
  '....kwwbwwwk....',
  '....kwbbbbbk....',
];

const LEGS_STRIDE = [
  '....kbbkkbbk....',
  '...kBBk..kBBk...',
  '...kddk..kddk...',
  '..kddk...kddk...',
  '..kkkk...kkkk...',
  E,
];

const LEGS_TOGETHER = [
  '.....kbbbbk.....',
  '.....kBBBBk.....',
  '.....kddddk.....',
  '....kddddk......',
  '....kkkkkk......',
  E,
];

export const GARDENER_FRAMES: Record<GardenerFrame, string[]> = {
  front: [...HAT, '.kkkkhhhhhhkkkk.', '....ksessesk....', ...FRONT_BODY],
  blink: [...HAT, '.kkkkhhhhhhkkkk.', '....ksSssSsk....', ...FRONT_BODY],
  walkA: [...HAT, ...SIDE_HEAD, '....kbwwbbbk....', '....kbssbbbk....', '....kbbbbbbk....', '....kbbbbbbk....', ...LEGS_STRIDE],
  walkB: [...HAT, ...SIDE_HEAD, '....kbwwbbbk....', '....kbssbbbk....', '....kbbbbbbk....', '....kbbbbbbk....', ...LEGS_TOGETHER],
  work: [...HAT, ...SIDE_HEAD, '.ksswwbbbbbk....', '..kk.kbbbbbk....', '....kbbbbbbk....', '....kbbbbbbk....', ...LEGS_TOGETHER],
};

/** Outils tenus pendant le travail, dessinés tournés vers la gauche, posés au bout de la main. */
export const GARDENER_TOOLS: Record<'can' | 'hoe', PixelSprite> = {
  can: {
    palette: { k: K, g: '#6cc45a', G: '#3f8a3e', w: '#d4f0ff' },
    rows: [
      '....kkkk.',
      'k..kgggGk',
      'gk.kk..kk',
      '.gkggggGk',
      '..kggggGk',
      '...kGGGk.',
      '....kkk..',
    ],
  },
  hoe: {
    palette: { k: K, b: '#b07848', B: '#7a4a2e', g: '#c8c8d8', G: '#7e7e92' },
    rows: [
      '.......kk',
      '......kbk',
      '.....kbk.',
      '....kbk..',
      '...kbk...',
      'kkkbk....',
      'kgGkk....',
      'kgGk.....',
      'kkk......',
    ],
  },
};
