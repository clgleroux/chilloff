---
name: verifier
description: Choisir et lancer la bonne vérification pour un changement dans Chilloff (tests, types, parcours navigateur, captures ciblées) et lire le résultat en économisant le contexte. À utiliser avant de dire qu'un changement est fini ou avant un commit.
---

# Vérifier un changement

## Quoi lancer

| Changement | Commandes |
|---|---|
| Règles, données, sauvegarde (`src/game/`) | `npm test` puis `npm run build` |
| Textes (`src/i18n/`) | `npm test` (clés FR/EN identiques) + relecture « laisser découvrir » |
| Sprite (`src/art/`) | `npm test` + `SPRITES=<clé> npm run shots` (skill `pixel-art`) |
| Scène, HUD, interaction, CSS | `npm run build` + `npm run e2e` + `ONLY=<capture> npm run shots` |
| Avant commit / PR | `npm test && npm run build` au minimum ; `npm run e2e` si la scène ou l'UI a bougé |

`npm run e2e` et `npm run shots` refont le build puis lancent un serveur de prévisualisation tout seuls
(`scripts/with-preview.mjs`) : pas de serveur à démarrer ni à arrêter. Port 4173 : s'il est pris, un vieux `vite preview` traîne
(`pkill -f "vite preview"`).

## Lire la sortie sans gaspiller
- Tests : `npm test 2>&1 | tail -15` suffit quand tout passe ; en cas d'échec, `npx vitest run tests/<fichier>.test.ts -t "<nom du test>"`.
- Types : `npx tsc --noEmit 2>&1 | head -30`.
- e2e : chaque étape affiche `✓ …` ; la dernière ligne dit « aucune erreur JavaScript » ou liste les erreurs. `| tail -20`.
- Captures : `ONLY=` prend une liste séparée par des virgules (« contient »). Noms disponibles :
  `atlas`, `mobile-new-game`, `mobile-autumn`, `desktop-autumn`, `mobile-winter-night`, `mobile-spring`,
  `mobile-summer-evening`, `mobile-letter`, `mobile-workshop`, `mobile-journal-visitors`, `mobile-edit`, `mobile-name`,
  `mobile-companion`, `mobile-garden-corgi`, `desktop-summer-night`, `mobile-farm`, `mobile-farm-winter-night`,
  `mobile-farm-building`, `mobile-landscape`.
  Chaque ligne de sortie se termine par `ok` ou `ERREURS: …` : la lire avant d'ouvrir l'image.
  N'ouvrir que les images utiles au changement.

## Étendre les vérifications
- Nouvelle interaction : une étape dans `scripts/e2e.mjs` avec `tapWorld(x, y)` (pixels du monde, 192×208 par vue ;
  `{ farm: true }` pour la ferme) puis `idle()` pour attendre le jardinier ; vérifier la sauvegarde avec `save()`.
- Nouvel écran ou décor : un `await shot(browser, 'mobile-xxx', { … action })` dans `scripts/screenshots.mjs`,
  avec une date fixe (saison, heure) ; ajouter son nom à la liste ci-dessus.
- `?debug` donne `window.chilloff` (le `Game`) et `window.chilloffScene` pour préparer un état dans `page.evaluate`.

## Ne pas oublier
- Le site se déploie à chaque push sur `main` : la CI lance `npm test` et `npm run build`, pas l'e2e. L'e2e est à faire en local.
- Ne pas committer `screenshots/` ni `dist/` (déjà ignorés).
