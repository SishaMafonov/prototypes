import "./style.css";

type RegularSymbol = "coin" | "diamond" | "gear" | "map" | "flag";
type SymbolKind = "scatter" | "wild" | "spentWild" | RegularSymbol;
type Cell = SymbolKind | null;
type Board = Cell[][];

interface Position { row: number; column: number; }
interface WinningMatch { cells: Position[]; length: 3 | 4 | 5; }
interface Statistics {
  spins: number;
  totalWin: number;
  wildReshuffles: number;
  bonusGames: number;
  hits3: number;
  hits4: number;
  hits5: number;
}

type Direction = "North" | "South" | "East" | "West";
type BonusModalMode = "intro" | "result" | null;

interface BonusState {
  actionPoints: number;
  actionsTaken: number;
  ship: Position;
  chests: Map<string, number>;
  multiplierPot: number;
  baseWin: number;
  lastDirection: Direction | null;
  trails: Array<{ from: Position; to: Position }>;
}

const ROWS = 5;
const COLUMNS = 5;
const regularSymbols: RegularSymbol[] = ["coin", "diamond", "gear", "map", "flag"];
const payouts = { 3: 0.1, 4: 0.5, 5: 1 } as const;

const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("The app container is missing.");

app.innerHTML = `
  <main class="game">
    <header class="game-header">
      <div><p class="eyebrow">Treasure of the high seas</p><h1>Royal Flush</h1></div>
      <div class="bet" aria-label="Current bet">BET <strong>1.00</strong></div>
    </header>
    <section class="stage-wrap" aria-label="Royal Flush game board">
      <div class="stage">
        <div id="grid" class="grid" role="button" tabindex="0" aria-label="Spin the Royal Flush reels" aria-disabled="false"></div>
        <section id="bonus-overlay" class="bonus-overlay" aria-label="Bonus voyage navigation map" hidden>
          <div id="bonus-map" class="bonus-map"></div>
          <div id="bonus-compass" class="bonus-compass" aria-live="assertive" hidden>
            <strong id="bonus-compass-choice">Choosing course…</strong>
          </div>
          <p id="bonus-counter" class="bonus-counter" aria-live="polite"></p>
          <p id="bonus-hud" class="bonus-hud" aria-live="polite"></p>
        </section>
        <p id="tap-prompt" class="tap-prompt is-ready" aria-live="polite">Tap the grid to start</p>
        <div id="win-popup" class="win-popup" role="status" aria-live="assertive" hidden></div>
      </div>
      <p id="status" class="status" aria-live="polite">Tap the grid to spin the reels.</p>
    </section>
    <section class="statistics" aria-labelledby="statistics-title">
      <h2 id="statistics-title">Session statistics</h2>
      <dl>
        <div><dt>Spins / rounds</dt><dd id="stat-spins">0</dd></div><div><dt>Total win</dt><dd id="stat-win">0.00</dd></div>
        <div><dt>Return to player</dt><dd id="stat-rtp">0.00%</dd></div><div><dt>Wild reshuffle hit</dt><dd id="stat-wild">0</dd></div>
        <div><dt>Bonus game hit</dt><dd id="stat-bonus">0</dd></div><div><dt>3 symbols hit</dt><dd id="stat-3">0</dd></div>
        <div><dt>4 symbols hit</dt><dd id="stat-4">0</dd></div><div><dt>5 symbols hit</dt><dd id="stat-5">0</dd></div>
      </dl>
    </section>
  </main>
  <div id="bonus-modal" class="bonus-modal" hidden>
    <section class="bonus-card" role="dialog" aria-modal="true" aria-labelledby="bonus-title">
      <p class="eyebrow">Scatter treasure found</p><h2 id="bonus-title">Bonus voyage unlocked</h2>
      <p id="bonus-copy"></p><button id="bonus-continue" type="button">Continue</button>
    </section>
  </div>
`;

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (found === null) throw new Error(`Missing element: ${selector}`);
  return found;
}

const gridElement = element<HTMLDivElement>("#grid");
const statusElement = element<HTMLParagraphElement>("#status");
const bonusModal = element<HTMLDivElement>("#bonus-modal");
const bonusTitle = element<HTMLHeadingElement>("#bonus-title");
const bonusCopy = element<HTMLParagraphElement>("#bonus-copy");
const continueButton = element<HTMLButtonElement>("#bonus-continue");
const bonusOverlay = element<HTMLElement>("#bonus-overlay");
const bonusMap = element<HTMLDivElement>("#bonus-map");
const bonusCompass = element<HTMLDivElement>("#bonus-compass");
const bonusCompassChoice = element<HTMLElement>("#bonus-compass-choice");
const bonusCounter = element<HTMLParagraphElement>("#bonus-counter");
const bonusHud = element<HTMLParagraphElement>("#bonus-hud");
const tapPrompt = element<HTMLParagraphElement>("#tap-prompt");
const winPopup = element<HTMLDivElement>("#win-popup");
const statisticElements = {
  spins: element<HTMLElement>("#stat-spins"), win: element<HTMLElement>("#stat-win"), rtp: element<HTMLElement>("#stat-rtp"),
  wild: element<HTMLElement>("#stat-wild"), bonus: element<HTMLElement>("#stat-bonus"), hits3: element<HTMLElement>("#stat-3"),
  hits4: element<HTMLElement>("#stat-4"), hits5: element<HTMLElement>("#stat-5"),
};

let board = createSafeBoard();
let busy = false;
let currentRoundWin = 0;
let bonusState: BonusState | null = null;
let bonusModalMode: BonusModalMode = null;
const statistics: Statistics = { spins: 0, totalWin: 0, wildReshuffles: 0, bonusGames: 0, hits3: 0, hits4: 0, hits5: 0 };

function randomSymbol(): SymbolKind {
  const roll = Math.floor(Math.random() * 10000);
  if (roll <= 449) return "scatter";
  if (roll <= 999) return "wild";
  if (roll <= 2999) return "coin";
  if (roll <= 4999) return "diamond";
  if (roll <= 6999) return "gear";
  if (roll <= 8999) return "map";
  return "flag";
}

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => randomSymbol()));
}

function createSafeBoard(): Board {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const candidate = createBoard();
    if (findWinningMatches(candidate).length === 0) return candidate;
  }
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => regularSymbols[(row + column) % regularSymbols.length]),
  );
}

function key(position: Position): string { return `${position.row}-${position.column}`; }
function isMatchFor(symbol: Cell, target: RegularSymbol): boolean { return symbol === target || symbol === "spentWild"; }

function findWinningMatches(currentBoard: Board): WinningMatch[] {
  const matches: WinningMatch[] = [];
  const inspectLine = (positions: Position[]): void => {
    for (const target of regularSymbols) {
      let start = 0;
      while (start < positions.length) {
        while (start < positions.length && !isMatchFor(currentBoard[positions[start].row][positions[start].column], target)) start += 1;
        const runStart = start;
        let containsTarget = false;
        while (start < positions.length && isMatchFor(currentBoard[positions[start].row][positions[start].column], target)) {
          containsTarget ||= currentBoard[positions[start].row][positions[start].column] === target;
          start += 1;
        }
        const length = start - runStart;
        if (containsTarget && length >= 3) matches.push({ cells: positions.slice(runStart, start), length: Math.min(length, 5) as 3 | 4 | 5 });
      }
    }
  };
  for (let row = 0; row < ROWS; row += 1) inspectLine(Array.from({ length: COLUMNS }, (_, column) => ({ row, column })));
  for (let column = 0; column < COLUMNS; column += 1) inspectLine(Array.from({ length: ROWS }, (_, row) => ({ row, column })));
  return matches;
}

function symbolLabel(symbol: SymbolKind): string {
  return { scatter: "Scatter", wild: "Wild", spentWild: "Wild collected", coin: "Gold coin", diamond: "Diamond", gear: "Gear", map: "Treasure map", flag: "Pirate flag" }[symbol];
}

function createCell(symbol: SymbolKind, row: number, column: number, animation = ""): HTMLDivElement {
  const cell = document.createElement("div");
  cell.classList.add("cell", `symbol-${symbol}`);
  if (animation !== "") cell.classList.add(animation);
  if (symbol === "scatter") cell.classList.add("scatter-glow");
  if (symbol === "wild") cell.classList.add("wild-glow");
  cell.dataset.row = String(row);
  cell.dataset.column = String(column);
  cell.style.gridRow = String(row + 1);
  cell.style.gridColumn = String(column + 1);
  cell.setAttribute("aria-label", symbolLabel(symbol));
  if (symbol === "spentWild") cell.innerHTML = "<span>W</span>";
  return cell;
}

function cellAt(row: number, column: number): HTMLDivElement | null {
  return gridElement.querySelector<HTMLDivElement>(`.cell[data-row="${row}"][data-column="${column}"]`);
}

function render(marked = new Set<string>(), animation = ""): void {
  const tiles = document.createDocumentFragment();
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const symbol = board[row][column];
      if (symbol !== null) tiles.append(createCell(symbol, row, column, marked.has(`${row}-${column}`) ? animation : ""));
    }
  }
  gridElement.replaceChildren(tiles);
}

function updateStatistics(): void {
  const rtp = statistics.spins === 0 ? 0 : (statistics.totalWin / statistics.spins) * 100;
  statisticElements.spins.textContent = String(statistics.spins); statisticElements.win.textContent = statistics.totalWin.toFixed(2);
  statisticElements.rtp.textContent = `${rtp.toFixed(2)}%`; statisticElements.wild.textContent = String(statistics.wildReshuffles);
  statisticElements.bonus.textContent = String(statistics.bonusGames); statisticElements.hits3.textContent = String(statistics.hits3);
  statisticElements.hits4.textContent = String(statistics.hits4); statisticElements.hits5.textContent = String(statistics.hits5);
}

function wait(milliseconds: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)); }
function setRoundReady(ready: boolean): void {
  gridElement.setAttribute("aria-disabled", String(!ready));
  tapPrompt.classList.toggle("is-ready", ready);
  tapPrompt.classList.toggle("is-busy", !ready);
}
async function showWinPopup(totalWin: number): Promise<void> {
  winPopup.textContent = `WIN ${totalWin.toFixed(2)}`;
  winPopup.hidden = false;
  await wait(2_000);
  winPopup.hidden = true;
}
function allPositions(): Set<string> { return new Set(Array.from({ length: ROWS * COLUMNS }, (_, index) => `${Math.floor(index / COLUMNS)}-${index % COLUMNS}`)); }
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

async function collapseAndRefill(destroyed: Set<string>): Promise<void> {
  for (const id of destroyed) {
    const [row, column] = id.split("-").map(Number);
    board[row][column] = null;
    cellAt(row, column)?.remove();
  }
  await wait(120);

  const nextBoard: Board = Array.from({ length: ROWS }, () => Array<Cell>(COLUMNS).fill(null));
  const moves: Array<{ cell: HTMLDivElement; row: number; column: number }> = [];
  for (let column = 0; column < COLUMNS; column += 1) {
    let targetRow = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      const symbol = board[row][column];
      if (symbol === null) continue;
      nextBoard[targetRow][column] = symbol;
      if (targetRow !== row) {
        const cell = cellAt(row, column);
        if (cell !== null) moves.push({ cell, row: targetRow, column });
      }
      targetRow -= 1;
    }
  }
  board = nextBoard;

  const oldPositions = moves.map(({ cell }) => ({ cell, rectangle: cell.getBoundingClientRect() }));
  for (const move of moves) {
    move.cell.classList.remove("spawn", "fall");
    move.cell.style.gridRow = String(move.row + 1);
    move.cell.style.gridColumn = String(move.column + 1);
    move.cell.dataset.row = String(move.row);
    move.cell.dataset.column = String(move.column);
  }
  for (const { cell, rectangle } of oldPositions) {
    const nextRectangle = cell.getBoundingClientRect();
    cell.style.transition = "none";
    cell.style.transform = `translate(${rectangle.left - nextRectangle.left}px, ${rectangle.top - nextRectangle.top}px)`;
  }
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  for (const { cell } of oldPositions) {
    cell.style.transition = "transform 430ms cubic-bezier(0.2, 0.8, 0.35, 1)";
    cell.style.transform = "translate(0, 0)";
  }
  await wait(430);
  for (const { cell } of oldPositions) cell.style.transition = "";

  for (let row = 0; row < ROWS; row += 1) for (let column = 0; column < COLUMNS; column += 1) {
    if (board[row][column] === null) {
      const symbol = randomSymbol();
      board[row][column] = symbol;
      const tile = createCell(symbol, row, column, "land");
      tile.style.setProperty("--land-distance", String(row + 1));
      gridElement.append(tile);
    }
  }
  await wait(650);
}

async function collectWins(): Promise<void> {
  while (true) {
    const matches = findWinningMatches(board);
    if (matches.length === 0) return;
    const destroyed = new Set<string>(); let roundWin = 0;
    for (const match of matches) {
      roundWin += payouts[match.length];
      if (match.length === 3) statistics.hits3 += 1;
      if (match.length === 4) statistics.hits4 += 1;
      if (match.length === 5) statistics.hits5 += 1;
      for (const position of match.cells) destroyed.add(key(position));
    }
    currentRoundWin += roundWin;
    statistics.totalWin += roundWin; updateStatistics();
    statusElement.textContent = `KABOOM! ${matches.length} winning ${matches.length === 1 ? "line" : "lines"} collect ${roundWin.toFixed(2)}.`;
    for (const id of destroyed) {
      const [row, column] = id.split("-").map(Number);
      cellAt(row, column)?.classList.add("kaboom");
    }
    await wait(720); await collapseAndRefill(destroyed);
  }
}

function firstWild(): Position | null {
  for (let row = 0; row < ROWS; row += 1) for (let column = 0; column < COLUMNS; column += 1) if (board[row][column] === "wild") return { row, column };
  return null;
}

function animateWildSuction(position: Position): void {
  gridElement.querySelectorAll<HTMLDivElement>(".cell:not(.empty)").forEach((cell) => {
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    if (row === position.row && column === position.column) {
      cell.classList.add("wild-whirl");
      return;
    }

    cell.style.setProperty("--suck-x", `${(position.column - column) * 100}%`);
    cell.style.setProperty("--suck-y", `${(position.row - row) * 100}%`);
    cell.classList.add("wild-suck");
  });
}

async function activateWild(position: Position): Promise<void> {
  statistics.wildReshuffles += 1; updateStatistics();
  statusElement.textContent = "The Wild pulls every symbol into the maelstrom...";
  animateWildSuction(position); await wait(950);

  const reshuffled: SymbolKind[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (row === position.row && column === position.column) continue;
      const symbol = board[row][column];
      if (symbol !== null) reshuffled.push(symbol);
      board[row][column] = null;
      cellAt(row, column)?.remove();
    }
  }

  const shuffled = shuffle(reshuffled);
  statusElement.textContent = "Wild reshuffle! The tide bursts outward from the maelstrom.";
  let nextSymbol = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (row === position.row && column === position.column) continue;
      const symbol = shuffled[nextSymbol];
      nextSymbol += 1;
      board[row][column] = symbol;
      const tile = createCell(symbol, row, column, "wild-throw");
      tile.style.setProperty("--throw-x", `${(position.column - column) * 100}%`);
      tile.style.setProperty("--throw-y", `${(position.row - row) * 100}%`);
      gridElement.append(tile);
      await wait(90);
    }
  }
  board[position.row][position.column] = "spentWild";
  const transformedWild = createCell("spentWild", position.row, position.column, "wild-reveal");
  cellAt(position.row, position.column)?.replaceWith(transformedWild);
  await wait(250);
}

function bonusActionPoints(): number {
  const scatters = board.flat().filter((symbol) => symbol === "scatter").length;
  if (scatters >= 5) return 20; if (scatters === 4) return 15; if (scatters === 3) return 10; return 0;
}

function scatterPayout(): number {
  const scatters = board.flat().filter((symbol) => symbol === "scatter").length;
  if (scatters >= 5) return 10;
  if (scatters === 4) return 3;
  if (scatters === 3) return 1;
  return 0;
}

function showBonus(actionPoints: number): void {
  statistics.bonusGames += 1; updateStatistics();
  bonusState = createBonusState(actionPoints);
  bonusModalMode = "intro";
  bonusTitle.textContent = "Bonus voyage unlocked";
  bonusCopy.textContent = `You earned ${actionPoints} action points. Set sail to reveal the treasure map.`;
  continueButton.textContent = "Continue to bonus round";
  bonusModal.hidden = false;
}

function bonusKey(position: Position): string { return `${position.row}-${position.column}`; }

function generateBonusChests(): Map<string, number> {
  const positions = shuffle(
    Array.from({ length: ROWS * COLUMNS }, (_, index) => ({ row: Math.floor(index / COLUMNS), column: index % COLUMNS })),
  );
  const chestCount = 5 + Math.floor(Math.random() * 11);
  const prizes = [2, 2, 2, 2, 5, 5, 5, 8, 8, 10];
  const chests = new Map<string, number>();
  for (const position of positions.slice(0, chestCount)) {
    chests.set(bonusKey(position), prizes[Math.floor(Math.random() * prizes.length)]);
  }
  return chests;
}

function createBonusState(actionPoints: number): BonusState {
  return {
    actionPoints,
    actionsTaken: 0,
    ship: { row: 2, column: 2 },
    chests: generateBonusChests(),
    multiplierPot: 0,
    baseWin: currentRoundWin,
    lastDirection: null,
    trails: [],
  };
}

function drawBonusTrail(from: Position, to: Position, animate = false): void {
  const fromSector = bonusMap.querySelector<HTMLElement>(`.bonus-sector[data-row="${from.row}"][data-column="${from.column}"]`);
  const toSector = bonusMap.querySelector<HTMLElement>(`.bonus-sector[data-row="${to.row}"][data-column="${to.column}"]`);
  if (fromSector === null || toSector === null) return;
  const mapBounds = bonusMap.getBoundingClientRect();
  const fromBounds = fromSector.getBoundingClientRect();
  const toBounds = toSector.getBoundingClientRect();
  const startX = fromBounds.left + fromBounds.width / 2 - mapBounds.left;
  const startY = fromBounds.top + fromBounds.height / 2 - mapBounds.top;
  const endX = toBounds.left + toBounds.width / 2 - mapBounds.left;
  const endY = toBounds.top + toBounds.height / 2 - mapBounds.top;
  const distance = Math.hypot(endX - startX, endY - startY);
  const trail = document.createElement("span");
  trail.className = `bonus-trail${animate ? " trail-draw" : ""}`;
  trail.style.left = `${startX}px`;
  trail.style.top = `${startY}px`;
  trail.style.width = `${distance}px`;
  trail.style.setProperty("--trail-angle", `${Math.atan2(endY - startY, endX - startX)}rad`);
  bonusMap.append(trail);
}

function renderBonusMap(chestAnimation = ""): void {
  if (bonusState === null) return;
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const sector = document.createElement("div");
      const position = { row, column };
      const chestMultiplier = bonusState.chests.get(bonusKey(position));
      sector.className = "bonus-sector";
      sector.dataset.row = String(row);
      sector.dataset.column = String(column);
      sector.setAttribute("aria-label", `${String.fromCharCode(65 + column)}${row + 1}`);
      if (chestMultiplier !== undefined) {
        const chest = document.createElement("span");
        chest.className = "bonus-chest";
        if (chestAnimation !== "") chest.classList.add(chestAnimation);
        chest.setAttribute("aria-label", "Hidden treasure chest");
        sector.append(chest);
      }
      if (bonusState.ship.row === row && bonusState.ship.column === column) {
        sector.classList.add("has-ship");
        const ship = document.createElement("span");
        ship.className = "bonus-ship";
        ship.textContent = "";
        ship.setAttribute("aria-label", "Player ship");
        sector.append(ship);
      }
      fragment.append(sector);
    }
  }
  bonusMap.replaceChildren(fragment);
  for (const trail of bonusState.trails) drawBonusTrail(trail.from, trail.to);
  const direction = bonusState.lastDirection === null ? "Awaiting compass" : bonusState.lastDirection;
  const remaining = bonusState.actionPoints - bonusState.actionsTaken;
  bonusCounter.textContent = `FREE SPINS ${remaining} / ${bonusState.actionPoints}`;
  bonusHud.textContent = `${direction} · Multiplier pot x${bonusState.multiplierPot}`;
}

async function animateBonusShipMove(from: Position, to: Position): Promise<void> {
  const fromSector = bonusMap.querySelector<HTMLElement>(`.bonus-sector[data-row="${from.row}"][data-column="${from.column}"]`);
  const toSector = bonusMap.querySelector<HTMLElement>(`.bonus-sector[data-row="${to.row}"][data-column="${to.column}"]`);
  if (fromSector === null || toSector === null) {
    await wait(1_000);
    return;
  }
  const ship = fromSector.querySelector<HTMLElement>(".bonus-ship");
  if (ship === null) {
    await wait(1_000);
    return;
  }
  const shipBounds = ship.getBoundingClientRect();
  const targetBounds = toSector.getBoundingClientRect();
  ship.style.setProperty("--sail-x", `${targetBounds.left + targetBounds.width / 2 - (shipBounds.left + shipBounds.width / 2)}px`);
  ship.style.setProperty("--sail-y", `${targetBounds.top + targetBounds.height / 2 - (shipBounds.top + shipBounds.height / 2)}px`);
  drawBonusTrail(from, to, true);
  ship.classList.add("is-sailing");
  await wait(1_000);
}

async function transitionBonusChests(): Promise<void> {
  bonusOverlay.querySelectorAll<HTMLElement>(".bonus-chest").forEach((chest) => chest.classList.add("chest-sink"));
  await wait(850);
  if (bonusState === null) return;
  bonusState.chests = generateBonusChests();
  renderBonusMap("chest-rise");
  bonusHud.textContent = `New treasure rises from the water… · Multiplier pot x${bonusState.multiplierPot}`;
  await wait(950);
}

function showChestPrize(position: Position, multiplier: number): void {
  const sector = bonusMap.querySelector<HTMLDivElement>(`.bonus-sector[data-row="${position.row}"][data-column="${position.column}"]`);
  if (sector === null) return;
  const prize = document.createElement("span");
  prize.className = "bonus-prize-reveal";
  prize.textContent = `x${multiplier}`;
  sector.append(prize);
}

async function showBonusCompass(direction: Direction): Promise<void> {
  bonusCompass.hidden = false;
  delete bonusCompass.dataset.direction;
  bonusCompass.classList.remove("is-pointing");
  bonusCompass.classList.add("is-spinning");
  bonusCompassChoice.textContent = "Choosing course…";
  await wait(2_000);
  bonusCompass.classList.remove("is-spinning");
  bonusCompass.classList.add("is-pointing");
  bonusCompass.dataset.direction = direction;
  bonusCompassChoice.textContent = direction;
  await wait(1_650);
}

function chooseBonusDirection(ship: Position): Direction {
  const candidates: Array<{ direction: Direction; row: number; column: number }> = [
    { direction: "North", row: ship.row - 1, column: ship.column },
    { direction: "South", row: ship.row + 1, column: ship.column },
    { direction: "West", row: ship.row, column: ship.column - 1 },
    { direction: "East", row: ship.row, column: ship.column + 1 },
  ];
  const directions = candidates.filter(({ row, column }) => row >= 0 && row < ROWS && column >= 0 && column < COLUMNS);
  return directions[Math.floor(Math.random() * directions.length)].direction;
}

async function takeBonusAction(): Promise<void> {
  if (bonusState === null) return;
  await transitionBonusChests();
  if (bonusState === null) return;
  const direction = chooseBonusDirection(bonusState.ship);
  bonusState.lastDirection = null;
  renderBonusMap();
  bonusHud.textContent = `Compass is choosing a course… · Multiplier pot x${bonusState.multiplierPot}`;
  await showBonusCompass(direction);
  const movement: Record<Direction, Position> = {
    North: { row: -1, column: 0 }, South: { row: 1, column: 0 }, West: { row: 0, column: -1 }, East: { row: 0, column: 1 },
  };
  const delta = movement[direction];
  const previousShip = bonusState.ship;
  const nextShip = { row: previousShip.row + delta.row, column: previousShip.column + delta.column };
  await animateBonusShipMove(previousShip, nextShip);
  bonusState.trails.push({ from: previousShip, to: nextShip });
  bonusState.ship = nextShip;
  bonusState.lastDirection = direction;
  bonusState.actionsTaken += 1;
  bonusCompass.hidden = true;
  renderBonusMap();
  await wait(1_000);

  const chestKey = bonusKey(bonusState.ship);
  const multiplier = bonusState.chests.get(chestKey);
  if (multiplier !== undefined) {
    bonusState.chests.delete(chestKey);
    bonusState.multiplierPot += multiplier;
    renderBonusMap();
    showChestPrize(bonusState.ship, multiplier);
    bonusHud.textContent = `${direction} · Treasure found: x${multiplier}! Pot x${bonusState.multiplierPot}`;
    await wait(2_000);
  }
}

async function startBonusRound(): Promise<void> {
  if (bonusState === null) return;
  bonusOverlay.hidden = false;
  renderBonusMap();
  statusElement.textContent = `Bonus voyage started with ${bonusState.actionPoints} action points.`;
  await wait(2_100);
  while (bonusState !== null && bonusState.actionsTaken < bonusState.actionPoints) await takeBonusAction();
  if (bonusState === null) return;

  const bonusWin = bonusState.baseWin * bonusState.multiplierPot;
  statistics.totalWin += bonusWin;
  updateStatistics();
  bonusModalMode = "result";
  bonusTitle.textContent = "Bonus voyage complete";
  bonusCopy.textContent = `Multiplier pot x${bonusState.multiplierPot}. ${bonusState.baseWin.toFixed(2)} × x${bonusState.multiplierPot} = ${bonusWin.toFixed(2)} bonus win. Total round win: ${(bonusState.baseWin + bonusWin).toFixed(2)}.`;
  continueButton.textContent = "Continue";
  bonusModal.hidden = false;
}

async function resolveRound(): Promise<void> {
  while (true) { await collectWins(); const wild = firstWild(); if (wild === null) break; await activateWild(wild); }
  const scatterWin = scatterPayout();
  if (scatterWin > 0) {
    currentRoundWin += scatterWin;
    statistics.totalWin += scatterWin;
    updateStatistics();
    statusElement.textContent = `Scatter win! ${scatterWin.toFixed(2)} collected.`;
  }
  if (currentRoundWin > 0) await showWinPopup(currentRoundWin);
  const actionPoints = bonusActionPoints();
  if (actionPoints > 0) { statusElement.textContent = "Three or more scatters unlock the bonus round."; showBonus(actionPoints); return; }
  statusElement.textContent = "No more matches. Tap the grid to begin a new round.";
  busy = false; setRoundReady(true);
}

async function startSpin(): Promise<void> {
  if (busy || !bonusModal.hidden) return;
  busy = true; currentRoundWin = 0; setRoundReady(false); statistics.spins += 1; updateStatistics();
  statusElement.textContent = "The reels rise from the deep..."; board = createBoard(); render(allPositions(), "spawn");
  await wait(750); await resolveRound();
}

gridElement.addEventListener("click", () => void startSpin());
gridElement.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void startSpin(); } });
continueButton.addEventListener("click", () => {
  if (bonusModalMode === "intro") {
    bonusModal.hidden = true;
    void startBonusRound();
    return;
  }
  if (bonusModalMode === "result") {
    bonusModal.hidden = true;
    bonusOverlay.hidden = true;
    bonusCompass.hidden = true;
    bonusModalMode = null;
    bonusState = null;
    busy = false;
    setRoundReady(true);
    statusElement.textContent = "Bonus voyage complete. Tap the grid to spin again.";
    gridElement.focus();
  }
});

render();
updateStatistics();
