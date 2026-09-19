# Geometry, data model and CSV examples

## How to use this document

The first part reproduces the conversation's geometry/data examples and canonical edge/scoring code. Those CSV snippets are illustrative fragments, not a complete mutually consistent board. In particular, some launch coordinates have no corresponding boundary in the snippet, and the blocked-cell list is larger than its example obstacle outline.

The second part adds a complete small fixture and explicit implementation conventions. These additions are provided for this handoff; they are not claimed to be recovered childhood rules or a transcription of the supplied screenshots.

## Geometry data

For the prototype, I would actually give Codex the board as data rather than make it infer geometry from an image. The screenshot should be treated as a **visual reference**, not as the authoritative board representation.

A nice simple format is `static_edges.csv`:

```csv
id,x1,y1,x2,y2,type
B001,0,0,1,0,boundary
B002,1,0,1,1,boundary
B003,1,1,2,1,boundary
B004,2,1,2,0,boundary
B005,2,0,4,0,boundary
O001,14,8,15,8,obstacle
O002,15,8,15,9,obstacle
O003,15,9,14,9,obstacle
O004,14,9,14,8,obstacle
```

There is one detail I would change from that example in the actual implementation: **normalize every segment into unit edges during loading**. Thus:

```csv
B005,2,0,4,0,boundary
```

becomes internally:

```text
2,0 -> 3,0
3,0 -> 4,0
```

That makes collision and cell-completion logic vastly simpler.

Blocked cells can live separately:

```csv
x,y
14,8
15,8
9,10
6,14
7,14
8,14
7,13
7,15
```

Launch points can also be explicit for the investor prototype:

```csv
id,x,y,direction
L001,3,0,S
L002,4,0,S
L003,7,0,S
L004,0,4,E
L005,0,5,E
L006,24,9,W
L007,24,10,W
L008,8,20,N
```

I actually **prefer this for version 1**. Later you can derive launch points automatically from the boundary, but explicit launch points remove a whole class of geometry bugs while you are preparing a demo.

The cell table could then look like:

```csv
x,y,blocked,owner
0,0,false,
1,0,false,
2,0,false,
3,0,false,
4,0,false,
14,8,true,
15,8,true,
```

Although `owner` should really live in runtime state rather than board definition. For a clean design I'd load only:

```csv
x,y,blocked
0,0,false
1,0,false
2,0,false
14,8,true
```

and initialize:

```ts
owner: null
```

in memory.

## The edge model is the key

I would strongly encourage Codex to use this canonical representation:

```ts
function edgeKey(a: GridPoint, b: GridPoint): string {
    const first =
        a.x < b.x || (a.x === b.x && a.y < b.y)
            ? a
            : b;

    const second = first === a ? b : a;

    return `${first.x},${first.y}-${second.x},${second.y}`;
}
```

Then scoring becomes almost pleasantly boring:

```ts
function isCellComplete(
    x: number,
    y: number,
    allEdges: Set<string>
): boolean {
    const top = edgeKey(
        { x, y },
        { x: x + 1, y }
    );

    const right = edgeKey(
        { x: x + 1, y },
        { x: x + 1, y: y + 1 }
    );

    const bottom = edgeKey(
        { x, y: y + 1 },
        { x: x + 1, y: y + 1 }
    );

    const left = edgeKey(
        { x, y },
        { x, y: y + 1 }
    );

    return (
        allEdges.has(top) &&
        allEdges.has(right) &&
        allEdges.has(bottom) &&
        allEdges.has(left)
    );
}
```

Where:

```ts
allEdges =
    staticEdges ∪ trajectoryEdges
```

but **collision detection uses only**:

```ts
staticEdges
```

That tiny distinction is probably the single most important instruction in the entire specification.

The model is therefore:

```text
                    STATIC EDGES
                         │
                         ├──────────────> ray collision
                         │
                         │
                         ▼
                   scoring edges
                         ▲
                         │
                         │
                TRAJECTORY EDGES
                         │
                         └──── X/O history


                    CELL OWNERS
                         │
                         └──── score/rendering only
```

I would also tell Codex to implement the fixed board from your screenshot **after the engine works on a tiny synthetic test board**. A 5×5 test board containing perhaps two corners and one obstacle will make reflection bugs immediately obvious. Once `RaySimulator` is trustworthy, reproducing your large childhood board becomes mostly data entry.


---

## Handoff addition: complete small irregular board

Board ID: `irregular-5x5`. Vertices range from `(0,0)` to `(5,5)`; cell coordinates range from 0 to 4. Positive Y points down. Remove the upper-right cell `(4,0)` from the board outline and block cell `(2,2)`. There are 23 playable cells, one blocked cell inside the outline, and one outside cell in the bounding rectangle.

This is a compact engine fixture. The larger investor board should be transcribed separately from the original visual references after these mechanics pass tests.

### Board metadata: board.csv

```csv
id,width,height,gridSize
irregular-5x5,5,5,24
```

### Complete static geometry: static_edges.csv

These are compact axis-aligned segments. Expand every row into unit edges on import.

```csv
id,x1,y1,x2,y2,type
B001,0,0,4,0,boundary
B002,4,0,4,1,boundary
B003,4,1,5,1,boundary
B004,5,1,5,5,boundary
B005,5,5,0,5,boundary
B006,0,5,0,0,boundary
O001,2,2,3,2,obstacle
O002,3,2,3,3,obstacle
O003,3,3,2,3,obstacle
O004,2,3,2,2,obstacle
```

### Complete cell mask: cells.csv

Every cell inside the outer outline is listed, including the blocked cell. Omitted coordinates are outside the board. Ownership is runtime state and starts as `null`.

```csv
x,y,blocked
0,0,false
1,0,false
2,0,false
3,0,false
0,1,false
1,1,false
2,1,false
3,1,false
4,1,false
0,2,false
1,2,false
2,2,true
3,2,false
4,2,false
0,3,false
1,3,false
2,3,false
3,3,false
4,3,false
0,4,false
1,4,false
2,4,false
3,4,false
4,4,false
```

### Equivalent blocked_cells.csv

This optional file is a convenience mirror of the blocked flags, not another source of truth. If both are loaded, require them to agree.

```csv
x,y
2,2
```

### Complete eligible launch list: launch_points.csv

The brief permits explicit launch points. For this board, list every eligible outer-boundary grid vertex so that “any valid launch point” is preserved. Obstacle walls are not launch surfaces in this fixture.

```csv
id,x,y,direction
L001,1,0,S
L002,2,0,S
L003,3,0,S
L004,5,2,W
L005,5,3,W
L006,5,4,W
L007,1,5,N
L008,2,5,N
L009,3,5,N
L010,4,5,N
L011,0,1,E
L012,0,2,E
L013,0,3,E
L014,0,4,E
```

### Expected example paths

- L001: `(1,0) → (1,5)`, straight, five unit edges, stops at a flat wall.
- L009: `(3,5) → (3,3) → (5,3)`, four unit edges. At the obstacle's lower-right corner, incoming N turns E.
- L011: `(0,1) → (4,1) → (4,5)`, eight unit edges. At the outline notch, incoming E turns S.
- L010: `(4,5) → (4,1) → (0,1)`, reverse of L011.

These paths are specified from the explicit convention below.

## Handoff addition: unambiguous geometry contract

### Keep board definitions immutable

The conversation's `BoardDefinition` needs an explicit interior mask for an irregular board; width and height alone are insufficient. Use the complete `cells.csv` list above or derive and validate the same mask from closed boundary loops.

```ts
type Player = "X" | "O";
type Direction = "N" | "E" | "S" | "W";
interface GridPoint { x: number; y: number }
interface Edge { x1: number; y1: number; x2: number; y2: number }
interface StaticEdge extends Edge { type: "boundary" | "obstacle" }
interface CellDefinition { x: number; y: number; blocked: boolean }
interface LaunchPoint extends GridPoint { id: string; direction: Direction }

interface BoardDefinition {
  id: string;
  width: number;                 // bounding rectangle, measured in cells
  height: number;
  staticEdges: StaticEdge[];      // unit edges after loading
  cells: CellDefinition[];        // listed cells are inside; omitted = outside
  launchPoints: LaunchPoint[];
}
interface CellState extends CellDefinition { owner: Player | null }
interface TraceRecord {
  player: Player;
  edges: Edge[];                  // ordered path, including retraced edges
}
interface GameState {
  currentPlayer: Player;
  trajectoryEdges: Set<string>;  // unique presence for scoring
  trajectories: TraceRecord[];   // ordered move history for rendering
  cells: CellState[];
  scoreX: number;
  scoreO: number;
  phase: "ready" | "animating" | "finished";
}
```

Store static edge keys separately from trajectory keys. The simulator receives only immutable static geometry, the interior mask and launch data. It does not read owners or previous trajectories.

### Unit edges and segment expansion

Require finite integer endpoints, a nonzero length, and either equal X or equal Y. Reject diagonal segments. Step by the sign of the changing coordinate until reaching the second endpoint, emitting a unit edge for each step. Normalize each emitted edge with the original `edgeKey` function. Reversed segments must produce the same set of keys.

Long segment IDs are source metadata only. Repeated static keys can be deduplicated, but conflicting classifications must be rejected. The sample fixture expands to 20 boundary edges plus four obstacle edges.

### Static mask at a vertex

At vertex `(x,y)`, inspect these adjacent cells:

| Quadrant | Cell coordinate |
| --- | --- |
| NW | (x−1,y−1) |
| NE | (x,y−1) |
| SE | (x,y) |
| SW | (x−1,y) |

For collision, outside cells and blocked cells are solid. A playable cell remains non-solid regardless of its owner.

- Four playable quadrants: continue straight.
- Three playable quadrants: a reachable corner with one solid quadrant. Turn using the table below.
- Two adjacent playable quadrants: a straight wall. A ray arriving perpendicularly stops.
- One playable quadrant: an outer convex corner. Under grid-line travel without following wall edges, this corner cannot be reached by a valid interior path. It is not a valid launch point.
- Two diagonally opposite playable quadrants, touching boundaries, wall junctions, or other unsupported configurations: reject the geometry for version 1.

This explicitly limits the prototype to simple orthogonal outlines and solid-cell obstacles with consistent boundaries. It does not invent behaviour for arbitrary wall networks.

### Corner transition table

“Incoming” means the direction the ray is moving when it arrives. The solid quadrant selects the only 90-degree outgoing edge that does not follow a static wall and stays in the playable area.

| Solid quadrant | Incoming | Outgoing |
| --- | --- | --- |
| NW | N | E |
| NW | W | S |
| NE | N | W |
| NE | E | S |
| SE | S | W |
| SE | E | N |
| SW | S | E |
| SW | W | N |

All other incoming combinations at that corner would arrive along a wall or from solid space and are invalid. This table is an explicit prototype interpretation of “turn away from solid geometry.” It should be checked against the user's remembered play before claiming an exact historical reconstruction.

For example, the lower-right vertex of blocked cell `(2,2)` is `(3,3)`. Its solid quadrant is NW, so a ray arriving N turns E, matching the original schematic.

### Validate traversable edges before recording them

A ray travels on non-static unit grid edges between two playable cells. For a horizontal edge from `(x,y)` to `(x+1,y)`, the adjacent cells are `(x,y−1)` and `(x,y)`. For a vertical edge from `(x,y)` to `(x,y+1)`, they are `(x−1,y)` and `(x,y)`.

Both adjacent cells must be playable and the edge must not be static. The endpoints may lie on a boundary; that is how a launch begins and a wall collision ends. This prevents accidental travel along a wall or outside the board.

### Loader checks

Require closed simple orthogonal outlines, consistent obstacle boundaries, and static edges exactly on playable/solid interfaces. Do not create obstacle edges between two adjacent blocked cells. Verify all listed launches lie at non-corner outer-boundary vertices with a perpendicular inward first edge. Detect missing eligible launches if using an explicit list.

Reject inconsistent CSV data with a readable explanation. Do not guess missing walls, fill the entire bounding rectangle, or silently treat an outside cell as playable.

