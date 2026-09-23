/**
 * Interfaz en DOM: cabecera, botones sobre el mapa, bienvenida, dialogos,
 * paneles y el perfil completo (el indice).
 *
 * Dos sitios distintos:
 *   - #ui-root, dentro del marco del mapa: botones, ayuda.
 *   - #overlay-root, fijo a la ventana: todo lo que se lee (dialogo, paneles,
 *     indice, bienvenida). Fuera del marco para que en un movil no quede
 *     encerrado en un mapa de 250 px de alto.
 *
 * Se construye entera desde el contenido JSON: una seccion nueva no toca este
 * archivo salvo que necesite una plantilla de panel que no exista.
 */

import { emit, on } from '@/systems/bus';
import {
  content,
  getLang,
  onLangChange,
  panel as getPanel,
  sectionNumber,
  sections,
  setLang,
  speaker,
  t,
  type Lang,
} from '@/content';
import { button, conceal, el, isOpen, reveal, trapFocus } from './dom';
import { icon } from './icons';
import { renderPanelBody } from './panels';
import { mountWorldText } from './worldText';

const TYPE_SPEED = 18; // ms por caracter
const INTRO_KEY = 'aldea.intro-visto';

export class UI {
  private readonly header: HTMLElement;
  private readonly scroller: HTMLElement | null;
  private readonly panHint: HTMLElement | null;

  private readonly dialogue: HTMLElement;
  private readonly dialogueWho: HTMLElement;
  private readonly dialogueText: HTMLElement;
  private readonly dialogueNext: HTMLButtonElement;
  private readonly dialogueSkip: HTMLButtonElement;
  private readonly panelLayer: HTMLElement;
  private readonly journalLayer: HTMLElement;
  private readonly journal: HTMLElement;
  private readonly introLayer: HTMLElement;
  private readonly hint: HTMLElement;

  private lines: string[] = [];
  private lineIndex = 0;
  private typing = false;
  private typeTimer = 0;
  private currentSpeakerId = '';
  private openSectionId = '';
  /** La ultima seccion abierta: el indice la senala como "aqui lo dejaste". */
  private lastSectionId = '';
  private lastFocus: HTMLElement | null = null;
  private userPanned = false;
  /** Donde dejo el scroll el centrado automatico: llegar ahi no es un gesto de la persona. */
  private autoScrollLeft = -1;
  private readonly visited = new Set<string>();

  constructor(frameRoot: HTMLElement, overlayRoot: HTMLElement) {
    this.header = document.getElementById('stage-header') ?? el('header');
    this.scroller = document.getElementById('stage-scroll');
    this.panHint = document.getElementById('pan-hint');

    // --- dialogo ---
    this.dialogue = el('section', 'dialogue sheet');
    this.dialogue.hidden = true;
    this.dialogue.setAttribute('aria-live', 'polite');
    this.dialogueWho = el('div', 'dialogue-who');
    this.dialogueText = el('p', 'dialogue-text');
    // "Ver seccion" es lo que busca quien viene a leer: va como accion principal.
    this.dialogueSkip = button('btn btn-primary', '', () => this.skipToSection());
    this.dialogueNext = button('btn', '', () => this.advance());
    const actions = el('div', 'dialogue-actions');
    actions.append(this.dialogueNext, this.dialogueSkip);
    this.dialogue.append(this.dialogueWho, this.dialogueText, actions);

    // --- paneles ---
    this.panelLayer = el('div', 'panel-layer');
    this.panelLayer.hidden = true;

    // --- perfil completo ---
    this.journalLayer = el('div', 'journal-layer');
    this.journalLayer.hidden = true;
    const scrim = el('div', 'scrim');
    scrim.addEventListener('click', () => this.closeJournal());
    this.journal = el('aside', 'journal sheet');
    this.journal.setAttribute('role', 'dialog');
    this.journal.setAttribute('aria-modal', 'true');
    this.journal.setAttribute('aria-labelledby', 'journal-title');
    this.journalLayer.append(scrim, this.journal);

    // --- bienvenida ---
    this.introLayer = el('div', 'intro-layer');
    this.introLayer.hidden = true;

    this.hint = el('div', 'hint-bar');
    mountWorldText(frameRoot);
    frameRoot.append(this.buildHud(), this.hint);
    overlayRoot.append(this.dialogue, this.panelLayer, this.journalLayer, this.introLayer);
    this.buildHeader();

    this.bindEvents();
    this.refreshStaticText();
    onLangChange(() => this.refreshStaticText());
  }

  // -------------------------------------------------------------------------
  // Montaje
  // -------------------------------------------------------------------------

  /** Botones de idioma y de perfil completo. Se usan en el mapa y en la cabecera. */
  private buildActions(): HTMLElement {
    const box = el('div', 'actions');

    const lang = button('btn', '', () => {
      const next: Lang = getLang() === 'es' ? 'en' : 'es';
      setLang(next);
      emit('ui:lang', { lang: next });
    });
    lang.dataset.role = 'lang';

    const profile = button('btn btn-primary', '', () => this.toggleJournal());
    profile.dataset.role = 'profile';

    box.append(lang, profile);
    return box;
  }

  private buildHud(): HTMLElement {
    const hud = el('div', 'hud');
    hud.append(this.buildActions());
    return hud;
  }

  /** Cabecera de movil en vertical: quien es, a que se dedica y el acceso al perfil. */
  private buildHeader(): void {
    const who = el('div', 'stage-who');
    who.append(el('p', 'stage-name'), el('p', 'stage-role'));
    this.header.append(who, this.buildActions());
  }

  private bindEvents(): void {
    on('dialogue:open', ({ id }) => this.openDialogue(id));
    on('journal:toggle', () => this.toggleJournal());
    on('load:progress', ({ value }) => {
      const fill = document.getElementById('loading-fill');
      if (fill) fill.style.transform = `scaleX(${value})`;
    });
    on('world:ready', () => {
      const loading = document.getElementById('loading');
      loading?.classList.add('done');
      window.setTimeout(() => loading?.remove(), 600);
      this.centerMap();
      window.setTimeout(() => this.maybeShowIntro(), 650);
    });

    // En movil el mapa se arrastra: se centra al cargar y al girar la pantalla,
    // salvo que la persona ya lo haya movido.
    this.scroller?.addEventListener(
      'scroll',
      () => {
        // El evento del centrado puede llegar tarde (la carga ocupa el hilo),
        // asi que se reconoce por la posicion, no por el tiempo.
        if (Math.abs((this.scroller?.scrollLeft ?? 0) - this.autoScrollLeft) < 2) return;
        this.userPanned = true;
        this.panHint?.classList.remove('visible');
      },
      { passive: true },
    );
    window.addEventListener('resize', () => {
      if (!this.userPanned) this.centerMap();
    });

    document.addEventListener('keydown', (e) => this.onKey(e));
    this.dialogue.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('button')) this.advance();
    });
    this.panelLayer.addEventListener('mousedown', (e) => {
      if (e.target === this.panelLayer) this.closePanel();
    });
  }

  private onKey(e: KeyboardEvent): void {
    // El modal abierto de mas arriba es el que manda.
    const modal = [this.introLayer, this.panelLayer, this.journalLayer].find((n) => !n.hidden);
    if (modal) trapFocus(modal, e);

    if (e.key === 'Escape') {
      if (!this.introLayer.hidden) this.dismissIntro();
      else if (!this.panelLayer.hidden) this.closePanel();
      else if (!this.dialogue.hidden) this.closeDialogue();
      else if (!this.journalLayer.hidden) this.closeJournal();
      return;
    }

    // Con una hoja abierta, las flechas pasan de seccion como las paginas de un catalogo.
    if (modal === this.panelLayer && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      this.stepSection(e.key === 'ArrowRight' ? 1 : -1);
      e.preventDefault();
      return;
    }

    if (!this.journalLayer.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const entries = [...this.journal.querySelectorAll<HTMLButtonElement>('.journal-entry')];
      const at = entries.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
      entries[(next + entries.length) % entries.length]?.focus();
      e.preventDefault();
      return;
    }

    if (!this.dialogue.hidden && !modal && (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      this.advance();
    }
  }

  private refreshStaticText(): void {
    for (const node of document.querySelectorAll<HTMLButtonElement>('[data-role="lang"]')) {
      node.textContent = getLang() === 'es' ? 'English' : 'Español';
      node.setAttribute('aria-label', t('lang'));
    }
    for (const node of document.querySelectorAll<HTMLButtonElement>('[data-role="profile"]')) {
      node.replaceChildren(document.createTextNode(t('readProfile')), el('kbd', 'kbd', 'Q'));
    }
    const name = this.header.querySelector('.stage-name');
    const role = this.header.querySelector('.stage-role');
    if (name) name.textContent = t('headerName');
    if (role) role.textContent = t('headerRole');
    if (this.panHint) this.panHint.textContent = t('panHint');
    const loadingHint = document.getElementById('loading-hint');
    if (loadingHint) loadingHint.textContent = t('loading');

    this.hint.textContent = t('controls');
    this.dialogueSkip.textContent = t('viewSection');
    if (!this.typing) this.dialogueNext.replaceChildren(el('span', undefined, t('continue')), icon('ph-arrow-right'));
    if (!this.journalLayer.hidden) this.renderJournal();
    if (!this.panelLayer.hidden && this.openSectionId) this.renderSection(this.openSectionId);
  }

  /** En movil el mapa es mas ancho que la pantalla: se abre centrado en la plaza. */
  private centerMap(): void {
    const s = this.scroller;
    if (!s) return;
    const overflow = s.scrollWidth - s.clientWidth;
    s.scrollLeft = overflow / 2;
    this.autoScrollLeft = s.scrollLeft;
    this.panHint?.classList.toggle('visible', overflow > 4);
  }

  // -------------------------------------------------------------------------
  // Bienvenida (solo la primera vez)
  // -------------------------------------------------------------------------

  private maybeShowIntro(): void {
    try {
      if (localStorage.getItem(INTRO_KEY)) return;
    } catch {
      // Sin almacenamiento se muestra siempre: mejor de mas que de menos.
    }

    const card = el('section', 'intro-card sheet');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'intro-title');
    const title = el('h2', undefined, t('introTitle'));
    title.id = 'intro-title';
    const actions = el('div', 'intro-actions');
    const explore = button('btn', t('introExplore'), () => this.dismissIntro());
    const read = button('btn btn-primary', t('introRead'), () => this.dismissIntro(true));
    actions.append(explore, read);
    card.append(title, el('p', undefined, t('introText')), actions);

    this.introLayer.replaceChildren(el('div', 'scrim'), card);
    this.lastFocus = document.activeElement as HTMLElement;
    reveal(this.introLayer);
    read.focus();
  }

  private dismissIntro(openProfile = false): void {
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Ver maybeShowIntro.
    }
    conceal(this.introLayer, () => {
      emit('onboarding:done', undefined);
      if (openProfile) this.openJournal();
    });
  }

  // -------------------------------------------------------------------------
  // Dialogo
  // -------------------------------------------------------------------------

  private openDialogue(id: string): void {
    const who = speaker(id);
    if (!who) return;

    this.currentSpeakerId = id;
    this.lines = who.dialogue;
    this.lineIndex = 0;

    this.dialogueWho.replaceChildren(document.createTextNode(who.name), el('small', undefined, who.role));
    reveal(this.dialogue);
    this.typeLine();
  }

  private typeLine(): void {
    window.clearInterval(this.typeTimer);
    const line = this.lines[this.lineIndex] ?? '';
    this.dialogueText.textContent = '';
    this.typing = true;

    let i = 0;
    this.typeTimer = window.setInterval(() => {
      i++;
      this.dialogueText.textContent = line.slice(0, i);
      if (i >= line.length) {
        window.clearInterval(this.typeTimer);
        this.typing = false;
      }
    }, TYPE_SPEED);
  }

  /** Un clic o una tecla: primero completa la linea, luego pasa a la siguiente. */
  private advance(): void {
    if (this.typing) {
      window.clearInterval(this.typeTimer);
      this.dialogueText.textContent = this.lines[this.lineIndex] ?? '';
      this.typing = false;
      return;
    }

    this.lineIndex++;
    if (this.lineIndex < this.lines.length) {
      this.typeLine();
      return;
    }
    this.skipToSection();
  }

  /** "Ver seccion": para quien no quiere la conversacion entera. */
  private skipToSection(): void {
    const id = this.currentSpeakerId;
    this.closeDialogue();
    if (id) this.openSection(id);
  }

  private closeDialogue(): void {
    window.clearInterval(this.typeTimer);
    this.typing = false;
    conceal(this.dialogue);
    emit('dialogue:closed', undefined);
  }

  // -------------------------------------------------------------------------
  // Paneles
  // -------------------------------------------------------------------------

  /** Abre la seccion de un vecino o cartel (por su id). `dir` es el sentido al pasar de hoja. */
  private openSection(id: string, dir: -1 | 0 | 1 = 0): void {
    const who = speaker(id);
    if (!who || !getPanel(who.panel)) return;

    const opening = this.panelLayer.hidden;
    if (opening) this.lastFocus = document.activeElement as HTMLElement;
    this.renderSection(id, dir);
    this.markVisited(id);
    if (opening) reveal(this.panelLayer);
    // El foco va al titulo: el lector de pantalla anuncia la hoja nueva y no
    // queda un anillo de foco sobre "cerrar" despues de pasar de hoja.
    this.panelLayer.querySelector<HTMLElement>('#panel-title')?.focus({ preventScroll: true });
  }

  /** Hoja anterior o siguiente en el orden de lectura. */
  private stepSection(dir: -1 | 1): void {
    const list = sections();
    const at = list.findIndex((s) => s.id === this.openSectionId);
    const target = list[at + dir];
    if (at >= 0 && target) this.openSection(target.id, dir);
  }

  /**
   * La hoja a pantalla completa: referencia y titulo arriba, el cuerpo con
   * scroll propio y una barra fija abajo para pasar de seccion.
   */
  private renderSection(id: string, dir: -1 | 0 | 1 = 0): void {
    const who = speaker(id);
    const data = who ? getPanel(who.panel) : undefined;
    if (!data) return;
    this.openSectionId = id;
    this.lastSectionId = id;

    const page = el('section', 'panel');
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.setAttribute('aria-labelledby', 'panel-title');
    // El CSS lo usa para que la hoja nueva entre por el lado hacia el que se lee.
    page.dataset.dir = String(dir);

    const head = el('header', 'panel-head');
    // Referencia de hoja, como en una ficha tecnica: "AR·03 / 10".
    const ref = el('p', 'sheet-ref');
    const total = String(sections().length).padStart(2, '0');
    ref.append(`${t('refPrefix')}·`, el('span', 'ref-num', sectionNumber(id)), ` / ${total}`);
    const titles = el('div', 'panel-titles');
    const title = el('h2', undefined, data.title);
    title.id = 'panel-title';
    title.tabIndex = -1;
    const where = el('p', 'panel-where');
    where.append(icon('ph-map-pin'), el('span', undefined, data.place));
    titles.append(title, where);
    const close = button('icon-btn panel-close', '', () => this.closePanel());
    close.append(icon('ph-x'));
    close.setAttribute('aria-label', t('close'));
    titles.prepend(ref);
    head.append(titles, close);

    const scroll = el('div', 'panel-scroll');
    scroll.append(renderPanelBody(data));
    this.bindSwipe(scroll);

    page.append(head, scroll, this.renderPanelNav(id));
    this.panelLayer.replaceChildren(page);
  }

  /**
   * En pantallas tactiles, deslizar en horizontal pasa de hoja. El scroll
   * vertical sigue siendo del navegador (touch-action: pan-y en el CSS).
   */
  private bindSwipe(area: HTMLElement): void {
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    area.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      x0 = e.clientX;
      y0 = e.clientY;
      t0 = e.timeStamp;
    });
    area.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' || !t0) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      const fast = Math.abs(dx) / Math.max(1, e.timeStamp - t0) > 0.4;
      t0 = 0;
      // Claramente horizontal, y o bien largo o bien rapido.
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && (Math.abs(dx) > 70 || (fast && Math.abs(dx) > 30))) {
        this.stepSection(dx < 0 ? 1 : -1);
      }
    });
    area.addEventListener('pointercancel', () => (t0 = 0));
  }

  /** Anterior / indice / siguiente, en el mismo orden que el indice. */
  private renderPanelNav(id: string): HTMLElement {
    const nav = el('footer', 'panel-nav');
    const list = sections();
    const at = list.findIndex((s) => s.id === id);
    if (at < 0) return nav;

    const make = (target: (typeof list)[number] | undefined, dir: -1 | 1) => {
      if (!target) return el('span', 'nav-spacer');
      const btn = button(`nav-btn nav-${dir < 0 ? 'prev' : 'next'}`, '', () => this.openSection(target.id, dir));
      // En movil parte del texto se oculta: el nombre accesible no depende de el.
      btn.setAttribute('aria-label', `${t(dir < 0 ? 'prev' : 'next')}: ${target.panel.title}`);
      const text = el('span', 'nav-text');
      const label = el('span', 'nav-label', `${t(dir < 0 ? 'prev' : 'next')} · `);
      label.append(el('span', 'num', sectionNumber(target.id)));
      text.append(
        label,
        el('span', 'nav-title', target.panel.title),
      );
      const arrow = icon(dir < 0 ? 'ph-arrow-left' : 'ph-arrow-right', '', 'icon nav-arrow');
      if (dir < 0) btn.append(arrow, text);
      else btn.append(text, arrow);
      return btn;
    };

    const index = button('btn btn-quiet nav-index', '', () => {
      this.closePanel();
      this.openJournal();
    });
    index.setAttribute('aria-label', t('index'));
    index.append(icon('ph-list-numbers'), el('span', 'nav-index-label', t('index')), el('kbd', 'kbd', 'Q'));

    nav.append(make(list[at - 1], -1), index, make(list[at + 1], 1));
    return nav;
  }

  private closePanel(): void {
    this.openSectionId = '';
    conceal(this.panelLayer, () => this.panelLayer.replaceChildren());
    this.lastFocus?.focus({ preventScroll: true });
    emit('panel:closed', undefined);
  }

  private markVisited(id: string): void {
    if (this.visited.has(id)) return;
    this.visited.add(id);
    emit('journal:visited', { id });
  }

  // -------------------------------------------------------------------------
  // Perfil completo (indice)
  // -------------------------------------------------------------------------

  private toggleJournal(): void {
    if (isOpen(this.journalLayer)) this.closeJournal();
    else this.openJournal();
  }

  private openJournal(): void {
    if (!this.introLayer.hidden) this.dismissIntro();
    if (!this.panelLayer.hidden) this.closePanel();
    if (!this.dialogue.hidden) this.closeDialogue();
    this.lastFocus = document.activeElement as HTMLElement;
    this.renderJournal();
    reveal(this.journalLayer);
    this.journal.querySelector<HTMLButtonElement>('.journal-entry')?.focus({ preventScroll: true });
  }

  private closeJournal(): void {
    conceal(this.journalLayer);
    this.lastFocus?.focus({ preventScroll: true });
  }

  /**
   * Todas las secciones, en orden de lectura, para quien no quiere recorrer el
   * mapa: cada entrada abre su panel al momento.
   */
  private renderJournal(): void {
    const head = el('header', 'journal-head');
    const titles = el('div');
    const title = el('h2', undefined, t('journalTitle'));
    title.id = 'journal-title';
    titles.append(title, el('p', undefined, t('journalHint')));
    const close = button('icon-btn', '', () => this.closeJournal());
    close.append(icon('ph-x'));
    close.setAttribute('aria-label', t('close'));
    head.append(titles, close);

    const list = el('ol', 'journal-list');
    for (const { id, panel } of sections()) {
      const entry = button('journal-entry', '', () => {
        conceal(this.journalLayer);
        this.openSection(id);
      });
      const text = el('span', 'entry-text');
      text.append(el('span', 'entry-title', panel.title), el('span', 'entry-summary', panel.summary));
      // El estado es una marca, no solo un color: leido, sin leer o donde lo dejaste.
      // Solo se marca lo que informa: leido, o donde lo dejaste. Una marca de
      // "sin leer" en todas las filas seria ruido.
      const state = el('span', 'entry-state');
      if (this.visited.has(id)) state.append(icon('ph-check'), el('span', undefined, t('journalVisited')));
      entry.append(el('span', 'entry-num', sectionNumber(id)), text, state);
      if (id === this.lastSectionId) {
        entry.classList.add('is-last');
        text.append(el('span', 'entry-last', t('leftOff')));
      }
      const li = el('li');
      li.append(entry);
      list.append(li);
    }

    // Contacto a mano, sin tener que abrir su panel.
    const foot = el('footer', 'journal-foot');
    const contact = Object.values(content().panels).find((p) => p.type === 'contacto');
    if (contact?.type === 'contacto') {
      foot.append(el('h3', undefined, t('journalContact')));
      const links = el('div', 'journal-links');
      for (const link of contact.links) {
        const a = el('a', 'btn btn-small');
        a.append(icon(link.icon, link.label), el('span', undefined, link.label));
        a.href = link.href;
        if (link.href.startsWith('http')) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        links.append(a);
      }
      foot.append(links);
    }

    this.journal.replaceChildren(head, list, foot);
  }
}

export function mountUI(): UI {
  const frameRoot = document.getElementById('ui-root');
  const overlayRoot = document.getElementById('overlay-root');
  if (!frameRoot || !overlayRoot) throw new Error('Faltan #ui-root u #overlay-root en index.html');
  return new UI(frameRoot, overlayRoot);
}
