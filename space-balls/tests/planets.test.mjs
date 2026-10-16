import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceMatch, applyPlanetDynamics, createArena, createMatch } from '../src/match.ts';
import { createPlanetField } from '../src/planets.ts';

const arena = createArena(1280, 720);
const field = createPlanetField(arena);
const find = (name, side = 0) => field.find(planet => planet.name === name && planet.side === side);
const speed = ball => Math.hypot(ball.vx * arena.width, ball.vy * arena.height);

function near(planet, selected = planet.name, distance = 0.9) {
  const match = createMatch(() => 0.5, selected);
  match.phase = 'playing';
  for (const effect of Object.values(match.planetEffects)) effect.cooldown = 999;
  match.ball = {
    x: (planet.centerX + planet.gravityRadius * distance - arena.left) / arena.width,
    y: (planet.centerY - arena.top) / arena.height,
    vx: 100 / arena.width, vy: 80 / arena.height,
  };
  return match;
}

test('physical fields match the drawn circles and are reflected on both sides', () => {
  assert.equal(field.length, 8);
  for (const [name, scale] of [['Jupiter', 1.15], ['Earth', 1.4], ['Ice', 1.7], ['Lava', 1.7]]) {
    const left = find(name);
    const right = find(name, 1);
    assert.ok(Math.abs(left.centerX + right.centerX - arena.left - arena.right) < 1e-10);
    assert.equal(left.centerY, right.centerY);
    assert.equal(left.gravityRadius, left.bodyRadius * scale);
    assert.equal(right.gravityRadius, left.gravityRadius);
  }
});

test('gravity pulls toward the center only inside its field', () => {
  const planet = find('Jupiter');
  const inside = near(planet);
  const outside = near(planet, 'Jupiter', 1.01);
  const initial = inside.ball.vx;
  const outsideBall = { ...outside.ball };
  applyPlanetDynamics(inside, 0.01, arena, [planet]);
  applyPlanetDynamics(outside, 0.01, arena, [planet]);
  assert.ok(inside.ball.vx < initial);
  assert.deepEqual(outside.ball, outsideBall);
});

test('Jupiter pulls hardest, Earth next, and small planets weakest', () => {
  const pulls = ['Jupiter', 'Earth', 'Ice', 'Lava'].map(name => {
    const planet = find(name);
    const match = near(planet);
    const before = match.ball.vx;
    applyPlanetDynamics(match, 0.01, arena, [planet]);
    return before - match.ball.vx;
  });
  assert.ok(pulls[0] > pulls[1] && pulls[1] > pulls[2]);
  assert.ok(Math.abs(pulls[2] - pulls[3]) < 1e-10);
});

function boost(planet, loudness, selected = planet.name, random = () => 0.5) {
  const match = near(planet, selected);
  // Present an attacking vector to the opponent AI when testing its boosts.
  if (planet.side === 1) match.ball.vx *= -1;
  match.planetEffects[planet.id].cooldown = 0;
  applyPlanetDynamics(match, 1 / 240, arena, [planet], loudness, random);
  return match;
}

test('louder voices boost more, along the current motion after gravity', () => {
  const planet = find('Earth');
  const quiet = boost(planet, 0);
  const soft = boost(planet, 0.2);
  const loud = boost(planet, 0.9);
  assert.ok(speed(loud.ball) > speed(soft.ball) && speed(soft.ball) > speed(quiet.ball));
  assert.ok(Math.abs(quiet.ball.vx * loud.ball.vy - quiet.ball.vy * loud.ball.vx) < 1e-10);
});

test('smaller planets supply stronger impulses at the same loudness', () => {
  const impulses = ['Jupiter', 'Earth', 'Ice', 'Lava'].map(name => {
    const planet = find(name);
    return speed(boost(planet, 0.5).ball) - speed(boost(planet, 0).ball);
  });
  assert.ok(impulses[0] < impulses[1] && impulses[1] < impulses[2]);
  assert.ok(Math.abs(impulses[2] - impulses[3]) < 1e-10);
});

test('voice affects only the selected planet on the player side', () => {
  for (const planet of [find('Earth', 1), find('Ice')]) {
    const quiet = near(planet, 'Earth');
    const loud = structuredClone(quiet);
    applyPlanetDynamics(quiet, 0.01, arena, [planet], 0);
    applyPlanetDynamics(loud, 0.01, arena, [planet], 1);
    assert.deepEqual(loud.ball, quiet.ball);
  }
  const planet = find('Earth');
  const outside = near(planet, 'Earth', 1.1);
  outside.planetEffects[planet.id].cooldown = 0;
  const before = { ...outside.ball };
  applyPlanetDynamics(outside, 0.01, arena, [planet], 1);
  assert.deepEqual(outside.ball, before);
  assert.equal(outside.planetEffects[planet.id].boosts, 0);
});

test('other planets use independent random magnitudes and intervals', () => {
  const planet = find('Earth', 1);
  const small = boost(planet, 0, 'Earth', () => 0.1);
  const large = boost(planet, 0, 'Earth', () => 0.9);
  assert.ok(speed(large.ball) > speed(small.ball));
  assert.ok(large.planetEffects[planet.id].cooldown > small.planetEffects[planet.id].cooldown);
  const selected = boost(find('Earth'), 0);
  assert.equal(selected.planetEffects['0:Earth'].pulse, 0);
});

test('both sides stay silent when the asteroid heads toward their own net', () => {
  for (const side of [0, 1]) {
    const planet = find('Earth', side);
    const match = near(planet, 'Ice');
    match.ball.vx = (side === 0 ? -100 : 100) / arena.width;
    match.planetEffects[planet.id].cooldown = 0;
    const gravityOnly = structuredClone(match);
    gravityOnly.planetEffects[planet.id].cooldown = 999;
    const noRandom = () => { throw new Error('Defending AI should not generate an impulse'); };
    applyPlanetDynamics(match, 1 / 240, arena, [planet], 1, noRandom);
    applyPlanetDynamics(gravityOnly, 1 / 240, arena, [planet], 0, noRandom);
    assert.deepEqual(match.ball, gravityOnly.ball);
    assert.equal(match.planetEffects[planet.id].boosts, 0);
    assert.equal(match.planetEffects[planet.id].cooldown, 0);
  }
});

test('both sides boost attacking vectors with random strength and intervals', () => {
  for (const side of [0, 1]) {
    const planet = find('Earth', side);
    const make = random => {
      const match = near(planet, 'Ice');
      match.ball.vx = (side === 0 ? 100 : -100) / arena.width;
      match.planetEffects[planet.id].cooldown = 0;
      applyPlanetDynamics(match, 1 / 240, arena, [planet], 0, random);
      return match;
    };
    const weak = make(() => 0.1);
    const strong = make(() => 0.9);
    assert.equal(weak.planetEffects[planet.id].boosts, 1);
    assert.equal(strong.planetEffects[planet.id].boosts, 1);
    assert.ok(speed(strong.ball) > speed(weak.ball));
    assert.ok(strong.planetEffects[planet.id].cooldown > weak.planetEffects[planet.id].cooldown);
    assert.equal(Math.sign(strong.ball.vx), side === 0 ? 1 : -1);
  }
});

test('purely vertical travel produces no AI impulse', () => {
  for (const side of [0, 1]) {
    const planet = find('Earth', side);
    const match = near(planet, 'Ice');
    match.ball.x = (planet.centerX - arena.left) / arena.width;
    match.ball.y = (planet.centerY + planet.gravityRadius * 0.9 - arena.top) / arena.height;
    match.ball.vx = 0;
    match.planetEffects[planet.id].cooldown = 0;
    applyPlanetDynamics(match, 1 / 240, arena, [planet], 0,
      () => { throw new Error('Vertical travel should stay silent'); });
    assert.equal(match.planetEffects[planet.id].boosts, 0);
  }
});

test('AI uses the direction after gravity turns the asteroid back toward its own net', () => {
  for (const side of [0, 1]) {
    const planet = find('Earth', side);
    const match = near(planet, 'Ice', side === 0 ? 0.9 : -0.9);
    match.ball.vx = (side === 0 ? 100 : -100) / arena.width;
    match.planetEffects[planet.id].cooldown = 0;
    applyPlanetDynamics(match, 0.2, arena, [planet], 0,
      () => { throw new Error('Gravity changed an attack into defense'); });
    assert.equal(Math.sign(match.ball.vx), side === 0 ? -1 : 1);
    assert.equal(match.planetEffects[planet.id].boosts, 0);
  }
});

test('a ready AI can boost once the asteroid changes from defending to attacking', () => {
  const planet = find('Earth', 1);
  const match = near(planet);
  match.planetEffects[planet.id].cooldown = 0;
  applyPlanetDynamics(match, 1 / 240, arena, [planet], 0, () => 0.5);
  assert.equal(match.planetEffects[planet.id].boosts, 0);
  match.ball.vx = -100 / arena.width;
  applyPlanetDynamics(match, 1 / 240, arena, [planet], 0, () => 0.5);
  assert.equal(match.planetEffects[planet.id].boosts, 1);
  assert.ok(match.planetEffects[planet.id].cooldown > 0);
});

test('the AI decision does not restrict the player-selected voice planet', () => {
  const planet = find('Earth');
  const match = near(planet);
  match.ball.vx = -100 / arena.width;
  match.planetEffects[planet.id].cooldown = 0;
  applyPlanetDynamics(match, 1 / 240, arena, [planet], 1,
    () => { throw new Error('Player voice should not use AI randomness'); });
  assert.equal(match.planetEffects[planet.id].boosts, 1);
  assert.ok(match.ball.vx < 0);
});

test('sustained voice has a cooldown rather than boosting every physics step', () => {
  const planet = find('Ice');
  const first = boost(planet, 1);
  assert.equal(first.planetEffects[planet.id].boosts, 1);
  const quiet = structuredClone(first);
  applyPlanetDynamics(first, 0.01, arena, [planet], 1);
  applyPlanetDynamics(quiet, 0.01, arena, [planet], 0);
  assert.deepEqual(first.ball, quiet.ball);
  assert.equal(first.planetEffects[planet.id].boosts, 1);
  assert.ok(Math.abs(first.planetEffects[planet.id].cooldown - 0.27) < 1e-10);
});

test('gravity remains finite at a planet center and boosts respect the speed limit', () => {
  const planet = find('Jupiter');
  const match = near(planet, 'Jupiter', 0);
  applyPlanetDynamics(match, 0.01, arena, [planet], 0);
  assert.ok(Object.values(match.ball).every(Number.isFinite));
  match.ball.vx = 1000;
  applyPlanetDynamics(match, 0.01, arena, [planet], 1);
  assert.ok(speed(match.ball) <= Math.min(arena.width, arena.height) * 2.6 + 1e-8);
});

test('countdowns do not apply gravity or consume voice boosts', () => {
  const planet = find('Earth');
  const match = near(planet);
  match.phase = 'countdown';
  const before = structuredClone(match);
  applyPlanetDynamics(match, 0.5, arena, field, 1);
  assert.deepEqual(match, before);
});

test('a full minute of gravity, boosts, goals, and rounds stays finite and in bounds', () => {
  let seed = 23;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const match = createMatch(random, 'Ice');
  for (let frame = 0; frame < 3600; frame++) {
    advanceMatch(match, 1 / 60, arena, random, { voiceLevel: frame % 120 < 60 ? 0.8 : 0 });
    assert.ok(Object.values(match.ball).every(Number.isFinite));
    assert.ok(match.ball.x >= 0 && match.ball.x <= 1 && match.ball.y >= 0 && match.ball.y <= 1);
  }
});
