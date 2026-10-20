# Quick context
Project: standalone TypeScript/Vite canvas game, with HTML overlays.
Reviewed state: [provenance.json](provenance.json). Scope: this project only.
Player: left/cyan; opponent: right/pink; first to >=10 and a lead >=2.
Selection order: Earth, Jupiter, Lava, Ice. New Game resets to Earth.
Outer state: selecting -> ready -> playing; match exists only after Start.
Match phases: countdown -> playing -> goal -> countdown, or playing -> finished.
Countdown words: Ready? / Steady! / GO!, one second each; goal hold: 1.2 seconds.
Only match-playing has a tail and physical boosts; goals move during countdown/goal too.
Finished freezes match state, hides voice controls, stops mic, opens a persistent modal.

## Visual model
A game capture is the cropped iframe, never the surrounding CV workspace.
CSS viewport W,H and captured pixel dimensions Iw,Ih are different coordinate spaces.
Compute geometry in CSS pixels, then map x*Iw/W, y*Ih/H.
Use [geometry](visual/geometry.md); do not hardcode DPR or assume 16:9.
8 planets: 4 per side, right art reflected horizontally, geometry also reflected.
Jupiter is outer/large; Earth inner/medium; Ice upper/small; Lava lower/small.
Rings follow the actual opaque body center, not the sprite-frame center.
Count only visible/unobscured objects. HUDs, countdown, and modal occlude the canvas.
No full-screen baseline is required. Prefer masked templates, color, and geometry.
Tolerance constants are proposed starting values, not calibrated live-capture claims.
Exact words require DOM evidence or a separately validated text recognizer.
OpenCV alone does not provide OCR, microphone permission evidence, or game-state access.

## Fast retrieval
- New or changed game rule: [match component](components/match.md).
- Planet placement/boost: [planet component](components/planets.md).
- Layout and state recognition: [stages](visual/stages.md), [checks](visual/checks.md).
- Image matching: [matching](visual/matching.md), [templates](assets/templates.json).
- Capture lifecycle: [capture component](components/capture.md).
- Audio/manual input: [input](components/input.md), [audio](components/audio.md).
- Assertions and result format: [translation](translation.md).
- Coverage and unmet prerequisites: [coverage](coverage.md).
- All source locations and topic files: [INDEX](INDEX.md).
- Machine lookup from an exact C-/I-/V- ID: [catalog.json](catalog.json).

## Boundaries
The [manual runner](../tools/cv-test-tool/SUITES.md) executes explicit OpenCV mappings.
The normal game has no fixture API or OCR. A separate browser-test build exposes
controlled match fixtures; [browser tests](../tests/browser/README.md) seed RNG/clock.
Five frames cover <1s after stream setup; they cannot prove a complete 3s countdown.
The manual runner collects repeated bursts for configured longer sequence checks.
Win/deuce/goal fixtures need controlled setup; normal random play is not a fixture.
`window.cvTestTool.captureScreenshot({count:5})` returns the latest in-memory batch.
`loadOpenCv()` shares initialized WASM; the workspace logs version + repository HEAD.
