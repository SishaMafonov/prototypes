# Match state and scoring
Source: [match.ts](../../src/match.ts).
Integration: [game flow](../integrations/game-flow.md).
Visual: [stages](../visual/stages.md), [copy](../visual/copy.md).

- **C-MATCH-01**: a new match has countdown, elapsed0, scores[0,0], no scorer/winner,
  the chosen planet, independent goals, zero pulses/boosts, and centered waiting ball.
- **C-MATCH-02**: countdown elapsed [0,1) shows Ready?, [1,2) Steady!, [2,3) GO!.
  At 3s, enter playing and launch. Countdown does not apply gravity or consume boosts.
- **C-MATCH-03**: awardPoint only acts during playing, increments exactly one score,
  records scorer, sets elapsed0, and stops both ball-velocity components.
- **C-MATCH-04**: winner exists iff maxScore>=10 AND absolute difference>=2.
  Thus 10:8 finishes, 10:9 continues, 11:9 finishes, 10:10 continues.
- **C-MATCH-05**: nonwinning score enters goal hold for 1.2s, then countdown:
  center and stop ball, clear scorer/pulses, reset selected player's cooldown.
  Scores persist. Non-player cooldowns are not reset by this transition.
- **C-MATCH-06**: winning score enters finished immediately.
  Further advanceMatch/awardPoint calls must not mutate the finished match.
- **C-MATCH-07**: scoreStatus returns Match complete for a winner, otherwise
  Deuce · Win by 2 on >=9 ties, Match point · You/Opponent for a >=9 leader,
  otherwise First to 10 · Win by 2.
- **C-MATCH-08**: advanceMatch ignores nonpositive/nonfinite dt and nonpositive arena dimensions.
  Application frames cap elapsed work at .1s, reset clock on visibility changes,
  and preserve normalized positions through resizing.
- **C-MATCH-09**: New Game discards the old match and returns to Earth selection;
  a future Start constructs fresh goals, scores, and effects.

Evidence: [match tests](../../tests/match.test.mjs).
Do not infer exact scores, RNG correctness, or win-by-two from geometry alone.
A one-second frame batch cannot demonstrate the complete countdown or 1.2s goal hold.
