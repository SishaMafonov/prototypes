import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { config } from './config.mjs';
import { MYSTERY_WEIGHT } from '../../src/game.ts';
const samples=Number(process.argv[2]??100000);
const candidates=[];
const fine=process.argv.includes('--fine');
const legacy=process.argv.includes('--legacy');
const mystery=legacy?0:MYSTERY_WEIGHT;
for(const low of (fine?[49,49.5,50]:[40,44,48,52,56]))for(const scatter of (fine?[7,7.25,7.5]:[3,5,7,9])){
  const left=100-low-scatter-mystery;const weights={low,mid:left*5/8,high:left*3/8,scatter,...(mystery?{mystery}:{})};
  if(weights.low>weights.mid)candidates.push(weights);
}
const folder=fine?'fine':'screen';
let cursor=0;const results=[];fs.mkdirSync(`.rtp-runs/${folder}`,{recursive:true});
async function worker(){while(cursor<candidates.length){const i=cursor++,weights=candidates[i],file=`.rtp-runs/${folder}/${i}.json`;fs.writeFileSync(file,JSON.stringify(config({weights,keepScatters:!legacy})));
  const result=await new Promise((resolve,reject)=>{const child=spawn(process.env.RTP_ENGINE??(process.platform==='win32'?'.rtp-runs/native.exe':'.rtp-runs/native'),[`--config=${file}`,`--rounds=${samples}`,`--batch=${samples}`],{windowsHide:true});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('exit',code=>code?reject(Error(stderr)):resolve(JSON.parse(stdout.trim().split(/\r?\n/).at(-1))));});
  const base=Number(result.BaseCents)/samples,bonus=Number(result.BonusCents)/samples;
  const r={weights,rounds:samples,base,bonus,total:base+bonus,seconds:result.Seconds};results.push(r);console.log(JSON.stringify(r));
}}
await Promise.all(Array.from({length:4},worker));fs.writeFileSync(`.rtp-runs/${folder}/results.json`,JSON.stringify(results,null,2));
