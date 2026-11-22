// Memory Match: 6 illustrated pairs. Uses the shared region colours and icon sprite.
import { $, el, icon, rich, shuffled, sound, complete, pick } from './core.js';

const LOOK = { neuron: ['neuron', 'var(--glow)'], brain: ['brain', 'var(--r-cerebrum)'], cerebellum: ['cerebellum', 'var(--r-cerebellum)'],
  eye: ['eye', 'var(--r-occipital)'], ear: ['ear', 'var(--r-temporal)'], spinal: ['spinal', 'var(--r-brainstem)'], nose: ['nose', 'var(--r-hippocampus)'], hand: ['hand', 'var(--r-parietal)'] };

export function initMemory(content) {
  const board = $('#cards'); const status = $('#memory-feedback'); const stats = $('#memory-stats');
  const deck = content.memoryCards; const total = deck.length;
  let timer;
  function reset() {
    clearTimeout(timer); board.replaceChildren();
    let open = null; let pairs = 0; let turns = 0; let locked = false;
    const update = () => { stats.textContent = `Pairs: ${pairs} of ${total} · Turns: ${turns}`; };
    status.textContent = `Find all ${total} pairs.`; update();
    shuffled([...deck, ...deck]).forEach((card, index) => {
      const [ic, color] = LOOK[card.key] || ['star', 'var(--spark)'];
      const label = `Card ${index + 1}`;
      const btn = el('button', { type: 'button', class: 'card', 'aria-label': `${label}, face down` },
        el('span', { class: 'card-inner' },
          el('span', { class: 'card-face card-back' }, icon('neuron')),
          el('span', { class: 'card-face card-front', style: { '--c': color } }, icon(ic), el('span', { text: card.name }))));
      const state = { btn, card, up: false, matched: false };
      const flip = (up) => { state.up = up; btn.classList.toggle('up', up); btn.setAttribute('aria-label', `${label}, ${up ? card.name : 'face down'}${state.matched ? ', matched' : ''}`); };
      state.flip = flip;
      btn.addEventListener('click', () => {
        if (locked || state.up || state.matched) return;
        flip(true); sound.play('click');
        if (!open) { open = state; status.textContent = `${card.name}. Now find its match.`; return; }
        const first = open; open = null; turns++;
        if (first.card.key === card.key) {
          for (const m of [first, state]) { m.matched = true; m.btn.classList.add('matched'); m.btn.setAttribute('aria-disabled', 'true'); m.flip(true); }
          pairs++; sound.play('good'); update();
          rich(status, `Match! ${card.fact}`);
          if (pairs === total) {
            rich(status, `You found all ${total} pairs in ${turns} turns! ${card.fact}`);
            complete('memory', pick(content.mascot.cheers) + ' Your working memory rocks!');
          }
          return;
        }
        locked = true; update();
        status.textContent = `${first.card.name} and ${card.name} don't match. Remember where they are!`;
        timer = setTimeout(() => {
          first.flip(false); flip(false); locked = false; status.textContent = 'Try another pair.';
        }, 1600);
      });
      board.append(btn);
    });
  }
  $('#shuffle').addEventListener('click', reset);
  reset();
}
