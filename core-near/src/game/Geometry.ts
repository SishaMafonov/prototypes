import type { Direction, Edge, GridPoint, StaticBoard } from './types.js';

export const vectors: Record<Direction, GridPoint> = {
  N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 },
};
export const pointKey = (p: GridPoint): string => `${p.x},${p.y}`;
export function edgeKey(a: GridPoint, b: GridPoint): string {
  const first = a.x < b.x || (a.x === b.x && a.y < b.y) ? a : b;
  const second = first === a ? b : a;
  return `${first.x},${first.y}-${second.x},${second.y}`;
}
export const keyOfEdge = (e: Edge): string => edgeKey({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 });
export const between = (a: GridPoint, b: GridPoint): Edge => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
export function expandSegment(e: Edge): Edge[] {
  if (![e.x1, e.y1, e.x2, e.y2].every(Number.isSafeInteger) ||
      (e.x1 === e.x2 && e.y1 === e.y2) || (e.x1 !== e.x2 && e.y1 !== e.y2)) {
    throw new Error('Wall segments must have distinct, integer, axis-aligned endpoints.');
  }
  const dx = Math.sign(e.x2 - e.x1), dy = Math.sign(e.y2 - e.y1);
  const edges: Edge[] = [];
  for (let x = e.x1, y = e.y1; x !== e.x2 || y !== e.y2; x += dx, y += dy) {
    edges.push({ x1: x, y1: y, x2: x + dx, y2: y + dy });
  }
  return edges;
}
export function cellEdges(x: number, y: number): Edge[] {
  return [
    { x1: x, y1: y, x2: x + 1, y2: y },
    { x1: x + 1, y1: y, x2: x + 1, y2: y + 1 },
    { x1: x, y1: y + 1, x2: x + 1, y2: y + 1 },
    { x1: x, y1: y, x2: x, y2: y + 1 },
  ];
}
export function adjacentCells(e: Edge): [GridPoint, GridPoint] {
  const x = Math.min(e.x1, e.x2), y = Math.min(e.y1, e.y2);
  return e.y1 === e.y2 ? [{ x, y: y - 1 }, { x, y }] : [{ x: x - 1, y }, { x, y }];
}
export function isPlayable(board: StaticBoard, p: GridPoint): boolean {
  const cell = board.cellMap.get(pointKey(p));
  return cell !== undefined && !cell.blocked;
}
export function quadrants(board: StaticBoard, p: GridPoint): boolean[] {
  return [{ x: p.x - 1, y: p.y - 1 }, { x: p.x, y: p.y - 1 },
    { x: p.x, y: p.y }, { x: p.x - 1, y: p.y }].map(c => isPlayable(board, c));
}
export const cornerTurns: ReadonlyArray<Partial<Record<Direction, Direction>>> = [
  { N: 'E', W: 'S' }, // NW solid
  { N: 'W', E: 'S' }, // NE solid
  { S: 'W', E: 'N' }, // SE solid
  { S: 'E', W: 'N' }, // SW solid
];
export function reflect(solidQuadrant: number, incoming: Direction): Direction | null {
  return cornerTurns[solidQuadrant]?.[incoming] ?? null;
}
export function canTraverse(board: StaticBoard, a: GridPoint, b: GridPoint): boolean {
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return false;
  const edge = between(a, b);
  return !board.staticKeys.has(keyOfEdge(edge)) && adjacentCells(edge).every(c => isPlayable(board, c));
}
export function arrival(board: StaticBoard, p: GridPoint, incoming: Direction): Direction | 'flat-wall' | 'invalid' {
  const mask = quadrants(board, p), count = mask.filter(Boolean).length;
  if (count === 4) return incoming;
  if (count === 3) return reflect(mask.indexOf(false), incoming) ?? 'invalid';
  if (count === 2 && mask[0] !== mask[2]) return 'flat-wall';
  return 'invalid';
}
