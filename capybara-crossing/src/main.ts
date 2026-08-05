import "./style.css";

type Team = "blue" | "red";
type Cell = { row: number; col: number };
type Tile = { up: boolean; right: boolean; down: boolean; left: boolean };
type Piece = { id: number; team: Team; cell: Cell | "base" | "goal"; bob: number };
type Move = { piece: Piece; destination: Cell | "goal"; route: (Cell | "goal")[]; dice: number[]; steps: number };
type Geometry = { x: number; y: number; size: number; cell: number };
type MovementAnimation = { move: Move; startedAt: number; duration: number; complete: () => void; returning?: boolean; returnFrom?: Cell };

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const boardWrap = document.querySelector<HTMLElement>("#board-wrap")!;
const rollButton = document.querySelector<HTMLButtonElement>("#roll-button")!;
const rollLabel = document.querySelector("#roll-label")!;
const diceArea = document.querySelector("#dice")!;
const statusEl = document.querySelector("#status")!;
const banner = document.querySelector("#turn-banner")!;
const blueScore = document.querySelector("#blue-score")!;
const redScore = document.querySelector("#red-score")!;
const winner = document.querySelector("#winner")!;
const winnerTitle = document.querySelector("#winner-title")!;
const elapsedTime = document.querySelector("#elapsed-time")!;

const patterns: Tile[] = [
  [1,0,0,1], [1,1,0,0], [0,1,1,0], [0,0,1,1], [1,0,1,0], [0,1,0,1], [1,1,0,1], [0,1,1,1], [1,0,1,1], [1,1,1,0], [1,1,1,1],
].map(([up, right, down, left]) => ({ up: !!up, right: !!right, down: !!down, left: !!left }));
const BOARD_SIZE = 6;
const directions = [{ key: "up", dr: -1, dc: 0, opposite: "down" }, { key: "right", dr: 0, dc: 1, opposite: "left" }, { key: "down", dr: 1, dc: 0, opposite: "up" }, { key: "left", dr: 0, dc: -1, opposite: "right" }] as const;
let tiles: Tile[][] = [];
let pieces: Piece[] = [];
let turn: Team | null = null;
let dice: { value: number; used: boolean }[] = [];
let selectedPiece: Piece | null = null;
let availableMoves: Move[] = [];
let waitingInitial = true;
let aiTimer: number | undefined;
let flash = 0;
let baseEntriesThisTurn = 0;
let movementAnimation: MovementAnimation | null = null;
let movementTimer: number | undefined;
let toast: { message: string; until: number } | null = null;
let captureCallout: { cell: Cell; until: number } | null = null;
let capturePause = false;
let captureTimer: number | undefined;
let movesMadeThisTurn = 0;
let gameStartedAt: number | null = null;
let gameEndedAt: number | null = null;
let clockTimer: number | undefined;
let earthquakeUntil = 0;
let earthquakeTiles = new Set<string>();
let earthquakeTimer: number | undefined;
let tileFallDelays = new Map<string, number>();
let tileArrivalUntil = 0;
let tileArrivalDelays = new Map<string, number>();
let tileArrivalTimer: number | undefined;

const other = (team: Team): Team => team === "blue" ? "red" : "blue";
const label = (team: Team): string => team === "blue" ? "Blue" : "Red";
const same = (a: Cell, b: Cell): boolean => a.row === b.row && a.col === b.col;
const rnd = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const cellKey = (cell: Cell | "goal"): string => cell === "goal" ? "goal" : `${cell.row},${cell.col}`;
const geometry = (): Geometry => { const w = canvas.clientWidth, h = canvas.clientHeight, size = Math.min(h * .9, w * .72); return { x: (w - size) / 2, y: (h - size) / 2, size, cell: size / BOARD_SIZE }; };

function newGame() {
  clearTimeout(aiTimer);
  clearTimeout(movementTimer);
  clearTimeout(captureTimer);
  clearTimeout(earthquakeTimer);
  clearTimeout(tileArrivalTimer);
  boardWrap.classList.remove("quake"); earthquakeUntil = 0; earthquakeTiles.clear(); tileFallDelays.clear();
  tileArrivalUntil = 0; tileArrivalDelays.clear();
  clearInterval(clockTimer);
  tiles = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => rnd(patterns)));
  pieces = Array.from({ length: 20 }, (_, id) => ({ id, team: id < 10 ? "blue" : "red", cell: "base", bob: Math.random() * Math.PI * 2 }));
  turn = null; dice = []; selectedPiece = null; availableMoves = []; waitingInitial = true; flash = 0; baseEntriesThisTurn = 0; movementAnimation = null; toast = null; captureCallout = null; capturePause = false; movesMadeThisTurn = 0; gameStartedAt = null; gameEndedAt = null; updateClock();
  winner.classList.add("hidden"); banner.textContent = "Roll to discover who begins"; rollLabel.textContent = "Roll to start"; rollButton.disabled = false;
  statusEl.textContent = "The first roll decides which herd sets out."; renderDice(); updateScore();
}

function regenerateTrails() {
  const occupied = new Set(pieces.filter(p => typeof p.cell !== "string").map(p => cellKey(p.cell as Cell)));
  tiles = tiles.map((line, row) => line.map((tile, col) => occupied.has(`${row},${col}`) ? tile : rnd(patterns)));
}

function homeCells(team: Team): Cell[] { const col = team === "blue" ? BOARD_SIZE - 1 : 0, lowerMiddle = Math.floor(BOARD_SIZE / 2); return [{ row: lowerMiddle - 1, col }, { row: lowerMiddle, col }]; }
function isHomeCell(cell: Cell, team: Team): boolean { return homeCells(team).some(home => same(home, cell)); }
function homeGateIsOpen(cell: Cell, team: Team): boolean { return team === "blue" ? tiles[cell.row][cell.col].right : tiles[cell.row][cell.col].left; }
function goalCell(move: Move): Cell { const endpoint = [...move.route].reverse().find((point): point is Cell => point !== "goal"); return endpoint ?? homeCells(move.piece.team)[0]; }

function roll() {
  if (turn && dice.some(die => !die.used)) return;
  const first = 1 + Math.floor(Math.random() * 6), second = 1 + Math.floor(Math.random() * 6);
  if (waitingInitial) {
    if (first + second === 7) { statusEl.textContent = `A ${first} + ${second} is a tie. Roll again!`; dice = [{ value: first, used: true }, { value: second, used: true }]; renderDice(); return; }
    turn = first + second > 7 ? "red" : "blue"; waitingInitial = false; startClock();
    startTurn([first, second], `${first} + ${second} means ${label(turn)} starts and keeps these dice.`);
  } else startTurn([first, second]);
}

function startTurn(values: number[], intro?: string) {
  if (!turn) return;
  const activeTurn = turn;
  selectedPiece = null; availableMoves = []; dice = []; rollButton.disabled = true; rollLabel.textContent = "Routes shifting"; banner.textContent = "The trails are rearranging"; statusEl.textContent = "The ground rumbles as new routes take shape…"; renderDice();
  startEarthquake(changedTiles => {
    regenerateTrails(); statusEl.textContent = "Fresh trails tumble down from the capybara gods…";
    startTileArrival(changedTiles, () => {
      dice = values[0] === values[1] ? Array.from({ length: 4 }, () => ({ value: values[0], used: false })) : values.map(value => ({ value, used: false }));
      baseEntriesThisTurn = 0; movesMadeThisTurn = 0; flash = 1; rollLabel.textContent = "Finish your moves"; banner.textContent = `${label(activeTurn)} herd's turn`;
      statusEl.textContent = intro ?? (values[0] === values[1] ? `${label(activeTurn)} rolled doubles! Four trail moves.` : `${label(activeTurn)} rolled ${values.join(" + ")}. Choose a capybara to see every option.`);
      renderDice();
      if (activeTurn === "red") { statusEl.textContent += " The red trail guide is thinking…"; aiTimer = window.setTimeout(runAI, 700); }
      else resolveBlueTurn();
    });
  });
}

function startEarthquake(complete: (changedTiles: Set<string>) => void) {
  earthquakeTiles = new Set(Array.from({ length: BOARD_SIZE }, (_, row) => Array.from({ length: BOARD_SIZE }, (_, col) => ({ row, col }))).flat().filter(cell => !pieces.some(piece => typeof piece.cell !== "string" && same(piece.cell as Cell, cell))).map(cellKey));
  tileFallDelays = new Map([...earthquakeTiles].map(key => [key, 120 + Math.random() * 950]));
  earthquakeUntil = performance.now() + 2000; boardWrap.classList.remove("quake"); void boardWrap.offsetWidth; boardWrap.classList.add("quake");
  clearTimeout(earthquakeTimer); earthquakeTimer = window.setTimeout(() => { const changedTiles = earthquakeTiles; earthquakeUntil = 0; earthquakeTiles = new Set(); tileFallDelays.clear(); boardWrap.classList.remove("quake"); complete(changedTiles); }, 2000);
}
function startTileArrival(changedTiles: Set<string>, complete: () => void) {
  tileArrivalDelays = new Map([...changedTiles].map(key => [key, Math.random() * 350])); tileArrivalUntil = performance.now() + 1050;
  clearTimeout(tileArrivalTimer); tileArrivalTimer = window.setTimeout(() => { tileArrivalUntil = 0; tileArrivalDelays.clear(); complete(); }, 1050);
}

function renderDice() {
  diceArea.replaceChildren();
  dice.forEach(die => { const item = document.createElement("div"); item.className = `die${die.used ? " used" : ""}`; item.textContent = String(die.value); item.title = die.used ? "Used or unavailable" : `${die.value} tiles available`; item.setAttribute("aria-label", `${die.value} tiles ${die.used ? "used" : "available"}`); diceArea.append(item); });
}

function neighbors(cell: Cell): Cell[] {
  const tile = tiles[cell.row][cell.col], result: Cell[] = [];
  for (const dir of directions) {
    if (!tile[dir.key]) continue;
    const next = { row: cell.row + dir.dr, col: cell.col + dir.dc };
    if (next.row >= 0 && next.row < BOARD_SIZE && next.col >= 0 && next.col < BOARD_SIZE) { if (tiles[next.row][next.col][dir.opposite]) result.push(next); }
  }
  return result;
}
function opponentStackSize(cell: Cell, team: Team): number { return pieces.filter(piece => piece.team === other(team) && typeof piece.cell !== "string" && same(piece.cell as Cell, cell)).length; }
function blockedByOpponentStack(cell: Cell, team: Team): boolean { return opponentStackSize(cell, team) >= 2; }
function entryPoints(team: Team): Cell[] { const col = team === "blue" ? 0 : BOARD_SIZE - 1, edge = team === "blue" ? "left" : "right"; return Array.from({ length: BOARD_SIZE }, (_, row) => ({ row, col })).filter(cell => tiles[cell.row][cell.col][edge]); }
function findMoves(piece: Piece, steps: number, usedDice: number[]): Move[] {
  if (piece.cell === "base" && baseEntriesThisTurn >= 2) return [];
  const paths: Move[] = [];
  const walk = (at: Cell, remaining: number, route: (Cell | "goal")[]) => {
    if (remaining === 0) { paths.push({ piece, destination: isHomeCell(at, piece.team) && homeGateIsOpen(at, piece.team) ? "goal" : at, route, dice: usedDice, steps }); return; }
    for (const next of neighbors(at)) {
      // Friendly stacks are trail companions: they can always be crossed or joined.
      // Only a stack of two or more opposing capybaras closes a route.
      if (blockedByOpponentStack(next, piece.team)) continue;
      if (route.some(point => point !== "goal" && same(point, next))) continue;
      walk(next, remaining - 1, [...route, next]);
    }
  };
  if (piece.cell === "base") entryPoints(piece.team).filter(cell => !blockedByOpponentStack(cell, piece.team)).forEach(cell => walk(cell, steps - 1, [cell]));
  else if (piece.cell !== "goal") walk(piece.cell, steps, [piece.cell]);
  const unique = new Map<string, Move>(); paths.forEach(move => unique.set(`${cellKey(move.destination)}-${move.dice.join("-")}`, move)); return [...unique.values()];
}
function movesForDie(team: Team, dieIndex: number): Move[] { return pieces.filter(piece => piece.team === team && piece.cell !== "goal").flatMap(piece => findMoves(piece, dice[dieIndex].value, [dieIndex])); }
function burnUnavailableDice(team: Team): boolean {
  let changed = false;
  dice.forEach((die, index) => { if (!die.used && movesForDie(team, index).length === 0) { die.used = true; changed = true; } });
  if (changed) renderDice(); return changed;
}
function showToast(message: string, duration = 1250) { toast = { message, until: performance.now() + duration }; }
function resolveBlueTurn() {
  burnUnavailableDice("blue");
  if (dice.every(die => die.used)) { showToast("No more moves"); statusEl.textContent = "Blue has no complete route with this roll. Turn passes."; aiTimer = window.setTimeout(endTurn, 1250); }
}

function choosePiece(piece: Piece) {
  if (turn !== "blue" || piece.team !== "blue") return;
  if (selectedPiece?.id === piece.id) { selectedPiece = null; availableMoves = []; statusEl.textContent = "Selection cleared. Choose another capybara."; return; }
  selectedPiece = piece; availableMoves = [];
  const unused = dice.map((die, index) => ({ die, index })).filter(({ die }) => !die.used);
  unused.forEach(({ die, index }) => availableMoves.push(...findMoves(piece, die.value, [index])));
  if (unused.length === 2 && unused[0].die.value !== unused[1].die.value) availableMoves.push(...findMoves(piece, unused[0].die.value + unused[1].die.value, [unused[0].index, unused[1].index]));
  const options = [...new Set(availableMoves.map(move => move.steps))];
  statusEl.textContent = options.length ? `Blue capybara selected: glowing centres use ${options.join(", ")} tile${options.length > 1 ? "s" : ""}.` : "This capybara cannot complete a move with the remaining dice.";
}

function startMovement(move: Move, complete: () => void) {
  const routeCells = move.route.filter((point): point is Cell => point !== "goal");
  const segments = Math.max(1, routeCells.length - (move.piece.cell === "base" ? 0 : 1));
  const duration = Math.min(3000, Math.max(650, segments * 420));
  selectedPiece = null; availableMoves = []; flash = 1;
  movementAnimation = { move, startedAt: performance.now(), duration, complete };
  statusEl.textContent = `${label(move.piece.team)} capybara is following the trail…`;
  clearTimeout(movementTimer);
  movementTimer = window.setTimeout(() => {
    const animation = movementAnimation;
    movementAnimation = null;
    if (animation?.move === move) animation.complete();
  }, duration);
}

function startReturn(piece: Piece, from: Cell, complete: () => void) {
  const returnMove: Move = { piece, destination: from, route: [from], dice: [], steps: 0 };
  const duration = 1100;
  movementAnimation = { move: returnMove, startedAt: performance.now(), duration, complete, returning: true, returnFrom: from };
  statusEl.textContent = `${label(piece.team)} capybara is tumbling back to base…`;
  clearTimeout(movementTimer);
  movementTimer = window.setTimeout(() => {
    const animation = movementAnimation;
    movementAnimation = null;
    if (animation?.move === returnMove) { piece.cell = "base"; animation.complete(); }
  }, duration);
}

function announceCapture(cell: Cell, after: () => void) {
  capturePause = true; captureCallout = { cell, until: performance.now() + 700 };
  clearTimeout(captureTimer);
  captureTimer = window.setTimeout(() => { captureCallout = null; capturePause = false; after(); }, 700);
}

function applyMove(move: Move) { startMovement(move, () => commitPlayerMove(move)); }
function commitPlayerMove(move: Move) {
  const enteredFromBase = move.piece.cell === "base";
  const target = move.destination;
  const landingCell = target === "goal" ? goalCell(move) : target;
  const captured = pieces.find(piece => piece.team === "red" && typeof piece.cell !== "string" && same(piece.cell as Cell, landingCell));
  move.piece.cell = target; if (enteredFromBase) baseEntriesThisTurn += 1;
  if (captured && opponentStackSize(landingCell, "blue") === 1) { announceCapture(landingCell, () => startReturn(captured, landingCell, () => finishPlayerMove(move))); return; }
  finishPlayerMove(move);
}
function finishPlayerMove(move: Move) {
  movesMadeThisTurn += 1; move.dice.forEach(index => dice[index].used = true); selectedPiece = null; availableMoves = []; flash = 1; updateScore(); renderDice();
  if (pieces.filter(piece => piece.team === "blue" && piece.cell === "goal").length === 10) { endGame("blue"); return; }
  const burned = burnUnavailableDice("blue");
  if (dice.every(die => die.used)) { if (burned) { showToast("No more moves"); statusEl.textContent = "Blue has no more valid moves. Turn passes."; aiTimer = window.setTimeout(endTurn, 1250); } else endTurn(); return; }
  statusEl.textContent = `Blue moved ${move.steps} tiles. Select any capybara for the remaining die.`;
}

function endTurn() {
  if (!turn) return;
  turn = other(turn); dice = []; selectedPiece = null; availableMoves = []; renderDice(); banner.textContent = `${label(turn)} herd's turn`;
  if (turn === "red") { rollButton.disabled = true; rollLabel.textContent = "Red is rolling"; statusEl.textContent = "Red automatically rolls for a fresh trail…"; aiTimer = window.setTimeout(roll, 650); }
  else { rollButton.disabled = false; rollLabel.textContent = "Roll the dice"; statusEl.textContent = "Blue's turn. Roll to redraw the unoccupied trails."; }
}

function runAI() {
  if (turn !== "red") return;
  const burned = burnUnavailableDice("red");
  const index = dice.findIndex(die => !die.used); if (index < 0) { if (movesMadeThisTurn === 0 || burned) { showToast("No more moves"); statusEl.textContent = "Red has no complete route. Turn passes."; aiTimer = window.setTimeout(endTurn, 1250); } else aiTimer = window.setTimeout(endTurn, 350); return; }
  const moves = movesForDie("red", index);
  const value = (move: Move) => move.destination === "goal" ? 1000 : -(move.destination as Cell).col * 18 + (opponentStackSize(move.destination as Cell, "red") === 1 ? 90 : 0) + Math.random() * 5;
  applyAIMove(moves.sort((a, b) => value(b) - value(a))[0]);
}
function applyAIMove(move: Move) { startMovement(move, () => commitAIMove(move)); }
function commitAIMove(move: Move) {
  const enteredFromBase = move.piece.cell === "base";
  const target = move.destination;
  const landingCell = target === "goal" ? goalCell(move) : target;
  const captured = pieces.find(piece => piece.team === "blue" && typeof piece.cell !== "string" && same(piece.cell as Cell, landingCell));
  move.piece.cell = target; if (enteredFromBase) baseEntriesThisTurn += 1;
  if (captured && opponentStackSize(landingCell, "red") === 1) { announceCapture(landingCell, () => startReturn(captured, landingCell, () => finishAIMove(move))); return; }
  finishAIMove(move);
}
function finishAIMove(move: Move) {
  movesMadeThisTurn += 1; move.dice.forEach(index => dice[index].used = true); updateScore(); renderDice(); flash = 1;
  if (pieces.filter(piece => piece.team === "red" && piece.cell === "goal").length === 10) { endGame("red"); return; }
  aiTimer = window.setTimeout(runAI, 520);
}
function formatElapsed(milliseconds: number): string { const seconds = Math.floor(milliseconds / 1000), minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function updateClock() { elapsedTime.textContent = formatElapsed((gameStartedAt ? (gameEndedAt ?? Date.now()) - gameStartedAt : 0)); }
function startClock() { if (gameStartedAt) return; gameStartedAt = Date.now(); updateClock(); clockTimer = window.setInterval(updateClock, 1000); }
function endGame(team: Team) { clearTimeout(aiTimer); gameEndedAt = Date.now(); clearInterval(clockTimer); updateClock(); winnerTitle.textContent = `${label(team)} herd wins!`; winner.classList.remove("hidden"); banner.textContent = "The journey is complete"; }
function updateScore() { blueScore.textContent = `${pieces.filter(piece => piece.team === "blue" && piece.cell === "goal").length} / 10 crossed`; redScore.textContent = `${pieces.filter(piece => piece.team === "red" && piece.cell === "goal").length} / 10 crossed`; }
function lastJourneyPiece(): Piece | undefined { const travelers = pieces.filter(piece => piece.cell !== "goal"); return travelers.length === 1 ? travelers[0] : undefined; }
function lastTravelerScale(piece: Piece, time: number): number { if (lastJourneyPiece()?.id !== piece.id) return 1; const phase = (time % 2000) / 1000; return phase <= 1 ? 1 + phase : 3 - phase; }

function resize() { const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(canvas.clientWidth * ratio); canvas.height = Math.round(canvas.clientHeight * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
function center(cell: Cell, g: Geometry) { return { x: g.x + (cell.col + .5) * g.cell, y: g.y + (cell.row + .5) * g.cell }; }
function tileShift(cell: Cell, time: number, cellSize: number) {
  const key = cellKey(cell);
  if (time < earthquakeUntil && earthquakeTiles.has(key)) {
    const elapsed = 2000 - (earthquakeUntil - time), delay = tileFallDelays.get(key) ?? 0, fall = Math.min(1, Math.max(0, (elapsed - delay) / 760)), shakeStrength = .8 * (1 - fall), fallEase = fall * fall;
    return { x: Math.sin(time * .035 + cell.row * 9 + cell.col * 4) * shakeStrength, y: Math.cos(time * .041 + cell.row * 5 - cell.col * 7) * shakeStrength + fallEase * cellSize * .9, opacity: 1 - fall };
  }
  if (time < tileArrivalUntil && tileArrivalDelays.has(key)) {
    const elapsed = 1050 - (tileArrivalUntil - time), delay = tileArrivalDelays.get(key) ?? 0, progress = Math.min(1, Math.max(0, (elapsed - delay) / 700)), eased = 1 - (1 - progress) * (1 - progress);
    return { x: 0, y: -(1 - eased) * cellSize * 1.4, opacity: Math.min(1, progress * 1.5) };
  }
  return { x: 0, y: 0, opacity: 1 };
}
function baseCenter(team: Team, g: Geometry) { return { x: team === "blue" ? g.x * .48 : g.x + g.size + (canvas.clientWidth - (g.x + g.size)) * .52, y: g.y + g.size / 2 }; }
function animatedPosition(animation: MovementAnimation, g: Geometry, time: number) {
  const route = animation.returning && animation.returnFrom ? [center(animation.returnFrom, g), baseCenter(animation.move.piece.team, g)] : animation.move.route.filter((point): point is Cell => point !== "goal").map(point => center(point, g));
  const points = animation.move.piece.cell === "base" ? [baseCenter(animation.move.piece.team, g), ...route] : route;
  if (points.length < 2) return points[0] ?? baseCenter(animation.move.piece.team, g);
  const progress = Math.min(1, (time - animation.startedAt) / animation.duration), eased = progress * progress * (3 - 2 * progress), scaled = eased * (points.length - 1), index = Math.min(points.length - 2, Math.floor(scaled)), local = scaled - index;
  return { x: points[index].x + (points[index + 1].x - points[index].x) * local, y: points[index].y + (points[index + 1].y - points[index].y) * local };
}
function drawCapy(x: number, y: number, scale: number, team: Team, count: number, time: number, glowing = false, rotation = 0) {
  const bob = Math.sin(time * .003 + x) * scale * .055; ctx.save(); ctx.translate(x, y + bob); ctx.rotate(rotation); if (glowing) { ctx.shadowColor = "#f8e47c"; ctx.shadowBlur = scale * .9; ctx.fillStyle = "#fff2a6"; ctx.beginPath(); ctx.arc(0, 0, scale * .69, 0, Math.PI * 2); ctx.fill(); }
  const fur = team === "blue" ? "#4db6e8" : "#ef6558", shade = team === "blue" ? "#287dac" : "#bb3f42"; ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(0, scale*.06, scale*.46, scale*.29, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-scale*.06, 0, scale*.43, scale*.27, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(scale*.29, -scale*.14, scale*.18, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = fur; ctx.beginPath(); ctx.arc(scale*.28, -scale*.18, scale*.15, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#17213a"; ctx.beginPath(); ctx.arc(scale*.33, -scale*.22, scale*.025, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#fff5d0"; ctx.beginPath(); ctx.ellipse(scale*.43, -scale*.11, scale*.06, scale*.035, 0, 0, Math.PI*2); ctx.fill(); if (count > 1) { ctx.fillStyle = "#fff4d1"; ctx.font = `700 ${Math.max(8, scale*.28)}px DM Mono`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(count), -scale*.06, scale*.05); } ctx.restore();
}
function drawConfetti(x: number, y: number, scale: number, time: number) {
  const colors = ["#f8cf5c", "#ff826e", "#67d7e7", "#a98bff", "#f5f0db"], pulse = (time % 820) / 820;
  ctx.save();
  for (let index = 0; index < 14; index++) {
    const angle = index * (Math.PI * 2 / 14) + time * .002, distance = scale * (.5 + ((index * 7) % 9) / 10 + pulse * .45), size = Math.max(3, scale * .1);
    ctx.save(); ctx.translate(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance); ctx.rotate(angle + pulse * Math.PI); ctx.fillStyle = colors[index % colors.length]; ctx.fillRect(-size / 2, -size / 2, size, size * 1.7); ctx.restore();
  }
  ctx.restore();
}
function drawBase(team: Team, count: number, g: Geometry, time: number) {
  const { x, y } = baseCenter(team, g), empty = count === 0;
  ctx.fillStyle = empty ? "#283142" : team === "blue" ? "#1c4972" : "#6b303e"; ctx.beginPath(); ctx.roundRect(x - g.x*.37, y - g.cell*.64, g.x*.74, g.cell*1.28, 15); ctx.fill();
  ctx.strokeStyle = empty ? "#536077" : team === "blue" ? "#5fc4f0" : "#ff8e7d"; ctx.lineWidth = 2; ctx.stroke();
  const basePiece = lastJourneyPiece();
  if (!empty) drawCapy(x, y - g.cell*.08, Math.min(g.cell*.36, g.x*.3) * (basePiece?.team === team && basePiece.cell === "base" ? lastTravelerScale(basePiece, time) : 1), team, count, time, selectedPiece?.cell === "base" && selectedPiece.team === team);
  ctx.fillStyle = empty ? "#8995aa" : "#dceaff"; ctx.font = `500 ${Math.max(8,g.cell*.10)}px DM Mono`; ctx.textAlign = "center"; ctx.fillText(empty ? "BASE EMPTY" : team === "blue" ? "BLUE BASE" : "RED BASE", x, y + g.cell*.43);
}
function draw(time = performance.now()) {
  const w = canvas.clientWidth, h = canvas.clientHeight, g = geometry(); ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#172642"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#263a61"; ctx.fillRect(g.x, g.y, g.size, g.size);
  for (let row=0;row<BOARD_SIZE;row++) for (let col=0;col<BOARD_SIZE;col++) { const shift = tileShift({ row, col }, time, g.cell); ctx.save(); ctx.globalAlpha = shift.opacity; ctx.fillStyle=(row+col)%2?"#1d3053":"#22375d";ctx.fillRect(g.x+col*g.cell+1+shift.x,g.y+row*g.cell+1+shift.y,g.cell-2,g.cell-2); ctx.restore(); }
  ([{ team: "blue" as Team, label: "HOT SPRINGS →", color: "#50c5f0" }, { team: "red" as Team, label: "← HOT SPRINGS", color: "#ff887c" }]).forEach(exit => homeCells(exit.team).forEach(cell => { const at = center(cell, g), shift = tileShift(cell, time, g.cell); ctx.save(); ctx.globalAlpha = .23 * shift.opacity; ctx.fillStyle = exit.color; ctx.fillRect(g.x + cell.col * g.cell + 2 + shift.x, g.y + cell.row * g.cell + 2 + shift.y, g.cell - 4, g.cell - 4); ctx.globalAlpha = .52 * shift.opacity; ctx.fillStyle = "#fff4d1"; ctx.font = `700 ${Math.max(7,g.cell*.105)}px DM Mono`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(exit.label, at.x + shift.x, at.y + shift.y + g.cell*.31); ctx.restore(); }));
  ctx.lineCap="round";ctx.lineWidth=Math.max(4,g.cell*.085);ctx.strokeStyle="#91a9ce";for(let row=0;row<BOARD_SIZE;row++)for(let col=0;col<BOARD_SIZE;col++){const tile=tiles[row][col],cell={row,col},shift=tileShift(cell,time,g.cell),at=center(cell,g);ctx.save();ctx.globalAlpha=shift.opacity;for(const dir of directions)if(tile[dir.key]){ctx.beginPath();ctx.moveTo(at.x+shift.x,at.y+shift.y);ctx.lineTo(at.x+shift.x+dir.dc*g.cell*.52,at.y+shift.y+dir.dr*g.cell*.52);ctx.stroke();}ctx.restore();}
  const labels=new Map<string,string[]>();availableMoves.forEach(move=>{const target=move.destination==="goal"?goalCell(move):move.destination;const key=cellKey(target);labels.set(key,[...(labels.get(key)??[]),String(move.steps)]);});ctx.strokeStyle="#f8cf5c";ctx.lineWidth=Math.max(4,g.cell*.075);ctx.shadowColor="#f8cf5c";ctx.shadowBlur=flash?16:8;labels.forEach((numbers,key)=>{const [row,col]=key.split(",").map(Number),at=center({row,col},g);ctx.beginPath();ctx.arc(at.x,at.y,g.cell*.36,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#fff2ae";ctx.font=`700 ${Math.max(8,g.cell*.15)}px DM Mono`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(numbers.join("/"),at.x,at.y-g.cell*.43);});ctx.shadowBlur=0;
  if (captureCallout) {
    const remaining = captureCallout.until - time;
    if (remaining <= 0) captureCallout = null;
    else { const at = center(captureCallout.cell, g); ctx.save(); ctx.globalAlpha = Math.min(1, remaining / 180); ctx.fillStyle = "#fff2ae"; ctx.strokeStyle = "#8b3d40"; ctx.lineWidth = 3; ctx.font = `700 ${Math.max(12,g.cell*.22)}px Fraunces`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.strokeText("BUMP!", at.x, at.y - g.cell*.54); ctx.fillText("BUMP!", at.x, at.y - g.cell*.54); ctx.restore(); }
  }
  const movingPiece = movementAnimation?.move.piece, groups = new Map<string, Piece[]>();
  pieces.filter(piece => typeof piece.cell !== "string" && piece !== movingPiece).forEach(piece => { const key = cellKey(piece.cell as Cell); groups.set(key, [...(groups.get(key) ?? []), piece]); });
  groups.forEach(group => { const at = center(group[0].cell as Cell, g), isCaptureTile = !!captureCallout && same(captureCallout.cell, group[0].cell as Cell); drawCapy(at.x, at.y, g.cell*.43 * lastTravelerScale(group[0], time), group[0].team, isCaptureTile ? 1 : group.length, time, selectedPiece?.id === group[0].id); });
  drawBase("blue", pieces.filter(piece => piece.team === "blue" && piece.cell === "base" && piece !== movingPiece).length, g, time);
  drawBase("red", pieces.filter(piece => piece.team === "red" && piece.cell === "base" && piece !== movingPiece).length, g, time);
  if (movementAnimation) { const at = animatedPosition(movementAnimation, g, time), progress = Math.min(1, (time - movementAnimation.startedAt) / movementAnimation.duration), spin = movementAnimation.returning ? progress * Math.PI * 5 : 0, scale = g.cell*.43 * lastTravelerScale(movementAnimation.move.piece, time); if (!movementAnimation.returning && movementAnimation.move.destination === "goal") drawConfetti(at.x, at.y, scale, time); drawCapy(at.x, at.y, scale, movementAnimation.move.piece.team, 1, time, true, spin); }
  if (toast) { const remaining = toast.until - time; if (remaining <= 0) toast = null; else { const alpha = Math.min(1, remaining / 220); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#10182de8"; ctx.strokeStyle = "#f8cf5c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(w/2-g.cell*.8, h-g.cell*.72, g.cell*1.6, g.cell*.34, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff2ae"; ctx.font = `700 ${Math.max(11,g.cell*.13)}px DM Mono`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(toast.message, w/2, h-g.cell*.55); ctx.restore(); } }
  flash *= .91; requestAnimationFrame(draw);
}
function canvasCell(event: MouseEvent, g: Geometry): Cell | null { const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,col=Math.floor((x-g.x)/g.cell),row=Math.floor((y-g.y)/g.cell);return row>=0&&row<BOARD_SIZE&&col>=0&&col<BOARD_SIZE?{row,col}:null; }
canvas.addEventListener("click", event => { if (movementAnimation || capturePause || turn !== "blue" || !dice.some(die=>!die.used)) return; const g=geometry(),box=canvas.getBoundingClientRect(),x=event.clientX-box.left,cell=canvasCell(event,g); if(cell){const move=availableMoves.find(candidate=>same(candidate.destination==="goal"?goalCell(candidate):candidate.destination as Cell,cell));if(move){applyMove(move);return;}const group=pieces.filter(piece=>piece.team==="blue"&&typeof piece.cell!=="string"&&same(piece.cell as Cell,cell));if(group[0])choosePiece(group[0]);return;}if(x<g.x){const basePiece=pieces.find(piece=>piece.team==="blue"&&piece.cell==="base");if(basePiece)choosePiece(basePiece);}});
rollButton.onclick=roll;document.querySelector<HTMLButtonElement>("#new-game")!.onclick=newGame;document.querySelector<HTMLButtonElement>("#play-again")!.onclick=newGame;newGame();window.addEventListener("resize",resize);resize();requestAnimationFrame(draw);
