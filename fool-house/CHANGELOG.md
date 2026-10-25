# Fool House change history

Newest changes come first. Keep this history updated so future agents can understand the current behavior and the decisions behind it.

## 2026-10-25 — Room-specific win multipliers and prototype calibration

- User confirmed one independent random multiplier per winning room-specific group, stacked with the Fibonacci stage multiplier, and an approximate 96% RTP target.
- Added the exact 30-slot bag: fourteen x2, eight x3, five x5, three x8. Award = count-paytable group amount × stage × room. Other-room groups receive no room roll. Already-collected tiers remain eligible on later wins; Scatter and sub-threshold matches do not qualify.
- Added a separate 1100 ms teal room-bonus reveal between winning highlight and removal, with one row per qualifying group and before/after amounts. Highlight matching member cells; preserve readable static reveal under reduced motion. Credit only the final total once after removal.
- Calibrated static weights to Low 14.66%, Mid 10%, High 70.34%, Scatter 5%, retaining the paytable, uniform regular indexes, and stage/collection rules. High is deliberately common; this shorter-chain profile was selected over a tested Low-heavy alternative.
- Added `npm run simulate` using production math helpers and seeded complete-round simulations. Two fresh million-round validations yielded combined 96.07564% RTP (approximate 95% interval 95.9558–96.1955%) and 88.1421% hits versus 62.929% in the old-game sample. Only 63 first free stages were observed; later Fibonacci tails are not empirically calibrated. See `docs/game-rules/07-calibration.md` and raw JSON studies.
- Updated the agent-readable rules to v2, including room-roll branches, ten states, accounting examples, and calibration evidence. Added three room-multiplier regression tests (15 tests total).
- Verification: all 15 tests and the final production build passed. Desktop and 440 × 956 browser checks showed independent x2/x3/x8 group reveals, locked input, exact 0.97 final credit, and the subsequent free stage at x2; no console warnings/errors. The temporary fixture and both preview servers were removed/stopped. Validated seven rules modules, 106 case IDs, 44 links, five source fingerprints, and `git diff --check`.

## 2026-10-25 — Detailed agent-readable rules reference

- Audited current runtime math, sequencing, accounting, presentation, and failure branches. Added `GAME_RULES.md` as a compact entry point with a topic/module catalogue.
- Added six self-contained modules in `docs/game-rules/` covering math, round flow, stages, accounting, runtime/UI/errors, and market-analysis handoff. Each has a context packet, stable branch IDs, source-function references, and explicit edge cases.
- Added `docs/game-rules/rules.json` for machine-readable facts, module routing, and raw-source SHA-256 fingerprints at commit `39435f59cd107d714a2fb15a807700c57feff1cd`.
- Documented unpaid preview, nonpaying Scatter, stage-completion priority over refill, capped multiplier with uncapped chain length, observed-versus-expected RTP, reset/error semantics, and current feature gaps. No external market research or new balance/RTP claim is included.
- Updated agent instructions to read the compact rules/index and relevant history/modules instead of loading the entire change history. No gameplay, image, or UI code changed.
- Verification: all 12 existing math tests passed. Parsed JSON facts match runtime grid/bet/weights/paytable/threshold/multiplier constants and all nine state names. Checked six modules, all 91 documented case IDs, 29 local Markdown links, four source fingerprints, and `git diff --check`. The entry point is 699 whitespace-delimited words; detailed context is loaded by topic.

## 2026-10-25 — Mid and High tier color overlays

- Added a subtle light-red radial wash behind Mid symbols and a light-gold wash behind High symbols, clipped to each reel opening. The artwork remains clear above the translucent tint.
- Apply matching tints to uncollected Mid/High collection-panel slots as a consistent tier cue. Low retains its dark backing and Scatter its purple styling. Winning cells and collected slots retain their stronger gold highlights/checkmarks.
- This is a canvas presentation change; symbol assets, probabilities, payouts, and game rules are unchanged.
- Verification: all 12 math tests, `npm run build`, and whitespace checks passed. Desktop and 440 × 956 browser previews confirmed distinct, subtle Mid/High colors and clear artwork, with no browser warnings/errors.

## 2026-10-25 — Scatter border and label

- Added a violet/silver gradient border, violet glow, and tinted cell backing specifically for Scatter cells.
- Draw a high-contrast `SCATTER` label above the full mansion sprite, reserving vertical space so the label does not obscure the house. Border and label appear with the existing growth animation and scale with the cell.
- These are canvas overlays; the original `scatter.png` is preserved. Draw weights, payouts, collection, and deferred Scatter feature rules are unchanged.
- Verification: all 12 math tests and `npm run build` passed. Desktop and 440 × 956 browser previews confirmed the border and readable label, including adjacent Scatter cells, with no browser warnings/errors.

## 2026-10-25 — Scatter integration and 5/6/7+ wins

- Added the mansion Scatter to initial deals, paid/free stages, and replacement draws. Load `scatter.png` with the other artwork and render the entire standalone sprite with the same growth/removal layout; never crop it into five frames.
- User confirmed a 5% Scatter weight with feature rules deferred. Regular weights scale proportionally to low 57%, mid 23.75%, high 14.25% (original 60:25:15 ratio within 95%). Regular tiers choose indexes 0–4 uniformly; Scatter uses index 0 and needs only one random draw.
- Scatter does not pay, join regular combinations, substitute for other symbols, collect, or trigger a bonus. It remains in place during ordinary refills and clears with the board on a new paid/free stage.
- Raised the regular-symbol threshold from 3 to 5 and moved the unchanged award amounts to counts 5 / 6 / 7+:

  | Tier | 5 symbols | 6 symbols | 7+ symbols |
  | --- | --- | --- | --- |
  | Low | 0.01 | 0.05 | 0.10 |
  | Mid | 0.05 | 0.10 | 0.25 |
  | High | 0.10 | 0.25 | 0.50 |

- Counts below five do not win or collect; counts above seven pay the seven-symbol group award once. Fibonacci multipliers, the 1.00 paid bet, collection-driven free stages, and integer-cent accounting continue to apply.
- Added tests for new weight boundaries/distribution, Scatter exclusion/preservation/refill behavior, 5/6/7+ payouts through 25 symbols, and chained refills at the new threshold.
- Verification: all 12 tests, `npm run build`, and whitespace checks passed. Desktop and 440 × 956 browser checks confirmed full mansion rendering. A double-click produced one paid spin: five matching Low symbols paid 0.01, four-match groups stayed in place, and Scatter survived the refill. The settled round/session win was 0.01 with 1.00% RTP for the single 1.00 wager. No browser warnings/errors were reported.

## 2026-10-25 — Five-by-five reels

- Edited the existing reel artwork with built-in imagegen to add a fifth row, preserving its bronze gothic frame, gargoyles, skulls, and red gems. Saved the new transparent 1164 × 1351 PNG as `src/assets/reels/main-5x5.png`; the original 5 × 4 `main.png` remains intact.
- Switched the canvas to the new frame and measured its 25 transparent apertures for symbol positioning. The original square image's coordinates no longer apply.
- Changed the board to 5 columns × 5 rows (25 cells), including generation, refills, clearing, animation delays, and accessible descriptions. Existing rule loops derive their size from the shared row/column constants.
- Updated regression tests to cover 25-cell generation (50 independent RNG calls), wins involving the fifth row, quantity payouts through 25, and 5 × 5 removal/refill and cascade fixtures.
- Saved the exact image-edit prompt in `src/assets/reels/main-5x5.prompt.md`.
- Verification: all 11 tests and `npm run build` passed. Visually counted 25 openings and confirmed alpha-zero pixels at all 25 opening centers. Browser checks covered desktop, 440 × 956 portrait, 844 × 390 landscape, fifth-row winning highlights, refills, and automatic free stages; no browser warnings/errors were reported.

## 2026-10-25 — Mansion scatter artwork

- Generated `src/assets/symbols/scatter.png` using the built-in image generation tool: a complete haunted mansion in a luminous amethyst-purple frame with silver gothic edging, visually distinct from the regular bronze-framed symbols.
- Preserved the transparent PNG as a standalone portrait icon. Saved the exact prompt and generation details in `src/assets/symbols/scatter.prompt.md`.
- Verification: visually inspected the generated mansion/frame; confirmed 971 × 1619 px, 32-bit RGBA, and transparent corner pixels. No runtime code changed.
- Artwork only: the scatter is not yet in the symbol pool, paytable, or collection system. Scatter frequency, payouts, and triggers await user instructions.

## 2026-10-25 — Quantity-based paytable

- Replaced per-symbol payment with one award per identical-symbol group, based on its total count anywhere on the board:

  | Tier | 3 symbols | 4 symbols | 5+ symbols |
  | --- | --- | --- | --- |
  | Low | 0.01 | 0.05 | 0.10 |
  | Mid | 0.05 | 0.10 | 0.25 |
  | High | 0.10 | 0.25 | 0.50 |

- The user specified entries through five; implementation assumption: 6–20 matches use the five-symbol award once, while all matches are removed and eligible for collection. No extra multiplication by the number of symbols or splitting into smaller paying groups.
- Continue to multiply the group award by the active Fibonacci multiplier. Keep payouts in integer cents and the paid bet at 1.00. Existing refills, collection, free stages, and session accounting consume the new awards.
- Added regression coverage for every tier and count from 2 through 20, at x1/x2/x144, plus simultaneous-group and multi-cascade payout totals.
- Verification: all 11 tests, `npm run build`, and `git diff --check` passed. This change affects pure payout math; canvas layout and animation are unchanged.
- This implements the requested table; long-run RTP has not been calibrated or simulated.

## 2026-10-25 — Winning sequences, collection, and free stages

- Find every group of 3+ identical tier/index symbols anywhere, including separated cells. Highlight all winning cells, shrink/remove them, refill only holes in place, and repeat evaluation until settled. Unmatched cells stay put; there is no gravity.
- Pay each removed symbol in integer cents: low 10, mid 50, high 100, multiplied by the active stage multiplier. The user explicitly confirmed payment per removed symbol. One paid round costs 100 cents. Awards accumulate across all refills and free stages in both round and session wins; RTP uses only paid wagers.
- Removed symbols matching the current background's index collect their tier. Highlight collected panel icons with a gold border/glow and checkmark. Preserve collection across refills; reset it whenever entering a different background.
- Completing low/mid/high collection displays “Switching to the next stage” at reel center, clears all reels, chooses another random background, and draws an automatic free respin. Free-stage multipliers are x2, x3, x5, x8, x13, x21, x34, x55, x89, x144; further completions remain at x144. A new paid round resets to x1.
- Added a glowing/pulsating multiplier badge at reel top right and stage popup. Reduced-motion mode uses static highlights/badge and brief symbol phases. Input is locked until the whole paid-round chain settles.
- Spins include paid deals and free respins, while refills add neither spins nor wagers. Preview board on page load is unpaid and does not resolve wins.
- Decode all five backgrounds at startup so free-stage transitions are immediate and cannot fail on a later room download.
- Added math tests for separated/global matches, simultaneous groups and multiplied payouts, removal/refill preservation, multi-cascade resolution, collection persistence/filtering, and the Fibonacci cap.
- Verification: all 10 tests and `npm run build` passed. Browser checks covered live cascades, highlighted collection, desktop/mobile/landscape layout, disabled input, and multiplier reset on a new paid round. A temporary deterministic browser fixture completed two stages: 4.80 at x1 plus 9.60 at x2, then settled at x3 with 3 spins, one 1.00 wager, 14.40 total win, and 1440.00% RTP. The fixture was removed after testing; no test controls ship with the game. No browser warnings/errors were reported.

## 2026-10-25 — Weighted reels and animated rounds

- Added pure math in `src/game.ts`: a 5-column × 4-row board with independent cell draws. First select the tier (low 60%, mid 25%, high 15%), then select index 0–4 uniformly within that tier. Individual icon probabilities are 12%, 5%, and 3% respectively; the active background does not restrict reel draws.
- Populate the opening board as a preview without counting a spin. Each tap/click, Enter, or Space then selects uniformly among the other four backgrounds, updates its collection, draws all 20 cells, and increments spins once.
- Cache decoded artwork on first visit. Prepare the background before replacing the scene; failed background loads leave the previous scene intact and allow retry without counting a spin.
- Added staggered growth from each cell center (340 ms per symbol, 65 ms column and 35 ms row delays). Symbols render beneath the reel frame, clipped to the artwork's 20 cell openings. Reduced-motion preference displays settled symbols immediately.
- Lock round input during loading and animation; return to ready after settling. Resize redraws the current result without rerolling. Added an accessible row-by-row result description.
- Added `npm test` using Node's native TypeScript support for tier boundaries, all icon indexes, complete independent board draws, and seeded distribution across all 15 symbols.
- Verification: all four math tests and `npm run build` passed. Browser checks covered the initial 20-cell preview, growth in progress, repeated rounds/background changes, click/keyboard controls, one spin per double-click, persistent results on resize, and desktop/portrait/landscape layouts. No browser warnings or errors were reported.
- Remaining: winning sequences, wager/payout rules, result-driven RTP/wins, and collection progress. Wins stay zero and RTP stays `—` until wager rules exist.

## 2026-10-25 — Background-specific collection symbols

- Added an explicit theme mapping, independent of file/glob ordering. Choose one theme randomly on page load and retain it through resizes and round requests.
- Load `src/assets/symbols/{low,mid,high}.png`. Each sheet contains five equal horizontal frames. Use `sheet.width / 5` for frame width (the current 2172 px sheets produce fractional widths); retain the full sheet height and preserve aspect ratio.
- Select one symbol per tier using the same index for the selected background:

  | Index | Background | Collection |
  | --- | --- | --- |
  | 0 | `basement.png` | `low[0]`, `mid[0]`, `high[0]` |
  | 1 | `hall.png` | `low[1]`, `mid[1]`, `high[1]` |
  | 2 | `museum.png` | `low[2]`, `mid[2]`, `high[2]` |
  | 3 | `guests.png` | `low[3]`, `mid[3]`, `high[3]` |
  | 4 | `attic.png` | `low[4]`, `mid[4]`, `high[4]` |

- Store each selected symbol's tier, index, sprite, and stable ID (`background:tier`, e.g. `basement:low`) for future collection logic.
- Draw the selected low / mid / high icons below the centered reels and above the message/statistics panels. Reserve space on resize and provide an accessible description of the selected collection.
- Use compact symbol slots and HUD spacing on screens shorter than 500 px so landscape layouts retain room for the reels.
- Added this history and a project-local `AGENTS.md` directing future agents to maintain it.
- Verification: `npm run build` passed. Browser reloads exercised all five background/index pairs; desktop, 390 × 844 portrait, and 844 × 390 landscape layouts were checked. Collection selection persisted through resize and round request, with no browser warnings or errors.
- Remaining: reel population, spinning, collection progress, wager and payout rules, and result-driven session counters.

## 2026-10-25 — Session statistics and status panels

- Added a bottom bar for spins, session RTP, cumulative session wins, and latest round win, plus a message panel above it.
- Show loading, ready, error, and round-requested states. A tap/click, Enter, or Space requests a round once ready.
- Counters start at zero. RTP is total wins / total wager × 100, displayed as `—` before any wager. Round requests do not fabricate spins or payouts.
- Verified with the production build and desktop, portrait, landscape, click, and keyboard browser checks.

## 2026-10-25 — Responsive canvas scene

- Replaced the welcome screen with a high-DPI canvas. Randomly select a supplied background on page load, center-crop it to fill the viewport, and retain it on resize.
- Draw `src/assets/reels/main.png` centered above the background and `src/assets/reels/title.png` at top center, preserving aspect ratios.
- Added asynchronous artwork loading and a visible error message. Bundle asset URLs through Vite.
- Verified the production build and desktop/mobile browser layouts, resizing, and background changes after reload.

## 2026-10-25 — Standalone scaffold

- Created an independent npm project with TypeScript 7, Vite, and http-server, strict browser TypeScript, and a minimal welcome page.
- Scripts: `npm run dev`, `npm run build`, `npm run preview`, and `npm run serve` (built `dist/` on port 1234).
- Verified `npm run build`.
