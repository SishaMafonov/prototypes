# Prototypes — Agent Guide

## Repository purpose

This repository is an early-stage collection of small, independent browser-game ideas and prototypes. It is **not** a production application and is not a Node.js workspace/monorepo: each project owns its dependencies, toolchain, and scripts. There is no root `package.json` or root development command.

Most modern prototypes use Node.js, TypeScript, Vite, and `<canvas>`. Older prototypes are plain browser JavaScript or small Node.js scripts. Keep work scoped to the requested prototype; do not introduce cross-project dependencies, shared infrastructure, or production concerns unless explicitly requested.

## Repository map

| Path | What it is | Source of truth | Run/build from that directory |
| --- | --- | --- | --- |
| `capybara-crossing/` | Two-player, dynamic-path board-race game; human Blue versus automated Red | `src/main.ts`, `src/style.css`; read `capybara-crossing/AGENTS.md` before editing | `pnpm install`, `pnpm dev`, `pnpm build` |
| `planet-pulse-football/` | Voice-powered canvas football game with planetary gravity, AI, timed matches, and optional microphone input | `src/main.ts`, `src/style.css` | `pnpm install`, `pnpm dev`, `pnpm build` |
| `slot-template/` | Canvas card-slot-machine prototype with three animated reels | `src/main.ts`, `src/style.css` | `pnpm install`, `pnpm dev`, `pnpm build` |
| `races-of-aces/` | Browser card-racing game: card suits advance aces while side cards alter the race | `index.mjs`, `src/`, `static/index.html`, `static/css/main.css` | `npm install`, `npm run build`, `npm run serve` |
| `video-slots/swirl-animation/` | Legacy Phaser 3.10 five-reel slot experiment with a swirl feature animation | `main.js`, `config.js`, `index.html`, `assets/` | Serve the directory with a static web server; Phaser is loaded from a CDN |
| `rps/` | Node.js rock-paper-scissors Monte Carlo/statistics script (100 million rounds) | `src/*.mjs` | `npm run run` |
| `code-word/` | Node.js word-combination/cipher experiment | `src/word.mjs` | `npm test` |
| `docs/` | Checked-in, compiled Capybara Crossing static site, likely for repository-page hosting | Generated `index.html` and `assets/`; do not hand-edit during ordinary feature work | No local source command |
| `examples` | Route-shape reference used by the Capybara Crossing concept | The file itself | N/A |

## Working rules

- Repository-local Codex skills live in `.codex/skills/`. At the beginning of each session, discover and expose the skills in this directory in the session's available-skills catalog. Before taking task actions, select and initialize every local skill that is relevant to the requested project or workflow; read its `SKILL.md` in full and follow it. Do not initialize unrelated skills. Use `/project-init` when asked to create a new standalone browser-project directory.
- `AGENTS.md` cannot itself register a skill with the client: each local skill must be a directory under `.codex/skills/` containing a valid `SKILL.md`, so session discovery can include it.
- Start by locating the target project above and run commands from its directory. Do not run `npm install`, `pnpm install`, or build commands at the repository root; the root `package-lock.json` has no dependencies.
- Respect package-local lockfiles and package managers. The three Vite TypeScript projects use `pnpm`; `races-of-aces` has an npm lockfile; the two script projects declare no dependencies.
- Treat each project as a standalone client-only prototype. There are no server APIs, database schemas, authentication flows, or shared runtime packages to maintain.
- Canvas game state, rules, rendering, and animation are intentionally concentrated in each project's `src/main.ts`. Preserve responsive canvas sizing and input behavior when modifying those games.
- Prefer focused edits. Do not convert legacy JavaScript to TypeScript, replace rendering approaches, or add frameworks as incidental cleanup.
- Do not edit `node_modules/`, `dist/`, or `docs/assets/` by hand. `docs/` is a built artifact and should be regenerated only when a task explicitly includes updating the published Capybara site.
- Do not assume a package's configured build is currently healthy. Install its own dependencies, run its declared build/test after changes where practical, and report any pre-existing failure separately.
- Preserve user changes and avoid destructive Git commands. Use `apply_patch` for source edits.

## Project-specific notes

### Capybara Crossing

Read [`capybara-crossing/AGENTS.md`](capybara-crossing/AGENTS.md) first; its game-rule and animation requirements are authoritative and more detailed than this root guide. It is a strict TypeScript/Vite project, using a high-DPI responsive canvas. The `examples` file supplies the 11 trail-tile patterns referenced by the game guide. The checked-in `docs/` bundle is derived from this project and uses a `/prototypes/` asset base path.

### Planet Pulse Football

This is a strict TypeScript Vite canvas game. `src/main.ts` owns all match state, 100×56 world physics, planetary attraction, AI behavior, canvas drawing, overlays, and optional Web Audio microphone analysis. The UI must remain usable without microphone permission through its silent-play control. Keep the fixed world-space model and responsive canvas projection aligned when changing gameplay or visuals.

### Slot Template

This is a strict TypeScript Vite canvas prototype. `src/main.ts` defines the card deck, three reel states, animation timing, hit testing, and drawing; `src/style.css` owns the page layout. The canvas itself is the spin control, so retain its click/tap accessibility label and interaction.

### Races of Aces

This is legacy ECMAScript-module browser code bundled by webpack. `index.mjs` coordinates DOM updates; `src/deck/` creates and shuffles a 48-card deck (2–K only); `src/game/` contains board state and turn rules. Webpack emits `static/src/main.js`, which is generated and intentionally not tracked. `npm run serve` serves the built `static/` directory on port 1234.

### Video Slots / Swirl Animation

This standalone legacy Phaser game has no package manifest. `config.js` defines global geometry and reel constants consumed by `main.js`; preserve their load order in `index.html`. Asset paths are relative and must stay intact. Test it through an HTTP static server rather than opening files directly, because it depends on a remote Phaser script.

### RPS and Code Word

These are command-line experiments, not browser applications. `rps/src/main.mjs` deliberately performs 100,000,000 simulated rounds before outputting statistics, so it can be slow. `code-word/src/word.mjs` currently logs a single example result and does not export an API.

## Verification

- For Vite projects, use the local `pnpm build` (which type-checks before bundling).
- For Races of Aces, use `npm run build`; use `npm run test` only to execute its browser-oriented entry point if the environment supplies a DOM.
- For RPS and Code Word, use their declared script commands only when the expected runtime cost is acceptable.
- Use a browser preview/manual smoke test for interactive canvas or Phaser changes, especially after changing event handling, animation, or microphone behavior.
