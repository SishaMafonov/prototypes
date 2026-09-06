# Four Dicks — Development Handoff

Last updated: 2026-09-06 — Gamble Feature completed and verified

## Project identity

`4dicks` is an independent TypeScript/Vite browser prototype in `C:\git\prototypes\4dicks`. It is a responsive, canvas-based card-slot game. All game state, drawing, animation, input, and UI overlays live in `src/main.ts`; deterministic deck and payout rules live in `src/game.ts`.

The project is tracked by the repository. The latest observed commit before this refinement was `0e9502f` (`feat: initial setup of the game`). The 2026-09-06 refinements are uncommitted. Check current Git status when resuming and preserve existing changes.

## Current implementation

- Gamble Feature is implemented. It is offered when the upcoming deck is empty and `findMatch(board)` returns no remaining diagonal match. This interprets “all possible matches collected and no card left” as no cards left to deal, while retaining final unmatched reel cards. A stricter condition requiring all 16 reel cells to be empty did not occur across 500,000 simulated rounds and would make the feature impractical to reach.
- Settlement is deferred for an eligible deck. The Double or Nothing dialog offers Collect or Gamble. Collect settles the current calculated win. Gamble asks for Hearts or Spades, then runs a fixed seven-second canvas shuffle: five seconds fast, two seconds slowing down, followed by a 1.5-second result display. The final suit uses `drawGambleSuit`, an independent 50/50 draw. A matching pick doubles payout; a miss pays zero. Total Win and RTP update only after settlement. Escape cannot dismiss either Gamble dialog.
- If a Gamble-eligible round also has a Scatter bonus, show the existing bonus placeholder only after the gamble has settled. Its copy reports the settled payout.
- Random High Cards is implemented: one independent 10% trigger draw before creating each round's deck. A five-second canvas announcement says `HIGH CARDS FEATURE!`, growing for one second, holding for three, and shrinking for one. This duration bypasses the normal 1.25 timing scale and fast mode; reduced-motion users get a stationary fade for five seconds.
- For feature rounds, generate the normal deck after the announcement, then call `upgradeLowCards` before revealing/shuffling it. Convert each low-rank four-suit set into an extra set of an existing J/Q/K rank. Randomize eligible high ranks and cycle evenly. If none exist, fall back to J/Q/K. Retain all IDs, suits, deck size, and non-low cards. This helper expects the unshuffled set-grouped deck from `generateDeck`.
- Uses the supplied `src/assets/reels/main.png` as the canvas background, cropped to focus on the reel cabinet at all viewport sizes.
- Uses 12-frame suit sprites in `src/assets/symbols/{hearts,spades,diamonds,clubs}.png`, mapped in King-to-2 order.
- Uses the two frames of `src/assets/symbols/joker.png` as suitless `Scatter` and `Wild` symbols.
- Generates exactly 48 cards as twelve four-card draws. Ordinary ranks add the full four-suit set; repeated ranks add another set. Wild and Scatter are separate suitless ranks.
- Draw groups are weighted low 60, medium 40, high 15, Scatter 5, Wild 10 (the user's existing tuning, retained on 2026-09-06). There can be at most one Scatter draw, so a deck contains zero or four Scatters.
- Shows up to 12 unique deck ranks in the artwork’s 13-cell top bar. Ordinary ranks use the Hearts sprite. The former custom `CURRENT DECK` canvas overlay was removed because it overlapped the artwork’s lettering.
- Deals the 4×4 reel grid in reading order and previews up to 16 undealt cards in the lower strip.
- Finds equal-rank diagonal pairs in rows 1–2, then rows 2–3, then rows 3–4: within each row pair, descending diagonals scan left-to-right, then ascending diagonals scan right-to-left. Restart from rows 1–2 after every removal, shift, and refill. Wild matches only Wild; Scatter matches only Scatter.
- Animates each matched pair, removes it, compacts rows to the left, then packs the board upward and refills from the deck.
- Match presentation includes a gold payline directly from the upper symbol's centre to the lower symbol's centre, with endpoint markers and a moving direction arrow. The former side-entry badge and horizontal lead-in were removed on 2026-09-06. The line appears during the match highlight and disappears before the cards fly to the collection bar.
- Default gameplay animation durations are scaled by `GAMEPLAY_DURATION_SCALE = 1.25`, making animation durations 25% longer. Development URLs with `motion=fast` still use fast animations; reduced-motion preferences also shorten them.
- Payouts are 0.10 for 2–6, 0.50 for 7–10, and 1.00 for J–K. The 1.00-unit wager is fixed.
- Wild pairs draw one multiplier from the supplied weighted array, add their multipliers together, and multiply the base payout at settlement. With no Wild pair, the multiplier is ×1.
- Two or four collected Scatters open a non-paying bonus-game placeholder after settlement.
- Session-only statistics track spins, total win, and RTP. RTP uses total win divided by total bets (`spins × 1.00`).

## Files to inspect first

| File | Purpose |
| --- | --- |
| `src/main.ts` | Canvas rendering, payline drawing, animation timing, UI, browser interaction |
| `src/game.ts` | Deck generation, matching priority, compaction, payouts, Wild multipliers |
| `tests/game.test.mjs` | Rule and cascade simulation coverage |
| `README.md` | Full user-facing rule specification and development commands |
| `src/style.css` | Responsive outer UI, dialogs, and controls |

## Verification completed

The following commands passed after the Gamble Feature changes:

```powershell
npm test
npm run build
```

The test suite contains 15 tests, including the 10% feature boundary, upgrading existing high sets, no-high/no-low/all-low edge cases, 500 feature-deck conservation checks, 1,000 base-deck checks, Gamble’s exact 50/50 boundary/payout rules/end condition, and 500 simulated cascades. Matching priority, compaction/refill, payouts and multipliers are also covered. Current tests pass with the user's tuned weights and all three matching row pairs.

Manual browser checks completed:

- High Cards announcement verified on desktop and 390×844 mobile. Observed hold at ~1.1 seconds, shrink at ~4.1 seconds, and deck reveal at ~5.1 seconds from the browser click (including tool/click overhead). The announcement uses an exact 5,000 ms animation duration.
- Seed 1972 verified that the deck is revealed only after the feature announcement, that upgraded ranks are J, Q, and 9, and that the round settles normally at 19.50 units. No browser warnings or errors were reported.
- Desktop and 390×844 mobile layouts fit without horizontal scrolling.
- A normal round displayed the payline during a diagonal match and removed it with the matched symbols.
- Before the High Cards feature draw was introduced, seed 3 visually confirmed the new row 2–3 match and its direct centre-to-centre payline. A subsequent top-row match also displayed the shortened line correctly. The browser console remained free of warnings and errors.
- Repeated input is locked during an active round.
- Two-Scatter and four-Scatter bonus placeholders and deck exhaustion were verified in the previous implementation. Seed outcomes changed with the user's weight tuning and the new middle-row matching; see current development helpers below.
- Browser console reported no warnings or errors.
- Seed 10 verified the Gamble offer after the final matching cascade and deck drain. Collect paid the offered 50.40-unit win. After reloading the seed, choosing Spades ran the canvas shuffle and settled the 50.40-unit stake at 100.80 units; choosing Hearts on the same deterministic outcome paid zero. The shuffle panel, choice popup, and final settlement were visually checked in the browser.

## Development helpers

Only in Vite development mode, `?seed=<number>&motion=fast` makes a deterministic fast-animation round. Reload to reset the sequence.

- `?seed=1972&motion=fast`: High Cards triggers; the upgraded deck contains J, Q, and 9 only.
- `?seed=1&motion=fast`: no feature; starts with a rank-8 match between rows 2–3.
- `?seed=6&motion=fast`: multiple Wild pairs.
- `?seed=7&motion=fast`: two collected Scatters.
- `?seed=10&motion=fast`: deck exhaustion.
- `?seed=20&motion=fast`: four collected Scatters.
- `?seed=10&motion=fast`: drains deck with no remaining match; Gamble outcome is Spades. Choose Spades for a double win or Hearts for a loss.
- `?seed=14&motion=fast`: drains deck with no remaining match; Gamble outcome is Hearts.

These outcomes were recalculated after adding the pre-deck feature draw on 2026-09-06. Older seed outcomes no longer apply. Omit `motion=fast` to inspect paylines at normal speed. The feature announcement itself is always five seconds; Gamble shuffle is always seven seconds. In development only, `canvas[data-feature-phase]` exposes `grow`, `hold`, or `shrink` and is removed before the deck is created; `canvas[data-gamble-phase]` exposes `shuffle`, `slowdown`, or `result` for Gamble checks.

Use this prompt to resume work in a fresh session:

> Continue the Four Dicks project in `C:\git\prototypes\4dicks`. Read `SESSION_CONTEXT.md`, `README.md`, and the root `AGENTS.md` first. Preserve the existing implementation, then continue from the requested change. Run `npm test` and `npm run build` after code changes.

## No active request

The latest requested refinements are complete. Await a new feature, art, or balancing request.
