---
name: nouvelle-feature
description: Déroulé complet pour ajouter une feature à Chilloff (une case de la feuille de route, une mécanique, un écran), du plan à la PR, avec la relecture « laisser découvrir ». À utiliser dès qu'on ajoute ou change un comportement du jeu, pas pour un simple correctif.
---

# Nouvelle feature

Suivre les étapes dans l'ordre. AGENTS.md (déjà chargé) donne l'architecture et les règles ; ne pas re-explorer le code.

## 1. Cadrer (avant d'écrire du code)

- Relire la puce de la feuille de route dans le README et la section « Principe de design : laisser découvrir ».
- Écrire pour soi, en 5 lignes : ce que le joueur **fait** (gestes), ce qu'il **découvre** (secrets),
  ce qui se voit dans le monde (sprites, animations), ce qui est sauvegardé.
- Lister ce que l'interface dira. Pour chaque texte : geste (OK) ou secret (à retirer) ?
- Si un choix change l'équilibre (prix, durées, raretés) ou le ton, poser la question à l'utilisateur.

## 2. Règles d'abord (`src/game/`, sans Phaser)

- Données dans un fichier dédié ou existant (`xxx.ts` : type `XxxId`, `XXXS: Record<XxxId, Def>`, `XXX_IDS`, `isXxxId`).
- Réglages dans `config.ts` ou le fichier de données, pas en dur.
- Actions dans `Game` (`state.ts`) : retour `ActionResult`, nouveau `FailReason` si besoin, `this.commit()` à la fin.
  Temps réel = timestamps, rattrapage dans `updateWorld` / `advanceAll`.
- État sauvegardé : type `GameState` + `createNewGame` + `parseSave` (repli si absent). Voir « Sauvegarde » dans AGENTS.md.
- Tests dans `tests/` (fichier existant du domaine ou nouveau `xxx.test.ts`) avec `MemoryStorage` et horloge fixée
  (copier le `setup()` de `tests/farm.test.ts`). Couvrir : cas nominal, refus (`ok: false`), rattrapage après absence,
  ancienne sauvegarde sans le nouveau champ.
- `npm test`.

## 3. Rendu et interface

- Sprites : skill `pixel-art`. Enregistrer les textures dans `src/art/textures.ts`.
- Scène : `GardenScene.ts` (ou `Farm.ts`, `Gardener.ts`, `Corgi.ts`). Chercher une méthode voisine
  (`grep -n "private make\|private greet\|pop(\|puff(" src/scenes/GardenScene.ts`) et l'imiter.
  Un toucher passe par une tâche du jardinier (`ask(job)`), pas une action directe.
- Panneaux/HUD : `src/ui/hud.ts` avec `h()` ; les écrans du journal montrent `silhouette` tant que ce n'est pas découvert.
- Textes : `fr.ts` et `en.ts` ensemble, au même endroit dans les deux fichiers.
- Événement à annoncer ? Ajouter un `GameEvent` et le toast dans `main.ts`.

## 4. Relecture « laisser découvrir »

```bash
git diff main -- src/i18n/fr.ts | grep '^+'
```

Pour chaque ligne ajoutée, vérifier la checklist d'AGENTS.md : pas de qui/quand/pourquoi/probabilité/multiplicateur,
description = l'objet et pas son effet, journal muet avant découverte, pas de « Nouveau ! », aucun échec silencieux
(chaque `ok: false` doit produire un retour visible : `hooks.toast(...)` ou `wiggle(img)`, comme dans `actOn`).
Un toast « Nouveau dans le journal : … » au moment de la rencontre est permis ; une annonce avant, non.

## 5. Vérifier et livrer

- Skill `verifier` : `npm test`, `npm run build`, puis e2e et captures ciblées si la scène ou l'UI a changé.
  Ajouter au besoin une étape dans `scripts/e2e.mjs` et une capture dans `scripts/screenshots.mjs`.
- README : description de la feature (en disant tout, y compris les secrets), « Organisation du code » si nouveau
  fichier, case cochée dans la feuille de route.
- `package.json` : version mineure +1, puis `npm install` pour aligner `package-lock.json`.
- Branche courte au nom de la feature, commit en français (titre « Sujet : ce que ça apporte », paragraphe, puces), PR vers `main`.
