export const BONUS_WEIGHTS = { coin: 35, multiplier: 25, stairs: 5, ghost: 35 } as const;
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
  totalWinCents: bigint;
}

export function createBonusState(steps: number): BonusState {
  if (!Number.isSafeInteger(steps) || steps < 1) throw new Error('Bonus requires a positive move count');
  return { totalSteps: steps, completedSteps: 0, floor: 1, stepWinCents: 0n, totalWinCents: 0n };
}

export function drawBonusPrize(random: () => number = Math.random): BonusPrize {
  const roll = random();
  if (roll < 0.35) return { kind: 'coin' };
  if (roll < 0.60) return { kind: 'multiplier', multiplier: BONUS_MULTIPLIERS[Math.floor(random() * BONUS_MULTIPLIERS.length)] };
  if (roll < 0.65) return { kind: 'stairs' };
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
