# Game scene-graph tests

Run from `space-balls/` with Node.js 24:

```sh
npm run test:scene
npm test
```

The scene suite is included in the default test command. Scope is every game
component in `src/`; the separate CV workspace retains its existing tool tests.

## What is observed

`harness.mjs` executes the actual `src/main.ts` renderer and event handlers in an
isolated VM with Happy DOM. It removes import declarations and strips TypeScript
syntax; real match/planet modules and the real microphone implementation run.
No testing hooks are added to the shipped game. The scene consists of:

- A canvas root with nested save/restore scopes and recorded paint nodes.
- Per-paint source image, crop, transform, clip ancestry, style, and draw order.
- The live interface DOM tree, including parents, attributes, text, and visibility.

Expected stage membership comes from requirements/visual/stages.md. Landscape,
portrait, and short geometry comes from the checked-in requirements geometry
fixtures, not from fresh calls to the renderer's geometry functions. Test names
reference stable requirement IDs; registration validates those definitions.

## Component coverage

| Game component | Scene assertions | Test file |
| --- | --- | --- |
| Boot/artwork | One canvas/interface; all-assets gate; four individual failures; initialization errors | stages |
| Planet picker | One preview, atlas identity, names/counts, wrap, keyboard, focus, retained selection | stages |
| Court/background | Full viewport draw; veil by stage; CSS/backing sizes; resize/DPR recovery | stages, geometry |
| Planets | Eight frames, correct atlas crops/scales, reflected right sprites, all four selections | stages, geometry |
| Gravity rings | Eight body-centered rings, gradient geometry, order, controlled input arcs | geometry, interface |
| Goals | Two colored frames, independent positions, shared court geometry, 4-by-8 meshes | geometry |
| Asteroid/tail | Crop, projected position, size, shared clip, nesting, heading, alpha, phase presence | stages, geometry |
| Match/HUD | Countdown/goal/play/result membership, scores, rule/deuce/match-point classes | stages, interface |
| Result | Both winners, final copy/scores, modal persistence, cleanup, replay/focus/fresh match | interface |
| Manual input | Pointer hold and all release events, click pulse, Space/focus/blur, applied feedback | interface |
| Microphone | Seven status projections; requesting/active/off; meter versus manual drive; resource cleanup | interface |
| Short viewport | Help suppressed while controls remain; pointer-event declarations; dialog overflow | interface |

Each file above is named `<name>.test.mjs`. `negative.test.mjs` validates the
recorder and checks in-memory mutations for missing asteroid, missing clipping,
wrong mirroring, leaked voice controls, and incorrect meter parentage.

## Fixtures and limits

Clock, RNG, frame scheduling, viewport/preview rectangles, image load events,
audio capture, AudioContext, pointer capture, and resize notifications are
controlled fixtures. PNG dimensions are read from the actual source files.
Tests use explicit score/ball/effect/status setup for isolated stages and drive
feedback; other transitions use the real game rules and handlers.

This is a submitted-scene and DOM test suite. It does not rasterize canvas,
decode sprite pixels, emulate browser layout/hit testing, or certify the browser's
dialog top layer, focus trap, real permissions, or physical device behavior.
Happy DOM evaluates relevant CSS/media declarations, but viewport dimensions
and reachability still need browser checks. The CV tests remain the pixel oracle.
Node may print an ExperimentalWarning for its native stripTypeScriptTypes API.

The structural suite still checks import/call/phase contracts; the scene suite
adds runtime composition and component interaction evidence. A referenced ID
means specific assertions under that contract, not complete clause coverage.
