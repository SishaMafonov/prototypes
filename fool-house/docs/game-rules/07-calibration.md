---
document_type: calibration_study
ruleset_id: fool-house-2026-10-25-v2
context: room award distribution, selected weights, measured return and match frequency
read_when: balance review, reproduce simulation, understand weight tradeoffs
branch_ids: R01-R08
---

# 07 — Room bonus and prototype calibration

**Context packet:** fixed 1.00 paid wager; 25 independent cells; regular 5/6/7+ group awards; hole refills; collection-driven free stages at Fibonacci x2…x144. The user confirmed one random bonus per winning current-room group and a target of approximately 96% RTP. The paytable, five uniform indexes per tier, and 5% nonpaying Scatter were retained.

**Authority:** [src/game.ts](../../src/game.ts), [scripts/simulate.mjs](../../scripts/simulate.mjs), [combined study](studies/room-bonus-combined.json), and the two raw independent validation outputs linked below.

## R01 — Room multiplier distribution

Every eligible winning group independently samples one of the exact 30 slots supplied by the user:

| Room multiplier | Slots | Probability |
| --- | --- | --- |
| x2 | 14 | 46.6667% |
| x3 | 8 | 26.6667% |
| x5 | 5 | 16.6667% |
| x8 | 3 | 10% |

Expected eligible-group multiplier = `(14*2 + 8*3 + 5*5 + 3*8)/30 = 101/30 ≈ 3.3667`. Other-room groups have x1. Draws occur only after a qualifying win, once per matching group, including repeated wins of collected tiers. This is not a bonus roll per member symbol and not a single shared roll for the whole batch.

## R02 — Selected weights and design tradeoff

| Tier | Previous weight | Selected weight |
| --- | --- | --- |
| Low | 57% | 14.66% |
| Mid | 23.75% | 10% |
| High | 14.25% | 70.34% |
| Scatter | 5% | 5% |

High becomes the common symbol tier. This is intentional: with the unchanged small group awards, concentrating probability in High increases both match frequency and return while keeping chains shorter than the tested Low-heavy alternative. These names now describe payout tiers rather than rarity order.

An exploratory 100,000-round Low-heavy run at 90/3.125/1.875/5 produced about 92.35% RTP, 99.88% hits, and 8.44 winning batches per paid round. The selected profile averages about 2.48 batches. That alternative was not selected; it would make nearly every round win a small amount and substantially lengthen the animation sequence. No room-index bias or dynamic RTP adjustment was introduced.

## R03 — Baseline and tuning evidence

| Run | Paid rounds | RTP estimate | Paid-round hit rate |
| --- | --- | --- | --- |
| [Previous game, no room bonus](studies/previous-baseline.json), seed 42 | 100,000 | 4.1343% | 62.929% |
| [Previous weights plus room bonus](studies/previous-weights-with-room-bonus.json), seed 42 | 100,000 | 6.07206% | 62.719% |
| [Tuning candidate High 70.5%](studies/room-bonus-candidate.json), seed 1729 | 1,000,000 | 97.25362% | 88.3403% |
| [Tuning candidate High 70.3%](studies/high-heavy-candidate.json), seed 1729 | 1,000,000 | 95.669974% | 88.0606% |

The selected High 70.34% lies between those tuning candidates; its validation uses fresh seeds, not the tuning seed. Baseline versus room-bonus runs consume different RNG streams once bonus rolls are added, so the small baseline hit-rate difference is sampling variation, not a change in initial symbol weights.

## R04 — Independent validation

| Run | Seed | Paid rounds | RTP | Approximate 95% RTP interval |
| --- | --- | --- | --- | --- |
| [Validation A](studies/room-bonus-validation-a.json) | 20261025 | 1,000,000 | 96.097274% | 95.9278–96.2668% |
| [Validation B](studies/room-bonus-validation-b.json) | 857 | 1,000,000 | 96.054006% | 95.8846–96.2234% |
| [Combined](studies/room-bonus-combined.json) | Both | 2,000,000 | **96.07564%** | **95.9558–96.1955%** |

Combined totals: wager 200,000,000 cents; awards 192,151,280 cents. Hit rate = **88.1421%** (any positive gross award, not necessarily profit). Winning batches per paid round = 2.4842835; boosted room groups per paid round = 0.6826685. The hit-rate increase versus the old-game sample is about 25.21 percentage points.

## R05 — Reproduction and truncation policy

Run from `fool-house/` with Node.js 24+:

```text
npm run simulate -- --rounds=1000000 --seed=20261025
npm run simulate -- --rounds=1000000 --seed=857
npm run simulate -- --rounds=100000 --seed=42 --weights=57,23.75,14.25,5 --bonus=off
npm run simulate -- --rounds=100000 --seed=42 --weights=57,23.75,14.25,5
```

`--weights=low,mid,high,scatter` supplies a candidate percentage vector; default is the shipped constants. `--out=path.json` saves the raw result. `--bonus=off` reproduces the earlier no-room-bonus math. The script uses a seeded Mulberry32-style generator and the production draw, win, room-bonus, removal, refill, collection, and stage-multiplier helpers. It consumes the unpaid preview draws without awarding them, then simulates complete paid-round chains with exact room exclusion and bonus draw ordering.

No UI timing is simulated. If a chain exceeds 1,000,000 evaluations, the script throws instead of recording it as settled. Validation observed zero truncated chains. This diagnostic guard is not a new runtime gameplay limit.

## R06 — Estimate limitations and rare features

The target is approximately 96%, not an exact guarantee or certification. The reported interval is `mean ± 1.96*standard_error`, using observed paid-round variance and pooled runs. It does not bound unobserved rare multiplier tails or replace a fuller mathematical assessment.

Only **63 free stages** occurred in two million paid rounds; all were first respins at stage x2. No validation chain reached stage x3 or x144. Collection remains a rare event under this profile, because Low/Mid room groups are uncommon. Later-stage arithmetic/caps are unit-tested, but their long-run tail contribution is not empirically calibrated here. The largest observed paid-round win was 10.20 credits; it is not a configured maximum.

## R07 — Visual and accounting check

A temporary deterministic browser fixture made three Hall groups win together at stage x1:

| Group | Table award | Independent room roll | Final award |
| --- | --- | --- | --- |
| Five Low[1] | 0.01 | x2 | 0.02 |
| Five Mid[1] | 0.05 | x3 | 0.15 |
| Five High[1] | 0.10 | x8 | 0.80 |

The separate reveal showed all three rows, then credited exactly **0.97 once** after removal. Collection completed; a new room dealt free at stage x2 and settled without another win. Final counters: Spins 2, paid wager 1.00, Round/Session win 0.97, sample RTP 97.00%. This constructed case verifies accounting and animation, not the RTP estimate. Desktop and 440×956 layouts were checked; the fixture is not shipped.

## R08 — Maintenance and further balance work

Any change to the paytable, threshold, draw weights, index distribution, bag duplicates, bonus eligibility, retention, collection, or stage progression invalidates this calibration. Re-run independent validation and refresh source fingerprints/structured facts. Inspect free-stage tail coverage separately before interpreting these samples as a complete long-run balance model. No hidden adaptive odds or outcome steering should be inferred from this static study.
