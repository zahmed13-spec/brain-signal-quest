import { createRelay } from './relay.js';
import { valid, discovery, reactionAction, pairAction, correctAnswer } from './rules.mjs';
'use strict';

const $ = (id) => document.getElementById(id);
const missions = [
  { id: 'brain', name: 'Brain Atlas', action: 'Map three regions', badge: 'Brain mapper', color: 'violet' },
  { id: 'neuron', name: 'Signal Relay', action: 'Send a message', badge: 'Signal sender', color: 'salmon' },
  { id: 'reaction', name: 'Beacon Arcade', action: 'Catch the cue', badge: 'Beacon responder', color: 'gold' },
  { id: 'memory', name: 'Memory Vault', action: 'Match the specimens', badge: 'Memory explorer', color: 'mint' },
  { id: 'quiz', name: 'Mission Control', action: 'Put clues together', badge: 'Mission specialist', color: 'blue' }
];
const fieldNotes = [
  'Brain regions work together to sense, think, move and breathe.',
  'Electrical changes carry a signal along an axon. Chemicals can carry it across a synapse.',
  'Noticing and responding to a cue takes time. Devices can change the number.',
  'Attention and memory help you keep track of what you saw and where.',
  'Use what you learned to make a prediction in a new situation.'
];
let stationTimer;
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
let completed = new Set();
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
    const badge = element('span', '', stop, 'stop-art');
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
  completed = discovery(completed, mission.id);
  $('progress').value = completed.size;
  $('progress-label').setAttribute('aria-live', 'polite');
  $('progress-label').textContent = completed.size + ' / 5 discoveries';
  $('reward-title').textContent = '✓ ' + mission.badge;
  const next = nextMission();
  $('reward-copy').textContent = fieldNotes[missions.indexOf(mission)];
  $('continue').textContent = next ? 'Next: ' + next.name + ' →' : 'Light up the station →';
  $('reward').hidden = false;
}

function introFor(id) {
  return content[id + 'Intro'];
}

function navigate() {
  if (!content) return;
  teardown();
  clearInterval(stationTimer);
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
    $('station-signal').textContent = 'Light the map';
  } else {
    $('journal').replaceChildren();
    missions.forEach(({ id, name }, i) => {
      const row = element('li', '', $('journal'));
      element('a', name, row).href = '#' + id;
      row.append(' — ' + fieldNotes[i]);
    });
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
      <path class="brain-zone" data-zone="brainstem" fill="#a6ecdc" d="M245 188q10 10 21 18 12 9 8 23-4 12 3 30l7 18-19 9q-17-25-17-51-15-10-24-31Z"/>
      <path class="brain-zone" data-zone="cerebellum" fill="#ffc2a5" d="M282 188q28-12 53 2 26 13 21 34-4 17-30 25-25 8-48-7-19-12-14-30 4-15 18-24Z"/>
      <path class="brain-zone" data-zone="cerebrum" fill="#d9caff" d="M126 195q-30-11-28-39-1-21 21-38 5-22 32-29 14-25 44-21 25-17 52-4 24-5 43 12 28 1 43 21 22 9 28 32 20 18 11 39-8 20-33 27-19 19-47 15-22 18-52 9-27 10-51-10-32 5-63-14Z"/>
    </g>
    <path d="M110 153q21-9 35 1 7-20 31-17m-39-34q20-6 36 8 11-21 31-17m16-16q-5 19 13 31 11 8 9 25m29-50q-13 17-4 32 11 11 29 4m15-18q-10 16 4 28 18-6 33 11m-221 38q20 14 40 5 9-15 24-12m17 28q17-26 38-15 15 5 29-8m23 1q16 15 39 6m-67-28q-19-7-32 7-8 12-25 12m97 41q17 10 37 5m-33 5q11 7 25 5" fill="none" pointer-events="none" stroke="#6561a7" stroke-width="3" stroke-linecap="round"/>
    <path d="M273 210q38 5 68-12m-74 22q47 10 81-10m-76 20q38 12 76-8m-65 19q31 7 55-10" fill="none" stroke="#975844" stroke-width="2" stroke-linecap="round" pointer-events="none"/>
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
    feedback.textContent = region.name + ' — ' + region.description;
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
  return createRelay({ element, button, status, content, parent: $('play'), done });
}

function reaction(done) {
  const frame = element('div', '', $('play'), 'split');
  const scene = element('div', '', frame, 'beacon-stage');
  const panel = element('div', '', frame, 'panel');
  const results = element('ol', '', panel, 'rounds');
  results.setAttribute('aria-label', 'Round times');
  const feedback = status(panel, 'Try three rounds, or respond to a pattern without timing.');
  const summary = element('p', '', panel, 'feedback');
  const practice = element('div', '', scene, 'panel');
  practice.hidden = true;
  let timer;
  let cueTime;
  let phase = 'idle';
  let times = [];
  let timed = true;
  let cueIndex = 0;
  const label = element('span', 'Start round');
  const beacon = button(scene, '', turn, 'beacon');
  beacon.append(graphic('reaction'), label);
  const controls = element('div', '', panel, 'buttons');
  const pattern = ['Star', 'Circle', 'Star'];
  const cue = element('h3', '', practice);
  const patternChoices = element('div', '', practice, 'choices');
  function showCue() {
    cue.textContent = pattern[cueIndex] ? 'Cue ' + (cueIndex + 1) + ' of 3 · ' + pattern[cueIndex] : 'Pattern complete';
  }
  for (const shape of ['Star', 'Circle']) button(patternChoices, shape, () => {
    if (cueIndex === pattern.length) return;
    if (shape !== pattern[cueIndex]) {
      feedback.textContent = 'Check the name of the cue and choose that shape.';
      return;
    }
    cueIndex++;
    showCue();
    if (cueIndex === pattern.length) {
      feedback.textContent = 'Pattern complete. You noticed each cue and chose a response at your own pace.';
      done();
    } else feedback.textContent = 'Cue matched. Now try ' + pattern[cueIndex] + '.';
  });
  const mode = button(controls, 'Untimed cue pattern', () => {
    timed = !timed;
    mode.textContent = timed ? 'Untimed cue pattern' : 'Timed rounds';
    beacon.hidden = !timed;
    practice.hidden = timed;
    reset(timed ? 'Timed mode. Complete three rounds.' : 'Read each cue and choose its matching shape. There is no timer.');
  });
  button(controls, 'Reset rounds', () => reset('A fresh set of rounds is ready.'));
  function reset(message) {
    clearTimeout(timer);
    times = [];
    results.replaceChildren();
    summary.textContent = '';
    cueIndex = 0;
    showCue();
    phase = 'idle';
    delete beacon.dataset.go;
    label.textContent = 'Start round';
    feedback.textContent = message;
  }
  function turn() {
    if (reactionAction(phase) === 'replay') reset('A fresh set of rounds is ready.');
    if (reactionAction(phase) === 'wait') {
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
    if (reactionAction(phase) === 'early') {
      clearTimeout(timer);
      phase = 'idle';
      label.textContent = 'Try again';
      feedback.textContent = 'That was before the cue. Wait until the beacon says GO.';
      return;
    }
    delete beacon.dataset.go;
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
    const average = Math.round(times.reduce((total, value) => total + value, 0) / times.length);
    summary.textContent = 'Average ' + average + ' ms · Fastest ' + Math.min(...times) + ' ms · Slowest ' + Math.max(...times) + ' ms';
    done();
  }
  element('p', 'Your eyes notice the cue. Your brain processes it and sends signals to your muscles. Attention, expectations, practice, display delay and input delay can change the numbers. This is a game, not a health or intelligence test.', panel, 'lesson');
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
      const record = { name, paint, matched: false };
      function paint(face, matched = false) {
        card.replaceChildren(graphic(face ? icon : 'quiz'));
        if (face) element('span', matched ? '✓ ' + name : name, card);
        card.toggleAttribute('data-face', face);
        card.toggleAttribute('data-match', matched);
        record.matched = matched;
        card.setAttribute('aria-label', 'Card ' + (index + 1) + ', ' + (face ? name : 'face down') + (matched ? ', matched' : ''));
        card.setAttribute('aria-disabled', String(matched));
      }
      function play() {
        const action = pairAction(locked, first, record);
        if (action === 'ignore') return;
        paint(true);
        if (action === 'reveal') {
          first = record;
          feedback.textContent = name + '. Find its twin.';
          return;
        }
        const other = first;
        first = undefined;
        if (action === 'match') {
          paint(true, true);
          other.paint(true, true);
          matches++;
          counter.textContent = (count - matches) + ' pairs left';
          feedback.textContent = name + ' pair found! ' + matches + ' of ' + count + ' pairs matched.';
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
      const correct = correctAnswer(item, response);
      if (correct) score++;
      event.currentTarget.classList.add('selected');
      options.querySelectorAll('button').forEach((option) => option.setAttribute('aria-disabled', 'true'));
      for (const option of options.querySelectorAll('button')) {
        if (option.textContent === item.correct) option.dataset.correct = '';
      }
      if (!correct) event.currentTarget.dataset.incorrect = '';
      feedback.textContent = (correct ? 'You got it. ' : 'Correct answer: ' + item.correct + '. ') + item.explanation;
      next.hidden = false;
      next.textContent = index === content.quiz.length - 1 ? 'Finish debrief →' : 'Next clue →';
    }));
  }
  render(false);
}

const activities = { brain, neuron, reaction, memory, quiz };

async function initialize() {
  $('load-error').hidden = true;
  $('retry').disabled = true;
  try {
    const response = await fetch('content.json');
    if (!response.ok) throw new Error('Content request failed');
    const data = await response.json();
    if (!valid(data, Object.keys(drawings))) throw new Error('Content is incomplete');
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
    $('station-signal').disabled = false;
    navigate();
  } catch {
    $('retry').disabled = false;
    $('load-error').hidden = false;
    $('retry').focus();
  }
}

$('station-signal').onclick = () => {
  clearInterval(stationTimer);
  const stops = [...$('map-stops').children];
  stops.forEach(stop => stop.removeAttribute('data-lit'));
  let index = 0;
  const light = () => {
    stops[index++].dataset.lit = '';
    if (index === stops.length) {
      clearInterval(stationTimer);
      $('station-signal').textContent = 'Light the map again';
    }
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    while (index < stops.length) light();
  } else {
    light();
    stationTimer = setInterval(light, 230);
  }
};
$('retry').onclick = initialize;
$('start').onclick = () => { location.hash = missions.find(({ id }) => !completed.has(id))?.id || 'finish'; };
$('continue').onclick = () => { location.hash = nextMission()?.id || 'finish'; };
$('finish-map').onclick = () => { location.hash = 'map'; };
window.addEventListener('hashchange', navigate);
initialize();
