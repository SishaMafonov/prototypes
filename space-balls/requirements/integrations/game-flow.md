# Game flow contracts
Source: [main.ts](../../src/main.ts), [match.ts](../../src/match.ts).
Related: [stage table](../visual/stages.md), [scenarios](../scenarios.md).

- **I-FLOW-01**: assets-ready + Confirm transfers chosen planet to ready;
  Start transfers it into createMatch and selects the same left controlled field.
  Verify label, art, ring, and match.selectedPlanet agree.
- **I-FLOW-02**: Start creates countdown with0:0, centered stationary ball,
  visible HUD and voice panel; no picker or start veil remains.
- **I-FLOW-03**: Ready?/Steady!/GO! follow match.elapsed at one-second boundaries.
  When playing begins, remove round overlay and reveal the moving tail.
- **I-FLOW-04**: right-net collision increments You; left-net increments Opponent.
  Render matching score and message on the next animation synchronization.
  A nonwinning score retains the contact ball position during the1.2s goal hold.
- **I-FLOW-05**: after goal hold, reset ball to court center and remove tail;
  preserve scores, restart three-second countdown, and keep the selected planet.
- **I-FLOW-06**: winning point bypasses goal/countdown UI and opens result modal.
  Final title/score/winner color derive from the same match, not an independent UI counter.
- **I-FLOW-07**: New Game closes modal, stops input/audio, hides HUD/voice/round UI,
  discards match, selects Earth/1 of4, and restores picker arrow focus.
- **I-FLOW-08**: deuce and match-point text are derived on every score/phase change.
  Match point is gold; ordinary rule/deuce use normal rule styling.

Verify score/phase data with logic/DOM plus pixels; images alone are insufficient.
The existing tests cover Match transitions; end-to-end DOM synchronization needs a runner.
