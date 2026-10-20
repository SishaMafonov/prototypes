# Visual assets
Templates are extracted from existing art, not AI-generated or captured baselines.
Mockups are programmatically drawn composition sketches with the same reusable art.
[templates.json](templates.json) records source rectangles, masks, centers, and hashes.
[geometry.json](geometry.json) records nominal profile coordinates generated from rules.
[mockups/README.md](mockups/README.md) maps stage illustrations.

## Reusable PNGs
- planet-earth, planet-jupiter, planet-lava, planet-ice: complete543x724 atlas frames.
- asteroid: source (248,156,912,880) resized in the game into a square.
- Every template has a matching *-mask.png with black/white RGB pixels.
- Convert mask to single-channel CV_8UC1; white=include, black=ignore.
- Mask is the opaque central disk (70% of supplied body radius, alpha>=250).
- Resize template/mask to target game scale, then mirror BOTH for right-side art.
- Masks intentionally omit edge glow, alpha, and padded background.
- Source frame center is not the planet's physical body center.
- Asteroid crop is912x880; render/resize to square before game matching.
- For a ball touching a wall, clipping can make texture checks INCONCLUSIVE.

## Regenerate
Node.js24 and Windows PowerShell/System.Drawing are used only for asset generation.
There are no new npm dependencies. The checked-in PNGs are runtime-portable.
From `space-balls/`:
```sh
node requirements/assets/generate.mjs
node requirements/assets/probe.mjs
node requirements/verify.mjs
```
generate.mjs computes geometry, invokes render.ps1 for PNGs, and writes provenance.
Review source changes before regenerating; provenance update is not baseline approval.
The generator is Windows-specific; a future portable renderer may replace it.
No game files, capture buffers, or published dist assets are modified.

## Probe
probe.mjs uses PowerShell only to decode the checked-in PNGs to raw pixels.
The actual masked matchTemplate/minMaxLoc computations run in the installed OpenCV.js.
It plants each reference over a synthetic background, tests normal/flipped variants,
and compares blank/wrong-art negative controls. Results verify API/mask compatibility only.
The probe uses a strict synthetic threshold; live .12 is an uncalibrated candidate.
Existing OpenCV loader is reused and all Mats are explicitly deleted.
