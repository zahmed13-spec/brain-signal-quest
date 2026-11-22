// Shared helpers: DOM, progress + settings storage, sound, read-aloud, glossary tooltips,
// Sparky the guide, and activity scaffolding (goal → play → what happened → real life → badge).

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
/** Pick from a list without repeating the previous pick (varied cheers). */
const lastPicks = new Map();
export function pickFresh(list, key = list) {
  if (!list?.length) return '';
  let v; let guard = 0;
  do { v = pick(list); } while (list.length > 1 && v === lastPicks.get(key) && guard++ < 8);
  lastPicks.set(key, v); return v;
}

/* ---------- storage (localStorage, try/catch; never personal data) ---------- */
function readJSON(key, fallback) { try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function writeJSON(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: keeps working for this visit */ } }

const KEY = 'bsq-progress-v1';
const blank = () => ({ done: {}, playhouse: {}, levels: {}, srs: {}, atlas: [], lastVisit: 0 });
/** Old saves stored `true` for a finished activity; treat that as 1 star (PRG-01 migration). */
function migrate(data) {
  const p = { ...blank(), ...(data || {}) };
  for (const k of ['done', 'playhouse']) for (const [id, v] of Object.entries(p[k] || {})) p[k][id] = v === true ? 1 : Math.max(0, Math.min(3, Number(v) || 0));
  if (!Array.isArray(p.atlas)) p.atlas = [];
  return p;
}
let progress = migrate(readJSON(KEY, null));
const listeners = new Set();
function save() { writeJSON(KEY, progress); listeners.forEach((fn) => fn(progress)); }
export const store = {
  get: () => progress,
  stars: (key) => progress.done[key] || 0,
  isDone: (key) => (progress.done[key] || 0) > 0,
  /** Record stars for an activity; keeps the best. Returns {first, improved, stars}. */
  setStars(key, n) {
    const prev = progress.done[key] || 0; const stars = Math.max(prev, Math.max(1, Math.min(3, n)));
    progress.done[key] = stars; save();
    return { first: prev === 0, improved: stars > prev, stars };
  },
  markDone(key) { return store.setStars(key, 1).first; },
  scenarioStars: (id) => progress.playhouse[id] || 0,
  scenarioDone: (id) => (progress.playhouse[id] || 0) > 0,
  setScenarioStars(id, n) { const prev = progress.playhouse[id] || 0; const s = Math.max(prev, Math.max(1, Math.min(3, n))); progress.playhouse[id] = s; save(); return { first: prev === 0, improved: s > prev, stars: s }; },
  markScenario(id) { return store.setScenarioStars(id, 1).first; },
  level: (key) => progress.levels[key] || 0,
  setLevel(key, n) { if (n > (progress.levels[key] || 0)) { progress.levels[key] = n; save(); } },
  srs: () => progress.srs,
  setSrs(qid, rec) { progress.srs[qid] = rec; save(); },
  atlasHas: (id) => progress.atlas.includes(id),
  addAtlas(id) { if (!id || progress.atlas.includes(id)) return false; progress.atlas.push(id); save(); return true; },
  touchVisit() { const prev = progress.lastVisit || 0; progress.lastVisit = Date.now(); save(); return prev; },
  totalStars: () => Object.values(progress.done).reduce((a, b) => a + b, 0) + Object.values(progress.playhouse).reduce((a, b) => a + b, 0),
  reset() { progress = blank(); try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } listeners.forEach((fn) => fn(progress)); },
  subscribe(fn) { listeners.add(fn); },
};

/* Settings are separate from progress so "Clear my stars" keeps them. */
const SKEY = 'bsq-settings-v1';
const settings = { sound: null, volume: 0.7, ambient: false, readAloud: false, scientist: false, myelin: false, ...readJSON(SKEY, {}) };
export const prefs = {
  get: (k) => settings[k],
  set(k, v) { settings[k] = v; writeJSON(SKEY, settings); },
};

/* ---------- sound palette (AUD-01): synthesized with Web Audio, nothing downloaded ---------- */
let ctx = null; let master = null; let ambientNodes = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = settings.volume * 0.5; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, { type = 'triangle', peak = 0.22, glideTo = null } = {}) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(peak, start + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master); o.start(start); o.stop(start + dur + 0.03);
}
function noise(start, dur, peak = 0.12, hp = 1200) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur)); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.value = peak; src.connect(f).connect(g).connect(master); src.start(start);
}
const SOUNDS = {
  tick: (t) => tone(1200, t, 0.04, { type: 'sine', peak: 0.12 }),
  click: (t) => tone(1200, t, 0.04, { type: 'sine', peak: 0.12 }),
  bloop: (t) => tone(500, t, 0.12, { type: 'sine', glideTo: 700, peak: 0.2 }),
  blip: (t) => tone(880, t, 0.06, { type: 'sine', peak: 0.12 }),
  fire: (t) => { tone(300, t, 0.25, { type: 'sawtooth', glideTo: 900, peak: 0.1 }); noise(t, 0.18, 0.08, 2000); tone(1800, t + 0.02, 0.05, { type: 'sine', peak: 0.1 }); },
  pops: (t) => { for (let i = 0; i < 3; i++) tone(700 * Math.pow(2, (Math.random() - 0.5) / 12), t + i * 0.06, 0.05, { type: 'sine', peak: 0.14 }); },
  good: (t) => { tone(523.25, t, 0.12); tone(659.25, t + 0.1, 0.14); tone(1567.98, t + 0.2, 0.08, { type: 'sine', peak: 0.08 }); },
  oops: (t) => tone(220, t, 0.16, { type: 'sine', glideTo: 196, peak: 0.2 }),
  win: (t) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.11, 0.3)); noise(t + 0.45, 0.6, 0.03, 6000); },
  star0: (t) => tone(783.99, t, 0.15, { type: 'sine' }),
  star1: (t) => tone(987.77, t, 0.15, { type: 'sine' }),
  star2: (t) => tone(1174.66, t, 0.15, { type: 'sine' }),
};
export const sound = {
  get on() { return settings.sound === true; },
  set(on) { prefs.set('sound', on); if (on) this.play('good'); else this.ambient(false); },
  toggle() { this.set(!this.on); return this.on; },
  volume(v) { prefs.set('volume', v); if (master) master.gain.value = v * 0.5; },
  play(kind) {
    if (!this.on) return;
    try { if (!audio()) return; (SOUNDS[kind] || SOUNDS.tick)(ctx.currentTime + 0.005); } catch { /* audio unavailable */ }
  },
  /** Optional soft ambient pad (F4): off by default, only after a user gesture. */
  ambient(on) {
    try {
      if (ambientNodes) { ambientNodes.forEach((n) => { try { n.stop(); } catch { /* stopped */ } }); ambientNodes = null; }
      prefs.set('ambient', on);
      if (!on || !this.on || !audio()) return;
      const g = ctx.createGain(); g.gain.value = 0.035; g.connect(master);
      const lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.02; lfo.connect(lg).connect(g.gain); lfo.start();
      ambientNodes = [lfo, ...[130.81, 196, 246.94].map((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; })];
    } catch { /* audio unavailable */ }
  },
};

/* ---------- read-aloud (EDU-03): on-device voices only, never network voices ---------- */
let localVoice = null;
function findVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.localService && /^en/i.test(v.lang));
  return voices.find((v) => /en-US/i.test(v.lang)) || voices[0] || null;
}
export const reader = {
  available() { localVoice = localVoice || findVoice(); return Boolean(localVoice); },
  get on() { return settings.readAloud === true && this.available(); },
  speak(text, btn) {
    if (!this.available() || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ')); u.voice = localVoice; u.lang = localVoice.lang; u.rate = 0.9;
    if (btn) { btn.classList.add('speaking'); u.onend = u.onerror = () => btn.classList.remove('speaking'); }
    speechSynthesis.speak(u);
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); document.querySelectorAll('.speak.speaking').forEach((b) => b.classList.remove('speaking')); },
};
if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { localVoice = findVoice(); document.dispatchEvent(new Event('bsq:voices')); });
/** A 🔊 button that reads `getText()` aloud. Hidden unless read-aloud is on. */
export function speakButton(getText, label = 'Read this aloud') {
  const b = el('button', { type: 'button', class: 'speak', 'aria-label': label, title: label }, icon('sound-on'));
  b.hidden = !reader.on;
  b.addEventListener('click', () => reader.speak(typeof getText === 'function' ? getText() : getText, b));
  return b;
}
export function refreshSpeakButtons() { document.querySelectorAll('.speak').forEach((b) => { b.hidden = !reader.on; }); }

/* ---------- toast + full-screen confetti ---------- */
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
/** Render text into a node, wrapping the first mention of each glossary term in a tooltip button (bold key term). */
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
    const text = el('span', {}, el('strong', { text: entry.name }), document.createTextNode(entry.description));
    pop.replaceChildren(entry.icon ? el('span', { class: 'tp-pic' }, icon(entry.icon), text) : text);
    pop.hidden = false; btn.setAttribute('aria-describedby', 'term-pop');
    const r = btn.getBoundingClientRect(); const pw = pop.offsetWidth; const ph = pop.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    let y = r.bottom + 8; if (y + ph > window.innerHeight - 8) y = r.top - ph - 8;
    pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
    if (reader.on) reader.speak(`${entry.name}. ${entry.description}`);
  };
  const hide = () => { pop.hidden = true; if (current) current.removeAttribute('aria-describedby'); current = null; };
  document.addEventListener('mouseover', (e) => { const b = e.target.closest?.('.term'); if (b) show(b); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest?.('.term')) hideTimer = setTimeout(hide, 250); });
  document.addEventListener('focusin', (e) => { const b = e.target.closest?.('.term'); if (b) show(b); else if (current) hide(); });
  document.addEventListener('click', (e) => { const b = e.target.closest?.('.term'); if (b) { if (current === b && !pop.hidden) hide(); else show(b); } else if (!e.target.closest('#term-pop')) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) hide(); });
  window.addEventListener('scroll', () => { if (!pop.hidden) hide(); }, { passive: true });
}

/* ---------- Sparky: original SVG neuron guide with expressions (VIS-04) ---------- */
let sparkyN = 0;
export function sparky({ size, mood = '' } = {}) {
  const id = 'sg' + (++sparkyN);
  const s = svg('svg', { viewBox: '0 0 140 130', class: 'sparky' + (mood ? ' is-' + mood : ''), 'aria-hidden': 'true', focusable: 'false' });
  if (size) s.style.width = size;
  s.innerHTML = `
  <defs><radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#b8fbff"/><stop offset=".6" stop-color="#5fd9ef"/><stop offset="1" stop-color="#7a68e8"/></radialGradient></defs>
  <circle class="s-glow" cx="62" cy="66" r="44" fill="#7cf7ff" opacity=".18"/>
  <g class="s-body">
  <g fill="none" stroke="#7a68e8" stroke-width="5" stroke-linecap="round">
    <path d="M50 42 40 20M40 20l-9-4M40 20l2-10"/><path d="M62 38V12M62 12l-7-6M62 12l7-6"/><path d="M75 42l12-20M87 22l9-2M87 22l-1-10"/>
    <path class="s-arm" d="M34 70 16 62M16 62l-6 3M16 62l-3-7"/><path d="M90 78c14 6 22 18 24 30"/>
  </g>
  <g stroke-linecap="round" fill="none"><path d="M96 84l7 7M108 100l3 8" stroke="#ffe066" stroke-width="9"/><path d="M114 108l9 3M114 108l1 10M114 108l-6 8" stroke="#7a68e8" stroke-width="4.5"/></g>
  <circle cx="62" cy="68" r="30" fill="url(#${id})" stroke="#2c2f7a" stroke-width="3"/>
  <g class="eye-open" fill="#17203d"><ellipse cx="52" cy="64" rx="4.5" ry="6"/><ellipse cx="72" cy="64" rx="4.5" ry="6"/><circle cx="53.5" cy="62" r="1.6" fill="#fff"/><circle cx="73.5" cy="62" r="1.6" fill="#fff"/></g>
  <g class="eye-happy" fill="none" stroke="#17203d" stroke-width="3.5" stroke-linecap="round"><path d="M47 65q5-7 10 0M67 65q5-7 10 0"/></g>
  <g class="eye-wide" fill="#fff" stroke="#17203d" stroke-width="2.5"><circle cx="52" cy="63" r="7"/><circle cx="72" cy="63" r="7"/><circle cx="52" cy="64" r="3" fill="#17203d"/><circle cx="72" cy="64" r="3" fill="#17203d"/></g>
  <g class="eyes-up" fill="#17203d"><ellipse cx="54" cy="60" rx="4.5" ry="5.5"/><ellipse cx="74" cy="60" rx="4.5" ry="5.5"/><circle cx="55.5" cy="58" r="1.6" fill="#fff"/><circle cx="75.5" cy="58" r="1.6" fill="#fff"/></g>
  <g class="lid" fill="#5fd9ef"><rect x="45" y="56" width="15" height="14" rx="6"/><rect x="65" y="56" width="15" height="14" rx="6"/></g>
  <circle cx="45" cy="75" r="4.5" fill="#ff8fcf" opacity=".75"/><circle cx="79" cy="75" r="4.5" fill="#ff8fcf" opacity=".75"/>
  <path class="mouth" d="M53 77q9 9 18 0" fill="#17203d" stroke="#17203d" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse class="mouth-o" cx="62" cy="80" rx="4" ry="5" fill="#17203d"/>
  </g>`;
  return s;
}
const MOODS = ['cheer', 'wave', 'oops', 'think', 'point'];
/** Show an expression for `ms` milliseconds (0 = keep). */
export function setMood(node, mood, ms = 1600) {
  if (!node) return;
  MOODS.forEach((m) => node.classList.remove('is-' + m));
  if (!mood) return;
  void node.getBoundingClientRect(); node.classList.add('is-' + mood);
  clearTimeout(node._moodT); if (ms) node._moodT = setTimeout(() => node.classList.remove('is-' + mood), ms);
}
/* Idle life (ANIM-04): blink every 4–7 s, gentle bob. Stops under reduced motion. */
function startBlinking() {
  if (reducedMotion()) return;
  const tick = () => {
    document.querySelectorAll('.screen:not([hidden]) .sparky, .hero .sparky').forEach((s) => { s.classList.remove('blink'); void s.getBoundingClientRect(); s.classList.add('blink'); });
    setTimeout(tick, 4000 + Math.random() * 3000);
  };
  setTimeout(tick, 3000);
}
export function guide(target, text, { small = false } = {}) {
  target.replaceChildren();
  target.classList.add('guide'); target.classList.toggle('small', small);
  const bubble = el('div', { class: 'bubble' }); const p = el('p'); rich(p, text); bubble.append(p);
  const s = sparky(); s.classList.add('idle-bob');
  target.append(s, bubble);
  return { say(t) { rich(p, t); }, cheer() { setMood(s, 'cheer'); }, sparky: s, bubble: p };
}

/** Sparky docked inside a play area, reacting to events (FBK-04). */
export function dock(container) {
  const s = sparky({ mood: '' }); s.classList.add('idle-bob');
  const p = el('p'); const bubble = el('div', { class: 'bubble fade', role: 'status', 'aria-live': 'polite' }, p);
  const wrap = el('div', { class: 'dock' }, s, bubble);
  container.append(wrap);
  let hideT;
  return {
    say(text, mood = '', ms = 4000) {
      rich(p, text); bubble.classList.remove('fade'); setMood(s, mood, Math.min(ms, 2400));
      clearTimeout(hideT); if (ms) hideT = setTimeout(() => bubble.classList.add('fade'), ms);
      if (reader.on) reader.speak(text);
    },
    mood(m, ms) { setMood(s, m, ms); },
    el: wrap,
  };
}

/* ---------- activity scaffolding ---------- */
const ICONS = { brain: 'brain', neuron: 'neuron', reaction: 'bolt', memory: 'cards', playhouse: 'cube', quiz: 'trophy' };
export const activityIcon = (key) => ICONS[key] || 'star';
const scaffolds = new Map();
let activityOrder = [];
let onNext = null; // set by game.js: navigate to a stop
let checker = null; // CORE-08: one quick question before a first badge
export function setChecker(fn) { checker = fn; }
export function setNavigator(order, fn) { activityOrder = order; onNext = fn; }
export function nextStopAfter(key) {
  const i = activityOrder.indexOf(key);
  const rest = [...activityOrder.slice(i + 1), ...activityOrder.slice(0, i + 1)];
  return rest.find((k) => store.stars(k) < 3 && k !== key) || rest[0];
}

const HINT_AFTER_MS = 12000;
export function scaffold(activity) {
  const section = document.getElementById(activity.key); if (!section) return null;
  section.style.setProperty('--c', `var(--a-${activity.key})`);
  $('h2', section).textContent = activity.title;

  // ONB-02: one short sentence from Sparky; the hint and the longer goal are on demand.
  const goal = $('.goal-card', section); goal.replaceChildren();
  const short = el('p'); rich(short, activity.goalShort || activity.goal);
  const hint = el('p', { class: 'hint', hidden: true }); rich(hint, activity.hint);
  const hintBtn = el('button', { type: 'button', class: 'btn btn-secondary', text: 'Need a hint?' });
  const more = el('details', { class: 'more' }, el('summary', { text: 'More about this' }), rich(el('p'), activity.goal));
  const say = speakButton(() => `${activity.goalShort || activity.goal} ${hint.hidden ? '' : activity.hint}`);
  const gs = sparky(); gs.classList.add('idle-bob');
  goal.append(gs, el('div', { class: 'goal-text' }, short, hint, activity.goalShort ? more : null), el('div', { class: 'goal-more' }, say, hintBtn));
  const showHint = () => { if (!hint.hidden) return; hint.hidden = false; hintBtn.hidden = true; setMood(gs, 'think'); };
  hintBtn.addEventListener('click', showHint);

  // Auto-hint after 12 s without progress, or after 2 wrong actions.
  let idleT = null; let wrong = 0;
  const armIdle = () => { clearTimeout(idleT); idleT = setTimeout(showHint, HINT_AFTER_MS); };

  // ONB-05: learn cards stay hidden until earned.
  const learn = $('.learn-cards', section);
  const renderLearn = (done) => {
    learn.replaceChildren(); learn.classList.toggle('locked', !done);
    if (!done) { learn.append(el('p', { class: 'locked-chip' }, icon('star'), el('span', { text: `Finish to unlock: What happened? · Real life · ${activity.badge} badge` }))); return; }
    const happened = rich(el('p'), activity.whatHappened); const real = rich(el('p'), activity.realLife);
    const badge = el('div', { class: 'badge earned', role: 'img', 'aria-label': `Badge earned: ${activity.badge}` }, icon(activityIcon(activity.key)));
    const { starsRow } = uiRef; // avoid circular import at module-eval time
    learn.append(
      el('article', { class: 'learn-card', style: { '--c': 'var(--glow)' } }, el('h3', { text: 'What just happened?' }), happened, speakButton(activity.whatHappened)),
      el('article', { class: 'learn-card', style: { '--c': 'var(--r-parietal)' } }, el('h3', { text: 'Brain in real life' }), real, speakButton(activity.realLife)),
      el('article', { class: 'learn-card badge-card', style: { '--c': 'var(--spark)' } }, badge, el('p', { class: 'badge-name', text: activity.badge }), starsRow ? starsRow(store.stars(activity.key)) : null));
  };
  const api = {
    section, activity,
    render(done, reveal = false) { renderLearn(done); learn.classList.toggle('reveal', reveal); },
    /** Call on any player action: resets the idle hint timer. */
    progress() { armIdle(); },
    /** Call on a wrong action: two of them reveal the hint. */
    wrong() { wrong++; if (wrong >= 2) showHint(); armIdle(); },
    show() { armIdle(); },
    hide() { clearTimeout(idleT); },
  };
  api.render(store.isDone(activity.key));
  scaffolds.set(activity.key, api);
  return api;
}
export const scaffoldFor = (key) => scaffolds.get(key);

// ui.js is imported lazily to avoid a module cycle.
const uiRef = {};
import('./ui.js').then((m) => Object.assign(uiRef, m));

/**
 * Finish an activity: save stars, celebrate with the badge dialog, offer the next stop (FBK-05, PRG-01/02).
 * @param {string} key  activity key
 * @param {{stars?:number, cheer?:string, summary?:string}} opts
 */
export async function complete(key, { stars = 1, cheer = '', summary = '', quiet = false } = {}) {
  const s = scaffolds.get(key); const res = store.setStars(key, stars);
  if (s) { s.render(true, res.first); s.hide(); }
  const sec = s?.section; setMood(sec?.querySelector('.goal-card .sparky'), 'cheer', 2400);
  if (!res.first && !res.improved) { if (cheer) toast(cheer); return; }
  if (quiet && !res.first) { sound.play('star' + (res.stars - 1)); toast(`${'★'.repeat(res.stars)} ${s?.activity.title || key}: ${cheer}`); return; }
  if (res.first && checker && key !== 'quiz') { try { await checker(key); } catch (e) { console.error(e); } }
  sound.play('win');
  [0, 1, 2].slice(0, res.stars).forEach((i) => setTimeout(() => sound.play('star' + i), 500 + i * 160));
  const ui = uiRef.badgeDialog ? uiRef : await import('./ui.js');
  const nextKey = nextStopAfter(key);
  const nextTitle = activityOrder.length ? (document.getElementById(nextKey)?.querySelector('h2')?.textContent || 'next stop') : 'next stop';
  const choice = await ui.badgeDialog({
    title: res.first ? 'Badge earned!' : 'New best!', badge: s ? s.activity.badge : key, iconId: activityIcon(key), stars: res.stars,
    summary: [cheer, summary || s?.activity.storyOut || s?.activity.whatHappened?.split(/(?<=[.!?])\s/)[0]].filter(Boolean).join(' '),
    nextLabel: `Next: ${nextTitle} →`,
  });
  if (choice === 'next' && onNext) onNext(nextKey);
  else s?.section.querySelector('.learn-cards')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
}

export function init() { setupTermPopups(); startBlinking(); }
