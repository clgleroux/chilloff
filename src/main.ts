import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { allCanvases } from './art/textures';
import { WELCOME_BACK_AFTER } from './game/config';
import { isRipe } from './game/growth';
import { Game, type GameEvent } from './game/state';
import { cropName, detectLang, setLang, t } from './i18n';
import { GardenScene } from './scenes/GardenScene';
import './style.css';
import { Hud } from './ui/hud';

if (new URLSearchParams(location.search).has('atlas')) {
  showAtlas();
} else {
  start();
}

function start(): void {
  const { game, report } = Game.load(window.localStorage);
  setLang(game.state.settings.lang ?? detectLang());

  const hud = new Hud(game);
  const scene = new GardenScene(game, hud);
  // Pour les tests dans le navigateur (scripts/e2e.mjs) : ?debug expose la partie et la scène.
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { chilloff: game, chilloffScene: scene });

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#2b2233',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [scene],
    banner: false,
  });

  // Accueil
  if (report.isNew) hud.toast(t('toast.welcome'));
  else if (report.awayMs > 0) welcomeBack(game, hud);
  if (report.seasonChanged) hud.toast(t(`season.arrived.${report.seasonChanged.to}`));

  // Événements en cours de partie (plantes mûres regroupées, saison qui change).
  let ripeBuffer: GameEvent[] = [];
  let mutedUntil = 0;
  game.onEvent((e) => {
    if (e.type === 'seasonChanged') hud.toast(t(`season.arrived.${e.to}`));
    if (e.type === 'letterArrived') hud.toast(t('toast.letterArrived'));
    if (e.type === 'ripened' && Date.now() > mutedUntil) {
      ripeBuffer.push(e);
      if (ripeBuffer.length === 1) {
        setTimeout(() => {
          const first = ripeBuffer[0];
          hud.toast(ripeBuffer.length === 1 && first.type === 'ripened'
            ? t('toast.ripened', { crop: cropName(first.crop) })
            : t('toast.ready', { n: ripeBuffer.length }));
          ripeBuffer = [];
        }, 400);
      }
    }
  });

  // Horloge du jeu et sauvegarde automatique.
  setInterval(() => game.tick(), 1000);
  setInterval(() => game.save(), 20_000);

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      game.save();
    } else {
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      if (away >= WELCOME_BACK_AFTER) {
        mutedUntil = Date.now() + 1500; // le « bon retour » résume déjà les plantes prêtes
        game.tick();
        welcomeBack(game, hud);
      } else {
        game.tick();
      }
    }
  });
  window.addEventListener('pagehide', () => game.save());

  registerSW({ immediate: true });
}

function welcomeBack(game: Game, hud: Hud): void {
  const ready = game.state.plots.filter((p) => p.plant && isRipe(p.plant)).length;
  hud.toast(`${t('toast.welcomeBack')} ${ready ? t('toast.ready', { n: ready }) : t('toast.noneReady')}`);
}

/** Planche de tous les sprites, pour travailler le pixel art : ouvrir `?atlas`. */
function showAtlas(): void {
  document.body.className = 'atlas';
  document.body.replaceChildren();
  for (const [key, canvas] of allCanvases()) {
    const fig = document.createElement('figure');
    canvas.style.width = `${canvas.width * 4}px`;
    canvas.style.height = `${canvas.height * 4}px`;
    const cap = document.createElement('figcaption');
    cap.textContent = key;
    fig.append(canvas, cap);
    document.body.append(fig);
  }
}
