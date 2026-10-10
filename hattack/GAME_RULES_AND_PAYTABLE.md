# Heart Attack — Game Rules & Paytable

**Current prototype rules · 10 October 2026**

**1,024 ways to fall in love.** Winning cascades, heart Wilds and love-meter
arrows lead into a 25-cell free-spin bonus with coins, multipliers and sweeping hearts.

This document is a standalone reference for players and for creating a promo
image. All amounts are prototype credits. The current game uses a fixed
**1.00-credit bet** and has no cash wagering.

## At a glance

| Feature | Current rule |
| --- | --- |
| Main-game layout | 5 reels × 4 rows; 1,024 possible ways |
| Winning direction | Left to right, starting on the first reel |
| Minimum match | Same symbol on 3 consecutive reels, in any row |
| Cascades | Winning cells clear; survivors fall; new symbols fill the gaps |
| Bottom hearts | Mid and High wins charge 3–5 heart Wilds |
| Love meter | 10 levels; charged wins earn arrow clears |
| Bonus trigger | 3 / 4 / 5 Scatters award 10 / 15 / 20 starting free spins |
| Bonus layout | 5 × 5 cells; 25 cells total |
| Bonus arrows | 1–5 arrows per free spin, each shooting a different row |
| Bonus payout | Collected coins × bet × final cumulative multiplier |

## Main game: ways to win

Tap or click the artwork to start a round. Keyboard players can focus the game
and press Space or Enter. The reels spin and stop from left to right; results
and features then resolve automatically before another player spin is allowed.

A regular symbol wins when it appears on **3, 4 or 5 consecutive reels starting
from the leftmost reel**. Its row may differ between reels. No fixed paylines
are required.

Matching positions multiply to give the number of winning ways. For example,
two matching positions on reel 1, one on reel 2 and three on reel 3 form
**2 × 1 × 3 = 6 ways**. Only the longest consecutive run pays for each symbol;
its shorter prefixes are not paid again. Different winning symbols can pay on
the same board.

### Main-game paytable

Amounts below are **per winning way at the 1.00-credit bet**. All six symbols
within a tier share that tier's payouts.

| Symbol tier | 3 matching reels | 4 matching reels | 5 matching reels |
| --- | ---: | ---: | ---: |
| Low | 0.05 | 0.10 | 0.25 |
| Mid | 0.25 | 0.50 | 0.75 |
| High | 0.75 | 1.00 | 2.00 |

**Board win = payout per way × winning ways**, summed across winning symbols.
For example, six three-reel Mid ways pay **6 × 0.25 = 1.50 credits**.
All wins from cascades and features add to the same player round.

### Symbol tiers

These names are the current game's labels. Asset frame numbers are zero-based
and run left to right across each symbol sheet.

| Tier / sheet | Frames 0–5 |
| --- | --- |
| Low — `low.png` | Comfort food; Workout; Jewellery; Cash; Beauty kit; Kiss mirror |
| Mid — `mid.png` | Wing lover; Glamour date; Gym date; Cocktail date; Silver fox; Party date |
| High — `high.png` | Rose gentleman; Rose lady; Suited gentleman; Elegant lady; Wine gentleman; Elegant silver lady |

### Wild and Scatter

- **Wild** substitutes for regular symbols. A substituted match pays the regular
  symbol's rate. A standalone run of Wilds clears and charges the love meter,
  but has no direct payout and earns no bottom-heart award.
- Initial reel strips can contain up to three Wilds per reel. Heart awards may
  add further Wilds; ordinary cascade refills do not draw new Wilds.
- **Scatter** does not form a ways win, substitute, pay directly or charge either
  main-game feature. Scatters survive cascades and love-meter arrow clears.
- Each generated reel strip contains at most one Scatter. Cascade refills also
  keep at most one Scatter per visible column.

## Cascades and bottom-heart Wilds

1. Winning cells highlight, pay, and disappear. A cell shared by several wins
   disappears only once.
2. Surviving symbols fall within their own reel, keeping their order. New symbols
   fill the vacant top positions.
3. The board is evaluated again. Continue cascading while wins remain.
4. During that sequence, the longest **Mid or High** winning match charges the
   bottom hearts: 3 matching reels light 3 hearts, 4 light 4, and 5 light 5.
5. Once the natural cascades finish, each lit heart turns a different random
   regular cell into a Wild, limited by the available cells. Existing Wilds and
   Scatters are protected. Multiple new Wilds may land on the same reel.
6. The heart award is consumed and the board is checked again. New Mid or High
   wins can charge another heart award after their cascades.

Low wins and standalone Wild wins still clear and charge the love meter, but
**only Mid and High wins earn bottom-heart Wilds**. A longer Low match cannot
increase the heart award.

## Love meter: main-game arrow clears

Each board containing a ways win lights **one** love-meter cell, up to ten.
Several winning ways on one board still add only one cell. The meter resets at
the beginning of the next player spin.

After cascades and heart Wilds settle, an earned arrow burst removes random,
distinct regular symbols according to the current charge:

| Lit love-meter cells | Regular symbols removed |
| --- | --- |
| 1–5 | 1–3 |
| 6–8 | 3–8 |
| 9 | 8–15 |
| 10 | All regular symbols |

Counts within a range are chosen uniformly and limited by available targets.
**Wilds and Scatters are protected.** Cleared cells use the normal falling and
refill sequence. The arrow clear itself does not pay; resulting ways wins do.

Charge stays lit between bursts. If an arrow refill creates new wins, resolve
their cascades and heart Wilds, then fire another earned burst. A refill with no
new win ends the chain; charge alone cannot fire again.

## Free-spin bonus: trigger and entry

When the main round's cascades, heart Wilds and earned love-meter arrows finish,
count Scatters anywhere on the settled board:

| Scatters | Starting free spins |
| --- | ---: |
| 3 | 10 |
| 4 | 15 |
| 5 | 20 |

An award dialog announces the feature. Press **Continue** to enter the bonus.
The main-game board is preserved while the bonus uses a separate **5 × 5 grid**.
Free spins run automatically.

### Bonus symbols and awards

Each free spin fills all 25 cells independently using these probabilities:

| Bonus symbol | Draw chance | Effect when collected |
| --- | ---: | --- |
| Empty | 35% | No award |
| Coin | 25% | Add one coin worth the bet: 1.00 credit |
| ×2 | 20% | Add 2 to the cumulative bonus multiplier |
| ×3 | 10% | Add 3 to the cumulative bonus multiplier |
| Heart | 7% | Collect remaining symbols in its column, or wait above an empty column |
| Scatter | 3% | Add 1 remaining free spin |

Symbols must be collected to award their effect. Symbols left unhit do not pay
and are replaced when the next free spin fills the board. Each cell can be
collected only once in that free spin, even when a row and column sweep overlap.

### Bonus arrows: horizontal collection

A three-cell number reel above the grid selects how many arrows to shoot. The
middle number is the result.

| Arrows this free spin | Relative weight | Probability |
| --- | ---: | ---: |
| 1 | 20 | 36.36% |
| 2 | 15 | 27.27% |
| 3 | 12 | 21.82% |
| 4 | 5 | 9.09% |
| 5 | 3 | 5.45% |

The listed weights total 55 and are normalized over that pool. Percentages are
rounded. There is no zero-arrow outcome.

Each arrow shoots a randomly selected **unused horizontal row**, travelling
from left to right and collecting its symbols. A row cannot be shot twice in
the same free spin. Five arrows therefore shoot all five rows.

A small arrow icon at the grid's top-left shows **arrows remaining**. It appears
after selection, decreases after each shot finishes, stays visible during
intervening heart sweeps, and disappears at zero.

### Bonus hearts: vertical collection and carryover

A collected heart pulses, rises above its column and falls down to collect all
remaining symbols in that column. Hearts collected during a sweep queue another
sweep. Resolve queued hearts before firing the next arrow.

If the column is empty, keep the heart above it for the next free spin. Carried
hearts remain visible during the new grid reveal and while other hearts sweep.
They attempt collection at the beginning of the next free spin, before new
arrows. If the column is still empty, the heart remains waiting. Several waiting
hearts may share a column, shown with a count.

Waiting hearts do not award extra spins. Any still waiting when the feature has
no spins remaining expire with the feature.

### Bonus multiplier and final payout

The cumulative multiplier starts at **×1**. Collected ×2 and ×3 symbols add their
face values across the entire feature. For example, collecting one ×2 and one
×3 changes the multiplier to **1 + 2 + 3 = ×6**.

**Bonus win = total collected coins × 1.00-credit bet × final multiplier.**

Example: 10 coins and a final ×6 multiplier pay **60.00 credits**. The final
multiplier applies to all coins collected across the feature.

A collected bonus Scatter adds one remaining free spin immediately, including
on the last scheduled spin. The bonus can therefore run beyond its initial
10, 15 or 20 spins.

When no spins remain and all collections finish, a results dialog displays the
bonus win. That win is added once to the triggering round and session total.
Press **Continue** to return to the exact main-game board that triggered the
feature. Those preserved Scatters do not immediately retrigger it; the next
player spin starts a new round.

## Counters and session statistics

The main-game bar shows bet, player rounds, total win, current or last round win,
and observed session RTP:

**Session RTP = total win ÷ (player rounds × bet) × 100%.**

Cascades and free spins do not add player rounds. During the bonus, the bar shows
current free spin, remaining spins, cumulative multiplier and collected coins.
Reloading resets the session. Observed session RTP is not a published theoretical
return; this prototype has no calibrated RTP or defined maximum-win claim.

## Promo-image brief

### Suggested copy

- **Title:** Heart Attack
- **Tagline:** 1,024 ways to fall in love
- **Main features:** Winning cascades · Heart Wilds · Love-meter arrows
- **Bonus headline:** 25-cell free-spin bonus
- **Trigger strip:** 3 Scatters = 10 FS · 4 = 15 FS · 5 = 20 FS
- **Bonus features:** Collect coins · Build your multiplier · Sweep rows and columns
- **Paytable caption:** Payout per way at a 1.00-credit bet

Use the three-row main-game paytable above. If showing bonus math, use
**Coins × Bet × Cumulative Multiplier**. Show the Scatter awards as starting
spins; collected bonus Scatters can extend the feature beyond 20 spins.

### Visual direction and asset references

Match the existing art: vivid pink, magenta and purple, warm gold frames,
glowing hearts, winged characters and heart-tipped arrows. Prioritize a readable
mobile portrait composition. Pair the main-game paytable with three clearly
labelled symbol tiers and a separate bonus panel.

Paths below are relative to the `hattack/` project. Supply the actual images
alongside this document when sharing it with an image creator.

| Asset | Path | Use |
| --- | --- | --- |
| Main artwork | `src/assets/background/main.png` | Main-game scene; 5 columns × 4 rows |
| Bonus artwork | `src/assets/background/bonus.png` | Bonus scene; reuse an interior artwork row for the fifth row, as in the game |
| Low symbols | `src/assets/symbols/low.png` | Six horizontal frames; all use Low payouts |
| Mid symbols | `src/assets/symbols/mid.png` | Six horizontal frames; all use Mid payouts |
| High symbols | `src/assets/symbols/high.png` | Six horizontal frames; all use High payouts |
| Wild / Scatter | `src/assets/symbols/bonus.png` | Two horizontal frames: Wild left, Scatter right |
| Arrow | `src/assets/symbols/arrow.png` | One transparent arrow image; shots and remaining-arrow badge |
| Heart | `src/assets/symbols/heart.png` | Three horizontal frames; use the first, whole-heart frame |

Slice symbol sheets into equal-width frames before trimming transparent margins.
Keep the main game **5 × 4** and bonus **5 × 5** distinct. Show bottom-heart Wild
awards for **Mid/High wins**, and vertical sweeping hearts in the **bonus**.
The love meter's protection of Wilds/Scatters applies to the main game; bonus
arrows collect bonus Scatters to award extra spins.

### Accuracy notes for artwork text

The 1,024 figure describes possible main-game ways, not a guaranteed win.
Standalone Wilds and base-game Scatters have no direct payout. The bonus ×2/×3
symbols add to one cumulative multiplier. Use prototype credits rather than
currency, and do not add an unsupported RTP percentage or maximum-win amount.

## Reference for later updates

This document matches the implementation in `src/game.ts`, `src/bonus.ts` and
`src/main.ts` on the date above. If mechanics or payouts change, update this
shareable guide along with `README.md` and `CONTEXT.md`.
