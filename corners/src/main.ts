import "./style.css";

type Player = "X" | "O";
type Direction = "up" | "right" | "down" | "left";
interface Point { x: number; y: number; }
interface Segment { start: Point; end: Point; }
interface Port extends Point { id: string; direction: Direction; used: boolean; }
interface Arena { active: boolean[][]; boundaryH: boolean[][]; boundaryV: boolean[][]; lineH: (Player | null)[][]; lineV: (Player | null)[][]; owners: (Player | null)[][]; ports: Port[]; }
interface Shot { port: Port; finish: Port; segments: Segment[]; }

const SHEET = 750;
const CELL = 25;
const SIZE = SHEET / CELL;
const STEP_SIZE = 2;
const CORNER_CLEARANCE = 2;
const FLAT_STRIP_SIZE = 3;
const MAX_REFLECTIONS = 48;
const X_COLOR = "#65e6ff";
const O_COLOR = "#ffb454";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("The app container is missing.");
app.innerHTML = `
  <div class="game-shell"><header class="masthead"><div><p class="eyebrow">Orthogonal territory game</p><h1>Corners</h1></div><button class="new-game" id="new-game" type="button">New field</button></header>
  <main class="game-layout"><section class="board-wrap" aria-label="Corners game board"><canvas id="board" aria-label="Corners game board. Click a glowing boundary entry to launch the current player's line."></canvas></section>
  <aside class="panel" aria-label="Game information"><div class="turn-card" id="turn-card"></div><div class="score-card"><div><span class="mark x-mark">X</span><strong id="x-score">0</strong><small>Player 1</small></div><div><span class="mark o-mark">O</span><strong id="o-score">0</strong><small>Player 2</small></div></div><p class="message" id="message" aria-live="polite"></p><section class="rules"><h2>How it plays</h2><p>Choose a glowing unused entry on a flat wall. The line enters perpendicular to that wall and travels automatically.</p><p>Outer corners deflect the line 90°. Existing lines cannot be crossed or shared. A line must finish at another unused flat entry.</p><p>A closed-off region is claimed by the player who created the path. Each owned grid square scores one point.</p></section></aside></main></div>`;

const canvas = document.querySelector<HTMLCanvasElement>("#board");
const context = canvas?.getContext("2d");
const newGameButton = document.querySelector<HTMLButtonElement>("#new-game");
const xScore = document.querySelector<HTMLElement>("#x-score");
const oScore = document.querySelector<HTMLElement>("#o-score");
const message = document.querySelector<HTMLElement>("#message");
const turnCard = document.querySelector<HTMLElement>("#turn-card");
if (!canvas || !context || !newGameButton || !xScore || !oScore || !message || !turnCard) throw new Error("Corners could not find its game controls.");
const boardCanvas = canvas;
const boardContext = context;
const xScoreOutput = xScore;
const oScoreOutput = oScore;
const messageOutput = message;
const turnOutput = turnCard;
let arena: Arena;
let turn: Player = "X";
let finished = false;
let notice = "X starts. Choose a glowing flat-boundary entry.";

function matrix<T>(rows: number, columns: number, value: T): T[][] { return Array.from({ length: rows }, () => Array.from({ length: columns }, () => value)); }
function randomInt(minimum: number, maximum: number): number { return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum; }
function inBounds(x: number, y: number): boolean { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }

function createArena(): Arena {
  const active = matrix(SIZE, SIZE, false);
  const left = 3; const top = 3; const right = SIZE - 3; const bottom = SIZE - 3;
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) active[y][x] = true;
  const verticalFlatStart = randomInt(top + CORNER_CLEARANCE, bottom - CORNER_CLEARANCE - FLAT_STRIP_SIZE);
  const horizontalFlatStart = randomInt(left + CORNER_CLEARANCE, right - CORNER_CLEARANCE - FLAT_STRIP_SIZE);
  for (const side of ["left", "right", "top", "bottom"] as const) {
    const axisStart = side === "left" || side === "right" ? top : left;
    const axisEnd = side === "left" || side === "right" ? bottom : right;
    const flatStart = side === "left" || side === "right" ? verticalFlatStart : horizontalFlatStart;
    const flatEnd = flatStart + FLAT_STRIP_SIZE;
    let cursor = axisStart + CORNER_CLEARANCE;
    while (cursor < axisEnd - CORNER_CLEARANCE) {
      if (cursor >= flatStart && cursor < flatEnd) { cursor = flatEnd; continue; }
      const length = Math.min(STEP_SIZE, axisEnd - CORNER_CLEARANCE - cursor);
      if (cursor < flatStart && cursor + length > flatStart) { cursor = flatEnd; continue; }
      for (let point = cursor; point < cursor + length; point += 1) for (let distance = 0; distance < STEP_SIZE; distance += 1) {
        if (side === "left") active[point][left + distance] = false;
        if (side === "right") active[point][right - 1 - distance] = false;
        if (side === "top") active[top + distance][point] = false;
        if (side === "bottom") active[bottom - 1 - distance][point] = false;
      }
      cursor += length + STEP_SIZE;
    }
  }
  const boundaryH = matrix(SIZE + 1, SIZE, false); const boundaryV = matrix(SIZE, SIZE + 1, false);
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) if (active[y][x]) {
    if (!inBounds(x, y - 1) || !active[y - 1][x]) boundaryH[y][x] = true;
    if (!inBounds(x, y + 1) || !active[y + 1][x]) boundaryH[y + 1][x] = true;
    if (!inBounds(x - 1, y) || !active[y][x - 1]) boundaryV[y][x] = true;
    if (!inBounds(x + 1, y) || !active[y][x + 1]) boundaryV[y][x + 1] = true;
  }
  const ports: Port[] = [];
  for (let offset = 1; offset < FLAT_STRIP_SIZE; offset += 1) {
    const verticalPosition = verticalFlatStart + offset; const horizontalPosition = horizontalFlatStart + offset;
    ports.push({ id: `left-${verticalPosition}`, x: left, y: verticalPosition, direction: "right", used: false }, { id: `right-${verticalPosition}`, x: right, y: verticalPosition, direction: "left", used: false }, { id: `top-${horizontalPosition}`, x: horizontalPosition, y: top, direction: "down", used: false }, { id: `bottom-${horizontalPosition}`, x: horizontalPosition, y: bottom, direction: "up", used: false });
  }
  return { active, boundaryH, boundaryV, lineH: matrix(SIZE + 1, SIZE, null), lineV: matrix(SIZE, SIZE + 1, null), owners: matrix(SIZE, SIZE, null), ports };
}

function step(point: Point, direction: Direction): Point { if (direction === "up") return { x: point.x, y: point.y - 1 }; if (direction === "right") return { x: point.x + 1, y: point.y }; if (direction === "down") return { x: point.x, y: point.y + 1 }; return { x: point.x - 1, y: point.y }; }
function reverse(direction: Direction): Direction { return direction === "up" ? "down" : direction === "right" ? "left" : direction === "down" ? "up" : "right"; }
function perpendicular(direction: Direction): Direction[] { if (direction === "right") return ["down", "up"]; if (direction === "left") return ["up", "down"]; if (direction === "down") return ["left", "right"]; return ["right", "left"]; }
function edgeKey(start: Point, end: Point): string { return start.y === end.y ? `h:${start.y}:${Math.min(start.x, end.x)}` : `v:${Math.min(start.y, end.y)}:${start.x}`; }
function isInteriorEdge(start: Point, end: Point): boolean { if (start.y === end.y) { const x = Math.min(start.x, end.x); const y = start.y; return y > 0 && y < SIZE && x >= 0 && x < SIZE && arena.active[y - 1][x] && arena.active[y][x]; } const x = start.x; const y = Math.min(start.y, end.y); return x > 0 && x < SIZE && y >= 0 && y < SIZE && arena.active[y][x - 1] && arena.active[y][x]; }
function edgeOwner(start: Point, end: Point): Player | null { return start.y === end.y ? arena.lineH[start.y][Math.min(start.x, end.x)] : arena.lineV[Math.min(start.y, end.y)][start.x]; }
function setLine(segment: Segment, player: Player): void { if (segment.start.y === segment.end.y) arena.lineH[segment.start.y][Math.min(segment.start.x, segment.end.x)] = player; else arena.lineV[Math.min(segment.start.y, segment.end.y)][segment.start.x] = player; }
function hasLineAt(point: Point): boolean { return (arena.lineH[point.y]?.[point.x] ?? null) !== null || (arena.lineH[point.y]?.[point.x - 1] ?? null) !== null || (arena.lineV[point.y]?.[point.x] ?? null) !== null || (arena.lineV[point.y - 1]?.[point.x] ?? null) !== null; }
function portAt(point: Point): Port | undefined { return arena.ports.find((port) => port.x === point.x && port.y === point.y); }

function traceShot(port: Port): Shot | null {
  let current: Point = { x: port.x, y: port.y }; let direction = port.direction; let reflections = 0;
  const segments: Segment[] = []; const usedEdges = new Set<string>(); const visited = new Set<string>();
  while (reflections <= MAX_REFLECTIONS) {
    const state = `${current.x},${current.y}:${direction}`; if (visited.has(state)) return null; visited.add(state);
    const next = step(current, direction);
    if (!isInteriorEdge(current, next)) {
      const finish = portAt(current); if (finish && finish.id !== port.id && !finish.used && segments.length > 0) return { port, finish, segments };
      const rebound = step(current, reverse(direction));
      const deflection = perpendicular(direction).find((candidate) => { const end = step(rebound, candidate); return isInteriorEdge(rebound, end) && edgeOwner(rebound, end) === null && !usedEdges.has(edgeKey(rebound, end)); });
      if (!deflection) return null;
      current = rebound; direction = deflection; reflections += 1; continue;
    }
    if (edgeOwner(current, next) !== null || hasLineAt(next) || usedEdges.has(edgeKey(current, next))) return null;
    segments.push({ start: current, end: next }); usedEdges.add(edgeKey(current, next)); current = next;
  }
  return null;
}
function availableShots(): Shot[] { return arena.ports.flatMap((port) => !port.used ? [traceShot(port)].filter((shot): shot is Shot => shot !== null) : []); }

function neighborBlocked(x: number, y: number, direction: Direction): boolean { if (direction === "up") return arena.boundaryH[y][x] || arena.lineH[y][x] !== null; if (direction === "down") return arena.boundaryH[y + 1][x] || arena.lineH[y + 1][x] !== null; if (direction === "left") return arena.boundaryV[y][x] || arena.lineV[y][x] !== null; return arena.boundaryV[y][x + 1] || arena.lineV[y][x + 1] !== null; }
function unclaimedRegions(): Point[][] {
  const regions: Point[][] = []; const visited = matrix(SIZE, SIZE, false); const directions: Direction[] = ["up", "right", "down", "left"];
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    if (!arena.active[y][x] || arena.owners[y][x] || visited[y][x]) continue;
    const region: Point[] = []; const queue: Point[] = [{ x, y }]; visited[y][x] = true;
    for (let index = 0; index < queue.length; index += 1) { const cell = queue[index]; region.push(cell); for (const direction of directions) { if (neighborBlocked(cell.x, cell.y, direction)) continue; const next = step(cell, direction); if (!inBounds(next.x, next.y) || !arena.active[next.y][next.x] || arena.owners[next.y][next.x] || visited[next.y][next.x]) continue; visited[next.y][next.x] = true; queue.push(next); } }
    regions.push(region);
  }
  return regions;
}
function adjacentCells(port: Port): Point[] { return port.direction === "left" || port.direction === "right" ? [{ x: port.x, y: port.y - 1 }, { x: port.x, y: port.y }] : [{ x: port.x - 1, y: port.y }, { x: port.x, y: port.y }]; }
function claimClosedRegions(player: Player): number { let claimed = 0; const entryCells = new Set(arena.ports.filter((port) => !port.used).flatMap(adjacentCells).map((cell) => `${cell.x},${cell.y}`)); for (const region of unclaimedRegions()) { if (region.some((cell) => entryCells.has(`${cell.x},${cell.y}`))) continue; for (const cell of region) arena.owners[cell.y][cell.x] = player; claimed += region.length; } return claimed; }
function scores(): Record<Player, number> { const tally: Record<Player, number> = { X: 0, O: 0 }; for (const row of arena.owners) for (const owner of row) if (owner) tally[owner] += 1; return tally; }
function endGame(): void { finished = true; const tally = scores(); notice = tally.X === tally.O ? `Draw: ${tally.X} squares each.` : tally.X > tally.O ? `X wins ${tally.X}–${tally.O}.` : `O wins ${tally.O}–${tally.X}.`; }
function commitShot(shot: Shot): void { for (const segment of shot.segments) setLine(segment, turn); shot.port.used = true; shot.finish.used = true; const claimant = turn; const claimed = claimClosedRegions(claimant); turn = turn === "X" ? "O" : "X"; notice = claimed ? `${claimant} claimed ${claimed} ${claimed === 1 ? "square" : "squares"}.` : `${claimant}'s path is now part of the field.`; if (!availableShots().length) endGame(); render(); }

function drawGrid(): void { boardContext.fillStyle = "#101724"; boardContext.fillRect(0, 0, SHEET, SHEET); boardContext.strokeStyle = "rgba(112, 149, 190, 0.14)"; boardContext.lineWidth = 1; for (let n = 0; n <= SHEET; n += 5) { boardContext.beginPath(); boardContext.moveTo(n + 0.5, 0); boardContext.lineTo(n + 0.5, SHEET); boardContext.moveTo(0, n + 0.5); boardContext.lineTo(SHEET, n + 0.5); boardContext.stroke(); } boardContext.strokeStyle = "rgba(154, 191, 232, 0.24)"; for (let n = 0; n <= SHEET; n += CELL) { boardContext.beginPath(); boardContext.moveTo(n + 0.5, 0); boardContext.lineTo(n + 0.5, SHEET); boardContext.moveTo(0, n + 0.5); boardContext.lineTo(SHEET, n + 0.5); boardContext.stroke(); } }
function drawArena(): void { for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) { if (!arena.active[y][x]) continue; const owner = arena.owners[y][x]; boardContext.fillStyle = owner === "X" ? "rgba(60, 205, 236, 0.30)" : owner === "O" ? "rgba(247, 159, 68, 0.30)" : "rgba(29, 44, 65, 0.78)"; boardContext.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); if (owner) { boardContext.fillStyle = owner === "X" ? X_COLOR : O_COLOR; boardContext.font = "700 18px ui-monospace, monospace"; boardContext.textAlign = "center"; boardContext.textBaseline = "middle"; boardContext.fillText(owner, x * CELL + CELL / 2, y * CELL + CELL / 2 + 1); } } }
function drawEdges(): void { boardContext.lineCap = "square"; for (let y = 0; y <= SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) { const owner = arena.lineH[y][x]; if (!arena.boundaryH[y][x] && !owner) continue; boardContext.strokeStyle = owner === "X" ? X_COLOR : owner === "O" ? O_COLOR : "#d9eeff"; boardContext.lineWidth = owner ? 4 : 3; boardContext.beginPath(); boardContext.moveTo(x * CELL, y * CELL); boardContext.lineTo((x + 1) * CELL, y * CELL); boardContext.stroke(); } for (let y = 0; y < SIZE; y += 1) for (let x = 0; x <= SIZE; x += 1) { const owner = arena.lineV[y][x]; if (!arena.boundaryV[y][x] && !owner) continue; boardContext.strokeStyle = owner === "X" ? X_COLOR : owner === "O" ? O_COLOR : "#d9eeff"; boardContext.lineWidth = owner ? 4 : 3; boardContext.beginPath(); boardContext.moveTo(x * CELL, y * CELL); boardContext.lineTo(x * CELL, (y + 1) * CELL); boardContext.stroke(); } }
function angle(direction: Direction): number { return direction === "right" ? Math.PI / 2 : direction === "down" ? Math.PI : direction === "left" ? -Math.PI / 2 : 0; }
function drawPorts(shots: Shot[]): void { const playable = new Set(shots.map((shot) => shot.port.id)); for (const port of arena.ports) { if (!playable.has(port.id)) continue; boardContext.save(); boardContext.translate(port.x * CELL, port.y * CELL); boardContext.rotate(angle(port.direction)); boardContext.fillStyle = turn === "X" ? "#eaffff" : "#fff3de"; boardContext.shadowColor = turn === "X" ? X_COLOR : O_COLOR; boardContext.shadowBlur = 13; boardContext.beginPath(); boardContext.moveTo(0, -10); boardContext.lineTo(8, 8); boardContext.lineTo(-8, 8); boardContext.closePath(); boardContext.fill(); boardContext.restore(); } }
function render(): void { const ratio = window.devicePixelRatio || 1; boardCanvas.width = Math.round(SHEET * ratio); boardCanvas.height = Math.round(SHEET * ratio); boardContext.setTransform(ratio, 0, 0, ratio, 0, 0); boardContext.imageSmoothingEnabled = false; const shots = finished ? [] : availableShots(); drawGrid(); drawArena(); drawEdges(); drawPorts(shots); const tally = scores(); xScoreOutput.textContent = String(tally.X); oScoreOutput.textContent = String(tally.O); messageOutput.textContent = notice; turnOutput.innerHTML = finished ? `<span class="turn-label">Field complete</span><strong>Final score</strong>` : `<span class="turn-label">Current player</span><strong class="${turn === "X" ? "x-mark" : "o-mark"}">${turn} to launch</strong>`; }
function resetGame(): void { arena = createArena(); turn = "X"; finished = false; notice = "X starts. Choose a glowing flat-boundary entry."; render(); }
boardCanvas.addEventListener("click", (event) => { if (finished) return; const bounds = boardCanvas.getBoundingClientRect(); const x = ((event.clientX - bounds.left) / bounds.width) * SHEET; const y = ((event.clientY - bounds.top) / bounds.height) * SHEET; const choice = availableShots().map((shot) => ({ shot, distance: Math.hypot(x - shot.port.x * CELL, y - shot.port.y * CELL) })).sort((a, b) => a.distance - b.distance)[0]; if (!choice || choice.distance > 20) { notice = "Choose a glowing unused entry with a valid route."; render(); return; } commitShot(choice.shot); });
newGameButton.addEventListener("click", resetGame);
resetGame();
