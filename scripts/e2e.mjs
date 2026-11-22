// Parcours complet dans un vrai navigateur : planter, arroser, défricher, récolter, vendre, recharger, changer de langue.
// Chaque toucher confie une tâche au jardinier : on attend qu'il ait fini avant de vérifier.
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

/** Attendre que le jardinier ait fini tout ce qu'on lui a demandé. */
async function idle() {
  await page.waitForFunction(() => !window.chilloffScene.gardener.busy, null, { timeout: 20_000 });
  await page.waitForTimeout(150);
}

/**
 * Toucher un point du monde (pixels du jeu), puis attendre le jardinier. Sur téléphone, l'écran montre le jardin
 * (192×208, centré, zoom entier) ou la ferme, juste à sa droite (`farm: true`).
 */
async function tapWorld(x, y, { wait = true, farm = false } = {}) {
  const box = await page.locator('#game canvas').boundingBox();
  const zoom = Math.max(1, Math.floor(Math.min(box.width / 192, box.height / 208)));
  const ox = box.x + box.width / 2 - (farm ? 192 + 96 : 96) * zoom, oy = box.y + box.height / 2 - 104 * zoom;
  await page.touchscreen.tap(ox + x * zoom, oy + y * zoom);
  await page.waitForTimeout(wait ? 250 : 60);
  if (wait) await idle();
}
/** Centre d'une case du potager. */
const tap = (col, row, opts) => tapWorld((3 + col + 0.5) * 16, (5 + row + 0.5) * 16, opts);
/** Centre d'une case du jardin. */
const tapTile = (col, row) => tapWorld((col + 0.5) * 16, (row + 0.5) * 16);

const step = (name) => console.log('✓', name);

/** Le corgi se promène librement : pour le test, on le fait patienter sur le chemin, loin de tout. */
const parkCorgi = () => page.evaluate(() => {
  const c = window.chilloffScene.corgi;
  c.path = []; c.arrive = null; c.mode = 'idle'; c.timer = 10 * 60_000;
  c.img.setPosition(120, 74);
});
await parkCorgi();

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

// 2 bis. Le jardinier enchaîne : deux touchers à la suite, deux graines plantées, et il est allé jusque-là.
await tap(2, 2, { wait: false });
await tap(3, 2, { wait: false });
assert.equal(await page.evaluate(() => window.chilloffScene.gardener.busy), true);
await idle();
s = await save();
assert.equal(s.plots[14].plant?.id, 'beet');
assert.equal(s.plots[15].plant?.id, 'beet');
const pos = await page.evaluate(() => ({ x: window.chilloffScene.gardener.img.x, y: window.chilloffScene.gardener.img.y }));
assert.ok(Math.abs(pos.y - (5 + 3) * 16) <= 1 && Math.abs(pos.x - (3 + 3.5) * 16) <= 14, `jardinier près de la case : ${JSON.stringify(pos)}`);
step('file d’attente du jardinier');

// 3. Défricher une case (confirmation)
await tap(0, 0);
await page.locator('.panel-dialog .btn.primary').click();
await page.waitForTimeout(300);
await idle();
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

// 9. Courrier : la première lettre de Mamie Rose. Une fois lue, la bulle se cache…
// (sac vidé : un écureuil généreux a pu offrir assez de brindilles pour répondre tout de suite)
await page.evaluate(() => { window.chilloff.state.materials = {}; });
await tapWorld(72, 52);
assert.match(await page.locator('.panel-letter').innerText(), /Mamie Rose/);
assert.equal(await page.locator('.panel-letter .btn.primary').isDisabled(), true);
await page.locator('.close-btn').click();
await page.waitForTimeout(250);
s = await save();
assert.equal(s.letter.read, true);
assert.equal(await page.evaluate(() => window.chilloffScene.letterBubble.visible), false);
step('lettre lue : la bulle se cache');

// … et revient avec une coche (sans texte) quand on a de quoi répondre ; la bulle elle-même s'ouvre au toucher.
await page.evaluate(() => { const g = window.chilloff; g.state.materials.twig = 3; g.selectSeed(g.state.selectedSeed); });
await page.waitForTimeout(1200);
assert.equal(await page.evaluate(() => window.chilloffScene.letterBubble.visible), true);
assert.equal(await page.evaluate(() => window.chilloffScene.letterBubble.texture.key), 'ui_letter_ready');
await tapWorld(72, 34);
await page.locator('.panel-letter .btn.primary').click();
await page.waitForTimeout(250);
s = await save();
assert.equal(s.decor.inventory.birdhouse, 1);
assert.equal(s.letter, null);
step('courrier : bulle cliquable, lettre donnée');

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

// 11. Pose en série : 3 pas japonais d'affilée, sans repasser par l'atelier
await page.evaluate(() => {
  const g = window.chilloff;
  for (let i = 0; i < 3; i++) g.returnDeco('stepstone');
  const busy = (c, r) => c === 0 && r >= 8 && r <= 10;
  g.state.forage = g.state.forage.filter((f) => !busy(f.col, f.row));
  g.state.visitors = g.state.visitors.filter((v) => !busy(v.col, v.row));
});
await page.locator('.workshop-btn').click();
await page.waitForTimeout(250);
assert.match(await page.locator('.panel-workshop').innerText(), /Prêtes à poser/i);
await page.locator('.panel-workshop .chip-btn').first().click();
await page.waitForTimeout(250);
assert.match(await page.locator('#edit-banner').innerText(), /×3/);
await tapTile(0, 8);
assert.match(await page.locator('#edit-banner').innerText(), /×2/);
await tapTile(0, 9);
await tapTile(0, 10);
assert.match(await page.locator('#edit-banner').innerText(), /déplacer/);
await page.locator('#edit-banner .btn').click();
await page.waitForTimeout(250);
s = await save();
assert.equal(s.decor.placed.filter((d) => d.id === 'stepstone').length, 3);
assert.equal(s.decor.inventory.stepstone, undefined);
step('pose en série');

// 12. Le compagnon : un câlin, et on lui donne un nom
await parkCorgi();
await tapWorld(120, 68);
await page.locator('.name-input').fill('Biscotte');
await page.locator('.panel-name .btn.primary').click();
await page.waitForTimeout(250);
s = await save();
assert.equal(s.companion.name, 'Biscotte');
assert.equal(s.companion.friendship, 2);
assert.match(await page.locator('#toast-root').innerText(), /Bienvenue, Biscotte/);
await page.locator('.icon-btn[aria-label="Journal"]').click();
await page.getByRole('tab', { name: 'Biscotte' }).click();
assert.match(await page.locator('.companion-card').innerText(), /Biscotte/);
await page.locator('.close-btn').click();
await page.waitForTimeout(250);
step('compagnon : câlin et nom');

// 12 bis. La ferme, au bout du chemin : le jardinier passe le panneau et la caméra glisse jusqu'à elle.
await page.evaluate(() => {
  const g = window.chilloff;
  g.state.coins = 200; g.state.materials = { twig: 10, pebble: 10 }; g.state.basket = { beet: 1 };
  g.selectSeed(g.state.selectedSeed);
});
await tapWorld(184, 56);
assert.equal(await page.evaluate(() => window.chilloffScene.view), 'farm');
assert.ok(await page.evaluate(() => window.chilloffScene.gardener.img.x) > 192, 'le jardinier est à la ferme');
await page.waitForTimeout(800);
step('ferme : le panneau mène à la ferme');

// Le poulailler en ruine : sa fiche dit ce qu'il faut pour le rénover. Une poule s'installe.
const FX = 192;
await tapWorld(FX + 38, 40, { farm: true });
await page.waitForTimeout(250);
assert.match(await page.locator('.panel-building').innerText(), /Poulailler/);
await page.locator('.panel-building .btn.primary').click();
await page.waitForTimeout(300);
s = await save();
assert.deepEqual([s.farm.coop.renovated, s.farm.coop.animals, s.coins], [true, 1, 120]);
await tapWorld(FX + 38, 40, { farm: true });
await page.waitForTimeout(250);
await page.locator('.panel-building .btn.primary').click();
await page.locator('.close-btn').click();
await page.waitForTimeout(250);
s = await save();
assert.equal(s.farm.coop.animals, 2);
step('ferme : rénover le poulailler, accueillir une poule');

// Toucher l'enclos : les poules mangent la betterave du panier ; plus tard, on ramasse les œufs.
await tapWorld(FX + 72, 45, { farm: true });
s = await save();
assert.equal(s.basket.beet, undefined);
assert.ok(s.farm.coop.fedUntil > now);
assert.match(await page.locator('#toast-root').innerText(), /Betterave/);
now += 25 * 60_000;
await page.clock.setSystemTime(now);
await page.waitForTimeout(1500);
await tapWorld(FX + 72, 45, { farm: true });
s = await save();
assert.equal(s.produce.egg, 2);
assert.equal(s.journal.produce.egg.count, 2);
step('ferme : nourrir, ramasser les œufs');

// Fermer un panneau ne touche pas ce qu'il y a dessous (ici, la grange en ruine).
await page.locator('.shop-btn:not(.workshop-btn)').click();
await page.waitForTimeout(300);
assert.match(await page.locator('.panel-shop').innerText(), /Œuf/);
await page.locator('.close-btn').click();
await page.waitForTimeout(400);
assert.equal(await page.evaluate(() => window.chilloffScene.gardener.busy), false);
step('ferme : les œufs se vendent à la boutique');

// 13. Recharger : tout est conservé
const coinsBefore = s.coins;
await page.reload();
await page.waitForTimeout(1200);
await parkCorgi();
assert.equal((await page.locator('.coin-count').innerText()).trim(), String(coinsBefore));
assert.equal((await save()).decor.placed.length, 4);
assert.equal((await save()).companion.name, 'Biscotte');
assert.equal((await save()).farm.coop.animals, 2);
assert.equal(await page.evaluate(() => window.chilloffScene.view), 'garden');
step('sauvegarde après rechargement');

// 14. Passer en anglais
await page.locator('.icon-btn').nth(1).click();
await page.getByRole('button', { name: 'English' }).click();
await page.waitForTimeout(200);
assert.match(await page.locator('#topbar').innerText(), /Autumn/);
assert.match(await page.locator('.panel-options').innerText(), /Start a new game/);
step('langue anglaise');

assert.deepEqual(errors, [], `erreurs JS : ${errors.join(' | ')}`);
console.log('Parcours complet OK, aucune erreur JavaScript.');
await browser.close();
