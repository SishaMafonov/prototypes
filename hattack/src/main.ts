import './style.css';
import backgroundUrl from './assets/background/main.png';
import lowUrl from './assets/symbols/low.png';
import midUrl from './assets/symbols/mid.png';
import highUrl from './assets/symbols/high.png';
import bonusUrl from './assets/symbols/bonus.png';
import {
  REEL_COUNT, ROW_COUNT, SYMBOLS, TOTAL_WAYS, evaluateWays, generateOpeningReels,
  generateReels, symbolAt, visibleGrid, createCascade, heartsForResult, placeHeartWilds,
  BET_CENTS, PAYOUT_CENTS, winCents, returnToPlayer,
  LOVE_METER_MAX, chargeLoveMeter, selectLoveArrows, createRemovalCascade, nextBoardAction,
} from './game';
import type { Cascade, HeartWilds, LoveArrows, Reel, Result, SlotSymbol } from './game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app element');

app.innerHTML = `
  <main class="game-shell">
    <div class="game-stage">
      <canvas id="game" tabindex="0" role="button" aria-label="Loading Heart Attack" aria-disabled="true"
        aria-describedby="game-status">Your browser needs canvas support to play Heart Attack.</canvas>
      <p id="loading" class="loading" role="status">Preparing your love life…</p>
      <dl class="stats-bar" aria-label="Session statistics">
        <div><dt>Bet</dt><dd id="stat-bet">1.00</dd></div>
        <div><dt>Rounds</dt><dd id="stat-rounds">0</dd></div>
        <div><dt>Total win</dt><dd id="stat-total">0.00</dd></div>
        <div><dt title="Win accumulated in the current or most recent round">Win / round</dt><dd id="stat-win">0.00</dd></div>
        <div><dt title="Total win divided by total bets">RTP</dt><dd id="stat-rtp">0.00%</dd></div>
      </dl>
    </div>
    <footer><span>1,024 ways to fall in love</span><button id="rules-button" type="button">How to play <span aria-hidden="true">↗</span></button></footer>
    <p id="game-status" class="sr-only" role="status" aria-live="polite"></p>
    <dialog id="rules" aria-labelledby="rules-title">
      <div class="dialog-heading"><span class="eyebrow">HEART ATTACK</span><button id="close-rules" aria-label="Close rules">×</button></div>
      <h1 id="rules-title">A match in any row.</h1>
      <p>Tap or click the artwork to spin. You can also focus the game and press Space or Enter.</p>
      <p>Match the same symbol on <strong>3, 4 or 5 consecutive reels, starting at the left</strong>. Any row counts. Matching positions multiply together: 2 × 1 × 3 is 6 winning ways.</p>
      <p><strong>Wins cascade.</strong> Winning symbols disappear, the symbols above fall down, and new symbols fill the top. Each refill gets another win check. The round continues until no winning combinations remain.</p>
      <p><strong>Hearts release Wilds.</strong> Only Mid and High wins charge the bottom hearts. The longest qualifying match across 3, 4 or 5 consecutive reels lights that many hearts. Once those cascades finish, each lit heart turns one random regular symbol into a Wild. New Mid or High wins can charge the hearts again. Low and standalone Wild wins still cascade, but do not charge hearts.</p>
      <p><strong>Love meter arrows.</strong> Each winning board lights one of the ten cells, from the bottom up. After cascades and heart Wilds finish, the meter fires: 1–5 cells fire 1–3 arrows, 6–8 fire 3–5, 9 fire 5–10, and 10 clear every regular symbol. Wilds and Scatters are protected. Charge stays lit. If the refill creates new wins, resolve their cascades and heart awards, then fire again. Repeat until an arrow refill produces no win. Each new spin resets the meter.</p>
      <div class="rule-cards"><div><strong>WILD</strong><p>Up to three per generated reel strip, with additional Wilds from lit hearts. Cascade refills do not draw new Wilds. Substitutes for every regular symbol. Three or more consecutive Wild reels also win.</p></div><div><strong>SCATTER</strong><p>At most one per reel, including cascade refills. Reserved for the next phase: three or more anywhere form its trigger signal. Scatters stay on the reels through cascades and arrows, pay nothing, and do not charge hearts or the love meter. Wilds do not substitute for Scatters.</p></div></div>
      <h2>Payout per winning way</h2>
      <table class="paytable"><thead><tr><th scope="col">Symbol</th><th scope="col">3 reels</th><th scope="col">4 reels</th><th scope="col">5 reels</th></tr></thead>
        <tbody>${(['low', 'mid', 'high'] as const).map((category) => `<tr><th scope="row">${category}</th>${([3, 4, 5] as const).map((length) => `<td>${(PAYOUT_CENTS[category][length] / 100).toFixed(2)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <p>Each winning way pays the listed amount at a fixed bet of <strong>1.00</strong>. Cascade and heart-Wild wins add to the same round. Wild substitutes use the matched symbol's payout. Standalone Wild ways have no payout. Scatters are trigger symbols, not winning combinations.</p>
      <p><strong>Session statistics:</strong> rounds count each spin once. Win / round shows the current or most recent round's total. RTP is total win divided by rounds × 1.00, shown as a percentage. Statistics update as wins appear and reset when you reload.</p>
      <p class="fine-print">5 reels × 4 rows = ${TOTAL_WAYS.toLocaleString()} ways. All amounts are prototype credits; there are no cash bets or bonus rounds.</p>
    </dialog>
  </main>`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable');
const ctx: CanvasRenderingContext2D = context;
const status = document.querySelector<HTMLParagraphElement>('#game-status')!;
const loading = document.querySelector<HTMLParagraphElement>('#loading')!;
const stats = {
  bet: document.querySelector<HTMLElement>('#stat-bet')!,
  rounds: document.querySelector<HTMLElement>('#stat-rounds')!,
  total: document.querySelector<HTMLElement>('#stat-total')!,
  win: document.querySelector<HTMLElement>('#stat-win')!,
  rtp: document.querySelector<HTMLElement>('#stat-rtp')!,
};
const dialog = document.querySelector<HTMLDialogElement>('#rules')!;
const rulesButton = document.querySelector<HTMLButtonElement>('#rules-button')!;
rulesButton.addEventListener('click', () => dialog.showModal());
document.querySelector('#close-rules')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => rulesButton.focus());

// Portrait keeps the original composition. Wide windows recompose the same art
// into a landscape scene, giving the reel board most of the available height.
const ART = { width: 941, height: 1672 };
const GRID = { x: 41, y: 594, pitchX: 150, pitchY: 159, width: 138, height: 148 };
const BOARD_CROP = { x: 14, y: 510, width: 785, height: 735 };
const WIDE_BOARD = { x: 610, y: 24, scale: 1.04 };
const METER_CROP = { x: 794, y: 424, width: 147, height: 864 };
const WIDE_METER = { x: 1434, y: 22, scale: 0.96 };
// Interior bounds of the ten artwork plaques, ordered from bottom to top.
const METER_CELLS = [
  { x: 818, y: 1132, width: 93, height: 69 },
  { x: 818, y: 1057, width: 93, height: 73 },
  { x: 818, y: 983, width: 93, height: 70 },
  { x: 818, y: 911, width: 93, height: 69 },
  { x: 818, y: 840, width: 93, height: 68 },
  { x: 818, y: 772, width: 93, height: 64 },
  { x: 818, y: 704, width: 93, height: 63 },
  { x: 818, y: 638, width: 93, height: 62 },
  { x: 816, y: 563, width: 97, height: 70 },
  { x: 817, y: 480, width: 92, height: 75 },
];
const wideLayout = window.matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)');
function getScene() {
  if (!wideLayout.matches) return { ...ART, wide: false, grid: GRID, heartY: 1310 };
  return {
    width: 1600, height: 900, wide: true,
    heartY: WIDE_BOARD.y + BOARD_CROP.height * WIDE_BOARD.scale + 42,
    grid: {
      x: WIDE_BOARD.x + (GRID.x - BOARD_CROP.x) * WIDE_BOARD.scale,
      y: WIDE_BOARD.y + (GRID.y - BOARD_CROP.y) * WIDE_BOARD.scale,
      pitchX: GRID.pitchX * WIDE_BOARD.scale,
      pitchY: GRID.pitchY * WIDE_BOARD.scale,
      width: GRID.width * WIDE_BOARD.scale,
      height: GRID.height * WIDE_BOARD.scale,
    },
  };
}
let scene = getScene();
const sprites = new Map<string, HTMLCanvasElement>();
let background: HTMLImageElement;
let reels: Reel[] = [];
let board: SlotSymbol[][] = [];
let result: Result;
let ready = false;
let spinning = false;
type Phase = 'idle' | 'spinning' | 'celebrating' | 'removing' | 'falling' | 'adding-wilds' | 'firing-arrows';
let phase: Phase = 'idle';
let phaseStarted = 0;
let cascade: Cascade | undefined;
let removedKeys = new Set<string>();
let cascadeCount = 0;
let winCount = 0;
let loveCharge = 0;
let loveArrows: LoveArrows | undefined;
let arrowsPending = false;
let arrowBursts = 0;
let arrowTargetsCleared = 0;
let removalSource: 'win' | 'arrows' = 'win';
let roundWays = 0;
let litHearts = 0;
let wildRelease: HeartWilds | undefined;
let wildsAdded = 0;
let round = 0;
let totalWinCents = 0;
let roundWinCents = 0;
let lastWinAt = 0;
let frameId = 0;
let pointer = { x: ART.width / 2, y: ART.height / 2 };
let ripple: { x: number; y: number; started: number } | undefined;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

interface Motion {
  sequence: SlotSymbol[];
  from: number;
  to: number;
  position: number;
  start: number;
  duration: number;
  settled: boolean;
}
let motions: Motion[] = [];

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function buildSymbolMap(sheets: Record<SlotSymbol['sheet'], HTMLImageElement>): void {
  for (const symbol of SYMBOLS) {
    const sheet = sheets[symbol.sheet];
    const frameWidth = sheet.naturalWidth / (symbol.sheet === 'bonus' ? 2 : 6);
    const frame = document.createElement('canvas');
    frame.width = frameWidth;
    frame.height = sheet.naturalHeight;
    const frameCtx = frame.getContext('2d')!;
    frameCtx.drawImage(sheet, symbol.frame * frameWidth, 0, frameWidth, sheet.naturalHeight,
      0, 0, frameWidth, sheet.naturalHeight);
    // Trim transparent padding after splitting equal-width frames so large blank
    // top/bottom margins in the regular sheets do not shrink the visible art.
    const pixels = frameCtx.getImageData(0, 0, frame.width, frame.height).data;
    let left = frame.width, top = frame.height, right = 0, bottom = 0;
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        if (pixels[(y * frame.width + x) * 4 + 3] > 24) {
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
    }
    const sprite = document.createElement('canvas');
    sprite.width = GRID.width * 2;
    sprite.height = GRID.height * 2;
    const spriteCtx = sprite.getContext('2d')!;
    const width = right - left + 1;
    const height = bottom - top + 1;
    const scale = Math.min((sprite.width - 8) / width, (sprite.height - 8) / height);
    spriteCtx.drawImage(frame, left, top, width, height,
      (sprite.width - width * scale) / 2, (sprite.height - height * scale) / 2, width * scale, height * scale);
    sprites.set(symbol.id, sprite);
  }
}

function resize(): void {
  scene = getScene();
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  requestDraw();
}
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize', resize);
wideLayout.addEventListener('change', resize);

function text(value: string, x: number, y: number, size: number, color = '#fff2dc'): void {
  ctx.font = `700 ${size}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function drawReel(column: number, now: number): void {
  const grid = scene.grid;
  const motion = motions[column];
  const x = grid.x + column * grid.pitchX;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, grid.y, grid.width, grid.pitchY * (ROW_COUNT - 1) + grid.height, 14);
  ctx.clip();
  if (motion && !motion.settled) {
    ctx.fillStyle = '#580b4250';
    ctx.fillRect(x, grid.y, grid.width, grid.pitchY * ROW_COUNT);
  }
  if (spinning) {
    const position = motion && !motion.settled ? motion.position : reels[column].stop;
    const strip = motion && !motion.settled ? motion.sequence : reels[column].strip;
    const index = Math.floor(position);
    const fraction = position - index;
    for (let row = -1; row <= ROW_COUNT; row++) {
      const symbol = symbolAt(strip, index + row);
      const y = grid.y + (row - fraction) * grid.pitchY;
      ctx.drawImage(sprites.get(symbol.id)!, x, y, grid.width, grid.height);
    }
  } else if (phase === 'falling' && cascade) {
    const progress = phaseProgress(now, 'falling');
    const eased = reducedMotion.matches ? 1 : 1 - (1 - progress) ** 3;
    for (const drop of cascade.drops.filter((entry) => entry.reel === column)) {
      const row = drop.fromRow + (drop.toRow - drop.fromRow) * eased;
      ctx.drawImage(sprites.get(drop.symbol.id)!, x, grid.y + row * grid.pitchY, grid.width, grid.height);
    }
  } else {
    const removal = phase === 'removing' ? phaseProgress(now, 'removing') : 0;
    for (let row = 0; row < ROW_COUNT; row++) {
      const disappearing = phase === 'removing' && removedKeys.has(`${column}-${row}`);
      const scale = disappearing && !reducedMotion.matches ? 1 - removal * 0.8 : 1;
      ctx.save();
      ctx.globalAlpha = disappearing ? 1 - removal : 1;
      ctx.drawImage(sprites.get(board[column][row].id)!,
        x + grid.width * (1 - scale) / 2, grid.y + row * grid.pitchY + grid.height * (1 - scale) / 2,
        grid.width * scale, grid.height * scale);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawHighlights(now: number): void {
  if (spinning || phase === 'removing' || phase === 'falling' || !result || !result.totalWays) return;
  const intensity = reducedMotion.matches ? 1 : 0.7 + Math.sin((now - lastWinAt) / 230) * 0.3;
  const cells = new Map<string, { reel: number; row: number }>();
  for (const win of result.wins) for (const cell of win.cells) cells.set(`${cell.reel}-${cell.row}`, cell);
  ctx.save();
  const grid = scene.grid;
  for (const cell of cells.values()) {
    ctx.strokeStyle = '#ffe891';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12 * intensity;
    ctx.lineWidth = 4;
    const x = grid.x + cell.reel * grid.pitchX;
    const y = grid.y + cell.row * grid.pitchY;
    ctx.fillStyle = `rgba(255, 225, 127, ${0.07 * intensity})`;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, grid.width - 6, grid.height - 6, 14);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function resultTitle(): string {
  if (roundWays) return `${roundWays} winning ${roundWays === 1 ? 'way' : 'ways'}!`;
  return round === 0 ? 'Make your first move.' : 'No match. Another date?';
}

function updateStatistics(): void {
  stats.bet.textContent = (BET_CENTS / 100).toFixed(2);
  stats.rounds.textContent = round.toLocaleString();
  stats.total.textContent = (totalWinCents / 100).toFixed(2);
  stats.win.textContent = (roundWinCents / 100).toFixed(2);
  stats.rtp.textContent = `${(returnToPlayer(totalWinCents, round) * 100).toFixed(2)}%`;
}

function drawBackground(): void {
  if (!scene.wide) {
    ctx.drawImage(background, 0, 0, ART.width, ART.height);
    return;
  }
  // Use the lower scenery as a landscape backdrop, then place the title art
  // and original board separately. The reel frame and symbols scale identically.
  ctx.drawImage(background, 86, 1240, 768, 432, 0, 0, scene.width, scene.height);
  const shade = ctx.createLinearGradient(0, 0, scene.width, scene.height);
  shade.addColorStop(0, '#260d26de');
  shade.addColorStop(0.6, '#1c081ad9');
  shade.addColorStop(1, '#3b1026a6');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, scene.width, scene.height);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(24, 24, 578, 335, 24);
  ctx.clip();
  ctx.drawImage(background, 0, 0, 941, 545, 24, 24, 578, 335);
  ctx.restore();
  text('Any row. Every reel.', 313, 434, 43, '#ffe0a6');
  text('Match 3+ reels from the left', 313, 479, 24, '#ffc0d7');
  // Follow the crest silhouette so the crop does not repeat fragments of the
  // portrait title above the landscape board.
  ctx.save();
  ctx.beginPath();
  const edge = [
    [14, 576], [285, 576], [300, 555], [320, 536], [358, 536],
    [371, 519], [394, 513], [417, 515], [438, 513], [459, 522],
    [469, 536], [508, 536], [534, 555], [550, 576],
    [799, 576], [799, 1245], [14, 1245],
  ];
  edge.forEach(([x, y], index) => {
    const sceneX = WIDE_BOARD.x + (x - BOARD_CROP.x) * WIDE_BOARD.scale;
    const sceneY = WIDE_BOARD.y + (y - BOARD_CROP.y) * WIDE_BOARD.scale;
    if (index === 0) ctx.moveTo(sceneX, sceneY);
    else ctx.lineTo(sceneX, sceneY);
  });
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(background, BOARD_CROP.x, BOARD_CROP.y, BOARD_CROP.width, BOARD_CROP.height,
    WIDE_BOARD.x, WIDE_BOARD.y, BOARD_CROP.width * WIDE_BOARD.scale, BOARD_CROP.height * WIDE_BOARD.scale);
  ctx.restore();
  // Reuse the complete love meter from the portrait artwork on desktop.
  ctx.drawImage(background, METER_CROP.x, METER_CROP.y, METER_CROP.width, METER_CROP.height,
    WIDE_METER.x, WIDE_METER.y, METER_CROP.width * WIDE_METER.scale, METER_CROP.height * WIDE_METER.scale);
}

function drawHud(): void {
  const hud = scene.wide
    ? { x: 40, y: 547, width: 546, height: 211, headingY: 596, resultY: 653, actionY: 716 }
    : { x: 78, y: 1400, width: 785, height: 184, headingY: 1442, resultY: 1491, actionY: 1548 };
  const center = hud.x + hud.width / 2;
  ctx.save();
  ctx.fillStyle = '#23071de6';
  ctx.strokeStyle = '#ffacb966';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(hud.x, hud.y, hud.width, hud.height, 32);
  ctx.fill(); ctx.stroke();
  text('1,024 WAYS  ·  LEFT TO RIGHT', center, hud.headingY, 23, '#ffb7ce');
  const title = spinning ? 'Looking for a match…' : resultTitle();
  // Fit long results inside the narrower landscape status panel.
  ctx.font = '700 34px "Trebuchet MS", sans-serif';
  const size = Math.min(34, 34 * (hud.width - 36) / ctx.measureText(title).width);
  text(title, center, hud.resultY, size);
  const action = phase === 'spinning' ? 'LOVE TAKES A MOMENT'
    : phase === 'celebrating' ? `WIN ${winCount} · CASCADE INCOMING`
    : phase === 'removing' ? removalSource === 'arrows' ? 'LOVE ARROWS · CLEARING SYMBOLS' : `CASCADE ${cascadeCount} · CLEARING MATCHES`
    : phase === 'falling' ? `CASCADE ${cascadeCount} · SYMBOLS FALLING`
    : phase === 'adding-wilds' ? `${wildRelease?.placements.length ?? 0} HEART WILDS · ANOTHER CHANCE`
    : phase === 'firing-arrows' ? loveArrows?.charge === LOVE_METER_MAX ? 'FULL LOVE · CLEARING REGULAR SYMBOLS' : `${loveArrows?.targets.length ?? 0} LOVE ${loveArrows?.targets.length === 1 ? 'ARROW' : 'ARROWS'} · ANOTHER CHANCE`
    : cascadeCount ? `${cascadeCount} ${cascadeCount === 1 ? 'CASCADE' : 'CASCADES'} · ${scene.wide ? 'CLICK' : 'TAP'} TO SPIN`
    : scene.wide ? 'CLICK / SPACE TO SPIN' : 'TAP / CLICK TO SPIN';
  ctx.font = '700 27px "Trebuchet MS", sans-serif';
  const actionSize = Math.min(27, 27 * (hud.width - 36) / ctx.measureText(action).width);
  text(action, center, hud.actionY, actionSize, '#ffd77a');
  ctx.restore();
}

function heartPosition(index: number) {
  return { x: scene.grid.x + scene.grid.width / 2 + index * scene.grid.pitchX, y: scene.heartY - 8 };
}

function drawHeartBar(now: number): void {
  for (let index = 0; index < REEL_COUNT; index++) {
    const center = heartPosition(index);
    const lit = index < litHearts;
    const pulse = lit && !reducedMotion.matches ? 1 + Math.sin(now / 180) * 0.035 : 1;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(pulse, pulse);
    const fill = ctx.createLinearGradient(0, -34, 0, 28);
    fill.addColorStop(0, lit ? '#fff0bd' : '#705f69');
    fill.addColorStop(0.35, lit ? '#ff4e9c' : '#352a33');
    fill.addColorStop(1, lit ? '#b50b56' : '#17111a');
    ctx.fillStyle = fill;
    ctx.strokeStyle = lit ? '#ffe095' : '#9c7080';
    ctx.lineWidth = lit ? 3 : 2;
    ctx.shadowColor = '#ff3f94';
    ctx.shadowBlur = lit ? 24 : 0;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.bezierCurveTo(-8, 20, -48, -4, -38, -22);
    ctx.bezierCurveTo(-26, -40, -6, -32, 0, -20);
    ctx.bezierCurveTo(6, -32, 26, -40, 38, -22);
    ctx.bezierCurveTo(48, -4, 8, 20, 0, 28);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function drawHeartWilds(now: number): void {
  if (phase !== 'adding-wilds' || !wildRelease) return;
  const grid = scene.grid;
  for (let index = 0; index < wildRelease.placements.length; index++) {
    const cell = wildRelease.placements[index];
    const start = heartPosition(index);
    const target = { x: grid.x + cell.reel * grid.pitchX + grid.width / 2,
      y: grid.y + cell.row * grid.pitchY + grid.height / 2 };
    const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (now - phaseStarted - index * 70) / 700));
    const eased = 1 - (1 - progress) ** 2;
    const x = start.x + (target.x - start.x) * eased;
    const y = start.y + (target.y - start.y) * eased - Math.sin(progress * Math.PI) * 70;
    const width = 46 + (grid.width - 46) * eased;
    const height = 49 + (grid.height - 49) * eased;
    ctx.save();
    ctx.shadowColor = '#ffd871';
    ctx.shadowBlur = 16;
    ctx.drawImage(sprites.get('wild')!, x - width / 2, y - height / 2, width, height);
    ctx.restore();
  }
}

function meterPoint(x: number, y: number) {
  return scene.wide ? {
    x: WIDE_METER.x + (x - METER_CROP.x) * WIDE_METER.scale,
    y: WIDE_METER.y + (y - METER_CROP.y) * WIDE_METER.scale,
  } : { x, y };
}

function drawLoveMeter(now: number): void {
  const scale = scene.wide ? WIDE_METER.scale : 1;
  for (let index = 0; index < METER_CELLS.length; index++) {
    const cell = METER_CELLS[index];
    const position = meterPoint(cell.x, cell.y);
    const lit = index < loveCharge;
    ctx.save();
    ctx.fillStyle = lit ? '#ffd66b28' : '#100619a6';
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, cell.width * scale, cell.height * scale, 16 * scale);
    ctx.fill();
    if (lit) {
      ctx.strokeStyle = '#fff3a3';
      ctx.lineWidth = 4 * scale;
      ctx.shadowColor = '#ffca4e';
      ctx.shadowBlur = reducedMotion.matches ? 10 : 15 + Math.sin(now / 180) * 4;
      ctx.stroke();
    }
    ctx.restore();
  }
  const counter = meterPoint(864, 1278);
  ctx.save();
  ctx.fillStyle = '#23071de6';
  ctx.beginPath();
  ctx.roundRect(counter.x - 42 * scale, counter.y - 27 * scale, 84 * scale, 35 * scale, 12 * scale);
  ctx.fill();
  text(`${loveCharge}/10`, counter.x, counter.y, 25 * scale, '#ffe0a6');
  ctx.restore();
}

function drawLoveArrows(now: number): void {
  if (phase !== 'firing-arrows' || !loveArrows) return;
  const plaque = METER_CELLS[loveArrows.charge - 1];
  const start = meterPoint(plaque.x + plaque.width / 2, plaque.y + plaque.height / 2);
  const grid = scene.grid;
  loveArrows.targets.forEach((cell, index) => {
    const target = { x: grid.x + cell.reel * grid.pitchX + grid.width / 2,
      y: grid.y + cell.row * grid.pitchY + grid.height / 2 };
    const elapsed = now - phaseStarted - index * 28;
    if (elapsed < 0 && !reducedMotion.matches) return;
    const progress = reducedMotion.matches ? 1 : Math.min(1, elapsed / 600);
    const x = start.x + (target.x - start.x) * progress;
    const y = start.y + (target.y - start.y) * progress - Math.sin(progress * Math.PI) * 55;
    ctx.save();
    ctx.shadowColor = '#ffcc66';
    ctx.shadowBlur = 18;
    if (progress === 1) {
      ctx.strokeStyle = '#ffe6a0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(target.x - grid.width / 2 + 4, target.y - grid.height / 2 + 4,
        grid.width - 8, grid.height - 8, 14);
      ctx.stroke();
    } else {
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(target.y - start.y - Math.cos(progress * Math.PI) * 55 * Math.PI,
        target.x - start.x));
      ctx.strokeStyle = '#ffe6a0';
      ctx.fillStyle = '#ff5293';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-58, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-56, 0); ctx.lineTo(-69, -12); ctx.moveTo(-48, 0); ctx.lineTo(-61, 12); ctx.stroke();
    }
    ctx.restore();
  });
}

function draw(now: number): void {
  ctx.setTransform(canvas.width / scene.width, 0, 0, canvas.height / scene.height, 0, 0);
  ctx.clearRect(0, 0, scene.width, scene.height);
  if (!ready) return;
  drawBackground();
  drawLoveMeter(now);
  for (let column = 0; column < REEL_COUNT; column++) drawReel(column, now);
  drawHighlights(now);
  drawHeartBar(now);
  drawHeartWilds(now);
  drawLoveArrows(now);
  drawHud();
  if (ripple) {
    const age = (now - ripple.started) / 650;
    if (age >= 1 || reducedMotion.matches) ripple = undefined;
    else {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 223, 167, ${1 - age})`;
      ctx.lineWidth = 4 * (1 - age);
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 14 + age * 100, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function announceResult(): void {
  status.textContent = `${resultTitle()} ${cascadeCount ? `${cascadeCount} ${cascadeCount === 1 ? 'cascade' : 'cascades'} completed.` : ''} ${wildsAdded ? `${wildsAdded} heart Wilds added.` : ''} Tap or click to spin${round ? ' again' : ''}.`;
  canvas.setAttribute('aria-label', `Heart Attack. ${resultTitle()} Spin reels`);
  canvas.setAttribute('aria-disabled', 'false');
  canvas.dataset.spinning = 'false';
  if (round > 0) status.textContent += ` Round win ${(roundWinCents / 100).toFixed(2)} credits. Session total ${(totalWinCents / 100).toFixed(2)} credits. RTP ${(returnToPlayer(totalWinCents, round) * 100).toFixed(2)} percent.`;
  if (round > 0) status.textContent += ` Love meter ${loveCharge} of 10. ${arrowBursts ? `${arrowBursts} arrow ${arrowBursts === 1 ? 'burst' : 'bursts'}. ${arrowTargetsCleared} arrow targets cleared.` : ''} The next spin resets the meter.`;
}

function setPhase(next: Phase, now: number): void {
  phase = next;
  phaseStarted = now;
  canvas.dataset.phase = next;
  canvas.dataset.spinning = String(next === 'spinning');
  canvas.dataset.hearts = String(litHearts);
  canvas.dataset.wildsAdded = String(wildsAdded);
  canvas.dataset.round = String(round);
  canvas.dataset.loveMeter = String(loveCharge);
  canvas.dataset.arrowTargets = String(loveArrows?.targets.length ?? 0);
  canvas.dataset.arrowsFired = String(arrowBursts > 0);
  canvas.dataset.arrowsPending = String(arrowsPending);
  canvas.dataset.arrowBursts = String(arrowBursts);
  canvas.dataset.arrowTargetsCleared = String(arrowTargetsCleared);
  canvas.dataset.removalSource = removalSource;
  canvas.dataset.scatterCount = String(next === 'spinning' ? 0 : result.scatterCount);
  canvas.dataset.scatterTrigger = String(next !== 'spinning' && result.scatterTrigger);
  canvas.setAttribute('aria-disabled', String(next !== 'idle'));
  if (next !== 'idle') canvas.setAttribute('aria-label', `Heart Attack. ${next === 'spinning' ? 'Reels spinning' : next === 'adding-wilds' ? `Releasing ${wildRelease?.placements.length ?? 0} heart Wilds` : next === 'firing-arrows' ? `Firing ${loveArrows?.targets.length ?? 0} love ${loveArrows?.targets.length === 1 ? 'arrow' : 'arrows'}` : `Cascade ${cascadeCount + (next === 'celebrating' ? 1 : 0)} ${next}`}`);
}

function phaseProgress(now: number, step: 'celebrating' | 'removing' | 'falling' | 'adding-wilds' | 'firing-arrows'): number {
  const duration = reducedMotion.matches ? { celebrating: 220, removing: 100, falling: 120, 'adding-wilds': 160, 'firing-arrows': 180 }[step]
    : { celebrating: 900, removing: 330, falling: 650, 'adding-wilds': 1050, 'firing-arrows': 1200 }[step];
  return Math.max(0, Math.min(1, (now - phaseStarted) / duration));
}

function checkBoard(now: number): void {
  result = evaluateWays(board);
  const payout = winCents(result);
  roundWinCents += payout;
  totalWinCents += payout;
  updateStatistics();
  roundWays += result.totalWays;
  const action = nextBoardAction(result, litHearts, loveCharge, arrowsPending);
  if (action === 'win') {
    winCount++;
    loveCharge = chargeLoveMeter(loveCharge, result);
    // Only a newly evaluated win earns another burst; a losing refill cannot.
    arrowsPending = true;
    litHearts = Math.max(litHearts, heartsForResult(result));
    lastWinAt = now;
    setPhase('celebrating', now);
    const wins = result.wins.map((win) => `${win.symbol.name}: ${win.ways} ${win.ways === 1 ? 'way' : 'ways'} on ${win.reelCount} reels.`).join(' ');
    status.textContent = `Win ${winCount}. ${wins} Win ${(payout / 100).toFixed(2)} credits. Round win ${(roundWinCents / 100).toFixed(2)}. Total ${roundWays} winning ways. ${litHearts} hearts charged. Love meter ${loveCharge} of 10. Winning symbols will clear.`;
  } else if (action === 'heart-wilds') {
    // Resolve every natural cascade before spending this cycle's heart award.
    wildRelease = placeHeartWilds(board, litHearts);
    setPhase('adding-wilds', now);
    status.textContent = `${litHearts} lit hearts release ${wildRelease.placements.length} Wilds. Another win check follows.`;
  } else if (action === 'love-arrows') {
    loveArrows = selectLoveArrows(board, loveCharge);
    // Keep charge, but consume this opportunity before evaluating the refill.
    arrowsPending = false;
    if (loveArrows.targets.length > 0) {
      arrowBursts++;
      setPhase('firing-arrows', now);
      status.textContent = `Love meter ${loveCharge} of 10. ${loveArrows.charge === LOVE_METER_MAX ? 'Full love clears every regular symbol.' : `Firing ${loveArrows.targets.length} ${loveArrows.targets.length === 1 ? 'arrow' : 'arrows'}.`} Wilds and Scatters are protected.`;
    } else {
      setPhase('idle', now);
      announceResult();
    }
  } else {
    setPhase('idle', now);
    announceResult();
  }
}

function tick(now: number): void {
  frameId = 0;
  if (spinning) {
    for (const motion of motions) {
      const progress = Math.max(0, Math.min(1, (now - motion.start) / motion.duration));
      const eased = 1 - (1 - progress) ** 3;
      motion.position = reducedMotion.matches && progress < 1
        ? motion.from : motion.from + (motion.to - motion.from) * eased;
      motion.settled = progress === 1;
    }
    if (motions.every((motion) => motion.settled)) {
      spinning = false;
      board = visibleGrid(reels);
      checkBoard(now);
    }
  } else if (phase === 'celebrating' && phaseProgress(now, 'celebrating') === 1) {
    removalSource = 'win';
    cascade = createCascade(board, result);
    removedKeys = new Set(cascade.removed.map((cell) => `${cell.reel}-${cell.row}`));
    cascadeCount++;
    setPhase('removing', now);
    status.textContent = `Cascade ${cascadeCount}. Removing ${cascade.removed.length} winning symbols.`;
  } else if (phase === 'removing' && phaseProgress(now, 'removing') === 1) {
    setPhase('falling', now);
    status.textContent = `Cascade ${cascadeCount}. Symbols falling. Total ${roundWays} winning ways.`;
  } else if (phase === 'falling' && phaseProgress(now, 'falling') === 1 && cascade) {
    board = cascade.grid;
    cascade = undefined;
    removedKeys.clear();
    checkBoard(now);
  } else if (phase === 'adding-wilds' && phaseProgress(now, 'adding-wilds') === 1 && wildRelease) {
    board = wildRelease.grid;
    wildsAdded += wildRelease.placements.length;
    wildRelease = undefined;
    // Spend once before checking for new wins; a losing release cannot recharge itself.
    litHearts = 0;
    checkBoard(now);
  } else if (phase === 'firing-arrows' && phaseProgress(now, 'firing-arrows') === 1 && loveArrows) {
    cascade = createRemovalCascade(board, loveArrows.targets);
    arrowTargetsCleared += cascade.removed.length;
    removedKeys = new Set(cascade.removed.map((cell) => `${cell.reel}-${cell.row}`));
    removalSource = 'arrows';
    cascadeCount++;
    setPhase('removing', now);
    status.textContent = `Love arrows removing ${cascade.removed.length} regular symbols. Wilds and Scatters survive. Symbols will fall and refill.`;
  }
  draw(now);
  const celebrating = result && result.totalWays > 0 && now - lastWinAt < 4000;
  if (phase !== 'idle' || ripple || (celebrating && !reducedMotion.matches)) requestDraw();
}

function requestDraw(): void {
  if (!frameId) frameId = requestAnimationFrame(tick);
}

function spin(): void {
  if (!ready || phase !== 'idle' || dialog.open) return;
  const oldGrid = board;
  reels = generateReels();
  const now = performance.now();
  motions = reels.map((reel, column) => ({
    // Two copies allow a stop at the last index to show the strip's beginning
    // below it. The outgoing four symbols preserve the previous screen at launch.
    sequence: [...reel.strip, ...reel.strip, ...oldGrid[column]],
    from: reel.strip.length * 2,
    to: reel.stop,
    position: reel.strip.length * 2,
    start: now + (reducedMotion.matches ? 0 : column * 100),
    duration: reducedMotion.matches ? 180 : 2000 + column * 240,
    settled: false,
  }));
  spinning = true;
  cascadeCount = 0;
  winCount = 0;
  loveCharge = 0;
  loveArrows = undefined;
  arrowsPending = false;
  arrowBursts = 0;
  arrowTargetsCleared = 0;
  removalSource = 'win';
  roundWays = 0;
  litHearts = 0;
  wildRelease = undefined;
  wildsAdded = 0;
  cascade = undefined;
  removedKeys.clear();
  round++;
  roundWinCents = 0;
  updateStatistics();
  setPhase('spinning', now);
  ripple = { ...pointer, started: now };
  status.textContent = `Round ${round}. Reels spinning.`;
  canvas.setAttribute('aria-disabled', 'true');
  canvas.setAttribute('aria-label', 'Heart Attack. Reels spinning');
  canvas.dataset.spinning = 'true';
  requestDraw();
}

// One click event handles mouse, pen and synthesized touch clicks without
// double-starting a round. Pointer events locate feedback in artwork space.
canvas.addEventListener('pointerdown', (event) => {
  const bounds = canvas.getBoundingClientRect();
  pointer = { x: (event.clientX - bounds.left) / bounds.width * scene.width,
    y: (event.clientY - bounds.top) / bounds.height * scene.height };
});
canvas.addEventListener('click', spin);
canvas.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (!event.repeat) spin();
  }
});
reducedMotion.addEventListener('change', requestDraw);

async function initialize(): Promise<void> {
  try {
    const images = await Promise.all([backgroundUrl, lowUrl, midUrl, highUrl, bonusUrl].map(loadImage));
    background = images[0];
    buildSymbolMap({ low: images[1], mid: images[2], high: images[3], bonus: images[4] });
    reels = generateOpeningReels();
    board = visibleGrid(reels);
    result = evaluateWays(board);
    ready = true;
    loading.hidden = true;
    setPhase('idle', performance.now());
    announceResult();
    resize();
  } catch (error) {
    loading.textContent = 'The artwork could not load. Please refresh to try again.';
    console.error('Heart Attack initialization failed', error);
  }
}
void initialize();
