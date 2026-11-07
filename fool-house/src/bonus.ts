export const PRE_ROUND_POT_BONUS_WEIGHTS = { coin: 35, multiplier: 25, stairs: 5, ghost: 35 } as const;
export const PRE_BALANCE_BONUS_WEIGHTS = { coin: 35 * 85 / 95, multiplier: 25 * 85 / 95, stairs: 15, ghost: 35 * 85 / 95 } as const;
// Keep the full-round pot and x2–x8 bag, with less frequent multiplier compounding.
export const BONUS_WEIGHTS = { coin: 30, multiplier: 4.73, stairs: 15, ghost: 50.27 } as const;
export type BonusWeights = { coin: number; multiplier: number; stairs: number; ghost: number };
export const BONUS_MULTIPLIERS = [2, 2, 2, 2, 2, 3, 3, 5, 5, 8] as const;
export const BONUS_COIN_CENTS = 100;
export const MAX_BONUS_FLOOR = 6;
export type BonusPrize = { kind: 'coin' | 'stairs' | 'ghost' }
  | { kind: 'multiplier'; multiplier: typeof BONUS_MULTIPLIERS[number] };
export interface BonusState {
  totalSteps: number;
  completedSteps: number;
  floor: number;
  stepWinCents: bigint;
  startingWinCents: bigint;
  totalWinCents: bigint;
}

export function createBonusState(steps: number, startingWinCents = 0n): BonusState {
  if (!Number.isSafeInteger(steps) || steps < 1) throw new Error('Bonus requires a positive move count');
  if (startingWinCents < 0n) throw new Error('Starting round win cannot be negative');
  return { totalSteps: steps, completedSteps: 0, floor: 1, stepWinCents: 0n, startingWinCents, totalWinCents: startingWinCents };
}

export function drawBonusPrize(random: () => number = Math.random, weights: BonusWeights = BONUS_WEIGHTS): BonusPrize {
  const roll = random();
  if (roll < weights.coin / 100) return { kind: 'coin' };
  if (roll < (weights.coin + weights.multiplier) / 100) return { kind: 'multiplier', multiplier: BONUS_MULTIPLIERS[Math.floor(random() * BONUS_MULTIPLIERS.length)] };
  if (roll < (weights.coin + weights.multiplier + weights.stairs) / 100) return { kind: 'stairs' };
  return { kind: 'ghost' };
}

export function applyBonusPrize(state: BonusState, prize: BonusPrize): BonusState {
  if (state.completedSteps >= state.totalSteps) throw new Error('Bonus has no moves remaining');
  const totalWinCents = prize.kind === 'coin' ? state.totalWinCents + BigInt(BONUS_COIN_CENTS * state.floor)
    : prize.kind === 'multiplier' ? state.totalWinCents * BigInt(prize.multiplier) : state.totalWinCents;
  return {
    ...state,
    completedSteps: state.completedSteps + 1,
    floor: prize.kind === 'stairs' ? Math.min(MAX_BONUS_FLOOR, state.floor + 1) : state.floor,
    totalWinCents,
    stepWinCents: totalWinCents - state.totalWinCents,
  };
}

const wholeCredits = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export function formatCents(cents: number | bigint): string {
  const value = BigInt(cents);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${wholeCredits.format(absolute / 100n)}.${String(absolute % 100n).padStart(2, '0')}`;
}
