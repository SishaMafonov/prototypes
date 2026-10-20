# UI overlay predicates
Source: [style.css](../../src/style.css), [main.ts](../../src/main.ts).
Pair geometry with [copy/semantic checks](copy.md); use [matching](matching.md).

## V-UI-01 — HUD
Given countdown/playing/goal, locate compact dark rounded panel centered horizontally.
Top=max(.06H,safe-area-top); horizontal translation centers the full panel.
You group is cyan #86eaff, Opponent pink #ff91e8; divider between them.
Scores use tabular digits, font clamp(22,4vmin,34); labels clamp(10,1.8vmin,14).
Rule strip is centered6px below panel; normal color #b9cde5.
Match point uses #ffe5a2; do not mistake glow alone for semantic match point.

## V-UI-02 — round overlay
Given countdown/goal, locate central large word above smaller hint, centered as a group.
Word font=clamp(32,8vmin,76); hint=clamp(12,2vmin,16); gap12px.
Navy radial gradient and text shadow deliberately reduce background visibility.
Text antialiasing/font fallback varies; use DOM copy or profile-specific glyph templates.
Absence of this overlay is required in ordinary playing and finished.

## V-UI-03 — voice panel
Given ready/countdown/playing/goal, locate lower centered dark rounded panel.
Width=min(460,W-40); bottom=max(.03H,safe-area-bottom); padding10px14px.
Order: help line, row[mic toggle,meter,Boost], status line.
Buttons min-height40px. Meter expands into available row width.
At H<=420: width=min(300,W-40), bottom5px, padding5px10px; help hidden.
Manual drive can highlight panel while mic meter remains empty.

## V-UI-04 — drive feedback
Compare paired drive-off/drive-on captures of the SAME stage/viewport.
Selected left ring gets brighter/thicker, white arcs, and active label.
Panel border becomes #b9f3ff; status brightens.
Applied impulse adds green #98ffd8 bold status for650ms.
Use ring-annulus/color-support change and semantic status, not a global frame diff.

## V-UI-05 — result
Locate modal centered in viewport, width=min(440,W-40), max-height=H-32.
Cyan border; dark gradient;24px radius; dim/blurred backdrop.
Vertical order: trophy, eyebrow, winner title, final score row, explanation, New Game.
Winner0 title cyan; winner1 pink; final digits white. Button is cyan filled.
At H<=420 padding16px24px and smaller margins; dialog content may scroll.
Verify internal reachability/DOM scroll bounds, not "everything visible at once".

```cv-config
[
{"id":"V-UI-01","stages":["S-PLAY","S-GOAL","S-COUNT-READY","S-COUNT-STEADY","S-COUNT-GO"],"checks":[{"op":"panel","target":"hud"}],"scope":"HUD position, visible edges, cyan/pink grouping; exact scores excluded.","relatedIds":["C-HUD-01","C-HUD-02"]},
{"id":"V-UI-02","stages":["S-GOAL","S-COUNT-READY","S-COUNT-STEADY","S-COUNT-GO"],"checks":[{"op":"panel","target":"round"}],"scope":"Centered bright glyph region and hint ordering; exact words excluded.","relatedIds":["C-HUD-03","C-HUD-04"]},
{"id":"V-UI-03","stages":["S-READY","S-PLAY","S-GOAL","S-COUNT-READY","S-COUNT-STEADY","S-COUNT-GO"],"checks":[{"op":"panel","target":"voice"}],"scope":"Voice panel bounds, border, and visible control row; semantics excluded.","relatedIds":["C-INPUT-07"]},
{"id":"V-UI-04","stages":["S-PLAY"],"checks":[{"op":"glow"}],"scope":"Paired input-off/on annulus brightness; NA until both are observed.","durationMs":1600,"relatedIds":["C-INPUT-05","C-PLANET-10"]},
{"id":"V-UI-05","stages":["S-FINISH-YOU","S-FINISH-OPP"],"checks":[{"op":"panel","target":"result"}],"scope":"Modal silhouette, trophy/glyph pixels, winner color; exact copy excluded.","relatedIds":["C-RESULT-02","C-RESULT-03"]}
]
```
