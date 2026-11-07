import assert from 'node:assert/strict';
import test from 'node:test';
import { SYMBOL_WEIGHTS, SYMBOL_TIERS, createPreviewBoard, drawSymbol, revealMysteries, findWins, getScatterBonusMoves, collectWins } from '../src/game.ts';
const mystery=()=>({tier:'mystery',index:0});

test('startup preview is a complete nonwinning regular-only board with no feature to resolve',()=>{
  const board=createPreviewBoard();
  assert.equal(board.length,5);assert.ok(board.every(row=>row.length===5));
  assert.ok(board.flat().every(s=>SYMBOL_TIERS.includes(s.tier)&&s.index>=0&&s.index<5));
  const counts=new Map();for(const s of board.flat()){const id=`${s.tier}:${s.index}`;counts.set(id,(counts.get(id)??0)+1);}
  assert.equal(counts.size,15);assert.ok([...counts.values()].every(n=>n<=2));
  assert.deepEqual(findWins(board),[]);assert.equal(getScatterBonusMoves(board),0);
  assert.equal(revealMysteries(board,0,()=>{throw Error('Preview cannot require a Mystery draw');}).board,board);
  board[0][0].index=99;assert.ok(createPreviewBoard().flat().every(s=>s.index<5));
});

test('calibrated raw pool keeps 10% Mystery and Low > Mid > High, with 3% Scatter',()=>{
  assert.deepEqual(SYMBOL_WEIGHTS,{low:35,mid:32.5,high:19.5,scatter:3,mystery:10});
  assert.ok(Math.abs(Object.values(SYMBOL_WEIGHTS).reduce((s,v)=>s+v,0)-100)<1e-9);
  assert.ok(SYMBOL_WEIGHTS.low>SYMBOL_WEIGHTS.mid&&SYMBOL_WEIGHTS.mid>SYMBOL_WEIGHTS.high);
  for(const roll of [0,.05,.1-1e-10]){let calls=0;assert.deepEqual(drawSymbol(()=>{calls++;return roll;}),mystery());assert.equal(calls,1);}
  assert.deepEqual(drawSymbol(()=>.1),{tier:'low',index:0});
});

test('every Mystery in a wave shares one equally likely current-floor symbol and one RNG draw',()=>{
  for(let room=0;room<5;room++)for(const [roll,tier]of [[0,'low'],[1/3-1e-10,'low'],[1/3,'mid'],[2/3-1e-10,'mid'],[2/3,'high'],[1-1e-10,'high']]){
    const board=Array.from({length:5},()=>Array.from({length:5},mystery));let calls=0;
    const result=revealMysteries(board,room,()=>{calls++;return roll;});
    assert.equal(calls,1);assert.equal(result.cells.length,25);
    assert.deepEqual(result.symbol,{tier,index:room});assert.ok(result.board.flat().every(s=>s===result.symbol));
    assert.ok(board.flat().every(s=>s.tier==='mystery'));
  }
});

test('reveal preserves other cells/holes, never substitutes Scatter and consumes no RNG without Mysteries',()=>{
  const low={tier:'low',index:4},scatter={tier:'scatter',index:0};const board=[[mystery(),low],[null,scatter]];
  const before=structuredClone(board),result=revealMysteries(board,0,()=>.5);
  assert.deepEqual(result.cells,[{row:0,column:0}]);assert.equal(result.board[0][1],low);assert.equal(result.board[1][1],scatter);assert.equal(result.board[1][0],null);
  assert.deepEqual(board,before);assert.notEqual(result.board,board);
  let calls=0;const settled=revealMysteries(result.board,4,()=>{calls++;return 0;});
  assert.equal(calls,0);assert.equal(settled.board,result.board);assert.equal(settled.symbol,null);
});

test('question marks are nonpaying/non-Wild; revealed icons use ordinary wins and room collection',()=>{
  const board=[[...Array.from({length:5},mystery),{tier:'low',index:2}]];
  assert.deepEqual(findWins(board),[]);
  const result=revealMysteries(board,0,()=>0);
  const wins=findWins(result.board);
  assert.equal(wins.length,1);assert.equal(wins[0].cells.length,5);assert.equal(wins[0].winCents,1);
  assert.deepEqual([...collectWins(new Set(),wins,0)],['low']);
  assert.equal(wins[0].symbol.index,0);
  const foreign=[[...Array(4).fill({tier:'high',index:2}),mystery()]];
  assert.deepEqual(findWins(revealMysteries(foreign,0,()=>.99).board),[]);
});
