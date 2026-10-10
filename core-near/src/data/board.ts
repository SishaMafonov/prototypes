import type { BoardDefinition, Direction, StaticEdge } from '../game/types.js';

// Exact small fixture from gameRules/03_GEOMETRY_AND_CSV_EXAMPLES.md.
// A space is outside the outline; # is an interior blocked cell.
const rows = ['.... ', '.....', '..#..', '.....', '.....'];
const walls: [number, number, number, number, StaticEdge['type']][] = [
  [0, 0, 4, 0, 'boundary'], [4, 0, 4, 1, 'boundary'], [4, 1, 5, 1, 'boundary'],
  [5, 1, 5, 5, 'boundary'], [5, 5, 0, 5, 'boundary'], [0, 5, 0, 0, 'boundary'],
  [2, 2, 3, 2, 'obstacle'], [3, 2, 3, 3, 'obstacle'], [3, 3, 2, 3, 'obstacle'], [2, 3, 2, 2, 'obstacle'],
];
const launches: [number, number, Direction][] = [
  [1, 0, 'S'], [2, 0, 'S'], [3, 0, 'S'], [5, 2, 'W'], [5, 3, 'W'], [5, 4, 'W'],
  [1, 5, 'N'], [2, 5, 'N'], [3, 5, 'N'], [4, 5, 'N'],
  [0, 1, 'E'], [0, 2, 'E'], [0, 3, 'E'], [0, 4, 'E'],
];
export const boardDefinition: BoardDefinition = {
  id: 'irregular-5x5', width: 5, height: 5,
  cells: rows.flatMap((row, y) => [...row].flatMap((mark, x) => mark === ' ' ? [] : [{ x, y, blocked: mark === '#' }])),
  staticEdges: walls.map(([x1, y1, x2, y2, type]) => ({ x1, y1, x2, y2, type })),
  launchPoints: launches.map(([x, y, direction], index) => ({ id: `L${String(index + 1).padStart(3, '0')}`, x, y, direction })),
};
