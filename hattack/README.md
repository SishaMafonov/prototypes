# Heart Attack

A standalone canvas slot prototype using the supplied artwork. Five reels × four
rows provide 1,024 ways. Tap/click anywhere on the artwork to spin, or focus the
canvas and press Space/Enter. Consecutive reels stop from left to right.

Agents: read [AGENTS.md](AGENTS.md) for working rules and [CONTEXT.md](CONTEXT.md)
for the current implementation, accepted decisions and verification baseline.
For a shareable player guide, full paytable and promo-image brief, use
[GAME_RULES_AND_PAYTABLE.md](GAME_RULES_AND_PAYTABLE.md).

## Run

```sh
npm install
npm run dev
npm test
npm run build
npm run serve
```

`serve` hosts the built `dist/` on port 1234. Tests use Node.js 24's native
TypeScript support. No additional test dependencies are needed.

## Artwork and symbol map

The background is `src/assets/background/main.png` (941 × 1672). The grid mapping
in `src/main.ts` uses artwork coordinates, so resizing scales the background,
symbols, highlights and tap feedback together. Canvas resolution follows device
pixel density. Portrait windows retain the full original artwork. Wide windows
(at least 760px wide and wider than tall) use a 16:9 composition that fills most
of the viewport: title artwork and status on the left, an enlarged reel board and
the original love meter on the right. The board frame and its symbols use the same scale and offset.
Resizing or rotating during a spin keeps the current reels and animation progress.

Each sheet is sliced horizontally into equal-width frames. Transparent margins
are trimmed before the symbol is fitted inside its cell, preserving proportions.

| Sheet | Dimensions | Frames, left to right | Reel draw weight | Cascade refill weight |
| --- | --- | --- | --- | --- |
| `low.png` | 2172 × 724 | `low-0` … `low-5` | 72.43% | 74.77% |
| `mid.png` | 2172 × 724 | `mid-0` … `mid-5` | 10.28% | 10.28% |
| `high.png` | 2172 × 724 | `high-0` … `high-5` | 8.88% | 8.88% |
| `bonus.png` | 1774 × 887 | Wild, Scatter | Wild 2.34%; Scatter 6.07% | Wild 0%; Scatter 6.07% |

Regular frames are selected equally within their category. The map and weights
are in `src/game.ts`; symbol identities combine the filename and frame index.
The user-tuned relative weights total 107: strips use 77.5/11/9.5/2.5/6.5
for Low/Mid/High/Wild/Scatter; refills use 80/11/9.5/0/6.5. The table shows
normalized draw probabilities before caps, rather than guaranteed strip counts.
Each strip contains at most one Scatter (zero is allowed). The 6.07% Scatter
chance applies until its first appearance. Each generated strip also contains
zero to three Wilds, drawn with a base 2.34% chance. Once either cap is reached,
exclude that special symbol and renormalize the remaining eligible weights.
Wilds are excluded from cascade/arrow refills; existing Wilds can survive gravity.
The bottom hearts can add further Wilds beyond the initial strip cap.
Mid and High symbols are much rarer
than Low; all six frames within each regular category still have equal chances.

## Reels and wins

Every spin creates five independent strips. Each length is selected uniformly
from 30 through 110 inclusive, then each symbol is drawn using the category
weights. A uniform stop from 0 through `length - 1` selects the top visible symbol.
The one-Scatter and three-Wild limits apply to the entire strip, including across its boundary.
The next three strip entries fill the remaining rows. Strips are circular: a stop
at the last entry displays `[last, first, second, third]`.

The opening screen is randomly generated and rejected if it contains a ways win
or a next-phase Scatter trigger (three or more Scatters). This
conditioning applies only to initialization. Player spins keep every generated
outcome, including wins.

The ways mechanic follows the [supplied explanation](https://www.rosecasino.com/blog/ways-vs-lines-slots/):
matching symbols occupy any row on consecutive reels starting from the left.
This prototype uses a minimum of three reels. Matching counts multiply across
the longest consecutive run for each symbol; the same run is not awarded again
for its shorter prefixes. Wild substitutes for regular symbols, and pure Wild
combinations are counted once under Wild. Scatters never form winning
combinations. Three or more anywhere set a separate `scatterTrigger` signal.
After the base round's cascades, heart awards and earned arrow bursts settle,
3/4/5 Scatters award 10/15/20 free spins. The signal itself does not start a
cascade, pay, or charge hearts/the love meter.

Results show winning-way counts and highlight only matching ways cells. Scatters
have no win highlight. The bet is fixed at 1.00 prototype credits; there are no cash bets.

Each regular-symbol way pays once for its longest consecutive match:

| Category | 3 reels | 4 reels | 5 reels |
| --- | --- | --- | --- |
| Low | 0.05 | 0.10 | 0.25 |
| Mid | 0.25 | 0.50 | 0.75 |
| High | 0.75 | 1.00 | 2.00 |

Multiply the amount by the matching ways. Wild substitutes use the matched
symbol's rate; standalone Wild ways pay zero because their paytable has not been
specified. Scatters are unpaid trigger symbols. Payouts accumulate in integer cents across every cascade
and heart-Wild cycle. The rules dialog shows the paytable.

The responsive bottom statistics bar shows the fixed bet, number of started
rounds, session total win, current/most recent round win, and session RTP.
RTP = total win / (rounds × 1.00), displayed as a percentage, with 0.00% before
the first round. Values update when each result is evaluated, rather than on
animation frames; cascades and Wild releases never add rounds. A new spin resets
only the round win. Reloading resets the entire session.

Winning boards cascade automatically. After a short highlight, all winning cells
clear together, including shared Wilds only once. Scatters are never winning cells.
Surviving symbols drop into the lowest available positions in their own column,
keeping their relative order. Only the vacant top positions receive new symbols,
using the cascade refill weights above. All Scatters survive and fall with
their column, regardless of their count.
Refills respect the same one-Scatter-per-column limit: a surviving Scatter blocks
new ones, and an empty column can receive at most one across all incoming cells.
The refilled board is checked again and repeats this sequence until no wins remain.
The longest Mid or High winning match in that cascade sequence charges 3, 4 or 5
bottom hearts, matching its consecutive reel count. Low and standalone Wild wins
pay/cascade as before but do not charge hearts. Wild substitution in a Mid or
High winning way still qualifies; a longer Low win cannot increase its award.
After the sequence finishes, each lit heart converts one randomly chosen regular
symbol into a Wild. Positions are distinct, may share a reel, and preserve existing
Wilds and Scatters. The hearts animate their Wilds onto the board, then the award
is consumed before the next win check. New wins start another cascade sequence;
only Mid or High wins charge a fresh heart award. A losing release proceeds to the love-meter
feature, if available. The next spin starts with unlit hearts. Scatters do not
charge hearts.
Winning ways accumulate for the entire round. The next spin
animates from the final cascade board into a newly generated set of reel strips.

The right love meter lights from the bottom up, charging one cell per board with
winning ways (including pure Wild wins), to a maximum of ten. Multiple winning ways on
the same board still add only one cell. It resets when the player starts a new
spin, following the user's latest instruction to reset for each player action.

After the round's natural cascades and heart-Wild cycles finish, the meter fires
an arrow burst. Arrow counts are uniform within these inclusive ranges:

| Charged cells | Regular symbols removed |
| --- | --- |
| 1–5 | 1–3 |
| 6–8 | 3–8 |
| 9 | 8–15 |
| 10 | Every regular symbol |

The original request overlapped at five cells; five belongs to the first tier.
Targets are distinct random regular cells, limited by availability. Arrows never
target Wilds or Scatters. Flight is followed by the same removal, gravity and
weighted refill animation used by winning cascades. The arrow clear itself has
no payout; refill wins pay and trigger normal cascades and heart Wilds. Those
wins continue lighting the meter and earn another arrow burst after their
cascades and Mid/High heart awards finish. Charge is retained between bursts.
Each burst consumes its firing opportunity; only fresh wins enable another.
Repeat until an arrow refill produces no win. A charged losing refill does not
fire again automatically. Charge remains visible until the next spin resets it.
A losing round with no charge fires no arrows. The round ends when no winning
board, heart award or pending arrow burst remains.

The animation traverses the generated strips and lands on the predetermined
stops. Input is ignored through the spin, cascades, heart Wild releases and arrow
bursts. Reduced-motion settings replace scrolling, falling, flying Wilds and
arrows with short waits and direct reveals.

## Free-spin bonus

The entry dialog announces the award; **Continue** starts automatic free spins.
The bonus uses `src/assets/background/bonus.png`, with its existing row artwork
reused for a fifth row, as requested. Mobile retains the portrait title and art;
desktop uses the landscape composition with a larger board. The 25 bonus cells
are separate from the preserved base reels.

Each free spin fills every cell independently:

| Symbol | Draw chance | When collected |
| --- | --- | --- |
| Empty | 35% | No award |
| Coin | 25% | One coin worth the 1.00 bet |
| ×2 | 20% | Add 2 to the feature multiplier |
| ×3 | 10% | Add 3 to the feature multiplier |
| Heart | 7% | Sweep its column or wait above it |
| Scatter | 3% | Add one remaining free spin |

Above the grid, a three-cell number reel selects 1–5 arrows with relative weights
**20:15:12:5:3**. The supplied weights sum to 55, so they are normalized over 55;
there is no zero-arrow outcome. Each arrow selects a random unused row from the five;
no row can be shot twice in the same free spin. The supplied arrow asset animates left to
right, collecting symbols as it crosses each cell. Already collected cells are
empty and cannot pay again. Unhit symbols do not contribute to the feature win.
After selection, a small arrow icon and remaining count appear above the grid's
top-left corner. The count decreases after each shot finishes, stays visible
during intervening heart sweeps, and disappears when no arrows remain.

A collected heart pulses and rises to the top of its column, then sweeps downward
to collect remaining symbols. Hearts found during a sweep queue another sweep.
If the column is empty, the heart stays above it and attempts collection at the
beginning of the next free spin, before the new arrows. It remains visible during
the new grid reveal and while other carried hearts are sweeping. Multiple waiting hearts
can occupy a column; an empty next-spin column keeps them parked. Waiting hearts
do not themselves grant spins and expire when the feature finishes.

The bottom bar shows the current free spin, remaining spins, collected coins and
cumulative multiplier. The multiplier starts at **×1** and adds collected ×2/×3
face values across the whole feature. The final bonus win is:
**collected coins × 1.00 bet × cumulative multiplier**. A collected bonus Scatter
adds one spin immediately, including on the last scheduled spin.

When all remaining spins finish, a results dialog shows the total bonus win.
It is credited once to the triggering round and session total. Free spins do not
increment the paid-round counter. **Continue** returns to the exact settled base
board that triggered the bonus, with its feature counters preserved. Those same
Scatters do not immediately retrigger; the next player spin starts a new round.

## Verification

`npm test` covers the weighted distribution, symbol/frame mapping, inclusive reel
lengths, stop validity, boundary wrapping, matching across rows, left-to-right
continuity, Wild substitution, separate Scatter trigger detection, 1,024 ways, non-winning openings,
cascade gravity, shared-cell removal, weighted refills, consecutive wins, heart
awards, distinct Wild placement, winning/losing heart releases, all category
payouts, mixed/Wild-substituted wins, exact cascade totals, session RTP, and
capped Wild reel generation, Wild-free cascade refills, love-meter charging, arrow tiers,
unique/protected targets, full clears, wins produced by arrow refills, and
Scatter survival/no payout/no feature charging even alongside regular wins.
It also checks the one-Scatter limit on full strips and every circular stop,
repeated cascade/arrow refills, and renormalized regular draw weights.
Wild tests cover zero/three counts, both special caps together, circular windows,
the spin draw distribution and non-winning opening fallback.
Heart tests cover every Mid/High frame at 3–5 reels, mixed wins, Wild substitution,
and Low/standalone Wild wins earning no heart award while retaining normal clearing.
Arrow-chain tests cover retained charge, fresh wins enabling repeat bursts,
resolution order, and losing/Scatter-only refills ending the chain.
Bonus tests cover the awards, symbol and arrow probabilities, unique and uniformly sampled row
selection, single collection, overlaps, additive payout, held hearts, chained
heart sweeps, last-spin extensions and 50 complete seeded bonuses.
`npm run build` performs strict TypeScript checking and bundles the app with Vite.

For a development smoke test, open `/?bonus-preview=1` on the Vite server, then
How to play → Preview 3-Scatter bonus. This creates a three-Scatter fixture and
opens the entry dialog without changing real spin odds. `/?bonus-preview=fast`
also shortens bonus steps to 100ms for complete-flow checks. The additional
Preview carried hearts button supplies three waiting hearts (two stacked in one
column) to verify visibility during filling and queued sweeps. Both controls exist
only in development; they are omitted from the production build.
