export const threshold = 4;
export const stageIds = ['arrival', 'release', 'crossing', 'binding', 'response'];
export const anatomyIds = ['dendrites', 'soma', 'nucleus', 'hillock', 'axon', 'myelin', 'nodes', 'terminals'];
export const discovery = (previous, id) => new Set([...previous, id]);
export const inputLevel = (previous, input) => Math.max(0, Math.min(8, previous + input));
export const predictsFiring = charge => charge >= threshold;
export const reactionAction = phase => ({ idle: 'wait', waiting: 'early', ready: 'record', complete: 'replay' })[phase];
export const pairAction = (locked, first, card) => locked || card.matched || first === card
  ? 'ignore' : !first ? 'reveal' : first.name === card.name ? 'match' : 'mismatch';
export const correctAnswer = (item, selected) => selected === item.correct;

export function valid(data, icons) {
  const has = (obj, keys) => keys.every(key => typeof obj?.[key] === 'string' && obj[key].trim());
  const rows = (items, fields, size = 1) => Array.isArray(items) && items.length >= size && items.every(item => has(item, fields));
  const ordered = (items, ids) => rows(items, ['id', 'name', 'description'], ids.length) &&
    items.length === ids.length && items.every((item, index) => item.id === ids[index]);
  return has(data, ['intro', 'brainIntro', 'neuronIntro', 'reactionIntro', 'memoryIntro', 'quizIntro', 'credits']) &&
    rows(data.regions, ['name', 'key', 'description'], 3) && data.regions.length === 3 &&
    ['cerebrum', 'cerebellum', 'brainstem'].every(key => data.regions.some(item => item.key === key)) &&
    ordered(data.stages, stageIds) && ordered(data.anatomy, anatomyIds) &&
    rows(data.quiz, ['prompt', 'correct', 'other1', 'other2', 'explanation']) &&
    data.quiz.every(item => new Set([item.correct, item.other1, item.other2].map(text => text.trim().toLowerCase())).size === 3 &&
      (item.icon === undefined || icons.includes(item.icon))) &&
    rows(data.glossary, ['name', 'description']) && rows(data.sources, ['name', 'url']) &&
    data.sources.every(({ url }) => { try { return new URL(url).protocol === 'https:'; } catch { return false; } });
}
