import { BET_CENTS, randomInteger } from './game.ts';
import type { RandomSource } from './game.ts';

export const BONUS_SIZE = 5;
export type BonusSymbol = 'empty' | 'coin' | 'x2' | 'x3' | 'heart' | 'scatter';
export const BONUS_WEIGHTS: Readonly<Record<BonusSymbol, number>> = {
  empty: 35, coin: 25, x2: 20, x3: 10, heart: 7, scatter: 3,
};
// The supplied positive arrow weights total 55, so draw from that full pool.
export const BONUS_ARROW_WEIGHTS = [20, 15, 12, 5, 3] as const;
export interface BonusCell { row: number; column: number }
export interface BonusHeart extends BonusCell {}
export interface BonusState {
  initialSpins: number;
  remainingSpins: number;
  currentSpin: number;
  coins: number;
  multiplier: number;
  grid: BonusSymbol[][]; // row-major: grid[row][column]
  heartQueue: BonusHeart[];
  waitingHearts: number[];
}
export interface BonusCollection extends BonusCell { symbol: Exclude<BonusSymbol, 'empty'> }

export function freeSpinsForScatters(count: number): number {
  return count >= 5 ? 20 : count === 4 ? 15 : count === 3 ? 10 : 0;
}

export function createBonus(count: number): BonusState {
  const spins = freeSpinsForScatters(count);
  return {
    initialSpins: spins, remainingSpins: spins, currentSpin: 0,
    coins: 0, multiplier: 1,
    grid: Array.from({ length: BONUS_SIZE }, () => Array<BonusSymbol>(BONUS_SIZE).fill('empty')),
    heartQueue: [], waitingHearts: [],
  };
}

export function drawBonusSymbol(random: RandomSource = Math.random): BonusSymbol {
  const roll = random() * 100;
  let threshold = 0;
  for (const [symbol, weight] of Object.entries(BONUS_WEIGHTS)) {
    threshold += weight;
    if (roll < threshold) return symbol as BonusSymbol;
  }
  return 'scatter';
}

export function beginBonusSpin(state: BonusState, random: RandomSource = Math.random): BonusState {
  if (state.remainingSpins <= 0) return state;
  return {
    ...state, currentSpin: state.currentSpin + 1, remainingSpins: state.remainingSpins - 1,
    grid: Array.from({ length: BONUS_SIZE }, () => Array.from({ length: BONUS_SIZE }, () => drawBonusSymbol(random))),
    heartQueue: state.waitingHearts.map((column) => ({ row: -1, column })), waitingHearts: [],
  };
}

export function drawBonusArrowCount(random: RandomSource = Math.random): number {
  const roll = random() * BONUS_ARROW_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let threshold = 0;
  for (let index = 0; index < BONUS_ARROW_WEIGHTS.length; index++) {
    threshold += BONUS_ARROW_WEIGHTS[index];
    if (roll < threshold) return index + 1;
  }
  return 5;
}

export function drawBonusArrowRows(count: number, random: RandomSource = Math.random): number[] {
  const available = Array.from({ length: BONUS_SIZE }, (_, row) => row);
  return Array.from({ length: Math.min(BONUS_SIZE, Math.max(0, count)) }, () =>
    available.splice(randomInteger(0, available.length - 1, random), 1)[0]);
}

// Carried hearts remain above the board while queued, including the filling phase.
export function parkedBonusHearts(state: BonusState): number[] {
  return [...state.waitingHearts, ...state.heartQueue.filter((heart) => heart.row === -1).map((heart) => heart.column)];
}

export function collectBonusCell(state: BonusState, cell: BonusCell): { state: BonusState; collected?: BonusCollection } {
  const symbol = state.grid[cell.row][cell.column];
  if (symbol === 'empty') return { state };
  const grid = state.grid.map((row) => [...row]);
  grid[cell.row][cell.column] = 'empty';
  const next = { ...state, grid, heartQueue: [...state.heartQueue] };
  if (symbol === 'coin') next.coins++;
  if (symbol === 'x2') next.multiplier += 2;
  if (symbol === 'x3') next.multiplier += 3;
  if (symbol === 'scatter') next.remainingSpins++;
  if (symbol === 'heart') next.heartQueue.push({ ...cell });
  return { state: next, collected: { ...cell, symbol } };
}

export function bonusLineCells(axis: 'row' | 'column', index: number): BonusCell[] {
  return Array.from({ length: BONUS_SIZE }, (_, position) => axis === 'row'
    ? { row: index, column: position } : { row: position, column: index });
}

export function collectBonusLine(state: BonusState, axis: 'row' | 'column', index: number) {
  let next = state;
  const collected: BonusCollection[] = [];
  for (const cell of bonusLineCells(axis, index)) {
    const outcome = collectBonusCell(next, cell);
    next = outcome.state;
    if (outcome.collected) collected.push(outcome.collected);
  }
  return { state: next, collected };
}

export function takeBonusHeart(state: BonusState): { state: BonusState; heart?: BonusHeart; ready: boolean } {
  const heart = state.heartQueue[0];
  if (!heart) return { state, ready: false };
  const ready = state.grid.some((row) => row[heart.column] !== 'empty');
  return {
    state: {
      ...state, heartQueue: state.heartQueue.slice(1),
      waitingHearts: ready ? state.waitingHearts : [...state.waitingHearts, heart.column],
    },
    heart, ready,
  };
}

export function bonusWinCents(state: BonusState, betCents = BET_CENTS): number {
  return state.coins * betCents * state.multiplier;
}
