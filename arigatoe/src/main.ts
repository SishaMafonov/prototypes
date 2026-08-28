import "./style.css";
import backgroundUrl from "./assets/background/main.png";
import coverSheetUrl from "./assets/symbols/cover.png";
import symbolSheetUrl from "./assets/symbols/regular.png";
import randomFeatureUrl from "./assets/features/random.png";
import bonusBackgroundUrl from "./assets/background/bonus.png";
import bonusWheelUrl from "./assets/bonus/wheel.png";
import bonusFrameUrl from "./assets/bonus/frame.png";
import streakBarUrl from "./assets/bonus/streak_bar.png";

const WORLD = { width: 1122, height: 1402 };
const GRID = { x: 165, y: 296, columns: 8, rows: 5, cellWidth: 94, cellHeight: 112, gapX: 5, gapY: 13 };
const BET = 1;
const multipliers = [2, 2, 2, 2, 2, 3, 3, 3, 5, 5, 8];
const RANDOM_FEATURE_CHANCE = 0.3;
const RANDOM_FEATURE_DURATION = 9000;
const RANDOM_FEATURE_GROW_DURATION = 1500;
const RANDOM_FEATURE_SHRINK_DURATION = 1800;
const RANDOM_SYMBOL_FLIGHT_DURATION = 1350;
const COVER_DROP_DURATION = 800;
const DUEL_START_DELAY = 467;
const OUTCOME_FEEDBACK_DURATION = 1333;
const PLAYER_SHUFFLE_DURATION = 433;
const PLAYER_SHUFFLE_FRAME_DURATION = 60;
const PLAYER_MOVE_DURATION = 667;
const DUEL_STEP_DURATION = OUTCOME_FEEDBACK_DURATION + PLAYER_SHUFFLE_DURATION + PLAYER_MOVE_DURATION + 100;
const BONUS_POPUP_DELAY = 800;
const ROUND_WIN_DURATION = 2267;
const BONUS_FREE_SPINS = 7;
const BONUS_WHEEL_SECTIONS = 12;
const BONUS_SPIN_DURATION = 1700;
const BONUS_RESULT_DURATION = 1000;
const BONUS_MULTIPLIERS = [2, 3, 5, 8, 10];

type CoverKind = "regular" | "mystery";
type Phase = "loading" | "idle" | "dropping" | "feature" | "dueling" | "result" | "bonus";
type SymbolKind = "rock" | "paper" | "scissors" | "wild" | "scatter";
type PlayerSymbol = "rock" | "paper" | "scissors";
type Result = "won" | "lost" | "wild" | "scatter";
type BonusPhase = "ready" | "spinning" | "result" | "complete";
type DialogMode = "bonus-entry" | "bonus-result" | null;

interface Cell { cover: CoverKind; symbol: SymbolKind | null; result: Result | null; cleared: boolean; }
interface Player {
  symbol: PlayerSymbol;
  active: boolean;
  row: number;
  movingFromRow: number;
  shuffleStartedAt: number | null;
  moveStartedAt: number | null;
  nextSymbol: PlayerSymbol | null;
  clearAfterMove: { column: number; row: number } | null;
}
interface Feedback { column: number; row: number; label: "Yay!" | "Doh!"; startedAt: number; }
interface FeatureLanding { column: number; row: number; landsAt: number; }
interface BonusWheelSection { id: number; symbol: PlayerSymbol; }

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("The app container is missing.");

app.innerHTML = `
  <canvas id="game" aria-label="Arigatoe rock paper scissors slot game. Tap the reels to spin."></canvas>
  <div id="bonus-dialog" class="bonus-dialog" role="dialog" aria-modal="true" aria-live="polite" hidden>
    <div><p id="dialog-kicker" class="kicker">Scatter award</p><h1 id="dialog-title">Bonus Round Unlocked!</h1>
    <p id="dialog-copy"></p><button id="close-bonus" type="button">Start Bonus</button></div>
  </div>`;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const dialog = document.querySelector<HTMLDivElement>("#bonus-dialog")!;
const dialogKicker = document.querySelector<HTMLElement>("#dialog-kicker")!;
const dialogTitle = document.querySelector<HTMLElement>("#dialog-title")!;
const dialogCopy = document.querySelector<HTMLElement>("#dialog-copy")!;
const closeBonus = document.querySelector<HTMLButtonElement>("#close-bonus")!;
const ctx = canvas.getContext("2d")!;

const background = new Image();
const coverSheet = new Image();
const symbolSheet = new Image();
const randomFeature = new Image();
const bonusBackground = new Image();
const bonusWheel = new Image();
const bonusFrame = new Image();
const streakBar = new Image();
background.src = backgroundUrl;
coverSheet.src = coverSheetUrl;
symbolSheet.src = symbolSheetUrl;
randomFeature.src = randomFeatureUrl;
bonusBackground.src = bonusBackgroundUrl;
bonusWheel.src = bonusWheelUrl;
bonusFrame.src = bonusFrameUrl;
streakBar.src = streakBarUrl;

let phase: Phase = "loading";
let phaseStartedAt = performance.now();
let lastDuelAt = 0;
let duelRow = 0;
let spins = 0;
let totalReturned = 0;
let roundWin = 0;
let roundScatters = 0;
let cells: Cell[][] = [];
let players: Player[] = [];
let rowMultipliers: number[] = [];
let bonusQueued = false;
let feedback: Feedback[] = [];
let featureTriggered = false;
let featureStartedAt = 0;
let featureLandings: FeatureLanding[] = [];
let scatterPayoutSettled = false;
let dialogMode: DialogMode = null;
let bonusPhase: BonusPhase = "ready";
let bonusWheelSections: BonusWheelSection[] = [];
let bonusWheelRotation = 0;
let bonusSpinStartedAt = 0;
let bonusSpinFromRotation = 0;
let bonusSpinToRotation = 0;
let bonusSelectedSection = 0;
let bonusPlayerSymbol: PlayerSymbol = "rock";
let bonusSpinsUsed = 0;
let bonusStreak = 0;
let bonusAttempts = 2;
let bonusBaseWin = 0;
let bonusTotalWin = 0;

const playerSymbols: readonly PlayerSymbol[] = ["rock", "paper", "scissors"];

function randomChoice<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]!; }
function randomPlayerSymbol(): PlayerSymbol { return randomChoice(playerSymbols); }
function weightedCover(): CoverKind { return Math.random() < 0.75 ? "regular" : "mystery"; }
function revealedFor(cover: CoverKind): SymbolKind {
  return cover === "regular" ? randomChoice(["rock", "paper", "scissors"]) : Math.random() < 0.65 ? "wild" : "scatter";
}
function playerWins(player: PlayerSymbol, target: SymbolKind): boolean {
  const beatenBy: Record<PlayerSymbol, PlayerSymbol> = { rock: "scissors", paper: "rock", scissors: "paper" };
  return target === beatenBy[player];
}
function playerOwns(cell: Cell): boolean {
  return cell.result === "won" || cell.result === "wild" || cell.result === "scatter";
}
function scatterPayout(count: number): number {
  if (count >= 5) return 10;
  if (count === 4) return 5;
  if (count === 3) return 1;
  return 0;
}
function resetBoard(): void {
  cells = Array.from({ length: GRID.rows }, () => Array.from({ length: GRID.columns }, () => ({ cover: "regular", symbol: null, result: null, cleared: false })));
  players = []; rowMultipliers = []; roundWin = 0; roundScatters = 0; duelRow = 0; bonusQueued = false; feedback = [];
  featureTriggered = false; featureLandings = [];
  scatterPayoutSettled = false;
}
function startSpin(): void {
  if (phase !== "idle" && phase !== "result") return;
  spins += 1; roundWin = 0; roundScatters = 0; bonusQueued = false; feedback = [];
  featureTriggered = Math.random() < RANDOM_FEATURE_CHANCE;
  featureLandings = [];
  scatterPayoutSettled = false;
  cells = Array.from({ length: GRID.rows }, () => Array.from({ length: GRID.columns }, () => ({ cover: weightedCover(), symbol: null, result: null, cleared: false })));
  players = Array.from({ length: GRID.columns }, () => ({
    symbol: randomPlayerSymbol(), active: true, row: 0,
    movingFromRow: 0, shuffleStartedAt: null, moveStartedAt: null, nextSymbol: null, clearAfterMove: null,
  }));
  rowMultipliers = Array.from({ length: GRID.rows }, () => randomChoice(multipliers));
  duelRow = 0; phase = "dropping"; phaseStartedAt = performance.now();
}
function startDueling(now: number): void {
  phase = "dueling";
  lastDuelAt = now + DUEL_START_DELAY;
}
function startRandomFeature(now: number): void {
  const regularCells = cells.flatMap((line, row) => line.flatMap((cell, column) => cell.cover === "regular" ? [{ column, row }] : []));
  const landingCount = Math.min(randomChoice([3, 4, 5, 6, 7, 8, 9, 10]), regularCells.length);
  const selected = regularCells.sort(() => Math.random() - 0.5).slice(0, landingCount);
  featureStartedAt = now;
  featureLandings = selected.map(({ column, row }, index) => ({
    column,
    row,
    landsAt: 1800 + index * (5100 / Math.max(landingCount - 1, 1)),
  }));
  phase = "feature";
}
function applyFeatureLandings(elapsed: number): void {
  featureLandings.forEach((landing) => {
    if (elapsed >= landing.landsAt) {
      const cell = cells[landing.row]![landing.column]!;
      if (cell.cover === "regular") cell.cover = "mystery";
    }
  });
}
function resolveRow(row: number): void {
  let activePlayers = 0;
  const resolvedAt = performance.now();
  players.forEach((player, column) => {
    if (!player.active) return;
    const cell = cells[row]![column]!;
    cell.symbol = revealedFor(cell.cover);
    if (cell.symbol === "wild") cell.result = "wild";
    else if (cell.symbol === "scatter") { cell.result = "scatter"; roundScatters += 1; }
    else if (playerWins(player.symbol, cell.symbol)) cell.result = "won";
    else {
      cell.result = "lost";
      feedback.push({ column, row, label: "Doh!", startedAt: resolvedAt });
      player.active = false;
      return;
    }
    feedback.push({ column, row, label: "Yay!", startedAt: resolvedAt });
    player.movingFromRow = player.row;
    player.row = row + 1;
    player.clearAfterMove = { column, row };
    if (row < GRID.rows - 1) {
      player.shuffleStartedAt = resolvedAt + OUTCOME_FEEDBACK_DURATION;
      player.moveStartedAt = null;
      player.nextSymbol = randomPlayerSymbol();
    } else {
      player.shuffleStartedAt = null;
      player.moveStartedAt = resolvedAt;
      player.nextSymbol = null;
      cells[row]![column]!.cleared = true;
      player.clearAfterMove = null;
    }
    activePlayers += 1;
  });

  let lineWin = 0;
  // A completed horizontal line pays the row's displayed multiplier.
  if (cells[row]!.every(playerOwns)) lineWin += BET * rowMultipliers[row]!;
  // A completed vertical line settles only when its final cell has resolved.
  if (row === GRID.rows - 1) {
    for (let column = 0; column < GRID.columns; column += 1) {
      if (cells.every((line) => playerOwns(line[column]!))) lineWin += BET;
    }
  }
  roundWin += lineWin;
  totalReturned += lineWin;
  if (roundScatters >= 3) bonusQueued = true;
  if (row === GRID.rows - 1 || activePlayers === 0) finishRound();
}
function finishRound(): void {
  if (!scatterPayoutSettled) {
    const payout = scatterPayout(roundScatters);
    roundWin += payout;
    totalReturned += payout;
    scatterPayoutSettled = true;
  }
  phase = "result"; phaseStartedAt = performance.now();
  if (bonusQueued) window.setTimeout(showBonusEntry, BONUS_POPUP_DELAY);
}
function showBonusEntry(): void {
  dialogMode = "bonus-entry";
  dialogKicker.textContent = "Scatter award";
  dialogTitle.textContent = "Bonus Round Unlocked!";
  dialogCopy.textContent = `${roundScatters} scatters were awarded. You will be transferred to the bonus round after closing this popup.`;
  closeBonus.textContent = "Start Bonus";
  dialog.hidden = false;
  closeBonus.focus();
}
function buildBonusWheel(): BonusWheelSection[] {
  const symbols: PlayerSymbol[] = ["rock", "rock", "rock", "rock", "paper", "paper", "paper", "paper", "scissors", "scissors", "scissors", "scissors"];
  for (let index = symbols.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [symbols[index], symbols[swapIndex]] = [symbols[swapIndex]!, symbols[index]!];
  }
  return symbols.map((symbol, id) => ({ id, symbol }));
}
function startBonusRound(): void {
  bonusBaseWin = roundWin;
  bonusTotalWin = bonusBaseWin;
  bonusWheelSections = buildBonusWheel();
  bonusWheelRotation = 0;
  bonusSpinsUsed = 0;
  bonusStreak = 0;
  bonusAttempts = 2;
  bonusPlayerSymbol = randomPlayerSymbol();
  bonusPhase = "ready";
  phase = "bonus";
  startBonusSpin(performance.now());
}
function startBonusSpin(now: number): void {
  if (bonusPhase !== "ready" || bonusSpinsUsed >= BONUS_FREE_SPINS) return;
  bonusPlayerSymbol = randomPlayerSymbol();
  bonusSelectedSection = Math.floor(Math.random() * BONUS_WHEEL_SECTIONS);
  bonusSpinFromRotation = bonusWheelRotation;
  const sectionAngle = -Math.PI / 2 + bonusSelectedSection * ((Math.PI * 2) / BONUS_WHEEL_SECTIONS);
  const desiredRotation = Math.PI - sectionAngle;
  const turns = Math.ceil((bonusWheelRotation - desiredRotation) / (Math.PI * 2)) + 4 + Math.floor(Math.random() * 3);
  bonusSpinToRotation = desiredRotation + turns * Math.PI * 2;
  bonusSpinStartedAt = now;
  bonusPhase = "spinning";
}
function resolveBonusSpin(now: number): void {
  const wheelSymbol = bonusWheelSections[bonusSelectedSection]!.symbol;
  const won = playerWins(bonusPlayerSymbol, wheelSymbol);
  if (won) bonusStreak = Math.min(5, bonusStreak + 1);
  else if (bonusStreak < 5) {
    bonusStreak = 0;
    bonusAttempts = Math.max(0, bonusAttempts - 1);
  }
  bonusSpinsUsed += 1;
  bonusPhase = "result";
  bonusSpinStartedAt = now;
}
function finishBonusRound(): void {
  const multiplier = bonusStreak > 0 ? BONUS_MULTIPLIERS[Math.min(bonusStreak, 5) - 1]! : 1;
  bonusTotalWin = bonusBaseWin * multiplier;
  totalReturned += bonusTotalWin - bonusBaseWin;
  roundWin = bonusTotalWin;
  bonusPhase = "complete";
  dialogMode = "bonus-result";
  dialogKicker.textContent = "Bonus Round Complete";
  dialogTitle.textContent = `Final Multiplier x${multiplier}`;
  dialogCopy.textContent = `Your initial win of ${bonusBaseWin.toFixed(2)} has been multiplied to ${bonusTotalWin.toFixed(2)} units.`;
  closeBonus.textContent = "Return to Base Game";
  dialog.hidden = false;
  closeBonus.focus();
}
function returnToBaseGame(): void {
  dialogMode = null;
  resetBoard();
  phase = "idle";
  phaseStartedAt = performance.now();
}
function spriteSource(symbol: SymbolKind): number { return ["rock", "paper", "scissors", "wild", "scatter"].indexOf(symbol); }
function cellRect(column: number, row: number): { x: number; y: number; width: number; height: number } {
  return { x: GRID.x + column * (GRID.cellWidth + GRID.gapX), y: GRID.y + row * (GRID.cellHeight + GRID.gapY), width: GRID.cellWidth, height: GRID.cellHeight };
}
function drawSprite(sheet: HTMLImageElement, index: number, count: number, x: number, y: number, width: number, height: number): void {
  const sourceHeight = sheet.naturalHeight / count;
  ctx.drawImage(sheet, 0, sourceHeight * index, sheet.naturalWidth, sourceHeight, x, y, width, height);
}
function drawCover(kind: CoverKind, x: number, y: number, width: number, height: number): void { drawSprite(coverSheet, kind === "regular" ? 0 : 1, 2, x, y, width, height); }
function drawCell(cell: Cell, column: number, row: number, drop: number): void {
  const rect = cellRect(column, row); const y = rect.y - drop;
  if (cell.cleared) return;
  if (cell.symbol === null) { drawCover(cell.cover, rect.x, y, rect.width, rect.height); return; }
  drawSprite(symbolSheet, spriteSource(cell.symbol), 5, rect.x, rect.y, rect.width, rect.height);
  if (cell.result) {
    const color = cell.result === "lost" ? "#ef3545" : cell.symbol === "wild" ? "#ffd84b" : cell.symbol === "scatter" ? "#ff5cce" : "#4aff9d";
    ctx.save(); ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = cell.symbol === "wild" || cell.symbol === "scatter" ? 28 : 14; ctx.lineWidth = 5;
    ctx.strokeRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6); ctx.restore();
  }
}
function playerPosition(column: number, row: number): { x: number; y: number; width: number; height: number } {
  if (row === 0) return { x: GRID.x + column * (GRID.cellWidth + GRID.gapX) + 10, y: GRID.y - 80, width: GRID.cellWidth - 20, height: 68 };
  const target = cellRect(column, row - 1);
  return { x: target.x + 20, y: target.y + 34, width: 54, height: 54 };
}
function clearPromotedCell(player: Player): void {
  if (!player.clearAfterMove) return;
  cells[player.clearAfterMove.row]![player.clearAfterMove.column]!.cleared = true;
  player.clearAfterMove = null;
}
function drawPlayers(now: number): void {
  players.forEach((player, column) => {
    if (!player.active) return;
    const from = playerPosition(column, player.movingFromRow);
    const target = playerPosition(column, player.row);
    let displaySymbol: PlayerSymbol = player.symbol;
    if (player.shuffleStartedAt !== null) {
      const shuffleElapsed = now - player.shuffleStartedAt;
      if (shuffleElapsed < 0) {
        displaySymbol = player.symbol;
      } else if (shuffleElapsed < PLAYER_SHUFFLE_DURATION) {
        displaySymbol = playerSymbols[Math.floor(shuffleElapsed / PLAYER_SHUFFLE_FRAME_DURATION) % playerSymbols.length]!;
      } else {
        const moveStartedAt = player.shuffleStartedAt + PLAYER_SHUFFLE_DURATION;
        player.shuffleStartedAt = null;
        player.moveStartedAt = moveStartedAt;
        if (player.nextSymbol) player.symbol = player.nextSymbol;
        player.nextSymbol = null;
        clearPromotedCell(player);
        displaySymbol = player.symbol;
      }
    }
    const progress = player.shuffleStartedAt !== null ? 0 : player.moveStartedAt === null ? 1 : Math.min(1, (now - player.moveStartedAt) / PLAYER_MOVE_DURATION);
    const x = from.x + (target.x - from.x) * progress;
    const y = from.y + (target.y - from.y) * progress;
    const width = from.width + (target.width - from.width) * progress;
    const height = from.height + (target.height - from.height) * progress;
    if (progress === 1 && player.moveStartedAt !== null) {
      player.moveStartedAt = null;
      if (player.nextSymbol) player.symbol = player.nextSymbol;
      player.nextSymbol = null;
    }
    ctx.save(); ctx.shadowColor = "#ffe760"; ctx.shadowBlur = 16;
    if (player.movingFromRow > 0 || progress > 0) { ctx.fillStyle = "#161125d8"; ctx.beginPath(); ctx.arc(x + width / 2, y + height / 2, 32, 0, Math.PI * 2); ctx.fill(); }
    drawSprite(symbolSheet, spriteSource(displaySymbol), 5, x, y, width, height); ctx.restore();
  });
}
function drawMultipliers(): void {
  rowMultipliers.forEach((multiplier, row) => {
    const y = GRID.y + row * (GRID.cellHeight + GRID.gapY) + GRID.cellHeight / 2;
    ctx.save(); ctx.fillStyle = "#101125cc"; ctx.strokeStyle = "#ffd640"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(965, y - 22, 72, 44, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff5c7"; ctx.font = "bold 23px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`x${multiplier}`, 1001, y + 1); ctx.restore();
  });
}
function drawHud(): void {
  const rtp = spins === 0 ? 0 : (totalReturned / (spins * BET)) * 100;
  const labels = [["SPINS", String(spins)], ["BET", BET.toFixed(2)], ["WIN", roundWin.toFixed(2)], ["RETURN TO PLAYER", `${rtp.toFixed(1)}%`], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""]];
  labels.forEach(([label, value], index) => {
    const x = 78 + index * 98; const y = 1040;
    ctx.save(); ctx.fillStyle = label ? "#101421d9" : "#0a0c1388"; ctx.strokeStyle = label ? "#edb538" : "#6a523466"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, 91, 72, 10); ctx.fill(); ctx.stroke();
    if (label) { ctx.fillStyle = "#f8d574"; ctx.font = "700 10px system-ui"; ctx.textAlign = "center"; ctx.fillText(label, x + 45, y + 24); ctx.fillStyle = "white"; ctx.font = "700 16px system-ui"; ctx.fillText(value, x + 45, y + 51); }
    ctx.restore();
  });
}
function drawScatterCollector(now: number): void {
  if (roundScatters < 1) return;
  const iconX = 892;
  const iconY = 30;
  const iconSize = 132;
  const counterX = 1018;
  const counterY = 153;
  const pulse = (Math.sin(now / 145) + 1) / 2;
  const scale = 1 + 0.5 * pulse;
  const iconCenterX = iconX + iconSize / 2;
  const iconCenterY = iconY + iconSize / 2;
  ctx.save();
  ctx.translate(iconCenterX, iconCenterY); ctx.scale(scale, scale);
  ctx.shadowColor = "#ff58cf"; ctx.shadowBlur = 34 * scale;
  drawSprite(symbolSheet, spriteSource("scatter"), 5, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#271130e8"; ctx.strokeStyle = "#ff74da"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(counterX, counterY, 45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(counterX, counterY); ctx.scale(scale, scale);
  ctx.fillStyle = "#fff0fb"; ctx.shadowColor = "#ff55d2"; ctx.shadowBlur = 36 * scale;
  ctx.font = "900 60px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(roundScatters), 0, 5);
  ctx.restore();

  ctx.save();
  const payout = scatterPayout(roundScatters);
  if (payout > 0) {
    ctx.fillStyle = "#ffb6ec"; ctx.font = "900 22px system-ui";
    ctx.fillText(`WIN ${payout.toFixed(2)}`, counterX, 210);
  }
  ctx.restore();
}
function drawPrompt(): void {
  if (phase !== "idle" && phase !== "result") return;
  const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 360);
  ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = "#171224dc"; ctx.strokeStyle = "#ffe053"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(346, 958, 430, 58, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff4c4"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(phase === "idle" ? "TAP THE REELS TO PLAY" : `ROUND WIN ${roundWin.toFixed(2)} · TAP TO SPIN`, 561, 987); ctx.restore();
}
function drawWinAnimation(now: number): void {
  if (phase !== "result" || roundWin <= 0) return;
  const elapsed = now - phaseStartedAt;
  if (elapsed > ROUND_WIN_DURATION) return;
  const progress = elapsed / ROUND_WIN_DURATION;
  const alpha = Math.min(1, progress * 4, (1 - progress) * 5);
  const scale = 1 + Math.sin(Math.min(progress, 0.45) * Math.PI * 2) * 0.08;
  ctx.save(); ctx.translate(561, 620); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  ctx.fillStyle = "#15112be8"; ctx.strokeStyle = "#ffe25a"; ctx.lineWidth = 5; ctx.shadowColor = "#ffba24"; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.roundRect(-210, -72, 420, 144, 28); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ffe97a"; ctx.font = "900 34px system-ui"; ctx.textAlign = "center"; ctx.fillText("ROUND WIN!", 0, -15);
  ctx.fillStyle = "white"; ctx.font = "900 48px system-ui"; ctx.fillText(`${roundWin.toFixed(2)} UNITS`, 0, 38);
  ctx.restore();
}
function drawRandomFeature(now: number): void {
  if (phase !== "feature") return;
  const elapsed = now - featureStartedAt;
  applyFeatureLandings(elapsed);
  const scale = elapsed < RANDOM_FEATURE_GROW_DURATION
    ? 0.12 + 0.42 * (elapsed / RANDOM_FEATURE_GROW_DURATION)
    : elapsed < RANDOM_FEATURE_DURATION
      ? 0.54
      : 0.54 * Math.max(0, 1 - (elapsed - RANDOM_FEATURE_DURATION) / RANDOM_FEATURE_SHRINK_DURATION);
  const width = randomFeature.naturalWidth * scale;
  const height = randomFeature.naturalHeight * scale;
  const x = (WORLD.width - width) / 2;
  const y = 248 + (630 - height) / 2;
  ctx.save();
  ctx.shadowColor = "#ffe85c"; ctx.shadowBlur = 28;
  ctx.drawImage(randomFeature, x, y, width, height);
  ctx.restore();

  featureLandings.forEach((landing) => {
    const flightStartedAt = landing.landsAt - RANDOM_SYMBOL_FLIGHT_DURATION;
    if (elapsed < flightStartedAt || elapsed >= landing.landsAt) return;
    const progress = (elapsed - flightStartedAt) / RANDOM_SYMBOL_FLIGHT_DURATION;
    const target = cellRect(landing.column, landing.row);
    const startX = WORLD.width / 2 - 24;
    const startY = 584;
    const x = startX + (target.x - startX) * progress;
    const y = startY + (target.y - startY) * progress;
    const width = 48 + (target.width - 48) * progress;
    const height = 58 + (target.height - 58) * progress;
    ctx.save();
    ctx.shadowColor = "#d66cff"; ctx.shadowBlur = 18;
    drawCover("mystery", x, y, width, height);
    ctx.restore();
  });
}
function drawFeedback(now: number): void {
  feedback = feedback.filter((item) => now - item.startedAt < OUTCOME_FEEDBACK_DURATION);
  feedback.forEach((item) => {
    const age = (now - item.startedAt) / OUTCOME_FEEDBACK_DURATION;
    const rect = cellRect(item.column, item.row);
    const color = item.label === "Yay!" ? "#69ff9d" : "#ff6071";
    ctx.save();
    ctx.globalAlpha = Math.min(1, age * 8, (1 - age) * 7);
    ctx.fillStyle = "#161125d9";
    ctx.beginPath(); ctx.roundRect(rect.x + 8, rect.y + 39, rect.width - 16, 34, 14); ctx.fill();
    ctx.fillStyle = color; ctx.strokeStyle = "#171027"; ctx.lineWidth = 5;
    ctx.font = "900 26px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const y = rect.y + rect.height / 2 - age * 7;
    ctx.strokeText(item.label, rect.x + rect.width / 2, y);
    ctx.fillText(item.label, rect.x + rect.width / 2, y);
    ctx.restore();
  });
}
function drawBonusWheel(now: number): void {
  const centerX = 370;
  const centerY = 545;
  const size = 500;
  const radius = size / 2;
  ctx.save();
  ctx.translate(centerX, centerY); ctx.rotate(bonusWheelRotation);
  ctx.drawImage(bonusWheel, -radius, -radius, size, size);
  ctx.restore();

  bonusWheelSections.forEach((section) => {
    const angle = -Math.PI / 2 + section.id * ((Math.PI * 2) / BONUS_WHEEL_SECTIONS) + bonusWheelRotation;
    const x = centerX + Math.cos(angle) * 156;
    const y = centerY + Math.sin(angle) * 156;
    ctx.save();
    ctx.shadowColor = "#201039"; ctx.shadowBlur = 9;
    drawSprite(symbolSheet, spriteSource(section.symbol), 5, x - 35, y - 35, 70, 70);
    ctx.restore();
  });

  ctx.save();
  ctx.fillStyle = "#ffdb4c"; ctx.strokeStyle = "#3d1224"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(160, centerY); ctx.lineTo(110, centerY - 30); ctx.lineTo(110, centerY + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  if (bonusPhase === "spinning") {
    const progress = Math.min(1, (now - bonusSpinStartedAt) / BONUS_SPIN_DURATION);
    const eased = 1 - (1 - progress) ** 3;
    bonusWheelRotation = bonusSpinFromRotation + (bonusSpinToRotation - bonusSpinFromRotation) * eased;
    if (progress === 1) {
      bonusWheelRotation = bonusSpinToRotation;
      resolveBonusSpin(now);
    }
  }
}
function drawBonusPlayer(): void {
  const frameX = 680;
  const frameY = 285;
  const frameSize = 360;
  ctx.drawImage(bonusFrame, frameX, frameY, frameSize, frameSize);
  ctx.save();
  ctx.shadowColor = "#ffe86a"; ctx.shadowBlur = 22;
  drawSprite(symbolSheet, spriteSource(bonusPlayerSymbol), 5, frameX + 104, frameY + 104, 152, 152);
  ctx.restore();
}
function drawBonusStreakBar(): void {
  const x = 150;
  const y = 900;
  const width = 820;
  const height = 273;
  ctx.drawImage(streakBar, x, y, width, height);
  BONUS_MULTIPLIERS.forEach((multiplier, index) => {
    const lit = index < bonusStreak;
    const lightX = x + width * ((index + 0.5) / BONUS_MULTIPLIERS.length);
    const lightY = y + height / 2;
    ctx.save();
    ctx.fillStyle = lit ? "#ffe05d" : "#261a36cc";
    ctx.strokeStyle = lit ? "#fff3a4" : "#7b587b";
    ctx.shadowColor = lit ? "#ffc936" : "transparent"; ctx.shadowBlur = lit ? 22 : 0; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(lightX, lightY, 35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lit ? "#552311" : "#ded1e8"; ctx.font = "900 22px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`x${multiplier}`, lightX, lightY + 1);
    ctx.restore();
  });
}
function drawBonusStatus(): void {
  const remaining = BONUS_FREE_SPINS - bonusSpinsUsed;
  ctx.save();
  ctx.fillStyle = "#160f2bd9"; ctx.strokeStyle = "#ffd84f"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(810, 95, 250, 130, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f8d56a"; ctx.font = "800 18px system-ui"; ctx.textAlign = "center";
  ctx.fillText("FREE SPINS", 935, 133);
  ctx.fillStyle = "white"; ctx.font = "900 58px system-ui"; ctx.fillText(`${remaining} / ${BONUS_FREE_SPINS}`, 935, 190);
  ctx.restore();
}
function drawBonusPrompt(): void {
  if (bonusPhase !== "ready") return;
  ctx.save();
  ctx.fillStyle = "#1a1035e6"; ctx.strokeStyle = "#ffe05f"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(330, 730, 470, 66, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff4c7"; ctx.font = "900 25px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(bonusSpinsUsed === 0 ? "TAP TO START FREE SPINS" : "NEXT FREE SPIN STARTING...", 565, 763);
  ctx.restore();
}
function drawBonus(now: number): void {
  ctx.drawImage(bonusBackground, 0, 0, WORLD.width, WORLD.height);
  drawBonusWheel(now);
  drawBonusPlayer();
  drawBonusStreakBar();
  drawBonusStatus();
  drawBonusPrompt();
  if (bonusPhase === "result") {
    if (now - bonusSpinStartedAt >= BONUS_RESULT_DURATION) {
      if (bonusSpinsUsed >= BONUS_FREE_SPINS) finishBonusRound();
      else {
        bonusPhase = "ready";
        startBonusSpin(now);
      }
    }
  }
}
function draw(): void {
  const now = performance.now();
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  if (phase === "bonus") {
    drawBonus(now);
    requestAnimationFrame(draw);
    return;
  }
  ctx.drawImage(background, 0, 0, WORLD.width, WORLD.height);
  const dropProgress = phase === "dropping" ? Math.min(1, (now - phaseStartedAt) / COVER_DROP_DURATION) : 1;
  const drop = (1 - dropProgress) * 250;
  cells.forEach((row, rowIndex) => row.forEach((cell, column) => drawCell(cell, column, rowIndex, drop)));
  if (players.length) drawPlayers(now); if (rowMultipliers.length) drawMultipliers(); drawHud(); drawPrompt(); drawWinAnimation(now); drawFeedback(now); drawRandomFeature(now); drawScatterCollector(now);
  if (phase === "dropping" && dropProgress === 1) {
    if (featureTriggered) startRandomFeature(now);
    else startDueling(now);
  }
  if (phase === "feature" && now - featureStartedAt >= RANDOM_FEATURE_DURATION + RANDOM_FEATURE_SHRINK_DURATION) startDueling(now);
  if (phase === "dueling" && now >= lastDuelAt) { resolveRow(duelRow); duelRow += 1; lastDuelAt = now + DUEL_STEP_DURATION; }
  requestAnimationFrame(draw);
}
function resizeCanvas(): void {
  const bounds = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.height * ratio);
  ctx.setTransform((bounds.width * ratio) / WORLD.width, 0, 0, (bounds.height * ratio) / WORLD.height, 0, 0);
}
canvas.addEventListener("pointerdown", () => {
  if (phase === "bonus") startBonusSpin(performance.now());
  else startSpin();
});
closeBonus.addEventListener("click", () => {
  dialog.hidden = true;
  if (dialogMode === "bonus-entry") {
    dialogMode = null;
    startBonusRound();
  } else if (dialogMode === "bonus-result") {
    returnToBaseGame();
  }
});
window.addEventListener("resize", resizeCanvas);
Promise.all([background, coverSheet, symbolSheet, randomFeature, bonusBackground, bonusWheel, bonusFrame, streakBar].map((image) => new Promise<void>((resolve, reject) => {
  image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => reject(new Error("An artwork file could not be loaded.")), { once: true });
}))).then(() => { resetBoard(); phase = "idle"; resizeCanvas(); draw(); }).catch((error: unknown) => {
  app.textContent = error instanceof Error ? error.message : "Unable to load game artwork.";
});
