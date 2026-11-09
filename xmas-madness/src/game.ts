export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const LINK_COUNT = 7;
const FINISH_POSITION = LINK_COUNT + 1;
const PROFIT_MULTIPLIERS = [1, 2, 3, 5, 10] as const;
const MAX_DEAL_ATTEMPTS = 100;

export type Suit = (typeof SUITS)[number];
type Rank = (typeof RANKS)[number];

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
}

export interface RaceSetup {
  readonly aces: readonly Card[];
  readonly links: readonly Card[];
  readonly stock: readonly Card[];
  readonly positions: Readonly<Record<Suit, number>>;
  readonly profitOdds: Readonly<Record<Suit, number>>;
}

export type RaceState = RaceSetup & {
  readonly history: readonly Card[];
} & (
  | { readonly phase: 'betting' | 'racing'; readonly winner: null }
  | { readonly phase: 'results'; readonly winner: Suit }
);

export function createRaceSetup(random: () => number = Math.random): RaceSetup {
  const deck = SUITS.flatMap((suit) =>
    RANKS.map((rank): Card => ({ id: `${rank}-${suit}`, suit, rank })),
  );
  const aces = deck.filter((card) => card.rank === 'A');
  const nonAces = deck.filter((card) => card.rank !== 'A');
  const positions = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };

  // Start each redeal with all 48 non-aces, including the rejected links.
  for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt++) {
    const shuffled = [...nonAces];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const sample = random();
      if (!(sample >= 0 && sample < 1)) {
        throw new RangeError('Random source must return a number in [0, 1).');
      }
      const swapIndex = Math.floor(sample * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    const links = shuffled.slice(0, LINK_COUNT);
    const linkCounts = { ...positions };
    for (const card of links) linkCounts[card.suit]++;
    if (SUITS.some((suit) => linkCounts[suit] >= PROFIT_MULTIPLIERS.length)) continue;

    const profitOdds = { ...positions };
    for (const suit of SUITS) profitOdds[suit] = PROFIT_MULTIPLIERS[linkCounts[suit]];

    return { aces, links, stock: shuffled.slice(LINK_COUNT), positions, profitOdds };
  }

  throw new Error(`Could not deal a valid track after ${MAX_DEAL_ATTEMPTS} attempts.`);
}

export function prepareRace(setup: RaceSetup): RaceState {
  return { ...setup, phase: 'betting', history: [], winner: null };
}

export function startRace(state: RaceState): RaceState {
  if (state.phase !== 'betting') {
    throw new Error('A race can only start during table betting.');
  }

  return { ...state, phase: 'racing' };
}

export function drawCard(state: RaceState): RaceState {
  if (state.phase !== 'racing') {
    throw new Error('Cards can only be drawn during an active race.');
  }

  const card = state.stock[0];
  if (!card) {
    throw new Error('Invalid race state: the draw pile ran out before a racer finished.');
  }

  const positions = { ...state.positions };
  positions[card.suit]++;
  const next = {
    ...state,
    positions,
    stock: state.stock.slice(1),
    history: [...state.history, card],
  };

  if (positions[card.suit] === FINISH_POSITION) {
    return { ...next, phase: 'results', winner: card.suit };
  }

  return next;
}
