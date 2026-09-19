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
- Claim every playable cell to end the game. Highest score wins. The total varies with the generated outline and islands.
- Keyboard: focus the canvas, use arrow keys to cycle points, then Enter/Space to launch. The launch selector and button provide an alternative.
- New Board generates a fresh 20 × 20 layout and clears gameplay. Restart Board replays the current layout while keeping display settings. Reset Game also restores preview on and coordinates off. All safely cancel any active ray.
- Dark theme switches both the page and canvas without changing the game. It remembers your choice locally; without a saved choice, it follows your system preference. Restart, reset and new boards retain the theme.

## Board and assumptions

Each page load and New Board creates a random board spanning 20 × 20 cells. Stepped notches reshape the outer boundary; separated islands use rotated rectangles, L, T, cross and zigzag footprints. Accepted boards contain at least 100 corners across their boundaries and islands. Outside and blocked cells are excluded from the claimable total.

The generator derives all static walls and eligible inward launch points from the mask, then validates each proposed feature with the original board loader and ray simulator. Features that create touching walls, unreachable cells or initially complete cells are discarded. Generation uses bounded retries and returns only validated layouts. The displayed hexadecimal board code is its deterministic seed, usable with `generateBoard(seed)` for reproduction in code.

Circuit’s original `irregular-5x5` fixture remains in `src/data/board.ts` for regression testing. The supplied handoff’s earlier exclusion of procedural boards is superseded by the requested 20 × 20 randomization; its ray and capture rules remain unchanged.

Corner directions follow the supplied quadrant table. X starting, no bonus turns, rejection of loops without consuming a turn, and rejection of initially complete/unreachable boards are the documented prototype conventions. Retracing remains legal indefinitely; there is no invented no-progress end condition.

## Code and verification

- `src/data/board.ts`: original fixed fixture for rules regression tests.
- `src/game/BoardGenerator.ts`: seeded randomized masks, derived walls/launch points, and incremental validation.
- `src/game/Board.ts`: normalizes and validates data, including closed boundaries, launch eligibility and reachability.
- `src/game/RaySimulator.ts`: pure simulation using static geometry only, with directed-state loop protection.
- `src/game/Scoring.ts` and `Game.ts`: edge presence, permanent ownership and atomic turn lifecycle.
- `src/render/`: high-DPI responsive canvas and elapsed-time animation at 8 cells/second with 75 ms corner pauses.
- `src/render/Theme.ts`: canvas palettes and resilient theme preference storage.
- `src/main.ts`: interface, pointer/keyboard input, animation orchestration and reset.

`npm test` compiles the engine into ignored `.test-build/` and uses Node’s built-in test runner. It covers the handoff’s geometry, scoring, loader, loop, lifecycle, full-game and rendering-isolation cases. `npm run build` checks all TypeScript and creates the production bundle.

The automated suite contains 44 tests, including the original 37 rule/lifecycle checks, deterministic generation, 64 varied seeds played to full completion, and theme persistence/rendering isolation. Browser smoke checks cover direct canvas selection, previews, new-board generation, cancellation during animation, restarting the same board, theme changes during a ray, theme persistence after reload, the rules dialog and desktop/phone layouts.
