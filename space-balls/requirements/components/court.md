# Court and responsive rendering
Source: [match.ts](../../src/match.ts) createArena,
[main.ts](../../src/main.ts) render/resizeCanvas/watchPixelRatio,
[style.css](../../src/style.css).
Visual: [geometry](../visual/geometry.md), [responsive](../visual/responsive.md).

- **C-COURT-01**: one full-viewport canvas; page/app have no gameplay scrolling.
  CSS sizing uses 100% width and 100dvh height.
- **C-COURT-02**: draw the entire background stretched to viewport W,H.
  This intentionally changes its aspect ratio; do not apply cover-cropping.
- **C-COURT-03**: physics bounds use the background's reference court proportions:
  left 44/1672 W, right 1629/1672 W, top 40/941 H, bottom 887/941 H.
  The center divider is artwork, not a colliding barrier.
- **C-COURT-04**: logical size S=min(courtWidth/2,courtHeight) drives gameplay sizes.
  Ball radius=.025S, net height=.15S. Resize preserves normalized ball/net position.
- **C-COURT-05**: canvas backing dimensions are rounded CSS dimensions * DPR.
  Transform each axis by actual backing/CSS size; drawing remains in CSS pixels.
- **C-COURT-06**: observe canvas, window, visualViewport, and DPR changes.
  Do not draw with zero viewport width or height.
- **C-COURT-07**: selecting/ready draw a 72%-alpha navy veil over the background.
  Planet picker artwork is drawn after that veil; formation exists only in outer playing.
- **C-COURT-08**: outer-playing draw order is background, all rings, all planets,
  selected-planet canvas label, nets, then ball/tail; HTML overlays appear above canvas.

Evidence: [match tests](../../tests/match.test.mjs) include portrait proportions.
Pixels cannot establish the backing-store DPR; inspect canvas dimensions separately.
