# Temporal predicates
Source: [match](../../src/match.ts), [goals](../../src/goals.ts),
[draw/input](../../src/main.ts), [capture](../../tools/cv-test-tool/capture.ts).
Use actual offsetMs/timestampMs and known setup; never assume exactly200ms spacing.

## V-TIME-01 — moving nets
On two+ visible frames, fit colored net rectangles near fixed x anchors.
Y changes within[T,B-height]; fitted height/width remain stable.
Given known normalized speed/direction, predicted travel is speed*dt*(Ch-height),
including reversals. Left/right speeds/phases are independent, not synchronized.
A near-turnaround window may have zero net displacement despite movement.

## V-TIME-02 — asteroid motion and trail
During known S-PLAY, track core centers between visible frames.
Expect at least two distinct observable positions in a controlled nonzero-velocity fixture.
Use local velocity direction to assess trailing plume; allow gravity/collisions to turn it.
Five samples cannot reconstruct every bounce or prove no tunneling.

## V-TIME-03 — countdown sequence
Known-clock scenario spans>3s; require Ready? -> Steady! -> GO! -> no round word.
Near1s boundaries allow one animation update, plus measured scheduling latency.
Current5-frame<1s API needs repeated batches; one batch cannot prove this requirement.
Goals may move while center ball waits; no tail before actual playing.

## V-TIME-04 — goal/reset
Controlled nonwinning score spans>1.2s + following countdown.
Contact-position ball is stationary/no tail in goal; nets may move.
Then center ball, preserved score, Ready? and subsequent sequence.
Use phase/score evidence to separate a goal from an unrelated static scene.

## V-TIME-05 — finished persistence
After controlled winning contact, no match-state changes across a later window.
Result dialog persists until New Game, including after Escape.
Blur/cursor/browser changes are excluded; backdrop appearance is not a reliable motion oracle.
On New Game, require picker Earth/1 of4 and no HUD/voice/result.

## V-TIME-06 — voice/manual response
Drive-on vs drive-off should increase selected-ring annulus brightness/support.
A650ms applied-status window may fit one batch; capture close to the controlled impulse.
The180ms click pulse may fall between200ms samples: use hold input for a robust scenario.
No causal claim about microphone/audio is valid from brightness changes alone.

```cv-config
[
{"id":"V-TIME-01","stages":["S-PLAY"],"checks":[{"op":"motion","target":"nets"}],"scope":"Observed independent net movement and bounded geometry; RNG excluded.","durationMs":800,"relatedIds":["C-GOAL-01","C-GOAL-02","C-GOAL-05"]},
{"id":"V-TIME-02","stages":["S-PLAY"],"checks":[{"op":"motion","target":"ball"},{"op":"tail"}],"scope":"Observed asteroid displacement and rear plume; unobserved collisions excluded.","durationMs":800,"relatedIds":["C-BALL-03"]},
{"id":"V-TIME-03","stages":["S-COUNT-READY"],"checks":[{"op":"countdown"}],"scope":"Changing central glyphs then disappearance over a long capture; exact wording excluded.","durationMs":4200},
{"id":"V-TIME-04","stages":["S-GOAL"],"checks":[{"op":"goalReset"}],"scope":"Observable contact-to-centered stationary core transition; scores excluded.","durationMs":2400,"relatedIds":["C-MATCH-05","I-FLOW-05"]},
{"id":"V-TIME-05","stages":["S-FINISH-YOU","S-FINISH-OPP"],"checks":[{"op":"panel","target":"result"},{"op":"stable","target":"result"}],"scope":"Modal pixel persistence; Escape/New Game behaviors excluded.","durationMs":1600,"relatedIds":["C-RESULT-04"]},
{"id":"V-TIME-06","stages":["S-PLAY"],"checks":[{"op":"glow"}],"scope":"Paired drive-off/on pixel response; causal audio and timer claims excluded.","durationMs":1600,"relatedIds":["C-INPUT-06"]}
]
```
