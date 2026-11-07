---
document_type: analysis_handoff
ruleset_id: fool-house-2026-11-07-v14
context: implemented scope, correct simulation model, non-claims, evidence and maintenance
read_when: market-analysis brief, RTP study, comparison checklist, rules validation
branch_ids: X01-X10
---

# 06 — Market-analysis handoff and validation

**Context packet:** source-audited prototype specification, not external market research. Base 5×5 global-count cascades, room collection/Fibonacci stages and fixed 1.00 wagers now include playable Scatter door adventures. See [10](10-door-adventure.md) for bonus probabilities, accumulated-pot multipliers, floors and return.

**Authority:** [math](01-math.md), [round flow](02-round-flow.md), [stages](03-stages.md), [accounting](04-accounting.md), [runtime](05-runtime-ui.md), and their linked runtime sources. [rules.json](rules.json) supplies structured constants and source fingerprints.

## X01 — Implemented feature inventory

| Area | Implemented behavior | Not currently implemented |
| --- | --- | --- |
| Core outcome | 25 independent raw draws, correlated shared Mystery reveals, global regular identity counts | Reel strips, paylines, adjacency/cluster criteria, deck depletion |
| Wins | 5/6/7+ group paytable, simultaneous wins, hole refills | Per-symbol payment, gravity/drop-down, consecutive-reel requirements |
| Progression | Background-specific Low/Mid/High collection and free stages | Persistent progression between paid rounds or saved room collections |
| Escalation | Stage multipliers x1 → x2 → … → x144; cap then repeat x144 | Increasing multiplier on each ordinary refill, total round-win cap |
| Room award | Independent x2/x3/x5/x8 draw for every winning current-room identity; stacks with stage multiplier | Per-symbol multiplier rolls, bonus draws for sub-threshold or other-room symbols |
| Scatter | 3% nonpaying mansion, retained on ordinary refills; 6+ at final paid-chain settlement awards exact-count playable door moves and modal Continue | Direct Scatter cash award, Wild substitution, collection, Scatter draws inside doors (future retriggers reserved) |
| Economy | Fixed 1.00 paid wager; gross wins and observed session RTP | Variable bet, bankroll, deposits/withdrawals, insufficient-funds or cash-out controls |
| Controls | Click/tap, focused Enter/Space; busy inputs discarded | Autoplay, quick-stop, buy feature, user skip/cancel of a live chain |
| Delivery | Local browser prototype, responsive canvas, in-memory session | Accounts, persistence, server outcome generation, recovery/replay of interrupted rounds |

These are implementation facts for comparison. No claims about market demand, competitors, certified fairness, popularity, revenue, or commercial readiness have been researched in this task.

## X02 — Exact probabilities versus outcome statistics

For a **freshly drawn 25-cell board**, the linear expectations derived from the configured weights are:

| Category | Expected number of cells |
| --- | --- |
| All Low / one particular Low identity | 8.75 / 1.75 |
| All Mid / one particular Mid identity | 8.125 / 1.625 |
| All High / one particular High identity | 4.875 / 0.975 |
| Scatter | 0.75 |
| Mystery before reveal | 2.5 |

These are global-deal expectations, not settled-board counts. After collection starts, replacement regular icons are restricted to the active room's index: Low35%, Mid32.5%, High19.5%, Scatter3%, Mystery 10%. Rooms remain symmetric under index relabeling. Partial collection prevents settlement and adds free extra clears when stalled; see [11](11-room-refills.md).

## X03 — RTP status and analysis unit

- Current v14 rules preserve Scatters through room-feature clears and floor transitions, with at most one bonus per paid-round chain, triggered only after all base wins/features/free floors finish, and 10% shared floor Mysteries. Current calibrated weights/paytable are in [01](01-math.md); doors still seed from the whole base round win, with stairs15%, Coin30%, Multiplier4.73%, Ghost50.27%. The current held-out calibration evidence is in [15](15-current-balance.md). Raw draws are independent, while Mysteries share their wave's outcome. The v8 ten-billion-chain result is historical; see [13](13-scatter-persistence.md) for current behavior and [12](12-rtp-balance.md) for the archived study.
- Final evidence records observed rare stages and bonus tails. Finite samples do not prove a maximum win/duration; no fixed completion/refill-time bound is implemented.
- The UI's session RTP is a sample ratio of committed awards to paid wagers. A screenshot value, a constructed example, an old playtest, or a test assertion is not the mathematical expected RTP.
- Historical results from the old 5×4 board, 3/4/5+ threshold, per-symbol paytable, or pre-Scatter weights are not valid measurements of this snapshot.
- Use one **completed paid-round chain** as one outcome observation, including every free stage and refill. Analyze interrupted sessions separately.
- Current simulation includes room-only regular draws (one RNG per active hole), extra clears, door prizes and resumed base boards. Use `--room-refills=off` for older door studies; also `--door-bonus=off` for base-only history.

## X04 — Exact simulation transition contract

Animations can be omitted from a math simulation, but transition ordering cannot:

```text
initialize session counters; choose uniform preview room
show fixed nonwinning regular-only preview without board RNG or automatic phases; wait for input
for each accepted paid round:
    respin_number = 0; multiplier = 1; round_win = 0
    room = uniform(other_four_rooms)
    collection = empty; paid_chain_scatter_awarded = false; wager += 100; spins += 1
    board = full_independent_draw()
    loop:
        if board_has_mysteries: show_raw_results_for_500_ms_after_landing()
        board = reveal_all_mysteries_as_one_uniform_room_symbol(board, rng)
        groups = global_regular_groups_with_count_at_least_5(board)
        if groups is empty:
            if collection is partial AND at_least_five_regular_slots_remain:
                board = clear_regular_cells_preserve_scatter_then_room_only_refill()
                continue     # same room, collection, multiplier, Scatter guard; no wager/spin
            if this_paid_chain_has_not_awarded_scatter AND scatter_count(board) >= 6:
                mark_paid_chain_awarded; bonus = fresh_state(scatter_count(board), floor=1, starting_win=round_win)
                await explicit Continue
                while bonus_has_moves: bonus = apply_bonus_prize(bonus, draw_bonus_prize(rng))
                gain = bonus.total - bonus.starting_win
                round_win += gain; session_win += gain
                # Runtime credits each pot increase only; never re-credit carried base win. Return adds nothing.
            finish this paid round
        wins = apply_independent_room_rolls(groups, room, rng)
        award = sum(paytable[tier][min(count,7)] * multiplier * room_roll)
        board = remove_all_winning_positions(board)
        collection += tiers_of_wins_whose_index_equals_room_index
        round_win += award; session_win += award
        if collection contains low AND mid AND high:
            clear_regular_survivors_without_credit_keep_scatter_cells()
            room = uniform(other_four_rooms); collection = empty
            respin_number += 1; multiplier = capped_fibonacci(respin_number)
            spins += 1                     # no new wager; keep round_win
            board = fill_non_scatter_holes_from_global_pool()
        else:
            board = draw_only_null_positions(board, room_index_if_any_tier_collected)
```

Preview symbols are never evaluated/credited. The first paid room excludes the preview room, like all later room changes. The real implementation mutates paid-start counters after board generation; the loop above assumes successful valid draws. Use [02](02-round-flow.md)/[05](05-runtime-ui.md) to model failures or RNG-call order precisely.

## X05 — Important edge cases for comparison

| Case | Result |
| --- | --- |
| Four High plus any number of unrelated symbols | No award from those High symbols. |
| Five non-room Low, split across distant cells | One 0.01 award at stage x1, all five removed. |
| Seven or twenty-five non-room High of one identity | One0.10 award at stage x1; remove every member. |
| A matching-room identity wins | Apply one independent room roll to its entire group award, including later wins of already-collected tiers. |
| Several different identities win together | Sum all group awards before checking collection completion. |
| Visible target symbol is below the win threshold | No collection. |
| Repeated target-tier win after that tier is collected | Normal group payment, no extra collection count. |
| Completion during a winning batch | Pay all groups; skip refill; clear survivors without paying them. |
| Partial collection followed by no wins | Clear/refill regular cells free and retain Scatters/progress/multiplier/paid-chain guard. Fewer than five regular slots permits settlement, as does empty collection. |
| Twenty-five Scatter symbols | No regular win. If this paid chain has not awarded, run 25 bonus moves at settlement after Continue; Return then settles this unchanged all-Scatter board. Preview still awards nothing. |
| Another collection completes at x144 | Another free stage at x144; no automatic stop. |
| Input while an animation/free stage is running | Ignored, not queued and not charged. |
| Preview contains a winning combination | Unpaid display only; no award/collection. |

## X06 — Retention and limits matter

Unmatched symbols/Scatter persist during ordinary hole refills. The explicit exception is a stalled partially collected room: clear regular cells free, preserve Scatters and refill the current-room pool. With fewer than five regular slots, settle after any eligible bonus. Resampling all cells on every ordinary win, paying 7+ as multiple groups or incrementing stage multiplier per refill would be a different model.

There is no explicit refill-count, free-stage-count, or total paid-round award cap. x144 caps stage multiplication only; a room x8 can stack to effective x1152. The study script throws after 1,000,000 evaluations in one chain rather than silently settling a truncated round. No such ceiling is part of gameplay.

## X07 — Constructed settlement example

At stage x3, five Low, six Mid, and seven High, all with non-room indexes, pay:

```text
(0.01 + 0.03 + 0.10) * 3 = 0.42
```

If only that High group instead matches the room and draws x8, the same table counts pay `(0.01 + 0.03 + 0.10*8)*3 = 2.52`. All 18 cells are removed; survivors stay unless stage completion clears them. See [04](04-accounting.md) for a multi-stage accounting example; neither constructed example estimates RTP.

## X08 — Measurements to collect in a separate analysis

Record ruleset ID, RNG/seed policy, number of completed paid rounds, paid wagers, total awards, and truncated/error chains. Useful outputs are RTP with uncertainty, paid-round hit frequency, win-amount distribution, awards by tier/multiplier, refills per stage, free stages per paid round, set-completion frequency, chain duration under the specified timings, and cap reach frequency. Keep paid spins, free deals, and refills as separate counters.

The latest request authorizes a new ~96% calibration after all feature changes. Current evidence is in [15](15-current-balance.md); v8 remains archived in [12](12-rtp-balance.md); modules 07, 09, 10 and 11 preserve prior studies with explicit historical weights/flags. External market research remains outside this task.

## X09 — Evidence and coverage

All **43 tests passed** on 2026-11-07, including calibrated boundaries/distribution and all 120 room-label permutations in each of five rooms. Existing room-refill, payout, bonus-pot and progression tests remain covered. Native validation additionally matches exact production-helper per-round credits, ending room and RNG state, and verifies resumable checkpoints. Published-study tests audit the historical v8 configuration/accounting independently from current policy. New tests cover retained positions, RNG skipping, accumulation, paid-chain eligibility and the space limit. Current v11 isolated headless QA additionally exercised a paid Hall win, a stalled-room clear, a free Basement win with six Scatters, then a free Hall settlement with seven. The first bonus popup appeared only after two free floors and all 1.16 base credits. It allocated seven moves; seven Ghost moves and Return preserved the settled board, with no duplicate bonus, and the next paid round reset correctly. No page errors. C++ replay matched 30,000 full chains; C# and legacy replay matched 3,000 each, including checkpoint continuity. These are functional checks, with no RTP claim.

The original v9 desktop check was blocked; isolated headless v10 Mystery checks passed for three outcomes, timing, input lock and mobile/desktop layouts. See [12](12-rtp-balance.md).

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
| Scatter threshold/count 0–25, holes, no mutation or regular payout | B02–B03 |

Current regression coverage adds 46 Node tests and 72 Playwright cases with 68 PNG and 7 scene snapshots. Browser JavaScript coverage is 96.43% lines, 96.62% functions and 92.50% branches across main/game/bonus/bonus-scene/scene. This is measured execution coverage, not proof of every possible board. Deterministic clock/RNG scenarios, loading/error checks, baseline review and CI scope are documented in [the testing plan](../TESTING.md). Prior temporary checks remain historical evidence in `CHANGELOG.md` and [07](07-calibration.md).

## X10 — Agent loading and staleness protocol

1. Read [AGENT_RULES.md](../../AGENT_RULES.md) for the compact packet and module catalogue. The separate [GAME_RULES.md](../../GAME_RULES.md) explains play in simple language.
2. Load only the module needed for the question. Stable IDs can be located with `rg -n 'M10|F13|C09' docs/game-rules`.
3. For constants, use `rules.json`. Its paths are relative to the project root, and its raw-byte SHA-256 hashes identify the audited sources.
4. If code/hash differs, inspect only the changed source/functions. Do not merge historical rules into current behavior or assume this snapshot overrides code.
5. Update the affected modules and facts together after an authorized rule change; log the change and refresh fingerprints. Do not alter game logic just to make documentation true.

Current raw probabilities and the shared transformation contract are in [14](14-mystery.md). Historical study expectations do not describe current Mystery-resolved boards.
