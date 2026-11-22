// Brain Atlas sticker book (PRG-03): one sticker per brain region and Playhouse structure.
// A sticker unlocks only when the player identifies that part correctly (Job Match, Playhouse
// predictions and challenges). Stored as a list of ids on this device; no personal data.
import { $, el, store, toast, sound } from './core.js';

const SKIP = new Set(['ball']); // not a body part
let entries = null; let byId = new Map();

/** Build the sticker list from regions (content.json) + Playhouse structures (playhouse.json). */
export async function loadAtlas(content) {
  if (entries) return entries;
  let ph = content.playhouse;
  if (!ph) { try { const r = await fetch('playhouse.json'); ph = r.ok ? await r.json() : null; } catch { ph = null; } }
  const list = content.regions.filter((r) => r.key !== 'cerebrum').map((r) => ({ id: r.key, name: r.name, about: r.description.split(/(?<=[.!?])\s/)[0], color: `var(--r-${r.key})` }));
  const seen = new Set(list.map((x) => x.id));
  for (const s of ph?.structures || []) {
    if (SKIP.has(s.id) || seen.has(s.id) || (s.region && seen.has(s.region) && s.name.toLowerCase().includes(s.region))) continue;
    seen.add(s.id); list.push({ id: s.id, name: s.name, about: s.about, color: s.color });
  }
  entries = list; byId = new Map(list.map((e) => [e.id, e]));
  return entries;
}

/** Unlock a sticker (if it exists and is new) with a small celebration. */
export function unlockSticker(id) {
  if (entries && !byId.has(id)) return;
  if (store.addAtlas(id)) { sound.play('star1'); toast(`New Brain Atlas sticker: ${byId.get(id)?.name || id}!`); }
}

export async function renderAtlas(content) {
  const list = await loadAtlas(content);
  const grid = $('#atlas-grid'); grid.replaceChildren();
  const got = list.filter((e) => store.atlasHas(e.id)).length;
  $('#atlas-count').textContent = `${got} of ${list.length} stickers collected`;
  for (const e of list) {
    const has = store.atlasHas(e.id);
    grid.append(el('li', { class: 'sticker' + (has ? '' : ' locked'), style: { '--c': e.color } },
      el('span', { class: 'dot', 'aria-hidden': 'true' }), el('strong', { text: has ? e.name : '???' }),
      has ? el('p', { text: e.about }) : el('span', { class: 'sr-only', text: 'Locked' })));
  }
}
