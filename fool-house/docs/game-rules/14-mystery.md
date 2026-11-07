---
document_type: rules_module
ruleset_id: fool-house-2026-11-07-v14
context: 10% raw Mystery draws; pink question mark; one shared equiprobable current-room reveal per wave; 500ms results hold then under-three-second picker/reveal
read_when: Mystery identity, probability allocation, shared outcome, sequencing, animation, room index, simulation compatibility
branch_ids: T01-T11
---

# 14 — Shared floor Mystery

**Context packet:** every newly drawn cell has **10% Mystery probability**. A Mystery lands as a glowing, pulsing pink question mark. All unresolved Mysteries on that board form one reveal wave and become **one shared regular symbol**, chosen uniformly from the current base room's Low/Mid/High icons (1/3 each). This is a transformation, with no Wild substitution or direct payout. Choose/reveal before regular wins. Check Scatter only at final paid-chain settlement after all wins/features/free floors finish. After each gameplay deal/refill lands, hold raw results for 500 ms before starting selection. Selection is 1600 ms; reveal is 450 ms: 2050 ms of picker/reveal animation, 2550 ms including the new hold. Keep the full hold even with reduced motion. Startup is a static nonwinning regular-only preview, with no feature sequence. Scatter is3%; regular probabilities are Low35/Mid32.5/High19.5 while Mystery stays10. Current regular payouts are in [01](01-math.md); current bonus odds/combined pot are in [10](10-door-adventure.md). Current RTP calibration is in [15](15-current-balance.md).

**Authority:** [game.ts](../../src/game.ts): `drawSymbol`, `revealMysteries`, `findWins`; [main.ts](../../src/main.ts): `revealMysterySymbols`, `drawMysterySymbol`, `drawMysteryPicker`, `resolveRound`, `start`.

| ID | Condition | Outcome |
| --- | --- | --- |
| T01 | Draw a new cell | Draw one tier RNG value: [0,.10) Mystery; then Low, Mid, High; [.97,1) Scatter. Mystery and Scatter use index 0 and no independent icon RNG draw. Existing cells, including protected Scatters, are never rerolled merely to introduce Mystery. |
| T02 | Mystery lands | Render a code-drawn question mark with pink radial aura, rounded glowing border and synchronized pink scale pulse. It grows through the normal deal/refill animation. No new image asset is required. |
| T03 | Evaluated board has no Mystery | Consume no reveal RNG, show no results pause/selector and proceed normally. Rechecking a resolved board after bonus Return has no additional reveal draw. |
| T04 | One or more unresolved Mysteries exist | First follow T11 after the deal/refill finishes, then capture all Mystery positions. Consume exactly one RNG value, selecting Low for [0,1/3), Mid for [1/3,2/3), High for [2/3,1). Fix the selected icon's index to the current base room: basement0/hall1/museum2/guests3/attic4. The entire wave shares this outcome, regardless of regular-tier draw weights or collected tiers. |
| T05 | Selection animation | Keep all question marks pink/pulsing while a centered panel cycles through the three actual current-room icons, then highlights the committed choice. The outcome is chosen once before animation; cycling/resize/rendering consumes no payout RNG. Inputs remain locked. |
| T06 | Selection ends | Replace only Mystery cells with the shared regular identity and reveal for 450 ms with growth/pink light. Other regular cells, Scatters and holes are untouched. Clear the reveal overlay/state afterward. Normally 1600+450 ms; reduced motion caps each phase at 180 ms and uses a static glow/selection. |
| T07 | Reveal has completed | Check normal global 5/6/7+ wins. Resolve all cascades/room features/free floors first; check the paid-chain Scatter bonus only at terminal settlement. Revealed symbols may join identical current-room survivors, earn ordinary stage/room-multiplied awards, collect their tier and trigger further features. Foreign identities remain distinct. An unresolved question mark never pays, collects, counts as Scatter or acts as Wild. |
| T08 | Later refill/feature clear/free-floor deal produces Mystery | Run a new wave using that floor's current room and an independent equal-chance shared choice. This does not add a wager/spin or reset the paid-chain Scatter guard. Resolve before any collection/space-limit decision. |
| T09 | Startup preview | `createPreviewBoard` immediately displays a fixed dispersed regular-only board with at most two of any identity. No wins, Scatter/Mystery, board RNG, growth, pause, selector, awards or collection. Wait in ready for the first tap/Enter/Space; that action generates fresh paid results. |
| T10 | Statistics/historical replay | Raw draws are independent; outcomes of Mysteries in one wave are correlated by their shared choice. Current RTP evidence is in [15](15-current-balance.md). JS and native/C# models perform the same reveal before Scatter/win evaluation, with no current preview board RNG. Native configs include Mystery=10 and StaticPreview=true; absent StaticPreview retains archived random-preview RNG. Four-weight explicit configs omit Mystery for historical reproduction; small historical JS studies can use --mystery=off alongside their original flags and --preview=random when retaining current Scatter flags. v8 --keep-scatters=off already selects its historical random preview. |
| T11 | Gameplay board contains unresolved Mysteries after landing | Enter `mystery-waiting` for 500 ms after the full deal/refill animation. Show all raw cells at full size and keep question marks visible/pink; no picker overlay or win/removal yet. Discard taps/keys during the wait; no extra wager or queued spin. Keep 500 ms under reduced motion. Then T04–T07. Applies to paid/free-floor deals, ordinary refills and room-feature refills; no delay without Mystery or on startup preview. |

## Raw draw distribution

Reserve 10 percentage points from the previous regular pool, keeping its tier proportions: current regular pool totals87%. The prior v10 proportional allocation is historical. The table shows raw landing probabilities, before the correlated shared transformation.

| Kind | Raw chance |
| --- | --- |
| Mystery | 10% |
| Low | 35% |
| Mid | 32.5% |
| High | 19.5% |
| Scatter | 3% |

Regular icons still use uniform indexes globally or fixed current-room indexes after collection. The three Mystery reveal choices each remain 1/3, including already-collected tiers. Shared choice means a group of three Mysteries becomes three identical Low OR three identical Mid OR three identical High; there is no per-cell split or quota.

## Verification

Current Playwright desktop/mobile checks verify the committed 500ms hold after landing, shared reveal, ignored busy inputs and reduced-motion timing using virtual time. The older v12 manual measurements described a 2000ms implementation; they are historical and do not describe the current source. See [testing plan](../TESTING.md) for named scenarios, screenshots and coverage.

43 rule/statistics tests pass, including exact Mystery boundaries and RNG counts, all rooms and reveal thirds, one shared symbol for 25 Mysteries, unchanged survivors/holes, immutability, normal payout/collection and no Wild matching. The updated native model matches 30,000 full production-helper chains; legacy replay matches 3,000 chains and independent C# replay matches 3,000, with checkpoint continuity. These checks do not calibrate RTP.

Prior v10 isolated headless Chrome checks verified Low/Mid/High shared outcomes, room indexes Hall1/Attic4, 390×844 / 1280×800 / 375×667 layouts, ignored busy clicks, no preview award, no page errors and actual selection-to-ready durations around 2.08 seconds. Mobile screenshots confirmed pink question marks, the floor-specific selector and resolved icons. No user's browser tab was used.
