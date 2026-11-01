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
fs.mkdirSync('.rtp-runs',{recursive:true});fs.writeFileSync('.rtp-runs/verify-config.json',JSON.stringify(config({keepScatters,weights})));
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
        awarded=true;let state=createBonusState(getScatterBonusMoves(board));while(state.completedSteps<state.totalSteps)state=applyBonusPrize(state,drawBonusPrize(random));bonus+=state.totalWinCents;
      }
    };
    while(true){
      assert.ok(++evals<=1000000);
      board=revealMysteries(board,room,random).board;
      if(!bonusAtChainEnd)awardScatterBonus();
      const groups=findWins(board,getMultiplier(respin));
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
  const {BONUS_WEIGHTS:weights,BONUS_MULTIPLIERS:bag,BONUS_COIN_CENTS:coinCents}=await import('../../src/bonus.ts');
  const floors=[1,0,0,0,0,0],pot=[0];const growth=1+weights.multiplier/100*(bag.reduce((s,m)=>s+m,0)/bag.length-1);
  for(let n=1;n<=25;n++){
    pot[n]=pot[n-1]*growth+weights.coin/100*coinCents*floors.reduce((s,p,i)=>s+p*(i+1),0);
    const old=[...floors];for(let i=0;i<6;i++)floors[i]=old[i]*(i===5?1:1-weights.stairs/100)+(i?old[i-1]*weights.stairs/100:0);
  }
  assert.ok(Math.abs(pot[1]-35)<1e-12);assert.ok(Math.abs(pot[2]-92.75)<1e-12);
  const reconstructed=expected.BonusByMoves.reduce((s,count,moves)=>s+count*pot[moves],0);
  assert.ok(Math.abs(reconstructed-expected.ExpectedBonusCents)<1e-7*Math.max(1,reconstructed));
}
console.log(JSON.stringify({checkpointResumeMatchesUninterruptedRun:true,conditionalBonusHistogramVerified:!!expected.BonusByMoves}));
