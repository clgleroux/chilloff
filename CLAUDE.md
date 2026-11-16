# Chilloff — consignes pour les prochaines features

Petit potager chill en temps réel (Phaser + TypeScript + Vite), textes en français et en anglais.
Organisation du code, commandes (`npm test`, `npm run build`) et feuille de route : voir le README.

## Laisser découvrir (à appliquer à chaque feature)

Le jeu donne très peu d'informations au joueur : il découvre par lui-même et se laisse porter
(par exemple, rien ne dit que certaines décos de l'atelier attirent des visiteurs).
Avant d'ajouter un texte, une infobulle ou un toast, se demander : **est-ce que ça explique un geste,
ou est-ce que ça gâche une découverte ?** Seuls les gestes s'expliquent.

Checklist pour toute nouvelle feature :

- Aucun texte du jeu ne dit qui vient, quand, pourquoi, ni avec quelle probabilité ou quel multiplicateur.
  Les prix et les temps de pousse restent visibles : ils servent à décider.
- Les descriptions (`deco.hint.*` et les suivantes dans `src/i18n/`) décrivent l'objet, jamais son effet.
- Le journal ne montre une note qu'après la découverte ; avant, silhouette et « ??? ».
- Pas de tutoriel ni d'annonce « Nouveau ! » : un toast au moment où le joueur tombe dessus.
- Les indices passent par le monde (sprites, animations, lettres des voisins) plutôt que par l'interface.
- Jamais d'échec silencieux : une action qui ne marche pas se voit, même sans explication.
- Le README et les commentaires du code peuvent tout expliquer : c'est le jeu qui se tait.
- Toujours mettre à jour `fr.ts` et `en.ts` ensemble.

Détails et exemples pour la feuille de route : section « Principe de design : laisser découvrir » du README.
