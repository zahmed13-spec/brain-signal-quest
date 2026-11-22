# Credits and licenses

## Original work (this project)
- **Code, game design and content:** Brain Signal Quest, made with AI assistance (Claude by Anthropic).
- **Illustrations:** the Sparky mascot and its expressions, the side-view brain, the neuron diagram, the icon sprite and the procedural low-poly 3D brain are original and drawn in code (SVG / Three.js geometry). No artwork was copied or traced from any other product.
- **Sound effects:** all synthesized at runtime with the Web Audio API (`SOUNDS` in `js/core.js`). There are no audio files, and no sounds were sampled from other games.
- **Text:** original, checked against the sources listed in `content.json → sources` (BrainFacts / Society for Neuroscience, NIH NINDS, Neuroscience for Kids, OpenStax Anatomy & Physiology 2e, Kenhub).

## Third-party files
| File(s) | Source | License |
|---|---|---|
| `vendor/three/three.module.min.js`, `vendor/three/addons/controls/OrbitControls.js` | [three.js](https://threejs.org) r170 (npm `three@0.170.0`) | MIT, see `vendor/three/LICENSE` |
| `fonts/fredoka-latin-wght-normal.woff2` | Fredoka (via Fontsource) | SIL Open Font License 1.1, see `fonts/OFL-Fredoka.txt` |
| `fonts/atkinson-hyperlegible-latin-{400,700}-normal.woff2` | Atkinson Hyperlegible by the Braille Institute (via Fontsource) | SIL Open Font License 1.1, see `fonts/OFL-AtkinsonHyperlegible.txt` |

## Design research
Competitor products were studied for design *principles* only (see `BRAIN_SIGNAL_QUEST_RESEARCH_AND_CHANGES.md`). None of their art, characters, logos, sounds or text are used. The screenshots in `research/screenshots/` are included for research commentary only.
