# CV workspace and motion fixture
Source: [HTML](../../tools/cv-test-tool/index.html),
[main](../../tools/cv-test-tool/main.ts), [CSS](../../tools/cv-test-tool/style.css),
[motion](../../tools/cv-test-tool/fixtures/motion.ts).
Visual: [workspace checks](../visual/workspace.md).

- **C-HARNESS-01**: navigation selects Space Balls or Motion study in one iframe.
  Unknown hashes fall back to Space Balls; inherited object keys are not stories.
- **C-HARNESS-02**: navigating/reloading stops sharing, clears workspace frames,
  marks preview loading, then enables capture on the iframe load event.
  Busy captures block story navigation, reload, count edit, clear, and extra captures.
- **C-HARNESS-03**: publish window.cvTestTool on the workspace window, not the iframe.
  API captureScreenshot({count}) and readonly screenshots share UI implementation.
- **C-HARNESS-04**: first button call preserves user activation, scrolls preview into view,
  opens the browser picker, and explains selecting the workspace's own tab.
- **C-HARNESS-05**: successful batch renders thumbnails, offsets, dimensions,
  RGBA memory size, and latest-batch count; no frames are written to disk/uploaded.
  Clearing releases workspace references; external callers own older references.
- **C-HARNESS-06**: Stop sharing keeps successful frames.
  pagehide stops capture. Errors are visible and reject API promises.
- **C-HARNESS-07**: sidebar becomes top navigation <=600px;
  preview remains 16:9, with width limited by available viewport and container.
  This is a harness layout constraint, not the game's only supported aspect ratio.
- **C-FIXTURE-01**: Motion study is independent 960x540 canvas content,
  with moving sphere, orbit, frame/time labels, blue and mint swatches.
- **C-FIXTURE-02**: sphere center=(480+300sin(2t),300+50cos(2t)), radius36.
  Frame counter increments per animation callback; time is elapsed performance time.
  Canvas stretches to the iframe; fixed drawing-space aspect can therefore stretch.

Evidence: browser navigation/layout checks; fixture animation is intentionally variable.
