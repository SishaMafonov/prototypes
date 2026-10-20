# Browser testing: integration, visual regression, and E2E

From `space-balls/`, Node.js 24:

```sh
npm ci
npx playwright install chromium
npm run test:browser
npm run test:e2e
npm run test:visual
npm run test:all
```

Playwright builds both targets, starts local static servers on 127.0.0.1:4173/4174,
and tears them down after the run. A port already in use fails explicitly; it
never silently tests an old dev server. No separate server command is needed.

## Test Trophy boundaries

The existing fast rule, media, compiler, structural, and scene suites remain the
foundation. Browser coverage adds a small set of high-value boundaries:

| Project | Target | Evidence |
| --- | --- | --- |
| `e2e` | ordinary production `dist/` | Six user journeys: keyboard selection/countdown, manual mouse/Space input, failed artwork/reload, native mic failure fallback, responsive reachability, CV workspace/WASM/iframe navigation |
| `browser-integration` | `.browser-test-dist/` | Seven controlled scenarios: both net collisions/goal resets, both winners/modal focus/replay, deuce, native Web Audio fixture track cleanup, permission rejection UI |
| `visual` | `.browser-test-dist/` | Real full-page raster comparisons for loading/error, four picker sprites, ready/countdown/play/boost/goal/HUD/results, portrait/short layouts and DPR 2 |

Only `vite build --mode browser-test` includes `window.__spaceBallsTest`. It exposes
a cloned observation and explicit `Partial<Match>` arrangement after Start.
Ordinary dev/production builds remove the fixture branch. The production smoke
test checks the API is absent from the page and its emitted entry JavaScript.
Tests that arrange match state are browser integration tests, not public-flow E2E.
Scoring fixtures place the ball at a net; real animation/collision rules award it.

## Determinism and baseline review

The browser runner pins Playwright (and its Chromium build), locale, timezone,
viewport and DPR. It seeds Math.random and freezes the browser clock before
navigation, then runs explicit animation-frame intervals. Assets, CSS, fonts,
canvas rasterization and browser layout remain real. No canvas/artwork is masked.
The screenshot redraw pins the decorative ring arc's performance reference to
5000ms, then restores the runner clock; this removes fractional navigation-origin
variation without weakening comparison thresholds or hiding the active ring.
Audio cleanup uses a native Web Audio MediaStream fixture at the acquisition
boundary; denial uses browser permission controls. Physical device/picker UX
remains a manual platform check. Native dialog navigation can visit browser chrome;
the keyboard assertion excludes background game controls and checks return focus.
Native capture failure is observed through a pass-through wrapper, not fabricated.
Some headless platforms return NotSupportedError before permission checking; E2E
records that observation and checks its exact fallback. A separate controlled
NotAllowedError scenario verifies the exact declined copy and manual play.

Baselines live in `baselines/<platform>/visual/`. The initial set is Windows
Chromium. Other OS/browser renderers need their own reviewed baseline set.
Missing baselines fail an ordinary run. Deliberate changes use:

```sh
npm run test:visual:update
npm run test:visual
```

Review the image diffs before committing updates. Never regenerate screenshots
just to make a failure disappear. Ordinary comparisons allow zero pixels beyond
the configured perceptual color threshold (0.1); there is no percentage allowance.
The negative control hides the canvas and requires the actual screenshot matcher
to reject the result. It only skips during explicit baseline generation.

The requirements mockups are not used as screenshot baselines. These captures
track the reviewed implementation; they do not calibrate the separate OpenCV
detector's candidate thresholds or establish pixel acceptance on every browser.

## Reports and execution limits

`reports/browser/html/index.html` is the browsable report; results.junit.xml and
results.json are machine-readable. Failure artifacts include screenshots, diffs
and retained Playwright traces. Runtime reports are ignored by Git; baselines are
tracked and included in requirements provenance. The baseline update command
overwrites expected images, so use it only for reviewed visual changes.

The current browser target is Chromium. Cross-browser coverage, physical-device
audio, native display-sharing selection, and long browser soak/performance tests
remain separate work. Native sharing is not automatically approved by this suite.
See [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
and [clock control](https://playwright.dev/docs/clock) for runner behavior.
