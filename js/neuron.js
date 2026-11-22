// Neuron Relay (CORE-01): five short levels that teach summation, timing, teamwork (spatial
// summation), inhibition and the refractory period, by playing them.
// The action potential (ANIM-03) is drawn as node-by-node colour states: resting → firing →
// recovering → resting. It is regenerated at every node, so the soma never "drains" (fixes S2),
// and a node that just fired can't fire again straight away, so the wave only moves forward.
// The next neuron only gains a partial charge from one spike (CORE-02, fixes S1).
import { $, el, svg, rich, sound, complete, reducedMotion, prefs, dock, scaffoldFor, store, speakButton } from './core.js';
import { feedbackSheet, shake, sparkBurst } from './ui.js';

/* ---------- rules (game mechanics stay in code; text lives in content.json neuronLevels) ---------- */
const THRESHOLD = 0.7;
const LEVEL_RULES = {
  threshold: { nudge: 0.34, leak: 0.03, need: 1 },
  timing: { nudge: 0.3, leak: 0.22, need: 1 },
  teamwork: { nudge: 0.24, leak: 0.2, need: 1, tipRestMs: 1400 },
  stop: { nudge: 0.3, leak: 0.05, need: 1, inhibit: 0.3, swapMs: 5000 },
  rest: { nudge: 0.4, leak: 0.05, need: 3, windowMs: 15000, restMs: 1500 },
};
const NEXT_GAIN = 0.35; const NEXT_LEAK = 0.08;
const NODE_MS = 280; // per node: the wave is slowed down for watching

/* ---------- geometry: written once in horizontal coordinates, transposed for phones (MOB-03) ---------- */
const TIPS = [{ x: 54, y: 64, d: [62, 70, 95, 95, 120, 120, 160, 150], in: [0, 40, 50, 62] },
  { x: 24, y: 200, d: [30, 200, 80, 196, 120, 192, 148, 190], in: [0, 200, 18, 200] },
  { x: 64, y: 324, d: [70, 318, 100, 290, 130, 260, 162, 232], in: [0, 360, 60, 326] }];
const SOMA = { x: 200, y: 190, r: 52 }; const NEXT = { x: 975, y: 190, r: 40 };
const NODES = [262, 360, 458, 556, 654, 752];
const BOUTONS = [[856, 128], [862, 190], [856, 252]];

function makeMap(vertical) {
  // Phones: transpose (dendrites on top) and shorten the axon so the whole neuron fits on screen.
  const P = vertical ? (x, y) => [y, x <= 260 ? x : 260 + (x - 260) * 0.55] : (x, y) => [x, y];
  const pt = (x, y) => P(x, y).join(' ');
  return { vertical, P, pt, view: vertical ? '0 0 380 700' : '0 0 1030 380' };
}
const LABELS = {
  h: [['Dendrites', 96, 30, 'start'], ['Cell body', 200, 272, 'middle'], ['Axon', 440, 152, 'middle'], ['myelin', 510, 238, 'middle'],
    ['Axon terminals', 830, 92, 'middle'], ['Synapse', 878, 302, 'middle'], ['Next neuron', 1022, 262, 'end']],
  v: [['Dendrites', 8, 132, 'start'], ['Cell body', 250, 206, 'start'], ['Axon', 214, 352, 'start'], ['myelin', 214, 400, 'start'],
    ['Axon terminals', 262, 566, 'start'], ['Synapse', 292, 606, 'start'], ['Next neuron', 230, 668, 'start']],
};

function buildSVG(m) {
  const { pt, P } = m; const thrY = (c) => c.y + c.r - THRESHOLD * c.r * 2;
  const [sx, sy] = P(SOMA.x, SOMA.y); const [nx, ny] = P(NEXT.x, NEXT.y);
  const s = svg('svg', { viewBox: m.view, class: 'neuron-svg', role: 'img', 'aria-labelledby': 'neuron-svg-title' });
  const myelin = NODES.slice(0, -1).map((x, i) => {
    const [ax, ay] = P(x + 10, 173); const [bx, by] = P(NODES[i + 1] - 10, 207);
    return `<rect class="myelin" x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}" rx="17" fill="#f4eee0" stroke="#c9c1ad" stroke-width="3"/>`;
  }).join('');
  // Synapse (S5): an empty gap between the bouton membrane and a cupped postsynaptic membrane.
  const postsyn = BOUTONS.map(([bx, by]) => `<path d="M${pt(bx + 22, by - 14)} Q${pt(bx + 16, by)} ${pt(bx + 22, by + 14)}" stroke="#9fb0ff" stroke-width="4" fill="none"/>`).join('');
  s.innerHTML = `
  <title id="neuron-svg-title">A neuron. Dendrites catch messages, the cell body adds them up, the axon carries the signal along myelin, axon terminals release chemical messengers across a tiny gap called the synapse, and the next neuron receives them.</title>
  <defs>
    <radialGradient id="soma-grad" cx="40%" cy="35%"><stop offset="0" stop-color="#b8fbff"/><stop offset="1" stop-color="#5a6fd8"/></radialGradient>
    <clipPath id="soma-clip"><circle cx="${sx}" cy="${sy}" r="${SOMA.r - 4}"/></clipPath>
    <clipPath id="next-clip"><circle cx="${nx}" cy="${ny}" r="${NEXT.r - 4}"/></clipPath>
  </defs>
  <g class="part" data-part="dendrites" fill="none" stroke="#7a68e8" stroke-width="9" stroke-linecap="round">
    ${TIPS.map((t) => `<path d="M${pt(t.d[0], t.d[1])} C${pt(t.d[2], t.d[3])} ${pt(t.d[4], t.d[5])} ${pt(t.d[6], t.d[7])}"/>`).join('')}
    <path d="M${pt(105, 105)} L${pt(92, 140)} M${pt(120, 268)} L${pt(96, 260)} M${pt(100, 196)} L${pt(92, 168)} M${pt(110, 194)} L${pt(104, 228)}" stroke-width="6"/>
  </g>
  <g class="incoming" stroke="#8b97c7" stroke-width="5" opacity=".8" fill="none">${TIPS.map((t) => `<path d="M${pt(t.in[0], t.in[1])} L${pt(t.in[2], t.in[3])}"/>`).join('')}</g>
  <g class="part" data-part="soma">
    <circle cx="${sx}" cy="${sy}" r="${SOMA.r}" fill="url(#soma-grad)" stroke="#2c2f7a" stroke-width="4"/>
    <rect class="charge" clip-path="url(#soma-clip)" x="${sx - SOMA.r}" width="${SOMA.r * 2}" y="${sy + SOMA.r}" height="0" fill="#ffe066" opacity=".85"/>
    <circle cx="${sx - 8}" cy="${sy - 6}" r="15" fill="#2c2f7a" opacity=".55"/>
    <line x1="${sx - SOMA.r}" x2="${sx + SOMA.r}" y1="${thrY({ y: sy, r: SOMA.r })}" y2="${thrY({ y: sy, r: SOMA.r })}" stroke="#fff" stroke-width="3" stroke-dasharray="7 6"/>
    <circle class="rest-ring" cx="${sx}" cy="${sy}" r="${SOMA.r + 9}" fill="none" stroke="#9aa3c7" stroke-width="7" stroke-dasharray="6 8"/>
    <circle class="fire-ring" cx="${sx}" cy="${sy}" r="${SOMA.r + 4}" fill="none" stroke="#ffe066" stroke-width="8"/>
  </g>
  <g class="part" data-part="axon">
    <path d="M${pt(252, 190)} L${pt(790, 190)}" stroke="#7a68e8" stroke-width="10" fill="none"/>
    ${myelin}
    ${NODES.map((x, i) => { const [cx, cy] = P(x, 190); return `<circle class="node" data-i="${i}" cx="${cx}" cy="${cy}" r="9" fill="var(--n-rest)" stroke="#2c2f7a" stroke-width="2"/>`; }).join('')}
    <circle class="jump" r="7" fill="#fff" opacity="0"/>
  </g>
  <g class="part" data-part="terminals" fill="none" stroke="#7a68e8" stroke-width="8" stroke-linecap="round">
    <path d="M${pt(790, 190)} C${pt(810, 170)} ${pt(825, 140)} ${pt(844, 130)} M${pt(790, 190)} L${pt(850, 190)} M${pt(790, 190)} C${pt(810, 210)} ${pt(825, 240)} ${pt(844, 250)}"/>
    <g fill="#c08cff" stroke="#2c2f7a" stroke-width="3">${BOUTONS.map(([bx, by]) => { const [cx, cy] = P(bx, by); return `<circle cx="${cx}" cy="${cy}" r="13"/>`; }).join('')}</g>
  </g>
  <g class="part" data-part="synapse">${postsyn}</g>
  <g class="part" data-part="next">
    <path d="M${pt(884, 128)} C${pt(920, 140)} ${pt(935, 165)} ${pt(948, 180)} M${pt(886, 190)} L${pt(938, 190)} M${pt(884, 252)} C${pt(920, 240)} ${pt(935, 215)} ${pt(948, 200)}" stroke="#5a6fd8" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="${nx}" cy="${ny}" r="${NEXT.r}" fill="#5a6fd8" stroke="#2c2f7a" stroke-width="4"/>
    <rect class="next-charge" clip-path="url(#next-clip)" x="${nx - NEXT.r}" width="${NEXT.r * 2}" y="${ny + NEXT.r}" height="0" fill="#ffe066" opacity=".85"/>
    <line x1="${nx - NEXT.r}" x2="${nx + NEXT.r}" y1="${thrY({ y: ny, r: NEXT.r })}" y2="${thrY({ y: ny, r: NEXT.r })}" stroke="#fff" stroke-width="3" stroke-dasharray="6 5"/>
    <circle class="next-ring fire-ring" cx="${nx}" cy="${ny}" r="${NEXT.r + 4}" fill="none" stroke="#ffe066" stroke-width="7"/>
  </g>
  <g class="nts"></g>
  <g class="msgs"></g>
  ${LABELS[m.vertical ? 'v' : 'h'].map(([t, x, y, a]) => `<text x="${x}" y="${y}" text-anchor="${a}">${t}</text>`).join('')}
  <g class="tips">${TIPS.map((t, i) => { const [cx, cy] = P(t.x, t.y); return `<g class="tip" data-i="${i}" tabindex="0" role="button" aria-label="Dendrite ${i + 1}: send a message"><circle class="tip-ring" cx="${cx}" cy="${cy}" r="22" fill="rgba(124,247,255,.18)" stroke="#7cf7ff" stroke-width="3"/><circle class="tip-dot" cx="${cx}" cy="${cy}" r="12" fill="#ffe066" stroke="#2c2f7a" stroke-width="3"/><text class="tip-sign" x="${cx}" y="${cy + 7}" text-anchor="middle" style="font-size:20px;stroke-width:0;fill:#17203d"></text></g>`; }).join('')}</g>`;
  return s;
}

export function initNeuron(content) {
  const levels = (content.neuronLevels || []).filter((l) => LEVEL_RULES[l.id]);
  const stages = content.stages;
  const wrap = $('#neuron-svg-wrap'); const feedback = $('#neuron-feedback');
  const list = $('#stage-list'); rich($('#neuron-note'), content.neuronNote);
  const items = stages.map((st) => { const li = el('li', { text: st.name }); list.append(li); return li; });
  const playCard = wrap.closest('.play-card');

  // Level bar + goal line + scientist readout
  const levelBar = el('div', { class: 'level-bar', role: 'group', 'aria-label': 'Levels' });
  const levelTitle = el('p', { class: 'level-title' });
  const levelGoal = el('p', { class: 'feedback' });
  const mv = el('p', { class: 'note mv', 'aria-live': 'off', hidden: true });
  const pop = el('div', { class: 'fire-pop', 'aria-hidden': 'true', text: 'FIRE!' });
  wrap.before(levelBar, levelTitle, levelGoal); wrap.append(pop); wrap.after(mv);
  const buddy = dock(playCard);
  const sendBtn = $('#nudge'); $('#neuron-step')?.remove(); $('#neuron-reset')?.remove();
  sendBtn.querySelector('span').textContent = 'Send a message';

  let m; let s; let tips; let nodes; let chargeRect; let nextRect; let restRing; let fireRing; let nextRing; let jump; let nts; let msgs;
  let level = 0; let charge = 0; let nextCharge = 0; let firing = false; let resting = false; let fires = []; let lastT = performance.now(); let raf = 0;
  let inhibitTip = -1; let swapT = null; let tipRestUntil = [0, 0, 0]; let narrated = false; let visible = false; let rotate = 0;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const rules = () => LEVEL_RULES[levels[level].id];
  const scaffold = () => scaffoldFor('neuron');

  function render() {
    m = makeMap(window.matchMedia('(max-width: 640px)').matches);
    wrap.querySelector('svg')?.remove(); s = buildSVG(m); wrap.prepend(s);
    tips = [...s.querySelectorAll('.tip')]; nodes = [...s.querySelectorAll('.node')];
    chargeRect = s.querySelector('.charge'); nextRect = s.querySelector('.next-charge'); restRing = s.querySelector('.rest-ring');
    fireRing = s.querySelector('.fire-ring'); nextRing = s.querySelector('.next-ring'); jump = s.querySelector('.jump');
    nts = s.querySelector('.nts'); msgs = s.querySelector('.msgs');
    tips.forEach((t, i) => {
      t.addEventListener('click', () => send(i));
      t.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); send(i); } });
    });
    const [px, py] = m.P(SOMA.x, SOMA.y - 70); const vb = m.view.split(' ').map(Number);
    pop.style.left = (px / vb[2]) * 100 + '%'; pop.style.top = (py / vb[3]) * 100 + '%';
    drawCharge(); paintTips();
  }
  window.matchMedia('(max-width: 640px)').addEventListener('change', render);

  const fill = (rect, c, r, cy) => { const h = Math.min(c, 1) * r * 2; rect.setAttribute('y', cy + r - h); rect.setAttribute('height', h); };
  function drawCharge() {
    const [, sy] = m.P(SOMA.x, SOMA.y); const [, ny] = m.P(NEXT.x, NEXT.y);
    fill(chargeRect, charge, SOMA.r, sy); fill(nextRect, nextCharge, NEXT.r, ny);
    if (prefs.get('scientist')) {
      // OpenStax A&P 2e §12.4: resting ≈ −70 mV, threshold ≈ −55 mV. Shown as "about".
      if (!firing) mv.textContent = `Membrane voltage: about ${Math.round(-70 + 15 * Math.min(charge, THRESHOLD) / THRESHOLD)} mV (fires at about −55 mV)`;
    }
  }
  function paintTips() {
    const now = performance.now(); const r = rules();
    tips.forEach((t, i) => {
      const inhib = i === inhibitTip; const cooling = r.tipRestMs && now < tipRestUntil[i];
      t.classList.toggle('inhib', inhib); t.style.opacity = cooling ? 0.35 : 1;
      t.querySelector('.tip-sign').textContent = inhib ? '−' : '+';
      t.setAttribute('aria-label', `Dendrite ${i + 1}: ${inhib ? 'stop message (lowers the charge)' : cooling ? 'resting' : 'send a message'}`);
    });
  }

  function loop(t) {
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    if (!firing && charge > 0) charge = Math.max(0, charge - rules().leak * dt);
    if (nextCharge > 0) nextCharge = Math.max(0, nextCharge - NEXT_LEAK * dt);
    drawCharge(); if (rules().tipRestMs) paintTips();
    raf = requestAnimationFrame(loop);
  }

  function setStage(i, describe) {
    items.forEach((li, k) => { li.setAttribute('aria-current', k === i ? 'step' : 'false'); li.classList.toggle('done', k < i); });
    s.querySelectorAll('.part').forEach((g) => g.classList.toggle('lit', g.dataset.part === stages[i]?.part));
    if (describe && stages[i]) rich(feedback, `${stages[i].name}: ${stages[i].description}`);
  }

  /** A message travels from a dendrite tip to the cell body. */
  function send(i) {
    if (i == null) { // keyboard/button path: next tip that's ready and not a stop signal
      for (let k = 0; k < 3; k++) { const j = (rotate + k) % 3; if (j !== inhibitTip && !(rules().tipRestMs && performance.now() < tipRestUntil[j])) { i = j; break; } }
      rotate = ((i ?? 0) + 1) % 3; if (i == null) i = 0;
    }
    const r = rules(); scaffold()?.progress();
    if (r.tipRestMs && performance.now() < tipRestUntil[i]) { shake(tips[i]); buddy.say('That dendrite needs a moment. Try another one!', 'think'); scaffold()?.wrong(); return; }
    if (resting) { shake(s.querySelector('[data-part="soma"]')); buddy.say("I'm resting after firing! Wait for the grey ring to go.", 'oops'); scaffold()?.wrong(); sound.play('oops'); return; }
    const inhib = i === inhibitTip;
    if (r.tipRestMs) tipRestUntil[i] = performance.now() + r.tipRestMs;
    sound.play(inhib ? 'oops' : 'bloop'); setStage(0, !narrated);
    const arrive = () => {
      if (inhib) {
        charge = Math.max(0, charge - r.inhibit);
        buddy.say('That was a stop message! It lowered my charge.', 'oops', 2600); scaffold()?.wrong();
      } else charge = Math.min(1.05, charge + r.nudge);
      drawCharge();
      if (charge >= THRESHOLD) fire();
      else if (!inhib && !narrated) rich(feedback, `Charge: ${Math.round((charge / THRESHOLD) * 100)}% of the way to the threshold line. Send more, quickly!`);
    };
    if (reducedMotion()) { arrive(); return; }
    // Animate a message dot along the dendrite.
    const path = s.querySelectorAll('[data-part="dendrites"] path')[i]; const len = path.getTotalLength();
    const dot = svg('circle', { r: 9, fill: inhib ? 'var(--n-inhibit)' : 'var(--spark)', stroke: '#fff', 'stroke-width': 2 }); msgs.append(dot);
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 450); const p = path.getPointAtLength(len * k); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); if (k < 1) requestAnimationFrame(step); else { dot.remove(); arrive(); } };
    requestAnimationFrame(step);
  }

  function setNode(i, state) { if (nodes[i]) nodes[i].setAttribute('fill', `var(--n-${state})`); }

  function fire() {
    firing = true; charge = 0; drawCharge(); fires.push(performance.now());
    sound.play('fire'); setStage(1, !narrated); buddy.mood('cheer', 1200);
    if (!reducedMotion()) { fireRing.classList.remove('go'); void fireRing.getBoundingClientRect(); fireRing.classList.add('go'); pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go'); }
    if (prefs.get('scientist')) mv.textContent = 'Spike! The inside jumps to about +30 mV, then drops back below −70 mV.';
    const r = rules();
    if (r.restMs) { resting = true; restRing.classList.add('on'); later(() => { resting = false; restRing.classList.remove('on'); }, r.restMs); }
    const step = narrated ? NODE_MS : NODE_MS * 1.6;
    later(() => setStage(2, !narrated), 200);
    // Only the spike itself blocks input; the travelling wave doesn't (only the rest ring does).
    later(() => { firing = false; }, 300);
    // The wave: each node fires, then recovers, then rests. Never backwards (refractory).
    NODES.forEach((_, i) => {
      later(() => {
        setNode(i, 'fire'); setNode(i - 1, 'recover'); setNode(i - 2, 'rest');
        if (!reducedMotion() && i < NODES.length - 1) jumpTo(i, step * 0.8);
      }, 200 + i * step);
    });
    const tEnd = 200 + NODES.length * step;
    later(() => { setNode(NODES.length - 1, 'recover'); setNode(NODES.length - 2, 'rest'); setStage(3, !narrated); }, tEnd);
    later(() => { NODES.forEach((_, i) => setNode(i, 'rest')); }, tEnd + step * 2);
    later(() => { setStage(4, !narrated); releaseNTs(); sound.play('pops'); }, tEnd + 500);
    later(() => {
      setStage(5, !narrated);
      nextCharge = Math.min(1.05, nextCharge + NEXT_GAIN); drawCharge();
      if (nextCharge >= THRESHOLD) {
        nextCharge = 0; drawCharge(); sound.play('fire');
        if (!reducedMotion()) { nextRing.classList.remove('go'); void nextRing.getBoundingClientRect(); nextRing.classList.add('go'); }
        buddy.say('The next neuron fired too! The relay keeps going!', 'cheer');
      } else if (!narrated) rich(feedback, `Next neuron: ${stages[5]?.description || ''} One spike only filled it part of the way.`);
      narrated = true; nts.replaceChildren();
      checkLevel();
    }, tEnd + 1700);
  }
  function jumpTo(i, ms) {
    const [x0, y0] = m.P(NODES[i], 190); const [x1, y1] = m.P(NODES[i + 1], 190); const t0 = performance.now();
    const stepFn = (t) => { const k = Math.min(1, (t - t0) / ms); jump.setAttribute('cx', x0 + (x1 - x0) * k); jump.setAttribute('cy', y0 + (y1 - y0) * k); jump.setAttribute('opacity', k < 1 ? 0.9 : 0); if (k < 1) requestAnimationFrame(stepFn); };
    requestAnimationFrame(stepFn);
  }
  function releaseNTs() {
    nts.replaceChildren();
    BOUTONS.forEach(([bx, by], b) => {
      for (let i = 0; i < 3; i++) {
        const [x0, y0] = m.P(bx + 10, by + (i - 1) * 8); const [x1, y1] = m.P(bx + 24, by + (i - 1) * 10);
        const c = svg('circle', { cx: reducedMotion() ? x1 : x0, cy: reducedMotion() ? y1 : y0, r: 5, fill: '#ff8fcf', stroke: '#fff', 'stroke-width': 1.5 }); nts.append(c);
        if (reducedMotion()) continue;
        const t0 = performance.now() + (b * 3 + i) * 60;
        const stepFn = (t) => { const k = Math.max(0, Math.min(1, (t - t0) / 800)); c.setAttribute('cx', x0 + (x1 - x0) * k); c.setAttribute('cy', y0 + (y1 - y0) * k); if (k < 1) requestAnimationFrame(stepFn); };
        requestAnimationFrame(stepFn);
      }
    });
  }

  async function checkLevel() {
    const r = rules(); const L = levels[level];
    let done = false;
    if (r.windowMs) { const now = performance.now(); fires = fires.filter((t) => now - t <= r.windowMs); done = fires.length >= r.need; if (!done) rich(feedback, `Fired ${fires.length} of ${r.need} times in ${r.windowMs / 1000} seconds. Keep going!`); }
    else done = fires.length >= r.need;
    if (!done) return;
    stopSwap();
    sparkBurst(s.querySelector('[data-part="soma"]'));
    store.setLevel('neuron', level + 1);
    renderLevelBar();
    const last = level === levels.length - 1;
    await feedbackSheet({ good: true, title: `Level ${level + 1} complete! (${L.title})`, lines: [L.explain], cta: last ? 'Finish' : 'Next level →' });
    if (level === 0) await complete('neuron', { stars: 1, cheer: 'You made a neuron fire!' });
    else if (level === 2) await complete('neuron', { stars: 2, cheer: 'Teamwork! Inputs add up.', quiet: true });
    else if (last) await complete('neuron', { stars: 3, cheer: 'You mastered the neuron relay!' });
    if (!last && location.hash.replace('#', '') === 'neuron') startLevel(level + 1);
  }

  function stopSwap() { clearInterval(swapT); swapT = null; }
  function startLevel(i) {
    timers.forEach(clearTimeout); timers.clear(); stopSwap();
    level = i; charge = 0; nextCharge = 0; firing = false; resting = false; fires = []; tipRestUntil = [0, 0, 0];
    const L = levels[i]; const r = rules();
    inhibitTip = r.inhibit ? 1 : -1;
    if (r.swapMs) swapT = setInterval(() => { if (!firing) { inhibitTip = (inhibitTip + 1) % 3; paintTips(); } }, r.swapMs);
    restRing.classList.remove('on'); NODES.forEach((_, k) => setNode(k, 'rest'));
    levelTitle.textContent = `Level ${i + 1} of ${levels.length}: ${L.title}`;
    rich(levelGoal, L.goal);
    feedback.textContent = '';
    items.forEach((li) => { li.setAttribute('aria-current', 'false'); li.classList.remove('done'); });
    renderLevelBar(); paintTips(); drawCharge();
    buddy.say(L.goal, 'point', 3500);
  }
  function renderLevelBar() {
    levelBar.replaceChildren(el('span', { class: 'sr-only', text: 'Choose a level:' }));
    const unlocked = store.level('neuron');
    levels.forEach((L, i) => {
      const b = el('button', { type: 'button', class: 'lvl' + (i < unlocked ? ' done' : ''), 'aria-label': `Level ${i + 1}: ${L.title}${i < unlocked ? ', complete' : i > unlocked ? ', locked' : ''}`, 'aria-current': i === level ? 'step' : 'false', disabled: i > unlocked ? true : undefined, text: String(i + 1) });
      b.addEventListener('click', () => startLevel(i)); levelBar.append(b);
    });
    levelBar.append(speakButton(() => `${levels[level].title}. ${levels[level].goal}`));
  }

  sendBtn.addEventListener('click', () => send(null));
  document.addEventListener('bsq:scientist', (e) => { mv.hidden = !e.detail; drawCharge(); });
  mv.hidden = !prefs.get('scientist');
  render();
  startLevel(Math.min(store.level('neuron'), levels.length - 1));

  return {
    show() { visible = true; lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); if (rules().swapMs && !swapT) startLevel(level); },
    hide() { visible = false; cancelAnimationFrame(raf); stopSwap(); },
    get visible() { return visible; },
  };
}
