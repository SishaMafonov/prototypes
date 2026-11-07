---
document_type: rules_module
ruleset_id: fool-house-2026-11-07-v15
context: playable corridor/doors bonus, floor prizes, accumulated-pot multipliers, exact credit and base return
read_when: bonus gameplay, prize probabilities, step consumption, timing, accounting or full-game simulation
branch_ids: D01-D19
---

# 10 — Corridor and three-door adventure

**Current scope:** v15 doubles coin and multiplier values on each bonus ascent; see [16](16-bonus-floor-prizes.md). Original v6/v14 verification and return figures below are historical. Current RTP is unmeasured.

**Context packet:** N moves; each approaches three doors for3000ms. Chances remain Coin30%, Multiplier4.73%, Stairs15%, Ghost50.27%. Prize factor=2^(floor−1), capped atfloor6: coins1/2/4/8/16/32 credits, with every base multiplier slot2/3/5/8 scaled by the same factor. Seed the pot with the settled already-credited base round win; credit only increases. Floor1 is unchanged; stairs only changes future rewards. See [16](16-bonus-floor-prizes.md).

**Authority:** [bonus.ts](../../src/bonus.ts) contains pure math and exact cent formatting; [bonus-scene.ts](../../src/bonus-scene.ts) renders perspective animation; [main.ts](../../src/main.ts) coordinates controls, counters, credits and return. [Bonus tests](../../tests/bonus.test.mjs) and [full-game study](studies/door-bonus-validation.json) provide evidence.

| ID | Condition | Result |
| --- | --- | --- |
| D01 | Continue confirms the Scatter intro | Start a fresh bonus at floor 1, completed 0, total N, pot equal to the final base round win, step win 0. Carry the seed without awarding it again. Preserve base board, collection, multiplier, spins and already-credited awards. Enter bonus subphase `walking`. |
| D02 | A move starts | Current step = completed + 1; remaining = N − completed. Reset prior selected door/revealed flag/prize/caption/callback and move focus to the bonus region. Render 3000 ms of perspective movement; doors remain disabled and neutral. No prior outcome can highlight/open a door or imply the next prize. Walking costs no move/wager. |
| D03 | Approach finishes | Enter `choosing`; enable neutral Left/Middle/Right. No passive hover glow, even if the pointer remains over the previous door. Deliberate keyboard focus has a plain enabled-button outline. Wait for click/tap/keyboard; no timeout/default choice/autoplay and no held-key repeats. |
| D04 | Door accepted in `choosing` | Immediately enter `revealing` and disable all doors. Draw one category, and a second random number only for a Multiplier. Door position does not change odds. No unchosen prizes are drawn or disclosed. Repeated input during walking/reveal/complete is ignored. |
| D05 | Category RNG r is in [0,.30) | Coin. Add100×2^(floor−1) cents:1.00 on floor1 through32.00 on floor6. Base-stage/room multipliers do not apply. |
| D06 | r is in [.30,.3473) | Multiplier. Choose one of [2,2,2,2,2,3,3,5,5,8], then multiply that value by2^(floor−1). Slot odds stay50%/20%/20%/10%. Multiply the entire current round pot by the effective value once and credit only the increase. No persistent extra multiplier is stored. |
| D07 | Empty pot or repeated multiplier | Zero remains zero; the move is still consumed. Repeated multipliers use the pot and floor at their own reveal, including earlier gains. |
| D08 | r is in [.3473,.4973) | Stairs. Advance one floor, capped at6. Immediately update future coins and multiplier values on reveal; factors1/2/4/8/16/32. No immediate cash award. |
| D09 | Stairs at floor 6 | Stay on floor 6; no reroll, extra move, cash award or higher factor. Consume the move normally. Preview says Top floor. |
| D10 | r is in [.4973,1) | Ghost. Pay zero, preserve pot/floor, consume the move. Ghost grows/moves toward the camera and fades away during its reveal. |
| D11 | Door opening reaches 700 ms | Commit exactly once: completed +1, updated floor/pot, Step win = pot increase. Add that increase once to base Round win and Session win, then update all UI. Do not add spins/wager for a door. The caption/coin/multiplier/stairs/ghost appears after opening; no prize is announced before the door opens. |
| D12 | Reveal runs / ends with moves remaining | Opening lasts 700 ms; prize display lasts 1600 ms, or 1900 ms for Ghost. Then automatically start the next 3000 ms walk. During reveal current step = completed; during next walk/choice it is completed +1. Latest step win remains visible until the next choice begins. |
| D13 | Final reveal ends | Enter `complete`, remaining 0, current N of N. Disable doors and show Bonus complete with exact combined Round win and Return to mansion. Wait for confirmation. No additional completion award. |
| D14 | Return to mansion accepted | Stop bonus animation, clear move bank/badge, hide bonus layer and reactivate base layer. Recheck the same settled board; retain its room/collection/stage multiplier and paid-chain Scatter guard. No further base awards, refills or free floors remain. Become ready without another popup or duplicate pot credit. A new paid round resets eligibility. |
| D15 | Pot/accounting grows very large | Bonus pot, step award and session/round/wager stored cents use BigInt; money displays grouped whole credits and two exact cent digits. Repeated multipliers have no added cap and do not silently lose integer precision. UI RTP is an approximate floating display ratio; it does not steer outcomes. |
| D16 | Layout, density or motion preference changes | Corridor uses the existing reel aspect ratio/size when space fits; shrink uniformly to fit between logo/prize panel/status. Preserve move, outcome, controls and animation elapsed time on resize. Render at device pixel density. Reduced motion keeps the 3-second wait, but removes camera travel/sway and ghost lunge/pulsation; Ghost fades statically. Visual noise is deterministic and consumes no gameplay RNG. |
| D17 | Errors or reload | Caught bonus/controller errors stop animation, expose the base error status and disable play, without refunds/rollback. Reload clears all session state. Existing asynchronous-render exception limitations still apply. |
| D18 | Retriggers / simulation / calibration | No Scatter draw occurs in this door feature, so it currently cannot generate the previously discussed Scatter retriggers. Preserve that user preference for any future feature with Scatter draws; do not invent an extra outcome probability. Simulator defaults now include door bonuses and resumes the base board; `--door-bonus=off` reproduces prior base-only studies. |
| D19 | Bonus seed/accounting and model compatibility | `createBonusState(N, startingWinCents)` accepts a nonnegative BigInt seed; negative seed/invalid steps throw. Runtime seeds from the current round only, never earlier session winnings. Record starting win separately; completion total includes it, while bonus-only contribution is final minus seed. New config flag `BonusStartsWithRoundWin`; absent flag retains historical zero-start behavior. Current default door weights differ; archived replay uses original odds. |

## Constructed sequence and payout credit

Base chain pays2.00, already credited. Six moves: Floor1×3→6.00; Coin→7.00; Stairs→floor2, still7.00; Coin→9.00; Ghost unchanged; base multiplier slot2 now gives×4→36.00. Bonus adds34.00. Entry/Return add nothing. Door moves do not increment Spins.

## Historical v14 verification (before doubling)

43 tests/build pass. Combined-pot fixtures verify a 2.00 seed ending at18.00 after x3/Coin/Stairs/Coin/Ghost/x2, with only16.00 bonus gain. A Ghost-only bonus preserves its seed and a zero seed still allows zero-valued multipliers. Negative seeds reject; archived odds replay explicitly. C++ matches30,000 complete production-helper chains; independent C# and v8 legacy replay each match3,000, with exact credit/room/RNG state and checkpoint continuity. Seeded conditional expectation is independently reconstructed from move counts and base seed totals. Isolated headless390×844 QA verifies base0.01→bonus0.01, x3→0.03, coin→1.03, stairs→floor2, coin→3.03, Ghost unchanged, x2→6.06, then Return unchanged. Session and round totals agree at every step; odds and completion labels match, with no page errors. The historical v14 measured study is [15](15-current-balance.md); current v15 is unmeasured.

## Historical v6 study and limitations

100,000 full paid chains, seed 20261101, with historical 57/23.75/14.25/5 symbol odds: gross RTP **9.9003%**, approximate 95% interval **9.1010–10.6996%**, hit rate **63.007%**. Observed 437 door bonuses, 2674 moves and 377,700 cents of door awards. Category counts: Coin 903, Multiplier 663, Stairs 144, Ghost 964. Base and door awards sum to 990,030 cents on 10,000,000 wagered cents. This is a small prototype study with volatile repeated-multiplier tails, not a calibrated 96% result or certification; payout rebalancing was deferred in that snapshot. See [12](12-rtp-balance.md) for the historical calibration; historical v14 calibration is in [15](15-current-balance.md).

Reproduce v6 with `npm run simulate -- --rounds=100000 --seed=20261101 --weights=57,23.75,14.25,5 --room-refills=off --keep-scatters=off`. This selects historical odds/paytable, a zero seed and no Mystery. For v12 persistence snapshots, add `--paytable=legacy --bonus-pot=zero --door-odds=legacy` with their original flags/weights. Simulation stores money exactly, serializing cent values as numbers when safe or decimal strings otherwise; statistics use floating point. The base-only 6.09404% study and this 9.9003% v6 study predate current progression; later tails remain poorly sampled.
