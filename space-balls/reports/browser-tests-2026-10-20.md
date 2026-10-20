# Space Balls — Browser Regression and E2E Test Report

**PASS: 24 browser tests, zero failures, zero skips, zero retries/flaky results. The existing 154 fast tests also pass (178 total).**

## Execution

| Field | Value |
| --- | --- |
| Browser run started | 20 okt. 2026 17:53:42 CEST (Europe/Stockholm); 2026-10-20T15:53:42.990Z UTC |
| Browser run duration | 154.044 s, including two builds and browser setup |
| Environment | Windows; Node.js v24.13.0; Playwright 1.64.1; Chromium Headless Shell 156.0.8078.4 (revision 1248) |
| Command | npm run test:browser |
| Snapshot updates | Disabled (none); all comparisons use existing reviewed baselines. |
| Repository HEAD | ef997ea33de1c7ac28ec482581deead155f0f966 |
| Working tree | Uncommitted changes; accompanying SHA-256 manifest identifies all 135 reviewed source/config/test/baseline files. |
| Builds | Normal production build and browser-test build both type-check and bundle successfully. |
| Requirements verifier | PASS: 185 IDs, links, source/artifact hashes, PNG metadata, geometry fixtures and Markdown limits. |

## Test Trophy distribution

| Layer | Passing tests | Purpose |
| --- | ---: | --- |
| Existing fast rules/media/CV/structural/scene checks | 154 | Detailed behavior and component contracts with fast feedback. |
| Controlled browser integration | 7 | Actual collision/render/DOM/modal/audio connections using explicit state or media fixtures. |
| Production browser E2E | 6 | Public user journeys against the ordinary production build. |
| Browser visual regression and negative control | 11 | Compare 26 real raster baselines and prove the screenshot matcher rejects a missing canvas. |

The production E2E tests do not arrange private match state. Controlled integration and visual tests use a separate build exposing __spaceBallsTest. Its branch and API name are removed from ordinary builds; the production smoke test checks the page and emitted entry JavaScript. Browser contexts are isolated; traces/diffs are retained on failures.

## Visual evidence and review

Twenty-six Windows Chromium PNG baselines cover loading/error, Earth/Jupiter/Lava/Ice pickers, ready, Ready?/Steady!/GO!, play/tail/boost, goal hold, deuce/match point, both winners, portrait/short scenes, and DPR 2. Images were inspected, including a contact sheet and full-size modal/boost samples. Requirements schematic mockups are not used as baselines.

The runner seeds RNG, controls animation-frame time, fixes locale/timezone and uses real assets, CSS, fonts, canvas rasterization and browser layout. A screenshot redraw pins the decorative ring arc angle to a 5000ms performance reference, restoring the clock immediately afterwards. No game artwork/canvas is masked. Zero differing pixels above the 0.1 perceptual color threshold are permitted.

The negative control deliberately hides the canvas. The actual screenshot matcher must reject that image; its expected rejection counts as a successful negative-control test. This control was executed in the final run, not skipped.

## Individual browser results

| Project | Test / requirement references | Result | Duration (ms) |
| --- | --- | --- | ---: |
| e2e | C-BOOT-02, C-PICK-02, C-PICK-05, I-FLOW-03: production: keyboard selection → ready → countdown → play | PASS | 10782 |
| e2e | C-INPUT-01, C-INPUT-02, C-INPUT-04, I-INPUT-02: production: mouse capture and Space boost release without microphone input | PASS | 12151 |
| e2e | C-BOOT-03: production: a failed artwork request blocks Start and reload recovers | PASS | 2955 |
| e2e | C-AUDIO-05, C-INPUT-08: production: browser microphone failure keeps the manual game playable | PASS | 8469 |
| e2e | V-RESP-01, V-RESP-02, V-RESP-05: production: portrait and short resizing preserves reachable controls and backing size | PASS | 2726 |
| e2e | C-HARNESS-01, C-CV-03, I-INPUT-09: production: workspace loads WASM, navigates stories, and focuses the game iframe | PASS | 11446 |
| browser-integration | C-GOAL-04, I-FLOW-04, I-FLOW-05: controlled browser: net 0 → score → goal hold → fresh countdown | PASS | 15252 |
| browser-integration | C-GOAL-04, I-FLOW-04, I-FLOW-05: controlled browser: net 1 → score → goal hold → fresh countdown | PASS | 15166 |
| browser-integration | I-FLOW-06, I-FLOW-07, C-RESULT-04, V-RESP-06: controlled browser: winner 0, native modal keyboard containment, Escape persistence and replay | PASS | 14855 |
| browser-integration | I-FLOW-06, I-FLOW-07, C-RESULT-04, V-RESP-06: controlled browser: winner 1, native modal keyboard containment, Escape persistence and replay | PASS | 16620 |
| browser-integration | C-MATCH-04, I-FLOW-08: controlled browser: deuce → match point → deuce without a winner modal | PASS | 12333 |
| browser-integration | C-AUDIO-08, C-RESULT-01: controlled browser: a winning collision releases native Web Audio fixture tracks | PASS | 10281 |
| browser-integration | C-AUDIO-05, C-INPUT-08, V-TEXT-03: controlled browser: permission rejection projects exact denied copy and preserves Boost | PASS | 10684 |
| visual | C-BOOT-02, C-BOOT-03, V-TEXT-01: visual: loading gate and artwork error | PASS | 4572 |
| visual | V-MENU-01, C-PICK-01: visual: all four real planet picker sprites | PASS | 7050 |
| visual | V-MENU-02, V-STAGE-01: visual: ready and all three countdown overlays | PASS | 7261 |
| visual | V-STAGE-02, C-INPUT-05, C-BALL-03: visual: playing field, tail, selected ring and manual drive glow | PASS | 9603 |
| visual | V-STAGE-03, V-UI-03, I-FLOW-08: visual: scoring hold, deuce, and match-point HUD | PASS | 10080 |
| visual | V-STAGE-04, C-RESULT-02: visual: winner 0 final modal and backdrop | PASS | 8361 |
| visual | V-STAGE-04, C-RESULT-02: visual: winner 1 final modal and backdrop | PASS | 10060 |
| visual | V-RESP-01, V-RESP-05: visual: portrait picker, ready, play, result with reachable controls | PASS | 8857 |
| visual | V-RESP-01, V-RESP-05: visual: short picker, ready, play, result with reachable controls | PASS | 8931 |
| visual | visual negative control: hiding the rendered canvas is rejected by the actual snapshot matcher | PASS | 4603 |
| visual | V-RESP-02, I-PHYSICS-08: visual: dense backing store preserves logical field geometry | PASS | 23742 |

## Observations and limits

- Native microphone permission is set to denied and verified through the browser Permissions API. This environment reports NotSupportedError from native capture before permission processing; E2E checks its exact manual-play fallback. A separate controlled NotAllowedError test checks declined copy. No physical capture success is claimed.
- Audio cleanup uses real browser AudioContext/MediaStream/track objects supplied by a Web Audio acquisition fixture; the winning collision ends those tracks.
- Native dialog Tab navigation may briefly visit browser chrome. Assertions exclude background controls, verify return focus, Escape persistence and replay focus restoration.
- The reviewed screenshot renderer is pinned Windows Chromium. Other platforms/browsers require separate reviewed baselines. Native share pickers, physical devices and long browser soak/performance testing remain outside this suite.
- Builds pass with the existing OpenCV browser externalization and large-chunk warnings. The separate CV detector thresholds remain experimental; screenshot comparisons do not calibrate those thresholds.

## Attachments and rerunning

- browser-tests-2026-10-20.junit.xml: native Playwright JUnit report for ticket attachment/import.
- browser-tests-2026-10-20.run.json: test cases, observed capture error, runner versions and reviewed file hashes.
- reports/browser/html/index.html: interactive HTML report with attachments (local output, ignored by Git).
- tests/browser/baselines/win32/visual/: reviewed PNG expectations.

Use `npm run test:browser`, `npm run test:e2e`, or `npm run test:visual` from space-balls/. `npm run test:all` runs the fast suite, browser suite and requirements verifier. Install the pinned browser once with `npx playwright install chromium`. Baseline changes require explicit `npm run test:visual:update`, image review and an ordinary comparison run.

