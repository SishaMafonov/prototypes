export const REEL_COLUMNS = 5;
export const REEL_ROWS = 5;
export const SYMBOLS_PER_SPRITE = 5;
export const BET_CENTS = 100;
export const SYMBOL_TIERS = ['low', 'mid', 'high'] as const;
export const PRE_MYSTERY_WEIGHTS = { low: 49.5, mid: 27.0875, high: 16.2525, scatter: 7.16 } as const;
export const MYSTERY_WEIGHT = 10;
// Current calibrated raw draws. Historical pre-Mystery weights remain above for replay.
export const SYMBOL_WEIGHTS = {
  low: 35,
  mid: 32.5,
  high: 19.5,
  scatter: 3,
  mystery: MYSTERY_WEIGHT,
} as const;
export const KEEP_SCATTERS_ON_FLOOR_CHANGE = true;
export interface SymbolWeights { low: number; mid: number; high: number; scatter: number; mystery?: number }
export const ROOM_MULTIPLIERS = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  3, 3, 3, 3, 3, 3, 3, 3,
  5, 5, 5, 5, 5,
  8, 8, 8,
] as const;
export const MIN_WIN_COUNT = 5;
export const MIN_BONUS_SCATTERS = 6;
export const PRE_BALANCE_PAYTABLE_CENTS = {
  low: { 5: 1, 6: 5, 7: 10 },
  mid: { 5: 5, 6: 10, 7: 25 },
  high: { 5: 10, 6: 25, 7: 50 },
} as const;
export const PAYTABLE_CENTS = {
  low: { 5: 1, 6: 2, 7: 3 },
  mid: { 5: 2, 6: 3, 7: 5 },
  high: { 5: 3, 6: 5, 7: 10 },
} as const;
export type Paytable = Record<SymbolTier, Record<5 | 6 | 7, number>>;
const MULTIPLIERS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144] as const;

export type SymbolTier = 'low' | 'mid' | 'high';
export type SymbolKind = SymbolTier | 'scatter' | 'mystery';

export interface RegularSymbol {
  tier: SymbolTier;
  index: number;
}
export type ReelSymbol = RegularSymbol | { tier: 'scatter'; index: 0 } | { tier: 'mystery'; index: 0 };

export type Board = (ReelSymbol | null)[][];

export function getScatterBonusMoves(board: Board, alreadyAwarded = false): number {
  if (alreadyAwarded) return 0;
  const count = board.reduce((total, row) => total + row.filter((symbol) => symbol?.tier === 'scatter').length, 0);
  return count >= MIN_BONUS_SCATTERS ? count : 0;
}
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

export function drawSymbol(
  random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS, roomIndex?: number,
): ReelSymbol {
  const roll = random();
  const mysteryEnd = (weights.mystery ?? 0) / 100;
  if (roll < mysteryEnd) return { tier: 'mystery', index: 0 };
  if (roll >= (100 - weights.scatter) / 100) return { tier: 'scatter', index: 0 };
  const tier: SymbolTier = roll < mysteryEnd + weights.low / 100 ? 'low'
    : roll < mysteryEnd + (weights.low + weights.mid) / 100 ? 'mid' : 'high';
  return { tier, index: roomIndex ?? Math.floor(random() * SYMBOLS_PER_SPRITE) };
}

// Independent row-major raw draws: fifteen regular icons, Scatter and Mystery.
export function generateBoard(random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS): ReelSymbol[][] {
  return Array.from({ length: REEL_ROWS }, () =>
    Array.from({ length: REEL_COLUMNS }, () => drawSymbol(random, weights)));
}

// Decorative startup board only: every regular identity appears at most twice.
// No feature symbols, game RNG, evaluation or awards until the player starts a round.
export function createPreviewBoard(): RegularSymbol[][] {
  return Array.from({ length: REEL_ROWS }, (_, row) =>
    Array.from({ length: REEL_COLUMNS }, (_, column) => {
      const identity = ((row * REEL_COLUMNS + column) * 7) % (SYMBOL_TIERS.length * SYMBOLS_PER_SPRITE);
      return { tier: SYMBOL_TIERS[Math.floor(identity / SYMBOLS_PER_SPRITE)], index: identity % SYMBOLS_PER_SPRITE };
    }));
}

// Floor changes/room-feature clears retain Scatters in their original cells.
// Fresh paid rounds still use generateBoard and start with a clean board.
export function clearForFloor(board: Board): Board {
  return board.map((row) => row.map((symbol) => symbol?.tier === 'scatter' ? symbol : null));
}

export interface MysteryReveal {
  board: Board;
  cells: CellPosition[];
  symbol: RegularSymbol | null;
}

// One shared, uniformly chosen room symbol for the whole pending Mystery group.
export function revealMysteries(board: Board, roomIndex: number, random: () => number = Math.random): MysteryReveal {
  const cells: CellPosition[] = [];
  board.forEach((row, r) => row.forEach((symbol, c) => {
    if (symbol?.tier === 'mystery') cells.push({ row: r, column: c });
  }));
  if (!cells.length) return { board, cells, symbol: null };
  const symbol: RegularSymbol = { tier: SYMBOL_TIERS[Math.floor(random() * SYMBOL_TIERS.length)]!, index: roomIndex };
  return { board: board.map((row) => row.map((cell) => cell?.tier === 'mystery' ? symbol : cell)), cells, symbol };
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

export function findWins(board: Board, multiplier = 1, paytable: Paytable = PAYTABLE_CENTS): WinGroup[] {
  const groups = new Map<string, WinGroup>();
  board.forEach((row, rowIndex) => row.forEach((symbol, column) => {
    // Scatter awards bonus moves separately; it never joins paying regular groups.
    if (!symbol || symbol.tier === 'scatter' || symbol.tier === 'mystery') return;
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
    return { ...group, winCents: paytable[group.symbol.tier][quantity] * multiplier };
  });
}

export function removeWins(board: Board, wins: WinGroup[]): Board {
  const result = board.map((row) => [...row]);
  for (const group of wins) {
    for (const cell of group.cells) result[cell.row][cell.column] = null;
  }
  return result;
}

export function refillBoard(
  board: Board, random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS, roomIndex?: number,
): ReelSymbol[][] {
  return board.map((row) => row.map((symbol) => symbol ?? drawSymbol(random, weights, roomIndex)));
}

export function refillForRoom(
  board: Board, collected: ReadonlySet<SymbolTier>, roomIndex: number,
  random: () => number = Math.random, weights: SymbolWeights = SYMBOL_WEIGHTS,
): ReelSymbol[][] {
  return refillBoard(board, random, weights, collected.size > 0 ? roomIndex : undefined);
}

// Partial rooms continue while protected Scatters leave room for a five-symbol win.
export function shouldContinueRoom(collected: ReadonlySet<SymbolTier>, board?: Board): boolean {
  const regularSlots = board?.flat().filter((symbol) => symbol?.tier !== 'scatter').length;
  // Protected Scatters can leave too few slots for any five-symbol win.
  return collected.size > 0 && !isCollectionComplete(collected)
    && (regularSlots === undefined || regularSlots >= MIN_WIN_COUNT);
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
