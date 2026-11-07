---
document_type: calibration_study
ruleset_id: fool-house-2026-10-31-v4
context: Low > Mid > High draw/win frequency, original payout-rebalance deferral, historical Monte Carlo
read_when: historical weight decision, tier rarity correction, original simulation evidence
branch_ids: K01-K06
---

# 09 — Historical tier-frequency correction

**Historical base-only study:** doors and room-specific refills/extra clears now add payouts. See [12](12-rtp-balance.md) for current weights and results; reproduce this snapshot with `--weights=57,23.75,14.25,5 --door-bonus=off --room-refills=off`.

**Context packet:** the user corrected the prior High-heavy model and explicitly chose Low 57%, Mid 23.75%, High 14.25%, Scatter 5%, with payout rebalancing later. This supersedes the old ~96% calibration. The existing 5/6/7+ paytable, room bag, Fibonacci stages, uniform regular indexes and Scatter entry remain unchanged.

**Authority:** [src/game.ts](../../src/game.ts), [simulation](../../scripts/simulate.mjs), [raw validation](studies/tier-order-validation.json). Historical evidence remains in [07](07-calibration.md).

## K01 — Draw order and identity probabilities

| Tier | Total draw probability | One specific icon | Expected cells on fresh 25-cell board |
| --- | --- | --- | --- |
| Low | 57% | 11.4% | 14.25 |
| Mid | 23.75% | 4.75% | 5.9375 |
| High | 14.25% | 2.85% | 3.5625 |
| Scatter | 5% | 5% (one icon) | 1.25 |

Low must remain more frequent than Mid, and Mid more frequent than High. These are independent draw probabilities, not guaranteed board quotas. All board generation/refills use the same static distribution. No odds depend on session RTP or previous wins.

## K02 — Payout decision and superseded target

The user was given the tradeoff: weights alone can approach 96% with roughly 90% Low but much longer cascades/rare Mid and High, or use the broader 57/23.75/14.25 split and rebalance payouts later. The user selected the latter. Keep the current paytable intact for this change; do not claim that it returns about 96% under these weights. Implementing bonus move payouts will require another balance study.

## K03 — Validation and actual win frequency

One million complete paid rounds, seed `20261031`, produced:

| Metric | Observed result |
| --- | --- |
| Gross RTP | 6.09404% |
| Approximate 95% RTP interval | 6.07387–6.11421% |
| Any-positive-award hit rate | 62.8208% |
| Low winning groups | 1,281,630 |
| Mid winning groups | 81,723 |
| High winning groups | 9,718 |
| Low / Mid / High awards, cents | 5,235,300 / 698,515 / 160,225 |
| Winning batches per paid round | 1.15031 |
| Free collection stages | 67, all at x2 |
| Largest observed round award | 2.72 credits |
| Truncated chains | 0 |

Groups include every win in refills/free stages; several groups can occur in one batch or paid round. Thus counts are not paid-round hit probabilities. Both group counts and award totals now follow Low > Mid > High in this sample. All total awards sum to 6,094,040 cents on 100,000,000 wagered cents.

## K04 — Reproduce

```text
npm run simulate -- --rounds=1000000 --seed=20261031 --weights=57,23.75,14.25,5 --door-bonus=off --room-refills=off --out=docs/game-rules/studies/tier-order-validation.json --keep-scatters=off
```

The simulator uses production helpers. New `winningGroupsByTier` and `awardsCentsByTier` counters measure the hierarchy without extra RNG draws. Existing historical JSON outputs intentionally do not contain these new fields.

## K05 — Limits

This is prototype Monte Carlo evidence, not exact/certified RTP. The interval uses observed paid-round variance and does not bound unobserved later Fibonacci tails. No stage x3 or above occurred. Saved Scatter moves are not yet played, so their future payouts and modal timing are excluded. The existing diagnostic evaluation limit fails instead of silently counting incomplete chains.

The current door feature resumes the base board after its final reveal/Return, but its payouts are excluded from this historical study. Use the full-game simulation for the playable game.

## K06 — Regression and handoff

In this historical snapshot, the 16 math tests covered its draw boundaries, Low > Mid > High constraint, fixed Scatter rate, reachability of all five icons per tier, seeded draw frequencies, and all existing payout/refill/collection/room-multiplier/Scatter-trigger behavior. Future payout work should preserve the explicit rarity hierarchy, evaluate full paid-round chains including playable bonus moves when implemented, and publish a new study rather than editing historical files.
