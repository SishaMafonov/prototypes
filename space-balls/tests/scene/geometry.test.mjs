import assert from 'node:assert/strict';
import test from 'node:test';
import { contract, read } from '../struct/graph.mjs';
import { createGame, sprites, rings, nets, labels } from './harness.mjs';
import { project } from './canvas.mjs';

const fixtures=JSON.parse(read('requirements/assets/geometry.json'));
const indices={Earth:0,Jupiter:1,Lava:2,Ice:3};
const close=(actual,expected,label='geometry')=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
const near=(actual,expected,label)=>{assert.equal(actual.length,expected.length,label);actual.forEach((v,i)=>close(v,expected[i],label));};
const parentOf=(root,node)=>root.children?.includes(node)?root:root.children?.map(child=>parentOf(child,node)).find(Boolean);

for(const [profile,fixture] of Object.entries(fixtures))for(const dpr of [1,2]) {
  test(contract(['C-COURT-02','C-COURT-04','C-COURT-05','C-PLANET-01','C-PLANET-02','C-PLANET-03','C-PLANET-04','I-PHYSICS-02'], `${profile} DPR ${dpr}: every sprite and ring matches the independent geometry fixture`), t => {
    const g=createGame({...fixture,dpr});t.after(()=>g.close());g.play();const scene=g.snapshot();
    assert.deepEqual(scene.canvas,{width:Math.round(fixture.width*dpr),height:Math.round(fixture.height*dpr)});
    const background=sprites(scene,'background.png');assert.equal(background.length,1);
    assert.deepEqual(background[0].args,[0,0,fixture.width,fixture.height]);
    const art=sprites(scene,'planets.png'),fields=rings(scene);assert.equal(art.length,8);assert.equal(fields.length,8);
    for(const [i,planet] of fixture.planets.entries()) {
      const sprite=art[i],ring=fields[i],height=planet.diameter*724/543;
      near(sprite.args,[indices[planet.name]*543,0,543,724,-planet.diameter/2,-height/2,planet.diameter,height],planet.id+' atlas/frame');
      near(sprite.state.transform,[(planet.side===0?1:-1)*dpr,0,0,dpr,planet.x*dpr,planet.y*dpr],planet.id+' mirror/position');
      near(ring.path[0].args.slice(0,3),[planet.centerX,planet.centerY,planet.gravityRadius],planet.id+' ring');
      near(ring.state.transform,[dpr,0,0,dpr,0,0],planet.id+' CSS coordinate projection');
      assert.equal(ring.state.clips.length,0);
      assert.equal(parentOf(scene.children[0],ring).kind,'scope');
      const gradient=ring.state.fillStyle;assert.equal(gradient.kind,'radialGradient');
      near(gradient.args,[planet.centerX,planet.centerY,planet.bodyRadius*0.7,planet.centerX,planet.centerY,planet.gravityRadius],planet.id+' body alignment');
    }
    assert.ok(fields.at(-1).order<art[0].order,'All rings must precede all sprites');
    assert.ok(art.at(-1).order<labels(scene)[0].order);
    assert.ok(labels(scene)[0].order<nets(scene)[0].order);
    assert.ok(nets(scene).at(-1).order<sprites(scene,'ball_tail.png')[0].order);
    assert.ok(sprites(scene,'ball_tail.png')[0].order<sprites(scene,'ball.png')[0].order);
  });
}

test(contract(['C-GOAL-03','I-PHYSICS-03'], 'both colored goal groups have the correct frame and 4-by-8 mesh'), t => {
  const g=createGame();t.after(()=>g.close());g.play();g.bridge.match.goals[0].position=0.23;g.bridge.match.goals[1].position=0.81;
  const scene=g.snapshot(),frames=nets(scene),a=fixtures.landscape.arena;assert.equal(frames.length,2);
  for(const side of [0,1]) {
    const frame=frames[side],width=a.goalSize*0.4,top=a.top+g.bridge.match.goals[side].position*(a.height-a.goalSize);
    near(frame.args,[a.goalX[side]-width/2,top,width,a.goalSize],'net rectangle');
    assert.equal(frame.state.strokeStyle,side===0?'#86eaff':'#ff91e8');assert.equal(frame.state.clips.length,0);
    const group=parentOf(scene.children[0],frame);
    const mesh=group.children.find(n=>n.op==='stroke');assert.ok(mesh);
    assert.equal(mesh.path.filter(p=>p.op==='moveTo').length,10);assert.equal(mesh.path.filter(p=>p.op==='lineTo').length,10);
    const vertical=mesh.path.filter(p=>p.op==='lineTo').filter(p=>p.args[1]===top+a.goalSize);
    assert.equal(vertical.length,3);assert.equal(mesh.state.globalAlpha,0.5);assert.equal(frame.state.globalAlpha,1);
  }
});

for(const profile of ['landscape','portrait']) {
  test(contract(['C-BALL-02','C-BALL-03','C-BALL-04','I-PHYSICS-04','I-PHYSICS-05','I-PHYSICS-06'], `${profile}: tail and asteroid share a court clip with isolated rotation/alpha`), t => {
    const fixture=fixtures[profile],g=createGame({...fixture,dpr:2});t.after(()=>g.close());g.play();
    Object.assign(g.bridge.match.ball,{x:0.31,y:0.64,vx:0.2,vy:-0.7});
    const scene=g.snapshot(),ball=sprites(scene,'ball.png')[0],tail=sprites(scene,'ball_tail.png')[0],a=fixture.arena;
    const diameter=a.ballRadius*2,x=a.left+0.31*a.width,y=a.top+0.64*a.height;
    near(ball.args,[248,156,912,880,x-diameter/2,y-diameter/2,diameter,diameter]);
    near(ball.state.transform,[2,0,0,2,0,0]);assert.equal(ball.state.globalAlpha,1);
    const rotation=Math.atan2(-0.7*a.height,0.2*a.width)-Math.atan2(0.42*887,0.87*1774);
    near(tail.state.transform,[2*Math.cos(rotation),2*Math.sin(rotation),-2*Math.sin(rotation),2*Math.cos(rotation),2*x,2*y]);
    const tailWidth=4.5*diameter,tailHeight=tailWidth*887/1774;
    near(tail.args,[-tailWidth*0.93,-tailHeight*0.71,tailWidth,tailHeight]);assert.equal(tail.state.globalAlpha,0.85);
    near(project(tail.state.transform,0,0),[x*2,y*2]);
    for(const node of [ball,tail]) {
      assert.equal(node.state.clips.length,1);near(node.state.clips[0].path[0].args,[a.left,a.top,a.width,a.height]);
      near(node.state.clips[0].transform,[2,0,0,2,0,0]);
    }
    assert.equal(parentOf(scene.children[0],parentOf(scene.children[0],tail)),parentOf(scene.children[0],ball),'Tail must be nested inside the asteroid court scope');
  });
}

test(contract(['C-COURT-04','C-COURT-06','I-PHYSICS-08'], 'resize and DPR changes update one scene without duplicating components or normalized positions'), t => {
  const g=createGame();t.after(()=>g.close());g.play();const before=structuredClone(g.bridge.match.ball),goals=g.bridge.match.goals.map(n=>n.position);
  g.resize(390,844,2);const scene=g.snapshot();
  assert.deepEqual(g.bridge.match.ball,before);assert.deepEqual(g.bridge.match.goals.map(n=>n.position),goals);
  assert.deepEqual(scene.canvas,{width:780,height:1688});
  assert.equal(sprites(scene,'planets.png').length,8);assert.equal(rings(scene).length,8);assert.equal(nets(scene).length,2);
  assert.equal(g.document.querySelectorAll('canvas').length,1);assert.equal(g.observers.length,1);
  g.resize(0,0);g.recorder.reset();g.bridge.resizeCanvas();assert.equal(g.recorder.commands.length,0);
  g.resize(844,390,1);assert.equal(g.snapshot().canvas.width,844);
});
