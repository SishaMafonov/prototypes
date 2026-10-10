import './style.css';
import backgroundUrl from './assets/background/main.png';
import lowUrl from './assets/symbols/low.png';
import midUrl from './assets/symbols/mid.png';
import highUrl from './assets/symbols/high.png';
import bonusUrl from './assets/symbols/bonus.png';
import bonusBackgroundUrl from './assets/background/bonus.png';
import bonusArrowUrl from './assets/symbols/arrow.png';
import bonusHeartUrl from './assets/symbols/heart.png';
import {
  BONUS_SIZE, createBonus, freeSpinsForScatters, beginBonusSpin,
  drawBonusArrowCount, drawBonusArrowRows, bonusLineCells, collectBonusCell,
  takeBonusHeart, bonusWinCents, parkedBonusHearts,
} from './bonus';
import type { BonusState, BonusCell, BonusCollection, BonusSymbol, BonusHeart } from './bonus';
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
      <dl id="bonus-stats" class="stats-bar bonus-stats" aria-label="Free spin statistics" hidden>
        <div><dt>Free spin</dt><dd id="bonus-current">0</dd></div>
        <div><dt>Remaining</dt><dd id="bonus-remaining">0</dd></div>
        <div><dt>Multiplier</dt><dd id="bonus-multiplier">×1</dd></div>
        <div><dt>Coins</dt><dd id="bonus-coins">0</dd></div>
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
      <p><strong>Love meter arrows.</strong> Each winning board lights one of the ten cells, from the bottom up. After cascades and heart Wilds finish, the meter fires: 1–5 cells fire 1–3 arrows, 6–8 fire 3–8, 9 fire 8–15, and 10 clear every regular symbol. Wilds and Scatters are protected. Charge stays lit. If the refill creates new wins, resolve their cascades and heart awards, then fire again. Repeat until an arrow refill produces no win. Each new spin resets the meter.</p>
      <div class="rule-cards"><div><strong>WILD</strong><p>Up to three per generated reel strip, with additional Wilds from lit hearts. Cascade refills do not draw new Wilds. Substitutes for every regular symbol. Three or more consecutive Wild reels also win.</p></div><div><strong>SCATTER</strong><p>At most one per reel, including cascade refills. After the round settles, 3, 4 or 5 Scatters award 10, 15 or 20 free spins. Scatters stay on the reels through cascades and arrows, pay nothing, and do not charge hearts or the love meter.</p></div></div>
      <p><strong>Bonus arrows.</strong> Each free spin fills 25 cells: Empty 35%, Coin 25%, ×2 20%, ×3 10%, Heart 7%, Scatter 3%. The three-number reel selects 1–5 arrows with relative weights 20:15:12:5:3. Each arrow crosses a different random row: a row can be shot only once per free spin. Coins are worth your bet; ×2/×3 add to a bonus-wide multiplier starting at ×1. The final bonus win is all coins × bet × multiplier. A collected Scatter adds one free spin.</p>
      <p><strong>Bonus hearts.</strong> A collected heart rises to the top of its column, then sweeps downward to collect it. An empty column keeps its heart visible above the reels through the start of the next spin, until its sweep begins. After the final spin, Continue returns to the base reels that triggered the feature.</p>
      <h2>Payout per winning way</h2>
      <table class="paytable"><thead><tr><th scope="col">Symbol</th><th scope="col">3 reels</th><th scope="col">4 reels</th><th scope="col">5 reels</th></tr></thead>
        <tbody>${(['low', 'mid', 'high'] as const).map((category) => `<tr><th scope="row">${category}</th>${([3, 4, 5] as const).map((length) => `<td>${(PAYOUT_CENTS[category][length] / 100).toFixed(2)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <p>Each winning way pays the listed amount at a fixed bet of <strong>1.00</strong>. Cascade and heart-Wild wins add to the same round. Wild substitutes use the matched symbol's payout. Standalone Wild ways have no payout. Scatters are trigger symbols, not winning combinations.</p>
      <p><strong>Session statistics:</strong> rounds count each spin once. Win / round shows the current or most recent round's total. RTP is total win divided by rounds × 1.00, shown as a percentage. Statistics update as wins appear and reset when you reload.</p>
      <p class="fine-print">5 reels × 4 rows = ${TOTAL_WAYS.toLocaleString()} ways. Bonus: 5 × 5 cells. All amounts are prototype credits; there are no cash bets.</p>
    </dialog>
    <dialog id="bonus-dialog" class="feature-dialog" aria-labelledby="bonus-dialog-title" aria-describedby="bonus-dialog-copy">
      <span class="eyebrow">HEART ATTACK · BONUS GAME</span>
      <div class="feature-heart" aria-hidden="true">♥</div>
      <h1 id="bonus-dialog-title">Love takes aim!</h1>
      <p id="bonus-dialog-copy"></p>
      <p id="bonus-dialog-detail"></p>
      <button id="bonus-continue" class="continue-button" type="button">Continue</button>
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
const mainStatsBar = document.querySelector<HTMLElement>('.stats-bar')!;
const bonusStatsBar = document.querySelector<HTMLElement>('#bonus-stats')!;
const bonusStats = {
  current: document.querySelector<HTMLElement>('#bonus-current')!,
  remaining: document.querySelector<HTMLElement>('#bonus-remaining')!,
  multiplier: document.querySelector<HTMLElement>('#bonus-multiplier')!,
  coins: document.querySelector<HTMLElement>('#bonus-coins')!,
};
const bonusDialog = document.querySelector<HTMLDialogElement>('#bonus-dialog')!;
const bonusContinue = document.querySelector<HTMLButtonElement>('#bonus-continue')!;
bonusDialog.addEventListener('cancel', (event) => event.preventDefault());
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
let bonusBackground: HTMLImageElement;
let bonusArrowSprite: HTMLCanvasElement;
let bonusHeartSprite: HTMLCanvasElement;
let reels: Reel[] = [];
let board: SlotSymbol[][] = [];
let result: Result;
let ready = false;
let spinning = false;
type Phase = 'idle' | 'spinning' | 'celebrating' | 'removing' | 'falling' | 'adding-wilds' | 'firing-arrows' | 'bonus-ready' | 'bonus' | 'bonus-complete';
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
let roundBonusWinCents = 0;
let bonusTriggered = false;
let bonusActive = false;
let bonusState: BonusState | undefined;
type BonusStep = 'filling' | 'arrow-roll' | 'row-aim' | 'row-shot' | 'heart-rise' | 'heart-fall' | 'collecting' | 'spin-end';
let bonusStep: BonusStep = 'filling';
let bonusStepStarted = 0;
let bonusArrowCount = 1;
let bonusArrowRows: number[] = [];
let bonusArrowIndex = 0;
let bonusArrowRolled = false;
let bonusActiveHeart: BonusHeart | undefined;
let bonusHeartReady = false;
let bonusLine: BonusCell[] = [];
let bonusLineIndex = 0;
let bonusFlights: (BonusCollection & { started: number })[] = [];
let bonusPaid = false;
const fastBonusPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('bonus-preview') === 'fast';
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

// Development-only entry lets the full feature be checked without changing real spin odds.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('bonus-preview')) {
  for (const carried of [false, true]) {
    const preview = document.createElement('button');
    preview.id = carried ? 'bonus-hearts-preview' : 'bonus-preview';
    preview.textContent = carried ? 'Preview carried hearts' : 'Preview 3-Scatter bonus';
    preview.addEventListener('click', () => {
      if (!ready || phase !== 'idle') return;
      const scatter = SYMBOLS.find((symbol) => symbol.category === 'scatter')!;
      const regular = SYMBOLS.find((symbol) => symbol.category === 'low')!;
      board = board.map((column, index) => column.map((symbol, row) =>
        index < 3 && row === 3 ? scatter : symbol.category === 'scatter' ? regular : symbol));
      result = evaluateWays(board);
      if (round === 0) round = 1;
      dialog.close();
      updateStatistics();
      openBonus(result.scatterCount, performance.now());
      if (carried && bonusState) bonusState.waitingHearts = [0, 2, 2];
      requestDraw();
    });
    dialog.append(preview);
  }
}

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

function trimmedSprite(image: HTMLImageElement, frames = 1): HTMLCanvasElement {
  const source = document.createElement('canvas');
  source.width = Math.floor(image.naturalWidth / frames);
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext('2d')!;
  sourceCtx.drawImage(image, 0, 0, source.width, source.height, 0, 0, source.width, source.height);
  const data = sourceCtx.getImageData(0, 0, source.width, source.height).data;
  let left = source.width, right = 0, top = source.height, bottom = 0;
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    if (data[(y * source.width + x) * 4 + 3] > 24) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  const sprite = document.createElement('canvas');
  sprite.width = right - left + 1;
  sprite.height = bottom - top + 1;
  sprite.getContext('2d')!.drawImage(source, left, top, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
  return sprite;
}

function bonusGeometry() {
  return scene.wide ? {
    frame: { x: 625, y: 196, width: 875, rowHeight: 135 },
    grid: { x: 645, y: 212, pitchX: 168.5, pitchY: 135, width: 150, height: 114 },
    selector: { x: 1060, y: 80, width: 340, height: 66 },
    arrow: { x: 1060, y: 150, width: 245 },
    message: { x: 303, y: 553, width: 530 },
  } : {
    frame: { x: 86, y: 836, width: 774, rowHeight: 132 },
    grid: { x: 104, y: 851, pitchX: 149, pitchY: 132, width: 134, height: 113 },
    selector: { x: 471, y: 698, width: 408, height: 80 },
    arrow: { x: 471, y: 786, width: 270 },
    message: { x: 471, y: 1571, width: 810 },
  };
}

function bonusCellPoint(cell: BonusCell) {
  const grid = bonusGeometry().grid;
  return { x: grid.x + cell.column * grid.pitchX + grid.width / 2,
    y: grid.y + cell.row * grid.pitchY + grid.height / 2 };
}

function drawFitted(sprite: CanvasImageSource & { width: number; height: number }, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / sprite.width, height / sprite.height);
  ctx.drawImage(sprite, x - sprite.width * scale / 2, y - sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);
}

function drawBonusSymbol(symbol: BonusSymbol, x: number, y: number, size: number, alpha = 1): void {
  if (symbol === 'empty') return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = symbol === 'coin' ? '#ffcf4f' : '#ff72bd';
  ctx.shadowBlur = 12;
  if (symbol === 'heart') drawFitted(bonusHeartSprite, x, y, size, size);
  else if (symbol === 'scatter') drawFitted(sprites.get('scatter')!, x, y, size, size);
  else {
    const gradient = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, 0, x, y, size * 0.5);
    gradient.addColorStop(0, symbol === 'coin' ? '#fff1a6' : '#faacf1');
    gradient.addColorStop(0.55, symbol === 'coin' ? '#efba34' : '#a72b97');
    gradient.addColorStop(1, symbol === 'coin' ? '#9b490c' : '#410d50');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#ffe6a5';
    ctx.lineWidth = Math.max(2, size * 0.035);
    ctx.beginPath();
    if (symbol === 'coin') ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    else ctx.roundRect(x - size * 0.43, y - size * 0.35, size * 0.86, size * 0.7, size * 0.2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'middle';
    text(symbol === 'coin' ? '1.00' : symbol === 'x2' ? '×2' : '×3', x, y, size * (symbol === 'coin' ? 0.25 : 0.44), symbol === 'coin' ? '#6a2d07' : '#fff5d9');
  }
  ctx.restore();
}

function bonusProgress(now: number, duration: number): number {
  return Math.min(1, Math.max(0, (now - bonusStepStarted) / (reducedMotion.matches || fastBonusPreview ? 100 : duration)));
}

function bonusArrowsLeft(): number {
  // Reveal the count only once the number reel finishes selecting the award.
  return bonusArrowRolled && bonusStep !== 'arrow-roll' ? Math.max(0, bonusArrowCount - bonusArrowIndex) : 0;
}

function bonusStepMessage(): string {
  if (bonusStep === 'filling') return 'A fresh chance in every cell';
  if (bonusStep === 'arrow-roll') return 'How many arrows will love send?';
  if (bonusStep === 'row-aim') return `Arrow ${bonusArrowIndex + 1} of ${bonusArrowCount} · aiming at row ${bonusArrowRows[bonusArrowIndex] + 1}`;
  if (bonusStep === 'row-shot') return `Arrow ${bonusArrowIndex + 1} of ${bonusArrowCount} · collecting row ${bonusArrowRows[bonusArrowIndex] + 1}`;
  if (bonusStep === 'heart-rise') return bonusHeartReady ? 'Heart rising · a column of love' : 'Heart saved for the next free spin';
  if (bonusStep === 'heart-fall') return 'Heart sweep · collecting the column';
  if (bonusStep === 'collecting') return 'Bringing your treasures home';
  return bonusState?.remainingSpins ? 'The next free spin is on its way' : 'Your bonus win is ready';
}

function drawBonus(now: number): void {
  if (!bonusState) return;
  const geometry = bonusGeometry();
  const grid = geometry.grid;
  if (scene.wide) {
    ctx.drawImage(bonusBackground, 80, 1260, 780, 412, 0, 0, scene.width, scene.height);
    ctx.fillStyle = '#25091bca'; ctx.fillRect(0, 0, scene.width, scene.height);
    ctx.save(); ctx.beginPath(); ctx.roundRect(24, 24, 554, 416, 26); ctx.clip();
    ctx.drawImage(bonusBackground, 0, 0, 941, 705, 24, 24, 554, 416);
    ctx.restore();
  } else {
    ctx.drawImage(bonusBackground, 0, 0, ART.width, ART.height);
    // Cover the original four-row area before composing five rows from the same art.
    ctx.drawImage(bonusBackground, 0, 1282, 941, 390, 0, 625, 941, 1047);
    const fade = ctx.createLinearGradient(0, 625, 0, 836);
    fade.addColorStop(0, '#23071ddd'); fade.addColorStop(1, '#23071d44');
    ctx.fillStyle = fade; ctx.fillRect(65, 625, 810, 211);
  }
  // Only supplied row artwork is used. The extra middle row repeats the third;
  // the first/last slices retain the original outer frame. No grid cells are drawn.
  const bands = [{ y: 699, height: 142 }, { y: 841, height: 141 },
    { y: 982, height: 144 }, { y: 982, height: 144 }, { y: 1126, height: 158 }];
  bands.forEach((band, row) => ctx.drawImage(bonusBackground, 86, band.y, 774, band.height,
    geometry.frame.x, geometry.frame.y + row * geometry.frame.rowHeight, geometry.frame.width, geometry.frame.rowHeight));
  const reveal = bonusStep === 'filling' ? bonusProgress(now, 650) : 1;
  bonusState.grid.forEach((row, rowIndex) => row.forEach((symbol, column) => {
    const point = bonusCellPoint({ row: rowIndex, column });
    const alpha = reducedMotion.matches ? 1 : Math.min(1, Math.max(0, reveal * 2 - (rowIndex * 5 + column) / 25));
    drawBonusSymbol(symbol, point.x, point.y + (1 - alpha) * -20, Math.min(grid.width, grid.height) * 0.82, alpha);
  }));
  const selector = geometry.selector;
  text('ARROWS THIS FREE SPIN', selector.x, selector.y - selector.height * 0.7, scene.wide ? 20 : 24, '#ffe2ab');
  ctx.save();
  ctx.beginPath(); ctx.roundRect(selector.x - selector.width / 2, selector.y - selector.height / 2, selector.width, selector.height, 18); ctx.clip();
  ctx.fillStyle = '#23071df2'; ctx.fillRect(selector.x - selector.width / 2, selector.y - selector.height / 2, selector.width, selector.height);
  const rolling = bonusStep === 'arrow-roll' && !reducedMotion.matches;
  const center = rolling ? Math.floor((now - bonusStepStarted) / 75) % 5 + 1 : bonusArrowCount;
  for (let index = -1; index <= 1; index++) {
    const x = selector.x + index * selector.width / 3;
    ctx.textBaseline = 'middle';
    text(String((center + index + 4) % 5 + 1), x, selector.y, index === 0 ? 52 : 33, index === 0 ? '#ffe799' : '#ba809c');
  }
  ctx.restore();
  ctx.strokeStyle = '#ffe599'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(selector.x - selector.width / 6, selector.y - selector.height / 2, selector.width / 3, selector.height, 14); ctx.stroke();
  drawFitted(bonusArrowSprite, geometry.arrow.x, geometry.arrow.y, geometry.arrow.width, 70);
  const arrowsLeft = bonusArrowsLeft();
  if (arrowsLeft > 0) {
    const left = geometry.frame.x;
    const y = geometry.frame.y - 64;
    ctx.save();
    ctx.fillStyle = '#23071dee';
    ctx.strokeStyle = '#ffe599bb';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(left, y - 26, 180, 52, 16); ctx.fill(); ctx.stroke();
    drawFitted(bonusArrowSprite, left + 64, y, 112, 36);
    ctx.textBaseline = 'middle';
    text(`×${arrowsLeft}`, left + 147, y, 32, '#ffe799');
    ctx.restore();
  }
  const waiting = new Map<number, number>();
  const parked = parkedBonusHearts(bonusState);
  // An empty-column heart is already in waitingHearts while its rise animates.
  // Let the moving sprite represent it until it reaches the parked position.
  if (bonusStep === 'heart-rise' && bonusActiveHeart && !bonusHeartReady) {
    const index = parked.indexOf(bonusActiveHeart.column);
    if (index >= 0) parked.splice(index, 1);
  }
  for (const column of parked) waiting.set(column, (waiting.get(column) ?? 0) + 1);
  for (const [column, count] of waiting) {
    const point = bonusCellPoint({ row: 0, column });
    const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(now / 230) * 0.07;
    drawFitted(bonusHeartSprite, point.x, grid.y - 25, 40 * pulse, 40 * pulse);
    if (count > 1) text(`×${count}`, point.x + 25, grid.y - 23, 17);
  }
  if (bonusStep === 'row-aim' || bonusStep === 'row-shot') {
    const row = bonusArrowRows[bonusArrowIndex];
    const point = bonusCellPoint({ row, column: 0 });
    const progress = bonusStep === 'row-aim' ? 0 : bonusProgress(now, 1150);
    ctx.save();
    ctx.fillStyle = '#ffe18a20';
    ctx.fillRect(grid.x, grid.y + row * grid.pitchY, grid.pitchX * 4 + grid.width, grid.height);
    const start = grid.x - 100;
    const end = grid.x + grid.pitchX * 4 + grid.width + 100;
    drawFitted(bonusArrowSprite, start + (end - start) * progress, point.y, scene.wide ? 190 : 160, 62);
    ctx.restore();
  }
  if ((bonusStep === 'heart-rise' || bonusStep === 'heart-fall') && bonusActiveHeart) {
    const point = bonusCellPoint(bonusActiveHeart.row < 0 ? { ...bonusActiveHeart, row: 0 } : bonusActiveHeart);
    const top = grid.y - 25;
    const rise = bonusProgress(now, 650);
    const fall = bonusProgress(now, 1100);
    const y = bonusStep === 'heart-rise' ? (bonusActiveHeart.row < 0 ? top : point.y + (top - point.y) * rise)
      : top + (grid.pitchY * 4 + grid.height + 80) * fall;
    const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(now / 90) * 0.12;
    ctx.save(); ctx.shadowColor = '#ff5bab'; ctx.shadowBlur = 25;
    drawFitted(bonusHeartSprite, point.x, y, 96 * pulse, 96 * pulse); ctx.restore();
  }
  bonusFlights = bonusFlights.filter((flight) => now - flight.started < 550);
  for (const flight of bonusFlights) {
    const progress = reducedMotion.matches ? 1 : Math.min(1, (now - flight.started) / 550);
    const from = bonusCellPoint(flight);
    const target = { x: scene.width * (flight.symbol === 'x2' || flight.symbol === 'x3' ? 0.62 : flight.symbol === 'scatter' ? 0.38 : 0.84), y: scene.height - 18 };
    drawBonusSymbol(flight.symbol, from.x + (target.x - from.x) * progress,
      from.y + (target.y - from.y) * progress - Math.sin(progress * Math.PI) * 85,
      70 * (1 - progress * 0.55), 1 - progress * 0.25);
  }
  const message = geometry.message;
  ctx.save();
  ctx.fillStyle = '#23071de8';
  const panelHeight = scene.wide ? 230 : 106;
  ctx.beginPath(); ctx.roundRect(message.x - message.width / 2, message.y - 37, message.width, panelHeight, 24); ctx.fill();
  text(`FREE SPIN ${bonusState.currentSpin} · ${bonusState.remainingSpins} LEFT`, message.x, message.y, scene.wide ? 29 : 28, '#ffe3aa');
  const copy = phase === 'bonus-complete' ? 'Your love story is complete' : bonusStepMessage();
  ctx.font = '700 25px "Trebuchet MS", sans-serif';
  const size = Math.min(25, 25 * (message.width - 30) / Math.max(1, ctx.measureText(copy).width));
  text(copy, message.x, message.y + 43, size, '#ffc3da');
  if (scene.wide) {
    text(`${bonusState.coins} coins × ${bonusState.multiplier}`, message.x, message.y + 101, 37);
    text(`${(bonusWinCents(bonusState) / 100).toFixed(2)} credits`, message.x, message.y + 150, 29, '#ffe3aa');
  }
  ctx.restore();
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
  if (bonusActive) { drawBonus(now); return; }
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
  if (roundBonusWinCents > 0) status.textContent += ` Bonus win ${(roundBonusWinCents / 100).toFixed(2)} credits included.`;
}

function updateBonusStats(): void {
  if (!bonusState) return;
  bonusStats.current.textContent = String(bonusState.currentSpin);
  bonusStats.remaining.textContent = String(bonusState.remainingSpins);
  bonusStats.multiplier.textContent = `×${bonusState.multiplier}`;
  bonusStats.coins.textContent = String(bonusState.coins);
  canvas.dataset.bonusStep = bonusStep;
  canvas.dataset.bonusSpin = String(bonusState.currentSpin);
  canvas.dataset.bonusRemaining = String(bonusState.remainingSpins);
  canvas.dataset.bonusCoins = String(bonusState.coins);
  canvas.dataset.bonusMultiplier = String(bonusState.multiplier);
  canvas.dataset.bonusWaitingHearts = String(bonusState.waitingHearts.length);
  canvas.dataset.bonusParkedHearts = parkedBonusHearts(bonusState).join(',');
  canvas.dataset.bonusArrowRows = bonusArrowRows.join(',');
  canvas.dataset.bonusArrowCount = String(bonusArrowCount);
  canvas.dataset.bonusArrowsFired = String(bonusArrowIndex);
  canvas.dataset.bonusArrowsLeft = String(bonusArrowsLeft());
}

function openBonus(scatterCount: number, now: number): void {
  if (freeSpinsForScatters(scatterCount) === 0) return;
  bonusTriggered = true;
  bonusPaid = false;
  bonusState = createBonus(scatterCount);
  rulesButton.disabled = true;
  setPhase('bonus-ready', now);
  document.querySelector('#bonus-dialog-title')!.textContent = 'Love takes aim!';
  document.querySelector('#bonus-dialog-copy')!.textContent = `${scatterCount} Scatters · ${bonusState.initialSpins} free spins`;
  document.querySelector('#bonus-dialog-detail')!.textContent = 'Collect coins, build your multiplier, and let hearts sweep whole columns. Your base reels will be waiting when you return.';
  status.textContent = `Bonus triggered by ${scatterCount} Scatters. ${bonusState.initialSpins} free spins awarded. Press Continue to begin.`;
  bonusDialog.showModal();
  bonusContinue.focus();
}

function finishBaseRound(now: number): void {
  if (round > 0 && !bonusTriggered && result.scatterTrigger) openBonus(result.scatterCount, now);
  else { setPhase('idle', now); announceResult(); }
}

function setBonusStep(step: BonusStep, now: number): void {
  bonusStep = step;
  bonusStepStarted = now;
  updateBonusStats();
  const copy = `Free spin ${bonusState?.currentSpin}. ${bonusStepMessage()}. ${bonusArrowRolled && step !== 'arrow-roll' ? `${bonusArrowsLeft()} arrows left. ` : ''}${bonusState?.remainingSpins} spins remaining. ${bonusState?.coins} coins, multiplier ${bonusState?.multiplier}.`;
  status.textContent = copy;
  canvas.setAttribute('aria-label', `Heart Attack bonus. ${copy}`);
}

function startBonusSpin(now: number): void {
  if (!bonusState || bonusState.remainingSpins <= 0) { completeBonus(now); return; }
  bonusState = beginBonusSpin(bonusState);
  bonusArrowCount = 1;
  bonusArrowRows = [];
  bonusArrowIndex = 0;
  bonusArrowRolled = false;
  bonusActiveHeart = undefined;
  bonusFlights = [];
  setBonusStep('filling', now);
}

function nextBonusWork(now: number): void {
  if (!bonusState) return;
  if (bonusState.heartQueue.length > 0) {
    const outcome = takeBonusHeart(bonusState);
    bonusState = outcome.state;
    bonusActiveHeart = outcome.heart;
    bonusHeartReady = outcome.ready;
    setBonusStep('heart-rise', now);
  } else if (!bonusArrowRolled) {
    bonusArrowCount = drawBonusArrowCount();
    bonusArrowRows = drawBonusArrowRows(bonusArrowCount);
    bonusArrowRolled = true;
    setBonusStep('arrow-roll', now);
  } else if (bonusArrowIndex < bonusArrowCount) {
    setBonusStep('row-aim', now);
  } else {
    setBonusStep('spin-end', now);
  }
}

function startBonusLine(axis: 'row' | 'column', index: number, now: number): void {
  bonusLine = bonusLineCells(axis, index);
  bonusLineIndex = 0;
  setBonusStep(axis === 'row' ? 'row-shot' : 'heart-fall', now);
}

function collectAlongBonusLine(now: number, progress: number): void {
  if (!bonusState) return;
  const grid = bonusGeometry().grid;
  while (bonusLineIndex < bonusLine.length) {
    const cell = bonusLine[bonusLineIndex];
    const point = bonusCellPoint(cell);
    const threshold = bonusStep === 'row-shot'
      ? (point.x - (grid.x - 100)) / (grid.pitchX * 4 + grid.width + 200)
      : (point.y - (grid.y - 25)) / (grid.pitchY * 4 + grid.height + 80);
    if (progress < threshold) break;
    const outcome = collectBonusCell(bonusState, cell);
    bonusState = outcome.state;
    if (outcome.collected) {
      // Hearts rise themselves rather than flying to the counters.
      if (outcome.collected.symbol !== 'heart') bonusFlights.push({ ...outcome.collected, started: now });
      updateBonusStats();
    }
    bonusLineIndex++;
  }
}

function tickBonus(now: number): void {
  if (bonusStep === 'filling' && bonusProgress(now, 650) === 1) nextBonusWork(now);
  else if (bonusStep === 'arrow-roll' && bonusProgress(now, 900) === 1) nextBonusWork(now);
  else if (bonusStep === 'row-aim' && bonusProgress(now, 280) === 1) startBonusLine('row', bonusArrowRows[bonusArrowIndex], now);
  else if (bonusStep === 'row-shot' || bonusStep === 'heart-fall') {
    const progress = bonusProgress(now, bonusStep === 'row-shot' ? 1150 : 1100);
    collectAlongBonusLine(now, progress);
    if (progress === 1) {
      if (bonusStep === 'row-shot') bonusArrowIndex++;
      setBonusStep('collecting', now);
    }
  } else if (bonusStep === 'heart-rise' && bonusProgress(now, 650) === 1) {
    if (bonusHeartReady && bonusActiveHeart) startBonusLine('column', bonusActiveHeart.column, now);
    else nextBonusWork(now);
  } else if (bonusStep === 'collecting' && bonusProgress(now, 600) === 1) nextBonusWork(now);
  else if (bonusStep === 'spin-end' && bonusProgress(now, 800) === 1) startBonusSpin(now);
}

function completeBonus(now: number): void {
  if (!bonusState) return;
  if (!bonusPaid) {
    roundBonusWinCents = bonusWinCents(bonusState);
    roundWinCents += roundBonusWinCents;
    totalWinCents += roundBonusWinCents;
    bonusPaid = true;
    updateStatistics();
  }
  setPhase('bonus-complete', now);
  updateBonusStats();
  document.querySelector('#bonus-dialog-title')!.textContent = 'A love story worth keeping';
  document.querySelector('#bonus-dialog-copy')!.textContent = `Bonus win ${(roundBonusWinCents / 100).toFixed(2)} credits`;
  document.querySelector('#bonus-dialog-detail')!.textContent = `${bonusState.currentSpin} free spins · ${bonusState.coins} coins × ${(BET_CENTS / 100).toFixed(2)} bet × ${bonusState.multiplier} multiplier. Continue to return to your base reels.`;
  status.textContent = `Bonus complete. Total win ${(roundBonusWinCents / 100).toFixed(2)} credits. Press Continue to return to the triggering reels.`;
  bonusDialog.showModal();
  bonusContinue.focus();
}

bonusContinue.addEventListener('click', () => {
  if (phase === 'bonus-ready') {
    bonusDialog.close();
    bonusActive = true;
    mainStatsBar.hidden = true;
    bonusStatsBar.hidden = false;
    setPhase('bonus', performance.now());
    startBonusSpin(performance.now());
    resize();
  } else if (phase === 'bonus-complete') {
    bonusDialog.close();
    bonusActive = false;
    mainStatsBar.hidden = false;
    bonusStatsBar.hidden = true;
    rulesButton.disabled = false;
    setPhase('idle', performance.now());
    announceResult();
    canvas.focus();
    resize();
  }
});

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
  canvas.dataset.baseBoard = board.map((column) => column.map((symbol) => symbol.id).join(',')).join('|');
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
      finishBaseRound(now);
    }
  } else {
    finishBaseRound(now);
  }
}

function tick(now: number): void {
  frameId = 0;
  if (phase === 'bonus') {
    tickBonus(now);
    draw(now);
    if (phase === 'bonus') requestDraw();
    return;
  }
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
  const animating = phase !== 'idle' && phase !== 'bonus-ready' && phase !== 'bonus-complete';
  if (animating || ripple || (celebrating && !reducedMotion.matches)) requestDraw();
}

function requestDraw(): void {
  if (!frameId) frameId = requestAnimationFrame(tick);
}

function spin(): void {
  if (!ready || phase !== 'idle' || dialog.open || bonusDialog.open) return;
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
  roundBonusWinCents = 0;
  bonusTriggered = false;
  bonusState = undefined;
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
    const images = await Promise.all([backgroundUrl, lowUrl, midUrl, highUrl, bonusUrl,
      bonusBackgroundUrl, bonusArrowUrl, bonusHeartUrl].map(loadImage));
    background = images[0];
    buildSymbolMap({ low: images[1], mid: images[2], high: images[3], bonus: images[4] });
    bonusBackground = images[5];
    bonusArrowSprite = trimmedSprite(images[6]);
    bonusHeartSprite = trimmedSprite(images[7], 3);
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
