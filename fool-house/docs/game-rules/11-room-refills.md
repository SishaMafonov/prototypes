---
document_type: rules_module
ruleset_id: fool-house-2026-11-01-v12
context: first collection unlocks current-room refills; extra clears prevent partial-room settlement
read_when: room/floor symbol pool, guaranteed collection progression, refill RNG, extra clears, historical progression effect
branch_ids: P01-P12
---

# 11 — Room-specific refills and guaranteed stage progression

**Context packet:** this feature concerns the five base backgrounds/room indexes, not the six-floor door-bonus ladder. Once any current-room Low/Mid/High tier is collected from a removed winning group, subsequent replacement regular symbols use that room's index. Current raw weights (balancing deferred): Mystery 10%, Scatter 7.16%, Low≈44.168246%, Mid≈24.169846%, High≈14.501908%. User confirmed that a stalled partially collected room must receive a free extra clear/refill while at least five regular slots remain, then the normal free-stage transition runs on completion. Protected Scatters persist; see [13](13-scatter-persistence.md). Paid/new-stage gameplay deals remain global. Startup preview is decorative, fixed and regular-only.

**Authority:** [game.ts](../../src/game.ts): `drawSymbol`, `refillBoard`, `refillForRoom`, `shouldContinueRoom`, `collectWins`; [main.ts](../../src/main.ts): `refillCurrentRoom`, `resolveRound`, `applyTheme`; [simulator](../../scripts/simulate.mjs). [Historical study](studies/room-refills-validation.json).

| ID | Condition | Behavior |
| --- | --- | --- |
| P01 | Room collection is empty | Refills use the original all-room pool: regular tier roll then uniform index 0–4. Non-room wins do not unlock the feature. Preview/full paid/free deals also use this pool. |
| P02 | Any winning current-room group is removed and collected | Activate room refills immediately for every hole from that batch, including holes made by simultaneous other-room winners. It is independent of which tier was first or whether room bonus rolled x2/x3/x5/x8. |
| P03 | Active replacement draw is regular | Choose Low/Mid/High using the existing thresholds, but force its icon index to the current room: basement 0, hall 1, museum 2, guests 3, attic 4. Both collected and uncollected tiers stay eligible. Do not draw a second index RNG value. |
| P04 | Active replacement draw is Scatter | Keep its exact 7.16% probability and standalone index 0; it is not converted into a room icon. All active replacement cells consume exactly one RNG draw each. |
| P05 | Ordinary refill visits surviving cells | Preserve their exact identities/positions, including foreign-room symbols and Scatter. Replace only null holes, no gravity. Room refills do not immediately repaint the whole board. |
| P06 | Board has no regular win and collection is empty | Settle normally; no extra clear, wager, spin or room change. Visible but uncollected target icons do not activate progression. |
| P07 | No regular win, partial collection and at least five regular slots | Clear regular cells only; keep Scatters at their exact positions. Animate cleared 120 ms, then refill holes through the current-room pool and grow only new cells. Keep collection, multiplier and paid-chain Scatter guard; no added wager/spin or credit for cleared survivors. |
| P08 | Extra clear stalls again | Repeat P07 while five regular slots remain. At 21–25 Scatters, settle after any eligible bonus because no five-symbol regular group can form. Retain Scatters and prior awards; no unearned stage completion. |
| P09 | All three room tiers collect | Pay all winners, then clear regular cells and retain Scatters through the stage popup/background switch. Reset collection and refill the other cells globally. Preserve the paid-chain bonus guard. |
| P10 | Room chain reaches terminal no-win state | Finish all room refills/features/free floors before checking Scatter entry. At empty collection or the space-limit exit, award final 6+ once, otherwise settle. Return preserves the settled board/collection/multiplier/guard and becomes ready; only a new paid start resets eligibility. |
| P11 | Status/accounting/simulation | During active refill say `Drawing {Room} symbols…`; extra clear says `Finding the remaining {Room} symbols…`; collection description reports the active mode. `--room-refills=off` disables both restricted refills and extra clears for historical reproduction. The original room-refill feature did not change weights/paytable/bags/door odds. The subsequent weight calibration is documented in [12](12-rtp-balance.md). |
| P12 | Regression and evidence | Existing room-refill tests remain. Four additional v9 tests cover retained positions/RNG draws, accumulation, paid-chain eligibility and the regular-slot boundary. Native/helper and legacy replay checks passed. Original v9 desktop QA was blocked; current isolated headless v11 QA verified extra clears, two free floors, deferred Scatter entry and Return; see S10. |

## Constructed browser sequence

Hall removes five Low[1], rolls room x2 and earns 0.02. Five holes become Low[1]×2, Mid[1]×2, High[1]×1 while foreign survivors stay fixed. This stalls, so the board clears for free. Its 25 replacements are High[1]×5, Mid[1]×5, Low[1]×15; all three room rolls are x2. Award = 0.20 + 0.10 + 0.20 = 0.50, complete set. A new Basement stage at x2 deals all-room symbols and settles. Spins 2, paid wager 1.00, total/round win 0.52; no credit for the extra clear itself.

## Historical study at room-refill introduction (57/23.75/14.25/5)

100,000 full paid chains, seed 20261101: RTP **153.52003%**, approximate 95% interval **149.32185–157.71821%**, hit rate **62.818%**. Observed 35,735 free stages (26,265 first respins; furthest x55), 29,158 extra clears, 132,901 active room-refill batches and 2,150 door bonuses. Base group counts remain ordered Low 237,934 > Mid 63,900 > High 37,119. Award cents: base 12,889,703 plus door 2,462,300 = 15,352,003 on 10,000,000 wagered cents. Zero truncated chains; the simulator still fails its diagnostic evaluation limit rather than silently recording incomplete chains as zero wins.

This prototype study shows the requested progression changes materially increase return. It is not exact/certified RTP or a 96% calibration; the latest weight calibration is in [12](12-rtp-balance.md). More later Fibonacci stages are now observed, but x89/x144 and repeated bonus-pot multiplier tails remain poorly sampled. The original snapshot guaranteed room completion after activation. Current preservation adds a space-limit exception and remains uncalibrated; see [13](13-scatter-persistence.md).

Reproduce: `npm run simulate -- --rounds=100000 --seed=20261101 --weights=57,23.75,14.25,5 --keep-scatters=off`. Historical v6 door study additionally needs `--room-refills=off`; older base-only studies also need `--door-bonus=off`.
