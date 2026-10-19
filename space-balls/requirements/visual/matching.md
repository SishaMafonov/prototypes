# Detection and calibration contract
Source API references: [matchTemplate](https://docs.opencv.org/4.x/df/dfb/group__imgproc__object.html),
[JS matching](https://docs.opencv.org/4.x/d8/dd1/tutorial_js_template_matching.html).
Pinned runtime is5.0.0; run the supplied probe instead of assuming native API parity.

## Normalization
1. Confirm story/stage, CSS viewport W,H, and nonempty RGBA frames.
2. Map CSS geometry to each frame using Iw/W and Ih/H; preserve original pixels.
3. Prefer native-resolution templates resized to expected frame width/height.
4. Convert RGBA->GRAY for texture matching; RGBA->RGB->HSV for hue.
5. Hough/contour work is in image pixels; convert measurements back to CSS pixels.
6. Make every mask binary CV_8UC1; source PNG masks are RGB black/white and need conversion.

## Masked template recipe
Resize template with INTER_AREA when shrinking, INTER_LINEAR when enlarging.
Resize binary mask with INTER_NEAREST; flip both for right-side planets.
Use TM_SQDIFF_NORMED with explicit mask; LOWER result is better.
Locate via minMaxLoc only after checking result values are finite.
Reject empty masks, constant/empty texture, oversized templates, and zero-energy ROIs.
Place template top-left in expected ROI; transform the known body center to world space.
Mask includes only opaque central texture, excluding alpha edges and changing ring/glow.
RGB/grayscale inputs must have matching depth/channels; do not correlate raw RGBA alpha.
Use nonmaximum suppression by expected body diameter, then enforce one match per expected slot.
A second candidate within .03 error of the best is ambiguous -> INCONCLUSIVE.

## Proposed starting tolerances (not calibrated to game captures)
- Texture normalized squared error <=.12; nearest wrong-planet error >=best+.03.
- Position e=max(2 CSS px,.005*min(W,H)); radius/size <=max(2 CSS px,5% expected).
- Search frame scale at [.95,1,1.05] around predicted size; no unrestricted scale sweep.
- HSV hue distance<=12 (0..179), S>=60,V>=70 for colored borders; keep >1px cores.
- Ring edge angular coverage>=60% of its UNOBSCURED circumference.
- Net-colored edge support>=60% of its UNOBSCURED perimeter.
- Texture checks require >=70% of template mask visible; else INCONCLUSIVE.
- Ball diameter<12 image px or net height<12 image px -> INCONCLUSIVE for fine texture/mesh.

Choose thresholds on representative live positives AND deliberately wrong/missing objects.
Record false-positive/negative results, viewport, browser, and commit before calling calibrated.
The synthetic template probe proves compatibility only; it does not calibrate these numbers.
No full-frame SSIM or global pixel equality is a substitute for component predicates.

## Occlusion and evidence
Build exclusion regions from DOM overlay bounds (or explicitly detected opaque panels).
Exclude picker controls, HUD, voice panel, round text/gradient, result modal/backdrop,
ball/tail overlap, browser sharing borders, and cursor/hover effects as appropriate.
Never replace an occluded object's required-presence check with an automatic PASS.
Use another frame/fixture to expose it; report INCONCLUSIVE with an occlusion reason.
Release every owned Mat/ROI/vector member/temporary. Do not delete caller-owned pixels.
