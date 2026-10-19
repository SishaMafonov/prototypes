# Artwork loading and planet picker
Source: [main.ts](../../src/main.ts), [style.css](../../src/style.css).
Visual: [stage checks](../visual/checks.md), [copy](../visual/copy.md).
Stages: S-LOAD, S-ASSET-ERROR, S-PICK, S-READY.

- **C-BOOT-01**: create one responsive canvas and the HTML interface inside #app.
  A missing app or unavailable 2D context throws; no alternate game UI is implemented.
- **C-BOOT-02**: load background.png, planets.png, ball.png, ball_tail.png locally.
  Confirm stays disabled with "Loading game…" until all four images have nonzero size.
- **C-BOOT-03**: any asset error disables Confirm, sets "Game assets unavailable",
  and displays "Unable to load the game artwork. Please reload to try again."
  There is no inline retry; reload is the recovery path.
- **C-PICK-01**: initial selection is Earth, label "1 / 4"; exactly one preview planet.
  Next order is Earth -> Jupiter -> Lava -> Ice -> Earth; Previous wraps backward.
- **C-PICK-02**: previous/next buttons and ArrowLeft/ArrowRight within .selection
  change artwork, planet name, counter, and preview aria-label together.
- **C-PICK-03**: Confirm only acts in selecting and when enabled.
  It hides the picker, shows the full-area Start control and voice panel, and enters ready.
  It must preserve the chosen planet. No Match is created until Start is activated.
- **C-PICK-04**: ready shows the dimmed court with no planet formation, nets, or ball.
  Start text is "Tap or click to start"; the rule hint states first to 10, win by 2.
- **C-PICK-05**: Start enters outer playing, creates a fresh countdown Match using
  the selection, hides Start, reveals scoreboard, and focuses normal game interaction.
- **C-PICK-06**: Confirm focuses Start; New Game focuses Previous.
  Buttons remain keyboard-operable. Hover/focus/pressed styling is state-dependent.

Evidence: browser interaction needed; current rule tests do not exercise picker DOM.
The visual suite must use loading interception for S-LOAD/S-ASSET-ERROR.
Do not require a stable loading frame on an already cached asset load.
