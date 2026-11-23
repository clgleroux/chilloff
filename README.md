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

### Le jardin vivant : toujours quelque chose à toucher, jamais de pression

- **Cueillette** : brindilles, cailloux et trésors de saison (pâquerette, plume, champignon, pomme de pin) apparaissent dans l'herbe toutes les 2 à 4 min. Ils ne disparaissent jamais.
- **Visiteurs** : moineau, écureuil, rouge-gorge, chouette (la nuit)… On les salue d'un toucher : ils s'inscrivent au journal et laissent parfois un cadeau. S'ils repartent, d'autres viendront.
- **Courrier** : Mamie Rose, Léon le facteur, Capucine et Basile le boulanger écrivent de petites demandes. Aucun délai : on répond quand on veut, ou on décline poliment.
- **L'arbre** se secoue : des feuilles tombent, et parfois une brindille.
- **Atelier** : une remise en planches, entre la boîte aux lettres et l'arbre. Le jardinier y va à pied et l'atelier s'ouvre
  (plus de bouton en bas de l'écran). On y fabrique 11 décos pour le jardin (nichoir, banc, lanterne, mare, bonhomme de neige…),
  à poser librement dans l'herbe, et 11 meubles pour la maison. Une étincelle brille à sa fenêtre quand on a de quoi fabriquer quelque chose.
- **Démonter** : les décos reçues des voisins (ou fabriquées en trop) qu'on ne veut pas poser se démontent à l'atelier,
  depuis l'onglet « Stock » : on récupère **tous les matériaux de cueillette** de la recette, mais ni les pièces, ni les légumes,
  ni les produits de la ferme. Une déco déjà posée se range d'abord (« Arranger le jardin »), puis se démonte.
- **La déco attire des visiteurs** : la mésange se pose sur le nichoir, le chat fait la sieste près du banc, les lucioles brillent autour des lanternes les nuits d'été… 11 visiteurs à découvrir au fil des saisons. Le jeu ne le dit nulle part : le journal ne montre que des silhouettes, et une petite note n'apparaît qu'après la rencontre.

### La maison

Toucher la cabane : le jardinier rentre, et la caméra montre l'intérieur, une pièce de 8 × 6 cases avec deux fenêtres
qui donnent sur le jardin (selon la saison et l'heure). En bas de l'écran, les meubles fabriqués à l'atelier : on en prend un,
on touche le plancher (ou le mur pour un tableau ou l'horloge) pour le poser ; toucher un meuble posé le reprend en main.
La porte (ou le bouton « Sortir ») ramène au jardin, et le jardinier ressort sur le seuil.

- **11 meubles** : chaise, table, plante verte, tableau, tapis, lampe, bibliothèque, fauteuil, horloge, lit, poêle.
  Ils coûtent des brindilles, des cailloux et des pièces ; le tapis demande de la laine, le fauteuil de la laine angora (la ferme).
- **Petits secrets**, que le jeu ne dit pas : la nuit, le jardinier dort dans le lit s'il y en a un (et un « z » s'envole),
  le corgi vient dormir sur le tapis, et le poêle et la lampe éclairent la pièce le soir.

### Le compagnon

Un petit corgi s'installe dans le jardin (tu lui donnes son nom au premier câlin). Il trottine en contournant le potager,
renifle l'herbe, fait la sieste, **creuse de temps en temps pour déterrer une trouvaille**, et dort devant la porte la nuit.
Un toucher = un câlin : l'amitié monte (un câlin compte toutes les 3 min, le premier du jour compte double) et chacun des
5 cœurs débloque un accessoire (bandana, nœud, chapeau de paille, couronne de fleurs, écharpe), à choisir dans le journal.
Fidèle au principe « laisser découvrir », le jeu n'en dit rien : il arrive sans annonce, le journal ne montre que les cœurs
gagnés et une petite note, et les accessoires restent des silhouettes jusqu'à ce qu'on les débloque.

### Le jardinier

Un petit jardinier en chapeau de paille fait tout le travail : chaque toucher lui confie une tâche, il marche jusqu'à la chose,
se tourne vers elle et s'y met (binette pour défricher, arrosoir pour arroser). Plusieurs touchers s'enchaînent dans une file
d'attente, marquée d'un petit repère sur les cases qui attendent. Il passe entre les rangs du potager mais contourne la cabane et l'arbre.
Au repos, il cligne des yeux, regarde autour de lui, s'étire ; la nuit, il rentre dormir dans la cabane et en ressort dès qu'on l'appelle.
Le corgi s'arrête pour l'attendre quand il vient lui faire un câlin.

Une seule action par toucher, décidée quand le jardinier arrive : sur une case en friche → la défricher (le prix se confirme tout de suite),
sur la terre → planter la graine choisie, sur une plante → l'arroser, sur une plante mûre (qui scintille) → récolter.
Trouvailles, visiteurs, boîte aux lettres, arbre et corgi se touchent aussi. S'il manque des pièces ou des graines, la suite de la file est oubliée.

### La ferme

Au bout du chemin, un panneau montre la ferme : quatre bâtiments en ruine (poulailler, clapier, bergerie, étable),
qu'on rénove un par un avec des pièces et des matériaux de cueillette. Le jardinier y va à pied : sur téléphone, la caméra
glisse vers la ferme quand il passe le panneau (et revient au jardin par le panneau d'en face) ; sur un écran assez large
(ordinateur, téléphone à l'horizontale), le jardin et la ferme sont côte à côte.

- **Rénover** : toucher un bâtiment en ruine ouvre sa fiche, avec le prix (80 à 500 pièces, plus brindilles et cailloux).
  À la fin des travaux, un premier animal s'installe tout seul (le jeu ne le dit pas avant).
- **Accueillir** d'autres animaux depuis la fiche du bâtiment : 4 poules, 4 lapins, 3 moutons, 3 vaches au maximum.
- **Produire en temps réel** : œufs (40 min), laine angora (1 h 30), lait (2 h), laine (3 h), un par animal.
  Comme une plante mûre, les produits attendent dans l'enclos (ils scintillent) : rien ne se perd.
- **Nourrir = bonus**, comme l'arrosage : toucher l'enclos quand rien n'est prêt donne aux animaux le légume
  le moins cher du panier ; ils produisent 2× plus vite pendant 4 h. Pas obligatoire, rien ne meurt.
- Les produits se **vendent** à la boutique avec les légumes, et les voisins se mettent à en **demander dans leurs lettres**
  une fois le bâtiment rénové. Le journal a une section « La ferme » (silhouettes jusqu'au premier ramassage).
- Laisser découvrir : la fiche d'un bâtiment en ruine le décrit tel qu'il est (« des plumes traînent encore dans la paille »),
  jamais ce qu'il deviendra ; le jeu ne parle ni du bonus du repas ni du premier animal offert.

## Principe de design : laisser découvrir

Le jeu en dit le moins possible. Le joueur essaie, observe, se laisse porter, et découvre par lui-même
(par exemple que certaines décos de l'atelier attirent des visiteurs). **C'est la règle pour toutes les prochaines features.**

- **On explique les gestes, jamais les secrets.** L'interface peut dire où toucher ou comment poser une déco. Elle ne dit pas qui viendra, quand, ni pourquoi.
- **Pas de chiffres sur la magie du jardin.** Les prix et les temps de pousse restent affichés (on en a besoin pour décider), mais pas les multiplicateurs, les probabilités, les conditions d'apparition ni les minuteurs.
- **Une description parle de l'objet, pas de son effet.** « Une maisonnette en bois, avec un trou tout rond », pas « Attire la mésange ».
- **Le journal raconte après coup.** Avant une découverte : une silhouette et « ??? ». Après : le nom et une petite note d'observation.
- **Montrer plutôt que dire.** Un indice passe par le monde (une plume près du nichoir, un bruissement dans les feuilles, la lettre d'un voisin) plutôt que par un texte d'aide.
- **Une nouveauté arrive sans prévenir.** Pas de tutoriel ni de fenêtre « Nouveau ! » : un petit toast au moment où le joueur tombe dessus suffit.
- **Jamais de cul-de-sac silencieux.** Si une action échoue, le jeu le montre (sans forcément expliquer pourquoi), pour que la découverte reste un plaisir et pas une frustration.
- **Le README et le code peuvent tout dire ; c'est le jeu qui se tait.**

Appliqué à la feuille de route, ça donne par exemple :

- *Croisements* : aucune explication. Un jour, une variété rare pousse entre deux plantes voisines, et une silhouette du journal se révèle.
- *Compagnon* : il s'installe de lui-même, sans annonce ; ses accessoires se découvrent en essayant.
- *Jalons du journal* : la déco débloquée arrive comme une surprise (une lettre, un cadeau), pas comme une barre de progression.

## Lancer le jeu

```bash
npm install
npm run dev        # serveur de dev, accessible aussi depuis le téléphone sur le même Wi-Fi
npm test           # tests des règles (pousse, saisons, sauvegarde, sprites)
npm run build      # version de production dans dist/
npm run e2e        # build + parcours complet dans Chrome
npm run shots      # build + captures dans screenshots/ (ONLY=farm,atlas pour en choisir, SPRITES=deco_ pour une planche de sprites)
```

Pour les agents de code (Claude, Codex…) : consignes dans `AGENTS.md`, recettes dans `.claude/skills/`.

Chaque push sur `main` déploie automatiquement le jeu sur GitHub Pages (`.github/workflows/deploy.yml`).

## Organisation du code

```
src/
  game/        règles du jeu, sans Phaser (testées dans tests/)
    config.ts    réglages : tailles, durées, prix
    crops.ts     les 12 cultures (saison, temps de pousse, prix, couleurs)
    growth.ts    pousse en temps réel + bonus d'arrosage
    seasons.ts   saisons du vrai calendrier, jour/nuit
    materials.ts trouvailles de cueillette
    decor.ts     décorations et leurs recettes
    visitors.ts  visiteurs (saison, heure, déco qui les attire, cadeau)
    letters.ts   courrier des voisins
    companion.ts le corgi : amitié, accessoires, fouilles
    farm.ts      la ferme : bâtiments, rénovation, animaux, production en temps réel, repas
    house.ts     la maison : meubles et leurs recettes, plan de la pièce (plancher, mur, fenêtres, porte)
    world.ts     plan du jardin et de la ferme : où l'on peut poser, cueillir, recevoir des visiteurs ; les enclos
    state.ts     état de la partie, actions du joueur, vie du jardin, sauvegarde
  art/         pixel art généré par code (aucune image à télécharger)
    sprites.ts   plantes et icônes dessinées en texte (1 caractère = 1 pixel)
    living-sprites.ts  trouvailles, décos, visiteurs, boîte aux lettres
    farm-art.ts  bâtiments (en ruine / rénovés, par saison), clôtures, animaux, produits, panneaux
    house-art.ts meubles, et la pièce de la maison (par saison, de jour et de nuit)
    draw.ts      décors procéduraux : herbe, terre, cabane, remise de l'atelier, arbres… par saison
    textures.ts  enregistrement des textures pour Phaser et l'interface
  scenes/      GardenScene : le jardin, les interactions, les petits effets
               Gardener.ts : le jardinier (file de tâches, outils, repos, nuit dans la cabane)
               Corgi.ts / route.ts : promenade du compagnon et trajets du jardinier (contourner la cabane, l'arbre, les enclos…)
               Farm.ts : la ferme (enclos, animaux qui se promènent, produits) ; la caméra jardin / ferme est dans GardenScene
               House.ts : l'intérieur de la maison (meubles, jardinier et corgi endormis), dessiné hors de vue sous le jardin
  ui/          interface HTML : barres, boutique, atelier, courrier, journal, options, mode déco
               indoor.ts : dans la maison (meuble en main, sortir), partagé entre la scène et l'interface
  i18n/        traductions FR / EN
scripts/
  generate_icons.py  icônes de l'appli (Pillow)
  screenshots.mjs    captures d'écran mobile/bureau/saisons pour vérifier le rendu
  e2e.mjs            parcours complet dans un vrai navigateur
  with-preview.mjs   lance le serveur de prévisualisation le temps d'un script (npm run e2e / shots)
```

Astuces : ajoute `?atlas` à l'adresse pour voir la planche de tous les sprites, et `?debug` pour accéder à la partie
depuis la console (`chilloff.state`).

## Pour modifier

- **Ajouter une culture** : une entrée dans `src/game/crops.ts` (choisir une forme existante : `root`, `leafy`, `bush`, `stake`, `flower`, `gourd`, `stalk`) et son nom dans `src/i18n/fr.ts` / `en.ts`.
- **Changer le rythme** : durées et prix dans `crops.ts` ; arrosage, défrichage, fréquence des trouvailles, des visiteurs et du courrier dans `config.ts`.
- **Régler la ferme** : prix de rénovation, prix et nombre d'animaux, temps de production dans `src/game/farm.ts` ;
  prix de vente des produits dans `PRODUCE` ; plan des enclos dans `src/game/world.ts` (`PADDOCKS`).
- **Ajouter un meuble** : une entrée dans `src/game/house.ts` (`FURNITURE` : recette, plancher ou mur, haut, lumineux),
  son dessin dans `art/house-art.ts`, ses textes `furniture.<id>` et `furniture.hint.<id>` dans `i18n/`.
- **Ajouter une déco ou un visiteur** : une entrée dans `decor.ts` ou `visitors.ts`, son dessin dans `art/living-sprites.ts`, ses textes dans `i18n/`.
- **Remplacer le pixel art** par un pack d'images : charger les images dans `GardenScene.preload()` avec les mêmes clés de texture que `textures.ts`.

## Feuille de route

- [x] **Décorer le jardin** : décos fabriquées à l'atelier, posées et déplacées librement
- [x] **Petits visiteurs** attirés par la déco, selon la saison et l'heure
- [x] **Courrier** des voisins, cueillette, arbre à secouer
- [ ] **Croisements** : deux plantes voisines peuvent donner une variété rare
- [x] **Un compagnon** (corgi) avec 5 accessoires débloqués par l'amitié
- [x] **Un jardinier** qui se déplace pour faire chaque action
- [x] **La ferme** : rénover poulailler, clapier, bergerie et étable ; poules, lapins, moutons et vaches
- [x] **L'atelier et la maison** : une remise où l'on fabrique et démonte, une maison à meubler
- [ ] **Outils** fabriqués à l'atelier pour le jardinier (à cadrer)
- [ ] **Jalons du journal** qui débloquent de la déco
- [ ] Objectif du jour, musique douce, déco de saison
