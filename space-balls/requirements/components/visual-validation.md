# Requirements compiler and manual visual runner
Sources: [compiler](../../tools/compile-cv-requirements.mjs),
[runner](../../tools/cv-test-tool/vision/manual-runner.ts),
[controls](../../tools/cv-test-tool/suite-controls.ts).
Authoring: [OpenCV adapter](../opencv/adapter.md).

- **C-CONVERT-01**: every V-* definition has an explicit cv-config mapping or exclusion.
  Missing/duplicate IDs, unknown operators/stages, invalid durations, and stale artwork fail.
- **C-CONVERT-02**: output JSON preserves source hash, visual scope, stages, duration,
  operators, template/mask descriptors, and related component/integration IDs.
- **C-CONVERT-03**: represent DOM/functional exclusions and visual alias coverage explicitly.
  Never count a skipped semantic test as a passing visual test.
- **C-CONVERT-04**: cv:check detects generated drift; dev/build regenerate current configs.
- **C-SUITE-01**: loading the tool does not execute tests; user clicks suite/requirement.
  The runner does not navigate, start the game, click Boost, or alter game state.
- **C-SUITE-02**: each result is PASSED/FAILED/NA with reason and captured stage/time.
  NA includes not run, wrong stage/source, occlusion, resolution, and acquisition failure.
- **C-SUITE-03**: coverage counts only PASSED+FAILED; retain session results across manual
  state changes, with explicit Reset results. Show scope and measurement evidence.
- **C-SUITE-04**: retain activation for first display capture; lock overlapping runs and
  capture/navigation controls. Cancellation cannot produce a synthetic pass.
- **C-SUITE-05**: sample stage/viewport/overlay metadata alongside every captured frame.
  Pixel operators use actual display-stream ImageData; functional DOM assertions are excluded.
- **C-SUITE-06**: use repeated bursts for longer sequences, measured by timestamps.
  Missing phases/setup yield NA. Release all temporary Mats and references after each run.
- **C-SUITE-07**: wrong/missing artwork and stationary/missing fixture pixels must fail
  applicable checks; obscured or ambiguous matching must remain NA.
- **C-SUITE-08**: workspace chrome needs a separate acquisition source; its current
  unavailable suite reports NA explicitly rather than examining game pixels as chrome.

Evidence: [compiler tests](../../test/cv-compiler.test.mjs),
[OpenCV/runner tests](../../test/vision.test.mjs).
