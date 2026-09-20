import test from 'node:test';
import assert from 'node:assert/strict';
import { HighScoreStore, highScoreStorageKey } from '../.test-build/game/HighScore.js';
import { loadBoard } from '../.test-build/game/Board.js';
import { Game } from '../.test-build/game/Game.js';
import { boardDefinition } from '../.test-build/data/board.js';

const board=loadBoard(boardDefinition);
const state = (scoreX,scoreO,phase='finished') => ({...new Game(board).state,scoreX,scoreO,phase});
const memory = () => {
  const data=new Map();
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
};
test('only a completed human win sets a high score',()=>{
  const storage=memory(),store=new HighScoreStore(storage);
  assert.equal(store.recordWin(state(15,8,'ready'),board),false);
  assert.equal(store.recordWin(state(8,15),board),false);
  assert.equal(store.recordWin(state(11,11),{...board,playableCount:22}),false);
  assert.equal(store.recordWin(state(15,0),board),false);
  assert.equal(store.best,null); assert.equal(storage.getItem(highScoreStorageKey),null);
  assert.equal(store.recordWin(state(15,8),board),true);
  assert.equal(store.best.score,15); assert.equal(store.best.totalCells,23); assert.equal(store.best.boardId,board.id);
  assert.equal(store.persistent,true);
});
test('a saved record survives store recreation and increases only for a better win',()=>{
  const storage=memory(),first=new HighScoreStore(storage);
  first.recordWin(state(15,8),board);
  const reloaded=new HighScoreStore(storage); assert.deepEqual(reloaded.best,first.best);
  assert.equal(reloaded.recordWin(state(12,11),board),false);
  assert.equal(reloaded.recordWin(state(15,8),board),false);
  assert.equal(reloaded.recordWin(state(19,4),board),true);
  assert.equal(new HighScoreStore(storage).best.score,19);
  const game=new Game(board); game.restart(); assert.equal(new HighScoreStore(storage).best.score,19);
});
test('a second tab cannot replace an already saved higher record with its lower win',()=>{
  const storage=memory(),first=new HighScoreStore(storage),second=new HighScoreStore(storage);
  first.recordWin(state(20,3),board);
  assert.equal(second.recordWin(state(14,9),board),false); assert.equal(second.best.score,20);
  assert.equal(new HighScoreStore(storage).best.score,20);
});
test('corrupt, invalid and unknown-version stored records are ignored',()=>{
  const storage=memory();
  const valid={version:1,score:15,totalCells:23,boardId:'test',achievedAt:'2026-09-20T00:00:00.000Z'};
  for(const value of ['bad JSON', 'null', JSON.stringify({...valid,version:2}), JSON.stringify({...valid,score:-1}),
    JSON.stringify({...valid,score:24}), JSON.stringify({...valid,score:1.5}), JSON.stringify({...valid,score:11}),
    JSON.stringify({...valid,achievedAt:'bad date'}),JSON.stringify({...valid,totalCells:10001})]) {
    storage.setItem(highScoreStorageKey,value); assert.equal(new HighScoreStore(storage).best,null);
  }
});
test('unavailable or unwritable storage retains the best record for the session',()=>{
  for(const storage of [null,{getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}},
    {getItem:()=>null,setItem:()=>{throw Error('quota');}}]) {
    const store=new HighScoreStore(storage);
    assert.equal(store.recordWin(state(19,4),board),true); assert.equal(store.persistent,false);
    assert.equal(store.recordWin(state(14,9),board),false); assert.equal(store.best.score,19);
  }
});
test('clearing site data removes the record when refreshed',()=>{
  const storage=memory(),store=new HighScoreStore(storage);
  store.recordWin(state(19,4),board); storage.data.clear(); store.refresh();
  assert.equal(store.best,null); assert.equal(new HighScoreStore(storage).best,null);
});
test('a finished real game records only its human-winning outcome',()=>{
  const game=new Game(board),store=new HighScoreStore(memory());
  // The fixture's sequential launch schedule gives every capture to the even-turn mover.
  game.state.currentPlayer='O';
  for(const launch of board.launchPoints) {
    if(game.state.phase==='finished')break;
    const pending=game.beginMove(launch); game.completeMove(pending.token);
  }
  assert.equal(game.state.phase,'finished'); assert.equal(game.state.scoreX,23);
  assert.equal(store.recordWin(game.state,board),true); assert.equal(store.best.score,23);
  assert.equal(store.recordWin(game.state,board),false);
});
