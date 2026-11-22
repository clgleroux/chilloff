---
name: ajouter-contenu
description: Liste exacte des fichiers à toucher pour ajouter (ou retirer) un élément de contenu à Chilloff — culture, déco, visiteur, trouvaille de cueillette, voisin et ses lettres, accessoire du corgi, bâtiment, animal ou produit de la ferme. À utiliser avant d'explorer le code pour ce genre d'ajout.
---

# Ajouter du contenu

**Astuce qui évite de chercher** : ajouter d'abord l'id au type union (`DecoId`, `VisitorId`…), puis lancer
`npx tsc --noEmit`. Chaque `Record<XxxId, …>` incomplet (données, sprites, tailles…) sort en erreur avec son fichier et sa ligne.
Les listes `XXX_IDS` se déduisent des données : journal, boutique, atelier et tests de sprites suivent tout seuls.

Ensuite, toujours : textes dans `fr.ts` **et** `en.ts` (au même endroit), `npm test`, et relire les textes
avec la checklist « laisser découvrir » d'AGENTS.md (le nom et la description parlent de l'objet, jamais de son effet).
Mettre à jour le compte dans le README s'il y en a un (« 11 décos », « 11 visiteurs », « 12 cultures »…).

## Culture
- `src/game/crops.ts` : id dans `CropId`, entrée dans `CROPS` (saison, `shape` existante parmi `root leafy bush stake flower gourd stalk`,
  `growTime`, `seedPrice`, `sellPrice`, palette). Chaque saison a 3 cultures : rapide, moyenne, lente.
- i18n : `crop.<id>`.
- `scripts/screenshots.mjs` : tables `crops` et `growTimes` de `demoSave` si la culture doit y figurer.
- Nouvelle forme de plante seulement si aucune ne convient : skill `pixel-art` (`PLANT_FRAMES`, `CROP_ICONS` dans `src/art/sprites.ts`).

## Déco (atelier)
- `src/game/decor.ts` : `DecoId`, entrée dans `DECOS` (`recipe` en matériaux/cultures/pièces, `season?`, `tall` = 16×24, `glow` = s'allume la nuit).
- Sprite : `DECO_SPRITES` dans `src/art/living-sprites.ts` (16×16, ou 16×24 si `tall`).
- i18n : `deco.<id>` (nom) et `deco.hint.<id>` (description de l'objet).
- Récompense possible d'une lettre : `GIFT_DECOS` dans `src/game/letters.ts`.

## Visiteur
- `src/game/visitors.ts` : `VisitorId`, entrée dans `VISITORS` (`seasons`, `time` day/night/any, `spot` grass / tree / deco,
  `weight`, `gift`). Attiré par une déco : `spot: { kind: 'deco', deco: '<decoId>', perch? }`.
- Sprite : `VISITOR_SPRITES` dans `src/art/living-sprites.ts` (16×16).
- i18n : `visitor.<id>` et `visitor.hint.<id>` (note du journal, montrée **après** la rencontre seulement).
- Test : s'inspirer de « un nichoir posé attire une mésange » dans `tests/living.test.ts`.

## Trouvaille de cueillette (matériau)
- `src/game/materials.ts` : `MaterialId`, `MATERIALS` (`season` ou null, `value`), et `SEASONAL_MATERIAL` / `forageTable` si saisonnière.
- Sprite : `MATERIAL_SPRITES` (16×16). i18n : `material.<id>`.

## Voisin et lettres
- `src/game/letters.ts` : `CharacterId` et `CHARACTERS`. Le texte est choisi par `letter.<voisin>.<index % 3>` : écrire 3 lettres.
- i18n : `character.<id>` et `letter.<id>.0` à `.2`. Une lettre peut annoncer une nouveauté en douceur (indice par le monde).

## Accessoire du corgi
- `src/game/companion.ts` : `AccessoryId`, `ACCESSORY_IDS` (l'ordre = l'ordre de déblocage), `HEART_THRESHOLDS` (un seuil par accessoire).
- Sprite : `ACCESSORY_SPRITES` dans `living-sprites.ts`, avec `anchor.walk` / `anchor.sleep` (position sur le corgi) ;
  vérifier sur `?atlas` et la capture `mobile-companion`.
- i18n : `accessory.<id>`.

## Bâtiment, animal, produit (ferme)
- `src/game/farm.ts` : `BuildingId` / `AnimalId` / `ProduceId`, `BUILDINGS` (prix de rénovation, animal, max, prix d'accueil, produit), `PRODUCE` (temps, prix de vente).
- `src/game/world.ts` : enclos dans `PADDOCKS` (position, côté, porte). Vérifier `tests/route.test.ts`.
- Art : `src/art/farm-art.ts` (`ANIMAL_SPRITES`, `PRODUCE_SPRITES`, `BUILDING_SIZE`, dessin dans `building()` pour chaque saison, en ruine / rénové).
- Valeurs en dur à compléter : `SPEED` dans `src/scenes/Farm.ts`, `sizes` vers la l. 737 de `src/ui/hud.ts` (tsc les signale).
- i18n : `building.<id>`, `building.hint.<id>`, `building.ruin.<id>` (l'état actuel, jamais ce qu'il deviendra),
  `farm.renovated|adopted|ready|fed|status|statusFed.<bâtiment>`, `farm.more|full.<animal>`, `produce.<id>`.
- `scripts/e2e.mjs` et `scripts/screenshots.mjs` si le parcours ou la démo doivent l'inclure.

## Retirer un élément
Même liste à l'envers. Penser aux sauvegardes existantes : `parseSave` ignore déjà les ids inconnus (`isXxxId`),
mais vérifier qu'aucune lettre en cours ou déco posée ne casse le chargement (test de migration).
