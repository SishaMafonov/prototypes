# Asteroid, tail, and moving goal nets
Source: [goals.ts](../../src/goals.ts), [match.ts](../../src/match.ts),
[main.ts](../../src/main.ts) drawBall/drawGoal.
Visual: [artwork](../visual/artwork.md), [temporal](../visual/temporal.md).

- **C-BALL-01**: waiting ball is normalized (.5,.5), velocity (0,0).
  Launch uses the court center, speed [.45,.75)*min(courtWidth,courtHeight),
  angle [-pi/3,pi/3), and a random horizontal direction.
- **C-BALL-02**: draw asteroid from ball.png source rect (248,156,912,880)
  into a square of diameter .05S. Only transparent padding is cropped.
  Ball is visible in countdown/playing/goal/finished subject to HTML occlusion.
- **C-BALL-03**: tail appears only during match playing, alpha .85.
  Tail width=4.5*ballDiameter, height=width*887/1774.
  Head anchor is (.93,.71) in source; rotate by velocity heading minus
  atan2(.42*887,.87*1774). Match the core, not the rotating plume.
- **C-BALL-04**: clip both tail and ball to the physics court rectangle.
  Four outside borders rebound the ball; center divider never reflects it.
- **C-GOAL-01**: nets start at normalized travel 0 and .6, both moving downward.
  Independent speed=.1+random*.14 normalized trips/s.
- **C-GOAL-02**: reverse at bottom without changing speed; reverse at top
  and sample a new speed. Consume remaining time after each reversal.
- **C-GOAL-03**: goal centers are x=40/1672 W and 1633/1672 W.
  Height=.15S, width=.4*height; top=T+position*(courtHeight-height).
  Cyan left #86eaff, pink right #ff91e8; each has a 4x8-cell mesh.
- **C-GOAL-04**: score on ball-circle/net-rectangle contact before wall rebound.
  Left-net contact awards opponent; right-net contact awards player, once per goal.
- **C-GOAL-05**: move goals in countdown, playing, and goal hold; freeze on finished.
  Collision stepping <=1/240s and relative travel <=half a ball radius prevents tunneling.

Evidence: [goal tests](../../tests/goals.test.mjs),
[match tests](../../tests/match.test.mjs). Sparse video cannot prove all collisions.
