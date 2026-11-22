---
name: pixel-art
description: Dessiner, retoucher ou vérifier un sprite de Chilloff (pixel art écrit en texte dans src/art/) — plante, déco, visiteur, trouvaille, animal, accessoire, bâtiment — et le regarder sans charger de grosses captures.
---

# Pixel art en texte

## Format
- Un sprite = `{ rows: string[], palette: Record<char, '#rrggbb'> }` (`PixelSprite`, `src/art/living-sprites.ts`).
  1 caractère = 1 pixel, `.` = transparent. Toutes les lignes ont la même longueur.
- Contour : `k` = `K` (`#3b2a35`) dans presque tous les sprites. Habitude de palette : minuscule = clair, MAJUSCULE = foncé
  (`g/G` vert, `b/B` bois, `r/R` rouge…). Chaque sprite a sa palette : relire la sienne avant de réutiliser une lettre.
- Tailles (vérifiées par `tests/sprites.test.ts`) : icônes, matériaux, visiteurs, animaux, produits, corgi 16×16 ;
  décos 16×16 ou 16×24 si `tall` ; plantes, jardinier, boîte aux lettres, panneaux 16×24 ; vache 24×16.
- `pad(rows, h, bottom = 1)` complète par le haut (le sprite « pose » sur sa base) ; `E` = ligne vide de 16.
- Plantes (`src/art/sprites.ts`) : caractères imposés `.klgGfFRaAwsSmMy`, couleurs tirées de la palette de la culture
  (`crops.ts`), base en ligne 22 via `frame()`. Une forme (`CropShape`) = `grow` + `ripe` dans `PLANT_FRAMES` + icône dans `CROP_ICONS`.
- Décors de fond (herbe, arbres, cabane, bâtiments) : dessinés par code avec `Painter` (`src/art/draw.ts`, `farm-art.ts`),
  une variante par saison ; les bâtiments existent en ruine et rénovés.
- Nouvelle famille de sprites : l'enregistrer dans `allCanvases()` de `src/art/textures.ts` (préfixes de clés :
  `plant_ icon_ ui_ mat_ deco_ vis_ mailbox_ corgi_<acc>_<pose> gardener_ tool_ animal_ produce_ sign_ farm_ fence_`)
  et ajouter sa vérification de taille dans `tests/sprites.test.ts`.

## Style
- Lisible à 16 px sur téléphone : silhouette franche, 3 ou 4 couleurs + contour, un seul point de reflet.
- S'inspirer d'un sprite voisin de même famille (même taille, même façon de poser l'ombre) : `grep -n "<id>: {" src/art/living-sprites.ts`
  puis lire seulement ce bloc avec `offset`/`limit`.
- Saisons et nuit : le décor change de palette, pas les sprites d'objets ; ce qui brille la nuit passe par `glow` (décos).

## Regarder le résultat (sans gaspiller)
```bash
npm test                                          # tailles et caractères
SPRITES=deco_birdhouse,vis_bluetit npm run shots  # planche ×4 de ces textures seulement → screenshots/sprites.png (~200 px)
```
Puis lire `screenshots/sprites.png`. Le filtre est un « contient » sur la clé de texture : `vis_` = tous les visiteurs.
Pour le voir en jeu : `ONLY=mobile-autumn npm run shots` (ou la capture qui montre cet objet).
Éviter `atlas.png` complète (grande image) sauf pour une revue d'ensemble.
