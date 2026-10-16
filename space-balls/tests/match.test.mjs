import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceMatch, awardPoint, createArena, createMatch, launchBall, roundMessage,
  scoreStatus, winningPlayer } from '../src/match.ts';

const arena = createArena(1280, 720);
const fixedRandom = () => 0.5;

function playingMatch() {
  const match = createMatch(fixedRandom);
  match.phase = 'playing';
  match.goals = [0, 0].map(position => ({ position, direction: 1, speed: 0 }));
  return match;
}

test('three one-second words precede the center launch', () => {
  const match = createMatch(fixedRandom);
  assert.equal(roundMessage(match), 'Ready?');
  advanceMatch(match, 1, arena, fixedRandom);
  assert.equal(roundMessage(match), 'Steady!');
  advanceMatch(match, 1, arena, fixedRandom);
  assert.equal(roundMessage(match), 'GO!');
  assert.deepEqual(match.ball, { x: 0.5, y: 0.5, vx: 0, vy: 0 });
  advanceMatch(match, 1, arena, fixedRandom);
  assert.equal(match.phase, 'playing');
  assert.equal(roundMessage(match), '');
  assert.equal(match.ball.x, 0.5);
  assert.ok(Math.abs(match.ball.vx) > 0);
});

test('serves vary in direction and speed while always starting at center', () => {
  const low = launchBall(arena, () => 0);
  const high = launchBall(arena, () => 0.99);
  assert.equal(low.x, 0.5);
  assert.equal(low.y, 0.5);
  assert.ok(low.vx < 0 && high.vx > 0);
  assert.ok(low.vy < 0 && high.vy > 0);
  const speed = ball => Math.hypot(ball.vx * arena.width, ball.vy * arena.height);
  assert.ok(speed(high) > speed(low));
});

test('asteroid crosses center line without rebounding', () => {
  const match = playingMatch();
  match.ball = { x: 0.49, y: 0.5, vx: 0.3, vy: 0 };
  advanceMatch(match, 0.1, arena, fixedRandom);
  assert.ok(match.ball.x > 0.5);
  assert.ok(match.ball.vx > 0); // Nearby gravity may change speed, but the line cannot reflect it.
});

test('all four borders rebound outside the goal openings', () => {
  for (const [ball, axis, expectedSign] of [
    [{ x: 0.02, y: 0.5, vx: -0.4, vy: 0 }, 'vx', 1],
    [{ x: 0.98, y: 0.5, vx: 0.4, vy: 0 }, 'vx', -1],
    [{ x: 0.5, y: 0.03, vx: 0, vy: -0.4 }, 'vy', 1],
    [{ x: 0.5, y: 0.97, vx: 0, vy: 0.4 }, 'vy', -1],
  ]) {
    const match = playingMatch();
    match.ball = ball;
    advanceMatch(match, 0.2, arena, fixedRandom);
    assert.equal(match.phase, 'playing');
    assert.equal(Math.sign(match.ball[axis]), expectedSign);
    assert.deepEqual(match.scores, [0, 0]);
    assert.ok(match.ball.x >= arena.ballRadius / arena.width);
    assert.ok(match.ball.x <= 1 - arena.ballRadius / arena.width);
    assert.ok(match.ball.y >= arena.ballRadius / arena.height);
    assert.ok(match.ball.y <= 1 - arena.ballRadius / arena.height);
  }
});

test('left net awards opponent and right net awards player, only once', () => {
  for (const side of [0, 1]) {
    const match = playingMatch();
    const y = arena.goalSize / 2 / arena.height;
    match.ball = { x: side === 0 ? 0.1 : 0.9, y, vx: side === 0 ? -0.5 : 0.5, vy: 0 };
    advanceMatch(match, 0.3, arena, fixedRandom);
    assert.equal(match.phase, 'goal');
    assert.deepEqual(match.scores, side === 0 ? [0, 1] : [1, 0]);
    assert.equal(roundMessage(match), side === 0 ? 'Opponent scores!' : 'You score!');
    advanceMatch(match, 0.3, arena, fixedRandom);
    assert.deepEqual(match.scores, side === 0 ? [0, 1] : [1, 0]);
  }
});

test('a moving net can intercept the ball without tunneling', () => {
  const match = playingMatch();
  match.goals[0] = { position: 0.4, direction: 1, speed: 0.2 };
  match.ball = { x: 0.05, y: 0.46, vx: -0.75, vy: 0 };
  advanceMatch(match, 0.1, arena, fixedRandom);
  assert.equal(match.phase, 'goal');
  assert.deepEqual(match.scores, [0, 1]);
});

test('high on-screen velocity cannot skip over a goal', () => {
  const match = playingMatch();
  match.ball = { x: 0.1, y: arena.goalSize / 2 / arena.height, vx: -100, vy: 0 };
  advanceMatch(match, 0.01, arena, fixedRandom);
  assert.equal(match.phase, 'goal');
  assert.deepEqual(match.scores, [0, 1]);
});

test('scoring returns to a centered countdown while preserving scores', () => {
  const match = playingMatch();
  match.phase = 'goal';
  match.scorer = 0;
  match.scores = [2, 1];
  match.ball = { x: 0.98, y: 0.1, vx: 0, vy: 0 };
  advanceMatch(match, 1.2, arena, fixedRandom);
  assert.equal(match.phase, 'countdown');
  assert.equal(roundMessage(match), 'Ready?');
  assert.deepEqual(match.ball, { x: 0.5, y: 0.5, vx: 0, vy: 0 });
  assert.deepEqual(match.scores, [2, 1]);
});

test('ball travel is consistent across frame rates', () => {
  const one = playingMatch();
  one.ball = { x: 0.5, y: 0.5, vx: 0.15, vy: 0.1 };
  const many = structuredClone(one);
  advanceMatch(one, 2, arena, fixedRandom);
  for (let frame = 0; frame < 120; frame++) advanceMatch(many, 1 / 60, arena, fixedRandom);
  assert.ok(Math.abs(one.ball.x - many.ball.x) < 1e-10);
  assert.ok(Math.abs(one.ball.y - many.ball.y) < 1e-10);
});

test('portrait court keeps ball and nets proportional', () => {
  const portrait = createArena(390, 844);
  assert.ok(portrait.width > 0 && portrait.height > portrait.width);
  assert.ok(Math.abs(portrait.goalSize / portrait.ballRadius - 6) < 1e-10);
  const match = createMatch(fixedRandom);
  advanceMatch(match, 3.5, portrait, fixedRandom);
  assert.equal(match.phase, 'playing');
  assert.ok(match.ball.x > 0 && match.ball.x < 1);
  assert.ok(match.ball.y > 0 && match.ball.y < 1);
});

test('winning requires at least ten points and a two-point lead', () => {
  for (const [scores, winner] of [
    [[0, 0], null], [[9, 0], null], [[9, 9], null],
    [[10, 8], 0], [[8, 10], 1], [[10, 9], null], [[9, 10], null],
    [[10, 10], null], [[11, 10], null], [[12, 10], 0], [[10, 12], 1],
    [[99, 99], null], [[101, 99], 0],
  ]) assert.equal(winningPlayer(scores), winner, `Score ${scores.join(':')}`);
});

test('score display distinguishes normal play, deuce, and match point for either player', () => {
  assert.equal(scoreStatus([8, 8]), 'First to 10 · Win by 2');
  assert.equal(scoreStatus([9, 8]), 'Match point · You');
  assert.equal(scoreStatus([8, 9]), 'Match point · Opponent');
  assert.equal(scoreStatus([9, 9]), 'Deuce · Win by 2');
  assert.equal(scoreStatus([10, 10]), 'Deuce · Win by 2');
  assert.equal(scoreStatus([11, 10]), 'Match point · You');
  assert.equal(scoreStatus([12, 13]), 'Match point · Opponent');
  assert.equal(scoreStatus([10, 8]), 'Match complete');
});

test('deuce can repeat until one side wins two points clear', () => {
  const match = playingMatch();
  match.scores = [9, 9];
  awardPoint(match, 0);
  assert.equal(match.phase, 'goal');
  assert.equal(match.winner, null);
  match.phase = 'playing';
  awardPoint(match, 1);
  assert.deepEqual(match.scores, [10, 10]);
  assert.equal(match.winner, null);
  match.phase = 'playing';
  awardPoint(match, 1);
  assert.deepEqual(match.scores, [10, 11]);
  assert.equal(match.winner, null);
  match.phase = 'playing';
  awardPoint(match, 1);
  assert.deepEqual(match.scores, [10, 12]);
  assert.equal(match.phase, 'finished');
  assert.equal(match.winner, 1);
});

test('a winning net collision finishes the match and stops the asteroid', () => {
  for (const side of [0, 1]) {
    const match = playingMatch();
    match.scores = side === 0 ? [8, 9] : [9, 8];
    match.ball = {
      x: side === 0 ? 0.1 : 0.9, y: arena.goalSize / 2 / arena.height,
      vx: side === 0 ? -0.5 : 0.5, vy: 0,
    };
    advanceMatch(match, 0.3, arena, fixedRandom);
    assert.equal(match.phase, 'finished');
    assert.equal(match.winner, side === 0 ? 1 : 0);
    assert.deepEqual(match.scores, side === 0 ? [8, 10] : [10, 8]);
    assert.equal(match.ball.vx, 0);
    assert.equal(match.ball.vy, 0);
    const finished = structuredClone(match);
    advanceMatch(match, 20, arena, fixedRandom, { voiceLevel: 1 });
    awardPoint(match, 0);
    awardPoint(match, 1);
    assert.deepEqual(match, finished);
  }
});

test('a new match resets scores, winner, effects, asteroid, and selected planet', () => {
  const old = playingMatch();
  old.scores = [9, 7];
  old.planetEffects['0:Earth'].boosts = 12;
  awardPoint(old, 0);
  const fresh = createMatch(fixedRandom, 'Ice');
  assert.deepEqual(fresh.scores, [0, 0]);
  assert.equal(fresh.winner, null);
  assert.equal(fresh.scorer, null);
  assert.equal(fresh.selectedPlanet, 'Ice');
  assert.equal(fresh.phase, 'countdown');
  assert.equal(roundMessage(fresh), 'Ready?');
  assert.deepEqual(fresh.ball, { x: 0.5, y: 0.5, vx: 0, vy: 0 });
  assert.ok(Object.values(fresh.planetEffects).every(effect => effect.boosts === 0 && effect.pulse === 0));
  assert.notEqual(fresh.goals[0], old.goals[0]);
});
