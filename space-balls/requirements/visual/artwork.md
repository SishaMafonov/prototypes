# Artwork and shape predicates
Sources: [geometry](geometry.md), [templates](../assets/templates.json),
[planets](../../src/planets.ts), [renderer](../../src/main.ts).

## V-ART-01 — planet slots
Given unobscured outer-playing field.
For each predicted slot, resize its atlas-frame template to the predicted frame width.
Flip both template/mask on the right; match masked central texture in its local ROI.
Require one correct identity/location per observable slot.
Do not demand eight detections when HUD/round/dialog obscures some slots.
Verify full set with a controlled unobscured fixture or multiple exposures.

## V-ART-02 — physical rings
Fit circular edges or contours near each predicted body center and gravity radius.
Check concentricity and radius tolerance; hue is planet-specific:
Jupiter RGB255,193,116; Earth103,232,216; Lava255,143,105; Ice131,215,255.
Thin edge alpha and glow change visible colors; compare hue/support, not exact RGB equality.
Expected stroke=max(1,min(2,frameWidth*.012))+5*glowLevel CSS px.
Quiet controlled alpha.95 vs other.75; active arcs/ring thickness vary in time.
Do not claim a stable stroke width while pulse/drive is nonzero.

## V-ART-03 — goal rectangles
Search near the two x anchors and the scenario's expected travel positions.
Segment cyan/pink; fit vertical rectangles with height=.15S, width=.06S.
Border stroke=max(1,min(3,.025*goalHeight)); ignore 10px glow for rectangle size.
Mesh is3 internal vertical +7 horizontal lines; assert only at sufficient resolution.
Use hue + aspect ratio + side/position; cyan rings alone are not net detections.

## V-ART-04 — asteroid core
Match the supplied cropped asteroid template after resizing to diameter=.05S.
Locate in court excluding overlays; allow clipping near a border.
The game's core is not rotated; the tail is. Infer core center, not plume centroid.
Require exact one observable core; multiple similar peaks -> INCONCLUSIVE.
During countdown use known waiting position and suppress checks under round text.

## V-ART-05 — tail
On S-PLAY with measurable velocity and unobscured rear half-plane:
segment warm plume near core, require nonzero support behind motion vector.
Rotation/shape/alpha vary; no fixed full-plume template is supplied.
Use source anchor/rotation in C-BALL-03 for a controlled exact rendering scenario.
On countdown/goal/finished the drawn plume is absent (backdrop can hide evidence).

## V-ART-06 — background/court
Use geometric court extents and stretched source-art landmarks for orientation.
A flat navy mockup background is explanatory and must never replace actual game art.
Color ranges must account for selecting/ready veil and result backdrop.

```cv-config
[
{"id":"V-ART-01","stages":["S-PLAY"],"checks":[{"op":"planets"}],"scope":"One masked texture match per observable slot; occluded slots produce NA.","relatedIds":["C-PLANET-01","C-PLANET-02"]},
{"id":"V-ART-02","stages":["S-PLAY"],"checks":[{"op":"rings"}],"scope":"Quiet-ring annulus color support and concentric geometry.","relatedIds":["C-PLANET-04"]},
{"id":"V-ART-03","stages":["S-PLAY"],"checks":[{"op":"nets"}],"scope":"Colored goal rectangles and size; subpixel mesh is excluded.","relatedIds":["C-GOAL-03"]},
{"id":"V-ART-04","stages":["S-PLAY"],"checks":[{"op":"ball"}],"scope":"One unoccluded asteroid core.","relatedIds":["C-BALL-02"]},
{"id":"V-ART-05","stages":["S-PLAY"],"checks":[{"op":"tail"}],"scope":"Warm pixels behind measured core motion.","durationMs":800,"relatedIds":["C-BALL-03"]},
{"id":"V-ART-06","checks":[{"op":"background"}],"scope":"Brightness-invariant matching of unobscured background landmarks.","relatedIds":["C-COURT-02","C-COURT-03","C-COURT-07"]}
]
```
