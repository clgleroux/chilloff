// Captures d'écran du jeu (mobile, bureau, saisons, nuit, planche de sprites) pour vérifier le rendu.
// Usage : npm run build && npx vite preview --port 4173 &  puis  node scripts/screenshots.mjs
// Variables : CHROME (chemin du navigateur), URL (défaut http://localhost:4173/).

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
  return {
    version: 1, createdAt: now - 3 * 86400000, updatedAt: now, coins: 137, plots,
    seeds: { [crops[0]]: 4, [crops[1]]: 2, [crops[2]]: 1 }, basket: { [crops[0]]: 3, [crops[1]]: 1 },
    selectedSeed: crops[1], lastSeason: season,
    journal: { crops: journalCrops, totalHarvests: 14, coinsEarned: 210, daysPlayed: 4, lastDay: '' },
    settings: { lang: 'fr' },
  };
}

async function shot(browser, name, { width, height, scale = 2, date, season, fresh = false, action, path = '' }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, hasTouch: width < 700, locale: 'fr-FR' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (date) await page.clock.setFixedTime(date);
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

await shot(browser, 'atlas', { width: 1400, height: 1100, scale: 1, path: '?atlas', fresh: true });
await shot(browser, 'mobile-new-game', { width: 390, height: 844, date: autumnDay, fresh: true });
await shot(browser, 'mobile-autumn', { width: 390, height: 844, date: autumnDay, season: 'autumn' });
await shot(browser, 'desktop-autumn', { width: 1440, height: 900, scale: 1, date: autumnDay, season: 'autumn' });
await shot(browser, 'mobile-winter-night', { width: 390, height: 844, date: new Date(2026, 11, 20, 23, 0), season: 'winter' });
await shot(browser, 'mobile-spring', { width: 390, height: 844, date: new Date(2027, 3, 10, 10, 0), season: 'spring' });
await shot(browser, 'mobile-summer-evening', { width: 390, height: 844, date: new Date(2027, 6, 10, 20, 0), season: 'summer' });
await shot(browser, 'mobile-shop', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.shop-btn'); await p.click('.tab:first-child'); await p.waitForTimeout(400); },
});
await shot(browser, 'mobile-journal', {
  width: 390, height: 844, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.icon-btn[aria-label="Journal"]'); await p.waitForTimeout(400); },
});
await shot(browser, 'desktop-sell', {
  width: 1440, height: 900, scale: 1, date: autumnDay, season: 'autumn',
  action: async (p) => { await p.click('.shop-btn'); await p.waitForTimeout(400); },
});

await browser.close();
