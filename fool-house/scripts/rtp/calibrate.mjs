import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config } from './config.mjs';
import { aggregate } from './report.mjs';

// Exploratory profiles are separate from the frozen, held-out paid-chain validation.
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i<0?undefined:i),i<0?true:a.slice(i+1)];}));
if(!args.profiles||!args.dir)throw Error('Required: --profiles=profiles.json --dir=new-output-directory');
const rounds=Number(args.rounds??1000000),workers=Number(args.workers??4),seed=Number(args.seed??20261107);
if(!Number.isSafeInteger(rounds)||rounds<2||!Number.isInteger(workers)||workers<1)throw Error('Invalid rounds/workers');
const directory=path.resolve(args.dir);fs.mkdirSync(directory,{recursive:true});
if(fs.existsSync(path.join(directory,'profiles.json')))throw Error('Search directory already used');
const profiles=JSON.parse(fs.readFileSync(args.profiles,'utf8'));
fs.writeFileSync(path.join(directory,'profiles.json'),JSON.stringify(profiles,null,2));
const engine=path.resolve(args.engine??(process.platform==='win32'?'.rtp-runs/native.exe':'.rtp-runs/native'));
let cursor=0;const results=[];
async function worker(){while(cursor<profiles.length){
 const index=cursor++,profile=profiles[index],cfg=config({...profile,seed});
 const file=path.join(directory,`config-${index}.json`);fs.writeFileSync(file,JSON.stringify(cfg,null,2));
 const record=await new Promise((resolve,reject)=>{
  const child=spawn(engine,[`--config=${file}`,`--rounds=${rounds}`,`--batch=${rounds}`],{windowsHide:true});let stdout='',stderr='';
  child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);
  child.on('exit',code=>code?reject(Error(stderr)):resolve(JSON.parse(stdout.trim().split(/\r?\n/).at(-1))));
 });
 const summary=aggregate([record]);const result={index,profile,configuration:cfg,summary,record};results.push(result);
 fs.writeFileSync(path.join(directory,`result-${index}.json`),JSON.stringify(result,null,2));
 console.log(JSON.stringify({index,profile,base:summary.base.rtpPercent,bonus:summary.bonus.rtpPercent,total:summary.total.rtpPercent,conditional:summary.conditionalExpectedTotalRtpPercent,conditionalSE:summary.conditionalStandardErrorPercentagePoints,bonuses:summary.bonuses,seconds:record.Seconds}));
}}
await Promise.all(Array.from({length:Math.min(workers,profiles.length)},worker));
results.sort((a,b)=>a.index-b.index);fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify({purpose:'exploratory only; excluded from held-out validation',roundsPerProfile:rounds,seed,results},null,2));
