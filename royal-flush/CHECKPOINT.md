# Royal Flush — Agent Checkpoint

This document is the source-of-truth handoff for future agents. Read it before changing `royal-flush/`.

## Project identity and runbook

- Location: `C:\git\prototypes\royal-flush`
- Type: standalone, client-only TypeScript/Vite browser game; it is not part of a repository-wide Node workspace.
- Package manager: pnpm (`packageManager: pnpm@11.19.0`); do not install dependencies or run builds from `C:\git\prototypes`.
- Main source files: `src/main.ts` (state, rules, DOM, animation sequencing) and `src/style.css` (layout, sprite crops, visual effects).
- Entry page: `index.html` loads `/src/main.ts`.
- Assets: `assets/RoyalFlush_grid.png` and `assets/RoyalFlush_symbols_sprite.png`.
- Generated directories: `node_modules/` and `dist/`; never hand-edit either.

From this directory:

```powershell
pnpm install
pnpm run dev
pnpm run build
pnpm run serve
```

`pnpm run build` performs `tsc --noEmit && vite build`. `pnpm run serve` serves `dist/` on port 1234. Do not leave a dev/preview/static server running when handing work back.

## Current visual layout

- The stage is the responsive `941 / 1672` aspect-ratio image in `RoyalFlush_grid.png`.
- The playable CSS grid is an absolute overlay at `top: 28.4%`, `left: 6.1%`, width `88.25%`, height `49.65%`.
- The start prompt is a real DOM overlay placed on the decorative prompt plaque. It is ready/glowing through `.tap-prompt.is-ready` and grey/busy through `.tap-prompt.is-busy`.
- The prompt is intentionally positioned at `top: 82.35%`, `left: 21.4%`, width `58%`; adjust cautiously and validate visually against the background image.
- A `WIN <amount>` overlay appears for exactly two seconds after a resolved round that produced at least one win.
- The page has a fixed bet display of `1.00` and a session statistics panel for spins, total win, RTP, wild reshuffles, bonus hits, and 3/4/5-match hits.

## Sprite sheet: non-uniform crop rules

`assets/RoyalFlush_symbols_sprite.png` is currently **821 × 1915 px** and contains seven vertical items. The source generator did not keep all frame heights equal. Do **not** return to `height / 7` slicing: it leaks pixels from adjacent symbols.

The measured outer gold-frame source bounds are:

| Symbol | Source Y range, inclusive | Source height | CSS class |
| --- | ---: | ---: | --- |
| Scatter (pirate woman) | 20–284 | 265 px | `.symbol-scatter` |
| Wild (maelstrom) | 307–572 | 266 px | `.symbol-wild` |
| Gold Coin | 600–866 | 267 px | `.symbol-coin` |
| Diamond | 892–1156 | 265 px | `.symbol-diamond` |
| Gear / weapons chest | 1181–1446 | 266 px | `.symbol-gear` |
| Treasure Map | 1466–1677 | 212 px | `.symbol-map` |
| Pirate Flag | 1701–1901 | 201 px | `.symbol-flag` |

`src/style.css` implements those bounds with a per-symbol `background-size` and `background-position`. The sheet is horizontally enlarged to `300%` and centered because the artwork has horizontal padding. Preserve this approach unless the source asset changes again; if it does, re-measure the gold-frame bounds and update all seven rules together.

## Game state and rules

The game is a 5 × 5 `Board`, represented as `Cell[][]` in `src/main.ts`. `Cell` is a symbol or `null` while a winner has been removed.

### Symbols

- Special: `scatter`, `wild`, and the post-activation `spentWild` (displayed as `W`).
- Regular: `coin`, `diamond`, `gear`, `map`, `flag`.
- The matching solver considers regular symbols plus `spentWild`; an untransformed `wild` is intentionally **not** a winning-line substitute.
- Scatter never matches or destroys. It receives a pink frame that fully fades out then reaches bright full intensity over one second.
- Wild receives the equivalent gold frame. Its initial animation is a whirl; when activated it stays in its original cell, draws every other tile inward, shuffles those 24 tiles, launches them back out from its own cell, and only then becomes `spentWild` (W) in the same position.

### Current random weights

`randomSymbol()` rolls an integer from 0 through 9999. The current thresholds are source-of-truth:

| Symbol / pool | Roll range | Approx. probability |
| --- | ---: | ---: |
| Scatter | 0–90 | 0.91% |
| Wild | 91–240 | 1.50% |
| Coin | 241–2192 | 19.52% |
| Diamond | 2193–4144 | 19.52% |
| Gear | 4145–6096 | 19.52% |
| Map | 6097–8048 | 19.52% |
| Flag | 8049–9999 | 19.51% |

These retain the existing special-symbol thresholds and split the remaining pool almost evenly across the five regular symbols. Do not silently change these numbers; update this table alongside any deliberate probability change.

### Payouts and matching

- Current payout table: three = `0.10`, four = `0.50`, five = `1.00`.
- `findWinningMatches()` checks horizontal and vertical contiguous runs. A transformed W can participate in more than one matching line, while Scatter and untransformed Wild cannot.
- Each found matching line increments its corresponding statistics counter. The current round’s payout is shown only after all cascades and Wild effects settle.

### Round lifecycle

1. The opening board is generated with no winning line (`createSafeBoard`).
2. Click/tap the grid, or focus it and press Enter/Space, to start a spin. New symbols grow in over `0.65s`; the spin wait is `750ms`.
3. Each winning tile gets the KABOOM effect, then only winning elements are removed from the live DOM.
4. `collapseAndRefill()` uses FLIP-style movement: only survivors that must move have their `gridRow`/`gridColumn` updated and translated into place. Unmoved old tiles remain untouched in the DOM.
5. New symbols are appended directly to empty positions and use `.land` to fall from above. This behavior is intentional; do not replace it with a whole-grid `render()` during ordinary cascades.
6. Repeat until no winning line remains.
7. If any untransformed Wild remains, activate the top-leftmost Wild. It remains fixed while the other 24 symbols are collected, shuffled, and thrown outward from its cell; then it transforms into W in place. Return to matching.
8. After all wins/Wilds resolve, show the two-second win popup if the round paid anything.
9. Count Scatter tiles: exactly 3 gives 10 action points, 4 gives 15, 5 or more gives 20. Show the placeholder bonus modal; its button returns to a ready board. Bonus gameplay is not implemented.

## Implementation notes and safe editing guidance

- `render()` performs a full board replacement. It is correct for the initial board and a new spin. Do not call it inside normal win removal/collapse flow or the Wild reshuffle sequence; both preserve/reuse the active DOM tiles.
- `createCell()` is the one place that creates visible tiles. It assigns CSS grid coordinates and the accessibility label. Keep any new symbol type in its union type, label map, and CSS sprite rule.
- `cellAt()` relies on `data-row` and `data-column`; maintain those attributes whenever moving tile elements.
- `busy`, `currentRoundWin`, and `bonusModal.hidden` gate input. A future change to the flow should leave the game either ready (`setRoundReady(true)`) or intentionally blocked by the bonus modal.
- The game has no persistence; all session statistics reset on browser reload.
- Keep it keyboard-accessible: the grid remains a focusable button-like element with Enter/Space activation and `aria-disabled` during an active round.

## Verification checkpoint

At this checkpoint, `pnpm run build` succeeds. The last visual smoke test showed all seven symbols fully contained in their own gold frames, including the shorter Map and Flag frames. Earlier smoke tests exercised a spin, cascades, targeted DOM movement, Wild reshuffles, the bonus placeholder, and the ready/busy prompt states.

For future visual work, run the dev server from this directory, open the local game in a browser, check a ready board and at least one completed spin, then stop the server before handoff.
