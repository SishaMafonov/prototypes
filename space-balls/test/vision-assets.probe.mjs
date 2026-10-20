// Optional Windows PNG probe: node test/vision-assets.probe.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze } from '../tools/cv-test-tool/vision/evaluate.ts';
import { cv,manifest,requirement,planetSample } from './vision-fixtures.mjs';
const decoded=JSON.parse(execFileSync('pwsh',['-NoProfile','-File',
  fileURLToPath(new URL('../requirements/assets/decode.ps1',import.meta.url))],{encoding:'utf8',maxBuffer:64*1024**2}));
const owned=[],templates=new Map();
const own=mat=>{owned.push(mat);return mat;};
try {
  for(const config of manifest.templates){
    const entry=decoded.find(e=>e.id===config.id);
    const raw=own(cv.matFromArray(entry.height,entry.width,cv.CV_8UC4,Buffer.from(entry.rgba,'base64')));
    const rawMask=own(cv.matFromArray(entry.height,entry.width,cv.CV_8UC4,Buffer.from(entry.mask,'base64')));
    const gray=own(new cv.Mat()),mask=own(new cv.Mat());
    cv.cvtColor(raw,gray,cv.COLOR_RGBA2GRAY);cv.cvtColor(rawMask,mask,cv.COLOR_RGBA2GRAY);
    templates.set(config.id,{config,gray,mask});
  }
  const assets={templates,background:own(cv.Mat.zeros(540,960,cv.CV_8UC1))};
  for(const [options,status]of [[{},'PASSED'],[{missing:'0:Jupiter'},'FAILED'],[{flipRight:false},'FAILED']]){
    const result=analyze(cv,assets,manifest.defaults,requirement('V-ART-01'),[planetSample(assets,options)]);
    assert.equal(result.status,status,JSON.stringify(result.evidence));
    console.log('Actual PNG adapter '+JSON.stringify(options)+': '+status);
  }
  console.log('Planted real-art matches verified; live stream thresholds remain uncalibrated.');
}finally{owned.reverse().forEach(mat=>mat.delete());}
