# Capture-workspace visual predicates
Source: [HTML](../../tools/cv-test-tool/index.html),
[CSS](../../tools/cv-test-tool/style.css), [main](../../tools/cv-test-tool/main.ts).
These assertions target workspace images, not the game-only screenshots API.

## V-TOOL-01 — navigation and preview
Locate CV Lab branding and two story links, active story highlighted blue.
Desktop sidebar left; <=600px navigation above workspace.
Preview header names selected story and path; iframe contains the selected page.
Dotted stage surrounds iframe; capture toolbar is below the preview.
Check DOM story identity; a similar-looking iframe is insufficient evidence.

## V-TOOL-02 — capture controls
Count initially5, range1..30; primary capture button blue #4265ea.
State badge=Idle / Choose this tab / Capturing / Sharing preview.
During operation: Capture/Reload/Count/Clear disabled, navigation aria-disabled.
Stop is enabled while sharing or busy.
Native share picker is outside page pixels and must not be mistaken for a game dialog.

## V-TOOL-03 — results
Empty state shows zero captured frames; successful batch shows count thumbnails,
each with numbered caption and actual +offset ms.
Summary dimensions match ImageData; memory sums pixel data byteLength/1024^2.
Thumbnails represent latest successful batch only; failed capture retains prior batch.
Clear returns empty state; Stop keeps results.

## V-TOOL-04 — capture exclusion
Game-only output contains no sidebar, dotted margin, workspace toolbar,
results captions, or tiny helper video. Their presence indicates wrong crop/source.
Use geometry and explicit crop metadata; do not rely solely on a negative text search.
On source mismatch, mark acquisition invalid rather than evaluating game requirements.

## V-TOOL-05 — fixture
Motion study contains grid, orbit, blue sphere, frame/time labels, blue/mint swatches.
Sphere motion is continuous around the orbit; frame/time values must not be baseline-fixed.
At native960x540: swatches (765,466,60,40) blue and (840,466,60,40) mint.
Scale from fixture canvas coordinates to iframe image coordinates.
Color blocks alone do not prove a valid game capture; story must be known.

CV version/commit are console evidence, with no required visual badge.

```cv-config
[
{"id":"V-TOOL-01","story":"workspace","naReason":"Workspace chrome is outside the iframe stream. Use a dedicated external capture/E2E adapter.","scope":"Requires a full-workspace acquisition source.","checks":[],"relatedIds":["C-HARNESS-01","C-HARNESS-07"]},
{"id":"V-TOOL-02","story":"workspace","naReason":"Workspace chrome is outside the iframe stream. Use a dedicated external capture/E2E adapter.","scope":"Requires a full-workspace acquisition source.","checks":[]},
{"id":"V-TOOL-03","story":"workspace","naReason":"Workspace chrome is outside the iframe stream. Use a dedicated external capture/E2E adapter.","scope":"Requires a full-workspace acquisition source.","checks":[],"relatedIds":["C-HARNESS-05"]},
{"id":"V-TOOL-04","story":"workspace","naReason":"Workspace chrome is outside the iframe stream. Use a dedicated external capture/E2E adapter.","scope":"Requires a full-workspace acquisition source.","checks":[]},
{"id":"V-TOOL-05","story":"motion","checks":[{"op":"fixture"}],"scope":"Moving sphere, orbit bounds, and blue/mint swatches; frame/time copy excluded.","durationMs":800,"relatedIds":["C-FIXTURE-01","C-FIXTURE-02"]}
]
```
