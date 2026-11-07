import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutBaseScene, baseSceneGraph, layoutCorridor } from '../src/scene.ts';
import { createPreviewBoard } from '../src/game.ts';
const frame={width:1164,height:1351},title={width:1600,height:600};
const within=(a,b)=>a.x>=b.x-1e-6&&a.y>=b.y-1e-6&&a.x+a.width<=b.x+b.width+1e-6&&a.y+a.height<=b.y+b.height+1e-6;

test('shared scene geometry preserves cover, centered frame, 25 clipped apertures, collection and HUD across resolutions',()=>{
 for(const[width,height,hud]of [[390,844,112],[375,667,112],[1280,800,95],[844,390,82],[320,568,112],[1920,1080,95]]){
  for(const background of [{width:1320,height:2868},{width:2400,height:1400}]){
   const s=layoutBaseScene(width,height,hud,background,frame,title);
   assert.ok(within(s.viewport,s.background));assert.ok(within(s.reels,s.viewport));assert.ok(within(s.title,s.viewport));
   assert.ok(Math.abs(s.reels.x+s.reels.width/2-width/2)<1e-6);
   assert.ok(Math.abs(s.reels.width/s.reels.height-frame.width/frame.height)<1e-6);
   assert.ok(s.title.y+s.title.height<=s.reels.y);assert.ok(s.reels.y+s.reels.height<s.collection.y);
   assert.ok(s.collection.y+s.collection.height<=s.hud.y);assert.equal(s.cells.flat().length,25);
   for(const[r,row]of s.cells.entries())for(const[c,cell]of row.entries()){
    assert.ok(cell.width>0&&cell.height>0&&within(cell,s.reels));
    if(c)assert.ok(row[c-1].x+row[c-1].width<cell.x);
    if(r)assert.ok(s.cells[r-1][c].y+s.cells[r-1][c].height<cell.y);
   }
  }
 }
});

test('scene layers and stable cell identities distinguish geometry, frame, overlays and collected tiers',()=>{
 const layout=layoutBaseScene(390,844,112,{width:1320,height:2868},frame,title);
 const scene=baseSceneGraph(layout,createPreviewBoard(),new Set(['mid']),'mystery-picking');
 const reels=scene.children.find(n=>n.id==='reels');
 assert.equal(reels.children.filter(n=>n.kind==='cell').length,25);
 assert.ok(reels.children.find(n=>n.id==='reel-frame').z>reels.children.find(n=>n.id==='cell-0-0').z);
 assert.equal(reels.children.find(n=>n.id==='mystery-picker').visible,true);
 assert.ok(scene.children.find(n=>n.id==='collection').children.find(n=>n.id==='collection-mid').data.collected);
 for(const cell of reels.children.filter(n=>n.kind==='cell'))assert.deepEqual(cell.clip,cell.bounds);
 assert.equal(baseSceneGraph(layout,[],new Set(),'ready').children.find(n=>n.id==='reels').children.find(n=>n.id==='mystery-picker').visible,false);
});

test('corridor doors approach smoothly, stay ordered and are motionless under reduced motion',()=>{
 for(const[width,height]of [[350,406],[500,580]]){
  const far=layoutCorridor(width,height,0,false),middle=layoutCorridor(width,height,1500,false),near=layoutCorridor(width,height,3000,false);
  assert.ok(far.distance>middle.distance&&middle.distance>near.distance);
  assert.ok(far.doors[1].width<middle.doors[1].width&&middle.doors[1].width<near.doors[1].width);
  for(const s of [far,middle,near])for(let i=0;i<3;i++){
   assert.ok(within(s.doors[i],{x:0,y:0,width,height}));if(i)assert.ok(s.doors[i-1].x+s.doors[i-1].width<s.doors[i].x);
  }
  assert.deepEqual(layoutCorridor(width,height,0,true).doors,layoutCorridor(width,height,9999,true).doors);
 }
});
