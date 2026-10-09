# Heart Attack — Current Agent Context

Snapshot: **2026-10-09**. Read [AGENTS.md](AGENTS.md) for working rules and
[README.md](README.md) for the full feature description. Source code is the
authority if this snapshot becomes stale.

## User intent and current status

The user built this demo incrementally and approved its appearance and mechanics.
Mobile presentation is the priority; desktop should use most of the available
screen with larger symbols and the original right-side love meter visible.
Mid/High were made much rarer. Random Wilds were previously removed; the user now
requests their return to initial reel generation, up to three per whole strip.
The Wild spin weight is 2.5%, taken from Low. The latest request raises both Mid
and High by five percentage points: Mid 6% → 11%, High 1.5% → 6.5% for both
strips and refills. Low supplies the extra ten points (77.5% strips, 80% refills).
Wild/Scatter weights and special-symbol caps are unchanged.
This supersedes the earlier heart-only Wild rule. The user said RTP is off
but **does not matter for the demo**. The latest feature activates the right love
meter: one charge per winning board and an arrow clear after cascades/hearts.
For reset timing, the user's latest clarification was **"reset after every
player action"**; this supersedes their earlier suggestion to carry charge
between spins. Implemented as reset at the start of each player spin. The user
now requests repeated arrow bursts when refills create wins and clarified:
**"Keep charge; new wins allow another burst"**. This supersedes the one-burst
guard. Complete each win/cascade/heart sequence before firing again, and stop
when an arrow refill produces no win. Charge alone never restarts the feature.
There is no target RTP.

Heart rule: **only Mid and High wins charge the bottom hearts**. Use the
longest qualifying 3–5 consecutive reel match across a cascade sequence. Low and
standalone Wild wins earn no heart Wilds, while retaining their existing payout,
clearing and love-meter behavior. Wild substitution in Mid/High ways qualifies.
Heart awards still convert any eligible regular cell; only the charge source changed.

Scatters have **at most one per entire generated reel strip**
(zero is allowed), and at most one per visible column during cascade/arrow
refills. Once a Scatter is present, draw only regular symbols with their weights
renormalized. Surviving Scatters and newly drawn ones both consume that column's
allowance. Normal play therefore has at most five visible Scatters.

Scatters were also removed from winning combinations. They
remain on the reels as next-phase trigger symbols. The existing three-or-more
threshold is kept as `Result.scatterTrigger`, separate from ways wins; next-phase
gameplay has not been defined. Scatters no longer clear, pay, highlight as wins,
or charge hearts/the love meter.

At this snapshot, `git status --short` showed `?? hattack/`: the entire new
prototype had not been committed. This handoff is documentation, not a Git
checkpoint. Recheck status rather than assuming that remains true. The project
has its own `.gitignore` excluding `node_modules/` and `dist/`.

## Runtime and source map

- npm, `typescript ^7.0.2`, `vite ^8.3.4`, `http-server ^14.1.1`.
- Strict TypeScript, ES2022/DOM, ES modules, bundler resolution, no compiler emit.
- `src/game.ts`: pure rules, symbol identities, RNG, payouts and transformations.
- `src/main.ts`: injected UI, asset loading, canvas renderer, state machine,
  keyboard/pointer input and in-memory session counters.
- `src/style.css`: portrait/landscape sizing, stats bar, footer, rules dialog.
- `tests/game.test.mjs`: Node 24 test runner, seeded/injected RNG, direct TS import.
- `index.html`: Vite entry. `package-lock.json`: npm dependency lock.

## Current game rules

The board has **five reels and four rows** (1,024 ways). Its representation is
`grid[reel][row]`, with row 0 at the top. Each spin generates five independent
strips, uniformly sized 30–110, and uniformly selected stops. Visible rows wrap
around the strip, so a last-index stop shows `[last, first, second, third]`.
The opening screen is conditioned on no ways win and no Scatter trigger; ordinary
player spins are unrestricted. Opening generation has a bounded fallback.

### Draw weights and symbols

| Category | Reel draw chance | Cascade refill chance | Frames |
| --- | --- | --- | --- |
| Low | 77.5% | 80% | 6 equally likely |
| Mid | 11% | 11% | 6 equally likely |
| High | 6.5% | 6.5% | 6 equally likely |
| Scatter | 2.5% | 2.5% | 1 |
| Wild | 2.5% | 0% | 1; also awarded by hearts |

`REEL_CATEGORY_WEIGHTS` applies to generated strips: zero to three Wilds and
zero to one Scatter per entire strip. `MAX_REEL_WILDS=3`. After either cap,
exclude that category and renormalize remaining weights. `CATEGORY_WEIGHTS`
continues to apply to cascade/arrow refills: no new Wilds, at most one Scatter
per column including survivors. Sampling directly avoids rejection loops.
Existing Wilds can survive gravity. Heart awards can add Wilds beyond the initial
strip cap, following their existing rules.

Ways start at the left and require the same symbol on 3–5 consecutive reels,
in any row. Counts multiply across matching positions. Only the longest run
per symbol pays, not its shorter prefixes. Wild substitutes for regular symbols;
pure-Wild combinations count once under Wild. Scatters do not substitute.
Three or more Scatters anywhere set `scatterTrigger`, reserved for the next phase.
`scatterCount` and `scatterCells` retain the current board's data. This signal is
not a win, and the next phase is not implemented yet.

### Cascades and hearts

1. Evaluate the stopped board, credit its payout once, and highlight wins.
2. Remove all ways-winning cells, including shared Wilds only once. Never remove
   Scatters. Survivors fall within their own column, preserving relative order.
   Weighted new symbols fill only the vacant top cells.
3. Evaluate again and continue natural cascades until there is no win.
4. Throughout this cascade sequence, retain the maximum Mid/High winning reel
   length: 3, 4 or 5 lights that many hearts. Low, standalone Wild and Scatter
   results earn no hearts. Wild substitution in Mid/High ways qualifies. A later
   Low win does not erase an already earned award or increase it.
5. If charged, each heart converts a distinct random regular cell to Wild.
   Existing Wilds and Scatters are preserved; multiple placements can share a reel.
   At most five are added, limited by eligible cells. Animate flight from hearts.
6. Consume the award, then evaluate the modified board. New wins begin another
   cascade sequence; only new Mid/High wins earn a fresh heart award. A losing release proceeds to the
   pending love-meter burst, if charged. Otherwise the round ends.

### Love meter and arrows

- Every ways-winning board (including unpaid pure Wild wins)
  adds one cell, capped at ten. Multiple wins on one board add only one cell.
- Fill bottom to top. Reset at the start of a new player spin. Leave charge
  visible at round end; it is not persistent across spins or reloads.
- Every fresh win sets `arrowsPending`. After natural cascades and heart-Wild
  cycles settle, a no-win board with no charged hearts triggers `selectLoveArrows`
  if charge is positive and pending. Consume pending before evaluating the refill;
  retain charge. A zero-target burst ends safely with no removal animation.
- Levels 1–5 choose 1–3 arrows, 6–8 choose 3–5, 9 chooses 5–10 (uniform inclusive
  count); 10 targets all regular cells. The fifth cell was in overlapping ranges
  in the request and is assigned to the first tier.
- Select distinct regular cells, limited by availability. Never target Wild or
  Scatter. Animate flight from the current meter plaque, then removal, gravity
  and weighted top refill. Full charge can clear up to all 20 regular symbols.
- `createCascade` delegates to `createRemovalCascade`, which also handles arrows.
  Arrow removal is not a paid win. Evaluate only after refill: new wins pay,
  cascade and trigger hearts normally. They further light the meter and enable
  another burst after resolving those wins/hearts. Without a fresh win, a losing
  refill ends the round even at 10/10. `nextBoardAction` enforces win → hearts →
  pending arrows → idle priority. Burst counts and cleared targets accumulate.

There is no fixed limit on winning cascades, heart cycles or earned arrow bursts.
Long rounds are possible with these weights/feature rules.

### Payouts and statistics

Fixed bet: **1.00 prototype credits**. Multiply each amount below by its winning
ways; accumulate all cascade and heart-Wild wins for the same round.

| Category | 3 reels | 4 reels | 5 reels |
| --- | --- | --- | --- |
| Low | 0.05 | 0.10 | 0.25 |
| Mid | 0.25 | 0.50 | 0.75 |
| High | 0.75 | 1.00 | 2.00 |

`BET_CENTS` and `PAYOUT_CENTS` store integer cents. Wild-substituted ways use the
regular symbol's payout. Standalone Wild ways pay zero because their amounts
were never specified; they still clear and charge the love meter, but earn no hearts.
Scatters are unpaid trigger symbols and never participate in win clearing or
feature charging, even with three or more on the board.

The bottom bar displays bet, started rounds, session total win, current/most
recent round win, and observed session RTP as a percentage:
`total win / (rounds × 1.00) × 100`. It shows 0.00% before any round. Statistics
update as results appear, so a running round is included. Starting the next spin
resets only the round win. Reload resets everything. There is no balance,
bankroll, cash transaction, stake deduction or persistent storage.
Observed session RTP is not a calibrated theoretical RTP and may exceed 100%.

## State machine and rendering details

`Phase` is `idle | spinning | celebrating | removing | falling | adding-wilds |
firing-arrows`.
`spin()` generates strips and resets round counters; `tick()` moves animations
between phases; `checkBoard()` evaluates/credits once and selects the next phase.
After cascades, `board` is the authoritative displayed grid rather than the old
reel stops. The next spin starts its outgoing animation from that final board.

Normal timings: celebrate 900ms, remove 330ms, fall 650ms, heart release 1,050ms,
arrow flight 1,200ms (180ms reduced motion).
Reduced motion uses short waits/direct reveals. `requestDraw()` schedules frames
only while animation/feedback needs them. Do not start a second animation loop.

`setPhase()` exposes `data-phase`, `data-spinning`, `data-hearts`,
`data-wilds-added`, `data-round`, `data-love-meter`, `data-arrow-targets`,
`data-arrows-fired`, `data-arrows-pending`, `data-arrow-bursts`,
`data-arrow-targets-cleared`, and `data-removal-source` on `#game` for inspection.
`data-arrows-fired` now means at least one burst this round, not an eligibility guard.
`data-arrow-targets` is the latest burst; targets-cleared is the cumulative actual
removal count. Spin resets charge, pending, burst/target totals. Busy phases set
`aria-disabled`; the actual input guard checks `phase === 'idle'`. Announcements
use `#game-status`; the paytable and rules live in the How to play dialog.
`data-scatter-count` and `data-scatter-trigger` expose the latest evaluated board
for next-phase integration; they reset to 0/false during a new spin. They never
drive the current win/cascade/heart/arrow phase transitions. Integrate a future
phase from the settled board rather than firing it repeatedly during cascades.

Background: `src/assets/background/main.png`, 941 × 1672. The user originally
typed `main,png`; the actual file uses a dot. Grid coordinates in portrait art:
`x=41, y=594, pitchX=150, pitchY=159, cell=138 × 148`.
`low.png`, `mid.png`, `high.png` each have six horizontal frames (2172 × 724);
`bonus.png` has Wild left / Scatter right (1774 × 887). Equal-width splitting
comes before alpha-margin trimming and proportional cell fitting.

Landscape activates at width >= 760px and aspect ratio >= 1. It uses a 1600 × 900
scene, separate title/board/meter crops, and the same grid transform for symbols
and frames. Portrait retains the full art. Canvas pixel ratio is capped at 3.
The right love meter overlays ten artwork plaque bounds, projected via
`meterPoint` with the same crop/scale used by the desktop meter. Uncharged cells
are dimmed, charged cells glow, and a counter shows 0–10/10. Arrows use the same
projection for their origin and the scene grid for their targets. The five
bottom hearts are rendered dynamically. Statistics are responsive DOM
below the canvas; CSS reserves their height so the page fits the viewport.

## Last verified baseline

- `npm test`: **48 passing tests**, including capped Wild strips, zero/three cases,
  special caps together, circular stops, spin distribution and opening fallback.
  Also covers repeated arrow bursts with retained
  charge, win/heart priority and losing/Scatter-trigger termination, plus Mid/High-only heart charging for all
  frames and 3–5 reel lengths, mixed longer Low wins, Wild substitution, and
  Low/standalone Wild clearing without heart awards. Also covers the one-Scatter limit across full strips,
  every wrapped stop and repeated win/arrow refills, plus regular-weight
  renormalization and constant-RNG termination. Also covers trigger-only detection, survival
  through mixed winning cascades, no payout and no feature charging, alongside
  arrow tiers, protected targets, full clears and paid wins from arrow refills.
- `npm run build`: strict type check and Vite build passed.
- Latest Mid/High reweighting check: all 48 tests pass with the updated draw
  ranges, seeded category/frame distribution and unchanged special caps. Mobile
  390 × 844 round returned to idle after two removal/refill cycles and an arrow
  burst, paying 0.50 credits; no console errors.
- Latest generated-Wild preview: mobile 390 × 844 round returned to idle after
  two removal/refill cycles and one arrow burst, paying 0.90 credits. Wild/Scatter
  rule cards checked at desktop 1440 × 900; no console errors. Full-strip Wild
  limits and generation probabilities are verified by deterministic/seeded tests.
- Latest arrow-chain preview: three mobile winning rounds returned to idle with
  retained charges of 2/10, 3/10 and 1/10 and pending false after losing arrow
  refills. A desktop losing spin reset charge/burst totals and fired no arrows.
  Updated repeat-burst help text checked; no console errors. The deterministic
  rules test verifies two bursts in one chain, retained charge and final termination;
  these random browser rounds each produced one burst.
- Latest Mid/High-heart preview: a mobile 390 × 844 winning round paid 0.50,
  completed two removal/refill cycles (including a three-target arrow burst),
  and returned to idle with zero heart Wilds added. Updated help text checked at
  mobile and desktop 1440 × 900 sizes; no console errors. Qualifying Mid/High
  awards are verified deterministically for every frame and 3–5 reel lengths.
- Latest one-Scatter preview: a mobile 390 × 844 spin returned to idle normally;
  updated rules were checked at mobile and desktop 1440 × 900 sizes. No console
  errors. Per-strip and refill limits are verified deterministically by tests.
- Historical single-burst baseline: mobile 390 × 844 and desktop 1440 × 900 were checked for love-meter overlay
  alignment and arrow flights. A desktop 1/10 burst fired two arrows and ended
  idle; a mobile 1/10 burst fired one arrow and produced new paid wins/cascades.
  That mobile round finished at 10/10 with the original one-target burst still
  recorded, confirming no second arrow burst after post-arrow wins.
  Starting the next spin reset both charge and the per-round arrow guard.
- Browser checks covered input locking, cascades, heart release/recharge,
  statistics, love-meter charging to ten, arrows/refills, and no console errors.
- Historical Scatter check before the one-per-reel limit at 390 × 844:
  a round completed 29 cascades, heart Wild
  cycles and one full-meter arrow clear, then returned to idle with six Scatters
  preserved (`scatterCount=6`, `scatterTrigger=true`). Scatters were absent from
  win reporting and did not keep the cascade loop running; no console errors.
- Historical check before the meter feature: a seeded 100-round rules simulation
  after reweighting completed every round;
  it averaged 23.56 cascades and had a maximum of 178. This is a termination
  smoke check, not an RTP calibration or a guarantee for all random outcomes.
- Previews use a temporary local static server on port 1234. Do not assume a
  server remains available or that an occupied port belongs to this task.

Wild generation up to three per reel, repeated earned arrow bursts, Mid/High-only heart charging, Scatter separation
and the one-per-reel limit are implemented. The next phase is reserved
for a future user-defined feature. Follow [AGENTS.md](AGENTS.md) for subsequent
changes, then update this context.
