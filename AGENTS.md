# Chilloff — guide pour les agents

Petit potager chill en temps réel (Phaser 3 + TypeScript strict + Vite, PWA), textes FR/EN.
Le README décrit le jeu et la feuille de route ; ce fichier dit comment travailler dedans sans gaspiller.
Tout le projet (code, commentaires, tests, commits) est **en français**.

## Commandes

| Commande | Durée | Quand |
|---|---|---|
| `npm test` | ~2 s | après chaque changement dans `src/game/`, `src/art/`, `src/i18n/` |
| `npm run build` | ~6 s | vérifie aussi les types (`tsc --noEmit`) ; avant chaque commit |
| `npm run e2e` | ~1 min | build + parcours complet dans Chrome ; quand une scène, le HUD ou une interaction change |
| `ONLY=farm,atlas npm run shots` | ~5 s + 3 s/capture | captures dans `screenshots/` ; quand un rendu change |

- `npx vitest run tests/farm.test.ts` pour un seul fichier de tests.
- e2e et captures utilisent Chrome (`CHROME`, défaut `/usr/bin/google-chrome`) avec horloge figée.
- Chaque push sur `main` **déploie en production** (GitHub Pages). On travaille sur une branche + PR.

## Économiser le contexte

- Ne jamais lire `package-lock.json`, `dist/`, `dev-dist/`, `screenshots/` (sauf l'image utile), `public/*.png`.
- Gros fichiers : ne pas les lire en entier. `grep -n` pour trouver la méthode, puis `Read` avec `offset`/`limit`.
  `src/game/state.ts` (~1170 l., classe `Game` à partir de la l. ~390), `src/scenes/GardenScene.ts` (~840),
  `src/art/living-sprites.ts` (~800), `src/ui/hud.ts` (~760), `src/art/sprites.ts` (~550), `src/art/farm-art.ts` (~500),
  `src/i18n/fr.ts` / `en.ts` (~320 chacun, clés rangées par préfixe : `deco.`, `visitor.`, `farm.`…).
- Un fichier de données (`crops.ts`, `decor.ts`, `visitors.ts`, `farm.ts`…) se lit d'abord par ses types en tête.
- Captures : ne lire que celle qui concerne le changement (`ONLY=`). Pour un sprite, `SPRITES=deco_birdhouse npm run shots`
  donne une petite planche (`screenshots/sprites.png`) au lieu de la grande `atlas.png`.
- Pour une recette pas-à-pas (ajouter une déco, un visiteur, un sprite…), charger le skill correspondant
  plutôt que d'explorer le code.

## Architecture (ce qui ne se voit pas en lisant un seul fichier)

- `src/game/` = règles **sans Phaser ni DOM**, testées dans `tests/`. Toute règle nouvelle va ici, avec un test.
  `Game.load(storage, now, random)` reçoit l'horloge et le hasard : les tests les fixent (`MemoryStorage`, `clock.now`).
- `Game` (state.ts) porte l'état (`GameState`), les actions (renvoient `ActionResult` : `{ ok: true }` ou
  `{ ok: false, reason: FailReason }`), la vie du jardin (`updateWorld`) et la sauvegarde (`commit()` → localStorage + `onChange`).
  Les événements (`GameEvent`, `onEvent`) servent aux toasts dans `main.ts`.
- Temps réel : tout se calcule à partir de timestamps (`progress`, `updatedAt`, `nextXxxAt`) ; rattrapage au chargement.
  Pas de minuterie dans les règles.
- `src/scenes/` = rendu Phaser. `GardenScene` affiche et relie tout ; `Gardener` (file de tâches), `Corgi`, `Farm`,
  `route.ts` (trajets, testé). La scène parle à l'interface via `SceneHooks` (implémenté par `Hud`).
- `src/ui/` = interface HTML sans framework : `h(tag, attrs, ...children)` de `ui/dom.ts`, jamais `innerHTML`.
- `src/art/` = pixel art **en texte** (1 caractère = 1 pixel, `.` transparent, palette par sprite) ;
  `textures.ts` les enregistre pour Phaser et pour l'UI. Tailles vérifiées par `tests/sprites.test.ts`.
- Réglages (durées, prix, fréquences) : `src/game/config.ts` et les fichiers de données, jamais en dur ailleurs.
- `?debug` expose `window.chilloff` (le `Game`) et `window.chilloffScene` ; `?atlas` montre tous les sprites.

## Sauvegarde

Clé `chilloff.save.v1`, `GameState.version: 2`. `parseSave` relit chaque champ avec repli sur `createNewGame` :
un nouveau champ = l'ajouter au type, à `createNewGame`, à `parseSave` (valeur par défaut si absent),
et vérifier qu'une ancienne sauvegarde se charge encore (voir le test de migration dans `tests/living.test.ts`).
Une sauvegarde abîmée ne doit jamais être perdue.

## Textes (i18n)

- `t('clé', { n, ... })` ; pluriel par `clé_one` / `clé_other` ; helpers `decoName`, `visitorName`… dans `i18n/index.ts`.
- **Toujours `fr.ts` et `en.ts` ensemble** (même clé, même ordre). `tests/i18n.test.ts` vérifie les clés.
- Typographie FR : apostrophe `’`, guillemets « », espace simple avant `: ; ! ?`, comme dans les textes existants.

## Laisser découvrir (à appliquer à chaque feature)

Le jeu donne très peu d'informations au joueur : il découvre par lui-même et se laisse porter
(par exemple, rien ne dit que certaines décos de l'atelier attirent des visiteurs).
Avant d'ajouter un texte, une infobulle ou un toast, se demander : **est-ce que ça explique un geste,
ou est-ce que ça gâche une découverte ?** Seuls les gestes s'expliquent.

- Aucun texte du jeu ne dit qui vient, quand, pourquoi, ni avec quelle probabilité ou quel multiplicateur.
  Les prix et les temps de pousse restent visibles : ils servent à décider.
- Les descriptions (`deco.hint.*` et les suivantes) décrivent l'objet, jamais son effet.
- Le journal ne montre une note qu'après la découverte ; avant, silhouette et « ??? ».
- Pas de tutoriel ni d'annonce « Nouveau ! » : un toast au moment où le joueur tombe dessus.
- Les indices passent par le monde (sprites, animations, lettres des voisins) plutôt que par l'interface.
- Jamais d'échec silencieux : une action qui ne marche pas se voit, même sans explication.
- Le README et les commentaires du code peuvent tout expliquer : c'est le jeu qui se tait.

Autres piliers (README, « Le principe ») : pas d'énergie, rien ne fane ni ne meurt, les bonus sont facultatifs.

## Git et PR

- Une branche courte par feature (`ferme`, `jardinier`…), PR vers `main`.
- Commit en français : titre court « Sujet : ce que ça apporte », corps en paragraphes puis puces.
- Une feature visible = version mineure dans `package.json` (+ `package-lock.json` via `npm install`),
  README à jour (description, « Organisation du code », case cochée dans la feuille de route).

## Skills du projet (`.claude/skills/`)

- `nouvelle-feature` : du besoin à la PR, dans l'ordre, avec la relecture « laisser découvrir ».
- `ajouter-contenu` : fichiers à toucher pour une culture, une déco, un visiteur, une trouvaille, une lettre,
  un accessoire, un bâtiment ou un animal.
- `pixel-art` : dessiner ou retoucher un sprite.
- `verifier` : quelle vérification lancer, et comment lire le résultat sans gaspiller.
