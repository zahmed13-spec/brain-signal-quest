# Implementation plan: competitive upgrade

Branch: `feature/competitive-upgrade` (from `research-design-review`, which holds the current game and the spec).
Spec: `BRAIN_SIGNAL_QUEST_RESEARCH_AND_CHANGES.md` (§7 change list, §9 design system, §10 Do-NOT-change).
Audience: ages 8–12. Stack: unchanged (static HTML/CSS/vanilla ES modules, vendored Three.js). **No new dependencies.**

## Step 0 baseline (before any change)

- The full scripted play-through passes: 6/6 stars, certificate, 2 Playhouse challenges, **0 console errors**.
- Known existing bugs are BUG-01…BUG-12 in the spec (toast and confetti leak across screens, the memory board overflows 1280×800, the next neuron "fires" from one input, the soma drains, the reversed practice-path arrow, Playhouse autoplay is too fast, and so on).
- "Before" screenshots: `docs/before-after/before-*.jpg`.

## Order of work

### 0. Foundation (design system first; everything else uses it)
1. **Tokens** in `style.css` `:root`: colours (with the AA-safe `--good-text`), type scale, spacing, radii, shadows, z-index layers, motion durations and easings (spec §9). **ANIM-01**
2. **Components**: `.btn` (primary/secondary/ghost/icon; hover lift, press squash, disabled), `.card`, modal (`dialog`), progress bar/rail, feedback sheet, Sparky bubble, tooltip. JS helpers in `js/ui.js`: `feedbackSheet()`, `badgeDialog()`, `sparkBurst()`, `countUp()`, `shake()`.
3. Replace hard-coded values across the CSS with tokens. Text minimum 16 px (**VIS-05**), 44 px targets (**A11Y-02**), 65ch line length (**A11Y-03**).

### A. Quick wins
- **Science:** EDU-01 (S4 path order, S5 synapse drawing) → CORE-02 (next neuron partial charge).
- **Bugs:** BUG-01 (celebration leak) → superseded by FBK-05 (badge dialog). BUG-02 (memory fits the viewport).
- **Pacing:** EDU-05 (learner-paced Playhouse steps + progress rail).
- **Onboarding:** ONB-02 (1-sentence goal, hint on demand) → ONB-05 (hide locked cards) → ONB-04 (mobile hero).
- **Juice:** FBK-02 (spark burst + in-session streak) → FBK-03 (Fire! moment) → FBK-05 (badge dialog) → FBK-06 (specific cheers).
- **Motion:** ANIM-04 (idle invitations).
- **Audio:** AUD-01 (sound palette, volume) → AUD-02 (ask once).
- **Flow:** PRG-02 (Continue button), PERF-01 (split `playhouse.json`), EDU-04 (merge duplicate text).

### B. Core upgrades
- **Neuron:** ANIM-03 (accurate AP wave) → CORE-01 (5 Neuron levels) → ONB-03 (tap dendrites).
- **Feedback:** FBK-01 (feedback sheet everywhere) → CORE-06 (quiz re-ask + boss bar) → CORE-08 (check before badge).
- **Activities:** CORE-03 (Brain Job Match), CORE-05 (Memory levels), CORE-04 (Reaction choice round), CORE-07 (Playhouse predict), CORE-09 (Playhouse guided first run).
- **Character:** VIS-04 (Sparky expressions) → FBK-04 (Sparky docked in play).
- **Progression:** PRG-01 (1–3 mastery stars, migrating old progress) → VIS-01 (path map) → ONB-01 (first-run Start) → PRG-04 (Brain Warm-up spaced review).
- **Reading:** EDU-02 (rewrite to grade ≤4.5) → EDU-03 / A11Y-01 (read-aloud).
- **Mobile:** MOB-02 (Playhouse) → MOB-03 (vertical neuron).
- **Performance:** PERF-03 (auto-2D tier).

### C. Big bets (as time allows, in this order)
EDU-08 (mystery hooks) → PRG-05 (story frame) → PRG-06 (Myelin boost) → EDU-07 (Scientist mode) → ANIM-05 (count-ups, star fly) → ANIM-02 (view transitions) → PRG-03 (Brain Atlas) → EDU-06 (glossary pictures) → VIS-06 (colour-blind check) → PERF-02 (prefetch) → VIS-03 (stop illustrations).

## Flags: deviations, risks and conflicts (decided before building)

| # | Item | Concern | Decision |
|---|---|---|---|
| F1 | Brief asks for **XP** | The spec recommends mastery stars, not points. XP inflation rewards participation over competence, which Deci et al. warn against for kids. | **No XP.** Use 1–3 mastery stars per activity and per scenario, plus a total star count on the path. |
| F2 | Brief asks for **streaks** | Spec P13: no loss-aversion streak guilt for ages 8–12. | **In-session "signal streak" combos only** (escalating celebration). Nothing daily, nothing persisted. |
| F3 | Brief asks for **unlockable cosmetics** | Not in the spec. Pure cosmetics tied to grinding can become extrinsic. | Use the spec's PRG-06 functional unlock (Myelin boost). Sparky colour themes unlock at star milestones *as competence markers*. Optional, small. |
| F4 | Brief asks for **ambient audio** | Classrooms; spec says music is optional and off. | Provide a soft generated ambient pad, **off by default**, with its own toggle. Nothing plays before a user gesture and consent (AUD-02). |
| F5 | **ONB-01** routes first-timers to Neuron Relay, but the map lists Brain Explorer as stop 1 | A conflict in order. | **Reorder the path:** 1 Neuron Relay → 2 Brain Explorer → 3 Reaction Lab → 4 Memory Match → 5 Brain Playhouse → 6 Quiz Boss. The neuron is the fastest route to play (under 15 s) and introduces the signal idea used everywhere else. Region keys are unchanged. |
| F6 | **EDU-03 read-aloud via `speechSynthesis`** | **Privacy risk:** in Chrome some voices (for example "Google US English") are *network* voices that send text to a server, which breaks the no-third-party-requests rule. | Use only voices with `localService === true`. If none exist, hide the feature and say why. |
| F7 | **EDU-02 rewriting to grade ≤4.5** | Risk of simplifying into wrong statements. | Rewrite only the long or hard fields. Re-check every changed sentence against the cited sources and keep the science terms (defined via the glossary). Measure FK with a dev script (`tools/readability.py`, not shipped to players). |
| F8 | **EDU-07 Scientist mode** numbers | Must be exact and sourced. | Use OpenStax A&P 2e §12.4 values (resting ≈ −70 mV, threshold ≈ −55 mV, peak ≈ +30 mV), labelled "about". |
| F9 | **CORE-01 level 5 "rest time" 1.5 s** | The real absolute refractory period is about 1–2 ms. | The on-screen copy says it's slowed down for the game ("real neurons rest for about a thousandth of a second"). |
| F10 | **CORE-04 choice reaction** | A flashing-light risk. | One colour change per round, a minimum 1.2 s wait, shape plus colour. No faster than the existing lamp. |
| F11 | **PERF-03 real devices**, **A11Y-04 manual screen reader** | No physical Chromebook, tablet, NVDA or VoiceOver in this container. | Build the automatic 2D fallback tier and an accessibility test script. **Mark both Partial**, with exact steps to finish. |
| F12 | **VIS-03 illustrated stop art** (L) | Large art effort; quality risk if rushed. | Do it last. If time is short, ship Sparky-pose spot illustrations per stop and mark it Partial. |
| F13 | **ANIM-02 View Transitions** | Not supported in Firefox. | Progressive enhancement; keep the current fade as the fallback. |
| F14 | **PERF-01 split JSON** | Pages CMS needs a second content entry. | Add a `playhouse_content` entry to `.pages.yml`. Also keep supporting an embedded `content.playhouse` (fallback) so old edits don't break. |
| F15 | Brief says "≤2 short sentences per text block" | The spec allows 2–3. | Adopt the stricter brief: **≤2 sentences** for new and rewritten blocks. |

## Commit convention

`<ID>: <what>`, for example `CORE-02: next neuron only partially charges from one input`. Foundation commits use `ANIM-01/VIS-05/...`. No force-push; history is preserved.

## Test gates (after each phase)

- **Play-through:** the scripted first-time and returning-player play-through (desktop 1280, tablet 768, phone 360) passes, with keyboard-only and reduced-motion runs. 0 console errors.
- **Acceptance criteria:** checked per change ID.
- **Frame rate:** spot-checked on the heaviest animation (software GL caveat).
- **Screenshots:** before and after go to `docs/before-after/`.
