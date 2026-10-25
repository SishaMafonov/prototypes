export const REEL_COLUMNS = 5;
export const REEL_ROWS = 5;
export const SYMBOLS_PER_SPRITE = 5;
export const BET_CENTS = 100;
export const SYMBOL_TIERS = ['low', 'mid', 'high'] as const;
// Prototype calibration targets ~96% RTP with the group room bonus; see the recorded study.
export const SYMBOL_WEIGHTS = { low: 14.66, mid: 10, high: 70.34, scatter: 5 } as const;
export interface SymbolWeights { low: number; mid: number; high: number; scatter: number }
export const ROOM_MULTIPLIERS = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  3, 3, 3, 3, 3, 3, 3, 3,
  5, 5, 5, 5, 5,
  8, 8, 8,
] as const;
export const MIN_WIN_COUNT = 5;
export const PAYTABLE_CENTS = {
  low: { 5: 1, 6: 5, 7: 10 },
  mid: { 5: 5, 6: 10, 7: 25 },
  high: { 5: 10, 6: 25, 7: 50 },
} as const;
const MULTIPLIERS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144] as const;

export type SymbolTier = 'low' | 'mid' | 'high';
export type SymbolKind = SymbolTier | 'scatter';

export interface RegularSymbol {
  tier: SymbolTier;
  index: number;
}
export type ReelSymbol = RegularSymbol | { tier: 'scatter'; index: 0 };

export type Board = (ReelSymbol | null)[][];
export interface CellPosition { row: number; column: number }
export interface WinGroup {
  symbol: RegularSymbol;
  cells: CellPosition[];
  winCents: number;
}
export interface RoomWinGroup extends WinGroup {
  roomMultiplier: number;
  unboostedWinCents: number;
}

export function drawSymbol(random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS): ReelSymbol {
  const roll = random();
  if (roll >= (100 - weights.scatter) / 100) return { tier: 'scatter', index: 0 };
  const tier: SymbolTier = roll < weights.low / 100 ? 'low'
    : roll < (weights.low + weights.mid) / 100 ? 'mid' : 'high';
  return { tier, index: Math.floor(random() * SYMBOLS_PER_SPRITE) };
}

// Row-major board. Each cell draws independently from fifteen regular icons plus one scatter.
export function generateBoard(random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS): ReelSymbol[][] {
  return Array.from({ length: REEL_ROWS }, () =>
    Array.from({ length: REEL_COLUMNS }, () => drawSymbol(random, weights)));
}

export function applyRoomMultipliers(
  wins: WinGroup[], backgroundIndex: number, random: () => number = Math.random,
): RoomWinGroup[] {
  return wins.map((win) => {
    const roomMultiplier = win.symbol.index === backgroundIndex
      ? ROOM_MULTIPLIERS[Math.floor(random() * ROOM_MULTIPLIERS.length)] : 1;
    return { ...win, roomMultiplier, unboostedWinCents: win.winCents, winCents: win.winCents * roomMultiplier };
  });
}

export function getMultiplier(respinNumber: number): number {
  return MULTIPLIERS[Math.min(Math.max(0, Math.floor(respinNumber)), MULTIPLIERS.length - 1)];
}

export function findWins(board: Board, multiplier = 1): WinGroup[] {
  const groups = new Map<string, WinGroup>();
  board.forEach((row, rowIndex) => row.forEach((symbol, column) => {
    // Scatter features are pending; it neither pays nor joins regular matching groups.
    if (!symbol || symbol.tier === 'scatter') return;
    const key = `${symbol.tier}:${symbol.index}`;
    let group = groups.get(key);
    if (!group) {
      group = { symbol, cells: [], winCents: 0 };
      groups.set(key, group);
    }
    group.cells.push({ row: rowIndex, column });
  }));
  return [...groups.values()].filter((group) => group.cells.length >= MIN_WIN_COUNT).map((group) => {
    // One award per group; 7+ matches use the top paytable entry.
    const quantity = Math.min(group.cells.length, 7) as 5 | 6 | 7;
    return { ...group, winCents: PAYTABLE_CENTS[group.symbol.tier][quantity] * multiplier };
  });
}

export function removeWins(board: Board, wins: WinGroup[]): Board {
  const result = board.map((row) => [...row]);
  for (const group of wins) {
    for (const cell of group.cells) result[cell.row][cell.column] = null;
  }
  return result;
}

export function refillBoard(board: Board, random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS): ReelSymbol[][] {
  return board.map((row) => row.map((symbol) => symbol ?? drawSymbol(random, weights)));
}

export function collectWins(
  collected: ReadonlySet<SymbolTier>, wins: WinGroup[], backgroundIndex: number,
): Set<SymbolTier> {
  const result = new Set(collected);
  for (const group of wins) {
    if (group.symbol.index === backgroundIndex) result.add(group.symbol.tier);
  }
  return result;
}

export function isCollectionComplete(collected: ReadonlySet<SymbolTier>): boolean {
  return SYMBOL_TIERS.every((tier) => collected.has(tier));
}
