# Brain Signal Quest design system

The single source of truth is the `:root` block at the top of `style.css`. Use these tokens and components for all new work; avoid raw values.

## Tokens

### Colour
| Token | Value | Use |
|---|---|---|
| `--night-900 / 800 / 700 / 600 / 400` | `#0a1229 / #0d1733 / #16224a / #22336a / #4b5f9e` | App chrome, dark surfaces, borders on dark |
| `--on-night`, `--on-night-soft` | `#eef2ff`, `#cfd8ff` | Text on dark |
| `--paper`, `--paper-2`, `--white` | `#fffaf0`, `#f4eee0`, `#ffffff` | Reading surfaces |
| `--ink`, `--ink-soft` | `#17203d` (15.4:1 on paper), `#3c4668` (8.9:1) | Text on light |
| `--glow`, `--spark` | `#7cf7ff`, `#ffe066` | Signal accent; primary buttons and focus on dark |
| `--accent` | `#6b2fd6` | Focus ring and emphasis on light |
| `--good`, `--good-text`, `--good-bg` | `#1f8a52`, `#17703f` (5.4:1), `#dcf6e6` | Correct. Use `--good-text` for text on `--good-bg`. |
| `--oops`, `--oops-bg` | `#a24a00` (5.0:1), `#ffe8d1` | Try again (never alarm red) |
| `--gold`, `--gold-deep` | `#f2a900`, `#8a5a00` | Stars, badges |
| Regions `--r-*` | frontal `#ff8a5b`, parietal `#ffcf4a`, temporal `#69d68c`, occipital `#3d9df2`, cerebellum `#e0b8ff`, brainstem `#2bb8bd`, thalamus `#ff8fcf`, hippocampus `#b9f26a`, amygdala `#ff5c7a`, cerebrum `#9aa8ff` | Always paired with a text label. Worst pair is ΔE ≥ 9.5 under protan, deutan and tritan simulation. |
| Neuron states `--n-*` | rest `#5a6fd8`, fire `#ffe066`, recover `#c08cff`, inhibit `#5fb4ff` | Action potential and stop messages |

Keep `js/playhouse/anatomy.js` `REGION_COLORS` and the `playhouse.json` colours in sync with the region tokens.

### Type (1.25 scale; nothing visible under 16 px)
`--t-xs` 1rem · `--t-body` 1.125rem · `--t-lg` 1.25rem · `--t-h4` 1.5rem · `--t-h3` up to 1.875rem · `--t-h2` up to 2.375rem · `--t-h1` up to 3.5rem.
Fredoka 600 for headings and Atkinson Hyperlegible 400/700 for body text. Line length is capped at `--measure` (65ch).

### Spacing, radii, shadows, layers
- **Spacing:** `--s-1…--s-8` = 4, 8, 12, 16, 24, 32, 48, 64 px.
- **Radii:** `--rad-xs` 8, `--rad-s` 12, `--rad-btn` 14, `--rad` 20, `--rad-l` 28, `--rad-pill`.
- **Shadows:** `--shadow-press` (0 4px 0 ink, for pressable controls), `--shadow-press-hover`, `--shadow-press-down`, `--shadow-card`, `--shadow-pop`.
- **Layers:** `--z-sticky` 20 < `--z-tooltip` 60 < `--z-celebrate` 65 < `--z-toast` 70 < `--z-sheet` 75 < `--z-modal` 80.
- **Targets:** `--target` 44 px minimum. `--btn-h` is 52 px, or 56 px on touch screens (`pointer: coarse`).

## Components
| Component | Class / helper | Notes |
|---|---|---|
| Button | `.btn`, `.btn-secondary`, `.btn-big`, `.btn-huge`, `.btn-icon`, `.btn-good`, `.btn-oops` | Hover lifts 2 px. Press squashes (`translateY(3px) scaleY(.97)`, 90 ms). Disabled is 55% opacity. |
| Chip | `.chip` | Top-bar tools and toggles, 44 px tall |
| Card | `.surface`, `.play-card`, `.goal-card`, `.learn-card` | Paper, 20 px radius, card shadow |
| Progress | `.progress` and `.progress-fill`; `.rail`, `.rail-track`, `.rail-fill`, `.rail-label` | Fill animates over 600 ms / 240 ms |
| Feedback sheet | `feedbackSheet({good, title, lines, streak, cta})` in `js/ui.js` | Bottom sheet that resolves on Continue or Enter. `role=status`. |
| Modal | `badgeDialog({...})`; `.modal` and `.modal-card` | Native `<dialog>` (focus trap, Esc closes), enters with `--ease-pop` |
| Stars | `starsRow(n, {large})` | `role=img` with a label like "2 of 3 stars" |
| Bubble / Sparky | `guide()`, `dock()`, `sparky({mood})`, `setMood(el, mood, ms)` | Moods: wave, think, cheer, oops, point. Blinks every 4–7 s. Bobs over 2.4 s. |
| Tooltip | `.term` and `#term-pop` via `rich()` | Opens on hover, focus or tap; Esc closes. Shows a picture if `glossary[].icon` is set. |
| Toast | `toast(text)` | 3.2 s. Cleared on every route change. |
| Particles | `sparkBurst(el, n)`, `celebrate()` | 600 ms. Off under reduced motion. |
| Micro-motion | `pop(el)`, `shake(el)`, `countUp(el, n)` | 250 ms / 240 ms / 400 ms |

## Motion standards
| Token | Value | Use |
|---|---|---|
| `--dur-press` | 90 ms | Button press |
| `--dur-quick` | 160 ms | Hover, toggles |
| `--dur-base` | 240 ms | Sheets, small moves |
| `--dur-enter` | 320 ms | Screen or modal entrance, view transitions |
| `--dur-celebrate` | 600 ms | Bursts, stars, count-ups |
| `--dur-idle` | 1.6 s | Idle "tap me" pulses |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Default for entrances |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | Exits |
| `--ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | Badges, check marks |
| `--ease-inout` | `cubic-bezier(.65,0,.35,1)` | Loops, camera |

**Rules:**
- Animate only `transform` and `opacity` (plus SVG `fill` for neuron states).
- Feedback must start within 100 ms.
- Idle loops run at 1.6 s or slower. Nothing flashes more than 3 times per second.
- **Reduced motion:** no movement at all; state changes use ≤150 ms opacity fades instead. Particles, drift and idle loops are removed. The Playhouse starts in 2D, and camera moves snap.

## Sound palette (`SOUNDS` in `js/core.js`, Web Audio, synthesized)
| Sound | Design |
|---|---|
| `tick` | 1.2 kHz sine, 40 ms |
| `bloop` | 500 → 700 Hz glide, 120 ms |
| `fire` | Saw sweep 300 → 900 Hz + noise + click, 250 ms |
| `pops` | 3 detuned sine pops |
| `good` | C5 → E5, then G6 sparkle |
| `oops` | 220 → 196 Hz soft sine |
| `win` | C5-E5-G5-C6 arpeggio plus shimmer |
| `star0–2` | G5 / B5 / D6 bells |

The master gain follows the volume slider. Sound is off until the player says yes. The optional ambient pad (C3-G3-B3 sines with slow movement) is off by default.
