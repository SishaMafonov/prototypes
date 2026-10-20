# Space Balls — Game Scene-Graph Test Report

**PASS: 61 scene tests passed; complete project suite: 154 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.**

## Execution and tested snapshot

| Field | Value |
| --- | --- |
| Log completed | 20 okt. 2026 17:17:10 CEST (Europe/Stockholm); 2026-10-20T15:17:10.788Z UTC |
| Command | npm test |
| Complete suite duration | 26854.0037 ms, reported by Node; tests may run concurrently |
| Runtime | Node.js v24.13.0, Windows x64, Happy DOM 21.0.3, Rolldown 1.2.14 |
| Repository HEAD | 696afdc524a8f97f665aca84c3f7422c8daffbb9 |
| Working tree | Dirty: changes are uncommitted; the accompanying source SHA-256 manifest identifies the tested files. |
| Scene traceability | 57 distinct requirement IDs linked to specific assertions, not complete coverage of every clause. |
| Additional verification | npm run build: PASS; node requirements/verify.mjs: PASS (185 requirement IDs). |

## Method and component coverage

The real TypeScript game entry point, event handlers, match/planet rules, and microphone implementation execute in an isolated VM with Happy DOM. The submitted canvas scene records nested save/restore scopes, image sources and crops, transforms, clip ancestry, styles, and paint order. The live DOM contributes parent/child relationships, attributes, text, and visibility. Test code removes imports and strips type syntax; the shipped game has no test hooks.

Independent expected geometry comes from the checked-in requirements fixtures. Stage membership comes from the requirements stage table. Tests use deterministic frame scheduling, RNG, layout rectangles, asset events, and mocked audio devices. Explicit ball/score/effect/status fixtures establish isolated conditions.

| Component | Evidence |
| --- | --- |
| Boot and artwork | Single roots, four-asset gate, four individual asset failures, initialization failures. |
| Picker | All four atlas identities/names/counts, keyboard/wrap, preview uniqueness, selection/focus continuity. |
| Court and field | Background/veil, eight planets and eight rings, body alignment, right mirroring, scale, paint order. |
| Goals | Two colored frames, independent travel positions, court geometry, 4-by-8 meshes. |
| Asteroid and tail | Phase presence, texture crop, court clip, nested transforms, portrait velocity heading, restored alpha. |
| Match HUD and result | All 11 stages, exact scores/rules, repeated deuce/point variants, both winner dialogs, persistence, replay reset. |
| Input and microphone | Pointer capture/release, Space/focus/blur, pulse and applied-feedback timing, seven mic statuses, meter separation, lifecycle cleanup. |
| Responsive scene | Landscape 960×540, portrait 390×844, short 844×390; DPR 1 and 2, resize recovery and short-height media declarations. |
| Negative controls | Intentional missing asteroid/clip, wrong mirror, leaked voice panel, and wrong meter parentage are detected. Recorder scope/transform restoration is checked. |

## Results by scene test file

| File under tests/scene | Passed | Failed |
| --- | ---: | ---: |
| geometry.test.mjs | 10 | 0 |
| interface.test.mjs | 22 | 0 |
| negative.test.mjs | 6 | 0 |
| stages.test.mjs | 23 | 0 |
| **Scene total** | **61** | **0** |

The full project run also passed the existing 68 logic/media/CV tests and 25 structural tests.

## Individual scene results

### geometry.test.mjs

| Test / requirement IDs | Result | Duration (ms) |
| --- | --- | ---: |
| C-COURT-02, C-COURT-04, C-COURT-05, C-PLANET-01, C-PLANET-02, C-PLANET-03, C-PLANET-04, I-PHYSICS-02: landscape DPR 1: every sprite and ring matches the independent geometry fixture | PASS | 1473.5284 |
| C-COURT-02, C-COURT-04, C-COURT-05, C-PLANET-01, C-PLANET-02, C-PLANET-03, C-PLANET-04, I-PHYSICS-02: landscape DPR 2: every sprite and ring matches the independent geometry fixture | PASS | 921.0472 |
| C-COURT-02, C-COURT-04, C-COURT-05, C-PLANET-01, C-PLANET-02, C-PLANET-03, C-PLANET-04, I-PHYSICS-02: portrait DPR 1: every sprite and ring matches the independent geometry fixture | PASS | 728.8512 |
| C-COURT-02, C-COURT-04, C-COURT-05, C-PLANET-01, C-PLANET-02, C-PLANET-03, C-PLANET-04, I-PHYSICS-02: portrait DPR 2: every sprite and ring matches the independent geometry fixture | PASS | 460.7750 |
| C-COURT-02, C-COURT-04, C-COURT-05, C-PLANET-01, C-PLANET-02, C-PLANET-03, C-PLANET-04, I-PHYSICS-02: short DPR 1: every sprite and ring matches the independent geometry fixture | PASS | 415.9506 |
| C-COURT-02, C-COURT-04, C-COURT-05, C-PLANET-01, C-PLANET-02, C-PLANET-03, C-PLANET-04, I-PHYSICS-02: short DPR 2: every sprite and ring matches the independent geometry fixture | PASS | 345.5957 |
| C-GOAL-03, I-PHYSICS-03: both colored goal groups have the correct frame and 4-by-8 mesh | PASS | 269.5060 |
| C-BALL-02, C-BALL-03, C-BALL-04, I-PHYSICS-04, I-PHYSICS-05, I-PHYSICS-06: landscape: tail and asteroid share a court clip with isolated rotation/alpha | PASS | 427.1360 |
| C-BALL-02, C-BALL-03, C-BALL-04, I-PHYSICS-04, I-PHYSICS-05, I-PHYSICS-06: portrait: tail and asteroid share a court clip with isolated rotation/alpha | PASS | 511.1023 |
| C-COURT-04, C-COURT-06, I-PHYSICS-08: resize and DPR changes update one scene without duplicating components or normalized positions | PASS | 351.1707 |

### interface.test.mjs

| Test / requirement IDs | Result | Duration (ms) |
| --- | --- | ---: |
| C-HUD-01, C-HUD-02, I-FLOW-08, V-TEXT-02: 2:3: score nodes and rule styling project the same match | PASS | 942.7744 |
| C-HUD-01, C-HUD-02, I-FLOW-08, V-TEXT-02: 9:9: score nodes and rule styling project the same match | PASS | 269.8788 |
| C-HUD-01, C-HUD-02, I-FLOW-08, V-TEXT-02: 9:8: score nodes and rule styling project the same match | PASS | 470.0244 |
| C-HUD-01, C-HUD-02, I-FLOW-08, V-TEXT-02: 8:9: score nodes and rule styling project the same match | PASS | 429.6639 |
| C-HUD-01, C-HUD-02, I-FLOW-08, V-TEXT-02: 12:12: score nodes and rule styling project the same match | PASS | 381.2652 |
| C-RESULT-01, C-RESULT-02, C-RESULT-04, I-FLOW-06, I-FLOW-07, V-TEXT-02: winner 0: persistent modal owns final score and replay returns a clean picker | PASS | 711.4204 |
| C-RESULT-01, C-RESULT-02, C-RESULT-04, I-FLOW-06, I-FLOW-07, V-TEXT-02: winner 1: persistent modal owns final score and replay returns a clean picker | PASS | 760.1827 |
| C-INPUT-01, C-INPUT-04, C-INPUT-05: pointerup: Boost ring activity releases while the mic meter stays independent | PASS | 389.7794 |
| C-INPUT-01, C-INPUT-04, C-INPUT-05: pointercancel: Boost ring activity releases while the mic meter stays independent | PASS | 418.2428 |
| C-INPUT-01, C-INPUT-04, C-INPUT-05: lostpointercapture: Boost ring activity releases while the mic meter stays independent | PASS | 338.6845 |
| C-INPUT-02, C-INPUT-03, I-INPUT-06: Space honors focused buttons, and blur/keyup release manual scene activity | PASS | 306.0062 |
| C-INPUT-02, C-INPUT-06, I-INPUT-03, V-TEXT-04: click pulse and applied impulse feedback have distinct scene lifetimes | PASS | 233.5722 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone off: consistent control subtree, copy, and pressed state | PASS | 75.0768 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone requesting: consistent control subtree, copy, and pressed state | PASS | 116.6875 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone active: consistent control subtree, copy, and pressed state | PASS | 91.4908 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone paused: consistent control subtree, copy, and pressed state | PASS | 78.5790 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone denied: consistent control subtree, copy, and pressed state | PASS | 75.1403 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone unavailable: consistent control subtree, copy, and pressed state | PASS | 85.9660 |
| C-AUDIO-09, C-INPUT-08, V-TEXT-03: microphone error: consistent control subtree, copy, and pressed state | PASS | 77.6254 |
| C-AUDIO-04, C-AUDIO-08, I-INPUT-01, I-INPUT-02: actual microphone lifecycle projects requesting/active/off and voice-only meter into the scene | PASS | 240.3966 |
| C-AUDIO-08, I-INPUT-06, I-INPUT-08: hidden page releases real mic resources and removes drive feedback without reacquiring on return | PASS | 146.9840 |
| C-INPUT-07, C-HUD-04, C-RESULT-03: short-height CSS hides help while retaining interactive controls and scrollable result content | PASS | 219.1729 |

### negative.test.mjs

| Test / requirement IDs | Result | Duration (ms) |
| --- | --- | ---: |
| recorder preserves nested parentage, transform/clip ancestry, and restored style | PASS | 121.7116 |
| negative control: scene assertions detect missing asteroid | PASS | 1401.0839 |
| negative control: scene assertions detect wrong mirror | PASS | 777.1365 |
| negative control: scene assertions detect missing court clip | PASS | 781.2612 |
| negative control: scene assertions detect hidden voice panel retained after finish | PASS | 344.3544 |
| negative control: a meter moved outside the action group violates scene parentage | PASS | 169.6745 |

### stages.test.mjs

| Test / requirement IDs | Result | Duration (ms) |
| --- | --- | ---: |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-LOAD: exact DOM/canvas component membership | PASS | 731.9606 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-ASSET-ERROR: exact DOM/canvas component membership | PASS | 640.9176 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-PICK: exact DOM/canvas component membership | PASS | 497.3051 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-READY: exact DOM/canvas component membership | PASS | 419.2955 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-COUNT-READY: exact DOM/canvas component membership | PASS | 332.9092 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-COUNT-STEADY: exact DOM/canvas component membership | PASS | 298.4995 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-COUNT-GO: exact DOM/canvas component membership | PASS | 413.4926 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-PLAY: exact DOM/canvas component membership | PASS | 413.3516 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-GOAL: exact DOM/canvas component membership | PASS | 311.8155 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-FINISH-YOU: exact DOM/canvas component membership | PASS | 534.9582 |
| C-BOOT-01, C-PICK-04, C-HUD-01, C-HUD-03, C-INPUT-07, C-RESULT-01: S-FINISH-OPP: exact DOM/canvas component membership | PASS | 239.4993 |
| C-BOOT-01, C-HUD-01, C-HUD-03, C-RESULT-02, C-AUDIO-09: scene roots, semantic parents, and referenced labels are unique | PASS | 98.4102 |
| C-BOOT-01: missing app and unavailable canvas context fail initialization | PASS | 230.9262 |
| C-BOOT-02, C-PICK-03: all four assets must load before Confirm can change scene | PASS | 95.2131 |
| C-BOOT-03: background.png failure leaves the error picker and no match scene | PASS | 136.3678 |
| C-BOOT-03: planets.png failure leaves the error picker and no match scene | PASS | 87.1847 |
| C-BOOT-03: ball.png failure leaves the error picker and no match scene | PASS | 66.7680 |
| C-BOOT-03: ball_tail.png failure leaves the error picker and no match scene | PASS | 77.7244 |
| C-PICK-01, C-PICK-02, C-PICK-05, I-FLOW-01: Earth: picker art/name and controlled field stay linked | PASS | 220.8971 |
| C-PICK-01, C-PICK-02, C-PICK-05, I-FLOW-01: Jupiter: picker art/name and controlled field stay linked | PASS | 283.7165 |
| C-PICK-01, C-PICK-02, C-PICK-05, I-FLOW-01: Lava: picker art/name and controlled field stay linked | PASS | 403.1712 |
| C-PICK-01, C-PICK-02, C-PICK-05, I-FLOW-01: Ice: picker art/name and controlled field stay linked | PASS | 276.3388 |
| C-PICK-01, C-PICK-02: picker arrows and keyboard wrap without duplicating its preview | PASS | 175.8237 |

## Limits and observations

- These assertions inspect submitted canvas commands and DOM composition. They do not rasterize artwork, certify real browser layout/hit testing, or validate the browser dialog top layer/focus trap.
- Viewport/preview rectangles, asset events, frame timing, pointer capture, and microphone devices are controlled fixtures. Real browser/media behavior and pixel calibration remain separate checks.
- Node emits an ExperimentalWarning for its native stripTypeScriptTypes API. The complete run exits successfully with no failed/skipped tests.
- The successful build reports OpenCV fs/crypto browser externalization, large runtime chunk, and plugin timing warnings.

## Attachments and reproduction

- scene-tests-2026-10-20.md: this self-contained Jira attachment.
- game-tests-2026-10-20.log: saved npm test output, including all 154 individual results and native runner totals.
- scene-tests-2026-10-20.run.json: environment, command, totals, log hash, requirement references, and all 102 tested source/config/test SHA-256 hashes.

From space-balls/, use `npm run test:scene` for the 61 scene tests or `npm test` for the full suite. The tested implementation is uncommitted; use the manifest with HEAD to identify this run.

