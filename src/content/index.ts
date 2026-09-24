// Textos (es.json / en.json) e idioma

import esRaw from './es.json';
import enRaw from './en.json';

export type Lang = 'es' | 'en';

export interface Speaker {
  name: string;
  role: string;
  dialogue: string[];
  panel: string;
  /** frases sueltas mientras pasea */
  chatter?: string[];
}

interface PanelBase {
  /** "La herreria" */
  place: string;
  /** "Backend" */
  title: string;
  /** linea del indice */
  summary: string;
  intro: string;
  note?: string;
}

export interface Tech {
  name: string;
  /** nombre del svg en src/ui/iconos */
  icon?: string;
  /** certificacion o proyecto que lo respalda */
  evidence?: string;
}

export interface PanelTexto extends PanelBase {
  type: 'texto';
  items: string[];
  // solo "Sobre mi"; vacio = no se muestra
  photo?: string;
  cv?: string;
}

export interface PanelSkills extends PanelBase {
  type: 'skills';
  groups: Array<{ name: string; items: Tech[] }>;
}

export interface PanelProyectos extends PanelBase {
  type: 'proyectos';
  items: Array<{
    name: string;
    status: string;
    stack: Tech[];
    text: string;
    link: string;
    linkText: string;
    image?: string;
  }>;
}

export interface PanelCertificaciones extends PanelBase {
  type: 'certificaciones';
  shelves: Array<{
    name: string;
    icon?: string;
    items: Array<{
      name: string;
      org: string;
      date: string;
      verify?: string;
      badge?: string;
    }>;
  }>;
}

export interface PanelContacto extends PanelBase {
  type: 'contacto';
  links: Array<{ label: string; value: string; href: string; icon?: string }>;
}

export type Panel = PanelTexto | PanelSkills | PanelProyectos | PanelCertificaciones | PanelContacto;

export interface Content {
  ui: Record<string, string>;
  order: string[];
  npcs: Record<string, Speaker>;
  signs: Record<string, Speaker>;
  panels: Record<string, Panel>;
}

const BUNDLES: Record<Lang, Content> = {
  es: esRaw as unknown as Content,
  en: enRaw as unknown as Content,
};

const STORAGE_KEY = 'aldea.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

let current: Lang = detect();
const listeners = new Set<(lang: Lang) => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
  }
  document.documentElement.lang = lang;
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function content(): Content {
  return BUNDLES[current];
}

/** Si falta la clave devuelve la clave, para que se note. */
export function t(key: string): string {
  return content().ui[key] ?? key;
}

export function speaker(id: string): Speaker | undefined {
  const c = content();
  return c.npcs[id] ?? c.signs[id];
}

export function panel(id: string): Panel | undefined {
  return content().panels[id];
}

export function sections(): Array<{ id: string; who: Speaker; panel: Panel }> {
  const c = content();
  return c.order.flatMap((id) => {
    const who = c.npcs[id] ?? c.signs[id];
    const data = who ? c.panels[who.panel] : undefined;
    return who && data ? [{ id, who, panel: data }] : [];
  });
}

/** "02" */
export function sectionNumber(id: string): string {
  const at = content().order.indexOf(id);
  return at < 0 ? '' : String(at + 1).padStart(2, '0');
}
