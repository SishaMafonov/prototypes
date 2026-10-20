# Structural graph tests

Run from `space-balls/` with Node.js 24:

```sh
npm run test:struct
npm test
```

`npm test` includes this directory alongside all existing game and CV tests.
No browser, microphone permission, display sharing, or initialized WASM is needed.

## Graphs and requirement traceability

Every product test names the stable IDs it checks from
[the requirements catalog](../../requirements/catalog.json). Registration verifies
that those IDs still exist in their linked requirement documents.

| File | Graph and oracle |
| --- | --- |
| `dependencies.test.mjs` | Parsed runtime import graph: game/tool isolation, shared rule modules, local assets, lazy CV adapter, build entries, config/pixel pipeline, no runtime cycles. |
| `connections.test.mjs` | Syntactic call and assignment edges: shared geometry, drawing order, drive propagation, match creation, score projection, cleanup, capture/analysis connections. |
| `transitions.test.mjs` | Phase writers plus executable directed graph walks: countdown, play, goal, reset, both winners, repeated deuce, terminal freeze, net-to-scorer edges. |
| `graph.test.mjs` | Parser fixtures and in-memory negative controls: indirect tool coupling, eager CV, cycles, and fake calls in comments/strings. |

`graph.mjs` uses Rolldown's TypeScript/JavaScript AST parser (the same version
already locked for Vite), declared as a direct dev dependency for these tests.
It excludes type-only edges, including `planets.ts -> match.ts`'s Arena type,
and follows runtime imports, re-exports, literal dynamic imports/require, and
the current Vite JSON/PNG globs. Unknown dynamic import/glob forms fail explicitly.
Graph nodes are project-relative paths or package/builtin specifiers; directed
edges carry `static` or `lazy` loading identity. Reachability includes lazy edges
unless a test explicitly checks only the initial static graph.

## Boundaries

These checks constrain the existing procedural implementation; they require no
classes, services, framework, production architecture, or game-state API.
Call checks describe syntactic connections and selected ordering/data arguments;
they are not a complete control-flow, alias-resolution, or data-flow analysis.
Phase walks execute real match rules with deterministic RNG and controlled net
fixtures; outer picker/result connections are static assertions only.

The complementary [scene suite](../scene/README.md) executes runtime composition.
Passing this suite does not certify rendered pixels, DOM interaction/focus,
microphone permissions, live source selection, timing calibration, or full
behavioral coverage of every clause under a linked ID. Existing logic/media
tests and the manual visual runner remain complementary evidence.

When a requirement changes, review its linked graph assertions and negative
controls. Avoid recording a generated import snapshot or source hash as the
behavioral oracle. Requirements provenance still tracks reviewed source hashes.
