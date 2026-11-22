# Manual accessibility test script (A11Y-04)

Automated checks pass:
- Lighthouse Accessibility is 100 on every screen.
- A scripted scan found no visible text under 16 px, no tap targets under 44 px (apart from visually hidden switch inputs, whose whole 44 px labels are the targets), and no horizontal scroll at 360, 768 or 1280 px.
- A full keyboard-only play-through of all six stops completed.

This script covers what only a person with a screen reader can confirm. Run it with **NVDA + Chrome (Windows)** and **VoiceOver + Safari (iPad)**, and record pass or fail with notes.

| # | Where | Steps | Expected |
|---|---|---|---|
| 1 | Home | Load the page and Tab once | "Skip to the game" is announced. Then "Brain Signal Quest home" and the top-bar chips follow, then "Start your quest". |
| 2 | Home | Answer Sparky's sound question | The choice is announced. The sound chip's pressed state changes. |
| 3 | Neuron Relay | Tab to "Dendrite 1: send a message" and press Enter three times | Status messages announce the charge. The feedback sheet announces "Level 1 complete", and focus lands on its button. |
| 4 | Neuron Relay | On level 4, Tab to the stop-message dendrite | Its name says "stop message (lowers the charge)". |
| 5 | Badge dialog | Finish any level 1 | The quick-check dialog traps focus. Answering with 1–3 works. The badge dialog announces its title, badge and stars. Esc closes it. |
| 6 | Brain Explorer | Use the region buttons. Then Job Match: Enter a job, then Enter a region button | The fact card is announced (polite). Sparky's clue on a wrong match is announced. A placed job reads "✓ Frontal lobe". |
| 7 | Reaction Lab | Start a round and wait | "The lamp is on!" is announced. In Brain Choice, the purple lamp is announced as "do not press". |
| 8 | Memory Match | Flip cards with Enter | Each card reads "Card N, face down" or "Card N, Eye". Matched cards say "matched". |
| 9 | Quiz Boss | Answer with the number keys | The sheet announces Correct or Try again, with the explanation. Focus moves to Continue. "Try this one again!" is announced on a re-ask. |
| 10 | Playhouse | Next through the steps; open "More controls" | The step card is announced (aria-live). The canvas or diagram label describes the highlighted part. Predict buttons are reachable. |
| 11 | Glossary terms | Tab to a dotted word | The definition is announced through `aria-describedby`. Esc closes it. |
| 12 | Read to me | Turn it on in Options (if the device has a voice) | 🔊 buttons appear. They read text without the screen reader fighting the speech. Navigating away stops the speech. |
| 13 | Zoom | Browser zoom to 200% on 1280 px | No content is lost and nothing overlaps. Controls stay usable. |
| 14 | Reduced motion | Turn on the OS reduce-motion setting | No moving animations. The Playhouse opens in 2D. The neuron shows colour states only. |
