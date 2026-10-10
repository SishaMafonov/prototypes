import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BONUS_SIZE, BONUS_WEIGHTS, BONUS_ARROW_WEIGHTS, freeSpinsForScatters, createBonus,
  drawBonusSymbol, beginBonusSpin, drawBonusArrowCount, drawBonusArrowRows,
  collectBonusCell, collectBonusLine, takeBonusHeart, bonusWinCents, parkedBonusHearts,
} from '../src/bonus.ts';

const seeded = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const board = (symbol = 'empty') => Array.from({ length: 5 }, () => Array(5).fill(symbol));

test('3/4/5 Scatters award 10/15/20 free spins, with no award below three', () => {
  for (const [count, spins] of [[0, 0], [1, 0], [2, 0], [3, 10], [4, 15], [5, 20]]) {
    assert.equal(freeSpinsForScatters(count), spins);
    const state = createBonus(count);
    assert.equal(state.remainingSpins, spins);
    assert.equal(state.initialSpins, spins);
    assert.equal(state.currentSpin, 0);
    assert.equal(state.coins, 0);
    assert.equal(state.multiplier, 1);
    assert.equal(state.grid.length, 5);
    assert.ok(state.grid.every((row) => row.length === 5));
  }
});

test('every bonus symbol uses its requested cumulative probability range', () => {
  assert.equal(BONUS_SIZE, 5);
  assert.deepEqual(BONUS_WEIGHTS, { empty: 35, coin: 25, x2: 20, x3: 10, heart: 7, scatter: 3 });
  for (const [roll, symbol] of [[0, 'empty'], [0.34999, 'empty'], [0.35, 'coin'], [0.59999, 'coin'],
    [0.6, 'x2'], [0.79999, 'x2'], [0.8, 'x3'], [0.89999, 'x3'], [0.9, 'heart'],
    [0.96999, 'heart'], [0.97, 'scatter'], [0.99999, 'scatter']]) {
    assert.equal(drawBonusSymbol(() => roll), symbol);
  }
});

test('seeded bonus draws follow symbol probabilities and each spin fills 25 independent cells', () => {
  const random = seeded(84);
  const counts = Object.fromEntries(Object.keys(BONUS_WEIGHTS).map((symbol) => [symbol, 0]));
  for (let index = 0; index < 100000; index++) counts[drawBonusSymbol(random)]++;
  for (const symbol of Object.keys(counts)) assert.ok(Math.abs(counts[symbol] / 100000 - BONUS_WEIGHTS[symbol] / 100) < 0.004);
  let calls = 0;
  const start = createBonus(3);
  const spin = beginBonusSpin(start, () => { calls++; return 0.5; });
  assert.equal(calls, 25);
  assert.equal(new Set(spin.grid).size, 5);
  assert.ok(spin.grid.flat().every((symbol) => symbol === 'coin'));
  assert.equal(start.remainingSpins, 10);
  assert.equal(start.currentSpin, 0);
  assert.equal(spin.currentSpin, 1);
  assert.equal(spin.remainingSpins, 9);
  assert.equal(beginBonusSpin({ ...start, remainingSpins: 0 }).currentSpin, 0);
});

test('the 55 listed arrow weights normalize over the positive 1–5 outcomes', () => {
  assert.deepEqual(BONUS_ARROW_WEIGHTS, [20, 15, 12, 5, 3]);
  for (const [roll, count] of [[0, 1], [19.999 / 55, 1], [20 / 55, 2], [34.999 / 55, 2],
    [35 / 55, 3], [46.999 / 55, 3], [47 / 55, 4], [51.999 / 55, 4], [52 / 55, 5], [0.99999, 5]]) {
    assert.equal(drawBonusArrowCount(() => roll), count);
  }
  const random = seeded(17);
  const counts = [0, 0, 0, 0, 0];
  for (let index = 0; index < 50000; index++) counts[drawBonusArrowCount(random) - 1]++;
  counts.forEach((count, index) => assert.ok(Math.abs(count / 50000 - BONUS_ARROW_WEIGHTS[index] / 55) < 0.006));
});

test('arrows never repeat a row within a free spin, even with constant random draws', () => {
  assert.deepEqual(drawBonusArrowRows(5, () => 0), [0, 1, 2, 3, 4]);
  assert.deepEqual(drawBonusArrowRows(5, () => 0.99999), [4, 3, 2, 1, 0]);
  assert.deepEqual(drawBonusArrowRows(8, () => 0), [0, 1, 2, 3, 4]);
  assert.deepEqual(drawBonusArrowRows(0), []);
  for (let seed = 0; seed < 200; seed++) {
    for (let count = 1; count <= 5; count++) {
      const rows = drawBonusArrowRows(count, seeded(seed));
      assert.equal(rows.length, count);
      assert.equal(new Set(rows).size, count);
      assert.ok(rows.every((row) => row >= 0 && row < 5));
    }
  }
});

test('unique arrow selection gives every row equal chances at each shot position', () => {
  const random = seeded(34);
  const counts = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let spin = 0; spin < 50000; spin++) {
    drawBonusArrowRows(5, random).forEach((row, position) => counts[position][row]++);
  }
  for (const position of counts) for (const count of position) assert.ok(Math.abs(count / 50000 - 0.2) < 0.006);
});

test('carried hearts stay parked through filling and while earlier queued hearts sweep', () => {
  const waiting = { ...createBonus(3), waitingHearts: [0, 2, 2] };
  assert.deepEqual(parkedBonusHearts(waiting), [0, 2, 2]);
  const filling = beginBonusSpin(waiting, () => 0.5);
  assert.deepEqual(parkedBonusHearts(filling), [0, 2, 2]);
  const active = takeBonusHeart(filling);
  assert.deepEqual(active.heart, { row: -1, column: 0 });
  assert.deepEqual(parkedBonusHearts(active.state), [2, 2]);
  const swept = collectBonusLine(active.state, 'column', 0).state;
  assert.deepEqual(parkedBonusHearts(swept), [2, 2]);
  assert.deepEqual(parkedBonusHearts(takeBonusHeart(swept).state), [2]);
  assert.deepEqual(parkedBonusHearts({ ...filling, heartQueue: [{ row: 3, column: 4 }] }), []);
});

test('a row collects coins, additive multipliers, hearts and +1 spins exactly once', () => {
  const initial = { ...createBonus(3), grid: board() };
  initial.grid[2] = ['coin', 'x2', 'x3', 'heart', 'scatter'];
  const snapshot = structuredClone(initial);
  const first = collectBonusLine(initial, 'row', 2);
  assert.equal(first.state.coins, 1);
  assert.equal(first.state.multiplier, 6);
  assert.equal(first.state.remainingSpins, 11);
  assert.deepEqual(first.state.heartQueue, [{ row: 2, column: 3 }]);
  assert.equal(first.collected.length, 5);
  assert.deepEqual(first.state.grid[2], Array(5).fill('empty'));
  assert.deepEqual(initial, snapshot);
  const repeated = collectBonusLine(first.state, 'row', 2);
  assert.deepEqual(repeated.state, first.state);
  assert.equal(repeated.collected.length, 0);
  assert.equal(bonusWinCents(first.state), 600);
  assert.equal(bonusWinCents(first.state, 50), 300);
});

test('unhit symbols do not contribute to payout and row/column overlaps never collect twice', () => {
  const initial = { ...createBonus(3), grid: board() };
  initial.grid[0][0] = 'coin';
  initial.grid[0][1] = 'x2';
  initial.grid[1][0] = 'coin';
  initial.grid[4][4] = 'x3';
  let state = collectBonusLine(initial, 'row', 0).state;
  state = collectBonusLine(state, 'column', 0).state;
  assert.equal(state.coins, 2);
  assert.equal(state.multiplier, 3);
  assert.equal(state.grid[4][4], 'x3');
  assert.equal(bonusWinCents(state), 600);
  assert.equal(collectBonusCell(state, { row: 0, column: 0 }).collected, undefined);
});

test('an empty-column heart waits and collects at the beginning of the next spin', () => {
  let state = { ...createBonus(3), grid: board(), heartQueue: [{ row: 3, column: 2 }] };
  const waiting = takeBonusHeart(state);
  assert.equal(waiting.ready, false);
  assert.deepEqual(waiting.state.waitingHearts, [2]);
  assert.equal(waiting.state.heartQueue.length, 0);
  state = beginBonusSpin(waiting.state, () => 0.5);
  assert.deepEqual(state.heartQueue, [{ row: -1, column: 2 }]);
  assert.equal(state.waitingHearts.length, 0);
  const active = takeBonusHeart(state);
  assert.equal(active.ready, true);
  const swept = collectBonusLine(active.state, 'column', 2).state;
  assert.equal(swept.coins, 5);
  assert.ok(swept.grid.every((row) => row[2] === 'empty'));
  assert.equal(swept.grid[0][1], 'coin');
});

test('a saved heart stays parked when the next spin also has an empty column', () => {
  const start = { ...createBonus(3), waitingHearts: [1, 1] };
  let state = beginBonusSpin(start, () => 0);
  state = takeBonusHeart(state).state;
  state = takeBonusHeart(state).state;
  assert.deepEqual(state.waitingHearts, [1, 1]);
  assert.deepEqual(parkedBonusHearts(state), [1, 1]);
  assert.equal(state.heartQueue.length, 0);
});

test('vertical hearts can queue another sweep and Scatter extensions apply before bonus-end evaluation', () => {
  let state = { ...createBonus(3), remainingSpins: 0, currentSpin: 10, grid: board(), heartQueue: [{ row: 0, column: 1 }] };
  state.grid[1][1] = 'heart';
  state.grid[2][1] = 'scatter';
  state.grid[3][1] = 'x3';
  const active = takeBonusHeart(state);
  assert.equal(active.ready, true);
  state = collectBonusLine(active.state, 'column', 1).state;
  assert.equal(state.remainingSpins, 1);
  assert.equal(state.multiplier, 4);
  assert.deepEqual(state.heartQueue, [{ row: 1, column: 1 }]);
  state = takeBonusHeart(state).state;
  assert.deepEqual(state.waitingHearts, [1]);
  const next = beginBonusSpin(state, () => 0);
  assert.equal(next.currentSpin, 11);
  assert.equal(next.remainingSpins, 0);
});

test('50 complete seeded bonuses finish with exact payout and no duplicated collections', () => {
  const random = seeded(343);
  const drainHearts = (initial) => {
    let state = initial;
    let guard = 0;
    while (state.heartQueue.length) {
      assert.ok(guard++ < 200);
      const active = takeBonusHeart(state);
      state = active.ready ? collectBonusLine(active.state, 'column', active.heart.column).state : active.state;
    }
    return state;
  };
  for (let feature = 0; feature < 50; feature++) {
    let state = createBonus(3 + feature % 3);
    while (state.remainingSpins > 0) {
      assert.ok(state.currentSpin < 500);
      state = drainHearts(beginBonusSpin(state, random));
      for (const row of drawBonusArrowRows(drawBonusArrowCount(random), random)) {
        state = drainHearts(collectBonusLine(state, 'row', row).state);
      }
    }
    assert.equal(state.remainingSpins, 0);
    assert.ok(state.currentSpin >= state.initialSpins);
    assert.equal(bonusWinCents(state), state.coins * 100 * state.multiplier);
    assert.ok(Number.isSafeInteger(bonusWinCents(state)));
  }
});
