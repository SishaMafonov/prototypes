import test from 'node:test';
import assert from 'node:assert/strict';
import { AIPlayer, AITurnScheduler } from '../.test-build/game/AIPlayer.js';
import { Game } from '../.test-build/game/Game.js';
import { loadBoard } from '../.test-build/game/Board.js';
import { generateBoard } from '../.test-build/game/BoardGenerator.js';
import { keyOfEdge } from '../.test-build/game/Geometry.js';
import { countScores } from '../.test-build/game/Scoring.js';
import { boardDefinition } from '../.test-build/data/board.js';

const board = loadBoard(boardDefinition);
const move = (game, launch) => { const pending=game.beginMove(launch); assert.ok(pending); return game.completeMove(pending.token); };
const readyO = () => { const game=new Game(board); move(game,board.launchPoints[0]); return game; };

test('AI chooses only for O, uses legal rays, and never mutates state while thinking',()=>{
  const game=new Game(board),ai=new AIPlayer(board);
  assert.equal(ai.chooseMove(game.state),null);
  move(game,board.launchPoints[0]); const before=structuredClone(game.state);
  const choice=ai.chooseMove(game.state); assert.ok(board.launchPoints.includes(choice));
  assert.equal(game.preview(choice).termination,'flat-wall'); assert.deepEqual(game.state,before);
  assert.ok(game.preview(choice).edges.some(e=>!game.state.trajectoryEdges.has(keyOfEdge(e))));
  game.beginMove(choice); assert.equal(ai.chooseMove(game.state),null);
  game.state.phase='finished'; assert.equal(ai.chooseMove(game.state),null);
});

test('AI takes a multi-cell capture and accounts for the strongest human reply',()=>{
  const game=new Game(board),ai=new AIPlayer(board);
  for(const id of ['L001','L002','L003','L004','L005']) move(game,board.launchPoints.find(p=>p.id===id));
  const chosen=ai.chooseMove(game.state);
  assert.ok(['L010','L011'].includes(chosen.id));
  assert.equal(move(game,chosen).length,11);
  assert.equal(game.state.currentPlayer,'X');
  let strongestReply=0;
  for(const launch of board.launchPoints){
    const copy=new Game(board); copy.state=structuredClone(game.state);
    strongestReply=Math.max(strongestReply,move(copy,launch).length);
  }
  assert.equal(strongestReply,5);
});

test('AI always adds new edges and finishes generated games even when X keeps retracing',()=>{
  for(const seed of [0,1,0xffffffff]) {
    const b=generateBoard(seed).board,game=new Game(b),ai=new AIPlayer(b);
    let turns=0;
    while(game.state.phase!=='finished'&&turns<200) {
      const human=game.state.currentPlayer==='X';
      const launch=human?b.launchPoints[0]:ai.chooseMove(game.state); assert.ok(launch);
      const before=game.state.trajectoryEdges.size;
      move(game,launch);
      if(!human)assert.ok(game.state.trajectoryEdges.size>before);
      turns++;
    }
    assert.equal(game.state.phase,'finished');
    assert.equal(game.state.scoreX+game.state.scoreO,b.playableCount);
    assert.deepEqual(countScores(game.state.cells),{scoreX:game.state.scoreX,scoreO:game.state.scoreO});
  }
});

test('AI gives up a larger immediate capture when it would hand X a stronger reply',()=>{
  const game=new Game(board),ai=new AIPlayer(board);
  for(const id of ['L010','L010','L014']) move(game,board.launchPoints.find(p=>p.id===id));
  const evaluate=launch=>{
    const copy=new Game(board); copy.state=structuredClone(game.state);
    const gain=move(copy,launch).length;
    let reply=0;
    for(const response of board.launchPoints){
      const next=new Game(board); next.state=structuredClone(copy.state);
      reply=Math.max(reply,move(next,response).length);
    }
    return {gain,value:gain-reply};
  };
  const outcomes=board.launchPoints.map(evaluate),chosen=evaluate(ai.chooseMove(game.state));
  assert.equal(chosen.gain,2); assert.equal(Math.max(...outcomes.map(o=>o.gain)),3);
  assert.ok(chosen.value>Math.max(...outcomes.filter(o=>o.gain===3).map(o=>o.value)));
});

const pause = () => new Promise(resolve=>setTimeout(resolve,30));
test('AI scheduling fires once, only after the human turn',async()=>{
  const game=new Game(board),scheduler=new AITurnScheduler(5); let calls=0;
  const ai={chooseMove:()=>board.launchPoints[1]};
  scheduler.schedule(game,ai,()=>calls++); await pause(); assert.equal(calls,0);
  move(game,board.launchPoints[0]);
  scheduler.schedule(game,ai,()=>calls++); scheduler.schedule(game,ai,()=>calls++);
  await pause(); assert.equal(calls,1);
});
test('restart invalidates a thinking AI callback, including an uncancelled timer',async()=>{
  const game=readyO(),scheduler=new AITurnScheduler(5); let calls=0;
  scheduler.schedule(game,new AIPlayer(board),()=>calls++); game.restart();
  await pause(); assert.equal(calls,0); assert.equal(game.state.currentPlayer,'X');
});
test('new-board cancellation cannot move in the replacement game',async()=>{
  const game=readyO(),scheduler=new AITurnScheduler(5); let calls=0;
  scheduler.schedule(game,new AIPlayer(board),()=>calls++); scheduler.cancel();
  const replacement=new Game(board);
  await pause(); assert.equal(calls,0); assert.equal(replacement.state.trajectories.length,0);
});
test('a queued AI move is ignored if the turn has already started animating',async()=>{
  const game=readyO(),scheduler=new AITurnScheduler(5); let calls=0;
  scheduler.schedule(game,new AIPlayer(board),()=>calls++);
  game.beginMove(board.launchPoints[1]); await pause(); assert.equal(calls,0);
});
