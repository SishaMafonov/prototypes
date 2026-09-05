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

- Exactly 48 cards, generated as twelve four-card draws. Choose a category with relative weights low 50, medium 40, high 30, Scatter 10, Wild 20; choose uniformly among that category’s ranks. These weights total 150 and are normalized, rather than treated as independent percentages.
- Normal rank draws add all four suits. Repeated rank draws add another full suit set. Wild draws add four suitless Wilds. At most one Scatter draw is allowed, giving either zero or four suitless Scatters; later draws renormalize the remaining categories.
- The 13-cell current-deck bar shows unique ranks in K–2, Scatter, Wild order, using Hearts artwork for ordinary ranks. Twelve draws mean at most twelve unique ranks are present in any deck. Counters show collected pairs; the Wild counter shows the summed multiplier.
- Shuffle and deal left to right, top to bottom. The queue strip previews up to 16 undealt cards, in the order they will enter the board. Hidden cards replenish the strip until the deck is exhausted.
- Check adjacent diagonals in rows 1–2 first: descending diagonals left to right, then ascending diagonals right to left. If none match, check rows 3–4 with the same priority. Rows 2–3 are not a matching band. Suits do not affect matches; Wild and Scatter are separate ranks, and do not substitute for other ranks.
- Remove one matching pair at a time, compact each row left, then pack cards upward in stable row-major order. Refill from the queue and restart checking from the top. End when no matching pair remains or all cards have been collected.
- Each matched pair pays 0.10 for 2–6, 0.50 for 7–10, or 1.00 for J–K. Bet is 1.00. Scatter and Wild have no direct payout.
- Each Wild pair draws once from `[2.2, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 8, 8, 10]`. Add all drawn multipliers, then multiply the base win at settlement. Without a Wild pair, use ×1. Round winnings are rounded to two decimals.
- Collecting two or four Scatters opens one bonus placeholder after the base round settles. The placeholder adds no winnings.
- Session totals remain in memory until reload. RTP is settled total winnings divided by total bets (spins × 1.00), displayed as a percentage. Each spin counts when it starts; its winnings are added when it settles. Click/tap the canvas or Deal button to play; Space/Enter also work when the canvas is focused. Input is locked while a round is running.

## Artwork and layout

`src/main.ts` maps each of the twelve equal-width frames in the four suit sprites from King through 2. The two frames of `joker.png` map to Scatter and Wild. Sprites retain their aspect ratios. The canvas uses the reels portion of `src/assets/reels/main.png`, cropping the tall scenery so the game remains usable on phones and short desktop screens. All images remain unmodified. Drawing uses fixed artwork coordinates and scales to the canvas with high-DPI backing resolution.

`src/game.ts` contains deterministic rule functions. `tests/game.test.mjs` covers deck composition, weighted selection, matching priority, compaction, payouts, and card conservation across simulated cascades.

## Reproducible browser checks

Only in the Vite development build, add `?seed=8&motion=fast` to the URL and start a round. Reload to reset the seed. The production build ignores these parameters.

- Seed 8: two collected Scatters.
- Seed 44: multiple Wild pairs.
- Seed 337: four collected Scatters and an exhausted deck.

Reduced-motion preferences also shorten animations.
