# Coverage, limitations, and next implementation boundary
Requirements reflect the reviewed sources in [provenance.json](provenance.json).
Manual CV projections and browser screenshot regressions are executable. Controlled
fixtures exist only in the separate browser-test build; normal builds omit them.

## Existing evidence
| Area | Evidence present |
| --- | --- |
| goal travel/reversal | tests/goals.test.mjs |
| launch/scoring/win/deuce/reset/portrait | tests/match.test.mjs |
| fields/gravity/AI/drive/cooldowns/finite state | tests/planets.test.mjs |
| mic levels/permissions/cancellation/disconnect | tests/microphone.test.mjs |
| display lifecycle/sampling/storage | test/capture.test.mjs with media mocks |
| actual WASM pixel operations | test/opencv.test.mjs |
| runtime initialization | prior browser checks in dev/production |
| documentation/assets | requirements/verify.mjs + source/asset hashes |
| masked matching compatibility | assets/probe.mjs, synthetic planted samples |
| compiler and manual visual engine | test/cv-compiler.test.mjs, test/vision.test.mjs |
| adapter with real source art | test/vision-assets.probe.mjs; planted positives and negatives |
| structural dependency/call/state graphs | [tests/struct](../tests/struct/README.md); requirement-linked AST checks, deterministic phase walks, negative controls |
| game scene graph and DOM composition | [tests/scene](../tests/scene/README.md); real renderer/handlers, recorded canvas scopes, 11 stages, viewport/DPR fixtures, input/status/modal checks |
| production browser journeys | [browser E2E](../tests/browser/README.md); real assets/DOM/layout/input, errors, permission denial and workspace navigation |
| browser visual regressions | Playwright real raster baselines; explicit update command, frozen clock/RNG, responsive profiles and DPR |
| controlled browser integration | real net collisions, score/modal/replay synchronization, browser focus and audio cleanup |

## Work still required for live visual validation
- Complete remaining semantic/unsupported projections with dedicated testing adapters.
- Extend browser coverage beyond current Chromium fixtures and reviewed baseline profiles.
- Add controlled-state metadata beyond the current stage/viewport/overlay observations.
- Calibrate candidate thresholds using real captured positives and negative controls.
- Establish DOM/logic/media evidence adapters for non-pixel assertions.
- Live share-picker/source verification and browser-specific stream behavior.
- Portrait/short test viewport support beyond the workspace's current 16:9 preview.
- Confirm minimum readable sizes and control reachability on target profiles.
- Resolve or explicitly report overlay occlusion instead of claiming eight visible planets.
- Optional text recognition/glyph references if DOM evidence is unavailable.

## Artifact interpretation
Mockups are low-detail, generated composition aids; their typography/glow/backdrop
are approximate. They are not captured product states and never certify a live result.
Templates are source-art extractions; matching requires scale, mirror, mask, and ROI.
Central masks exclude translucent edges; some masked pixels can still be occluded.
Synthetic probe checks core matching compatibility, not recognizer accuracy on live scenes.
Numeric CV tolerances are CANDIDATE until calibration evidence is recorded.
A source-drift warning means review requirements; it does not prove the game is wrong.

## Maintenance
Keep every Markdown file <=100 lines; split by topic and update INDEX/CONTEXT links.
Retain stable IDs when wording changes; retire IDs explicitly if behavior is removed.
Refresh source hashes only after reviewing affected requirements, never to silence drift.
Regenerate artwork derivatives after source-art changes; inspect PNGs and rerun probes.
