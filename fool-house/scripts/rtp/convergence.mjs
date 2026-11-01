import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { aggregate } from './report.mjs';
const directory=path.resolve(process.argv[2]??'.rtp-runs/final-10b');
const output=process.argv[3]??path.join(directory,'convergence.csv');
const final=JSON.parse(fs.readFileSync(path.join(directory,'result.json'),'utf8'));
assert.equal(final.complete,true,'Convergence export requires a completed run');
const streams=Array.from({length:final.workers},(_,i)=>{
 const rows=fs.readFileSync(path.join(directory,`worker-${i}.jsonl`),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 const unique=new Map();
 for(const r of rows){
  assert.equal(r.ConfigId,final.configuration.Id);assert.equal(r.Worker,i);
  if(unique.has(r.Rounds)){
   const previous={...unique.get(r.Rounds)},current={...r};delete previous.Seconds;delete current.Seconds;
   assert.deepEqual(current,previous,'Resumed duplicate checkpoint must preserve its data');
  }
  unique.set(r.Rounds,r);
 }
 return unique;
});
const prefixes=[...streams[0].keys()].filter(n=>streams.every(s=>s.has(n))).sort((a,b)=>a-b);
const rows=prefixes.map(n=>aggregate(streams.map(s=>s.get(n))));
const last=rows.at(-1);
assert.equal(last.paidRounds,final.requestedPaidRounds);
assert.equal(last.total.cents,final.summary.total.cents);
assert.equal(last.total.rtpPercent,final.summary.total.rtpPercent);
const fields=['paid_rounds','base_rtp_percent','bonus_rtp_percent','total_rtp_percent','ci95_low','ci95_high','conditional_expected_total_rtp_percent'];
const csv=[fields.join(','),...rows.map(r=>[r.paidRounds,r.base.rtpPercent,r.bonus.rtpPercent,r.total.rtpPercent,...r.total.approximate95PercentInterval,r.conditionalExpectedTotalRtpPercent].join(','))].join('\n')+'\n';
fs.writeFileSync(output,csv);
console.log(JSON.stringify({output,checkpoints:rows.length,paidRounds:last.paidRounds}));
