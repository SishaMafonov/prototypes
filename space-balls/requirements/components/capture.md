# Display-stream screenshot capture
Source: [capture.ts](../../tools/cv-test-tool/capture.ts).
Evidence: [capture tests](../../test/capture.test.mjs).
Integration: [tool pipeline](../integrations/tool-pipeline.md).

- **C-CAPTURE-01**: count must be an integer1..30; reject invalid/concurrent requests.
  The iframe must be connected and have nonzero visible dimensions.
- **C-CAPTURE-02**: use getDisplayMedia with video/browser preference, ideal30fps,
  audio false, current tab included/preferred, surface switching excluded.
  The first request must occur directly in user activation.
- **C-CAPTURE-03**: require secure context, Region Capture, and video-frame callbacks.
  Require a browser-tab track and cropTo(CropTarget.fromElement(iframe)).
  Wrong tab/window/screen fails; never substitute a full-surface screenshot.
- **C-CAPTURE-04**: crop before sampling. Attach muted/playsInline video outside the
  cropped iframe so it can present frames without capturing itself recursively.
- **C-CAPTURE-05**: sample actual presented frames at target offsets k*1000/count ms,
  k=0..count-1. Five targets are0,200,400,600,800ms after the first frame.
  Permission/setup latency is outside this window.
- **C-CAPTURE-06**: reject if first frame fails to arrive in5s, batch reaches1s,
  stream stalls, preview dimensions change, or sharing stops.
  Browser scheduling can shift offsets; do not claim hard real-time precision.
- **C-CAPTURE-07**: each screenshot owns independent RGBA ImageData,
  offsetMs, timestampMs on performance clock, and video mediaTime in seconds.
  Freeze frame records and batch array; pixel buffers remain mutable.
- **C-CAPTURE-08**: retain latest successful batch; failed batch leaves it intact.
  Reuse an approved live stream for later API calls without another permission picker.
- **C-CAPTURE-09**: stop aborts sampling, stops all tracks, detaches video.
  A stream arriving after pending-request cancellation is stopped immediately.
  Pending native pickers still need browser dismissal; they cannot be programmatically closed.

The native picker is outside captured content and is not a visual test target.
Current automated tests mock media; live source selection remains a manual check.
