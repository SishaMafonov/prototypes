import { scheduleDraw } from './draw-clock';
import { createRaceSetup, drawCard, prepareRace, startRace, SUITS, type RaceState, type Suit } from './game';
import { renderRaceBoard } from './race-board';
import { creaturePortrait, racers, type RacerPhotos } from './racers';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('Missing app element');

app.innerHTML = `
  <main>
    <header class="broadcast-header">
      <p class="broadcast-label"><span aria-hidden="true">✦</span> North Pole Racing</p>
      <h1>Xmas <span>Madness</span></h1>
    </header>
    <p id="race-announcement" class="sr-only" role="status" aria-atomic="true"></p>
    <section class="photo-setup" aria-labelledby="setup-title">
      <h2 id="setup-title">Set up the racers</h2>
      <p>Choose a photo for each suit or race with its Christmas creature.</p>
      <div class="racer-grid"></div>
      <button class="host-action" type="button" id="deal-track">Deal track</button>
      <p class="photo-error" id="deal-error" role="alert"></p>
    </section>
    <section class="race-view" aria-labelledby="track-title" hidden>
      <div class="race-board"></div>
      <button class="host-action" type="button" id="start-race" hidden>Start race</button>
      <button class="host-action" type="button" id="edit-racers">Back to racer setup</button>
      <button class="host-action" type="button" id="new-race" hidden>New race</button>
    </section>
  </main>
`;

const grid = app.querySelector('.racer-grid');
const setup = app.querySelector<HTMLElement>('.photo-setup');
const raceView = app.querySelector<HTMLElement>('.race-view');
const raceBoard = app.querySelector('.race-board');
const deal = app.querySelector<HTMLButtonElement>('#deal-track');
const dealError = app.querySelector('#deal-error');
const editRacers = app.querySelector<HTMLButtonElement>('#edit-racers');
const start = app.querySelector<HTMLButtonElement>('#start-race');
const newRace = app.querySelector<HTMLButtonElement>('#new-race');
const announcement = app.querySelector('#race-announcement');
if (!grid || !setup || !raceView || !raceBoard || !deal || !dealError || !editRacers || !start || !newRace || !announcement) {
  throw new Error('Missing race screen controls');
}

const photos: RacerPhotos = {};
const pendingPhotos: RacerPhotos = {};
const updateDealAvailability = () => {
  deal.disabled = Object.keys(pendingPhotos).length > 0;
};
grid.append(...SUITS.map(createPhotoSlot));

let race: RaceState | null = null;
let cancelDraw: (() => void) | undefined;

const render = (state: RaceState) => {
  const previousTrack = raceBoard.querySelector('.track-scroll');
  const scrollLeft = previousTrack?.scrollLeft ?? 0;
  const trackHadFocus = previousTrack !== null && document.activeElement === previousTrack;
  raceBoard.innerHTML = renderRaceBoard(state, photos);
  const track = raceBoard.querySelector<HTMLElement>('.track-scroll');
  if (track) {
    track.scrollLeft = scrollLeft;
    if (trackHadFocus) track.focus({ preventScroll: true });
  }
  const moved = raceBoard.querySelector<HTMLElement>('.marker-moved');
  const destination = moved?.closest('td');
  const origin = destination?.previousElementSibling;
  if (moved && destination && origin) {
    const from = origin.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    const offset = from.left + from.width / 2 - (to.left + to.width / 2);
    moved.style.setProperty('--move-from', `${offset}px`);
  }
  start.hidden = editRacers.hidden = state.phase !== 'betting';
  newRace.hidden = state.phase !== 'results';
};

const scheduleNextDraw = (activeRace: RaceState) => {
  const countdown = raceBoard.querySelector('#draw-countdown');
  cancelDraw = scheduleDraw((seconds) => {
    if (countdown) countdown.textContent = `${seconds}s`;
  }, () => {
    if (race !== activeRace) return;
    cancelDraw = undefined;
    race = drawCard(activeRace);
    render(race);
    const card = race.history.at(-1);
    if (card) {
      const label = racers[card.suit].label;
      const movement = race.winner
        ? `${label} crosses the finish and wins!`
        : `${label} advances to link ${race.positions[card.suit]}.`;
      announcement.textContent = `${card.rank} of ${label}. ${movement}`;
    }
    if (race.phase === 'racing') {
      scheduleNextDraw(race);
    }
  });
};

deal.addEventListener('click', () => {
  if (race || deal.disabled) return;
  dealError.textContent = '';
  try {
    race = prepareRace(createRaceSetup());
  } catch {
    dealError.textContent = 'The track could not be dealt. Try Deal track again.';
    return;
  }
  render(race);
  setup.hidden = true;
  raceView.hidden = false;
  raceBoard.querySelector<HTMLElement>('#track-title')?.focus();
});

start.addEventListener('click', () => {
  if (race?.phase !== 'betting') return;
  race = startRace(race);
  render(race);
  announcement.textContent = 'Race started. First draw in 10 seconds.';
  raceBoard.querySelector<HTMLElement>('.track-scroll')?.focus({ preventScroll: true });
  scheduleNextDraw(race);
});

const returnToSetup = () => {
  cancelDraw?.();
  cancelDraw = undefined;
  race = null;
  announcement.textContent = '';
  raceView.hidden = true;
  raceBoard.replaceChildren();
  setup.hidden = false;
  deal.focus();
};

editRacers.addEventListener('click', () => {
  if (race?.phase === 'betting') returnToSetup();
});

newRace.addEventListener('click', () => {
  if (race?.phase === 'results') returnToSetup();
});

function createPhotoSlot(suit: Suit): HTMLElement {
  const { label, symbol, creature } = racers[suit];
  const slot = document.createElement('section');
  slot.className = 'racer-slot';
  slot.setAttribute('aria-labelledby', `${suit}-title`);
  slot.innerHTML = `
    <h3 id="${suit}-title"><span aria-hidden="true">${symbol}</span> ${label}</h3>
    <div class="racer-preview">
      <div class="racer-creature">
        ${creaturePortrait(suit)}
        ${creature}
      </div>
      <img alt="${label} racer photo" hidden />
    </div>
    <label for="${suit}-photo">${label} photo</label>
    <input id="${suit}-photo" type="file" accept="image/*" aria-describedby="${suit}-error" />
    <button type="button" aria-label="Clear ${label} photo" disabled>Clear photo</button>
    <p class="photo-error" id="${suit}-error" role="alert"></p>
  `;

  const input = slot.querySelector('input');
  const clear = slot.querySelector('button');
  const preview = slot.querySelector('img');
  const fallback = slot.querySelector('.racer-creature');
  const error = slot.querySelector('.photo-error');
  if (!input || !clear || !preview || !(fallback instanceof HTMLElement) || !error) {
    throw new Error('Missing racer photo controls');
  }

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    error.textContent = '';

    const pendingUrl = pendingPhotos[suit];
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    const url = URL.createObjectURL(file);
    pendingPhotos[suit] = url;
    updateDealAvailability();
    const candidate = new Image();
    candidate.src = url;

    try {
      await candidate.decode();
    } catch {
      if (pendingPhotos[suit] !== url) return;
      URL.revokeObjectURL(url);
      delete pendingPhotos[suit];
      updateDealAvailability();
      error.textContent = 'This file could not be opened as an image. Try a PNG or JPEG photo.';
      return;
    }

    if (pendingPhotos[suit] !== url) return;
    delete pendingPhotos[suit];
    updateDealAvailability();
    const photoUrl = photos[suit];
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photos[suit] = url;
    preview.src = url;
    preview.hidden = false;
    fallback.hidden = true;
    clear.disabled = false;
  });

  clear.addEventListener('click', () => {
    const pendingUrl = pendingPhotos[suit];
    const photoUrl = photos[suit];
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    delete pendingPhotos[suit];
    delete photos[suit];
    updateDealAvailability();
    preview.removeAttribute('src');
    preview.hidden = true;
    fallback.hidden = false;
    clear.disabled = true;
    error.textContent = '';
    input.focus();
  });

  return slot;
}
