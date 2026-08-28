# Arigatoe — Game Context

## Core presentation

The game is a responsive, high-DPI canvas slot prototype set inside the supplied 1122×1402 Arigatoe television-studio artwork. The reel area is 8 columns × 5 rows. The canvas scales proportionally on mobile and desktop; all logical positions are in the 1122×1402 world defined in `src/main.ts`.

## Sprites

- `cover.png` is divided in half vertically:
  - top tile: regular cover;
  - bottom tile: mystery cover.
- `regular.png` is divided into five equal vertical tiles in this fixed order:
  1. rock
  2. paper
  3. scissors
  4. wild
  5. scatter

## Spin and reveal flow

1. Idle board: all 40 reel cells show regular covers.
2. Tap/click the grid to start a spin.
3. Covers drop in over 0.8 seconds. Each cover is regular with 75% probability or mystery with 25% probability.
4. One rock/paper/scissors player symbol appears above each of the eight columns.
5. After a 0.47-second pause, rows resolve from top to bottom every 2.53 seconds, giving each duel time to show its outcome, shuffle, and move at 1.5× the previous pace.
6. A regular cover reveals rock, paper, or scissors with equal probability. A mystery cover reveals wild with 65% probability or scatter with 35% probability.

### Random feature

- Every spin has a 10% chance to trigger the Random feature after the initial cover drop and before duels begin.
- The supplied `features/random.png` artwork grows in the center of the reel section.
- Over nine seconds, it fires 3–7 mystery covers onto randomly chosen regular-cover cells. Each flying cover begins 50 logical pixels below the artwork's centre, animates to its target, and replaces only that regular cover.
- The feature artwork then shrinks away over 1.8 seconds before normal duels begin. The converted mystery covers remain for the spin and reveal using the standard wild/scatter weights.

## Duel rules

- Rock beats scissors; scissors beat paper; paper beats rock.
- A normal win, wild, or scatter is a successful cell owned by the player.
- A wild always advances the player.
- A scatter always advances the player and increments the round scatter collector.
- A normal loss removes that column’s player from the rest of the round.
- The displayed player symbol is always the exact RPS symbol used to settle the current duel. After the 1.33-second result callout, a successful advancing player (except into the bottom row) shuffles through RPS symbols for 0.43 seconds, then moves to the newly won cell over 0.67 seconds with its fresh RPS symbol. It does not reroll after reaching the bottom row.
- When a promotion move starts, the successful target cell is cleared. This removes beaten RPS symbols, wilds, and scatters from the player’s route while the player moves into the empty cell; losing symbols and unrevealed covers remain visible.
- `Yay!` or `Doh!` is rendered on top of the resolved symbol and fades out after 1.33 seconds.
- Collecting three or more scatters opens a dialog stating the awarded scatter count and that closing it transfers the player to the bonus round.

## Bonus round

- Closing the qualifying-scatter dialog switches to `background/bonus.png` and starts a separate seven-free-spin mode.
- The wheel at the centre-left has 12 persistent, internally identified sections (`id` 0–11). Each bonus round shuffles four rocks, four papers, and four scissors into those sections; they do not change between free spins.
- The right-side `bonus/frame.png` displays a fresh player RPS symbol each free spin. An arrow on the wheel’s left points to the selected stopped section.
- The `bonus/streak_bar.png` sits below the wheel and player frame. Its five indicators light as the streak advances through x2, x3, x5, x8, and x10.
- A loss before reaching a five-win streak resets the streak. Once the player reaches a five-win streak, later losses cannot break it.
- All seven free spins begin automatically as soon as the player closes the qualifying-scatter dialog and run without stopping when a streak breaks. Each spin rotates the wheel to a random persistent section and resolves against the freshly generated player symbol.
- At the end of spin seven, any lit streak-bar value is applied as the final multiplier; an empty streak bar means no multiplier.
- At the end, the final streak multiplier is applied to the entire initial-spin win (including any scatter payout). The existing base win is replaced with its multiplied total, so only the additional amount is added to RTP.
- A completion dialog shows the final multiplier and total win. Closing it returns to a clean base-game idle state.

## Payout logic (current)

The default stake (`BET`) is 1.00 unit.

- Individual successful duels do **not** pay.
- A fully player-owned vertical column (all five cells) pays 1× the stake.
- A fully player-owned horizontal row (all eight cells) pays the stake multiplied by that row’s randomly selected multiplier.
- Row multipliers are independently chosen from `[2, 2, 2, 2, 2, 3, 3, 3, 5, 5, 8]` each spin and are shown to the right of the grid.
- Wild and scatter cells count as player-owned for line completion.
- Scatter rewards are settled once at the end of the spin: 3 scatters pay 1.00, 4 pay 5.00, and 5 or more pay 10.00.
- `WIN` shows the current round’s settled line and scatter winnings. RTP is total settled winnings divided by total wagered spins.

## Current visual/UI behavior

- A 10-slot stats strip is drawn at the bottom. It currently fills Spins, Bet, Win, and Return to Player; the remaining six slots are deliberately reserved.
- Once any scatter appears, an enlarged scatter sprite with a large counter is shown at the game’s upper right. Both the sprite and glowing number pulse continuously from 1× to 1.5× size; its payout appears below the count when it qualifies. Revealed wilds use a gold glow; revealed scatters use a pink glow.
- A round-win overlay plays for 2.27 seconds only if the spin settled a positive line payout.
- The canvas is the only spin control and has an accessibility label.

## Likely next work

- Clarify whether multipliers should affect only their own horizontal row payout (the current behavior) or all accumulated winnings.
- Add deterministic or seeded test modes so line payouts, scatter dialogs, and animation states can be checked without waiting for random outcomes.
- Consider a clearer visual treatment for completed horizontal and vertical winning lines.
- Add a deterministic development trigger for the bonus round so visual and payout paths can be exercised without relying on scatters.
