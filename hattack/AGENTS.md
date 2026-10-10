# Heart Attack — Agent Guide

Read the repository-root `../AGENTS.md`, then [CONTEXT.md](CONTEXT.md) before
changing this project. [README.md](README.md) describes the game and commands.
Keep this guide for durable working rules; update the dated context when behavior
or the verification baseline changes.

## Scope and commands

- Work from `hattack/`. This is an independent client-only prototype, with no
  framework, backend, database, cash transactions or cross-project dependencies.
- Use npm and the existing `package-lock.json`. Use Node.js 24; tests import
  `src/game.ts` and `src/bonus.ts` directly using native TypeScript support.
- For a fresh checkout, run `npm ci`. With dependencies present, avoid needless
  reinstalls. Use `npm run dev` for source preview; `npm run build` generates
  `dist/`; `npm run serve` serves that build on port 1234.
- Preserve the TypeScript 7/Vite toolchain. Do not switch package managers,
  introduce a framework, or restructure other prototypes as incidental cleanup.
- Use `apply_patch` for source edits. Preserve user changes. Do not hand-edit
  `node_modules/` or `dist/`, and do not include them in a Git checkpoint.

## Where to change things

| Concern | File / entry points |
| --- | --- |
| Symbols, weights, strips, stops, ways, cascades, hearts, love-meter targets, payouts | `src/game.ts` |
| Free-spin awards, bonus draws, collections, held hearts and bonus payout | `src/bonus.ts` |
| Round orchestration, input, accessible announcements, statistics | `src/main.ts`: `spin`, `checkBoard`, `tick`, `setPhase`, `updateStatistics` |
| Artwork slicing, geometry and canvas animation | `src/main.ts`: `buildSymbolMap`, `getScene`, `drawReel`, `drawHeartBar`, `drawHeartWilds`, `drawLoveMeter`, `drawLoveArrows` |
| Page, responsive statistics bar and rules dialog | `src/style.css`; HTML is created in `src/main.ts` |
| Deterministic rules verification | `tests/game.test.mjs`, `tests/bonus.test.mjs` |

Keep DOM-free rules in `game.ts` / `bonus.ts`, with injectable `RandomSource` for deterministic
tests. Keep state and animation orchestration in `main.ts`.

## Preserve these decisions

- Mobile is the user's main focus. Portrait uses the full original background;
  desktop uses a larger landscape board and retains the original right love
  meter. Keep canvas, grid, highlights, hearts and flight coordinates aligned.
- Canvas click/tap and Space/Enter start a round only when idle. Lock new spins
  during every cascade, Wild release and arrow burst. Preserve reduced-motion handling and
  accessibility labels/status text.
- Generated reel strips allow zero to three Wilds each, using
  `REEL_CATEGORY_WEIGHTS`: relative Low/Mid/High/Wild/Scatter weights
  77.5/11/9.5/2.5/6.5, normalized over 107 before caps.
  Cap Wilds across the entire strip, not just the four visible rows; renormalize
  eligible weights after either special-symbol cap. Cascade/arrow refills use
  `CATEGORY_WEIGHTS` and never draw new Wilds. Mid/High heart awards can add
  Wilds beyond the initial-strip limit; do not cap those existing awards.
- Scatters never count as wins or winning cells. Preserve all Scatters through
  gravity and arrow clears. They pay nothing and do not charge hearts/the meter.
  Generate at most one Scatter per entire reel strip. Cascade/arrow refills also
  allow at most one per visible column, accounting for survivors and earlier
  incoming cells. Exclude Scatter after the first; renormalize regular weights.
  `Result.scatterTrigger` is a separate three-or-more signal. After all base
  cascades/hearts/earned arrows settle, 3/4/5 Scatters award 10/15/20 free spins.
  Do not reintroduce `scatterWin` or trigger the bonus repeatedly during cascades.
- Only Mid and High ways wins charge the bottom hearts, using their longest
  consecutive reel count (3–5) across the cascade sequence. Low, Scatter and
  standalone Wild results earn no hearts; Wild substitution in Mid/High ways
  qualifies. A longer Low win must not raise a qualifying award. Keep Low payouts,
  cascades and love-meter charging unchanged. Award targets remain any regular cell.
  Finish all natural cascades before releasing that sequence's heart award.
  Consume the award before evaluating the released Wilds. Multiple new Wilds
  may share a reel; forcing one onto each reel can guarantee recurring wins.
- The love meter resets at the start of each player spin. Every winning board
  adds one cell, capped at ten, and sets `arrowsPending`. Fire after natural
  cascades and heart-Wild cycles finish; consume pending before the refill.
  Keep charge between bursts. Fresh post-arrow wins enable another burst after
  their cascades/hearts finish. Stop when a refill has no win; charge alone must
  never retrigger arrows. Track burst/target totals for the whole player round.
  Keep five cells in the 1–3-arrow tier, six to eight in 3–8, nine in 8–15, and
  ten as a clear of all regular symbols. Arrow targets never include Wilds or
  Scatters. Arrow removals share `createRemovalCascade` with normal cascades;
  only subsequent evaluated wins pay. Post-arrow wins use normal hearts/rules.
- Credit each evaluated winning board once. Accumulate payouts in integer cents.
  Only starting a spin increments rounds; cascades and Wild releases do not.
- Bonus play uses a separate row-major 5 × 5 grid. Preserve the settled base
  board and base feature counters through the bonus; Continue gates entry and
  exit. Reuse the supplied bonus background's row artwork for the fifth row,
  as explicitly requested. Do not draw replacement cell frames.
- Bonus symbols draw independently: Empty 35%, Coin 25%, ×2 20%, ×3 10%, Heart
  7%, Scatter 3%. Arrow counts 1–5 use relative weights 20:15:12:5:3 (the stated
  weights total 55); sample rows without replacement, so each row is shot at most
  once per free spin.
  The small top-left arrow badge shows shots remaining after selection, decreases
  after completed shots, persists through heart sweeps, and disappears at zero.
  Collect each cell once. A collected Scatter adds one spin; a heart sweeps its
  column or waits for the next spin if empty. Keep carried hearts visible through
  filling and while queued behind another heart; drain them before new arrows.
  Multipliers add their face values to a bonus-wide ×1 starting value. Final
  payout is all collected coins × fixed bet × cumulative multiplier, credited
  once to the triggering paid round. Free spins do not increment paid rounds.
- RTP is uncalibrated and explicitly accepted for the demo. Do not silently
  retune probabilities, reduce payouts, cap rounds, or change feature rules to
  reach an assumed target RTP.
- Session statistics are in memory and reset on reload. Persisting game state
  or adding a player balance would be a new feature, not existing behavior.

## Verification and handoff

- After gameplay changes, run `npm test` and `npm run build`. Extend meaningful
  rule tests for changed behavior; update deterministic draw fixtures if weights
  change. Documentation-only edits need a content/link check, not new game tests.
- After visual or interactive changes, smoke-test mobile (390 × 844) and desktop
  (1440 × 900). Check resize during a round, locked input, heart placement,
  statistics, love-meter overlays/arrow flights and browser errors as relevant
  to the change.
- Rounds can last many cascades. Waiting only for the initial reel stop does not
  verify the round ended; inspect `#game`'s `data-phase` until it becomes `idle`.
- `npm run serve` displays the last build, not live source. Rebuild first. If
  port 1234 is occupied, identify/reuse the existing server or use another port;
  do not kill an unknown process. Cached static previews may need a fresh URL.
- Stop preview processes you started when finished, unless the user wants them
  kept running. Report results and limitations; keep README/context synchronized
  with user-visible rule changes. Recheck Git status before any requested commit.
