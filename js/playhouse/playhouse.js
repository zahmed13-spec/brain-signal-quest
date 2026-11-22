// Brain Playhouse controller: scenario picker, playback controls, step panel and mini-challenges.
// Everything it plays comes from content.json → playhouse (structures, pathways, scenarios).
import { el, icon, rich, sound, complete, toast, celebrate, reducedMotion, shuffled, pick, store as progress } from '../core.js';
import { View2D } from './view2d.js';

const STEP_MS = 7000; // reading time per step at 1x speed
const ICON_FOR = { eye: 'eye', hand: 'hand', ear: 'ear', ball: 'ball', nose: 'nose', spark: 'spark', brain: 'brain' };
const COLOR_FOR = { eye: 'var(--r-occipital)', hand: 'var(--r-parietal)', ear: 'var(--r-temporal)', ball: 'var(--r-cerebellum)', nose: 'var(--r-hippocampus)', spark: 'var(--glow)', brain: 'var(--r-frontal)' };

function webglAvailable() {
  try { const c = document.createElement('canvas'); return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

export function initPlayhouse(content, root) {
  const data = content.playhouse;
  const structs = new Map(data.structures.map((s) => [s.id, s]));
  const scenarios = data.scenarios.filter((s) => s.steps && s.steps.length);
  const glOK = webglAvailable();
  let use2D = !glOK || reducedMotion();
  let view = null; let scenario = null; let stepIndex = 0; let playing = false; let speed = 1; let timer = null; let showAll = false; let visible = false; let challengeOpen = false;

  root.replaceChildren();
  const intro = el('p', { class: 'ph-intro' }); rich(intro, data.intro);
  const picker = el('div', { class: 'scenario-picker', role: 'group', 'aria-label': 'Choose a moment' });
  const viewBox = el('div', { class: 'ph-view' });
  const labels = el('div', { class: 'ph-labels', 'aria-hidden': 'true' });
  const tools = el('div', { class: 'ph-view-tools', role: 'group', 'aria-label': 'Camera' });
  const mode = el('p', { class: 'ph-mode' });
  viewBox.append(labels, tools, mode);
  const toolBtn = (label, text, fn) => { const b = el('button', { type: 'button', 'aria-label': label, title: label, text }); b.addEventListener('click', fn); tools.append(b); return b; };
  toolBtn('Rotate left', '⟲', () => view.rotate(-30)); toolBtn('Rotate right', '⟳', () => view.rotate(30));
  toolBtn('Tilt up', '↑', () => view.tilt(20)); toolBtn('Tilt down', '↓', () => view.tilt(-20));
  toolBtn('Zoom in', '+', () => view.zoom(0.8)); toolBtn('Zoom out', '−', () => view.zoom(1.25)); toolBtn('Reset camera', '⌂', () => view.resetView());

  const stepCard = el('div', { class: 'step-card', 'aria-live': 'polite' });
  const btn = (iconId, label, fn, cls = 'btn btn-ghost') => { const b = el('button', { type: 'button', class: cls, 'aria-label': label, title: label }, icon(iconId)); b.addEventListener('click', fn); return b; };
  const playBtn = el('button', { type: 'button', class: 'btn' }, icon('play'), el('span', { text: 'Play' }));
  playBtn.addEventListener('click', () => setPlaying(!playing));
  const controls = el('div', { class: 'ph-controls', role: 'group', 'aria-label': 'Playback' },
    btn('restart', 'Restart', () => goto(0, true)), btn('prev', 'Step back', () => goto(stepIndex - 1)), playBtn, btn('next', 'Step forward', () => goto(stepIndex + 1)));
  const speedInput = el('input', { type: 'range', min: '0.5', max: '2', step: '0.25', value: '1', id: 'ph-speed', 'aria-valuetext': '1 times' });
  const speedOut = el('output', { for: 'ph-speed', text: '1×' });
  speedInput.addEventListener('input', () => { speed = Number(speedInput.value); speedOut.textContent = speed + '×'; speedInput.setAttribute('aria-valuetext', speed + ' times'); view?.setSpeed(speed); if (playing) schedule(); });
  const speedRow = el('label', { class: 'speed', for: 'ph-speed' }, el('span', { text: 'Speed' }), speedInput, speedOut);
  const sw = (label, checked, fn, disabled) => {
    const input = el('input', { type: 'checkbox', role: 'switch', disabled: disabled ? true : undefined }); input.checked = checked;
    input.addEventListener('change', () => fn(input.checked));
    return { label: el('label', { class: 'switch' }, input, el('span', { class: 'switch-ui', 'aria-hidden': 'true' }), el('span', { text: label })), input };
  };
  const labelsSw = sw('Show all labels', false, (v) => { showAll = v; view?.setShowAll(v); });
  const modeSw = sw('2D diagram', use2D, (v) => { use2D = v; makeView(); }, !glOK);
  const toggles = el('div', { class: 'ph-toggles' }, labelsSw.label, modeSw.label);
  const dots = el('ol', { class: 'step-dots', 'aria-label': 'Steps' });
  const panel = el('div', { class: 'ph-panel' }, stepCard, controls, speedRow, dots, toggles);
  const stage = el('div', { class: 'ph-stage' }, viewBox, panel);
  const challengeBox = el('div', { class: 'challenge', hidden: true });
  root.append(intro, picker, stage, challengeBox);
  if (!glOK) root.append(el('p', { class: 'note', text: 'Your browser can’t show 3D right now, so you’re seeing the 2D diagram. All the same steps are here.' }));

  const cards = scenarios.map((sc) => {
    const ic = ICON_FOR[sc.icon] || 'brain';
    const b = el('button', { type: 'button', class: 'scenario-card', 'aria-pressed': 'false', style: { '--c': COLOR_FOR[sc.icon] || 'var(--glow)' } },
      el('span', { class: 'sc-icon' }, icon(ic)), el('strong', { text: sc.title }), icon('star', 'sc-star'));
    b.addEventListener('click', () => choose(sc));
    picker.append(b); return { b, sc };
  });
  function refreshCards() {
    for (const { b, sc } of cards) {
      const done = progress.scenarioDone(sc.id);
      b.classList.toggle('done', Boolean(done));
      b.setAttribute('aria-label', `${sc.title}${done ? ', badge earned: ' + sc.badge : ''}`);
      b.setAttribute('aria-pressed', String(sc === scenario));
    }
  }

  async function makeView() {
    const wasStep = stepIndex; view?.dispose(); view = null;
    tools.hidden = use2D;
    if (!use2D) {
      try {
        const { Scene3D } = await import('./scene3d.js');
        view = new Scene3D(viewBox, labels, data, { onPick });
        mode.textContent = '3D view · drag to turn';
      } catch (err) {
        console.error(err); use2D = true; modeSw.input.checked = true; tools.hidden = true;
        toast('3D could not start, so here is the 2D diagram.');
      }
    }
    if (!view) { view = new View2D(viewBox, labels, data, { onPick }); mode.textContent = '2D diagram'; }
    view.setSpeed(speed); view.setPlaying(playing); view.setShowAll(showAll);
    if (scenario) { view.setScenario(scenario); stepIndex = wasStep; renderStep(true); }
    if (visible) view.start();
  }

  function choose(sc) {
    scenario = sc; challengeOpen = false; challengeBox.hidden = true; refreshCards();
    view.setScenario(sc); dots.replaceChildren();
    sc.steps.forEach((s, i) => {
      const d = el('button', { type: 'button', text: String(i + 1), 'aria-label': `Step ${i + 1}: ${s.title}` });
      d.addEventListener('click', () => goto(i)); dots.append(el('li', {}, d));
    });
    stepIndex = 0; renderStep(true); setPlaying(!reducedMotion());
    sound.play('click');
  }

  function renderStep(instant = false) {
    const step = scenario.steps[stepIndex]; const st = structs.get(step.structure);
    view.setStep(step, { instant: instant || reducedMotion() });
    stepCard.style.setProperty('--c', st?.color || 'var(--glow)');
    const p = el('p'); rich(p, step.text);
    const fact = el('p', { class: 'did-you-know' }, el('strong', { text: 'Fun fact: ' })); fact.append(rich(el('span'), step.funFact));
    stepCard.replaceChildren(
      el('p', { class: 'step-n', text: `${scenario.title} · Step ${stepIndex + 1} of ${scenario.steps.length}` }),
      el('h3', { text: step.title }),
      st ? el('p', { class: 'where', text: `Lit up: ${st.name}` }) : '', p, step.funFact ? fact : '');
    [...dots.querySelectorAll('button')].forEach((d, i) => { d.setAttribute('aria-current', i === stepIndex ? 'step' : 'false'); if (i <= stepIndex) d.classList.add('seen'); });
    if (stepIndex === scenario.steps.length - 1) openChallenge();
  }
  function goto(i, restart = false) {
    if (!scenario) return;
    const n = scenario.steps.length; i = Math.max(0, Math.min(n - 1, i));
    stepIndex = i; renderStep(); sound.play('blip');
    if (restart) setPlaying(!reducedMotion()); else if (playing) schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing || !scenario) return;
    if (stepIndex >= scenario.steps.length - 1) { setPlaying(false); return; }
    timer = setTimeout(() => { stepIndex++; renderStep(); schedule(); }, STEP_MS / speed);
  }
  function setPlaying(p) {
    playing = p; view?.setPlaying(p);
    playBtn.replaceChildren(icon(p ? 'pause' : 'play'), el('span', { text: p ? 'Pause' : 'Play' }));
    schedule();
  }

  /* ---------- mini-challenges ---------- */
  let pickHandler = null;
  function onPick(id) { if (pickHandler) pickHandler(id); }
  function openChallenge() {
    if (challengeOpen) return; challengeOpen = true;
    const ch = scenario.challenge; if (!ch) return;
    challengeBox.hidden = false; challengeBox.replaceChildren();
    const fb = el('div', { class: 'answer-feedback', role: 'status' });
    challengeBox.append(el('h3', { text: 'Mini-challenge' }), rich(el('p'), ch.prompt));
    const win = () => {
      sound.play('good'); pickHandler = null;
      const isNew = progress.markScenario(scenario.id);
      fb.replaceChildren(el('div', { class: 'fb good' }, el('p', {}, el('strong', { text: `${pick(content.mascot.cheers)} Badge: ${scenario.badge}` })), rich(el('p'), ch.explanation)));
      if (isNew) { celebrate(); toast(`Playhouse badge: ${scenario.badge}!`); }
      refreshCards();
      const n = scenarios.filter((s) => progress.scenarioDone(s.id)).length;
      complete('playhouse', `You've earned ${n} of ${scenarios.length} Playhouse badges. Try another moment!`);
    };
    const oops = (msg) => { sound.play('oops'); fb.replaceChildren(el('div', { class: 'fb oops' }, el('p', {}, el('strong', { text: pick(content.mascot.tryAgain) })), rich(el('p'), msg))); };
    if (ch.type === 'order') {
      let items = shuffled(ch.items);
      if (items.every((x, i) => x === ch.items[i])) items = [...ch.items].reverse();
      const list = el('ol', { class: 'order-list', 'aria-label': 'Steps to put in order' });
      const draw = (focusIdx, dir) => {
        list.replaceChildren();
        items.forEach((text, i) => {
          const up = el('button', { type: 'button', 'aria-label': `Move "${text}" up`, disabled: i === 0 ? true : undefined }, icon('up'));
          const down = el('button', { type: 'button', 'aria-label': `Move "${text}" down`, disabled: i === items.length - 1 ? true : undefined }, icon('down'));
          up.addEventListener('click', () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(i - 1, 'up'); });
          down.addEventListener('click', () => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(i + 1, 'down'); });
          list.append(el('li', {}, el('span', { text }), up, down));
        });
        if (focusIdx != null) { const li = list.children[focusIdx]; const b = li.querySelector(dir === 'up' ? 'button' : 'button:last-child'); (b.disabled ? li.querySelector('button:not([disabled])') : b)?.focus(); }
      };
      draw();
      const check = el('button', { type: 'button', class: 'btn', text: 'Check my order' });
      check.addEventListener('click', () => {
        let right = 0;
        [...list.children].forEach((li, i) => { const ok = items[i] === ch.items[i]; li.classList.toggle('right', ok); li.classList.toggle('wrong', !ok); if (ok) right++; });
        if (right === items.length) win(); else oops(`${right} of ${items.length} are in the right spot (green). Move the orange ones and check again!`);
      });
      challengeBox.append(list, el('p', {}, check), fb);
    } else {
      const grid = el('div', { class: 'pick-grid', role: 'group', 'aria-label': 'Choices' });
      for (const id of ch.options) {
        const st = structs.get(id); if (!st) continue;
        const b = el('button', { type: 'button', class: 'answer', text: st.name });
        b.addEventListener('click', () => pickHandler(id)); grid.append(b);
      }
      pickHandler = (id) => {
        if (id === ch.answer) { grid.querySelectorAll('button').forEach((b) => b.classList.toggle('right', b.textContent === structs.get(id).name)); win(); }
        else if (ch.options.includes(id)) oops(`That's the ${structs.get(id).name}: ${structs.get(id).about} Try again!`);
      };
      challengeBox.append(el('p', { class: 'note', text: 'Tip: you can also click the glowing dot in the picture.' }), grid, fb);
    }
  }

  makeView().then(() => { refreshCards(); choose(scenarios[0]); });
  return {
    show() { visible = true; view?.start(); },
    hide() { visible = false; setPlaying(false); view?.stop(); },
  };
}
