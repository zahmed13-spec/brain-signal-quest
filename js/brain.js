// Brain Explorer: original SVG side view (left hemisphere, face on the left) with clickable regions.
import { $, el, svg, rich, sound, complete, pick } from './core.js';

// Artwork for each region key. Keys must match content.json "regions[].key".
const ART = {
  frontal: { d: 'M70 235C60 160 110 80 200 55C240 44 275 38 305 37C295 90 290 120 270 160C262 185 258 205 255 228C225 240 195 246 175 250C150 256 110 262 70 235Z',
    gyri: 'M110 120c25 10 40 0 60 15M95 180c30-5 50 10 80 0M150 90c10 20 30 25 45 20M200 150c15 10 20 30 40 35M120 215c20-8 40-4 60-12M235 75c-5 25 5 45 0 70', label: [158, 160] },
  parietal: { d: 'M305 37C350 35 400 45 440 62C452 120 456 170 452 218C420 220 395 218 375 214C330 222 290 225 255 228C258 205 262 185 270 160C290 120 295 90 305 37Z',
    gyri: 'M330 60c-5 30 10 50 5 80M380 70c10 25-5 50 10 75M300 180c25-10 50 5 75-5M410 150c10 15 20 25 35 25', label: [362, 135] },
  occipital: { d: 'M440 62C490 85 535 130 545 190C552 230 540 265 515 285C495 296 475 300 460 302C458 270 455 245 452 218C456 170 452 120 440 62Z',
    gyri: 'M470 110c15 20 10 40 30 55M480 210c20 5 35 0 50 15M470 260c15-5 30 0 40-8', label: [497, 205] },
  temporal: { d: 'M175 250C195 246 225 240 255 228C290 225 330 222 375 214C395 218 420 220 452 218C455 245 458 270 460 302C420 315 360 328 290 326C230 325 180 312 155 295C142 285 145 262 175 250Z',
    gyri: 'M190 280c40-10 90-5 140-15M220 305c50 0 100-8 150-18M380 245c25 5 45 0 70 5', label: [300, 290] },
  cerebellum: { d: 'M400 318C420 300 470 300 510 292C545 300 560 330 545 360C525 390 470 395 430 380C400 368 388 340 400 318Z',
    gyri: 'M405 330c40-12 90-18 140-10M402 348c45-10 95-12 148-4M412 364c40-6 80-8 125 0', label: [478, 348] },
  brainstem: { d: 'M335 290C355 292 380 296 398 302C400 340 402 380 396 418L362 418C362 380 355 330 335 290Z', label: [352, 395], anchor: 'end' },
  thalamus: { ellipse: [335, 200, 38, 24], inner: true, label: [335, 166] },
  hippocampus: { d: 'M290 262C300 250 330 248 360 252C385 256 400 248 405 236C412 250 402 274 372 274C340 274 312 278 290 262Z', inner: true, label: [372, 300] },
  amygdala: { ellipse: [276, 258, 15, 12], inner: true, label: [232, 300] },
};
const LOBES = ['frontal', 'parietal', 'temporal', 'occipital'];

export function buildBrainSVG({ onSelect } = {}) {
  const s = svg('svg', { viewBox: '40 20 540 410', class: 'brain-svg', role: 'group', 'aria-label': 'Diagram of the brain from the left side. Choose a part to learn about it.' });
  s.append(svg('text', { x: 52, y: 44, class: 'orient' }, '← Front (face)'), svg('text', { x: 568, y: 44, class: 'orient', 'text-anchor': 'end' }, 'Back →'));
  const groups = {};
  const order = ['brainstem', 'cerebellum', 'temporal', 'frontal', 'parietal', 'occipital', 'thalamus', 'hippocampus', 'amygdala'];
  for (const key of order) {
    const a = ART[key];
    const g = svg('g', { class: `region ${a.inner ? 'inner' : 'outer'}`, 'data-key': key, tabindex: a.inner ? '-1' : '0', role: 'button', fill: `var(--r-${key})` });
    g.append(a.ellipse ? svg('ellipse', { cx: a.ellipse[0], cy: a.ellipse[1], rx: a.ellipse[2], ry: a.ellipse[3] }) : svg('path', { d: a.d }));
    if (a.gyri) g.append(svg('path', { d: a.gyri, class: 'gyri' }));
    g.addEventListener('click', () => onSelect && onSelect(key));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect && onSelect(key); } });
    groups[key] = g; s.append(g);
  }
  const labels = {};
  for (const key of order) {
    const a = ART[key];
    labels[key] = svg('text', { x: a.label[0], y: a.label[1], 'text-anchor': a.anchor || 'middle', class: `lbl ${a.inner ? 'inner-lbl' : 'outer-lbl'}` });
    s.append(labels[key]);
  }
  return { svg: s, groups, labels };
}

export function initBrain(content) {
  const regions = content.regions;
  const byKey = Object.fromEntries(regions.map((r) => [r.key, r]));
  const seen = new Set();
  const wrap = $('#brain-svg-wrap'); const card = $('#region-card'); const buttonsBox = $('#region-buttons');
  const peek = $('#peek-inside'); const count = $('#explored-count');
  let active = null;

  const art = buildBrainSVG({ onSelect: (key) => select(key, true) });
  wrap.append(art.svg);
  for (const r of regions) {
    if (art.labels[r.key]) art.labels[r.key].textContent = r.name;
    if (art.groups[r.key]) art.groups[r.key].setAttribute('aria-label', r.name);
  }

  const buttons = {};
  function renderButtons() {
    buttonsBox.replaceChildren();
    for (const r of regions) {
      if (Boolean(r.inside) !== peek.checked && r.key !== 'cerebrum') continue;
      const b = el('button', { type: 'button', class: 'region-btn' + (seen.has(r.key) ? ' seen' : ''), 'aria-pressed': String(active === r.key), style: { '--c': `var(--r-${r.key}, #ddd)` }, text: r.name });
      b.addEventListener('click', () => select(r.key, false));
      buttons[r.key] = b; buttonsBox.append(b);
    }
  }

  function select(key, fromDiagram) {
    const r = byKey[key]; if (!r) return;
    if (Boolean(r.inside) !== peek.checked && key !== 'cerebrum') { peek.checked = Boolean(r.inside); applyPeek(); }
    active = key; seen.add(key); sound.play('blip');
    art.svg.classList.add('has-active');
    for (const [k, g] of Object.entries(art.groups)) {
      const on = k === key || (key === 'cerebrum' && LOBES.includes(k));
      g.classList.toggle('active', on);
      g.setAttribute('aria-pressed', String(on));
    }
    card.style.setProperty('--c', `var(--r-${key}, var(--line))`);
    const p = el('p'); rich(p, r.description);
    const fact = el('p', { class: 'did-you-know' }, el('strong', { text: 'Did you know? ' }));
    fact.append(rich(el('span'), r.funFact || ''));
    card.replaceChildren(el('h3', { text: r.name }), p, r.funFact ? fact : '');
    renderButtons();
    if (!fromDiagram) buttons[key]?.focus();
    const total = regions.length;
    count.textContent = `Explored ${seen.size} of ${total} parts`;
    if (seen.size === total) complete('brain', pick(content.mascot.cheers) + ' You explored every part!');
    else if (seen.size >= 1 && !peek.checked && regions.filter((x) => !x.inside).every((x) => seen.has(x.key))) count.textContent += ' — now try Peek inside!';
  }

  function applyPeek() {
    art.svg.classList.toggle('peek', peek.checked);
    for (const [k, g] of Object.entries(art.groups)) {
      const inner = ART[k].inner;
      g.setAttribute('tabindex', (inner === peek.checked) ? '0' : '-1');
      g.setAttribute('aria-hidden', String(inner !== peek.checked));
    }
  }
  peek.addEventListener('change', () => {
    applyPeek();
    if (active && Boolean(byKey[active]?.inside) !== peek.checked) { active = null; art.svg.classList.remove('has-active'); Object.values(art.groups).forEach((g) => g.classList.remove('active')); }
    renderButtons();
  });
  applyPeek(); renderButtons();
  count.textContent = `Explored 0 of ${regions.length} parts`;
  card.replaceChildren(el('p', { text: 'Pick a part of the brain to see its job.' }));
}
