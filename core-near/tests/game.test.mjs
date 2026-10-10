import test from 'node:test';
import assert from 'node:assert/strict';
import { boardDefinition } from '../.test-build/data/board.js';
import { findLaunch, loadBoard } from '../.test-build/game/Board.js';
import { Game } from '../.test-build/game/Game.js';
import { adjacentCells, cellEdges, edgeKey, expandSegment, keyOfEdge, pointKey, reflect } from '../.test-build/game/Geometry.js';
import { simulateRay, traceRay } from '../.test-build/game/RaySimulator.js';
import { captureCells, countScores, isCellComplete, winner } from '../.test-build/game/Scoring.js';
import { RayAnimator } from '../.test-build/render/RayAnimator.js';
import { CanvasRenderer } from '../.test-build/render/CanvasRenderer.js';

const board = loadBoard(boardDefinition);
const shot = id => simulateRay(findLaunch(board, id), board);
const keys = edges => new Set(edges.map(keyOfEdge));
const xy = points => points.map(({x,y}) => [x,y]);
const play = (game, id) => { const pending = game.beginMove(findLaunch(game.board, id)); assert.ok(pending); return game.completeMove(pending.token); };

// Small independent test fixtures, not procedural game-board generation.
function rectangle(width, height, blocked = []) {
  const cells = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => ({x,y,blocked: blocked.some(p => p[0] === x && p[1] === y)}))).flat();
  const map = new Map(cells.map(c => [pointKey(c), c]));
  const walls = new Map();
  for (const c of cells.filter(c => !c.blocked)) for (const e of cellEdges(c.x,c.y)) {
    const other = adjacentCells(e).map(pointKey).map(key => map.get(key)).find(n => n !== c);
    if (!other || other.blocked) walls.set(keyOfEdge(e), {...e, type: other ? 'obstacle' : 'boundary'});
  }
  const launchPoints = [];
  const add = (x,y,direction) => launchPoints.push({id:`P${launchPoints.length}`,x,y,direction});
  for (let x=1; x<width; x++) { add(x,0,'S'); add(x,height,'N'); }
  for (let y=1; y<height; y++) { add(0,y,'E'); add(width,y,'W'); }
  return {id:'test-rectangle',width,height,cells,staticEdges:[...walls.values()],launchPoints};
}

test('V01 / S10: exact fixture counts and clean initial game', () => {
  assert.equal(board.cells.length,24); assert.equal(board.playableCount,23);
  assert.equal(board.cells.filter(c=>c.blocked).length,1);
  assert.equal(board.staticKeys.size,24); assert.equal(board.launchPoints.length,14);
  const game = new Game(board);
  assert.equal(game.state.currentPlayer,'X'); assert.equal(game.state.phase,'ready');
  assert.equal(game.state.scoreX+game.state.scoreO,0); assert.ok(game.state.cells.every(c=>c.owner===null));
});
test('G01: straight shot includes the wall endpoint', () => {
  const sim=shot('L001'); assert.equal(sim.termination,'flat-wall'); assert.equal(sim.edges.length,5);
  assert.deepEqual(xy(sim.points),[[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]]);
});
test('G02: obstacle corner turns north to east', () => {
  const sim=shot('L009'); assert.equal(sim.termination,'flat-wall'); assert.equal(sim.edges.length,4);
  assert.deepEqual(xy(sim.points),[[3,5],[3,4],[3,3],[4,3],[5,3]]);
});
test('outline notch bends a ray and has an exact reverse', () => {
  assert.deepEqual(xy(shot('L011').points),[[0,1],[1,1],[2,1],[3,1],[4,1],[4,2],[4,3],[4,4],[4,5]]);
  assert.deepEqual([...shot('L010').points].reverse(),shot('L011').points);
});
test('G03: two corners follow N → E → N', () => {
  const b=loadBoard(rectangle(7,7,[[2,2],[4,3]]));
  const launch=b.launchPoints.find(p=>p.x===3&&p.y===7);
  const sim=simulateRay(launch,b); assert.equal(sim.termination,'flat-wall');
  assert.deepEqual(xy(sim.points),[[3,7],[3,6],[3,5],[3,4],[3,3],[4,3],[4,2],[4,1],[4,0]]);
});
for(const [quadrant,incoming,outgoing] of [[0,'N','E'],[0,'W','S'],[1,'N','W'],[1,'E','S'],[2,'S','W'],[2,'E','N'],[3,'S','E'],[3,'W','N']]) {
  test(`G07: solid quadrant ${quadrant}, ${incoming} → ${outgoing}`,()=>assert.equal(reflect(quadrant,incoming),outgoing));
}
test('G07: wall-following incoming corner direction is invalid',()=>assert.equal(reflect(0,'S'),null));
test('G04 / G06 / G12: both trace colors and owned cells never affect collision',()=>{
  const game=new Game(board), original=shot('L001');
  game.state.trajectories.push({player:'X',edges:[{x1:0,y1:4,x2:1,y2:4}]},{player:'O',edges:[{x1:1,y1:4,x2:2,y2:4}]});
  for(const t of game.state.trajectories) for(const e of t.edges) game.state.trajectoryEdges.add(keyOfEdge(e));
  game.state.cells.forEach((c,i)=>{if(!c.blocked)c.owner=i%2?'X':'O';});
  assert.deepEqual(game.preview(findLaunch(board,'L001')),original);
  const fresh=new Game(board), all=board.launchPoints.map(p=>fresh.preview(p));
  for(const p of board.launchPoints) {
    if(fresh.state.phase==='ready') play(fresh,p.id);
    assert.deepEqual(board.launchPoints.map(p=>fresh.preview(p)),all);
  }
});
test('G05 / S08: reverse traversal has identical presence and no new score',()=>{
  const game=new Game(board); play(game,'L001');
  const before=new Set(game.state.trajectoryEdges); const owners=game.state.cells.map(c=>c.owner);
  assert.deepEqual(keys(shot('L007').edges),before); play(game,'L007');
  assert.deepEqual(game.state.trajectoryEdges,before); assert.deepEqual(game.state.cells.map(c=>c.owner),owners);
  assert.equal(game.state.currentPlayer,'X'); assert.equal(game.state.trajectories.length,2);
});
test('G08: corners, obstacle points, fractions, outward and unknown launches reject atomically',()=>{
  const game=new Game(board); const original=structuredClone(game.state);
  for(const p of [{id:'L001',x:0,y:0,direction:'S'},{id:'L001',x:2,y:2,direction:'S'},
    {id:'L001',x:1.5,y:0,direction:'S'},{id:'L001',x:1,y:0,direction:'N'},{id:'fake',x:1,y:0,direction:'S'}]) {
    assert.equal(game.beginMove(p),null); assert.deepEqual(game.state,original);
  }
});
test('G09: canonical keys are orientation independent',()=>{
  assert.equal(edgeKey({x:5,y:7},{x:6,y:7}),'5,7-6,7'); assert.equal(edgeKey({x:6,y:7},{x:5,y:7}),'5,7-6,7');
});
test('G10: compact wall segments expand in either direction',()=>{
  const forward=expandSegment({x1:2,y1:0,x2:4,y2:0}), reverse=expandSegment({x1:4,y1:0,x2:2,y2:0});
  assert.equal(forward.length,2); assert.deepEqual(keys(forward),keys(reverse));
});
test('G11: zero-length, diagonal, fractional and nonfinite segments reject',()=>{
  for(const e of [{x1:0,y1:0,x2:0,y2:0},{x1:0,y1:0,x2:1,y2:1},{x1:.5,y1:0,x2:2,y2:0},{x1:0,y1:0,x2:Infinity,y2:0}]) assert.throws(()=>expandSegment(e),/integer, axis-aligned/);
});
test('G13: directed-state loop aborts without partial game mutation',()=>{
  const turns={'1,0':'S','1,1':'W','0,1':'N','0,0':'E'};
  const loop=traceRay({x:0,y:0},'E',{canTraverse:()=>true,arrival:p=>turns[pointKey(p)]},20);
  assert.equal(loop.termination,'loop'); assert.equal(loop.edges.length,4);
  const game=new Game(board), before=structuredClone(game.state);
  game.preview=()=>loop;
  assert.equal(game.beginMove(findLaunch(board,'L001')),null); assert.deepEqual(game.state,before); assert.equal(game.pending,null);
});
test('G14: a position revisited in a different direction is not a loop',()=>{
  const sim=traceRay({x:0,y:1},'E',{canTraverse:()=>true,arrival:(p,d)=>{
    if(p.x===1&&p.y===2)return 'flat-wall';
    return ({'2,1':'N','2,0':'W','1,0':'S'})[pointKey(p)]??d;
  }},20);
  assert.equal(sim.termination,'flat-wall'); assert.equal(sim.points.filter(p=>p.x===1&&p.y===1).length,2);
});
test('defensive state cap never accepts a partial path',()=>{
  assert.equal(traceRay({x:0,y:0},'E',{canTraverse:()=>true,arrival:(_,d)=>d},3).termination,'invalid');
});
test('S01 / S03: fourth side captures exactly once and ownership is permanent',()=>{
  const b=loadBoard(rectangle(3,3)), cells=b.cells.map(c=>({...c,owner:null}));
  const before=new Set([...b.staticKeys,'1,1-2,1','2,1-2,2','1,1-1,2']);
  const after=new Set([...before,'1,2-2,2']);
  assert.deepEqual(captureCells(cells,before,after,'X').map(pointKey),['1,1']);
  assert.deepEqual(countScores(cells),{scoreX:1,scoreO:0});
  assert.equal(captureCells(cells,before,after,'O').length,0); assert.equal(cells.find(c=>c.x===1&&c.y===1).owner,'X');
});
test('S02: shared fourth edge captures two adjacent cells',()=>{
  const b=loadBoard(rectangle(4,3)), cells=b.cells.map(c=>({...c,owner:null}));
  const before=new Set([...b.staticKeys,'1,1-2,1','1,2-2,2','1,1-1,2','2,1-3,1','2,2-3,2','3,1-3,2']);
  assert.deepEqual(captureCells(cells,before,new Set([...before,'2,1-2,2']),'O').map(pointKey),['1,1','2,1']);
  assert.deepEqual(countScores(cells),{scoreX:0,scoreO:2});
});
test('S04: blocked and omitted outside cells never score',()=>{
  const cells=board.cells.map(c=>({...c,owner:null}));
  const after=new Set([...board.staticKeys,...cellEdges(2,2).map(keyOfEdge),...cellEdges(4,0).map(keyOfEdge)]);
  assert.equal(captureCells(cells,board.staticKeys,after,'X').length,0);
  assert.equal(cells.find(c=>c.blocked).owner,null); assert.equal(cells.find(c=>c.x===4&&c.y===0),undefined);
});
test('S06 / S07: static and mixed-player sides award only the finishing player',()=>{
  const cells=[{x:1,y:1,blocked:false,owner:null}];
  let before=new Set(['1,1-2,1']); // static side
  let after=new Set([...before,'1,1-1,2']); captureCells(cells,before,after,'X');
  before=after; after=new Set([...before,'2,1-2,2']); captureCells(cells,before,after,'O');
  assert.equal(cells[0].owner,null);
  before=after; after=new Set([...before,'1,2-2,2']); captureCells(cells,before,after,'X');
  assert.equal(cells[0].owner,'X');
});
test('S09: winner and draw use owned-cell counts',()=>{
  assert.equal(winner(3,2),'X'); assert.equal(winner(2,3),'O'); assert.equal(winner(2,2),'draw');
});
test('V02: every fixture cell is reachable by the fourteen terminating launches',()=>{
  const all=new Set(board.staticKeys);
  for(const launch of board.launchPoints) { const sim=simulateRay(launch,board); assert.equal(sim.termination,'flat-wall'); sim.edges.forEach(e=>all.add(keyOfEdge(e))); }
  assert.ok(board.cells.filter(c=>!c.blocked).every(c=>isCellComplete(c.x,c.y,all)));
});
test('V03: initially complete and unreachable cells reject with clear errors',()=>{
  assert.throws(()=>loadBoard(rectangle(1,1)),/complete before any move/);
  assert.throws(()=>loadBoard(rectangle(5,5,[[1,1],[3,1],[1,3],[3,3]])),/cannot be completed/);
});
test('loader rejects missing walls, classifications, mask duplicates, launches and touching obstacles',()=>{
  const clone=()=>structuredClone(boardDefinition);
  let bad=clone(); bad.staticEdges.pop(); assert.throws(()=>loadBoard(bad),/interfaces/);
  bad=clone(); bad.staticEdges.push({...bad.staticEdges[0],type:'obstacle'}); assert.throws(()=>loadBoard(bad),/conflicting/);
  bad=clone(); bad.cells.push({...bad.cells[0]}); assert.throws(()=>loadBoard(bad),/duplicate/);
  bad=clone(); bad.launchPoints.pop(); assert.throws(()=>loadBoard(bad),/every eligible/);
  assert.throws(()=>loadBoard(rectangle(5,5,[[1,1],[2,2]])),/touch|diagonal/);
});
test('loader copies definitions and does not expose writable cells or launch arrays',()=>{
  const original=structuredClone(boardDefinition), loaded=loadBoard(original);
  original.cells[0].blocked=true; original.launchPoints[0].x=99;
  assert.equal(loaded.cells[0].blocked,false); assert.equal(loaded.launchPoints[0].x,1);
  assert.throws(()=>loaded.cells[0].blocked=true,TypeError);
  assert.throws(()=>loaded.launchPoints.push({}),TypeError);
});
test('U01 / U02 / U04: pure preview, atomic commit, input lock, exactly one switch',()=>{
  const game=new Game(board), start=structuredClone(game.state), launch=findLaunch(board,'L001');
  const preview=game.preview(launch); assert.deepEqual(game.state,start);
  const pending=game.beginMove(launch); assert.deepEqual(pending.simulation,preview);
  assert.equal(game.state.phase,'animating'); assert.equal(game.state.trajectoryEdges.size,0);
  assert.equal(game.state.currentPlayer,'X'); assert.equal(game.beginMove(launch),null);
  game.completeMove(pending.token); assert.equal(game.state.currentPlayer,'O');
  assert.equal(game.completeMove(pending.token),null); assert.equal(game.state.trajectories.length,1);
});
test('U03: restart cancels a move and rejects its completion even after a new move starts',()=>{
  const game=new Game(board); play(game,'L001');
  const old=game.beginMove(findLaunch(board,'L009'));
  game.restart(); const clean=structuredClone(game.state);
  assert.equal(game.completeMove(old.token),null); assert.deepEqual(game.state,clean);
  assert.equal(game.state.trajectories.length,0); assert.equal(game.state.trajectoryEdges.size,0);
  assert.ok(game.state.cells.every(c=>!c.owner)); assert.equal(game.state.currentPlayer,'X');
  const next=game.beginMove(findLaunch(board,'L009'));
  assert.notEqual(next.token,old.token); assert.equal(game.completeMove(old.token),null);
  game.completeMove(next.token); assert.equal(game.state.trajectories.length,1);
});
test('full-game integration: scoring turns alternate and completion locks further input',()=>{
  const game=new Game(board); let multiple=false, zero=false;
  for(const launch of board.launchPoints) {
    if(game.state.phase==='finished')break;
    const mover=game.state.currentPlayer, captures=play(game,launch.id);
    multiple ||= captures.length>1; zero ||= captures.length===0;
    assert.ok(captures.every(c=>c.owner===mover));
    assert.deepEqual(countScores(game.state.cells),{scoreX:game.state.scoreX,scoreO:game.state.scoreO});
    if(game.state.phase!=='finished') assert.equal(game.state.currentPlayer,mover==='X'?'O':'X');
  }
  assert.ok(multiple&&zero); assert.equal(game.state.phase,'finished'); assert.equal(game.state.scoreX+game.state.scoreO,23);
  const final=structuredClone(game.state); assert.equal(game.beginMove(board.launchPoints[0]),null); assert.deepEqual(game.state,final);
});
test('animation uses elapsed time and pauses 75ms at corners',()=>{
  const animator=new RayAnimator(shot('L009'),1000);
  assert.deepEqual(animator.frame(1000).head,{x:3,y:5});
  assert.deepEqual(animator.frame(1250).head,{x:3,y:3});
  assert.deepEqual(animator.frame(1300).head,{x:3,y:3});
  assert.equal(animator.frame(1574).complete,false); assert.equal(animator.frame(1575).complete,true);
  assert.deepEqual(animator.frame(1575).points,shot('L009').points);
  assert.deepEqual(new RayAnimator(shot('L001'),0).frame(312.5).head,{x:1,y:2.5});
});
test('S05: renderer is read-only and pointer mapping survives DPR and resize',()=>{
  globalThis.window={devicePixelRatio:2};
  const ctx=new Proxy({}, {get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
  let rect={width:600,height:490,left:20,top:30};
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>rect};
  const renderer=new CanvasRenderer(canvas,board), game=new Game(board), before=structuredClone(game.state);
  renderer.resize(); assert.equal(canvas.width,1200);
  renderer.draw(game.state,{selected:null,preview:null,active:null,coordinates:true,captureKeys:new Set(),captureTime:0,now:1000});
  assert.deepEqual(game.state,before);
  assert.equal(renderer.hitTest(200,75).id,'L001'); assert.equal(renderer.hitTest(0,0),null);
  rect={width:360,height:324,left:0,top:0}; renderer.resize();
  const scale=(324-90)/5, originX=(360-scale*5)/2;
  assert.equal(renderer.hitTest(originX+scale,45).id,'L001');
  assert.deepEqual(game.state,before); delete globalThis.window;
});
