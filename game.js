// Brain Signal Quest: entry module. Loads content, builds the quest map, routes between screens.
import { $, el, icon, rich, store, prefs, sound, reader, refreshSpeakButtons, guide, scaffold, scaffoldFor, sparky, activityIcon, setNavigator,
  setChecker, init as initCore, setGlossary } from './js/core.js';
import { clearTransient, starsRow } from './js/ui.js';
import { reducedMotion } from './js/core.js';
import { initBrain } from './js/brain.js';
import { initNeuron } from './js/neuron.js';
import { initReaction } from './js/reaction.js';
import { initMemory } from './js/memory.js';
import { initQuiz, makeChecker, dueQuestions } from './js/quiz.js';
import { loadAtlas, renderAtlas } from './js/atlas.js';

const hooks = {}; // per-screen show/hide hooks
let content; let current = null; let homeGuide = null; let quizApi = null; let prevVisit = 0;
const WARMUP_AFTER_MS = 20 * 3600 * 1000;
const order = () => content.activities.map((a) => a.key);
const title = (key) => content.activities.find((a) => a.key === key)?.title || key;

/** The stop a player should do next: first unstarted, else first below 3 stars (PRG-02). */
function suggestedStop() {
  const keys = order();
  return keys.find((k) => !store.isDone(k)) || keys.find((k) => store.stars(k) < 3) || null;
}

function buildMap() {
  const map = $('#quest-map'); map.replaceChildren(); $('.map-end').hidden = false;
  const next = suggestedStop();
  content.activities.forEach((a, i) => {
    const stars = store.stars(a.key);
    const tile = el('a', { class: 'tile' + (stars ? ' done' : '') + (a.key === next ? ' next' : ''), href: '#' + a.key, style: { '--c': `var(--a-${a.key})` } },
      el('div', { class: 'tile-top' }, el('span', { class: 'tile-icon' }, icon(activityIcon(a.key))), el('span', { class: 'tile-step', text: `Stop ${i + 1}` })),
      el('h3', { text: a.title }), el('p', { text: a.tile }),
      el('span', { class: 'tile-foot' }, starsRow(stars), a.key === next ? el('span', { class: 'next-tag', text: 'Next' }) : el('span', { class: 'sr-only', text: stars ? `${stars} of 3 stars` : 'Not started' })));
    map.append(el('li', {}, tile));
  });
  const total = store.totalStars(); const max = content.activities.length * 3;
  const actStars = content.activities.reduce((n, a) => n + store.stars(a.key), 0);
  $('#progress-fill').style.width = Math.min(100, (actStars / max) * 100) + '%';
  const bar = $('.progress'); bar.setAttribute('aria-valuenow', actStars); bar.setAttribute('aria-valuemax', max);
  const allDone = content.activities.every((a) => store.isDone(a.key));
  $('#progress-label').textContent = `${actStars} of ${max} stars${total > actStars ? ` (+${total - actStars} Playhouse)` : ''}${allDone ? ' · Certificate unlocked!' : ''}`;
  // Start / Continue
  const start = $('#start-btn'); const label = start.querySelector('span');
  if (!store.isDone(order()[0]) && !content.activities.some((a) => store.isDone(a.key))) { start.href = '#' + order()[0]; label.textContent = 'Start your quest'; }
  else if (next) { start.href = '#' + next; label.textContent = `Continue: ${title(next)}`; }
  else { start.href = '#certificate'; label.textContent = 'See your certificate'; }
  requestAnimationFrame(drawPath);
  buildWarmup();
  loadAtlas(content).then((list) => { $('#atlas-link span').textContent = `Brain Atlas (${list.filter((e) => store.atlasHas(e.id)).length}/${list.length})`; });
}

/** PRG-04: on a return visit, offer 3 spaced-review questions. Optional; skipping says nothing negative. */
function buildWarmup() {
  const box = $('#warmup'); const due = dueQuestions(content.quiz, 3);
  const show = due.length > 0 && prevVisit > 0 && Date.now() - prevVisit >= WARMUP_AFTER_MS && !sessionStorageGet('bsq-warmup-done');
  box.hidden = !show; if (!show) return;
  const go2 = el('a', { class: 'btn', href: '#quiz', text: 'Start warm-up' });
  go2.addEventListener('click', () => { sessionStorageSet('bsq-warmup-done', '1'); setTimeout(() => quizApi?.warmup(due), 0); });
  box.replaceChildren(sparky({ size: '3.5rem', mood: 'wave' }), el('p', {}, el('strong', { text: 'Brain Warm-up! ' }), document.createTextNode(`${due.length} quick question${due.length > 1 ? 's' : ''} to wake up your memory.`)), go2);
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } }

/** VIS-01: draw the quest path as a glowing myelinated axon connecting the stops. */
function drawPath() {
  const svgEl = $('#map-path'); const wrap = $('.map-wrap'); if (!svgEl || !wrap) return;
  const box = wrap.getBoundingClientRect();
  const pts = [...document.querySelectorAll('#quest-map .tile-icon')].map((n) => { const r = n.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
  if (pts.length < 2) return;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const my = (y0 + y1) / 2; d += ` C${x0},${my} ${x1},${my} ${x1},${y1}`; }
  svgEl.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  svgEl.innerHTML = `<path class="mp-base" d="${d}"/><path class="mp-myelin" d="${d}"/><path class="mp-fill" d="${d}"/>`;
  const fill = svgEl.querySelector('.mp-fill'); const len = fill.getTotalLength();
  // Fill along the path up to the last stop finished in order.
  const keys = order(); let reached = 0; while (reached < keys.length && store.isDone(keys[reached])) reached++;
  const frac = reached <= 1 ? (reached ? 0.02 : 0) : (reached - 1) / (keys.length - 1);
  fill.style.strokeDasharray = `${len}`; fill.style.strokeDashoffset = `${len * (1 - frac)}`;
}

function setupHomeGuide() {
  const g = $('#home-guide');
  if (prefs.get('sound') === null) {
    homeGuide = guide(g, `${content.mascot.hello} Want sound effects?`);
    const yes = el('button', { type: 'button', class: 'btn', text: 'Yes, sounds on' });
    const no = el('button', { type: 'button', class: 'btn btn-secondary', text: 'No thanks' });
    const row = el('div', { class: 'hero-cta' }, yes, no);
    homeGuide.bubble.parentElement.append(row);
    const done = (on) => { sound.set(on); syncSoundButton(); row.remove(); homeGuide.say(on ? 'Yay! You can change this any time in the top bar.' : 'Okay! Sounds stay off. You can turn them on in the top bar.'); homeGuide.cheer(); };
    yes.addEventListener('click', () => done(true)); no.addEventListener('click', () => done(false));
  } else {
    const returning = content.activities.some((a) => store.isDone(a.key));
    const next = suggestedStop(); const nextAct = content.activities.find((a) => a.key === next);
    homeGuide = guide(g, returning && nextAct ? `Welcome back! Next station: ${nextAct.title}. ${nextAct.storyIn || ''}` : returning ? content.mascot.finish : content.mascot.hello);
  }
}

function syncSoundButton() {
  const b = $('#sound-toggle'); const on = sound.on;
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('use').setAttribute('href', on ? '#i-sound-on' : '#i-sound-off');
  b.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
}

function setupOptions() {
  const vol = $('#volume'); vol.value = prefs.get('volume');
  vol.addEventListener('input', () => { sound.volume(Number(vol.value)); });
  vol.addEventListener('change', () => sound.play('tick'));
  const amb = $('#opt-ambient'); amb.checked = Boolean(prefs.get('ambient'));
  amb.addEventListener('change', () => { if (amb.checked && !sound.on) { sound.set(true); syncSoundButton(); } sound.ambient(amb.checked); });
  const rd = $('#opt-read');
  const syncRead = () => { const ok = reader.available(); rd.disabled = !ok; $('#opt-read-note').hidden = ok; rd.checked = ok && Boolean(prefs.get('readAloud')); refreshSpeakButtons(); };
  rd.addEventListener('change', () => { prefs.set('readAloud', rd.checked); if (!rd.checked) reader.stop(); refreshSpeakButtons(); });
  document.addEventListener('bsq:voices', syncRead); syncRead();
  const sci = $('#opt-scientist'); sci.checked = Boolean(prefs.get('scientist'));
  sci.addEventListener('change', () => { prefs.set('scientist', sci.checked); document.dispatchEvent(new CustomEvent('bsq:scientist', { detail: sci.checked })); });
  document.addEventListener('click', (e) => { const o = $('#options'); if (o.open && !o.contains(e.target)) o.open = false; });
  document.addEventListener('keydown', (e) => { const o = $('#options'); if (e.key === 'Escape' && o.open) { o.open = false; o.querySelector('summary').focus(); } });
}

function buildCertificate() {
  const total = content.activities.length; const n = content.activities.filter((a) => store.isDone(a.key)).length;
  $('#cert-status').textContent = n === total ? 'You earned every badge. Congratulations, Junior Neuroscientist!' : `You have ${n} of ${total} badges. Finish every stop on the quest map to complete your certificate. You can still print it now!`;
  $('#cert-title').textContent = content.certificate.title;
  $('.cert-small').textContent = n === total ? 'Message delivered to Brain HQ! This certifies that' : 'This certifies that';
  rich($('#cert-text'), content.certificate.text);
  const list = $('#cert-badges'); list.replaceChildren();
  for (const a of content.activities) {
    const s = store.stars(a.key);
    list.append(el('li', { class: s ? 'earned' : '' }, starsRow(s), el('span', { text: a.badge + (s ? '' : ' (not yet)') })));
  }
  $('#cert-date').textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildReferences() {
  const dl = $('#glossary'); dl.replaceChildren();
  [...content.glossary].sort((a, b) => a.name.localeCompare(b.name)).forEach(({ name, description }) => dl.append(el('div', {}, el('dt', { text: name }), el('dd', { text: description }))));
  const ul = $('#sources'); ul.replaceChildren();
  for (const { name, url } of content.sources) {
    try { const u = new URL(url); if (u.protocol === 'https:') ul.append(el('li', {}, el('a', { href: u.href, rel: 'noopener noreferrer', text: name }))); } catch { /* skip bad URL */ }
  }
  $('#credits').textContent = content.credits;
}

async function loadPlayhouse() {
  if (hooks.playhouse) return;
  hooks.playhouse = { show() {}, hide() {} };
  try {
    if (!content.playhouse) { const r = await fetch('playhouse.json'); if (!r.ok) throw new Error('playhouse.json unavailable'); content.playhouse = await r.json(); }
    const mod = await import('./js/playhouse/playhouse.js');
    hooks.playhouse = mod.initPlayhouse(content, $('#playhouse-root'));
    if (current === 'playhouse') hooks.playhouse.show();
  } catch (err) {
    console.error(err);
    $('#playhouse-root').replaceChildren(el('p', { class: 'load-error', text: 'The Brain Playhouse could not load. Try refreshing the page.' }));
  }
}

function route(initial = false) {
  const id = decodeURIComponent(location.hash.slice(1)) || 'home';
  const target = document.getElementById(id);
  const screen = target && target.classList.contains('screen') ? target : $('#home');
  const name = screen.id;
  clearTransient(); reader.stop();
  if (current && current !== name) { hooks[current]?.hide?.(); scaffoldFor(current)?.hide(); }
  const swap = () => document.querySelectorAll('.screen').forEach((s) => { s.hidden = s !== screen; });
  // ANIM-02: map ⇄ stop as a spatial zoom where the View Transitions API exists; plain fade elsewhere.
  if (!initial && document.startViewTransition && !reducedMotion()) {
    document.documentElement.dataset.vt = name === 'home' ? 'back' : 'forward';
    document.startViewTransition(swap);
  } else swap();
  current = name;
  if (name === 'home') buildMap();
  if (name === 'certificate') buildCertificate();
  if (name === 'atlas') renderAtlas(content);
  if (name === 'playhouse') loadPlayhouse();
  hooks[name]?.show?.(); scaffoldFor(name)?.show();
  document.title = name === 'home' ? 'Brain Signal Quest' : `${screen.querySelector('h2')?.textContent || name} · Brain Signal Quest`;
  if (!initial) {
    window.scrollTo(0, 0);
    const h = screen.querySelector('h1, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}
const go = (key) => { if (location.hash === '#' + key) route(); else location.hash = key; };

async function start() {
  const res = await fetch('content.json');
  if (!res.ok) throw new Error('Content unavailable');
  content = await res.json();
  initCore(); setGlossary(content.glossary);
  setNavigator(order(), go);
  rich($('#intro'), content.intro);
  setupHomeGuide(); syncSoundButton(); setupOptions();
  for (const a of content.activities) scaffold(a);
  initBrain(content);
  hooks.neuron = initNeuron(content);
  hooks.reaction = initReaction(content);
  hooks.memory = initMemory(content);
  quizApi = initQuiz(content);
  setChecker(makeChecker(content));
  buildReferences();
  $('#cert-guide').append(sparky({ mood: 'cheer' }));
  $('#cert-name').addEventListener('input', (e) => { $('#cert-name-out').textContent = e.target.value.trim() || 'A Brilliant Brain Explorer'; });
  $('#print-cert').addEventListener('click', () => window.print());
  $('#reset-progress').addEventListener('click', () => {
    if (window.confirm('Clear all your stars and badges on this device?')) { store.reset(); for (const a of content.activities) scaffold(a); buildMap(); }
  });
  $('#sound-toggle').addEventListener('click', () => { sound.toggle(); if (!sound.on) $('#opt-ambient').checked = false; syncSoundButton(); });
  store.subscribe(() => { if (current === 'home') buildMap(); });
  window.addEventListener('resize', () => { if (current === 'home') drawPath(); });
  prevVisit = store.touchVisit();
  window.addEventListener('hashchange', () => route(false));
  route(true);
  addDrift(); prefetch3D();
}

/** ANIM-04: a few slow drifting "signal" dots behind the home screen (none under reduced motion). */
function addDrift() {
  if (reducedMotion()) return;
  const layer = el('div', { class: 'drift', 'aria-hidden': 'true' });
  for (let i = 0; i < 10; i++) { const d = el('i'); d.style.left = Math.random() * 100 + 'vw'; d.style.animationDelay = -Math.random() * 18 + 's'; d.style.animationDuration = 14 + Math.random() * 10 + 's'; layer.append(d); }
  document.body.prepend(layer);
}
/** PERF-02: warm the 3D code during idle time on capable devices, never on Save-Data. */
function prefetch3D() {
  const c = navigator.connection; if (c?.saveData || (navigator.deviceMemory && navigator.deviceMemory < 4)) return;
  const go = () => ['vendor/three/three.module.min.js', 'vendor/three/addons/controls/OrbitControls.js', 'js/playhouse/scene3d.js', 'js/playhouse/playhouse.js', 'playhouse.json']
    .forEach((href) => document.head.append(el('link', { rel: href.endsWith('.json') ? 'prefetch' : 'modulepreload', href })));
  (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(go, { timeout: 5000 });
}

start().catch((err) => { console.error(err); $('#load-error').hidden = false; });
