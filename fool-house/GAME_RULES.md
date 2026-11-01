---
document_type: rules_index
ruleset_id: fool-house-2026-11-01-v12
status: implemented_prototype_snapshot
verified_on: 2026-11-01
---

# Fool House — implemented game rules

This is the entry point for agents and market-analysis handoffs. It describes the current implementation, including exceptions and unfinished features. It is not a proposed design or an RTP certification. Runtime source takes precedence if this snapshot becomes stale.

## Compact context packet

- **Format:** client-only, single-player, 5 columns × 5 rows; independent weighted cell draws, not reel strips or paylines.
- **Pool:** 15 regular symbols (`low`, `mid`, `high`, each with indexes 0–4), one mansion Scatter and a code-drawn Mystery question mark.
- **Raw weights:** Mystery 10%, Scatter 7.16%, Low≈44.168246%, Mid≈24.169846%, High≈14.501908%. Regular tiers keep their previous ratios. Global draws use uniform regular indexes; collected-room refills force the room index. Mystery groups transform before evaluation. Current RTP is unmeasured and balancing remains deferred.
- **Mystery:** pink pulsing question marks transform into one shared current-floor Low/Mid/High icon, each 1/3 per wave. After results land, wait 2000 ms, then run the 1600 ms selector plus 450 ms reveal before regular wins. Keep the full results pause under reduced motion. Preview contains no Mystery; no Wild behavior or direct payment.
- **Match:** at least 5 identical regular symbols anywhere. Identity includes both tier and index. Adjacency and reel position do not matter.
- **Group awards at x1:** Low 5/6/7+ = 0.01/0.05/0.10; Mid = 0.05/0.10/0.25; High = 0.10/0.25/0.50. One award per group, multiplied by the stage multiplier. All matching members are removed, including counts above 7.
- **Room award:** each winning group whose index matches the current room independently draws x2/x3/x5/x8 from the 30-slot bag (14/8/5/3 copies). Final group award = table award × stage multiplier × room multiplier. Other groups use room x1. Already-collected tiers remain eligible.
- **Resolution:** highlight winners → reveal any room multipliers in a separate animation → shrink/remove → credit final awards and update collection → refill/re-evaluate or switch stages. There is no gravity.
- **Collection:** removed winning room groups collect Low/Mid/High. Any collected tier activates room-only regular refills for all holes. If a partially collected room stalls, clear/refill regular cells for free in that room, preserving Scatters. With fewer than five regular slots left, settle after any eligible bonus instead of looping. Ordinary survivors stay fixed; extra clears award nothing. New background resets collection and restores the global pool.
- **Free stages:** full collection displays “Switching to the next stage”, clears regular cells, preserves Scatters in place, changes background, and refills the other cells for free. Multipliers: x2, x3, x5, x8, x13, x21, x34, x55, x89, x144, then x144 for further free stages.
- **Paid round:** one 1.00 wager covers its original deal, all refills, and all resulting free stages. A new paid round changes background, clears collection, and resets multiplier to x1.
- **Session:** Spins counts paid deals plus free deals; refills do not count. Round win includes the entire paid-round chain. RTP displayed = cumulative awards / paid wagers × 100. Values are in unspecified prototype credit units.
- **Scatter entry:** at the end of the entire paid-round chain, after cascades/features/free floors finish, 6+ final accumulated Scatters award exact-count moves once. Continue opens a 3-second corridor approach to three doors. Each choice consumes one move: Coin 35% (1.00 × floor), Multiplier 25% (bag `[2×5,3×2,5×2,8×1]`, multiplying the accumulated bonus pot), Stairs 5% (+1 floor, cap x6), Ghost 35% (zero win, approaches/fades). Credit only pot increases. Prize list reflects current floor; Return after the last reveal restores the settled base board; no base wins remain pending. No Scatter draws occur inside this door feature.
- **Important exceptions:** the initial board is a static, regular-only nonwinning preview; no automatic sequence, growth, picker or awards. First input starts the paid result. Scatter never pays, substitutes, or collects. Input during a chain is discarded except the modal Continue action. Refresh resets everything including saved moves. A multiplier cap is implemented; a total-win, refill-count, or free-stage-count cap is not.

## Load only the relevant context

Bonus door visuals reset on every approach: previous selections/reveals and button focus are cleared. Hovering gives no selection glow; deliberate keyboard focus has a plain outline.

Each module begins with a local context packet, source-function names, and stable branch IDs. Read this index plus the selected module; loading the full source/history is unnecessary for ordinary analysis.

| Question | Read | Branch IDs |
| --- | --- | --- |
| Symbol probabilities, matching, paytable, room bonuses, refill | [01 — Math](docs/game-rules/01-math.md) | M01–M22 |
| Startup, input, paid-round sequence, resolution and exit paths | [02 — Round flow](docs/game-rules/02-round-flow.md) | F01–F19 |
| Rooms, collection, automatic free stages, multiplier/reset cases | [03 — Stages](docs/game-rules/03-stages.md) | C01–C14 |
| Wagers, spins, awards, RTP, rounding, persistence | [04 — Accounting](docs/game-rules/04-accounting.md) | A01–A14 |
| Animation, visual cues, accessibility, resizing, loading/errors | [05 — Runtime and UI](docs/game-rules/05-runtime-ui.md) | U01–U18, E01–E09 |
| Market-analysis scope, simulation contract, examples, validation | [06 — Analysis handoff](docs/game-rules/06-analysis.md) | X01–X10 |
| Structured facts and source fingerprints | [rules.json](docs/game-rules/rules.json) | No source scan needed for constants |
| Historical High-heavy RTP study (superseded weights) | [07 — Calibration study](docs/game-rules/07-calibration.md) | R01–R08 |
| Scatter moves, modal Continue, bonus scene, base handoff | [08 — Scatter bonus entry](docs/game-rules/08-scatter-bonus.md) | B01–B15 |
| Historical tier-frequency correction and its original study | [09 — Tier frequency](docs/game-rules/09-tier-frequency.md) | K01–K06 |
| Playable corridor, doors, prize branches, floors, exact credit and return | [10 — Door adventure](docs/game-rules/10-door-adventure.md) | D01–D18 |
| Current-room refill pool, extra clears, space limit and historical RTP | [11 — Room refills](docs/game-rules/11-room-refills.md) | P01–P12 |
| Historical v8 weight calibration and ten-billion-round validation | [12 — RTP balance](docs/game-rules/12-rtp-balance.md) | Q01–Q10 |
| Scatter retention, floor-feature clears, one bonus per paid chain, space limit | [13 — Scatter persistence](docs/game-rules/13-scatter-persistence.md) | S01–S10 |
| Mystery probability, shared floor outcome, pink animation and sequencing | [14 — Mystery](docs/game-rules/14-mystery.md) | T01–T11 |

## Snapshot and maintenance

- Ruleset `fool-house-2026-11-01-v12` adds a static nonwinning startup preview and a 2000 ms raw-results pause before each gameplay Mystery picker. Scatter entry still waits for all base wins/features/free floors. Shared 10% Mysteries and Scatter retention remain active. Scatter/payout/door odds are unchanged; regular probabilities fund Mystery and rebalancing remains deferred. Runtime source fingerprints identify audited files; historical studies retain original snapshots.
- Authority: `src/game.ts` for math, `src/main.ts` for sequencing/accounting/rendering, `src/style.css` for CSS behavior. Source links and function names are provided in each module.
- Presentation updated 2026-10-31: larger reel icons and tighter mobile layout; short portrait screens may shift the centered board upward to fit. Current source fingerprints reflect this UI update; calibration study hashes retain their original simulated snapshot.
- All 40 tests and the production build passed. Current rules have **no measured RTP**; user deferred balancing. The v8 ten-billion-chain result (95.979499%) is historical and excludes Scatter persistence/paid-chain bonus deduplication and Mystery. See [14](docs/game-rules/14-mystery.md) and [13](docs/game-rules/13-scatter-persistence.md) for current behavior and [12](docs/game-rules/12-rtp-balance.md) for archived evidence.
- Keep historical changelog entries as history. In particular, old 5×4 boards, 3/4/5+ awards, per-symbol payouts, and 60/25/15 total-pool weights are superseded.
- After a behavior change, update the affected module, compact packet/JSON facts, source fingerprints, and changelog. Preserve stable branch IDs; append new IDs for new branches.
- Runtime branches below assume valid internal symbols, a 5×5 board, and random numbers in `[0,1)`. Unsupported helper inputs are identified separately; they are not player options.
