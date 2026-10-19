# Manual input and feedback
Source: [main.ts](../../src/main.ts) input handlers/animate/syncVoiceControls.
Audio: [microphone component](audio.md).
Visual: [overlays](../visual/overlays.md), [copy](../visual/copy.md).

- **C-INPUT-01**: hold Boost pointer to drive at .75; acquire pointer capture.
  pointerup, pointercancel, or lostpointercapture releases it.
- **C-INPUT-02**: clicking Boost also supplies a 180ms .75 drive pulse.
  Hold Space while outer playing and not finished for the same manual drive.
- **C-INPUT-03**: Space should not hijack another focused button.
  keyup/blur clears held state; blur also clears pointer and click pulse.
- **C-INPUT-04**: playerDrive=max(smoothedMicLevel,manualLevel).
  Manual input never writes to the microphone meter; the meter reports mic level only.
- **C-INPUT-05**: when the field is rendered, its selected left ring/label respond to drive.
  Quiet label is YOUR <PLANET>; manual uses BOOST ACTIVE; mic uses VOICE ACTIVE.
  Visible ring activity does not require the ball to be in range.
- **C-INPUT-06**: waiting feedback distinguishes drive readiness from applied impulse.
  Incrementing selected planet's boosts displays "<Planet> boosted the asteroid!"
  for 650ms and green/bold .boost-applied status.
- **C-INPUT-07**: voiceControls is shown in ready/countdown/playing/goal.
  It is hidden in selecting/finished. On <=420px height, hide voice-help only;
  keep microphone toggle, meter, Boost, and status visible.
- **C-INPUT-08**: game remains playable without mic permission using Boost or Space.
  Microphone errors must not disable the manual controls.

Evidence: browser input tests are still needed for hold/release/focus feedback.
[Planet tests](../../tests/planets.test.mjs) verify drive affects only selected left field.
