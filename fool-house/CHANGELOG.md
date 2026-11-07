# Fool House change history

Newest changes come first. Keep this history updated so future agents can understand the current behavior and the decisions behind it.

## 2026-11-07 — Refresh the GitHub Pages build with doubled bonus prizes

- Rebuild with `npm run build -- --base=/prototypes/fhouse/` and copy the generated output into `docs/fhouse`. Replace the obsolete JavaScript bundle and update the generated HTML reference. Preserve Vite's internal background lookup keys and the public `/prototypes/fhouse/` asset URLs.
- Include the latest six-floor coin/multiplier doubling. No further gameplay changes. Verification: build passed, published files match the generated output byte-for-byte, and isolated mobile Chromium reached ready under the Pages path with the latest bonus panel, all six backgrounds/12 PNGs loaded, no failed requests/page errors and no E2E observer.

## 2026-11-07 — Double bonus coin and multiplier prizes on ascent

- User confirmed Floor1 stays Coin1.00 and multipliers×2/×3/×5/×8. Each Stairs ascent doubles both future prize types, through the existing six-floor cap: coins1/2/4/8/16/32; Floor6 multipliers×64/×96/×160/×256. Keep door odds, base game, multiplier slot frequencies, combined-pot accounting, zero-pot behavior and move consumption unchanged. Stairs pays no immediate cash and remains a consumed move at the cap.
- Share floor prizes between exact payouts, the potential-prize panel, factor label, door caption and rendered multiplier. Update player/agent rules and module16. Current RTP is unmeasured; no odds or payouts were rebalanced to restore96%.
- Align JS/native/C# simulations with BonusFloorDoubling, omitted for historical profiles. Preserve v14 report/configuration and changed source bytes under studies/v14-source; its billion-round96% result is historical. Conditional expectations now track floor-dependent growth jointly with the pot, and native arithmetic rejects pot overflow explicitly.
- Verification:48 Node tests and production build passed. Native/helper30,000 and independent C#3,000 complete paid chains matched exact credits, final rooms and RNG state; checkpoint replay passed. Historical v8/v14 helper replay3,000 chains each also passed. Full comparison passed:74 browser cases against72 PNG+7 scene baselines;96.32% lines,96.69% functions,92.14% branches. Maximum-floor mobile images reviewed; production observer guard and E2E types passed.

## 2026-11-07 — Repair the GitHub Pages background paths

- Regenerate the published `docs/fhouse` site with `npm run build -- --base=/prototypes/fhouse/`. Preserve the background lookup keys produced by Vite; only public asset URLs receive the Pages prefix. Replace the corrupted bundle and its HTML reference with generated output.
- No game rules, artwork or probabilities changed. Verification: production build passed; published files match the fresh build byte-for-byte. Isolated mobile Chromium startup under `/prototypes/fhouse/` reached ready with all five room backgrounds plus the bonus background loaded, 12 PNG requests successful, no page errors or failed requests, and no E2E observer in production.

## 2026-11-07 — Plain-language player rules

- Rewrite `GAME_RULES.md` as a simple player guide with the current paytable, Mystery reveals, room collection/boosts, free-floor multipliers, retained Scatters, end-of-round bonus entry and all door prizes. Explain combined round winnings, chances, status labels and session reset with short examples.
- Preserve the detailed rules index as `AGENT_RULES.md`; point agent guidance and the structured rules record to it. Keep implementation/testing details out of the player guide. No game behavior or mathematics changed.
- Verification: checked the guide against current game, bonus and round-flow code; checked local document links, paytable/chances and unchanged source fingerprints. No application tests rerun for this documentation-only change.

## 2026-11-07 — Deterministic browser, scene and visual regression suite

- Introduce Playwright Test1.65.0 with its pinned Chromium and Monocart3.2.0 browser coverage. Add scoped Windows CI, normal/coverage/update commands, production-bundle observer guard and a detailed plan/runbook in `docs/TESTING.md`. Dependencies remain project-local.
- Extract actual canvas/aperture/corridor geometry to `src/scene.ts` and consume it in both renderers. Add three pure scene tests plus live geometry/layer/DPR/resize snapshots. E2E-only read-only observations return clones and are absent from the production build.
- Control real production animations with Playwright virtual time and finite RNG tapes; no board/state injection or altered game timing. Cover mouse/touch/keyboard, busy input, Mystery, cascades, room collection/free floors, retained Scatters/delayed bonus, modal controls, every prize, credit/return, reduced motion and art failure. Record 68 PNG and7 scene JSON goldens across desktop/mobile/compact/landscape, with separate high-DPI and normal-production checks.
- Correct stale current rules documentation from a2000ms Mystery hold to the already-committed500ms source constant (2550ms including picker/reveal). Preserve historical measurements and game math/calibration.
- Verification:46 Node tests, production build/observer guard and strict E2E types passed. All72 browser cases passed in the recording run and again without baseline updates. Both runs measured96.43% lines,96.62% functions and92.50% branches across all five application modules. Reviewed representative screenshots. Coverage gates fail closed on missing modules/data. Windows CI is configured but was not run remotely; Chromium mobile emulation does not cover real Safari/devices. Compact evidence is in `docs/testing/verification.json`.

## 2026-11-07 — Recalibrate the complete current game to about96% RTP

- Calibrate the whole1.00 paid chain, including every cascade, room feature/free floor, final retained-Scatter entry and complete base-seeded door bonus. Frozen raw weights: Low35%, Mid32.5%, High19.5%, Scatter3%, Mystery10%. Low remains more frequent than Mid/High. Keep shared uniform floor Mystery outcomes, collection/retention/timing, room multiplier bag, Fibonacci multipliers through x144, floor coins1.00–6.00 and the x2/x3/x5/x8 bonus bag.
- New5/6/7+ whole-group awards: Low0.01/0.02/0.03, Mid0.02/0.03/0.05, High0.03/0.05/0.10. New door chances: Coin30%, Multiplier4.73%, Stairs15%, Ghost50.27%. Smaller regular payouts and less frequent compounding fund the retained features; bonuses still multiply all current base+bonus winnings and credit only increments.
- Baseline v13 returned39,000.361878% in1million paid chains. Explore84 profiles/303million chains, including a100million pilot; exclude all tuning/baseline data from the held-out validation. Freeze profile before independent seed20261111, eight jumped streams and1,000,000,000 complete paid chains. Result: **96.053617713% combined**, base54.888925116%, incremental bonus41.164692597%; approximate95% combined interval95.997804636–96.109430790%. Conditional door diagnostic96.026092997%. Zero truncated chains. Bonus frequency5.3547973%; observed winning group frequency remains Low > Mid > High.
- Publish matching raw report, compact summary, convergence CSV and search records under `docs/game-rules/studies/rtp-v14-*`; module15 explains parameters, scope, confidence limits and reproduction. Preserve v8's ten-billion study unchanged. Extend profile configuration and helper replay to explicit historical paytables; `--keep-scatters=off` uses original odds/paytable, and newer historical snapshots can select `--paytable=legacy`/`--door-odds=v13` with their own weights/flags.
- Verification:43 tests and build passed, including current/historical report accounting/source/config audits and all600 room-label symmetry cases. Current C++ replay matched30,000 complete helper chains; independent C# and v8 legacy matched3,000 each, including exact credits/room/RNG and checkpoint continuity. Isolated headless mobile bonus checks passed with updated odds and combined-pot sequence0.01→0.03→1.03→floor2→3.03→Ghost→6.06; Return did not duplicate credits. A first page-load timeout during heavy simulation was resolved by longer load waits; final run had no page errors. Screenshot visually checked, owned browser/server closed. RTP is an empirical long-run estimate, not an exact theoretical proof or short-session guarantee.

## 2026-11-07 — Carry base round win into the bonus and increase stairs frequency

- Seed each bonus with the entire current paid-round chain's already-credited base win. Coins add floor×1.00 to the combined pot; x2/x3/x5/x8 multiply all current round winnings, including the seed, coins and previous multiplier gains. Add only each pot increase to session/round credits. Entry and Return do not award the seed again. Earlier paid rounds' session winnings are never included. Zero-win entry remains valid.
- Raise stairs to 15%. Distribute the remaining 85% proportionally across former Coin/Multiplier/Ghost odds (35:25:35): Coin/Ghost=595/19%≈31.315789%, Multiplier=425/19%≈22.368421%. Keep floor ladder x1→x6, coin values, multiplier bag and move consumption unchanged. Derive prize labels from constants; bonus status, multiplier captions and completion now say Round win and show the combined total.
- Add startingWinCents to bonus state for exact incremental accounting. Update current JS/C++/C# models/config identity with BonusStartsWithRoundWin, plus conditional expectations seeded by base win and checkpoint seed totals by move count. Preserve historical zero-pot/35-25-5-35 replay and all archived studies. For prior persistence snapshots use --bonus-pot=zero --door-odds=legacy with the snapshot's other flags. Update v13 rules, D19 branch, structured facts and source fingerprints. Current RTP remains unmeasured; no balance study was run.
- Verification: 42 tests/build passed, covering combined base+bonus credits, coin/stairs/multiplier/ghost sequences, zero/negative seeds, exact boundaries, odds ratios, old odds and large BigInt pots. C++ matched 30,000 full helper chains; independent C# and v8 legacy replay matched 3,000 each, with exact credits/room/RNG and checkpoint continuity; native seeded conditional expectations reconstructed successfully. Isolated headless mobile QA started at base0.01, then x3→Coin→Stairs→floor-two Coin→Ghost→x2: combined totals0.03→1.03→1.03→3.03→3.03→6.06. HUD/session totals agreed, new odds/floor labels were correct, and Return kept6.06 without duplicate credit. No page errors; completion layout visually checked. Test browser/preview closed/stopped.

## 2026-11-01 — Quiet startup preview and pause before Mystery selection

- Replace the random animated startup board with `createPreviewBoard`: a fixed dispersed 5×5 layout using all 15 regular identities, at most two of each. No Scatter/Mystery, winning group, growth, picker, board RNG, awards or collection at startup. Display immediately after artwork loads and wait for the first tap/Enter/Space to generate paid results; initial Spins/wager/wins stay zero.
- Add `mystery-waiting`: after a gameplay deal/refill lands, keep raw results visible at full size for 2000 ms before the existing 1600 ms picker and 450 ms reveal. Apply to paid/free-floor deals, ordinary cascades and room-feature refills. Keep the full pause under reduced motion; shorten only picker/reveal as before. Input remains locked and busy taps are discarded. No pause when no Mystery exists; no change to weighted paid draws, payouts or final-chain Scatter timing.
- Current JS/C++/C# models skip preview-board RNG and mark configs `StaticPreview=true`; archived configs without that flag retain their random preview. JS `--preview=random` can replay earlier persistence snapshots, while original v8 `--keep-scatters=off` already selects its historical preview. Preserve archived studies. Update v12 rules/context, T11 timing branch, structured facts and source fingerprints; no RTP balance study.
- Verification: all 40 tests and production build passed. C++ matched 30,000 complete helper chains; C# and v8 legacy replay matched 3,000 each, including exact credits/room/RNG and checkpoint continuity. Isolated headless mobile QA verified an idle nonwinning preview, first paid tap, Low/High paid Mysteries, Mid cascade Mysteries, ignored busy taps, reduced motion and no pause on a plain board. Measured holds were 2015.7/2017.1/2019.5 ms, with no page errors; full landed symbols were visually checked before the picker. Test browser/preview were closed/stopped. Current RTP remains unmeasured.

## 2026-11-01 — Defer Scatter bonus until the base chain finishes

- Move Scatter entry from the start of every evaluation to terminal settlement: reveal Mysteries, pay/remove all regular wins, finish refills, stalled-room extra clears and all collection-triggered free floors first. Only when no regular win or room continuation remains, count final retained Scatters and award their exact count in moves at 6+. This includes the fewer-than-five-regular-slots exit.
- Retain the once-per-paid-chain guard and mandatory Continue popup. Returning from the completed bonus restores the already-settled board and becomes ready without another trigger, pending base payout, wager or counted spin. New paid starts still replace all cells and reset eligibility. No weights, paytable, collection, stage multipliers or door prizes changed; current RTP remains unmeasured.
- Update current JS/C++/C# simulations and configuration identity with `BonusAtEndOfPaidChain`; preserve old early-entry behavior for historical configurations and legacy replay. JS historical persistence runs can select `--scatter-timing=early`; original v8 `--keep-scatters=off` already selects early timing. Update v11 context, sequencing diagram/pseudocode, structured facts and source fingerprints; leave archived studies unchanged.
- Verification: 39 tests and production build passed; C++ matched 30,000 complete production-helper chains, independent C# and legacy replay matched 3,000 each, with exact credits/room/RNG and checkpoint continuity. Isolated headless mobile QA traversed two free floors (including a six-Scatter winning board) before the first popup at seven final Scatters and 1.16 credited base win. Seven Ghost moves, Return, no duplicate trigger and the next paid reset passed with no page errors. Test browser and preview were closed/stopped. No balance study was run.

## 2026-11-01 — Add shared floor Mystery symbols

- Added a raw 10% Mystery chance per newly drawn cell. Preserve Scatter at 7.16%; scale regular weights proportionally by 82.84/92.84 to Low≈44.168246%, Mid≈24.169846%, High≈14.501908%. Existing payouts, room/stage bags, door odds, Scatter retention and once-per-paid-chain bonus scope are unchanged. No full balance study was run.
- Mysteries land as code-drawn pink glowing/pulsing question marks. User confirmed one shared symbol for the whole group, chosen uniformly from current-floor Low/Mid/High (1/3 each). Never choose another floor, Scatter or Wild. Only Mystery cells transform; other survivors remain untouched.
- Added a 1600ms three-icon floor selector and 450ms shared reveal, before Scatter and win/collection evaluation. Animation uses no extra outcome RNG and input stays locked. Reduced motion uses static glow/choice and shorter phases. Preview also reveals without payouts/collection/bonus. Normal revealed-symbol wins follow the existing math.
- Updated JS/C++/C# helpers, config identity, preview RNG and historical no-Mystery replay. Four-weight vectors/--mystery=off preserve prior draws. Updated v10 context/structured rules and module14; historical study files remain unchanged and current RTP remains unmeasured.
- Verification: 39 tests/build passed; native model matched 30,000 full production-helper chains, legacy replay 3,000 and independent C# replay 3,000, including RNG/credits and checkpoint continuity. Isolated headless checks verified Low/Mid/High outcomes in Hall/Attic, mobile390×844 /375×667 and desktop1280×800, ignored busy clicks and no page errors. Actual selection-to-ready durations were about2.08s, below3s. Visually inspected pink question marks/selector and resolved icons. Test browser/preview were closed/stopped; no user tab or production dependency changed.

## 2026-11-01 — Preserve Scatters across floors and room features

- Keep base-game Scatter objects in their original reel cells during collection-driven floor changes and partial-room feature clears. Clear/refill only other cells, and animate only newly drawn symbols. New floor draws return to the global regular pool; room-feature refills retain their room pool.
- User confirmed one bonus per paid-round chain. Preserve the awarded guard across bonus Return, feature clears and every free floor; later carried/new Scatters cannot re-award that chain. A new paid round draws a fresh board and resets eligibility.
- Added a terminal space check: with 21–25 protected Scatters and no regular win, resolve any eligible bonus then settle, including partial collection. Fewer than five regular slots cannot form a winning group; this prevents an endless feature-refill loop without deleting Scatters or awarding unearned progress.
- Weights, paytables, room/stage multipliers and door-prize odds are unchanged. Balancing was explicitly deferred. Marked v8's ten-billion-round result historical; preserved raw reports/summary/convergence unchanged and added its archived config. Current RTP remains unmeasured.
- Updated JS/native/C# simulation policies and historical replay switches; current configs use KeepScatters/BonusOncePerPaidChain, with a distinct ID. Added v9 module 13 and refreshed current rules/agent context/fingerprints.
- Verification: all 35 tests and production build passed. Updated native model matched production helpers on 30,000 complete paid chains, plus 3,000 legacy chains and 3,000 independent C# chains; checkpoint resume checks passed. These are functional checks, not a new RTP study. Visual QA was stopped by computer-use because the current browser URL could not be verified; no further browser input was issued. Temporary fixture/server removed/stopped.

## 2026-11-01 — Balance full-game RTP and validate ten billion paid chains

- Set fixed symbol weights to Low 49.5%, Mid 27.0875%, High 16.2525%, Scatter 7.16%. Preserve Low > Mid > High, every paytable/bag, collection refills/extra clears, Fibonacci stages, Scatter threshold and door-prize odds. Base contribution includes all regular awards in collection free stages; door bonuses supply the remaining return.
- Screened 34 weight profiles over 2,021,000,000 recorded tuning chains. Kept the intentionally stopped 1.7-billion pilot as tuning evidence, then used a fresh seed for the complete final validation. No tuning/partial rounds count toward the ten-billion result.
- **10,000,000,000 full paid chains**, seed 20261105 / eight jumped streams: **95.979499% total (54.893894% base, 41.085605% door bonus); approximate 95% total interval 95.955903–96.003096%**. Zero truncated chains. Low/Mid/High winning groups 10974406669 / 3629522289 / 1906302048; Low remains most frequent. Observed 77 x144 free stages, longest chain 12 free stages.
- Added a resumable native laboratory, independent C# reference, exact production-helper replay checks and long-period xoshiro128** streams. Verified 30,000 full production-helper replays, exact ten-million-chain cross-runner credits/RNG/counters, checkpoint continuity, and all 120 room-label permutations in each room (600 symmetry cases). Statistical tests preserve exact monetary totals and combined-return covariance.
- Published compact/full JSON reports, 125 fixed-prefix convergence checkpoints, tuning evidence and agent-readable v8 module 12; updated current rules/fingerprints and explicit historical reproduction weights. Native binaries/compiler/cache stay in ignored .rtp-runs; no browser dependencies/assets changed.
- Verification: all **31 tests** passed, including current-configuration and ten-billion-shard accounting regression. Production build passed after final runtime weights; final source/binary hash and documentation audits confirm the recorded snapshot. Session RTP still varies; the study is Monte Carlo evidence.

## 2026-11-01 — Clear previous bonus door highlights

- Reset selected door, revealed flag, prior prize/caption and reveal callback at the start of every corridor walk. Only the currently accepted choice can affect its own door-opening/prize animation.
- Removed passive door hover glow and moved focus back to the bonus region both on acceptance and at the next step. A stationary pointer or previous button focus no longer makes a door look preselected. Enabled keyboard navigation retains a plain focus outline without prize-like glow/fill.
- Updated UI/door rules and current source fingerprints. Prize math, probabilities and move accounting are unchanged.
- Verification: all 26 existing tests and production build passed. Mobile browser checks selected Left then Right, confirmed 1.00 then x3/3.00 accounting, and checked each next choice with the pointer left over the previous door: all doors closed, neutral backgrounds, no shadows/outlines, focus on the bonus region. Temporary fixture/server removed/stopped after checks.

## 2026-11-01 — Room-specific refills and guaranteed collection progression

- First collected current-room Low/Mid/High tier immediately restricts all subsequent replacement regular icons to that room's index. Preserve Low/Mid/High/Scatter weights 57/23.75/14.25/5; Scatter remains standalone. Active replacements consume one RNG draw each, with no independent index draw. Full initial/preview/free-stage deals and uncollected refills retain the global pool.
- User explicitly confirmed guaranteed completion with extra clears. A partially collected room with no winning group clears all 25 cells and refills free in the same room, retaining collection, multiplier and Scatter award guard. Repeat until all tiers collect, then use the existing free-stage transition. No payout/collection for cleared survivors, no extra wager/spin. Ordinary hole refills preserve survivors; new background resets collection and refill pool. Completion has no fixed refill/time bound.
- Added `refillForRoom`, `shouldContinueRoom` and shared `refillCurrentRoom` flow, plus status/accessibility feedback for active room refills. Bonus Return keeps the same active room progress. Scatter checking still precedes extra clear; it does not re-award a room's bonus after clearing Scatters.
- Five new regression tests (26 total) cover every room including index zero, draw boundaries/RNG count, global reset, foreign/Scatter survivors, remaining-tier collection and continuation guards. Simulator mirrors the feature and supports `--room-refills=off` for history. Current 100,000-chain study estimates 153.52003% RTP (approximate 95% interval 149.32185–157.71821%), with 35,735 free stages, 29,158 extra clears and 2,150 door bonuses. This materially raises return; payout rebalancing remains deferred, with weights/paytables unchanged.
- Added v7 module `11-room-refills.md`, current study JSON, rule/analysis facts and source fingerprints; historical reproduction commands now explicitly disable room refills.
- Verification: all 26 tests and production build passed. Deterministic mobile browser test confirmed first Hall-only hole refill while foreign survivors stayed fixed, a deliberate stall/extra clear, complete collection and Basement free-stage global reset at x2. Final Spins 2, paid wager 1.00, win 0.52; no console warnings/errors. Temporary fixture and local server removed/stopped after checks.

## 2026-11-01 — Playable corridor and three-door bonus

- Added a frame-rendered perspective corridor at reel aspect/size when space permits: 3000 ms forward approach, dusty brick walls, runner, torches, cobwebs and three selectable doors. Lock inputs while walking/opening/revealing; one accepted choice consumes one move. Door opening is 700 ms, followed by 1600 ms reveal (1900 for the advancing/fading Ghost). Reduced motion removes travel/lunge/pulsation while retaining timings and choices.
- Added pure `src/bonus.ts`: Coin 35% (1.00 × floor), Multiplier 25% from `[2,2,2,2,2,3,3,5,5,8]`, Stairs 5%, Ghost 35%. User confirmed accumulated-pot multipliers and stairs adding one floor, capped at x6. Floor scales coins only; preserve the exact multiplier bag. Stairs/ghost pay zero and spend a move; capped stairs do not reroll.
- Show current floor, coin amount, multiplier range, next floor and all chances above the scene. Update move/remaining/step-win/bonus-total fields at reveal. After the final reveal, Return to mansion resumes the preserved base board/collection/multiplier/Scatter guard, without charging or paying the bonus pot again. No Scatter draw exists in this door feature; prior retrigger preference remains for future features that draw Scatters.
- Credit only each bonus-pot increase. Added exact BigInt cent storage/formatting for bonus and session money so repeated multipliers cannot silently lose integer precision. Base paytable/weights remain unchanged. Added five meaningful bonus math tests (21 total), including every floor/cap, multiplier slots/empty pot, moves and very large totals.
- Simulator now includes door bonuses/return by default, with `--door-bonus=off` for historical studies. A 100,000-round full-game run, seed 20261101, estimated 9.9003% RTP (approximate 95% interval 9.1010–10.6996%), with 437 bonuses/2674 moves. This is volatile prototype evidence; payout rebalancing remains deferred. Base-only seed-42 replay still gives the historical 6.07206% result exactly.
- Added v6 rules and `docs/game-rules/10-door-adventure.md`, current study JSON and source fingerprints. Historical studies retain their original results and explicit reproduction flags.
- Verification: 21 tests and final production build passed. Deterministic browser sequence Coin → Stairs → x3 → Ghost → floor-two Coin → x2 paid exactly 10.00, consumed six moves, then returned to the pending 0.10 base win for 10.10 total. Verified double-input lock, 3-second approach (~3.47 seconds including browser-control overhead), prize/floor updates, ghost visuals and 390 × 844 / 375 × 667 / 844 × 390 / 1280 × 800 layouts. Compact landscape prize panel/labels were adjusted after inspection. Temporary fixture and local server removed/stopped after checks.

## 2026-11-01 — Bonus screen and step status panel

- Continue on the Scatter intro now opens an opaque blueprint bonus scene above the preserved base game, with the game logo at top center and a glowing green `Bonus` label below it. Base scene becomes inert/aria-hidden and the controller enters `bonus`; it does not evaluate pending base wins or return to paid-ready.
- Added a responsive bottom panel: current/total steps and remaining count, Step win, Total bonus win. Initialize at step 1 of the awarded count, completed steps 0, and both bonus wins 0.00. Remaining includes the current unplayed step, so six awarded moves show `1 of 6 steps`, `6 remaining`, `0.00`, `0.00`. Example amounts from the request are not seeded as wins.
- Preserve base board, collection, multiplier and committed/pending awards underneath. Bonus move execution, spending/retriggering steps and return to base remain deferred to the user's next instructions. Predecode the bonus background at startup (12 required images total) for immediate entry. No draw weights/paytables or payout RNG changed.
- Updated the v5 agent-readable flow/accounting/UI/bonus rules, structured state/assets/counter facts and source fingerprints. Prior simulations remain complete-base-math projections assuming eventual resumption, excluding future bonus payouts; they do not model a completed live chain while the bonus shell is paused.
- Verification: all 16 math tests and production build passed. Deterministic browser fixtures verified click/keyboard Continue, preserved pending base board, preserved prior 0.10 base win, initial bonus counters, input lock, and no counter changes on resize. Checked 390 × 844, 375 × 667, 844 × 390 and 1280 × 800; normal base-round smoke test also settled correctly, with no console warnings/errors. Temporary fixtures and local server removed/stopped after checks.

## 2026-10-31 — Bonus mansion-plan background artwork

- Generated `src/assets/background/bonus.png` with built-in imagegen: a full mansion floor plan in navy drafting ink on yellowed paper, filling most of the view on a worn attic table. Includes corner cobwebs, coffee stains, creases, tears, repair tape and paper patches. No text, logo, watermark or game UI.
- Saved the exact prompt and generation method in `src/assets/background/bonus.prompt.md`. PNG is 1024 × 1536, intended for the future bonus scene; existing five-room theme mapping and gameplay remain unchanged.
- Verification: visually inspected the generated artwork, checked PNG signature/dimensions and successful production build with the new asset bundled. No source/game-rule changes were needed.

## 2026-10-31 — Restore Low > Mid > High frequency

- User explicitly chose Low 57%, Mid 23.75%, High 14.25%, Scatter 5%, with payout rebalancing later. Replaced the previous 14.66/10/70.34/5 High-heavy calibration. Lower-paying tiers now appear more often. Keep the existing paytable, room multipliers, Scatter entry and stage behavior intact.
- Updated draw-boundary/reachability/distribution tests and added a regression assertion for Low > Mid > High and fixed 5% Scatter. All five icons in each regular tier remain equally likely. The same weights apply to initial deals, free stages and refills.
- Added per-tier winning-group and awarded-cent counters to the simulation without consuming RNG. One million paid rounds (seed 20261031) produced 1,281,630 Low / 81,723 Mid / 9,718 High winning groups; estimated RTP 6.09404% (approximate 95% interval 6.07387–6.11421%), hit rate 62.8208%. This lower RTP is documented; the old ~96% result is superseded, and future Scatter move payouts remain excluded.
- Added the v4 context/study in `docs/game-rules/09-tier-frequency.md` and raw validation JSON. Refreshed current rules, probabilities, source fingerprints and agent guidance; retained historical studies with explicit reproduction weights. Payout rebalancing remains future work by user choice.
- Verification: all 16 tests, production build and mobile browser smoke test passed. A paid round removed two five-Low groups, credited exactly 0.02, refilled, and returned to ready without console warnings/errors. Confirmed current-source fingerprints, structured facts, study totals and documentation links; preview server stopped after verification.

## 2026-10-31 — Scatter bonus trigger and haunted entry popup

- User scoped this step to trigger/popup only and confirmed that future bonus play should allow 6+ Scatter retriggers to add moves. Move execution/consumption is deferred. Continue currently resumes ordinary resolution while preserving the awarded moves for the next implementation step.
- Added pure `getScatterBonusMoves`: count all Scatter cells; 0–5 awards zero, 6–25 awards the exact count. Check before regular evaluation after paid/free full deals and ordinary refills. Preview never triggers. Award once per room stage to prevent retained Scatters repeatedly awarding on cascades; reset the guard on each fresh paid/free stage.
- Store moves in a session bank across paid rounds, with a reel badge and settled status. No extra wager, spin count, cash payout, RNG call, room change, or multiplier change from entry. Reload clears the bank. Existing calibration excludes future payouts from bonus moves.
- Added the `bonus-trigger` state and a native modal with mansion artwork, cobweb corners, blood stains/drips, drifting dust and glowing green ooze. Dim/blur the scene, focus Continue, trap focus, prevent Escape/backdrop dismissal, and pause indefinitely until Continue. Resume the same board exactly once so pending regular wins are paid normally. Support constrained-height scrolling and reduced motion.
- Added v3 rules and a dedicated `08-scatter-bonus.md` context module; updated routing, accounting, flow, structured facts and source fingerprints. Historical calibration files remain unchanged.
- Verification: 16 math tests and production build passed. Deterministic browser checks verified unpaid six-Scatter preview exclusion; six/seven move allocations; no duplicate award after refill; a five-to-six Scatter refill trigger; Escape lock; keyboard/click Continue; exact pending win credit and 19 accumulated moves across three paid rounds. Checked 375 × 667, 390 × 844, 844 × 390, and 1280 × 800 layouts. The temporary fixture and local server were removed/stopped after verification.

## 2026-10-31 — Larger mobile reels and symbols

- Increased reel icon fit from 90% to 98% of aperture width and regular sprite height allowance from 94% to 108%, using the sheets' transparent margins. Scatter height fit increases to 100% of its icon area; its label remains above the mansion. Preserve aspect ratios and aperture clipping.
- Portrait screens at most 600 CSS px wide use 4 px reel side margins, gaps capped at 10 px, and collection icons capped at 64 px / 8% of viewport height. Use the available play-area height; center vertically when possible and shift upward on short phones to keep the title, collection, and HUD clear. At 390 × 844 the frame is 382 px wide (about 9% larger); at 375 × 667 it is about 318 px wide (about 30% larger).
- Updated the runtime UI reference, structured layout facts/current source fingerprint, and agent layout guidance. Calibration studies retain their original source snapshots; gameplay math is unchanged.
- Verification: all 15 existing tests and production build passed. Browser checks at 375 × 667, 390 × 844, 440 × 956, and 844 × 390 confirmed panel separation, readable enlarged symbols, preserved state across resizes, and successful click-to-round settlement. No browser warnings/errors. The preview server was stopped after verification.

## 2026-10-25 — Room-specific win multipliers and prototype calibration

- User confirmed one independent random multiplier per winning room-specific group, stacked with the Fibonacci stage multiplier, and an approximate 96% RTP target.
- Added the exact 30-slot bag: fourteen x2, eight x3, five x5, three x8. Award = count-paytable group amount × stage × room. Other-room groups receive no room roll. Already-collected tiers remain eligible on later wins; Scatter and sub-threshold matches do not qualify.
- Added a separate 1100 ms teal room-bonus reveal between winning highlight and removal, with one row per qualifying group and before/after amounts. Highlight matching member cells; preserve readable static reveal under reduced motion. Credit only the final total once after removal.
- Calibrated static weights to Low 14.66%, Mid 10%, High 70.34%, Scatter 5%, retaining the paytable, uniform regular indexes, and stage/collection rules. High is deliberately common; this shorter-chain profile was selected over a tested Low-heavy alternative.
- Added `npm run simulate` using production math helpers and seeded complete-round simulations. Two fresh million-round validations yielded combined 96.07564% RTP (approximate 95% interval 95.9558–96.1955%) and 88.1421% hits versus 62.929% in the old-game sample. Only 63 first free stages were observed; later Fibonacci tails are not empirically calibrated. See `docs/game-rules/07-calibration.md` and raw JSON studies.
- Updated the agent-readable rules to v2, including room-roll branches, ten states, accounting examples, and calibration evidence. Added three room-multiplier regression tests (15 tests total).
- Verification: all 15 tests and the final production build passed. Desktop and 440 × 956 browser checks showed independent x2/x3/x8 group reveals, locked input, exact 0.97 final credit, and the subsequent free stage at x2; no console warnings/errors. The temporary fixture and both preview servers were removed/stopped. Validated seven rules modules, 106 case IDs, 44 links, five source fingerprints, and `git diff --check`.

## 2026-10-25 — Detailed agent-readable rules reference

- Audited current runtime math, sequencing, accounting, presentation, and failure branches. Added `GAME_RULES.md` as a compact entry point with a topic/module catalogue.
- Added six self-contained modules in `docs/game-rules/` covering math, round flow, stages, accounting, runtime/UI/errors, and market-analysis handoff. Each has a context packet, stable branch IDs, source-function references, and explicit edge cases.
- Added `docs/game-rules/rules.json` for machine-readable facts, module routing, and raw-source SHA-256 fingerprints at commit `39435f59cd107d714a2fb15a807700c57feff1cd`.
- Documented unpaid preview, nonpaying Scatter, stage-completion priority over refill, capped multiplier with uncapped chain length, observed-versus-expected RTP, reset/error semantics, and current feature gaps. No external market research or new balance/RTP claim is included.
- Updated agent instructions to read the compact rules/index and relevant history/modules instead of loading the entire change history. No gameplay, image, or UI code changed.
- Verification: all 12 existing math tests passed. Parsed JSON facts match runtime grid/bet/weights/paytable/threshold/multiplier constants and all nine state names. Checked six modules, all 91 documented case IDs, 29 local Markdown links, four source fingerprints, and `git diff --check`. The entry point is 699 whitespace-delimited words; detailed context is loaded by topic.

## 2026-10-25 — Mid and High tier color overlays

- Added a subtle light-red radial wash behind Mid symbols and a light-gold wash behind High symbols, clipped to each reel opening. The artwork remains clear above the translucent tint.
- Apply matching tints to uncollected Mid/High collection-panel slots as a consistent tier cue. Low retains its dark backing and Scatter its purple styling. Winning cells and collected slots retain their stronger gold highlights/checkmarks.
- This is a canvas presentation change; symbol assets, probabilities, payouts, and game rules are unchanged.
- Verification: all 12 math tests, `npm run build`, and whitespace checks passed. Desktop and 440 × 956 browser previews confirmed distinct, subtle Mid/High colors and clear artwork, with no browser warnings/errors.

## 2026-10-25 — Scatter border and label

- Added a violet/silver gradient border, violet glow, and tinted cell backing specifically for Scatter cells.
- Draw a high-contrast `SCATTER` label above the full mansion sprite, reserving vertical space so the label does not obscure the house. Border and label appear with the existing growth animation and scale with the cell.
- These are canvas overlays; the original `scatter.png` is preserved. Draw weights, payouts, collection, and deferred Scatter feature rules are unchanged.
- Verification: all 12 math tests and `npm run build` passed. Desktop and 440 × 956 browser previews confirmed the border and readable label, including adjacent Scatter cells, with no browser warnings/errors.

## 2026-10-25 — Scatter integration and 5/6/7+ wins

- Added the mansion Scatter to initial deals, paid/free stages, and replacement draws. Load `scatter.png` with the other artwork and render the entire standalone sprite with the same growth/removal layout; never crop it into five frames.
- User confirmed a 5% Scatter weight with feature rules deferred. Regular weights scale proportionally to low 57%, mid 23.75%, high 14.25% (original 60:25:15 ratio within 95%). Regular tiers choose indexes 0–4 uniformly; Scatter uses index 0 and needs only one random draw.
- Scatter does not pay, join regular combinations, substitute for other symbols, collect, or trigger a bonus. It remains in place during ordinary refills and clears with the board on a new paid/free stage.
- Raised the regular-symbol threshold from 3 to 5 and moved the unchanged award amounts to counts 5 / 6 / 7+:

  | Tier | 5 symbols | 6 symbols | 7+ symbols |
  | --- | --- | --- | --- |
  | Low | 0.01 | 0.05 | 0.10 |
  | Mid | 0.05 | 0.10 | 0.25 |
  | High | 0.10 | 0.25 | 0.50 |

- Counts below five do not win or collect; counts above seven pay the seven-symbol group award once. Fibonacci multipliers, the 1.00 paid bet, collection-driven free stages, and integer-cent accounting continue to apply.
- Added tests for new weight boundaries/distribution, Scatter exclusion/preservation/refill behavior, 5/6/7+ payouts through 25 symbols, and chained refills at the new threshold.
- Verification: all 12 tests, `npm run build`, and whitespace checks passed. Desktop and 440 × 956 browser checks confirmed full mansion rendering. A double-click produced one paid spin: five matching Low symbols paid 0.01, four-match groups stayed in place, and Scatter survived the refill. The settled round/session win was 0.01 with 1.00% RTP for the single 1.00 wager. No browser warnings/errors were reported.

## 2026-10-25 — Five-by-five reels

- Edited the existing reel artwork with built-in imagegen to add a fifth row, preserving its bronze gothic frame, gargoyles, skulls, and red gems. Saved the new transparent 1164 × 1351 PNG as `src/assets/reels/main-5x5.png`; the original 5 × 4 `main.png` remains intact.
- Switched the canvas to the new frame and measured its 25 transparent apertures for symbol positioning. The original square image's coordinates no longer apply.
- Changed the board to 5 columns × 5 rows (25 cells), including generation, refills, clearing, animation delays, and accessible descriptions. Existing rule loops derive their size from the shared row/column constants.
- Updated regression tests to cover 25-cell generation (50 independent RNG calls), wins involving the fifth row, quantity payouts through 25, and 5 × 5 removal/refill and cascade fixtures.
- Saved the exact image-edit prompt in `src/assets/reels/main-5x5.prompt.md`.
- Verification: all 11 tests and `npm run build` passed. Visually counted 25 openings and confirmed alpha-zero pixels at all 25 opening centers. Browser checks covered desktop, 440 × 956 portrait, 844 × 390 landscape, fifth-row winning highlights, refills, and automatic free stages; no browser warnings/errors were reported.

## 2026-10-25 — Mansion scatter artwork

- Generated `src/assets/symbols/scatter.png` using the built-in image generation tool: a complete haunted mansion in a luminous amethyst-purple frame with silver gothic edging, visually distinct from the regular bronze-framed symbols.
- Preserved the transparent PNG as a standalone portrait icon. Saved the exact prompt and generation details in `src/assets/symbols/scatter.prompt.md`.
- Verification: visually inspected the generated mansion/frame; confirmed 971 × 1619 px, 32-bit RGBA, and transparent corner pixels. No runtime code changed.
- Artwork only: the scatter is not yet in the symbol pool, paytable, or collection system. Scatter frequency, payouts, and triggers await user instructions.

## 2026-10-25 — Quantity-based paytable

- Replaced per-symbol payment with one award per identical-symbol group, based on its total count anywhere on the board:

  | Tier | 3 symbols | 4 symbols | 5+ symbols |
  | --- | --- | --- | --- |
  | Low | 0.01 | 0.05 | 0.10 |
  | Mid | 0.05 | 0.10 | 0.25 |
  | High | 0.10 | 0.25 | 0.50 |

- The user specified entries through five; implementation assumption: 6–20 matches use the five-symbol award once, while all matches are removed and eligible for collection. No extra multiplication by the number of symbols or splitting into smaller paying groups.
- Continue to multiply the group award by the active Fibonacci multiplier. Keep payouts in integer cents and the paid bet at 1.00. Existing refills, collection, free stages, and session accounting consume the new awards.
- Added regression coverage for every tier and count from 2 through 20, at x1/x2/x144, plus simultaneous-group and multi-cascade payout totals.
- Verification: all 11 tests, `npm run build`, and `git diff --check` passed. This change affects pure payout math; canvas layout and animation are unchanged.
- This implements the requested table; long-run RTP has not been calibrated or simulated.

## 2026-10-25 — Winning sequences, collection, and free stages

- Find every group of 3+ identical tier/index symbols anywhere, including separated cells. Highlight all winning cells, shrink/remove them, refill only holes in place, and repeat evaluation until settled. Unmatched cells stay put; there is no gravity.
- Pay each removed symbol in integer cents: low 10, mid 50, high 100, multiplied by the active stage multiplier. The user explicitly confirmed payment per removed symbol. One paid round costs 100 cents. Awards accumulate across all refills and free stages in both round and session wins; RTP uses only paid wagers.
- Removed symbols matching the current background's index collect their tier. Highlight collected panel icons with a gold border/glow and checkmark. Preserve collection across refills; reset it whenever entering a different background.
- Completing low/mid/high collection displays “Switching to the next stage” at reel center, clears all reels, chooses another random background, and draws an automatic free respin. Free-stage multipliers are x2, x3, x5, x8, x13, x21, x34, x55, x89, x144; further completions remain at x144. A new paid round resets to x1.
- Added a glowing/pulsating multiplier badge at reel top right and stage popup. Reduced-motion mode uses static highlights/badge and brief symbol phases. Input is locked until the whole paid-round chain settles.
- Spins include paid deals and free respins, while refills add neither spins nor wagers. Preview board on page load is unpaid and does not resolve wins.
- Decode all five backgrounds at startup so free-stage transitions are immediate and cannot fail on a later room download.
- Added math tests for separated/global matches, simultaneous groups and multiplied payouts, removal/refill preservation, multi-cascade resolution, collection persistence/filtering, and the Fibonacci cap.
- Verification: all 10 tests and `npm run build` passed. Browser checks covered live cascades, highlighted collection, desktop/mobile/landscape layout, disabled input, and multiplier reset on a new paid round. A temporary deterministic browser fixture completed two stages: 4.80 at x1 plus 9.60 at x2, then settled at x3 with 3 spins, one 1.00 wager, 14.40 total win, and 1440.00% RTP. The fixture was removed after testing; no test controls ship with the game. No browser warnings/errors were reported.

## 2026-10-25 — Weighted reels and animated rounds

- Added pure math in `src/game.ts`: a 5-column × 4-row board with independent cell draws. First select the tier (low 60%, mid 25%, high 15%), then select index 0–4 uniformly within that tier. Individual icon probabilities are 12%, 5%, and 3% respectively; the active background does not restrict reel draws.
- Populate the opening board as a preview without counting a spin. Each tap/click, Enter, or Space then selects uniformly among the other four backgrounds, updates its collection, draws all 20 cells, and increments spins once.
- Cache decoded artwork on first visit. Prepare the background before replacing the scene; failed background loads leave the previous scene intact and allow retry without counting a spin.
- Added staggered growth from each cell center (340 ms per symbol, 65 ms column and 35 ms row delays). Symbols render beneath the reel frame, clipped to the artwork's 20 cell openings. Reduced-motion preference displays settled symbols immediately.
- Lock round input during loading and animation; return to ready after settling. Resize redraws the current result without rerolling. Added an accessible row-by-row result description.
- Added `npm test` using Node's native TypeScript support for tier boundaries, all icon indexes, complete independent board draws, and seeded distribution across all 15 symbols.
- Verification: all four math tests and `npm run build` passed. Browser checks covered the initial 20-cell preview, growth in progress, repeated rounds/background changes, click/keyboard controls, one spin per double-click, persistent results on resize, and desktop/portrait/landscape layouts. No browser warnings or errors were reported.
- Remaining: winning sequences, wager/payout rules, result-driven RTP/wins, and collection progress. Wins stay zero and RTP stays `—` until wager rules exist.

## 2026-10-25 — Background-specific collection symbols

- Added an explicit theme mapping, independent of file/glob ordering. Choose one theme randomly on page load and retain it through resizes and round requests.
- Load `src/assets/symbols/{low,mid,high}.png`. Each sheet contains five equal horizontal frames. Use `sheet.width / 5` for frame width (the current 2172 px sheets produce fractional widths); retain the full sheet height and preserve aspect ratio.
- Select one symbol per tier using the same index for the selected background:

  | Index | Background | Collection |
  | --- | --- | --- |
  | 0 | `basement.png` | `low[0]`, `mid[0]`, `high[0]` |
  | 1 | `hall.png` | `low[1]`, `mid[1]`, `high[1]` |
  | 2 | `museum.png` | `low[2]`, `mid[2]`, `high[2]` |
  | 3 | `guests.png` | `low[3]`, `mid[3]`, `high[3]` |
  | 4 | `attic.png` | `low[4]`, `mid[4]`, `high[4]` |

- Store each selected symbol's tier, index, sprite, and stable ID (`background:tier`, e.g. `basement:low`) for future collection logic.
- Draw the selected low / mid / high icons below the centered reels and above the message/statistics panels. Reserve space on resize and provide an accessible description of the selected collection.
- Use compact symbol slots and HUD spacing on screens shorter than 500 px so landscape layouts retain room for the reels.
- Added this history and a project-local `AGENTS.md` directing future agents to maintain it.
- Verification: `npm run build` passed. Browser reloads exercised all five background/index pairs; desktop, 390 × 844 portrait, and 844 × 390 landscape layouts were checked. Collection selection persisted through resize and round request, with no browser warnings or errors.
- Remaining: reel population, spinning, collection progress, wager and payout rules, and result-driven session counters.

## 2026-10-25 — Session statistics and status panels

- Added a bottom bar for spins, session RTP, cumulative session wins, and latest round win, plus a message panel above it.
- Show loading, ready, error, and round-requested states. A tap/click, Enter, or Space requests a round once ready.
- Counters start at zero. RTP is total wins / total wager × 100, displayed as `—` before any wager. Round requests do not fabricate spins or payouts.
- Verified with the production build and desktop, portrait, landscape, click, and keyboard browser checks.

## 2026-10-25 — Responsive canvas scene

- Replaced the welcome screen with a high-DPI canvas. Randomly select a supplied background on page load, center-crop it to fill the viewport, and retain it on resize.
- Draw `src/assets/reels/main.png` centered above the background and `src/assets/reels/title.png` at top center, preserving aspect ratios.
- Added asynchronous artwork loading and a visible error message. Bundle asset URLs through Vite.
- Verified the production build and desktop/mobile browser layouts, resizing, and background changes after reload.

## 2026-10-25 — Standalone scaffold

- Created an independent npm project with TypeScript 7, Vite, and http-server, strict browser TypeScript, and a minimal welcome page.
- Scripts: `npm run dev`, `npm run build`, `npm run preview`, and `npm run serve` (built `dist/` on port 1234).
- Verified `npm run build`.
