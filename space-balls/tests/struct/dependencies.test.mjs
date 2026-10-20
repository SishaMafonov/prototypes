import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAcyclic, contract, moduleGraph, reachable, read, source, nodes, name } from './graph.mjs';

const graph = moduleGraph();
const dependencies = path => new Set(graph.get(path).map(edge => edge.to));

test(contract(['C-BUILD-03'], 'game runtime stays inside game modules and local art'), () => {
  const game = reachable(graph, 'src/main.ts');
  for (const path of game) assert.ok(path.startsWith('src/'), `Game reaches tool/package: ${path}`);
  for (const path of ['src/match.ts', 'src/planets.ts', 'src/goals.ts', 'src/microphone.ts']) {
    assert.ok(game.has(path), `Game no longer reaches ${path}`);
  }
  for (const leaf of ['src/goals.ts', 'src/planets.ts', 'src/microphone.ts']) {
    assert.equal(dependencies(leaf).size, 0, `${leaf} must remain independent at runtime`);
  }
  assert.deepEqual(dependencies('src/match.ts'), new Set(['src/goals.ts', 'src/planets.ts']));
});

test(contract(['C-BOOT-02'], 'all four game artwork nodes are local import dependencies'), () => {
  const edges = dependencies('src/main.ts');
  for (const file of ['background.png', 'planets.png', 'ball.png', 'ball_tail.png']) {
    assert.ok(edges.has(`src/assets/${file}`), `Missing artwork edge: ${file}`);
  }
});

test(contract(['C-CV-01', 'C-CV-02', 'C-BUILD-03'], 'pinned CV package is behind a lazy ESM adapter'), () => {
  const tool = 'tools/cv-test-tool/main.ts';
  assert.ok(reachable(graph, tool).has('@techstark/opencv-js'));
  assert.ok(!reachable(graph, tool, false).has('@techstark/opencv-js'), 'CV became eagerly imported');
  assert.deepEqual(graph.get('tools/opencv.mjs').map(e => [e.to, e.kind]), [['tools/opencv-runtime.mjs', 'lazy']]);
  assert.deepEqual(dependencies('tools/opencv-runtime.mjs'), new Set(['@techstark/opencv-js']));
  assert.equal(JSON.parse(read('package.json')).devDependencies['@techstark/opencv-js'], '5.0.0-release.1');
});

test(contract(['C-HARNESS-01', 'C-FIXTURE-01', 'I-TOOL-01'], 'workspace, game, and motion have separate entry graphs'), () => {
  const workspace = reachable(graph, 'tools/cv-test-tool/main.ts');
  for (const path of workspace) {
    assert.ok(!/^src\/.*\.ts$/.test(path), `Workspace imports game logic: ${path}`);
  }
  const fixture = reachable(graph, 'tools/cv-test-tool/fixtures/motion.ts');
  assert.deepEqual(fixture, new Set(['tools/cv-test-tool/fixtures/motion.ts']));
  for (const [html, entry] of [
    ['index.html', '/src/main.ts'],
    ['tools/cv-test-tool/index.html', './main.ts'],
    ['tools/cv-test-tool/fixtures/motion.html', './motion.ts'],
  ]) assert.ok(read(html).includes(`src="${entry}"`), `${html} lost its entry ${entry}`);
});

test(contract(['C-BUILD-01'], 'Vite includes all three standalone HTML entries'), () => {
  const properties = nodes(source('vite.config.ts'), n => n.type === 'Property' && name(n.key) === 'input');
  assert.equal(properties.length, 1);
  assert.deepEqual(Object.fromEntries(properties[0].value.properties.map(p => [name(p.key), p.value.value])), {
    game: 'index.html', cvTestTool: 'tools/cv-test-tool/index.html', motionFixture: 'tools/cv-test-tool/fixtures/motion.html',
  });
  assert.equal(JSON.parse(read('tsconfig.json')).compilerOptions.strict, true);
});

test(contract(['C-CONVERT-02', 'C-SUITE-05', 'I-TOOL-04'], 'workspace reaches capture, generated configs, and pixel analysis'), () => {
  const tool = reachable(graph, 'tools/cv-test-tool/main.ts');
  for (const path of ['capture.ts', 'suite-controls.ts', 'vision/manual-runner.ts', 'vision/observe.ts',
    'vision/evaluate.ts', 'vision/session.ts', 'generated/manifest.json']) {
    assert.ok(tool.has(`tools/cv-test-tool/${path}`), `Missing pipeline node ${path}`);
  }
  assert.ok([...tool].some(p => p.includes('/generated/requirements/')));
  assert.ok([...tool].some(p => p.includes('/generated/suites/')));
});

test(contract(['C-BUILD-03', 'I-PHYSICS-01'], 'runtime graph has no cycles; type-only Arena edge is excluded'), () => {
  assertAcyclic(graph);
  assert.ok(!dependencies('src/planets.ts').has('src/match.ts'));
});
