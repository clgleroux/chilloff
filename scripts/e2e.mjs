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
await page.clock.setSystemTime(now);
await page.goto(URL + '?debug');
await page.waitForTimeout(1200);

const save = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);

/** Toucher un point du monde (pixels du jeu ; monde 192×208 centré, zoom entier). */
async function tapWorld(x, y) {
  const box = await page.locator('#game canvas').boundingBox();
  const zoom = Math.max(1, Math.floor(Math.min(box.width / 192, box.height / 208)));
  const ox = box.x + box.width / 2 - 96 * zoom, oy = box.y + box.height / 2 - 104 * zoom;
  await page.touchscreen.tap(ox + x * zoom, oy + y * zoom);
  await page.waitForTimeout(250);
}
/** Centre d'une case du potager. */
const tap = (col, row) => tapWorld((3 + col + 0.5) * 16, (5 + row + 0.5) * 16);
/** Centre d'une case du jardin. */
const tapTile = (col, row) => tapWorld((col + 0.5) * 16, (row + 0.5) * 16);

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
await page.clock.setSystemTime(now);
await page.waitForTimeout(1500);
await tap(1, 2);
s = await save();
assert.equal(s.plots[13].plant, null);
assert.equal(s.basket.beet, 1);
assert.equal(s.journal.crops.beet.count, 1);
assert.match(await page.locator('#toast-root').innerText(), /journal/i);
step('récolter');

// 5. Vendre
await page.locator('.shop-btn:not(.workshop-btn)').click();
await page.waitForTimeout(300);
await page.locator('.panel-shop .btn.primary.wide').click();
await page.waitForTimeout(200);
s = await save();
assert.equal(s.coins, 17);
assert.deepEqual(s.basket, {});
await page.locator('.close-btn').click();
step('vendre');

// 6. Ramasser une trouvaille dans l'herbe
s = await save();
assert.ok(s.forage.length >= 3, 'des trouvailles attendent au départ');
const item = s.forage[0];
await tapTile(item.col, item.row);
s = await save();
assert.equal(s.materials[item.id], 1);
assert.ok(!s.forage.some((f) => f.uid === item.uid));
step('cueillette');

// 7. Saluer un visiteur
s = await save();
assert.ok(s.visitors.length >= 1, 'un visiteur est là au départ');
const visitor = s.visitors[0];
await tapWorld(visitor.x, visitor.y - 6);
s = await save();
assert.equal(s.journal.visitors[visitor.id]?.count, 1);
assert.match(await page.locator('#toast-root').innerText(), /visiteur/i);
step(`saluer un visiteur (${visitor.id})`);

// 8. Secouer l'arbre : une brindille tombe
const before = (await save()).forage.length;
await tapWorld(160, 30);
s = await save();
assert.ok(s.treeShakeAt > now, 'l’arbre a été secoué');
assert.ok(s.forage.length === before + 1 || s.forage.length === 5);
step('secouer l’arbre');

// 9. Courrier : la première lettre de Mamie Rose, livrée contre un nichoir
await tapWorld(72, 52);
assert.match(await page.locator('.panel-letter').innerText(), /Mamie Rose/);
assert.equal(await page.locator('.panel-letter .btn.primary').isDisabled(), true);
await page.locator('.close-btn').click();
await page.waitForTimeout(250);
await page.evaluate(() => { window.chilloff.state.materials.twig = 3; window.chilloff.save(); });
await tapWorld(72, 52);
await page.locator('.panel-letter .btn.primary').click();
await page.waitForTimeout(250);
s = await save();
assert.equal(s.decor.inventory.birdhouse, 1);
assert.equal(s.letter, null);
step('courrier');

// 10. Atelier : poser le nichoir dans l'herbe
await page.locator('.workshop-btn').click();
await page.waitForTimeout(250);
await page.locator('.panel-workshop .btn.primary').first().click();
await page.waitForTimeout(250);
assert.equal(await page.locator('#edit-banner').isVisible(), true);
await page.evaluate(() => { const g = window.chilloff; g.state.forage = g.state.forage.filter((f) => !(f.col === 0 && f.row === 7)); g.state.visitors = g.state.visitors.filter((v) => !(v.col === 0 && v.row === 7)); });
await tapTile(0, 7);
await page.locator('#edit-banner .btn').click();
await page.waitForTimeout(250);
s = await save();
assert.deepEqual(s.decor.placed.map((d) => [d.id, d.col, d.row]), [['birdhouse', 0, 7]]);
assert.equal(await page.locator('#edit-banner').isVisible(), false);
step('poser une déco');

// 11. Recharger : tout est conservé
const coinsBefore = s.coins;
await page.reload();
await page.waitForTimeout(1200);
assert.equal((await page.locator('.coin-count').innerText()).trim(), String(coinsBefore));
assert.equal((await save()).decor.placed.length, 1);
step('sauvegarde après rechargement');

// 12. Passer en anglais
await page.locator('.icon-btn').nth(1).click();
await page.getByRole('button', { name: 'English' }).click();
await page.waitForTimeout(200);
assert.match(await page.locator('#topbar').innerText(), /Autumn/);
assert.match(await page.locator('.panel-options').innerText(), /Start a new game/);
step('langue anglaise');

assert.deepEqual(errors, [], `erreurs JS : ${errors.join(' | ')}`);
console.log('Parcours complet OK, aucune erreur JavaScript.');
await browser.close();
