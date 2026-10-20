# OpenCV runtime and build
Source: [loader](../../tools/opencv.mjs),
[ESM adapter](../../tools/opencv-runtime.mjs),
[workspace](../../tools/cv-test-tool/main.ts),
[Vite config](../../vite.config.ts), [package](../../package.json).

- **C-CV-01**: pin @techstark/opencv-js5.0.0-release.1 as a development dependency.
  Load bundled WASM locally; do not fetch an unpinned CDN runtime.
- **C-CV-02**: loadOpenCv returns a shared promise resolving after WASM initialization.
  Named ESM adapter preserves the actual Promise through Vite/CommonJS interop.
- **C-CV-03**: workspace initializes OpenCV on page load and logs, after readiness,
  "[cvTestTool] OpenCV <version> loaded | repository commit <SHA>".
  Version comes from getBuildInformation, not the npm version string.
- **C-CV-04**: commit is repository HEAD at Vite startup/build; unknown if Git metadata
  is absent. Log initialization errors to console.error.
- **C-CV-05**: process RGBA with matFromImageData; delete every owned Mat, ROI,
  MatVector member, temporary result, and mask when no longer used.
  OpenCV.js has no built-in screenshot decoding or text OCR in this tool.
- **C-BUILD-01**: npm project, Node24 for tests, strict TypeScript, Vite multipage build.
  Include game, capture workspace, and motion fixture HTML entries.
- **C-BUILD-02**: npm test runs existing game and new integration tests.
  npm run build type-checks and emits dist; dev/preview/serve remain local workflows.
- **C-BUILD-03**: no imports of CV from the game entry point.
  Browser OpenCV is a separate lazy-loaded tool asset; large WASM bundle is expected.

Evidence: [real WASM test](../../test/opencv.test.mjs);
browser dev and production console readiness verified in the preceding task.
The manual visual engine is described in [visual-validation](visual-validation.md).
