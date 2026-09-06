export const RANKS = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS = ['hearts', 'spades', 'diamonds', 'clubs'] as const;
export type Rank = typeof RANKS[number] | 'Scatter' | 'Wild';
export type Suit = typeof SUITS[number];
export interface Card { id: number; rank: Rank; suit?: Suit }
export type Board = (Card | null)[];
export type Random = () => number;
export const BET = 1;
export const HIGH_CARDS_FEATURE_CHANCE = 0.1;
export const HIGH_RANKS = ['J', 'Q', 'K'] as const;
export const GAMBLE_SUITS = ['hearts', 'spades'] as const;
export type GambleSuit = typeof GAMBLE_SUITS[number];
export const MULTIPLIERS = [2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 8, 8, 10];
export const GROUPS: { ranks: readonly Rank[]; weight: number }[] = [
  { ranks: ['2', '3', '4', '5', '6'], weight: 70 },
  { ranks: ['7', '8', '9', '10'], weight: 30 },
  { ranks: ['J', 'Q', 'K'], weight: 10 },
  { ranks: ['Scatter'], weight: 5 },
  { ranks: ['Wild'], weight: 7 },
];

/** Twelve four-card draws keep the deck at 48. Only one scatter draw is allowed. */
export function generateDeck(random: Random = Math.random): Card[] {
  const deck: Card[] = [];
  let hasScatter = false;
  for (let draw = 0; draw < 12; draw++) {
    const groups = GROUPS.filter(group => !hasScatter || group.ranks[0] !== 'Scatter');
    let roll = random() * groups.reduce((sum, group) => sum + group.weight, 0);
    const group = groups.find(group => (roll -= group.weight) < 0) ?? groups[groups.length - 1]!;
    const rank = group.ranks[Math.floor(random() * group.ranks.length)]!;
    if (rank === 'Scatter') hasScatter = true;
    for (const suit of SUITS) {
      deck.push({ id: deck.length, rank, ...(rank !== 'Scatter' && rank !== 'Wild' ? { suit } : {}) });
    }
  }
  return deck;
}

export function shuffle(deck: readonly Card[], random: Random = Math.random): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function drawHighCardsFeature(random: Random = Math.random): boolean {
  return random() < HIGH_CARDS_FEATURE_CHANCE;
}

/** Upgrade complete low-rank sets before shuffling, retaining IDs, suits and deck size. */
export function upgradeLowCards(deck: readonly Card[], random: Random = Math.random): Card[] {
  const existingHighs = HIGH_RANKS.filter(rank => deck.some(card => card.rank === rank));
  const targets = [...(existingHighs.length ? existingHighs : HIGH_RANKS)];
  // Random order, then cycle so each eligible high rank receives a set before repeating.
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [targets[i], targets[j]] = [targets[j]!, targets[i]!];
  }
  let replacement = 0;
  const result = [...deck];
  for (let i = 0; i < result.length; i += SUITS.length) {
    if (!['2', '3', '4', '5', '6'].includes(result[i]!.rank)) continue;
    const rank = targets[replacement++ % targets.length]!;
    for (let suit = 0; suit < SUITS.length; suit++) {
      result[i + suit] = { ...result[i + suit]!, rank };
    }
  }
  return result;
}

export function uniqueRanks(deck: readonly Card[]): Rank[] {
  return [...RANKS, 'Scatter' as const, 'Wild' as const].filter(rank => deck.some(card => card.rank === rank));
}

/** Top, middle, then bottom row-pairs; descending left-to-right before ascending right-to-left. */
export function findMatch(board: Board): [number, number] | null {
  for (const row of [0, 1, 2]) {
    for (const direction of [1, -1]) {
      for (let step = 0; step < 3; step++) {
        const col = direction === 1 ? step : 3 - step;
        const a = row * 4 + col;
        const b = (row + 1) * 4 + col + direction;
        if (board[a] && board[b] && board[a]!.rank === board[b]!.rank) return [a, b];
      }
    }
  }
  return null;
}

export function compactRows(board: Board): Board {
  return Array.from({ length: 4 }, (_, row) => {
    const cards = board.slice(row * 4, row * 4 + 4).filter((card): card is Card => card !== null);
    return [...cards, ...Array<null>(4 - cards.length).fill(null)];
  }).flat();
}

export function compactBoard(board: Board): Board {
  const cards = board.filter((card): card is Card => card !== null);
  return [...cards, ...Array<null>(16 - cards.length).fill(null)];
}

export function pairWin(rank: Rank): number {
  if (rank === 'Wild' || rank === 'Scatter') return 0.5;
  if (['J', 'Q', 'K'].includes(rank)) return 1;
  return Number(rank) >= 7 ? 0.25 : 0.05;
}

export function drawMultiplier(random: Random = Math.random): number {
  return MULTIPLIERS[Math.floor(random() * MULTIPLIERS.length)]!;
}

export function finalWin(base: number, multiplier: number): number {
  return Math.round(base * (multiplier || 1) * 100) / 100;
}

export function drawGambleSuit(random: Random = Math.random): GambleSuit {
  return random() < .5 ? 'hearts' : 'spades';
}

export function gamblePayout(win: number, choice: GambleSuit, outcome: GambleSuit): number {
  return choice === outcome ? Math.round(win * 200) / 100 : 0;
}

/** The deck is exhausted and no remaining reel cards can form another eligible match. */
export function isGambleEligible(board: Board, shoe: readonly Card[]): boolean {
  return shoe.length === 0 && findMatch(board) === null;
}
