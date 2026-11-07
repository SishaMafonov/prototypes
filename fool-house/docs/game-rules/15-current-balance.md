---
document_type: rules_module
ruleset_id: fool-house-2026-11-07-v14
context: active ~96% combined paid-chain RTP, current weights/paytable, fixed profile, independent validation and statistical limits
read_when: current RTP, base/bonus contribution, calibration provenance, reproduction or historical comparison
branch_ids: V01-V10
---

# 15 — Current combined-game calibration

**Context packet:** one paid bet remains1.00. The target is ~96% for the **whole paid chain**, with50–60 percentage points from regular base/free-floor wins and the remainder from incremental bonus gains. The carried base seed is counted once. Mystery10%, stairs15%, full-room progression, retained Scatters, Fibonacci stages, x2–x8 door values and1.00–6.00 floor coins remain active. This module supersedes earlier “unmeasured/deferred” statements for the active v14 profile; archived studies keep their own configurations.

**Authority:** [game.ts](../../src/game.ts), [bonus.ts](../../src/bonus.ts), [configuration](../../scripts/rtp/config.mjs), [profile search](../../scripts/rtp/calibrate.mjs), [paid-chain runner](../../scripts/rtp/run.mjs), [current audit tests](../../tests/current-calibration.test.mjs).

## Frozen game parameters

| Parameter | Current value |
| --- | --- |
| Raw cell weights | Low35%, Mid32.5%, High19.5%, Scatter3%, Mystery10% |
| Low5/6/7+ award at x1 | 0.01 /0.02 /0.03 |
| Mid5/6/7+ award at x1 | 0.02 /0.03 /0.05 |
| High5/6/7+ award at x1 | 0.03 /0.05 /0.10 |
| Door category chances | Coin30%, Multiplier4.73%, Stairs15%, Ghost50.27% |
| Door multiplier bag | `[2,2,2,2,2,3,3,5,5,8]`, mean3.4 |
| Coin award | Current bonus floor ×1.00, floor1–6 |
| Bonus seed | Entire settled base-chain win; only later pot increases are credited |

Lower regular group awards and less frequent door compounding fund the retained features. Every qualifying group still pays positive integer cents, grows with quantity, and pays more for High than Mid than Low at the same count. Raw regular frequency stays Low > Mid > High. Multiplier values, room bag and stage cap are not reduced.

## Independent held-out result

Completed **1,000,000,000 paid chains**, eight streams ×125,000,000, fixed seed20261111. The frozen run returned96,053,617,713 cents on100,000,000,000 wagered cents.

| Contribution | Observed RTP | Approximate95% interval |
| --- | --- | --- |
| Base, including all free floors | 54.888925116% | 54.881378239–54.896471993% |
| Incremental bonus gains | 41.164692597% | 41.110551347–41.218833847% |
| Combined | **96.053617713%** | **95.997804636–96.109430790%** |

Separate conditional door diagnostic:96.026092997% combined, with standard error0.009702003 percentage points. The primary estimate above uses actual sampled payouts. Observed bonus frequency5.3547973% (about1 in18.68 paid rounds), hit rate53.1629135%, free stages0.625409208 per paid round. All1,625,409,208 paid/free deals and373,008,087 door moves belong to the same billion paid observations. Zero truncated chains. Largest observed chain used108 evaluations and12 free floors;313 free stages reached the x144 cap. These finite observations do not establish maximum possible win or duration.

Tuning used84 profiles/303,000,000 complete exploratory chains, including the100-million pilot, plus a separate1-million prebalance baseline. None count toward the billion held-out rounds. Observed prebalance baseline was39,000.361878% RTP; it is a small noisy diagnostic of v13, not a calibrated return.

The [raw report](studies/rtp-v14-1b.json), [compact summary](studies/rtp-v14-1b-summary.json), [convergence prefixes](studies/rtp-v14-1b-convergence.csv) and [exploratory profiles](studies/rtp-v14-search.json) contain the reproducible evidence. Search/pilot rounds are excluded from the held-out count. The earlier [ten-billion v8 study](12-rtp-balance.md) belongs to a different game model.

## Branch and audit contract

| ID | Condition / decision | Exact interpretation |
| --- | --- | --- |
| V01 | Raw gameplay draw | Use the frozen five-weight pool. Mystery remains one shared uniform current-room reveal; global regular indexes remain uniform, collected-room refills pin the room index. No adaptive RTP, wager-based steering or loss compensation. |
| V02 | Regular group qualifies | Apply current integer-cent5/6/7+ table, then stage and room multipliers. Pay the whole group once, remove every member and continue the existing refill/floor chain. |
| V03 | Paid chain reaches Scatter entry | Keep final-chain timing, retained positions, exact final6+ move count and once-per-paid-chain guard. A fresh paid start resets; preview is nonwinning and consumes no board RNG. |
| V04 | Bonus changes the round pot | Base contribution includes all regular awards over the paid/free-floor chain. Bonus contribution is final combined pot minus the carried seed. Entry/Return add nothing. Combined RTP is their sum on the same paid wager; neither component is separately targeted at96%. |
| V05 | Profile is exploratory | Store each full configuration, seed, raw record and observed/conditional summaries. Small noisy outcomes do not certify a profile. Profiles and the100-million pilot are excluded from final validation. |
| V06 | Profile is frozen | Use independent seed20261111 and eight jumped streams,125,000,000 complete paid chains each. Fixed target1,000,000,000; no outcome-based early stop, resampling, truncated-chain counting or tuning on the held-out result. |
| V07 | Accounting/implementation audit | Exact monetary totals are decimal strings, helper/engine per-round credits and RNG state match, and resumed checkpoints match uninterrupted runs. Verify tier awards, move/prize counts, stage counts, one bonus per chain, source/config/binary hashes and all completed shard targets. |
| V08 | RTP and uncertainty are reported | Actual sampled base+bonus awards are the primary estimate. Approximate95% interval uses per-paid-chain combined return variance, including covariance. A separate conditional expectation integrates door randomness given the base seed and awarded moves; it never replaces sampled cash awards. Finite Monte Carlo is not an exact theoretical proof or a guarantee for any short session. |
| V09 | Comparing old results | Preserve original v8 reports, hashes and results. v13's carried-pot high-multiplier baseline was uncalibrated. Current evidence must use the matching v14 configuration; do not relabel old ten-billion outcomes as current. |
| V10 | Historical replay | `--legacy` verifies archived v8 weights/door odds/paytable and feature flags. Small JS historical runs use original explicit weights/flags and `--paytable=legacy`; v13 adds `--door-odds=v13`, earlier zero-pot persistence snapshots use `--bonus-pot=zero --door-odds=legacy`. Native frozen JSON configurations preserve complete historical math. |

For a starting seedB andN moves, expected bonus gain is the zero-seed expected pot plus `B × (g^N −1)`, where `g=1+0.0473×(3.4−1)=1.11352`. Floor probability advances with15% stairs and caps at6. `BonusSeedCentsByMoves` plus `BonusByMoves` independently reconstruct the conditional diagnostic. The actual engine still samples every door.

## Verification and reproduction

Rule tests cover all quantities2–25, payout ordering, draw boundaries, current-room refills, persistent Scatters, shared Mysteries, combined-pot credits, all ten multiplier slots, floor cap and all120 room-label permutations in each of five rooms (600 symmetry cases). This does not enumerate every possible board or unbounded play sequence.

```powershell
npm test
npm run build
node scripts/rtp/verify.mjs 10000
node scripts/rtp/verify.mjs 1000 --legacy
node scripts/rtp/run.mjs --rounds=1000000000 --workers=8 --seed=20261111 --batch=10000000 --dir=.rtp-runs/reproduce-v14
```

Use a fresh output directory. Checkpoints can resume only with the same frozen configuration and engine. Keep source/binary provenance with the report; native engine build/replay details are in the [laboratory guide](../../scripts/rtp/README.md).
