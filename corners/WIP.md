# Corners — WIP handoff

## Current state

`corners` is a two-player Canvas territory game rebuilt from `requirements.md`.

- `X` starts; players alternate turns with no capture bonus turn.
- Click a glowing unused entry on a flat boundary. Lines enter perpendicular to it, travel automatically on grid seams, and exit only at another unused flat entry.
- Outer corners automatically deflect a route 90°; crossing, sharing, looping, leaving the field, and non-flat exits are invalid.
- A complete route becomes permanent player-coloured geometry. Any unclaimed region with no unused entry is claimed by the player who closed it; every owned grid square scores one point.
- Entries are consumed at both start and exit. Opposite flat runs are paired to avoid isolated entries and dead ends.

## Reconstructed choices

The requirements leave a few rules uncertain. This build follows their suggested defaults: only outer corners reflect, existing-line contact invalidates a move, paths neither cross nor share segments, and score counts elementary grid squares.

## Key files

- `src/main.ts` — generation, route validation, region claims, state, and canvas rendering.
- `src/style.css` — responsive game layout.
- `requirements.md` — rules source.
