import { keyOfEdge } from './Geometry.js';
import { simulateRay } from './RaySimulator.js';
import { captureCells, countScores } from './Scoring.js';
import type { GameState, LaunchPoint, PendingMove, StaticBoard } from './types.js';

export class Game {
  readonly board: StaticBoard;
  state: GameState;
  pending: PendingMove | null = null;
  private revision = 0;

  constructor(board: StaticBoard) { this.board = board; this.state = this.initialState(); }
  private initialState(): GameState {
    return { currentPlayer: 'X', phase: 'ready', trajectoryEdges: new Set(), trajectories: [],
      cells: this.board.cells.map(c => ({ ...c, owner: null })), scoreX: 0, scoreO: 0 };
  }
  preview(launch: LaunchPoint) { return simulateRay(launch, this.board); }
  beginMove(launch: LaunchPoint): PendingMove | null {
    if (this.state.phase !== 'ready') return null;
    const simulation = this.preview(launch);
    if (simulation.termination !== 'flat-wall') return null;
    this.pending = Object.freeze({ token: ++this.revision, player: this.state.currentPlayer, launch, simulation });
    this.state.phase = 'animating';
    return this.pending;
  }
  completeMove(token: number) {
    const pending = this.pending;
    if (!pending || pending.token !== token || this.state.phase !== 'animating') return null;
    const before = new Set([...this.board.staticKeys, ...this.state.trajectoryEdges]);
    for (const e of pending.simulation.edges) this.state.trajectoryEdges.add(keyOfEdge(e));
    const after = new Set([...this.board.staticKeys, ...this.state.trajectoryEdges]);
    const captured = captureCells(this.state.cells, before, after, pending.player);
    this.state.trajectories.push({ player: pending.player, launchId: pending.launch.id,
      edges: pending.simulation.edges, captured: captured.length });
    Object.assign(this.state, countScores(this.state.cells));
    this.pending = null;
    if (this.state.scoreX + this.state.scoreO === this.board.playableCount) this.state.phase = 'finished';
    else {
      this.state.currentPlayer = pending.player === 'X' ? 'O' : 'X';
      this.state.phase = 'ready';
    }
    return captured;
  }
  restart() {
    this.revision++;
    this.pending = null;
    this.state = this.initialState();
  }
}
