/**
 * Contenido e idioma.
 *
 * Todo el texto del portfolio vive en es.json / en.json. Este modulo solo los
 * tipa, elige el idioma y avisa a quien lo este escuchando cuando cambia.
 */

import esRaw from './es.json';
import enRaw from './en.json';

export type Lang = 'es' | 'en';

export interface Speaker {
  name: string;
  role: string;
  dialogue: string[];
  panel: string;
  /** Frases sueltas para el bocadillo ambiental (charla de fondo, no el diálogo del panel). */
  chatter?: string[];
}

/** Lo que comparten todos los paneles. */
interface PanelBase {
  /** El lugar de la aldea donde vive la seccion ("La herreria"). Va discreto, debajo del titulo. */
  place: string;
  /** El nombre real de la seccion ("Backend"). Es lo que busca quien lee. */
  title: string;
  /** Una linea para el indice: que hay dentro. */
  summary: string;
  intro: string;
  /** Remate al pie del panel. */
  note?: string;
}

/** Algo con nombre y, si hay archivo en src/ui/iconos/, su icono. */
export interface Tech {
  name: string;
  /** Nombre del SVG en src/ui/iconos/ sin extension. Sin archivo, salen las iniciales. */
  icon?: string;
  /** Lo que lo respalda (una certificacion, un proyecto). Solo si es real; si no, se deja fuera. */
  evidence?: string;
}

export interface PanelTexto extends PanelBase {
  type: 'texto';
  items: string[];
  /** Solo "Sobre mi": rutas dentro de public/ (vacias = no se muestran). */
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
    /** Captura dentro de public/ (vacia = sin captura). */
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
      /** Enlace publico de verificacion (Credly, Cisco, Oracle). Vacio = sin boton. */
      verify?: string;
      /** Imagen de la insignia dentro de public/. Vacia = sin imagen. */
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
  /** Orden de lectura de las secciones (ids de vecinos y carteles): indice y "siguiente". */
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
    // Navegacion privada o cookies bloqueadas: seguimos con el idioma del navegador.
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
    // Sin almacenamiento el idioma dura lo que dure la visita. No es critico.
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

/** Texto de interfaz. Devuelve la clave si falta, para que el fallo se vea. */
export function t(key: string): string {
  return content().ui[key] ?? key;
}

/** Un hablante, sea NPC o cartel. */
export function speaker(id: string): Speaker | undefined {
  const c = content();
  return c.npcs[id] ?? c.signs[id];
}

export function panel(id: string): Panel | undefined {
  return content().panels[id];
}

/** Las secciones en orden de lectura, cada una con su vecino y su panel. */
export function sections(): Array<{ id: string; who: Speaker; panel: Panel }> {
  const c = content();
  return c.order.flatMap((id) => {
    const who = c.npcs[id] ?? c.signs[id];
    const data = who ? c.panels[who.panel] : undefined;
    return who && data ? [{ id, who, panel: data }] : [];
  });
}

/** Numero de hoja de una seccion ("02"), el mismo en el indice, el panel y el mapa. */
export function sectionNumber(id: string): string {
  const at = content().order.indexOf(id);
  return at < 0 ? '' : String(at + 1).padStart(2, '0');
}
