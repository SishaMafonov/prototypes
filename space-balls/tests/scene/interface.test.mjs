import assert from 'node:assert/strict';
import test from 'node:test';
import { awardPoint } from '../../src/match.ts';
import { contract } from '../struct/graph.mjs';
import { createGame, labels, rings, sprites } from './harness.mjs';

const flush = async () => { for(let i=0;i<8;i++)await Promise.resolve(); };
const text=(g,s)=>g.query(s).textContent;

for(const [scores,rule,point] of [
  [[2,3],'First to 10 · Win by 2',false], [[9,9],'Deuce · Win by 2',false],
  [[9,8],'Match point · You',true], [[8,9],'Match point · Opponent',true], [[12,12],'Deuce · Win by 2',false],
]) {
  test(contract(['C-HUD-01','C-HUD-02','I-FLOW-08','V-TEXT-02'], `${scores.join(':')}: score nodes and rule styling project the same match`), t => {
    const g=createGame();t.after(()=>g.close());g.play();g.bridge.match.scores=[...scores];g.tick(0);
    assert.equal(text(g,'.score-you strong'),String(scores[0]));assert.equal(text(g,'.score-opponent strong'),String(scores[1]));
    assert.equal(text(g,'.match-rule'),rule);assert.equal(g.query('.match-rule').classList.contains('match-point'),point);
    assert.equal(g.query('.match-rule').parentElement,g.query('.scoreboard'));
  });
}

for(const winner of [0,1]) {
  test(contract(['C-RESULT-01','C-RESULT-02','C-RESULT-04','I-FLOW-06','I-FLOW-07','V-TEXT-02'], `winner ${winner}: persistent modal owns final score and replay returns a clean picker`), t => {
    const g=createGame();t.after(()=>g.close());g.click('.arrow-next');g.play();
    g.event('.boost','pointerdown',{pointerId:11});g.tick(16);
    g.bridge.match.scores=winner===0?[9,7]:[7,9];awardPoint(g.bridge.match,winner);g.tick(0);
    const dialog=g.query('.result-dialog');assert.equal(dialog.open,true);
    assert.equal(dialog.dataset.winner,String(winner));assert.equal(text(g,'#result-title'),winner===0?'You win!':'Opponent wins!');
    assert.equal(text(g,'.result-you-score'),winner===0?'10':'7');assert.equal(text(g,'.result-opponent-score'),winner===0?'7':'10');
    assert.equal(text(g,'.match-rule'),'Match complete');assert.equal(text(g,'.new-game'),'New Game');
    assert.equal(text(g,'#result-summary'),'Choose a new planet and play another match.');
    assert.ok(g.query('.winner-trophy').closest('dialog')===dialog);assert.equal(g.bridge.playerDrive,0);
    assert.equal(g.isVisible('.voice-controls'),false);assert.equal(g.isVisible('.round-message'),false);
    assert.equal(g.event(dialog,'cancel').defaultPrevented,true);assert.equal(dialog.open,true);
    let opens=0;const original=dialog.showModal.bind(dialog);dialog.showModal=()=>{opens++;original();};
    const frozen=structuredClone(g.bridge.match);g.tick(100);g.tick(100);
    assert.equal(opens,0,'Existing result dialog must not reopen every frame');assert.deepEqual(g.bridge.match,frozen);
    assert.equal(sprites(g.snapshot(),'ball_tail.png').length,0);
    g.click('.new-game');const replay=g.snapshot();
    assert.equal(g.bridge.state,'selecting');assert.equal(g.bridge.match,null);assert.equal(dialog.open,false);
    assert.equal(text(g,'.planet-name'),'Earth');assert.equal(text(g,'.planet-count'),'1 / 4');
    assert.equal(g.document.activeElement,g.query('.arrow'));assert.equal(g.query('.match-rule').classList.contains('match-point'),false);
    assert.equal(sprites(replay,'planets.png').length,1);assert.equal(rings(replay).length,0);
    assert.equal(text(g,'.round-word'),'');assert.equal(text(g,'.score-you strong'),'0');
    g.click('.selection .confirm');g.click('.start');
    assert.equal(g.bridge.match.phase,'countdown');assert.deepEqual([...g.bridge.match.scores],[0,0]);
    assert.equal(g.document.querySelectorAll('.result-dialog').length,1);assert.equal(g.document.querySelectorAll('canvas').length,1);
  });
}

for(const release of ['pointerup','pointercancel','lostpointercapture']) {
  test(contract(['C-INPUT-01','C-INPUT-04','C-INPUT-05'], `${release}: Boost ring activity releases while the mic meter stays independent`), t => {
    const g=createGame();t.after(()=>g.close());g.play();
    Object.assign(g.bridge.match.ball,{x:0.5,y:0.02,vx:0,vy:0}); // Waiting fixture outside every field.
    g.event('.boost','pointerdown',{pointerId:9});assert.ok(g.captures.has(9));g.tick(16);
    const active=g.snapshot();assert.equal(g.bridge.playerDrive,0.75);assert.equal(g.query('.voice-meter').value,0);
    assert.equal(labels(active)[0].args[0],'BOOST ACTIVE');assert.equal(g.query('.voice-controls').classList.contains('voice-detected'),true);
    const arcs=active.commands.filter(n=>n.op==='stroke'&&n.path[0]?.op==='arc');assert.equal(arcs.length,11,'Only the controlled ring adds three active arcs');
    assert.match(text(g,'.voice-status'),/^Boost ready · Waiting for the asteroid/);
    g.event('.boost',release,{pointerId:9});g.tick(16);
    assert.equal(g.bridge.playerDrive,0);assert.equal(labels(g.snapshot())[0].args[0],'YOUR EARTH');
  });
}

test(contract(['C-INPUT-02','C-INPUT-03','I-INPUT-06'], 'Space honors focused buttons, and blur/keyup release manual scene activity'), t => {
  const g=createGame();t.after(()=>g.close());g.play();
  g.event('.microphone-toggle','keydown',{code:'Space'});g.tick(16);assert.equal(g.bridge.playerDrive,0);
  const press=g.event(g.window,'keydown',{code:'Space'});assert.equal(press.defaultPrevented,true);g.tick(16);assert.equal(g.bridge.playerDrive,0.75);
  g.event(g.window,'keyup',{code:'Space'});g.tick(16);assert.equal(g.bridge.playerDrive,0);
  g.event('.boost','pointerdown',{pointerId:1});g.event(g.window,'keydown',{code:'Space'});g.event(g.window,'blur');g.tick(16);
  assert.equal(g.bridge.playerDrive,0);assert.equal(labels(g.snapshot())[0].args[0],'YOUR EARTH');
});

test(contract(['C-INPUT-02','C-INPUT-06','I-INPUT-03','V-TEXT-04'], 'click pulse and applied impulse feedback have distinct scene lifetimes'), t => {
  const g=createGame();t.after(()=>g.close());g.play();
  Object.assign(g.bridge.match.ball,{x:0.5,y:0.02,vx:0,vy:0});
  g.click('.boost');g.tick(100);
  assert.equal(g.bridge.playerDrive,0.75);assert.equal(g.query('.voice-controls').classList.contains('boost-applied'),false);
  g.tick(81);assert.equal(g.bridge.playerDrive,0);
  g.bridge.match.planetEffects['0:Earth'].boosts++;g.tick(0);
  assert.equal(text(g,'.voice-status'),'Earth boosted the asteroid!');assert.equal(g.query('.voice-controls').classList.contains('boost-applied'),true);
  g.tick(651);assert.equal(g.query('.voice-controls').classList.contains('boost-applied'),false);assert.match(text(g,'.voice-status'),/^Mic off/);
});

const micStates=[
  ['off','Enable microphone','Mic off · Hold Boost or Space to play without a mic.'],
  ['requesting','Cancel microphone','Allow microphone access in your browser to use your voice.'],
  ['active','Turn mic off','Mic listening · Speak to light up your Earth.'],
  ['paused','Resume microphone','Audio paused · Resume microphone or hold Boost.'],
  ['denied','Enable microphone','Microphone permission declined · Use Boost or Space instead.'],
  ['unavailable','Enable microphone','No microphone available · Use Boost or Space instead.'],
  ['error','Enable microphone','Could not start microphone · Try again or use Boost.'],
];
for(const [status,button,message] of micStates) {
  test(contract(['C-AUDIO-09','C-INPUT-08','V-TEXT-03'], `microphone ${status}: consistent control subtree, copy, and pressed state`), t => {
    const g=createGame();t.after(()=>g.close());g.ready();g.bridge.microphone.state=status;g.bridge.syncVoiceControls();
    assert.equal(text(g,'.microphone-toggle'),button);assert.equal(text(g,'.voice-status'),message);
    assert.equal(g.query('.microphone-toggle').getAttribute('aria-pressed'),String(status==='active'));
    assert.equal(g.isVisible('.boost'),true);assert.equal(g.query('.boost').disabled,false);assert.equal(g.query('.voice-meter').value,0);
  });
}

test(contract(['C-AUDIO-04','C-AUDIO-08','I-INPUT-01','I-INPUT-02'], 'actual microphone lifecycle projects requesting/active/off and voice-only meter into the scene'), async t => {
  const g=createGame();t.after(()=>g.close());g.play();g.click('.microphone-toggle');
  assert.equal(text(g,'.microphone-toggle'),'Cancel microphone');assert.equal(g.audio.requests.length,1);
  const track=g.audio.grant();await flush();assert.equal(text(g,'.microphone-toggle'),'Turn mic off');
  g.audio.amplitude=0.1;g.tick(100);
  assert.ok(g.query('.voice-meter').value>0);assert.equal(labels(g.snapshot())[0].args[0],'VOICE ACTIVE');
  g.click('.microphone-toggle');g.tick(16);assert.equal(track.stops,1);assert.equal(g.query('.voice-meter').value,0);
  assert.equal(g.bridge.playerDrive,0);assert.equal(text(g,'.microphone-toggle'),'Enable microphone');
});

test(contract(['C-AUDIO-08','I-INPUT-06','I-INPUT-08'], 'hidden page releases real mic resources and removes drive feedback without reacquiring on return'), async t => {
  const g=createGame();t.after(()=>g.close());g.play();g.click('.microphone-toggle');const track=g.audio.grant();await flush();
  g.event('.boost','pointerdown',{pointerId:1});g.tick(16);assert.equal(g.bridge.playerDrive,0.75);
  Object.defineProperty(g.document,'hidden',{configurable:true,value:true});g.event(g.document,'visibilitychange');
  assert.equal(track.stops,1);assert.equal(g.bridge.playerDrive,0);assert.equal(g.query('.voice-controls').classList.contains('voice-detected'),false);
  Object.defineProperty(g.document,'hidden',{configurable:true,value:false});g.event(g.document,'visibilitychange');g.tick(100);
  assert.equal(g.audio.requests.length,1);assert.equal(g.bridge.microphone.state,'off');assert.equal(g.bridge.playerDrive,0);
  g.click('.microphone-toggle');const next=g.audio.grant();await flush();g.event(g.window,'pagehide');assert.equal(next.stops,1);
});

test(contract(['C-INPUT-07','C-HUD-04','C-RESULT-03'], 'short-height CSS hides help while retaining interactive controls and scrollable result content'), t => {
  const g=createGame({width:844,height:390});t.after(()=>g.close());g.start();
  assert.equal(g.isVisible('.voice-help'),false);
  for(const selector of ['.microphone-toggle','.voice-meter','.boost','.voice-status'])assert.equal(g.isVisible(selector),true);
  assert.equal(g.window.getComputedStyle(g.query('.interface')).pointerEvents,'none');
  assert.equal(g.window.getComputedStyle(g.query('.boost')).pointerEvents,'auto');
  assert.equal(g.window.getComputedStyle(g.query('.result-dialog')).overflowY,'auto');
  // Happy DOM evaluates media rules but has no layout engine: dimensions/hit testing remain browser checks.
});
