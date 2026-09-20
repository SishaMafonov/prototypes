import type { GameState, StaticBoard } from './types.js';

export const highScoreStorageKey = 'core-near-high-score-v1';
export interface HighScore {
  version: 1;
  score: number;
  totalCells: number;
  boardId: string;
  achievedAt: string;
}
type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;

function parseRecord(raw: string | null): HighScore | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Number.isSafeInteger(value.score) || !Number.isSafeInteger(value.totalCells) ||
        value.score <= 0 || value.totalCells > 10000 || value.score > value.totalCells || value.score <= value.totalCells / 2 ||
        typeof value.boardId !== 'string' || !value.boardId || value.boardId.length > 100 ||
        typeof value.achievedAt !== 'string' || !Number.isFinite(Date.parse(value.achievedAt))) return null;
    return { version: 1, score: value.score, totalCells: value.totalCells, boardId: value.boardId, achievedAt: value.achievedAt };
  } catch { return null; }
}

export class HighScoreStore {
  best: HighScore | null = null;
  persistent = false;
  constructor(private readonly storage: ScoreStorage | null) { this.refresh(); }

  refresh() {
    if (!this.storage) { this.persistent = false; return; }
    try {
      this.best = parseRecord(this.storage.getItem(highScoreStorageKey));
      this.persistent = true;
    } catch { this.persistent = false; }
  }

  recordWin(state: GameState, board: StaticBoard): boolean {
    if (state.phase !== 'finished' || state.scoreX <= state.scoreO || state.scoreX + state.scoreO !== board.playableCount ||
        !Number.isSafeInteger(state.scoreX) || !Number.isSafeInteger(state.scoreO) || state.scoreO < 0) return false;
    // Merge with the latest stored record so another tab's higher score is retained.
    const sessionBest = this.best, wasPersistent = this.persistent;
    this.refresh();
    if (sessionBest && (!this.best || sessionBest.score > this.best.score)) {
      this.best = sessionBest; this.persistent = wasPersistent;
    }
    if (this.best && state.scoreX <= this.best.score) return false;
    this.best = { version: 1, score: state.scoreX, totalCells: board.playableCount, boardId: board.id, achievedAt: new Date().toISOString() };
    this.persistent = false;
    if (this.storage) {
      try {
        this.storage.setItem(highScoreStorageKey, JSON.stringify(this.best));
        this.persistent = true;
      } catch { /* Preserve the record for this session even if writing is denied. */ }
    }
    return true;
  }
}
