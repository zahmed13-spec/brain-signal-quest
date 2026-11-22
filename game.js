// Brain Signal Quest: entry module. Loads content.json, builds the quest map and routes between screens.
import { $, el, icon, rich, store, sound, guide, scaffold, sparky, activityIcon, init as initCore, setGlossary } from './js/core.js';
import { initBrain } from './js/brain.js';
import { initNeuron } from './js/neuron.js';
import { initReaction } from './js/reaction.js';
import { initMemory } from './js/memory.js';
import { initQuiz } from './js/quiz.js';

const hooks = {}; // per-screen show/hide hooks
let content; let current = null;

function buildMap() {
  const map = $('#quest-map'); map.replaceChildren(); $('.map-end').hidden = false;
  content.activities.forEach((a, i) => {
    const done = store.isDone(a.key);
    const tile = el('a', { class: 'tile' + (done ? ' done' : ''), href: '#' + a.key, style: { '--c': `var(--a-${a.key})` } },
      el('div', { class: 'tile-top' }, el('span', { class: 'tile-icon' }, icon(activityIcon(a.key))), el('span', { class: 'tile-step', text: `Stop ${i + 1}` })),
      el('h3', { text: a.title }), el('p', { text: a.tile }),
      el('span', { class: 'tile-star' }, icon('star'), el('span', { text: done ? `Star earned: ${a.badge}` : 'Earn a star' })));
    map.append(el('li', {}, tile));
  });
  const n = content.activities.filter((a) => store.isDone(a.key)).length; const total = content.activities.length;
  $('#progress-fill').style.width = (n / total) * 100 + '%';
  const bar = $('.progress'); bar.setAttribute('aria-valuenow', n); bar.setAttribute('aria-valuemax', total);
  $('#progress-label').textContent = `${n} of ${total} stars${n === total ? ' · Certificate unlocked!' : ''}`;
}

function buildCertificate() {
  const total = content.activities.length; const n = content.activities.filter((a) => store.isDone(a.key)).length;
  $('#cert-status').textContent = n === total ? 'You earned every star. Congratulations, Junior Neuroscientist!' : `You have ${n} of ${total} stars. Finish every stop on the quest map to complete your certificate. You can still print it now!`;
  $('#cert-title').textContent = content.certificate.title;
  rich($('#cert-text'), content.certificate.text);
  const list = $('#cert-badges'); list.replaceChildren();
  for (const a of content.activities) {
    const done = store.isDone(a.key);
    list.append(el('li', { class: done ? 'earned' : '' }, icon('star'), el('span', { text: a.badge + (done ? '' : ' (not yet)') })));
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
  if (current && current !== name) hooks[current]?.hide?.();
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s !== screen; });
  current = name;
  if (name === 'home') buildMap();
  if (name === 'certificate') buildCertificate();
  if (name === 'playhouse') loadPlayhouse();
  hooks[name]?.show?.();
  document.title = name === 'home' ? 'Brain Signal Quest' : `${screen.querySelector('h2')?.textContent || name} · Brain Signal Quest`;
  if (!initial) {
    window.scrollTo(0, 0);
    const h = screen.querySelector('h1, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}

async function start() {
  const res = await fetch('content.json');
  if (!res.ok) throw new Error('Content unavailable');
  content = await res.json();
  initCore(); setGlossary(content.glossary);
  rich($('#intro'), content.intro);
  guide($('#home-guide'), content.mascot.hello);
  for (const a of content.activities) scaffold(a);
  initBrain(content);
  hooks.neuron = initNeuron(content);
  hooks.reaction = initReaction(content);
  initMemory(content);
  initQuiz(content);
  buildReferences();
  $('#cert-guide').append(sparky());
  $('#cert-name').addEventListener('input', (e) => { $('#cert-name-out').textContent = e.target.value.trim() || 'A Brilliant Brain Explorer'; });
  $('#print-cert').addEventListener('click', () => window.print());
  $('#reset-progress').addEventListener('click', () => {
    if (window.confirm('Clear all your stars and badges on this device?')) { store.reset(); for (const a of content.activities) scaffold(a); buildMap(); }
  });
  const soundBtn = $('#sound-toggle');
  soundBtn.addEventListener('click', () => {
    const on = sound.toggle(); soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('use').setAttribute('href', on ? '#i-sound-on' : '#i-sound-off');
    soundBtn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
  });
  store.subscribe(() => { if (current === 'home') buildMap(); });
  window.addEventListener('hashchange', () => route(false));
  route(true);
}

start().catch((err) => { console.error(err); $('#load-error').hidden = false; });
