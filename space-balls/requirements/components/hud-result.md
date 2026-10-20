# Scoreboard, round overlay, result modal
Source: [main.ts](../../src/main.ts) syncMatchInterface/New Game,
[style.css](../../src/style.css).
Visual: [overlays](../visual/overlays.md), [copy](../visual/copy.md).

- **C-HUD-01**: scoreboard first appears at Start/countdown.
  Left is You/cyan and right Opponent/pink, with numeric scores and divider.
- **C-HUD-02**: scoreboard is horizontally centered, top=max(6dvh,safe-area-top).
  .match-rule sits 6 CSS px below its bottom and reflects scoreStatus.
  Match-point text becomes gold; deuce does not acquire match-point styling.
- **C-HUD-03**: round message appears only in countdown/goal and uses roundMessage.
  Countdown hint="Get ready for launch"; goal hint="Next round starting…".
  It is absent during ordinary playing and finished.
- **C-HUD-04**: round overlay covers the viewport but passes pointer events through;
  voice controls remain interactive. Its radial navy gradient can obscure ball/art.
- **C-RESULT-01**: finished opens a modal dialog once, hides round/voice overlays,
  stops mic and clears manual/voice drive and boost feedback.
- **C-RESULT-02**: dialog shows trophy, Congratulations!, winner title,
  exact final You/Opponent scores, replay explanation, and New Game.
  You win! is cyan; Opponent wins! is pink; final score glyphs are white.
- **C-RESULT-03**: dialog width=min(440px,W-40px), height<=H-32px,
  dark gradient fill, cyan border, 24px radius; backdrop dims and blurs the court.
  Scroll inside the dialog if needed, especially in a short viewport.
- **C-RESULT-04**: Escape/cancel does not dismiss the dialog.
  It persists until New Game; that resets text, HUD classes, all input, and selection.

Evidence: scoring/status via [match tests](../../tests/match.test.mjs);
modal visibility, focus, and CSS require browser/DOM evidence.
A title-shaped bright patch is not proof of the exact winner or score.
