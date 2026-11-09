# Xmas Madness

Xmas Madness is a Christmas card race for a shared screen. One host operates the browser, and four racers advance as cards are revealed. Guests use the displayed odds for their own table bets and settle any chip or beverage wagers at the table.

## Run locally

Use Node.js 24 and npm. Run these commands from the `xmas-madness` directory.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Run the following commands to check and serve a production build.

```sh
npm test
npm run build
npm run serve -- -a 127.0.0.1
```

`npm test` runs the race and timer tests. `npm run build` type-checks the source and writes the site to `dist/`. `npm run serve` serves that directory on port 1234. The address flag keeps the server on this computer. Open [http://127.0.0.1:1234/](http://127.0.0.1:1234/) in the host browser.

## Test and regenerate coverage

```sh
npx playwright install chromium --only-shell
npm run test:browser
npm run test:coverage
```

The browser suite runs against the production build on loopback port 4173. It uses a seeded deal and a controlled clock. `npm run test:coverage` runs the unit and browser suites and writes [TEST-COVERAGE.html](TEST-COVERAGE.html), a single matrix linking each requirement to its test cases and their latest results.

The checked-in screenshot baselines were captured with Playwright Chromium on Windows. On another platform, review and generate that platform's snapshots with `npm run test:browser -- --grep "^V" --update-snapshots` before running the full matrix. Use the same command to deliberately refresh snapshots after reviewing a visual change.

## Host a race

1. Choose a local photo for any suit. Empty slots use a reindeer, snowman, elf, or polar bear. Use **Clear photo** to restore that suit's creature.
2. Select **Deal track**. The screen shows seven face-up track cards and each suit's odds. Give guests time to place their bets. **Back to racer setup** lets you change portraits before dealing again.
3. Select **Start race** when the table is ready. The first card appears after 10 seconds, and each reveal starts the next 10-second countdown.
4. When a racer crosses the finish, the winner and final board stay on screen while guests settle their bets.
5. Select **New race** to return to setup with the same photos. **Deal track** creates a fresh deal. Reloading the page clears the photos and the current race.

Use **Tab** to reach the controls and **Enter** or **Space** to activate a focused button. On a narrow screen, scroll within the track to see later links. The game follows the browser's reduced-motion preference and provides text updates for draws and the winner.

## Race rules

The four aces represent the racers. The host's deal uses seven of the remaining 48 cards for the track and leaves 41 in the draw pile. The game rejects a deal if five or more track cards share a suit.

| Track cards of a suit | Profit odds |
| --- | --- |
| 0 | 1:1 |
| 1 | 2:1 |
| 2 | 3:1 |
| 3 | 5:1 |
| 4 | 10:1 |

The odds express profit relative to the stake. For example, a winning stake of two chips at 2:1 earns four chips of profit and returns the two-chip stake. The table handles that settlement.

Each draw moves only the matching suit one space. Position zero is Start, positions one through seven are the links, and position eight is Finish. The first racer to reach Finish wins. If the browser delays a reveal, the game draws one card and starts a fresh countdown so the table can see the result.

The browser keeps photos and race state in the open page. Longer tracks, hidden links with setbacks, and jokers are deferred variants. See the [development plan](DEVELOPMENT_PLAN.md) for the rules contract and verification record.
