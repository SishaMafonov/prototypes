export type GoalMotion = {
  // Normalized travel keeps the goal in the same relative position after a resize.
  position: number;
  direction: 1 | -1;
  speed: number;
};

function randomSpeed(random: () => number): number {
  // One trip takes roughly four to ten seconds, independently of screen size.
  return 0.1 + random() * 0.14;
}

export function createGoal(position = 0, random = Math.random): GoalMotion {
  return { position, direction: 1, speed: randomSpeed(random) };
}

export function advanceGoal(goal: GoalMotion, seconds: number, random = Math.random): void {
  let remaining = seconds;
  while (remaining > 0) {
    const distance = goal.direction === 1 ? 1 - goal.position : goal.position;
    const timeToEdge = distance / goal.speed;
    if (remaining < timeToEdge) {
      goal.position += goal.direction * goal.speed * remaining;
      return;
    }

    goal.position = goal.direction === 1 ? 1 : 0;
    remaining -= timeToEdge;
    if (goal.direction === 1) {
      goal.direction = -1;
    } else {
      goal.direction = 1;
      goal.speed = randomSpeed(random);
    }
  }
}
