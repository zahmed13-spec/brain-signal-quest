import { inputLevel, predictsFiring, threshold } from './rules.mjs';

const neuronArt = `<svg class="neuron-figure" viewBox="0 0 720 320" aria-hidden="true">
 <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#405382" stroke-width="1"/></pattern>
 <linearGradient id="soma-light" x2="0" y2="1"><stop stop-color="#efe3ff"/><stop offset="1" stop-color="#9a86dd"/></linearGradient></defs>
 <rect width="720" height="320" fill="#22315c"/><rect width="720" height="320" fill="url(#grid)"/>
 <g class="structure" data-part="dendrites" fill="#c6aff7">
  <path d="M185 146Q143 132 119 95L93 61Q117 97 132 100Q119 72 123 44Q125 84 149 111L163 123Q151 101 153 82Q156 108 175 131Z"/>
  <path d="M176 158Q130 156 103 135Q76 110 52 117Q83 120 99 140L113 147Q76 144 48 149Q27 151 18 166Q41 151 56 155Q36 163 29 179Q52 159 80 159Q121 160 177 176Z"/>
  <path d="M177 174Q138 181 118 213Q95 247 66 252Q107 251 124 224Q129 254 111 274Q137 258 137 224Q154 199 187 190Z"/>
  <path d="M195 125Q175 98 182 66Q188 43 175 23Q198 43 192 73Q205 52 224 46Q200 65 197 91Q198 106 211 119Z"/>
  <path d="M196 195Q193 219 212 235Q232 256 230 276Q222 254 203 243Q205 266 194 283Q201 257 191 236Q178 218 181 194Z"/>
  <path d="M119 95Q91 86 76 68Q96 80 111 81M104 137Q92 113 96 103Q99 123 113 141M120 211Q100 196 81 202Q101 202 116 219M144 205Q151 226 143 242Q146 226 137 216M183 69Q164 60 159 46Q173 59 186 58"/>
 </g>
 <path class="structure" data-part="soma" d="M165 150Q172 134 183 127Q199 108 221 120Q240 129 242 150Q238 173 220 192Q207 204 186 197Q166 188 165 150Z" fill="url(#soma-light)" stroke="#eadbff" stroke-width="2"/>
 <ellipse class="structure" data-part="nucleus" cx="202" cy="157" rx="16" ry="20" fill="#6d59ad" stroke="#eadbff" stroke-width="2"/>
 <path class="structure" data-part="hillock" d="M229 139Q245 147 269 152L268 159Q246 158 228 173Q237 155 229 139Z" fill="#e8d8fb"/>
 <path class="structure" data-part="axon" d="M263 156H603" fill="none" stroke="#e8d8fb" stroke-width="9" stroke-linecap="round"/>
 <g class="structure" data-part="myelin" fill="#80cfbd" stroke="#d5fff0" stroke-width="2">
  <path d="M283 156q0-19 16-20h40q16 1 16 20t-16 20h-40q-16-1-16-20Z"/>
  <path d="M368 156q0-19 16-20h40q16 1 16 20t-16 20h-40q-16-1-16-20Z"/>
  <path d="M453 156q0-19 16-20h40q16 1 16 20t-16 20h-40q-16-1-16-20Z"/>
  <path d="M538 156q0-19 16-20h27q16 1 16 20t-16 20h-27q-16-1-16-20Z"/>
 </g>
 <path d="M295 147h46m39 0h46m39 0h46m39 0h35" stroke="#3f887f" stroke-width="3" stroke-linecap="round" pointer-events="none"/>
 <g class="structure" data-part="nodes" stroke="#f9eadb" stroke-width="6"><path d="M361 153v6m85-6v6m85-6v6"/></g>
 <g class="structure" data-part="terminals" fill="#d7c1ff" stroke="#d7c1ff" stroke-linecap="round">
  <path d="M597 156Q622 153 640 112L651 96m-48 61q28 0 52-7m-52 8q25 8 43 44m-9-82 25-7" fill="none" stroke-width="6"/>
  <circle cx="651" cy="96" r="7"/><circle cx="662" cy="113" r="7"/><circle cx="655" cy="150" r="7"/><circle cx="646" cy="202" r="7"/>
 </g>
 <g class="activation" fill="none" stroke="#ffd375" stroke-width="6" stroke-linecap="round">
  <path d="M243 148q12 4 28 5"/><path d="M357 156h9"/><path d="M442 156h9"/><path d="M527 156h9"/><path d="M599 156q27-5 43-48"/>
 </g>
 </svg>`;

const synapseArt = `<svg class="synapse-figure" viewBox="0 0 560 300" aria-hidden="true">
 <rect width="560" height="300" fill="#22315c"/>
 <path class="terminal" d="M110 17h340q-37 23-40 53-5 53-79 62H229q-74-9-79-62-3-30-40-53Z" fill="#c6aff7" stroke="#f0ddff" stroke-width="4"/>
 <path d="M96 281q33-65 96-73h176q63 8 96 73Z" fill="#6dbeb2" stroke="#b4f4e5" stroke-width="4"/>
 <g fill="#825bb0" stroke="#f7dfff" stroke-width="2">
 <circle cx="218" cy="67" r="19"/><circle cx="344" cy="66" r="19"/><circle class="vesicle" cx="279" cy="96" r="18"/>
 </g>
 <g fill="#ffd19b"><circle cx="212" cy="66" r="4"/><circle cx="224" cy="70" r="4"/><circle cx="339" cy="62" r="4"/><circle cx="350" cy="70" r="4"/><circle cx="275" cy="93" r="4"/><circle cx="285" cy="101" r="4"/></g>
 <path class="receptors" d="M239 216v-13l-8-9m8 9 8-9m65 22v-13l-8-9m8 9 8-9" stroke="#e9edff" stroke-width="6" fill="none" stroke-linecap="round"/>
 <g class="transmitters" fill="#ffbd9c"><circle cx="239" cy="196" r="5"/><circle cx="312" cy="196" r="5"/><circle cx="277" cy="184" r="5"/></g>
 <path class="post-effect" d="M162 246h35l9-12 11 25 11-13h19m57 0h35l9-12 11 25 11-13h19" stroke="#ffdc86" stroke-width="5" fill="none" stroke-linecap="round"/>
 <path d="M458 138h17m0 0v65m0 0h-17" stroke="#ffc2a5" stroke-width="3" fill="none"/>
 </svg>`;

export function createRelay({ element, button, status, content, parent, done }) {
  const frame = element('div', '', parent, 'relay');
  const diagram = element('div', '', frame, 'relay-diagram');
  diagram.innerHTML = neuronArt;
  const svg = diagram.firstElementChild;
  const notes = element('div', '', frame, 'panel relay-notes');
  element('h2', 'Explore a multipolar neuron', notes);
  const parts = element('div', '', notes, 'choices anatomy-keys');
  const info = status(notes, 'Pick a part to highlight it. This example has myelin. Some neurons have different shapes or no myelin.');
  const select = part => {
    for (const region of svg.querySelectorAll('.structure')) region.classList.toggle('highlight', region.dataset.part === part?.id);
    for (const control of parts.querySelectorAll('button')) control.setAttribute('aria-pressed', String(control.dataset.part === part?.id));
    info.textContent = part ? part.name + ' — ' + part.description : 'Full view. This is one example of a multipolar neuron.';
  };
  for (const part of content.anatomy) button(parts, part.name, () => select(part)).dataset.part = part.id;
  button(parts, 'Full view', () => select());
  const experiment = element('section', '', frame, 'panel experiment');
  element('h2', 'Will it fire?', experiment);
  const controls = element('div', '', experiment, 'choices');
  const readout = status(experiment);
  const meter = element('meter', '', experiment);
  meter.max = 8;
  meter.setAttribute('aria-label', 'Model input level, threshold 4');
  const predictions = element('div', '', experiment, 'choices');
  const feedback = status(experiment, 'Add or remove input, then predict the result.');
  element('p', 'This meter models a balance of inputs. Real neurons respond to inputs that differ in timing, location and strength.', experiment, 'lesson');
  const synapse = element('section', '', frame, 'panel synapse-lab');
  synapse.hidden = true;
  const synTitle = element('h2', 'Chemical synapse · close-up', synapse);
  synTitle.tabIndex = -1;
  const closeup = element('div', '', synapse);
  closeup.innerHTML = synapseArt;
  const synSvg = closeup.firstElementChild;
  element('p', 'Top: sending terminal and vesicles. Middle: synaptic cleft. Bottom: receiving membrane and receptors.', synapse, 'lesson');
  const stepText = status(synapse);
  const playback = element('div', '', synapse, 'choices');
  const check = element('div', '', synapse, 'panel');
  const completedChecks = new Set();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = 0;
  let step = 0;
  let timer;
  let propagation;
  let busy = false;
  let playing = false;

  function paint() {
    meter.value = level;
    readout.textContent = 'Input level ' + level + ' of 8 · fires at ' + threshold;
  }
  function pause() {
    clearTimeout(timer);
    playing = false;
    play.textContent = 'Play steps';
  }
  function showStep(index) {
    step = index;
    const data = content.stages[step];
    synSvg.dataset.step = data.id;
    stepText.textContent = 'Step ' + (step + 1) + ' of 5 · ' + data.name + ' — ' + data.description;
    if (step === 4) {
      pause();
      check.hidden = false;
    }
  }
  function schedule() {
    if (!playing) return;
    timer = setTimeout(() => { showStep(step + 1); schedule(); }, 1850);
  }
  const play = button(playback, 'Play steps', () => {
    if (playing) { pause(); return; }
    if (step === 4) showStep(0);
    playing = true;
    play.textContent = 'Pause';
    schedule();
  }, 'primary');
  button(playback, 'Next step', () => { pause(); showStep((step + 1) % 5); });
  button(playback, 'Replay from start', () => { pause(); showStep(0); });
  button(playback, 'Back to neuron', () => {
    pause();
    synapse.hidden = true;
    predictions.firstElementChild.focus();
  });
  const checkpoints = [
    ['What crosses this gap?', 'Chemical messengers', 'The electrical wave itself', 'Neurotransmitters cross the gap. Membrane electrical changes carried the signal along the axon.'],
    ['What can inhibitory input do?', 'Make firing less likely', 'Guarantee firing', 'Inhibitory input can make reaching the firing threshold less likely.'],
    ['Does receptor binding always fire the receiving neuron?', 'No, it can change the cell’s electrical state', 'Yes, it always fires', 'A cell can change electrically without reaching its own firing threshold.']
  ];
  element('h3', 'Lab check', check);
  checkpoints.forEach(([prompt, correct, wrong, explanation], i) => {
    element('strong', prompt, check);
    const choices = element('div', '', check, 'choices');
    const result = status(check);
    const answer = value => {
      result.textContent = (value ? 'Right. ' : 'Try again. ') + explanation;
      if (!value) return;
      completedChecks.add(i);
      if (completedChecks.size === checkpoints.length) done();
    };
    const options = i === 1 ? [[wrong, false], [correct, true]] : [[correct, true], [wrong, false]];
    for (const [label, value] of options) button(choices, label, () => answer(value));
  });
  check.hidden = true;

  function restart() {
    clearTimeout(propagation);
    pause();
    busy = false;
    level = 0;
    svg.classList.remove('propagating');
    synapse.hidden = true;
    check.hidden = true;
    completedChecks.clear();
    feedback.textContent = 'Add or remove input, then predict the result.';
    paint();
  }
  const change = amount => {
    if (busy) return;
    level = inputLevel(level, amount);
    paint();
    svg.dataset.input = amount > 0 ? 'excite' : 'inhibit';
  };
  button(controls, 'Excitatory · raise input', () => change(2));
  button(controls, 'Inhibitory · lower input', () => change(-1));
  button(controls, 'Reset experiment', restart);
  const predict = guess => {
    if (busy) return;
    const fires = predictsFiring(level);
    feedback.textContent = (guess === fires ? 'Prediction matched. ' : 'Compare your prediction. ') +
      (fires ? 'The model reached threshold. Watch the membrane activate near the soma, then at the gaps in the myelin.' : 'The model stayed below threshold. No action potential started. Try changing the balance.');
    if (!fires) return;
    pause();
    synapse.hidden = true;
    check.hidden = true;
    busy = true;
    delete svg.dataset.input;
    svg.classList.remove('propagating');
    void svg.getBoundingClientRect();
    svg.classList.add('propagating');
    const origin = document.activeElement;
    propagation = setTimeout(() => {
      busy = false;
      synapse.hidden = false;
      showStep(0);
      if (document.activeElement === origin) synTitle.focus();
    }, reduce ? 0 : 1050);
  };
  button(predictions, 'It will fire', () => predict(true), 'primary');
  button(predictions, 'Not yet', () => predict(false));
  paint();
  return () => { clearTimeout(propagation); pause(); };
}
