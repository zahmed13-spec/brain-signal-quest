# Brain Signal Quest

A five-mission neuroscience adventure for ages 8–12. Pick a stop, explore an illustrated model or play a short game, and collect a discovery. Complete all five stops to light up the station.

- Brain Atlas links three labeled regions to everyday situations.
- Signal Relay models incoming messages, an axon pulse, and chemical transmission.
- Beacon Arcade compares three cue-response rounds and includes untimed practice.
- Memory Vault has four- and six-pair illustrated decks.
- Mission Control gives a short explanation after every answer.

## Run and publish

Use `python3 -m http.server 8000` in the repository root and open [localhost:8000](http://localhost:8000). The site is plain HTML, CSS, SVG, JavaScript, and JSON. GitHub Pages serves the root of the publishing branch without a build. Direct links to missions use URL fragments, for example `#neuron`.

No accounts, analytics, or persistent storage are used. The adventure and scores reset on reload. Use Tab to move between controls and Space or Enter to activate them. An untimed reaction mode avoids comparing response times and still teaches how a cue leads to an action. The beacon has a visible text cue and an announced status. It is a game demonstration, and the timed mode is visual.

## Edit the curriculum with Pages CMS

Open **Learning content** for `content.json`. You can edit introductions, explanatory text, quiz prompts, glossary terms, references, and credits. Keep the three anatomy keys (`cerebrum`, `cerebellum`, `brainstem`) and all five signaling stages in their current order. Each quiz clue needs a correct answer, two different alternatives, and an explanation. Its optional icon key is one of `brain`, `balance`, `neuron`, `reaction`, `memory`, `synapse`, or `quiz`. Use HTTPS source links. Check the game locally after curriculum changes.

## Sources and credits

The game links to the Society for Neuroscience’s Brain Facts primer and BrainFacts explainers on anatomy, synapses, and memory. Graphics are project-original schematic artwork. Code, curriculum and artwork were developed with AI assistance.
