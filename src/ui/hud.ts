// Interface HTML par-dessus le jeu : barre du haut, graines, boutique, journal, options, bulles.

import {
  animalIconUrl, buildingUrl, corgiUrl, cropIconUrl, decoIconUrl, furnitureIconUrl, materialIconUrl, produceIconUrl, textureUrl, uiIconUrl,
  visitorIconUrl,
} from '../art/textures';
import { ACCESSORY_IDS, NAME_MAX_LENGTH, accessoryHearts, type AccessoryId } from '../game/companion';
import { CROPS, CROP_IDS, cropsForSeason, type CropId } from '../game/crops';
import { DECOS, DECO_IDS, type DecoId, type Recipe } from '../game/decor';
import {
  BUILDINGS, BUILDING_IDS, PRODUCE, PRODUCE_IDS, isProduceReady, timeUntilProduce, type BuildingId, type ProduceId,
} from '../game/farm';
import { FURNITURE, FURNITURE_IDS, type FurnitureId } from '../game/house';
import type { Want } from '../game/letters';
import { MATERIAL_IDS, type MaterialId } from '../game/materials';
import { SEASONS, daysUntilNextSeason, nextSeason, type Season } from '../game/seasons';
import type { CraftId, Game, Lang } from '../game/state';
import { VISITOR_IDS } from '../game/visitors';
import {
  accessoryName, buildingName, cropName, decoName, formatDate, formatDuration, furnitureName, getLang, materialName, onLangChange, produceName,
  seasonName, setLang, t, visitorName,
} from '../i18n';
import type { SceneHooks } from '../scenes/GardenScene';
import { h, pixelImg } from './dom';
import { edit } from './edit';
import { indoor } from './indoor';

type WorkshopTab = 'craft' | 'furniture' | 'mine';

type PanelKind = 'shop' | 'journal' | 'options' | 'dialog' | 'workshop' | 'letter' | 'name' | 'building';

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
  private journalTab: 'harvests' | 'visitors' | 'companion' | 'notebook' = 'harvests';
  private workshopTab: WorkshopTab = 'craft';
  private banner = h('div', { id: 'edit-banner', hidden: true });

  constructor(private game: Game) {
    document.getElementById('stage')!.append(this.banner);
    game.onChange(() => this.renderAll());
    onLangChange(() => this.renderAll());
    edit.on(() => { this.renderBanner(); this.renderBottom(); });
    indoor.on(() => { this.renderBanner(); this.renderBottom(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.panel) this.closePanel();
      else if (edit.active) this.finishEdit();
      else if (indoor.hand) indoor.drop(this.game);
      else if (indoor.active) indoor.leave(this.game);
    });
    setInterval(() => this.renderTop(), 60_000);
    this.renderAll();
  }

  private renderAll(): void {
    this.renderTop();
    this.renderBottom();
    this.renderBanner();
    if (this.panel?.kind !== 'name') this.panel?.render();
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
    if (indoor.active) { this.renderHouseBar(); return; }
    const s = this.game.state;
    const owned = CROP_IDS.filter((id) => (s.seeds[id] ?? 0) > 0);
    const basketCount = [...Object.values(s.basket), ...Object.values(s.produce)].reduce((a: number, b) => a + (b ?? 0), 0);

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

    // L'atelier ne s'ouvre plus d'ici : il faut aller à la remise, à côté de la cabane.
    this.bottom.classList.toggle('editing', edit.active);
    this.bottom.classList.remove('indoor');
    this.bottom.replaceChildren(
      seedBar,
      h('button', { class: 'shop-btn', onclick: () => this.openShop(basketCount > 0 ? 'sell' : 'buy') },
        pixelImg(uiIconUrl('basket'), 32),
        h('span', {}, t('hud.shop')),
        basketCount > 0 ? h('span', { class: 'badge' }, basketCount) : null,
      ),
    );
  }

  /** Dans la maison : les meubles fabriqués, prêts à poser, et la porte pour sortir. */
  private renderHouseBar(): void {
    const inv = this.game.state.house.inventory;
    const owned = FURNITURE_IDS.filter((id) => (inv[id] ?? 0) > 0 || indoor.hand === id);
    const bar = h('div', { class: 'seedbar', role: 'listbox', 'aria-label': t('house.furniture') });
    if (!owned.length) bar.append(h('div', { class: 'seed empty' }, h('span', { class: 'seed-name' }, t('house.empty'))));
    for (const id of owned) {
      const selected = indoor.hand === id;
      const n = (inv[id] ?? 0) + (selected ? 1 : 0);
      bar.append(
        h('button', {
          class: `seed${selected ? ' selected' : ''}`, role: 'option', 'aria-selected': String(selected), title: furnitureName(id),
          onclick: () => (selected ? indoor.drop(this.game) : indoor.take(this.game, id)),
        },
          this.furnitureImg(id, 32),
          h('span', { class: 'seed-count' }, `×${n}`),
          h('span', { class: 'seed-name' }, furnitureName(id)),
        ),
      );
    }
    this.bottom.classList.remove('editing');
    this.bottom.classList.add('indoor');
    this.bottom.replaceChildren(
      bar,
      h('button', { class: 'shop-btn leave-btn', onclick: () => indoor.leave(this.game) },
        pixelImg(textureUrl('gardener_front'), 21, '', 32),
        h('span', {}, t('house.leave')),
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
    el.classList.add('closing');
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

  confirmTill(cost: number, reserved: number, onConfirm: () => void): void {
    if (this.game.state.coins - reserved < cost) {
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
    const g = this.game;
    const { basket, produce } = g.state;
    // Les légumes du panier, puis les produits de la ferme : même carte, même geste.
    const items = [
      ...CROP_IDS.filter((id) => (basket[id] ?? 0) > 0).map((id) => ({
        icon: cropIconUrl(id), name: cropName(id), n: basket[id] ?? 0, price: CROPS[id].sellPrice, sell: (q: number) => g.sell(id, q),
      })),
      ...PRODUCE_IDS.filter((id) => (produce[id] ?? 0) > 0).map((id) => ({
        icon: produceIconUrl(id), name: produceName(id), n: produce[id] ?? 0, price: PRODUCE[id].sellPrice, sell: (q: number) => g.sellProduce(id, q),
      })),
    ];
    if (items.length === 0) return [h('p', { class: 'empty-note' }, t('shop.emptyBasket'))];
    const total = items.reduce((sum, it) => sum + it.price * it.n, 0);
    const sold = (earned: number) => this.toast(t('toast.sold', { n: earned }));
    return [
      h('div', { class: 'card-list' },
        ...items.map((it) =>
          h('div', { class: 'card' },
            pixelImg(it.icon, 48),
            h('div', { class: 'card-main' },
              h('strong', {}, it.name),
              h('small', {}, t('shop.basketCount', { n: it.n, price: it.price })),
            ),
            h('div', { class: 'card-actions' },
              h('button', { class: 'btn', onclick: () => { const r = it.sell(1); if (r.ok) sold(r.earned); } }, t('shop.sellOne')),
              h('button', { class: 'btn', onclick: () => { const r = it.sell(Infinity); if (r.ok) sold(r.earned); } }, t('shop.sellAllOf', { n: it.n })),
            ),
          ),
        ),
      ),
      h('button', { class: 'btn primary wide', onclick: () => { const r = this.game.sellAll(); if (r.ok) sold(r.earned); } },
        pixelImg(uiIconUrl('coin'), 16), t('shop.sellAll', { n: total })),
    ];
  }

  // --- Journal --------------------------------------------------------------

  openJournal(tab?: 'harvests' | 'visitors' | 'companion' | 'notebook'): void {
    if (tab) this.journalTab = tab;
    this.openPanel('journal', () => [
      this.header(t('journal.title'), uiIconUrl('book')),
      this.tabs(this.journalTab, [
        ['harvests', t('journal.tab.harvests')], ['visitors', t('journal.tab.visitors')],
        ['companion', this.game.state.companion.name ?? t('companion.tab')], ['notebook', t('journal.tab.notebook')],
      ], (v) => (this.journalTab = v)),
      ...(this.journalTab === 'harvests' ? this.journalHarvests()
        : this.journalTab === 'visitors' ? this.journalVisitors()
        : this.journalTab === 'companion' ? this.journalCompanion()
        : this.journalNotebook()),
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
      h('section', { class: 'journal-season' },
        h('p', { class: 'section-title' }, t('journal.farm')),
        h('div', { class: 'journal-grid' }, ...PRODUCE_IDS.map((id) => {
          const entry = this.game.state.journal.produce[id];
          return h('div', { class: `journal-entry${entry ? '' : ' unknown'}`, title: entry ? t('journal.firstOn', { date: formatDate(entry.firstAt) }) : null },
            pixelImg(produceIconUrl(id), 48, entry ? '' : 'silhouette'),
            h('strong', {}, entry ? produceName(id) : t('journal.unknown')),
            entry ? h('small', {}, t('journal.collected', { n: entry.count })) : null,
          );
        })),
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
        row(t('journal.stat.animals'), BUILDING_IDS.reduce((n, id) => n + s.farm[id].animals, 0)),
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
            // Laisser découvrir : la note d'observation n'apparaît qu'après la rencontre.
            entry ? h('small', { class: 'hint' }, t(`visitor.hint.${id}`)) : null,
          );
        }),
      ),
    ];
  }

  // --- Compagnon --------------------------------------------------------------

  nameCompanion(): void {
    const c = this.game.state.companion;
    const input = h('input', {
      type: 'text', class: 'name-input', maxlength: NAME_MAX_LENGTH, placeholder: t('companion.namePlaceholder'),
      value: c.name ?? '', 'aria-label': t('companion.nameTitle'), autocomplete: 'off', enterkeyhint: 'done',
    });
    const confirm = () => {
      const name = this.game.nameCompanion(input.value || t('companion.namePlaceholder'));
      this.closePanel();
      this.toast(t('companion.welcome', { name }));
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });
    this.openPanel('name', () => [
      h('div', { class: 'name-panel' },
        pixelImg(corgiUrl(c.accessory), 96),
        h('h2', {}, c.name ? t('companion.rename') : t('companion.nameTitle')),
        c.name ? null : h('p', {}, t('companion.nameBody')),
        input,
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn primary', onclick: confirm }, t('companion.nameConfirm')),
        ),
      ),
    ]);
    setTimeout(() => input.focus(), 220);
  }

  private journalCompanion(): HTMLElement[] {
    const g = this.game;
    const c = g.state.companion;
    const hearts = g.companionHearts;
    const name = c.name ?? t('companion.tab');
    const heartUrl = textureUrl('fx_heart');
    // Laisser découvrir : pas de compteur ni de condition. On voit les cœurs gagnés, une petite note,
    // et les accessoires restent des silhouettes tant qu'ils ne sont pas débloqués.
    const accessoryBtn = (id: AccessoryId | null) => {
      const locked = !!id && hearts < accessoryHearts(id);
      const active = c.accessory === id;
      const btn: HTMLButtonElement = h('button', {
        class: `journal-entry accessory${active ? ' active' : ''}${locked ? ' unknown' : ''}`,
        'aria-pressed': String(active),
        onclick: () => {
          if (!locked) { g.setAccessory(id); return; }
          // Jamais d'échec silencieux : la carte se secoue, sans rien expliquer.
          btn.classList.remove('nope');
          void btn.offsetWidth;
          btn.classList.add('nope');
        },
      },
        pixelImg(corgiUrl(locked ? null : id), 48, locked ? 'silhouette' : ''),
        h('strong', {}, locked ? t('journal.unknown') : id ? accessoryName(id) : t('companion.none')),
      );
      return btn;
    };
    return [
      h('div', { class: 'companion-card' },
        pixelImg(corgiUrl(c.accessory), 96),
        h('div', { class: 'card-main' },
          h('strong', { class: 'companion-name' }, name),
          hearts ? h('div', { class: 'hearts' }, ...Array.from({ length: hearts }, () => pixelImg(heartUrl, 21, '', 18))) : null,
          h('small', {}, t(`companion.bond.${hearts}`, { name })),
          h('button', { class: 'btn small-btn', onclick: () => this.nameCompanion() }, t('companion.renameBtn')),
        ),
      ),
      h('p', { class: 'section-title' }, t('companion.accessories')),
      h('div', { class: 'journal-grid' }, accessoryBtn(null), ...ACCESSORY_IDS.map((id) => accessoryBtn(id))),
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
    for (const [id, n] of Object.entries(recipe.produce ?? {}) as Array<[ProduceId, number]>) {
      chips.push(this.need(produceIconUrl(id), produceName(id), s.produce[id] ?? 0, n));
    }
    if (recipe.coins) chips.push(this.need(uiIconUrl('coin'), t('hud.coins'), s.coins, recipe.coins));
    return h('div', { class: 'chips' }, ...chips);
  }

  private wantChip(w: Want): HTMLElement {
    const icon = w.kind === 'crop' ? cropIconUrl(w.id) : w.kind === 'produce' ? produceIconUrl(w.id) : materialIconUrl(w.id);
    const name = w.kind === 'crop' ? cropName(w.id) : w.kind === 'produce' ? produceName(w.id) : materialName(w.id);
    return h('span', { class: 'want' }, this.need(icon, name, this.game.have(w), w.n), h('small', {}, name));
  }

  // --- Courrier -------------------------------------------------------------

  openLetter(): void {
    this.game.markLetterRead();
    this.openPanel('letter', () => {
      const g = this.game;
      const letter = g.state.letter;
      if (!letter) {
        return [
          this.header(t('letter.title'), uiIconUrl('letter')),
          h('p', { class: 'empty-note' }, t('letter.none'), h('br'), t('letter.next')),
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
  // Il s'ouvre quand le jardinier arrive à la remise (voir GardenScene). On y fabrique les décos du jardin
  // et les meubles de la maison, et on démonte ce qui ne sert plus pour en récupérer les matériaux.

  openWorkshop(tab?: WorkshopTab): void {
    const s = this.game.state;
    const stock = [...Object.values(s.decor.inventory), ...Object.values(s.house.inventory)].reduce((a: number, b) => a + (b ?? 0), 0);
    this.workshopTab = tab ?? (stock > 0 ? 'mine' : 'craft');
    this.openPanel('workshop', () => [
      this.header(t('workshop.title'), uiIconUrl('hammer')),
      this.bag(),
      ...this.readyToPlace(),
      this.tabs(this.workshopTab, [
        ['craft', t('workshop.tab.craft')], ['furniture', t('workshop.tab.furniture')], ['mine', t('workshop.tab.mine')],
      ], (v) => (this.workshopTab = v)),
      ...(this.workshopTab === 'craft' ? this.workshopCraft(DECO_IDS)
        : this.workshopTab === 'furniture' ? this.workshopCraft(FURNITURE_IDS) : this.workshopMine()),
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

  /** Rappel des décos déjà fabriquées : un toucher pour les poser. */
  private readyToPlace(): HTMLElement[] {
    const inv = this.game.state.decor.inventory;
    const owned = DECO_IDS.filter((id) => (inv[id] ?? 0) > 0);
    if (!owned.length) return [];
    return [h('div', { class: 'bag' },
      h('p', { class: 'section-title' }, t('workshop.ready')),
      h('div', { class: 'chips' }, ...owned.map((id) =>
        h('button', { class: 'chip chip-btn', title: `${t('workshop.place')} : ${decoName(id)}`, onclick: () => this.startPlacing(id) },
          pixelImg(decoIconUrl(id), 24, '', DECOS[id].tall ? 36 : 24), h('span', {}, `×${inv[id]}`)))),
    )];
  }

  private decoImg(id: DecoId, size = 48): HTMLImageElement {
    return pixelImg(decoIconUrl(id), size, '', DECOS[id].tall ? size * 1.5 : size);
  }

  private furnitureImg(id: FurnitureId, size = 48): HTMLImageElement {
    return pixelImg(furnitureIconUrl(id), size, '', FURNITURE[id].tall ? size * 1.5 : size);
  }

  private craftImg(id: CraftId, size = 48): HTMLImageElement {
    return id in FURNITURE ? this.furnitureImg(id as FurnitureId, size) : this.decoImg(id as DecoId, size);
  }

  private craftName(id: CraftId): string {
    return id in FURNITURE ? furnitureName(id as FurnitureId) : decoName(id as DecoId);
  }

  /** Les décos du jardin, ou les meubles de la maison, à fabriquer. */
  private workshopCraft(ids: readonly CraftId[]): HTMLElement[] {
    const g = this.game;
    const season = g.season;
    // Ce qu'on peut fabriquer remonte en haut de la liste.
    const order = [...ids].sort((a, b) => Number(g.canCraft(b)) - Number(g.canCraft(a)));
    return [h('div', { class: 'card-list' }, ...order.map((id) => {
      const furniture = id in FURNITURE;
      const recipe = g.recipeOf(id);
      const seasonLocked = recipe.season && recipe.season !== season;
      const stock = g.stockOf(id);
      const placed = furniture
        ? g.state.house.placed.filter((d) => d.id === id).length
        : g.state.decor.placed.filter((d) => d.id === id).length;
      return h('div', { class: `card craft-card${g.canCraft(id) ? ' ready' : ''}` },
        this.craftImg(id),
        h('div', { class: 'card-main' },
          h('strong', {}, this.craftName(id)),
          // Laisser découvrir : on décrit l'objet, jamais le visiteur qu'il attire.
          h('small', {}, t(furniture ? `furniture.hint.${id}` : `deco.hint.${id}`)),
          seasonLocked ? h('small', { class: 'muted' }, t('workshop.onlySeason', { season: seasonName(recipe.season!) })) : null,
          stock || placed ? h('small', { class: 'stock' }, [
            stock ? t('workshop.toPlace', { n: stock }) : '',
            placed ? t(furniture ? 'workshop.inHouse' : 'workshop.inGarden', { n: placed }) : '',
          ].filter(Boolean).join(' · ')) : null,
          this.recipeChips(recipe),
        ),
        h('div', { class: 'card-actions' },
          h('button', {
            class: 'btn primary', disabled: !g.canCraft(id),
            onclick: () => {
              if (g.craft(id).ok) this.toast(t(furniture ? 'workshop.craftedFurniture' : 'workshop.crafted', { name: this.craftName(id) }));
            },
          }, t('workshop.craft')),
        ),
      );
    }))];
  }

  /** Ce qu'on a fabriqué (ou reçu des voisins) sans l'avoir posé : le poser, ou le démonter. */
  private workshopMine(): HTMLElement[] {
    const s = this.game.state;
    const decos = DECO_IDS.filter((id) => (s.decor.inventory[id] ?? 0) > 0);
    const furniture = FURNITURE_IDS.filter((id) => (s.house.inventory[id] ?? 0) > 0);
    const card = (id: CraftId, extra: HTMLElement | null, actions: HTMLElement[]) =>
      h('div', { class: 'card' },
        this.craftImg(id),
        h('div', { class: 'card-main' },
          h('strong', {}, this.craftName(id)),
          h('small', {}, t('workshop.owned', { n: this.game.stockOf(id) })),
          extra,
        ),
        h('div', { class: 'card-actions' }, ...actions),
      );
    const dismantleBtn = (id: CraftId) => h('button', { class: 'btn ghost', onclick: () => this.confirmDismantle(id) }, t('workshop.dismantle'));
    const placedCount = (id: DecoId) => s.decor.placed.filter((d) => d.id === id).length;
    const out: Array<HTMLElement | null> = [];
    if (!decos.length && !furniture.length) out.push(h('p', { class: 'empty-note' }, t('workshop.noDecos')));
    if (decos.length) {
      out.push(h('p', { class: 'section-title' }, t('workshop.forGarden')));
      out.push(h('div', { class: 'card-list' }, ...decos.map((id) => card(id,
        placedCount(id) ? h('small', { class: 'muted' }, t('workshop.placed', { n: placedCount(id) })) : null,
        [h('button', { class: 'btn primary', onclick: () => this.startPlacing(id) }, t('workshop.place')), dismantleBtn(id)]))));
    }
    if (furniture.length) {
      out.push(h('p', { class: 'section-title' }, t('workshop.forHouse')));
      out.push(h('div', { class: 'card-list' }, ...furniture.map((id) => card(id,
        h('small', { class: 'muted' }, t('workshop.placeInHouse')), [dismantleBtn(id)]))));
    }
    if (s.decor.placed.length) {
      out.push(h('button', { class: 'btn wide', onclick: () => { this.closePanel(); edit.start(null); } }, t('workshop.arrange')));
    }
    return out.filter((x): x is HTMLElement => x !== null);
  }

  /** Démonter : on dit ce qu'on récupère, et on demande confirmation. */
  private confirmDismantle(id: CraftId): void {
    const salvage = Object.entries(this.game.salvageOf(id)) as Array<[MaterialId, number]>;
    const body = salvage.length
      ? t('workshop.dismantleBody', { list: salvage.map(([m, n]) => `${n} × ${materialName(m)}`).join(', ') })
      : t('workshop.dismantleNothing');
    this.dialog(t('workshop.dismantleTitle', { name: this.craftName(id) }), body, t('workshop.dismantle'), () => {
      const res = this.game.dismantle(id);
      this.openWorkshop('mine');
      if (res.ok) this.toast(t('workshop.dismantled', { name: this.craftName(id) }));
      else this.toast(t('workshop.notInStock'));
    });
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
    if (indoor.active) { this.renderHouseBanner(); return; }
    this.banner.hidden = !edit.active;
    if (!edit.active) return;
    this.banner.replaceChildren(
      edit.hand ? pixelImg(decoIconUrl(edit.hand), 24, '', DECOS[edit.hand].tall ? 36 : 24) : pixelImg(uiIconUrl('hammer'), 24),
      h('span', {}, edit.hand
        ? t('edit.placeCount', { name: decoName(edit.hand), n: 1 + (this.game.state.decor.inventory[edit.hand] ?? 0) })
        : t('edit.move')),
      h('button', { class: 'btn primary', onclick: () => this.finishEdit() }, t('edit.done')),
    );
  }

  /** Dans la maison, avec un meuble en main : où le poser, et un bouton pour le ranger. */
  private renderHouseBanner(): void {
    const hand = indoor.hand;
    this.banner.hidden = !hand;
    if (!hand) return;
    const n = 1 + (this.game.state.house.inventory[hand] ?? 0);
    this.banner.replaceChildren(
      this.furnitureImg(hand, 24),
      h('span', {}, t(FURNITURE[hand].spot === 'wall' ? 'house.hang' : 'house.place', { name: furnitureName(hand), n })),
      h('button', { class: 'btn primary', onclick: () => indoor.drop(this.game) }, t('house.putAway')),
    );
  }

  // --- La ferme ---------------------------------------------------------------

  /** La fiche d'un bâtiment : le rénover s'il est en ruine, sinon y accueillir un animal de plus. */
  openBuilding(id: BuildingId): void {
    this.openPanel('building', () => {
      const g = this.game;
      const b = g.state.farm[id];
      const def = BUILDINGS[id];
      const picture = pixelImg(buildingUrl(id, g.season, b.renovated), 96, 'building-img', 96 * (this.buildingRatio(id)));
      if (!b.renovated) {
        const can = g.missingFor(def.renovation).length === 0;
        return [
          this.header(buildingName(id)),
          h('div', { class: 'companion-card' }, picture,
            // Laisser découvrir : on décrit le bâtiment, pas ce qu'il deviendra.
            h('div', { class: 'card-main' }, h('small', {}, t(`building.ruin.${id}`))),
          ),
          h('p', { class: 'section-title' }, t('farm.renovateNeeds')),
          this.recipeChips(def.renovation),
          h('div', { class: 'dialog-actions' },
            h('button', { class: 'btn ghost', onclick: () => this.closePanel() }, t('common.cancel')),
            h('button', {
              class: 'btn primary', disabled: !can,
              onclick: () => {
                if (!g.renovate(id).ok) return;
                this.closePanel();
                this.toast(t(`farm.renovated.${id}`));
              },
            }, t('farm.renovate')),
          ),
        ];
      }
      const now = g.now();
      const full = b.animals >= def.capacity;
      const icons = Array.from({ length: def.capacity }, (_, k) =>
        pixelImg(animalIconUrl(def.animal), def.animal === 'cow' ? 36 : 24, k < b.animals ? '' : 'faded', 24));
      return [
        this.header(buildingName(id)),
        h('div', { class: 'companion-card' }, picture,
          h('div', { class: 'card-main' },
            h('small', {}, t(`building.hint.${id}`)),
            h('div', { class: 'animals' }, ...icons),
            h('small', { class: 'stock' }, isProduceReady(id, b)
              ? t('farm.waiting', { name: produceName(def.produce) })
              : t('farm.next', { name: produceName(def.produce), time: formatDuration(timeUntilProduce(id, b, now)) })),
            h('small', {}, t('shop.sellPrice', { price: PRODUCE[def.produce].sellPrice })),
          ),
        ),
        h('div', { class: 'card' },
          pixelImg(animalIconUrl(def.animal), def.animal === 'cow' ? 72 : 48, '', 48),
          h('div', { class: 'card-main' },
            h('strong', {}, t(`farm.more.${def.animal}`)),
            h('small', {}, full ? t(`farm.full.${def.animal}`) : t('farm.count', { n: b.animals, max: def.capacity })),
          ),
          h('div', { class: 'card-actions' },
            h('button', {
              class: 'btn primary', disabled: full || g.state.coins < def.animalPrice,
              onclick: () => { if (g.adopt(id).ok) this.toast(t(`farm.adopted.${id}`)); },
            }, t('farm.adopt'), h('span', { class: 'price' }, pixelImg(uiIconUrl('coin'), 16), def.animalPrice)),
          ),
        ),
      ];
    });
  }

  private buildingRatio(id: BuildingId): number {
    const sizes: Record<BuildingId, number> = { coop: 28 / 30, hutch: 24 / 32, sheepfold: 38 / 48, barn: 44 / 56 };
    return sizes[id];
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
