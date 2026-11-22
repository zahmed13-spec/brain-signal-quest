// Neuron Relay: send messages to the dendrites until the cell body passes threshold,
// then watch the action potential travel down the myelinated axon and across the synapse.
import { $, el, svg, rich, sound, complete, reducedMotion, pick } from './core.js';

const SOMA = { x: 200, y: 190, r: 52 };
const THRESHOLD = 0.7; const NUDGE = 0.34; const LEAK_PER_SEC = 0.03;
const NODES = [262, 360, 458, 556, 654, 752]; // nodes of Ranvier (gaps between myelin)
const TIPS = [[62, 70, 'M62 70C95 95 120 120 160 150'], [30, 200, 'M30 200C80 196 120 192 148 190'], [70, 318, 'M70 318C100 290 130 260 162 232']];

function buildSVG() {
  const s = svg('svg', { viewBox: '0 0 1010 380', class: 'neuron-svg', role: 'img', 'aria-labelledby': 'neuron-svg-title' });
  s.innerHTML = `
  <title id="neuron-svg-title">A neuron: dendrites on the left, a round cell body, a long axon wrapped in myelin, axon terminals, a tiny synapse gap and the next neuron on the right.</title>
  <defs>
    <radialGradient id="ap-grad"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffe066"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>
    <radialGradient id="soma-grad" cx="40%" cy="35%"><stop offset="0" stop-color="#b8fbff"/><stop offset="1" stop-color="#5a6fd8"/></radialGradient>
    <clipPath id="soma-clip"><circle cx="${SOMA.x}" cy="${SOMA.y}" r="${SOMA.r - 4}"/></clipPath>
  </defs>
  <g class="incoming" stroke="#8b97c7" stroke-width="5" fill="#8b97c7" opacity=".8">
    <path d="M0 40 L50 62" fill="none"/><circle cx="54" cy="64" r="9"/>
    <path d="M0 200 L20 200" fill="none"/><circle cx="22" cy="200" r="9"/>
    <path d="M0 360 L60 326" fill="none"/><circle cx="64" cy="324" r="9"/>
  </g>
  <g class="part" data-part="dendrites" fill="none" stroke="#7a68e8" stroke-width="9" stroke-linecap="round">
    ${TIPS.map((t) => `<path d="${t[2]}"/>`).join('')}
    <path d="M105 105 92 140M120 268 96 260M100 196 92 168M110 194 104 228" stroke-width="6"/>
  </g>
  <g class="part" data-part="soma">
    <circle cx="${SOMA.x}" cy="${SOMA.y}" r="${SOMA.r}" fill="url(#soma-grad)" stroke="#2c2f7a" stroke-width="4"/>
    <rect id="charge" clip-path="url(#soma-clip)" x="${SOMA.x - SOMA.r}" width="${SOMA.r * 2}" y="${SOMA.y + SOMA.r}" height="0" fill="#ffe066" opacity=".8"/>
    <circle cx="${SOMA.x - 8}" cy="${SOMA.y - 6}" r="15" fill="#2c2f7a" opacity=".55"/>
    <line x1="${SOMA.x - SOMA.r}" x2="${SOMA.x + SOMA.r}" y1="${SOMA.y + SOMA.r - THRESHOLD * SOMA.r * 2}" y2="${SOMA.y + SOMA.r - THRESHOLD * SOMA.r * 2}" stroke="#fff" stroke-width="3" stroke-dasharray="7 6"/>
  </g>
  <g class="part" data-part="axon">
    <path d="M250 190 L790 190" stroke="#7a68e8" stroke-width="10" fill="none"/>
    ${NODES.slice(0, -1).map((x, i) => `<rect class="myelin" data-i="${i}" x="${x + 8}" y="173" width="${NODES[i + 1] - x - 16}" height="34" rx="17" fill="#f4eee0" stroke="#c9c1ad" stroke-width="3"/>`).join('')}
  </g>
  <g class="part" data-part="terminals" fill="none" stroke="#7a68e8" stroke-width="8" stroke-linecap="round">
    <path d="M790 190 C810 170 825 140 848 130M790 190 L852 190M790 190C810 210 825 240 848 250"/>
    <g fill="#c08cff" stroke="#2c2f7a" stroke-width="3"><circle cx="856" cy="128" r="13"/><circle cx="862" cy="190" r="13"/><circle cx="856" cy="252" r="13"/></g>
  </g>
  <g class="part" data-part="synapse"><rect x="870" y="110" width="20" height="160" rx="8" fill="#7cf7ff" opacity=".12"/></g>
  <g class="part" data-part="next">
    <path d="M892 128C920 140 935 165 950 180M894 190 L940 190M892 252C920 240 935 215 950 200" stroke="#5a6fd8" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="975" cy="190" r="40" fill="#5a6fd8" stroke="#2c2f7a" stroke-width="4" id="next-soma"/>
  </g>
  <g id="nts"></g>
  <circle id="ap" class="ap" cx="262" cy="190" r="30" fill="url(#ap-grad)"/>
  <g id="dots"></g>
  <text x="96" y="30">Dendrites</text>
  <text x="${SOMA.x}" y="${SOMA.y + SOMA.r + 32}" text-anchor="middle">Cell body</text>
  <text x="${SOMA.x + SOMA.r + 6}" y="${SOMA.y + SOMA.r - THRESHOLD * SOMA.r * 2 - 8}" style="font-size:14px">threshold</text>
  <text x="440" y="155" text-anchor="middle">Axon</text>
  <text x="510" y="236" text-anchor="middle" style="font-size:15px">myelin</text>
  <text x="${NODES[3]}" y="262" text-anchor="middle" style="font-size:14px">↑ node</text>
  <text x="830" y="92" text-anchor="middle">Axon terminals</text>
  <text x="880" y="300" text-anchor="middle">Synapse</text>
  <text x="975" y="258" text-anchor="middle">Next</text>`;
  return s;
}

export function initNeuron(content) {
  const stages = content.stages;
  const wrap = $('#neuron-svg-wrap'); const s = buildSVG(); wrap.append(s);
  const feedback = $('#neuron-feedback'); const nudgeBtn = $('#nudge'); const stepBtn = $('#neuron-step'); const resetBtn = $('#neuron-reset');
  rich($('#neuron-note'), content.neuronNote);
  const list = $('#stage-list');
  const items = stages.map((st) => { const li = el('li', { text: st.name }); list.append(li); return li; });
  const parts = Object.fromEntries([...s.querySelectorAll('.part')].map((g) => [g.dataset.part, g]));
  const chargeRect = s.querySelector('#charge'); const ap = s.querySelector('#ap'); const dots = s.querySelector('#dots'); const nts = s.querySelector('#nts');
  const nextSoma = s.querySelector('#next-soma');
  let charge = 0; let lastT = performance.now(); let firing = false; let stageIndex = -1; let messages = 0; let raf = 0; const timers = [];

  const drawCharge = () => {
    const h = Math.min(charge, 1) * SOMA.r * 2;
    chargeRect.setAttribute('y', SOMA.y + SOMA.r - h); chargeRect.setAttribute('height', h);
  };
  function leakLoop(t) {
    const dt = (t - lastT) / 1000; lastT = t;
    if (!firing && charge > 0) { charge = Math.max(0, charge - LEAK_PER_SEC * dt); drawCharge(); }
    raf = requestAnimationFrame(leakLoop);
  }
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function setStage(i) {
    stageIndex = i;
    items.forEach((li, k) => { li.setAttribute('aria-current', k === i ? 'step' : 'false'); li.classList.toggle('done', k < i); });
    Object.values(parts).forEach((g) => g.classList.remove('lit'));
    const st = stages[i]; if (!st) return;
    parts[st.part]?.classList.add('lit');
    rich(feedback, `${st.name}: ${st.description}`);
    if (st.part === 'next') finish();
  }
  function finish() {
    nextSoma.setAttribute('fill', '#ffe066');
    stepBtn.hidden = true; resetBtn.hidden = false; nudgeBtn.disabled = false;
    complete('neuron', pick(content.mascot.cheers) + ' You passed the signal along!');
  }

  function animateAlong(path, dur, onDone) {
    const len = path.getTotalLength(); const dot = svg('circle', { r: 9, fill: '#ffe066', stroke: '#fff', 'stroke-width': 2 });
    dots.append(dot); const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur); const p = path.getPointAtLength(len * k);
      dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
      if (k < 1) requestAnimationFrame(step); else { dot.remove(); onDone(); }
    };
    requestAnimationFrame(step);
  }

  function fire() {
    firing = true; nudgeBtn.disabled = true; sound.play('fire');
    if (reducedMotion()) {
      // No movement: highlight one part at a time when the player presses "Next part".
      charge = 1; drawCharge(); setStage(1); stepBtn.hidden = false; stepBtn.focus();
      return;
    }
    setStage(1);
    later(() => { setStage(2); travelAP(1900); }, 1300);
    later(() => setStage(3), 3400);
    later(() => { setStage(4); releaseNTs(); }, 4500);
    later(() => setStage(5), 6300);
  }
  function travelAP(dur) {
    ap.style.opacity = 1; const t0 = performance.now(); const myelins = [...s.querySelectorAll('.myelin')];
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      // Saltatory conduction: the signal hops quickly between nodes, pausing briefly at each one.
      const seg = k * (NODES.length - 1); const i = Math.floor(seg); const f = seg - i;
      const eased = f < 0.55 ? 0 : (f - 0.55) / 0.45;
      const x = i >= NODES.length - 1 ? NODES[NODES.length - 1] : NODES[i] + (NODES[i + 1] - NODES[i]) * eased;
      ap.setAttribute('cx', x);
      myelins.forEach((m, j) => m.setAttribute('fill', j < i ? '#fff3b0' : '#f4eee0'));
      charge = Math.max(0, 1 - k * 1.2); drawCharge();
      if (k < 1) requestAnimationFrame(step); else { ap.style.opacity = 0; myelins.forEach((m) => m.setAttribute('fill', '#f4eee0')); }
    };
    requestAnimationFrame(step);
  }
  function releaseNTs() {
    nts.replaceChildren();
    const starts = [[866, 128], [872, 190], [866, 252]];
    starts.forEach(([x, y], b) => {
      for (let i = 0; i < 3; i++) {
        const c = svg('circle', { cx: x, cy: y, r: 5, fill: '#ff8fcf', stroke: '#fff', 'stroke-width': 1.5 });
        nts.append(c);
        const dy = (i - 1) * 10; const t0 = performance.now() + (b * 3 + i) * 80;
        const step = (t) => {
          const k = Math.max(0, Math.min(1, (t - t0) / 1100));
          c.setAttribute('cx', x + (893 - x) * k); c.setAttribute('cy', y + dy * k);
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
  }

  nudgeBtn.addEventListener('click', () => {
    if (firing) return;
    messages++; sound.play('blip');
    const tip = TIPS[(messages - 1) % TIPS.length];
    const arrive = () => {
      charge = Math.min(1.05, charge + NUDGE); drawCharge();
      if (charge >= THRESHOLD) { rich(feedback, 'Threshold reached! The neuron fires!'); fire(); }
      else rich(feedback, `Message arrived! The cell body is ${Math.round(charge * 100)}% full. It needs ${Math.round(THRESHOLD * 100)}% to fire. Send more, quickly. The charge slowly leaks away!`);
    };
    if (stageIndex < 0) setStage(0);
    if (reducedMotion()) arrive();
    else animateAlong(s.querySelector(`[data-part="dendrites"] path:nth-child(${(messages - 1) % TIPS.length + 1})`), 650, arrive);
  });
  stepBtn.addEventListener('click', () => {
    setStage(Math.min(stageIndex + 1, stages.length - 1));
    if (stageIndex === 4) { /* static: show messengers in the gap */ releaseStatic(); }
  });
  function releaseStatic() {
    nts.replaceChildren();
    [[880, 135], [884, 178], [880, 200], [884, 245]].forEach(([x, y]) => nts.append(svg('circle', { cx: x, cy: y, r: 5, fill: '#ff8fcf', stroke: '#fff', 'stroke-width': 1.5 })));
  }
  resetBtn.addEventListener('click', () => {
    timers.forEach(clearTimeout); timers.length = 0;
    firing = false; charge = 0; messages = 0; drawCharge(); nts.replaceChildren(); nextSoma.setAttribute('fill', '#5a6fd8');
    stageIndex = -1; items.forEach((li) => { li.setAttribute('aria-current', 'false'); li.classList.remove('done'); });
    Object.values(parts).forEach((g) => g.classList.remove('lit'));
    resetBtn.hidden = true; stepBtn.hidden = true; nudgeBtn.disabled = false; nudgeBtn.focus();
    feedback.textContent = 'Send messages to the dendrites to fill the cell body past the dashed threshold line.';
  });
  feedback.textContent = 'Send messages to the dendrites to fill the cell body past the dashed threshold line.';

  return {
    show() { lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(leakLoop); },
    hide() { cancelAnimationFrame(raf); },
  };
}
