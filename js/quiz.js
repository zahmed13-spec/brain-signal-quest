// Quiz Boss (CORE-06): random questions, missed ones come back later in the round,
// a "boss energy" bar drops with each correct answer, mastery stars by misses.
// Also: the shared one-question "Quick check" before badges (CORE-08) and the
// local spaced-review schedule behind "Brain Warm-up" (PRG-04). No accounts, all on-device.
import { $, el, rich, shuffled, sound, complete, pickFresh, store, scaffoldFor, speakButton } from './core.js';
import { feedbackSheet, sparkBurst, shake, pop, countUp, starsRow } from './ui.js';

const DAY = 86400000;
const INTERVALS = [0, 1, 3, 7, 14]; // days, by box (Leitner-style)
const REASK_GAP = 2; // a missed question returns two questions later
const MAX_PER_ROUND = 7;
const qid = (q) => q.prompt;

/* ---------- spaced review (PRG-04) ---------- */
export function recordAnswer(q, correct) {
  const prev = store.srs()[qid(q)] || { box: 0, due: 0 };
  const box = correct ? Math.min(INTERVALS.length - 1, prev.box + 1) : 0;
  store.setSrs(qid(q), { box, due: Date.now() + INTERVALS[box] * DAY });
}
/** Questions due for review: lowest box (most recently missed) first. */
export function dueQuestions(pool, n = 3) {
  const srs = store.srs(); const now = Date.now();
  return pool.filter((q) => srs[qid(q)] && srs[qid(q)].due <= now)
    .sort((a, b) => srs[qid(a)].box - srs[qid(b)].box || srs[qid(a)].due - srs[qid(b)].due).slice(0, n);
}

/* ---------- shared question renderer ---------- */
function renderQuestion(host, q, { onAnswer, again = false }) {
  host.replaceChildren();
  const h = el('h3', { tabindex: '-1' }); rich(h, q.prompt);
  const box = el('div', { class: 'answers', role: 'group', 'aria-label': 'Answer choices' });
  const options = shuffled([{ text: q.correct, right: true }, { text: q.other1, why: q.other1Why }, { text: q.other2, why: q.other2Why }]);
  let answered = false;
  const buttons = options.map((o, i) => {
    const b = el('button', { type: 'button', class: 'answer', 'data-key': i + 1 }, el('span', { class: 'key', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { text: o.text }));
    b.addEventListener('click', () => {
      if (answered) return; answered = true;
      buttons.forEach((x, k) => {
        x.setAttribute('aria-disabled', 'true');
        if (options[k].right) { x.classList.add('right'); x.append(el('span', { class: 'mark', text: '✓ Correct' })); }
        else if (x === b) { x.classList.add('wrong'); x.append(el('span', { class: 'mark', text: 'Your pick' })); }
      });
      onAnswer(o, b);
    });
    box.append(b); return b;
  });
  host.append(again ? el('p', { class: 'again-tag', text: 'Try this one again!' }) : '', el('div', { class: 'rail' }, h, speakButton(() => `${q.prompt} ${options.map((o, i) => `${i + 1}: ${o.text}.`).join(' ')}`)), box);
  return { heading: h, buttons };
}
/** Respond to an answer with juice + the feedback sheet. Resolves after Continue. */
function giveFeedback(q, o, btn, content, streak) {
  if (o.right) {
    sound.play('good'); pop(btn); sparkBurst(btn);
    return feedbackSheet({ good: true, title: q.cheer || pickFresh(content.mascot.cheers, 'cheers'), lines: [q.explanation], streak });
  }
  sound.play('oops'); shake(btn);
  return feedbackSheet({ good: false, title: pickFresh(content.mascot.tryAgain, 'tryAgain'), lines: [o.why, `The answer is "${q.correct}". ${q.explanation}`], cta: 'Got it' });
}

/* Number keys 1–3 pick an answer on the visible question. */
document.addEventListener('keydown', (e) => {
  if (!/^[1-3]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
  if (document.querySelector('.sheet.show')) return;
  const scope = document.querySelector('dialog.modal[open]') || document.querySelector('.screen:not([hidden])');
  const b = scope?.querySelector(`.answer[data-key="${e.key}"]:not([aria-disabled="true"])`);
  if (b) { e.preventDefault(); b.click(); }
});

/* ---------- Quick check before a badge (CORE-08) ---------- */
export function makeChecker(content) {
  const pool = content.quiz.filter((q) => q.prompt && q.correct && q.other1 && q.other2);
  return async (key) => {
    const q = shuffled(pool.filter((x) => x.activity === key))[0]; if (!q) return;
    const d = el('dialog', { class: 'modal', 'aria-labelledby': 'qc-title' });
    const host = el('div');
    d.append(el('div', { class: 'modal-card' }, el('h2', { id: 'qc-title', text: 'Quick check!' }), el('p', { text: 'One question before your badge.' }), host));
    document.body.append(d); d.addEventListener('cancel', (e) => e.preventDefault());
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    await new Promise((res) => {
      const r = renderQuestion(host, q, {
        onAnswer: async (o, btn) => { recordAnswer(q, o.right); await giveFeedback(q, o, btn, content, 0); res(); },
      });
      r.buttons[0].focus();
    });
    try { d.close(); } catch { /* closed */ } d.remove();
  };
}

/* ---------- Quiz Boss ---------- */
export function initQuiz(content) {
  const pool = content.quiz.filter((q) => q.prompt && q.correct && q.other1 && q.other2);
  const per = Math.min(content.quizPerRound || 4, pool.length);
  const stage = $('#question'); const count = $('#quiz-count'); const top = $('.quiz-top');
  $('#quiz-pips')?.remove(); $('#quiz-feedback')?.remove(); $('#next')?.remove();
  const boss = el('div', { class: 'boss' }, el('span', { text: 'Boss energy' }), el('span', { class: 'boss-bar', role: 'img' }));
  top.append(boss);
  let queue = []; let asked = 0; let misses = 0; let beaten = 0; let streak = 0; let total = per; let warmup = false;

  function drawBoss() {
    const bar = boss.querySelector('.boss-bar'); bar.replaceChildren();
    for (let i = 0; i < total; i++) bar.append(el('i', { class: i < beaten ? 'gone' : '' }));
    bar.setAttribute('aria-label', `Boss energy: ${total - beaten} of ${total} left`);
  }
  function newRound(list, isWarmup = false) {
    warmup = isWarmup; queue = list.map((q) => ({ q, again: false })); total = queue.length;
    asked = 0; misses = 0; beaten = 0; streak = 0;
    boss.hidden = warmup; drawBoss(); render(false);
  }

  async function finish() {
    const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
    const won = beaten === total;
    count.textContent = warmup ? 'Warm-up done' : 'Results';
    const h = el('h3', { tabindex: '-1', text: warmup ? 'Warm-up done! Your brain fetched those memories.' : won ? (misses ? 'You beat the Quiz Boss!' : 'Perfect! You beat the Quiz Boss without a miss!') : 'Good battle! The questions you missed will come back to help you remember.' });
    const big = el('p', { class: 'big', text: '0' });
    const again = el('button', { type: 'button', class: 'btn', text: 'Play again with new questions' });
    again.addEventListener('click', () => newRound(shuffled(pool).slice(0, per)));
    stage.replaceChildren(el('div', { class: 'quiz-result' }, h, big, warmup ? '' : starsRow(won ? stars : 1, { large: true }), again));
    countUp(big, beaten, { suffix: ` / ${total}` });
    h.focus();
    if (!warmup) await complete('quiz', { stars: won ? stars : 1, cheer: `You answered ${beaten} of ${total} with ${misses} ${misses === 1 ? 'miss' : 'misses'}.` });
  }

  function render(moveFocus) {
    if (!queue.length) { finish(); return; }
    const item = queue.shift(); asked++;
    count.textContent = warmup ? `Warm-up question ${asked}` : `Question ${asked}`;
    const r = renderQuestion(stage, item.q, {
      again: item.again,
      onAnswer: async (o, btn) => {
        scaffoldFor('quiz')?.progress();
        recordAnswer(item.q, o.right);
        if (o.right) { beaten++; streak++; drawBoss(); shake(boss.querySelector('.boss-bar')); }
        else {
          misses++; streak = 0; scaffoldFor('quiz')?.wrong();
          // Re-ask later in this round (retrieval practice), unless the round is at its cap.
          if (asked + queue.length < MAX_PER_ROUND) queue.splice(Math.min(REASK_GAP, queue.length), 0, { q: item.q, again: true });
        }
        await giveFeedback(item.q, o, btn, content, streak);
        render(true);
      },
    });
    if (moveFocus) r.heading.focus();
  }

  newRound(shuffled(pool).slice(0, per));
  return { warmup(list) { newRound(list, true); } };
}
