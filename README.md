# Brain Signal Quest

A short browser-based neuroscience game for ages 8–12. Explore the brain’s major regions, trace a signal through a neuron, respond to a visual cue, match memory cards, and answer four explained quiz questions. The activities use HTML, CSS, JavaScript, and an editable JSON content file. They require no accounts and store no scores or personal data.

## Run locally

Run `python3 -m http.server 8000` in this folder, then visit http://localhost:8000. Use Tab to reach controls, and Enter or Space to activate buttons. The reaction activity is designed around a visual cue.

## GitHub Pages

Commit these files at the root of a public repository. In Settings → Pages, select **Deploy from a branch**, choose **main** and **/(root)**, and save. The site requires no build command. Open the URL shown in Pages and retest all five activities.

## Editing with Pages CMS

In Pages CMS, select this repository and the publishing branch after granting repository-specific access. Open **Learning content** to edit introductions, explanations, quiz items, glossary, sources, and credits. Keep the three region keys unchanged because they connect the content to the diagram. Every quiz item needs one correct choice, two different distractors, and an explanation. Use HTTPS source URLs. Preview changes locally before publishing. The game rules are in game.js, outside the CMS editor.

## Sources and credits

The glossary and links are in content.json. Sources include the Society for Neuroscience’s Brain Facts primer and BrainFacts explainers on synapses and learning. The schematic is made with CSS. Codex generated the code and initial curriculum with AI assistance. This project is a supplemental learning resource and does not establish independent applicant authorship.
