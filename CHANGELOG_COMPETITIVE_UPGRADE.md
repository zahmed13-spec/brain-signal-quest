# Changelog: competitive upgrade

- **Branch:** `feature/competitive-upgrade` (from `research-design-review`)
- **Spec:** `BRAIN_SIGNAL_QUEST_RESEARCH_AND_CHANGES.md`
- **Plan and flags:** `IMPLEMENTATION_PLAN.md`
- **Design system:** `docs/DESIGN-SYSTEM.md`
- **Credits:** `CREDITS.md`

The stack is unchanged: static HTML/CSS/vanilla ES modules plus vendored Three.js. **No new dependencies.** A dev-only readability script was added at `tools/readability.py`; it isn't loaded by the game.

## Summary
- **What changed for players:**
  - **Neuron Relay** is a 5-level game that teaches threshold, timing, teamwork, stop signals and rest time by playing them.
  - **Every stop has levels or a challenge:** Brain Explorer gets Job Match, Reaction Lab gets Brain Choice, Memory Match gets 3 levels, Quiz Boss re-asks missed questions, and the Playhouse gets predictions on replays.
  - **Answers feel like a game:** a feedback sheet, spark bursts, a designed sound palette and in-session streaks.
  - **Progress:** a path map, 1–3 mastery stars, a badge dialog with "Next stop", a Brain Atlas sticker book, a short story frame, an optional Brain Warm-up on return visits, and read-aloud.
- **Science:** all flagged accuracy issues are fixed (S1–S5). The next neuron no longer "fires" from one input, the soma no longer drains, the refractory period and inhibition are taught, the practice path flows the right way, and the synapse is drawn as a gap.
- **Quality checks:**
  - Lighthouse Accessibility 100 and Best Practices 100 on all screens.
  - Lighthouse Performance 94–95 on the 2D screens; the Playhouse is limited by software WebGL in the test container.
  - No visible text under 16 px.
  - No interactive target under 44 px. Visually hidden switch inputs are excepted, because their whole 44 px label is the target.
  - No horizontal scroll at 360, 768 or 1280 px.
  - A full keyboard-only play-through passes.
  - No running animations under reduced motion.
  - No console errors.

## Status of every change ID

**Legend.** Done: built and acceptance criteria checked. Partial: built, but part of the criteria wasn't met or can't be verified here. Skipped: not built.

### Onboarding
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| ONB-01 | Done | Hero **Start your quest** button goes straight to Neuron Relay level 1 (2 taps, about 5 s to the first fire). Returning players see **Continue: next stop**. | `index.html`, `game.js` | The path was reordered so the neuron is stop 1 (flag F5). |
| ONB-02 | Done | Goal card: one sentence from Sparky (new `goalShort`). "Need a hint?" button, with the hint auto-shown after 12 s idle or 2 misses. Longer goal in "More about this". Text capped at 65ch. | `js/core.js`, `content.json`, `.pages.yml` | |
| ONB-03 | Done | Dendrite tips are the controls. They pulse on idle, are 44 px+ targets and are keyboard focusable. A "Send a message" button stays for keyboard and assistive tech. | `js/neuron.js` | |
| ONB-04 | Done | On phones: one-row top bar, Start button at 134 px, **first quest stop at 299 px** on 360×760 (was 501 px). Sparky's greeting follows the map. | `style.css` | |
| ONB-05 | Done | Locked learn cards are replaced by one chip. Cards rise in with an 80 ms stagger when earned. | `js/core.js`, `style.css` | |

### Core gameplay
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| CORE-01 | Done | 5 Neuron levels (threshold, timing, teamwork/spatial summation, stop signals/inhibition, rest time/refractory) with a level bar and unlocks. Stars 1/2/3 at levels 1/3/5. All levels verified winnable by script. | `js/neuron.js`, `content.json` (`neuronLevels`) | Only the spike and the rest ring block input, not the travelling wave. |
| CORE-02 | Done | The next neuron gains about 35% per spike and fires only past its own threshold. | `js/neuron.js` | Fixes S1. |
| CORE-03 | Done | Brain Explorer **Job Match**: drag, or tap a job then a region (keyboard path through the region buttons). Location clues on misses. The badge needs ≤2 misses. | `js/brain.js`, `content.json` (`job`, `jobIcon`) | |
| CORE-04 | Done | Reaction **Brain Choice** round: yellow ● press, purple ■ hold back. Averages shown as animated bars, and Sparky's line adapts. | `js/reaction.js` | One colour change per round; at least 1.2 s wait (flag F10). |
| CORE-05 | Done | Memory levels: pictures → picture + job → word + meaning. The board is sized to fit 1280×800 and 360×760. Two wide columns for word levels on phones. | `js/memory.js`, `content.json` (`memoryWords`, `memoryLevels`, `job`) | |
| CORE-06 | Done | Quiz re-asks a missed question 2 questions later ("Try this one again!"), with a 7-question cap. Boss energy bar. Stars by misses. Keys 1–3 answer. | `js/quiz.js` | |
| CORE-07 | Done | On Playhouse replays, 2–3 steps per scenario ask "Where does the signal go next?". Candidates are highlighted in 3D and 2D. Predictions set scenario stars. | `js/playhouse/*`, `playhouse.json` (`predictOptions`) | |
| CORE-08 | Done* | A one-question **Quick check** (tagged by stop via the `activity` field) runs before each first badge. | `js/quiz.js`, `js/core.js` | *Deviation: a wrong answer feeds the spaced review instead of reducing stars, so a slip doesn't take away a badge the kid just earned. |
| CORE-09 | Done | First Playhouse visit shows Back / Next / Autoplay / Restart. Speed, labels, 2D and camera tools are under "More controls" until a scenario is finished. | `js/playhouse/playhouse.js` | |

### Visual design system
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| VIS-01 | Done | The quest map is a glowing myelinated-axon SVG path through the stops, filled as stops are done in order. The next stop pulses and is tagged. | `game.js`, `style.css` | |
| VIS-02 | Partial | The play area now leads every screen (compact goal card, no placeholder cards, Sparky docked inside the play card). | `style.css`, `js/core.js` | The "≥55% of viewport" criterion wasn't measured on every screen. |
| VIS-03 | **Skipped** | n/a | n/a | Bespoke illustrated stop art needs illustrator-quality work (spec effort L, flag F12). Tiles keep the icon style. To finish: draw 6 original SVG spot illustrations (about 240×160, under 15 KB each) and add an `illustration` field. |
| VIS-04 | Done | Sparky moods: wave, think, cheer, oops, point. Blink every 4–7 s and an idle bob. | `js/core.js`, `style.css` | |
| VIS-05 | Done | A scripted scan finds no visible text under 16 px on any screen at 3 widths. | `style.css`, `js/neuron.js` | |
| VIS-06 | Done | Machado (2009) colour-vision simulation showed occipital vs cerebellum at ΔE 1.5 for deuteranopes. New occipital `#3d9df2`, cerebellum `#e0b8ff` and brainstem `#2bb8bd` raise the worst pair to ΔE 9.5 across normal, protan, deutan and tritan vision. | `style.css`, `anatomy.js`, `playhouse.json` | The research doc's guess (the coral/pink trio) turned out to be fine. |

### Animation and motion
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| ANIM-01 | Partial | Motion, colour, type, spacing, radius, shadow and z-index tokens. All shared UI transitions use them. | `style.css` | About 17 one-off keyframe lengths (card flip 450 ms, blink 140 ms, drift 18 s, confetti, and so on) stay literal. |
| ANIM-02 | Done | View Transitions API zoom between map and stop (320 ms). Plain fade fallback; none under reduced motion. | `game.js`, `style.css` | Chromium only (flag F13). |
| ANIM-03 | Done | The action potential is node states rest → fire → recover → rest, with a hop between nodes (saltatory). The soma resets instead of draining. | `js/neuron.js` | Fixes S2 and shows S3. |
| ANIM-04 | Done | Sparky blink and bob, a pulsing next-stop tile and dendrite tips, and 10 slow drifting dots. All off under reduced motion. | `js/core.js`, `game.js`, `style.css` | |
| ANIM-05 | Partial | Count-ups for reaction times, averages and quiz score (400 ms). Stars pop in sequence in the badge dialog. | `js/ui.js` | The "star flies to the map tile" FLIP animation wasn't built. |

### Feedback and juice
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| FBK-01 | Done | Bottom feedback sheet (good or oops, why, the right answer, Continue or Enter) for the quiz, quick checks, neuron and memory levels, Playhouse challenges and Brain Choice. | `js/ui.js` | |
| FBK-02 | Done | Spark burst (10–12 particles, 600 ms) plus chime plus button pop on correct answers. In-session "Signal streak ×N" from 3 in a row. | `js/ui.js`, `js/quiz.js` | No daily streaks (flag F2). |
| FBK-03 | Done | "Fire!" ring (400 ms), a pop label and a zap sound when threshold is crossed. | `js/neuron.js` | |
| FBK-04 | Done | Sparky is docked inside Neuron, Brain, Reaction, Memory and the Playhouse, reacting to events. | `js/core.js` (`dock`) | Quiz relies on the sheet instead. |
| FBK-05 | Done | Badge dialog: badge, stars, summary or story line, **Next: stop →** and Stay. Confetti stays inside the dialog. | `js/ui.js`, `js/core.js` | Also fixes BUG-01. |
| FBK-06 | Done | A specific cheer for all 20 questions (new `cheer` field). Generic cheers no longer repeat back to back. | `content.json`, `js/core.js` | |

### Educational content and formatting
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| EDU-01 | Done | S1 (CORE-02), S2 (ANIM-03), S3 (CORE-01 level 5), S4 (practice path now frontal → motor), S5 (synapse drawn as a gap with a cupped postsynaptic membrane). | `js/neuron.js`, `playhouse.json` | |
| EDU-02 | Partial | 74 blocks rewritten, at most 2 sentences each. FK grades: what happened 5.0, real life 4.0, regions 4.6, quiz explanations 4.6, Playhouse steps 4.9, fun facts 4.5. | `content.json`, `playhouse.json`, `tools/readability.py` | Neuron stages (6.1) and glossary (5.8) stay above target because they carry required terms (neurotransmitter, action potential). The sentences are short (7.6–12 words). |
| EDU-03 | Partial | "Read to me" option plus 🔊 buttons on goals, levels, questions, steps and learn cards. Docked Sparky and tooltips read aloud. **Uses only on-device voices** (flag F6: some Chrome voices are network voices). | `js/core.js`, `index.html` | Not heard on a real device: the test container has no speech voices. The option shows a note and disables itself when no local voice exists. |
| EDU-04 | Done | Reaction loop shortened, and "What happened?" points at it. The Playhouse intro is dropped where the goal already says it. | `content.json`, `js/reaction.js`, `playhouse.js` | |
| EDU-05 | Done | Learner-paced Playhouse with a big Next button. Optional Autoplay waits max(8 s, 0.5 s per word). Numbered rail with %. Fun fact in a disclosure. | `js/playhouse/playhouse.js` | Fixes BUG-09. |
| EDU-06 | Done | 35 glossary terms show a picture in their tooltip (new `icon` field). | `content.json`, `js/core.js` | Exceeds the 20 required. |
| EDU-07 | Partial | Scientist mode (Options) shows a membrane-voltage readout in Neuron Relay: about −70 / −55 / +30 mV (OpenStax A&P 2e §12.4), labelled "about". | `js/neuron.js` | Not added to the Playhouse. |
| EDU-08 | Done | Mystery hook plus "Mystery solved" answer for all 6 scenarios (new `hook` and `hookAnswer` fields). | `playhouse.json` | |

### Progression and motivation
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| PRG-01 | Done | 1–3 mastery stars per stop and per scenario, shown on the map, badge cards and certificate. Old saves migrate (true → 1 star). | `js/core.js`, all activities | No XP (flag F1). |
| PRG-02 | Done | Start/Continue button, a "Next" tag, and the dialog's Next stop. | `game.js` | |
| PRG-03 | Done | **Brain Atlas**: 32 stickers that unlock only on correct identification (Job Match, predictions, challenges). | `js/atlas.js`, `index.html` | |
| PRG-04 | Done | Local Leitner review (0/1/3/7/14 days). On a return ≥20 h later, an optional 3-question **Brain Warm-up**. No streak counts and no penalty. | `js/quiz.js`, `game.js` | |
| PRG-05 | Done | "Sparky's Big Delivery" story: hello, per-station `storyIn` / `storyOut`, and "Message delivered to Brain HQ!" on the certificate. | `content.json`, `game.js`, `js/core.js` | |
| PRG-06 | Done | **Myelin boost** unlocks with 3 Neuron stars and speeds up Playhouse signals (accurate: myelin speeds conduction). | `js/playhouse/playhouse.js` | Also covers the brief's "unlockables" (flag F3). |

### Audio
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| AUD-01 | Partial | Synthesized palette (tick, bloop, zap, pops, chime, bonk, fanfare, star notes). Volume slider (remembered). Optional calm ambient hum, off by default. | `js/core.js`, `index.html` | The spec's "listening test with 3 kids" can't be done here. |
| AUD-02 | Done | Sparky asks once, "Want sound effects?". The answer is remembered. No audio before a gesture. | `game.js` | |
| AUD-03 | Done | See EDU-03. | | |

### Accessibility
| ID | Status | What was built | Files | Notes |
|---|---|---|---|---|
| A11Y-01 | Partial | See EDU-03. | | |
| A11Y-02 | Done | 44 px minimum targets (`--target`), and 56 px buttons on touch screens. The scripted scan is clean. | `style.css` | |
| A11Y-03 | Done | Text blocks capped at 65ch. | `style.css` | |
| A11Y-04 | Partial | Manual screen-reader test script written. | `docs/A11Y-TEST.md` | No NVDA or VoiceOver in this container (flag F11). |
| A11Y-05 | Done | Shape plus colour on Brain Choice lamps. Numbered keys on predictions and answers. ✓ / ✕ plus text on every result. | | |

### Mobile and responsive
| ID | Status | What was built | Notes |
|---|---|---|---|
| MOB-01 | Done | See ONB-04. | |
| MOB-02 | Done | The Playhouse picker becomes a swipe strip. The 3D/2D view stays pinned (46vh) while reading steps. | |
| MOB-03 | Done | Vertical neuron layout on phones (dendrites on top, shortened axon), with no sideways scroll. | |
| MOB-04 | Done | See CORE-05. | |

### Performance
| ID | Status | What was built | Notes |
|---|---|---|---|
| PERF-01 | Done | Playhouse data moved to `playhouse.json` (lazy), with a second Pages CMS entry. Nothing on the home screen requests it. | |
| PERF-02 | Done* | Intent-based prefetch of the 3D code (pointer or focus on the Playhouse tile, or after the first badge), skipped on Save-Data or under 4 GB of memory. | *Deviation: the spec's idle-time prefetch was measured to push home LCP from 3.0 s to 7.0 s (Lighthouse 75) on simulated slow 4G, so it was changed. |
| PERF-03 | Partial | If 3D stays under 24 fps at pixel ratio 1 for 3 s, it switches to 2D and remembers that (switchable back). | Real Chromebook and tablet testing not possible here (flag F11). |

### Bugs and polish
| ID | Status | Fix |
|---|---|---|
| BUG-01 | Done | `clearTransient()` on every route change, plus the badge dialog instead of the leaking toast. |
| BUG-02 | Done | The memory board fits the screen. |
| BUG-03 | Done | CORE-02. |
| BUG-04 | Done | ANIM-03. |
| BUG-05 | Done | Practice path reordered. |
| BUG-06 | Done | EDU-04. |
| BUG-07 | Done | MOB-02. |
| BUG-08 | Done | 65ch measure. |
| BUG-09 | Done | EDU-05. |
| BUG-10 | Done | Quiz stars come from misses, and the dialog copy states the score ("You answered 2 of 4 with 3 misses"). |
| BUG-11 | Done | EDU-01 S5. |
| BUG-12 | Done | VIS-05. |

## Deviations from the spec (and why)
1. **No XP, no daily streaks** (brief vs spec P13/F1/F2). Stars measure mastery, and streaks exist only inside a session. This is the evidence-based choice for ages 8–12 (Deci et al. 1999).
2. **Path order:** Neuron Relay is now stop 1 (F5), so a new player is playing within seconds.
3. **CORE-08:** the quick-check result feeds spaced review, not stars.
4. **PERF-02:** intent-based prefetch, because idle prefetch hurt LCP badly.
5. **VIS-06:** the actual colour-blind risk was occipital vs cerebellum, not the coral/pink trio the research doc guessed.
6. **Ambient audio** (brief): built, but off by default and separate from effects (F4).
7. **Unlockable cosmetics** (brief): replaced by the functional Myelin boost unlock plus collectible Atlas stickers (F3).

## Before and after screenshots
All are in `docs/before-after/`.

| Screen | Before | After (1280) | After (360) |
|---|---|---|---|
| Home | `before-01-home-above-fold.jpg` | `after-1280-home.jpg`, `after-1280-home-progress.jpg` | `after-360-home.jpg` |
| Neuron Relay | `before-07-neuron-start.jpg`, `before-09-neuron-ap.jpg` | `after-1280-neuron.jpg` | `after-360-neuron.jpg` |
| Brain Explorer | `before-03-brain-start.jpg` | `after-1280-brain.jpg` | `after-360-brain.jpg` |
| Reaction Lab | `before-12-reaction-start.jpg`, `before-16-reaction-loop.jpg` | `after-1280-reaction.jpg` | `after-360-reaction.jpg` |
| Memory Match | `before-18-memory-two-up.jpg`, `before-31-mobile-memory.jpg` | `after-1280-memory.jpg` | `after-360-memory.jpg` |
| Quiz Boss | `before-19-quiz-question.jpg`, `before-20-quiz-wrong-feedback.jpg` | `after-1280-quiz.jpg` | `after-360-quiz.jpg` |
| Playhouse | `before-21-playhouse-3d.jpg`, `before-30-mobile-playhouse.jpg` | `after-1280-playhouse.jpg` | `after-360-playhouse.jpg` |
| Certificate | `before-25-certificate.jpg` | `after-1280-certificate.jpg` | `after-360-certificate.jpg` |
| Atlas (new) | — | `after-1280-atlas.jpg` | `after-360-atlas.jpg` |

768 px captures are `after-768-*.jpg`.

## Test results
- **Play-throughs:** scripted first-time and returning-player runs at 1280, 768 and 360 px.
  - Keyboard-only completion of all six stops (stars `{neuron:1, brain:2, reaction:1, memory:1, quiz:1, playhouse:1}`, 6 Atlas stickers).
  - All 5 Neuron levels, all 3 Memory levels and both Reaction parts were completed by script.
  - Quiz re-ask and warm-up scheduling verified.
- **Reduced motion:** no running CSS animations on Home, Neuron or Playhouse. The Playhouse opens in 2D.
- **Console:** 0 errors across every run. Software-GL "GPU stall" driver warnings come from the headless renderer only.
- **Lighthouse (desktop, local server, simulated slow 4G):**
  - Home 95 / 100 / 100 (Performance / Accessibility / Best Practices).
  - Neuron 95 / 100 / 100. Quiz 94 / 100 / 100.
  - Brain, Reaction, Memory and Atlas: 100 Accessibility and 100 Best Practices (measured before the prefetch fix, when Performance was 75; the fix applies equally).
  - Playhouse: 44 / 100 / 100. The cause is software WebGL rendering under 4× CPU throttling, plus about 690 KB of Three.js (171 KB gzipped) loaded on demand.
- **Frame rate:** the 3D Playhouse ran at 25–48 fps on *software* rendering in the container. It isn't measured on a real GPU.

## Known issues and next steps
1. **Real-device checks:** run the Playhouse on a school Chromebook and a low-cost tablet (PERF-03). The automatic 2D switch protects slow devices, but frame rates on real GPUs are unknown.
2. **Screen-reader pass:** follow `docs/A11Y-TEST.md` with NVDA and VoiceOver (A11Y-04).
3. **Read to me:** listen on a device with local voices (Windows and macOS have them; ChromeOS varies) (EDU-03).
4. **Playtest with 3–5 kids aged 8–12:**
   - Neuron level 3 ("Teamwork") and level 5 ("Rest time") difficulty.
   - Sound palette comfort (AUD-01).
   - Whether Job Match clues are enough.
5. **Unfinished items:**
   - VIS-03 illustrated stop art (Skipped).
   - ANIM-05 star fly-to-map.
   - EDU-07 Scientist mode in the Playhouse.
   - The remaining literal keyframe durations (ANIM-01).
6. **Pages CMS:** the new fields are in `.pages.yml` and validated as JSON/YAML against both content files, but haven't been opened in the Pages CMS editor UI. The new `playhouse.json` needs the `cloudflare-live` / Pages CMS branch to include this work before it can be edited there.
7. **Deployment:** the earlier Cloudflare Pages and Pages CMS setup is still pending on the user's side. This branch isn't merged into `cloudflare-live` or `main`.

## Design system
See `docs/DESIGN-SYSTEM.md` for tokens (colour, type, spacing, radii, shadows, layers, motion), components (Button, Chip, Card, Progress/Rail, Feedback sheet, Modal, Stars, Bubble/Sparky, Tooltip, Toast, Particles) and motion and sound standards.
