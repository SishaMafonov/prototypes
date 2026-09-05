# Four Dicks — Development Handoff

Last updated: 2026-09-05

## Project identity

`4dicks` is an independent TypeScript/Vite browser prototype in `C:\git\prototypes\4dicks`. It is a responsive, canvas-based card-slot game. All game state, drawing, animation, input, and UI overlays live in `src/main.ts`; deterministic deck and payout rules live in `src/game.ts`.

The project is currently untracked by the repository (`git status --short` shows `?? ./`). No commit has been created. Preserve every project file when resuming.

## Current implementation

- Uses the supplied `src/assets/reels/main.png` as the canvas background, cropped to focus on the reel cabinet at all viewport sizes.
- Uses 12-frame suit sprites in `src/assets/symbols/{hearts,spades,diamonds,clubs}.png`, mapped in King-to-2 order.
- Uses the two frames of `src/assets/symbols/joker.png` as suitless `Scatter` and `Wild` symbols.
- Generates exactly 48 cards as twelve four-card draws. Ordinary ranks add the full four-suit set; repeated ranks add another set. Wild and Scatter are separate suitless ranks.
- Draw groups are weighted low 50, medium 40, high 30, Scatter 10, Wild 20. There can be at most one Scatter draw, so a deck contains zero or four Scatters.
- Shows up to 12 unique deck ranks in the artwork’s 13-cell top bar. Ordinary ranks use the Hearts sprite. The former custom `CURRENT DECK` canvas overlay was removed because it overlapped the artwork’s lettering.
- Deals the 4×4 reel grid in reading order and previews up to 16 undealt cards in the lower strip.
- Finds equal-rank diagonal pairs in rows 1–2 before rows 3–4: descending diagonals scan left-to-right, then ascending diagonals scan right-to-left. Wild matches only Wild; Scatter matches only Scatter.
- Animates each matched pair, removes it, compacts rows to the left, then packs the board upward and refills from the deck.
- Match presentation now includes a gold classic-slot-style payline: a start-side badge, line, moving direction arrow, and target marker. It appears during the match highlight and disappears before the cards fly to the collection bar.
- Default gameplay animation durations are scaled by `GAMEPLAY_DURATION_SCALE = 1.25`, making gameplay 25% slower. Development URLs with `motion=fast` still use fast animations; reduced-motion preferences also shorten them.
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

The following commands passed after the latest visual changes:

```powershell
npm test
npm run build
```

The test suite contains 7 tests: 1,000 generated-deck checks and 500 simulated cascades, matching priority, compaction, payouts, multiplier selection, and card conservation.

Manual browser checks completed:

- Desktop and 390×844 mobile layouts fit without horizontal scrolling.
- A normal round displayed the payline during a diagonal match and removed it with the matched symbols.
- Repeated input is locked during an active round.
- Seed 8 triggered the two-Scatter bonus placeholder.
- Seed 337 triggered the four-Scatter bonus placeholder and showed an empty upcoming strip after deck exhaustion.
- Browser console reported no warnings or errors.

## Development helpers

Only in Vite development mode, `?seed=<number>&motion=fast` makes a deterministic fast-animation round. Reload to reset the sequence.

- `?seed=8&motion=fast`: two collected Scatters.
- `?seed=44&motion=fast`: multiple Wild pairs.
- `?seed=337&motion=fast`: four collected Scatters and a drained deck.

Use this prompt to resume work in a fresh session:

> Continue the Four Dicks project in `C:\git\prototypes\4dicks`. Read `SESSION_CONTEXT.md`, `README.md`, and the root `AGENTS.md` first. Preserve the existing implementation, then continue from the requested change. Run `npm test` and `npm run build` after code changes.

## No active request

The latest requested refinements are complete. Await a new feature, art, or balancing request.
