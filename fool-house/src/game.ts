export const REEL_COLUMNS = 5;
export const REEL_ROWS = 5;
export const SYMBOLS_PER_SPRITE = 5;
export const BET_CENTS = 100;
export const SYMBOL_TIERS = ['low', 'mid', 'high'] as const;
// Percentages; regular tiers retain their original 60:25:15 ratio within the remaining 95%.
export const SYMBOL_WEIGHTS = { low: 57, mid: 23.75, high: 14.25, scatter: 5 } as const;
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

export function drawSymbol(random: () => number = Math.random): ReelSymbol {
  const roll = random();
  if (roll >= (100 - SYMBOL_WEIGHTS.scatter) / 100) return { tier: 'scatter', index: 0 };
  const tier: SymbolTier = roll < SYMBOL_WEIGHTS.low / 100 ? 'low'
    : roll < (SYMBOL_WEIGHTS.low + SYMBOL_WEIGHTS.mid) / 100 ? 'mid' : 'high';
  return { tier, index: Math.floor(random() * SYMBOLS_PER_SPRITE) };
}

// Row-major board. Each cell draws independently from fifteen regular icons plus one scatter.
export function generateBoard(random: () => number = Math.random): ReelSymbol[][] {
  return Array.from({ length: REEL_ROWS }, () =>
    Array.from({ length: REEL_COLUMNS }, () => drawSymbol(random)));
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

export function refillBoard(board: Board, random: () => number = Math.random): ReelSymbol[][] {
  return board.map((row) => row.map((symbol) => symbol ?? drawSymbol(random)));
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
