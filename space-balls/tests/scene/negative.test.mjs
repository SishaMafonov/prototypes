import assert from 'node:assert/strict';
import test from 'node:test';
import { awardPoint } from '../../src/match.ts';
import { createGame, sprites, sourceText } from './harness.mjs';
import { CanvasScene, project } from './canvas.mjs';

test('recorder preserves nested parentage, transform/clip ancestry, and restored style',()=>{
  const scene=new CanvasScene(),c=scene.context;
  c.setTransform(2,0,0,2,0,0);c.save();c.rect(1,2,3,4);c.clip();c.translate(10,20);
  c.save();c.scale(-1,1);c.globalAlpha=0.5;c.fillRect(0,0,5,6);c.restore();c.fillText('restored',0,0);c.restore();
  c.fillRect(0,0,1,1);scene.assertBalanced();
  const [nested,restored,outside]=scene.commands;
  assert.deepEqual(project(nested.state.transform,1,1),[18,42]);assert.equal(nested.state.clips.length,1);
  assert.equal(nested.state.globalAlpha,0.5);assert.equal(restored.state.globalAlpha,1);assert.equal(outside.state.clips.length,0);
  assert.equal(scene.root.children[0].children[0].children[0],nested);
  assert.throws(()=>c.restore(),/without save/);assert.throws(()=>c.unsupportedAPI(),/Unsupported canvas API/);
});

for(const [label,from,to,verify] of [
  ['missing asteroid','    drawBall();','    /* drawBall(); */',g=>assert.equal(sprites(g.snapshot(),'ball.png').length,1)],
  ['wrong mirror','mirrored ? -1 : 1','1',g=>assert.ok(sprites(g.snapshot(),'planets.png')[1].state.transform[0]<0)],
  ['missing court clip','  context.clip();','  /* context.clip(); */',g=>assert.equal(sprites(g.snapshot(),'ball.png')[0].state.clips.length,1)],
  ['hidden voice panel retained after finish','    voiceControls.hidden = true;','    voiceControls.hidden = false;',g=>{
    g.bridge.match.scores=[9,0];awardPoint(g.bridge.match,0);g.tick(0);assert.equal(g.isVisible('.voice-controls'),false);
  }],
]) {
  test(`negative control: scene assertions detect ${label}`,t=>{
    assert.ok(sourceText.includes(from),'Mutation must target current source');const text=sourceText.replace(from,to);assert.notEqual(text,sourceText);
    const g=createGame({text});t.after(()=>g.close());g.play();assert.throws(()=>verify(g),assert.AssertionError);
  });
}

test('negative control: a meter moved outside the action group violates scene parentage',t=>{
  const meter=sourceText.match(/      <meter[^\n]+\n/)[0];
  const text=sourceText.replace(meter,'').replace('    <p class="voice-help"></p>','    <p class="voice-help"></p>\n'+meter);
  const g=createGame({text});t.after(()=>g.close());
  assert.throws(()=>assert.ok(g.query('.voice-meter').parentElement===g.query('.voice-actions'),'Meter must belong to the voice-actions group'),assert.AssertionError);
});
