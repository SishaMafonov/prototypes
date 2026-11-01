---
document_type: rules_module
ruleset_id: fool-house-2026-11-01-v12
context: playable corridor/doors bonus, floor prizes, accumulated-pot multipliers, exact credit and base return
read_when: bonus gameplay, prize probabilities, step consumption, timing, accounting or full-game simulation
branch_ids: D01-D18
---

# 10 — Corridor and three-door adventure

**Study scope:** door prize rules remain current. The v6 return estimate below predates room-specific refills/extra clears; see [11](11-room-refills.md) for the current v7 study and progression rules.

**Context packet:** Scatter entry allocates N moves. Each move approaches three doors for 3000 ms, then waits for one choice. Prize chances are Coin 35%, Multiplier 25%, Stairs 5%, Ghost 35%. Coin is 1.00 × current floor (1–6). User confirmed that multipliers apply to the bonus pot already collected and stairs add one floor up to x6. Every choice consumes one move. After the final reveal, Return to mansion restores the settled base board; all base wins have finished before entry. There are no Scatter symbols drawn inside the corridor feature.

**Authority:** [bonus.ts](../../src/bonus.ts) contains pure math and exact cent formatting; [bonus-scene.ts](../../src/bonus-scene.ts) renders perspective animation; [main.ts](../../src/main.ts) coordinates controls, counters, credits and return. [Bonus tests](../../tests/bonus.test.mjs) and [full-game study](studies/door-bonus-validation.json) provide evidence.

| ID | Condition | Result |
| --- | --- | --- |
| D01 | Continue confirms the Scatter intro | Start a fresh bonus at floor 1, completed 0, total N, pot/step win 0. Preserve base board, collection, multiplier, spins and already-credited awards. Enter bonus subphase `walking`. |
| D02 | A move starts | Current step = completed + 1; remaining = N − completed. Reset prior selected door/revealed flag/prize/caption/callback and move focus to the bonus region. Render 3000 ms of perspective movement; doors remain disabled and neutral. No prior outcome can highlight/open a door or imply the next prize. Walking costs no move/wager. |
| D03 | Approach finishes | Enter `choosing`; enable neutral Left/Middle/Right. No passive hover glow, even if the pointer remains over the previous door. Deliberate keyboard focus has a plain enabled-button outline. Wait for click/tap/keyboard; no timeout/default choice/autoplay and no held-key repeats. |
| D04 | Door accepted in `choosing` | Immediately enter `revealing` and disable all doors. Draw one category, and a second random number only for a Multiplier. Door position does not change odds. No unchosen prizes are drawn or disclosed. Repeated input during walking/reveal/complete is ignored. |
| D05 | Category RNG r is in [0,.35) | Coin. Add `100 × floor` cents to bonus pot, from 1.00 on floor 1 to 6.00 on floor 6. No base-stage or room multiplier applies to this award. |
| D06 | r is in [.35,.60) | Multiplier. Independently choose one of `[2,2,2,2,2,3,3,5,5,8]` using floor(u×10). Slots are equally likely: x2 50%, x3 20%, x5 20%, x8 10%, mean 3.4. Set new bonus pot = old pot × selected value. Credit only new − old. No persistent boost to future coins is stored. |
| D07 | Multiplier finds an empty pot, or repeats later | Empty pot stays zero; it still consumes a move. Later multipliers multiply the pot existing at their own reveal, including earlier multiplier gains. Floor does not alter this exact supplied multiplier bag. |
| D08 | r is in [.60,.65) | Stairs. Advance floor by one, capped at 6, and update future coin prize and next-floor preview immediately on reveal. Floor factors are x1,x2,x3,x4,x5,x6. No immediate cash award. |
| D09 | Stairs at floor 6 | Stay on floor 6; no reroll, extra move, cash award or higher factor. Consume the move normally. Preview says Top floor. |
| D10 | r is in [.65,1) | Ghost. Pay zero, preserve pot/floor, consume the move. Ghost grows/moves toward the camera and fades away during its reveal. |
| D11 | Door opening reaches 700 ms | Commit exactly once: completed +1, updated floor/pot, Step win = pot increase. Add that increase once to base Round win and Session win, then update all UI. Do not add spins/wager for a door. The caption/coin/multiplier/stairs/ghost appears after opening; no prize is announced before the door opens. |
| D12 | Reveal runs / ends with moves remaining | Opening lasts 700 ms; prize display lasts 1600 ms, or 1900 ms for Ghost. Then automatically start the next 3000 ms walk. During reveal current step = completed; during next walk/choice it is completed +1. Latest step win remains visible until the next choice begins. |
| D13 | Final reveal ends | Enter `complete`, remaining 0, current N of N. Disable doors and show Bonus complete with exact pot and Return to mansion. Wait for confirmation. No additional completion award. |
| D14 | Return to mansion accepted | Stop bonus animation, clear move bank/badge, hide bonus layer and reactivate base layer. Recheck the same settled board; retain its room/collection/stage multiplier and paid-chain Scatter guard. No further base awards, refills or free floors remain. Become ready without another popup or duplicate pot credit. A new paid round resets eligibility. |
| D15 | Pot/accounting grows very large | Bonus pot, step award and session/round/wager stored cents use BigInt; money displays grouped whole credits and two exact cent digits. Repeated multipliers have no added cap and do not silently lose integer precision. UI RTP is an approximate floating display ratio; it does not steer outcomes. |
| D16 | Layout, density or motion preference changes | Corridor uses the existing reel aspect ratio/size when space fits; shrink uniformly to fit between logo/prize panel/status. Preserve move, outcome, controls and animation elapsed time on resize. Render at device pixel density. Reduced motion keeps the 3-second wait, but removes camera travel/sway and ghost lunge/pulsation; Ghost fades statically. Visual noise is deterministic and consumes no gameplay RNG. |
| D17 | Errors or reload | Caught bonus/controller errors stop animation, expose the base error status and disable play, without refunds/rollback. Reload clears all session state. Existing asynchronous-render exception limitations still apply. |
| D18 | Retriggers / simulation / calibration | No Scatter draw occurs in this door feature, so it currently cannot generate the previously discussed Scatter retriggers. Preserve that user preference for any future feature with Scatter draws; do not invent an extra outcome probability. Simulator defaults now include door bonuses and resumes the base board; `--door-bonus=off` reproduces prior base-only studies. |

## Constructed sequence and payout credit

Six moves: Coin (1.00) → Stairs (floor 2) → x3 (pot 3.00, step gain 2.00) → Ghost (0) → floor-two Coin (+2.00, pot 5.00) → x2 (pot 10.00, gain 5.00). Step gains sum to 10.00. If the completed base chain paid 0.10 before bonus entry, whole-round win becomes 10.10; Return adds nothing. Moves do not increment the base Spins counter.

## Historical v6 study and limitations

100,000 full paid chains, seed 20261101, with historical 57/23.75/14.25/5 symbol odds: gross RTP **9.9003%**, approximate 95% interval **9.1010–10.6996%**, hit rate **63.007%**. Observed 437 door bonuses, 2674 moves and 377,700 cents of door awards. Category counts: Coin 903, Multiplier 663, Stairs 144, Ghost 964. Base and door awards sum to 990,030 cents on 10,000,000 wagered cents. This is a small prototype study with volatile repeated-multiplier tails, not a calibrated 96% result or certification; payout rebalancing was deferred in that snapshot. See [12](12-rtp-balance.md) for the historical calibration; current balancing is deferred under [13](13-scatter-persistence.md).

Reproduce v6 with `npm run simulate -- --rounds=100000 --seed=20261101 --room-refills=off --keep-scatters=off`. Simulation stores money exactly, serializing cent values as numbers when safe or decimal strings otherwise; statistics use floating point. The base-only 6.09404% study and this 9.9003% v6 study predate current progression; later tails remain poorly sampled.
