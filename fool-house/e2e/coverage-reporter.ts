import fs from 'node:fs';
import type { Reporter } from '@playwright/test/reporter';
import MCR from 'monocart-coverage-reports';

export default class CoverageReporter implements Reporter {
  async onEnd() {
    if(process.env.E2E_COVERAGE!=='1')return;
    try { return await this.generate(); }
    catch(error) { console.error(error); return {status:'failed' as const}; }
  }
  private async generate() {
    const report=MCR({name:'Fool House browser coverage',outputDir:'coverage/e2e/report',reports:['v8','v8-json','console-summary'],
      entryFilter:(entry)=>/\/assets\/.*\.js(?:\?|$)/.test(entry.url),
      sourceFilter:(source)=>/src\/(main|game|bonus|bonus-scene|scene)\.ts$/.test(source.replaceAll('\\','/')),
      sourcePath:(source)=>source.replaceAll('\\','/').replace(/^.*?\bsrc\//,'src/'),
    });
    const files=fs.existsSync('coverage/e2e/raw')?fs.readdirSync('coverage/e2e/raw').filter(f=>f.endsWith('.json')):[];
    if(!files.length)throw Error('Browser coverage requested but no test data was collected');
    for(const file of files)await report.add(JSON.parse(fs.readFileSync('coverage/e2e/raw/'+file,'utf8')));
    const result=await report.generate();
    if(!result)throw Error('Browser coverage report is empty');
    const reported=new Set(result.files?.map(file=>file.sourcePath));
    for(const file of ['src/main.ts','src/game.ts','src/bonus.ts','src/bonus-scene.ts','src/scene.ts'])if(!reported.has(file))throw Error(`Missing application coverage: ${file}`);
    fs.writeFileSync('coverage/e2e/summary.json',JSON.stringify(result.summary,null,2));
    // Initial gates are reviewed against the whole functional+visual matrix, not a single smoke test.
    const thresholds={lines:80,functions:80,branches:65} as const;
    for(const metric of Object.keys(thresholds) as (keyof typeof thresholds)[])if(!Number.isFinite(Number(result.summary[metric].pct))||Number(result.summary[metric].pct)<thresholds[metric])throw Error(`E2E ${metric} coverage ${result.summary[metric].pct}% < ${thresholds[metric]}%`);
  }
}
