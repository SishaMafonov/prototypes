export const RANKS = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS = ['hearts', 'spades', 'diamonds', 'clubs'] as const;
export type Rank = typeof RANKS[number] | 'Scatter' | 'Wild';
export type Suit = typeof SUITS[number];
export interface Card { id: number; rank: Rank; suit?: Suit }
export type Board = (Card | null)[];
export type Random = () => number;
export const BET = 1;
export const MULTIPLIERS = [2.2, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 8, 8, 10];
export const GROUPS: { ranks: readonly Rank[]; weight: number }[] = [
  { ranks: ['2', '3', '4', '5', '6'], weight: 60 },
  { ranks: ['7', '8', '9', '10'], weight: 40 },
  { ranks: ['J', 'Q', 'K'], weight: 15 },
  { ranks: ['Scatter'], weight: 5 },
  { ranks: ['Wild'], weight: 10 },
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

export function uniqueRanks(deck: readonly Card[]): Rank[] {
  return [...RANKS, 'Scatter' as const, 'Wild' as const].filter(rank => deck.some(card => card.rank === rank));
}

/** Top row-pair first: descending diagonals left-to-right, then ascending right-to-left. */
export function findMatch(board: Board): [number, number] | null {
  for (const row of [0, 2]) {
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
  if (rank === 'Wild' || rank === 'Scatter') return 0;
  if (['J', 'Q', 'K'].includes(rank)) return 1;
  return Number(rank) >= 7 ? 0.50 : 0.1;
}

export function drawMultiplier(random: Random = Math.random): number {
  return MULTIPLIERS[Math.floor(random() * MULTIPLIERS.length)]!;
}

export function finalWin(base: number, multiplier: number): number {
  return Math.round(base * (multiplier || 1) * 100) / 100;
}
