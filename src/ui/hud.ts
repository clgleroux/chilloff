// Interface HTML par-dessus le jeu : barre du haut, graines, boutique, journal, options, bulles.

import { cropIconUrl, decoIconUrl, materialIconUrl, uiIconUrl, visitorIconUrl } from '../art/textures';
import { CROPS, CROP_IDS, cropsForSeason, type CropId } from '../game/crops';
import { DECOS, DECO_IDS, type DecoId, type Recipe } from '../game/decor';
import type { Want } from '../game/letters';
import { MATERIAL_IDS, type MaterialId } from '../game/materials';
import { SEASONS, daysUntilNextSeason, nextSeason, type Season } from '../game/seasons';
import type { Game, Lang } from '../game/state';
import { VISITORS, VISITOR_IDS, type VisitorId } from '../game/visitors';
import {
  cropName, decoName, formatDate, formatDuration, getLang, materialName, onLangChange, seasonName, setLang, t, visitorName,
} from '../i18n';
import type { SceneHooks } from '../scenes/GardenScene';
import { h, pixelImg } from './dom';
import { edit } from './edit';

type PanelKind = 'shop' | 'journal' | 'options' | 'dialog' | 'workshop' | 'letter';

/** Le visiteur qu'attire une déco (s'il y en a un). */
function visitorFor(deco: DecoId): VisitorId | undefined {
  return VISITOR_IDS.find((id) => { const s = VISITORS[id].spot; return s.kind === 'deco' && s.deco === deco; });
}

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
  private journalTab: 'harvests' | 'visitors' | 'notebook' = 'harvests';
  private workshopTab: 'craft' | 'mine' = 'craft';
  private banner = h('div', { id: 'edit-banner', hidden: true });

  constructor(private game: Game) {
    document.getElementById('stage')!.append(this.banner);
    game.onChange(() => this.renderAll());
    onLangChange(() => this.renderAll());
    edit.on(() => { this.renderBanner(); this.renderBottom(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.panel) this.closePanel();
      else if (edit.active) this.finishEdit();
    });
    setInterval(() => this.renderTop(), 60_000);
    this.renderAll();
  }

  private renderAll(): void {
    this.renderTop();
    this.renderBottom();
    this.renderBanner();
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

    const craftable = DECO_IDS.some((id) => this.game.canCraft(id));
    const decosOwned = Object.values(s.decor.inventory).reduce((a, b) => a + (b ?? 0), 0);
    this.bottom.classList.toggle('editing', edit.active);
    this.bottom.replaceChildren(
      seedBar,
      h('button', { class: 'shop-btn workshop-btn', onclick: () => this.openWorkshop(decosOwned > 0 ? 'mine' : 'craft') },
        pixelImg(uiIconUrl('hammer'), 32),
        h('span', {}, t('hud.workshop')),
        decosOwned > 0 ? h('span', { class: 'badge' }, decosOwned) : craftable ? h('span', { class: 'badge dot' }, '!') : null,
      ),
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
      this.tabs(this.journalTab, [
        ['harvests', t('journal.tab.harvests')], ['visitors', t('journal.tab.visitors')], ['notebook', t('journal.tab.notebook')],
      ], (v) => (this.journalTab = v)),
      ...(this.journalTab === 'harvests' ? this.journalHarvests() : this.journalTab === 'visitors' ? this.journalVisitors() : this.journalNotebook()),
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
        row(t('journal.stat.forage'), s.journal.forageCount),
        row(t('journal.stat.letters'), s.journal.lettersDelivered),
        row(t('journal.stat.since'), formatDate(s.createdAt)),
      ),
    ];
  }

  private journalVisitors(): HTMLElement[] {
    const met = this.game.state.journal.visitors;
    const known = VISITOR_IDS.filter((id) => met[id]).length;
    return [
      h('p', { class: 'muted center' }, t('journal.visitorsDiscovered', { n: known, total: VISITOR_IDS.length })),
      h('div', { class: 'journal-grid' },
        ...VISITOR_IDS.map((id) => {
          const entry = met[id];
          return h('div', { class: `journal-entry${entry ? '' : ' unknown'}`, title: entry ? t('journal.firstOn', { date: formatDate(entry.firstAt) }) : null },
            pixelImg(visitorIconUrl(id), 48, entry ? '' : 'silhouette'),
            h('strong', {}, entry ? visitorName(id) : t('journal.unknown')),
            entry ? h('small', {}, t('journal.met', { n: entry.count })) : null,
            h('small', { class: 'hint' }, t(`visitor.hint.${id}`)),
          );
        }),
      ),
    ];
  }

  // --- Petits éléments réutilisés ----------------------------------------------

  /** Pastille « icône + avoir/besoin » (verte quand c'est bon). */
  private need(icon: string, label: string, have: number, need: number, height = 24): HTMLElement {
    return h('span', { class: `chip ${have >= need ? 'ok' : 'missing'}`, title: label },
      pixelImg(icon, 24, '', height), h('span', {}, `${Math.min(have, need)}/${need}`));
  }

  private recipeChips(recipe: Recipe): HTMLElement {
    const s = this.game.state;
    const chips: HTMLElement[] = [];
    for (const [id, n] of Object.entries(recipe.materials ?? {}) as Array<[MaterialId, number]>) {
      chips.push(this.need(materialIconUrl(id), materialName(id), s.materials[id] ?? 0, n));
    }
    for (const [id, n] of Object.entries(recipe.crops ?? {}) as Array<[CropId, number]>) {
      chips.push(this.need(cropIconUrl(id), cropName(id), s.basket[id] ?? 0, n));
    }
    if (recipe.coins) chips.push(this.need(uiIconUrl('coin'), t('hud.coins'), s.coins, recipe.coins));
    return h('div', { class: 'chips' }, ...chips);
  }

  private wantChip(w: Want): HTMLElement {
    const icon = w.kind === 'crop' ? cropIconUrl(w.id) : materialIconUrl(w.id);
    const name = w.kind === 'crop' ? cropName(w.id) : materialName(w.id);
    return h('span', { class: 'want' }, this.need(icon, name, this.game.have(w), w.n), h('small', {}, name));
  }

  // --- Courrier -------------------------------------------------------------

  openLetter(): void {
    this.openPanel('letter', () => {
      const g = this.game;
      const letter = g.state.letter;
      if (!letter) {
        const wait = Math.max(0, g.state.nextLetterAt - g.now());
        return [
          this.header(t('letter.title'), uiIconUrl('letter')),
          h('p', { class: 'empty-note' }, t('letter.none'), h('br'), t('letter.next', { time: formatDuration(wait) })),
        ];
      }
      const r = letter.reward;
      return [
        this.header(t('letter.title'), uiIconUrl('letter')),
        h('div', { class: 'letter-paper' },
          h('p', { class: 'letter-text' }, t(letter.text)),
          h('p', { class: 'letter-from' }, `— ${t(`character.${letter.from}`)}`),
        ),
        h('p', { class: 'section-title' }, t('letter.wants')),
        h('div', { class: 'wants' }, ...letter.wants.map((w) => this.wantChip(w))),
        h('p', { class: 'section-title' }, t('letter.reward')),
        h('div', { class: 'chips reward' },
          h('span', { class: 'chip ok' }, pixelImg(uiIconUrl('coin'), 24), h('span', {}, `+${r.coins}`)),
          r.deco ? h('span', { class: 'chip ok' }, pixelImg(decoIconUrl(r.deco), 24, '', DECOS[r.deco].tall ? 36 : 24), h('span', {}, decoName(r.deco))) : null,
          ...(Object.entries(r.materials ?? {}) as Array<[MaterialId, number]>).map(([id, n]) =>
            h('span', { class: 'chip ok' }, pixelImg(materialIconUrl(id), 24), h('span', {}, `+${n} ${materialName(id)}`))),
        ),
        h('p', { class: 'muted small' }, t('letter.noRush')),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost small-btn', onclick: () => { g.skipLetter(); this.closePanel(); } }, t('letter.decline')),
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn', onclick: () => this.closePanel() }, t('letter.later')),
          h('button', {
            class: 'btn primary', disabled: !g.canDeliver(),
            onclick: () => {
              const res = g.deliverLetter();
              if (!res.ok) return;
              this.closePanel();
              this.toast(`${t('letter.thanks', { name: t(`character.${res.letter.from}`) })} +${res.letter.reward.coins}`
                + (res.letter.reward.deco ? ` · ${decoName(res.letter.reward.deco)}` : ''));
            },
          }, t('letter.deliver')),
        ),
      ];
    });
  }

  // --- Atelier --------------------------------------------------------------

  openWorkshop(tab: 'craft' | 'mine'): void {
    this.workshopTab = tab;
    this.openPanel('workshop', () => [
      this.header(t('workshop.title'), uiIconUrl('hammer')),
      this.bag(),
      this.tabs(this.workshopTab, [['craft', t('workshop.tab.craft')], ['mine', t('workshop.tab.mine')]], (v) => (this.workshopTab = v)),
      ...(this.workshopTab === 'craft' ? this.workshopCraft() : this.workshopMine()),
    ]);
  }

  private bag(): HTMLElement {
    const m = this.game.state.materials;
    const owned = MATERIAL_IDS.filter((id) => (m[id] ?? 0) > 0);
    return h('div', { class: 'bag' },
      h('p', { class: 'section-title' }, t('workshop.bag')),
      owned.length
        ? h('div', { class: 'chips' }, ...owned.map((id) =>
          h('span', { class: 'chip', title: materialName(id) }, pixelImg(materialIconUrl(id), 24), h('span', {}, `×${m[id]}`))))
        : h('p', { class: 'muted small' }, t('workshop.emptyBag')),
    );
  }

  private decoImg(id: DecoId, size = 48): HTMLImageElement {
    return pixelImg(decoIconUrl(id), size, '', DECOS[id].tall ? size * 1.5 : size);
  }

  private workshopCraft(): HTMLElement[] {
    const g = this.game;
    const season = g.season;
    // Les décos de la saison et celles qu'on peut fabriquer remontent en haut de la liste.
    const order = [...DECO_IDS].sort((a, b) => Number(g.canCraft(b)) - Number(g.canCraft(a)));
    return [h('div', { class: 'card-list' }, ...order.map((id) => {
      const def = DECOS[id];
      const visitor = visitorFor(id);
      const metVisitor = visitor && g.state.journal.visitors[visitor];
      const seasonLocked = def.recipe.season && def.recipe.season !== season;
      return h('div', { class: `card craft-card${g.canCraft(id) ? ' ready' : ''}` },
        this.decoImg(id),
        h('div', { class: 'card-main' },
          h('strong', {}, decoName(id)),
          h('small', {}, t(`deco.hint.${id}`)),
          visitor ? h('small', { class: 'attracts' }, metVisitor ? t('workshop.attracts', { name: visitorName(visitor) }) : t('workshop.attractsUnknown')) : null,
          seasonLocked ? h('small', { class: 'muted' }, t('workshop.onlySeason', { season: seasonName(def.recipe.season!) })) : null,
          this.recipeChips(def.recipe),
        ),
        h('div', { class: 'card-actions' },
          h('button', {
            class: 'btn primary', disabled: !g.canCraft(id),
            onclick: () => { if (g.craft(id).ok) this.toast(t('workshop.crafted', { name: decoName(id) })); },
          }, t('workshop.craft')),
        ),
      );
    }))];
  }

  private workshopMine(): HTMLElement[] {
    const s = this.game.state;
    const owned = DECO_IDS.filter((id) => (s.decor.inventory[id] ?? 0) > 0);
    const placedCount = (id: DecoId) => s.decor.placed.filter((d) => d.id === id).length;
    const out: Array<HTMLElement | null> = [
      owned.length
        ? h('div', { class: 'card-list' }, ...owned.map((id) =>
          h('div', { class: 'card' },
            this.decoImg(id),
            h('div', { class: 'card-main' },
              h('strong', {}, decoName(id)),
              h('small', {}, t('workshop.owned', { n: s.decor.inventory[id] ?? 0 })),
              placedCount(id) ? h('small', { class: 'muted' }, t('workshop.placed', { n: placedCount(id) })) : null,
            ),
            h('div', { class: 'card-actions' },
              h('button', { class: 'btn primary', onclick: () => this.startPlacing(id) }, t('workshop.place')),
            ),
          )))
        : h('p', { class: 'empty-note' }, t('workshop.noDecos')),
      s.decor.placed.length
        ? h('button', { class: 'btn wide', onclick: () => { this.closePanel(); edit.start(null); } }, t('workshop.arrange'))
        : null,
    ];
    return out.filter((x): x is HTMLElement => x !== null);
  }

  // --- Mode déco ---------------------------------------------------------------

  private startPlacing(id: DecoId): void {
    if (edit.hand) this.game.returnDeco(edit.hand);
    if (!this.game.takeDeco(id)) return;
    this.closePanel();
    edit.start(id);
  }

  private finishEdit(): void {
    if (edit.hand) this.game.returnDeco(edit.hand);
    edit.stop();
  }

  private renderBanner(): void {
    this.banner.hidden = !edit.active;
    if (!edit.active) return;
    this.banner.replaceChildren(
      edit.hand ? pixelImg(decoIconUrl(edit.hand), 24, '', DECOS[edit.hand].tall ? 36 : 24) : pixelImg(uiIconUrl('hammer'), 24),
      h('span', {}, edit.hand ? t('edit.place', { name: decoName(edit.hand) }) : t('edit.move')),
      h('button', { class: 'btn primary', onclick: () => this.finishEdit() }, t('edit.done')),
    );
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
