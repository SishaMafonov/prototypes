# Stage mockups
All PNGs are960x540 schematic drawings, not screenshots or exact CSS replicas.
Navy court/background is simplified; text layout/glow/blur is illustrative.
Planet positions use generated geometry; overlays intentionally cover field content.
Use templates for local art matching; use stage predicates for application validation.
Never match an entire mockup to a live game frame.

| File | Stage / purpose |
| --- | --- |
| [loading.png](loading.png) | S-LOAD, disabled loading control |
| [asset-error.png](asset-error.png) | S-ASSET-ERROR, failed artwork message |
| [picker.png](picker.png) | S-PICK, default Earth selection ordering |
| [ready.png](ready.png) | S-READY, start overlay and lower input panel |
| [count-ready.png](count-ready.png) | S-COUNT-READY, field under Ready? |
| [count-steady.png](count-steady.png) | S-COUNT-STEADY, same field/other word |
| [count-go.png](count-go.png) | S-COUNT-GO, same field/other word |
| [playing.png](playing.png) | S-PLAY, field, nets, ball, HUD/input |
| [goal.png](goal.png) | S-GOAL, score message, no tail |
| [result-you.png](result-you.png) | S-FINISH-YOU, cyan title, final score |
| [result-opponent.png](result-opponent.png) | S-FINISH-OPP, pink title, final score |
| [component-atlas.png](component-atlas.png) | source-art identities and shape/color samples |

Parametric variants (other selected planets, deuce/match point, mic statuses,
small screens) are defined by text/formulas instead of additional baseline images.
Generating these images does not establish that the corresponding live stage was tested.
