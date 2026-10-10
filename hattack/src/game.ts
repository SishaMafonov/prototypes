export const REEL_COUNT = 5;
export const ROW_COUNT = 4;
export const MIN_REEL_LENGTH = 30;
export const MAX_REEL_LENGTH = 110;
export const MAX_REEL_WILDS = 3;
export const TOTAL_WAYS = ROW_COUNT ** REEL_COUNT;

export type Category = 'low' | 'mid' | 'high' | 'wild' | 'scatter';
export type RandomSource = () => number;

export interface SlotSymbol {
  id: string;
  category: Category;
  sheet: 'low' | 'mid' | 'high' | 'bonus';
  frame: number;
  name: string;
}

const names = {
  low: ['Comfort food', 'Workout', 'Jewellery', 'Cash', 'Beauty kit', 'Kiss mirror'],
  mid: ['Wing lover', 'Glamour date', 'Gym date', 'Cocktail date', 'Silver fox', 'Party date'],
  high: ['Rose gentleman', 'Rose lady', 'Suited gentleman', 'Elegant lady', 'Wine gentleman', 'Elegant silver lady'],
};

// Weights apply to the whole category, rather than to each individual frame.
// Cascade refills never draw Wilds; generated strips use their own weights below.
// These are relative weights (currently totaling 1.07), normalized on every draw.
export const CATEGORY_WEIGHTS: Readonly<Record<Category, number>> = {
  low: 0.8, mid: 0.11, high: 0.095, wild: 0, scatter: 0.065,
};
export const REEL_CATEGORY_WEIGHTS: Readonly<Record<Category, number>> = {
  ...CATEGORY_WEIGHTS, low: 0.775, wild: 0.025,
};

export const SYMBOLS: readonly SlotSymbol[] = [
  ...(['low', 'mid', 'high'] as const).flatMap((category) =>
    names[category].map((name, frame) => ({ id: `${category}-${frame}`, category, sheet: category, frame, name })),
  ),
  { id: 'wild', category: 'wild', sheet: 'bonus', frame: 0, name: 'Wild' },
  { id: 'scatter', category: 'scatter', sheet: 'bonus', frame: 1, name: 'Scatter' },
];

const categories = Object.keys(CATEGORY_WEIGHTS) as Category[];
const symbolsByCategory = Object.fromEntries(
  categories.map((category) => [category, SYMBOLS.filter((symbol) => symbol.category === category)]),
) as Record<Category, SlotSymbol[]>;

export interface Reel { strip: SlotSymbol[]; stop: number }
export interface Cell { reel: number; row: number }
export interface WaysWin { symbol: SlotSymbol; reelCount: number; ways: number; cells: Cell[] }
export interface Result {
  wins: WaysWin[];
  totalWays: number;
  scatterCount: number;
  scatterCells: Cell[];
  // Reserved for the next phase; never contributes to ways or clearing.
  scatterTrigger: boolean;
}

export const BET_CENTS = 100;
// Integer cents keep accumulated cascade payouts exact.
export const PAYOUT_CENTS = {
  low: { 3: 5, 4: 10, 5: 25 },
  mid: { 3: 25, 4: 50, 5: 75 },
  high: { 3: 75, 4: 100, 5: 200 },
} as const;

export function winCents(result: Result): number {
  return result.wins.reduce((total, win) => {
    const category = win.symbol.category;
    if (category === 'wild' || category === 'scatter') return total;
    const payout = PAYOUT_CENTS[category][win.reelCount as 3 | 4 | 5] ?? 0;
    return total + payout * win.ways;
  }, 0);
}

export function returnToPlayer(totalWinCents: number, rounds: number): number {
  return rounds > 0 ? totalWinCents / (rounds * BET_CENTS) : 0;
}

export interface SymbolDrop {
  symbol: SlotSymbol;
  reel: number;
  fromRow: number;
  toRow: number;
}
export interface Cascade {
  grid: SlotSymbol[][];
  removed: Cell[];
  drops: SymbolDrop[];
}

export interface HeartWilds {
  grid: SlotSymbol[][];
  placements: Cell[];
}

export const LOVE_METER_MAX = 10;
export interface LoveArrows { charge: number; targets: Cell[] }

export function chargeLoveMeter(charge: number, result: Result): number {
  return Math.min(LOVE_METER_MAX, Math.max(0, charge) + Number(result.totalWays > 0));
}

export function nextBoardAction(
  result: Result, hearts: number, loveCharge: number, arrowsPending: boolean,
): 'win' | 'heart-wilds' | 'love-arrows' | 'idle' {
  if (result.totalWays > 0) return 'win';
  if (hearts > 0) return 'heart-wilds';
  if (loveCharge > 0 && arrowsPending) return 'love-arrows';
  return 'idle';
}

export function selectLoveArrows(
  grid: readonly (readonly SlotSymbol[])[], charge: number, random: RandomSource = Math.random,
): LoveArrows {
  const level = Math.min(LOVE_METER_MAX, Math.max(0, Math.floor(charge)));
  if (level === 0) return { charge: level, targets: [] };
  const eligible = grid.flatMap((column, reel) => column.flatMap((symbol, row) =>
    symbol.category === 'wild' || symbol.category === 'scatter' ? [] : [{ reel, row }],
  ));
  if (level === LOVE_METER_MAX) return { charge: level, targets: eligible };
  const [min, max] = level <= 5 ? [1, 3] : level <= 8 ? [3, 8] : [8, 15];
  const count = Math.min(eligible.length, randomInteger(min, max, random));
  for (let index = 0; index < count; index++) {
    const pick = randomInteger(index, eligible.length - 1, random);
    [eligible[index], eligible[pick]] = [eligible[pick], eligible[index]];
  }
  return { charge: level, targets: eligible.slice(0, count) };
}

export function heartsForResult(result: Result): number {
  const eligibleWins = result.wins.filter((win) => win.symbol.category === 'mid' || win.symbol.category === 'high');
  return Math.max(0, ...eligibleWins.map((win) => win.reelCount));
}

export function placeHeartWilds(
  grid: readonly (readonly SlotSymbol[])[], hearts: number, random: RandomSource = Math.random,
): HeartWilds {
  const next = grid.map((column) => [...column]);
  const eligible = grid.flatMap((column, reel) => column.flatMap((symbol, row) =>
    symbol.category === 'wild' || symbol.category === 'scatter' ? [] : [{ reel, row }],
  ));
  const count = Math.min(REEL_COUNT, Math.max(0, Math.floor(hearts)), eligible.length);
  const placements: Cell[] = [];
  const wild = SYMBOLS.find((symbol) => symbol.category === 'wild')!;
  // Pick distinct cells uniformly. Multiple Wilds may land on the same reel;
  // spreading one on every reel would guarantee an endless five-Wild win.
  for (let index = 0; index < count; index++) {
    const pick = randomInteger(index, eligible.length - 1, random);
    [eligible[index], eligible[pick]] = [eligible[pick], eligible[index]];
    const cell = eligible[index];
    next[cell.reel][cell.row] = wild;
    placements.push(cell);
  }
  return { grid: next, placements };
}

export function winningCells(result: Result): Cell[] {
  const cells = new Map<string, Cell>();
  for (const win of result.wins) {
    for (const cell of win.cells) cells.set(`${cell.reel}-${cell.row}`, cell);
  }
  return [...cells.values()];
}

export function createCascade(
  grid: readonly (readonly SlotSymbol[])[], result: Result, random: RandomSource = Math.random,
): Cascade {
  return createRemovalCascade(grid, winningCells(result), random);
}

export function createRemovalCascade(
  grid: readonly (readonly SlotSymbol[])[], cells: readonly Cell[], random: RandomSource = Math.random,
): Cascade {
  const removed = [...new Map(cells.map((cell) => [`${cell.reel}-${cell.row}`, cell])).values()];
  const keys = new Set(removed.map((cell) => `${cell.reel}-${cell.row}`));
  const drops: SymbolDrop[] = [];
  const nextGrid = grid.map((column, reel) => {
    const survivors = column.flatMap((symbol, row) =>
      keys.has(`${reel}-${row}`) ? [] : [{ symbol, row }],
    );
    const vacancies = ROW_COUNT - survivors.length;
    let hasScatter = survivors.some(({ symbol }) => symbol.category === 'scatter');
    const incoming = Array.from({ length: vacancies }, (_, row) => {
      const symbol = drawSymbol(random, !hasScatter);
      if (symbol.category === 'scatter') hasScatter = true;
      drops.push({ symbol, reel, fromRow: row - vacancies, toRow: row });
      return symbol;
    });
    survivors.forEach(({ symbol, row }, index) => {
      drops.push({ symbol, reel, fromRow: row, toRow: vacancies + index });
    });
    return [...incoming, ...survivors.map((entry) => entry.symbol)];
  });
  return { grid: nextGrid, removed, drops };
}

export function randomInteger(min: number, max: number, random: RandomSource = Math.random): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function drawSymbol(random: RandomSource = Math.random, allowScatter = true): SlotSymbol {
  return drawWeightedSymbol(random, CATEGORY_WEIGHTS, allowScatter, false);
}

function drawWeightedSymbol(
  random: RandomSource, weights: Readonly<Record<Category, number>>, allowScatter: boolean, allowWild: boolean,
): SlotSymbol {
  // Redistribute capped special-symbol weights among the remaining eligible categories.
  // Sampling directly avoids rejection loops even with a constant RNG source.
  const eligibleCategories = categories.filter((category) => weights[category] > 0
    && (allowScatter || category !== 'scatter') && (allowWild || category !== 'wild'));
  const totalWeight = eligibleCategories.reduce((sum, category) => sum + weights[category], 0);
  const roll = random() * totalWeight;
  let threshold = 0;
  for (const category of eligibleCategories) {
    threshold += weights[category];
    if (roll < threshold) {
      const pool = symbolsByCategory[category];
      return pool[randomInteger(0, pool.length - 1, random)];
    }
  }
  return symbolsByCategory[eligibleCategories[eligibleCategories.length - 1]][0];
}

export function generateReels(random: RandomSource = Math.random): Reel[] {
  return Array.from({ length: REEL_COUNT }, () => {
    const length = randomInteger(MIN_REEL_LENGTH, MAX_REEL_LENGTH, random);
    let hasScatter = false;
    let wildCount = 0;
    const strip = Array.from({ length }, () => {
      const symbol = drawWeightedSymbol(random, REEL_CATEGORY_WEIGHTS, !hasScatter, wildCount < MAX_REEL_WILDS);
      if (symbol.category === 'scatter') hasScatter = true;
      if (symbol.category === 'wild') wildCount++;
      return symbol;
    });
    return { strip, stop: randomInteger(0, length - 1, random) };
  });
}

// All indices, including negative animation positions, wrap around the strip.
export function symbolAt(strip: readonly SlotSymbol[], index: number): SlotSymbol {
  return strip[((index % strip.length) + strip.length) % strip.length];
}

export function visibleGrid(reels: readonly Reel[]): SlotSymbol[][] {
  return reels.map((reel) => Array.from({ length: ROW_COUNT }, (_, row) => symbolAt(reel.strip, reel.stop + row)));
}

export function evaluateWays(grid: readonly (readonly SlotSymbol[])[]): Result {
  const wins: WaysWin[] = [];
  for (const symbol of SYMBOLS.filter((entry) => entry.category !== 'scatter')) {
    const cells: Cell[] = [];
    let reelCount = 0;
    let ways = 1;
    let pureWildWays = 1;
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      const matches = grid[reel].flatMap((entry, row) =>
        entry.id === symbol.id || entry.category === 'wild' ? [{ reel, row }] : [],
      );
      if (matches.length === 0) break;
      reelCount++;
      ways *= matches.length;
      pureWildWays *= grid[reel].filter((entry) => entry.category === 'wild').length;
      cells.push(...matches);
    }
    // Wild-only combinations are awarded once, rather than under all regular symbols.
    if (symbol.category !== 'wild') ways -= pureWildWays;
    if (reelCount >= 3 && ways > 0) wins.push({ symbol, reelCount, ways, cells });
  }
  const scatterCells = grid.flatMap((column, reel) => column.flatMap((entry, row) =>
    entry.category === 'scatter' ? [{ reel, row }] : [],
  ));
  return {
    wins,
    totalWays: wins.reduce((sum, win) => sum + win.ways, 0),
    scatterCount: scatterCells.length,
    scatterCells,
    scatterTrigger: scatterCells.length >= 3,
  };
}

export function generateOpeningReels(random: RandomSource = Math.random): Reel[] {
  // Only the opening display is conditioned on a loss. Player spins are unrestricted.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const reels = generateReels(random);
    const result = evaluateWays(visibleGrid(reels));
    if (result.totalWays === 0 && !result.scatterTrigger) return reels;
  }
  // A bounded fallback guarantees a loss even for pathological RNG sources.
  const reels = generateReels(random);
  reels.forEach((reel, column) => {
    for (let row = 0; row < ROW_COUNT; row++) {
      reel.strip[(reel.stop + row) % reel.strip.length] = symbolsByCategory.low[column % 2];
    }
  });
  return reels;
}
