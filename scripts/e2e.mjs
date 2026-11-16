// Parcours complet dans un vrai navigateur : planter, arroser, défricher, récolter, vendre, recharger, changer de langue.
// Usage : npm run build && npx vite preview --port 4173 &  puis  node scripts/e2e.mjs

import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const URL = process.env.URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const KEY = 'chilloff.save.v1';

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-FR' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let now = new Date(2026, 10, 16, 14, 0).getTime();
await page.clock.setFixedTime(now);
await page.goto(URL);
await page.waitForTimeout(1200);

const save = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);

/** Centre d'une case du potager, en pixels CSS (monde 192×208 centré, zoom entier). */
async function tap(col, row) {
  const box = await page.locator('#game canvas').boundingBox();
  const zoom = Math.max(1, Math.floor(Math.min(box.width / 192, box.height / 208)));
  const ox = box.x + box.width / 2 - 96 * zoom, oy = box.y + box.height / 2 - 104 * zoom;
  await page.touchscreen.tap(ox + (3 + col + 0.5) * 16 * zoom, oy + (5 + row + 0.5) * 16 * zoom);
  await page.waitForTimeout(250);
}

const step = (name) => console.log('✓', name);

// 1. Planter une betterave
let s = await save();
assert.equal(s.coins, 20);
await tap(1, 2);
s = await save();
assert.equal(s.plots[13].plant?.id, 'beet');
assert.equal(s.seeds.beet, 5);
step('planter');

// 2. Arroser
await tap(1, 2);
s = await save();
assert.ok(s.plots[13].wetUntil > now);
step('arroser');

// 3. Défricher une case (confirmation)
await tap(0, 0);
await page.locator('.panel-dialog .btn.primary').click();
await page.waitForTimeout(300);
s = await save();
assert.equal(s.plots[0].tilled, true);
assert.equal(s.coins, 10);
step('défricher');

// 4. Le temps passe (arrosée : 6 min suffisent), puis récolte
now += 7 * 60_000;
await page.clock.setFixedTime(now);
await page.waitForTimeout(1500);
await tap(1, 2);
s = await save();
assert.equal(s.plots[13].plant, null);
assert.equal(s.basket.beet, 1);
assert.equal(s.journal.crops.beet.count, 1);
assert.match(await page.locator('#toast-root').innerText(), /journal/i);
step('récolter');

// 5. Vendre
await page.locator('.shop-btn').click();
await page.waitForTimeout(300);
await page.locator('.panel-shop .btn.primary.wide').click();
await page.waitForTimeout(200);
s = await save();
assert.equal(s.coins, 17);
assert.deepEqual(s.basket, {});
await page.locator('.close-btn').click();
step('vendre');

// 6. Recharger : tout est conservé
await page.reload();
await page.waitForTimeout(1200);
assert.equal((await page.locator('.coin-count').innerText()).trim(), '17');
step('sauvegarde après rechargement');

// 7. Passer en anglais
await page.locator('.icon-btn').nth(1).click();
await page.getByRole('button', { name: 'English' }).click();
await page.waitForTimeout(200);
assert.match(await page.locator('#topbar').innerText(), /Autumn/);
assert.match(await page.locator('.panel-options').innerText(), /Start a new game/);
step('langue anglaise');

assert.deepEqual(errors, [], `erreurs JS : ${errors.join(' | ')}`);
console.log('Parcours complet OK, aucune erreur JavaScript.');
await browser.close();
