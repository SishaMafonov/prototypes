---
document_type: regression_plan_and_runbook
project: fool-house
scope: scene structure, deterministic animation, browser behavior, screenshots and browser JavaScript coverage
entrypoints: package.json, playwright.config.ts, e2e/, tests/scene.test.mjs
---

# Regression testing

**Choice: Playwright Test1.65.0 + pinned Chromium, with Monocart3.2.0 for native browser JavaScript coverage.** The existing Node rule/statistics suite stays separate. Playwright supplies virtual time, mouse/touch/keyboard actions, PNG comparison and failure traces. Monocart maps the browser's executed bundle back to TypeScript through inline source maps. No game framework or runtime dependency is added.

## Scope and implementation plan

| Layer | Scope | Source/test contract |
| --- | --- | --- |
| Rule regression | Weighted draws, payouts, cascades, collections, Scatters, Mystery, seeded bonus accounting, historical/current RTP evidence | Existing `tests/*.test.mjs`; the billion-round study is audited, not rerun by CI |
| Scene graph | Cover background, centered/aspect-preserving reels, 25 unique clipped apertures, nonoverlap, collection/HUD separation, frame/overlay layers, corridor projection and door order | `src/scene.ts` is consumed by the actual renderer; `tests/scene.test.mjs` checks geometry across six sizes; `layout.graph.spec.ts` checks live output/backing resolution and resize preservation |
| Functional E2E | Idle startup; mouse/touch/keyboard; repeated/busy input; paid resets; exact Mystery hold/shared reveal; hole-only cascade; room extra clears; retained Scatters/free floors; delayed bonus; modal focus/Escape/backdrop; all four prize kinds; all six doubled floor rewards/floor cap/zero seed; credits/return; art failure/reload | `e2e/functional.spec.ts`, real UI actions through production rules |
| Visual layout | All five room backgrounds, title, frame, symbols/tints, collection and HUD | `layout.visual.spec.ts`, desktop/mobile/compact/landscape |
| Visual motion/state | Growing symbols, landed Mystery, picker/reveal, winners/removal/holes, room multiplier/collection/floor popup, Scatter retention, intro/25 moves, corridor midpoint/doors/opening, all prizes/reset/completion and Floor6/×256 | `animation.visual.spec.ts`, normal-motion virtual-time frames on desktop/mobile |
| Browser coverage | Merged source-mapped browser V8 lines/functions/branches from functional and visual cases | Five shipped source modules: main/game/bonus/bonus-scene/scene. Exclude test observer, test code, packages and generated assets. Separate from rule-test coverage or feature completion |

No end-to-end case injects a completed board, awards money, skips to a game state or replaces a rule function. Named scenarios supply a finite uniform-RNG input stream before startup; unexpected draws fail loudly. Tests then click/tap/press keys and advance the clock. Snapshots and assertions exercise actual loaded artwork and the actual renderer.

## Deterministic animation contract

1. Install Playwright's clock before navigation. Let artwork/font loading and the static nonwinning startup finish, then pause at one fixed virtual timestamp. This keeps image initialization independent of fake animation frames and eliminates load-speed differences from later visual phases.
2. Use `clock.runFor` for sampled frames and timing boundaries, firing animation frames and Promise continuations. Use `clock.fastForward` only to cross phases whose intermediate frames are not under assertion. Production durations and normal-motion drawing remain enabled; reduced motion has its own functional case. The committed500ms Mystery pause and700ms reveal credit boundary are tested explicitly. Earlier2000ms documentation was stale; the test preserves the committed implementation.
3. Gameplay RNG is a named finite sequence derived from current draw intervals. Animation/render/resize must consume no outcome RNG. Pure production draws still use `Math.random` normally.
4. At screenshot time, pause/finish CSS-only effects with Playwright's `animations: disabled`. Canvas motion is frozen at the requested JavaScript frame. Do not mask the board, prizes, money, title or HUD.
5. A read-only `window.__foolHouseTest.read()` observer exists only in `--mode e2e`. It returns structured clones of state and the renderer's geometry. It has no setters, spin bypass or payout controls. The production build removes the observer import; it is checked separately.

The E2E server serves a compiled Vite `e2e` build from `.e2e-dist`, with inline source maps. Tests therefore avoid HMR/network timing and exercise the bundled application. A normal `npm run build` still produces the production `dist` without the observer.

## Browser and baseline matrix

| Project | Viewport / DPR | Coverage |
| --- | --- | --- |
| desktop | 1280×800 /1 | All functional, visual and graph cases |
| mobile | 390×844 /1, touch/mobile enabled | All functional, visual and graph cases |
| compact | 375×667 /1 | Five opening-room images and live geometry/resize |
| landscape | 844×390 /1 | Five opening-room images and live geometry/resize |
| hidpi | 390×844 /3 | Live geometry and backing-store sizing; screenshot scale stays CSS |
| production | 390×844 /1 | Separate normal production build; no observer; first keyboard paid round |

Committed goldens live in `e2e/__screenshots__/{platform}/{project}/...`. Initial canonical images are Windows/Chromium. The CI job runs on Windows; other operating systems need separately reviewed goldens because font rasterization differs. This is Chromium mobile emulation, not a claim of real iOS/Safari/Android-device coverage. Firefox/WebKit, real devices, screen-reader audits, audio and long-lived soak testing are follow-up scope.

Screenshots use threshold0.2 and at most0.1% differing pixels. These tolerate minor antialiasing while detecting layout/art/panel changes. Do not loosen them to hide a meaningful difference. Pin the browser/package lock; review baseline updates when upgrading browser or OS images.

## Commands

Run from `fool-house/` with Node24:

```powershell
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:e2e:types
npm run test:e2e
npm run test:e2e:coverage
# All required local checks:
npm run test:regression
```

Use `npm run test:e2e -- --project=mobile` or `--grep "Mystery"` to narrow a failure. `npx playwright show-report` opens the HTML report. `npx playwright show-trace test-results/.../trace.zip` opens a failure trace. CI retains HTML/coverage reports plus failure PNGs, diff images and traces with filmstrips; generated outputs are ignored. Video encoding is off for virtual-time runs to avoid encoding the skipped virtual duration during teardown.

`npm run test:e2e:coverage` cleans only generated raw coverage JSON and merges this run. Reports: `coverage/e2e/report/index.html`, `coverage/e2e/report/coverage-report.json` and `coverage/e2e/summary.json`. Gates require lines≥80%, functions≥80%, branches≥65%; missing coverage/report data fails the run. These are implementation-execution floors, not proof that every rule branch or every possible board is covered. The scenario matrix is a separate requirement.

## Baseline review workflow

1. Run the suite normally and inspect the expected/actual/diff PNG plus trace for failures. Determine whether the app regressed or the intended appearance changed.
2. For an intentional change, run `npm run test:e2e:update -- --project=mobile --grep "specific case"`. Update only relevant cases. Normal runs use `updateSnapshots: 'none'`, so missing goldens fail too. Never update baselines automatically in CI or as a retry.
3. Inspect the generated images at native size, especially aperture clipping, title/HUD clearance, bonus controls and readable text. Commit the baseline and the implementation together.
4. Run without `--update-snapshots` to prove comparison succeeds. Repeat the normal-motion suite to check determinism. Keep unexpected runtime errors and exhausted scenario streams as hard failures.

## Verified result

Verified locally on 2026-11-07 with Node24.13.0, Playwright1.65.0 and its pinned Chromium1254 (158.0.8127.18):

- 48 Node tests passed; production build, production observer absence check and strict E2E type-check passed.
- 74 browser cases passed without baseline updates (6.0 minutes), after focused bonus and maximum-floor visual checks.
- 72 PNG goldens plus7 JSON scene snapshots. New Floor6 prize-panel and×256 reveal screenshots cover desktop/mobile; maximum-floor mobile images were visually inspected.
- Current browser coverage:96.32% lines (1308/1358),96.69% functions (146/151),92.14% branches (375/407),95.69% statements (377/394). All five application modules were present; gates passed.
- Windows GitHub Actions is configured; no remote CI run was performed from this session. See `docs/testing/verification.json` for compact machine-readable evidence.


Current v15 bonus rewards double both coins and multiplier values at each ascent. Unit, native/helper and browser regressions cover the new behavior; historical calibration audits use frozen source bytes. Current RTP is unmeasured.

References: [Playwright clock](https://playwright.dev/docs/clock), [screenshot assertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1), [Monocart native coverage](https://github.com/cenfun/monocart-coverage-reports).
