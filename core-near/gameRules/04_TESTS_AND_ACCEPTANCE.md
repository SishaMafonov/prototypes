# Ray simulation, scoring, tests and definition of done

The original requirements are preserved in [the 22-section Canvas brief](02_CODEX_CANVAS_SPECIFICATION.md). This supplement adds concrete expected outcomes and resolves implementation gaps. Added conventions are prototype decisions, not additional user-confirmed childhood rules.

## Pure ray simulation

Keep simulation separate from rendering and mutation. The source used `board: BoardState`; use an immutable static-board view instead, so trajectory and ownership state cannot accidentally influence movement.

```ts
interface RaySimulation {
  points: GridPoint[]; // launch, then each consecutive unit-step endpoint
  edges: Edge[];       // ordered traversal, including any retracing
  termination: "flat-wall" | "loop" | "invalid";
}
```

Implement this sequence:

```text
simulateRay(launch, board):
    validate launch against static geometry and eligible launch list
    if invalid: return invalid without mutation

    current = launch position
    direction = launch direction
    points = [current]
    edges = []
    visited = empty set

    repeat:
        state = (current.x, current.y, direction)
        if state already visited:
            return {points, edges, termination: "loop"}
        add state to visited

        next = current + direction
        if unit edge current -> next is not traversable:
            return {points, edges, termination: "invalid"}

        append edge(current, next)
        append next to points
        current = next

        classify current using STATIC geometry and the cell mask

        if arriving at a flat wall:
            return {points, edges, termination: "flat-wall"}

        if at a reachable static corner:
            direction = validated corner transition
            if no valid transition:
                return {points, edges, termination: "invalid"}

        otherwise continue straight
```

The first iteration departs from the launch wall; do not classify the starting wall as an immediate stop. The edge reaching a terminating wall is included in the result.

State keys include direction. Revisiting a position from another direction is not, by itself, a loop. Check states at the top of each iteration after the previous arrival has been resolved. The finite state space is bounded by four times the number of grid vertices in the bounding rectangle. An additional defensive step cap may detect implementation faults, but must not silently accept a partial path.

Only `flat-wall` results are legal moves. For `loop` or `invalid`, retain the current player, scores, owners and history unchanged. Do not animate or commit a partial failed path. The interface may show why that launch is unavailable.

## Atomic move lifecycle

1. While ready, snap pointer input to an eligible launch grid vertex. Validate again on click.
2. Simulate using the static-board definition. A preview uses the same simulator.
3. If legal, retain the mover and the simulation result, and enter the animating phase.
4. Animate at 6–12 grid cells per second, with optional 50–100 ms pauses at turns. Use elapsed time, not frames counted.
5. On successful animation completion, commit trajectory keys and the history record once.
6. Capture newly completed cells for the retained mover, recompute scores and test completion.
7. Enter finished state with winner/draw, or switch player and return to ready.

Ignore repeated clicks during animation. Disable game-changing controls during animation or make reset explicitly cancel the animation and invalidate its completion callback. A reset must never receive a late commit from a cancelled move.

For this handoff, “Restart Board” clears the current board's runtime state; “Reset Game” returns to the default board and initial display settings. With one board their gameplay effect is identical. X starts as a prototype default; the historical conversation did not establish how the first player was chosen.

## Scoring and canonical edge presence

Use the original `edgeKey` and `isCellComplete` functions in [geometry and CSV examples](03_GEOMETRY_AND_CSV_EXAMPLES.md). The following pseudocode makes the before/after transition explicit:

```text
commitValidMove(mover, simulation):
    before = union(staticEdgeKeys, trajectoryEdgeKeys)

    for edge in simulation.edges:
        add normalized edge key to trajectoryEdgeKeys

    after = union(staticEdgeKeys, trajectoryEdgeKeys)

    for each cell in the board's explicit interior cell list:
        if cell.blocked or cell.owner is not null:
            continue
        if not complete(cell, before) and complete(cell, after):
            cell.owner = mover

    append one TraceRecord(mover, simulation.edges)
    scoreX = count of non-blocked cells owned by X
    scoreO = count of non-blocked cells owned by O
```

For a small prototype, scan every playable cell. If optimized later, inspect the one or two cells adjacent to each newly added edge and deduplicate candidates. Preserve identical outcomes.

An edge may be present statically, drawn by either player, or both. Presence is Boolean. A replayed path may appear again in history but cannot add duplicate scoring edges or transfer ownership. A valid zero-capture or zero-new-edge move still consumes the turn, consistent with allowing retracing.

### Initially complete cells

A playable cell bounded on all four sides by static edges would be complete before anyone moved. The original brief did not assign such a cell. For this prototype, reject boards containing initially complete playable cells rather than award them to whichever player moves first. This is a board-validation convention added in this handoff.

### Endgame and board reachability

End the game when all listed non-blocked cells have owners, compare the two counts and show X wins, O wins or Draw. Do not silently use the earlier, unconfirmed alternative end condition.

Because collision geometry is static, every launch has a fixed path. Before accepting a demo board:

1. Simulate every eligible launch and collect edges from every terminating result.
2. Union those edges with the static edges.
3. Check whether all four sides of every playable cell occur in that union.
4. Reject the board as unsuitable for the all-cells-claimed demo if any cell cannot be completed.

This verifies possible completion; it does not guarantee that players will stop repeating old paths. Do not add a new no-progress ending, forbid retracing or change collision rules to force progress.

The complete 5×5 fixture supplied in this package passes this reachability check: 14 terminating launch paths, 23 playable cells, and no missing sides in the combined reachable edge set.

## Required automated tests

The original ten categories are retained below and expanded with concrete assertions. Geometry fixtures use the quadrant convention in the geometry document.

| ID | Scenario | Fixture / action | Expected result |
| --- | --- | --- | --- |
| G01 | Straight shot | Complete 5×5 fixture, L001 | Points from (1,0) through (1,5), five edges, flat-wall |
| G02 | Single corner | Same fixture, L009 | (3,5) → (3,3) → (5,3), incoming N becomes E, four edges |
| G03 | Multiple corners | 7×7 rectangle, block cells (2,2) and (4,3), launch (3,7,N) | (3,7) → (3,3) → (4,3) → (4,0), turns N→E→N, eight edges, flat-wall |
| G04 | Trajectory crossing | 5×5 fixture; seed old horizontal X and O trace edges on y=4 crossing x=1; simulate L001 | Exactly the same result as the empty dynamic state |
| G05 | Trajectory overlap | Commit L001, then simulate its reverse L007 | Same five edge keys; no duplicate presence, no ownership transfer |
| G06 | Captured cell collision | Give cells beside the L001 route owners X/O, then simulate L001 | Same path and termination as before ownership assignment |
| G07 | Corner direction table | Parameterize all eight table entries | Each returns the specified perpendicular direction |
| G08 | Invalid launch | Try (0,0), (2,2), an off-grid point and an outward direction | Reject without consuming the turn |
| G09 | Normalization | Compare (5,7)→(6,7) and its reverse | Both use key "5,7-6,7" |
| G10 | Segment expansion | Import (2,0)→(4,0), then reversed | Exactly two equal unit-edge keys |
| G11 | Invalid segments | Zero-length, diagonal and fractional coordinates | Loader rejects each |
| G12 | Static-only collision | Compare simulations before and after arbitrary legal dynamic histories and owners | Identical points, directions and termination |
| G13 | Loop safeguard | Inject a repeated directed state into a low-level transition fixture | Loop returned; no partial game mutation, no consumed turn |
| G14 | Position-only revisit | Controlled transition fixture reaches same position in a new direction | Does not classify that event alone as a loop |
| S01 | Fourth edge | Use the single-capture fixture below | Exactly one cell captured by mover |
| S02 | Multiple captures | Use the two-cell fixture below | Both cells captured by mover |
| S03 | Existing owner | Repeat S01 after the cell belongs to X, with mover O | Owner remains X; score unchanged |
| S04 | Blocked/outside cells | Provide all four keys around blocked (2,2) and outside (4,0) | Neither receives ownership or score |
| S05 | Background grid | Empty dynamic state, render all grid lines | Rendering creates no scoring keys |
| S06 | Mixed-player sides | X supplied one side, O another; current mover closes fourth side | Current mover alone gets the cell |
| S07 | Static sides | Include boundary keys as sides of a target cell | Static keys count toward completion |
| S08 | Repeated edge | Add an existing key again | Set size unchanged; no new completion from that operation |
| S09 | Winner and draw | Valid completed state with counts 3:2, 2:3 and 2:2 | X wins, O wins and Draw respectively |
| S10 | No initial owners | Load the complete board | Owners null, scores zero, X ready |
| V01 | Fixture integrity | Load all complete CSV tables | 24 interior cells, one blocked, 23 playable, 24 static unit edges, 14 launches |
| V02 | Reachability | Union every valid path with static keys | Every playable cell has four reachable sides |
| V03 | Bad board | Add an unreachable playable cell or an initially complete one | Clear board-validation error |
| U01 | Turn lifecycle | Valid move scoring zero, one or several cells | Switch once after animation unless the game is finished |
| U02 | Double click | Click again during animation | Only one move commits |
| U03 | Reset | Reset after turns; also exercise chosen animation-reset policy | No traces/owners/scores remain; no late callback restores them |
| U04 | Preview parity | Preview then launch at same point | Identical path; preview alone never changes state |

The loop test is a defensive simulator test with a controlled transition fixture. No claim is made that the supplied valid board contains a reachable loop. “Passing through an owned cell” means travelling along its grid-line sides or through vertices; rays never run through unit-cell centres.

### Single-capture scoring fixture

Use a separate 3×3 rectangle with no obstacles. Its perimeter is static. Target the interior cell `(1,1)`.

Preload these three trajectory keys:

```text
1,1-2,1    top
2,1-2,2    right
1,1-1,2    left
```

X adds `1,2-2,2` (bottom). Expected: cell (1,1) goes from unowned to X, X gains one point, O gains zero. This tests scoring directly; the one-edge input is not asserted to be an independently legal whole ray.

### Multiple-capture scoring fixture

Use a separate 4×3 rectangle with no obstacles. Target adjacent interior cells `(1,1)` and `(2,1)`.

Preload their six non-shared perimeter edges:

```text
1,1-2,1
1,2-2,2
1,1-1,2
2,1-3,1
2,2-3,2
3,1-3,2
```

O adds their shared edge `2,1-2,2`. Both cells become owned by O; O gains two points. For an integration test, launch a valid whole ray that includes the missing edge and assert the same target-cell ownership changes, checking any other captures separately.

## Architecture and implementation order

Preserve the source layout:

```text
src/
  main.ts
  game/
    Game.ts
    Board.ts
    RaySimulator.ts
    Scoring.ts
    Geometry.ts
    types.ts
  render/
    CanvasRenderer.ts
    RayAnimator.ts
  data/
    board.ts
```

- `types.ts`: coordinates, edges, players, board definitions and state types.
- `Geometry.ts`: normalization, segment expansion, adjacency, vertex classification and turn table.
- `Board.ts`: immutable loaded data, masks, static key sets, launch validation and board checks.
- `RaySimulator.ts`: pure static-geometry movement, termination and loop protection.
- `Scoring.ts`: cell completion, ownership assignment and score counts.
- `Game.ts`: current player, runtime state, move lifecycle, reset and endgame.
- `CanvasRenderer.ts`: drawing only, using the established layer order.
- `RayAnimator.ts`: elapsed-time path animation only.
- `main.ts`: UI wiring, input and coordinate conversion.
- `data/board.ts`: validated board data, optionally generated from the CSV blocks.

Implement and test geometry/scoring on small fixtures first, then integrate turns, then animate, then transcribe and polish the larger demo board. A plain TypeScript/HTML/CSS implementation with CanvasRenderingContext2D is sufficient; Vite is optional tooling. No game engine or physics engine is required.

## Canvas and investor-demo checks

Use the original render order: background, light paper grid, captured backgrounds, blocked cells, static boundary, trajectories, X/O symbols, active ray, hover/launch indicators, HUD. Keep static walls legible where strokes meet.

Use off-white paper, light grey grid, black boundaries, dark grey obstacles, green X and amber/yellow O. Ensure O marks remain legible against the paper. Symbols must identify players as well as colour.

Map pointer coordinates through the same origin, scale and device-pixel-ratio transform as rendering. Integer grid coordinates remain authoritative. Resizing must not change board state or ray results. Display the current player and both scores, the required reset/restart/preview controls, and optionally grid coordinates.

During a valid move, show its direction and turns clearly, then show capture marks and the updated score. Finished-state display identifies the winner or draw and allows a restart. No AI, networking, accounts, backend, database, sound system or procedural board generation is part of the brief.

## Definition of done

The original definition of done is included in section 22 of the Canvas brief. Use this expanded acceptance checklist for handoff:

- [ ] A data-defined irregular sample board renders correctly on Canvas.
- [ ] Geometry uses integer coordinates and normalized unit edges.
- [ ] The interior mask excludes outside and blocked cells from scoring.
- [ ] Every eligible launch can be selected; corners and outward shots are rejected.
- [ ] X and O alternate after valid turns, without bonus turns for captures.
- [ ] A ray is computed before animation and moves automatically.
- [ ] Static corners alone cause 90-degree turns; static flat walls terminate paths.
- [ ] Trajectories can cross or overlap either player's old trajectories.
- [ ] Owners and trajectories never affect ray collision or direction.
- [ ] Loops/invalid results leave game state and current player unchanged.
- [ ] All four sides are required to claim a previously unowned unit cell.
- [ ] One ray can capture several cells; existing ownership never changes.
- [ ] Background grid strokes contribute no scoring geometry.
- [ ] Scores equal owned-cell counts and update after commit.
- [ ] All-cells-claimed completion displays winner/draw correctly.
- [ ] All selected demo-board cells pass reachability validation.
- [ ] Ray animation, corner pauses, preview and input locking work coherently.
- [ ] Reset/restart removes runtime state and cannot be undone by stale callbacks.
- [ ] Geometry, simulation and scoring tests pass.
- [ ] The developer can run the prototype using documented local commands.
- [ ] The delivery includes a brief rules explanation, controls and known assumptions.
- [ ] Any claimed reconstruction of the original screenshots has been visually reviewed.

This package specifies the prototype; it does not claim that the game has been implemented or that these application tests have been run.

