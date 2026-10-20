# Retrieval index
Read [CONTEXT](CONTEXT.md) first. Paths below are relative to this directory.
Each topic is self-contained within 100 lines; follow a link rather than slicing source.

## Components
| Contract | File | Implementation |
| --- | --- | --- |
| C-BOOT, C-PICK | [boot-selection](components/boot-selection.md) | main.ts assets/updateSelection |
| C-COURT | [court](components/court.md) | match.ts createArena; main.ts render/resizeCanvas |
| C-PLANET | [planets](components/planets.md) | planets.ts; match.ts applyPlanetDynamics |
| C-BALL, C-GOAL | [ball-goals](components/ball-goals.md) | goals.ts; main.ts drawBall/drawGoal |
| C-MATCH | [match](components/match.md) | match.ts phase transitions |
| C-HUD, C-RESULT | [hud-result](components/hud-result.md) | main.ts syncMatchInterface; style.css |
| C-INPUT | [input](components/input.md) | main.ts input handlers |
| C-AUDIO | [audio](components/audio.md) | microphone.ts; main.ts syncVoiceControls |
| C-HARNESS, C-FIXTURE | [workspace](components/workspace.md) | tools/cv-test-tool main/style/fixtures |
| C-CAPTURE | [capture](components/capture.md) | tools/cv-test-tool/capture.ts |
| C-CV, C-BUILD | [runtime-build](components/runtime-build.md) | tools/opencv*; vite.config.ts |
| C-CONVERT, C-SUITE | [visual-validation](components/visual-validation.md) | requirements compiler; vision runner |

## Integrations
| Contract | File |
| --- | --- |
| I-FLOW | [game flow](integrations/game-flow.md) |
| I-PHYSICS | [physics/render alignment](integrations/physics-render.md) |
| I-INPUT | [input/lifecycle](integrations/input-lifecycle.md) |
| I-TOOL | [workspace/capture/CV](integrations/tool-pipeline.md) |

## Visual reference
| Contract | File |
| --- | --- |
| S-* | [stage entry and visibility](visual/stages.md) |
| V-GEO-* | [geometry](visual/geometry.md) |
| V-MENU-*, V-STAGE-* | [stage checks](visual/checks.md) |
| V-ART-* | [artwork checks](visual/artwork.md) |
| V-UI-* | [overlay checks](visual/overlays.md) |
| V-RESP-* | [responsive checks](visual/responsive.md) |
| V-TIME-* | [temporal checks](visual/temporal.md) |
| V-TEXT-* | [copy/semantics](visual/copy.md) |
| V-TOOL-* | [workspace visuals](visual/workspace.md) |
| Matching method, tolerances | [matching](visual/matching.md) |
| Templates, masks, generation | [assets](assets/README.md) |
| Stage PNGs | [mockups](assets/mockups/README.md) |

## Execution context
[Translation](translation.md) defines records/results; [scenarios](scenarios.md)
defines setup; [coverage](coverage.md) distinguishes present evidence from future checks.
