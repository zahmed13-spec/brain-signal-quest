// Memory Match (CORE-05): three levels, from identical pictures to meaning pairs, so matching
// needs neuroscience knowledge as well as working memory. The board always fits the screen (BUG-02).
import { $, el, icon, shuffled, sound, complete, store, dock, scaffoldFor, rich, speakButton } from './core.js';
import { sparkBurst, pop, shake, feedbackSheet } from './ui.js';

const LOOK = { neuron: ['neuron', 'var(--glow)'], brain: ['brain', 'var(--r-cerebrum)'], cerebellum: ['cerebellum', 'var(--r-cerebellum)'],
  eye: ['eye', 'var(--r-occipital)'], ear: ['ear', 'var(--r-temporal)'], spinal: ['spinal', 'var(--r-brainstem)'], nose: ['nose', 'var(--r-hippocampus)'], hand: ['hand', 'var(--r-parietal)'] };
const MISMATCH_MS = 1400;
const GAP_PX = 12;

/** Build the pair list for a level: each pair = [faceA, faceB] sharing an id. */
function levelPairs(content, level, small = false) {
  const cards = content.memoryCards;
  if (level === 0) return cards.map((c) => ({ id: c.key, fact: c.fact, faces: [{ icon: c.key, label: c.name }, { icon: c.key, label: c.name }] }));
  if (level === 1) return cards.filter((c) => c.job).map((c) => ({ id: c.key, fact: c.fact, faces: [{ icon: c.key, label: c.name }, { text: c.job }] }));
  return shuffled(content.memoryWords || []).slice(0, small ? 6 : 8).map((w) => ({ id: w.term, fact: `${w.term}: ${w.meaning}.`, faces: [{ text: w.term, term: true }, { text: w.meaning }] }));
}

export function initMemory(content) {
  const board = $('#cards'); const status = $('#memory-feedback'); const stats = $('#memory-stats');
  const play = board.closest('.play-card');
  const levels = content.memoryLevels || [{ title: 'Picture pairs' }, { title: 'Picture + job' }, { title: 'Word + meaning' }];
  const levelBar = el('div', { class: 'level-bar', role: 'group', 'aria-label': 'Levels' });
  const levelTitle = el('p', { class: 'level-title' });
  play.prepend(levelBar, levelTitle);
  const buddy = dock(play);
  let level = Math.min(store.level('memory'), levels.length - 1); let timer; let count = 0;

  const RESERVE_PX = 230; // sticky header + level bar + stats row
  const narrow = () => (board.clientWidth || play.clientWidth) < 560;
  function fit() {
    // Choose columns, then the largest card that fits both the width and the visible height.
    const w = board.clientWidth || play.clientWidth - 32;
    const words = level > 0 && narrow(); // text cards on phones: 2 wide columns
    const cols = words ? 2 : count <= 12 ? (w < 560 ? 3 : 4) : 4;
    const ratio = words ? 0.5 : 1.25; // height / width
    const rows = Math.ceil(count / cols);
    const availH = Math.max(300, window.innerHeight - RESERVE_PX);
    const byW = (w - GAP_PX * (cols - 1)) / cols;
    const byH = ((availH - GAP_PX * (rows - 1)) / rows) / ratio;
    board.style.setProperty('--cols', cols);
    board.style.setProperty('--card-ar', words ? '2 / 1' : '4 / 5');
    board.style.setProperty('--card-w', Math.floor(Math.max(64, Math.min(byW, byH, 170 / (words ? 0.6 : 1)))) + 'px');
  }
  window.addEventListener('resize', () => { if (!board.closest('.screen').hidden) fit(); });

  function renderLevelBar() {
    levelBar.replaceChildren();
    const unlocked = store.level('memory');
    levels.forEach((L, i) => {
      const b = el('button', { type: 'button', class: 'lvl' + (i < unlocked ? ' done' : ''), 'aria-current': i === level ? 'step' : 'false', 'aria-label': `Level ${i + 1}: ${L.title}${i > unlocked ? ', locked' : ''}`, disabled: i > unlocked ? true : undefined, text: String(i + 1) });
      b.addEventListener('click', () => { level = i; reset(); });
      levelBar.append(b);
    });
    levelBar.append(speakButton(() => `${levels[level].title}. ${levels[level].goal || ''}`));
    levelTitle.textContent = `Level ${level + 1} of ${levels.length}: ${levels[level].title}`;
  }

  function reset() {
    clearTimeout(timer); board.replaceChildren(); renderLevelBar();
    const pairs = levelPairs(content, level, narrow()); const total = pairs.length; count = total * 2;
    let open = null; let found = 0; let turns = 0; let locked = false;
    const update = () => { stats.textContent = `Pairs: ${found} of ${total} · Turns: ${turns}`; };
    rich(status, levels[level].goal || `Find all ${total} pairs.`); update();
    if (levels[level].goal) buddy.say(levels[level].goal, 'point', 3500);
    const deck = shuffled(pairs.flatMap((p) => p.faces.map((f) => ({ pair: p, face: f }))));
    deck.forEach((card, index) => {
      const f = card.face; const [ic, color] = f.icon ? LOOK[f.icon] || ['star', 'var(--spark)'] : [null, 'var(--accent)'];
      const label = `Card ${index + 1}`; const shown = f.label || f.text;
      const name = el('span', { class: 'sr-only', text: `${label}, face down` });
      const front = el('span', { class: 'card-face card-front' + (f.icon ? '' : ' text-only'), style: { '--c': color } }, ic ? icon(ic) : null, el('span', { text: shown }));
      const btn = el('button', { type: 'button', class: 'card' }, name,
        el('span', { class: 'card-inner', 'aria-hidden': 'true' }, el('span', { class: 'card-face card-back' }, icon('neuron')), front));
      const state = { btn, card, up: false, matched: false };
      state.flip = (up) => { state.up = up; btn.classList.toggle('up', up); name.textContent = `${label}, ${up ? shown : 'face down'}${state.matched ? ', matched' : ''}`; };
      btn.addEventListener('click', async () => {
        if (locked || state.up || state.matched) return;
        state.flip(true); sound.play('tick'); scaffoldFor('memory')?.progress();
        if (!open) { open = state; status.textContent = `${shown}. Now find its match.`; return; }
        const first = open; open = null; turns++;
        if (first.card.pair.id === card.pair.id) {
          for (const mm of [first, state]) { mm.matched = true; mm.btn.classList.add('matched'); mm.btn.setAttribute('aria-disabled', 'true'); mm.flip(true); pop(mm.btn); }
          found++; update(); sound.play('good'); sparkBurst(btn, 10);
          rich(status, `Match! ${card.pair.fact}`); buddy.say(card.pair.fact, 'cheer', 3500);
          if (found === total) levelDone(total, turns);
          return;
        }
        locked = true; update(); sound.play('oops'); shake(first.btn); shake(btn); scaffoldFor('memory')?.wrong();
        status.textContent = `${first.card.face.label || first.card.face.text} and ${shown} don't match. Remember where they are!`;
        timer = setTimeout(() => { first.flip(false); state.flip(false); locked = false; }, MISMATCH_MS);
      });
      board.append(btn);
    });
    requestAnimationFrame(fit);
  }

  async function levelDone(total, turns) {
    const turnStars = turns <= total * 1.5 ? 3 : turns <= total * 2.2 ? 2 : 1;
    const stars = Math.min(level + 1, turnStars) || 1;
    store.setLevel('memory', level + 1); renderLevelBar();
    const last = level === levels.length - 1;
    await feedbackSheet({ good: true, title: `Level ${level + 1} complete! (${levels[level].title})`, lines: [`You found all ${total} pairs in ${turns} turns.`, levels[level].explain], cta: last ? 'Finish' : 'Next level →' });
    await complete('memory', { stars, cheer: `${total} pairs in ${turns} turns!`, quiet: level === 1 });
    if (!last && location.hash.replace('#', '') === 'memory') { level += 1; reset(); }
  }

  $('#shuffle').addEventListener('click', reset);
  reset();
  return { show() { requestAnimationFrame(fit); } };
}
