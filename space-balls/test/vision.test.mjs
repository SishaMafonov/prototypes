import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../tools/cv-test-tool/vision/evaluate.ts';
import { ManualRunner } from '../tools/cv-test-tool/vision/manual-runner.ts';
import { cv,manifest,requirement,assets,planetSample,fixtureSamples,observation } from './vision-fixtures.mjs';
const art=assets();after(()=>art.dispose());
test('real OpenCV matches all configured planet slots and right-side mirrors',()=>{
  const result=analyze(cv,art,manifest.defaults,requirement('V-ART-01'),[planetSample(art)]);
  assert.equal(result.status,'PASSED',JSON.stringify(result.evidence));
});
test('missing or wrong artwork fails instead of receiving a synthetic pass',()=>{
  for(const options of [{missing:'0:Jupiter'},{wrong:'0:Earth'},{flipRight:false}]){
    const result=analyze(cv,art,manifest.defaults,requirement('V-ART-01'),[planetSample(art,options)]);
    assert.equal(result.status,'FAILED',JSON.stringify(result.evidence));
  }
});
test('obscured masks, wrong stage, invalid buffers, and insufficient time give NA',()=>{
  let sample=planetSample(art,{occlusions:[{x:0,y:0,width:960,height:540}]});
  assert.equal(analyze(cv,art,manifest.defaults,requirement('V-ART-01'),[sample]).status,'NA');
  sample=planetSample(art);sample.observation.stage='S-PICK';
  assert.equal(analyze(cv,art,manifest.defaults,requirement('V-ART-01'),[sample]).status,'NA');
  sample=planetSample(art);sample.screenshot.imageData.data=new Uint8ClampedArray(0);
  assert.equal(analyze(cv,art,manifest.defaults,requirement('V-GEO-01'),[sample]).status,'NA');
  assert.equal(analyze(cv,art,manifest.defaults,requirement('V-TOOL-05'),fixtureSamples().slice(0,1)).status,'NA');
});
test('actual HSV/contour operators pass moving fixture and fail stationary/missing-swatch negatives',()=>{
  for(const [options,status]of [[{},'PASSED'],[{moving:false},'FAILED'],[{swatches:false},'FAILED']]){
    const result=analyze(cv,art,manifest.defaults,requirement('V-TOOL-05'),fixtureSamples(options));
    assert.equal(result.status,status,JSON.stringify(result.evidence));
  }
});
const frameRequirement={...requirement('V-GEO-01'),id:'V-GEO-01',checks:[{op:'frame'}]};
function runner(capture,context=()=>observation({story:'motion',stage:'FIXTURE'})){
  return new ManualRunner({requirements:[{...frameRequirement,story:'motion'}],defaults:manifest.defaults,
    prepare:Promise.resolve({cv,assets:art}),capture,context,changed(){}});
}
test('runner invokes capture within activation scope, locks overlap, and retains evidence',async()=>{
  let resolve,calls=0;const run=runner(()=>{calls++;return new Promise(done=>{resolve=done;});});
  await run.ready;const pending=run.run(['V-GEO-01']);assert.equal(calls,1);
  await assert.rejects(run.run(['V-GEO-01']),/already in progress/);
  resolve(fixtureSamples());const [result]=await pending;
  assert.equal(result.status,'PASSED');assert.equal(run.busy,false);assert.equal(run.results.get(result.id).status,'PASSED');
  run.reset();assert.equal(run.results.get(result.id).status,'NA');
});
test('permission failure and canceled acquisition produce NA and release busy state',async()=>{
  const denied=runner(async()=>{throw new Error('Permission denied');});await denied.ready;
  assert.equal((await denied.run(['V-GEO-01']))[0].status,'NA');assert.equal(denied.busy,false);
  let resolve;const canceled=runner(()=>new Promise(done=>{resolve=done;}));await canceled.ready;
  const pending=canceled.run(['V-GEO-01']);canceled.cancel();resolve(fixtureSamples());
  const [result]=await pending;assert.equal(result.status,'NA');assert.match(result.reason,/canceled/);assert.equal(canceled.busy,false);
});
test('another story and unsupported acquisition never open a capture picker',async()=>{
  let calls=0;const run=runner(async()=>{calls++;return fixtureSamples();},()=>observation());await run.ready;
  assert.equal((await run.run(['V-GEO-01']))[0].status,'NA');assert.equal(calls,0);
  await assert.rejects(run.run(['unknown']),/Unknown requirement/);
});

test('long requirements collect successive bursts using actual capture timestamps',async()=>{
  let calls=0;
  const run=new ManualRunner({requirements:[{...frameRequirement,story:'motion',durationMs:4200}],defaults:manifest.defaults,
    prepare:Promise.resolve({cv,assets:art}),context:()=>observation({story:'motion',stage:'FIXTURE'}),changed(){},
    capture:async()=>{const start=calls++*1000;return fixtureSamples().map(sample=>({
      ...sample,screenshot:{...sample.screenshot,timestampMs:sample.screenshot.timestampMs+start}
    }));}});
  await run.ready;
  assert.equal((await run.run(['V-GEO-01']))[0].status,'PASSED');
  assert.equal(calls,5);assert.equal(run.busy,false);
});

test('phase changes produce NA and a suite preserves previously evaluated other-stage rows',async()=>{
  const changed=fixtureSamples();changed.at(-1).observation.stage='S-PLAY';
  const run=runner(async()=>changed);await run.ready;
  assert.equal((await run.run(['V-GEO-01']))[0].status,'NA');
  assert.match(run.results.get('V-GEO-01').reason,/Stage changed/);
  const requirements=[{...frameRequirement,id:'V-A',story:'motion',stages:['FIXTURE']},
    {...frameRequirement,id:'V-B',story:'motion',stages:['OTHER']}];
  let stage='FIXTURE';
  const mixed=new ManualRunner({requirements,defaults:manifest.defaults,prepare:Promise.resolve({cv,assets:art}),
    context:()=>observation({story:'motion',stage}),changed(){},
    capture:async()=>fixtureSamples().map(s=>({...s,observation:{...s.observation,stage}}))});
  await mixed.ready;await mixed.run(['V-A','V-B']);
  assert.equal(mixed.results.get('V-A').status,'PASSED');assert.equal(mixed.results.get('V-B').status,'NA');
  const first=mixed.results.get('V-A');stage='OTHER';await mixed.run(['V-A','V-B']);
  assert.equal(mixed.results.get('V-A'),first);assert.equal(mixed.results.get('V-B').status,'PASSED');
});
