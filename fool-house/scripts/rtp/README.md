<!-- Current feature: v13 combined round-pot bonus and 15% stairs; published studies are historical. -->
# Full-game RTP laboratory

Current v14 uses raw Low35/Mid32.5/High19.5/Scatter3/Mystery10 and Coin30/Multiplier4.73/Stairs15/Ghost50.27. It keeps the final-chain bonus seeded by the whole base round win. Scatter retention, Mystery, static preview and one bonus at chain end remain active; current calibration is [module15](../../docs/game-rules/15-current-balance.md). The published v8 ten-billion study is historical. Current configs set KeepScatters/BonusOncePerPaidChain/BonusAtEndOfPaidChain/Mystery/StaticPreview/BonusStartsWithRoundWin; legacy configs omit new flags and use historical door odds. Use `node scripts/rtp/verify.mjs 10000 --legacy` and the archived configuration JSON for historical replay. Use `npm run simulate -- --keep-scatters=off` with the original weights/feature flags for older small studies. Never cite the v8 RTP as current.

Context: independent 5×5 Fool House model, 1.00 paid bet; all cascades, guaranteed room completion, Fibonacci free stages, Scatter entry and complete door bonuses. A sample is one **entire paid chain**, not a board, refill, door choice or animation frame. Base contribution includes regular-group awards at every free stage. Bonus contribution includes only final combined round pot minus its carried base seed; the base seed is counted once under base. Conditional bonus expectation adds seed×(g^moves−1), with g=1+pMultiplier×(meanMultiplier−1), to the zero-seed expectation. Checkpoint `BonusSeedCentsByMoves` supports reconstruction. Both percentages use paid wagers as denominator.

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
node scripts/rtp/run.mjs --rounds=1000000000 --workers=8 --seed=20261111 --batch=10000000 --dir=.rtp-runs/validation-v14
# Resume exactly the same interrupted run:
node scripts/rtp/run.mjs --rounds=1000000000 --workers=8 --seed=20261111 --batch=10000000 --dir=.rtp-runs/validation-v14 --resume
```

The v14 `calibrate.mjs` accepts a JSON profile array with optional weights/paytable/bonus settings: `--profiles=profiles.json --dir=new-output-dir --rounds=1000000 --workers=4 --seed=20261108`. It stores each exact config, raw record and observed/conditional summaries. The archived v14 search has84 profiles and303million completed exploratory chains, including a100million pilot; these are excluded from final validation. `screen.mjs` retains the older coarse/fine weight-only search. Additional pilots can use a frozen `--config=path.json`, generated with `config({weights,paytable,bonus,seed})`. A fresh paid-run directory must not already contain a manifest. Completed shards are skipped on resume; incomplete ones restore totals, counters, PRNG state and current room at a paid-round boundary. Full board/collection state need not be checkpointed between paid rounds.

`progress.json` and per-worker JSON/JSONL checkpoints show actual completed paid rounds. `result.json` exists only after all requested rounds complete. It contains configuration/source/binary hashes, exact monetary totals as decimal strings, per-worker records, observed tier/prize/stage counts, empirical standard errors and approximate 95% intervals. Preserve the final report under `docs/game-rules/studies/`; temporary binaries and logs stay ignored. Native checks fail loudly at one million evaluations in a chain or monetary overflow: they never replace an unfinished chain with zero or silently cap a win. Game runtime itself has no such diagnostic limit.

## Randomness and statistical limits

The laboratory uses Blackman and Vigna's [public-domain xoshiro128** 1.1 and jump](https://prng.di.unimi.it/xoshiro128starstar.c), mirrored in `random.mjs`. Each worker uses the same uint32 seed with an additional 2^64-step jump, giving disjoint substreams for this run. Recorded call counts must stay below the jump distance. Browser play continues to use `Math.random`; the old `scripts/simulate.mjs` retains its Mulberry32 stream for historical reproduction and small smoke studies. Its 32-bit state is unsuitable as the sole stream for this ten-billion-round study.

All paid wins are fully sampled, including every door outcome. `ExpectedBonusCents` is a **separate** variance-reduced diagnostic, never substituted for actual bonus awards. It conditions on observed awarded move counts and computes exact door expectation with floor-state probabilities: `E[pot(next)] = (1 + P(multiplier) × (meanMultiplier − 1)) × E[pot] + P(coin) × coinCents × E[floor]`. Floor probabilities advance by the stairs chance with a reflecting cap at six. `BonusByMoves` permits independent recomputation. `ConditionalSquares` stores per-paid-round `(base + conditional expected bonus)^2` for tuning diagnostics.

Reported RTP percentages are `award cents / paid rounds` because each paid bet is exactly 100 cents. Component confidence intervals use per-chain sums of squares; total interval uses the square of the combined paid-chain return, retaining base/bonus covariance. They are approximate Monte Carlo intervals, not a mathematical proof or certification. Rare accumulated-pot multipliers and late Fibonacci stages create tails; finite tests cannot enumerate all unbounded chains or guarantee session RTP.

`tests/permutations.test.mjs` checks all **120** regular-icon/room label permutations in each of five rooms (600 cases), preserving group awards, room bonuses, collection, removal and restricted refills. These are symmetry checks; they are not a claim to exhaustively enumerate every 16^25 board or every possible play sequence. Door buttons share one prize draw path and have identical odds.

## Published studies

The active v14 one-billion-chain calibration, component split, frozen parameters and provenance are in [module15](../../docs/game-rules/15-current-balance.md). Its independent validation seed is20261111; eight workers each complete125million paid chains. Primary cash awards are fully sampled; conditional diagnostics are separate. The source/configuration and raw records are audited by `tests/current-calibration.test.mjs`.

Historical v8 [compact summary](../../docs/game-rules/studies/rtp-10b-summary.json), [full report](../../docs/game-rules/studies/rtp-10b.json), [convergence CSV](../../docs/game-rules/studies/rtp-10b-convergence.csv) and [rules/results](../../docs/game-rules/12-rtp-balance.md). Final seed 20261105, 10,000,000,000 paid chains, 95.979499% total (54.893894% base, 41.085605% door bonus); approximate 95% total interval 95.955903–96.003096%. Tuning used 34 profiles / 2,021,000,000 recorded chains, excluded from the final held-out sample.

After a run completes, export fixed round-count prefixes from worker journals:

```powershell
node scripts/rtp/convergence.mjs .rtp-runs/final-10b
```

The current published-data test checks the active configuration and recomputes its eight complete shards. The separate historical v8 test checks the original archived configuration. Recalibrate when game math changes; preserve earlier studies as history.

Historical v10 added raw Mystery 10%, preserving Scatter 7.16% and scaling regular tiers proportionally. All pending code16 Mysteries share one uniform current-room tier before Scatter/wins, including a visual-only preview reveal. No new balance study. Current configs include Mystery=10; absent Mystery means zero chance, preserving historical streams. Use original four-weight vectors/--mystery=off plus original retention flags for old JS studies.
