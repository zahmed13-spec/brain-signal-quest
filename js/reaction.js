// Reaction Lab: 5 rounds of "wait for the lamp", then the eye → brain → muscle loop explained.
// Photosensitivity: the lamp changes colour once per round (no flashing).
import { $, el, rich, sound, complete, reducedMotion, pick } from './core.js';

export function initReaction(content) {
  const cfg = content.reaction; const ROUNDS = cfg.rounds || 5;
  const btn = $('#react'); const lamp = $('#lamp'); const fb = $('#reaction-feedback'); const dots = $('#round-dots');
  const loop = $('#reaction-loop'); const loopSteps = $('#loop-steps');
  rich($('#reaction-note'), cfg.note);
  let phase = 'idle'; let timer; let cueTime = 0; let times = [];

  const renderDots = () => {
    dots.replaceChildren();
    for (let i = 0; i < ROUNDS; i++) dots.append(el('li', { class: times[i] ? 'filled' : '', text: times[i] ? `${times[i]} ms` : `Round ${i + 1}` }));
  };
  const label = () => (times.length >= ROUNDS ? 'Play again' : `Start round ${times.length + 1}`);

  function showLoop() {
    loop.hidden = false; loopSteps.replaceChildren();
    const lis = cfg.loop.map((step) => { const li = el('li', {}, el('strong', { text: step.name })); li.append(rich(el('span'), step.text)); loopSteps.append(li); return li; });
    if (!reducedMotion()) lis.forEach((li, i) => setTimeout(() => { lis.forEach((x) => x.classList.remove('lit')); li.classList.add('lit'); }, 500 + i * 700));
  }

  function press() {
    if (phase === 'idle') {
      if (times.length >= ROUNDS) { times = []; loop.hidden = true; renderDots(); }
      phase = 'waiting'; btn.textContent = 'Wait for the lamp…'; fb.textContent = 'Wait… keep your finger ready.';
      timer = setTimeout(() => {
        phase = 'ready'; lamp.classList.add('on'); btn.classList.add('go'); btn.textContent = 'PRESS NOW!';
        fb.textContent = 'The lamp is on!'; cueTime = performance.now();
      }, 1200 + Math.random() * 2500);
      return;
    }
    if (phase === 'waiting') {
      clearTimeout(timer); sound.play('oops');
      fb.textContent = 'Too early! Your brain guessed instead of waiting for your eyes. Try that round again.';
    } else if (phase === 'ready') {
      const ms = Math.round(performance.now() - cueTime);
      if (ms < 100) {
        // Faster than the eye-brain-muscle loop can work: that was a lucky guess, not a reaction.
        sound.play('oops'); fb.textContent = `${ms} ms is faster than signals can travel from eye to brain to finger. That was a guess! Try that round again.`;
        phase = 'idle'; lamp.classList.remove('on'); btn.classList.remove('go'); btn.textContent = label(); return;
      }
      times.push(ms); sound.play('good');
      fb.textContent = `${ms} milliseconds! That's ${(ms / 1000).toFixed(2)} of a second.`;
      renderDots();
      if (times.length >= ROUNDS) {
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length); const best = Math.min(...times);
        fb.textContent = `All ${ROUNDS} rounds done! Your average was ${avg} ms and your best was ${best} ms. Here's what your nervous system did each time:`;
        showLoop();
        complete('reaction', { cheer: 'Your eyes, brain and muscles made a great team!' });
      }
    }
    phase = 'idle'; lamp.classList.remove('on'); btn.classList.remove('go'); btn.textContent = label();
  }
  btn.addEventListener('click', press);
  // A held-down key auto-repeats; ignore repeats so they can't start or end a round by accident.
  btn.addEventListener('keydown', (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); });
  renderDots();
  return { hide() { if (phase !== 'idle') { clearTimeout(timer); phase = 'idle'; lamp.classList.remove('on'); btn.classList.remove('go'); btn.textContent = label(); fb.textContent = 'Press start. Then wait for the lamp to turn on.'; } } };
}
