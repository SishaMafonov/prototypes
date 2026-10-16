import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceGoal, createGoal } from '../src/goals.ts';

test('goals start with independent phases and random speeds', () => {
  const left = createGoal(0, () => 0);
  const right = createGoal(0.6, () => 1);
  advanceGoal(left, 1);
  advanceGoal(right, 1);
  assert.equal(left.position, 0.1);
  assert.equal(right.position, 0.84);
  assert.equal(left.speed, 0.1);
  assert.ok(Math.abs(right.speed - 0.24) < 1e-12);
});

test('bottom reversal preserves speed and uses remaining frame time', () => {
  const goal = { position: 0.9, direction: 1, speed: 0.2 };
  advanceGoal(goal, 1, () => { throw new Error('Randomized at bottom'); });
  assert.ok(Math.abs(goal.position - 0.9) < 1e-12);
  assert.equal(goal.direction, -1);
  assert.equal(goal.speed, 0.2);
});

test('top reversal chooses a new speed for that goal only', () => {
  const goal = { position: 0.1, direction: -1, speed: 0.2 };
  const other = createGoal(0.6, () => 0);
  let calls = 0;
  advanceGoal(goal, 1, () => { calls++; return 1; });
  assert.equal(calls, 1);
  assert.equal(goal.direction, 1);
  assert.ok(Math.abs(goal.speed - 0.24) < 1e-12);
  assert.ok(Math.abs(goal.position - 0.12) < 1e-12);
  assert.deepEqual(other, { position: 0.6, direction: 1, speed: 0.1 });
});

test('exact endpoints reverse without sticking or leaving the court', () => {
  const goal = { position: 0.5, direction: 1, speed: 0.2 };
  advanceGoal(goal, 2.5);
  assert.equal(goal.position, 1);
  assert.equal(goal.direction, -1);
  advanceGoal(goal, 5, () => 0);
  assert.equal(goal.position, 0);
  assert.equal(goal.direction, 1);
  assert.equal(goal.speed, 0.1);
});

test('motion is independent of frame rate and handles multiple reversals', () => {
  const oneFrame = createGoal(0.6, () => 0.5);
  const manyFrames = { ...oneFrame };
  advanceGoal(oneFrame, 40, () => 0.5);
  for (let frame = 0; frame < 2400; frame++) {
    advanceGoal(manyFrames, 1 / 60, () => 0.5);
    assert.ok(manyFrames.position >= 0 && manyFrames.position <= 1);
  }
  assert.ok(Math.abs(oneFrame.position - manyFrames.position) < 1e-10);
  assert.equal(oneFrame.direction, manyFrames.direction);
});
