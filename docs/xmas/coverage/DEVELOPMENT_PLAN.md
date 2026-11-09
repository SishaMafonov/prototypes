# Xmas Madness — Development Plan

All eight stages are complete. See the [README](README.md) for setup and host instructions.

## Stage checklist and quick navigation

Check a stage when its completion criteria pass. Record validation and any remaining limitations in the stage's completion notes.

- [x] [Stage 1 — Agree on the rules and browser adaptation](#stage-1--agree-on-the-rules-and-browser-adaptation)
- [x] [Stage 2 — Build deck, setup, and odds rules](#stage-2--build-deck-setup-and-odds-rules)
- [x] [Stage 3 — Build the race engine](#stage-3--build-the-race-engine)
- [x] [Stage 4 — Build racer photo setup](#stage-4--build-racer-photo-setup)
- [x] [Stage 5 — Build the responsive game table](#stage-5--build-the-responsive-game-table)
- [x] [Stage 6 — Connect the automatic race](#stage-6--connect-the-automatic-race)
- [x] [Stage 7 — Add Christmas presentation and accessible feedback](#stage-7--add-christmas-presentation-and-accessible-feedback)
- [x] [Stage 8 — Verify the game and document the handoff](#stage-8--verify-the-game-and-document-the-handoff)

## Rules analysis

Source: [wikiHow — How to Play Horse Race Card Game](https://www.wikihow.com/Horse-Race-Card-Game), inspected November 8, 2026; article updated September 1, 2026. The browser reader was used because the web reader could not access the page.

### Default game described by the article

- The physical game is for at least three people, including a non-betting announcer.
- Four aces represent the racers. Shuffle the other 48 cards; deal seven face-up track cards in an L-shaped layout, leaving 41 draw cards. Redeal if any suit appears at least five times in the track row.
- Track-card suit counts determine payout odds:

  | Track cards of a suit | Profit odds |
  | --- | --- |
  | 0 | 1:1 |
  | 1 | 2:1 |
  | 2 | 3:1 |
  | 3 | 5:1 |
  | 4 | 10:1 |

- Bettors choose a suit before the announcer draws. Each drawn suit advances its ace one space. Moving beyond the final track card wins: position eight with seven links.
- A winning bet returns its stake plus the stated profit; losing stakes are lost. At 2:1, a stake of two returns six total.

### Variants, kept separate from the default

The article also describes longer tracks of eight or nine links, hidden links with setbacks, jokers that help trailing racers, and drinking wagers. Its community Q&A allows multiple bettors to choose the same racer.

The first release uses the standard seven-link race. Longer tracks, hidden links, and jokers are deferred. The party's beverage wagers are handled at the table under the browser rules contract below.

## Instructions for every implementation stage

When the user explicitly authorizes a stage:

1. Read this plan, applicable `AGENTS.md` instructions, the current project files, and completion notes. Check prerequisites. Ask about unresolved choices only when they block the authorized stage.
2. Work only inside `xmas-madness`. Preserve its independent npm, TypeScript 7+, and Vite setup. Use focused edits and `apply_patch`; do not edit generated output or dependencies by hand.
3. Complete only the authorized stage. This plan does not authorize later stages, deferred variants, or changes to other prototypes, including `races-of-aces`.
4. Keep rules independent of rendering and animation. Suggested boundaries are `src/game.ts` for pure rules, `src/main.ts` for browser orchestration, and `src/style.css` for layout. Add modules only where they simplify the prototype.
5. Run validation appropriate to that stage, including `npm run build` after source changes. Use deterministic rule tests for consequential game logic and browser smoke checks for interaction changes. Avoid tests that only restate markup or styling.
6. Update the stage's completion notes with changes, checks, results, and open issues. Mark its checklist item complete only when all criteria pass. Report the outcome and stop before the next stage.

## Stage 1 — Agree on the rules and browser adaptation

**Depends on:** explicit user instruction to begin this stage.

**LLM instructions** Use the browser rules contract below as the reference for Stages 2–8. Keep the standard race mechanics and the party's table rules separate in the implementation and README.

### Browser rules contract

- **Host and audience.** One host operates the browser on a shared big screen. Guests place their bets at the physical table. The app needs no bettor roster and accepts any number of spectators.
- **Table bets.** Guests use symbolic chips and handle beverage conversion at the table. The screen shows each racer's source odds for reference and announces the winning racer. Guests or the host resolve the physical bets. The app's state contains the race and racer photos, with no chip balances, stake entry, payout calculation, or beverage quantities.
- **Racers.** Give the host four photo slots, one per suit, before dealing. Each slot can use a player-selected avatar or a distinct Christmas creature. Read images from local files in the browser and retain them in memory. Keep the suit label visible alongside each image. Use a playful Christmas race presentation and an exaggerated winner reveal to make the gambling parody clear.
- **Race.** Deal seven face-up links and show the source odds before the host starts. All racers start at `0`, link columns occupy `1–7`, and the finish is `8`. **Start race** begins automatic draws at 10-second intervals. A draw advances only the matching suit. Declare the winner as soon as its racer reaches `8` and stop drawing.
- **Session.** One race ends with one winning racer. Each new race uses a fresh deal. The browser tracks the current race only, with no scores carried across races or saved to disk.

The first draw is scheduled 10 seconds after **Start race**. If the browser delays a timer, reveal one card and wait another 10 seconds before the next draw so guests can see every result. A **New race** action returns to photo setup with the current photos prefilled. Refreshing the page clears them. Keep these defaults in the implementation unless the user revises them.

| Phase | What the host sees and can do | Transition |
| --- | --- | --- |
| Photo setup | Choose, replace, or remove an image for each suit. Preview all four racers. Select **Deal track** when ready. | Deal an accepted track and enter table betting. |
| Table betting | Show the face-up links, racer identities, and odds. The host waits for the table, then selects **Start race**. | Lock the setup and schedule the first draw. |
| Racing | Show the countdown, last revealed card, and positions. The browser draws automatically. | Stop the timer and enter results when a racer crosses the finish. |
| Results | Hold the final board and winning racer on screen for the table to settle. | **New race** returns to photo setup. |

**Walkthrough.** The host chooses two photos and leaves the other two slots on their Christmas creatures. After dealing the track, the host gives guests time to place their chip bets at the table. The host starts the race, and each reveal advances one racer. Hearts reaches position eight, so the screen announces the Hearts racer and stops. The table resolves the bets, and the host can prepare a fresh race.

**Completion criteria:**

- [x] The standard rules, host role, and off-screen chip handling are defined.
- [x] Included features and deferred variants are explicit.
- [x] The phase table and walkthrough cover photo setup, table bets, automatic draws, a winner, and a new race.
- [x] User decisions are recorded and Stage 2 can use the standard deck and setup rules.

**Completion notes** Recorded the host-led big-screen format, table betting with beverage conversion, automatic draws every 10 seconds, credit-free sessions, and local racer photos with Christmas fallbacks. The first draw delay and photo retention within the open page are implementation defaults.

## Stage 2 — Build deck, setup, and odds rules

**Depends on:** Stage 1.

**LLM instructions:** Implement typed suits and uniquely identified cards; generate a standard 52-card deck, separate its four aces, and shuffle the remaining cards. Allow injected randomness or an ordered-deck fixture for reproducible tests. Deal seven links and retain the remaining draw order. If the row has five or more of one suit, return all 48 non-aces to the candidate deck before reshuffling and redealing. Provide a controlled failure for a nonproductive test RNG rather than hanging. Calculate profit multipliers from the displayed link counts and initialize all racers at zero. Do not add UI or variants.

**Completion criteria:**

- [x] Accepted setup contains four aces, seven links, and 41 draw cards, with no duplicated or missing cards.
- [x] Rejected deals lose no cards and produce no odds for invalid counts.
- [x] Every odds-table entry is tested, including suits absent from the row.
- [x] Deterministic tests cover accepted and rejected layouts. Type checking and the build pass.

**Completion notes** `src/game.ts` exports `createRaceSetup` with injectable randomness. It preserves the draw order, starts every racer at zero, and retries invalid rows with all 48 non-aces. The deal fails explicitly after 100 rejected attempts. All five tests pass with `npm test` on Node 24, and `npm run build` passes.

## Stage 3 — Build the race engine

**Depends on:** Stage 2.

**LLM instructions:** Implement pure state transitions for a single draw: consume the next stock card, record it in race history, advance only its suit by one, and declare that suit the winner immediately at position eight. Preserve the input state when returning a new state. Reject draws outside the racing phase and after a winner exists. Keep displayed animation state separate. Treat an exhausted stock without a winner as an explicit invalid-state error; do not invent a reshuffle rule. Valid standard deals must finish before stock exhaustion.

**Completion criteria:**

- [x] Scripted draws move only the matching racer and consume cards once.
- [x] Position eight ends the race immediately, including after all four racers reach seven.
- [x] A finished race rejects further draws and preserves its winner.
- [x] Tests cover start, movement, finish, invalid actions, and stock protection. The build passes.

**Completion notes** `src/game.ts` exports `prepareRace`, `startRace`, and `drawCard` as pure transitions. Each draw records the card, advances one racer, and returns the new state. The eighth move for a suit enters results and records its winner. A draw outside active racing or with an empty stock raises an error. All nine tests pass with `npm test`, and `npm run build` passes.

## Stage 4 — Build racer photo setup

**Depends on:** Stages 1–3.

**LLM instructions** Give the host a local image picker and preview for each of the four suits. Decode images in the browser and show a clear error for files that cannot be read as images. Keep the current preview if a replacement fails. Support replacing and clearing images, using a Christmas creature whenever a slot is empty. Keep photo state scoped to the open page. Release object URLs when replaced or cleared if that is how previews are implemented. Use four distinct placeholder creatures until Stage 7 applies the final theme.

**Completion criteria:**

- [x] Each slot independently supports choosing, replacing, and clearing a photo.
- [x] All four racers support fallback creatures, photos, or a mix of both.
- [x] Invalid images leave the current racer usable and show an actionable message.
- [x] Photos remain local and disappear on refresh. Browser smoke checks and build pass.

**Completion notes** The setup screen has a labeled photo picker for each suit and four placeholder creatures: reindeer, snowman, elf, and polar bear. Photos are decoded in the browser and kept in the open page. Replacing or clearing a photo releases its object URL. The built app passed browser checks for all four slots, a mix of photos and fallbacks, replacement, invalid-file feedback, clearing, and refresh. All nine rules tests and the build passed.

## Stage 5 — Build the responsive game table

**Depends on:** Stages 1–4.

**LLM instructions** Build a spectator view for a shared big screen. Show four lanes with suit labels and racer images, start and finish, seven face-up links, table odds, last drawn card, next-draw countdown, and a result area. Keep key information readable from across a room. Use lightweight browser rendering and build the view from game state. If the board uses canvas, keep host controls and status available in semantic HTML. Allow the host to operate the layout at smaller widths.

**Completion criteria:**

- [x] Start, link seven, and finish are visually distinct and match engine coordinates.
- [x] Card suits, racer labels, and odds agree with the current state.
- [x] Photo controls and race actions are labeled and reachable by keyboard and touch.
- [x] Race state and winner are legible at a 16:9 presentation size, and host controls remain usable at a narrower width.
- [x] Browser smoke checks and build pass.

**Completion notes** **Deal track** opens the spectator board with the accepted deal, odds, and racer photos or fallbacks. **Back to racer setup** keeps the selected photos and allows changes before dealing again. The board renderer accepts race state and countdown values for Stage 6. Browser checks at 1280 × 720 and 390 × 844 covered odds, photo placement, keyboard navigation, and scrolling confined to the track on narrow screens. In-progress and finished engine states verified the countdown, last card, and winning marker. All nine rules tests and the build passed.

## Stage 6 — Connect the automatic race

**Depends on:** Stage 5.

**LLM instructions** Wire photo setup, track deal, table betting, automatic racing, results, and **New race**. Schedule one draw 10 seconds after the host starts and wait 10 seconds after each reveal before drawing again. Display the countdown using the same schedule. Start only one timer chain and cancel pending work on finish or when leaving the race. Ignore stale callbacks and repeated button activations. A delayed callback reveals one card. Preserve the result until the host selects **New race**. Return to photo setup with the same avatars and create a fresh accepted deal when requested.

**Completion criteria:**

- [x] The host can complete the flow from photo setup through a visible winner.
- [x] No cards are drawn before **Start race**. The first draw waits 10 seconds, and successive reveals keep the same cadence.
- [x] Repeated activation, delayed timer callbacks, and the winning draw produce no extra draws.
- [x] **New race** clears the board and keeps the current photos. The next **Deal track** produces a fresh deal.
- [x] Integration checks, browser smoke checks, and build pass.

**Completion notes** **Start race** begins a single countdown tied to the next draw. A late timer reveals one card and starts a new 10-second countdown. The winning draw holds the result until **New race**, which keeps the photos for the next deal. Browser smoke checks covered the first two reveals at normal speed and a full race with an accelerated clock, including repeated start, a stable winner, and reset with a retained avatar. All 12 tests and the build passed.

## Stage 7 — Add Christmas presentation and accessible feedback

**Depends on:** Stage 6 and the visual direction agreed in Stage 1.

**LLM instructions** Style the game as a playful Christmas race broadcast. Create distinct fallback creatures and keep suit labels readable with either photos or creatures. Add short card reveals, racer movement, and a celebratory winner treatment. Respect reduced-motion preferences and provide text feedback for the revealed card and the winner. Make the animations reflect outcomes already decided by the engine and keep them short enough to leave time to read each result.

**Completion criteria:**

- [x] Racers remain distinguishable without relying on color alone.
- [x] The winning avatar or creature and suit are identifiable from across the room.
- [x] Keyboard focus, readable contrast, status announcements, and reduced motion work.
- [x] Resizing preserves the race state, and returning to the tab shows the current board.
- [x] Presentation and smaller-screen smoke checks pass, and the build succeeds.

**Completion notes** Added North Pole Racing styling, four illustrated fallback creatures, short animations for each draw, and a winner panel with a portrait and suit. The live status reports the revealed card, movement, and winner. Browser smoke checks at 1280 × 720 and 390 × 844 covered keyboard focus, resizing the result, and rendering with the reduced-motion styles active. All 12 tests and the production build passed.

## Stage 8 — Verify the game and document the handoff

**Depends on:** Stage 7.

**LLM instructions** Review the implementation against the browser rules contract. Run the rule tests and production build. Play a complete race at the actual 10-second cadence in the built app and prepare a second race. Check photo selection and fallbacks, repeated input, exact finish, timer cleanup, and big-screen readability. Document the host flow, default race rules, table responsibility for bets and beverages, deferred variants, and local run commands in a project README. Record actual checks and limitations. Stop preview processes after checking unless the user requests a running preview.

**Completion criteria:**

- [x] Automated rule tests and `npm run build` pass.
- [x] Built-app smoke checks cover photo setup, the betting window, timed draws, the winner, and a fresh race.
- [x] Presentation size, smaller host viewport, keyboard, rapid input, and reduced motion checks are recorded.
- [x] README explains `npm run dev`, `npm run build`, and `npm run serve`.
- [x] Checklist and completion notes accurately describe the delivered scope and limitations.

**Completion notes** The README covers the run commands, host controls, odds, and table responsibilities. All 12 tests and the production build passed. A complete race in the built app ran at the normal 10-second cadence. Spades reached position eight on draw 21 and the result held through another draw interval. The next deal cleared the board state and kept the local photo. Browser checks covered the betting window, photo and fallback racers, repeated Enter during racing, keyboard reset, and a live resize from 1280 × 720 to 390 × 844 and back. The production stylesheet includes the reduced-motion rule exercised in Stage 7. The preview server was stopped.
