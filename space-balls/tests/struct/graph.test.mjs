import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAcyclic, imports, moduleGraph, parse, reachable, read, requireCalls, functionBody } from './graph.mjs';

test('graph parser ignores comments, strings, and type-only edges but retains side effects and re-exports', () => {
  const ast = parse(`
    // import './fake-comment';
    const words = "import './fake-string'";
    import type { Arena } from './type';
    import { type Match } from './also-type';
    import { type Match, advanceMatch as step } from './rules';
    import './style.css';
    export type { Match } from './export-type';
    export { createMatch } from './factory';
    export * from './all';
    function lazy() { return import('./runtime'); }
    const configs = import.meta.glob('./generated/*.json', { eager: true });
    const later = import.meta.glob('./later/*.json');
  `);
  assert.deepEqual(imports(ast).map(e => [e.specifier, e.kind]), [
    ['./rules', 'static'], ['./style.css', 'static'], ['./factory', 'static'], ['./all', 'static'],
    ['./runtime', 'lazy'], ['./generated/*.json', 'static'], ['./later/*.json', 'lazy'],
  ]);
  assert.throws(() => imports(parse('const file = "x"; import(file);')), /Computed dynamic import/);
  assert.throws(() => imports(parse('require(file);')), /Computed require/);
});

test('missing call edge cannot be supplied by a comment or string', () => {
  const ast = parse('function animate() { /* advanceMatch(); */ const label = "advanceMatch()"; }');
  assert.throws(() => requireCalls(functionBody(ast, 'animate'), ['advanceMatch']), /Missing call edge/);
});

test('negative control: an indirect game-to-tool import is visible to the boundary check', () => {
  const graph = moduleGraph(new Map([['src/goals.ts', read('src/goals.ts') + '\nimport "../tools/opencv.mjs";']]));
  const game = reachable(graph, 'src/main.ts');
  assert.ok(game.has('tools/opencv.mjs'));
  assert.ok(game.has('@techstark/opencv-js'));
  assert.throws(() => {
    for (const path of game) assert.ok(path.startsWith('src/'), `Game reaches ${path}`);
  }, /Game reaches/);
});

test('negative control: making the adapter eager exposes CV in the initial workspace graph', () => {
  const graph = moduleGraph(new Map([['tools/opencv.mjs', 'import { cvModule } from "./opencv-runtime.mjs"; export const loadOpenCv = () => cvModule;']]));
  assert.ok(reachable(graph, 'tools/cv-test-tool/main.ts', false).has('@techstark/opencv-js'));
});

test('negative control: runtime cycles fail with the dependency path', () => {
  const graph = moduleGraph(new Map([['src/planets.ts', read('src/planets.ts') + '\nimport "./match.ts";']]));
  assert.throws(() => assertAcyclic(graph), /Runtime dependency cycle: .*src\/match.ts.*src\/planets.ts.*src\/match.ts/);
});
