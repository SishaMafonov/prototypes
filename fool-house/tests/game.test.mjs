import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRoomMultipliers, BET_CENTS, collectWins, drawSymbol, findWins, generateBoard, getMultiplier,
  isCollectionComplete, refillBoard, removeWins, ROOM_MULTIPLIERS, SYMBOL_WEIGHTS,
} from '../src/game.ts';

test('draw boundaries implement calibrated 14.66% low, 10% mid, 70.34% high, and 5% scatter', () => {
  for (const [roll, tier] of [
    [0, 'low'], [0.146599, 'low'], [0.1466, 'mid'],
    [0.246599, 'mid'], [0.2466, 'high'], [0.949999, 'high'],
    [0.95, 'scatter'], [0.999999, 'scatter'],
  ]) {
    const samples = [roll, 0];
    assert.deepEqual(drawSymbol(() => samples.shift()), { tier, index: 0 });
    assert.equal(samples.length, tier === 'scatter' ? 1 : 0);
  }
  assert.ok(Math.abs(Object.values(SYMBOL_WEIGHTS).reduce((sum, weight) => sum + weight, 0) - 100) < 1e-9);
});

test('every icon is reachable within every tier, including both ends of each sprite', () => {
  for (const [roll, tier] of [[0.1, 'low'], [0.2, 'mid'], [0.9, 'high']]) {
    for (let index = 0; index < 5; index++) {
      const samples = [roll, (index + 0.5) / 5];
      assert.deepEqual(drawSymbol(() => samples.shift()), { tier, index });
    }
  }
});

test('a full 5 × 5 board draws both random values separately for every cell', () => {
  let calls = 0;
  const board = generateBoard(() => {
    const cell = Math.floor(calls / 2);
    return calls++ % 2 === 0 ? 0.9 : (cell % 5 + 0.5) / 5;
  });
  assert.equal(board.length, 5);
  assert.equal(calls, 50);
  for (const row of board) {
    assert.equal(row.length, 5);
    assert.deepEqual(row, Array.from({ length: 5 }, (_, index) => ({ tier: 'high', index })));
  }
});

test('a seeded sample distributes probability across fifteen regular icons and one scatter', () => {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const counts = { low: Array(5).fill(0), mid: Array(5).fill(0), high: Array(5).fill(0), scatter: [0] };
  const samples = 100000;
  for (let i = 0; i < samples; i++) {
    const symbol = drawSymbol(random);
    counts[symbol.tier][symbol.index]++;
  }
  for (const [tier, probability] of [['low', 0.02932], ['mid', 0.02], ['high', 0.14068], ['scatter', 0.05]]) {
    for (const count of counts[tier]) {
      assert.ok(Math.abs(count / samples - probability) < 0.004,
        `${tier}: observed ${count / samples}, expected ${probability}`);
    }
  }
});

const emptyBoard = () => Array.from({ length: 5 }, () => Array(5).fill(null));
const symbol = (tier, index) => ({ tier, index });

test('five identical symbols win anywhere; four matches, tier alone, or index alone do not', () => {
  const board = emptyBoard();
  board[0][0] = symbol('mid', 3);
  board[2][4] = symbol('mid', 3);
  assert.equal(findWins(board).length, 0);
  board[4][2] = symbol('mid', 3);
  board[1][3] = symbol('mid', 3);
  assert.equal(findWins(board).length, 0);
  board[3][1] = symbol('mid', 3);
  board[0][1] = symbol('low', 3);
  board[0][2] = symbol('high', 3);
  board[1][0] = symbol('mid', 0);
  board[1][1] = symbol('mid', 1);
  const wins = findWins(board);
  assert.equal(wins.length, 1);
  assert.deepEqual(wins[0].symbol, symbol('mid', 3));
  assert.deepEqual(wins[0].cells, [
    { row: 0, column: 0 }, { row: 1, column: 3 }, { row: 2, column: 4 },
    { row: 3, column: 1 }, { row: 4, column: 2 },
  ]);
  assert.equal(wins[0].winCents, 5);
});

test('5/6/7+ groups pay once by quantity; 2–4 matches do not win', () => {
  const expected = {
    low: { 5: 1, 6: 5, 7: 10 },
    mid: { 5: 5, 6: 10, 7: 25 },
    high: { 5: 10, 6: 25, 7: 50 },
  };
  for (const tier of ['low', 'mid', 'high']) {
    for (let quantity = 2; quantity <= 25; quantity++) {
      const board = emptyBoard();
      for (let cell = 0; cell < quantity; cell++) {
        board[Math.floor(cell / 5)][cell % 5] = symbol(tier, 4);
      }
      for (const multiplier of [1, 2, 144]) {
        const wins = findWins(board, multiplier);
        if (quantity < 5) {
          assert.equal(wins.length, 0);
        } else {
          assert.equal(wins.length, 1);
          assert.equal(wins[0].cells.length, quantity);
          assert.equal(wins[0].winCents, expected[tier][Math.min(quantity, 7)] * multiplier,
            `${tier}, ${quantity} symbols, x${multiplier}`);
          assert.ok(removeWins(board, wins).flat().every((cell) => cell === null));
        }
      }
    }
  }
});

test('simultaneous groups add their quantity awards before applying the stage multiplier', () => {
  const board = [
    Array.from({ length: 5 }, () => symbol('low', 0)),
    Array.from({ length: 6 }, () => symbol('mid', 1)),
    Array.from({ length: 7 }, () => symbol('high', 2)),
  ];
  assert.deepEqual(findWins(board).map((win) => win.winCents), [1, 10, 50]);
  assert.equal(findWins(board, 3).reduce((sum, win) => sum + win.winCents, 0), 183);
  assert.equal(BET_CENTS, 100);
});

test('remove and refill affect only winning positions and leave original boards intact', () => {
  const board = emptyBoard();
  board[0] = [symbol('low', 1), symbol('mid', 2), symbol('low', 1), symbol('high', 4), symbol('low', 1)];
  board[1][0] = board[1][4] = symbol('low', 1);
  const cleared = removeWins(board, findWins(board));
  assert.deepEqual(cleared[0], [null, symbol('mid', 2), null, symbol('high', 4), null]);
  assert.notEqual(board[0][0], null);
  let calls = 0;
  const refilled = refillBoard(cleared, () => { calls++; return 0; });
  assert.equal(calls, 46); // 23 holes, two independent draws per hole.
  assert.equal(refilled[0][1], board[0][1]);
  assert.equal(refilled[0][3], board[0][3]);
  assert.deepEqual(refilled[0][0], symbol('low', 0));
  assert.equal(cleared[0][0], null);
});

test('scatter never pays or collects and survives regular-symbol removal and refills', () => {
  const scatter = { tier: 'scatter', index: 0 };
  const fullScatter = Array.from({ length: 5 }, () => Array(5).fill(scatter));
  assert.deepEqual(findWins(fullScatter, 144), []);
  const board = emptyBoard();
  board[0] = Array(5).fill(scatter);
  board[1] = Array.from({ length: 5 }, () => symbol('low', 0));
  const wins = findWins(board);
  assert.equal(wins.length, 1);
  assert.deepEqual([...collectWins(new Set(), wins, 0)], ['low']);
  const cleared = removeWins(board, wins);
  let calls = 0;
  const refilled = refillBoard(cleared, () => { calls++; return 0.99; });
  assert.equal(calls, 20); // Each empty cell draws the single scatter without an icon-index draw.
  assert.equal(refilled[0][0], scatter);
  assert.ok(refilled.flat().every((cell) => cell.tier === 'scatter' && cell.index === 0));
  assert.deepEqual(findWins(refilled), []);
});

test('replacement symbols can trigger another win, and resolution stops on a settled board', () => {
  const types = ['low', 'mid', 'high'].flatMap((tier) => Array.from({ length: 5 }, (_, index) => symbol(tier, index)));
  const cells = Array.from({ length: 25 }, (_, index) => types[index % 15]);
  cells.fill(symbol('low', 0), 0, 5);
  const board = Array.from({ length: 5 }, (_, row) => cells.slice(row * 5, row * 5 + 5));
  const first = findWins(board);
  assert.equal(first.length, 1);
  assert.equal(first[0].cells.length, 6);
  let roll = 0;
  const secondBoard = refillBoard(removeWins(board, first), () => roll++ % 2 === 0 ? 0.9 : 0);
  const second = findWins(secondBoard);
  assert.equal(second.length, 1);
  assert.deepEqual(second[0].symbol, symbol('high', 0));
  assert.equal(second[0].cells.length, 7);
  const values = Array.from({ length: 7 }, (_, index) => [0.9, (index % 5 + 0.5) / 5]).flat();
  const settled = refillBoard(removeWins(secondBoard, second), () => values.shift());
  assert.equal(findWins(settled).length, 0);
  assert.equal([...first, ...second].reduce((sum, win) => sum + win.winCents, 0), 55);
});

test('collection grows only from removed background symbols and persists across cascades', () => {
  let collected = new Set();
  const winFor = (tier, index) => findWins([Array.from({ length: 5 }, () => symbol(tier, index))]);
  collected = collectWins(collected, winFor('low', 2), 2);
  collected = collectWins(collected, winFor('mid', 1), 2);
  assert.deepEqual([...collected], ['low']);
  assert.equal(isCollectionComplete(collected), false);
  const prior = collected;
  collected = collectWins(collected, winFor('mid', 2), 2);
  assert.equal(prior.has('mid'), false);
  collected = collectWins(collected, winFor('high', 2), 2);
  assert.equal(isCollectionComplete(collected), true);
  assert.equal(isCollectionComplete(new Set()), false); // A new stage starts empty.
});

test('free respins follow Fibonacci from x2 through x144 and stay capped', () => {
  assert.deepEqual(Array.from({ length: 13 }, (_, index) => getMultiplier(index)),
    [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 144, 144]);
  assert.equal(getMultiplier(1000), 144);
});

test('room multiplier bag preserves all 30 equally likely slots and their duplicate weights', () => {
  assert.equal(ROOM_MULTIPLIERS.length, 30);
  assert.deepEqual(Object.fromEntries([2, 3, 5, 8].map((value) =>
    [value, ROOM_MULTIPLIERS.filter((entry) => entry === value).length])), { 2: 14, 3: 8, 5: 5, 8: 3 });
  assert.equal(ROOM_MULTIPLIERS.reduce((sum, value) => sum + value, 0), 101);
  const wins = findWins([Array.from({ length: 5 }, () => symbol('high', 2))], 3);
  for (let slot = 0; slot < 30; slot++) {
    const boosted = applyRoomMultipliers(wins, 2, () => (slot + 0.5) / 30);
    assert.equal(boosted[0].roomMultiplier, ROOM_MULTIPLIERS[slot]);
    assert.equal(boosted[0].unboostedWinCents, 30);
    assert.equal(boosted[0].winCents, 30 * ROOM_MULTIPLIERS[slot]);
  }
  assert.equal(wins[0].winCents, 30);
});

test('each matching-room group draws independently; other identities get no bonus or RNG draw', () => {
  const wins = findWins([
    Array.from({ length: 5 }, () => symbol('low', 1)),
    Array.from({ length: 5 }, () => symbol('mid', 1)),
    Array.from({ length: 6 }, () => symbol('high', 4)),
  ], 5);
  const rolls = [0, 0.999999];
  const boosted = applyRoomMultipliers(wins, 1, () => {
    assert.ok(rolls.length > 0, 'A non-room group must not draw a bonus');
    return rolls.shift();
  });
  assert.deepEqual(boosted.map((win) => win.roomMultiplier), [2, 8, 1]);
  assert.deepEqual(boosted.map((win) => win.winCents), [10, 200, 125]);
  assert.deepEqual(wins.map((win) => win.winCents), [5, 25, 125]);
  assert.deepEqual(applyRoomMultipliers([], 1, () => { throw new Error('No draw expected'); }), []);
});

test('room bonus multiplies the capped stage award and can apply again in a later winning batch', () => {
  const wins = findWins([Array.from({ length: 7 }, () => symbol('high', 0))], 144);
  const first = applyRoomMultipliers(wins, 0, () => 0.99);
  const later = applyRoomMultipliers(wins, 0, () => 0);
  assert.equal(first[0].winCents, 50 * 144 * 8);
  assert.equal(later[0].winCents, 50 * 144 * 2);
  assert.equal(first[0].cells.length, 7);
});
