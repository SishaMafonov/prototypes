import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArena } from '../src/match.ts';
import { createPlanetField } from '../src/planets.ts';

const directory = dirname(fileURLToPath(import.meta.url));
const project = resolve(directory, '..');
const read = path => readFileSync(path, 'utf8');
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}
const markdown = walk(directory).filter(path => path.endsWith('.md'));
const ids = new Set();
for (const path of markdown) {
  const content = read(path);
  assert.ok(content.trimEnd().split(/\r?\n/).length <= 100, path + ' exceeds 100 lines');
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1].split('#')[0];
    if (!href || /^https?:/.test(href)) continue;
    assert.ok(existsSync(resolve(dirname(path), decodeURIComponent(href))), path + ' broken link: ' + href);
  }
  const definitions = /(?:\*\*((?:C|I|V)-[A-Z]+-\d+)\*\*|^## (V-[A-Z]+-\d+))/gm;
  for (const match of content.matchAll(definitions)) {
    const id = match[1] ?? match[2];
    assert.ok(!ids.has(id), 'Duplicate requirement ID: ' + id);
    ids.add(id);
  }
}
for (const prefix of ['C-BOOT','C-PICK','C-COURT','C-PLANET','C-BALL','C-GOAL','C-MATCH',
  'C-HUD','C-RESULT','C-INPUT','C-AUDIO','C-HARNESS','C-FIXTURE','C-CAPTURE','C-CV','C-BUILD',
  'I-FLOW','I-PHYSICS','I-INPUT','I-TOOL','V-GEO','V-MENU','V-STAGE','V-ART','V-UI','V-RESP','V-TIME','V-TEXT','V-TOOL']) {
  assert.ok([...ids].some(id => id.startsWith(prefix + '-')), 'Missing coverage: ' + prefix);
}
const provenance = JSON.parse(read(join(directory, 'provenance.json')));
const catalog = JSON.parse(read(join(directory, 'catalog.json')));
assert.deepEqual(new Set(catalog.flatMap(record => record.ids)), ids, 'Requirement catalog drift');
for (const record of catalog) {
  const definitions = /(?:\*\*((?:C|I|V)-[A-Z]+-\d+)\*\*|^## (V-[A-Z]+-\d+))/gm;
  const actual = [...read(join(directory, record.path)).matchAll(definitions)].map(m => m[1] ?? m[2]);
  assert.deepEqual(record.ids, actual, 'Incorrect catalog topic mapping: ' + record.path);
}
const currentSources = ['src', 'tools', 'test', 'tests'].flatMap(name => walk(join(project, name)));
for (const name of ['GAME_RULES.md', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) {
  currentSources.push(join(project, name));
}
assert.deepEqual(new Set(currentSources.map(path => relative(project, path).replaceAll('\\', '/'))),
  new Set(Object.keys(provenance.sourceHashes)), 'New/removed source files need requirements review');
for (const [path, expected] of Object.entries(provenance.sourceHashes)) {
  assert.equal(sha(join(project, path)), expected, 'Source drift; review requirements: ' + path);
}
for (const [path, expected] of Object.entries(provenance.artifactHashes)) {
  assert.equal(sha(join(directory, path)), expected, 'Generated asset drift: ' + path);
}
const entries = JSON.parse(read(join(directory, 'assets/templates.json')));
for (const entry of entries) {
  assert.equal(sha(join(project, entry.source)), entry.sourceHash);
  for (const [path, expected] of [[entry.template, entry.templateHash], [entry.mask, entry.maskHash]]) {
    const png = readFileSync(join(directory, 'assets', path));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), entry.width);
    assert.equal(png.readUInt32BE(20), entry.height);
    assert.equal(sha(join(directory, 'assets', path)), expected);
  }
}
const profiles = JSON.parse(read(join(directory, 'assets/geometry.json')));
for (const profile of Object.values(profiles)) {
  const arena = createArena(profile.width, profile.height);
  assert.deepEqual(profile.arena, arena);
  assert.deepEqual(profile.planets, createPlanetField(arena));
}
console.log(markdown.length + ' Markdown files <=100 lines, ' + ids.size + ' unique requirement IDs.');
console.log('Links, source/artifact hashes, template PNG metadata, and geometry fixtures verified.');
