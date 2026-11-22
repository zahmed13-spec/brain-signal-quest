// Shared helpers: DOM, progress storage, sound, glossary tooltips, mascot, activity scaffolding.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') for (const [prop, val] of Object.entries(v)) node.style.setProperty(prop, val);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}
const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}
export const icon = (id, cls = '') => {
  const s = svg('svg', { 'aria-hidden': 'true', focusable: 'false', class: cls });
  s.append(svg('use', { href: '#i-' + id }));
  return s;
};
export const shuffled = (values) => {
  const r = [...values];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/* ---------- progress (localStorage, badges only, no personal data) ---------- */
const KEY = 'bsq-progress-v1';
const blank = () => ({ done: {}, playhouse: {} });
function readStore() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : blank();
    return { done: data.done || {}, playhouse: data.playhouse || {} };
  } catch { return blank(); }
}
let progress = readStore();
const listeners = new Set();
function save() {
  try { window.localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage blocked: progress lives for this visit only */ }
  listeners.forEach((fn) => fn(progress));
}
export const store = {
  get: () => progress,
  isDone: (key) => Boolean(progress.done[key]),
  markDone(key) { if (progress.done[key]) return false; progress.done[key] = true; save(); return true; },
  markScenario(id) { if (progress.playhouse[id]) return false; progress.playhouse[id] = true; save(); return true; },
  scenarioDone: (id) => Boolean(progress.playhouse[id]),
  reset() { progress = blank(); try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } listeners.forEach((fn) => fn(progress)); },
  subscribe(fn) { listeners.add(fn); },
};

/* ---------- sound: generated tones, muted by default ---------- */
let audioCtx = null;
let soundOn = false;
export const sound = {
  get on() { return soundOn; },
  toggle() { soundOn = !soundOn; if (soundOn) this.play('click'); return soundOn; },
  play(kind) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { click: [[660, 0.06]], good: [[523, 0.1], [784, 0.16]], oops: [[330, 0.12], [262, 0.18]],
        fire: [[440, 0.05], [880, 0.12]], win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], blip: [[880, 0.05]] }[kind] || [[600, 0.08]];
      let t = audioCtx.currentTime;
      for (const [freq, dur] of notes) {
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + dur + 0.02); t += dur * 0.9;
      }
    } catch { /* audio unavailable */ }
  },
};

/* ---------- toast + celebration ---------- */
let toastTimer;
export function toast(message) {
  const t = $('#toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
export function celebrate() {
  if (reducedMotion()) return;
  const layer = $('#celebrate'); const colors = ['#7cf7ff', '#ffe066', '#ff8a5b', '#c08cff', '#69d68c', '#ff8fcf'];
  for (let i = 0; i < 36; i++) {
    const c = el('span', { class: 'confetti' });
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.4 + 's'; c.style.animationDuration = 1.4 + Math.random() * 0.9 + 's';
    layer.append(c); setTimeout(() => c.remove(), 2600);
  }
}

/* ---------- glossary: turn science words into tooltip buttons ---------- */
let termIndex = null; let termRegex = null;
export function setGlossary(glossary) {
  termIndex = new Map();
  for (const g of glossary) for (const name of [g.name, ...(g.aliases || [])]) if (name) termIndex.set(name.toLowerCase(), g);
  const names = [...termIndex.keys()].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  termRegex = names.length ? new RegExp('(?<![\\w-])(' + names.join('|') + ')(?![\\w-])', 'gi') : null;
}
/** Render text into a node, wrapping the first mention of each glossary term in a tooltip button. */
export function rich(node, text, used = new Set()) {
  node.replaceChildren();
  if (!termRegex || !text) { node.textContent = text || ''; return node; }
  let last = 0;
  for (const m of text.matchAll(termRegex)) {
    const entry = termIndex.get(m[0].toLowerCase());
    if (!entry || used.has(entry.name)) continue;
    used.add(entry.name);
    node.append(text.slice(last, m.index));
    node.append(el('button', { type: 'button', class: 'term', 'data-term': entry.name, text: m[0] }));
    last = m.index + m[0].length;
  }
  node.append(text.slice(last));
  return node;
}
function setupTermPopups() {
  const pop = $('#term-pop'); let current = null; let hideTimer;
  const show = (btn) => {
    clearTimeout(hideTimer);
    const entry = termIndex && termIndex.get(btn.dataset.term.toLowerCase()); if (!entry) return;
    if (current && current !== btn) current.removeAttribute('aria-describedby');
    current = btn;
    pop.replaceChildren(el('strong', { text: entry.name }), document.createTextNode(entry.description));
    pop.hidden = false; btn.setAttribute('aria-describedby', 'term-pop');
    const r = btn.getBoundingClientRect(); const pw = pop.offsetWidth; const ph = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    let y = r.bottom + 8; if (y + ph > window.innerHeight - 8) y = r.top - ph - 8;
    pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
  };
  const hide = () => { pop.hidden = true; if (current) current.removeAttribute('aria-describedby'); current = null; };
  document.addEventListener('mouseover', (e) => { const b = e.target.closest?.('.term'); if (b) show(b); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest?.('.term')) hideTimer = setTimeout(hide, 250); });
  document.addEventListener('focusin', (e) => { const b = e.target.closest?.('.term'); if (b) show(b); else if (current) hide(); });
  document.addEventListener('click', (e) => { const b = e.target.closest?.('.term'); if (b) { if (current === b && !pop.hidden) hide(); else show(b); } else if (!e.target.closest('#term-pop')) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) hide(); });
  window.addEventListener('scroll', () => { if (!pop.hidden) hide(); }, { passive: true });
}

/* ---------- Sparky: original SVG neuron guide ---------- */
let sparkyN = 0;
export function sparky({ size } = {}) {
  const id = 'sg' + (++sparkyN);
  const s = svg('svg', { viewBox: '0 0 140 130', class: 'sparky', 'aria-hidden': 'true', focusable: 'false' });
  if (size) s.style.width = size;
  s.innerHTML = `
  <defs><radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#b8fbff"/><stop offset=".6" stop-color="#5fd9ef"/><stop offset="1" stop-color="#7a68e8"/></radialGradient></defs>
  <circle class="s-glow" cx="62" cy="66" r="44" fill="#7cf7ff" opacity=".18"/>
  <g fill="none" stroke="#7a68e8" stroke-width="5" stroke-linecap="round">
    <path d="M50 42 40 20M40 20l-9-4M40 20l2-10"/><path d="M62 38V12M62 12l-7-6M62 12l7-6"/><path d="M75 42l12-20M87 22l9-2M87 22l-1-10"/>
    <path class="s-arm" d="M34 70 16 62M16 62l-6 3M16 62l-3-7"/><path d="M90 78c14 6 22 18 24 30"/>
  </g>
  <g stroke-linecap="round" fill="none"><path d="M96 84l7 7M108 100l3 8" stroke="#ffe066" stroke-width="9"/><path d="M114 108l9 3M114 108l1 10M114 108l-6 8" stroke="#7a68e8" stroke-width="4.5"/></g>
  <circle cx="62" cy="68" r="30" fill="url(#${id})" stroke="#2c2f7a" stroke-width="3"/>
  <g class="eye-open" fill="#17203d"><ellipse cx="52" cy="64" rx="4.5" ry="6"/><ellipse cx="72" cy="64" rx="4.5" ry="6"/><circle cx="53.5" cy="62" r="1.6" fill="#fff"/><circle cx="73.5" cy="62" r="1.6" fill="#fff"/></g>
  <g class="eye-happy" fill="none" stroke="#17203d" stroke-width="3.5" stroke-linecap="round"><path d="M47 65q5-7 10 0M67 65q5-7 10 0"/></g>
  <circle cx="45" cy="75" r="4.5" fill="#ff8fcf" opacity=".75"/><circle cx="79" cy="75" r="4.5" fill="#ff8fcf" opacity=".75"/>
  <path d="M53 77q9 9 18 0" fill="#17203d" stroke="#17203d" stroke-width="2.5" stroke-linejoin="round"/>`;
  return s;
}
export function guide(target, text, { small = false } = {}) {
  target.replaceChildren();
  target.classList.add('guide'); target.classList.toggle('small', small);
  const bubble = el('div', { class: 'bubble' }); const p = el('p'); rich(p, text); bubble.append(p);
  target.append(sparky(), bubble);
  return { say(t) { rich(p, t); }, cheer() { const s = target.querySelector('.sparky'); s.classList.remove('cheer'); void s.getBoundingClientRect(); s.classList.add('cheer'); } };
}

/* ---------- activity scaffolding: goal → play → what happened → real life → badge ---------- */
const ICONS = { brain: 'brain', neuron: 'neuron', reaction: 'bolt', memory: 'cards', playhouse: 'cube', quiz: 'trophy' };
export const activityIcon = (key) => ICONS[key] || 'star';
const scaffolds = new Map();

export function scaffold(activity) {
  const section = document.getElementById(activity.key); if (!section) return null;
  section.style.setProperty('--c', `var(--a-${activity.key})`);
  $('h2', section).textContent = activity.title;
  const goal = $('.goal-card', section); goal.replaceChildren();
  const gp = el('p'); rich(gp, activity.goal);
  const hint = el('p', { class: 'hint' }); rich(hint, 'Hint: ' + activity.hint);
  goal.append(sparky(), el('div', {}, el('h3', { text: 'Your mission' }), gp, hint));
  const learn = $('.learn-cards', section); learn.replaceChildren();
  const happened = el('p'); const real = el('p');
  const c1 = el('article', { class: 'learn-card', style: { '--c': 'var(--glow)' } }, el('h3', { text: 'What just happened?' }), happened);
  const c2 = el('article', { class: 'learn-card', style: { '--c': 'var(--r-parietal)' } }, el('h3', { text: 'Brain in real life' }), real);
  const badge = el('div', { class: 'badge' }, icon(activityIcon(activity.key)));
  const badgeName = el('p', { class: 'badge-name', text: activity.badge });
  const c3 = el('article', { class: 'learn-card badge-card', style: { '--c': 'var(--spark)' } }, badge, badgeName);
  learn.append(c1, c2, c3);
  const api = {
    section, activity,
    render(done) {
      c1.classList.toggle('locked', !done); c2.classList.toggle('locked', !done);
      if (done) { rich(happened, activity.whatHappened); rich(real, activity.realLife); }
      else { happened.textContent = 'Finish the activity to unlock this explanation.'; real.textContent = 'Finish the activity to unlock a real-life brain connection.'; }
      badge.classList.toggle('earned', done);
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', done ? `Badge earned: ${activity.badge}` : `Badge not earned yet: ${activity.badge}`);
    },
  };
  api.render(store.isDone(activity.key));
  scaffolds.set(activity.key, api);
  return api;
}
/** Mark an activity complete: unlock explanation cards, award badge, celebrate. */
export function complete(key, cheerText) {
  const s = scaffolds.get(key); const isNew = store.markDone(key);
  if (s) s.render(true);
  if (isNew) {
    celebrate(); sound.play('win');
    toast(`Badge earned: ${s ? s.activity.badge : key}!`);
  }
  if (s && cheerText) {
    const spark = s.section.querySelector('.goal-card .sparky');
    spark.classList.remove('cheer'); void spark.getBoundingClientRect(); spark.classList.add('cheer');
    rich(s.section.querySelector('.goal-card .hint'), 'Sparky says: ' + cheerText);
  }
}

export function init() { setupTermPopups(); }
