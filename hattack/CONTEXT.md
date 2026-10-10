# Heart Attack — Current Agent Context

Snapshot: **2026-10-10**. Read [AGENTS.md](AGENTS.md) for working rules and
[README.md](README.md) for user-facing rules. Source is authoritative if this
handoff becomes stale.

## Current status and accepted decisions

The base game and the free-spin bonus are implemented. Mobile is the priority;
desktop uses a larger landscape composition. The user explicitly approved
reusing the bonus background's existing row artwork for the fifth row, retaining
**25 cells** even though the original image has only four rows.

Base-game RTP is uncalibrated and accepted for this demo. The user now permits
weight balancing and has raised High/Scatter relative weights plus love-arrow
tiers. This update preserves their tuning, syncing its tests and documentation.
Do not reduce payouts or cap feature chains without a request. Earlier decisions remain:
Mid/High weights were increased by five percentage points; generated strips
allow up to three Wilds and one Scatter each; only Mid/High wins award heart
Wilds; love charge resets at each player spin and is retained between earned
bursts. The user's repeat-burst clarification is **"Keep charge; new wins allow
another burst"**. A losing arrow refill cannot restart arrows from charge alone.

Bonus implementation choices communicated to the user:
- Trigger once from the final settled base board, after cascades, heart awards
  and earned love-meter bursts finish.
- The arrow weights listed as out of 60 sum to 55. Normalize the five positive
  outcomes over 55, with no zero-arrow outcome.
- Multipliers accumulate additively: start at ×1, add each collected ×2/×3 face
  value, then multiply all collected coins by this final feature multiplier.
  These two defaults were presented in optional questions; no contrary answer
  had arrived at verification time. They are also stated in the in-game rules.

At this handoff the existing prototype is tracked. Bonus source/tests and the
supplied bonus background, arrow and heart assets are newly untracked; existing
main/style/config/documentation files have changes. No commit was requested or
created for this feature. Recheck Git status before a checkpoint and preserve
user changes. The project ignores `node_modules/` and `dist/`.

## Runtime and source map

Independent npm project; Node.js 24; TypeScript ^7.0.2; Vite ^8.3.4;
http-server ^14.1.1. Run commands from this directory. Use `npm ci` for a fresh
checkout, `npm run dev` for Vite, `npm test`, `npm run build`, then
`npm run serve` for the last built dist on port 1234.
Strict ES2022/DOM, bundler resolution, noEmit and allowImportingTsExtensions.
The explicit `./game.ts` import in bonus.ts supports Node's native TS test runner.

| File | Responsibility |
| --- | --- |
| `src/game.ts` | Pure base rules, injectable RNG, payouts and transformations |
| `src/bonus.ts` | Pure bonus awards, weighted draws, collections, held hearts, payout |
| `src/main.ts` | UI, asset loading, canvas, both state machines, input, statistics |
| `src/style.css` | Responsive canvas/stats and rules/feature dialogs |
| `GAME_RULES_AND_PAYTABLE.md` | Standalone player rules, paytable and promo-image brief; keep synchronized with gameplay |
| `tests/game.test.mjs` | 48 deterministic/seeded base tests |
| `tests/bonus.test.mjs` | 13 bonus tests, including 50 complete seeded features |

## Base rules

Five reels × four rows, `grid[reel][row]`; 1,024 ways. Each player spin generates
five independent circular strips, uniformly sized 30–110 and uniformly stopped.
Boundary stops wrap from the end to the beginning. Opening reels are conditioned
on no ways win and fewer than three Scatters, with a bounded fallback.

| Category | Strip weight | Refill weight | Frames |
| --- | --- | --- | --- |
| Low | 72.43% | 74.77% | 6 equally likely |
| Mid | 10.28% | 10.28% | 6 equally likely |
| High | 8.88% | 8.88% | 6 equally likely |
| Wild | 2.34% | 0% | 1 |
| Scatter | 6.07% | 6.07% | 1 |

These are normalized probabilities before caps. Relative weights total 107:
strips 77.5/11/9.5/2.5/6.5; refills 80/11/9.5/0/6.5 (Low/Mid/High/Wild/Scatter).
`REEL_CATEGORY_WEIGHTS` caps each whole strip at three Wilds and one Scatter;
renormalize eligible categories when a cap is reached. `CATEGORY_WEIGHTS`
refills generate no Wilds and allow at most one Scatter per visible column,
counting survivors and incoming cells. Heart awards can exceed the strip Wild cap.

Ways match regular symbols on 3–5 consecutive reels from the left, in any row.
Multiply matching counts across reels; pay only the longest run per symbol.
Wild substitutes; standalone Wild ways count once and pay zero. Scatters never
substitute, win, clear or charge either feature. They survive gravity and arrows.

Credit each board once in integer cents, then remove winning cells (shared cells
once), preserve survivor order and refill only the top gaps. Continue until no
wins. Charge hearts by the longest Mid/High winning reel count in the cascade
sequence; Low or standalone Wild wins earn none. After natural cascades finish,
convert that many distinct random regular cells to Wild, consume the award, and
reevaluate. Multiple placements may share a reel.

Every ways-winning board adds one love cell, capped at ten, and sets
`arrowsPending`. Resolve wins → heart awards → pending arrows → settled board.
Consume pending before a burst, retain charge, and allow fresh post-arrow wins
to earn another burst. Charge alone cannot fire. Tiers: 1–5 cells remove 1–3
regular symbols, 6–8 remove 3–8, 9 remove 8–15; 10 clears all regular cells.
Targets are distinct, limited by availability, and protect Wild/Scatter.
Arrow clears do not pay; only subsequent evaluated wins do. No chain cap exists.

Bet is 1.00. Per-way payouts for 3/4/5 reels: Low 0.05/0.10/0.25,
Mid 0.25/0.50/0.75, High 0.75/1.00/2.00. Stats are paid rounds, total win,
current/last round win and observed RTP = total win / (rounds × bet), as percent.
Only paid spins increment rounds. Everything is in memory and resets on reload;
there is no balance, stake deduction, persistence or cash transaction.

## Bonus rules and orchestration

`finishBaseRound` opens the entry dialog if the settled board has 3/4/5
Scatters, awarding 10/15/20 free spins. `bonusTriggered` guards the paid round.
Continue switches renderers and stats. The original board, strips, stops, meter,
hearts and base feature counters are retained throughout the feature.

The bonus has a separate row-major `grid[row][column]`, 5 × 5. Each free spin
deducts one remaining spin, increments its own current counter, and draws 25
independent symbols: Empty 35%, Coin 25%, ×2 20%, ×3 10%, Heart 7%, Scatter 3%.
Saved hearts collect first; then the three-number selector picks 1–5 arrows with
relative weights 20:15:12:5:3. Sample uniformly from remaining rows 0–4;
each row can be shot at most once per free spin. Arrows cross left to right, collecting crossed cells once.
Unhit symbols contribute nothing; overlaps see already empty cells.
After the number selector settles, a compact arrow-sprite badge above the grid's
top-left corner shows remaining shots. It derives from total minus completed
shots, updates after each row flight, persists through intervening heart sweeps,
and disappears at zero. Filling and the number roll do not show it.

Coins accumulate across spins, each worth the bet. ×2/×3 add 2/3 to a feature
multiplier starting at 1. Collected Scatters immediately add one remaining spin,
including on the last scheduled spin. Hearts pulse, rise above their column,
then descend and collect remaining symbols vertically. Hearts collected by
another heart queue further sweeps. An empty column parks its heart for the
beginning of the next spin, before arrows; if still empty, keep it waiting.
`parkedBonusHearts` combines waiting hearts with queued carried hearts (row -1),
so markers remain visible during filling and while earlier hearts sweep. An
active rising heart replaces its own parked marker to avoid drawing it twice.
Multiple held hearts per column are supported. They do not grant spins and
expire when no spins remain.

`nextBonusWork` prioritizes queued hearts, arrow selector, next arrow, spin end.
`collectAlongBonusLine` updates the pure state at each crossing and adds symbol
flights to counters. Final payout is `coins × BET_CENTS × multiplier`;
`bonusPaid` credits it once to the original round and session. The results
dialog requires Continue, which restores base rendering/stats/input and the
same settled board. There is no immediate retrigger from those old Scatters.

Phase adds `bonus-ready | bonus | bonus-complete` to base phases
`idle | spinning | celebrating | removing | falling | adding-wilds | firing-arrows`.
Bonus steps: filling, arrow-roll, row-aim, row-shot, heart-rise, heart-fall,
collecting, spin-end. A single requestAnimationFrame loop drives both games.
Reduced motion shortens steps and reveals directly. Busy input is locked;
Continue dialogs prevent Escape dismissal. Canvas labels and live status report
feature progress and stats.

## Rendering, inspection and development preview

Base background `main.png`: 941 × 1672. Portrait grid:
x41/y594, pitch150 × 159, cell138 × 148. Six-frame Low/Mid/High sheets are
2172 × 724; base Wild/Scatter sheet `symbols/bonus.png` is 1774 × 887.
Split frames before trimming alpha margins. Desktop breakpoint: width >=760
and aspect >=1; 1600 × 900 scene with separate title/board/love-meter crops.
Keep projected meter plaques, symbol cells, hearts and flights aligned.

Bonus background `background/bonus.png` is also 941 × 1672. `bonusGeometry`
defines portrait and landscape transforms. `drawBonus` reuses row bands from
the source art (including one repeated interior row), drawing no new cell frames.
Symbols are canvas badges/coins plus trimmed heart/Scatter sprites.
`symbols/arrow.png` is one transparent 2172 × 724 arrow.
`symbols/heart.png` has three frames; only the first whole-heart frame is used.
Both base/bonus stats are responsive DOM below the canvas, switched with hidden.

`#game` exposes base phase, round, Scatter count/trigger, hearts, Wild awards,
love charge and arrow counters via data attributes. `data-base-board` serializes
base symbol IDs for restoration checks. Bonus data: bonus-step, bonus-spin,
bonus-remaining, bonus-coins, bonus-multiplier, bonus-waiting-hearts,
bonus-arrow-count, bonus-arrow-rows, bonus-arrows-fired, bonus-arrows-left,
bonus-parked-hearts. These are inspection values, not controls.

Vite-only preview: open `/?bonus-preview=1`, How to play → Preview 3-Scatter
bonus. It replaces other visible Scatters and inserts exactly three at the bottom
of the first three columns, then opens the award dialog. If the session has no
paid rounds, it supplies one fixture round. `/?bonus-preview=fast` also shortens
bonus steps to 100ms. Preview carried hearts supplies waiting columns [0,2,2]
for visibility checks through filling/queued sweeps. No preview controls exist
in production.
Use this fixture to check layout/return without changing real spin probabilities.

## Verification baseline

- **61 tests pass**: 48 base and 13 bonus. Bonus coverage includes exact weighted
  ranges and large seeded samples; 3/4/5 awards; unique rows and equal per-shot row probabilities;
  single collection/overlaps; integer additive payouts; empty-column waiting;
  stacked waiting hearts and visible queued carries; chained sweeps; last-spin Scatter extensions; 50
  complete seeded bonuses. Base fixtures/distribution expectations now match the user-tuned weights and
  larger arrow tiers; all pass.
- Strict TypeScript and Vite production build pass.
- Remaining-arrow badge checked on mobile 390 × 844 and desktop 1440 × 900.
  A two-arrow spin showed 2 → 1 after the first completed shot; the badge was
  absent at zero after both shots. No browser warnings or errors were recorded.
- Latest bonus tweaks: mobile 390 × 844 and desktop 1440 × 900 carried-heart
  fixtures visibly retain markers during filling and queued sweeps, including
  stacked hearts. Unique-arrow selection is verified for all counts and constant
  random draws, plus 50,000 full selections checking equal row probabilities.
  An accelerated carried-heart bonus completed 17 spins; inspected arrow rows
  were unique and Continue restored the exact base board with one paid round.
  No browser warnings or errors were recorded.
- Browser: mobile 390 × 844 and desktop 1440 × 900 bonus grids, selector, arrows,
  dialogs and counters checked; statistics fit after correcting CSS order.
  Resizing an active bonus retained play. Complete accelerated feature verified
  extra-spin awards, one paid-round count, exact preserved base board on Continue
  and no duplicate credit. No browser warning/error logs.
- Tests verify 4/5-Scatter awards and held-heart edge cases; browser preview
  exercises a three-Scatter fixture (an earlier four-Scatter fixture also finished).
- Base browser checks from previous work covered cascades, Wild releases,
  love-meter charging/arrow refills, locked input and stats at both sizes.
  RTP is intentionally not calibrated.
- Stop only preview servers/tabs started for this work. Do not assume a server
  remains running or that an occupied port belongs to this task.
