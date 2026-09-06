# Four Dicks

Standalone, responsive canvas card-slot prototype using the supplied artwork. No backend or real-money transactions.

## Run

Use Node 24+ and npm from this directory:

```sh
npm install
npm run dev
npm test
npm run build
npm run serve
```

The static server serves `dist/` on port 1234. The Vite development server prints its URL when started.

## Base-game rules

- Before deck creation, draw once for Random High Cards with a 10% chance. When triggered, show `HIGH CARDS FEATURE!` for exactly five seconds: grow from the canvas centre for one second, hold for three, then shrink back for one. Input stays locked. The feature duration is independent of gameplay speed; reduced motion uses a stationary fade for the same duration.
- On a feature round, first generate the normal deck, then replace every low (2–6) four-suit set with an extra high-rank set. Eligible targets are the distinct J/Q/K ranks already present, in a randomized order, cycling so each receives one extra set before repeating. If there are no high ranks, use all of J/Q/K. Thus two King sets plus one converted low set can become three King sets. Keep 48 cards, complete suit sets, and all medium/Wild/Scatter cards. The top bar and upcoming cards reflect the upgraded deck.
- Exactly 48 cards, generated as twelve four-card draws. Choose a category with relative weights low 60, medium 40, high 15, Scatter 5, Wild 10; choose uniformly among that category’s ranks. These weights total 130 and are normalized, rather than treated as independent percentages.
- Normal rank draws add all four suits. Repeated rank draws add another full suit set. Wild draws add four suitless Wilds. At most one Scatter draw is allowed, giving either zero or four suitless Scatters; later draws renormalize the remaining categories.
- The 13-cell current-deck bar shows unique ranks in K–2, Scatter, Wild order, using Hearts artwork for ordinary ranks. Twelve draws mean at most twelve unique ranks are present in any deck. Counters show collected pairs; the Wild counter shows the summed multiplier.
- Shuffle and deal left to right, top to bottom. The queue strip previews up to 16 undealt cards, in the order they will enter the board. Hidden cards replenish the strip until the deck is exhausted.
- Check adjacent diagonals in rows 1–2 first: descending diagonals left to right, then ascending diagonals right to left. If none match, check rows 2–3, then rows 3–4 with the same priority. Suits do not affect matches; Wild and Scatter are separate ranks, and do not substitute for other ranks.
- Gold paylines connect the centre of the upper matched symbol directly to the centre of the lower matched symbol, with an arrow pointing toward the lower symbol. They disappear when removal begins. Default animation durations are 25% longer than the original base-game implementation.
- Remove one matching pair at a time, compact each row left, then pack cards upward in stable row-major order. Refill from the queue and restart checking from the top. End when no matching pair remains or all cards have been collected.
- Each matched pair pays 0.10 for 2–6, 0.50 for 7–10, or 1.00 for J–K. Bet is 1.00. Scatter and Wild have no direct payout.
- Each Wild pair draws once from `[2.2, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 8, 8, 10]`. Add all drawn multipliers, then multiply the base win at settlement. Without a Wild pair, use ×1. Round winnings are rounded to two decimals.
- Collecting two or four Scatters opens one bonus placeholder after the base round settles. The placeholder adds no winnings.
- When the upcoming deck is drained and the reels contain no remaining diagonal match, Gamble Feature pauses settlement. The player can Collect the current win or choose Gamble. Gamble opens Hearts and Spades choices, then closes the choice popup for a fixed seven-second centre-canvas shuffle. The first five seconds shuffle quickly; the final two slow down before landing on a 50/50 Hearts or Spades result. A correct pick doubles the win; an incorrect pick settles at 0. The result holds briefly before settlement. If Scatters also earned a bonus placeholder, it appears after the gamble settles.
- Session totals remain in memory until reload. RTP is settled total winnings divided by total bets (spins × 1.00), displayed as a percentage. Each spin counts when it starts; its winnings are added when it settles. Click/tap the canvas or Deal button to play; Space/Enter also work when the canvas is focused. Input is locked while a round is running.

## Artwork and layout

`src/main.ts` maps each of the twelve equal-width frames in the four suit sprites from King through 2. The two frames of `joker.png` map to Scatter and Wild. Sprites retain their aspect ratios. The canvas uses the reels portion of `src/assets/reels/main.png`, cropping the tall scenery so the game remains usable on phones and short desktop screens. All images remain unmodified. Drawing uses fixed artwork coordinates and scales to the canvas with high-DPI backing resolution.

`src/game.ts` contains deterministic rule functions. `tests/game.test.mjs` covers deck composition, weighted selection, matching priority, compaction, payouts, and card conservation across simulated cascades.

## Reproducible browser checks

Only in the Vite development build, add `?seed=1972&motion=fast` to the URL and start a round. Reload to reset the seed. The production build ignores these parameters. The feature announcement always takes five seconds, even with `motion=fast`.

- Seed 1972: triggers High Cards; low sets become extra J/Q sets, with 9 remaining as the only medium rank.
- Seed 1: no feature; first match between rows 2–3 (rank 8, upper-right to lower-left).
- Seed 6: multiple Wild pairs.
- Seed 7: two collected Scatters.
- Seed 10: deck exhaustion.
- Seed 20: four collected Scatters.
- Seed 10: a drained deck with no remaining match; Gamble resolves to Spades. Pick Spades to test a double win or Hearts to test a loss.
- Seed 14: a drained deck with no remaining match; Gamble resolves to Hearts.

The pre-deck feature draw consumes a random value, so seeds from older versions have different outcomes. During development, `canvas[data-feature-phase]` exposes `grow`, `hold`, or `shrink` for timing/visual checks; the attribute is removed before deck creation. `canvas[data-gamble-phase]` exposes `shuffle`, `slowdown`, and `result` during the Gamble sequence.

Reduced-motion preferences also shorten animations.
