# Scenario setup and run windows
Current browser game has no seeded/state-injection API. Steps marked CONTROLLED
describe fixtures needed by a future runner, not public APIs that exist today.
Start with [CONTEXT](CONTEXT.md), [stages](visual/stages.md), [translation](translation.md).

| Scenario | Setup | Window / evidence |
| --- | --- | --- |
| PICK-EARTH | fresh game, wait Confirm enabled | one stable S-PICK capture + DOM |
| PICK-WRAP | Previous from Earth -> Ice, Next -> Earth | before/after + label/count |
| PICK-ALL | Next3 times with settled captures | one per planet; no baseline text image |
| READY | Confirm after chosen planet | stable ready frame + DOM; no Match/HUD |
| COUNTDOWN | Start | known clock over>3s, repeated captures + phase/copy |
| PLAY-FIELD | Start and wait countdown ends | five frames; exclude HUD/voice/ball overlaps |
| BOOST-HOLD | mic off, hold Boost during play | baseline then drive-on; meter stays0 |
| MIC-DENIED | deny browser mic permission manually/mock | status + manual input remains usable |
| LOAD-ERROR | CONTROLLED intercept/drop one artwork request | disabled Confirm + error text |
| GOAL-YOU | CONTROLLED near-right-net incoming ball | collision +1.2s hold + reset |
| GOAL-OPP | CONTROLLED near-left-net incoming ball | mirrored award/message |
| DEUCE | CONTROLLED scores9:9 or10:10 | rule strip + no winner modal |
| MATCH-POINT | CONTROLLED scores9:8 and8:9 | gold strip + correct copy |
| FINISH-YOU | CONTROLLED9:8 then right-net contact | modal + frozen state + replay |
| FINISH-OPP | CONTROLLED8:9 then left-net contact | opposite title/color/scores |
| RESET | New Game from either result | Earth/1 of4, no HUD/voice/modal, focus Previous |
| PORTRAIT | direct game390x844, known stage | normalize geometry and control reachability |
| SHORT | direct game844x390, known stage | compact controls/dialog, no help line |
| DPR | repeat known stage at DPR1 and2 | logical geometry unchanged; inspect backing size |
| CAPTURE | workspace Motion study, approve own tab | five independent buffers, offsets<1000ms |
| WRONG-SOURCE | workspace, choose another tab/window | reject/crop error, no new game batch |

## Acquisition discipline
Obtain display-sharing permission through the user gesture and native picker.
Do not trigger microphone just to obtain visual frames; manual Boost is sufficient.
Record viewport W,H, DPR, captured dimensions, source story, stage, selected planet,
known scores, commit, browser, timestamps, and whether input is held.
Current capture records expose ImageData/offsetMs/timestampMs/mediaTime only.
A one-second burst is not enough to observe3s countdown or1.2s goal reset.
For long scenarios use successive batches or a future longer-duration collector.
Shared streams and thumbnails must not be treated as approved live baselines.
