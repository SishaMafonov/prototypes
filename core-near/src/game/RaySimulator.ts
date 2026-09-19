import { arrival, between, canTraverse, vectors } from './Geometry.js';
import type { Direction, GridPoint, LaunchPoint, RaySimulation, StaticBoard } from './types.js';

// This small transition interface also permits deterministic loop-safeguard tests.
export interface RayGeometry {
  canTraverse(a: GridPoint, b: GridPoint): boolean;
  arrival(point: GridPoint, direction: Direction): Direction | 'flat-wall' | 'invalid';
}
export function traceRay(start: GridPoint, initial: Direction, geometry: RayGeometry, stateLimit: number): RaySimulation {
  const points: GridPoint[] = [{ x: start.x, y: start.y }];
  const edges = [];
  const visited = new Set<string>();
  let current = points[0], direction = initial;
  while (true) {
    const key = `${current.x},${current.y},${direction}`;
    if (visited.has(key)) return { points, edges, termination: 'loop' };
    if (visited.size >= stateLimit) return { points, edges, termination: 'invalid' };
    visited.add(key);
    const vector = vectors[direction];
    const next = { x: current.x + vector.x, y: current.y + vector.y };
    if (!geometry.canTraverse(current, next)) return { points, edges, termination: 'invalid' };
    edges.push(between(current, next));
    points.push(next);
    current = next;
    const result = geometry.arrival(current, direction);
    if (result === 'flat-wall' || result === 'invalid') return { points, edges, termination: result };
    direction = result;
  }
}
export function simulateRay(launch: LaunchPoint, board: StaticBoard): RaySimulation {
  const valid = board.launchPoints.some(p => p.id === launch.id && p.x === launch.x &&
    p.y === launch.y && p.direction === launch.direction);
  if (!valid) return { points: [], edges: [], termination: 'invalid' };
  return traceRay(launch, launch.direction, {
    canTraverse: (a, b) => canTraverse(board, a, b),
    arrival: (p, d) => arrival(board, p, d),
  }, 4 * (board.width + 1) * (board.height + 1));
}
