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
      <p class="eyebrow">Scatter treasure found</p><h2 id="bonus-title">Bonus round coming soon</h2>
      <p id="bonus-copy"></p><button id="bonus-continue" type="button">Return to the reels</button>
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
const bonusCopy = element<HTMLParagraphElement>("#bonus-copy");
const continueButton = element<HTMLButtonElement>("#bonus-continue");
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

function showBonus(actionPoints: number): void {
  statistics.bonusGames += 1; updateStatistics();
  bonusCopy.textContent = `Bonus round coming soon with ${actionPoints} action points.`;
  bonusModal.hidden = false;
}

async function resolveRound(): Promise<void> {
  while (true) { await collectWins(); const wild = firstWild(); if (wild === null) break; await activateWild(wild); }
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
  bonusModal.hidden = true; busy = false; setRoundReady(true);
  statusElement.textContent = "Bonus saved for the next voyage. Tap the grid to spin again."; gridElement.focus();
});

render();
updateStatistics();
