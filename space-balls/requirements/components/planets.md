# Planet formation and physical fields
Source: [planets.ts](../../src/planets.ts),
[match.ts](../../src/match.ts) applyPlanetDynamics,
[main.ts](../../src/main.ts) drawPlanet/drawGravityArea/drawPlayingField.
Visual: [geometry](../visual/geometry.md), [artwork](../visual/artwork.md).

- **C-PLANET-01**: four sprites in atlas order Earth,Jupiter,Lava,Ice.
  Each frame is 543x724; preserve transparent padding when rendering.
- **C-PLANET-02**: each side has Jupiter outer/large, Earth inner/medium,
  Ice upper/small and Lava lower/small between them. Exactly eight field entries.
  Right-side art and body-center offsets are reflected horizontally.
- **C-PLANET-03**: frame widths are .4S Jupiter, .3S Earth, .15S Ice/Lava.
  Actual body radius follows the per-sprite body metadata, not half the frame width.
- **C-PLANET-04**: ring radii/body radii: Jupiter1.15, Earth1.4, Ice/Lava1.7.
  Ring center equals the opaque body's center. See geometry formulas.
- **C-PLANET-05**: attraction acts only while the ball center is inside a field.
  Softening at .45 bodyRadius keeps center acceleration finite.
  Attraction factors: Jupiter6, Earth2.8, Ice/Lava1.1.
- **C-PLANET-06**: player controls only the selected planet on the left.
  Input >.03 can push only when ball is inside that field and cooldown is ready.
  Impulse is along current velocity; it never aims independently of the trajectory.
- **C-PLANET-07**: other seven planets act as independent AI controls.
  After gravity, left AI boosts only vx>1e-8 pixels/s, right only vx<-1e-8.
  Defending and purely vertical vectors get no AI push.
- **C-PLANET-08**: impulse factors Jupiter.12, Earth.3, Ice/Lava.65 times S*magnitude.
  Player magnitude=clamped input; AI magnitude=.2+random*.65.
  Cooldowns: player .28s; AI .65+random*1.15s; initial AI .4+random*1.2s.
- **C-PLANET-09**: when in any field, speed is capped at 2.6*min(courtWidth,courtHeight).
  Field-free motion is not newly clamped by this function.
- **C-PLANET-10**: controlled-ring voice glow is immediate even outside the field.
  A physical boost sets pulse>=.6 and increments that planet's boost count.
  Pulse decays at 3/s during playing; three rotating arcs accompany active manual/voice glow.

Evidence: [planet tests](../../tests/planets.test.mjs).
The visible glow alone cannot prove a physical boost; pair with counter/state evidence.
