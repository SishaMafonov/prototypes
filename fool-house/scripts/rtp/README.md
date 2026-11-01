<!-- Current feature: v10 Mystery; prior published RTP studies are historical. -->
# Full-game RTP laboratory

Current v9 implements Scatter retention and one bonus per paid chain, with balancing deferred. The published v8 ten-billion study is historical. Current configs set KeepScatters/BonusOncePerPaidChain; legacy configs omit them. Use `node scripts/rtp/verify.mjs 10000 --legacy` and the archived configuration JSON for historical replay. Use `npm run simulate -- --keep-scatters=off` with the original weights/feature flags for older small studies. Never cite the v8 RTP as current.

Context: independent 5×5 Fool House model, 1.00 paid bet; all cascades, guaranteed room completion, Fibonacci free stages, Scatter entry and complete door bonuses. A sample is one **entire paid chain**, not a board, refill, door choice or animation frame. Base contribution includes regular-group awards at every free stage. Bonus contribution includes only the door-pot credits. Both percentages use paid wagers as denominator.

Runtime rules remain in `src/game.ts` and `src/bonus.ts`. `config.mjs` imports their weights, paytable, multiplier bags and stage values. It rejects changes to the native model's fixed geometry/threshold contract. `simulator.cpp` is the allocation-free validation engine. `Simulator.cs` is an independent, slower reference port. The production-helper replay in `verify.mjs` compares **each round's exact base cents, BigInt bonus cents, ending room and full RNG state/call count**, across jumped streams 0, 1 and 7.

## Build and verify

Run from `fool-house/` with Node.js 24+ and a local Zig compiler (C++ compiler mode). Compiler/binaries/cache/checkpoints live in ignored `.rtp-runs/`, never in game assets or the browser bundle. A checksum-verified official Zig 0.14.1 Windows distribution was used for the initial study; [official releases and SHA-256 values](https://ziglang.org/download/index.json). No package or system installation is required.

```powershell
node scripts/rtp/build.mjs --zig=.rtp-runs/tools/fast/zig-x86_64-windows-0.14.1/zig.exe
$env:RTP_ENGINE='.rtp-runs/native.exe'
node scripts/rtp/verify.mjs 10000
npm test
```

Build uses `-O3 -march=native -ffp-contract=off`, without fast-math. Rebuild on another CPU. On Linux use the corresponding Zig executable; binary path is `.rtp-runs/native`.

## Search and independent validation

```powershell
node scripts/rtp/screen.mjs 100000
node scripts/rtp/screen.mjs 1000000 --fine
node scripts/rtp/run.mjs --rounds=10000000000 --workers=8 --seed=20261105 --dir=.rtp-runs/validation
# Resume exactly the same interrupted run:
node scripts/rtp/run.mjs --rounds=10000000000 --workers=8 --seed=20261105 --dir=.rtp-runs/validation --resume
```

Search uses 20 coarse plus 9 fine weight combinations, preserving Low > Mid > High, uniform regular indexes and fixed door odds. Search is exploratory and does not count toward the final held-out validation. Additional local pilots may use a frozen `--config=path.json`, generated with `config({weights,seed})`. A fresh paid-run directory must not already contain a manifest. Completed shards are skipped on resume; incomplete ones restore totals, counters, PRNG state and current room at a paid-round boundary. Full board/collection state need not be checkpointed between paid rounds.

`progress.json` and per-worker JSON/JSONL checkpoints show actual completed paid rounds. `result.json` exists only after all requested rounds complete. It contains configuration/source/binary hashes, exact monetary totals as decimal strings, per-worker records, observed tier/prize/stage counts, empirical standard errors and approximate 95% intervals. Preserve the final report under `docs/game-rules/studies/`; temporary binaries and logs stay ignored. Native checks fail loudly at one million evaluations in a chain or monetary overflow: they never replace an unfinished chain with zero or silently cap a win. Game runtime itself has no such diagnostic limit.

## Randomness and statistical limits

The laboratory uses Blackman and Vigna's [public-domain xoshiro128** 1.1 and jump](https://prng.di.unimi.it/xoshiro128starstar.c), mirrored in `random.mjs`. Each worker uses the same uint32 seed with an additional 2^64-step jump, giving disjoint substreams for this run. Recorded call counts must stay below the jump distance. Browser play continues to use `Math.random`; the old `scripts/simulate.mjs` retains its Mulberry32 stream for historical reproduction and small smoke studies. Its 32-bit state is unsuitable as the sole stream for this ten-billion-round study.

All paid wins are fully sampled, including every door outcome. `ExpectedBonusCents` is a **separate** variance-reduced diagnostic, never substituted for actual bonus awards. It conditions on observed awarded move counts and computes exact door expectation with floor-state probabilities: `E[pot(next)] = (1 + P(multiplier) × (meanMultiplier − 1)) × E[pot] + P(coin) × coinCents × E[floor]`. Floor probabilities advance by the stairs chance with a reflecting cap at six. `BonusByMoves` permits independent recomputation. `ConditionalSquares` stores per-paid-round `(base + conditional expected bonus)^2` for tuning diagnostics.

Reported RTP percentages are `award cents / paid rounds` because each paid bet is exactly 100 cents. Component confidence intervals use per-chain sums of squares; total interval uses the square of the combined paid-chain return, retaining base/bonus covariance. They are approximate Monte Carlo intervals, not a mathematical proof or certification. Rare accumulated-pot multipliers and late Fibonacci stages create tails; finite tests cannot enumerate all unbounded chains or guarantee session RTP.

`tests/permutations.test.mjs` checks all **120** regular-icon/room label permutations in each of five rooms (600 cases), preserving group awards, room bonuses, collection, removal and restricted refills. These are symmetry checks; they are not a claim to exhaustively enumerate every 16^25 board or every possible play sequence. Door buttons share one prize draw path and have identical odds.

## Published study

Historical v8 [compact summary](../../docs/game-rules/studies/rtp-10b-summary.json), [full report](../../docs/game-rules/studies/rtp-10b.json), [convergence CSV](../../docs/game-rules/studies/rtp-10b-convergence.csv) and [rules/results](../../docs/game-rules/12-rtp-balance.md). Final seed 20261105, 10,000,000,000 paid chains, 95.979499% total (54.893894% base, 41.085605% door bonus); approximate 95% total interval 95.955903–96.003096%. Tuning used 34 profiles / 2,021,000,000 recorded chains, excluded from the final held-out sample.

After a run completes, export fixed round-count prefixes from worker journals:

```powershell
node scripts/rtp/convergence.mjs .rtp-runs/final-10b
```

The final published-data test checks the current configuration and recomputes the report from its eight complete shards. Recalibrate when game math changes; preserve earlier studies as history.

Current v10 adds raw Mystery 10%, preserving Scatter 7.16% and scaling regular tiers proportionally. All pending code16 Mysteries share one uniform current-room tier before Scatter/wins, including a visual-only preview reveal. No new balance study. Current configs include Mystery=10; absent Mystery means zero chance, preserving historical streams. Use original four-weight vectors/--mystery=off plus original retention flags for old JS studies.
