---
document_type: rules_index
ruleset_id: fool-house-2026-10-25-v2
status: implemented_prototype_snapshot
verified_on: 2026-10-25
---

# Fool House — implemented game rules

This is the entry point for agents and market-analysis handoffs. It describes the current implementation, including exceptions and unfinished features. It is not a proposed design or an RTP certification. Runtime source takes precedence if this snapshot becomes stale.

## Compact context packet

- **Format:** client-only, single-player, 5 columns × 5 rows; independent weighted cell draws, not reel strips or paylines.
- **Pool:** 15 regular symbols (`low`, `mid`, `high`, each with indexes 0–4) and one mansion Scatter.
- **Weights:** Low 14.66%, Mid 10%, High 70.34%, Scatter 5%. Each regular tier chooses its five indexes uniformly. High is intentionally the common tier in this calibration.
- **Match:** at least 5 identical regular symbols anywhere. Identity includes both tier and index. Adjacency and reel position do not matter.
- **Group awards at x1:** Low 5/6/7+ = 0.01/0.05/0.10; Mid = 0.05/0.10/0.25; High = 0.10/0.25/0.50. One award per group, multiplied by the stage multiplier. All matching members are removed, including counts above 7.
- **Room award:** each winning group whose index matches the current room independently draws x2/x3/x5/x8 from the 30-slot bag (14/8/5/3 copies). Final group award = table award × stage multiplier × room multiplier. Other groups use room x1. Already-collected tiers remain eligible.
- **Resolution:** highlight winners → reveal any room multipliers in a separate animation → shrink/remove → credit final awards and update collection → refill/re-evaluate or switch stages. There is no gravity.
- **Collection:** each background targets one index across all three regular tiers. Only removed winning groups matching that index collect their tier. All three tiers are needed. Partial progress persists through refills, but resets whenever the background changes.
- **Free stages:** full collection displays “Switching to the next stage”, clears the entire board, changes background, and deals a free spin. Multipliers: x2, x3, x5, x8, x13, x21, x34, x55, x89, x144, then x144 for further free stages.
- **Paid round:** one 1.00 wager covers its original deal, all refills, and all resulting free stages. A new paid round changes background, clears collection, and resets multiplier to x1.
- **Session:** Spins counts paid deals plus free deals; refills do not count. Round win includes the entire paid-round chain. RTP displayed = cumulative awards / paid wagers × 100. Values are in unspecified prototype credit units.
- **Important exceptions:** the initial board is an unpaid preview and never resolves wins. Scatter never pays, substitutes, collects, or triggers a bonus. Input during a chain is discarded. Refresh resets everything. A multiplier cap is implemented; a total-win, refill-count, or free-stage-count cap is not.

## Load only the relevant context

Each module begins with a local context packet, source-function names, and stable branch IDs. Read this index plus the selected module; loading the full source/history is unnecessary for ordinary analysis.

| Question | Read | Branch IDs |
| --- | --- | --- |
| Symbol probabilities, matching, paytable, room bonuses, refill | [01 — Math](docs/game-rules/01-math.md) | M01–M21 |
| Startup, input, paid-round sequence, resolution and exit paths | [02 — Round flow](docs/game-rules/02-round-flow.md) | F01–F16 |
| Rooms, collection, automatic free stages, multiplier/reset cases | [03 — Stages](docs/game-rules/03-stages.md) | C01–C14 |
| Wagers, spins, awards, RTP, rounding, persistence | [04 — Accounting](docs/game-rules/04-accounting.md) | A01–A12 |
| Animation, visual cues, accessibility, resizing, loading/errors | [05 — Runtime and UI](docs/game-rules/05-runtime-ui.md) | U01–U16, E01–E09 |
| Market-analysis scope, simulation contract, examples, validation | [06 — Analysis handoff](docs/game-rules/06-analysis.md) | X01–X10 |
| Structured facts and source fingerprints | [rules.json](docs/game-rules/rules.json) | No source scan needed for constants |
| Measured RTP, hit frequency, tradeoffs, reproduction commands | [07 — Calibration study](docs/game-rules/07-calibration.md) | R01–R08 |

## Snapshot and maintenance

- Ruleset `fool-house-2026-10-25-v2` includes working-tree room-bonus/calibration changes based on commit `39435f59cd107d714a2fb15a807700c57feff1cd`. Raw-file SHA-256 fingerprints in `rules.json` identify the actual audited files; line-ending conversion also changes hashes.
- Authority: `src/game.ts` for math, `src/main.ts` for sequencing/accounting/rendering, `src/style.css` for CSS behavior. Source links and function names are provided in each module.
- All 15 math tests passed. Independent validation covered 2,000,000 paid rounds: estimated RTP 96.07564%, approximate 95% interval 95.9558–96.1955%, hit rate 88.1421%. These are prototype Monte Carlo estimates, not certified/exact RTP. See the study for rare-feature limitations and browser validation.
- Keep historical changelog entries as history. In particular, old 5×4 boards, 3/4/5+ awards, per-symbol payouts, and 60/25/15 total-pool weights are superseded.
- After a behavior change, update the affected module, compact packet/JSON facts, source fingerprints, and changelog. Preserve stable branch IDs; append new IDs for new branches.
- Runtime branches below assume valid internal symbols, a 5×5 board, and random numbers in `[0,1)`. Unsupported helper inputs are identified separately; they are not player options.
