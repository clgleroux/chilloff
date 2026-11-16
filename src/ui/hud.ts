// Interface HTML par-dessus le jeu : barre du haut, graines, boutique, journal, options, bulles.

import { cropIconUrl, uiIconUrl } from '../art/textures';
import { CROPS, CROP_IDS, cropsForSeason, type CropId } from '../game/crops';
import { SEASONS, daysUntilNextSeason, nextSeason, type Season } from '../game/seasons';
import type { Game, Lang } from '../game/state';
import { cropName, formatDate, formatDuration, getLang, onLangChange, seasonName, setLang, t } from '../i18n';
import type { SceneHooks } from '../scenes/GardenScene';
import { h, pixelImg } from './dom';

type PanelKind = 'shop' | 'journal' | 'options' | 'dialog';

interface OpenPanel {
  kind: PanelKind;
  el: HTMLElement;
  render: () => void;
}

export class Hud implements SceneHooks {
  private top = document.getElementById('topbar')!;
  private bottom = document.getElementById('bottombar')!;
  private panelRoot = document.getElementById('panel-root')!;
  private toastRoot = document.getElementById('toast-root')!;
  private panel: OpenPanel | null = null;
  private shopTab: 'buy' | 'sell' = 'buy';
  private journalTab: 'harvests' | 'notebook' = 'harvests';

  constructor(private game: Game) {
    game.onChange(() => this.renderAll());
    onLangChange(() => this.renderAll());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closePanel(); });
    setInterval(() => this.renderTop(), 60_000);
    this.renderAll();
  }

  private renderAll(): void {
    this.renderTop();
    this.renderBottom();
    this.panel?.render();
  }

  // --- Barre du haut ----------------------------------------------------------

  private renderTop(): void {
    const now = new Date(this.game.now());
    const season = this.game.season;
    const days = daysUntilNextSeason(now);
    this.top.replaceChildren(
      h('div', { class: `pill season season-${season}` },
        pixelImg(uiIconUrl(season), 32),
        h('div', { class: 'season-text' },
          h('strong', {}, seasonName(season)),
          h('small', {}, t('season.next', { n: days, season: seasonName(nextSeason(season)) })),
        ),
      ),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill coins', title: t('hud.coins') },
        pixelImg(uiIconUrl('coin'), 32),
        h('span', { class: 'coin-count' }, this.game.state.coins),
      ),
      h('button', { class: 'icon-btn', 'aria-label': t('hud.journal'), title: t('hud.journal'), onclick: () => this.openJournal() },
        pixelImg(uiIconUrl('book'), 32),
      ),
      h('button', { class: 'icon-btn', 'aria-label': t('hud.options'), title: t('hud.options'), onclick: () => this.openOptions() },
        pixelImg(uiIconUrl('gear'), 32),
      ),
    );
  }

  // --- Barre du bas : graines + boutique ---------------------------------------

  private renderBottom(): void {
    const s = this.game.state;
    const owned = CROP_IDS.filter((id) => (s.seeds[id] ?? 0) > 0);
    const basketCount = Object.values(s.basket).reduce((a, b) => a + (b ?? 0), 0);

    const seedBar = h('div', { class: 'seedbar', role: 'listbox', 'aria-label': t('hud.seeds') });
    if (owned.length === 0) {
      seedBar.append(
        h('button', { class: 'seed empty', onclick: () => this.openShop('buy') },
          h('span', { class: 'seed-name' }, t('hud.noSeeds')),
          h('small', {}, t('hud.buySeeds')),
        ),
      );
    }
    for (const id of owned) {
      const selected = s.selectedSeed === id;
      seedBar.append(
        h('button', {
          class: `seed${selected ? ' selected' : ''}`, role: 'option', 'aria-selected': String(selected),
          title: cropName(id), onclick: () => this.game.selectSeed(id),
        },
          pixelImg(cropIconUrl(id), 32),
          h('span', { class: 'seed-count' }, `×${s.seeds[id]}`),
          h('span', { class: 'seed-name' }, cropName(id)),
        ),
      );
    }

    this.bottom.replaceChildren(
      seedBar,
      h('button', { class: 'shop-btn', onclick: () => this.openShop(basketCount > 0 ? 'sell' : 'buy') },
        pixelImg(uiIconUrl('basket'), 32),
        h('span', {}, t('hud.shop')),
        basketCount > 0 ? h('span', { class: 'badge' }, basketCount) : null,
      ),
    );
  }

  // --- Bulles ---------------------------------------------------------------

  toast(message: string): void {
    const el = h('div', { class: 'toast' }, message);
    this.toastRoot.append(el);
    while (this.toastRoot.children.length > 3) this.toastRoot.firstElementChild?.remove();
    setTimeout(() => el.classList.add('leaving'), 2800);
    setTimeout(() => el.remove(), 3200);
  }

  // --- Panneaux ---------------------------------------------------------------

  private openPanel(kind: PanelKind, build: () => HTMLElement[]): void {
    this.closePanel();
    const body = h('div', { class: 'panel-body' });
    const sheet = h('div', { class: `panel panel-${kind}`, role: 'dialog', 'aria-modal': 'true' }, body);
    const overlay = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === overlay) this.closePanel(); } }, sheet);
    const render = () => {
      const scroll = body.scrollTop;
      body.replaceChildren(...build());
      body.scrollTop = scroll;
    };
    this.panel = { kind, el: overlay, render };
    render();
    this.panelRoot.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  closePanel(): void {
    if (!this.panel) return;
    const el = this.panel.el;
    this.panel = null;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 180);
  }

  private header(title: string, icon?: string): HTMLElement {
    return h('div', { class: 'panel-header' },
      icon ? pixelImg(icon, 32) : null,
      h('h2', {}, title),
      h('button', { class: 'close-btn', 'aria-label': t('common.close'), onclick: () => this.closePanel() }, '✕'),
    );
  }

  private tabs<T extends string>(current: T, items: Array<[T, string]>, onPick: (v: T) => void): HTMLElement {
    return h('div', { class: 'tabs', role: 'tablist' },
      ...items.map(([value, label]) =>
        h('button', {
          class: `tab${value === current ? ' active' : ''}`, role: 'tab', 'aria-selected': String(value === current),
          onclick: () => { onPick(value); this.panel?.render(); },
        }, label),
      ),
    );
  }

  private dialog(title: string, body: string, confirmLabel: string, onConfirm: () => void, danger = false): void {
    this.openPanel('dialog', () => [
      h('h2', {}, title),
      h('p', {}, body),
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn ghost', onclick: () => this.closePanel() }, t('common.cancel')),
        h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => { this.closePanel(); onConfirm(); } }, confirmLabel),
      ),
    ]);
  }

  confirmTill(cost: number, onConfirm: () => void): void {
    if (this.game.state.coins < cost) {
      this.toast(`${t('toast.notEnoughCoins')} (${cost})`);
      return;
    }
    this.dialog(t('till.title'), t('till.body', { cost }), `${t('till.confirm')} · ${cost}`, onConfirm);
  }

  // --- Boutique -------------------------------------------------------------

  openShop(tab: 'buy' | 'sell'): void {
    this.shopTab = tab;
    this.openPanel('shop', () => [
      this.header(t('shop.title'), uiIconUrl('basket')),
      this.tabs(this.shopTab, [['buy', t('shop.tab.buy')], ['sell', t('shop.tab.sell')]], (v) => (this.shopTab = v)),
      ...(this.shopTab === 'buy' ? this.shopBuy() : this.shopSell()),
    ]);
  }

  private shopBuy(): HTMLElement[] {
    const season = this.game.season;
    const coins = this.game.state.coins;
    const list = h('div', { class: 'card-list' });
    for (const crop of cropsForSeason(season)) {
      const owned = this.game.state.seeds[crop.id] ?? 0;
      const buyBtn = (n: number) =>
        h('button', {
          class: 'btn primary', disabled: coins < crop.seedPrice * n,
          onclick: () => {
            const res = this.game.buySeeds(crop.id, n);
            if (res.ok) this.game.selectSeed(crop.id);
            else if (res.reason === 'notEnoughCoins') this.toast(t('toast.notEnoughCoins'));
          },
          'aria-label': t('shop.buy', { n }),
        }, `×${n}`, h('span', { class: 'price' }, pixelImg(uiIconUrl('coin'), 16), crop.seedPrice * n));
      list.append(
        h('div', { class: 'card' },
          pixelImg(cropIconUrl(crop.id), 48),
          h('div', { class: 'card-main' },
            h('strong', {}, cropName(crop.id)),
            h('small', {}, t('shop.growTime', { time: formatDuration(crop.growTime) })),
            h('small', {}, t('shop.sellPrice', { price: crop.sellPrice })),
            owned ? h('small', { class: 'muted' }, t('shop.owned', { n: owned })) : null,
          ),
          h('div', { class: 'card-actions' }, buyBtn(1), buyBtn(5)),
        ),
      );
    }
    const next = nextSeason(season);
    return [
      h('p', { class: 'section-title' }, pixelImg(uiIconUrl(season), 16), t('shop.seasonSeeds', { season: seasonName(season) })),
      list,
      h('div', { class: 'teaser' },
        h('small', {}, t('shop.nextSeason', { season: seasonName(next) })),
        h('div', { class: 'teaser-icons' }, ...cropsForSeason(next).map((c) => pixelImg(cropIconUrl(c.id), 32, 'faded'))),
      ),
    ];
  }

  private shopSell(): HTMLElement[] {
    const basket = this.game.state.basket;
    const ids = CROP_IDS.filter((id) => (basket[id] ?? 0) > 0);
    if (ids.length === 0) return [h('p', { class: 'empty-note' }, t('shop.emptyBasket'))];
    const total = ids.reduce((sum, id) => sum + CROPS[id].sellPrice * (basket[id] ?? 0), 0);
    const sold = (earned: number) => this.toast(t('toast.sold', { n: earned }));
    return [
      h('div', { class: 'card-list' },
        ...ids.map((id) =>
          h('div', { class: 'card' },
            pixelImg(cropIconUrl(id), 48),
            h('div', { class: 'card-main' },
              h('strong', {}, cropName(id)),
              h('small', {}, t('shop.basketCount', { n: basket[id] ?? 0, price: CROPS[id].sellPrice })),
            ),
            h('div', { class: 'card-actions' },
              h('button', { class: 'btn', onclick: () => { const r = this.game.sell(id, 1); if (r.ok) sold(r.earned); } }, t('shop.sellOne')),
              h('button', { class: 'btn', onclick: () => { const r = this.game.sell(id, Infinity); if (r.ok) sold(r.earned); } }, t('shop.sellAllOf', { n: basket[id] ?? 0 })),
            ),
          ),
        ),
      ),
      h('button', { class: 'btn primary wide', onclick: () => { const r = this.game.sellAll(); if (r.ok) sold(r.earned); } },
        pixelImg(uiIconUrl('coin'), 16), t('shop.sellAll', { n: total })),
    ];
  }

  // --- Journal --------------------------------------------------------------

  openJournal(): void {
    this.openPanel('journal', () => [
      this.header(t('journal.title'), uiIconUrl('book')),
      this.tabs(this.journalTab, [['harvests', t('journal.tab.harvests')], ['notebook', t('journal.tab.notebook')]], (v) => (this.journalTab = v)),
      ...(this.journalTab === 'harvests' ? this.journalHarvests() : this.journalNotebook()),
    ]);
  }

  private journalHarvests(): HTMLElement[] {
    const j = this.game.state.journal;
    const discovered = CROP_IDS.filter((id) => j.crops[id]).length;
    const bySeason = (season: Season) => CROP_IDS.filter((id) => CROPS[id].season === season);
    return [
      h('p', { class: 'muted center' }, t('journal.discovered', { n: discovered, total: CROP_IDS.length })),
      ...SEASONS.map((season) =>
        h('section', { class: 'journal-season' },
          h('p', { class: 'section-title' }, pixelImg(uiIconUrl(season), 16), seasonName(season)),
          h('div', { class: 'journal-grid' }, ...bySeason(season).map((id) => this.journalEntry(id))),
        ),
      ),
    ];
  }

  private journalEntry(id: CropId): HTMLElement {
    const entry = this.game.state.journal.crops[id];
    if (!entry) {
      return h('div', { class: 'journal-entry unknown' },
        pixelImg(cropIconUrl(id), 48, 'silhouette'),
        h('strong', {}, t('journal.unknown')),
      );
    }
    return h('div', { class: 'journal-entry', title: t('journal.firstOn', { date: formatDate(entry.firstAt) }) },
      pixelImg(cropIconUrl(id), 48),
      h('strong', {}, cropName(id)),
      h('small', {}, t('journal.harvested', { n: entry.count })),
    );
  }

  private journalNotebook(): HTMLElement[] {
    const s = this.game.state;
    const row = (label: string, value: string | number) => h('div', { class: 'stat' }, h('span', {}, label), h('strong', {}, value));
    return [
      h('div', { class: 'stats' },
        row(t('journal.stat.days'), s.journal.daysPlayed),
        row(t('journal.stat.harvests'), s.journal.totalHarvests),
        row(t('journal.stat.coins'), s.journal.coinsEarned),
        row(t('journal.stat.plots'), s.plots.filter((p) => p.tilled).length),
        row(t('journal.stat.since'), formatDate(s.createdAt)),
      ),
      h('p', { class: 'muted center soon' }, t('journal.soon')),
    ];
  }

  // --- Options --------------------------------------------------------------

  openOptions(): void {
    const langBtn = (lang: Lang, label: string) =>
      h('button', {
        class: `tab${getLang() === lang ? ' active' : ''}`,
        onclick: () => { this.game.setLang(lang); setLang(lang); },
      }, label);
    this.openPanel('options', () => [
      this.header(t('options.title'), uiIconUrl('gear')),
      h('p', { class: 'section-title' }, t('options.language')),
      h('div', { class: 'tabs' }, langBtn('fr', 'Français'), langBtn('en', 'English')),
      h('p', {}, t('options.about')),
      h('p', { class: 'muted' }, t('options.saved')),
      h('button', {
        class: 'btn danger wide',
        onclick: () => this.dialog(t('options.reset'), t('options.resetConfirm'), t('options.resetYes'), () => this.game.reset(), true),
      }, t('options.reset')),
      h('p', { class: 'muted center version' }, `Chilloff v${__APP_VERSION__}`),
    ]);
  }
}
