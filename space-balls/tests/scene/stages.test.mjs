import assert from 'node:assert/strict';
import test from 'node:test';
import { awardPoint } from '../../src/match.ts';
import { contract } from '../struct/graph.mjs';
import { createGame, sprites, rings, nets, labels } from './harness.mjs';

const panels = ['.selection','.start','.scoreboard','.round-message','.voice-controls','.result-dialog'];
const setup = {
  'S-LOAD': () => {},
  'S-ASSET-ERROR': g => { g.images.filter(i=>!i.src.endsWith('/ball.png')).forEach(i=>i.load()); g.images.find(i=>i.src.endsWith('/ball.png')).fail(); },
  'S-PICK': g => g.load(),
  'S-READY': g => g.ready(),
  'S-COUNT-READY': g => g.start(),
  'S-COUNT-STEADY': g => { g.start(); for(let i=0;i<10;i++)g.tick(100); },
  'S-COUNT-GO': g => { g.start(); for(let i=0;i<20;i++)g.tick(100); },
  'S-PLAY': g => g.play(),
  'S-GOAL': g => { g.play(); awardPoint(g.bridge.match,0); g.tick(0); },
  'S-FINISH-YOU': g => { g.play(); g.bridge.match.scores=[9,0]; awardPoint(g.bridge.match,0); g.tick(0); },
  'S-FINISH-OPP': g => { g.play(); g.bridge.match.scores=[0,9]; awardPoint(g.bridge.match,1); g.tick(0); },
};
const expectations = [
  ['S-LOAD', [1,0,0,0,0,0], 0,0,0,0, ''],
  ['S-ASSET-ERROR', [1,0,0,0,0,0], 1,0,0,0, ''],
  ['S-PICK', [1,0,0,0,0,0], 1,0,0,0, ''],
  ['S-READY', [0,1,0,0,1,0], 0,0,0,0, ''],
  ['S-COUNT-READY', [0,0,1,1,1,0], 8,8,2,1, 'Ready?'],
  ['S-COUNT-STEADY', [0,0,1,1,1,0], 8,8,2,1, 'Steady!'],
  ['S-COUNT-GO', [0,0,1,1,1,0], 8,8,2,1, 'GO!'],
  ['S-PLAY', [0,0,1,0,1,0], 8,8,2,1, ''],
  ['S-GOAL', [0,0,1,1,1,0], 8,8,2,1, 'You score!'],
  ['S-FINISH-YOU', [0,0,1,0,0,1], 8,8,2,1, ''],
  ['S-FINISH-OPP', [0,0,1,0,0,1], 8,8,2,1, ''],
];

for (const [stage, visibility, planets, ringCount, netCount, ballCount, word] of expectations) {
  test(contract(['C-BOOT-01','C-PICK-04','C-HUD-01','C-HUD-03','C-INPUT-07','C-RESULT-01'], `${stage}: exact DOM/canvas component membership`), t => {
    const g=createGame(); t.after(()=>g.close()); setup[stage](g);
    const scene=g.snapshot();
    assert.deepEqual(panels.map(s=>Number(g.isVisible(s))),visibility);
    assert.equal(sprites(scene,'planets.png').length,planets);
    assert.equal(rings(scene).length,ringCount);
    assert.equal(nets(scene).length,netCount);
    assert.equal(sprites(scene,'ball.png').length,ballCount);
    assert.equal(sprites(scene,'ball_tail.png').length,stage==='S-PLAY'?1:0);
    if(visibility[3])assert.equal(g.query('.round-word').textContent,word);
    assert.equal(labels(scene).length,planets===8?1:0);
    const veils=scene.commands.filter(n=>n.op==='fillRect'&&n.state.fillStyle==='rgba(3, 7, 25, 0.72)');
    assert.equal(veils.length,['S-LOAD','S-ASSET-ERROR','S-PICK','S-READY'].includes(stage)?1:0);
    if(stage==='S-READY')assert.equal(g.bridge.match,null);
    // Canvas and DOM are separate scene roots; HTML follows canvas paint order.
    assert.deepEqual(scene.children.map(n=>n.kind),['canvas','dom']);
  });
}

test(contract(['C-BOOT-01','C-HUD-01','C-HUD-03','C-RESULT-02','C-AUDIO-09'], 'scene roots, semantic parents, and referenced labels are unique'), t => {
  const g=createGame(); t.after(()=>g.close());
  assert.deepEqual([...g.query('#app').children].map(n=>n.localName),['canvas','div']);
  assert.equal(g.document.querySelectorAll('canvas').length,1);
  assert.deepEqual([...g.query('.interface').children].map(n=>n.className),['selection','start','scoreboard','round-message','voice-controls','result-dialog']);
  for(const [child,parent] of [['.planet-preview','.carousel'],['.arrow-next','.carousel'],['.match-rule','.scoreboard'],
    ['.score-you strong','.score-you'],['.score-opponent strong','.score-opponent'],['.round-word','.round-message'],
    ['.voice-meter','.voice-actions'],['.microphone-toggle','.voice-actions'],['.boost','.voice-actions'],['.new-game','.result-dialog']]) {
    assert.equal(g.query(child).parentElement,g.query(parent),`${child} parent`);
  }
  for(const selector of ['.selection','.result-dialog'])for(const attr of ['aria-labelledby','aria-describedby']) {
    const reference=g.query(selector).getAttribute(attr);
    if(reference)for(const id of reference.split(' '))assert.equal(g.document.querySelectorAll('#'+id).length,1);
  }
  for(const selector of ['.scoreboard','.round-message','.voice-status'])assert.equal(g.query(selector).getAttribute('aria-live'),'polite');
  assert.equal(g.query('.planet-preview').getAttribute('role'),'img');
  assert.equal(g.query('.voice-meter').getAttribute('aria-label'),'Voice loudness');
});

test(contract(['C-BOOT-01'], 'missing app and unavailable canvas context fail initialization'), () => {
  assert.throws(()=>createGame({missingApp:true}),/Missing app element/);
  assert.throws(()=>createGame({missingContext:true}),/Canvas 2D rendering is unavailable/);
});

test(contract(['C-BOOT-02','C-PICK-03'], 'all four assets must load before Confirm can change scene'), t => {
  const g=createGame(); t.after(()=>g.close());
  assert.equal(g.query('.selection .confirm').textContent,'Loading game…');
  assert.equal(g.query('.selection .confirm').disabled,true);
  for(const image of g.images.slice(0,3))image.load();
  g.click('.selection .confirm'); assert.equal(g.bridge.state,'selecting');
  assert.equal(g.query('.selection .confirm').disabled,true);
  g.images[3].load(); assert.equal(g.query('.selection .confirm').disabled,false);
  assert.equal(g.query('.selection .confirm').textContent,'Confirm');
  g.click('.selection .confirm'); assert.equal(g.bridge.state,'ready');
});

for(const file of ['background.png','planets.png','ball.png','ball_tail.png']) {
  test(contract(['C-BOOT-03'], `${file} failure leaves the error picker and no match scene`), t => {
    const g=createGame();t.after(()=>g.close());
    for(const image of g.images)if(!image.src.endsWith('/'+file))image.load();
    g.images.find(i=>i.src.endsWith('/'+file)).fail();
    assert.equal(g.query('.selection .confirm').disabled,true);
    assert.equal(g.query('.selection .confirm').textContent,'Game assets unavailable');
    assert.equal(g.query('.load-status').textContent,'Unable to load the game artwork. Please reload to try again.');
    g.click('.selection .confirm'); assert.equal(g.bridge.state,'selecting');assert.equal(g.bridge.match,null);
    assert.equal(g.isVisible('.selection'),true);assert.equal(g.isVisible('.start'),false);
  });
}

for(const [index,planet] of ['Earth','Jupiter','Lava','Ice'].entries()) {
  test(contract(['C-PICK-01','C-PICK-02','C-PICK-05','I-FLOW-01'], `${planet}: picker art/name and controlled field stay linked`), t => {
    const g=createGame();t.after(()=>g.close());g.load();
    for(let i=0;i<index;i++)g.click('.arrow-next');
    assert.equal(g.query('.planet-name').textContent,planet);
    assert.equal(g.query('.planet-count').textContent,`${index+1} / 4`);
    assert.equal(g.query('.planet-preview').getAttribute('aria-label'),planet);
    const picker=sprites(g.snapshot(),'planets.png');assert.equal(picker.length,1);
    assert.equal(picker[0].args[0],index*543);
    g.click('.selection .confirm');assert.equal(g.document.activeElement,g.query('.start'));
    g.click('.start');assert.equal(g.bridge.match.selectedPlanet,planet);
    assert.equal(labels(g.snapshot())[0].args[0],`YOUR ${planet.toUpperCase()}`);
  });
}

test(contract(['C-PICK-01','C-PICK-02'], 'picker arrows and keyboard wrap without duplicating its preview'), t => {
  const g=createGame();t.after(()=>g.close());g.load();
  g.click('.arrow');assert.equal(g.query('.planet-name').textContent,'Ice');
  g.event('.selection','keydown',{key:'ArrowRight'});assert.equal(g.query('.planet-name').textContent,'Earth');
  g.event('.selection','keydown',{key:'ArrowLeft'});assert.equal(g.query('.planet-name').textContent,'Ice');
  g.click('.arrow-next');assert.equal(g.query('.planet-count').textContent,'1 / 4');
  assert.equal(sprites(g.snapshot(),'planets.png').length,1);
  const first=g.query('.arrow svg'), next=g.query('.arrow-next svg');
  assert.notEqual(first,next);assert.equal(first.innerHTML,next.innerHTML);
});
