import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { config } from './config.mjs';
import { makeRandom } from './random.mjs';
import { clearForFloor, generateBoard, findWins, applyRoomMultipliers, collectWins, removeWins, refillBoard, refillForRoom, revealMysteries, shouldContinueRoom, isCollectionComplete, getScatterBonusMoves, getMultiplier, SYMBOL_WEIGHTS, PRE_MYSTERY_WEIGHTS } from '../../src/game.ts';
import { createBonusState, applyBonusPrize, drawBonusPrize } from '../../src/bonus.ts';

const rounds=Number(process.argv[2]??10000);
const keepScatters=!process.argv.includes('--legacy');
const bonusAtChainEnd=keepScatters;
const weights=keepScatters?SYMBOL_WEIGHTS:PRE_MYSTERY_WEIGHTS;
const defaultEngine=process.platform==='win32'?'.rtp-runs/native.exe':'.rtp-runs/native';
const cfg=config({keepScatters,weights,bonusFloorDoubling:keepScatters&&!process.argv.includes('--floor-prizes=legacy')});
const doorWeights={coin:cfg.Coin,multiplier:cfg.Multiplier,stairs:cfg.Stairs,ghost:cfg.Ghost};
const paytable=Object.fromEntries(['low','mid','high'].map((tier,i)=>[tier,Object.fromEntries([5,6,7].map((n,j)=>[n,cfg.Pay[i][j]]))]));
fs.mkdirSync('.rtp-runs',{recursive:true});fs.writeFileSync('.rtp-runs/verify-config.json',JSON.stringify(cfg));
let verified=0;
for(const worker of [0,1,7]) {
  const native=spawnSync(process.env.RTP_ENGINE??defaultEngine,['--config=.rtp-runs/verify-config.json',`--rounds=${rounds}`,`--worker=${worker}`,'--trace'],{encoding:'utf8',maxBuffer:50e6});
  assert.equal(native.status,0,native.stderr);const lines=native.stdout.trim().split(/\r?\n/);assert.equal(lines.length,rounds);
  const random=makeRandom(20261101,worker);let room=Math.floor(random()*5);if(!keepScatters)revealMysteries(generateBoard(random,weights),room,random);
  const other=()=>{const choice=Math.floor(random()*4);return choice>=room?choice+1:choice;};
  for(let round=0;round<rounds;round++){
    room=other();let board=generateBoard(random,weights),collected=new Set(),respin=0,awarded=false,base=0,bonus=0n,evals=0;
    const awardScatterBonus=()=>{
      if(!awarded&&getScatterBonusMoves(board)){
        awarded=true;let state=createBonusState(getScatterBonusMoves(board),cfg.BonusStartsWithRoundWin?BigInt(base):0n);while(state.completedSteps<state.totalSteps)state=applyBonusPrize(state,drawBonusPrize(random,doorWeights),!!cfg.BonusFloorDoubling);bonus+=state.totalWinCents-state.startingWinCents;
      }
    };
    while(true){
      assert.ok(++evals<=1000000);
      board=revealMysteries(board,room,random).board;
      if(!bonusAtChainEnd)awardScatterBonus();
      const groups=findWins(board,getMultiplier(respin),paytable);
      if(!groups.length){if(!shouldContinueRoom(collected,keepScatters?board:undefined)){if(bonusAtChainEnd)awardScatterBonus();break;}board=refillForRoom(keepScatters?clearForFloor(board):Array.from({length:5},()=>Array(5).fill(null)),collected,room,random,weights);continue;}
      const wins=applyRoomMultipliers(groups,room,random);base+=wins.reduce((s,w)=>s+w.winCents,0);board=removeWins(board,wins);collected=collectWins(collected,wins,room);
      if(isCollectionComplete(collected)){room=other();collected=new Set();if(!keepScatters)awarded=false;respin++;board=keepScatters?refillBoard(clearForFloor(board),random,weights):generateBoard(random,weights);}else board=refillForRoom(board,collected,room,random,weights);
    }
    const actual=[String(base),String(bonus),String(room),...random.state().map(String)].join(',');
    assert.equal(lines[round],actual,`worker ${worker}, paid round ${round+1}`);verified++;
  }
}
console.log(JSON.stringify({verifiedPaidRounds:verified,workers:[0,1,7],exactRoundCreditsRoomAndRngStateMatch:true}));
const engine=process.env.RTP_ENGINE??defaultEngine;
const direct=spawnSync(engine,['--config=.rtp-runs/verify-config.json','--rounds=20000','--batch=10000'],{encoding:'utf8'});
assert.equal(direct.status,0,direct.stderr);
const records=direct.stdout.trim().split(/\r?\n/).map(JSON.parse);
fs.writeFileSync('.rtp-runs/verify-resume.json',JSON.stringify(records[0]));
const resumed=spawnSync(engine,['--config=.rtp-runs/verify-config.json','--rounds=20000','--batch=10000','--out=.rtp-runs/verify-resume.json','--resume'],{encoding:'utf8'});
assert.equal(resumed.status,0,resumed.stderr);
const actual=JSON.parse(fs.readFileSync('.rtp-runs/verify-resume.json','utf8')),expected=records[1];
delete actual.Seconds;delete expected.Seconds;assert.deepEqual(actual,expected,'Resume must preserve exact payouts, RNG and all counters');
if(keepScatters)assert.ok(expected.Bonuses<=expected.Rounds,'At most one bonus per paid chain');
if(expected.BonusByMoves){
  const weights=doorWeights,bag=cfg.DoorBag,coinCents=cfg.CoinCents;
  const pot=[0],seedGrowth=[0],mean=bag.reduce((s,m)=>s+m,0)/bag.length,ps=weights.stairs/100,pm=weights.multiplier/100;
  let a=Array(cfg.FloorCap).fill(1),b=Array(cfg.FloorCap).fill(0);
  for(let n=1;n<=25;n++){
    const oldA=a,oldB=b;
    a=oldA.map((v,f)=>{const factor=cfg.BonusFloorDoubling?2**f:1;return (1-ps+pm*(mean*factor-1))*v+ps*oldA[Math.min(f+1,cfg.FloorCap-1)];});
    b=oldB.map((v,f)=>(1-ps)*v+ps*oldB[Math.min(f+1,cfg.FloorCap-1)]+weights.coin/100*coinCents*(cfg.BonusFloorDoubling?2**f:f+1)*oldA[f]);
    pot[n]=b[0];seedGrowth[n]=a[0]-1;
  }
  assert.ok(Math.abs(pot[1]-weights.coin/100*coinCents)<1e-12);
  if(!keepScatters){assert.ok(Math.abs(pot[1]-35)<1e-12);assert.ok(Math.abs(pot[2]-92.75)<1e-12);}
  const reconstructed=expected.BonusByMoves.reduce((s,count,moves)=>s+count*pot[moves]+(expected.BonusSeedCentsByMoves?.[moves]??0)*seedGrowth[moves],0);
  assert.ok(Math.abs(reconstructed-expected.ExpectedBonusCents)<1e-7*Math.max(1,reconstructed));
}
console.log(JSON.stringify({checkpointResumeMatchesUninterruptedRun:true,conditionalBonusHistogramVerified:!!expected.BonusByMoves}));
