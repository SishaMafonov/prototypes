# Stage identity and visibility
A stage is outer state + Match phase + optional asset/input/score substate.
Source: [main](../../src/main.ts), [match](../../src/match.ts).
Use known setup or DOM to name a stage before evaluating pixels.

| Stage ID | Preconditions / entry | Visible foreground | Absent foreground |
| --- | --- | --- | --- |
| S-LOAD | fresh document, assets pending | picker, loading Confirm disabled | HUD, voice, Start, result |
| S-ASSET-ERROR | block >=1 image | picker, error and disabled Confirm | HUD, voice, Start, result |
| S-PICK | all art ready; selecting | one selected planet, arrows, name, count, Confirm | formation/nets/ball, HUD, voice |
| S-READY | Confirm | Start title/hint and voice panel; dim court | picker, formation/nets/ball, HUD |
| S-COUNT-READY | Start or goal reset, elapsed[0,1) | full field, HUD, voice, Ready? | picker, Start, tail, result |
| S-COUNT-STEADY | elapsed[1,2) | same, Steady! | picker, Start, tail, result |
| S-COUNT-GO | elapsed[2,3) | same, GO! | picker, Start, tail, result |
| S-PLAY | countdown completed | field, moving ball/tail, nets, HUD, voice | picker, Start, round message, result |
| S-GOAL | nonwinning net contact, elapsed[0,1.2) | field, stopped ball, HUD, score message, voice | tail, picker, Start, result |
| S-FINISH-YOU | winner0 | cyan winner modal and final scores | round message, voice, picker, Start |
| S-FINISH-OPP | winner1 | pink winner modal and final scores | round message, voice, picker, Start |

Formation/rings/nets still exist under finished modal/backdrop but may be obscured.
Centered countdown ball is behind round text/gradient; detect only if observable.
Scoreboard also exists under the result backdrop; do not count it as a second result.
Ready does not create Match and therefore has no scoreboard or field formation.

## Orthogonal substates
- S-SCORE-NORMAL / S-SCORE-DEUCE / S-SCORE-POINT: HUD rule strip variants.
- S-MIC-OFF / REQUEST / ACTIVE / PAUSED / DENIED / UNAVAILABLE / ERROR.
- S-DRIVE-IDLE / WAITING / APPLIED: ring/status variants, not new match phases.
- Selected planet Earth/Jupiter/Lava/Ice changes one picker image and controlled left ring.
- Hover, focus, pressed, safe-area, and <=420px-height styles are independent variants.
- Workspace Idle/Choose this tab/Capturing/Sharing preview is not a game stage.

## Minimal classification
V-MENU-01 + correct DOM name -> picker.
V-MENU-02 + voice panel and no HUD -> ready.
V-STAGE-01 + round DOM text -> countdown.
V-STAGE-02 + no round DOM text -> playing.
V-STAGE-03 + score DOM message -> goal.
V-STAGE-04 + exact winner DOM -> finished.
If several signatures fit, return INCONCLUSIVE rather than selecting the closest image.
See [stage mockups](../assets/mockups/README.md); they are explanatory, not baselines.
