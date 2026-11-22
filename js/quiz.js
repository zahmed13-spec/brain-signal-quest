// Quiz Boss: draws N random questions from the content.json pool and explains every answer.
import { $, el, rich, shuffled, sound, complete, pick } from './core.js';

export function initQuiz(content) {
  const pool = content.quiz.filter((q) => q.prompt && q.correct && q.other1 && q.other2);
  const per = Math.min(content.quizPerRound || 4, pool.length);
  const stage = $('#question'); const fb = $('#quiz-feedback'); const next = $('#next'); const count = $('#quiz-count'); const pips = $('#quiz-pips');
  let round = []; let index = 0; let score = 0; let results = [];

  function newRound() { round = shuffled(pool).slice(0, per); index = 0; score = 0; results = []; }
  function renderPips() {
    pips.replaceChildren();
    for (let i = 0; i < per; i++) pips.append(el('li', { class: results[i] === true ? 'right' : results[i] === false ? 'wrong' : i === index ? 'now' : '' }));
  }
  function render(moveFocus) {
    stage.replaceChildren(); fb.replaceChildren(); next.hidden = true; renderPips();
    if (index >= round.length) {
      count.textContent = 'Results';
      const msg = score === per ? 'Perfect score! You beat the Quiz Boss!' : score >= per / 2 ? 'You beat the Quiz Boss!' : 'Good battle! Every try makes your memory stronger.';
      const h = el('h3', { tabindex: '-1', text: msg });
      const again = el('button', { type: 'button', class: 'btn', text: 'Play again with new questions' });
      again.addEventListener('click', () => { newRound(); render(true); });
      stage.append(el('div', { class: 'quiz-result' }, h, el('p', { class: 'big', text: `${score} / ${per}` }), again));
      if (moveFocus) h.focus();
      complete('quiz', { cheer: `You scored ${score} out of ${per}.` });
      return;
    }
    const q = round[index];
    count.textContent = `Question ${index + 1} of ${per}`;
    const h = el('h3', { tabindex: '-1' }); rich(h, q.prompt);
    const box = el('div', { class: 'answers', role: 'group', 'aria-label': 'Answer choices' });
    const options = shuffled([{ text: q.correct, right: true }, { text: q.other1, why: q.other1Why }, { text: q.other2, why: q.other2Why }]);
    let answered = false;
    const buttons = options.map((o) => {
      const b = el('button', { type: 'button', class: 'answer' }, el('span', { text: o.text }));
      b.addEventListener('click', () => {
        if (answered) return; answered = true; results[index] = Boolean(o.right);
        if (o.right) score++;
        buttons.forEach((x, i) => {
          x.setAttribute('aria-disabled', 'true');
          if (options[i].right) { x.classList.add('right'); x.append(el('span', { class: 'mark', text: '✓ Correct' })); }
          else if (x === b) { x.classList.add('wrong'); x.append(el('span', { class: 'mark', text: 'Your pick' })); }
        });
        const box2 = el('div', { class: `fb ${o.right ? 'good' : 'oops'}` });
        if (o.right) {
          sound.play('good');
          box2.append(el('p', {}, el('strong', { text: pick(content.mascot.cheers) + ' ' })), rich(el('p'), q.explanation));
        } else {
          sound.play('oops');
          box2.append(el('p', {}, el('strong', { text: pick(content.mascot.tryAgain) })));
          if (o.why) box2.append(rich(el('p'), o.why));
          box2.append(rich(el('p'), `The answer is "${q.correct}". ${q.explanation}`));
        }
        fb.append(box2); renderPips();
        next.textContent = index === round.length - 1 ? 'See my score →' : 'Next question →';
        next.hidden = false; next.focus();
      });
      box.append(b); return b;
    });
    stage.append(h, box);
    if (moveFocus) h.focus();
  }
  next.addEventListener('click', () => { index++; render(true); });
  newRound(); render(false);
}

