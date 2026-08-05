# Capybara Crossing — Agent Guide

This file gives any AI agent the working context needed to maintain the game prototype.

## Project purpose

Capybara Crossing is a browser-based two-player board-game prototype inspired by backgammon. Blue is human-controlled; Red is a simple automated opponent. Both teams move ten capybaras from their own base to the opposing base through a procedural 6×6 board of connected trail tiles.

## Project structure

```text
capybara-crossing/
├── index.html          # Application shell and control-panel markup
├── package.json        # Vite + TypeScript scripts and dependencies
├── tsconfig.json       # Strict TypeScript configuration
├── src/
│   ├── main.ts         # All game state, rules, Canvas rendering, and animation
│   ├── style.css       # Responsive game layout and interface styling
│   └── vite-env.d.ts   # Vite type declarations
└── AGENTS.md           # This guide
```

The source of truth for gameplay is `src/main.ts`. There is intentionally no framework, server API, or persistence layer.

## Toolchain and commands

- Runtime: Node.js
- Language: TypeScript 7
- Bundler/dev server: Vite
- Package manager: pnpm

Run from this directory:

```powershell
pnpm install
pnpm dev
pnpm build
```

`pnpm dev` runs the local Vite server. `pnpm build` type-checks with `tsc --noEmit` and produces a browser bundle. Do not edit generated `dist/` files.

## Board and movement model

- The visible board is exactly 6×6 tiles.
- Each tile uses one of the eleven route shapes from the root `examples.txt` reference. A route is usable only when the outgoing edge of one tile matches the incoming edge of its neighbour.
- A die value counts **board tiles**, not the small 3×3 cells shown in `examples.txt`.
- Capybaras always end on a tile centre and follow a simple connected route. A route cannot revisit a tile within the same move.
- Blue enters from the left edge; Red enters from the right edge.
- The two central-right tiles are Blue's home gates; the two central-left tiles are Red's home gates. These tiles are randomly drawn from the same route patterns as every other tile.
- Landing exactly on either opposing home gate removes the capybara from the board and counts it as crossed/scored, but only while that tile's random pattern has the outward connection to the opposing base.

## Turn, dice, and forced-move rules

- The opening roll chooses the first team: sum above 7 means Red, below 7 means Blue; 7 rerolls.
- The opening dice are used for the first turn.
- On standard rolls, a selected Blue capybara shows destinations for either die and their combined total.
- Doubles produce four individual moves. A capybara can be deployed from base at most twice in a turn, even with doubles.
- Dice are display-only: the player does **not** click a die. They click a capybara, then a highlighted destination.
- If a die cannot produce any legal move, it burns automatically.
- If no legal move exists, show the short `No more moves` board toast and pass the turn. Do not show that toast after a normal turn where every die was successfully spent.
- Red rolls automatically and then chooses moves through the simple AI.

## Stacks and captures

- Any number of friendly capybaras may share a tile. Friendly stacks can be entered and crossed.
- A stack of two or more opposing capybaras blocks entry and traversal.
- A lone opposing capybara on a landing tile is captured and returned to its base.
- This applies to the home-gate tile as well: score only after any lone defender there is sent back.
- Base reserves are drawn outside the board. When empty, the base must remain dark and show `BASE EMPTY`.

## Visual interaction and animation

- Canvas is responsive and high-DPI aware. Keep game coordinates based on `geometry()` and `center()`; never hard-code screen pixel positions for board tiles.
- Selecting a Blue capybara gives it a glow and outlines all legal destinations. Destination labels indicate the number of tiles consumed.
- Normal movement follows every tile in `Move.route`, taking roughly 0.65–3 seconds depending on distance.
- Captures show a short `BUMP!` callout, then animate the captured capybara back to base with a spin.
- A capybara crossing into the opponent base gets a small confetti effect during its arrival animation.
- The final capybara still outside home pulses from normal size to double size and back every two seconds, including while in its base.
- The two home-gate tiles for each team have a transparent color wash and a `HOT SPRINGS` exit label; preserve these route markers when changing board visuals.
- The header `Trail time` counter starts once the opening roll establishes the first turn, updates every second, and freezes at game end.
- At each turn roll, unoccupied tiles lightly shake, then fade and fall away in a staggered sequence. New random tiles then descend from above in a short staggered arrival before play resumes; the board container has a subtle synchronized tremor during the old-tile collapse. Keep input and AI actions paused throughout this route-shift sequence.
- While an animation or capture callout is active, do not allow new player input or AI moves. Commit the board state only after the relevant animation completes.

## Working conventions

- Keep changes focused; most changes should be in `src/main.ts` and/or `src/style.css`.
- Preserve the Canvas-first UI. Do not replace it with DOM tile elements without an explicit product request.
- Use `apply_patch` for source-file changes.
- Type-check and build after changes. If the normal `dist/` directory is locked by an active local preview, use a separate verification output directory instead of deleting files or stopping the user's preview.
- Do not use destructive git commands or overwrite user changes.
- When changing game rules, update this guide in the same change so future agents inherit accurate behavior.
