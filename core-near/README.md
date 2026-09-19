# Core Near

A local two-player canvas strategy game built from Circuit’s handoff in `gameRules/`.

## Run

From this directory, using Node.js 22.12+ (or a Vite-compatible newer version):

```sh
npm install
npm run dev
npm test
npm run build
npm run serve
```

`dev` runs Vite. `serve` serves the built `dist/` directory on port 1234. No backend or external assets are required.

## Play

- X starts. Click or tap any boundary dot to launch inward. The ray moves automatically, turns at static corners and stops at a flat wall.
- Hover a dot to preview its path. Turn preview off for a more challenging game.
- Old traces can be crossed and retraced. They never affect collision.
- Finish all four sides of a unit cell to claim it. Static walls and both players’ traces count. Ownership is permanent; every captured cell is one point.
- Players alternate after every valid move, including a zero-capture or repeated move. There are no bonus turns.
- Claim all 23 playable cells to end the game. Highest score wins.
- Keyboard: focus the canvas, use arrow keys to cycle points, then Enter/Space to launch. The launch selector and button provide an alternative.
- Restart Board clears gameplay while keeping display settings. Reset Game also restores preview on and coordinates off. Both safely cancel any active ray.

## Board and assumptions

The default board faithfully uses the complete `irregular-5x5` fixture from `03_GEOMETRY_AND_CSV_EXAMPLES.md`: 24 interior cells, one blocked cell, 23 claimable cells, 24 static unit edges and 14 launches. The larger original screenshots are not included in the handoff directory; this is not a reconstruction of their layout.

Corner directions follow the supplied quadrant table. X starting, no bonus turns, rejection of loops without consuming a turn, and rejection of initially complete/unreachable boards are the documented prototype conventions. Retracing remains legal indefinitely; there is no invented no-progress end condition.

## Code and verification

- `src/data/board.ts`: fixed cell mask, compact wall segments and complete launch list.
- `src/game/Board.ts`: normalizes and validates data, including closed boundaries, launch eligibility and reachability.
- `src/game/RaySimulator.ts`: pure simulation using static geometry only, with directed-state loop protection.
- `src/game/Scoring.ts` and `Game.ts`: edge presence, permanent ownership and atomic turn lifecycle.
- `src/render/`: high-DPI responsive canvas and elapsed-time animation at 8 cells/second with 75 ms corner pauses.
- `src/main.ts`: interface, pointer/keyboard input, animation orchestration and reset.

`npm test` compiles the engine into ignored `.test-build/` and uses Node’s built-in test runner. It covers the handoff’s geometry, scoring, loader, loop, lifecycle, full-game and rendering-isolation cases. `npm run build` checks all TypeScript and creates the production bundle.

Browser smoke checks cover direct canvas selection, corner previews, a complete 23-cell game, keyboard launch, animation cancellation, reset preferences, the rules dialog and desktop/phone layouts. The automated suite contains 37 passing tests.
