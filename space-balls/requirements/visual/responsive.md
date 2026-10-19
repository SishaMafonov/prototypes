# Responsive and accessibility predicates
Source: [style](../../src/style.css), [resize](../../src/main.ts).
Profiles: [geometry fixtures](../assets/geometry.json).

## V-RESP-01 — landscape, portrait, short
Run direct game at960x540,390x844,844x390 CSS pixels.
Keep entire background visible, recompute arena, and preserve logical ratios.
Assert no page-level scrollbars, nonzero canvas, and accessible primary actions.
Do not expect a desktop 16:9 baseline to resize uniformly into portrait.
Current workspace iframe is16:9; portrait requires a separate scenario setup.

## V-RESP-02 — pixel density
Repeat at DPR1 and2 where browser supports it.
Map capture and CSS dimensions independently; compare logical positions/sizes.
Verify backing width/height via DOM, not image heuristics.
A fresh capture after resize must be a consistent batch; mid-batch resize must reject.

## V-RESP-03 — small component resolution
If ball/net/planet texture is below the matching resolution floor, use coarse shape/color
plus DOM/state evidence and mark fine detail INCONCLUSIVE.
Do not silently lower the template threshold until a false positive passes.

## V-RESP-04 — focus and interaction variants
Verify visible focus ring on arrows, Confirm, Start, mic, Boost, New Game.
Arrow buttons48x48; Confirm min168x48; voice buttons min-height40.
Disabled Confirm is not interactive; keyboard carousel navigation wraps.
Allow hover/pressed/focus colors to differ from quiet reference colors.
Manual Boost must release on blur/pointer cancellation.

## V-RESP-05 — occlusion/layout limits
Game panels can overlap field artwork on small screens; record visible-mask coverage.
No assertion should require hidden text or all eight unobscured planets in every viewport.
If controls become clipped or unreachable, record a layout failure with measured bounds;
do not redefine an observed defect as expected merely because the source permits it.
Critical action reachability and intended visibility are acceptance requirements;
their satisfaction at every profile has not been established by this documentation.

## V-RESP-06 — text semantics
Canvas has an accessible court label including selected planet after Confirm.
DOM score/planet labels use live regions; dialog names derive from its heading.
Pixels cannot validate accessibility names, focus ownership, or modal behavior.

```cv-config
[
{"id":"V-RESP-01","checks":[{"op":"frame"},{"op":"layout"}],"scope":"Visible controls inside the current viewport; one profile per manual run.","relatedIds":["C-COURT-01"]},
{"id":"V-RESP-02","exclude":"DPR/backing-store comparison across browser contexts belongs to E2E."},
{"id":"V-RESP-03","exclude":"Resolution-floor policy is enforced by each visual operator, not a standalone assertion."},
{"id":"V-RESP-04","exclude":"Focus ownership and keyboard/pointer behavior belong to E2E."},
{"id":"V-RESP-05","checks":[{"op":"layout"}],"scope":"Visible control bounds and pixel visibility; pointer reachability excluded.","relatedIds":["C-RESULT-03","C-INPUT-07"]},
{"id":"V-RESP-06","exclude":"Accessibility names, live regions, and modal semantics are DOM/E2E assertions."}
]
```
