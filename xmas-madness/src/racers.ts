import type { Suit } from './game';

export type RacerPhotos = Partial<Record<Suit, string>>;

export const racers = {
  hearts: {
    label: 'Hearts', symbol: '♥', creature: 'Reindeer',
    art: `
      <path d="M24 30 17 19 16 9m4 14-9-2m8-2 6-6m15 17 7-11 1-10m-4 14 9-2m-8-2-6-6"
        fill="none" stroke="#744026" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M25 33Q12 35 12 24q10-3 16 4m11 5q13 2 13-9-10-3-16 4" fill="#b66a3b"/>
      <path d="M18 57q2-13 14-13t14 13" fill="#187b62"/>
      <ellipse cx="32" cy="38" rx="15" ry="14" fill="#b66a3b"/>
      <ellipse cx="32" cy="44" rx="9" ry="7" fill="#f4cf9d"/>
      <path d="M26 36h.1m11.8 0h.1" stroke="#301c19" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="32" cy="42" r="4" fill="#b21f3e"/>
    `,
  },
  diamonds: {
    label: 'Diamonds', symbol: '♦', creature: 'Snowman',
    art: `
      <circle cx="32" cy="46" r="14" fill="#e4f7ff"/>
      <circle cx="32" cy="31" r="13" fill="#fffdf4"/>
      <path d="m18 23 5-14 17 1 5 13z" fill="#192d48"/>
      <path d="M22 19h20v4H22z" fill="#bd2b4b"/>
      <path d="M16 24h32" stroke="#192d48" stroke-width="4" stroke-linecap="round"/>
      <path d="M27 30h.1m9.8 0h.1m-5 17h.1m-.1 7h.1" stroke="#192d48" stroke-width="3.5" stroke-linecap="round"/>
      <path d="m31 33 12 3-12 2z" fill="#da691c"/>
      <path d="M20 42q12 4 24 0m-6 2 1 8" fill="none" stroke="#bd2b4b" stroke-width="5" stroke-linecap="round"/>
    `,
  },
  clubs: {
    label: 'Clubs', symbol: '♣', creature: 'Elf',
    art: `
      <path d="M17 59q0-14 15-14t15 14" fill="#13745b"/>
      <path d="m22 32-12-4 7 12 7 1m18-9 12-4-7 12-7 1" fill="#d99160"/>
      <ellipse cx="32" cy="36" rx="14" ry="14" fill="#e9ac75"/>
      <path d="M16 30Q20 8 46 8l-6 13 8 8z" fill="#14765e"/>
      <path d="m16 29 30-4 2 5-31 5z" fill="#bd2b4b"/>
      <circle cx="46" cy="8" r="4" fill="#e3ae40"/>
      <path d="M27 37h.1m9.8 0h.1m-8 5q3 3 6 0" fill="none" stroke="#392520" stroke-width="2.5" stroke-linecap="round"/>
      <path d="m24 49 8 7 8-7" fill="none" stroke="#fff0c5" stroke-width="3"/>
    `,
  },
  spades: {
    label: 'Spades', symbol: '♠', creature: 'Polar bear',
    art: `
      <path d="M15 58q1-15 17-15t17 15" fill="#e2f3f7"/>
      <circle cx="19" cy="23" r="7" fill="#fffdf4"/>
      <circle cx="45" cy="23" r="7" fill="#fffdf4"/>
      <circle cx="19" cy="23" r="3.5" fill="#abc7d7"/>
      <circle cx="45" cy="23" r="3.5" fill="#abc7d7"/>
      <ellipse cx="32" cy="36" rx="18" ry="15" fill="#fffdf4"/>
      <ellipse cx="32" cy="40" rx="9" ry="6" fill="#dcecf1"/>
      <path d="M26 34h.1m11.8 0h.1m-8 4 2 2 2-2z" fill="#17283e" stroke="#17283e" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19 49q13 4 26 0m-5 2 1 8" fill="none" stroke="#34699d" stroke-width="5" stroke-linecap="round"/>
    `,
  },
} satisfies Record<Suit, { label: string; symbol: string; creature: string; art: string }>;

export function creaturePortrait(suit: Suit): string {
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${racers[suit].art}</svg>`;
}
