import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { threshold, discovery, inputLevel, predictsFiring, reactionAction, pairAction, correctAnswer, valid } from './rules.mjs';

const data = JSON.parse(readFileSync(new URL('./content.json', import.meta.url)));
const icons = ['balance', 'neuron', 'synapse', 'memory', 'reaction'];

test('a discovery is counted only once across replay', () => {
  const original = new Set(['brain']);
  const replay = discovery(original, 'brain');
  assert.equal(replay.size, 1);
  assert.equal(discovery(replay, 'neuron').size, 2);
  assert.equal(original.size, 1);
});
test('excitation raises the level, inhibition can prevent firing, reset starts below threshold', () => {
  assert.equal(predictsFiring(inputLevel(2, 2)), true);
  assert.equal(predictsFiring(inputLevel(threshold, -1)), false);
  assert.equal(predictsFiring(0), false);
  assert.equal(inputLevel(0, -1), 0);
  assert.equal(inputLevel(8, 2), 8);
});
test('reaction phase distinguishes early responses from a measurement and supports replay', () => {
  assert.deepEqual(['idle', 'waiting', 'ready', 'complete'].map(reactionAction), ['wait', 'early', 'record', 'replay']);
});
test('memory ignores rapid clicks, matched cards and the same card', () => {
  const a = {name:'Soma'};
  const b = {name:'Soma'};
  assert.equal(pairAction(true, a, b),'ignore');
  assert.equal(pairAction(false, a, a),'ignore');
  assert.equal(pairAction(false, a, {name:'Axon', matched:true}),'ignore');
  assert.equal(pairAction(false, undefined, a),'reveal');
  assert.equal(pairAction(false, a, b),'match');
  assert.equal(pairAction(false, a, {name:'Axon'}),'mismatch');
});
test('quiz scoring identifies only the correct response', () => {
  assert.equal(correctAnswer(data.quiz[0], data.quiz[0].correct), true);
  assert.equal(correctAnswer(data.quiz[0], data.quiz[0].other1), false);
});
test('curriculum rejects reordered or missing stages, bad icons, duplicates and invalid URLs', () => {
  assert.equal(valid(data, icons), true);
  for (const change of [
    input => input.stages.reverse(),
    input => input.stages.pop(),
    input => { input.quiz[0].icon = 'missing'; },
    input => { input.quiz[0].other1 = ' ' + input.quiz[0].correct.toUpperCase(); },
    input => { input.sources[0].url = 'invalid'; },
    input => { input.anatomy[0].id = 'unknown'; }
  ]) {
    const input = structuredClone(data);
    change(input);
    assert.equal(valid(input,icons),false);
  }
});
