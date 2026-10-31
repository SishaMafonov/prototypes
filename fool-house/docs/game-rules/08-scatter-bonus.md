---
document_type: rules_module
ruleset_id: fool-house-2026-10-31-v4
context: Scatter trigger, allocated moves, modal confirmation, deferred bonus play
read_when: Scatter qualification, Continue behavior, duplicate awards, bonus implementation next steps
branch_ids: B01-B12
---

# 08 — Scatter bonus entry (gameplay deferred)

**Context packet:** 6+ Scatters on an evaluated board award exactly their count in free moves. The user explicitly requested the trigger and popup only for this step. Moves are stored in session memory but never consumed or played yet. Continue closes the announcement and resumes the existing ordinary round. Future bonus play must allow 6+ Scatter retriggers to add moves, as confirmed by the user; that loop is not implemented.

**Authority:** [src/game.ts](../../src/game.ts): `MIN_BONUS_SCATTERS`, `getScatterBonusMoves`. [src/main.ts](../../src/main.ts): `checkScatterBonus`, `resolveRound`, `requestRound`, `scatterBonusAwarded`, `bonusMoves`; [src/style.css](../../src/style.css): modal, decorations, counter, reduced motion.

| ID | Condition | Outcome |
| --- | --- | --- |
| B01 | Unpaid startup preview has any Scatter count | No bonus check or moves, including 6–25 Scatters. Preview remains unpaid and unevaluated. |
| B02 | Evaluated paid/free-stage deal or refill has 0–5 Scatters | No award or popup. Continue ordinary regular-group evaluation. A later refill can still qualify. |
| B03 | First qualifying evaluated board within this room stage has 6–25 Scatters | Count all Scatter cells anywhere. Award exactly that count: 6→6 moves, 7→7, …, 25→25. No payout, wager, spin, collection, room change, or multiplier change occurs merely from this trigger. |
| B04 | Trigger is accepted | Mark this stage awarded **before awaiting input**; add moves to the session bank, update its visible badge, enter `bonus-trigger`, then show the modal. Detection precedes regular wins, room rolls, removal, credit, and stage completion on this board. Existing pending wins are preserved. |
| B05 | Popup remains open | Pause the chain indefinitely. No timeout or automatic continuation. Native modal makes the rest of the document inert and contains keyboard focus. Continue is focused. Clicking the backdrop does nothing; Escape cancellation is prevented. Resize preserves the modal, bank, and board. |
| B06 | Continue is activated by tap/click or normal button keyboard activation | Close the modal, synchronously retain the busy lock, focus the canvas, and resume evaluation of the same board exactly once. No new deal, cost, award, room roll, or move consumption is caused by Continue. |
| B07 | Persistent Scatters remain or more arrive on subsequent refills of the already-awarded stage | No duplicate award/popup, even if the count increases. The first qualifying count is the allocation for this stage. This prevents the same retained Scatters awarding on every cascade. |
| B08 | New paid deal or collection-driven free stage begins | Reset the per-stage award guard, retain banked moves. A qualifying board in the new stage can add its own exact count and open another announcement. Collection transitions are still automatic and independent of this bank. |
| B09 | Ordinary chain settles after Continue | Become ready for paid play; status and badge show the accumulated saved moves. The bank does not prevent another paid start or pay/consume moves automatically. New paid starts do not clear it. |
| B10 | Page reload | Clear the in-memory bank and stage guard with all other session state. There is no durable save. A caught round error has the existing no-rollback/reload semantics; it is not an automatic bonus redemption. |
| B11 | Rendering / reduced motion | Dim/blur the scene; show mansion art, web corners, blood drips/stains, dust, green glowing ooze, exact awarded move count, total bank, and Continue. Dialog content scrolls on constrained heights. Reduced motion disables entrance/dust/ooze animations; confirmation remains required. Decorations are hidden from assistive technology. |
| B12 | Future bonus play is implemented | User confirmed 6+ Scatters should add their count as more moves during bonus play. Move execution, decrement timing, bonus-specific board/rules, entry/exit/return behavior and retrigger deduplication within that future loop remain unimplemented. Do not infer them from the current session bank or bill them into RTP. |

The queue is a prototype handoff, not a completed playable bonus. Its UI explicitly states that moves are saved for the upcoming feature. Scatter remains nonpaying, non-Wild, and noncollectible; it still survives ordinary refills. Trigger checks use no RNG, so existing regular-payout math and random-call ordering remain unchanged. Prior calibration excludes any future payouts from these moves.
