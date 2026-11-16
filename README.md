# Chilloff — le petit potager

Un petit jeu chill façon Stardew Valley, pensé pour les pauses de 5 minutes.
Tu plantes, tu arroses, tu récoltes… et le potager continue de pousser **en temps réel**, même quand le jeu est fermé.

Jouable sur mobile et sur ordinateur, installable comme une appli (PWA).

## Le principe

- **Temps réel** : un radis pousse en 8 min, une citrouille en 6 h. Tu reviens quand tu veux.
- **Pas d'énergie, pas d'échec** : rien ne fane, rien ne meurt. Une plante mûre t'attend sagement.
- **Arroser = bonus** : une case arrosée fait pousser 2× plus vite pendant 4 h. Pas obligatoire.
- **Saisons calées sur le vrai calendrier** (hémisphère nord) : chaque saison a ses 3 graines, son décor (fleurs, feuilles mortes, neige…).
- **Le jour et la nuit** suivent l'heure réelle : soirées dorées, nuits bleutées, fenêtres allumées.
- **Journal** des récoltes (et de petites stats) à compléter au fil des saisons.
- **Sauvegarde automatique** sur l'appareil (localStorage).
- **Bilingue** français / anglais.

Une seule action par toucher : sur une case en friche → la défricher, sur la terre → planter la graine choisie,
sur une plante → l'arroser, sur une plante mûre (qui scintille) → récolter.

## Lancer le jeu

```bash
npm install
npm run dev        # serveur de dev, accessible aussi depuis le téléphone sur le même Wi-Fi
npm test           # tests des règles (pousse, saisons, sauvegarde, sprites)
npm run build      # version de production dans dist/
```

Chaque push sur `main` déploie automatiquement le jeu sur GitHub Pages (`.github/workflows/deploy.yml`).

## Organisation du code

```
src/
  game/        règles du jeu, sans Phaser (testées dans tests/)
    config.ts    réglages : tailles, durées, prix
    crops.ts     les 12 cultures (saison, temps de pousse, prix, couleurs)
    growth.ts    pousse en temps réel + bonus d'arrosage
    seasons.ts   saisons du vrai calendrier
    state.ts     état de la partie, actions du joueur, sauvegarde
  art/         pixel art généré par code (aucune image à télécharger)
    sprites.ts   plantes et icônes dessinées en texte (1 caractère = 1 pixel)
    draw.ts      décors procéduraux : herbe, terre, cabane, arbres… par saison
    textures.ts  enregistrement des textures pour Phaser et l'interface
  scenes/      GardenScene : le jardin, les interactions, les petits effets
  ui/          interface HTML : barres, boutique, journal, options, bulles
  i18n/        traductions FR / EN
scripts/
  generate_icons.py  icônes de l'appli (Pillow)
  screenshots.mjs    captures d'écran mobile/bureau/saisons pour vérifier le rendu
  e2e.mjs            parcours complet dans un vrai navigateur
```

Astuce : ouvre le jeu avec `?atlas` à la fin de l'adresse pour voir la planche de tous les sprites.

## Pour modifier

- **Ajouter une culture** : une entrée dans `src/game/crops.ts` (choisir une forme existante : `root`, `leafy`, `bush`, `stake`, `flower`, `gourd`, `stalk`) et son nom dans `src/i18n/fr.ts` / `en.ts`.
- **Changer le rythme** : durées et prix dans `crops.ts`, arrosage et défrichage dans `config.ts`.
- **Remplacer le pixel art** par un pack d'images : charger les images dans `GardenScene.preload()` avec les mêmes clés de texture que `textures.ts`.

## Feuille de route

- [ ] **Décorer le jardin** : chemins, clôtures, lanternes, nichoirs… à placer librement, fabriqués avec ses récoltes
- [ ] **Petits visiteurs** : la déco attire des oiseaux, hérissons, papillons selon la saison et l'heure ; ils s'inscrivent au journal et laissent parfois une graine rare
- [ ] **Croisements** : deux plantes voisines peuvent donner une variété rare
- [ ] **Un compagnon** (chat, poule…) avec quelques accessoires
- [ ] **Jalons du journal** qui débloquent de la déco
- [ ] Objectif du jour, musique douce, déco de saison
