import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRoomMultipliers, BET_CENTS, clearForFloor, collectWins, drawSymbol, findWins, generateBoard, getMultiplier,
  getScatterBonusMoves, isCollectionComplete, refillBoard, refillForRoom, removeWins, shouldContinueRoom, ROOM_MULTIPLIERS, SYMBOL_WEIGHTS,
} from '../src/game.ts';

test('Scatter bonus awards the exact count from six through all 25 cells, ignoring regular symbols and holes', () => {
  for (let count = 0; count <= 25; count++) {
    const board = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, column) =>
      row * 5 + column < count ? { tier: 'scatter', index: 0 }
        : (row + column) % 2 ? null : { tier: 'high', index: 0 }));
    const before = structuredClone(board);
    assert.equal(getScatterBonusMoves(board), count >= 6 ? count : 0);
    assert.deepEqual(board, before);
  }
  assert.equal(getScatterBonusMoves([]), 0);
  assert.deepEqual(findWins(Array.from({ length: 5 }, () => Array(5).fill({ tier: 'scatter', index: 0 }))), []);
});

const mysteryEnd=SYMBOL_WEIGHTS.mystery/100;
const lowEnd=mysteryEnd+SYMBOL_WEIGHTS.low/100;
const midEnd=mysteryEnd+(SYMBOL_WEIGHTS.low+SYMBOL_WEIGHTS.mid)/100;
const regularEnd=(100-SYMBOL_WEIGHTS.scatter)/100;
const drawBoundaries=[
  [0,'mystery'],[mysteryEnd-1e-9,'mystery'],[mysteryEnd,'low'],[lowEnd-1e-9,'low'],[lowEnd,'mid'],
  [midEnd-1e-9,'mid'],[midEnd,'high'],[regularEnd-1e-9,'high'],
  [regularEnd,'scatter'],[1-1e-9,'scatter'],
];
test('calibrated draw boundaries preserve Low > Mid > High and the full probability pool', () => {
  for (const [roll, tier] of [
    ...drawBoundaries,
  ]) {
    const samples = [roll, 0];
    assert.deepEqual(drawSymbol(() => samples.shift()), { tier, index: 0 });
    assert.equal(samples.length, tier === 'scatter' || tier === 'mystery' ? 1 : 0);
  }
  assert.ok(Math.abs(Object.values(SYMBOL_WEIGHTS).reduce((sum, weight) => sum + weight, 0) - 100) < 1e-9);
  assert.ok(SYMBOL_WEIGHTS.low > SYMBOL_WEIGHTS.mid && SYMBOL_WEIGHTS.mid > SYMBOL_WEIGHTS.high);
  assert.ok(Object.values(SYMBOL_WEIGHTS).every(w=>w>0));
});

test('every icon is reachable within every tier, including both ends of each sprite', () => {
  for (const [roll, tier] of [[0.1, 'low'], [0.7, 'mid'], [0.9, 'high']]) {
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
  const counts = { low: Array(5).fill(0), mid: Array(5).fill(0), high: Array(5).fill(0), scatter: [0], mystery: [0] };
  const samples = 100000;
  for (let i = 0; i < samples; i++) {
    const symbol = drawSymbol(random);
    counts[symbol.tier][symbol.index]++;
  }
  for (const [tier, weight] of Object.entries(SYMBOL_WEIGHTS)) {
    const probability=weight/100/(tier==='scatter'||tier==='mystery'?1:5);
    for (const count of counts[tier]) {
      assert.ok(Math.abs(count / samples - probability) < 0.004,
        `${tier}: observed ${count / samples}, expected ${probability}`);
    }
  }
});

const emptyBoard = () => Array.from({ length: 5 }, () => Array(5).fill(null));
const symbol = (tier, index) => ({ tier, index });

test('floor changes and feature clears keep Scatters in place while drawing only other cells', () => {
  const original=Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>
    (r*5+c)%6===0?{tier:'scatter',index:0}:symbol('high',(r+c)%5)));
  const before=structuredClone(original);
  let board=original;
  for(const room of [0,3,1]){
    const cleared=clearForFloor(board);
    let calls=0;
    const fresh=refillBoard(cleared,()=>{calls++;return .1;});
    assert.equal(calls,40); // Five retained Scatters; twenty regular draws × two RNG calls.
    for(let i=0;i<25;i++)if(i%6===0)assert.equal(fresh[Math.floor(i/5)][i%5],original[Math.floor(i/5)][i%5]);
    calls=0;
    board=refillForRoom(clearForFloor(fresh),new Set(['low']),room,()=>{calls++;return .7;});
    assert.equal(calls,20);
    assert.ok(board.flat().every(s=>s.tier==='scatter'||s.tier==='mid'&&s.index===room));
  }
  assert.deepEqual(original,before);
});

test('retained Scatters accumulate into a six-symbol trigger on a later floor', () => {
  const board=emptyBoard();
  for(let i=0;i<5;i++)board[i][i]={tier:'scatter',index:0};
  assert.equal(getScatterBonusMoves(board),0);
  const rolls=[.99,...Array(38).fill(.1)];
  const next=refillBoard(clearForFloor(board),()=>rolls.shift());
  assert.equal(rolls.length,0);
  assert.equal(getScatterBonusMoves(next),6);
  assert.equal(getScatterBonusMoves(generateBoard(()=>.1)),0); // A new paid round resets the board.
});

test('a paid-chain bonus award prevents retriggers through later floors until eligibility resets', () => {
  const board=emptyBoard();
  for(let i=0;i<6;i++)board[Math.floor(i/5)][i%5]={tier:'scatter',index:0};
  assert.equal(getScatterBonusMoves(board,false),6);
  let next=board;
  for(let floor=0;floor<4;floor++){
    next=refillBoard(clearForFloor(next),()=>.1);
    assert.equal(getScatterBonusMoves(next,true),0);
  }
  next[4][4]={tier:'scatter',index:0};
  assert.equal(getScatterBonusMoves(next,true),0); // Even a seventh Scatter cannot re-award this chain.
  assert.equal(getScatterBonusMoves(next,false),7); // A fresh paid-chain guard is eligible.
});

test('Scatters cannot trap a partial room when fewer than five regular slots remain', () => {
  for(let count=0;count<=25;count++){
    const board=Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c<count?{tier:'scatter',index:0}:null));
    assert.equal(shouldContinueRoom(new Set(['low']),board),count<=20);
    assert.equal(shouldContinueRoom(new Set(),board),false);
    assert.equal(shouldContinueRoom(new Set(['low','mid','high']),board),false);
  }
  const allScatters=Array.from({length:5},()=>Array(5).fill({tier:'scatter',index:0}));
  let calls=0;
  assert.deepEqual(refillBoard(clearForFloor(allScatters),()=>{calls++;return .1;}),allScatters);
  assert.equal(calls,0);
});

test('collected room refills pin all regular identities to that room, including index zero, with unchanged tier/Scatter boundaries', () => {
  for(let room=0;room<5;room++) for(const [roll,tier] of drawBoundaries) {
    const board=[[null]];
    let calls=0;
    const result=refillForRoom(board,new Set(['mid']),room,()=>{calls++;return roll;});
    assert.deepEqual(result[0][0],{tier,index:tier==='scatter'||tier==='mystery'?0:room});
    assert.equal(calls,1);
    assert.equal(board[0][0],null);
  }
});

test('before any collection and after a room reset, refills retain the all-room pool and independent index draws', () => {
  for(const room of [0,2,4]) {
    const rolls=[.1,.7,.7,.3,.9,.99,.97];
    const result=refillForRoom([[null,null,null,null]],new Set(),room,()=>rolls.shift());
    assert.deepEqual(result[0],[symbol('low',3),symbol('mid',1),symbol('high',4),{tier:'scatter',index:0}]);
    assert.equal(rolls.length,0);
  }
});

test('room refills replace holes only and preserve foreign survivors and Scatters without RNG calls', () => {
  const foreign=symbol('high',4), scatter={tier:'scatter',index:0};
  const board=[[foreign,null,scatter,null],[null,null,foreign,scatter]];
  const rolls=[.1,.7,.9,.98];
  const result=refillForRoom(board,new Set(['low']),2,()=>rolls.shift());
  assert.deepEqual(result,[[foreign,symbol('low',2),scatter,symbol('mid',2)],[symbol('high',2),scatter,foreign,scatter]]);
  assert.equal(result[0][0],foreign);
  assert.equal(result[0][2],scatter);
  assert.equal(rolls.length,0);
  assert.equal(board[0][1],null);
});

test('first removed room win immediately unlocks refills that collect the other two room tiers', () => {
  const room=1;
  const pool=['low','mid','high'].flatMap(tier=>Array.from({length:5},(_,index)=>symbol(tier,index))).filter(s=>s.tier!=='low'||s.index!==room);
  const cells=[...Array.from({length:5},()=>symbol('low',room)),...Array.from({length:20},(_,i)=>pool[i%pool.length])];
  let board=Array.from({length:5},(_,row)=>cells.slice(row*5,row*5+5));
  let collected=new Set();
  let wins=findWins(board);
  collected=collectWins(collected,wins,room);
  assert.deepEqual([...collected],['low']);
  board=refillForRoom(removeWins(board,wins),collected,room,()=>.9);
  wins=findWins(board);
  assert.ok(wins.some(win=>win.symbol.tier==='high'&&win.symbol.index===room));
  collected=collectWins(collected,wins,room);
  board=refillForRoom(removeWins(board,wins),collected,room,()=>.7);
  collected=collectWins(collected,findWins(board),room);
  assert.ok(isCollectionComplete(collected));
});

test('a room with partial progress must continue when it stalls, while empty/complete collections may leave the stage', () => {
  assert.equal(shouldContinueRoom(new Set()),false);
  assert.equal(shouldContinueRoom(new Set(['low'])),true);
  assert.equal(shouldContinueRoom(new Set(['mid','high'])),true);
  assert.equal(shouldContinueRoom(new Set(['low','mid','high'])),false);
  const collected=new Set(['low']);
  const stalled=emptyBoard();
  for(let i=0;i<25;i++)stalled[Math.floor(i/5)][i%5]=i<4?{tier:'scatter',index:0}:symbol(['low','mid','high'][i%3],i%5);
  assert.equal(findWins(stalled).length,0);
  const cleared=emptyBoard();
  const result=refillForRoom(cleared,collected,3,()=>.9);
  assert.ok(result.flat().every(s=>s.tier==='high'&&s.index===3));
  assert.deepEqual([...collected],['low']);
  assert.equal(findWins(result)[0].cells.length,25);
});

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
  assert.equal(wins[0].winCents, 2);
});

test('5/6/7+ groups pay once by quantity; 2–4 matches do not win', () => {
  const expected = {
    low: { 5: 1, 6: 2, 7: 3 },
    mid: { 5: 2, 6: 3, 7: 5 },
    high: { 5: 3, 6: 5, 7: 10 },
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
  assert.deepEqual(findWins(board).map((win) => win.winCents), [1, 3, 10]);
  assert.equal(findWins(board, 3).reduce((sum, win) => sum + win.winCents, 0), 42);
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
  const refilled = refillBoard(cleared, () => { calls++; return .1; });
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
  assert.equal([...first, ...second].reduce((sum, win) => sum + win.winCents, 0), 12);
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
    assert.equal(boosted[0].unboostedWinCents, 9);
    assert.equal(boosted[0].winCents, 9 * ROOM_MULTIPLIERS[slot]);
  }
  assert.equal(wins[0].winCents, 9);
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
  assert.deepEqual(boosted.map((win) => win.winCents), [10, 80, 25]);
  assert.deepEqual(wins.map((win) => win.winCents), [5, 10, 25]);
  assert.deepEqual(applyRoomMultipliers([], 1, () => { throw new Error('No draw expected'); }), []);
});

test('room bonus multiplies the capped stage award and can apply again in a later winning batch', () => {
  const wins = findWins([Array.from({ length: 7 }, () => symbol('high', 0))], 144);
  const first = applyRoomMultipliers(wins, 0, () => 0.99);
  const later = applyRoomMultipliers(wins, 0, () => 0);
  assert.equal(first[0].winCents, 10 * 144 * 8);
  assert.equal(later[0].winCents, 10 * 144 * 2);
  assert.equal(first[0].cells.length, 7);
});
