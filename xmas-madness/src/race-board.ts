import { SUITS, type Card, type RaceState, type Suit } from './game';
import { creaturePortrait, racers, type RacerPhotos } from './racers';

function cardFace(card: Card): string {
  const { label, symbol } = racers[card.suit];
  return `<span class="race-card" data-suit="${card.suit}" role="img" aria-label="${card.rank} of ${label}">
    ${card.rank} <span>${symbol}</span>
  </span>`;
}

function racerMarker(suit: Suit, photo: string | undefined, moved = false): string {
  const { label, creature } = racers[suit];
  const classes = moved ? 'track-marker marker-moved' : 'track-marker';
  return photo
    ? `<img class="${classes}" src="${photo}" alt="${label} racer photo" />`
    : `<span class="${classes}" role="img" aria-label="${creature}">${creaturePortrait(suit)}</span>`;
}

export function renderRaceBoard(
  state: RaceState,
  photos: Readonly<RacerPhotos>,
): string {
  const finish = state.links.length + 1;
  const lastCard = state.history.at(-1);
  const winner = state.winner;
  const phaseLabel = {
    betting: 'Table betting',
    racing: 'Race in progress',
    results: 'Race finished',
  }[state.phase];

  return `
    <header class="race-heading">
      <h2 id="track-title" tabindex="-1">Race track</h2>
      <p class="phase-badge" data-phase="${state.phase}">${phaseLabel}</p>
    </header>
    <dl class="race-status">
      <div>
        <dt>Last card</dt>
        <dd>${lastCard ? `
          ${cardFace(lastCard)}
          <span class="draw-call">${racers[lastCard.suit].label} → ${winner ? 'Finish' : `Link ${state.positions[lastCard.suit]}`}</span>
        ` : '—'}</dd>
      </div>
      <div><dt>Next draw</dt><dd id="draw-countdown">—</dd></div>
      <div class="race-result${winner ? ' winner-revealed' : ''}">
        <dt>${winner ? 'North Pole champion' : 'Winner'}</dt>
        <dd id="race-winner">${winner ? `
          ${racerMarker(winner, photos[winner])}
          <span><span aria-hidden="true">${racers[winner].symbol}</span> ${racers[winner].label} wins!</span>
        ` : '—'}</dd>
      </div>
    </dl>
    <p class="track-scroll-hint">Scroll across to see the full track.</p>
    <div class="track-scroll" role="region" aria-label="Race lanes and track cards" tabindex="0">
      <table class="race-track">
        <thead>
          <tr>
            <th scope="col" class="lane-label">Racer · Odds</th>
            <th scope="col" class="track-start">Start</th>
            ${state.links.map((card, index) => `
              <th scope="col" class="track-link">
                <span>Link ${index + 1}</span>
                ${cardFace(card)}
              </th>
            `).join('')}
            <th scope="col" class="track-finish">Finish</th>
          </tr>
        </thead>
        <tbody>
          ${SUITS.map((suit) => `
            <tr data-suit="${suit}"${state.winner === suit ? ' class="winning-lane"' : ''}>
              <th scope="row" class="lane-label">
                <span class="lane-suit" aria-hidden="true">${racers[suit].symbol}</span>
                ${racers[suit].label}
                <span class="lane-odds">${state.profitOdds[suit]}:1</span>
              </th>
              ${Array.from({ length: finish + 1 }, (_, position) => `
                <td class="${position === 0 ? 'track-start' : position === finish ? 'track-finish' : 'track-step'}">
                  ${position === state.positions[suit] ? racerMarker(suit, photos[suit], lastCard?.suit === suit) : ''}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
