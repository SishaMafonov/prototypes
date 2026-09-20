import test from 'node:test';
import assert from 'node:assert/strict';
import { readTheme, saveTheme, themeStorageKey, canvasThemes } from '../.test-build/render/Theme.js';
import { CanvasRenderer } from '../.test-build/render/CanvasRenderer.js';
import { Game } from '../.test-build/game/Game.js';
import { loadBoard } from '../.test-build/game/Board.js';
import { boardDefinition } from '../.test-build/data/board.js';

test('theme preference overrides the system default and can be saved',()=>{
  const data = new Map();
  const storage = {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  assert.equal(readTheme(storage,true),'dark'); assert.equal(readTheme(storage,false),'light');
  saveTheme(storage,'dark'); assert.equal(data.get(themeStorageKey),'dark'); assert.equal(readTheme(storage,false),'dark');
  saveTheme(storage,'light'); assert.equal(readTheme(storage,true),'light');
  data.set(themeStorageKey,'unknown'); assert.equal(readTheme(storage,true),'dark');
});
test('theme toggle degrades gracefully when storage is unavailable',()=>{
  const denied={getItem:()=>{throw new Error('Denied');},setItem:()=>{throw new Error('Denied');}};
  assert.equal(readTheme(denied,false),'light'); assert.doesNotThrow(()=>saveTheme(denied,'dark'));
  assert.equal(readTheme(null,true),'dark'); assert.doesNotThrow(()=>saveTheme(null,'light'));
});
test('dark and light canvas palettes do not change game state or selected ray',()=>{
  globalThis.window={devicePixelRatio:2};
  const fills=[];
  const ctx=new Proxy({}, {get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>{t[p]=v;if(p==='fillStyle')fills.push(v);return true;}});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:600,height:600,left:0,top:0})};
  const board=loadBoard(boardDefinition),game=new Game(board),renderer=new CanvasRenderer(canvas,board);
  const launch=board.launchPoints[0],preview=game.preview(launch),before=structuredClone(game.state);
  renderer.resize();
  for(const theme of ['dark','light']) {
    renderer.draw(game.state,{selected:launch,preview,active:null,coordinates:true,captureKeys:new Set(),captureTime:0,now:1000,theme});
    assert.ok(fills.includes(canvasThemes[theme].paper)); assert.ok(fills.includes(canvasThemes[theme].cell));
    assert.deepEqual(game.state,before); assert.deepEqual(game.preview(launch),preview);
  }
  delete globalThis.window;
});
