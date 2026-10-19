# OpenCV adapter contract
The converter reads explicit `cv-config` JSON blocks in visual requirement Markdown.
Prose remains the human contract; mappings describe its pixel-only projection.
Arbitrary natural-language requirements are not guessed or silently approximated.
Every V-* definition needs exactly one mapping or an explicit DOM/functional exclusion.
Unknown IDs/operators, malformed mappings, and stale template hashes fail compilation.

Run `npm run cv:compile` from space-balls; `npm run cv:check` checks generated freshness.
Output: tools/cv-test-tool/generated/requirements/*.json plus suite/asset manifests.
JSON describes operations and image/mask Mats; native WASM pointers are never serialized.
Browser code decodes PNGs, constructs Mats, applies operators, and deletes temporaries.
`scope` states the visual subset being asserted; exact copy and behavior are excluded.
Source Markdown hashes and template/mask SHA-256 hashes travel with generated configs.

Suite execution is manual. Navigate/play the game, then click a requirement or Run suite.
Prerequisites use observed stage/viewport/overlay metadata; they are not DOM assertions.
The native sharing picker must be approved before screenshots can be acquired.
All operators assert pixels from the display stream, never a replacement canvas capture.
PASSED means the configured pixel projection passed experimental thresholds.
FAILED means valid applicable evidence violates a configured pixel assertion.
NA means not run, another stage/source, occlusion, unavailable setup, or acquisition error.
Each result records reason, measurements, stage, viewport, and time.
Coverage reports evaluated requirements separately from NA and excluded requirements.
Results persist across manual state changes until Reset results or page reload.
Long sequences collect repeated <1s bursts; timestamps, not burst numbers, drive timing.

```cv-defaults
{"geometry":{"court":[44,1629,1672,40,887,941],"sizes":{"jupiter":0.4,"earth":0.3,"small":0.15,"goal":0.15,"ballRadius":0.025},"gap":0.04,"verticalSeparation":2.1,"ringScales":{"Earth":1.4,"Jupiter":1.15,"Lava":1.7,"Ice":1.7}},"thresholds":{"maxSqdiff":0.12,"scales":[0.95,1,1.05],"minMaskVisibility":0.7,"minTexturePixels":12,"ringSupport":0.6,"hueTolerance":12,"backgroundCorrelation":0.7,"stableMeanDifference":2,"minMovementCss":1}}
```

Thresholds are candidates. Synthetic tests establish implementation behavior, not
live-stream calibration across browsers. Evidence details remain visible beside each result.
