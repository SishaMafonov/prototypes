import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBonusPrize, BONUS_MULTIPLIERS, BONUS_WEIGHTS, createBonusState, drawBonusPrize, formatCents } from '../src/bonus.ts';

test('bonus category boundaries are 35% coin, 25% multiplier, 5% stairs and 35% ghost', () => {
  assert.equal(Object.values(BONUS_WEIGHTS).reduce((a,b)=>a+b,0),100);
  for (const [roll,kind] of [[0,'coin'],[.349999,'coin'],[.35,'multiplier'],[.599999,'multiplier'],[.60,'stairs'],[.649999,'stairs'],[.65,'ghost'],[.999999,'ghost']]) {
    const rolls=[roll,.99];
    assert.equal(drawBonusPrize(()=>rolls.shift()).kind,kind);
    assert.equal(rolls.length,kind==='multiplier'?0:1);
  }
});

test('all ten multiplier slots preserve five x2, two x3, two x5 and one x8', () => {
  assert.deepEqual([...BONUS_MULTIPLIERS],[2,2,2,2,2,3,3,5,5,8]);
  for(let i=0;i<10;i++) {
    const rolls=[.4,(i+.5)/10];
    assert.equal(drawBonusPrize(()=>rolls.shift()).multiplier,BONUS_MULTIPLIERS[i]);
  }
});

test('coin awards scale by floor; stairs advance one floor through x6 and still consume a move at the cap', () => {
  let state=createBonusState(20);
  for(let floor=1;floor<=6;floor++) {
    const previous=state;
    state=applyBonusPrize(state,{kind:'coin'});
    assert.equal(state.stepWinCents,BigInt(floor*100));
    assert.equal(previous.completedSteps,state.completedSteps-1);
    const pot=state.totalWinCents;
    state=applyBonusPrize(state,{kind:'stairs'});
    assert.equal(state.floor,Math.min(6,floor+1));
    assert.equal(state.stepWinCents,0n);
    assert.equal(state.totalWinCents,pot);
  }
});

test('multiplier applies to the accumulated bonus pot, with incremental credit and no future multiplier stored', () => {
  let state=createBonusState(6);
  state=applyBonusPrize(state,{kind:'multiplier',multiplier:8});
  assert.equal(state.totalWinCents,0n);
  state=applyBonusPrize(state,{kind:'coin'});
  state=applyBonusPrize(state,{kind:'multiplier',multiplier:3});
  assert.equal(state.totalWinCents,300n);
  assert.equal(state.stepWinCents,200n);
  state=applyBonusPrize(state,{kind:'coin'});
  assert.equal(state.totalWinCents,400n);
  state=applyBonusPrize(state,{kind:'ghost'});
  assert.equal(state.stepWinCents,0n);
  assert.equal(state.totalWinCents,400n);
  state=applyBonusPrize(state,{kind:'stairs'});
  assert.equal(state.completedSteps,6);
  assert.throws(()=>applyBonusPrize(state,{kind:'coin'}),/no moves/);
  assert.throws(()=>createBonusState(0));
});

test('repeated bank multipliers retain exact cents beyond Number safe-integer range', () => {
  let state=applyBonusPrize(createBonusState(25),{kind:'coin'});
  let credited=state.stepWinCents;
  for(let i=0;i<24;i++) { state=applyBonusPrize(state,{kind:'multiplier',multiplier:8}); credited+=state.stepWinCents; }
  assert.equal(state.totalWinCents,100n*8n**24n);
  assert.equal(credited,state.totalWinCents);
  assert.equal(formatCents(123n),'1.23');
  assert.equal(formatCents(0),'0.00');
  assert.equal(formatCents(state.totalWinCents),'4,722,366,482,869,645,213,696.00');
});
