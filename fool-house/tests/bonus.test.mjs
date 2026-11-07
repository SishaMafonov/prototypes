import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBonusPrize, BONUS_MULTIPLIERS, BONUS_WEIGHTS, PRE_ROUND_POT_BONUS_WEIGHTS, createBonusState, drawBonusPrize, formatCents } from '../src/bonus.ts';

test('calibrated bonus odds keep 15% stairs and exact category boundaries', () => {
  assert.ok(Math.abs(Object.values(BONUS_WEIGHTS).reduce((a,b)=>a+b,0)-100)<1e-12);
  assert.equal(BONUS_WEIGHTS.stairs,15);
  assert.deepEqual(BONUS_WEIGHTS,{coin:30,multiplier:4.73,stairs:15,ghost:50.27});
  const coin=BONUS_WEIGHTS.coin/100,mult=(BONUS_WEIGHTS.coin+BONUS_WEIGHTS.multiplier)/100,stairs=(BONUS_WEIGHTS.coin+BONUS_WEIGHTS.multiplier+BONUS_WEIGHTS.stairs)/100;
  for (const [roll,kind] of [[0,'coin'],[coin-1e-10,'coin'],[coin,'multiplier'],[mult-1e-10,'multiplier'],[mult,'stairs'],[stairs-1e-10,'stairs'],[stairs,'ghost'],[.999999,'ghost']]) {
    const rolls=[roll,.99];
    assert.equal(drawBonusPrize(()=>rolls.shift()).kind,kind);
    assert.equal(rolls.length,kind==='multiplier'?0:1);
  }
});

test('base round win seeds the bonus without a second credit; all subsequent prizes affect one combined pot',()=>{
  let state=createBonusState(6,200n),credited=200n;
  assert.equal(state.totalWinCents,200n);assert.equal(state.startingWinCents,200n);assert.equal(state.stepWinCents,0n);
  const prizes=[{kind:'multiplier',multiplier:3},{kind:'coin'},{kind:'stairs'},{kind:'coin'},{kind:'ghost'},{kind:'multiplier',multiplier:2}];
  const totals=[600n,700n,700n,900n,900n,1800n],gains=[400n,100n,0n,200n,0n,900n];
  for(let i=0;i<prizes.length;i++){state=applyBonusPrize(state,prizes[i]);credited+=state.stepWinCents;assert.equal(state.totalWinCents,totals[i]);assert.equal(state.stepWinCents,gains[i]);assert.equal(credited,state.totalWinCents);assert.equal(state.startingWinCents,200n);}
  assert.equal(credited-state.startingWinCents,1600n);
  assert.throws(()=>createBonusState(6,-1n),/negative/);
  let ghostOnly=createBonusState(6,123n);for(let i=0;i<6;i++)ghostOnly=applyBonusPrize(ghostOnly,{kind:'ghost'});
  assert.equal(ghostOnly.totalWinCents,123n);assert.equal(ghostOnly.stepWinCents,0n);
});

test('explicit archived bonus weights retain the old door boundaries',()=>{
  for(const[roll,kind]of [[.349999,'coin'],[.35,'multiplier'],[.599999,'multiplier'],[.60,'stairs'],[.649999,'stairs'],[.65,'ghost']])assert.equal(drawBonusPrize(()=>roll,PRE_ROUND_POT_BONUS_WEIGHTS).kind,kind);
});

test('all ten multiplier slots preserve five x2, two x3, two x5 and one x8', () => {
  assert.deepEqual([...BONUS_MULTIPLIERS],[2,2,2,2,2,3,3,5,5,8]);
  for(let i=0;i<10;i++) {
    const rolls=[(BONUS_WEIGHTS.coin+BONUS_WEIGHTS.multiplier/2)/100,(i+.5)/10];
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
