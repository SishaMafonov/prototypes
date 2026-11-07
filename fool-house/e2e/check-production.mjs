import fs from 'node:fs';
import assert from 'node:assert/strict';
const files=fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js'));
assert.ok(files.length,'Build production assets first');
for(const file of files)assert.ok(!fs.readFileSync('dist/assets/'+file,'utf8').includes('__foolHouseTest'),`Test observer leaked into production: ${file}`);
console.log('Production bundle contains no E2E observer.');
