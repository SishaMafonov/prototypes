# Game Rules Reconstruction — Markdown handoff

A packaged rulebook and implementation brief for a two-player X/O ray-tracing game on squared paper. The intended deliverable described by the brief is an investor-demo prototype using TypeScript and HTML5 Canvas. This package contains instructions and data examples, not the game itself.

## Files and reading order

1. [Formalized rules](01_FORMALIZED_RULES.md) — the final 15-rule reconstruction, user clarifications, terminology and remaining assumptions.
2. [Codex Canvas implementation specification](02_CODEX_CANVAS_SPECIFICATION.md) — all 22 sections of the original build handoff, including mechanics, types, simulation, UI, animation, architecture, tests and definition of done.
3. [Geometry and CSV examples](03_GEOMETRY_AND_CSV_EXAMPLES.md) — original CSV snippets and canonical edge/scoring code, followed by a complete small fixture, explicit cell mask and corner transitions.
4. [Tests and acceptance](04_TESTS_AND_ACCEPTANCE.md) — concrete expected paths, scoring fixtures, simulation safeguards, lifecycle details, architecture and expanded acceptance checklist.

Give all four files to the implementing coding agent. Read the original specification together with the clearly labelled handoff additions. The additions resolve missing detail for a prototype without presenting inferred choices as confirmed childhood rules.

## The central invariant

```text
Static boundary + obstacle geometry → ray collision
Static edges ∪ trajectory edges     → cell completion
Cell ownership                      → scores and rendering
```

Old trajectories never become walls. Cell ownership never changes collision geometry.

## Source and editorial policy

Source conversation: **Game Rules Reconstruction**, ID `6aae9aa5-ab00-83eb-aa86-6f8cbad303b0`, retrieved on 2026-09-19.

The conversation was read in full at the turn level. The long implementation response was capped by the retrieval tool at 20,000 characters. All 22 specification sections, all CSV examples, the canonical edge function and cell-completion function were present before that cap. Only the available beginning of the closing investor-demo sentence was visible; the incomplete sentence is omitted rather than invented.

The original attachments, `ExmpleBoard.png` and `EndOfFIrstTUrn.png`, were available and visually inspected. They are visual references; their exact geometry has not been transcribed into this package. The complete 5×5 CSV fixture is a newly supplied synthetic example, clearly distinguished from the original partial snippets and drawings.

Earlier suggestions that old traces might become walls are superseded by the user's later explicit clarification and are not part of the rules. Comparisons with other published games and the initial search discussion are background, outside this build specification.

The formalized perpendicular launch, automatic corner-direction convention, no-bonus-turn behaviour and implementation safeguards come from the prior assistant's brief. The source-confidence notes identify the key points that were not explicitly confirmed by the user.

## Checks performed for this package

- Preserved all 22 sections of the source implementation brief.
- Preserved the source geometry/CSV examples and edge/scoring functions.
- Evaluated the new 5×5 fixture under its documented corner convention: 24 interior cells, one blocked, 23 playable, 24 static unit edges, and 14 valid terminating launch paths.
- Verified that the union of those paths and static edges can complete every playable cell.
- Checked the specified straight, single-corner and two-corner paths using a small independent geometry calculation.
- Checked package links and Markdown fences before delivery.

These checks validate the documentation's sample data; they are not a substitute for implementing and running the required prototype test suite.

## Scope

Build local two-player gameplay, deterministic rays, cell capture, scoring, reset, preview and animation. Keep game rules out of rendering. Finish correctness before demo polish. The original brief excludes AI opponents, network multiplayer, accounts, backend services, databases, sound systems and procedural board generation.

