# Microphone lifecycle
Source: [microphone.ts](../../src/microphone.ts),
[main.ts](../../src/main.ts) syncVoiceControls.
Integration: [input lifecycle](../integrations/input-lifecycle.md).
Visual text: [copy](../visual/copy.md).

- **C-AUDIO-01**: states off/requesting/active/paused/denied/unavailable/error.
  Request audio only: echoCancellation true, noiseSuppression true, autoGainControl false.
- **C-AUDIO-02**: request capture immediately even when AudioContext.resume is pending.
  Process 1024 samples locally; do not connect audio to speaker output or record it.
- **C-AUDIO-03**: loudness=clamp((RMS-.012)/.2,0,1)^.75.
  Empty/nonfinite samples yield0. Smoothed attack time .04s, release .12s.
  Inactive/paused states return level0.
- **C-AUDIO-04**: clicking while active/requesting stops or cancels.
  Other states retry enable, replacing old capture and audio context.
- **C-AUDIO-05**: NotAllowed/Security -> denied; NotFound/NotReadable -> unavailable;
  other errors -> error. Missing capture/AudioContext -> unavailable.
- **C-AUDIO-06**: stop increments generation, disconnects nodes, stops tracks,
  closes context, clears references/level, and sets off.
  A late response from an old request cannot replace a newer request.
- **C-AUDIO-07**: external track ending stops capture and sets unavailable.
  AudioContext suspension sets paused and zero level.
- **C-AUDIO-08**: hidden page, pagehide, match finish, and New Game release microphone.
  Returning to a visible page does not silently reacquire permission/capture.
- **C-AUDIO-09**: status/button/aria-pressed agree with lifecycle.
  Active=Turn mic off/pressed true; requesting=Cancel microphone;
  paused=Resume microphone; other states=Enable microphone.

Evidence: [microphone tests](../../tests/microphone.test.mjs).
Pixels cannot prove track release, permission outcome, privacy, or RMS correctness.
Pair visual status checks with browser-media mocks or session state evidence.
