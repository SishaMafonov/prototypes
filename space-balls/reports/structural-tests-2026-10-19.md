# Space Balls — Structural Graph Test Report

**Result: PASS — 25 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.**

## Execution record

| Field | Recorded value |
| --- | --- |
| Run start | 19 okt. 2026 23:28:44 CEST (Europe/Stockholm); 2026-10-19T21:28:44.177Z UTC |
| Run finished | 2026-10-19T21:28:45.237Z UTC |
| Test runner duration | 657.3219 ms (reported by Node; individual tests can overlap) |
| Runtime | Node.js v24.13.0; Windows x64; node:test |
| AST parser | Rolldown 1.2.14 |
| Repository HEAD | 696afdc524a8f97f665aca84c3f7422c8daffbb9 |
| Working tree | Dirty: structural suite and integration changes are uncommitted; HEAD alone does not identify the tested files. |
| Test scope | Four test files under space-balls/tests/struct; 20 requirement-linked tests and 5 parser/negative-control tests. |
| Traceability | 44 distinct requirement IDs referenced by assertions; this is not full behavioral coverage of every clause in those requirements. |
| Process exit code | 0 |

## Scope and method

The suite validates structural contracts derived from requirements/catalog.json and its component/integration documents. Runtime dependencies are parsed from TypeScript/JavaScript ASTs, excluding type-only imports. Calls, selected arguments, assignments, and ordering connect procedural components. Executable match walks use deterministic RNG and controlled fixtures. Every requirement-linked test validates that its referenced IDs exist.

The checked phase graph is countdown → playing → goal → countdown, with playing → finished on a winning point. Traversals exercise every phase node and transition edge, both winners, repeated deuce, and terminal freeze. Controlled net-contact fixtures verify the opposite-side scorer connection.

Negative controls expect detection of indirect game-to-tool imports, eager CV loading, and runtime cycles. Parser fixtures confirm that comments and strings cannot supply imports/calls and that type-only edges are excluded. PASS for a negative control means the intentionally invalid in-memory mutation was detected; it is not a product failure.

## Summary by test file

| File | Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| connections.test.mjs | 8 | 8 | 0 |
| dependencies.test.mjs | 7 | 7 | 0 |
| graph.test.mjs | 5 | 5 | 0 |
| transitions.test.mjs | 5 | 5 | 0 |
| **Total** | **25** | **25** | **0** |

## Individual results

### Call, assignment, input and cleanup connections

Source: tests/struct/connections.test.mjs

| Test / referenced requirements | Result | Duration (ms) |
| --- | --- | ---: |
| I-PHYSICS-01, I-PHYSICS-02, I-PHYSICS-03: rules and renderer connect to shared arena, fields, and goals | PASS | 59.906 |
| C-COURT-08: render call order keeps rings behind planets, goals, and asteroid | PASS | 15.346 |
| I-INPUT-01, C-INPUT-04: mic/manual drive merge feeds physics while meter reads mic only | PASS | 22.598 |
| C-PICK-03, C-PICK-05, I-FLOW-01, I-FLOW-07: outer state graph owns match creation and replay cleanup | PASS | 26.797 |
| I-FLOW-06, I-FLOW-08, C-RESULT-01: result and HUD synchronize from Match with cleanup before modal | PASS | 29.156 |
| I-INPUT-06, I-INPUT-07, I-INPUT-08, C-AUDIO-08: hidden, finished, replay, and pagehide connect to audio release | PASS | 80.293 |
| C-AUDIO-02, C-AUDIO-06: microphone graph reads locally and disconnects without speaker output | PASS | 4.025 |
| C-HARNESS-02, C-HARNESS-06, I-TOOL-02, C-SUITE-06: capture, navigation, and analysis retain lifecycle connections | PASS | 14.602 |

### Runtime module dependencies and build entries

Source: tests/struct/dependencies.test.mjs

| Test / referenced requirements | Result | Duration (ms) |
| --- | --- | ---: |
| C-BUILD-03: game runtime stays inside game modules and local art | PASS | 4.070 |
| C-BOOT-02: all four game artwork nodes are local import dependencies | PASS | 0.221 |
| C-CV-01, C-CV-02, C-BUILD-03: pinned CV package is behind a lazy ESM adapter | PASS | 0.765 |
| C-HARNESS-01, C-FIXTURE-01, I-TOOL-01: workspace, game, and motion have separate entry graphs | PASS | 0.849 |
| C-BUILD-01: Vite includes all three standalone HTML entries | PASS | 1.886 |
| C-CONVERT-02, C-SUITE-05, I-TOOL-04: workspace reaches capture, generated configs, and pixel analysis | PASS | 0.389 |
| C-BUILD-03, I-PHYSICS-01: runtime graph has no cycles; type-only Arena edge is excluded | PASS | 0.853 |

### Graph parser and negative controls

Source: tests/struct/graph.test.mjs

| Test / referenced requirements | Result | Duration (ms) |
| --- | --- | ---: |
| graph parser ignores comments, strings, and type-only edges but retains side effects and re-exports | PASS | 10.406 |
| missing call edge cannot be supplied by a comment or string | PASS | 0.817 |
| negative control: an indirect game-to-tool import is visible to the boundary check | PASS | 164.497 |
| negative control: making the adapter eager exposes CV in the initial workspace graph | PASS | 82.621 |
| negative control: runtime cycles fail with the dependency path | PASS | 86.764 |

### Match phase graph and scoring routes

Source: tests/struct/transitions.test.mjs

| Test / referenced requirements | Result | Duration (ms) |
| --- | --- | ---: |
| C-MATCH-01, C-MATCH-02, C-MATCH-03, C-MATCH-05, C-MATCH-06: phase writers match the required directed graph | PASS | 31.204 |
| I-FLOW-03, I-FLOW-05, I-FLOW-06, C-MATCH-04, C-MATCH-06: all phase nodes/edges reach terminal winner 0 | PASS | 17.270 |
| I-FLOW-03, I-FLOW-05, I-FLOW-06, C-MATCH-04, C-MATCH-06: all phase nodes/edges reach terminal winner 1 | PASS | 7.258 |
| C-MATCH-04, I-FLOW-05, I-FLOW-08: deuce cycles remain reachable until two clear points end the graph | PASS | 15.390 |
| C-GOAL-04, I-FLOW-04, I-PHYSICS-03: both net-contact edges enter the same scoring state graph | PASS | 4.832 |

## Additional validation and limitations

- Requirements verification passed in this run: 35 Markdown files within the 100-line limit, 185 unique requirement IDs, links, reviewed source/artifact hashes, PNG metadata, and geometry fixtures verified.
- This report covers the structural suite only. The complete 93-test suite and production build passed earlier in this session; they were not rerun for this report.
- Static call/assignment checks are not complete control-flow, alias-resolution, or data-flow analysis. Outer picker/result connections are checked statically; match phase routes execute real rules.
- Rendered pixels, DOM interactions/focus, real microphone permissions, live display-source selection, and visual threshold calibration are outside this run.
- Node emitted a MaxListenersExceededWarning during the run with multiple reporters. All 25 tests completed successfully and the process exited 0; the warning is recorded as a reporting-tool observation.

## Reproduction and attachment evidence

From space-balls/, run `npm run test:struct` for the same four-file suite. `npm test` also includes these tests.

The native report command and the tested source SHA-256 manifest are recorded in structural-tests-2026-10-19.run.json. That manifest covers 95 reviewed source/config/test files and disambiguates the dirty working tree. The report files themselves are stored outside the tested source directories.

| Attachment | Purpose |
| --- | --- |
| structural-tests-2026-10-19.md | This self-contained report, suitable for a Jira ticket attachment. |
| structural-tests-2026-10-19.junit.xml | Native Node JUnit XML with all 25 test cases; Jira test-management import compatibility depends on the installed app. |
| structural-tests-2026-10-19.tap | Raw TAP test output and runner totals. |
| structural-tests-2026-10-19.run.json | UTC timestamps, environment, command, exit code, requirements validation, and tested source hashes. |

