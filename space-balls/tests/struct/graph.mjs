import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'rolldown/parseAst';

export const project = fileURLToPath(new URL('../../', import.meta.url));
export const read = path => readFileSync(resolve(project, path), 'utf8');
export const parse = (text, path = 'fixture.ts') => parseAst(text, { lang: path.endsWith('.ts') ? 'ts' : 'js' }, path);
export const source = path => parse(read(path), path);
const slash = path => path.replaceAll('\\', '/');

export function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(child => walk(child, visit)); return; }
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (!['parent', 'comments', 'loc'].includes(key) && value && typeof value === 'object') walk(value, visit);
  }
}

export function nodes(root, predicate) {
  const found = [];
  walk(root, node => { if (predicate(node)) found.push(node); });
  return found;
}

export function name(node) {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'MetaProperty') return `${name(node.meta)}.${name(node.property)}`;
  if (node.type === 'ChainExpression' || node.type === 'TSNonNullExpression') return name(node.expression);
  if (node.type === 'MemberExpression') {
    const key = node.computed ? node.property.value : name(node.property);
    return key === undefined ? undefined : `${name(node.object)}.${key}`;
  }
}

export function calls(root) {
  return nodes(root, n => n.type === 'CallExpression' || n.type === 'NewExpression')
    .map(n => ({ name: name(n.callee), args: n.arguments, start: n.start, node: n }));
}

export function functionBody(ast, id) {
  const found = nodes(ast, n => n.type === 'FunctionDeclaration' && n.id?.name === id);
  assert.equal(found.length, 1, `Expected one function ${id}`);
  return found[0].body;
}

export function methodBody(ast, className, method) {
  const classes = nodes(ast, n => n.type === 'ClassDeclaration' && n.id?.name === className);
  assert.equal(classes.length, 1, `Expected one class ${className}`);
  const methods = classes[0].body.body.filter(n => name(n.key) === method);
  assert.equal(methods.length, 1, `Expected ${className}.${method}`);
  return methods[0].value.body;
}

export function handler(ast, target, event) {
  const found = calls(ast).filter(c => c.name === `${target}.addEventListener` && c.args[0]?.value === event);
  assert.equal(found.length, 1, `Expected one ${target}:${event} handler`);
  return found[0].args[1];
}

export function requireCalls(root, expected) {
  const actual = new Set(calls(root).map(c => c.name));
  for (const edge of expected) assert.ok(actual.has(edge), `Missing call edge -> ${edge}`);
}

export function orderedCalls(root, expected) {
  const actual = calls(root).sort((a, b) => a.start - b.start);
  let position = -1;
  for (const edge of expected) {
    position = actual.findIndex((c, i) => i > position && c.name === edge);
    assert.ok(position >= 0, `Missing ordered call edge -> ${edge}`);
  }
}

export function assignedValues(root, target) {
  const values = [];
  const collect = n => {
    if (n?.type === 'Literal') values.push(n.value);
    else if (n?.type === 'ConditionalExpression') { collect(n.consequent); collect(n.alternate); }
  };
  for (const n of nodes(root, n => n.type === 'AssignmentExpression' && name(n.left) === target)) collect(n.right);
  return values;
}

// Runtime edges only: the planets -> match Arena type must not create a cycle.
export function imports(ast) {
  const edges = [];
  walk(ast, n => {
    if (n.type === 'ImportDeclaration' || (n.type.startsWith('Export') && n.source)) {
      if (n.importKind === 'type' || n.exportKind === 'type') return;
      const specifiers = n.specifiers ?? [];
      if (specifiers.length && specifiers.every(s => s.importKind === 'type' || s.exportKind === 'type')) return;
      edges.push({ specifier: n.source.value, kind: 'static' });
    } else if (n.type === 'ImportExpression') {
      assert.equal(typeof n.source.value, 'string', 'Computed dynamic import needs an explicit graph adapter');
      edges.push({ specifier: n.source.value, kind: 'lazy' });
    } else if (n.type === 'CallExpression' && name(n.callee) === 'require') {
      assert.equal(typeof n.arguments[0]?.value, 'string', 'Computed require needs an explicit graph adapter');
      edges.push({ specifier: n.arguments[0].value, kind: 'static' });
    } else if (n.type === 'CallExpression' && name(n.callee) === 'import.meta.glob') {
      assert.equal(typeof n.arguments[0]?.value, 'string', 'Computed glob needs an explicit graph adapter');
      const options = n.arguments[1]?.properties ?? [];
      const eager = options.some(p => name(p.key) === 'eager' && p.value.value === true);
      edges.push({ specifier: n.arguments[0].value, kind: eager ? 'static' : 'lazy', glob: true });
    }
  });
  return edges;
}

export function files(directory) {
  return readdirSync(resolve(project, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(path) : [path];
  });
}

function resolveImport(from, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  const path = resolve(project, dirname(from), specifier);
  const found = [path, `${path}.ts`, `${path}.mjs`, `${path}.js`, resolve(path, 'index.ts')]
    .find(p => existsSync(p) && extname(p));
  assert.ok(found, `Unresolved graph edge: ${from} -> ${specifier}`);
  const local = slash(relative(project, found));
  assert.ok(!local.startsWith('../'), `Import escapes project: ${from} -> ${specifier}`);
  return local;
}

export function moduleGraph(overrides = new Map()) {
  const paths = [...files('src'), ...files('tools'), 'vite.config.ts']
    .filter(p => /\.(?:ts|mjs|js)$/.test(p) && !/\.d\.(?:ts|mts)$/.test(p));
  const graph = new Map();
  for (const path of paths) {
    const edges = imports(parse(overrides.get(path) ?? read(path), path)).flatMap(edge => {
      if (!edge.glob) return [{ ...edge, to: resolveImport(path, edge.specifier) }];
      // Current Vite globs are single-directory JSON/PNG patterns. Fail closed on new forms.
      assert.match(edge.specifier, /^\.{1,2}\/[^*?\[\]{}]+\/\*\.(json|png)$/, 'Unsupported graph glob');
      const directory = slash(relative(project, resolve(project, dirname(path), dirname(edge.specifier))));
      assert.ok(!directory.startsWith('../'), `Glob escapes project: ${path} -> ${edge.specifier}`);
      const extension = extname(edge.specifier);
      const matches = files(directory).filter(p => slash(dirname(p)) === directory && p.endsWith(extension));
      assert.ok(matches.length, `Empty graph glob: ${path} -> ${edge.specifier}`);
      return matches.map(to => ({ ...edge, to }));
    });
    graph.set(path, edges);
  }
  return graph;
}

export function reachable(graph, entry, includeLazy = true) {
  const seen = new Set();
  function visit(path) {
    if (seen.has(path)) return;
    seen.add(path);
    for (const edge of graph.get(path) ?? []) if (includeLazy || edge.kind !== 'lazy') visit(edge.to);
  }
  visit(entry);
  return seen;
}

export function assertAcyclic(graph) {
  const done = new Set(), active = [];
  function visit(path) {
    assert.ok(!active.includes(path), `Runtime dependency cycle: ${[...active, path].join(' -> ')}`);
    if (done.has(path)) return;
    active.push(path);
    for (const edge of graph.get(path) ?? []) visit(edge.to);
    active.pop(); done.add(path);
  }
  for (const path of graph.keys()) visit(path);
}

// Validate traceability when registering a test, so stale IDs cannot silently pass.
const catalog = JSON.parse(read('requirements/catalog.json'));
export function contract(ids, title) {
  for (const id of ids) {
    const topic = catalog.filter(record => record.ids.includes(id));
    assert.equal(topic.length, 1, `Unknown/duplicate requirement ${id}`);
    const text = read(`requirements/${topic[0].path}`);
    assert.ok(text.includes(`**${id}**`) || new RegExp('^## '+id+'(?:\\s|$)','m').test(text), `Missing definition ${id}`);
  }
  return `${ids.join(', ')}: ${title}`;
}
