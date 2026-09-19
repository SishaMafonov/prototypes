# Codex implementation instructions: Canvas investor prototype

This document preserves all 22 implementation sections from the referenced conversation, reformatted as Markdown. It is a build handoff, not a delivered game. Read [geometry and data](03_GEOMETRY_AND_CSV_EXAMPLES.md) and [tests and acceptance](04_TESTS_AND_ACCEPTANCE.md) with it: their clearly marked additions address incomplete example data and implementation ambiguities without changing the core rules.

Build an interactive browser prototype of a two-player abstract strategy game using
TypeScript and HTML5 Canvas.

This is an investor/demo prototype, not a production game.

Do not use a game engine.
Prefer plain TypeScript, HTML, CSS and CanvasRenderingContext2D.
Vite may be used for development/build tooling.

## 1. GAME CONCEPT

```text
The game is played on a square grid inside an irregular orthogonal board.

Two players:
- Player X
- Player O

Players alternate turns.

On each turn the current player chooses a valid launch point located on a straight
section of the static board boundary.

The player does NOT control the ray after launch.

After launch, the ray travels horizontally or vertically through the board.

It continues automatically until:

1. It reaches a static CORNER:
   - the ray turns 90 degrees;
   - it continues travelling.

2. It reaches a static FLAT WALL:
   - the ray stops;
   - the turn ends.

The complete path travelled during the turn becomes a permanent trajectory.

Existing player trajectories DO NOT affect ray movement.

A new ray may:
- cross an X trajectory;
- cross an O trajectory;
- cross a trajectory intersection;
- travel over an already existing trajectory edge;
- pass through cells already owned by X or O.

Only STATIC BOARD GEOMETRY affects ray movement.
```

## 2. IMPORTANT GEOMETRY LAYERS

```text
Keep these concepts completely separate.

STATIC GEOMETRY
- outer board boundary;
- internal obstacles;
- corners;
- flat walls.

DYNAMIC TRAJECTORY GEOMETRY
- line segments previously drawn by X;
- line segments previously drawn by O.

SCORE STATE
- unclaimed playable cell;
- cell owned by X;
- cell owned by O.

Never use dynamic trajectories for collision detection.

Never use captured cells for collision detection.
```

## 3. GRID

```text
Use integer grid coordinates.

Example:

gridSize = 24 pixels

Grid vertex:

{x: 5, y: 8}

means Canvas position:

pixelX = 5 * gridSize
pixelY = 8 * gridSize

All board geometry must be aligned to this grid.

A trajectory always travels along grid lines.

Valid directions:

N = {dx: 0, dy: -1}
E = {dx: 1, dy: 0}
S = {dx: 0, dy: 1}
W = {dx: -1, dy: 0}

Use integer coordinates for all game logic.
Convert to pixels only when rendering.
```

## 4. STATIC BOARD

```text
Represent static geometry as UNIT EDGES between neighbouring grid vertices.

Example:

{x1: 3, y1: 4, x2: 4, y2: 4}

is one horizontal wall edge.

Static edges can have these types:

boundary
obstacle

Do not represent the board primarily as pixels.

The Canvas is only the visual representation.

Game rules must operate on grid coordinates.
```

## 5. PLAYABLE CELLS

```text
A playable cell is identified by its top-left coordinate.

Example:

Cell (5, 7)

has corners:

(5,7) ---- (6,7)
  |           |
  |           |
(5,8) ---- (6,8)

Some cells can be blocked by obstacles.

Blocked cells:
- cannot be claimed;
- do not count toward score;
- are rendered as solid dark blocks.
```

## 6. LAUNCH POINTS

```text
A valid launch point must:

- lie on the static board boundary;
- lie on a straight wall section;
- NOT be a corner;
- have a valid direction pointing into the playable area.

Example:

{
    x: 0,
    y: 8,
    direction: "E"
}

The player may choose ANY valid launch point.

Choosing the launch point is the player's only strategic action during the turn.

The direction after launch is automatic.

Highlight valid launch points on mouse hover.

On click:
1. validate launch point;
2. simulate trajectory;
3. animate ray;
4. commit trajectory;
5. calculate captured cells;
6. update score;
7. switch player.
```

## 7. CORNERS

```text
A corner is a grid vertex where two perpendicular STATIC wall edges meet.

For example:

      |
      |
------+

is a corner.

When a ray reaches a corner it turns exactly 90 degrees.

The direction must be determined by the board geometry.

The player does NOT choose left/right.

The ray must continue into the playable region rather than into a wall or outside
the board.

Example:

solid geometry:

████
████
   ↑
   ↑ incoming ray
   └────────> outgoing ray

Incoming N becomes outgoing E.

Implement a helper:

getReflectionDirection(
    point: GridPoint,
    incomingDirection: Direction
): Direction | null

Return:
- reflected direction at a valid corner;
- null if the ray hits a terminating flat wall.

Use the playable-cell mask around the corner to determine which outgoing direction
remains inside the playable region.

Do not base reflection on trajectories.
```

## 8. FLAT WALL COLLISION

```text
If the ray reaches a static boundary vertex that belongs to a straight wall and
is not a corner, the ray terminates.

Example:

          |
----------●  <- ray stops here
          |
          |

The endpoint becomes part of the drawn trajectory.

Then the player's turn ends.
```

## 9. TRAJECTORIES

```text
Represent trajectories as unit grid edges.

Example:

type TraceEdge = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

Maintain one SET of occupied trajectory edges.

An edge does not need multiple copies.

If X draws over an existing edge:

existing edge:
──────────────

new trajectory:
──────────────

the edge simply remains present.

Do not increment counters.

Player ownership of trajectory edges is only required for rendering/history.

It does NOT affect collision or scoring behaviour.

Recommended representation:

type TraceRecord = {
    player: "X" | "O";
    edges: Edge[];
};

Also maintain a normalized Set<string> containing all drawn edges.

Example normalized key:

"5,7-6,7"

Always normalize edge ordering so:

5,7 -> 6,7

and

6,7 -> 5,7

produce the same key.
```

## 10. CROSSING TRAJECTORIES

```text
Trajectory intersections have no gameplay effect.

Example:

      |
      |
------+
      |
      |

A later ray simply passes through the intersection.

Do NOT:
- stop;
- reflect;
- create a wall;
- change direction.
```

## 11. CELL CAPTURE

```text
A playable cell is captured when all four of its edges exist.

For scoring, an edge counts if it belongs to either:

- STATIC geometry;
- ANY player's trajectory.

Background grid lines DO NOT count.

For a cell at (x, y), check:

top:
(x,y) -> (x+1,y)

right:
(x+1,y) -> (x+1,y+1)

bottom:
(x,y+1) -> (x+1,y+1)

left:
(x,y) -> (x,y+1)

If all four edges exist:

staticEdges UNION trajectoryEdges

then the cell is complete.

If the cell has no owner yet, assign it to the CURRENT PLAYER.

A trajectory may complete several cells in one turn.

All such newly completed cells belong to the player who made that turn.

Once assigned:

cell.owner = "X"

or

cell.owner = "O"

Ownership never changes.

Captured cells do NOT become obstacles.
```

## 12. SCORING

```text
scoreX = number of cells owned by X
scoreO = number of cells owned by O

Show both scores in the UI.

The game ends when every playable non-blocked cell has an owner.

Winner:

scoreX > scoreO => X wins
scoreO > scoreX => O wins
otherwise => Draw
```

## 13. RAY SIMULATION

```text
Implement trajectory calculation independently from rendering.

Suggested signature:

simulateRay(
    launchPoint: GridPoint,
    initialDirection: Direction,
    board: BoardState
): RaySimulation

RaySimulation should contain:

{
    points: GridPoint[];
    edges: Edge[];
    termination:
        | "flat-wall"
        | "loop"
        | "invalid"
}

Do not modify game state while calculating the ray.

Simulation must finish before committing the move.

Conceptual algorithm:

current = launchPoint
direction = initialDirection

while true:

    next = current + direction

    add edge(current, next)

    current = next

    inspect STATIC geometry at current

    if current is flat terminating wall:
        break

    if current is corner:
        direction = getReflectionDirection(current, direction)
        continue

    otherwise:
        continue straight
```

## 14. LOOP PROTECTION

```text
Because unusual board geometry could theoretically make a ray bounce forever,
track simulation states:

state = x + "," + y + "," + direction

If the same state is encountered twice, a loop exists.

For the prototype:

- abort simulation;
- mark this launch point invalid;
- do not modify board state;
- do not consume the player's turn.

This is an implementation safeguard rather than a normal gameplay mechanic.
```

## 15. RENDERING

```text
Render layers in this order:

1. background
2. light worksheet-style grid
3. captured cell backgrounds
4. blocked cells / obstacles
5. static board boundary
6. player trajectories
7. X/O symbols
8. active ray animation
9. hover / launch-point indicators
10. HUD

Suggested visual style:

background: off-white
grid: thin light grey
static boundary: black
obstacles: dark grey
Player X trajectory: green
Player O trajectory: amber/yellow
X text: green
O text: amber/yellow

Keep the visual appearance close to a traditional squared-paper school game.
```

## 16. RAY ANIMATION

```text
Do not instantly display the entire move.

Animate the ray travelling along its calculated path.

The logical simulation should already be complete before animation begins.

Suggested animation speed:

6-12 grid cells per second.

At each corner make a small visual pause, approximately 50-100 ms.

When the animation finishes:

- commit trajectory edges;
- animate newly captured cells;
- update score;
- switch player.
```

## 17. USER INTERFACE

```text
Investor prototype UI should contain:

Current player:
X / O

Score:
X: N
O: N

Buttons:
Reset Game
Restart Board
Toggle Trajectory Preview

Optional:
Show Grid Coordinates

When the mouse is over a valid launch point:
- highlight the point;
- optionally display a faint preview trajectory.

Click launches the ray.

Do not allow player interaction while ray animation is running.
```

## 18. ARCHITECTURE

```text
Use approximately this separation:

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

Responsibilities:

Board.ts
    static board definition
    blocked cells
    playable cells
    launch points

RaySimulator.ts
    ray movement
    collision
    corner reflection
    loop detection

Scoring.ts
    edge completion
    captured cells
    score calculation

Game.ts
    players
    turns
    game state
    move lifecycle

CanvasRenderer.ts
    Canvas drawing only

RayAnimator.ts
    visual ray animation only

Do not put gameplay rules inside CanvasRenderer.
```

## 19. GAME STATE TYPES

```text
Use types roughly equivalent to:

type Player = "X" | "O";

type Direction = "N" | "E" | "S" | "W";

interface GridPoint {
    x: number;
    y: number;
}

interface Edge {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Cell {
    x: number;
    y: number;
    blocked: boolean;
    owner: Player | null;
}

interface LaunchPoint {
    x: number;
    y: number;
    direction: Direction;
}

interface BoardDefinition {
    width: number;
    height: number;
    staticEdges: Edge[];
    blockedCells: GridPoint[];
    launchPoints: LaunchPoint[];
}

interface GameState {
    currentPlayer: Player;
    trajectoryEdges: Set<string>;
    trajectories: TraceRecord[];
    cells: Cell[];
    scoreX: number;
    scoreO: number;
}
```

## 20. IMPLEMENTATION PRIORITY

```text
First make gameplay correct.

Then animation.

Then investor-demo polish.

Do not add:
- AI opponent;
- network multiplayer;
- accounts;
- backend;
- database;
- sound system;
- procedural board generation.

Those are outside prototype scope.
```

## 21. REQUIRED TEST CASES

```text
Create automated unit tests for geometry and scoring.

Test: straight shot
A ray launched toward a flat wall travels straight and stops.

Test: single corner
A ray reaches a static corner, turns 90 degrees and continues.

Test: multiple corners
A single ray may reflect several times before stopping.

Test: trajectory crossing
A new ray crosses an existing X or O trajectory without changing direction.

Test: trajectory overlap
A ray may travel over an existing trajectory edge.

Test: captured cell
Adding the fourth required edge captures a cell.

Test: multiple captures
One move may capture several cells.

Test: existing owner
A completed cell already owned by X/O never changes owner.

Test: captured cell collision
A ray passes through an owned cell without collision.

Test: loop
Repeated (position,direction) state aborts the move safely.
```

## 22. DEFINITION OF DONE

```text
The prototype is complete when:

- the sample irregular board is visible;
- X and O alternate turns;
- either player can choose a valid launch point;
- a ray is automatically traced through the board;
- rays reflect only from static corners;
- rays stop at static flat walls;
- previous trajectories are ignored for collision;
- crossing trajectories works;
- completed cells receive X/O;
- multiple cells can be captured by one move;
- scores update;
- all moves are rendered on Canvas;
- Reset works;
- game completion and winner are displayed;
- geometry/scoring logic is unit tested.
```


## Companion documents

- [Formalized rules and source confidence](01_FORMALIZED_RULES.md)
- [Geometry, CSV examples, canonical edges and scoring code](03_GEOMETRY_AND_CSV_EXAMPLES.md)
- [Concrete test fixtures, simulation safeguards and acceptance checklist](04_TESTS_AND_ACCEPTANCE.md)

