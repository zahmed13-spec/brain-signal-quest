# Brain Signal Quest

A free browser game about the brain for kids aged 8–12. Follow the quest map through six stops:

1. **Brain Explorer**: click a side-view brain to learn what the four lobes, cerebellum and brainstem do. *Peek inside* shows the thalamus, hippocampus and amygdala.
2. **Neuron Relay**: send messages to the dendrites until the neuron passes threshold, then watch the action potential hop along the myelin and the neurotransmitters cross the synapse.
3. **Reaction Lab**: five rounds of "press when the lamp turns on", followed by the eye → brain → muscle loop.
4. **Memory Match**: six illustrated pairs that train working memory.
5. **Brain Playhouse**: a 3D brain (with a 2D fallback) that shows signals travelling step by step for six everyday moments: seeing a light, touching something hot, hearing your name, catching a ball, smelling cookies, and learning something new.
6. **Quiz Boss**: four random questions from a pool of 20. Every answer is explained.

Players earn a star and badge per stop and can print a **Junior Neuroscientist** certificate. Sparky, an original neuron character, guides the way.

**Privacy:** no accounts, ads, analytics, cookies or third-party requests. Fonts and libraries are self-hosted. Only the earned stars are saved, in `localStorage` on the device. The certificate name is never stored or sent anywhere.

## Run locally

There's no build step. From this folder run:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` directly from disk won't work, because the browser blocks loading `content.json` from `file://`.)

**Keyboard:** Tab moves between controls, and Enter or Space activates them. In the Playhouse 3D view, focus the picture and use the arrow keys to rotate, `+`/`-` to zoom and `0` to reset. The camera buttons do the same.

## Deploy (GitHub Pages)

In Settings → Pages, choose **Deploy from a branch**, then **main** and **/(root)**. There's no build command. `.nojekyll` makes sure the `vendor/` and `js/` folders are served as-is.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | Page shell, screens and the SVG icon sprite |
| `style.css` | The whole design system. Colours, region colours, type and radii are CSS custom properties at the top. |
| `game.js` | Entry module: loads `content.json`, builds the quest map and routes between screens (`#brain`, `#playhouse`, …) |
| `js/core.js` | Shared helpers: progress storage, sound (muted by default), glossary tooltips, Sparky, activity scaffolding |
| `js/brain.js`, `neuron.js`, `reaction.js`, `memory.js`, `quiz.js` | One module per activity |
| `js/playhouse/` | Brain Playhouse: `playhouse.js` (UI), `scene3d.js` (Three.js, loaded only when the Playhouse opens), `view2d.js` (SVG fallback), `anatomy.js` (shared shapes) |
| `content.json` | **All learning text and data.** Edit it directly or with Pages CMS. |
| `vendor/three/` | Three.js r170 and OrbitControls (MIT), loaded through an import map |
| `fonts/` | Fredoka and Atkinson Hyperlegible (SIL OFL 1.1) |
| `docs/` | Audit and design brief from the redesign |

## Editing content (Pages CMS or by hand)

Open the repository in [Pages CMS](https://pagescms.org) and choose **Learning content**. Every section of `content.json` is editable there, including the Playhouse.

- **Activities:** the `key` connects each stop to its code. Change the text freely, but don't change the keys.
- **Regions:** keys must match the diagram (`cerebrum`, `frontal`, `parietal`, `temporal`, `occipital`, `cerebellum`, `brainstem`, `thalamus`, `hippocampus`, `amygdala`). Set `inside` for parts shown with *Peek inside*.
- **Quiz:** every question needs one correct answer and two wrong answers. Add an explanation for each, because kids see *why* an answer is wrong. `quizPerRound` sets how many questions each game draws.
- **Glossary:** any glossary word (or one of its `aliases`) that appears in the game text automatically becomes a tap-to-define button.
- **Sources:** HTTPS links only. Others are skipped.

### Adding a Brain Playhouse scenario

The Playhouse is data-driven. The 3D code just plays whatever is in `content.json → playhouse`.

1. **Coordinates:** `x` is the person's right (+) or left (−), `y` is up, and `z` is front (+) or back (−). The brain runs from about `z = −1` (back of the head) to `z = +1`. The eyes are at `z ≈ 1.25`, and the spinal cord and arm go down to `y ≈ −2`.
2. **Structures** are glowing dots with a label: `id`, `name`, `about`, `position`, `color`, `size`, and an optional `region` (the lobe that lights up on the 3D brain). Reuse existing ones where you can.
3. **Pathways** are glowing tubes: an `id`, a `color` and two or more `points`. Signals travel from the first point to the last.
4. **Scenarios** have an `id`, `title`, `icon` (`eye`, `hand`, `ear`, `ball`, `nose`, `spark` or `brain`), `view2d` (`side`, `top` or `front` for the 2D fallback), `badge`, `intro` and a list of **steps**. Each step has:
   - `structure`: the ID that gets the big label
   - `also`: extra IDs to light up
   - `pathways`: the tubes that glow and carry pulses
   - `text` and `funFact`
   - `camera` and `target`: where the camera sits and what it looks at
   - `glow` (optional, 0–1): how bright and thick the pathways are, as in the "learning" scenario
5. **Challenge:** either `type: "pick"` (with `answer` and `options` as structure IDs) or `type: "order"` (with `items` in the correct order, which the game shuffles). Add an `explanation`.

Unknown IDs are ignored instead of crashing, so a typo makes something not show up rather than break the page. Preview locally before publishing.

## Accessibility and safety

- Text is at least 16px (body text 18px), with WCAG AA contrast and visible focus rings. Every control works from the keyboard.
- `prefers-reduced-motion` turns off animations. The neuron becomes a step-by-step diagram and the Playhouse starts in its 2D view.
- Nothing flashes. The reaction lamp changes colour once per round, and the Playhouse pulses move smoothly rather than blinking.
- Sound is off by default. Everything works without it.
- Every diagram has a text alternative, and the step text and feedback are in live regions.

## Performance

Three.js (about 690 KB, about 170 KB gzipped) is only downloaded when the Playhouse opens. The 3D scene is low-poly and renders on demand when paused. It caps the pixel ratio at 2, and drops to 1 automatically if the frame rate stays under 40. Without WebGL it shows the 2D diagram.

## Sources and credits

All facts were checked against the sources listed in `content.json` (also shown on the in-game **Glossary** page): Society for Neuroscience / BrainFacts.org, NIH NINDS *Brain Basics*, Eric Chudler's *Neuroscience for Kids* (University of Washington), OpenStax *Anatomy & Physiology 2e* and Kenhub.

- Code, illustrations, the Sparky character and the procedural 3D brain are original. They were made with AI assistance (Claude by Anthropic) for this project.
- [Three.js](https://threejs.org) r170, MIT License (`vendor/three/LICENSE`).
- [Fredoka](https://github.com/hafontia/Fredoka-One) and [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) (Braille Institute), SIL Open Font License 1.1 (`fonts/OFL-*.txt`). Font files come from Fontsource.

This is a supplemental learning resource and isn't medical advice.
