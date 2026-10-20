# Requirement-to-check translation contract
The [adapter](opencv/adapter.md) compiles explicit pixel projections from cv-config blocks.
The field model below remains the richer contract; unsupported semantic evidence is excluded.
Every check must refer to a stable requirement ID and an explicit scenario/stage.

## Record fields
| Field | Meaning |
| --- | --- |
| id | unique C-/I-/V- ID from the linked documents |
| stage | S-* identity established by setup/DOM |
| given | required assets, viewport, scores, selected planet, visibility |
| region | named region or CSS-space bounds/formula |
| observe | pixels / DOM / logic / media / console |
| operation | masked-template / HSV-contour / ring-fit / motion / text / state |
| expect | count, identity, location, relation, copy, or transition |
| tolerance | explicit candidate/calibrated numeric profile |
| exclude | overlays, cursors, source alpha edges, occluded objects |
| evidence | offsets, peaks, rectangles, masks, measured values |
| outcome | PASS / FAIL / INCONCLUSIVE / ACQUISITION_ERROR |

## Example translation
```yaml
id: V-ART-01
stage: S-PLAY
given: {viewport: [960, 540], selectedPlanet: Earth, slot: "1:Jupiter"}
observe: pixels
region: expectedPaddedPlanetFrameExpandedByGeometryTolerance
operation: masked-template
template: assets/templates/planet-jupiter.png
mask: assets/templates/planet-jupiter-mask.png
transform: {flipX: true, width: "0.4*S", height: "width*724/543"}
expect: {identity: Jupiter, count: 1, bodyCenter: geometrySlotBodyCenter}
tolerance: {maxSqdiff: 0.12, positionCssPx: "max(2,.005*min(W,H))"}
calibration: candidate
exclude: [occludedMaskPixels, overlayBounds, movingBallAndTail]
```

## Result discipline
PASS: every observable required predicate is supported by compatible evidence.
FAIL: valid setup/acquisition, enough visibility, and measured violation.
INCONCLUSIVE: unknown stage/viewport, ambiguous match, occlusion, tiny texture,
missing controlled setup, or uncalibrated metric insufficient for a product decision.
ACQUISITION_ERROR: picker/source/crop/frame-buffer failure; never a game regression.
Preserve raw source pixels and attach derived ROI/mask/peak information separately.
A console "OpenCV loaded" message is not a visual-test PASS.

## Implementation constraints
Use [matching](visual/matching.md) for channel conversions and masks.
Never mix exact-copy/audio/physics claims into a pixels-only assertion.
Use multiple frames with actual timestamps; do not manufacture events between samples.
Disable uncertain checks explicitly rather than weakening thresholds until green.
Source hashes identify reviewed inputs; do not call a dirty commit a clean baseline.
New requirements should add IDs, topic links, setup, evidence, and calibration notes.
