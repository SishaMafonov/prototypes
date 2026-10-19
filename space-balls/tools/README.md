# OpenCV.js tooling

Manual visual suites: [SUITES.md](cv-test-tool/SUITES.md).
Experimental visual regression tooling lives here. The Node.js loader in
`opencv.mjs` initializes and shares one OpenCV.js WebAssembly runtime. The browser
capture workspace in `cv-test-tool/` collects pixels for subsequent processing.

The project pins `@techstark/opencv-js` to `5.0.0-release.1` as a development
dependency, with an integrity hash in `package-lock.json`. This third-party
[package](https://github.com/TechStark/opencv-js) supports Node.js and browsers,
is Apache-2.0 licensed, and has no runtime dependencies. Installation does not
require native compilation. The runtime loads locally from the installed package.

From `space-balls/`, using Node.js 24:

```sh
npm ci
npm run test:opencv
```

`npm test` runs the existing game tests and the new `test/opencv.test.mjs` smoke
test. It checks actual WASM operations on synthetic pixels: RGBA-to-grayscale
conversion, identical-image comparison, and detection of one changed pixel.
No browser, image files, or network access are needed to run this test.

Use the loader from another tool:

```js
import { loadOpenCv } from './opencv.mjs';

const cv = await loadOpenCv();
const image = cv.Mat.zeros(2, 2, cv.CV_8UC1);
try {
  console.log(cv.countNonZero(image)); // 0
} finally {
  image.delete(); // Release WASM memory explicitly for each Mat.
}
```

## Browser capture workspace

Run `npm run dev` from `space-balls/`, then open
[the workspace](http://localhost:5173/tools/cv-test-tool/) in desktop Chrome or
Edge. Use the URL printed by Vite if it picks another port. The production build
also includes `tools/cv-test-tool/index.html` and the motion fixture; it works with
`npm run preview` or `npm run serve` on localhost.

1. Select **Space Balls** or **Motion study** in the navigation. Each loads a
   dedicated page into the preview iframe. The game remains interactive.
2. Leave the count at **5** and click **Capture frames**.
3. In the browser share picker, select **This Tab** (the capture workspace itself).
   Granting permission is an explicit browser interaction. HTTPS or localhost is
   required. Region Capture crops the display video stream to the iframe.
4. Inspect the frame thumbnails and their capture offsets. **Stop sharing** releases
   the stream; **Clear frames** releases the workspace's stored batch.

The capture API is installed on the **workspace window**, rather than inside the
preview iframe:

```js
const screenshots = await window.cvTestTool.captureScreenshot({ count: 5 });
const { imageData, offsetMs, timestampMs, mediaTime } = screenshots[0];

console.log(imageData.width, imageData.height, imageData.data); // RGBA pixels
console.log(window.cvTestTool.screenshots === screenshots); // true

// With an initialized OpenCV.js runtime, these pixels need no decoding:
// const mat = cv.matFromImageData(imageData);
// try { /* process the pixels */ } finally { mat.delete(); }
```

The workspace also initializes OpenCV.js in the browser using the shared
`loadOpenCv()` loader. Once its WebAssembly runtime is ready, the browser console
prints `[cvTestTool] OpenCV <runtime version> loaded | repository commit <SHA>`.
The version comes from the loaded runtime's build information. The commit is this
repository's HEAD at Vite startup or build time (restart/rebuild after committing);
source archives without Git metadata report `unknown`. Initialization failures
are reported in the console.

`captureScreenshot({ count })` returns a promise for an array of screenshots and
retains the latest successful batch as `window.cvTestTool.screenshots`. Each frame
contains an independent `ImageData` buffer, `offsetMs` relative to the first frame,
`timestampMs` on the `performance.now()` clock, and the video's `mediaTime` in
seconds. Nothing is uploaded, persisted, or downloaded. Arrays and frame records
are frozen; pixel buffers remain writable for later processing. Callers retaining
older batches own those references even after the workspace clears its copy.

Count must be an integer from **1 to 30**. The one-second sampling window starts
after the share picker, stream setup, and first video frame. Five frames target
offsets **0, 200, 400, 600, and 800 ms**, using actual presented video frames.
Browser scheduling can shift the offsets; a slow/stalled stream, a resize, or
stopping sharing rejects the promise instead of returning a partial or late batch.
A failed capture preserves the previous successful batch.

The first call must be triggered by a user gesture because it calls
`navigator.mediaDevices.getDisplayMedia()`. Start with the UI button; while the
approved stream remains active, subsequent API calls can run from the console
without another picker. Calls cannot overlap. Navigation/reload stops sharing and
clears the workspace batch. Keep the tab foregrounded and the preview unobstructed.

This initial implementation requires Region Capture (`CropTarget` / `cropTo`) and
`requestVideoFrameCallback`, available in supported desktop Chromium browsers.
Selecting another tab, a window, or a screen fails rather than saving the wrong
region. See [Region Capture](https://developer.chrome.com/docs/web-platform/region-capture)
and the [Screen Capture specification](https://w3c.github.io/mediacapture-screen-share/).
There is no full-screen fallback. Additional test pages can be registered in the
`stories` map in `cv-test-tool/main.ts`; add local HTML entries to `vite.config.ts`
when they also need to be available in the production build.

`npm test` includes capture lifecycle and sampling tests with mocked browser media
APIs, alongside the actual OpenCV WASM smoke test. The mocks exercise permission
denial/retry, cropping, one-second scheduling, independent buffers, cancellation,
overlapping calls, resizing, and stalled streams. Manual browser verification must
also exercise the share picker and inspect frames from **Motion study**.
Run just the capture tests with `npm run test:capture`.
