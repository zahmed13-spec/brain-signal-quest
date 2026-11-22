# Phase 2 design brief: Brain Signal Quest

## What I studied (Nov 2026)
PBS KIDS Games, NASA Space Place, Duolingo, ABCya, National Geographic Kids, BrainPOP, Prodigy and PhET (Neuron sim), plus BrainFacts.org (For Educators and 3D Brain) and Neuroscience for Kids (Chudler, UW) for content tone. Khan Academy Kids blocked automated loading, so I only used what I already knew about its patterns.

| Site | Pattern worth borrowing (the idea, not the art) |
|---|---|
| NASA Space Place | Dark "night sky" background with big rounded, colour-coded topic tiles. Each topic keeps its colour everywhere. A short glossary for science words. |
| PBS KIDS | Huge rounded buttons and one obvious PLAY action per screen. A character greets you. Very little text. |
| Duolingo | A learning *path* with clear progress. Chunky buttons with a "pressed" bottom edge. Green = correct, warm orange = try again (not scary red). Small celebratory bursts. A rounded, friendly typeface. |
| ABCya | Mascots on a dark field. Bold, rounded display type for headings and plain legible body text. |
| Nat Geo Kids | Short punchy "Did you know?" style facts and real-life hooks. |
| BrainPOP | A character-led explanation followed by a quiz that explains each answer. |
| PhET Neuron | Play / pause / step / speed controls let kids slow a process down and watch it happen. |
| Prodigy | Rewards (stars or badges) tied to finishing a learning goal, not to speed. |

## Patterns I'm using, and why
1. **Night-brain palette.** Deep navy chrome (`#0d1733`) with glowing cyan "signal" accents, and light cream cards for reading text (dark ink on light gives AA contrast and easy reading).
2. **One colour per brain region, used everywhere.** The diagram, fact cards, 3D lobes, memory cards and the Playhouse share the same colour (frontal = coral, parietal = yellow, temporal = green, occipital = blue, cerebellum = purple, brainstem = teal, thalamus = pink, hippocampus = lime, amygdala = rose). Colour is never the *only* cue: every coloured thing also has a text label.
3. **Typography.** Fredoka (rounded, friendly) for headings, and Atkinson Hyperlegible (designed by the Braille Institute for low-vision readers) for body text at 18px. Both are self-hosted under the OFL.
4. **Quest map home.** A winding path of 6 big illustrated tiles (Brain Explorer → Neuron Relay → Reaction Lab → Memory Match → Brain Playhouse → Quiz Boss) with star badges saved in `localStorage`. A certificate unlocks at the end.
5. **Guide character "Sparky".** An original SVG neuron: round cell body with a face, dendrite "hair", and a myelin-striped axon tail. Sparky introduces each activity, gives hints and cheers. Speech bubbles are short (1–2 sentences).
6. **Same lesson shape everywhere:** 🎯 goal → interactive part → "What just happened?" → "Brain in real life" → badge. Text chunks are 2–3 short sentences.
7. **Inline glossary.** Every science word becomes a dotted-underline button that opens a short definition (works by hover, focus, tap and keyboard).
8. **Feedback.** Green check + "Yes!" for correct. Warm orange + an explanation of *why* for a wrong answer ("Not quite — the cerebellum is..."). Short CSS sparkle bursts (skipped under reduced motion). Sound is generated with WebAudio, **muted by default**, with a clear toggle.
9. **Show, then tell.** Kids trigger the neuron or Playhouse animation first. The explanation follows. Step controls (PhET-style) let kids go at their own pace.
10. **Safety and accessibility first.** No flashing. The reaction cue is one slow colour change, and the Playhouse pulse runs at about 1 Hz or slower. Full keyboard play, visible focus rings, and reduced motion swaps to a static 2D path. Everything works without sound.

## What I'm deliberately *not* doing
No copying of any logo, character, artwork, name or exact layout from the sites above. No ads, sign-ups, leaderboards or timers that pressure kids. No third-party requests at all.
