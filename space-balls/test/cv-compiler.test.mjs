import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDocument,compileDocuments,compileProject,writeProject } from '../tools/compile-cv-requirements.mjs';
const doc=(mapping)=>parseDocument('## V-DEMO-01 — example\nHuman visual requirement.\n```cv-config\n'+JSON.stringify(mapping)+'\n```','visual/example.md');
const valid={id:'V-DEMO-01',stages:['S-PICK'],checks:[{op:'frame'}],scope:'Pixel validation'};
test('compiler emits source-traceable visual configs and separate nonvisual exclusions',()=>{
  const compiled=compileProject();
  assert.equal(compiled.requirements.length,34);
  assert.equal(compiled.suites.length,3);
  assert.ok(compiled.skipped.some(r=>r.id==='V-TEXT-01'));
  assert.ok(compiled.skipped.some(r=>r.id==='C-CV-01'));
  const art=compiled.requirements.find(r=>r.id==='V-ART-01');
  assert.equal(art.checks[0].op,'planets');
  assert.match(art.source.sha256,/^[a-f0-9]{64}$/);
  assert.equal(compiled.templates[0].maskMat.type,'CV_8UC1');
  writeProject(compiled,undefined,true);
});
test('every visual definition must be mapped exactly once',()=>{
  assert.throws(()=>compileDocuments([doc([])],[],{}),/needs mapping/);
  assert.throws(()=>compileDocuments([doc([valid,valid])],[],{}),/Duplicate\/invalid mapping/);
  assert.throws(()=>compileDocuments([doc([{...valid,id:'V-UNKNOWN-01'}])],[],{}),/Unknown requirement/);
});
test('invalid operators, stages, durations, and panel targets fail compilation',()=>{
  for(const mapping of [{...valid,checks:[{op:'eval'}]},{...valid,stages:['invented']},
    {...valid,durationMs:10000},{...valid,checks:[{op:'panel',target:'unknown'}]}]){
    assert.throws(()=>compileDocuments([doc([mapping])],[],{}));
  }
  assert.throws(()=>parseDocument('```cv-config\nnot json\n```','bad.md'));
});
test('functional exclusions are explicit rather than a passing no-op',()=>{
  const result=compileDocuments([doc([{id:valid.id,exclude:'Use E2E for exact copy.'}])],[],{});
  assert.equal(result.requirements.length,0);
  assert.equal(result.skipped[0].reason,'Use E2E for exact copy.');
});
test('generated-output check detects altered and obsolete configs',()=>{
  const root=mkdtempSync(join(tmpdir(),'cv-config-'));
  const result={output:new Map([['manifest.json','{}\n']])};
  try{
    writeProject(result,root);writeProject(result,root,true);
    writeFileSync(join(root,'tools/cv-test-tool/generated/manifest.json'),'changed');
    assert.throws(()=>writeProject(result,root,true),/stale/);
    writeProject(result,root);
    assert.equal(readFileSync(join(root,'tools/cv-test-tool/generated/manifest.json'),'utf8'),'{}\n');
    writeFileSync(join(root,'tools/cv-test-tool/generated/obsolete.json'),'{}');
    assert.throws(()=>writeProject(result,root,true),/Obsolete/);
    writeProject(result,root);writeProject(result,root,true);
  }finally{rmSync(root,{recursive:true,force:true});}
});
