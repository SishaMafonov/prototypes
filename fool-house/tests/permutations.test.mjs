import assert from 'node:assert/strict';
import test from 'node:test';
import { findWins, applyRoomMultipliers, collectWins, removeWins, refillForRoom } from '../src/game.ts';
function permutations(values){return values.length?values.flatMap((v,i)=>permutations(values.filter((_,j)=>i!==j)).map(t=>[v,...t])):[[]];}
test('all 120 room-label permutations preserve wins, bonuses, collection, removal and targeted refills in every room',()=>{
 const cells=[...Array(5).fill({tier:'low',index:0}),...Array(6).fill({tier:'mid',index:0}),...Array(7).fill({tier:'high',index:1}),...Array(3).fill({tier:'low',index:2}),...Array(4).fill({tier:'scatter',index:0})];
 const board=Array.from({length:5},(_,r)=>cells.slice(r*5,r*5+5));
 for(const p of permutations([0,1,2,3,4]))for(let room=0;room<5;room++){
  const rename=s=>s&&s.tier!=='scatter'&&s.tier!=='mystery'?{...s,index:p[s.index]}:s;
  const mapped=board.map(row=>row.map(rename));
  const roll=()=>{let i=0;return ()=>[.01,.49,.77,.99][i++%4];};
  const originalWins=applyRoomMultipliers(findWins(board,13),room,roll());
  const mappedWins=applyRoomMultipliers(findWins(mapped,13),p[room],roll());
  assert.deepEqual(mappedWins,originalWins.map(w=>({...w,symbol:rename(w.symbol)})));
  assert.deepEqual(collectWins(new Set(),mappedWins,p[room]),collectWins(new Set(),originalWins,room));
  assert.deepEqual(removeWins(mapped,mappedWins),removeWins(board,originalWins).map(row=>row.map(rename)));
  const holes=Array.from({length:5},()=>Array(5).fill(null)),collected=new Set(['mid']);
  assert.deepEqual(refillForRoom(holes,collected,p[room],roll()),refillForRoom(holes,collected,room,roll()).map(row=>row.map(rename)));
 }
});
