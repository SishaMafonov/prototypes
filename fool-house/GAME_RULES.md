---
document_type: rules_index
ruleset_id: fool-house-2026-10-31-v4
status: implemented_prototype_snapshot
verified_on: 2026-10-31
---

# Fool House — implemented game rules

This is the entry point for agents and market-analysis handoffs. It describes the current implementation, including exceptions and unfinished features. It is not a proposed design or an RTP certification. Runtime source takes precedence if this snapshot becomes stale.

## Compact context packet

- **Format:** client-only, single-player, 5 columns × 5 rows; independent weighted cell draws, not reel strips or paylines.
- **Pool:** 15 regular symbols (`low`, `mid`, `high`, each with indexes 0–4) and one mansion Scatter.
- **Weights:** Low 57%, Mid 23.75%, High 14.25%, Scatter 5%. Each regular tier chooses its five indexes uniformly. Low is most common, High rarest; user chose to defer payout rebalancing instead of retaining the old ~96% calibration.
- **Match:** at least 5 identical regular symbols anywhere. Identity includes both tier and index. Adjacency and reel position do not matter.
- **Group awards at x1:** Low 5/6/7+ = 0.01/0.05/0.10; Mid = 0.05/0.10/0.25; High = 0.10/0.25/0.50. One award per group, multiplied by the stage multiplier. All matching members are removed, including counts above 7.
- **Room award:** each winning group whose index matches the current room independently draws x2/x3/x5/x8 from the 30-slot bag (14/8/5/3 copies). Final group award = table award × stage multiplier × room multiplier. Other groups use room x1. Already-collected tiers remain eligible.
- **Resolution:** highlight winners → reveal any room multipliers in a separate animation → shrink/remove → credit final awards and update collection → refill/re-evaluate or switch stages. There is no gravity.
- **Collection:** each background targets one index across all three regular tiers. Only removed winning groups matching that index collect their tier. All three tiers are needed. Partial progress persists through refills, but resets whenever the background changes.
- **Free stages:** full collection displays “Switching to the next stage”, clears the entire board, changes background, and deals a free spin. Multipliers: x2, x3, x5, x8, x13, x21, x34, x55, x89, x144, then x144 for further free stages.
- **Paid round:** one 1.00 wager covers its original deal, all refills, and all resulting free stages. A new paid round changes background, clears collection, and resets multiplier to x1.
- **Session:** Spins counts paid deals plus free deals; refills do not count. Round win includes the entire paid-round chain. RTP displayed = cumulative awards / paid wagers × 100. Values are in unspecified prototype credit units.
- **Scatter entry:** the first evaluated board with 6+ Scatters per room stage awards its exact count as saved free moves. A scary modal pauses the chain until Continue, then ordinary resolution resumes. Moves accumulate across paid/free stages but are not playable/consumed yet, per the user's trigger/popup-only scope. Future bonus play must support 6+ Scatter retriggers adding moves.
- **Important exceptions:** the initial board is an unpaid preview and never resolves wins or triggers. Scatter never pays, substitutes, or collects. Input during a chain is discarded except the modal Continue action. Refresh resets everything including saved moves. A multiplier cap is implemented; a total-win, refill-count, or free-stage-count cap is not.

## Load only the relevant context

Each module begins with a local context packet, source-function names, and stable branch IDs. Read this index plus the selected module; loading the full source/history is unnecessary for ordinary analysis.

| Question | Read | Branch IDs |
| --- | --- | --- |
| Symbol probabilities, matching, paytable, room bonuses, refill | [01 — Math](docs/game-rules/01-math.md) | M01–M21 |
| Startup, input, paid-round sequence, resolution and exit paths | [02 — Round flow](docs/game-rules/02-round-flow.md) | F01–F17 |
| Rooms, collection, automatic free stages, multiplier/reset cases | [03 — Stages](docs/game-rules/03-stages.md) | C01–C14 |
| Wagers, spins, awards, RTP, rounding, persistence | [04 — Accounting](docs/game-rules/04-accounting.md) | A01–A13 |
| Animation, visual cues, accessibility, resizing, loading/errors | [05 — Runtime and UI](docs/game-rules/05-runtime-ui.md) | U01–U16, E01–E09 |
| Market-analysis scope, simulation contract, examples, validation | [06 — Analysis handoff](docs/game-rules/06-analysis.md) | X01–X10 |
| Structured facts and source fingerprints | [rules.json](docs/game-rules/rules.json) | No source scan needed for constants |
| Historical High-heavy RTP study (superseded weights) | [07 — Calibration study](docs/game-rules/07-calibration.md) | R01–R08 |
| Scatter moves, modal Continue, duplicates, deferred bonus gameplay | [08 — Scatter bonus entry](docs/game-rules/08-scatter-bonus.md) | B01–B12 |
| Current Low > Mid > High frequencies, RTP impact and validation | [09 — Tier frequency](docs/game-rules/09-tier-frequency.md) | K01–K06 |

## Snapshot and maintenance

- Ruleset `fool-house-2026-10-31-v4` restores Low > Mid > High frequency and retains Scatter bonus entry. Raw-file SHA-256 fingerprints in `rules.json` identify the audited files; line-ending conversion also changes hashes. Historical calibration files retain their original snapshots.
- Authority: `src/game.ts` for math, `src/main.ts` for sequencing/accounting/rendering, `src/style.css` for CSS behavior. Source links and function names are provided in each module.
- Presentation updated 2026-10-31: larger reel icons and tighter mobile layout; short portrait screens may shift the centered board upward to fit. Current source fingerprints reflect this UI update; calibration study hashes retain their original simulated snapshot.
- All 16 math tests passed. Current one-million-round study estimates 6.09404% RTP and 62.8208% hits, with Low winning groups more frequent than Mid, then High. Payout rebalancing is deferred by explicit user choice. The old 96.07564% High-heavy result is superseded; future Scatter move payouts are excluded from both studies.
- Keep historical changelog entries as history. In particular, old 5×4 boards, 3/4/5+ awards, per-symbol payouts, and 60/25/15 total-pool weights are superseded.
- After a behavior change, update the affected module, compact packet/JSON facts, source fingerprints, and changelog. Preserve stable branch IDs; append new IDs for new branches.
- Runtime branches below assume valid internal symbols, a 5×5 board, and random numbers in `[0,1)`. Unsupported helper inputs are identified separately; they are not player options.
