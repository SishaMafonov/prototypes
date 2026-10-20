# Input, microphone, and page lifecycle
Source: [main](../../src/main.ts), [microphone](../../src/microphone.ts),
[match](../../src/match.ts).

- **I-INPUT-01**: animate reads mic and manual states, takes their max,
  and passes playerDrive to advanceMatch/applyPlanetDynamics.
  Only selected left planet uses that drive; other planets keep AI behavior.
- **I-INPUT-02**: manual input drives ring/status while microphone meter remains0
  when mic is off. Do not confuse an empty mic meter with a failed manual Boost.
- **I-INPUT-03**: in the rendered field, drive brightens ring and changes canvas label.
  Applied-boost feedback requires an incrementing selected effect counter.
- **I-INPUT-04**: manual input and microphone errors coexist safely.
  Denied/unavailable/error status keeps Boost usable; neither blocks Start or play.
- **I-INPUT-05**: ready/countdown/goal can show input feedback and mic status,
  but physical planet impulses happen only in match playing.
- **I-INPUT-06**: blur clears held manual input.
  visibilitychange resets the animation timestamp; when hidden, also stop mic,
  reset pointer/keyboard/pulse/playerDrive, and synchronize status.
- **I-INPUT-07**: finished clears manual input, mic, drive, and boost feedback before
  displaying results. New Game performs the same cleanup and fresh selection reset.
- **I-INPUT-08**: pagehide stops mic. Restarting audio after a prior pending request
  must not adopt an old stream; generation-based lifecycle tests provide evidence.
- **I-INPUT-09**: iframe game controls must receive focus for Space events.
  Workspace shortcuts must not be treated as game input unless focus is inside iframe.

Visual evidence checks UI reaction; API/media evidence checks resource ownership.
