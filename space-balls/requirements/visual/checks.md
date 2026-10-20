# Stage visual predicates
Prerequisite: [stage identity](stages.md), [matching/tolerances](matching.md).
All positions are CSS-space after capture normalization.
The manual runner executes the explicit pixel scopes in the mappings below.
Broader semantic/behavioral clauses remain delegated to DOM/E2E tests.

## V-MENU-01 — selector composition
Given S-PICK, assets-ready, known selected planet.
Locate exactly one unmirrored selected-planet template near viewport center.
Expect left/right circular cyan-outline arrows flanking it, title above,
planet name then counter below, and cyan filled Confirm below counter.
Arrows:48x48px; Confirm min168x48px, radius12; no HUD/voice/result.
Planet frame width=clamp(76,min(.42W,.38H),280).
For H<=420 width=min(.30W,.35H), replacing the clamp.
Use DOM bounds for text ordering; masks exclude labels/buttons from planet search.
Failure: wrong planet, missing arrow, wrong ordering; occlusion -> INCONCLUSIVE.

## V-MENU-02 — ready composition
Given S-READY, locate centered Start heading and lower voice panel.
Expect dimmed complete court; no template formation, nets, asteroid, picker, or scoreboard.
Use DOM for Start visibility; dark background alone is not a ready classifier.

## V-MENU-03 — loading/error
Given S-LOAD or S-ASSET-ERROR from a controlled blocked-asset scenario.
Expect the corresponding disabled Confirm and visible error only on error.
Missing art is allowed during load/error; never apply S-PICK asset-presence rules here.
Text and disabled state require [copy checks](copy.md), not color alone.

## V-STAGE-01 — countdown
Given S-COUNT-READY/STEADY/GO, verify HUD + voice + full-field geometry,
correct round message/hint, no picker/Start/result, no tail.
The waiting ball is centered but may be obscured by the round overlay.
Do not fail a hidden center ball on a single countdown image.

## V-STAGE-02 — ordinary play
Given S-PLAY, verify unobscured planet slots/rings, two net anchors,
one ball core, visible trailing plume when it is observable, HUD and voice panel.
Expect no full-screen round overlay or result modal.
Need [artwork](artwork.md), [overlays](overlays.md), [temporal](temporal.md).

## V-STAGE-03 — nonwinning goal
Given S-GOAL and known scorer, expect score message and matching increased HUD.
Ball remains at contact location and has no tail; nets can keep moving.
After1.2s, require centered-ball countdown with preserved scores in a separate run window.

## V-STAGE-04 — finished
Given S-FINISH-YOU/OPP, locate centered bordered modal with trophy,
winner-colored title, two final score groups, explanation, and New Game.
Expect dim/blur backdrop, no voice panel or round-message foreground.
Scoreboard/planets behind modal may be obscured; do not require their templates.
Exact winner/score requires semantic evidence; modal silhouette alone cannot pass.

```cv-config
[
{"id":"V-MENU-01","stages":["S-PICK"],"checks":[{"op":"picker"}],"scope":"Planet, arrow geometry, button color, and ordering; copy excluded.","relatedIds":["C-PICK-01","C-PICK-02"]},
{"id":"V-MENU-02","stages":["S-READY"],"checks":[{"op":"background"},{"op":"panel","target":"start"},{"op":"panel","target":"voice"}],"scope":"Dimmed court and visible start/input composition; copy excluded.","relatedIds":["C-PICK-04"]},
{"id":"V-MENU-03","exclude":"Loading/error copy and disabled controls are DOM/E2E assertions."},
{"id":"V-STAGE-01","stages":["S-COUNT-READY","S-COUNT-STEADY","S-COUNT-GO"],"checks":[{"op":"panel","target":"round"},{"op":"panel","target":"hud"},{"op":"panel","target":"voice"}],"scope":"Visible countdown overlays; obscured field and exact words excluded.","relatedIds":["C-PICK-05","C-HUD-03"]},
{"id":"V-STAGE-02","stages":["S-PLAY"],"checks":[{"op":"planets"},{"op":"nets"},{"op":"ball"},{"op":"panel","target":"hud"},{"op":"panel","target":"voice"}],"scope":"Observable playing composition; functional state transitions excluded."},
{"id":"V-STAGE-03","stages":["S-GOAL"],"checks":[{"op":"panel","target":"round"},{"op":"panel","target":"hud"},{"op":"panel","target":"voice"}],"scope":"Goal overlay composition; exact score and timing are separate."},
{"id":"V-STAGE-04","stages":["S-FINISH-YOU","S-FINISH-OPP"],"checks":[{"op":"panel","target":"result"}],"scope":"Modal geometry and winner color; copy and score semantics excluded."}
]
```
