---
document_type: rules_module
ruleset_id: fool-house-2026-10-25-v2
context: background mapping, collection eligibility, stage completion, free respins
read_when: bonus qualification, room changes, multiplier resets or cap
branch_ids: C01-C14
---

# 03 — Background collection and free stages

**Context packet:** a regular symbol matches by tier AND index. At least five copies win globally. Only removed winning groups can collect a tier. A stage has exactly one target index, a three-tier collection set, and one multiplier. Scatter has no collection or bonus role.

**Authority:** [src/main.ts](../../src/main.ts): `themes`, `nextTheme`, `applyTheme`, `resolveRound`, `updateMultiplier`; [src/game.ts](../../src/game.ts): `collectWins`, `isCollectionComplete`, `getMultiplier`.

## Mapping and selection

| Background | Target index | Required winning identities |
| --- | --- | --- |
| `basement.png` | 0 | `low[0]`, `mid[0]`, `high[0]` |
| `hall.png` | 1 | `low[1]`, `mid[1]`, `high[1]` |
| `museum.png` | 2 | `low[2]`, `mid[2]`, `high[2]` |
| `guests.png` | 3 | `low[3]`, `mid[3]`, `high[3]` |
| `attic.png` | 4 | `low[4]`, `mid[4]`, `high[4]` |

| ID | Condition | Outcome |
| --- | --- | --- |
| C01 | Initial room selection | Uniform choice among all five rooms: 20% each. Collection starts empty. |
| C02 | New paid round or free stage needs a room | Exclude the current room, choose uniformly among the remaining four: 25% each conditional on the current room. Immediate repeats are impossible; returning to an earlier room after an intervening room is allowed. There is no fixed tour order. |
| C03 | A room is applied | Use its artwork and three target icons, reset collection to an empty set. Symbol generation still uses all 16 identities with the same weights; room choice does not restrict the reel pool or change the paytable. |

## Collection decisions

Collection is a set of tiers (`low`, `mid`, `high`), not a count of individual icons. It is updated only after a winning batch has finished its removal animation.

| ID | Condition | Outcome |
| --- | --- | --- |
| C04 | Removed winning group's index equals the room's target index, and its tier is new | Add the tier and highlight/check its panel icon. A five-member group is sufficient; collecting does not require a second win of that identity. |
| C05 | Group has another index; or matching icons merely appear without a qualifying win | No collection from those symbols. Other-index winners still receive their regular award. Scatter is never passed as a winning group and cannot collect anything. |
| C06 | Removed matching tier was already collected | Keep it collected once. Pay the new winning group normally; no extra collection quantity or special collection payment. |
| C07 | Fewer than all three tiers are collected | Retain this partial set through subsequent refills in the same stage. Do not switch backgrounds or increment the multiplier. |
| C08 | All three tiers are present after a removal batch | Stage completes. Several tiers can be added in one batch, or completion can occur after many batches. No separate award is added merely for set completion. |

## Completion path: exact order

**C09 — Completion overrides ordinary refill.** After all simultaneous group awards are already credited:

1. Show the centered popup with exact heading **“Switching to the next stage”**. Its detail says `Free respin · x{next_multiplier}`; the main multiplier badge still shows the old stage's multiplier at this moment.
2. Stay in `switching` for nominally 1200 ms, with removed holes, survivors, completed panel, and old background visible.
3. Clear every board cell to `null` and remain in `switching` for another 180 ms. Clearing survivors/Scatter pays and collects nothing additional.
4. Choose/apply another room (C02/C03), resetting collection.
5. Increase the free-respin number by 1 and update the multiplier/badge.
6. Increment Spins by 1, retain all wins/wagers, hide the popup.
7. Generate all 25 new symbols, animate the free deal, and evaluate normally.

There is no player confirmation, extra wager, refill of the discarded old stage, or automatic award based on symbols that were merely visible. Input stays locked through the transition and new stage.

| ID | Condition | Outcome |
| --- | --- | --- |
| C10 | Free-respin number advances | Use the sequence below for the new stage and all its refills. A normal refill does not advance it. |
| C11 | Another stage completes at x144 | Award another free stage at x144. Only the multiplier is capped; completing the cap does not end the round or disable free stages. |
| C12 | Player starts a new paid round after settlement | Reset free-respin number to 0 and multiplier to x1; apply another room and reset collection. Previous high multiplier does not carry into this wager. |
| C13 | Stage has no more wins before completing collection | The entire round chain ends. Keep partial collection visible while ready, but the next paid start resets it. There is no persistent collection per room and no resume of a prior room's progress. |
| C14 | A matching-room group wins with its tier already collected | It still draws a new room multiplier and receives the boosted group award. Room award eligibility depends only on a qualifying winning group and matching index, not whether collection progress is new. |

## Multiplier sequence

| Free-respin number within one paid round | 0 (paid stage) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 and later |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Multiplier | x1 | x2 | x3 | x5 | x8 | x13 | x21 | x34 | x55 | x89 | x144 |

`getMultiplier(n)` floors `n`, clamps the index between 0 and 10, and returns the table entry. Normal gameplay supplies a nonnegative integer. Thus negative finite helper inputs map to x1 and fractional inputs use the lower integer entry; nonnumeric/NaN input is outside the internal contract and is not validated as a player setting.

Example: a Hall stage at x1 removes five `low[1]` and five `mid[1]`, with room x2 drawn for each. It earns 0.12 and collects Low/Mid. Later five `high[1]` with room x3 earn 0.30, complete the set, and trigger a new room at stage x2. Round win is already 0.42 before new-stage awards. Room multipliers do not advance/reset the stage multiplier or grant additional spins on their own.
