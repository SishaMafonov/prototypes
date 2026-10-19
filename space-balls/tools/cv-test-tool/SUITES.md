# Manual visual suites
From space-balls, run `npm run dev` and open `/tools/cv-test-tool/`.
OpenCV and the PNG templates/masks load automatically. No test executes on page load.

1. Choose Space Balls or Motion study in the navigation.
2. Manually put the iframe into the state you want (picker, ready, playing, result…).
3. Click **Run suite**, or a requirement's name to run only that requirement.
4. On first capture, approve the browser picker and choose this workspace's own tab.
5. Inspect PASSED/FAILED/NA, the reason, and **Evidence and source** for measurements.
6. Switch the game state manually and run more checks. Results remain until Reset results.

Coverage is `(PASSED + FAILED) / visual requirements in the selected suite`.
NA is never counted as covered or passed. Prior results show their observed stage/time;
they are session evidence, not a claim that every requirement applies to the current frame.
Nonvisual requirements are explicitly excluded in the manifest. Related component and
integration visual clauses are linked to their V-* projections rather than duplicated.
The Workspace chrome suite currently reports NA: that area is excluded from iframe capture.

## Timing and prerequisites
Static checks share one five-frame burst. Motion checks use its actual timestamps.
Longer checks collect repeated bursts, up to the configured window (currently up to 4.2s).
For countdown/goal sequences, first approve sharing with ordinary Capture frames, then
enter the target game state and run the requirement promptly. Picker latency is not a
controlled game clock. Missed phases, changing stage, occlusion, tiny textures, or unavailable
paired drive-off/on input produce NA with an explanation. No game input is synthesized.
Use Stop sharing to cancel a run. A pending native picker still needs browser dismissal.

## Converter and authoring
`npm run cv:compile` reads `requirements/visual/*.md` `cv-config` blocks and the single
`cv-defaults` block in `requirements/opencv/adapter.md`. It emits one JSON file per visual
requirement, suites, and a manifest under `tools/cv-test-tool/generated/`.
`npm run cv:check` detects stale outputs. Dev/build regenerate configs automatically.
Each mapping defines its story/stages, operators, duration, scope, and related C-/I- IDs.
Each output carries the Markdown source hash; template/mask descriptors carry PNG hashes
and Mat conversion metadata. Missing mappings and unsupported operators fail compilation.
The converter does not infer arbitrary English: edit prose AND its explicit mapping together.
Generated JSON is data; browser adapters construct actual WASM Mats from bundled PNGs.
No screenshots or mockup PNGs are used as full-screen accepted baselines.

## Public API
```js
await window.cvTestTool.runRequirement('V-MENU-01');
await window.cvTestTool.runSuite('space-balls'); // or motion, workspace
console.table(window.cvTestTool.results);
await window.cvTestTool.captureScreenshot({ count: 5 }); // existing API
```
These calls share UI state and locks. A first capture still needs a user gesture.
Capture failures map to NA, not a game failure. Unknown IDs reject the promise.

## Verification and limits
`npm test` includes compiler freshness, actual OpenCV positive/negative image checks,
occlusion/NA, HSV/contour animation checks, and manual-run lifecycle tests.
On Windows, `node test/vision-assets.probe.mjs` also checks the adapter with real PNG art.
Thresholds remain experimental; a PASSED row certifies only its displayed pixel scope.
Exact text, scores, keyboard behavior, microphone causality, and game rules belong to
unit/integration/E2E tests. DOM is used only for viewport/stage/occlusion metadata.
Live browser stream calibration and controlled game-state automation remain separate work.
