import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { config } from '../scripts/rtp/config.mjs';
import { aggregate } from '../scripts/rtp/report.mjs';

test('historical v14 calibration audits one billion paid chains before bonus floor doubling',()=>{
  const study=JSON.parse(fs.readFileSync(new URL('../docs/game-rules/studies/rtp-v14-1b.json',import.meta.url),'utf8'));
  assert.equal(study.complete,true);
  assert.equal(study.requestedPaidRounds,1000000000);
  assert.equal(study.summary.paidRounds,1000000000);
  assert.equal(study.configuration.Seed,20261111);
  assert.equal(study.workers,8);
  assert.deepEqual(study.configuration,config({seed:20261111,bonusFloorDoubling:false}));
  assert.equal(config().BonusFloorDoubling,true);
  assert.notEqual(study.configuration.Id,config({seed:20261111}).Id);
  for(const[file,hash]of Object.entries(study.sourceSha256)){
    const archive=new URL('../docs/game-rules/studies/v14-source/'+file,import.meta.url);
    const source=fs.existsSync(archive)?archive:new URL('../'+file,import.meta.url);
    assert.equal(createHash('sha256').update(fs.readFileSync(source)).digest('hex'),hash,`Historical calibration source changed: ${file}`);
  }
  assert.deepEqual(study.shards.map(r=>r.Worker).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
  const c=study.configuration,growth=1+c.Multiplier/100*(c.DoorBag.reduce((a,b)=>a+b,0)/c.DoorBag.length-1);
  const floors=[1,0,0,0,0,0],zeroSeedPot=[0];
  for(let moves=1;moves<=25;moves++){
    zeroSeedPot[moves]=growth*zeroSeedPot[moves-1]+c.Coin/100*c.CoinCents*floors.reduce((s,p,i)=>s+p*(i+1),0);
    const before=[...floors];for(let i=0;i<6;i++)floors[i]=before[i]*(i===5?1:1-c.Stairs/100)+(i?before[i-1]*c.Stairs/100:0);
  }
  for(const r of study.shards){
    assert.equal(r.Rounds,125000000);assert.equal(r.Target,r.Rounds);assert.equal(r.ConfigId,c.Id);
    assert.ok(r.RandomCalls>0&&r.RandomCalls<2**64);assert.ok(r.Bonuses<=r.Rounds);
    assert.equal(r.TierCents.reduce((s,n)=>s+BigInt(n),0n),BigInt(r.BaseCents));
    assert.equal(r.PrizeCounts.reduce((s,n)=>s+n,0),r.BonusMoves);
    assert.equal(r.StageCounts.reduce((s,n)=>s+n,0),r.FreeStages);
    assert.equal(r.BonusByMoves.reduce((s,n)=>s+n,0),r.Bonuses);
    assert.equal(r.BonusByMoves.reduce((s,n,i)=>s+n*i,0),r.BonusMoves);
    assert.equal(r.BonusSeedCentsByMoves.length,26);
    const conditional=r.BonusByMoves.reduce((s,count,moves)=>s+count*zeroSeedPot[moves]+r.BonusSeedCentsByMoves[moves]*(growth**moves-1),0);
    assert.ok(Math.abs(conditional-r.ExpectedBonusCents)<1e-7*Math.max(1,conditional));
  }
  for(const[key,value]of Object.entries(aggregate(study.shards)))assert.deepEqual(study.summary[key],value,key);
  const s=study.summary;
  assert.equal(BigInt(s.total.cents),BigInt(s.base.cents)+BigInt(s.bonus.cents));
  assert.equal(s.truncatedChains,0);
  assert.ok(s.base.rtpPercent>=50&&s.base.rtpPercent<=60);
  assert.ok(s.bonus.rtpPercent>=36&&s.bonus.rtpPercent<=46);
  assert.ok(Math.abs(s.total.rtpPercent-96)<.2);
  assert.ok(s.total.standardErrorPercentagePoints<.1);
  assert.ok(s.tierGroups[0]>s.tierGroups[1]&&s.tierGroups[1]>s.tierGroups[2]);
});
