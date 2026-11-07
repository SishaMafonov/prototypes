---
document_type: rules_module
ruleset_id: fool-house-2026-11-07-v15
context: bonus floors double both coins and pot multipliers after each ascent; six-floor cap; previous RTP is historical
read_when: bonus floor values, reward display, scaled multipliers, historical simulation or calibration status
branch_ids: D20-D23
---

# 16 — Doubling bonus floor prizes

**Context packet:** Floor 1 is unchanged. Each Stairs prize advances one floor and doubles both future coin awards and every value in the original multiplier bag. Floor 6 is the limit. Prize chances stay Coin30%, Multiplier4.73%, Stairs15%, Ghost50.27%. This supersedes the linear floor coins and unchanged multiplier values used by v14. Current RTP has not been remeasured or rebalanced.

| Floor | Prize factor | Coin | Multiplier values |
| --- | ---: | ---: | --- |
| 1 | 1 | 1.00 | 2, 3, 5, 8 |
| 2 | 2 | 2.00 | 4, 6, 10, 16 |
| 3 | 4 | 4.00 | 8, 12, 20, 32 |
| 4 | 8 | 8.00 | 16, 24, 40, 64 |
| 5 | 16 | 16.00 | 32, 48, 80, 128 |
| 6 | 32 | 32.00 | 64, 96, 160, 256 |

| Branch | Behavior |
| --- | --- |
| D20 | Factor = 2^(floor−1), clamped to floors1–6. Coin = 100 cents × factor. The ten base multiplier slots remain [2,2,2,2,2,3,3,5,5,8]; multiply the selected slot by factor exactly once. Their probabilities remain 50%/20%/20%/10%. No extra RNG is used for scaling. |
| D21 | Stairs changes future prizes on its reveal, pays no immediate cash and preserves the pot. At floor6 it still consumes one move without increasing rewards, rerolling or awarding cash. New bonus entry resets to floor1. |
| D22 | A scaled multiplier applies to the entire current base+bonus round pot. Credit only new pot minus old pot. Zero stays zero. UI range, prize-factor label, reveal caption and canvas multiplier use the same effective value. Money remains exact BigInt cents. |
| D23 | Native/JS/C# profiles mark current rules BonusFloorDoubling=true. Absent flag preserves historical linear coins/unscaled multipliers; config({bonusFloorDoubling:false}) reproduces v14. Small JS replay uses --floor-prizes=legacy. Conditional expectations track floor-dependent pot growth together; a single floor-independent growth rate is no longer valid. Native 128-bit arithmetic fails explicitly on overflow rather than truncating an award. |

Example: seed2.00 → Floor1×3=6.00 → Coin=7.00 → Stairs to Floor2, still7.00 → Coin=9.00 → Ghost unchanged → Floor2 base-slot2 becomes×4, final36.00. Bonus adds34.00 beyond the already-credited seed. Return adds nothing.

Authority: [bonus.ts](../../src/bonus.ts), [main.ts](../../src/main.ts), [bonus-scene.ts](../../src/bonus-scene.ts). The held-out v14 billion-round report is immutable historical evidence, not the return of these larger prizes. Its changed source files are preserved byte-for-byte in studies/v14-source/ and verified against the report hashes.
