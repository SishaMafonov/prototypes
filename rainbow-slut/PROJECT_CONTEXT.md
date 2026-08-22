# St. Jackpotrick / Rainbow Slot — Project Context

## Purpose

This is a standalone, client-only canvas slot prototype. Its visual theme is a curved seven-colour rainbow, with a clover multiplier and a Golden Horseshoe bonus feature. The source of truth is `src/main.ts`; `src/style.css` contains all page and overlay styling.

## Project commands

Run commands from `rainbow-slut/`:

```powershell
pnpm install
pnpm run dev
pnpm run build
pnpm run serve
```

The project uses TypeScript, Vite, and a responsive high-DPI canvas. Do not edit `dist/` or `node_modules/`.

## Game layout and input

- One rainbow is split into five adjacent curved reel segments.
- Each reel has seven concentric colour cells, containing a shuffled permutation of red, orange, yellow, green, blue, indigo, and violet.
- The player starts a spin by clicking/tapping the canvas or pressing Enter/Space while the canvas is focused.
- The Auto Play toggle starts the next spin after the previous result and multiplier reveal. Turning it off prevents subsequent spins but does not interrupt a spin already in progress.

## Spin and multiplier flow

1. Each spin generates a target seven-colour order for every reel.
2. Reels visually shuffle and stop left-to-right.
3. During a spin the clover rotates like a propeller, shrinks away, and hides its multiplier.
4. Once the reels stop, a new weighted multiplier is selected and the clover rotates back, grows, and reveals it.
5. The selected multiplier is applied to the base win. The bet is fixed at `1.00`.

Current multiplier weights in `src/main.ts` are:

```ts
[2, 2, 2, 2, 3, 3, 3, 3, 3, 5, 5, 8, 8]
```

## Payout and win rules

For every one of the seven colour rows, the game finds consecutive matching colours across the five reels. Only runs of three or more pay.

| Consecutive matching reels | Base return |
| --- | ---: |
| 1–2 | 0.00 |
| 3 | 0.25 |
| 4 | 0.75 |
| 5 | 10.00 |

- The final return is `base win × multiplier × bet`.
- A full rainbow means all five reels have the same complete seven-colour order. It awards a base win of `7.00`, increments **Max rainbow hits**, and starts the large leprechaun/bug/sparkle celebration.
- Paid cells pulse with a bright outline and sparkles; every paid round also displays the `WIN` callout.

## Golden Horseshoe feature

The current implementation deliberately uses a 5% trigger rate:

```ts
horseShoe = Math.floor(Math.random() * 100)
if ([10, 20, 30, 40, 50].includes(horseShoe)) {
  // activate feature
}
```

When triggered:

- A random starting reel from 0–2 is selected.
- That reel and the next two adjacent reels receive the same shuffled seven-colour target order, guaranteeing three-of-a-kind rows and therefore a win.
- The feature spin takes twice the standard reel-stop duration, with the **Golden Horseshoe Approaching…** anticipation text.
- A glowing horseshoe appears above the rainbow and animated coins surround the inner edge, outer edge, and ends of every affected curved reel.
- **Horseshoe hits** increments immediately when the feature activates.

## Statistics

The bottom status bar tracks:

- Spins
- Winning rounds
- Total won (cumulative monetary return)
- Average win (total won divided by winning rounds)
- Return to player (total won divided by total bet)
- Max rainbow hits
- Horseshoe hits

Statistics are intentionally in-memory only and reset on browser reload.

## Key state and extension guidance

- `reelColors` is the current rendered reel state; `targets` is the outcome that reels settle on.
- `spinning`, `stopped`, and `offsets` control the visual stop sequence.
- `goldenReels`, `goldenFeatureActive`, and `goldenFeatureUntil` control Horseshoe feature rendering and its longer timing.
- `scoreRound()` owns payout evaluation and post-spin result handling.
- `drawMachine()` owns frame-level rendering; keep new canvas effects inside or alongside its draw helpers.
- Preserve the canvas resize transform in `resizeCanvas()` when changing dimensions or drawing geometry.

## Restore point

The source-only checkpoint from this working state is stored at:

`checkpoints/rainbow-slut-current-2026-08-21-context.zip`

See `checkpoints/README.md` for extraction and install instructions.
