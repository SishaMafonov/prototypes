import { adjacentCells, canTraverse, cellEdges, expandSegment, keyOfEdge, pointKey, quadrants, vectors } from './Geometry.js';
import { isCellComplete } from './Scoring.js';
import { simulateRay } from './RaySimulator.js';
import type { BoardDefinition, Direction, LaunchPoint, StaticBoard, StaticEdge } from './types.js';

const fail = (message: string): never => { throw new Error(`Invalid board: ${message}`); };
export function loadBoard(definition: BoardDefinition): StaticBoard {
  const { width, height } = definition;
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 100)) fail('dimensions must be integers from 1 to 100.');
  const cells = definition.cells.map(c => Object.freeze({ ...c }));
  const cellMap = new Map(cells.map(c => [pointKey(c), c]));
  if (cellMap.size !== cells.length || !cells.length) fail('cell mask is empty or contains duplicate cells.');
  for (const c of cells) {
    if (![c.x, c.y].every(Number.isSafeInteger) || c.x < 0 || c.y < 0 || c.x >= width || c.y >= height || typeof c.blocked !== 'boolean') fail('invalid cell coordinate or blocked flag.');
    if (c.blocked && Object.values(vectors).some(v => !cellMap.has(`${c.x + v.x},${c.y + v.y}`))) fail('obstacles must be wholly inside the outline.');
  }
  const edges = new Map<string, StaticEdge>();
  for (const segment of definition.staticEdges) {
    if (segment.type !== 'boundary' && segment.type !== 'obstacle') fail('unknown wall classification.');
    if ([segment.x1, segment.x2].some(x => x < 0 || x > width) || [segment.y1, segment.y2].some(y => y < 0 || y > height)) fail('wall outside board bounds.');
    for (const edge of expandSegment(segment)) {
      const key = keyOfEdge(edge), previous = edges.get(key);
      if (previous && previous.type !== segment.type) fail(`conflicting wall types at ${key}.`);
      edges.set(key, Object.freeze({ ...edge, type: segment.type }));
    }
  }
  const expected = new Map<string, StaticEdge['type']>();
  for (const cell of cells.filter(c => !c.blocked)) {
    for (const e of cellEdges(cell.x, cell.y)) {
      const neighbor = adjacentCells(e).find(c => c.x !== cell.x || c.y !== cell.y)!;
      const other = cellMap.get(pointKey(neighbor));
      if (!other || other.blocked) expected.set(keyOfEdge(e), other ? 'obstacle' : 'boundary');
    }
  }
  if (expected.size !== edges.size || [...expected].some(([key, type]) => edges.get(key)?.type !== type)) fail('static walls must exactly match the playable/solid interfaces.');

  // Every static component must be a simple closed cycle. The outer outline is one cycle.
  const graph = new Map<string, Set<string>>();
  const nodeTypes = new Map<string, Set<string>>();
  for (const e of edges.values()) {
    const a = `${e.x1},${e.y1}`, b = `${e.x2},${e.y2}`;
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!graph.has(from)) graph.set(from, new Set());
      graph.get(from)!.add(to);
      if (!nodeTypes.has(from)) nodeTypes.set(from, new Set());
      nodeTypes.get(from)!.add(e.type);
    }
  }
  if ([...graph.values()].some(n => n.size !== 2) || [...nodeTypes.values()].some(t => t.size !== 1)) fail('walls may not touch, cross, or form open junctions.');
  let outerLoops = 0;
  const seen = new Set<string>();
  for (const start of graph.keys()) {
    if (seen.has(start)) continue;
    if (nodeTypes.get(start)!.has('boundary')) outerLoops++;
    const queue = [start];
    while (queue.length) {
      const node = queue.pop()!;
      if (seen.has(node)) continue;
      seen.add(node);
      queue.push(...graph.get(node)!);
    }
  }
  if (outerLoops !== 1) fail('the outer boundary must be one closed simple outline.');
  const launchPoints = definition.launchPoints.map(p => Object.freeze({ ...p }));
  const board: StaticBoard = Object.freeze({ ...definition, cells: Object.freeze(cells), cellMap,
    staticEdges: Object.freeze([...edges.values()]), staticKeys: new Set(edges.keys()),
    launchPoints: Object.freeze(launchPoints), playableCount: cells.filter(c => !c.blocked).length });
  const eligible = new Set<string>();
  for (let y = 0; y <= height; y++) for (let x = 0; x <= width; x++) {
    const mask = quadrants(board, { x, y });
    if (mask.filter(Boolean).length === 2 && mask[0] === mask[2]) fail(`diagonal contact at ${x},${y}.`);
    if (mask.filter(Boolean).length !== 2 || !nodeTypes.get(`${x},${y}`)?.has('boundary')) continue;
    for (const [direction, v] of Object.entries(vectors)) {
      if (canTraverse(board, { x, y }, { x: x + v.x, y: y + v.y })) eligible.add(`${x},${y},${direction}`);
    }
  }
  const supplied = new Set(launchPoints.map(p => `${p.x},${p.y},${p.direction}`));
  if (supplied.size !== launchPoints.length || new Set(launchPoints.map(p => p.id)).size !== launchPoints.length ||
      supplied.size !== eligible.size || [...supplied].some(key => !eligible.has(key))) fail('launch list must contain every eligible inward outer-wall launch exactly once.');
  for (const c of cells.filter(c => !c.blocked)) {
    if (isCellComplete(c.x, c.y, board.staticKeys)) fail(`cell ${pointKey(c)} is complete before any move.`);
  }
  const reachable = new Set(board.staticKeys);
  for (const launch of launchPoints) {
    const simulation = simulateRay(launch, board);
    if (simulation.termination === 'flat-wall') for (const e of simulation.edges) reachable.add(keyOfEdge(e));
  }
  const unreachable = cells.find(c => !c.blocked && !isCellComplete(c.x, c.y, reachable));
  if (unreachable) fail(`cell ${pointKey(unreachable)} cannot be completed by terminating rays.`);
  return board;
}

export function findLaunch(board: StaticBoard, id: string): LaunchPoint {
  const launch = board.launchPoints.find(p => p.id === id);
  if (!launch) throw new Error(`Unknown launch: ${id}`);
  return launch;
}
export const directionName: Record<Direction, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };
