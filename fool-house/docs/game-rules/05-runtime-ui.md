---
document_type: rules_module
ruleset_id: fool-house-2026-10-25-v2
context: visible states, nominal animation timing, layout, input accessibility, failure paths
read_when: UX comparison, runtime exceptions, rendering or timing changes
branch_ids: U01-U16, E01-E09
---

# 05 — Runtime, presentation, and exceptional branches

**Context packet:** the controller locks input for the entire paid-round chain. Its ten states are `loading`, `ready`, `drawing`, `winning`, `room-bonus`, `removing`, `cleared`, `refilling`, `switching`, and `error`. Rendering does not choose outcomes. Scatter is visual/nonpaying; tier tints identify symbols; teal identifies current room-bonus winners.

**Authority:** [src/main.ts](../../src/main.ts), particularly `playPhase`, drawing helpers, `resize`, image loaders and `start`; [src/style.css](../../src/style.css) for media-query behavior, badge pulse, and HUD styling.

## State messages and nominal durations

| State/use | Message | Nominal duration |
| --- | --- | --- |
| `loading` | `Loading Fool House…` | Until required artwork is ready or load fails. |
| `ready`, first preview | `Tap or click to start · Bet 1.00` | Until accepted input. |
| `drawing`, paid preparation | `Preparing the next round…` | Synchronous setup; not a separate timed phase. |
| `drawing`, preview/paid board | `Drawing symbols…` | 740 ms. |
| `winning` | `Win {base_batch_award} · x{stage_multiplier}` | 550 ms. Includes stage multiplication, before room bonus. |
| `room-bonus` | `Room bonus ×{rolls} · Win {final_batch_award}` | 1100 ms, only when at least one group matches the room. |
| `removing` | `Collecting {final_batch_award}…` | 240 ms, then removal/credit/collection commit. |
| `cleared` | `Refilling empty cells…` | 120 ms. |
| `refilling` | `Drawing replacement symbols…` | 740 ms. |
| `switching`, old stage | `Switching to the next stage` | 1200 ms with popup and old survivors. |
| `switching`, cleared board | Same | 180 ms with popup and all cells empty. |
| `drawing`, free board | `Free respin · x{multiplier}` | 740 ms. |
| `ready`, settled paid chain | `Won {round_win} · Tap or click · Bet 1.00` | Until accepted input; `round_win` can be 0.00. |
| `error`, caught startup failure | `Unable to load the game artwork. Please reload to try again.` | No recovery action except reload is wired. |
| `error`, caught round failure | `Round interrupted. Please reload.` | Same. |

## Rendering and timing branch catalogue

| ID | Condition | Behavior |
| --- | --- | --- |
| U01 | Scene assets are absent | Main draw clears the canvas then returns; symbol draw returns. Loading/error text is a separate DOM status element. |
| U02 | Unmatched regular symbol renders | Low keeps dark backing; Mid gets a translucent light-red radial wash; High gets light gold. Tints are behind the original artwork and clipped to the aperture. |
| U03 | Scatter renders | Use the whole standalone PNG (regular sheets use width / 5). Reserve 25% of cell height above the mansion; add violet backing, silver/violet gradient border, glow, and `SCATTER` label. Accent opacity follows growth. |
| U04 | Cell is newly dealt/refilled and its state is `drawing`/`refilling` | Grow from its center using the stagger/easing formula below. In a refill, surviving symbols stay full-size. Delays use absolute row/column positions, even if only one hole is replaced. |
| U05 | Cell is empty or its growth has not started/is zero | Draw its backing but no symbol or Scatter label/accent. |
| U06 | Cell belongs to a winning group | Strong gold backing overrides ordinary Mid/High tint; draw gold glow and outline. During `removing`, shrink by `1 - phase_progress`. Frame artwork is drawn above all cell contents. |
| U07 | Collection slot is waiting / collected | Waiting Low remains dark; waiting Mid/High use their tints. Collected slots use a stronger gold fill/border/glow, gold text and `✓`, replacing the waiting tint. Collection icon itself is not re-colored. |
| U08 | Multiplier is x1 / greater than x1 | Badge always shows `x{multiplier}` at reel top right. Above x1 it gains the CSS glow/pulse (`1.2s`, repeating). Stage popup is shown only during completion and is not dismissible/clickable. |
| U09 | Viewport changes | Background center-crops to cover the viewport; title sits at top center; frame stays centered in the viewport. Frame size reserves title space and room below for collection and HUD. Aspect ratios are preserved. Board, progress, counters, and RNG outcomes do not change. |
| U10 | Viewport height is below 500 CSS px | Canvas uses compact collection icons/slots (64 px maximum slot width instead of 100), 13 px label reserve instead of 15. At height >=500, use normal canvas sizing. CSS compact message/statistics styles independently apply at height **<=500**, so exactly 500 has compact CSS with normal canvas sizing. |
| U11 | Resize/density redraw | Use canvas CSS bounds, `devicePixelRatio || 1`, rounded backing dimensions at least 1 pixel, and a matching context transform. `ResizeObserver` watches canvas and HUD; window resize also redraws. There is no reroll on resize. |
| U12 | Reduced-motion preference matches | Shorten phases other than `switching` and `room-bonus` to `min(original,180)` ms. Keep bonus text visible for all 1100 ms, without its CSS reveal animation. Growth is immediately full-size; winning glow is static (8), badge CSS pulse stops. Removal still shrinks briefly. |
| U13 | Phase elapsed time is below / at least its stored duration | Draw and schedule another animation frame / draw and resolve its promise. Phases are sequential. Browser throttling or suspended animation frames may increase wall-clock time; no separate pause/resume/cancel feature exists. |
| U14 | Accessible descriptions/status update | Canvas is a focusable button with a static start label and `aria-disabled` except while ready. Status is a polite live region. Hidden descriptions report each row (including `scatter`/`empty`), multiplier, and collected/waiting tiers. Descriptions refresh at phase starts and settlement, not just at initial load. |
| U15 | Overlay/HUD is under a pointer | Their CSS uses `pointer-events: none`, allowing the canvas beneath to receive the action. There is one whole-canvas start control, no separate Spin/Stop/Collect/Popup button. Keyboard behavior and lock guards are specified in [02](02-round-flow.md). |
| U16 | State is `room-bonus` | Show a centered room-name panel with one row per eligible winning group: tier, its x2/x3/x5/x8 roll, and stage-adjusted amount → final boosted amount. Reveal with a scale/glow animation; matched member cells turn teal. Stage multiplier badge remains separate. Hide and clear room highlights before removal; no additional input is accepted. |

### Growth formula

```text
symbol_duration = 340 ms
start_delay(row,column) = column*65 + row*35 ms    # zero-based indexes 0..4
p = clamp((elapsed - start_delay) / 340, 0, 1)
growth = 1 - (1-p)^3
full_deal_phase = 340 + 4*65 + 4*35 = 740 ms
```

If reduced motion is active, or the cell is not currently growing, `p = 1`. A winning symbol in removal is additionally multiplied by `1 - min(1, elapsed/phase_duration)`. Rendering reads the current motion preference; a phase's stored duration is selected when that phase starts.

### Active asset and grid contract

- Frame: `src/assets/reels/main-5x5.png`, source size 1164×1351. `main.png` is preserved old 5×4 art, not the active frame.
- Title: `src/assets/reels/title.png`.
- Regular sheets: `src/assets/symbols/{low,mid,high}.png`, five horizontal frames each. Fractional crop widths are retained rather than rounded.
- Scatter: `src/assets/symbols/scatter.png`, one whole portrait icon.
- Frame column openings `[x,width]`: `[[143,147],[321,153],[505,154],[690,153],[875,146]]`.
- Frame row openings `[y,height]`: `[[202,143],[377,161],[572,164],[769,160],[963,162]]`.
- Popup center is at 50% horizontal / 47% vertical within the full frame rectangle. Collection panel sits between frame and status bar; it is not a second game board.

## Loading and exceptional branches

| ID | Condition | Actual behavior |
| --- | --- | --- |
| E01 | Required `#app` root is missing at startup | Throw `Missing app element` before the `start()` catch. No friendly error-screen path is established. |
| E02 | Canvas 2D context is unavailable | Throw `Canvas 2D is unavailable` before `start()`; likewise outside its friendly loading-error handler. |
| E03 | Image URL already has a cached promise | Return that same promise, whether decoding is pending or already fulfilled. No second image/decode request. |
| E04 | Image URL is uncached / decode rejects | Create/cache an image decode promise. On rejection, delete that cache entry and propagate rejection. Cache eviction allows a future loader call to retry; the current UI does not automatically issue one. |
| E05 | A required theme's background URL is absent from the Vite glob | Return a rejected promise containing `Missing background for {theme}`. Startup's combined load handles it as failure. |
| E06 | Any error reaches `start()`'s catch (including any of 11 image loads) | Enter `error` with the artwork-reload message and log a console error. All backgrounds are required before play; there is no “skip bad room” or partial-load fallback. |
| E07 | An error reaches the awaited `requestRound()` chain's catch | Enter `error` with the interrupted-round message and log a console error. No automatic rollback, refund, continuation, or ready-state retry. Existing counters may reflect partial work. |
| E08 | Error occurs in an asynchronous animation-frame/observer/event callback outside those awaited catches | There is no general error boundary or promise rejection wiring from an animation callback exception. Do not assume E06/E07 handle every browser/rendering failure; a phase can remain unresolved. |
| E09 | Input arrives after error, or page is reloaded | Error-state input is discarded by the normal ready guard. Reload creates a fresh unpaid preview and zero session; it does not recover the interrupted chain. |

All room images are decoded up front, so successful gameplay does not fetch a new room image during a free-stage transition. There are no deliberate round-time network/API/database branches. Internal helpers that require assets (`applyTheme`, collection description, drawing, and the resolution loop guard) return/do nothing if assets are absent; normal accepted play cannot enter that condition.
