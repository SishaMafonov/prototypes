# Workspace -> display stream -> pixels -> OpenCV
Source: [workspace](../../tools/cv-test-tool/main.ts),
[capture](../../tools/cv-test-tool/capture.ts), [loader](../../tools/opencv.mjs).

- **I-TOOL-01**: story navigation loads a dedicated game/fixture document in iframe.
  A game capture contains only that iframe, not workspace navigation/results.
- **I-TOOL-02**: first API/UI request preserves user gesture through getDisplayMedia.
  Crop the approved same-tab stream before reading video pixels.
- **I-TOOL-03**: selected wrong source or unsupported Region Capture rejects cleanly
  and releases tracks. It cannot produce a false "game passed" on a full-tab image.
- **I-TOOL-04**: batch ImageData is directly compatible with cv.matFromImageData.
  It remains RGBA; explicitly convert RGBA->GRAY or RGBA->RGB->HSV as needed.
- **I-TOOL-05**: await loadOpenCv before allocating Mats/checking frames.
  Read runtime/build metadata from the console; do not mistake successful loading
  for successful validation of any visual requirement.
- **I-TOOL-06**: attach CSS viewport W,H and story/stage identity to future run metadata.
  Current screenshot records do NOT contain viewport, selected planet, score, or phase.
  Obtain those from explicit scenario setup/DOM; never infer all metadata from image size.
- **I-TOOL-07**: normalize capture using measured CSS-to-image ratios before asserting.
  Navigation/resize/stream end invalidates an in-progress batch.
- **I-TOOL-08**: retain RGBA until analyses finish; release all CV temporaries.
  A failed analysis must not mutate or discard the workspace's original screenshot buffers.
- **I-TOOL-09**: five frames<1s can support motion/glow checks, not full match timing.
  Repeat captures across a longer controlled scenario for3s countdown and replay.

The [manual runner](../../tools/cv-test-tool/SUITES.md) now analyzes display-stream pixels.
It adds viewport/stage/occlusion metadata alongside samples and retains the public capture API.
Native picker approval and game-state automation remain manual.
