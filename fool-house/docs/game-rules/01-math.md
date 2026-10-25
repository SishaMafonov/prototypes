---
document_type: rules_module
ruleset_id: fool-house-2026-10-25-v2
context: independent cell draws, global matching, group awards, in-place replacement
read_when: probabilities, paytable, matching, refill semantics
branch_ids: M01-M21
---

# 01 — Symbols and payout math

**Context packet:** the board has 25 cells, arranged 5×5. A paid round costs 1.00. The active stage multiplier starts at x1 and can increase through collection-driven free stages. This module determines awards for one evaluated board; full-round return also includes subsequent refills/free stages.

**Authority:** [src/game.ts](../../src/game.ts): `drawSymbol`, `generateBoard`, `findWins`, `applyRoomMultipliers`, `removeWins`, `refillBoard`. Default RNG is `Math.random`; tests/studies inject a seeded RNG and can supply candidate weights.

## Symbol identities and random generation

A regular symbol is `{tier: "low" | "mid" | "high", index: 0..4}`. Scatter is `{tier: "scatter", index: 0}`. A temporarily empty cell is `null`, not a symbol.

| Tier | Total probability per newly drawn cell | Identities | Probability per particular identity |
| --- | --- | --- | --- |
| Low | 14.66% | `low[0]` … `low[4]` | 2.932% each |
| Mid | 10% | `mid[0]` … `mid[4]` | 2% each |
| High | 70.34% | `high[0]` … `high[4]` | 14.068% each |
| Scatter | 5% | one mansion | 5% |

High is intentionally common in this calibration; tier names describe award levels, not rarity order. These are per-draw probabilities, not board/session quotas. See [calibration](07-calibration.md) for the unchanged-paytable tradeoff.

| ID | Condition | Exact result |
| --- | --- | --- |
| M01 | First RNG value `r < 0.1466` | Select Low; consume another independent RNG value for the index. |
| M02 | `0.1466 <= r < 0.2466` | Select Mid; draw the index independently. |
| M03 | `0.2466 <= r < 0.95` | Select High; draw the index independently. |
| M04 | `0.95 <= r < 1` | Return Scatter at index 0; consume no index RNG draw. |
| M05 | Regular tier selected, next RNG value `u` | Index = `floor(u * 5)`. Intervals `[0,.2)`, `[.2,.4)`, `[.4,.6)`, `[.6,.8)`, `[.8,1)` produce indexes 0–4. |
| M06 | Full deal requested | Generate all 25 cells independently, row-major (row 0 columns 0–4, then row 1, etc.). Exactly 25 tier draws plus one index draw for each regular symbol. No deck depletion or cross-cell quota. |

The same draw function serves preview, paid deals, free deals, and hole refills. Background, multiplier, collection progress, previous awards, and session RTP do not alter its weights. There is no separate free-stage symbol distribution.

## Global winning groups

Scan the whole board in row-major order. A group's key is `tier:index`. Position, row, column, adjacency, connected components, and left-to-right reel order have no role in eligibility. All occurrences of one identity form one group, even if separated.

| ID | Condition | Exact result |
| --- | --- | --- |
| M07 | Cell is `null` | Ignore it during evaluation. |
| M08 | Cell is Scatter | Ignore it during evaluation regardless of the total Scatter count, including 25. It is not a Wild and does not substitute. |
| M09 | Regular identity appears | Create its group on first occurrence; append later occurrences to the same group. Different tiers with the same index, or different indexes in the same tier, stay separate. |
| M10 | Regular group contains 0–4 matches | No win, award, removal, or collection from that group. (Absent groups are not materialized.) |
| M11 | Group contains exactly 5 | Select the five-match award. |
| M12 | Group contains exactly 6 | Select the six-match award. |
| M13 | Group contains 7–25 | Select the seven-match award once. Retain every member in its winning-cell list. Never split into several paying groups or multiply by count. |
| M14 | One or more winning groups | `findWins` computes each table award times the current stage multiplier. Groups follow first-occurrence order in the row-major scan. The controller subsequently applies M19–M21 once to this batch before crediting its final total. |

## Paytable

Amounts are whole-group awards for the fixed 1.00 bet at x1, not payments for each removed symbol. They are represented as integer cents.

| Tier | 5 matches | 6 matches | 7+ matches |
| --- | --- | --- | --- |
| Low | 0.01 (1 cent) | 0.05 (5 cents) | 0.10 (10 cents) |
| Mid | 0.05 (5 cents) | 0.10 (10 cents) | 0.25 (25 cents) |
| High | 0.10 (10 cents) | 0.25 (25 cents) | 0.50 (50 cents) |
| Scatter | 0 | 0 | 0 |

```text
q = min(number_of_identical_regular_symbols, 7)
group_win_cents = paytable_cents[tier][q] * stage_multiplier * room_multiplier
evaluation_win_cents = sum(group_win_cents for every winning identity)
```

For non-room identities (room multiplier x1): six Low at stage x3 pay 0.15; nine Mid at stage x2 pay 0.50; five High plus seven Low at stage x5 pay 1.00 total. A room High group of 7+ at stage x3 with room x8 instead pays `0.50 * 3 * 8 = 12.00`. Count is not multiplied into the award again.

## Room-specific group multipliers

The 30-slot bag is `[2×14, 3×8, 5×5, 8×3]`: x2 probability 14/30, x3 8/30, x5 5/30, x8 3/30. Mean = 101/30 ≈ 3.3667 for an eligible group, not for every group on the board.

| ID | Condition | Exact result |
| --- | --- | --- |
| M19 | Winning regular group's index equals the current room index | Consume one RNG value; select `ROOM_MULTIPLIERS[floor(r * 30)]`. Multiply that group's stage-adjusted award by the selected value once. All its member cells share this group result. |
| M20 | Winning group's index differs, or there are no wins | Use room x1 and consume no room RNG draw for that group. Merely visible target symbols below five matches also never reach this helper. |
| M21 | Several room-specific groups win, or a matching tier wins again later | Draw independently per matching group in group enumeration order. Re-draw on each later winning batch, even for an already-collected tier. No per-cell rolls or collection-based eligibility restriction. |

`applyRoomMultipliers` returns new group objects containing the final `winCents`, `roomMultiplier`, and `unboostedWinCents` (already stage-adjusted). It does not mutate the original groups. The controller calls it once on fresh `findWins` output; passing already boosted output back into it is outside that call contract. The x144 stage cap does not cap the room multiplier: effective multiplication can be 144×8 = 1152.

## Removal and replacement

| ID | Condition | Exact result |
| --- | --- | --- |
| M15 | Winning-cell list is applied | Copy the board rows and set every listed position to `null`. All groups remove simultaneously; no symbol moves. Empty win list produces a copied but otherwise identical board. |
| M16 | Refill visits a `null` cell | Draw one new symbol with M01–M05. A replacement can be regular or Scatter. |
| M17 | Refill visits any nonempty cell | Preserve the existing symbol in that exact position and consume no RNG for it. This includes Scatter and unmatched regular symbols. |
| M18 | Refill finishes | Return a full board. Re-evaluation includes both survivors and replacements; a survivor can join a new win. There is no automatic immunity for previously collected identities. |

The controller can skip ordinary replacement when collection completes; see [stage priority](03-stages.md). Pure removal/refill helpers do not decide when to switch stages, count spins, charge wagers, or credit session awards.

## Input contract for agents

The normal caller supplies valid internal symbols, valid cell positions, and a finite integer multiplier from the game's Fibonacci sequence. Helpers do not validate arbitrary external board sizes, out-of-range indexes, malformed tier names, or RNG outputs outside `[0,1)`. Such inputs are outside this ruleset, not alternate player-accessible branches. Fractional/negative custom multipliers are likewise not normal gameplay.
