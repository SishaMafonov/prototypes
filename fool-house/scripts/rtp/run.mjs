import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { config } from './config.mjs';
import { aggregate } from './report.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return [a.slice(2,i<0?undefined:i),i<0?true:a.slice(i+1)];}));
const rounds=Number(args.rounds??10000000000),workers=Number(args.workers??8),batch=Number(args.batch??10000000);
if(!Number.isSafeInteger(rounds)||rounds<2||!Number.isInteger(workers)||workers<1||workers>64||!Number.isSafeInteger(batch)||batch<1)throw Error('Invalid rounds/workers/batch');
const directory=path.resolve(args.dir??'.rtp-runs/validation');fs.mkdirSync(directory,{recursive:true});
if(!args.resume&&fs.existsSync(path.join(directory,'manifest.json')))throw Error('Run directory already exists; choose another --dir or use --resume');
const engine=path.resolve(args.engine??(process.platform==='win32'?'.rtp-runs/native.exe':'.rtp-runs/native'));
const cfg=args.config?JSON.parse(fs.readFileSync(args.config,'utf8')):config({seed:Number(args.seed??20261102)});
const configPath=path.join(directory,'config.json');
if(args.resume&&fs.existsSync(configPath)&&JSON.parse(fs.readFileSync(configPath,'utf8')).Id!==cfg.Id)throw Error('Frozen configuration mismatch');
fs.writeFileSync(configPath,JSON.stringify(cfg,null,2));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources=['src/game.ts','src/bonus.ts','scripts/rtp/simulator.cpp','scripts/rtp/config.mjs','scripts/rtp/random.mjs','scripts/rtp/verify.mjs','scripts/rtp/run.mjs','scripts/rtp/report.mjs'];
const manifestPath=path.join(directory,'manifest.json');
const manifest=args.resume&&fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{startedAt:new Date().toISOString(),command:process.argv.slice(2),nodeVersion:process.version,requestedPaidRounds:rounds,workers,checkpointPaidRounds:batch,configuration:cfg,engineSha256:hash(engine),sourceSha256:Object.fromEntries(sources.map(s=>[s,hash(s)])),platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model,prng:'xoshiro128** 1.1; worker i = jump^i(seed), 2^64 calls apart',complete:false};
if(manifest.requestedPaidRounds!==rounds||manifest.workers!==workers||manifest.engineSha256!==hash(engine))throw Error('Run manifest mismatch');
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
const children=[];let failed=false;
function snapshot(){
 const records=[];for(let i=0;i<workers;i++){const file=path.join(directory,`worker-${i}.json`);if(fs.existsSync(file))records.push(JSON.parse(fs.readFileSync(file,'utf8')));}
 const summary={updatedAt:new Date().toISOString(),...aggregate(records),workersReported:records.length};
 fs.writeFileSync(path.join(directory,'progress.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify({at:summary.updatedAt,rounds:summary.paidRounds,percent:100*summary.paidRounds/rounds,base:summary.base?.rtpPercent,bonus:summary.bonus?.rtpPercent,total:summary.total?.rtpPercent}));return {summary,records};
}
const timer=setInterval(()=>{try{snapshot();}catch(e){console.error('Checkpoint between writes; retry next interval:',e.message);}},30000);
try{
 await Promise.all(Array.from({length:workers},(_,i)=>new Promise((resolve,reject)=>{
  const count=Math.floor(rounds/workers)+(i<rounds%workers?1:0),output=path.join(directory,`worker-${i}.json`);
  if(args.resume&&fs.existsSync(output)&&JSON.parse(fs.readFileSync(output,'utf8')).Rounds===count){resolve();return;}
  const child=spawn(engine,[`--config=${configPath}`,`--rounds=${count}`,`--worker=${i}`,`--out=${output}`,`--batch=${batch}`,...(args.resume?['--resume']:[])],{windowsHide:true});children.push(child);
  child.on('spawn',()=>{try{os.setPriority(child.pid,os.constants.priority.PRIORITY_BELOW_NORMAL);}catch(e){console.error(`Worker ${i} priority unchanged: ${e.message}`);}});
  const log=fs.createWriteStream(path.join(directory,`worker-${i}.jsonl`),{flags:args.resume?'a':'w'});child.stdout.pipe(log);let stderr='';child.stderr.on('data',d=>{stderr+=d;process.stderr.write(d);});
  child.on('error',reject);child.on('exit',code=>code?reject(Error(`Worker ${i} exited ${code}: ${stderr}`)):resolve());
 })));
 const {summary,records}=snapshot();if(summary.paidRounds!==rounds)throw Error('Incomplete paid-round count');
 if(records.some(r=>r.ConfigId!==cfg.Id||r.RandomCalls>=2**64))throw Error('Configuration/stream audit failed');
 for(const r of records){
  if(r.Rounds!==r.Target||r.TierCents.reduce((s,n)=>s+BigInt(n),0n)!==BigInt(r.BaseCents)||r.PrizeCounts.reduce((s,n)=>s+n,0)!==r.BonusMoves||r.StageCounts.reduce((s,n)=>s+n,0)!==r.FreeStages||r.BonusByMoves.reduce((s,n)=>s+n,0)!==r.Bonuses||r.BonusByMoves.reduce((s,n,i)=>s+n*i,0)!==r.BonusMoves)throw Error('Shard accounting audit failed');
 }
 manifest.complete=true;manifest.finishedAt=new Date().toISOString();const report={...manifest,summary,shards:records};
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(report,null,2));
 console.log(`COMPLETE: ${rounds.toLocaleString('en-US')} paid rounds, RTP ${summary.total.rtpPercent.toFixed(6)}%`);
}catch(e){failed=true;for(const child of children)child.kill();throw e;}finally{clearInterval(timer);if(failed)console.error('Validation incomplete; checkpoints preserved for --resume.');}
