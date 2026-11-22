// Reusable UI components: feedback sheet, badge dialog, particles, count-up, shake/pop.
// All motion respects prefers-reduced-motion (instant or opacity-only).
import { el, icon, rich, reducedMotion } from './core.js';

/* ---------- particles ---------- */
let sparkLayer = null;
/** Burst of small spark particles from the centre of `target` (FBK-02). */
export function sparkBurst(target, count = 12) {
  if (reducedMotion() || !target) return;
  sparkLayer = sparkLayer || document.body.appendChild(el('div', { class: 'spark-layer', 'aria-hidden': 'true' }));
  const r = target.getBoundingClientRect();
  const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const d = 40 + Math.random() * 50;
    const s = el('i', { class: 'spark' + (i % 2 ? ' glow' : '') });
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    sparkLayer.append(s);
    setTimeout(() => s.remove(), 700);
  }
}

/** Re-trigger a one-shot CSS animation class on an element. */
export function replayClass(node, cls) {
  if (!node || reducedMotion()) return;
  node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls);
  node.addEventListener('animationend', () => node.classList.remove(cls), { once: true });
}
export const shake = (node) => replayClass(node, 'shake');
export const pop = (node) => replayClass(node, 'pop');

/** Animate a number from 0 to `to` inside `node` (ANIM-05). */
export function countUp(node, to, { ms = 400, suffix = '' } = {}) {
  if (reducedMotion()) { node.textContent = to + suffix; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3);
    node.textContent = Math.round(to * e) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- feedback sheet (FBK-01) ---------- */
let sheetEl = null; let sheetResolve = null;
function sheetKey(e) { if (e.key === 'Enter' && sheetEl?.classList.contains('show') && !e.target.closest('.sheet button')) { e.preventDefault(); closeSheet(); } }
/**
 * Show the bottom feedback sheet. Resolves when the player presses Continue (or Enter).
 * @param {{good:boolean,title:string,lines?:string[],streak?:number,cta?:string}} opts
 */
export function feedbackSheet({ good, title, lines = [], streak = 0, cta = 'Continue', returnFocus = null }) {
  closeSheet(true);
  sheetEl = el('section', { class: `sheet ${good ? 'good' : 'oops'}`, role: 'status', 'aria-live': 'assertive' });
  const body = el('div', { class: 'sheet-body' }, el('p', { class: 'sheet-title', text: title }));
  for (const line of lines.filter(Boolean)) body.append(rich(el('p'), line));
  const btn = el('button', { type: 'button', class: `btn ${good ? 'btn-good' : 'btn-oops'}`, text: cta });
  const actions = el('div', { class: 'sheet-actions' });
  if (streak >= 3) actions.append(el('span', { class: 'sheet-streak', text: `Signal streak ×${streak}!` }));
  actions.append(btn);
  sheetEl.append(el('div', { class: 'sheet-badge', 'aria-hidden': 'true', text: good ? '✓' : '✕' }), body, actions);
  document.body.append(sheetEl);
  requestAnimationFrame(() => sheetEl.classList.add('show'));
  btn.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', sheetKey);
  setTimeout(() => btn.focus({ preventScroll: true }), 30);
  sheetEl._return = returnFocus;
  return new Promise((res) => { sheetResolve = res; });
}
export function closeSheet(silent = false) {
  document.removeEventListener('keydown', sheetKey);
  if (!sheetEl) return;
  const s = sheetEl; sheetEl = null; s.classList.remove('show');
  setTimeout(() => s.remove(), reducedMotion() ? 0 : 260);
  const r = sheetResolve; sheetResolve = null;
  if (!silent && r) r();
}

/* ---------- badge / level-complete dialog (FBK-05) ---------- */
export function starsRow(n, { large = false, max = 3 } = {}) {
  const row = el('span', { class: 'stars' + (large ? ' stars-lg' : ''), role: 'img', 'aria-label': `${n} of ${max} stars` });
  for (let i = 0; i < max; i++) { const s = icon('star'); if (i < n) s.classList.add('on'); row.append(s); }
  return row;
}
let dialogEl = null;
/**
 * Celebration dialog with badge, stars, a one-line summary and Next / Stay buttons.
 * Resolves with 'next' or 'stay'.
 */
export function badgeDialog({ title, badge, iconId, stars = 1, summary, nextLabel = 'Next stop →', confetti = true }) {
  closeDialog();
  const d = el('dialog', { class: 'modal', 'aria-labelledby': 'bd-title' });
  const card = el('div', { class: 'modal-card' });
  const local = el('div', { class: 'celebrate-local', 'aria-hidden': 'true' });
  const b = el('div', { class: 'badge earned' }, icon(iconId || 'star'));
  const sum = el('p'); rich(sum, summary || '');
  const next = el('button', { type: 'button', class: 'btn btn-big', text: nextLabel });
  const stay = el('button', { type: 'button', class: 'btn btn-secondary', text: 'Stay here' });
  card.append(local, b, el('h2', { id: 'bd-title', text: title }), el('p', { class: 'badge-name', text: badge }), starsRow(stars, { large: true }), sum, el('div', { class: 'modal-actions' }, next, stay));
  d.append(card); document.body.append(d); dialogEl = d;
  if (confetti && !reducedMotion()) {
    const colors = ['#7cf7ff', '#ffe066', '#ff8a5b', '#c08cff', '#69d68c', '#ff8fcf'];
    for (let i = 0; i < 28; i++) {
      const c = el('span', { class: 'confetti' });
      c.style.left = Math.random() * 100 + '%'; c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.3 + 's'; c.style.animationDuration = 1.2 + Math.random() * 0.8 + 's';
      local.append(c);
    }
  }
  return new Promise((res) => {
    const done = (v) => { closeDialog(); res(v); };
    next.addEventListener('click', () => done('next'));
    stay.addEventListener('click', () => done('stay'));
    d.addEventListener('cancel', (e) => { e.preventDefault(); done('stay'); });
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    next.focus();
  });
}
export function closeDialog() { if (dialogEl) { const d = dialogEl; dialogEl = null; try { d.close(); } catch { /* not open */ } d.remove(); } }

/** Remove every transient celebration/feedback layer (called on route change; fixes BUG-01). */
export function clearTransient() {
  closeSheet(true); closeDialog();
  document.querySelectorAll('#celebrate .confetti, .spark-layer .spark').forEach((n) => n.remove());
  const t = document.getElementById('toast'); if (t) t.classList.remove('show');
}
