// Tiny DOM helpers, the panel host and toasts.
import { ICONS, type IconName } from './icons';

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function icon(name: IconName): HTMLSpanElement {
  return h('span', { html: ICONS[name], style: 'display:inline-grid' });
}

export function iconButton(name: IconName, label: string, onClick: () => void, cls = 'icon-btn'): HTMLButtonElement {
  return h('button', { class: cls, 'aria-label': label, title: label, html: ICONS[name], onClick });
}

/** Fill every [data-icon] element in the document with its svg (keeps existing children after it). */
export function hydrateIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const name = el.dataset.icon as IconName;
    if (!ICONS[name]) return;
    const existing = el.querySelector('svg');
    if (existing) existing.outerHTML = ICONS[name];
    else el.insertAdjacentHTML('afterbegin', ICONS[name]);
  });
}

export function setIcon(el: HTMLElement, name: IconName): void {
  el.dataset.icon = name;
  const existing = el.querySelector('svg');
  if (existing) existing.outerHTML = ICONS[name];
  else el.insertAdjacentHTML('afterbegin', ICONS[name]);
}

/** Paint the filled part of a range input. */
export function paintRange(input: HTMLInputElement): void {
  const min = Number(input.min || 0);
  const max = Number(input.max || 1);
  input.style.setProperty('--fill', `${((Number(input.value) - min) / (max - min)) * 100}%`);
}

// ---------- panel host ----------

interface Open {
  id: string;
  panel: HTMLElement;
  backdrop: HTMLElement;
  onClose?: () => void;
  returnFocus: Element | null;
}

let open: Open | null = null;

export function panelOpen(id?: string): boolean {
  return !!open && (!id || open.id === id);
}

export function closePanel(): void {
  if (!open) return;
  const o = open;
  open = null;
  o.panel.remove();
  o.backdrop.remove();
  o.onClose?.();
  if (o.returnFocus instanceof HTMLElement) o.returnFocus.focus();
  document.body.classList.remove('panel-open');
}

export interface PanelOpts {
  narrow?: boolean;
  onClose?: () => void;
  headExtra?: HTMLElement;
}

/** Open a panel; calling again with the same id toggles it closed. */
export function openPanel(id: string, title: string, body: HTMLElement, opts: PanelOpts = {}): void {
  if (open?.id === id) {
    closePanel();
    return;
  }
  const returnFocus = open ? open.returnFocus : document.activeElement;
  closePanel();
  const root = document.getElementById('panel-root')!;
  const backdrop = h('div', { class: 'backdrop', onClick: closePanel });
  const panel = h(
    'section',
    { class: 'panel' + (opts.narrow ? ' narrow' : ''), role: 'dialog', 'aria-label': title },
    h('div', { class: 'panel-head' }, h('h2', {}, title), opts.headExtra ?? null, iconButton('close', 'Close (Esc)', closePanel)),
    body,
  );
  root.append(backdrop, panel);
  open = { id, panel, backdrop, onClose: opts.onClose, returnFocus };
  document.body.classList.add('panel-open');
  const first = panel.querySelector<HTMLElement>('input, button.card, .seg button, .btn, .tab');
  (first ?? panel.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
}

// ---------- toasts ----------

export function toast(msg: string, ms = 2400): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  host.append(el);
  window.setTimeout(() => el.remove(), ms);
}
