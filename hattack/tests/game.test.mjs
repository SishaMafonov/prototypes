import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYMBOLS, CATEGORY_WEIGHTS, REEL_CATEGORY_WEIGHTS, MAX_REEL_WILDS, drawSymbol, evaluateWays, generateOpeningReels,
  generateReels, symbolAt, visibleGrid, createCascade, winningCells, heartsForResult, placeHeartWilds,
  winCents, returnToPlayer,
  chargeLoveMeter, selectLoveArrows, createRemovalCascade, nextBoardAction,
} from '../src/game.ts';

const find = (id) => SYMBOLS.find((symbol) => symbol.id === id);
const a = find('low-0');
const b = find('low-1');
const wild = find('wild');
const scatter = find('scatter');
const fill = (symbol) => Array(4).fill(symbol);
const seeded = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

test('love meter charges once per ways-winning board, ignores Scatter triggers and caps at ten', () => {
  const multiple = evaluateWays([[a, b, b, b], [a, b, b, b], [a, b, b, b], fill(a), fill(a)]);
  assert.equal(multiple.wins.length, 2);
  assert.equal(chargeLoveMeter(0, multiple), 1);
  assert.equal(chargeLoveMeter(9, multiple), 10);
  assert.equal(chargeLoveMeter(10, multiple), 10);
  const scatterResult = evaluateWays([fill(a), fill(b), fill(scatter), fill(b), fill(a)]);
  assert.equal(scatterResult.totalWays, 0);
  assert.equal(scatterResult.scatterTrigger, true);
  assert.equal(chargeLoveMeter(4, scatterResult), 4);
  const loss = evaluateWays([fill(a), fill(b), fill(a), fill(b), fill(a)]);
  assert.equal(chargeLoveMeter(4, loss), 4);
});

test('board resolution completes wins and heart awards before a pending arrow burst', () => {
  const win = evaluateWays([fill(a), fill(a), fill(a), fill(b), fill(b)]);
  const loss = evaluateWays([fill(a), fill(b), fill(a), fill(b), fill(a)]);
  assert.equal(nextBoardAction(win, 5, 10, true), 'win');
  assert.equal(nextBoardAction(loss, 3, 10, true), 'heart-wilds');
  assert.equal(nextBoardAction(loss, 0, 10, true), 'love-arrows');
  assert.equal(nextBoardAction(loss, 0, 10, false), 'idle');
  assert.equal(nextBoardAction(loss, 0, 0, false), 'idle');
});

test('an arrow-refill win allows another burst with retained charge, and a losing refill ends the chain', () => {
  let grid = [fill(a), fill(b), fill(a), fill(find('mid-0')), fill(find('high-0'))];
  let charge = 6;
  const rolls = [0, 4.1 / 20, 4.1 / 19, 4.1 / 18];
  const first = selectLoveArrows(grid, charge, () => rolls.shift());
  grid = createRemovalCascade(grid, first.targets, () => 0).grid;
  let result = evaluateWays(grid);
  assert.equal(nextBoardAction(result, 0, charge, false), 'win');
  assert.equal(winCents(result), 240);
  charge = chargeLoveMeter(charge, result);
  assert.equal(charge, 7); // The first burst did not spend the original six cells.
  let call = 0;
  grid = createCascade(grid, result, () => {
    const draw = Math.floor(call++ / 2);
    return call % 2 === 1 ? 0 : (Math.floor(draw / 4) + 0.1) / 6;
  }).grid;
  result = evaluateWays(grid);
  assert.equal(result.totalWays, 0);
  assert.equal(nextBoardAction(result, 0, charge, true), 'love-arrows');
  const second = selectLoveArrows(grid, charge, () => 0);
  assert.equal(second.charge, 7);
  assert.equal(second.targets.length, 3);
  grid = createRemovalCascade(grid, second.targets, () => 0.965).grid;
  result = evaluateWays(grid);
  assert.equal(result.totalWays, 0);
  assert.equal(chargeLoveMeter(charge, result), 7);
  assert.equal(nextBoardAction(result, 0, charge, false), 'idle');
});

test('retained full charge and a Scatter trigger cannot restart arrows without fresh wins', () => {
  const grid = [fill(a), fill(b), [scatter, a, b, a], [scatter, b, b, b], [scatter, a, b, a]];
  const result = evaluateWays(grid);
  assert.equal(result.totalWays, 0);
  assert.equal(result.scatterTrigger, true);
  assert.equal(nextBoardAction(result, 0, 10, false), 'idle');
  const protectedGrid = Array.from({ length: 5 }, () => fill(scatter));
  assert.deepEqual(selectLoveArrows(protectedGrid, 10).targets, []);
  assert.equal(nextBoardAction(evaluateWays(protectedGrid), 0, 10, false), 'idle');
});

test('arrow tiers use inclusive counts, with the fifth cell in the 1–3 tier', () => {
  const grid = Array.from({ length: 5 }, () => fill(a));
  for (const [level, min, max] of [[1, 1, 3], [5, 1, 3], [6, 3, 5], [8, 3, 5], [9, 5, 10]]) {
    assert.equal(selectLoveArrows(grid, level, () => 0).targets.length, min);
    assert.equal(selectLoveArrows(grid, level, () => 0.99999).targets.length, max);
  }
  assert.deepEqual(selectLoveArrows(grid, 0, () => { throw new Error('Unexpected arrow draw'); }).targets, []);
});

test('arrows select distinct regular cells and never target Wilds or Scatters', () => {
  const grid = [[wild, scatter, a, b], fill(a), fill(b), fill(wild), fill(scatter)];
  const snapshot = grid.map((column) => [...column]);
  for (const level of [1, 5, 6, 8, 9, 10]) {
    const burst = selectLoveArrows(grid, level, seeded(level));
    assert.equal(new Set(burst.targets.map(({ reel, row }) => `${reel}-${row}`)).size, burst.targets.length);
    for (const cell of burst.targets) assert.ok(['low', 'mid', 'high'].includes(grid[cell.reel][cell.row].category));
  }
  assert.deepEqual(grid, snapshot);
});

test('full meter clears every regular cell, leaving special symbols to fall in order', () => {
  assert.equal(selectLoveArrows(Array.from({ length: 5 }, () => fill(a)), 10).targets.length, 20);
  const grid = [[a, wild, b, scatter], [scatter, a, wild, b], fill(a), fill(wild), fill(scatter)];
  const burst = selectLoveArrows(grid, 10, () => { throw new Error('Full clear needs no selection randomness'); });
  assert.equal(burst.targets.length, 8);
  const next = createRemovalCascade(grid, burst.targets, () => 0.965);
  const fresh = find('high-5');
  const protectedFresh = find('high-5'); // 0.965 remains High after excluding Scatter weight.
  assert.deepEqual(next.grid[0], [protectedFresh, protectedFresh, wild, scatter]);
  assert.deepEqual(next.grid[1], [protectedFresh, protectedFresh, scatter, wild]);
  assert.deepEqual(next.grid[2], fill(fresh));
  assert.deepEqual(next.grid[3], fill(wild));
  assert.deepEqual(next.grid[4], fill(scatter));
  assert.equal(next.removed.length, 8);
  assert.ok(next.grid.every((column) => column.length === 4));
});

test('arrow counts cap at available regular cells and handle a protected-only board', () => {
  const sparse = [fill(wild), fill(scatter), fill(wild), fill(scatter), [a, b, wild, scatter]];
  assert.equal(selectLoveArrows(sparse, 9, () => 0.99999).targets.length, 2);
  assert.equal(selectLoveArrows([fill(wild), fill(scatter), fill(wild), fill(scatter), fill(wild)], 10).targets.length, 0);
});

test('a Low win from an arrow refill pays and charges the love meter but earns no heart Wilds', () => {
  const grid = [fill(a), fill(b), fill(a), fill(find('mid-0')), fill(find('high-0'))];
  assert.equal(evaluateWays(grid).totalWays, 0);
  const rolls = [0, 4.1 / 20, 4.1 / 19, 4.1 / 18];
  const burst = selectLoveArrows(grid, 6, () => rolls.shift());
  assert.deepEqual(burst.targets, [{ reel: 1, row: 0 }, { reel: 1, row: 1 }, { reel: 1, row: 2 }]);
  const refill = createRemovalCascade(grid, burst.targets, () => 0);
  const result = evaluateWays(refill.grid);
  assert.equal(result.totalWays, 48);
  assert.equal(winCents(result), 240);
  assert.equal(heartsForResult(result), 0);
  assert.equal(chargeLoveMeter(6, result), 7);
});

test('removal cascades clear a repeated target once and keep the input untouched', () => {
  const grid = [fill(a), fill(b), fill(a), fill(b), fill(a)];
  const snapshot = grid.map((column) => [...column]);
  let calls = 0;
  const refill = createRemovalCascade(grid, [{ reel: 0, row: 2 }, { reel: 0, row: 2 }], () => { calls++; return 0; });
  assert.equal(refill.removed.length, 1);
  assert.equal(calls, 2);
  assert.deepEqual(grid, snapshot);
});

test('every regular category pays the specified amount per winning way for 3–5 reels', () => {
  const expected = { low: [5, 10, 25], mid: [25, 50, 75], high: [75, 100, 200] };
  for (const [category, amounts] of Object.entries(expected)) {
    for (const symbol of SYMBOLS.filter((entry) => entry.category === category)) {
      for (const length of [3, 4, 5]) {
        const grid = Array.from({ length: 5 }, (_, reel) => fill(reel < length ? symbol : scatter));
        assert.equal(winCents(evaluateWays(grid)), amounts[length - 3] * 4 ** length);
      }
    }
  }
});

test('mixed wins add together and a substituting Wild pays the matched symbol rate', () => {
  const mid = find('mid-0');
  const result = evaluateWays([[a, mid, scatter, scatter], [wild, scatter, scatter, scatter],
    [a, mid, scatter, scatter], [mid, scatter, scatter, scatter], fill(scatter)]);
  assert.equal(result.totalWays, 2);
  assert.equal(winCents(result), 5 + 50);
});

test('unpaid special-symbol hits and losing results pay zero', () => {
  assert.equal(winCents(evaluateWays(Array.from({ length: 5 }, () => fill(wild)))), 0);
  assert.equal(winCents(evaluateWays(Array.from({ length: 5 }, () => fill(scatter)))), 0);
  assert.equal(winCents(evaluateWays([fill(a), fill(b), fill(a), fill(b), fill(a)])), 0);
});

test('cascade payouts accumulate in exact cents without duplicate prefix awards', () => {
  const initial = [fill(a), fill(a), fill(a), fill(b), fill(b)];
  const first = evaluateWays(initial);
  const second = evaluateWays(createCascade(initial, first, () => 0.965).grid);
  assert.equal(winCents(first), 320);
  assert.equal(winCents(second), 4800);
  assert.equal(winCents(first) + winCents(second), 5120);
});

test('session RTP uses the fixed 1.00 bet and safely handles no rounds', () => {
  assert.equal(returnToPlayer(0, 0), 0);
  assert.equal(returnToPlayer(175, 2), 0.875);
  assert.equal(returnToPlayer(200, 2), 1);
  assert.equal(returnToPlayer(5120, 1), 51.2);
});

test('sheets map to 18 regular symbols plus Wild and Scatter', () => {
  assert.equal(SYMBOLS.length, 20);
  for (const category of ['low', 'mid', 'high']) {
    assert.deepEqual(SYMBOLS.filter((symbol) => symbol.category === category).map((symbol) => symbol.frame), [0, 1, 2, 3, 4, 5]);
  }
  assert.equal(wild.frame, 0);
  assert.equal(scatter.frame, 1);
});

test('category ranges and frame selection honor the specified weights', () => {
  assert.deepEqual(CATEGORY_WEIGHTS, { low: 0.8, mid: 0.11, high: 0.065, wild: 0, scatter: 0.025 });
  for (const [roll, category] of [[0, 'low'], [0.79999, 'low'], [0.8, 'mid'],
    [0.90999, 'mid'], [0.91, 'high'], [0.97499, 'high'],
    [0.97501, 'scatter'], [0.99999, 'scatter']]) {
    let call = 0;
    const symbol = drawSymbol(() => call++ === 0 ? roll : 0.99999);
    assert.equal(symbol.category, category);
    assert.equal(symbol.frame, category === 'scatter' ? 1 : 5);
  }
});

test('a large seeded sample follows category weights, draws every eligible frame and no Wilds', () => {
  const random = seeded(42);
  const count = Object.fromEntries(Object.keys(CATEGORY_WEIGHTS).map((key) => [key, 0]));
  const frames = new Map();
  for (let i = 0; i < 200000; i++) {
    const symbol = drawSymbol(random);
    count[symbol.category]++;
    frames.set(symbol.id, (frames.get(symbol.id) ?? 0) + 1);
  }
  for (const category of Object.keys(count)) {
    assert.ok(Math.abs(count[category] / 200000 - CATEGORY_WEIGHTS[category]) < 0.004);
  }
  for (const symbol of SYMBOLS.filter((entry) => entry.category === 'low')) {
    assert.ok(Math.abs(frames.get(symbol.id) / 200000 - CATEGORY_WEIGHTS.low / 6) < 0.004);
  }
  assert.equal(count.wild, 0);
  assert.equal(frames.size, 19);
});

test('each round generates five independent strips of inclusive length 30–110 and valid stops', () => {
  const random = seeded(17);
  const lengths = new Set();
  for (let round = 0; round < 300; round++) {
    const reels = generateReels(random);
    assert.equal(reels.length, 5);
    assert.equal(new Set(reels.map((reel) => reel.strip)).size, 5);
    for (const reel of reels) {
      lengths.add(reel.strip.length);
      assert.ok(reel.strip.length >= 30 && reel.strip.length <= 110);
      assert.ok(reel.stop >= 0 && reel.stop < reel.strip.length);
      assert.ok(reel.strip.filter((symbol) => symbol.category === 'wild').length <= MAX_REEL_WILDS);
      assert.ok(reel.strip.filter((symbol) => symbol.category === 'scatter').length <= 1);
    }
  }
  assert.ok(lengths.has(30) && lengths.has(110));
  assert.equal(generateReels(() => 0)[0].stop, 0);
  assert.equal(generateReels(() => 0.99999)[0].stop, 109);
});

test('each strip permits at most one Scatter, including constant Scatter rolls and all wrapped stops', () => {
  for (const random of [() => 0, () => 0.99999, seeded(984)]) {
    const reels = generateReels(random);
    for (const reel of reels) {
      const count = reel.strip.filter((symbol) => symbol.category === 'scatter').length;
      assert.ok(count <= 1);
      for (let stop = 0; stop < reel.strip.length; stop++) {
        assert.ok(visibleGrid([{ ...reel, stop }])[0].filter((symbol) => symbol.category === 'scatter').length <= 1);
      }
    }
  }
  assert.ok(generateReels(() => 0).every((reel) => !reel.strip.includes(scatter)));
  assert.ok(generateReels(() => 0.99999).every((reel) => reel.strip.filter((symbol) => symbol === scatter).length === 1));
});

test('reels allow zero to three Wilds, cap both specials independently, and preserve circular limits', () => {
  assert.equal(MAX_REEL_WILDS, 3);
  assert.deepEqual(REEL_CATEGORY_WEIGHTS, { low: 0.775, mid: 0.11, high: 0.065, wild: 0.025, scatter: 0.025 });
  assert.ok(generateReels(() => 0).every((reel) => !reel.strip.includes(wild)));
  for (const random of [() => 0.96, () => 0.99999]) {
    for (const reel of generateReels(random)) {
      assert.equal(reel.strip.filter((symbol) => symbol === wild).length, 3);
      assert.ok(reel.strip.filter((symbol) => symbol === scatter).length <= 1);
      for (let stop = 0; stop < reel.strip.length; stop++) {
        const column = visibleGrid([{ ...reel, stop }])[0];
        assert.ok(column.filter((symbol) => symbol === wild).length <= 3);
        assert.ok(column.filter((symbol) => symbol === scatter).length <= 1);
      }
    }
  }
});

test('the first uncapped reel draw follows the configured spin weights', () => {
  const random = seeded(791);
  const counts = { low: 0, mid: 0, high: 0, wild: 0, scatter: 0 };
  for (let index = 0; index < 10000; index++) {
    for (const reel of generateReels(random)) counts[reel.strip[0].category]++;
  }
  for (const category of Object.keys(counts)) {
    assert.ok(Math.abs(counts[category] / 50000 - REEL_CATEGORY_WEIGHTS[category]) < 0.004);
  }
});

test('Scatter-free draws retain regular category ratios and never draw special symbols', () => {
  const random = seeded(837);
  const counts = { low: 0, mid: 0, high: 0 };
  for (let index = 0; index < 100000; index++) {
    const symbol = drawSymbol(random, false);
    assert.ok(symbol.category in counts);
    counts[symbol.category]++;
  }
  for (const category of Object.keys(counts)) {
    assert.ok(Math.abs(counts[category] / 100000 - CATEGORY_WEIGHTS[category] / 0.975) < 0.004);
  }
  assert.equal(drawSymbol(() => 0.99999, false).category, 'high');
});

test('cascade and full-meter arrow refills keep one Scatter per column across repeated fills', () => {
  let grid = [[scatter, a, a, a], fill(a), [a, scatter, a, a], fill(a), fill(a)];
  const snapshot = grid.map((column) => [...column]);
  grid = createCascade(grid, evaluateWays(grid), () => 0.99999).grid;
  assert.deepEqual(snapshot[0], [scatter, a, a, a]);
  assert.equal(grid[0][3], scatter);
  assert.equal(grid[2][3], scatter);
  assert.ok(grid.every((column) => column.filter((symbol) => symbol === scatter).length === 1));
  assert.equal(evaluateWays(grid).scatterCount, 5);
  for (let index = 0; index < 10; index++) {
    const burst = selectLoveArrows(grid, 10);
    grid = createRemovalCascade(grid, burst.targets, () => 0.99999).grid;
    assert.ok(grid.every((column) => column.filter((symbol) => symbol === scatter).length === 1));
    assert.ok(grid.every((column) => column.length === 4 && !column.includes(wild)));
  }
});

test('boundary stops display the end followed by the beginning, and negatives wrap', () => {
  const strip = [a, b, wild, scatter, find('high-0')];
  const grid = visibleGrid([{ strip, stop: 4 }]);
  assert.deepEqual(grid[0].map((symbol) => symbol.id), ['high-0', 'low-0', 'low-1', 'wild']);
  assert.equal(symbolAt(strip, -1).id, 'high-0');
  assert.equal(symbolAt(strip, 10), a);
});

test('ways multiply matches across rows, pay only the longest consecutive run', () => {
  const result = evaluateWays([[a, a, b, b], [b, a, b, b], [a, a, a, b], fill(b), fill(b)]);
  const win = result.wins.find((entry) => entry.symbol.id === a.id);
  assert.equal(win.reelCount, 3);
  assert.equal(win.ways, 6);
  assert.equal(win.cells.length, 6);
});

test('all 20 matching symbols form exactly 1,024 five-reel ways', () => {
  const result = evaluateWays(Array.from({ length: 5 }, () => fill(a)));
  assert.equal(result.totalWays, 1024);
  assert.equal(result.wins[0].reelCount, 5);
});

test('a matching run must start at the left and cannot skip a reel', () => {
  assert.equal(evaluateWays([fill(b), fill(a), fill(a), fill(a), fill(a)]).totalWays, 0);
  assert.equal(evaluateWays([fill(a), fill(b), fill(a), fill(a), fill(a)]).totalWays, 0);
  assert.equal(evaluateWays([fill(a), fill(a), fill(b), fill(b), fill(b)]).totalWays, 0);
});

test('Wild substitutes, Scatters do not, and pure Wild ways count once', () => {
  const result = evaluateWays([[a, b, b, b], [wild, b, b, b], [a, b, b, b], fill(scatter), fill(scatter)]);
  assert.equal(result.wins.find((entry) => entry.symbol.id === a.id).ways, 1);
  assert.equal(evaluateWays([fill(a), fill(scatter), fill(a), fill(b), fill(b)]).totalWays, 0);
  const wildResult = evaluateWays(Array.from({ length: 5 }, () => fill(wild)));
  assert.equal(wildResult.totalWays, 1024);
  assert.equal(wildResult.wins.length, 1);
  assert.equal(wildResult.wins[0].symbol.id, 'wild');
});

test('three Scatters provide a next-phase trigger without being a win or clearing cells', () => {
  const result = evaluateWays([fill(a), fill(b), [scatter, b, b, b], [b, scatter, b, b], [b, b, b, scatter]]);
  assert.equal(result.scatterCount, 3);
  assert.equal(result.scatterTrigger, true);
  assert.equal(result.totalWays, 0);
  assert.deepEqual(result.wins, []);
  assert.deepEqual(winningCells(result), []);
  assert.equal(winCents(result), 0);
  assert.equal(heartsForResult(result), 0);
  assert.equal(chargeLoveMeter(0, result), 0);
  const cascade = createCascade([fill(a), fill(b), [scatter, b, b, b], [b, scatter, b, b], [b, b, b, scatter]], result,
    () => { throw new Error('Scatter trigger must not refill'); });
  assert.equal(cascade.removed.length, 0);
  assert.ok(cascade.drops.every((drop) => drop.fromRow === drop.toRow));
});

test('Scatter trigger threshold remains three regardless of position, with no Scatter win', () => {
  for (const count of [0, 1, 2, 3, 4, 20]) {
    const grid = Array.from({ length: 5 }, () => fill(scatter));
    for (let index = count; index < 20; index++) grid[Math.floor(index / 4)][index % 4] = index % 2 ? a : b;
    const result = evaluateWays(grid);
    assert.equal(result.scatterCount, count);
    assert.equal(result.scatterTrigger, count >= 3);
    assert.ok(result.wins.every((win) => win.symbol.category !== 'scatter'));
    assert.ok(winningCells(result).every(({ reel, row }) => grid[reel][row].category !== 'scatter'));
  }
});

test('regular wins beside three Scatters pay and cascade while preserving every Scatter in order', () => {
  const c = find('mid-0');
  const d = find('high-0');
  const grid = [[scatter, a, c, scatter], [a, d, d, d], [c, scatter, a, c], fill(d), fill(c)];
  const result = evaluateWays(grid);
  assert.equal(result.scatterTrigger, true);
  assert.equal(result.totalWays, 1);
  assert.equal(winCents(result), 5);
  assert.equal(heartsForResult(result), 0);
  assert.equal(chargeLoveMeter(0, result), 1);
  const cascade = createCascade(grid, result, () => 0.965);
  assert.equal(cascade.removed.length, 3);
  assert.deepEqual(cascade.grid[0], [find('high-5'), scatter, c, scatter]);
  assert.deepEqual(cascade.grid[2], [find('high-5'), c, scatter, c]);
  assert.equal(evaluateWays(cascade.grid).scatterCount, 3);
});

test('opening screens never contain a ways win or next-phase Scatter trigger', () => {
  const random = seeded(95);
  for (let i = 0; i < 200; i++) {
    const reels = generateOpeningReels(random);
    const result = evaluateWays(visibleGrid(reels));
    assert.equal(result.totalWays, 0);
    assert.equal(result.scatterTrigger, false);
    assert.ok(reels.every((reel) => reel.strip.filter((symbol) => symbol === wild).length <= 3));
  }
  assert.equal(evaluateWays(visibleGrid(generateOpeningReels(() => 0))).totalWays, 0);
  assert.equal(evaluateWays(visibleGrid(generateOpeningReels(() => 0.99999))).totalWays, 0);
});

test('winning symbols clear together, survivors fall in order, and only gaps refill', () => {
  const c = find('mid-0');
  const d = find('high-0');
  const grid = [[c, a, d, a], [a, b, b, b], [b, b, a, b], fill(b), fill(b)];
  const snapshot = grid.map((column) => [...column]);
  const result = evaluateWays(grid);
  assert.equal(result.totalWays, 2);
  let calls = 0;
  const cascade = createCascade(grid, result, () => { calls++; return 0.965; });
  const fresh = find('high-5');
  assert.deepEqual(cascade.grid[0], [fresh, fresh, c, d]);
  assert.deepEqual(cascade.grid[1], [fresh, b, b, b]);
  assert.deepEqual(cascade.grid[2], [fresh, b, b, b]);
  assert.deepEqual(cascade.grid[3], grid[3]);
  assert.deepEqual(cascade.grid[4], grid[4]);
  assert.equal(cascade.removed.length, 4);
  assert.equal(calls, 8);
  assert.deepEqual(grid, snapshot);
  assert.deepEqual(cascade.drops.filter((drop) => drop.reel === 0).map(({ fromRow, toRow }) => [fromRow, toRow]),
    [[-2, 0], [-1, 1], [0, 2], [2, 3]]);
});

test('a shared Wild is removed once even when it participates in two wins', () => {
  const grid = [[a, b, scatter, scatter], [wild, scatter, scatter, scatter],
    [a, b, scatter, scatter], fill(scatter), fill(scatter)];
  const result = evaluateWays(grid);
  assert.equal(result.totalWays, 2);
  assert.equal(winningCells(result).length, 5);
  const cascade = createCascade(grid, result, () => 0.965);
  assert.deepEqual(cascade.grid[1], [find('high-5'), scatter, scatter, scatter]);
  assert.equal(cascade.removed.filter((cell) => cell.reel === 1 && cell.row === 0).length, 1);
});

test('all Scatters survive cascades, including boards with a next-phase trigger', () => {
  const grid = [fill(a), fill(b), [scatter, b, b, b], [b, scatter, b, b], [b, b, b, scatter]];
  const result = evaluateWays(grid);
  const cascade = createCascade(grid, result, () => 0.965);
  assert.equal(cascade.removed.length, 0);
  assert.deepEqual(cascade.grid, grid);
  assert.equal(cascade.grid.flat().filter((symbol) => symbol.category === 'scatter').length, 3);
  const two = [[scatter, a, b, b], [a, scatter, b, b], [a, b, b, b], fill(b), fill(b)];
  const next = createCascade(two, evaluateWays(two), () => 0.965);
  assert.equal(next.grid.flat().filter((symbol) => symbol.category === 'scatter').length, 2);
});

test('a refill can make another win, followed by a board with no wins', () => {
  let grid = [fill(a), fill(a), fill(a), fill(b), fill(b)];
  let result = evaluateWays(grid);
  assert.equal(result.totalWays, 64);
  grid = createCascade(grid, result, () => 0.965).grid;
  result = evaluateWays(grid);
  assert.equal(result.wins[0].symbol.id, 'high-5');
  assert.equal(result.totalWays, 64);
  let call = 0;
  grid = createCascade(grid, result, () => {
    const draw = Math.floor(call++ / 2);
    return call % 2 === 1 ? 0 : (Math.floor(draw / 4) + 0.1) / 6;
  }).grid;
  result = evaluateWays(grid);
  assert.equal(result.totalWays, 0);
  assert.equal(result.scatterTrigger, false);
  assert.ok(grid.every((column) => column.length === 4));
});

test('cascade refills generate no Wilds while retaining Scatter in the draw pool', () => {
  const grid = Array.from({ length: 5 }, () => fill(a));
  const result = evaluateWays(grid);
  const random = seeded(753);
  let scatterCount = 0;
  for (let index = 0; index < 100; index++) {
    const next = createCascade(grid, result, random).grid.flat();
    assert.ok(next.every((symbol) => symbol.category !== 'wild'));
    scatterCount += next.filter((symbol) => symbol.category === 'scatter').length;
  }
  assert.ok(scatterCount > 0);
});

test('a non-winning board stays unchanged and consumes no refill randomness', () => {
  const grid = [fill(a), fill(b), fill(a), fill(b), fill(a)];
  const cascade = createCascade(grid, evaluateWays(grid), () => { throw new Error('Unexpected draw'); });
  assert.deepEqual(cascade.grid, grid);
  assert.equal(cascade.removed.length, 0);
  assert.ok(cascade.drops.every((drop) => drop.fromRow === drop.toRow));
});

test('every Mid and High symbol charges 3–5 hearts by winning reel length rather than ways count', () => {
  for (const symbol of SYMBOLS.filter((entry) => entry.category === 'mid' || entry.category === 'high')) {
    for (let length = 3; length <= 5; length++) {
      const grid = Array.from({ length: 5 }, (_, reel) => fill(reel < length ? symbol : b));
      const result = evaluateWays(grid);
      assert.equal(result.totalWays, 4 ** length);
      assert.equal(heartsForResult(result), length);
    }
  }
});

test('Low and standalone Wild wins never charge hearts, while still clearing and charging the love meter', () => {
  for (const symbol of SYMBOLS.filter((entry) => entry.category === 'low' || entry.category === 'wild')) {
    for (let length = 3; length <= 5; length++) {
      const other = symbol.id === a.id ? b : a;
      const grid = Array.from({ length: 5 }, (_, reel) => fill(reel < length ? symbol : other));
      const result = evaluateWays(grid);
      assert.ok(result.totalWays > 0);
      assert.equal(heartsForResult(result), 0);
      assert.equal(chargeLoveMeter(0, result), 1);
      assert.ok(winningCells(result).length > 0);
    }
  }
});

test('a longer Low win cannot increase hearts beyond the longest Mid or High win', () => {
  const mid = find('mid-0');
  const high = find('high-0');
  const mixed = [[a, mid, high, scatter], [a, mid, high, scatter], [a, mid, high, scatter],
    [a, high, b, scatter], [a, b, b, scatter]];
  const result = evaluateWays(mixed);
  assert.deepEqual(result.wins.map((win) => win.reelCount), [5, 3, 4]);
  assert.equal(heartsForResult(result), 4);
  mixed[3][1] = b;
  assert.equal(heartsForResult(evaluateWays(mixed)), 3);
});

test('Wild substitution qualifies a Mid or High match, but fewer than three consecutive reels does not', () => {
  for (const symbol of [find('mid-0'), find('high-0')]) {
    const grid = [[symbol, b, b, b], [wild, b, b, b], [symbol, b, b, b], fill(a), fill(a)];
    assert.equal(heartsForResult(evaluateWays(grid)), 3);
    grid[2][0] = a;
    assert.equal(heartsForResult(evaluateWays(grid)), 0);
  }
});

test('a Scatter-only trigger earns no heart Wilds', () => {
  const grid = [fill(a), fill(b), [scatter, b, b, b], [b, scatter, b, b], [b, b, b, scatter]];
  const result = evaluateWays(grid);
  assert.equal(result.scatterTrigger, true);
  assert.equal(heartsForResult(result), 0);
  const placed = placeHeartWilds(grid, 0, () => { throw new Error('Unexpected placement'); });
  assert.deepEqual(placed.grid, grid);
  assert.equal(placed.placements.length, 0);
});

test('3–5 hearts place exactly that many new Wilds in distinct regular cells', () => {
  const grid = [[wild, scatter, a, b], fill(a), fill(b), fill(a), fill(b)];
  const snapshot = grid.map((column) => [...column]);
  for (const count of [3, 4, 5]) {
    const placed = placeHeartWilds(grid, count, seeded(count));
    assert.equal(placed.placements.length, count);
    assert.equal(new Set(placed.placements.map((cell) => `${cell.reel}-${cell.row}`)).size, count);
    assert.equal(placed.grid.flat().filter((symbol) => symbol.category === 'wild').length, count + 1);
    assert.equal(placed.grid[0][0], wild);
    assert.equal(placed.grid[0][1], scatter);
    assert.deepEqual(grid, snapshot);
    for (let reel = 0; reel < 5; reel++) for (let row = 0; row < 4; row++) {
      if (!placed.placements.some((cell) => cell.reel === reel && cell.row === row)) {
        assert.equal(placed.grid[reel][row], grid[reel][row]);
      }
    }
  }
});

test('heart Wild placement respects available cells and caps at five', () => {
  const grid = [fill(wild), fill(scatter), fill(wild), fill(scatter), [a, b, wild, scatter]];
  assert.equal(placeHeartWilds(grid, 5, () => 0).placements.length, 2);
  assert.equal(placeHeartWilds(Array.from({ length: 5 }, () => fill(a)), 100, () => 0).placements.length, 5);
});

test('a heart release can create a new win and charge the next cycle', () => {
  const mid = find('mid-0');
  const grid = [fill(mid), fill(b), fill(mid), fill(a), fill(find('high-0'))];
  assert.equal(evaluateWays(grid).totalWays, 0);
  const rolls = [4.1 / 20, 4.1 / 19, 4.1 / 18];
  const released = placeHeartWilds(grid, 3, () => rolls.shift());
  assert.deepEqual(released.placements, [{ reel: 1, row: 0 }, { reel: 1, row: 1 }, { reel: 1, row: 2 }]);
  const result = evaluateWays(released.grid);
  assert.equal(result.totalWays, 48);
  assert.equal(heartsForResult(result), 3);
});

test('heart releases can end without a new win and do not guarantee a Wild on every reel', () => {
  const grid = [fill(a), fill(b), fill(find('mid-0')), fill(find('high-0')), fill(find('low-2'))];
  const released = placeHeartWilds(grid, 3, () => 0);
  assert.deepEqual(released.placements, [{ reel: 0, row: 0 }, { reel: 0, row: 1 }, { reel: 0, row: 2 }]);
  assert.equal(evaluateWays(released.grid).totalWays, 0);
  assert.equal(heartsForResult(evaluateWays(released.grid)), 0);
});
