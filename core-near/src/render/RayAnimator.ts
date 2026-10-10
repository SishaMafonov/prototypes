import type { GridPoint, RaySimulation } from '../game/types.js';

export interface AnimationFrame { points: GridPoint[]; head: GridPoint; complete: boolean }
interface Travel { from: GridPoint; to: GridPoint; start: number; end: number }
export class RayAnimator {
  private readonly travels: Travel[];
  readonly duration: number;
  constructor(readonly simulation: RaySimulation, readonly startedAt: number, cellsPerSecond = 8) {
    let elapsed = 0;
    this.travels = simulation.edges.map((_, i) => {
      const from = simulation.points[i], to = simulation.points[i + 1];
      const travel = { from, to, start: elapsed, end: elapsed + 1000 / cellsPerSecond };
      elapsed = travel.end;
      const next = simulation.points[i + 2];
      if (next && (to.x - from.x !== next.x - to.x || to.y - from.y !== next.y - to.y)) elapsed += 75;
      return travel;
    });
    this.duration = elapsed;
  }
  frame(now: number): AnimationFrame {
    const elapsed = Math.max(0, now - this.startedAt);
    const points = [{ ...this.simulation.points[0] }];
    for (const travel of this.travels) {
      if (elapsed < travel.start) break;
      if (elapsed >= travel.end) points.push({ ...travel.to });
      else {
        const t = (elapsed - travel.start) / (travel.end - travel.start);
        points.push({ x: travel.from.x + (travel.to.x - travel.from.x) * t,
          y: travel.from.y + (travel.to.y - travel.from.y) * t });
        break;
      }
    }
    return { points, head: points[points.length - 1], complete: elapsed >= this.duration };
  }
}
