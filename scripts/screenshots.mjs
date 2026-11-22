// Captures d'écran du jeu (mobile, bureau, saisons, nuit, planche de sprites) pour vérifier le rendu.
// Usage : npm run build && npx vite preview --port 4173 &  puis  node scripts/screenshots.mjs
//    ou simplement : npm run shots
// Variables : CHROME (chemin du navigateur), URL (défaut http://localhost:4173/),
//             ONLY (n'en faire que certaines : ONLY=farm,atlas → les captures dont le nom contient « farm » ou « atlas »),
//             SPRITES (seulement une planche de quelques textures : SPRITES=deco_birdhouse,corgi_ → screenshots/sprites.png).

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const URL = process.env.URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Une partie de démonstration : plantes à différents stades, quelques récoltes. */
function demoSave(now, season) {
  const crops = {
    spring: ['radish', 'lettuce', 'strawberry'],
    summer: ['basil', 'tomato', 'sunflower'],
    autumn: ['beet', 'cabbage', 'pumpkin'],
    winter: ['garlic', 'leek', 'snowdrop'],
  }[season];
  const growTimes = {
    radish: 8 * MIN, lettuce: 45 * MIN, strawberry: 4 * HOUR, basil: 10 * MIN, tomato: HOUR, sunflower: 5 * HOUR,
    beet: 12 * MIN, cabbage: 90 * MIN, pumpkin: 6 * HOUR, garlic: 10 * MIN, leek: HOUR, snowdrop: 5 * HOUR,
  };
  const plots = Array.from({ length: 36 }, () => ({ tilled: false, plant: null, wetUntil: 0 }));
  const tilled = [7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22, 25, 26];
  for (const i of tilled) plots[i].tilled = true;
  const ratios = [1, 1, 0.7, 0.3, 0.05, 1, 0.8, 0.4, 1, 0.6, 0.1, 1];
  tilled.slice(0, 12).forEach((i, k) => {
    const id = crops[k % 3];
    plots[i].plant = { id, progress: growTimes[id] * ratios[k], updatedAt: now, plantedAt: now - HOUR };
    if (k % 4 === 2) plots[i].wetUntil = now + 2 * HOUR;
  });
  const journalCrops = Object.fromEntries(crops.slice(0, 2).map((id) => [id, { count: 7, firstAt: now - 3 * 86400000 }]));
  const seasonDeco = { spring: 'daisypot', summer: 'scarecrow', autumn: 'leafpile', winter: 'snowman' }[season];
  const seasonMat = { spring: 'daisy', summer: 'feather', autumn: 'mushroom', winter: 'pinecone' }[season];
  const placed = [
    ['birdhouse', 0, 7], ['bench', 10, 9], ['lantern', 11, 6], ['flowerbed', 1, 10], [seasonDeco, 9, 7],
    ['stepstone', 0, 4], ['pond', 10, 11], ['jackolantern', 2, 6],
  ].map(([id, col, row], i) => ({ uid: 900 + i, id, col, row }));
  return {
    decor: { placed, inventory: { pond: 1, lantern: 1 } },
    materials: { twig: 5, pebble: 3, [seasonMat]: 2 },
    lettersDone: 3,
    farm: {
      coop: { renovated: true, animals: 3, progress: 99 * HOUR, updatedAt: now, fedUntil: 0 },
      barn: { renovated: true, animals: 2, progress: 0, updatedAt: now, fedUntil: now + HOUR },
    },
    produce: { egg: 2 },
    companion: { name: 'Biscotte', friendship: 16, lastPetAt: 0, lastPetDay: '', accessory: 'bandana', nextDigAt: now + 3600000 },
    version: 1, createdAt: now - 3 * 86400000, updatedAt: now, coins: 137, plots,
    seeds: { [crops[0]]: 4, [crops[1]]: 2, [crops[2]]: 1 }, basket: { [crops[0]]: 3, [crops[1]]: 1 },
    selectedSeed: crops[1], lastSeason: season,
    journal: {
      crops: journalCrops, totalHarvests: 14, coinsEarned: 210, daysPlayed: 4, lastDay: '',
      visitors: { sparrow: { count: 5, firstAt: now - 2 * 86400000 }, bluetit: { count: 2, firstAt: now - 86400000 }, squirrel: { count: 1, firstAt: now } },
      forageCount: 23, lettersDelivered: 3,
    },
    settings: { lang: 'fr' },
  };
}

/** Toucher un point du monde (pixels du jeu). */
async function tapWorld(page, x, y) {
  const box = await page.locator('#game canvas').boundingBox();
  const zoom = Math.max(1, Math.floor(Math.min(box.width / 192, box.height / 208)));
  await page.mouse.click(box.x + box.width / 2 + (x - 96) * zoom, box.y + box.height / 2 + (y - 104) * zoom);
  await page.waitForTimeout(400);
}

const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);

async function shot(browser, name, { width, height, scale = 2, date, season, fresh = false, action, path = '' }) {
  if (ONLY.length && !ONLY.some((s) => name.includes(s))) return;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, hasTouch: width < 700, locale: 'fr-FR' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (date) await page.clock.setSystemTime(date);
  if (!fresh && season) {
    const save = demoSave(date ? date.getTime() : Date.now(), season);
    await page.addInitScript((s) => localStorage.setItem('chilloff.save.v1', s), JSON.stringify(save));
  }
  await page.goto(URL + path);
  await page.waitForTimeout(1200);
  if (action) await action(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png`, errors.length ? `ERREURS: ${errors.join(' | ')}` : 'ok');
  await context.close();
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const autumnDay = new Date(2026, 10, 16, 14, 0);

// SPRITES=deco_birdhouse,vis_ : une petite planche avec seulement ces textures (zoom ×4), dans screenshots/sprites.png.
if (process.env.SPRITES) {
  const wanted = process.env.SPRITES.split(',').map((s) => s.trim()).filter(Boolean);
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(URL + '?atlas');
  await page.waitForTimeout(800);
  const box = await page.evaluate((w) => {
    let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0, n = 0;
    const figs = [...document.querySelectorAll('figure')];
    for (const fig of figs) {
      const keep = w.some((s) => fig.querySelector('figcaption').textContent.includes(s));
      fig.style.display = keep ? '' : 'none';
    }
    for (const fig of figs) {
      if (fig.style.display === 'none') continue;
      n++;
      for (const el of fig.children) { // la figure s'étire dans la grille : on mesure le dessin et sa légende
        const r = el.getBoundingClientRect();
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
    }
    return n ? { n, x: Math.max(0, x0 - 8), y: Math.max(0, y0 - 8), width: x1 - x0 + 16, height: y1 - y0 + 16 } : { n };
  }, wanted);
  if (box.n) await page.screenshot({ path: `${OUT}/sprites.png`, fullPage: true, clip: box });
  console.log(box.n ? `sprites.png : ${box.n} texture(s)` : `aucune texture ne contient : ${wanted.join(', ')}`);
  await browser.close();
  process.exit(box.n ? 0 : 1);
}

await shot(browser, 'atlas', { width: 1400, height: 1100, scale: 1, path: '?atlas', fresh: true });
await shot(browser, 'mobile-new-game', { width: 390, height: 844, date: autumnDay, fresh: true });
await shot(browser, 'mobile-autumn', { width: 390, height: 844, date: autumnDay, season: 'autumn' });
await shot(browser, 'desktop-autumn', { width: 1440, height: 900, scale: 1, date: autumnDay, season: 'autumn' });
await shot(browser, 'mobile-winter-night', { width: 390, height: 844, date: new Date(2026, 11, 20, 23, 0), season: 'winter' });
await shot(browser, 'mobile-spring', { width: 390, height: 844, date: new Date(2027, 3, 10, 10, 0), season: 'spring' });
await shot(browser, 'mobile-summer-evening', { width: 390, height: 844, date: new Date(2027, 6, 10, 20, 0), season: 'summer' });
await shot(browser, 'mobile-letter', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await tapWorld(p, 72, 52); },
});
await shot(browser, 'mobile-workshop', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.workshop-btn'); await p.click('.panel-workshop .tab:first-child'); await p.waitForTimeout(400); },
});
await shot(browser, 'mobile-journal-visitors', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.icon-btn[aria-label="Journal"]'); await p.click('.panel-journal .tab:nth-child(2)'); await p.waitForTimeout(400); },
});
await shot(browser, 'mobile-edit', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.workshop-btn'); await p.click('.panel-workshop .btn.primary'); await p.waitForTimeout(400); },
});
await shot(browser, 'mobile-name', {
  width: 390, height: 844, date: autumnDay, fresh: true, path: '?debug',
  action: async (p) => {
    await p.evaluate(() => { const c = window.chilloffScene.corgi; c.path = []; c.mode = 'idle'; c.timer = 600000; c.img.setPosition(120, 74); });
    await tapWorld(p, 120, 68);
    await p.locator('.name-input').fill('Biscotte');
  },
});
await shot(browser, 'mobile-companion', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.icon-btn[aria-label="Journal"]'); await p.click('.panel-journal .tab:nth-child(3)'); await p.waitForTimeout(400); },
});
await shot(browser, 'mobile-garden-corgi', {
  width: 390, height: 844, date: new Date(2026, 10, 16, 18, 30), season: 'autumn', path: '?debug',
  action: async (p) => {
    await p.evaluate(() => { const c = window.chilloffScene.corgi; c.path = []; c.mode = 'idle'; c.timer = 600000; c.img.setPosition(136, 74); });
    await p.waitForTimeout(300);
  },
});
await shot(browser, 'desktop-summer-night', { width: 1440, height: 900, scale: 1, date: new Date(2027, 6, 10, 23, 30), season: 'summer' });
// La ferme : sur téléphone, un second écran (la caméra glisse) ; sur un écran large, à côté du jardin.
const farmView = async (p) => { await p.evaluate(() => window.chilloffScene.showView('farm', false)); await p.waitForTimeout(1500); };
await shot(browser, 'mobile-farm', { width: 390, height: 844, date: autumnDay, season: 'autumn', path: '?debug', action: farmView });
await shot(browser, 'mobile-farm-winter-night', { width: 390, height: 844, date: new Date(2026, 11, 20, 23, 0), season: 'winter', path: '?debug', action: farmView });
await shot(browser, 'mobile-farm-building', {
  width: 390, height: 844, date: autumnDay, season: 'autumn', path: '?debug',
  action: async (p) => { await farmView(p); await p.evaluate(() => window.chilloffScene.hooks.openBuilding('coop')); await p.waitForTimeout(400); },
});
await shot(browser, 'mobile-landscape', { width: 844, height: 390, date: new Date(2027, 3, 10, 10, 0), season: 'spring' });

await browser.close();
