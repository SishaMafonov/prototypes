import test from 'node:test';
import assert from 'node:assert/strict';
import { boardFromCells, generateBoard } from '../.test-build/game/BoardGenerator.js';
import { boardDefinition } from '../.test-build/data/board.js';
import { loadBoard } from '../.test-build/game/Board.js';
import { Game } from '../.test-build/game/Game.js';
import { adjacentCells, keyOfEdge, pointKey, vectors } from '../.test-build/game/Geometry.js';
import { simulateRay } from '../.test-build/game/RaySimulator.js';
import { countScores, isCellComplete } from '../.test-build/game/Scoring.js';

function components(cells) {
  const remaining = new Set(cells.map(pointKey));
  let count = 0;
  while (remaining.size) {
    const queue = [remaining.values().next().value]; count++;
    while (queue.length) {
      const key = queue.pop();
      if (!remaining.delete(key)) continue;
      const [x,y] = key.split(',').map(Number);
      for (const v of Object.values(vectors)) {
        const neighbor = `${x+v.x},${y+v.y}`;
        if (remaining.has(neighbor)) queue.push(neighbor);
      }
    }
  }
  return count;
}

test('mask-derived walls and launch points reproduce the original fixture exactly', () => {
  const original = loadBoard(boardDefinition);
  const derived = boardFromCells(original.cells, 'derived-fixture', 5, 5);
  assert.deepEqual(derived.staticKeys, original.staticKeys);
  const launchSignature = b => new Set(b.launchPoints.map(p => `${p.x},${p.y},${p.direction}`));
  assert.deepEqual(launchSignature(derived), launchSignature(original));
  for (const launch of original.launchPoints) {
    const counterpart = derived.launchPoints.find(p => p.x === launch.x && p.y === launch.y);
    assert.deepEqual(simulateRay(counterpart, derived), simulateRay(launch, original));
  }
});

test('same seed reproduces the board; different seeds vary both outline and islands', () => {
  const a = generateBoard(0x12345678), b = generateBoard(0x12345678), c = generateBoard(0x87654321);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a.board.cells.filter(c=>!c.blocked), c.board.cells.filter(c=>!c.blocked));
  assert.notDeepEqual(a.board.cells.filter(c=>c.blocked), c.board.cells.filter(c=>c.blocked));
});

test('invalid seeds reject before generation', () => {
  for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity]) assert.throws(()=>generateBoard(seed), /unsigned 32-bit/);
});

test('64 seeded layouts stay connected, have separated islands, and play to full completion', () => {
  const outlines = new Set(), islands = new Set();
  const seeds = [...Array.from({length:48},(_,i)=>i), ...Array.from({length:14},(_,i)=>Math.imul(i+1,2654435761)>>>0), 0x80000000, 0xffffffff];
  for (const seed of seeds) {
    const generated = generateBoard(seed), b = generated.board;
    assert.equal(b.width,20); assert.equal(b.height,20);
    assert.ok(generated.notches>=10,`notches for seed ${seed}`);
    assert.ok(generated.islands>=6,`islands for seed ${seed}`);
    assert.ok(generated.corners>=100,`corner density for seed ${seed}`);
    assert.ok(b.playableCount>200 && b.playableCount<400);
    assert.equal(components(b.cells.filter(c=>!c.blocked)),1,`connected playable area for seed ${seed}`);
    assert.equal(components(b.cells.filter(c=>c.blocked)),generated.islands);
    assert.ok(b.launchPoints.length>40);
    assert.ok(b.cells.every(c=>c.x>=0&&c.x<20&&c.y>=0&&c.y<20));
    // Every layout really spans the full 20 × 20 extent.
    assert.equal(Math.max(...b.cells.map(c=>c.x)),19); assert.equal(Math.max(...b.cells.map(c=>c.y)),19);
    assert.equal(Math.min(...b.cells.map(c=>c.x)),0); assert.equal(Math.min(...b.cells.map(c=>c.y)),0);
    outlines.add([...b.staticEdges.filter(e=>e.type==='boundary').map(keyOfEdge)].sort().join('|'));
    islands.add(b.cells.filter(c=>c.blocked).map(pointKey).join('|'));
    for(const e of b.staticEdges) {
      assert.equal(Math.abs(e.x2-e.x1)+Math.abs(e.y2-e.y1),1);
      const neighbors=adjacentCells(e).map(p=>b.cellMap.get(pointKey(p)));
      assert.equal(neighbors.filter(c=>c&&!c.blocked).length,1);
      if(e.type==='obstacle')assert.ok(neighbors.some(c=>c?.blocked));
    }
    const all=new Set(b.staticKeys), simulations=b.launchPoints.map(p=>simulateRay(p,b));
    for(const sim of simulations) {
      assert.equal(sim.termination,'flat-wall',`terminating launch for seed ${seed}`);
      sim.edges.forEach(e=>all.add(keyOfEdge(e)));
    }
    assert.ok(b.cells.filter(c=>!c.blocked).every(c=>isCellComplete(c.x,c.y,all)));
    const game=new Game(b);
    for(const launch of b.launchPoints) {
      if(game.state.phase==='finished')break;
      const pending=game.beginMove(launch); assert.ok(pending);
      const mover=game.state.currentPlayer;
      assert.equal(game.beginMove(launch),null);
      const captured=game.completeMove(pending.token);
      assert.ok(captured.every(c=>c.owner===mover));
      if(game.state.phase!=='finished')assert.notEqual(game.state.currentPlayer,mover);
    }
    assert.equal(game.state.phase,'finished',`completed seed ${seed}`);
    assert.equal(game.state.scoreX+game.state.scoreO,b.playableCount);
    assert.deepEqual(countScores(game.state.cells),{scoreX:game.state.scoreX,scoreO:game.state.scoreO});
    assert.ok(game.state.cells.filter(c=>c.blocked).every(c=>c.owner===null));
    assert.deepEqual(b.launchPoints.map(p=>simulateRay(p,b)),simulations);
    game.restart();
    assert.equal(game.board,b); assert.equal(game.state.scoreX+game.state.scoreO,0);
    assert.ok(game.state.cells.every(c=>c.owner===null)); assert.equal(game.state.currentPlayer,'X');
  }
  assert.equal(outlines.size,64); assert.equal(islands.size,64);
});
