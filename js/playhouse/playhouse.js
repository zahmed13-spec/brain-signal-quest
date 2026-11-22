// Brain Playhouse controller: scenario picker, learner-paced steps, predictions, mini-challenges.
// Everything it plays comes from playhouse.json (structures, pathways, scenarios).
import { el, icon, rich, sound, complete, toast, reducedMotion, shuffled, pickFresh, store as progress, prefs, dock, scaffoldFor, speakButton } from '../core.js';
import { feedbackSheet, sparkBurst, shake, starsRow } from '../ui.js';
import { View2D } from './view2d.js';
import { unlockSticker, loadAtlas } from '../atlas.js';

const MIN_STEP_MS = 8000; const MS_PER_WORD = 500; // EDU-05: autoplay waits for reading time
const MYELIN_BOOST = 1.6;
const ICON_FOR = { eye: 'eye', hand: 'hand', ear: 'ear', ball: 'ball', nose: 'nose', spark: 'spark', brain: 'brain' };
const COLOR_FOR = { eye: 'var(--r-occipital)', hand: 'var(--r-parietal)', ear: 'var(--r-temporal)', ball: 'var(--r-cerebellum)', nose: 'var(--r-hippocampus)', spark: 'var(--glow)', brain: 'var(--r-frontal)' };
const words = (t) => (t || '').split(/\s+/).filter(Boolean).length;

/** Fill in optional fields a CMS edit may leave out, so the views can rely on them. */
function normalize(ph) {
  const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
  const vec = (v, d) => ({ x: num(v?.x, d.x), y: num(v?.y, d.y), z: num(v?.z, d.z) });
  const structures = (ph.structures || []).filter((s) => s && s.id).map((s) => ({ ...s, position: vec(s.position, { x: 0, y: 0, z: 0 }), size: num(s.size, 0.06), color: s.color || '#7cf7ff', region: s.region || '' }));
  const pathways = (ph.pathways || []).filter((p) => p && p.id && (p.points || []).length >= 2).map((p) => ({ ...p, points: p.points.map((q) => vec(q, { x: 0, y: 0, z: 0 })) }));
  const ids = new Set(structures.map((s) => s.id)); const pids = new Set(pathways.map((p) => p.id));
  const scenarios = (ph.scenarios || []).map((sc) => ({
    ...sc,
    steps: (sc.steps || []).filter((st) => ids.has(st.structure)).map((st) => {
      const opts = (st.predictOptions || []).filter((o) => ids.has(o));
      return { ...st, also: (st.also || []).filter((a) => ids.has(a)), pathways: (st.pathways || []).filter((a) => pids.has(a)),
        camera: vec(st.camera, { x: 2.4, y: 1.3, z: 2.6 }), target: vec(st.target, { x: 0, y: 0, z: 0 }), glow: num(st.glow, 1),
        predictOptions: opts.includes(st.structure) && opts.length >= 2 ? opts : [] };
    }),
    challenge: sc.challenge ? { ...sc.challenge, options: (sc.challenge.options || []).filter((o) => ids.has(o)), items: sc.challenge.items || [] } : null,
  }));
  return { ...ph, structures, pathways, scenarios };
}

function webglAvailable() {
  try { const c = document.createElement('canvas'); return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

export function initPlayhouse(content, root) {
  const data = normalize(content.playhouse);
  const structs = new Map(data.structures.map((s) => [s.id, s]));
  const scenarios = data.scenarios.filter((s) => s.steps && s.steps.length);
  const glOK = webglAvailable();
  let use2D = !glOK || reducedMotion() || prefs.get('force2d') === true;
  let view = null; let scenario = null; let stepIndex = 0; let playing = false; let speed = 1; let timer = null; let showAll = false; let visible = false;
  let challengeOpen = false; let predictRight = 0; let predictTotal = 0; let predicting = false;
  const myelinOn = () => prefs.get('myelin') === true && progress.stars('neuron') >= 3;
  const effSpeed = () => speed * (myelinOn() ? MYELIN_BOOST : 1);

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

  const hookEl = el('p', { class: 'ph-hook' });
  const stepCard = el('div', { class: 'step-card', 'aria-live': 'polite' });
  const predictBox = el('div', { class: 'predict', hidden: true });
  const railFill = el('div', { class: 'rail-fill' }); const railLabel = el('span', { class: 'rail-label' });
  const rail = el('div', { class: 'rail', 'aria-hidden': 'true' }, el('div', { class: 'rail-track' }, railFill), railLabel);
  const btn = (iconId, label, fn, cls = 'btn btn-secondary btn-icon') => { const b = el('button', { type: 'button', class: cls, 'aria-label': label, title: label }, icon(iconId)); b.addEventListener('click', fn); return b; };
  const nextBtn = el('button', { type: 'button', class: 'btn btn-big' }, el('span', { text: 'Next' }), icon('next'));
  nextBtn.addEventListener('click', () => goto(stepIndex + 1));
  const playBtn = el('button', { type: 'button', class: 'btn btn-secondary' }, icon('play'), el('span', { text: 'Autoplay' }));
  playBtn.addEventListener('click', () => setPlaying(!playing));
  const controls = el('div', { class: 'ph-controls', role: 'group', 'aria-label': 'Playback' },
    btn('prev', 'Step back', () => goto(stepIndex - 1)), nextBtn, playBtn, btn('restart', 'Restart', () => goto(0, true)));
  const speedInput = el('input', { type: 'range', min: '0.5', max: '2', step: '0.25', value: '1', id: 'ph-speed', 'aria-valuetext': '1 times' });
  const speedOut = el('output', { for: 'ph-speed', text: '1×' });
  speedInput.addEventListener('input', () => { speed = Number(speedInput.value); speedOut.textContent = speed + '×'; speedInput.setAttribute('aria-valuetext', speed + ' times'); view?.setSpeed(effSpeed()); if (playing) schedule(); });
  const speedRow = el('label', { class: 'speed', for: 'ph-speed' }, el('span', { text: 'Speed' }), speedInput, speedOut);
  const sw = (label, checked, fn, disabled) => {
    const input = el('input', { type: 'checkbox', role: 'switch', disabled: disabled ? true : undefined }); input.checked = checked;
    input.addEventListener('change', () => fn(input.checked));
    return { label: el('label', { class: 'switch' }, input, el('span', { class: 'switch-ui', 'aria-hidden': 'true' }), el('span', { text: label })), input };
  };
  const labelsSw = sw('Show all labels', false, (v) => { showAll = v; view?.setShowAll(v); });
  const modeSw = sw('2D diagram', use2D, (v) => { use2D = v; prefs.set('force2d', v); makeView(); }, !glOK);
  const myelinSw = sw('Myelin boost (faster signals)', myelinOn(), (v) => { prefs.set('myelin', v); view?.setSpeed(effSpeed()); if (v) buddy.say('Myelin makes signals travel faster. Zoom!', 'cheer'); });
  // CORE-09: extra controls are tucked away until asked for.
  const more = el('details', { class: 'more ph-more-wrap' }, el('summary', { text: 'More controls' }),
    el('div', { class: 'ph-more' }, speedRow, el('div', { class: 'ph-toggles' }, labelsSw.label, modeSw.label, myelinSw.label)));
  more.addEventListener('toggle', () => syncTools());
  const syncTools = () => { tools.hidden = use2D || !(more.open || Object.keys(progress.get().playhouse).length > 0); myelinSw.label.hidden = progress.stars('neuron') < 3; };
  const panel = el('div', { class: 'ph-panel' }, hookEl, rail, stepCard, predictBox, controls, more);
  const stage = el('div', { class: 'ph-stage' }, viewBox, panel);
  const challengeBox = el('div', { class: 'challenge', hidden: true });
  // EDU-04: the goal card already says what to do, so the intro only shows if no short goal exists.
  const hasGoal = content.activities.find((a) => a.key === 'playhouse')?.goalShort;
  root.append(hasGoal ? '' : intro, picker, stage, challengeBox);
  const buddy = dock(root);
  if (!glOK) root.append(el('p', { class: 'note', text: 'Your browser can’t show 3D right now, so you’re seeing the 2D diagram. All the same steps are here.' }));

  const cards = scenarios.map((sc) => {
    const b = el('button', { type: 'button', class: 'scenario-card', 'aria-pressed': 'false', style: { '--c': COLOR_FOR[sc.icon] || 'var(--glow)' } },
      el('span', { class: 'sc-icon' }, icon(ICON_FOR[sc.icon] || 'brain')), el('strong', { text: sc.title }), icon('star', 'sc-star'));
    b.addEventListener('click', () => choose(sc));
    picker.append(b); return { b, sc };
  });
  function refreshCards() {
    for (const { b, sc } of cards) {
      const s = progress.scenarioStars(sc.id);
      b.classList.toggle('done', s > 0);
      b.setAttribute('aria-label', `${sc.title}${s ? `, badge earned: ${sc.badge}, ${s} of 3 stars` : ''}`);
      b.setAttribute('aria-pressed', String(sc === scenario));
    }
  }

  async function makeView() {
    const wasStep = stepIndex; view?.dispose(); view = null;
    if (!use2D) {
      try {
        const { Scene3D } = await import('./scene3d.js');
        view = new Scene3D(viewBox, labels, data, { onPick, onSlow });
        mode.textContent = '3D view · drag to turn';
      } catch (err) {
        console.error(err); use2D = true; modeSw.input.checked = true;
        toast('3D could not start, so here is the 2D diagram.');
      }
    }
    if (!view) { view = new View2D(viewBox, labels, data, { onPick }); mode.textContent = '2D diagram'; }
    syncTools();
    view.setSpeed(effSpeed()); view.setPlaying(playing); view.setShowAll(showAll);
    if (scenario) { view.setScenario(scenario); stepIndex = wasStep; renderStep(true); }
    if (visible) view.start();
  }
  /** PERF-03: a device that can't keep up even at pixel ratio 1 switches to the 2D diagram. */
  function onSlow() {
    if (use2D) return;
    use2D = true; modeSw.input.checked = true; prefs.set('force2d', true);
    toast('Switching to the 2D diagram for smoother play. You can switch back in More controls.');
    makeView();
  }

  function choose(sc) {
    scenario = sc; challengeOpen = false; challengeBox.hidden = true; predictRight = 0; predictTotal = 0; refreshCards();
    view.setScenario(sc);
    stepIndex = 0; setPlaying(false); renderStep(true);
    rich(hookEl, sc.hook ? `Mystery: ${sc.hook}` : sc.intro || '');
    buddy.say(progress.scenarioDone(sc.id) ? 'Replay time! This time, try to predict where the signal goes.' : 'Press Next to follow the signal, one stop at a time.', 'point', 4000);
    sound.play('tick');
  }

  function renderStep(instant = false) {
    const step = scenario.steps[stepIndex]; const st = structs.get(step.structure);
    view.setStep(step, { instant: instant || reducedMotion() }); view.setCandidates?.([]);
    stepCard.style.setProperty('--c', st?.color || 'var(--glow)');
    const p = rich(el('p'), step.text);
    const fact = step.funFact ? el('details', { class: 'more' }, el('summary', { text: 'Did you know? +' }), rich(el('p'), step.funFact)) : '';
    stepCard.replaceChildren(
      el('div', { class: 'rail' }, el('h3', { text: step.title }), speakButton(() => `${step.title}. ${step.text}`)),
      st ? el('p', { class: 'where', text: `Lit up: ${st.name}` }) : '', p, fact);
    const n = scenario.steps.length; const pct = Math.round(((stepIndex + 1) / n) * 100);
    railFill.style.width = pct + '%'; railLabel.textContent = `Step ${stepIndex + 1} of ${n} · ${pct}%`;
    nextBtn.disabled = stepIndex >= n - 1;
    if (stepIndex === n - 1) { openChallenge(); if (scenario.hookAnswer) rich(hookEl, `Mystery solved: ${scenario.hookAnswer}`); }
  }
  async function goto(i, restart = false) {
    if (!scenario || predicting) return;
    const n = scenario.steps.length; i = Math.max(0, Math.min(n - 1, i));
    scaffoldFor('playhouse')?.progress();
    // CORE-07: on a replay, predict marked steps before they're revealed.
    if (i === stepIndex + 1 && scenario.steps[i].predictOptions.length && progress.scenarioDone(scenario.id)) {
      const wasPlaying = playing; setPlaying(false);
      await predict(i);
      if (wasPlaying) setPlaying(true);
    }
    stepIndex = i; renderStep(); sound.play('blip');
    if (restart) { predictRight = 0; predictTotal = 0; }
    if (playing) schedule();
  }
  function predict(i) {
    predicting = true;
    const step = scenario.steps[i]; const opts = shuffled(step.predictOptions);
    view.setCandidates?.(opts);
    predictBox.hidden = false; predictBox.replaceChildren(el('h3', { text: 'Predict: where does the signal go next?' }));
    const grid = el('div', { class: 'pick-grid', role: 'group', 'aria-label': 'Predictions' });
    predictBox.append(grid);
    return new Promise((res) => {
      const choose2 = async (id, b) => {
        if (!predicting) return;
        predicting = false; predictTotal++;
        const right = id === step.structure;
        if (right) { predictRight++; loadAtlas(content).then(() => unlockSticker(id)); sound.play('good'); sparkBurst(b); buddy.say(`Yes! Next stop: ${structs.get(id).name}.`, 'cheer', 2500); }
        else { sound.play('oops'); shake(b); buddy.say(`That's the ${structs.get(id).name}. The signal goes to the ${structs.get(step.structure).name} next.`, 'oops', 4000); scaffoldFor('playhouse')?.wrong(); }
        predictBox.hidden = true; view.setCandidates?.([]); pickHandler = null; res();
      };
      opts.forEach((id, k) => { const b = el('button', { type: 'button', class: 'answer', 'data-key': k + 1 }, el('span', { class: 'key', 'aria-hidden': 'true', text: String(k + 1) }), el('span', { text: structs.get(id).name })); b.addEventListener('click', () => choose2(id, b)); grid.append(b); });
      pickHandler = (id) => { if (opts.includes(id)) choose2(id, grid.children[opts.indexOf(id)]); };
      grid.querySelector('button').focus();
    });
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing || !scenario) return;
    if (stepIndex >= scenario.steps.length - 1) { setPlaying(false); return; }
    const step = scenario.steps[stepIndex];
    const ms = Math.max(MIN_STEP_MS, words(step.text) * MS_PER_WORD) / speed;
    timer = setTimeout(() => goto(stepIndex + 1), ms);
  }
  function setPlaying(p) {
    playing = p; view?.setPlaying(true); // pulses keep flowing; only step advance is paused
    playBtn.replaceChildren(icon(p ? 'pause' : 'play'), el('span', { text: p ? 'Pause' : 'Autoplay' }));
    playBtn.setAttribute('aria-pressed', String(p));
    schedule();
  }

  /* ---------- mini-challenges ---------- */
  let pickHandler = null;
  function onPick(id) { if (pickHandler) pickHandler(id); }
  function openChallenge() {
    if (challengeOpen) return; challengeOpen = true;
    const ch = scenario.challenge; if (!ch) return;
    challengeBox.hidden = false; challengeBox.replaceChildren();
    challengeBox.append(el('h3', { text: 'Mini-challenge' }), rich(el('p'), ch.prompt));
    const sc = scenario;
    const win = async () => {
      sound.play('good'); pickHandler = null;
      const stars = predictTotal ? (predictRight === predictTotal ? 3 : predictRight > 0 ? 2 : 1) : 1;
      const res = progress.setScenarioStars(sc.id, stars); refreshCards(); syncTools();
      await feedbackSheet({ good: true, title: `${res.first ? 'Badge' : 'Nice'}: ${sc.badge}!`, lines: [ch.explanation, predictTotal ? `Predictions: ${predictRight} of ${predictTotal} right.` : 'Replay this moment to predict each stop and earn more stars.'] });
      const n = scenarios.filter((s) => progress.scenarioDone(s.id)).length;
      await complete('playhouse', { stars: n >= scenarios.length ? 3 : n >= 3 ? 2 : 1, cheer: `${n} of ${scenarios.length} Playhouse badges.`, quiet: n > 1 && n < 3 });
    };
    const oops = (msg) => { sound.play('oops'); scaffoldFor('playhouse')?.wrong(); return feedbackSheet({ good: false, title: pickFresh(content.mascot.tryAgain, 'tryAgain'), lines: [msg], cta: 'Try again' }); };
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
        if (right === items.length) { sparkBurst(check); loadAtlas(content).then(() => sc.steps.forEach((st) => unlockSticker(st.structure))); win(); } else { shake(list); oops(`${right} of ${items.length} are in the right spot (green). Move the orange ones and check again!`); }
      });
      challengeBox.append(list, el('p', {}, check));
    } else {
      const grid = el('div', { class: 'pick-grid', role: 'group', 'aria-label': 'Choices' });
      ch.options.forEach((id, k) => {
        const st = structs.get(id); if (!st) return;
        const b = el('button', { type: 'button', class: 'answer', 'data-key': k + 1 }, el('span', { class: 'key', 'aria-hidden': 'true', text: String(k + 1) }), el('span', { text: st.name }));
        b.addEventListener('click', () => pickHandler?.(id)); grid.append(b);
      });
      pickHandler = (id) => {
        const b = grid.children[ch.options.indexOf(id)];
        if (id === ch.answer) { b?.classList.add('right'); sparkBurst(b); loadAtlas(content).then(() => unlockSticker(id)); win(); }
        else if (ch.options.includes(id)) { b?.classList.add('wrong'); shake(b); oops(`That's the ${structs.get(id).name}: ${structs.get(id).about}`).then(() => b?.classList.remove('wrong')); }
      };
      challengeBox.append(el('p', { class: 'note', text: 'Tip: you can also click the glowing dot in the picture.' }), grid);
    }
  }

  makeView().then(() => { refreshCards(); choose(scenarios[0]); });
  return {
    show() { visible = true; view?.start(); },
    hide() { visible = false; setPlaying(false); view?.stop(); },
  };
}
