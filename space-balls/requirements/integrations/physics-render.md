# Physics and rendering alignment
Source: [planets](../../src/planets.ts), [match](../../src/match.ts),
[renderer](../../src/main.ts).
Visual oracle: [geometry](../visual/geometry.md).

- **I-PHYSICS-01**: createArena is shared by physics, ball, planets, and net drawing.
  A resized frame must use one current viewport geometry throughout.
- **I-PHYSICS-02**: field body centers/radii equal sprite's opaque-body metadata
  after frame scaling and optional horizontal reflection.
  Gravity annuli surround those centers rather than the padded frame center.
- **I-PHYSICS-03**: visible net rectangle matches the rectangle used in touchesGoal.
  Collision precedence is net contact before reflection from the nearby outside border.
- **I-PHYSICS-04**: ball texture is centered on projected physics position
  (L+x*Cw,T+y*Ch); displayed diameter is twice physics radius.
- **I-PHYSICS-05**: tail rotation uses pixel-space vx*Cw,vy*Ch, not unscaled normalized
  vx,vy; this matters on portrait viewports.
- **I-PHYSICS-06**: clip ball/tail to the same court limits; no center collision.
  Existing background lines are reference art, not extra colliders.
- **I-PHYSICS-07**: pulses result from the same per-planet effect records used by rules.
  Selected-ring input glow may precede or exist without a physical impulse.
- **I-PHYSICS-08**: high-DPI changes alter backing pixels, not logical sizes or relative
  positions. Normalize capture resolution separately; never multiply DPR twice.

Evidence: [planet tests](../../tests/planets.test.mjs),
[match tests](../../tests/match.test.mjs), browser resize/visual checks still needed.
A velocity or collision assertion needs seeded state and sufficient temporal sampling.
