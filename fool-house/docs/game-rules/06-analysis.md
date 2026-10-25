---
document_type: analysis_handoff
ruleset_id: fool-house-2026-10-25-v2
context: implemented scope, correct simulation model, non-claims, evidence and maintenance
read_when: market-analysis brief, RTP study, comparison checklist, rules validation
branch_ids: X01-X10
---

# 06 — Market-analysis handoff and validation

**Context packet:** this is a source-audited prototype specification, not external market research. The product is a themed 5×5 global-count game with fixed 1.00 paid rounds, in-place winning-symbol refills, three-tier background collections, and automatically increasing free-stage multipliers. Scatter is integrated visually and probabilistically but has no feature.

**Authority:** [math](01-math.md), [round flow](02-round-flow.md), [stages](03-stages.md), [accounting](04-accounting.md), [runtime](05-runtime-ui.md), and their linked runtime sources. [rules.json](rules.json) supplies structured constants and source fingerprints.

## X01 — Implemented feature inventory

| Area | Implemented behavior | Not currently implemented |
| --- | --- | --- |
| Core outcome | 25 independent weighted cells, global identity counts | Reel strips, paylines, adjacency/cluster criteria, deck depletion |
| Wins | 5/6/7+ group paytable, simultaneous wins, hole refills | Per-symbol payment, gravity/drop-down, consecutive-reel requirements |
| Progression | Background-specific Low/Mid/High collection and free stages | Persistent progression between paid rounds or saved room collections |
| Escalation | Stage multipliers x1 → x2 → … → x144; cap then repeat x144 | Increasing multiplier on each ordinary refill, finite free-spin allocation, total round-win cap |
| Room award | Independent x2/x3/x5/x8 draw for every winning current-room identity; stacks with stage multiplier | Per-symbol multiplier rolls, bonus draws for sub-threshold or other-room symbols |
| Scatter | 5% nonpaying mansion, purple frame/label, retained during refills | Scatter award, Wild substitution, Scatter collection or feature trigger |
| Economy | Fixed 1.00 paid wager; gross wins and observed session RTP | Variable bet, bankroll, deposits/withdrawals, insufficient-funds or cash-out controls |
| Controls | Click/tap, focused Enter/Space; busy inputs discarded | Autoplay, quick-stop, buy feature, user skip/cancel of a live chain |
| Delivery | Local browser prototype, responsive canvas, in-memory session | Accounts, persistence, server outcome generation, recovery/replay of interrupted rounds |

These are implementation facts for comparison. No claims about market demand, competitors, certified fairness, popularity, revenue, or commercial readiness have been researched in this task.

## X02 — Exact probabilities versus outcome statistics

For a **freshly drawn 25-cell board**, the linear expectations derived from the configured weights are:

| Category | Expected number of cells |
| --- | --- |
| All Low / one particular Low identity | 3.665 / 0.733 |
| All Mid / one particular Mid identity | 2.5 / 0.5 |
| All High / one particular High identity | 17.585 / 3.517 |
| Scatter | 1.25 |

These are per-draw expectations, not settled-board counts. Each room boosts a different uniformly weighted index; rooms remain mechanically symmetric under index relabeling. The active room changes which winning identities get room bonuses, not their draw probabilities.

## X03 — RTP status and analysis unit

- Two independent million-round validation runs estimate RTP at 96.07564% (approximate 95% interval 95.9558–96.1955%) and paid-round hit frequency at 88.1421%. See [07](07-calibration.md) for raw outputs, methodology, and limitations. This is not an exact or certified long-run RTP.
- Rare later Fibonacci stages were not observed in these runs; their tail contribution and worst-case duration are not empirically calibrated. Volatility/maximum duration are not comprehensively characterized.
- The UI's session RTP is a sample ratio of committed awards to paid wagers. A screenshot value, a constructed example, an old playtest, or a test assertion is not the mathematical expected RTP.
- Historical results from the old 5×4 board, 3/4/5+ threshold, per-symbol paytable, or pre-Scatter weights are not valid measurements of this snapshot.
- Use one **completed paid-round chain** as one outcome observation, including every free stage and refill. Analyze interrupted sessions separately.

## X04 — Exact simulation transition contract

Animations can be omitted from a math simulation, but transition ordering cannot:

```text
initialize session counters; choose uniform preview room
for each accepted paid round:
    respin_number = 0; multiplier = 1; round_win = 0
    room = uniform(other_four_rooms)
    collection = empty; wager += 100; spins += 1
    board = full_independent_draw()
    loop:
        groups = global_regular_groups_with_count_at_least_5(board)
        if groups is empty: finish this paid round
        wins = apply_independent_room_rolls(groups, room, rng)
        award = sum(paytable[tier][min(count,7)] * multiplier * room_roll)
        board = remove_all_winning_positions(board)
        collection += tiers_of_wins_whose_index_equals_room_index
        round_win += award; session_win += award
        if collection contains low AND mid AND high:
            discard_all_survivors_and_scatter()
            room = uniform(other_four_rooms); collection = empty
            respin_number += 1; multiplier = capped_fibonacci(respin_number)
            spins += 1                     # no new wager; keep round_win
            board = full_independent_draw()
        else:
            board = draw_only_null_positions(board)
```

Preview symbols are never evaluated/credited. The first paid room excludes the preview room, like all later room changes. The real implementation mutates paid-start counters after board generation; the loop above assumes successful valid draws. Use [02](02-round-flow.md)/[05](05-runtime-ui.md) to model failures or RNG-call order precisely.

## X05 — Important edge cases for comparison

| Case | Result |
| --- | --- |
| Four High plus any number of unrelated symbols | No award from those High symbols. |
| Five non-room Low, split across distant cells | One 0.01 award at stage x1, all five removed. |
| Seven or twenty-five non-room High of one identity | One 0.50 award at stage x1; remove every member. |
| A matching-room identity wins | Apply one independent room roll to its entire group award, including later wins of already-collected tiers. |
| Several different identities win together | Sum all group awards before checking collection completion. |
| Visible target symbol is below the win threshold | No collection. |
| Repeated target-tier win after that tier is collected | Normal group payment, no extra collection count. |
| Completion during a winning batch | Pay all groups; skip refill; clear survivors without paying them. |
| Incomplete collection followed by no wins | End the chain; display partial progress, discard it at next paid room change. |
| Twenty-five Scatter symbols | No regular win and no Scatter feature; chain ends if evaluated. |
| Another collection completes at x144 | Another free stage at x144; no automatic stop. |
| Input while an animation/free stage is running | Ignored, not queued and not charged. |
| Preview contains a winning combination | Unpaid display only; no award/collection. |

## X06 — Retention and limits matter

Unmatched symbols, including Scatter, persist through ordinary refills. Resampling the whole board on each refill, removing Scatters, paying 7+ as multiple groups, or incrementing a multiplier every refill produces a different game model.

There is no explicit refill-count, free-stage-count, or total paid-round award cap. x144 caps stage multiplication only; a room x8 can stack to effective x1152. The study script throws after 1,000,000 evaluations in one chain rather than silently settling a truncated round. No such ceiling is part of gameplay.

## X07 — Constructed settlement example

At stage x3, five Low, six Mid, and seven High, all with non-room indexes, pay:

```text
(0.01 + 0.10 + 0.50) * 3 = 1.83
```

If only that High group instead matches the room and draws x8, the same table counts pay `(0.01 + 0.10 + 0.50*8)*3 = 12.33`. All 18 cells are removed; survivors stay unless stage completion clears them. See [04](04-accounting.md) for a multi-stage accounting example; neither constructed example estimates RTP.

## X08 — Measurements to collect in a separate analysis

Record ruleset ID, RNG/seed policy, number of completed paid rounds, paid wagers, total awards, and truncated/error chains. Useful outputs are RTP with uncertainty, paid-round hit frequency, win-amount distribution, awards by tier/multiplier, refills per stage, free stages per paid round, set-completion frequency, chain duration under the specified timings, and cap reach frequency. Keep paid spins, free deals, and refills as separate counters.

The user confirmed a target of about 96% and one room roll per matching group. The implemented calibration and study are in [07](07-calibration.md); external market research remains outside this task.

## X09 — Evidence and coverage

All **15 tests passed** on 2026-10-25 for this implementation:

| Test area | Documented decisions it exercises |
| --- | --- |
| Draw boundaries and total weight | M01–M04 |
| Every regular icon reachable | M05 |
| Full 25-cell draw, independent samples | M06 |
| Seeded sample across 16 identities | Probability table; not full-game RTP |
| Five global matches versus four/tier-only/index-only | M09–M10 |
| Every tier, counts 2–25, x1/x2/x144 | M10–M14 |
| Simultaneous group awards | M14 |
| Removal/refill preservation | M15–M18 |
| Scatter exclusion, preservation, and refill draw | M04, M08, M16–M17 |
| Consecutive replacement wins and settlement | M18, F12 |
| Collection persistence and filtering | C04–C08 |
| Fibonacci sequence and cap | C10–C11 |
| All 30 room-bag slots and duplicate counts | M19 |
| Independent eligible-group draws, zero RNG for nonmatches | M19–M21 |
| Room/stage stacking through x144 and repeat-group eligibility | M21, C14 |

Runtime/error branches are source-audited, not claimed as full automated coverage. The build passed. New desktop/mobile browser checks verified separate room reveals, three simultaneous rolls, exact crediting, locked input, and the subsequent free stage. The temporary fixture was removed; details are in `CHANGELOG.md` and [07](07-calibration.md).

## X10 — Agent loading and staleness protocol

1. Read [GAME_RULES.md](../../GAME_RULES.md) for the compact packet and module catalogue.
2. Load only the module needed for the question. Stable IDs can be located with `rg -n 'M10|F13|C09' docs/game-rules`.
3. For constants, use `rules.json`. Its paths are relative to the project root, and its raw-byte SHA-256 hashes identify the audited sources.
4. If code/hash differs, inspect only the changed source/functions. Do not merge historical rules into current behavior or assume this snapshot overrides code.
5. Update the affected modules and facts together after an authorized rule change; log the change and refresh fingerprints. Do not alter game logic just to make documentation true.
