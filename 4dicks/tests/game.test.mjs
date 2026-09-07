import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS, SUITS, MULTIPLIERS, generateDeck, shuffle, uniqueRanks, findMatch,
  compactRows, compactBoard, pairWin, drawMultiplier, finalWin,
  drawHighCardsFeature, upgradeLowCards, drawGambleSuit, gamblePayout, isGambleEligible,
  drawBonusGrid, drawBonusAngle, bonusAngleCells, collectBonusMultipliers, bonusPayout, BONUS_GRID_SIZE } from '../src/game.ts';

function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const card = (id, rank = '2', suit = 'hearts') => ({ id, rank, ...(rank === 'Wild' || rank === 'Scatter' ? {} : { suit }) });
const empty = () => Array(16).fill(null);

test('High Cards draws once with a 10% trigger probability', () => {
  let draws = 0;
  assert.equal(drawHighCardsFeature(() => { draws++; return .099999; }), true);
  assert.equal(draws, 1);
  assert.equal(drawHighCardsFeature(() => 0), true);
  assert.equal(drawHighCardsFeature(() => .1), false);
  assert.equal(drawHighCardsFeature(() => .99999), false);
  const outcomes = Array.from({ length: 1000 }, (_, i) => drawHighCardsFeature(() => i / 1000));
  assert.equal(outcomes.filter(Boolean).length, 100);
});

test('Gamble resolves Hearts and Spades with equal weight and doubles only a correct choice', () => {
  assert.equal(drawGambleSuit(() => 0), 'hearts');
  assert.equal(drawGambleSuit(() => .499999), 'hearts');
  assert.equal(drawGambleSuit(() => .5), 'spades');
  assert.equal(drawGambleSuit(() => .999999), 'spades');
  const outcomes = Array.from({ length: 1000 }, (_, i) => drawGambleSuit(() => i / 1000));
  assert.equal(outcomes.filter(suit => suit === 'hearts').length, 500);
  assert.equal(outcomes.filter(suit => suit === 'spades').length, 500);
  assert.equal(gamblePayout(4.25, 'hearts', 'hearts'), 8.5);
  assert.equal(gamblePayout(4.25, 'spades', 'spades'), 8.5);
  assert.equal(gamblePayout(4.25, 'hearts', 'spades'), 0);
  assert.equal(gamblePayout(0, 'hearts', 'hearts'), 0);
});

test('Gamble is offered only after the deck is drained and all reel matches have resolved', () => {
  assert.equal(isGambleEligible(Array(16).fill(null), []), true);
  assert.equal(isGambleEligible([card(0), ...Array(15).fill(null)], []), true);
  const pendingMatch = Array(16).fill(null); pendingMatch[0] = card(0); pendingMatch[5] = card(5);
  assert.equal(isGambleEligible(pendingMatch, []), false);
  assert.equal(isGambleEligible(Array(16).fill(null), [card(0)]), false);
});

test('Bonus grid fills a random 1–64 distinct cells with approved multipliers', () => {
  const oneCell = drawBonusGrid(() => 0);
  assert.equal(oneCell.filter(Boolean).length, 1);
  assert.equal(oneCell[0], 2);
  const fullGrid = drawBonusGrid(() => .999999);
  assert.equal(fullGrid.length, BONUS_GRID_SIZE ** 2);
  assert.equal(fullGrid.filter(Boolean).length, BONUS_GRID_SIZE ** 2);
  for (let seed = 1; seed <= 100; seed++) {
    const grid = drawBonusGrid(rng(seed));
    assert.ok(grid.filter(Boolean).length >= 1 && grid.filter(Boolean).length <= 64);
    assert.ok(grid.every(value => value === null || MULTIPLIERS.includes(value)));
  }
});

test('Bonus angle selection has four equal directions and gathers the matching quadrant', () => {
  assert.deepEqual([0, .249999, .25, .499999, .5, .749999, .75, .999999].map(value => drawBonusAngle(() => value)),
    ['top-left', 'top-left', 'bottom-left', 'bottom-left', 'top-right', 'top-right', 'bottom-right', 'bottom-right']);
  assert.deepEqual([...bonusAngleCells(7, 'bottom-left')].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index));
  assert.deepEqual(bonusAngleCells(0, 'top-left'), [0]);
  assert.deepEqual(bonusAngleCells(7, 'top-left'), [7]);
  assert.deepEqual(bonusAngleCells(63, 'bottom-right'), [63]);
  const grid = Array(64).fill(null); grid[7] = 2; grid[16] = 3; grid[63] = 5;
  assert.equal(collectBonusMultipliers(grid, 7, 'bottom-left'), 10);
  assert.equal(collectBonusMultipliers(grid, 0, 'top-left'), 0);
  assert.equal(bonusPayout(2.5, 10), 25);
  assert.equal(bonusPayout(2.5, 0), 2.5);
});

const sets = ranks => ranks.flatMap((rank, set) => SUITS.map((suit, i) => card(set * 4 + i, rank, suit)));

test('High Cards adds full sets to existing highs and keeps other cards unchanged', () => {
  const original = sets(['K','K','Q','2','2','6','7','8','9','10','Scatter','Wild']);
  const before = structuredClone(original);
  const upgraded = upgradeLowCards(original, () => .999);
  assert.equal(upgraded.length, 48);
  assert.deepEqual(original, before);
  assert.equal(upgraded.filter(c => c.rank === 'K').length, 12);
  assert.equal(upgraded.filter(c => c.rank === 'Q').length, 12);
  assert.ok(!upgraded.some(c => ['2','3','4','5','6','J'].includes(c.rank)));
  for (let i = 0; i < original.length; i++) {
    assert.equal(upgraded[i].id, original[i].id);
    assert.equal(upgraded[i].suit, original[i].suit);
    if (!['2','3','4','5','6'].includes(original[i].rank)) assert.deepEqual(upgraded[i], original[i]);
  }
  const justKings = upgradeLowCards(sets(['K','K','2']), () => 0);
  assert.equal(justKings.filter(c => c.rank === 'K').length, 12);
  for (const suit of SUITS) assert.equal(justKings.filter(c => c.rank === 'K' && c.suit === suit).length, 3);
});

test('High Cards handles no existing highs, no lows, and all-low decks', () => {
  const noHighs = upgradeLowCards(sets(['2','3','4','7','Scatter','Wild']), () => .999);
  for (const rank of ['J','Q','K']) assert.equal(noHighs.filter(c => c.rank === rank).length, 4);
  const noLows = sets(['J','Q','K','7','8','9','10','Wild','Scatter','K','Q','J']);
  assert.deepEqual(upgradeLowCards(noLows, () => 0), noLows);
  const allLow = upgradeLowCards(sets(Array(12).fill('2')), () => 0);
  for (const rank of ['J','Q','K']) {
    assert.equal(allLow.filter(c => c.rank === rank).length, 16);
    for (const suit of SUITS) assert.equal(allLow.filter(c => c.rank === rank && c.suit === suit).length, 4);
  }
});

test('500 feature decks conserve cards, suit sets and specials and contain no low ranks', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const random = rng(seed), original = generateDeck(random), deck = upgradeLowCards(original, random);
    assert.equal(deck.length, 48);
    assert.equal(new Set(deck.map(c => c.id)).size, 48);
    assert.ok(!deck.some(c => ['2','3','4','5','6'].includes(c.rank)));
    assert.deepEqual(deck.filter(c => !c.suit), original.filter(c => !c.suit));
    for (const rank of RANKS) {
      const counts = SUITS.map(suit => deck.filter(c => c.rank === rank && c.suit === suit).length);
      assert.ok(counts.every(count => count === counts[0]));
    }
  }
});

test('48-card decks preserve complete suit sets, duplicates, special ranks and the scatter cap', () => {
  let sawScatter = false, sawWild = false, sawDuplicate = false;
  for (let seed = 0; seed < 1000; seed++) {
    const deck = generateDeck(rng(seed));
    assert.equal(deck.length, 48);
    assert.equal(new Set(deck.map(c => c.id)).size, 48);
    const scatters = deck.filter(c => c.rank === 'Scatter');
    assert.ok([0, 4].includes(scatters.length));
    sawScatter ||= scatters.length === 4;
    sawWild ||= deck.some(c => c.rank === 'Wild');
    for (const rank of RANKS) {
      const counts = SUITS.map(suit => deck.filter(c => c.rank === rank && c.suit === suit).length);
      assert.ok(counts.every(count => count === counts[0]));
      sawDuplicate ||= counts[0] > 1;
    }
    assert.ok(deck.filter(c => ['Wild', 'Scatter'].includes(c.rank)).every(c => !c.suit));
    assert.ok(uniqueRanks(deck).length <= 12);
    assert.deepEqual(new Set(uniqueRanks(deck)), new Set(deck.map(c => c.rank)));
    const copy = shuffle(deck, rng(seed + 10));
    assert.deepEqual(copy.map(c => c.id).sort((a,b) => a-b), deck.map(c => c.id));
  }
  assert.ok(sawScatter && sawWild && sawDuplicate);
});

test('first draws use the specified normalized category weights', () => {
  for (const [roll, expected] of [[0, '2'], [59 / 130, '2'], [60 / 130, '7'], [99 / 130, '7'],
    [100 / 130, 'J'], [114 / 130, 'J'], [115 / 130, 'Scatter'], [119 / 130, 'Scatter'], [120 / 130, 'Wild'], [.999, 'Wild']]) {
    let n = 0;
    assert.equal(generateDeck(() => n++ === 0 ? roll : 0)[0].rank, expected);
  }
});

test('top descending diagonals win priority, then top ascending, then bottom diagonals', () => {
  const board = empty();
  board[0] = card(0, 'K'); board[5] = card(5, 'K', 'clubs');
  board[1] = card(1, 'Q'); board[6] = card(6, 'Q');
  board[3] = card(3, 'J'); board[8] = card(8, '10'); board[13] = card(13, '10');
  assert.deepEqual(findMatch(board), [0, 5]);
  board[0] = null; board[5] = null;
  assert.deepEqual(findMatch(board), [1, 6]);
  board[1] = null; board[6] = card(6, 'J');
  assert.deepEqual(findMatch(board), [3, 6]);
  board[3] = null;
  assert.deepEqual(findMatch(board), [8, 13]);
  board[8] = null; board[13] = null;
  board[11] = card(11, '3'); board[14] = card(14, '3');
  assert.deepEqual(findMatch(board), [11, 14]);
});

test('middle row-pair checks both directions before the bottom, but after all top matches', () => {
  const board = empty();
  board[3] = card(3, 'K'); board[6] = card(6, 'K');
  board[4] = card(4, 'Q'); board[9] = card(9, 'Q');
  board[7] = card(7, 'J'); board[10] = card(10, 'J');
  board[8] = card(8, '2'); board[13] = card(13, '2');
  assert.deepEqual(findMatch(board), [3, 6]);
  board[3] = null; board[6] = null;
  assert.deepEqual(findMatch(board), [4, 9]);
  board[4] = null; board[9] = null;
  assert.deepEqual(findMatch(board), [7, 10]);
  board[7] = null; board[10] = null;
  assert.deepEqual(findMatch(board), [8, 13]);
});

test('a middle-row removal compacts and refills before checking the top again', () => {
  const ranks = ['K','Q','J','10','2','9','K','7','6','2','5','4','3','Wild','Scatter','Q'];
  let board = ranks.map((rank, i) => card(i, rank));
  assert.deepEqual(findMatch(board), [4, 9]);
  board[4] = null; board[9] = null;
  board = compactBoard(compactRows(board));
  const queue = [card(16, '4'), card(17, '10')];
  for (let i = 0; i < 16; i++) if (!board[i]) board[i] = queue.shift();
  assert.deepEqual(board.map(c => c.id), [0,1,2,3,5,6,7,8,10,11,12,13,14,15,16,17]);
  assert.equal(queue.length, 0);
  // Compaction creates a top match, which wins over the new bottom match from the refill.
  assert.deepEqual(findMatch(board), [0, 5]);
  board[0] = null; board[5] = null;
  assert.deepEqual(findMatch(board), [9, 14]);
});

test('horizontal, vertical and nonadjacent diagonals do not match; specials are separate ranks', () => {
  for (const indices of [[0, 1], [0, 4], [0, 10]]) {
    const board = empty(); indices.forEach(i => { board[i] = card(i); });
    assert.equal(findMatch(board), null);
  }
  const board = empty(); board[0] = card(0, 'Wild'); board[5] = card(5, 'K');
  assert.equal(findMatch(board), null);
  board[5] = card(5, 'Scatter'); assert.equal(findMatch(board), null);
  board[5] = card(5, 'Wild'); assert.deepEqual(findMatch(board), [0, 5]);
  board[0] = card(0, 'Scatter'); board[5] = card(5, 'Scatter'); assert.deepEqual(findMatch(board), [0, 5]);
});

test('shifting closes each row left first, then fills upward in stable reading order', () => {
  const board = Array.from({ length: 16 }, (_, i) => card(i)); board[1] = null; board[6] = null;
  const left = compactRows(board);
  assert.deepEqual(left.map(c => c?.id ?? null), [0,2,3,null,4,5,7,null,8,9,10,11,12,13,14,15]);
  assert.deepEqual(compactBoard(left).map(c => c?.id ?? null), [0,2,3,4,5,7,8,9,10,11,12,13,14,15,null,null]);
});

test('pair payouts, multiplier distribution and additive Wild totals', () => {
  for (const rank of ['2','3','4','5','6']) assert.equal(pairWin(rank), .1);
  for (const rank of ['7','8','9','10']) assert.equal(pairWin(rank), .5);
  for (const rank of ['J','Q','K']) assert.equal(pairWin(rank), 1);
  assert.equal(pairWin('Wild'), 0); assert.equal(pairWin('Scatter'), 0);
  MULTIPLIERS.forEach((value, i) => assert.equal(drawMultiplier(() => (i + .5) / 15), value));
  assert.equal(finalWin(1.6, 0), 1.6);
  assert.equal(finalWin(1.6, 2.2 + 3), 8.32);
  assert.equal(finalWin(0, 10), 0);
});

test('500 complete cascades conserve all 48 cards and terminate with no pair remaining', () => {
  let drained = false, bonus = false, wild = false;
  for (let seed = 1; seed <= 500; seed++) {
    const random = rng(seed), deck = shuffle(generateDeck(random), random), removed = [];
    let board = deck.splice(0, 16), pairs = 0, base = 0, multiplier = 0, scatters = 0;
    while (true) {
      const match = findMatch(board); if (!match) break;
      const rank = board[match[0]].rank;
      for (const i of match) { removed.push(board[i]); board[i] = null; }
      base += pairWin(rank);
      if (rank === 'Wild') { multiplier += drawMultiplier(random); wild = true; }
      if (rank === 'Scatter') scatters += 2;
      board = compactBoard(compactRows(board));
      for (let i = 0; i < 16; i++) if (!board[i] && deck.length) board[i] = deck.shift();
      assert.ok(++pairs <= 24);
      assert.equal(new Set([...board.filter(Boolean), ...deck, ...removed].map(c => c.id)).size, 48);
    }
    assert.equal(findMatch(board), null);
    assert.ok(finalWin(base, multiplier) >= 0);
    assert.ok([0,2,4].includes(scatters));
    drained ||= deck.length === 0; bonus ||= scatters >= 2;
  }
  assert.ok(drained && bonus && wild);
});
