import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceMatch, awardPoint, createArena, createMatch, roundMessage } from '../../src/match.ts';
import { assignedValues, contract, functionBody, nodes, source } from './graph.mjs';

// The oracle is the requirements graph, independent of implementation branches.
const expected = new Map([
  ['countdown', new Set(['playing'])],
  ['playing', new Set(['goal', 'finished'])],
  ['goal', new Set(['countdown'])],
  ['finished', new Set()],
]);
const random = () => 0.5;
const arena = createArena(960, 540);

test(contract(['C-MATCH-01', 'C-MATCH-02', 'C-MATCH-03', 'C-MATCH-05', 'C-MATCH-06'], 'phase writers match the required directed graph'), () => {
  const ast = source('src/match.ts');
  assert.deepEqual(new Set(assignedValues(functionBody(ast, 'awardPoint'), 'match.phase')), expected.get('playing'));
  assert.deepEqual(new Set(assignedValues(functionBody(ast, 'advanceMatch'), 'match.phase')), new Set(['playing', 'countdown']));
  assert.equal(nodes(ast, n => n.type === 'AssignmentExpression' && n.left.object?.name === 'match' && n.left.property?.name === 'phase').length, 3,
    'A new phase writer needs a reviewed transition contract');
  const initial = nodes(functionBody(ast, 'createMatch'), n => n.type === 'Property' && n.key.name === 'phase');
  assert.equal(initial.length, 1);
  assert.equal(initial[0].value.value, 'countdown');
});

function walkMatch(scorers, selectedPlanet) {
  const match = createMatch(random, selectedPlanet), visited = new Set(['countdown']), edges = new Set();
  function step(action) {
    const before = match.phase;
    action();
    visited.add(match.phase);
    if (before !== match.phase) {
      assert.ok(expected.get(before)?.has(match.phase), `Forbidden transition: ${before} -> ${match.phase}`);
      edges.add(`${before}->${match.phase}`);
    }
    assert.equal(match.selectedPlanet, selectedPlanet, 'Selection changed along graph traversal');
  }
  function launch() {
    assert.equal(match.phase, 'countdown');
    assert.deepEqual(match.ball, { x: 0.5, y: 0.5, vx: 0, vy: 0 });
    for (const word of ['Ready?', 'Steady!', 'GO!']) {
      assert.equal(roundMessage(match), word);
      step(() => advanceMatch(match, 1, arena, random, { field: [] }));
    }
    assert.equal(match.phase, 'playing');
  }
  launch();
  const scores = [0, 0];
  for (let index = 0; index < scorers.length; index++) {
    const scorer = scorers[index];
    assert.equal(match.phase, 'playing');
    scores[scorer]++;
    step(() => awardPoint(match, scorer));
    assert.deepEqual(match.scores, scores);
    const winning = Math.max(...scores) >= 10 && Math.abs(scores[0] - scores[1]) >= 2;
    assert.equal(match.phase, winning ? 'finished' : 'goal');
    if (winning) { assert.equal(index, scorers.length - 1, 'Route must stop at winner'); break; }
    const contactBall = { ...match.ball };
    step(() => advanceMatch(match, 1.19, arena, random, { field: [] }));
    assert.equal(match.phase, 'goal');
    assert.deepEqual(match.ball, contactBall);
    step(() => advanceMatch(match, 0.01, arena, random, { field: [] }));
    assert.equal(match.phase, 'countdown');
    assert.deepEqual(match.scores, scores);
    launch();
  }
  assert.equal(match.phase, 'finished');
  const frozen = structuredClone(match);
  for (const action of [() => advanceMatch(match, 100, arena, random), () => awardPoint(match, 0), () => awardPoint(match, 1)]) {
    step(action); assert.deepEqual(match, frozen, 'Finished node must be terminal');
  }
  assert.deepEqual(visited, new Set(expected.keys()), 'Route missed a phase node');
  assert.deepEqual(edges, new Set(['countdown->playing', 'playing->goal', 'goal->countdown', 'playing->finished']), 'Route missed a graph edge');
  return match;
}

for (const winner of [0, 1]) {
  test(contract(['I-FLOW-03', 'I-FLOW-05', 'I-FLOW-06', 'C-MATCH-04', 'C-MATCH-06'], `all phase nodes/edges reach terminal winner ${winner}`), () => {
    const result = walkMatch(Array(10).fill(winner), winner === 0 ? 'Lava' : 'Ice');
    assert.equal(result.winner, winner);
  });
}

test(contract(['C-MATCH-04', 'I-FLOW-05', 'I-FLOW-08'], 'deuce cycles remain reachable until two clear points end the graph'), () => {
  const tied = Array.from({ length: 9 }, () => [0, 1]).flat();
  const result = walkMatch([...tied, 0, 1, 0, 1, 1, 1], 'Jupiter');
  assert.deepEqual(result.scores, [11, 13]);
  assert.equal(result.winner, 1);
});

test(contract(['C-GOAL-04', 'I-FLOW-04', 'I-PHYSICS-03'], 'both net-contact edges enter the same scoring state graph'), () => {
  for (const side of [0, 1]) {
    const match = createMatch(random);
    advanceMatch(match, 3, arena, random, { field: [] });
    // Controlled fixture: place a stationary ball inside a stationary net.
    match.goals.forEach(goal => { goal.position = 0.5; goal.speed = 0; });
    match.ball = { x: (arena.goalX[side] - arena.left) / arena.width, y: 0.5, vx: 0, vy: 0 };
    advanceMatch(match, 1 / 240, arena, random, { field: [] });
    assert.equal(match.phase, 'goal');
    assert.equal(match.scorer, 1 - side);
    assert.deepEqual(match.scores, side === 0 ? [0, 1] : [1, 0]);
    advanceMatch(match, 0.1, arena, random, { field: [] });
    assert.deepEqual(match.scores, side === 0 ? [0, 1] : [1, 0], 'Contact edge scored twice');
  }
});
