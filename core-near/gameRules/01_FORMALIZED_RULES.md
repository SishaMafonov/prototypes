# Formalized game rules

Source: **Game Rules Reconstruction**, conversation ID `6aae9aa5-ab00-83eb-aa86-6f8cbad303b0`.

These are the final reconstructed rules from the conversation, following the user's clarification that trajectories have no collision properties. The numbered rules below preserve the final rulebook wording. Implementation decisions and remaining uncertainties are identified afterward.

1. **The board** is an irregular closed shape drawn on squared paper. Its boundary contains straight sections and 90° corners. Internal obstacles may also exist and behave as physical walls.

2. **Two players**, `X` and `O`, take alternating turns.

3. At the beginning of a turn, the player may select **any valid non-corner point on a straight boundary section** from which a ray can be launched into the playing area. Choosing the best starting point is part of the strategy.

4. The player launches a **ray/beam** perpendicular to that boundary section. Once launched, its movement is automatic.

5. The ray travels horizontally or vertically until it encounters board geometry:
   - if it reaches a **corner**, it turns 90° and continues;
   - if it reaches a **flat wall section**, it stops and the turn ends.

6. A ray may bounce from many corners during a single turn. There is no limit to the number of reflections unless the trajectory enters a loop; for a computer implementation, loop detection would therefore be sensible.

7. Every travelled segment is permanently drawn onto the board as a **trajectory**.

8. Existing trajectories have **no collision properties whatsoever**. A new ray may:
   - cross the player's own trajectory;
   - cross the opponent's trajectory;
   - pass through an intersection;
   - travel over an already drawn segment.

   It behaves exactly as though those lines were not present.

9. If a ray travels over an edge that has already been drawn, nothing special happens. Conceptually that edge already exists, so you simply keep it marked as present.

10. Whenever the newly added trajectory completes all four sides of a **unit grid cell**, that cell belongs to the player who completed it and is marked `X` or `O`.

11. A single turn may complete **multiple cells**, including cells at completely different portions of a long trajectory.

12. Once a cell has an owner, ownership never changes.

13. A captured cell does **not** become an obstacle. Future rays can pass through it normally because the `X`/`O` marking is only scoring information.

14. The game finishes when all playable cells have been claimed — or potentially when no further legal move can claim another cell, depending on how you handled that situation as children.

15. The player with the larger number of claimed cells wins.


## Clarifications and source confidence

- The user explicitly confirmed crossing both players' trajectories and that old trajectories only help form squares. The earlier suggestion that trajectories become walls is superseded and must not be implemented.
- Reusing a drawn edge is allowed in the prototype. The user's recollection was tentative: “I assume yes.” An edge remains present once; repeated traversal does not itself capture anything.
- The user confirmed choosing any eligible straight boundary position. The integer-grid launch points and perpendicular inward launch direction are the formalization used by the implementation brief.
- The ray's automatic 90-degree turn away from solid geometry is an inferred reconstruction, not a separately confirmed left/right table. The implementation guide adopts it; the geometry supplement makes the convention explicit.
- Static boundary and obstacle edges count as square sides in the implementation brief. Background grid lines do not count.
- Each valid completed move switches player, even when it captures cells. There is no extra turn for scoring in this prototype.
- A captured cell contributes one point. A unit cell can be owned only once. Larger enclosed rectangles are not separately scored.
- The user's stated end condition is all playable cells claimed. The alternative “no further productive move” was raised by the assistant, but was not confirmed. The prototype uses all-cells-claimed and must validate its demo board for reachability; see [validation](04_TESTS_AND_ACCEPTANCE.md).
- Loop rejection without consuming a turn is an implementation safeguard from the brief, not a remembered childhood rule.

## One complete turn

1. The current player chooses an eligible non-corner boundary grid vertex.
2. Compute the complete ray from static geometry only. Reject an invalid or looping simulation without changing the game.
3. Animate the valid path while input is disabled.
4. Commit the path's unit edges to the trajectory-edge set.
5. Assign every newly completed, previously unclaimed playable cell to the mover.
6. Update both scores; if all playable cells are claimed, show the winner or draw. Otherwise switch players.

A cell is complete only when its top, right, bottom and left unit edges are all in the union of static edges and trajectory edges. Owners and trajectory colours do not affect that test.

## Terminology

| Term | Meaning |
| --- | --- |
| Launch point | Eligible straight-boundary position chosen by the player |
| Ray / beam | Moving line during a turn |
| Trajectory / trace | Complete path of a move, retained after the turn |
| Reflection / bounce | Automatic 90-degree turn at a static corner |
| Flat wall | Straight static section that terminates an incoming ray |
| Playable cell | Interior, non-blocked unit square eligible for ownership |
| Edge | One horizontal or vertical segment between neighbouring grid vertices |

See [the Canvas/Codex brief](02_CODEX_CANVAS_SPECIFICATION.md) for the implementation instructions.

