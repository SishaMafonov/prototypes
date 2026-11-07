---
document_type: rules_module
ruleset_id: fool-house-2026-11-07-v14
context: Scatters persist across base-floor transitions/features; one bonus per paid chain; current weights and RTP in module15
read_when: Scatter retention, reset scope, bonus deduplication, feature clears, current RTP status
branch_ids: S01-S10
---

# 13 — Persistent base-game Scatters

**Context packet:** keep Scatters in their exact reel cells throughout one paid round and its free-floor chain, including room-feature extra clears. Only regular cells clear and refill. User confirmed **at most one bonus per paid-round chain**, with entry deferred until all base wins, room features and free floors finish. Count all final retained Scatters together. A new paid round replaces the whole board and resets bonus eligibility. Scatter is3%; [14](14-mystery.md) keeps Mystery10%. Current paytable and raw weights are in [01](01-math.md); current combined round-pot/15% stairs rules are in [10](10-door-adventure.md). **Current calibration is in [15](15-current-balance.md).** The v8 ten-billion-round study remains historical.

**Authority:** [game.ts](../../src/game.ts): `clearForFloor`, `refillBoard`, `refillForRoom`, `shouldContinueRoom`, `getScatterBonusMoves`; [main.ts](../../src/main.ts): `requestRound`, `refillCurrentRoom`, `resolveRound`, `checkScatterBonus`.

| ID | Condition | Outcome |
| --- | --- | --- |
| S01 | Fresh paid round | `generateBoard` draws all 25 cells from scratch. A paid start discards old Scatters, resets the paid-chain bonus guard, collection and stage multiplier. Startup uses a separate fixed nonwinning preview with no Scatter/Mystery, board RNG or automatic sequence; it never awards. No persistence across separate paid rounds/reload. |
| S02 | Ordinary cascade | Remove regular winners and refill holes. Surviving Scatters keep their objects/positions; existing regular survivors remain as before. |
| S03 | Partial-room feature stalls with at least five regular slots | `clearForFloor` returns new rows with Scatters retained and every regular/empty cell null. Clear has no payout, collection, wager or counted spin. `refillForRoom` draws only holes using room-specific regular indexes; Scatters consume no draw or growth animation. Keep room/progress/multiplier/bonus guard. |
| S04 | Room collection completes and next floor opens | Pay all winners, show the normal popup, clear only regular cells, keep Scatters visible through both switching phases and background application. Reset collection/global regular pool, advance Fibonacci multiplier and Spins, mark holes as growing, then globally refill those holes. Retained Scatters stay full size and consume no RNG draw. |
| S05 | Carrying Scatters reaches 6+ during the chain | Continue all regular wins, Mystery reveals, room features and free floors without entry. At the terminal no-win/no-room-continuation board, count all carried/new Scatters and award the final exact total once, then require Continue. |
| S06 | This paid chain already awarded its bonus | Keep all Scatters visible, but do not award another bonus on later refills, feature clears, new floors or additional Scatters. `scatterBonusAwarded` persists until the next accepted paid round. |
| S07 | Return from the door bonus | Preserve the base board, Scatters, room progress, stage multiplier and paid-chain guard. No pending regular win remains; the guarded recheck returns to ready. Credit only each door-pot increase as before. |
| S08 | No wins, partial collection and fewer than five non-Scatter slots | This is a terminal board: check final Scatter eligibility, then settle after any awarded bonus. A five-symbol regular group is impossible, so do not repeat a clear/refill loop. Do not discard Scatters, award unearned room completion or add a free stage. Partial collection remains visible until the next paid reset. |
| S09 | All 25 cells are Scatters | The first eligible check awards 25 moves; Return settles. If already awarded, settle directly. A clear/refill of this board consumes zero RNG draws. |
| S10 | Simulation/calibration evidence | Current helpers, JS reference, C++ runner and C# reference implement retention and paid-chain eligibility. Native configs include `KeepScatters`, `BonusOncePerPaidChain` and `BonusAtEndOfPaidChain`; legacy configs omit them. v8 statistics do not describe current rules; no balance search or new RTP claim is part of this change. |

## Verification and historical replay

The original retention tests, now part of 43 tests, cover carried positions over multiple floors/features, source immutability, exact skipped RNG draws, five Scatters accumulating into six, bonus suppression after award through later floors, fresh eligibility and the 20/21/25-Scatter space boundary. Existing payout, weighted draw and permutation tests remain intact. Production build passed. Updated native/production helpers matched 30,000 complete paid chains in streams 0/1/7, including exact credits, ending room and RNG state; legacy replay matched 3,000 chains. These are functional checks, with no new balance estimate.

During the original v9 change, computer-use stopped visual QA because it could not verify the browser URL. No further browser input was issued; temporary fixture/server were removed/stopped. That limitation applies to the original v9 run only. Current isolated headless v11 QA verified two free-floor transitions before Scatter entry, final seven-move allocation, completed bonus Return and the next paid reset.

For historical JS results add `--keep-scatters=off` alongside each study's original weights/feature flags. For native historical replay use `node scripts/rtp/verify.mjs 10000 --legacy` and the [archived v8 configuration](studies/rtp-10b-config.json). Current default configs have a different identity, preventing old checkpoints/results from silently representing the new rules. The [v8 raw report](studies/rtp-10b.json), [summary](studies/rtp-10b-summary.json) and [convergence CSV](studies/rtp-10b-convergence.csv) are preserved unchanged.
