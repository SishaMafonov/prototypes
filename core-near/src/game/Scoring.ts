import { cellEdges, keyOfEdge } from './Geometry.js';
import type { CellState, Player } from './types.js';

export function isCellComplete(x: number, y: number, edges: ReadonlySet<string>): boolean {
  return cellEdges(x, y).every(e => edges.has(keyOfEdge(e)));
}
export function captureCells(cells: CellState[], before: ReadonlySet<string>, after: ReadonlySet<string>, player: Player): CellState[] {
  const captured: CellState[] = [];
  for (const cell of cells) {
    if (!cell.blocked && cell.owner === null && !isCellComplete(cell.x, cell.y, before) && isCellComplete(cell.x, cell.y, after)) {
      cell.owner = player;
      captured.push(cell);
    }
  }
  return captured;
}
export function countScores(cells: readonly CellState[]): { scoreX: number; scoreO: number } {
  return {
    scoreX: cells.filter(c => !c.blocked && c.owner === 'X').length,
    scoreO: cells.filter(c => !c.blocked && c.owner === 'O').length,
  };
}
export function winner(scoreX: number, scoreO: number): Player | 'draw' {
  return scoreX === scoreO ? 'draw' : scoreX > scoreO ? 'X' : 'O';
}
