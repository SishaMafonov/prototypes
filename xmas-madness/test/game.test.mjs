import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRaceSetup, drawCard, prepareRace, startRace, SUITS } from '../src/game.ts';

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test('U01 an accepted deal partitions a standard deck and preserves draw order', () => {
  const { aces, links, stock, positions } = createRaceSetup(seededRandom(1));
  assert.deepEqual(aces.map((card) => card.id), ['A-hearts', 'A-diamonds', 'A-clubs', 'A-spades']);
  assert.equal(links.length, 7);
  assert.equal(stock.length, 41);
  const cards = [...aces, ...links, ...stock];
  assert.equal(new Set(cards.map((card) => card.id)).size, 52);
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
    assert.deepEqual(
      new Set(cards.filter((card) => card.suit === suit).map((card) => card.rank)),
      new Set(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']),
    );
  }
  assert.deepEqual(stock.slice(0, 3).map((card) => card.id), ['K-clubs', '10-spades', '10-hearts']);
  assert.deepEqual(positions, { hearts: 0, diamonds: 0, clubs: 0, spades: 0 });
});

test('U02 displayed links determine profit odds for all five legal suit counts', () => {
  // Seed 1 gives one heart, no diamonds, two clubs, and four spades.
  assert.deepEqual(createRaceSetup(seededRandom(1)).profitOdds, {
    hearts: 2, diamonds: 1, clubs: 3, spades: 10,
  });
  // Seed 2 includes three clubs.
  assert.deepEqual(createRaceSetup(seededRandom(2)).profitOdds, {
    hearts: 2, diamonds: 2, clubs: 5, spades: 3,
  });
});

test('U03 a five-of-a-suit row is rejected and all cards are available to the redeal', () => {
  const nextDeal = seededRandom(1);
  let samples = 0;
  const setup = createRaceSetup(() => {
    samples++;
    // Swap two spades into the front of the suit-ordered deck, leaving five hearts in the row.
    if (samples === 1) return 0;
    if (samples === 2) return 1.5 / 47;
    if (samples <= 47) return 1 - Number.EPSILON;
    return nextDeal();
  });

  assert.deepEqual(setup, createRaceSetup(seededRandom(1)));
});

test('U04 an RNG that repeatedly deals invalid rows fails instead of hanging', () => {
  assert.throws(() => createRaceSetup(() => 1 - Number.EPSILON), /Could not deal a valid track/);
});

test('U05 an out-of-range random sample fails with a clear error', () => {
  assert.throws(() => createRaceSetup(() => 1), RangeError);
});

test('U06 the host must start the race before drawing and cannot start it twice', () => {
  const ready = prepareRace(createRaceSetup(seededRandom(1)));
  assert.equal(ready.phase, 'betting');
  assert.deepEqual(ready.history, []);
  assert.equal(ready.winner, null);
  assert.throws(() => drawCard(ready), /active race/);

  const racing = startRace(ready);
  assert.equal(racing.phase, 'racing');
  assert.equal(ready.phase, 'betting');
  assert.throws(() => startRace(racing), /table betting/);
});

test('U07 draws consume cards in order and advance only their matching racers', () => {
  const racing = startRace(prepareRace(createRaceSetup(seededRandom(1))));
  const original = structuredClone(racing);
  const first = drawCard(racing);
  const second = drawCard(first);

  assert.deepEqual(first.positions, { hearts: 0, diamonds: 0, clubs: 1, spades: 0 });
  assert.deepEqual(second.positions, { hearts: 0, diamonds: 0, clubs: 1, spades: 1 });
  assert.deepEqual(second.history.map((card) => card.id), ['K-clubs', '10-spades']);
  assert.deepEqual(second.stock, original.stock.slice(2));
  assert.equal(first.history.length, 1);
  assert.deepEqual(racing, original);
});

test('U08 even with all racers at seven, the next draw settles exactly one winner', () => {
  const setup = createRaceSetup(seededRandom(1));
  const firstSevenPerSuit = SUITS.flatMap((suit) =>
    setup.stock.filter((card) => card.suit === suit).slice(0, 7),
  );
  const remaining = setup.stock.filter((card) => !firstSevenPerSuit.includes(card));
  const finishCard = remaining.find((card) => card.suit === 'spades');
  assert.ok(finishCard);
  const stock = [...firstSevenPerSuit, finishCard, ...remaining.filter((card) => card !== finishCard)];
  let race = startRace(prepareRace({ ...setup, stock }));

  for (let draw = 0; draw < 28; draw++) race = drawCard(race);
  assert.deepEqual(race.positions, { hearts: 7, diamonds: 7, clubs: 7, spades: 7 });
  assert.equal(race.phase, 'racing');
  assert.equal(race.winner, null);

  const finished = drawCard(race);
  assert.equal(finished.phase, 'results');
  assert.equal(finished.winner, 'spades');
  assert.deepEqual(finished.positions, { hearts: 7, diamonds: 7, clubs: 7, spades: 8 });
  assert.equal(finished.history.at(-1), finishCard);
  assert.equal(finished.stock.length, 12);

  const original = structuredClone(finished);
  assert.throws(() => drawCard(finished), /active race/);
  assert.throws(() => startRace(finished), /table betting/);
  assert.deepEqual(finished, original);
});

test('U09 an empty stock during a race reports an invalid state', () => {
  const setup = createRaceSetup(seededRandom(1));
  const racing = startRace(prepareRace({ ...setup, stock: [] }));
  assert.throws(() => drawCard(racing), /draw pile ran out/);
});
