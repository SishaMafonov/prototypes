import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArena } from '../../src/match.ts';
import { createPlanetField, planetNames, planetDefinitions } from '../../src/planets.ts';

const assets = dirname(fileURLToPath(import.meta.url));
const project = join(assets, '../..');
const requirements = join(assets, '..');
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
for (const directory of ['templates', 'mockups']) mkdirSync(join(assets, directory), { recursive: true });
const profiles = {};
for (const [name, width, height] of [['landscape', 960, 540], ['portrait', 390, 844], ['short', 844, 390]]) {
  const arena = createArena(width, height);
  profiles[name] = { width, height, arena, planets: createPlanetField(arena) };
}
const entries = planetNames.map((name, index) => ({
  id: 'planet-' + name.toLowerCase(), source: 'src/assets/planets.png',
  sourceRect: [543 * index, 0, 543, 724], width: 543, height: 724,
  bodyCenter: [planetDefinitions[name].body.x, planetDefinitions[name].body.y],
  bodyRadius: planetDefinitions[name].body.diameter / 2,
  gameAspect: 543 / 724, sourceHash: sha(join(project, 'src/assets/planets.png')),
}));
entries.push({ id: 'asteroid', source: 'src/assets/ball.png',
  sourceRect: [248, 156, 912, 880], width: 912, height: 880,
  bodyCenter: [456, 440], bodyRadius: 440, gameAspect: 1,
  sourceHash: sha(join(project, 'src/assets/ball.png')) });
for (const entry of entries) {
  entry.template = 'templates/' + entry.id + '.png';
  entry.mask = 'templates/' + entry.id + '-mask.png';
  entry.maskPolicy = { minAlpha: 250, radiusFactor: 0.7, format: 'RGB binary PNG; convert to CV_8UC1' };
}
const rows = value => JSON.stringify(value);
writeFileSync(join(assets, 'geometry.json'), '{\n' + Object.entries(profiles).map(([key, value]) =>
  '  ' + JSON.stringify(key) + ': ' + rows(value)).join(',\n') + '\n}\n');
writeFileSync(join(assets, 'templates.json'), '[\n' + entries.map(e => '  ' + rows(e)).join(',\n') + '\n]\n');
for (const script of ['render.ps1', 'mockups.ps1']) {
  execFileSync('pwsh', ['-NoProfile', '-File', join(assets, script)], { cwd: project, stdio: 'inherit' });
}
for (const entry of entries) {
  entry.templateHash = sha(join(assets, entry.template));
  entry.maskHash = sha(join(assets, entry.mask));
}
writeFileSync(join(assets, 'templates.json'), '[\n' + entries.map(e => '  ' + rows(e)).join(',\n') + '\n]\n');
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const sourcePaths = ['src', 'tools', 'test', 'tests'].flatMap(name => walk(join(project, name)));
for (const name of ['GAME_RULES.md', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) {
  sourcePaths.push(join(project, name));
}
const sourceHashes = Object.fromEntries(sourcePaths.sort().map(path =>
  [relative(project, path).replaceAll('\\', '/'), sha(path)]));
const generated = walk(assets).filter(path => path.endsWith('.png'));
const artifactHashes = Object.fromEntries(generated.sort().map(path =>
  [relative(requirements, path).replaceAll('\\', '/'), sha(path)]));
const git = args => execFileSync('git', args, { cwd: project, encoding: 'utf8' }).trim();
const catalog = walk(requirements).filter(path => path.endsWith('.md')).sort().map(path => {
  const content = readFileSync(path, 'utf8');
  const definitions = /(?:\*\*((?:C|I|V)-[A-Z]+-\d+)\*\*|^## (V-[A-Z]+-\d+))/gm;
  const ids = [...content.matchAll(definitions)].map(match => match[1] ?? match[2]);
  return { path: relative(requirements, path).replaceAll('\\', '/'), ids };
}).filter(record => record.ids.length);
writeFileSync(join(requirements, 'catalog.json'), '[\n' + catalog.map(e => '  ' + rows(e)).join(',\n') + '\n]\n');
const provenance = {
  schemaVersion: 1, repositoryCommit: git(['rev-parse', 'HEAD']),
  workingTreeDirty: Boolean(git(['status', '--porcelain', '--', '.'])),
  generatedAt: new Date().toISOString(), description: 'Reviewed implementation snapshot; not an approved baseline',
  sourceHashes, artifactHashes,
};
writeFileSync(join(requirements, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log('Generated ' + entries.length + ' template/mask pairs and ' + generated.length + ' PNG artifacts.');
