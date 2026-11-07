import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const args=process.argv.slice(2),coverage=args.includes('--coverage');
// Remove only known generated JSON files; preserve all baseline images and unrelated files.
if(coverage){fs.mkdirSync('coverage/e2e/raw',{recursive:true});for(const f of fs.readdirSync('coverage/e2e/raw'))if(f.endsWith('.json'))fs.unlinkSync('coverage/e2e/raw/'+f);}
const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test',...args.filter(a=>a!=='--coverage')],{stdio:'inherit',windowsHide:true,env:{...process.env,E2E_COVERAGE:coverage?'1':'0'}});
if(result.error)throw result.error;process.exitCode=result.status??1;
