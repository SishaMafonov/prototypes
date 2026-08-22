# Corners

## 1. Objective

`Corners` is a two-player pencil-and-paper territory game played inside an irregular orthogonal field.

Players take turns drawing continuous paths across the playing area. Paths may change direction only by interacting with corners of the field or previously created geometry.

The purpose of each move is to create or complete enclosed areas.

When a player completes an area, that area becomes the property of that player and is marked with their symbol:

- Player 1 — `X`
- Player 2 — `O`

The player who owns the greatest amount of territory when no further valid moves remain wins.

---

## 2. Players

The game is intended for:

- 2 players
- one player uses `X`
- the other player uses `O`

Players alternate turns.

---

## 3. Playing Field

The playing field is drawn on squared paper.

The outer boundary consists exclusively of:

- horizontal lines
- vertical lines
- 90° corners

The shape does not need to be rectangular.

It may contain:

- protrusions
- recesses
- narrow sections
- inward corners
- outward corners

The shape should therefore resemble an irregular maze, fortress, castle, or mechanical profile.

The internal area must initially be empty.

---

## 4. Boundary Types

Every part of the outer boundary belongs to one of two functional types.

### Flat boundary

A straight horizontal or vertical section of the boundary.

A flat boundary may be used as the starting or ending point of a move.

### Corner

A point where a horizontal boundary meets a vertical boundary.

Corners interact with the moving line.

Depending on the direction from which the line approaches the corner, the corner causes the line to change direction.

---

## 5. Starting a Move

On their turn, a player selects an unused valid point on a flat section of the boundary.

The player begins drawing a line from this point into the playing field.

The initial direction of travel must be perpendicular to the selected boundary.

For example:

- from a left boundary, the line initially travels right;
- from a right boundary, it travels left;
- from a top boundary, it travels downward;
- from a bottom boundary, it travels upward.

Once the move has started, the player does not freely steer the line.

Its subsequent path is determined by the geometry of the board.

---

## 6. Line Movement

A line always travels horizontally or vertically along the underlying square grid.

It continues in its current direction until one of the following occurs:

1. it reaches a valid corner;
2. it reaches a flat boundary;
3. it reaches an existing line;
4. it reaches a position where continuing would produce an invalid move.

The player may not arbitrarily stop the line before one of these events occurs.

---

## 7. Corner Reflection

When a moving line reaches a corner, it is deflected by 90°.

The direction of the deflection is determined by the shape of the corner.

Conceptually, the line behaves like a ray reflecting from the corner geometry.

Example:

```text
Incoming:

──────► ┐
        │

After reflection:

──────► ┐
        ▼
```

The line then continues automatically in its new direction.

A single move may therefore contain several consecutive reflections.

Example:

```text
Start ─────►
            │
            ▼
            │
      ◄─────┘
      │
      ▼
     Exit
```

The complete sequence belongs to one move.

---

## 8. Ending a Move

A move ends when the line reaches another flat section of the outer boundary.

The ending point must be different from the starting point.

The entire generated path then becomes a permanent part of the board.

Future moves may interact with it.

---

## 9. Existing Lines

Lines created during previous turns become part of the playing geometry.

A new move may not:

- erase an existing line;
- cross an existing line;
- overlap an existing line unless explicitly permitted by the game variant;
- leave the defined playing area.

Existing lines may act as new boundaries for enclosed areas.

---

## 10. Creating an Area

An area is completed whenever a newly drawn path, together with:

- the outer boundary,
- existing player lines,
- or both,

completely surrounds one or more grid cells.

The enclosed area immediately becomes owned by the player who made the move that closed it.

Ownership depends on **who completed the enclosure**, not on who drew the earlier sides.

---

## 11. Marking Territory

Every newly completed area is marked using the current player's symbol.

For example:

```text
┌─────┐
│  X  │
└─────┘
```

or:

```text
┌─────┐
│  O  │
└─────┘
```

If one move completes several independent areas, every area completed by that move belongs to the current player.

---

## 12. Previously Claimed Territory

Once an area has been claimed:

- its ownership cannot change;
- another player cannot claim it again;
- the area remains part of the final score.

Lines bordering claimed territory remain available as structural boundaries for future moves.

---

## 13. Turn Order

Player `X` makes the first move.

Players then alternate:

```text
X → O → X → O → ...
```

A normal move does not grant an additional turn, even if territory was captured.

### Possible historical variant

Some versions may instead use a rule similar to Dots and Boxes:

> A player who completes an area receives another turn.

This should be confirmed separately.

---

## 14. Valid Move Requirements

A move is valid only if all of the following are true:

- it begins at a valid flat boundary;
- it enters the playing area;
- every segment follows the grid;
- every direction change follows a valid corner interaction;
- the path does not illegally cross another path;
- the path eventually terminates at another valid flat boundary;
- the path creates at least one new line segment.

A move that creates no territory may still be valid.

---

## 15. Invalid Moves

A move is invalid if it:

- starts from a corner instead of a flat boundary;
- leaves the playing area;
- crosses an existing line;
- travels through an occupied boundary;
- uses an impossible corner reflection;
- doubles back along exactly the same path;
- terminates in open space;
- terminates before reaching a valid endpoint.

An invalid move must be cancelled and replayed.

---

## 16. Game End

The game finishes when no valid moves remain.

Alternatively, the physical board may become completely partitioned before every possible entry point has been used.

At that point the players count their claimed territory.

---

## 17. Scoring

The simplest scoring method is:

> One point for every enclosed grid square owned by the player.

For example:

```text
X territory: 23 squares
O territory: 19 squares

Winner: X
```

For irregular enclosed regions, every elementary square contained inside the region contributes one point.

### Possible alternative

Some versions may instead count:

- completed regions rather than individual squares, or
- only marked compartments regardless of their physical size.

This rule should be confirmed.

---

## 18. Suggested Digital Implementation Requirements

A computer implementation should represent the field as an orthogonal grid.

The game engine should maintain:

- board dimensions;
- outer boundary geometry;
- valid entry/exit positions;
- corner coordinates;
- existing paths;
- claimed regions;
- current player;
- score.

For every move, the engine should:

1. validate the selected starting position;
2. determine the initial direction;
3. propagate the line;
4. detect the next collision;
5. determine whether the collision is a corner, wall, or existing line;
6. calculate the resulting direction;
7. repeat propagation until termination;
8. reject illegal paths;
9. commit the complete path;
10. detect newly enclosed areas;
11. assign those areas to the current player;
12. update the score;
13. switch players.

---

# Rules That Need Confirmation

The following details are reconstructed rather than certain.

### A. Does the line start anywhere on a flat wall?

Or are there predefined launch points, such as the arrows visible in the example?

### B. Do corners belong only to the outer boundary?

Or can intersections created by previous moves behave as corners too?

### C. Does a line reflect from every corner automatically?

Or can the player choose between two possible directions?

### D. What happens when a line hits an existing player line?

Possibilities include:

- the move stops;
- the line reflects;
- the line follows the existing line;
- such a move is illegal.

### E. Can paths cross?

The reconstruction assumes **no**.

### F. Can paths share segments?

The reconstruction assumes **no**, except possibly at endpoints.

### G. Does capturing an area grant another turn?

The reconstruction assumes **no**, but this may be a significant historical rule.

### H. What exactly counts for scoring?

Possible systems:

1. number of grid squares;
2. number of enclosed regions;
3. number of completed elementary cells.

### I. Can a move begin or end on a line created during the game?

The reconstruction currently assumes that entry and exit points belong to the original outer boundary.

### J. Are entry/exit points consumed after use?

The arrows in the example suggest that this may be the case.

If each entry can be used only once, this becomes an important strategic resource.

---

# Minimal Rule Summary

Two players alternately launch straight lines from flat portions of an irregular grid boundary.

The line moves automatically through the field and changes direction when it encounters corners. It continues until reaching another valid flat boundary.

Every completed path remains on the board.

Whenever a player's move completes an enclosed territory, that territory is marked with the player's `X` or `O`.

Play continues until no legal moves remain.

The player controlling the most territory wins.
