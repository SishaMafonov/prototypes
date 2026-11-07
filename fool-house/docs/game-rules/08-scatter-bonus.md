---
document_type: rules_module
ruleset_id: fool-house-2026-11-07-v15
context: Scatter trigger, allocated moves, modal confirmation, playable door adventure and preserved base return
read_when: Scatter qualification, Continue behavior, duplicate awards, bonus implementation next steps
branch_ids: B01-B15
---

# 08 — Scatter bonus entry

**Context packet:** Only after the entire paid-round chain settles, 6+ accumulated Scatters award their final exact count in moves. Continue opens the playable [corridor/door adventure](10-door-adventure.md) over the preserved base board. Each door consumes a move; after all reveals, Return to mansion restores the settled base result; no base award or floor remains pending. Base eligibility is limited to one award per paid-round chain, including all free floors. The current door feature draws no Scatter symbols.

**Authority:** [src/game.ts](../../src/game.ts): `MIN_BONUS_SCATTERS`, `getScatterBonusMoves`. [src/main.ts](../../src/main.ts): `checkScatterBonus`, `resolveRound`, `requestRound`, `scatterBonusAwarded`, `bonusMoves`; [src/style.css](../../src/style.css): modal, decorations, counter, reduced motion.

| ID | Condition | Outcome |
| --- | --- | --- |
| B01 | Unpaid startup preview | Static regular-only board with no Scatter or winning groups. No bonus check/moves or automatic sequence; wait for first input. |
| B02 | Any nonterminal paid/free deal, refill or room feature, regardless of Scatter count | No award or popup yet. Resolve Mysteries, regular wins, collection/refills and free-floor transitions first. Retain Scatters so the final count can grow. At terminal 0–5, settle without a bonus. |
| B03 | Final settled board in this paid-round chain has 6–25 Scatters and the award guard is unset | Award the exact count in moves, including Scatters carried from earlier floors/features. No immediate payout/wager/spin/collection or multiplier change. |
| B04 | Trigger is accepted | Mark this paid-round chain awarded before awaiting input, bank moves, enter bonus-trigger and open the modal. Detection follows all regular wins/removal/room rolls and all possible room continuation/floor transitions. Use final Scatter count, not the first count that reached six. |
| B05 | Popup remains open | Hold the settled base result indefinitely. No timeout or automatic continuation. Native modal makes the rest of the document inert and contains keyboard focus. Continue is focused. Clicking the backdrop does nothing; Escape cancellation is prevented. Resize preserves the modal, bank, and board. |
| B06 | Continue is activated by tap/click or normal button keyboard activation | Initialize the bonus session/panel, enter `bonus`, make base inert/aria-hidden, show the scene, close the modal and focus the bonus region. Start the 3-second walk; base resolution exits through its handoff result. Continue itself consumes no move or wager. |
| B07 | Paid-chain award guard is set | No further bonus from this board, later refills/features, additional Scatters or subsequent floors in the same chain. Keep visible Scatters and the guard through Return. |
| B08 | A new paid round starts | Reset bonus eligibility and replace the entire board, including old Scatters. A free floor preserves both Scatter positions and the award guard; collection and multiplier still follow their normal rules. |
| B09 | Bonus scene is active | Keep settled base board/collection/stage multiplier preserved; no pending wins remain. Only enabled door choices advance bonus steps and pay the bonus-pot increase. On completion, Return rechecks this settled board with its guard set and becomes ready without crediting the bonus pot again. Full behavior is in D01–D19. |
| B10 | Page reload | Clear the in-memory bank and paid-chain guard with all other session state. There is no durable save. A caught round error has the existing no-rollback/reload semantics; it is not an automatic bonus redemption. |
| B11 | Rendering / reduced motion | Dim/blur the scene; show mansion art, web corners, blood drips/stains, dust, green glowing ooze, exact awarded move count, total bank, and Continue. Dialog content scrolls on constrained heights. Reduced motion disables entrance/dust/ooze animations; confirmation remains required. Decorations are hidden from assistive technology. |
| B12 | Retrigger preference | The current door feature has no Scatter outcomes. The latest confirmation limits base-game bonuses to one per paid chain; free-floor transfers cannot re-award retained symbols. Future bonus mechanics need explicit rules before adding retriggers. |
| B13 | Bonus scene opens | Blueprint layer, logo and Bonus title frame a perspective corridor at reel size/aspect ratio when space permits. Prize/floor list sits above it; bottom panel shows steps/remaining/step win/total. Base UI stays underneath and inaccessible. See D16 for constrained layouts. |
| B14 | Initial bonus counters render | Set current step to 1, total steps to the awarded move bank, completed steps to 0, step win to zero and total to the already-credited base round win. Carry this total without adding it to session/round credits again. Remaining = total minus completed, including the current unplayed step. With a 2.00 base win, six moves display `1 of 6 steps`, `6 remaining`, step `0.00`, Round win `2.00`. The user's 0.13 / 666.66 example is layout guidance, not a payout to seed. |
| B15 | Resize, asset loading or motion preference | Preserve state and counters on resize. Predecode bonus background with other startup art (12 images); corridor is procedural canvas and adds no image load. Missing art follows startup error. Motion/timings and rendering are in D02/D11/D12/D16. |

Floor-feature clears and background transfers retain Scatters in place and keep the paid-chain guard. Do not check before a clear/refill/floor transition. Check final 6+ only when no regular win or room continuation remains, including the space-limit exit. Only a new paid start resets eligibility and discards the old Scatter board.

Reload clears all bonus/base state. Scatter remains nonpaying/non-Wild/noncollectible. Entry itself uses no RNG or cash award; door choices add prize RNG and payouts. Historical studies need their original door/room-refill flags. See [10](10-door-adventure.md) for prize math and [11](11-room-refills.md) for current progression/study.
