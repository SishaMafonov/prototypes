---
document_type: rules_module
ruleset_id: fool-house-2026-10-25-v2
context: fixed wager, cumulative wins, spin count, observed session RTP
read_when: financial model, statistics, simulation denominators, reset behavior
branch_ids: A01-A12
---

# 04 — Session and award accounting

**Context packet:** one player-started round costs 1.00 and can contain several room stages. Refills and collection-triggered full-board respins are free. Regular groups of 5/6/7+ receive one tier/count award times the stage multiplier. Scatter does not pay. All monetary state is in integer cents of unspecified prototype credit units.

**Authority:** [src/main.ts](../../src/main.ts): `session`, `requestRound`, `resolveRound`, `renderStats`, `formatWin`. [src/game.ts](../../src/game.ts): `BET_CENTS`, `PAYTABLE_CENTS`, `findWins`.

## Stored state

| Field | Initial value | Meaning |
| --- | --- | --- |
| `spins` | 0 | Counted full-board deals: paid + free; excludes preview and refills. |
| `totalWagerCents` | 0 | Sum of accepted paid bets, each 100 cents. |
| `totalWinCents` | 0 | Sum of all committed group awards during this page session. |
| `roundWinCents` | 0 | Sum for the latest accepted paid round, including its entire free-stage chain. |

| ID | Event/condition | Mutation or output |
| --- | --- | --- |
| A01 | Accepted paid start reaches the accounting step | Add 1 spin; add 100 cents to total wager; reset Round win to 0. Prior session awards remain. The whole wager is recorded before its deal animation/resolution. |
| A02 | A completed collection creates a free stage | Add 1 spin; add zero wager; keep Round win and Session win; use the new multiplier for subsequent awards. |
| A03 | Ordinary hole refill | Add no spins and no wager. Even if every currently empty cell is replaced, it is still a refill. |
| A04 | A winning batch finishes removal | Add the sum of its already-multiplied group awards once to both win totals. Update the UI before refill or stage transition. A pre-removal “Win …” message announces an award that is not committed to counters until this point. |
| A05 | Paid-round chain ends normally | Keep Round win visible; it is the sum over all winning evaluations in all stages of that round. Zero-win rounds display 0.00. No additional end-of-round award or deduction. |
| A06 | Total wager equals 0 | Display RTP as `—`, including the unpaid preview. Never divide by zero. |
| A07 | Total wager is greater than 0 | Display `(totalWinCents / totalWagerCents * 100).toFixed(2) + "%"`. This is observed session return, updated during a live chain as awards commit. It can exceed 100%. |
| A08 | Display a counter | Spins uses `en-US` grouping. Wins use `en-US` formatting with exactly two fractional digits after dividing cents by 100. Formatting does not round or alter stored award cents. |
| A09 | Page reload/new page session | Initialize all four fields to 0. No local-storage, server, account, or saved-state recovery exists. |
| A10 | A startup/round error occurs | No rollback/refund transaction exists. In a caught round failure, any wager/spins/awards already mutated remain in memory until reload; the error state disables new requests. Do not model interrupted rounds as automatically refunded. |
| A11 | Player-facing balance/net profit would be needed | No such field is implemented. Wins are gross awards, not `awards - wager`. The game does not track deposits, cash-out, remaining credits, or insufficient funds. |
| A12 | Room bonus is revealed | It announces a recalculated group award, not a separately credited payment. Credit only the final group amount at A04: table × stage × room. Do not add both the unboosted and boosted amounts. Other simultaneous groups remain included once. |

## Formulas and measurement units

```text
paid_round_count = totalWagerCents / 100
free_deal_count = spins - paid_round_count          # normal non-interrupted sessions
round_win_cents = sum(all committed awards from this paid-round chain)
session_win_cents = sum(round awards committed so far, including a running chain)
observed_RTP_percent = 100 * session_win_cents / totalWagerCents
analysis_net_cents = session_win_cents - totalWagerCents   # derived; not displayed
```

Use **paid wagers** as the RTP denominator. Dividing by Spins incorrectly charges free stages and changes the reported return. Likewise, splitting a free stage into an independent paid-round observation changes round hit frequency and win-distribution metrics.

Both multiplier types affect awards only. They do not increase bets, charge for refills, or add completion prizes. x144 caps the stage multiplier, while the independent room multiplier can reach x8 (combined x1152). Neither is a total-win cap. There is no implemented limit on cumulative awards in a paid round.

## Constructed accounting example

This illustrates bookkeeping only; it is not an estimated RTP:

1. Pay 1.00. Spins = 1; wager = 1.00.
2. At stage x1, five each of the current room's target identities win; suppose all three room rolls are x2. Award = `(0.01 + 0.05 + 0.10) * 1 * 2 = 0.32`. Set complete.
3. Free stage at x2. Spins = 2; wager stays 1.00. Six each of its target identities win, again all room rolls x2: `(0.05 + 0.10 + 0.25) * 2 * 2 = 1.60`. Set complete again.
4. Free stage at x3. Spins = 3; wager stays 1.00. Its board has no qualifying regular group, so the chain ends.
5. Round win = Session win = 1.92; observed session RTP = 192.00%; analysis net = +0.92.

There is no extra award for the two completed sets, no payment for clearing their surviving cells, and no wager for either free stage.
