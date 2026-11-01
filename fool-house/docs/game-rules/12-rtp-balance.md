---
document_type: calibration_study
ruleset_id: fool-house-2026-11-01-v8
context: fixed weights target 96% total RTP; base 50–60 percentage points; complete paid-chain validation
read_when: current weights, base/bonus contribution, ten-billion-round evidence, simulation reproduction
branch_ids: Q01-Q10
validation_status: complete
---

# 12 — Historical v8 full-game RTP balance

**Superseded by v9:** this completed study clears Scatters on floor/feature resets and allows a bonus per room stage. It does not measure current Scatter persistence or the once-per-paid-chain rule. Current balancing is deferred; see [13](13-scatter-persistence.md). Preserve the raw reports unchanged.

**Context packet:** Low 49.5%, Mid 27.0875%, High 16.2525%, Scatter 7.16%. Fixed 1.00 paid wager. Target 96% total RTP, with base awards supplying 50–60 percentage points and door bonuses the remaining 36–46. Preserve Low > Mid > High. Paytables, room bag, Fibonacci stages, collection/extra clears, six-Scatter threshold and all door-prize math are unchanged. Final held-out validation completed **10,000,000,000 paid chains**: **95.979499% total RTP**, split **54.893894% base** and **41.085605% doors**, with zero truncated chains.

**Authority:** [production math](../../src/game.ts), [door math](../../src/bonus.ts), [laboratory methodology and commands](../../scripts/rtp/README.md), [native engine](../../scripts/rtp/simulator.cpp), [per-round equivalence verification](../../scripts/rtp/verify.mjs). Load this module for the compact analysis context; raw studies contain full shard records and hashes.

## Q01 — Unit of analysis and split

A trial starts with one paid 1.00 wager and finishes only after its full cascade/room/free-stage chain and every triggered door bonus settle. Base RTP includes all regular-group awards, including room multipliers and Fibonacci collection free stages. Bonus RTP includes door-pot credits only. Both divide by **paid** wagers; neither divides by the UI's Spins counter, free-stage count or bonus entries. The two contributions add to total RTP.

## Q02 — Fixed symbol distribution

| Tier | Total draw chance | One particular icon on a global draw |
| --- | --- | --- |
| Low | 49.5% | 9.9% |
| Mid | 27.0875% | 5.4175% |
| High | 16.2525% | 3.2505% |
| Scatter | 7.16% | 7.16% (one icon) |

Global preview/paid/free deals and uncollected refills choose regular indexes uniformly 0–4. After any room tier collects, regular refills force that room index with the same tier chances; Scatter still has 7.16%. No dynamic correction uses wins, wagers, room, session RTP or bankroll.

## Q03 — Retained rules

Regular wins still require 5/6/7+ identical symbols and pay the existing quantity paytable once per group. Room multipliers remain 14×2, 8×3, 5×5, 3×8. Partial rooms receive free extra clears until collection completes; completed rooms award Fibonacci stages capped at x144. First 6+ evaluated Scatters per room award exact-count moves. Doors remain Coin 35%, accumulated-pot Multiplier 25%, Stairs 5%, Ghost 35%, with the existing multiplier bag, floor-one start and cap six. Only symbol probabilities changed.

## Q04 — Search and permutations

Twenty coarse weight combinations and nine finer combinations were screened using complete chains, retaining Low > Mid > High and Mid:High ratio 5:3 in the search grid. The subsequent ten-million-round and hundred-million-round pilots were tuning evidence, separate from the final held-out run. The hundred-million pilot used Scatter 7.165% and returned 96.07919143% (54.91421543% base, 41.164976% sampled doors); its conditional door expectation was 41.24771417%. An extended 1.7-billion-chain pilot at Scatter 7.157% returned 95.92931284% sampled RTP and 95.92564768% conditional-mean RTP. Two further 100-million-chain sensitivity pilots at Scatter 7.107% and 7.207% estimated a slope of 22.40152 RTP percentage points per Scatter percentage point. Final Scatter 7.16% predicts 95.99285% before the independent final seed. All **34 tuning profiles / 2,021,000,000 recorded tuning paid chains** remain separate from the final validation. The deliberately stopped extended pilot is marked incomplete against its original requested target; only complete checkpointed paid chains are tuning observations. See [search evidence](studies/rtp-weight-search.json).

All **120** regular-icon/room label permutations were checked in each of five rooms: 600 symmetry cases preserve group wins, room bonuses, collection, removal and targeted refill behavior. This is not exhaustive enumeration of 16^25 boards or unbounded play histories. Door positions share the same prize-draw path and odds.

## Q05 — Equivalence and resume verification

The optimized runner matched production helpers over **30,000 full paid chains**, using streams 0, 1 and 7. Every trial matched exact base cents, BigInt bonus cents, ending room, all four PRNG state words and RNG-call count. A separate ten-million-chain benchmark matched the independent C# reference exactly in credits/state/counters. The integer-threshold optimization reproduced that entire benchmark exactly.

Native integer comparisons are exact equivalents for the injected uint32 stream: `u / 2^32 < t` iff `u < ceil(t × 2^32)`, and uniform small-index draws use `(uint64(u) × N) >> 32`. No approximate board sampling is used. Checkpoint resume at 10,000 of 20,000 paid rounds matched an uninterrupted run in every payout, state and counter; elapsed wall time is excluded from that comparison. Conditional door expectation independently reconstructed from the move histogram also matched.

The live [controller](../../src/main.ts) was also audited: `requestRound`, `resolveRound`, `checkScatterBonus`, `chooseBonusDoor` and `returnFromBonus` preserve the modeled order, one Scatter award per room, exact incremental door credit and continued base resolution. Animations consume no payout RNG draws.

## Q06 — Final run setup

- Seed `20261105`, eight workers, **1,250,000,000 paid rounds per worker**.
- Blackman/Vigna [xoshiro128** 1.1 with jump](https://prng.di.unimi.it/xoshiro128starstar.c); worker i starts at jump^i of the seeded state. Streams are separated by 2^64 generator steps; recorded call counts must stay below that distance.
- All real door outcomes are sampled. The conditional expected-door statistic is separate diagnostic evidence and never replaces sampled bonus payouts.
- Production continues to use `Math.random`. The laboratory uses a longer-state injected PRNG rather than repeating the historical 32-bit Mulberry32 stream at this sample volume.
- Frozen configuration, source/binary SHA-256 hashes, start/end timestamps, exact totals and worker records are preserved in the final raw report.

## Q07 — Final validation results

**Completed:** seed 20261105, eight shards of 1,250,000,000 paid chains each. All configuration, stream-distance and accounting audits passed. The frozen source and native-binary hashes match the audited files.

| Contribution | Measured RTP | Approximate 95% interval |
| --- | --- | --- |
| Base regular awards, including collection free stages | 54.893894% | 54.890274–54.897515% |
| Door bonuses | 41.085605% | 41.062486–41.108724% |
| **Total** | **95.979499%** | **95.955903–96.003096%** |

- Paid wagers: **1000000000000 cents**; exact awards: base **548938944848** + doors **410856049200** = **959794994048 cents**.
- Positive-award hit rate: **46.939274%**. Winning groups: Low **10,974,406,669** > Mid **3,629,522,289** > High **1,906,302,048**; Low remains the most frequent paying tier.
- Observed **1,784,166,933** collection free stages and **1,547,682,752** extra clears. The longest chain reached **12 free stages**; **77 free stages** used the capped x144 multiplier, including repeats. Maximum 61 logical board evaluations in one paid chain.
- Observed **339,853,073** door bonuses / **2,144,073,632** moves, and **738,506,229,396** RNG calls across all streams. Zero truncated chains.
- Separate variance-reduced diagnostic: **95.995827%** total using conditional door expectation, standard error **0.003444 percentage points**. The table above uses actual sampled awards.

Start with the [compact machine-readable summary](studies/rtp-10b-summary.json). The [full raw report](studies/rtp-10b.json) contains exact totals, worker records, hashes, timings and counters. The [convergence CSV](studies/rtp-10b-convergence.csv) contains **125 fixed prefixes**, each adding 80,000,000 paid chains, ending at the same ten-billion-round totals. [Tuning evidence](studies/rtp-weight-search.json) is separate.

All **31 automated tests** and the production build passed. The published-data regression verifies current configuration, exact ten-billion count, shard/counter consistency, component ranges and statistics recomputed from all shards. The interval includes the 96% target. Finite simulation remains a measurement of this prototype.

## Q08 — Statistical interpretation

The target describes long-run return, not guaranteed session results. Empirical standard errors use complete-paid-chain variance; total variance includes base/bonus covariance. Approximate 95% intervals are `mean ± 1.96 × standard error`. Exact monetary totals are decimal integer strings; floating point is used only for statistical summaries. Repeated pot multipliers and late Fibonacci stages create tails. Ten billion trials do not certify exact theoretical RTP or enumerate every possible chain.

## Q09 — Failures, accounting and checkpoints

The simulator has a diagnostic one-million-evaluation-per-chain guard and checked total-bonus overflow. It aborts rather than crediting an incomplete chain as zero or truncating a payout. The game has no such diagnostic limit. A report is complete only when the requested paid-round count is reached across all shards with the frozen configuration and valid stream distances. Paid-boundary checkpoints preserve current room, RNG and all counters; board/collection state resets on the next paid round.

## Q10 — Reproduce and maintain

```powershell
node scripts/rtp/build.mjs --zig=.rtp-runs/tools/fast/zig-x86_64-windows-0.14.1/zig.exe
$env:RTP_ENGINE='.rtp-runs/native.exe'
node scripts/rtp/verify.mjs 10000 --legacy
node scripts/rtp/run.mjs --rounds=10000000000 --workers=8 --config=docs/game-rules/studies/rtp-10b-config.json --dir=.rtp-runs/reproduction-10b
```

For a small production-helper smoke run: `npm run simulate -- --rounds=100000 --seed=20261105 --keep-scatters=off`. It uses the historical Mulberry32 RNG, so its exact results differ from the native run. Reproduce historical studies with their explicit original weights and feature-disable flags; their old measured RTP values are preserved, not overwritten. Recalibrate after changing payouts, weights, room progression, Scatter policy, door prizes or multiplier bags.
