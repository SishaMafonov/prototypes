import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS, SUITS, MULTIPLIERS, generateDeck, shuffle, uniqueRanks, findMatch,
  compactRows, compactBoard, pairWin, drawMultiplier, finalWin } from '../src/game.ts';

function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const card = (id, rank = '2', suit = 'hearts') => ({ id, rank, ...(rank === 'Wild' || rank === 'Scatter' ? {} : { suit }) });
const empty = () => Array(16).fill(null);

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
  for (const [roll, expected] of [[0, '2'], [49 / 150, '2'], [50 / 150, '7'], [89 / 150, '7'],
    [90 / 150, 'J'], [119 / 150, 'J'], [120 / 150, 'Scatter'], [129 / 150, 'Scatter'], [130 / 150, 'Wild'], [.999, 'Wild']]) {
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

test('horizontal, vertical and middle row-pair adjacency do not match; specials are separate ranks', () => {
  for (const indices of [[0, 1], [0, 4], [4, 9]]) {
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
