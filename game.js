'use strict';

const get = (id) => document.getElementById(id);
function add(parent, tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  parent.append(element);
  return element;
}

function brain(regions) {
  const buttons = regions.map((region, index) => {
    const button = add(get('regions'), 'button', region.name);
    button.onclick = () => {
      buttons.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
      document.querySelectorAll('.diagram > div').forEach((part) => {
        part.classList.toggle('active', part.classList.contains(region.key));
      });
      get('region-info').textContent = region.description;
    };
    return button;
  });
  buttons[0].click();
}

function neuron(stages) {
  const items = stages.map((stage) => add(get('trail'), 'li', stage.name));
  let index = -1;
  get('signal').onclick = () => {
    index = (index + 1) % stages.length;
    items.forEach((item, i) => {
      item.setAttribute('aria-current', i === index ? 'step' : 'false');
    });
    get('signal-feedback').textContent = stages[index].description;
    get('signal').textContent = index === stages.length - 1 ? 'Send another signal' : 'Next signal step';
  };
}

function reaction() {
  const control = get('react');
  const feedback = get('reaction-feedback');
  let phase = 'idle';
  let cueTime;
  let timer;
  control.onclick = () => {
    if (phase === 'idle') {
      phase = 'waiting';
      control.textContent = 'Wait…';
      feedback.textContent = 'Wait for GO.';
      timer = setTimeout(() => {
        control.textContent = 'GO!';
        control.classList.add('go');
        feedback.textContent = 'GO!';
        phase = 'ready';
        cueTime = performance.now();
      }, 1100 + Math.random() * 2300);
      return;
    }
    if (phase === 'waiting') {
      clearTimeout(timer);
      feedback.textContent = 'Too early. Try again and wait for GO.';
    } else {
      const elapsed = Math.round(performance.now() - cueTime);
      feedback.textContent = 'You responded in ' + elapsed + ' milliseconds.';
    }
    phase = 'idle';
    control.classList.remove('go');
    control.textContent = 'Play again';
  };
}

function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function memory() {
  const board = get('cards');
  const status = get('memory-feedback');
  const words = ['Brain', 'Nerve', 'Signal', 'Memory'];
  let timer;
  function reset() {
    clearTimeout(timer);
    board.replaceChildren();
    status.textContent = 'Find four pairs.';
    let open;
    let pairs = 0;
    let locked = false;
    const cards = shuffled([...words, ...words]).map((word, index) => {
      const button = add(board, 'button', '?');
      const label = 'Card ' + (index + 1);
      button.setAttribute('aria-label', label + ', face down');
      function reveal(visible, matched = false) {
        button.textContent = visible ? word : '?';
        button.setAttribute('aria-label', label + ', ' + (visible ? word : 'face down') + (matched ? ', matched' : ''));
      }
      const card = { button, word, reveal };
      button.onclick = () => {
        if (locked || open === card || button.classList.contains('matched')) return;
        reveal(true);
        if (!open) {
          open = card;
          status.textContent = word + '. Pick another card.';
          return;
        }
        const first = open;
        open = undefined;
        if (first.word === word) {
          for (const match of [first, card]) {
            match.reveal(true, true);
            match.button.classList.add('matched');
            match.button.setAttribute('aria-disabled', 'true');
          }
          pairs++;
          status.textContent = pairs === 4 ? 'You found all four pairs!' : 'Match! ' + pairs + ' of 4 pairs.';
          return;
        }
        locked = true;
        status.textContent = first.word + ' and ' + word + '. Remember where they were.';
        timer = setTimeout(() => {
          first.reveal(false);
          reveal(false);
          locked = false;
          status.textContent = 'Try another pair.';
        }, 1800);
      };
      return card;
    });
    return cards;
  }
  get('shuffle').onclick = reset;
  reset();
}

function quiz(questions) {
  let index = 0;
  let score = 0;
  const stage = get('question');
  const feedback = get('quiz-feedback');
  const next = get('next');
  function render(moveFocus) {
    stage.replaceChildren();
    next.hidden = true;
    feedback.textContent = '';
    if (index === questions.length) {
      const result = add(stage, 'h3', 'You got ' + score + ' of ' + questions.length + ' correct.');
      result.tabIndex = -1;
      result.focus();
      const again = add(stage, 'button', 'Play quiz again');
      again.onclick = () => { index = 0; score = 0; render(true); };
      return;
    }
    const question = questions[index];
    const heading = add(stage, 'h3', (index + 1) + ' / ' + questions.length + ' · ' + question.prompt);
    heading.tabIndex = -1;
    if (moveFocus) heading.focus();
    let answered = false;
    shuffled([question.correct, question.other1, question.other2]).forEach((answer) => {
      const button = add(stage, 'button', answer);
      button.onclick = () => {
        if (answered) return;
        answered = true;
        const correct = answer === question.correct;
        if (correct) score++;
        stage.querySelectorAll('button').forEach((item) => item.setAttribute('aria-disabled', 'true'));
        feedback.textContent = (correct ? 'Correct! ' : 'Good try. ') + question.explanation;
        next.textContent = index === questions.length - 1 ? 'See score' : 'Next question';
        next.hidden = false;
      };
    });
  }
  next.onclick = () => { index++; render(true); };
  render(false);
}

async function initialize() {
  const response = await fetch('content.json');
  if (!response.ok) throw new Error('Content unavailable');
  const content = await response.json();
  const copy = {
    intro: 'intro', 'brain-intro': 'brainIntro', 'neuron-intro': 'neuronIntro',
    'reaction-intro': 'reactionIntro', 'memory-intro': 'memoryIntro', 'quiz-intro': 'quizIntro',
    credits: 'credits'
  };
  Object.entries(copy).forEach(([id, key]) => { get(id).textContent = content[key]; });
  brain(content.regions);
  neuron(content.stages);
  reaction();
  memory();
  quiz(content.quiz);
  content.glossary.forEach(({ name, description }) => {
    add(get('glossary'), 'dt', name);
    add(get('glossary'), 'dd', description);
  });
  content.sources.forEach(({ name, url }) => {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') add(add(get('sources'), 'li', ''), 'a', name).href = parsed.href;
  });
}

initialize().catch(() => { get('load-error').hidden = false; });
