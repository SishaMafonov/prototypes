import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { config } from '../scripts/rtp/config.mjs';
import { aggregate } from '../scripts/rtp/report.mjs';
import { PRE_MYSTERY_WEIGHTS } from '../src/game.ts';

test('historical v8 calibration accounts for ten billion full paid chains with pre-persistence rules',()=>{
  const study=JSON.parse(fs.readFileSync(new URL('../docs/game-rules/studies/rtp-10b.json',import.meta.url),'utf8'));
  assert.equal(study.complete,true);
  assert.equal(study.requestedPaidRounds,10000000000);
  assert.equal(study.summary.paidRounds,10000000000);
  assert.equal(study.workers,8);
  assert.equal(study.configuration.Seed,20261105);
  assert.deepEqual(study.configuration,config({seed:study.configuration.Seed,weights:PRE_MYSTERY_WEIGHTS,keepScatters:false}));
  const current=config({seed:study.configuration.Seed});
  assert.equal(current.KeepScatters,true);
  assert.equal(current.BonusOncePerPaidChain,true);
  assert.equal(current.BonusAtEndOfPaidChain,true);
  assert.equal(current.StaticPreview,true);
  assert.notEqual(study.configuration.Id,current.Id);
  assert.deepEqual(study.shards.map(r=>r.Worker).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
  for(const r of study.shards){
    assert.equal(r.ConfigId,study.configuration.Id);
    assert.equal(r.Rounds,1250000000);
    assert.equal(r.Target,r.Rounds);
    assert.ok(Number.isSafeInteger(r.RandomCalls)&&r.RandomCalls>0&&r.RandomCalls<2**64);
    assert.equal(r.TierCents.reduce((s,n)=>s+BigInt(n),0n),BigInt(r.BaseCents));
    assert.equal(r.PrizeCounts.reduce((s,n)=>s+n,0),r.BonusMoves);
    assert.equal(r.StageCounts.reduce((s,n)=>s+n,0),r.FreeStages);
    assert.equal(r.BonusByMoves.reduce((s,n)=>s+n,0),r.Bonuses);
    assert.equal(r.BonusByMoves.reduce((s,n,i)=>s+n*i,0),r.BonusMoves);
  }
  for(const [key,value] of Object.entries(aggregate(study.shards)))assert.deepEqual(study.summary[key],value,key);
  assert.equal(study.summary.truncatedChains,0);
  assert.ok(study.summary.base.rtpPercent>=50&&study.summary.base.rtpPercent<=60);
  assert.ok(study.summary.bonus.rtpPercent>=36&&study.summary.bonus.rtpPercent<=46);
  assert.ok(Math.abs(study.summary.total.rtpPercent-96)<0.1);
  assert.ok(study.summary.tierGroups[0]>study.summary.tierGroups[1]&&study.summary.tierGroups[1]>study.summary.tierGroups[2]);
});
