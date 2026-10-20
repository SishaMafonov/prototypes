# Space Balls requirements
Start with [CONTEXT.md](CONTEXT.md); use [INDEX.md](INDEX.md) to fetch one topic.
Scope: `space-balls/`, including its CV tooling; other repository games are excluded.
Each Markdown file is limited to 100 lines, including this index and generated references.
[catalog.json](catalog.json) maps every requirement ID to its small topic file.

## Contract
These requirements describe the inspected implementation, not a redesign.
C-* = component behavior; I-* = integration; V-* = visual; S-* = stage.
Source truth: [game rules](../GAME_RULES.md), code, and the linked existing tests.
Read [provenance.json](provenance.json) for the reviewed commit, dirty-tree flag,
and exact file hashes. Uncommitted tooling is included in that snapshot.
A changed source hash requires review; it is not itself a visual regression.

## Read by task
- Component rules: [components](INDEX.md#components).
- Cross-component behavior: [integrations](INDEX.md#integrations).
- Stage inventory and entry conditions: [stages](visual/stages.md).
- Coordinate model: [geometry](visual/geometry.md).
- Pixel assertions: [visual checks](visual/checks.md).
- Template usage: [matching](visual/matching.md), [assets](assets/README.md).
- Text/DOM evidence: [copy and semantics](visual/copy.md).
- Running a sequence: [scenarios](scenarios.md).
- Future checker contract: [translation](translation.md).

## Assets
[Stage mockups](assets/mockups/README.md) are generated schematic PNGs,
not screenshots or accepted baselines. They explain composition and visibility.
Five reusable RGBA templates and five binary mask PNGs come from the game's art.
The templates, formulas, and text predicates are the visual oracle.
Do not compare an application capture pixel-for-pixel to a schematic mockup.

## Validate
From `space-balls/`, Node.js 24:
```sh
node requirements/verify.mjs
npm test
npm run build
```
The requirements verifier checks links, line limits, IDs, provenance, asset hashes,
and geometric fixtures. It does not validate the live game or calibrate thresholds.
Asset regeneration instructions are in [assets/README.md](assets/README.md).
The [manual runner](../tools/cv-test-tool/SUITES.md) executes compiled pixel projections.
See [adapter authoring](opencv/adapter.md) for explicit cv-config mappings and exclusions.
