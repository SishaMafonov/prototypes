import { cellEdges, keyOfEdge } from './Geometry.js';
import { simulateRay } from './RaySimulator.js';
import type { Game } from './Game.js';
import type { GameState, LaunchPoint, StaticBoard } from './types.js';

interface Candidate { launch: LaunchPoint; keys: ReadonlySet<string> }

export class AIPlayer {
  private readonly candidates: Candidate[] = [];
  constructor(readonly board: StaticBoard) {
    // Reverse launches often draw the same path. Evaluate each distinct edge set once.
    const seen = new Set<string>();
    for (const launch of board.launchPoints) {
      const simulation = simulateRay(launch, board);
      if (simulation.termination !== 'flat-wall') continue;
      const keys = new Set(simulation.edges.map(keyOfEdge));
      const signature = [...keys].sort().join('|');
      if (seen.has(signature)) continue;
      seen.add(signature);
      this.candidates.push({ launch, keys });
    }
  }

  chooseMove(state: GameState): LaunchPoint | null {
    if (state.phase !== 'ready' || state.currentPlayer !== 'O') return null;
    const present = new Set([...this.board.staticKeys, ...state.trajectoryEdges]);
    const missing = state.cells.filter(c => !c.blocked && c.owner === null)
      .map(c => cellEdges(c.x, c.y).map(keyOfEdge).filter(key => !present.has(key)))
      .filter(edges => edges.length > 0);
    const moves = this.candidates.filter(move => [...move.keys].some(key => !present.has(key)));
    let best: Candidate | null = null;
    let bestValue = -Infinity, bestGain = -1, bestExposure = Infinity, bestNewEdges = Infinity;
    for (const move of moves) {
      const remaining = missing.map(edges => edges.filter(key => !move.keys.has(key)));
      const gain = remaining.filter(edges => edges.length === 0).length;
      const unclaimed = remaining.filter(edges => edges.length > 0);
      // Two-ply minimax: captures now minus the strongest immediate human reply.
      let replyGain = 0;
      for (const reply of moves) {
        const captures = unclaimed.filter(edges => edges.every(key => reply.keys.has(key))).length;
        replyGain = Math.max(replyGain, captures);
      }
      const value = gain - replyGain;
      const exposure = unclaimed.filter(edges => edges.length === 1).length;
      const newEdges = [...move.keys].filter(key => !present.has(key)).length;
      if (value > bestValue || (value === bestValue && (gain > bestGain ||
          (gain === bestGain && (exposure < bestExposure || (exposure === bestExposure && newEdges < bestNewEdges)))))) {
        best = move; bestValue = value; bestGain = gain; bestExposure = exposure; bestNewEdges = newEdges;
      }
    }
    return best?.launch ?? null;
  }
}

// The pause makes turns legible; cancellation and state identity guard stale callbacks.
export class AITurnScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  constructor(private readonly delay = 650) {}

  schedule(game: Game, ai: Pick<AIPlayer, 'chooseMove'>, onMove: (launch: LaunchPoint) => void) {
    this.cancel();
    const state = game.state, generation = this.generation;
    if (state.phase !== 'ready' || state.currentPlayer !== 'O') return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (generation !== this.generation || game.state !== state || state.phase !== 'ready' || state.currentPlayer !== 'O') return;
      const launch = ai.chooseMove(state);
      if (launch) onMove(launch);
    }, this.delay);
  }

  cancel() {
    this.generation++;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
