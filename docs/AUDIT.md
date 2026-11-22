# Phase 1 audit: Brain Signal Quest (before the redesign)

Tested on the live site (https://zahmed13-spec.github.io/brain-signal-quest/) in Chromium at 1280×900 and 390×844, playing every activity: brain map, signal trail, reaction game, memory match and quiz.

## What works
- No console errors or warnings, and no horizontal scrolling at 390px.
- Every button does something. There is a skip link, a visible focus ring, `role="status"` live regions and a reduced-motion rule.
- Privacy is already good: no accounts, analytics, cookies or third-party requests.
- The text that exists is accurate and carefully hedged.

## What's broken or confusing
- **Brain diagram:** the cerebellum is almost completely hidden behind the cerebrum blob, so its label reads "erebellum". The whole diagram is `aria-hidden` and can't be clicked. It doesn't look like a brain (no lobes, no front or back), so kids can't tell which way it faces.
- **Neuron "signal trail":** this is a row of text chips, not a model. You never see a signal move, and there's no axon, myelin or synapse to look at.
- **Reaction:** works, but after a result it only shows a number. It never explains the eye → brain → muscle loop it says it's teaching. There's a single round with no average. (Holding Enter auto-repeats the key and can trigger a "too early" result.)
- **Memory:** the cards are 4 word pairs with no pictures. Matched cards look almost the same as unmatched ones (pale lilac vs pale green), and there's no move counter.
- **Quiz:** always the same 4 questions in the same order. After answering, nothing shows which choice was right. The buttons are only `aria-disabled` and look unchanged. Question 4 ("What might change your reaction game score?") is about the app, not the brain.
- The "Start exploring" link only scrolls. There's no sense of a journey or of being finished.

## Weak content for ages 8–12
- Only 3 brain regions (cerebrum, cerebellum, brainstem). There are no lobes, senses or inner structures (thalamus, hippocampus, amygdala).
- The glossary has only 3 terms, and science words in the text aren't explained where they appear.
- Few "Did you know?" moments, few real-life examples, and no stories (seeing, hearing, touching).
- Only 3 sources (all BrainFacts).

## Visual models
- Brain: three overlapping CSS blobs. They are not recognisable and not labelled reliably.
- Neuron: none.

## Compared with good educational games, it's missing
- A home "map" of activities with progress (stars or badges).
- A guide character who gives hints and cheers.
- Feedback loops: celebratory micro-animations, gentle "try again" messages that explain why, and a sense of completion (certificate).
- A consistent structure per activity: goal → play → what just happened → real life → reward.
- Optional sound.

## Accessibility and performance
- Contrast is fine. Focus is visible.
- The diagram carries no accessible information (`aria-hidden`), and the quiz doesn't expose which answer was right.
- Body text is about 17.6px (OK). The diagram labels are small.
- The site uses the system font only. Performance is trivially fine (18 KB total).
