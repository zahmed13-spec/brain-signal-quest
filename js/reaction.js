// Reaction Lab: part 1 "see → press" (5 rounds), part 2 "Brain Choice" (CORE-04): press only for
// the yellow ● lamp, hold back for the purple ■ one. Comparing the two averages shows that deciding
// takes extra brain time. Photosensitivity: one colour change per round, never flashing.
import { $, el, rich, sound, complete, reducedMotion, dock, scaffoldFor, shuffled } from './core.js';
import { countUp, shake, pop, sparkBurst, feedbackSheet } from './ui.js';

const MIN_HUMAN_MS = 100;      // faster than the eye → brain → muscle loop can work: a guess
const WAIT_MIN_MS = 1200; const WAIT_SPREAD_MS = 2500;
const HOLD_MS = 1400;          // how long a "don't press" lamp stays on
const CHOICE_ROUNDS = ['go', 'go', 'stop', 'go', 'stop', 'go'];

export function initReaction(content) {
  const cfg = content.reaction; const ROUNDS = cfg.rounds || 5;
  const btn = $('#react'); const lamp = $('#lamp'); const bulb = lamp.querySelector('.lamp-bulb'); const fb = $('#reaction-feedback'); const dots = $('#round-dots');
  const loop = $('#reaction-loop'); const loopSteps = $('#loop-steps'); const play = btn.closest('.play-card');
  rich($('#reaction-note'), cfg.note);
  const partTitle = el('p', { class: 'level-title' }); lamp.before(partTitle);
  const compare = el('div', { class: 'compare', hidden: true, role: 'img' }); loop.before(compare);
  const buddy = dock(play);
  let mode = 'simple'; let phase = 'idle'; let timer; let cueTime = 0; let simple = []; let choice = []; let plan = []; let falsePress = 0; let current = 'go';

  const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  const results = () => (mode === 'simple' ? simple : choice);
  const goal = () => (mode === 'simple' ? ROUNDS : plan.length);
  function renderDots() {
    dots.replaceChildren();
    if (mode === 'simple') for (let i = 0; i < ROUNDS; i++) dots.append(el('li', { class: simple[i] ? 'filled' : '', text: simple[i] ? `${simple[i]} ms` : `Round ${i + 1}` }));
    else plan.forEach((kind, i) => { const done = i < roundIndex; dots.append(el('li', { class: done ? 'filled' : '', text: done ? (kind === 'go' ? `${choiceLog[i]} ms` : 'held ✓') : `Round ${i + 1}` })); });
  }
  let roundIndex = 0; let choiceLog = [];
  const label = () => (mode === 'simple' ? `Start round ${simple.length + 1}` : `Start round ${roundIndex + 1}`);
  function setTitle() { partTitle.textContent = mode === 'simple' ? 'Part 1: See → press' : 'Part 2: Brain Choice (press for yellow ●, hold back for purple ■)'; }

  function lampOff() { lamp.classList.remove('on', 'stop'); bulb.textContent = ''; btn.classList.remove('go'); }
  function startRound() {
    phase = 'waiting'; btn.textContent = 'Wait for the lamp…'; fb.textContent = 'Wait… keep your finger ready.';
    current = mode === 'simple' ? 'go' : plan[roundIndex];
    timer = setTimeout(() => {
      phase = 'ready'; lamp.classList.add('on'); if (current === 'stop') lamp.classList.add('stop');
      if (mode === 'choice') bulb.textContent = current === 'go' ? '●' : '■';
      btn.classList.toggle('go', current === 'go'); btn.textContent = current === 'go' ? 'PRESS NOW!' : 'Hold back…';
      fb.textContent = current === 'go' ? 'The lamp is on!' : 'Purple square: do not press!';
      cueTime = performance.now();
      if (current === 'stop') timer = setTimeout(held, HOLD_MS);
    }, WAIT_MIN_MS + Math.random() * WAIT_SPREAD_MS);
  }
  function held() { // a "stop" round passes when the player doesn't press
    phase = 'idle'; lampOff(); sound.play('good'); choiceLog[roundIndex] = 0; roundIndex++; renderDots();
    fb.textContent = 'Great holding back! Your frontal lobe stopped the move.'; buddy.say('Nice! Stopping a move is a brain skill too.', 'cheer', 2500);
    if (roundIndex >= plan.length) { finishChoice(); return; }
    btn.textContent = label();
  }

  async function press() {
    scaffoldFor('reaction')?.progress();
    if (phase === 'done') return;
    if (phase === 'idle') { startRound(); return; }
    if (phase === 'waiting') {
      clearTimeout(timer); sound.play('oops'); shake(lamp); scaffoldFor('reaction')?.wrong();
      fb.textContent = 'Too early! Your brain guessed instead of waiting for your eyes. Try that round again.';
      buddy.say('Wait for the lamp. Your eyes have to see it first!', 'oops', 2500);
    } else if (phase === 'ready') {
      clearTimeout(timer);
      const ms = Math.round(performance.now() - cueTime);
      if (current === 'stop') {
        falsePress++; sound.play('oops'); shake(lamp);
        fb.textContent = "Oops, that was a don't-press light. Try that round again."; buddy.say('Purple square means hold back!', 'oops', 2500);
      } else if (ms < MIN_HUMAN_MS) {
        sound.play('oops'); fb.textContent = `${ms} ms is faster than signals can travel from eye to brain to finger. That was a guess! Try that round again.`;
      } else {
        sound.play('good'); pop(lamp); sparkBurst(btn, 8);
        if (mode === 'simple') simple.push(ms); else { choice.push(ms); choiceLog[roundIndex] = ms; roundIndex++; }
        const out = el('strong', { text: '0' }); fb.replaceChildren(out, document.createTextNode(` milliseconds! That's ${(ms / 1000).toFixed(2)} of a second.`)); countUp(out, ms);
        renderDots();
        if (mode === 'simple' && simple.length >= ROUNDS) { phase = 'idle'; lampOff(); await finishSimple(); return; }
        if (mode === 'choice' && roundIndex >= plan.length) { lampOff(); finishChoice(); return; }
      }
    }
    phase = 'idle'; lampOff(); btn.textContent = label();
  }

  function showLoop(highlightDecision) {
    loop.hidden = false; loopSteps.replaceChildren();
    const lis = cfg.loop.map((step) => { const li = el('li', {}, el('strong', { text: step.name })); li.append(rich(el('span'), step.text)); loopSteps.append(li); return li; });
    if (reducedMotion()) { if (highlightDecision) lis[2]?.classList.add('lit'); return; }
    lis.forEach((li, i) => setTimeout(() => { lis.forEach((x) => x.classList.remove('lit')); li.classList.add('lit'); }, 400 + i * 600));
    if (highlightDecision) setTimeout(() => { lis.forEach((x) => x.classList.remove('lit')); lis[2]?.classList.add('lit'); }, 400 + lis.length * 600);
  }
  function drawCompare() {
    compare.hidden = false; compare.replaceChildren();
    const a = avg(simple); const b = choice.length ? avg(choice) : null; const max = Math.max(a, b || 0, 1);
    const col = (name, v) => { const bar = el('div', { class: 'barv' }); const num = el('strong', { text: '0' }); const c = el('div', { class: 'col' }, num, bar, el('span', { text: name })); compare.append(c); requestAnimationFrame(() => { bar.style.height = Math.round((v / max) * 10) + 'rem'; countUp(num, v, { suffix: ' ms' }); }); };
    col('See → press', a); if (b) col('See → decide → press', b);
    compare.setAttribute('aria-label', b ? `Average: ${a} ms for see and press, ${b} ms when you had to decide.` : `Average: ${a} ms.`);
  }

  async function finishSimple() {
    btn.textContent = 'Start Brain Choice →';
    fb.textContent = `All ${ROUNDS} rounds done! Your average was ${avg(simple)} ms and your best was ${Math.min(...simple)} ms.`;
    drawCompare(); showLoop(false);
    await complete('reaction', { stars: 1, cheer: `Average ${avg(simple)} ms!` });
    mode = 'choice'; plan = shuffled(CHOICE_ROUNDS); choice = []; choiceLog = []; roundIndex = 0; falsePress = 0; setTitle(); renderDots();
    buddy.say('Part 2! Press only for the yellow circle. Hold back for the purple square.', 'point', 5000);
  }
  async function finishChoice() {
    phase = 'done'; btn.disabled = true; btn.textContent = 'Brain Choice done!';
    const a = avg(simple); const b = avg(choice); const diff = b - a;
    drawCompare(); showLoop(true);
    const line = diff > 0 ? `Deciding added about ${diff} ms. That extra time was your brain choosing!` : 'Wow, your choices were just as fast! Usually deciding adds a little time.';
    fb.textContent = line; buddy.say(line, 'cheer', 5000);
    await feedbackSheet({ good: true, title: 'Brain Choice complete!', lines: [line, 'Your frontal lobe had to decide "press" or "stop" before the motor cortex could act.'] });
    await complete('reaction', { stars: falsePress <= 1 ? 3 : 2, cheer: falsePress <= 1 ? 'Fast and careful!' : 'You finished Brain Choice!' });
    mode = 'simple'; simple = []; phase = 'idle'; btn.disabled = false; setTitle(); renderDots(); btn.textContent = 'Play again';
  }

  btn.addEventListener('click', press);
  // A held-down key auto-repeats; ignore repeats so they can't start or end a round by accident.
  btn.addEventListener('keydown', (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); });
  setTitle(); renderDots();
  return { hide() { if (phase !== 'idle') { clearTimeout(timer); phase = 'idle'; lampOff(); btn.textContent = label(); fb.textContent = 'Press start. Then wait for the lamp to turn on.'; } } };
}
