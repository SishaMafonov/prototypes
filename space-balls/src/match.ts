import { advanceGoal, createGoal, type GoalMotion } from './goals.ts';
import { createPlanetField, planetDefinitions, planetNames, type FieldPlanet, type PlanetName } from './planets.ts';

export function createArena(viewportWidth: number, viewportHeight: number) {
  const left = viewportWidth * 44 / 1672;
  const right = viewportWidth * 1629 / 1672;
  const top = viewportHeight * 40 / 941;
  const bottom = viewportHeight * 887 / 941;
  const width = right - left;
  const height = bottom - top;
  const size = Math.min(width / 2, height);
  return {
    left, right, top, bottom, width, height, size,
    goalSize: size * 0.15,
    ballRadius: size * 0.025,
    goalX: [viewportWidth * 40 / 1672, viewportWidth * 1633 / 1672] as const,
  };
}

export type Arena = ReturnType<typeof createArena>;
export type Ball = { x: number; y: number; vx: number; vy: number };
export type Match = {
  phase: 'countdown' | 'playing' | 'goal' | 'finished';
  elapsed: number;
  ball: Ball;
  goals: [GoalMotion, GoalMotion];
  scores: [number, number];
  scorer: 0 | 1 | null;
  winner: 0 | 1 | null;
  selectedPlanet: PlanetName;
  planetEffects: Record<string, { cooldown: number; pulse: number; boosts: number }>;
};

export type MatchInput = {
  voiceLevel?: number;
  field?: readonly FieldPlanet[];
};

function waitingBall(): Ball {
  return { x: 0.5, y: 0.5, vx: 0, vy: 0 };
}

export function createMatch(random = Math.random, selectedPlanet: PlanetName = 'Earth'): Match {
  return {
    phase: 'countdown', elapsed: 0, ball: waitingBall(),
    goals: [createGoal(0, random), createGoal(0.6, random)],
    scores: [0, 0], scorer: null, winner: null,
    selectedPlanet,
    planetEffects: Object.fromEntries(planetNames.flatMap(name => ([0, 1] as const).map(side => [
      `${side}:${name}`, {
        cooldown: side === 0 && name === selectedPlanet ? 0 : 0.4 + random() * 1.2, pulse: 0, boosts: 0,
      },
    ]))),
  };
}

export function winningPlayer(scores: readonly [number, number]): 0 | 1 | null {
  if (Math.max(...scores) < 10 || Math.abs(scores[0] - scores[1]) < 2) return null;
  return scores[0] > scores[1] ? 0 : 1;
}

export function scoreStatus(scores: readonly [number, number]): string {
  if (winningPlayer(scores) !== null) return 'Match complete';
  if (scores[0] === scores[1] && scores[0] >= 9) return 'Deuce · Win by 2';
  if (scores[0] >= 9 && scores[0] > scores[1]) return 'Match point · You';
  if (scores[1] >= 9 && scores[1] > scores[0]) return 'Match point · Opponent';
  return 'First to 10 · Win by 2';
}

export function awardPoint(match: Match, scorer: 0 | 1): void {
  if (match.phase !== 'playing') return;
  match.scores[scorer]++;
  match.scorer = scorer;
  match.winner = winningPlayer(match.scores);
  match.phase = match.winner === null ? 'goal' : 'finished';
  match.elapsed = 0;
  match.ball.vx = 0;
  match.ball.vy = 0;
}

export function applyPlanetDynamics(
  match: Match, seconds: number, arena: Arena, field: readonly FieldPlanet[],
  voiceLevel = 0, random = Math.random,
): void {
  if (match.phase !== 'playing') return;

  const ball = match.ball;
  const x = arena.left + ball.x * arena.width;
  const y = arena.top + ball.y * arena.height;
  let vx = ball.vx * arena.width;
  let vy = ball.vy * arena.height;
  const active: FieldPlanet[] = [];
  for (const planet of field) {
    const effect = match.planetEffects[planet.id];
    effect.cooldown = Math.max(0, effect.cooldown - seconds);
    effect.pulse = Math.max(0, effect.pulse - seconds * 3);
    const dx = planet.centerX - x;
    const dy = planet.centerY - y;
    const distance = Math.hypot(dx, dy);
    if (distance > planet.gravityRadius) continue;
    active.push(planet);

    // A softened inverse-square pull remains finite even through a planet's center.
    const softDistance = Math.hypot(distance, planet.bodyRadius * 0.45);
    const acceleration = arena.size * planetDefinitions[planet.name].attraction *
      planet.bodyRadius ** 2 / softDistance ** 3;
    vx += dx * acceleration * seconds;
    vy += dy * acceleration * seconds;
  }

  for (const planet of active) {
    const effect = match.planetEffects[planet.id];
    if (effect.cooldown > 1e-9) continue;
    const playerControlled = planet.side === 0 && planet.name === match.selectedPlanet;
    // Decide using the current vector after gravity: left-side AI attacks right,
    // right-side AI attacks left. Defending or purely vertical travel stays silent.
    const attacking = planet.side === 0 ? vx > 1e-8 : vx < -1e-8;
    if (!playerControlled && !attacking) continue;
    const loudness = Number.isFinite(voiceLevel) ? Math.max(0, Math.min(1, voiceLevel)) : 0;
    if (playerControlled && loudness <= 0.03) continue;
    const magnitude = playerControlled ? loudness : 0.2 + random() * 0.65;
    const speed = Math.hypot(vx, vy);
    if (speed > 1e-8) {
      const impulse = arena.size * planetDefinitions[planet.name].impulse * magnitude;
      vx += vx / speed * impulse;
      vy += vy / speed * impulse;
      effect.pulse = Math.max(0.6, magnitude);
      effect.boosts++;
    }
    effect.cooldown = playerControlled ? 0.28 : 0.65 + random() * 1.15;
  }

  // Keep high-energy boosts playable, and bound work for collision substeps.
  const speed = Math.hypot(vx, vy);
  const maxSpeed = Math.min(arena.width, arena.height) * 2.6;
  // Motion outside the gravity fields keeps its existing speed.
  if (active.length > 0 && speed > maxSpeed) {
    vx *= maxSpeed / speed;
    vy *= maxSpeed / speed;
  }
  ball.vx = vx / arena.width;
  ball.vy = vy / arena.height;
}

export function launchBall(arena: Arena, random = Math.random): Ball {
  // Avoid almost vertical serves while allowing either side to receive the ball.
  const angle = (random() - 0.5) * Math.PI * 2 / 3;
  const direction = random() < 0.5 ? -1 : 1;
  const speed = Math.min(arena.width, arena.height) * (0.45 + random() * 0.3);
  return {
    ...waitingBall(),
    vx: Math.cos(angle) * direction * speed / arena.width,
    vy: Math.sin(angle) * speed / arena.height,
  };
}

export function roundMessage(match: Match): string {
  if (match.phase === 'goal') return match.scorer === 0 ? 'You score!' : 'Opponent scores!';
  if (match.phase === 'countdown') {
    return ['Ready?', 'Steady!', 'GO!'][Math.min(2, Math.floor(match.elapsed + 1e-8))];
  }
  return '';
}

function touchesGoal(ball: Ball, goal: GoalMotion, goalX: number, arena: Arena): boolean {
  const x = arena.left + ball.x * arena.width;
  const y = arena.top + ball.y * arena.height;
  const goalTop = arena.top + goal.position * (arena.height - arena.goalSize);
  const goalHalfWidth = arena.goalSize * 0.2;
  const closestX = Math.max(goalX - goalHalfWidth, Math.min(x, goalX + goalHalfWidth));
  const closestY = Math.max(goalTop, Math.min(y, goalTop + arena.goalSize));
  return (x - closestX) ** 2 + (y - closestY) ** 2 <= arena.ballRadius ** 2;
}

function moveBall(match: Match, seconds: number, arena: Arena): void {
  const ball = match.ball;
  ball.x += ball.vx * seconds;
  ball.y += ball.vy * seconds;

  // Test the actual net rectangles before rebounding against the wall behind them.
  for (const side of [0, 1] as const) {
    if (touchesGoal(ball, match.goals[side], arena.goalX[side], arena)) {
      const scorer = side === 0 ? 1 : 0;
      awardPoint(match, scorer);
      return;
    }
  }

  const radiusX = arena.ballRadius / arena.width;
  const radiusY = arena.ballRadius / arena.height;
  if (ball.x < radiusX) {
    ball.x = radiusX + (radiusX - ball.x);
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x > 1 - radiusX) {
    ball.x = 1 - radiusX - (ball.x - (1 - radiusX));
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y < radiusY) {
    ball.y = radiusY + (radiusY - ball.y);
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y > 1 - radiusY) {
    ball.y = 1 - radiusY - (ball.y - (1 - radiusY));
    ball.vy = -Math.abs(ball.vy);
  }
  // The center line is decoration, so crossing it needs no collision handling.
}

export function advanceMatch(
  match: Match, seconds: number, arena: Arena, random = Math.random, input: MatchInput = {},
): void {
  if (match.phase === 'finished' || !Number.isFinite(seconds) || seconds <= 0 ||
      arena.width <= 0 || arena.height <= 0) return;

  let remaining = seconds;
  const field = input.field ?? createPlanetField(arena);
  while (remaining > 1e-10) {
    // Bound relative travel too: resizing can increase a normalized velocity's
    // pixel speed, and a moving goal must not sweep through the ball in one step.
    const ballSpeed = match.phase === 'playing'
      ? Math.hypot(match.ball.vx * arena.width, match.ball.vy * arena.height) : 0;
    const goalSpeed = Math.max(...match.goals.map(goal => goal.speed * (arena.height - arena.goalSize)));
    const step = Math.min(remaining, 1 / 240, arena.ballRadius / (2 * Math.max(1, ballSpeed + goalSpeed)));
    for (const goal of match.goals) advanceGoal(goal, step, random);
    if (match.phase === 'playing') {
      applyPlanetDynamics(match, step, arena, field, input.voiceLevel, random);
      moveBall(match, step, arena);
      if (match.winner !== null) return;
    } else {
      match.elapsed += step;
      if (match.phase === 'countdown' && match.elapsed >= 3 - 1e-9) {
        match.phase = 'playing';
        match.elapsed = 0;
        match.ball = launchBall(arena, random);
      } else if (match.phase === 'goal' && match.elapsed >= 1.2 - 1e-9) {
        match.phase = 'countdown';
        match.elapsed = 0;
        match.ball = waitingBall();
        match.scorer = null;
        for (const [id, effect] of Object.entries(match.planetEffects)) {
          effect.pulse = 0;
          if (id === `0:${match.selectedPlanet}`) effect.cooldown = 0;
        }
      }
    }
    remaining -= step;
  }
}
