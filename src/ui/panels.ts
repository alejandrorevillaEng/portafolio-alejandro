/**
 * El cuerpo de cada hoja de seccion, segun su tipo. Todo el texto sale del
 * JSON; aqui solo se decide la estructura.
 *
 * Cada hoja tiene dos columnas: el resumen (entrada, nota y, en "Sobre mi",
 * foto y CV) y la ficha propia del tipo (tecnologias, proyectos, credenciales...).
 *
 * Para un tipo nuevo: anadelo a `Panel` en content/index.ts y un `case` aqui.
 */

import { t, type Panel, type PanelContacto, type Tech } from '@/content';
import { button, el, richText } from './dom';
import { icon } from './icons';

function rich<K extends keyof HTMLElementTagNameMap>(tag: K, className: string | undefined, raw: string) {
  const node = el(tag, className);
  node.innerHTML = richText(raw);
  return node;
}

function externalLink(node: HTMLAnchorElement, href: string): void {
  node.href = href;
  if (href.startsWith('http')) {
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }
}

/** Enlace con aspecto de boton: icono, texto y, si sale de la web, la flecha. */
function linkButton(className: string, text: string, href: string, iconName?: string): HTMLAnchorElement {
  const a = el('a', className);
  externalLink(a, href);
  if (iconName) a.append(icon(iconName));
  a.append(el('span', undefined, text));
  if (href.startsWith('http')) a.append(icon('ph-arrow-up-right', '', 'icon icon-trail'));
  return a;
}

/**
 * Imagen opcional del contenido (foto, captura, insignia). Ruta vacia: no hay
 * hueco. Si la ruta esta puesta pero el archivo aun no existe, desaparece sin
 * dejar un marco roto.
 */
function optionalImage(src: string | undefined, alt: string, className: string): HTMLElement | null {
  if (!src) return null;
  const img = el('img', className);
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

/** Una tecnologia: su logo y su nombre. */
function techItem(tech: Tech, tag: 'li' | 'span' = 'li'): HTMLElement {
  const node = el(tag, 'tech');
  node.append(icon(tech.icon, tech.name), el('span', 'tech-name', tech.name));
  return node;
}

/** La columna del resumen, comun a todas las hojas. */
function renderSummary(data: Panel): HTMLElement {
  const side = el('aside', 'sheet-summary');

  if (data.type === 'texto') {
    const photo = optionalImage(data.photo, `${t('photoAlt')} ${t('headerName')}`, 'summary-photo');
    if (photo) side.append(photo);
  }
  side.append(rich('p', 'lead', data.intro));
  if (data.note) side.append(rich('p', 'note', data.note));
  if (data.type === 'texto' && data.cv) {
    const cv = linkButton('btn btn-primary', t('downloadCv'), data.cv, 'ph-file-pdf');
    cv.setAttribute('download', '');
    side.append(cv);
  }
  return side;
}

export function renderPanelBody(data: Panel): HTMLElement {
  const grid = el('div', 'sheet-grid');
  const main = el('div', `sheet-main sheet-${data.type}`);

  switch (data.type) {
    case 'texto': {
      const list = el('ol', 'rows');
      data.items.forEach((item, i) => {
        const li = el('li', 'row');
        li.append(el('span', 'row-num', String(i + 1).padStart(2, '0')), rich('p', undefined, item));
        list.append(li);
      });
      main.append(list);
      break;
    }

    case 'skills': {
      // Una tabla por grupo: tecnologia y, cuando la hay, la evidencia que la respalda.
      for (const group of data.groups) {
        const table = el('table', 'spec-table');
        const caption = el('caption');
        caption.append(el('span', 'caption-name', group.name), el('span', 'num', String(group.items.length)));
        const head = el('tr');
        head.append(el('th', undefined, t('technology')), el('th', undefined, t('evidence')));
        const thead = el('thead');
        thead.append(head);
        const tbody = el('tbody');
        for (const tech of group.items) {
          const row = el('tr');
          const name = el('th');
          name.scope = 'row';
          name.append(techItem(tech, 'span'));
          row.append(name, el('td', 'evidence', tech.evidence ?? ''));
          tbody.append(row);
        }
        table.append(caption, thead, tbody);
        main.append(table);
      }
      break;
    }

    case 'proyectos': {
      for (const project of data.items) {
        const card = el('article', 'project');
        const shot = optionalImage(project.image, `${t('projectImage')} ${project.name}`, 'project-shot');
        if (shot) card.append(shot);

        const head = el('header', 'project-head');
        head.append(el('h3', undefined, project.name), el('span', 'status', project.status));
        const stack = el('ul', 'project-stack');
        for (const tech of project.stack) stack.append(techItem(tech));
        card.append(head, rich('p', 'project-text', project.text), stack);
        // El repositorio es la accion de la hoja: boton principal, no una etiqueta mas.
        if (project.link) {
          card.append(linkButton('btn btn-primary project-link', project.linkText, project.link, 'ph-github-logo'));
        }
        main.append(card);
      }
      break;
    }

    case 'certificaciones': {
      for (const shelf of data.shelves) {
        // A la izquierda la marca del proveedor, tranquila; a la derecha la banda
        // densa de credenciales con su fecha.
        const row = el('section', 'provider');
        const mark = el('header', 'provider-mark');
        const count = el('p', 'provider-count');
        count.append(el('span', 'num', String(shelf.items.length)), document.createTextNode(` ${t('credentials')}`));
        mark.append(icon(shelf.icon, shelf.name, 'icon provider-icon'), el('h3', undefined, shelf.name), count);

        // Una linea por credencial: nombre, emisor y fecha; si hay, insignia y "verificar".
        const table = el('table', 'cred-table');
        const head = el('tr');
        head.append(el('th', undefined, t('credential')), el('th', undefined, t('issuer')), el('th', 'cred-date', t('date')));
        const thead = el('thead');
        thead.append(head);
        const tbody = el('tbody');
        for (const cert of shelf.items) {
          const tr = el('tr', 'cred');
          const name = el('th', 'cred-name');
          name.scope = 'row';
          const badge = optionalImage(cert.badge, `${t('badgeAlt')} ${cert.name}`, 'cred-badge');
          if (badge) name.append(badge);
          name.append(el('span', undefined, cert.name));
          if (cert.verify) name.append(linkButton('cred-verify', t('verify'), cert.verify, 'ph-seal-check'));
          tr.append(name, el('td', 'cred-org', cert.org), el('td', 'cred-date', cert.date));
          tbody.append(tr);
        }
        table.append(thead, tbody);
        row.append(mark, table);
        main.append(row);
      }
      break;
    }

    case 'contacto':
      main.append(renderContact(data));
      break;
  }

  grid.append(renderSummary(data), main);
  return grid;
}

/**
 * Contacto: el correo es la accion principal (con boton de copiar, que en un
 * ordenador sin cliente de correo es lo unico que funciona); el resto, debajo.
 */
function renderContact(data: PanelContacto): HTMLElement {
  const wrap = el('div', 'contact');
  const [primary, ...rest] = data.links;

  if (primary) {
    const actions = el('div', 'contact-primary');
    const mail = linkButton('btn btn-primary btn-large', primary.value, primary.href, primary.icon);
    const copyLabel = el('span', undefined, t('copy'));
    const copy = button('btn btn-large', '', () => {
      void navigator.clipboard?.writeText(primary.value).then(() => {
        copyLabel.textContent = t('copied');
        copy.classList.add('is-done');
        window.setTimeout(() => {
          copyLabel.textContent = t('copy');
          copy.classList.remove('is-done');
        }, 1600);
      });
    });
    copy.append(icon('ph-copy'), copyLabel);
    copy.setAttribute('aria-live', 'polite');
    actions.append(mail, copy);
    wrap.append(actions);
  }

  const list = el('ul', 'contact-rows');
  for (const link of rest) {
    const li = el('li');
    const a = el('a', 'contact-row');
    externalLink(a, link.href);
    a.append(
      icon(link.icon, link.label, 'icon contact-icon'),
      el('span', 'contact-label', link.label),
      el('span', 'contact-value', link.value),
      icon('ph-arrow-up-right', '', 'icon icon-trail'),
    );
    li.append(a);
    list.append(li);
  }
  wrap.append(list);
  return wrap;
}
