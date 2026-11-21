'use strict';

const $ = (id) => document.getElementById(id);
const missions = [
  { id: 'brain', name: 'Brain Atlas', action: 'Map three regions', badge: 'Brain mapper', color: 'violet' },
  { id: 'neuron', name: 'Signal Relay', action: 'Send a message', badge: 'Signal sender', color: 'salmon' },
  { id: 'reaction', name: 'Beacon Arcade', action: 'Catch the cue', badge: 'Beacon responder', color: 'gold' },
  { id: 'memory', name: 'Memory Vault', action: 'Match the specimens', badge: 'Memory explorer', color: 'mint' },
  { id: 'quiz', name: 'Mission Control', action: 'Put clues together', badge: 'Mission specialist', color: 'blue' }
];
const drawings = {
  brain: '<path d="M6 26C1 20 5 10 9 9q3-6 10-4 5-3 10 0 7 0 9 5 5 3 5 10 0 8-9 10-6 8-13 2-9 1-15-6Z"/><path d="M17 9q-4 6 2 10m3-14q6 5 2 12m7-7q-3 4 1 8m-24 2q7-3 9 3m5 8q-2-7 5-8m4 9 4 7"/>',
  neuron: '<path d="m20 22 6-14 3 10 9 4-10 4-5 13-4-11-12-4Z"/><path d="m7 15-4-6m9 3-2-9m24 25 9 7m-7-13 8-5"/>',
  reaction: '<path d="M17 36h14l-1-7c6-3 7-11 2-16s-12-4-16 0-4 12 2 16Zm2 5h10M24 3v4M9 9l4 4m22 0 4-4M4 23h6m28 0h6"/><path d="m21 22 3-4 3 4"/>',
  memory: '<rect x="8" y="11" width="25" height="29" rx="4"/><path d="M15 7 34 4q5-1 6 4l4 22q1 4-4 5l-3 1m-16-19 2 6 6 1-5 3-1 6-4-4-6 1 3-5-2-5Z"/>',
  quiz: '<path d="m24 4 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z"/><path d="m18 22 4 4 8-8m-7 19v6m16-7 4 4M9 36l-4 4"/>',
  nerve: '<path d="M8 36q9-8 16-16m0 0 4-12m-4 12 14-3m-20 9-5-13m5 13 16 6m-3-8 8 3M7 40l4-1"/>',
  synapse: '<path d="M5 12h11q6 0 6 12t-6 12H5m38-24H33q-5 0-5 5v14q0 5 5 5h10M25 14h1m-1 10h1m-1 10h1"/>',
  balance: '<path d="M24 7v31m-12 2h24M6 15h36M12 15l-6 14h12Zm24 0-6 14h12Z"/>'
};
const completed = new Set();
let content;
let active = '';
let teardown = () => {};

function element(tag, text, parent, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  parent?.append(item);
  return item;
}

function graphic(key) {
  const holder = document.createElement('span');
  holder.innerHTML = '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + drawings[key] + '</svg>';
  return holder.firstElementChild;
}

function button(parent, label, onClick, className) {
  const control = element('button', label, parent, className);
  control.type = 'button';
  control.onclick = onClick;
  return control;
}

function status(parent, initial = '') {
  const message = element('p', initial, parent, 'feedback');
  message.setAttribute('role', 'status');
  return message;
}

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function nextMission() {
  const index = missions.findIndex(({ id }) => id === active);
  return [...missions.slice(index + 1), ...missions.slice(0, index + 1)].find(({ id }) => !completed.has(id));
}

function renderMap() {
  $('map-stops').replaceChildren();
  for (const mission of missions) {
    const stop = element('a', '', $('map-stops'), 'stop');
    stop.href = '#' + mission.id;
    stop.style.setProperty('--zone', 'var(--' + mission.color + ')');
    const badge = element('span', '', stop, 'badge');
    badge.append(graphic(mission.id));
    element('strong', mission.name, stop);
    if (completed.has(mission.id)) stop.dataset.done = '';
    element('span', completed.has(mission.id) ? '✓ ' + mission.badge : mission.action + ' →', stop, 'stop-state');
  }
  const next = missions.find(({ id }) => !completed.has(id));
  $('start').textContent = completed.size === 0 ? 'Launch mission ↗' : next ? 'Resume quest ↗' : 'View finale ↗';
}

function unlock(mission) {
  if (!$('reward').hidden) return;
  completed.add(mission.id);
  $('progress').value = completed.size;
  $('progress-label').textContent = completed.size + ' / 5 discoveries';
  $('reward-title').textContent = '✓ ' + mission.badge;
  const next = nextMission();
  $('reward-copy').textContent = next ? 'Discovery collected. Choose another stop when you’re ready.' : 'All five discoveries collected!';
  $('continue').textContent = next ? 'Next: ' + next.name + ' →' : 'Light up the station →';
  $('reward').hidden = false;
}

function introFor(id) {
  return content[id + 'Intro'];
}

function navigate() {
  if (!content) return;
  teardown();
  teardown = () => {};
  const hash = location.hash.slice(1);
  const mission = missions.find(({ id }) => id === hash);
  const final = hash === 'finish' && completed.size === missions.length;
  $('map').hidden = Boolean(mission || final);
  $('mission').hidden = !mission;
  $('finish').hidden = !final;
  document.title = mission ? mission.name + ' · Brain Signal Quest' : 'Brain Signal Quest';
  active = mission?.id || '';
  if (mission) {
    $('mission').style.setProperty('--zone', 'var(--' + mission.color + ')');
    $('mission-title').textContent = mission.name;
    $('mission-intro').textContent = introFor(mission.id);
    $('mission-number').textContent = 'Mission ' + (missions.indexOf(mission) + 1) + ' of ' + missions.length;
    $('mission-stamp').replaceChildren(graphic(mission.id));
    $('reward').hidden = true;
    $('play').replaceChildren();
    teardown = activities[mission.id](() => unlock(mission)) || teardown;
  } else if (!final) {
    renderMap();
  }
  if (hash) {
    const focus = final ? $('finish-title') : mission ? $('mission-title') : hash === 'missions' ? $('missions') : $('map-title');
    focus.focus({ preventScroll: true });
    if (hash === 'missions') focus.scrollIntoView();
    else window.scrollTo(0, 0);
  }
}

function brain(done) {
  const frame = element('div', '', $('play'), 'split');
  const image = element('div', '', frame);
  image.innerHTML = `<svg class="brain-figure" viewBox="0 0 480 335" aria-hidden="true">
    <g fill="none" stroke="#637cb8" stroke-width="1"><path d="M28 57h424M28 291h424M43 35v273m393-273v273" stroke-dasharray="3 7"/><circle cx="240" cy="162" r="132"/></g>
    <g stroke="#19264a" stroke-width="3.5">
      <path class="brain-zone" data-zone="brainstem" fill="#a6ecdc" d="M263 203q-1 35 23 64l-18 17q-36-35-41-70Z"/>
      <path class="brain-zone" data-zone="cerebellum" fill="#ffc2a5" d="M285 183q36-8 56 16 16 24-7 42-20 15-48 8-30-8-31-34Z"/>
      <path class="brain-zone" data-zone="cerebrum" fill="#d9caff" d="M126 195q-30-11-28-39-1-21 21-38 5-22 32-29 14-25 44-21 25-17 52-4 24-5 43 12 28 1 43 21 22 9 28 32 20 18 11 39-8 20-33 27-19 19-47 15-22 18-52 9-27 10-51-10-32 5-63-14Z"/>
    </g>
    <path d="M110 153q21-9 35 1 7-20 31-17m-39-34q20-6 36 8 11-21 31-17m16-16q-5 19 13 31 11 8 9 25m29-50q-13 17-4 32 11 11 29 4m15-18q-10 16 4 28 18-6 33 11m-221 38q20 14 40 5 9-15 24-12m17 28q17-26 38-15 15 5 29-8m23 1q16 15 39 6m-67-28q-19-7-32 7-8 12-25 12m97 41q17 10 37 5m-33 5q11 7 25 5" fill="none" pointer-events="none" stroke="#6561a7" stroke-width="3" stroke-linecap="round"/>
    <g fill="#fff4db" font-family="system-ui" font-size="12" letter-spacing="2"><text x="55" y="77">FRONT</text><text x="373" y="77">BACK</text><text x="55" y="273">SIDE VIEW</text></g>
  </svg>`;
  const panel = element('div', '', frame, 'panel');
  const regionButtons = element('div', '', panel, 'choices');
  const feedback = status(panel, 'Choose a region to scan it.');
  const challenge = element('div', '', panel, 'panel brain-challenge');
  const visited = new Set();
  let target = 0;
  let briefing = false;
  const prompts = ['You decide to raise your hand. Which region helps plan and start that movement?',
    'You wobble on a bike and correct your balance. Which region helps tune the movement?',
    'You breathe while asleep. Which region helps run that automatic job?'];
  const question = element('h3', 'Scan all three regions to unlock the atlas challenge.', challenge);
  const answer = status(challenge);
  const controls = content.regions.map((region, index) => button(regionButtons, region.name, () => {
    const zones = image.querySelectorAll('.brain-zone');
    zones.forEach((zone) => zone.classList.toggle('active', zone.dataset.zone === region.key));
    controls.forEach((control, i) => control.setAttribute('aria-pressed', String(i === index)));
    feedback.textContent = region.description;
    visited.add(region.key);
    if (!briefing && visited.size === content.regions.length) {
      briefing = true;
      question.textContent = prompts[0];
      return;
    }
    if (!briefing || target === prompts.length) return;
    if (region.key !== ['cerebrum', 'cerebellum', 'brainstem'][target]) {
      answer.textContent = 'Try another region. Use the scan description as a clue.';
      return;
    }
    target++;
    answer.textContent = 'Good detective work. ' + target + ' of 3 clues solved.';
    question.textContent = prompts[target] || 'Atlas complete!';
    if (target === prompts.length) done();
  }));
  controls.forEach((control) => control.setAttribute('aria-pressed', 'false'));
  image.querySelectorAll('.brain-zone').forEach((zone) => {
    zone.addEventListener('click', () => {
      const index = content.regions.findIndex(({ key }) => key === zone.dataset.zone);
      controls[index].focus({ preventScroll: true });
      controls[index].click();
    });
  });
  element('p', 'Brain regions work together. This side-view sketch simplifies their shapes and boundaries.', panel, 'lesson');
}

function neuron(done) {
  const frame = element('div', '', $('play'), 'signal-activity');
  const image = element('div', '', frame);
  image.innerHTML = `<svg class="neuron-figure" viewBox="0 0 700 260" aria-hidden="true">
    <g stroke="#334676" fill="none" stroke-width="1"><path d="M25 184h650M25 51h650" stroke-dasharray="4 8"/><path d="M63 45v150m573-150v150"/></g>
    <g fill="none" stroke="#c8bcff" stroke-linecap="round" stroke-width="7"><path d="M178 125Q117 122 96 65m35 35L75 104l-23-18m78 45-53 26-27-8m48-1-16 30m30-85-9-39m50 60-18-57"/></g>
    <path d="M147 141q-15-45 26-53 22-12 40 11 9 14 29 19l254 0q26 0 36-31m-36 31q27 5 38 27m-38-27 39-2" fill="none" stroke="#c8bcff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M147 141q-15-45 26-53 22-12 40 11 15 26-7 49-21 22-59-7Z" fill="#c8bcff"/>
    <circle cx="179" cy="123" r="13" fill="#554796"/>
    <g fill="#a6ecdc"><rect x="248" y="105" width="64" height="26" rx="13"/><rect x="329" y="105" width="64" height="26" rx="13"/><rect x="410" y="105" width="64" height="26" rx="13"/></g>
    <path d="M625 173q-30-21-24-48l-14-32m15 33 26-35m-21 53 38-12m-27 30 40 9" fill="none" stroke="#9abfff" stroke-width="8" stroke-linecap="round"/>
    <circle class="pulse" cx="242" cy="118" r="9" fill="#ffcf68" stroke="#19264a" stroke-width="2"/>
    <g class="molecules" fill="#ff9b7f"><circle cx="553" cy="115" r="5"/><circle cx="567" cy="107" r="4"/><circle cx="579" cy="116" r="5"/><circle cx="568" cy="128" r="4"/></g>
    <g fill="#f8ecd2" font-family="system-ui" font-size="24" font-weight="700" text-anchor="middle">
      <text x="84" y="217">Dendrites</text><text x="200" y="246">Cell body</text><text x="374" y="217">Axon</text><text x="509" y="246">Terminals</text><text x="585" y="217">Synapse</text>
    </g>
  </svg>`;
  const svg = image.firstElementChild;
  const key = element('div', '', frame, 'signal-key');
  element('span', 'Electrical pulse along the axon', key);
  element('span', 'Chemical messengers across the gap', key);
  const bar = element('div', '', frame, 'buttons');
  const feedback = status(frame, 'Add two incoming messages to reach this model’s firing threshold.');
  const challenge = element('div', '', frame, 'panel');
  let inputs = 0;
  let stage = 0;
  let timer;
  const replay = button(bar, 'Restart relay', reset);
  const input = button(bar, 'Add incoming message', () => {
    inputs++;
    if (inputs < 2) {
      feedback.textContent = content.stages[0].description + ' Add one more message.';
      return;
    }
    input.hidden = true;
    launch.hidden = false;
    launch.focus();
    feedback.textContent = content.stages[1].description + ' This model is ready to fire.';
  }, 'primary');
  const launch = button(bar, 'Fire the neuron', () => {
    if (stage) return;
    stage = 1;
    svg.classList.add('firing');
    launch.setAttribute('aria-disabled', 'true');
    feedback.textContent = content.stages[2].description;
    timer = setTimeout(() => {
      svg.classList.add('release');
      feedback.textContent = content.stages[3].description + ' ' + content.stages[4].description;
      element('h3', 'What crosses the gap?', challenge);
      const choices = element('div', '', challenge, 'choices');
      const chemical = button(choices, 'Chemical messengers', () => {
        feedback.textContent = 'That’s it. The pulse traveled along the axon, then chemicals crossed the gap.';
        chemical.setAttribute('aria-pressed', 'true');
        electrical.setAttribute('aria-disabled', 'true');
        done();
      });
      const electrical = button(choices, 'The same electrical pulse', () => {
        if (electrical.hasAttribute('aria-disabled')) return;
        feedback.textContent = 'The pulse stops at the terminals in this model. Check what the pink dots represent.';
      });
      if (document.activeElement === launch) chemical.focus();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 875);
  }, 'primary');
  function reset() {
    clearTimeout(timer);
    inputs = 0;
    stage = 0;
    launch.hidden = true;
    launch.removeAttribute('aria-disabled');
    input.hidden = false;
    challenge.replaceChildren();
    svg.classList.remove('firing', 'release');
    feedback.textContent = 'Add two incoming messages to reach this model’s firing threshold.';
    input.focus();
  }
  launch.hidden = true;
  bar.append(replay);
  element('p', 'In a real neuron, many inputs can make firing more or less likely. The two-input rule is just for this model. Some synapses communicate electrically.', frame, 'lesson');
  return () => clearTimeout(timer);
}

function reaction(done) {
  const frame = element('div', '', $('play'), 'split');
  const scene = element('div', '', frame, 'beacon-stage');
  const panel = element('div', '', frame, 'panel');
  const results = element('ol', '', panel, 'rounds');
  results.setAttribute('aria-label', 'Round times');
  const feedback = status(panel, 'Try three rounds, or switch to untimed practice.');
  let timer;
  let cueTime;
  let phase = 'idle';
  let times = [];
  let timed = true;
  const label = element('span', 'Start round');
  const beacon = button(scene, '', turn, 'beacon');
  beacon.append(graphic('reaction'), label);
  const controls = element('div', '', panel, 'buttons');
  const mode = button(controls, 'Untimed practice', () => {
    timed = !timed;
    mode.textContent = timed ? 'Untimed practice' : 'Timed rounds';
    reset(timed ? 'Timed mode. Complete three rounds.' : 'Practice mode. Tap whenever you see GO.');
  });
  button(controls, 'Reset rounds', () => reset('A fresh set of rounds is ready.'));
  function reset(message) {
    clearTimeout(timer);
    times = [];
    results.replaceChildren();
    phase = 'idle';
    delete beacon.dataset.go;
    label.textContent = 'Start round';
    feedback.textContent = message;
  }
  function turn() {
    if (phase === 'complete') reset('A fresh set of rounds is ready.');
    if (phase === 'idle') {
      phase = 'waiting';
      label.textContent = 'Wait for GO…';
      feedback.textContent = 'Wait for the signal.';
      timer = setTimeout(() => {
        phase = 'ready';
        beacon.dataset.go = '';
        label.textContent = 'GO!';
        feedback.textContent = 'GO! Respond when you’re ready.';
        cueTime = performance.now();
      }, timed ? 950 + Math.random() * 1850 : 700);
      return;
    }
    if (phase === 'waiting') {
      clearTimeout(timer);
      phase = 'idle';
      label.textContent = 'Try again';
      feedback.textContent = 'That was before the cue. Wait until the beacon says GO.';
      return;
    }
    delete beacon.dataset.go;
    if (!timed) {
      phase = 'complete';
      label.textContent = 'Play again';
      feedback.textContent = 'Cue received! You noticed it, processed it, and made a move.';
      done();
      return;
    }
    const milliseconds = Math.round(performance.now() - cueTime);
    times.push(milliseconds);
    const row = element('li', '', results);
    element('span', 'Round ' + times.length + ': ' + milliseconds + ' ms', row);
    const meter = element('meter', '', row);
    meter.max = Math.max(...times, 500);
    meter.value = milliseconds;
    meter.setAttribute('aria-label', 'Round ' + times.length + ' response time');
    for (const chartItem of results.querySelectorAll('meter')) chartItem.max = meter.max;
    if (times.length < 3) {
      phase = 'idle';
      label.textContent = 'Start round ' + (times.length + 1);
      feedback.textContent = 'Cue received. ' + milliseconds + ' milliseconds.';
      return;
    }
    phase = 'complete';
    label.textContent = 'Play again';
    feedback.textContent = 'Three rounds complete. What changed between your tries?';
    done();
  }
  element('p', 'Your eyes notice the cue. Your brain processes it and sends signals to your muscles. Attention, practice and device delay can change the numbers. This is a game, not a health or intelligence test.', panel, 'lesson');
  return () => clearTimeout(timer);
}

const specimens = [
  ['Brain', 'brain'], ['Neuron', 'neuron'], ['Beacon', 'reaction'],
  ['Memory', 'memory'], ['Synapse', 'synapse'], ['Balance', 'balance']
];

function memory(done) {
  const top = element('div', '', $('play'), 'memory-top');
  const controls = element('div', '', top, 'buttons');
  const board = element('div', '', $('play'), 'deck');
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', 'Specimen cards');
  const feedback = status($('play'));
  let count = 4;
  let timer;
  const difficulty = button(controls, 'Challenge: 6 pairs', () => {
    count = count === 4 ? 6 : 4;
    difficulty.textContent = count === 4 ? 'Challenge: 6 pairs' : 'Practice: 4 pairs';
    reset();
  });
  button(controls, 'Shuffle cards', reset);
  const counter = element('strong', '', top);

  function reset() {
    clearTimeout(timer);
    board.replaceChildren();
    let first;
    let locked = false;
    let matches = 0;
    const deck = specimens.slice(0, count);
    counter.textContent = count + ' pairs left';
    feedback.textContent = 'Pick a specimen card.';
    shuffle([...deck, ...deck]).forEach(([name, icon], index) => {
      const card = button(board, '', play, 'card');
      const record = { name, paint };
      function paint(face, matched = false) {
        card.replaceChildren(graphic(face ? icon : 'quiz'));
        if (face) element('span', name, card);
        card.toggleAttribute('data-face', face);
        card.toggleAttribute('data-match', matched);
        card.setAttribute('aria-label', 'Card ' + (index + 1) + ', ' + (face ? name : 'face down') + (matched ? ', matched' : ''));
        card.setAttribute('aria-disabled', String(matched));
      }
      function play() {
        if (locked || first === record || card.hasAttribute('data-match')) return;
        paint(true);
        if (!first) {
          first = record;
          feedback.textContent = name + '. Find its twin.';
          return;
        }
        const other = first;
        first = undefined;
        if (other.name === name) {
          paint(true, true);
          other.paint(true, true);
          matches++;
          counter.textContent = (count - matches) + ' pairs left';
          feedback.textContent = name + ' pair found!';
          if (matches === count) {
            feedback.textContent = 'Vault complete! Remembering where you saw each card helped you find the pairs.';
            done();
          }
          return;
        }
        locked = true;
        feedback.textContent = other.name + ' and ' + name + '. Remember their locations.';
        timer = setTimeout(() => {
          other.paint(false);
          paint(false);
          locked = false;
          feedback.textContent = 'Cards turned over. Try another pair.';
        }, 1500);
      }
      paint(false);
    });
  }
  reset();
  element('p', 'Attention helps you spot the picture. Working memory helps you keep track of locations as you play. Recognizing a card you saw earlier also draws on memory. Forgetting a spot is part of the game.', $('play'), 'lesson');
  return () => clearTimeout(timer);
}

function quiz(done) {
  const frame = element('div', '', $('play'), 'quiz-layout');
  const image = element('div', '', frame, 'quiz-art');
  const panel = element('div', '', frame, 'panel');
  const track = element('div', '', panel, 'quiz-steps');
  track.setAttribute('aria-hidden', 'true');
  const question = element('h3', '', panel);
  question.tabIndex = -1;
  const options = element('div', '', panel, 'choices');
  const feedback = status(panel);
  const next = button(panel, 'Next clue →', () => { index++; render(true); }, 'primary');
  let index = 0;
  let score = 0;
  function render(focus) {
    const item = content.quiz[index];
    options.replaceChildren();
    track.replaceChildren();
    feedback.textContent = '';
    next.hidden = true;
    image.replaceChildren(graphic(item?.icon && Object.prototype.hasOwnProperty.call(drawings, item.icon) ? item.icon : 'quiz'));
    if (!item) {
      question.textContent = 'Mission debrief complete';
      feedback.textContent = 'You solved ' + score + ' of ' + content.quiz.length + ' clues on your first try. Revisit any mission to practice.';
      button(options, 'Play again', () => { index = 0; score = 0; render(true); });
      question.focus();
      done();
      return;
    }
    content.quiz.forEach((_, i) => element('i', '', track).toggleAttribute('data-seen', i <= index));
    question.textContent = 'Clue ' + (index + 1) + ' of ' + content.quiz.length + ' · ' + item.prompt;
    if (focus) question.focus();
    let answered = false;
    shuffle([item.correct, item.other1, item.other2]).forEach((response) => button(options, response, (event) => {
      if (answered) return;
      answered = true;
      const correct = response === item.correct;
      if (correct) score++;
      event.currentTarget.classList.add('selected');
      options.querySelectorAll('button').forEach((option) => option.setAttribute('aria-disabled', 'true'));
      feedback.textContent = (correct ? 'You got it. ' : 'Here’s the clue to remember. ') + item.explanation;
      next.hidden = false;
      next.textContent = index === content.quiz.length - 1 ? 'Finish debrief →' : 'Next clue →';
    }));
  }
  render(false);
}

const activities = { brain, neuron, reaction, memory, quiz };

function valid(data) {
  const has = (obj, keys) => keys.every((key) => typeof obj?.[key] === 'string' && obj[key].trim());
  const rows = (items, fields, size) => Array.isArray(items) && items.length >= size && items.every((item) => has(item, fields));
  return has(data, ['intro', ...missions.map(({ id }) => id + 'Intro'), 'credits']) &&
    rows(data.regions, ['name', 'key', 'description'], 3) && data.regions.length === 3 &&
    ['cerebrum', 'cerebellum', 'brainstem'].every((key) => data.regions.some((item) => item.key === key)) &&
    rows(data.stages, ['name', 'description'], 5) && data.stages.length === 5 &&
    rows(data.quiz, ['prompt', 'correct', 'other1', 'other2', 'explanation'], 1) &&
    data.quiz.every((item) => new Set([item.correct, item.other1, item.other2]).size === 3) &&
    rows(data.glossary, ['name', 'description'], 1) && rows(data.sources, ['name', 'url'], 1);
}

async function initialize() {
  $('load-error').hidden = true;
  $('retry').disabled = true;
  try {
    const response = await fetch('content.json');
    if (!response.ok) throw new Error('Content request failed');
    const data = await response.json();
    if (!valid(data)) throw new Error('Content is incomplete');
    $('intro').textContent = data.intro;
    $('credits').textContent = data.credits;
    data.glossary.forEach(({ name, description }) => {
      element('dt', name, $('glossary'));
      element('dd', description, $('glossary'));
    });
    data.sources.forEach(({ name, url }) => {
      let parsed;
      try { parsed = new URL(url); } catch { return; }
      if (parsed.protocol !== 'https:') return;
      const link = element('a', name, element('li', '', $('sources')));
      link.href = parsed.href;
    });
    content = data;
    $('start').disabled = false;
    navigate();
  } catch {
    $('retry').disabled = false;
    $('load-error').hidden = false;
    $('retry').focus();
  }
}

$('retry').onclick = initialize;
$('start').onclick = () => { location.hash = missions.find(({ id }) => !completed.has(id))?.id || 'finish'; };
$('continue').onclick = () => { location.hash = nextMission()?.id || 'finish'; };
$('finish-map').onclick = () => { location.hash = 'map'; };
window.addEventListener('hashchange', navigate);
initialize();
