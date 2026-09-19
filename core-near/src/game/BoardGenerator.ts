import { loadBoard } from './Board.js';
import { adjacentCells, canTraverse, cellEdges, keyOfEdge, pointKey, quadrants, vectors } from './Geometry.js';
import type { CellDefinition, Direction, GridPoint, LaunchPoint, StaticBoard, StaticEdge } from './types.js';

export const BOARD_SIZE = 20;
export interface GeneratedBoard { readonly board: StaticBoard; readonly seed: number; readonly islands: number; readonly notches: number }

// Mulberry32: identical seeds reproduce identical layouts, including rejected candidates.
function randomSource(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

// Build all interfaces and eligible launch points from the explicit cell mask.
// The original loader remains the authority for geometry and reachability.
export function boardFromCells(cells: readonly CellDefinition[], id: string, width = BOARD_SIZE, height = BOARD_SIZE): StaticBoard {
  const cellMap = new Map(cells.map(c => [pointKey(c), c]));
  const edges = new Map<string, StaticEdge>();
  const outerVertices = new Set<string>();
  for (const cell of cells) {
    if (cell.blocked) continue;
    for (const edge of cellEdges(cell.x, cell.y)) {
      const neighbor = adjacentCells(edge).find(p => p.x !== cell.x || p.y !== cell.y)!;
      const other = cellMap.get(pointKey(neighbor));
      if (other && !other.blocked) continue;
      const type = other ? 'obstacle' : 'boundary';
      edges.set(keyOfEdge(edge), { ...edge, type });
      if (type === 'boundary') {
        outerVertices.add(`${edge.x1},${edge.y1}`);
        outerVertices.add(`${edge.x2},${edge.y2}`);
      }
    }
  }
  const launchPoints: LaunchPoint[] = [];
  const candidate: StaticBoard = { id, width, height, cells, cellMap, staticEdges: [...edges.values()],
    staticKeys: new Set(edges.keys()), launchPoints, playableCount: cells.filter(c => !c.blocked).length };
  for (let y = 0; y <= height; y++) for (let x = 0; x <= width; x++) {
    if (!outerVertices.has(`${x},${y}`)) continue;
    const mask = quadrants(candidate, { x, y });
    if (mask.filter(Boolean).length !== 2 || mask[0] === mask[2]) continue;
    for (const direction of Object.keys(vectors) as Direction[]) {
      const v = vectors[direction];
      if (canTraverse(candidate, { x, y }, { x: x + v.x, y: y + v.y })) {
        launchPoints.push({ id: `L${String(launchPoints.length + 1).padStart(3, '0')}`, x, y, direction });
      }
    }
  }
  return loadBoard(candidate);
}

// Compact, connected island footprints; each is randomly rotated before placement.
const islandShapes: readonly (readonly GridPoint[])[] = [
  [{ x: 0, y: 0 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
];

export function generateBoard(seed: number): GeneratedBoard {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Board seed must be an unsigned 32-bit integer.');
  const random = randomSource(seed);
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const id = `islands-${seed.toString(16).padStart(8, '0')}`;

  // Bounded retries; a rejected feature never replaces the last validated board.
  for (let attempt = 0; attempt < 4; attempt++) {
    let cells: CellDefinition[] = Array.from({ length: BOARD_SIZE ** 2 }, (_, i) => ({
      x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE), blocked: false,
    }));
    let board = boardFromCells(cells, id);
    const accept = (next: CellDefinition[]): boolean => {
      try {
        const validated = boardFromCells(next, id);
        cells = next; board = validated;
        return true;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Invalid board:')) return false;
        throw error;
      }
    };
    let notches = 0, islands = 0;
    const targetNotches = integer(8, 12), targetIslands = integer(6, 9);
    for (let trial = 0; trial < 80 && notches < targetNotches; trial++) {
      const side = trial % 4, length = integer(2, 5), depth = integer(1, 3);
      const start = integer(2, BOARD_SIZE - length - 2);
      const cut = new Set<string>();
      for (let along = start; along < start + length; along++) for (let inward = 0; inward < depth; inward++) {
        const p = side === 0 ? { x: along, y: inward } : side === 1 ? { x: BOARD_SIZE - 1 - inward, y: along } :
          side === 2 ? { x: along, y: BOARD_SIZE - 1 - inward } : { x: inward, y: along };
        cut.add(pointKey(p));
      }
      // Keep a full-cell gap between separate notches, including diagonally.
      let clear = true;
      for (const key of cut) {
        const [x, y] = key.split(',').map(Number);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE && !board.cellMap.has(`${nx},${ny}`)) clear = false;
        }
      }
      if (clear && accept(cells.filter(c => !cut.has(pointKey(c))))) notches++;
    }
    for (let trial = 0; trial < 120 && islands < targetIslands; trial++) {
      const shape = islandShapes[integer(0, islandShapes.length - 1)];
      const rotation = integer(0, 3);
      const rotated = shape.map(p => rotation === 0 ? p : rotation === 1 ? { x: -p.y, y: p.x } :
        rotation === 2 ? { x: -p.x, y: -p.y } : { x: p.y, y: -p.x });
      const minX = Math.min(...rotated.map(p => p.x)), minY = Math.min(...rotated.map(p => p.y));
      const x = integer(4, BOARD_SIZE - 7), y = integer(4, BOARD_SIZE - 7);
      const footprint = rotated.map(p => ({ x: x + p.x - minX, y: y + p.y - minY }));
      // A clear ring prevents touching islands and keeps all approaches playable.
      if (footprint.some(p => {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const neighbor = board.cellMap.get(`${p.x + dx},${p.y + dy}`);
          if (!neighbor || neighbor.blocked) return true;
        }
        return false;
      })) continue;
      const blocked = new Set(footprint.map(pointKey));
      if (accept(cells.map(c => blocked.has(pointKey(c)) ? { ...c, blocked: true } : c))) islands++;
    }
    if (notches >= 6 && islands >= 4) return { board, seed, islands, notches };
  }
  throw new Error('Could not generate a fully claimable board. Please try a new board.');
}
