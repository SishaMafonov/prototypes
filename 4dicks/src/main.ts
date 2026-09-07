import './style.css';
import backgroundUrl from './assets/reels/main.png';
import bonusBackgroundUrl from './assets/reels/bonus.png';
import heartsUrl from './assets/symbols/hearts.png';
import spadesUrl from './assets/symbols/spades.png';
import diamondsUrl from './assets/symbols/diamonds.png';
import clubsUrl from './assets/symbols/clubs.png';
import jokerUrl from './assets/symbols/joker.png';
import { BET, RANKS, SUITS, generateDeck, shuffle, uniqueRanks, findMatch, compactRows, compactBoard,
  pairWin, drawMultiplier, finalWin, drawHighCardsFeature, upgradeLowCards, drawGambleSuit, gamblePayout, isGambleEligible,
  drawBonusGrid, drawBonusAngle, bonusAngleCells, collectBonusMultipliers, bonusPayout, BONUS_GRID_SIZE,
  type Card, type Board, type Rank, type Suit, type GambleSuit, type BonusAngle, type BonusGrid } from './game';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="game">
    <header><div><span class="eyebrow">FOUR KINGDOMS · ONE DECK</span><h1>Four Dicks</h1></div>
      <button class="rules-button" aria-label="Show game rules">How to play <span>?</span></button></header>
    <section class="cabinet" aria-label="Four Dicks card slot game">
      <canvas tabindex="0" role="button" aria-label="Start a round. Match equal ranks diagonally on the four by four reels."></canvas>
      <div class="loading">Loading the kingdoms…</div>
    </section>
    <section class="round-bar">
      <div class="round-info"><span class="eyebrow">BET <strong>1.00</strong></span><p id="status" role="status" aria-live="polite">Preparing your deck…</p></div>
      <div class="round-win"><span class="eyebrow">ROUND WIN</span><strong id="round-win">0.00</strong><small id="win-detail">Ready for a new round</small></div>
      <button id="spin" disabled>Deal cards <span>↗</span></button>
    </section>
    <footer aria-label="Session statistics"><div><span>SPINS</span><strong id="spins">0</strong></div><div><span>FREE SPINS HITS</span><strong id="free-spins-hits">0</strong></div><div><span>TOTAL WIN</span><strong id="total-win">0.00</strong></div><div><span>RETURN TO PLAYER</span><strong id="rtp">0.00%</strong></div></footer>
    <p class="footnote">Prototype · Play units · Tap the reels or press Space to deal</p>
  </main>
  <dialog id="bonus-award" class="bonus-dialog"><span class="eyebrow">THE MAP IS COMPLETE</span><h2><strong id="free-spin-award">10</strong> Free Spins awarded</h2><p id="bonus-copy"></p><div class="bonus-icon">✦</div><p>Find multipliers on the treasure map. Each spin chooses a 90° angle and an entry point to collect them.</p><button id="start-bonus">Continue</button></dialog>
  <dialog id="bonus-result" class="bonus-dialog"><span class="eyebrow">TREASURE COLLECTED</span><h2>Bonus complete</h2><p id="bonus-result-copy"></p><div class="bonus-icon">✦</div><button id="close-bonus-result">Continue</button></dialog>
  <dialog id="gamble-offer" class="gamble-dialog"><span class="eyebrow">THE DECK IS EMPTY</span><h2>Double or Nothing</h2><p>Every match has been collected. Your <strong id="gamble-stake">0.00</strong>-unit win is ready.</p><div class="dialog-actions"><button id="gamble-collect" class="secondary-action">Collect</button><button id="gamble-start">Gamble</button></div></dialog>
  <dialog id="gamble-choice" class="gamble-dialog"><span class="eyebrow">CHOOSE YOUR SUIT</span><h2>Hearts or Spades?</h2><p>Pick correctly and double <strong id="gamble-choice-stake">0.00</strong> units.</p><div class="suit-choices"><button id="pick-hearts" class="suit-choice hearts" aria-label="Pick Hearts"><span>♥</span><b>Hearts</b></button><button id="pick-spades" class="suit-choice spades" aria-label="Pick Spades"><span>♠</span><b>Spades</b></button></div></dialog>
  <dialog id="rules"><span class="eyebrow">A GAME OF DIAGONALS</span><h2>How to play</h2>
    <p>Each 1.00-unit round draws a 48-card deck. The top bar shows its unique ranks; the lower strip previews the next 16 cards.</p>
    <p>Random High Cards has a 10% chance before each deck is created. After a five-second announcement, all 2–6 sets become extra sets of J, Q, or K already in the deck. If no high ranks were drawn, J, Q, and K are eligible. Extra sets are shared evenly in a random order.</p>
    <p>Equal ranks match diagonally within rows 1–2, then 2–3, then 3–4. Descending diagonals are checked left to right before ascending diagonals right to left. Suits do not affect matches. Cards slide left, then up, and refill from the upcoming strip. After each refill, checking starts again at the top.</p>
    <div class="paytable"><span>2–6 / pair</span><b>0.10</b><span>7–10 / pair</span><b>0.50</b><span>J–K / pair</span><b>1.00</b></div>
    <p>Wild matches Wild. Each collected pair reveals a multiplier; these add together and multiply the round’s base win. No Wild means ×1. Two Scatters award 10 Free Spins; four Scatters award 20.</p>
    <p>During Free Spins, 1–64 map cells receive random multipliers. A sonar selects one of four 90° angles, then an X marks the entry cell. Multipliers in that angle’s quadrant are collected. The total bonus multiplier multiplies the main-game win.</p>
    <p>Drain the deck and collect every available match to unlock Gamble Feature. Collect takes the current win. Gamble lets you choose Hearts or Spades; after a seven-second shuffle, the matching suit doubles the win and the other suit loses it.</p>
    <p class="muted">Draw weights: low 60, medium 40, high 15, Scatter 5, Wild 10, normalized across available groups. Each draw adds four cards; normal ranks include all four suits. At most one four-Scatter draw per deck. Counters show collected pairs. Statistics last for this page session.</p>
    <button id="close-rules">Let’s play</button></dialog>`;

const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const ctx = canvas.getContext('2d')!;
const spin = document.querySelector<HTMLButtonElement>('#spin')!;
const status = document.querySelector<HTMLElement>('#status')!;
const bonusAward = document.querySelector<HTMLDialogElement>('#bonus-award')!;
const bonusResult = document.querySelector<HTMLDialogElement>('#bonus-result')!;
const rules = document.querySelector<HTMLDialogElement>('#rules')!;
const money = (n: number) => n.toFixed(2);
const W = 941, H = 990, CROP_Y = 450;
const GAMEPLAY_DURATION_SCALE = 1.25;
const FEATURE_ANNOUNCEMENT_MS = 5000;
const GAMBLE_SHUFFLE_MS = 7000;
const BONUS_SCANNER_MS = 3000;
const BONUS_ANGLE_PAUSE_MS = 3000;
const BONUS_X_LANDING_MS = 3000;
const BONUS_RAYS_MS = 3000;
interface Rect { x: number; y: number; w: number; h: number }
interface Motion { card: Card; from: Rect; to: Rect; progress: number; fade?: boolean; inQueue?: boolean }
const boardRect = (index: number): Rect => ({ x: 161 + (index % 4) * 157, y: 641 - CROP_Y + Math.floor(index / 4) * 156, w: 140, h: 137 });
const queueRect = (index: number): Rect => ({ x: 82 + index * 48.6, y: 1320 - CROP_Y, w: 45, h: 52 });
const rankRect = (index: number): Rect => ({ x: 42 + index * 67.1, y: 521 - CROP_Y, w: 56, h: 58 });
const BONUS_GRID_RECT = { x: 138, y: 593 - CROP_Y, w: 670, h: 616 };
// The supplied artwork has eight columns but seven rows. Re-tile its painted
// cells into the 8×8 logical grid rather than placing eight rows over seven.
const BONUS_ART_COLUMNS = [135, 219, 302, 387, 472, 555, 640, 723, 807];
const BONUS_ART_ROWS = [596, 683, 771, 860, 947, 1035, 1123, 1211];
const bonusCellRect = (index: number): Rect => ({
  x: BONUS_GRID_RECT.x + (index % BONUS_GRID_SIZE) * BONUS_GRID_RECT.w / BONUS_GRID_SIZE,
  y: BONUS_GRID_RECT.y + Math.floor(index / BONUS_GRID_SIZE) * BONUS_GRID_RECT.h / BONUS_GRID_SIZE,
  w: BONUS_GRID_RECT.w / BONUS_GRID_SIZE, h: BONUS_GRID_RECT.h / BONUS_GRID_SIZE,
});

let artwork: HTMLImageElement, bonusArtwork: HTMLImageElement;
const sprites = {} as Record<Suit | 'joker', HTMLImageElement>;
/** Maps each symbol to an equal-width frame in the unmodified source sprite. */
const symbolMap = new Map<string, { image: HTMLImageElement; index: number; frames: number }>();
let board: Board = Array(16).fill(null);
let shoe: Card[] = [];
let ranks: Rank[] = [];
let collected: Partial<Record<Rank, number>> = {};
let motions: Motion[] = [];
let highlighted: number[] = [];
let matchProgress = 0;
let busy = false, ready = false, baseWin = 0, multiplier = 0, scatterCount = 0;
let spins = 0, freeSpinHits = 0, totalWin = 0;
let floating = '', floatProgress = 0;
let roundStarted = false;
let featureProgress: number | null = null;
let gambleShuffle: { progress: number; choice: GambleSuit; outcome: GambleSuit; showResult: boolean } | null = null;
let gambleOfferResolver: ((choice: 'collect' | 'gamble') => void) | null = null;
let gambleChoiceResolver: ((choice: GambleSuit) => void) | null = null;
let bonusContinueResolver: (() => void) | null = null;
let bonusResultResolver: (() => void) | null = null;
let bonusActive = false;
let bonusFreeSpins = 0, bonusSpinNumber = 0, bonusSpinTotal = 0, bonusTotalMultiplier = 0;
let bonusGrid: BonusGrid = Array(BONUS_GRID_SIZE ** 2).fill(null);
let bonusAngle: BonusAngle | null = null;
let bonusEntry: number | null = null;
let bonusAffected = new Set<number>();
let bonusScannerProgress: number | null = null;
let bonusAnglePreviewProgress: number | null = null;
let bonusLandingProgress: number | null = null;
let bonusRayProgress: number | null = null;
let bonusCollecting = false;
// Development-only reproducible rounds for manually checking rare cascades.
const params = new URLSearchParams(location.search);
const seedParam = import.meta.env.DEV ? params.get('seed') : null;
let seed = Number(seedParam) >>> 0;
const random = seedParam !== null && Number.isFinite(Number(seedParam)) ? () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
} : Math.random;
const testMotion = import.meta.env.DEV && params.get('motion') === 'fast';
let fast = testMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

function text(label: string, x: number, y: number, size = 20, color = '#fff0c3', align: CanvasTextAlign = 'center') {
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText(label, x, y); ctx.shadowBlur = 0;
}

function panel(rect: Rect, color = '#0b1116e8', border = '#caa35c') {
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawCard(card: Pick<Card, 'rank' | 'suit'>, rect: Rect, alpha = 1) {
  const frame = symbolMap.get(card.suit ? `${card.rank}-${card.suit}` : card.rank)!;
  const sw = frame.image.naturalWidth / frame.frames, sh = frame.image.naturalHeight;
  const scale = Math.min(rect.w / sw, rect.h / sh);
  const w = sw * scale, h = sh * scale, x = rect.x + (rect.w - w) / 2, y = rect.y + (rect.h - h) / 2;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(frame.image, frame.index * sw, 0, sw, sh, x, y, w, h);
  const label = card.rank === 'Scatter' ? 'SC' : card.rank === 'Wild' ? 'W' : card.rank;
  const badge = Math.max(12, Math.min(25, rect.h * .19));
  ctx.fillStyle = '#130c0ae8'; ctx.fillRect(x + 2, y + h - badge - 2, Math.max(badge, label.length * badge * .65), badge);
  text(label, x + 4, y + h - badge / 2 - 2, badge * .84, '#fff1bf', 'left'); ctx.restore();
}

function drawMatchPayline() {
  if (highlighted.length !== 2) return;
  const source = boardRect(highlighted[0]!);
  const target = boardRect(highlighted[1]!);
  const start = { x: source.x + source.w / 2, y: source.y + source.h / 2 };
  const end = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = '#ffc44f'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = '#41230c'; ctx.lineWidth = 13; ctx.stroke();
  ctx.strokeStyle = '#ffd065'; ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = '#fff5ca'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;

  // Endpoints stay at the symbol centres; the arrow travels from the upper card to the lower card.
  ctx.beginPath(); ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#24180f'; ctx.fill(); ctx.strokeStyle = '#ffe098'; ctx.lineWidth = 3; ctx.stroke();

  ctx.beginPath(); ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#24180f'; ctx.fill(); ctx.stroke();
  const travel = fast ? .6 : .22 + matchProgress * .5;
  ctx.translate(start.x + (end.x - start.x) * travel, start.y + (end.y - start.y) * travel);
  ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, -10); ctx.lineTo(-5, 0); ctx.lineTo(-9, 10); ctx.closePath();
  ctx.fillStyle = '#fff5ca'; ctx.fill(); ctx.strokeStyle = '#7c4c15'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function drawHighCardsAnnouncement() {
  if (featureProgress === null) return;
  const p = featureProgress;
  const growth = p < .2 ? 1 - (1 - p / .2) ** 3 : p > .8 ? ((1 - p) / .2) ** 3 : 1;
  const fade = Math.min(1, p / .05, (1 - p) / .05);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  ctx.save();
  ctx.fillStyle = `rgba(5, 9, 16, ${.86 * fade})`; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 410);
  glow.addColorStop(0, '#df9f334d'); glow.addColorStop(1, '#df9f3300');
  ctx.globalAlpha = fade; ctx.fillStyle = glow; ctx.fillRect(-W / 2, -H / 2, W, H);
  const scale = reducedMotion ? 1 : growth;
  ctx.scale(scale, scale);
  panel({ x: -380, y: -112, w: 760, h: 224 }, '#16110df2', '#dca85c');
  ctx.strokeStyle = '#dca85c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-250, -82); ctx.lineTo(250, -82); ctx.moveTo(-250, 82); ctx.lineTo(250, 82); ctx.stroke();
  ctx.font = 'bold 68px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gold = ctx.createLinearGradient(0, -65, 0, 65);
  gold.addColorStop(0, '#fff4ca'); gold.addColorStop(.55, '#ffda85'); gold.addColorStop(1, '#dca052');
  ctx.fillStyle = gold; ctx.shadowColor = '#ffc95b'; ctx.shadowBlur = 18;
  ctx.fillText('HIGH CARDS', 0, -34); ctx.fillText('FEATURE!', 0, 38);
  ctx.restore();
}

function displayGambleSuit(progress: number, outcome: GambleSuit): GambleSuit {
  if (progress >= .96) return outcome;
  const fastPhase = 5 / 7;
  if (progress < fastPhase) return Math.floor(progress * 35) % 2 === 0 ? 'hearts' : 'spades';
  const lastTwoSeconds = (progress - fastPhase) / (1 - fastPhase);
  const slowedTicks = Math.floor(35 + (1 - (1 - lastTwoSeconds) ** 2) * 5);
  return slowedTicks % 2 === 0 ? 'hearts' : 'spades';
}

function drawGambleShuffle() {
  if (!gambleShuffle) return;
  const { progress, choice, outcome, showResult } = gambleShuffle;
  const suit = displayGambleSuit(progress, outcome);
  const won = choice === outcome;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 9, 16, .9)'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  panel({ x: -340, y: -265, w: 680, h: 530 }, '#16110df5', '#dca85c');
  text(showResult ? won ? 'DOUBLE WIN!' : 'THE HOUSE TAKES IT' : 'DOUBLE OR NOTHING', 0, -190, 31, '#fff0bd');
  text(showResult ? won ? 'YOUR SUIT WON' : 'NO MATCH' : 'THE DECK DECIDES', 0, -150, 16, '#cbb891');
  ctx.font = 'bold 245px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = suit === 'hearts' ? '#e25a55' : '#d6e0ed'; ctx.shadowColor = suit === 'hearts' ? '#d93535' : '#8ba2bc'; ctx.shadowBlur = 32;
  ctx.fillText(suit === 'hearts' ? '♥' : '♠', 0, -5); ctx.shadowBlur = 0;
  text(showResult ? won ? 'WINNINGS DOUBLED' : 'WINNINGS LOST' : progress < 5 / 7 ? 'SHUFFLING' : 'SLOWING DOWN', 0, 154, 22, '#f1d998');
  text(showResult ? `${suit === 'hearts' ? '♥' : '♠'} ${suit.toUpperCase()}` : `YOUR PICK: ${choice.toUpperCase()}`, 0, 198, 16, '#cbb891');
  ctx.restore();
}

function bonusAngleBearing(angle: BonusAngle) {
  return ({ 'top-left': -3 * Math.PI / 4, 'top-right': -Math.PI / 4, 'bottom-left': 3 * Math.PI / 4, 'bottom-right': Math.PI / 4 })[angle];
}

function drawBonusGame() {
  const gridLeft = bonusCellRect(0).x, gridTop = bonusCellRect(0).y;
  const gridRight = bonusCellRect(7).x + bonusCellRect(7).w, gridBottom = bonusCellRect(63).y + bonusCellRect(63).h;
  // Cover the old seven-row grid completely, keeping the surrounding cabinet.
  for (let index = 0; index < BONUS_GRID_SIZE ** 2; index++) {
    const column = index % BONUS_GRID_SIZE;
    const sourceRow = Math.min(Math.floor(index / BONUS_GRID_SIZE), BONUS_ART_ROWS.length - 2);
    const rect = bonusCellRect(index);
    ctx.drawImage(bonusArtwork,
      BONUS_ART_COLUMNS[column]!, BONUS_ART_ROWS[sourceRow]!,
      BONUS_ART_COLUMNS[column + 1]! - BONUS_ART_COLUMNS[column]!, BONUS_ART_ROWS[sourceRow + 1]! - BONUS_ART_ROWS[sourceRow]!,
      rect.x, rect.y, rect.w, rect.h);
  }
  panel({ x: 220, y: 24, w: 501, h: 63 }, '#091018d9', '#d9ad5d');
  text(`FREE SPINS LEFT  ${bonusFreeSpins}`, W / 2, 50, 20, '#fff0bd');
  text(`SPIN ${bonusSpinNumber || 1} OF ${bonusSpinTotal || 1} · TREASURE MAP`, W / 2, 73, 12, '#d0ba90');

  bonusGrid.forEach((value, index) => {
    if (value === null) return;
    const rect = bonusCellRect(index), affected = bonusAffected.has(index);
    if (affected) {
      const alpha = bonusRayProgress === null ? .32 : .08 + bonusRayProgress * .24;
      ctx.save(); ctx.fillStyle = `rgba(248, 202, 90, ${alpha})`; ctx.fillRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6); ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = affected ? '#ffe28a' : '#cf8c25'; ctx.shadowBlur = affected ? 20 : 8;
    const label = `${value}×`;
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText(label);
    ctx.fillStyle = affected ? '#fff2bd' : '#eabf67';
    ctx.fillText(label,
      rect.x + rect.w / 2 + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2,
      rect.y + rect.h / 2 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    ctx.restore();
  });

  if (bonusEntry !== null && (bonusLandingProgress !== null || bonusRayProgress !== null || bonusCollecting)) {
    const entry = bonusCellRect(bonusEntry);
    const landing = bonusLandingProgress === null ? 1 : bonusLandingProgress;
    const arrival = 1 - (1 - landing) ** 3;
    const scale = 10 - 9 * arrival;
    const centreX = entry.x + entry.w / 2, centreY = entry.y + entry.h / 2;
    const halfSize = Math.min(entry.w, entry.h) * .3;
    ctx.save();
    ctx.translate(W / 2 + (centreX - W / 2) * arrival, (gridTop + gridBottom) / 2 + (centreY - (gridTop + gridBottom) / 2) * arrival);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#ffecad'; ctx.lineWidth = 5; ctx.shadowColor = '#f6c64f'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(-halfSize, -halfSize); ctx.lineTo(halfSize, halfSize); ctx.moveTo(halfSize, -halfSize); ctx.lineTo(-halfSize, halfSize); ctx.stroke();
    ctx.restore();
  }

  if (bonusAngle && bonusAffected.size && (bonusRayProgress !== null || bonusCollecting)) {
    const entry = bonusCellRect(bonusEntry!);
    // Start at the opposite cell corner so both boundary rays include the X cell.
    const left = bonusAngle.endsWith('left'), top = bonusAngle.startsWith('top');
    const x = left ? entry.x + entry.w : entry.x;
    const y = top ? entry.y + entry.h : entry.y;
    const singleCell = bonusAffected.size === 1;
    const endX = singleCell ? (left ? entry.x : entry.x + entry.w) : (left ? gridLeft : gridRight);
    const endY = singleCell ? (top ? entry.y : entry.y + entry.h) : (top ? gridTop : gridBottom);
    const progress = bonusRayProgress ?? 1;
    const ease = 1 - (1 - progress) ** 3;
    ctx.save(); ctx.strokeStyle = '#ffe6a1'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffd365'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(x + (endX - x) * ease, y); ctx.lineTo(x, y); ctx.lineTo(x, y + (endY - y) * ease); ctx.stroke();
    ctx.restore();
  }

  if (bonusScannerProgress !== null && bonusAngle) {
    const cx = (gridLeft + gridRight) / 2, cy = (gridTop + gridBottom) / 2;
    const start = -Math.PI / 2, target = bonusAngleBearing(bonusAngle);
    const targetOffset = (target - start + Math.PI * 2) % (Math.PI * 2);
    const bearing = start + bonusScannerProgress * (Math.PI * 6 + targetOffset);
    ctx.save(); ctx.fillStyle = '#081019d9'; ctx.beginPath(); ctx.arc(cx, cy, 176, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d7a650'; ctx.lineWidth = 2; ctx.stroke();
    if (bonusAnglePreviewProgress !== null) {
      const blink = .18 + .5 * (.5 + .5 * Math.cos(bonusAnglePreviewProgress * Math.PI * 6));
      ctx.fillStyle = `rgba(255, 202, 81, ${blink})`;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 174, target - Math.PI / 4, target + Math.PI / 4); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#967544'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 160, cy); ctx.lineTo(cx + 160, cy); ctx.moveTo(cx, cy - 160); ctx.lineTo(cx, cy + 160); ctx.stroke();
    ctx.shadowColor = '#ffe17f'; ctx.shadowBlur = 20; ctx.strokeStyle = '#ffdb73'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(bearing) * 153, cy + Math.sin(bearing) * 153); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fillStyle = '#fff0b5'; ctx.fill(); ctx.restore();
    text(bonusAnglePreviewProgress === null ? 'ANGLE SCAN' : 'ANGLE LOCKED', cx, cy - 38, 19, '#fff0bd');
    text(bonusAnglePreviewProgress === null ? 'SONAR LOCKING ON…' : bonusAngle.replace('-', ' ').toUpperCase(), cx, cy + 38, 12, '#d7be8c');
  }

  panel({ x: 225, y: 816, w: 491, h: 65 }, '#091018d9', '#d9ad5d');
  text(`TOTAL MULTIPLIER  ×${Number(bonusTotalMultiplier.toFixed(1))}`, W / 2, 842, 22, '#fff0bd');
  text(bonusCollecting ? 'TREASURE COLLECTED' : 'MULTIPLIERS COLLECTED FROM THE MAP', W / 2, 866, 12, '#d0ba90');
}

function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!ready) return;
  if (bonusActive) {
    ctx.drawImage(bonusArtwork, 0, -CROP_Y, W, 1672);
    drawBonusGame();
    return;
  }
  ctx.drawImage(artwork, 0, -CROP_Y, W, 1672);
  const moving = new Set(motions.map(m => m.card.id));
  for (let i = 0; i < 13; i++) {
    const rect = rankRect(i), rank = ranks[i];
    if (rank) {
      drawCard({ rank, ...(RANKS.includes(rank as typeof RANKS[number]) ? { suit: 'hearts' as const } : {}) }, { ...rect, h: 43 });
      const count = collected[rank] || 0;
      text(rank === 'Wild' && multiplier ? `×${Number(multiplier.toFixed(1))}` : count ? `x${count}` : '—', rect.x + rect.w / 2, rect.y + 53, 14, count ? '#ffe191' : '#b3a68a');
    }
  }
  board.forEach((card, i) => {
    const rect = boardRect(i);
    if (highlighted.includes(i)) {
      ctx.save(); ctx.shadowColor = '#ffd16b'; ctx.shadowBlur = 25;
      panel({ x: rect.x - 2, y: rect.y - 2, w: rect.w + 4, h: rect.h + 4 }, '#ffcb5833', '#ffebaa'); ctx.restore();
    }
    if (card && !moving.has(card.id)) drawCard(card, rect);
  });
  drawMatchPayline();
  shoe.slice(0, 16).forEach((card, i) => { if (!moving.has(card.id)) drawCard(card, queueRect(i)); });
  motions.forEach(m => {
    const t = 1 - (1 - m.progress) ** 3;
    const rect = { x: m.from.x + (m.to.x - m.from.x) * t, y: m.from.y + (m.to.y - m.from.y) * t,
      w: m.from.w + (m.to.w - m.from.w) * t, h: m.from.h + (m.to.h - m.from.h) * t };
    ctx.save();
    if (m.inQueue) { ctx.beginPath(); ctx.rect(82, 1320 - CROP_Y, 779, 52); ctx.clip(); }
    drawCard(m.card, rect, m.fade ? 1 - m.progress : 1); ctx.restore();
  });
  let queueLabel = 'YOUR NEXT CARDS APPEAR HERE';
  if (roundStarted) {
    queueLabel = shoe.length ? `${shoe.length} CARDS REMAINING · NEXT ${Math.min(16, shoe.length)} SHOWN` : '0 CARDS REMAINING · DECK DRAINED';
    if (busy && board.every(card => !card) && !Object.keys(collected).length) queueLabel = 'PREPARING YOUR DECK';
  }
  text(queueLabel, W / 2, 947, 17);
  if (!roundStarted) {
    panel({ x: 237, y: 414, w: 466, h: 130 }, '#080e17ee');
    text('THE KINGDOMS AWAIT', W / 2, 454, 29); text('Tap to shuffle & deal', W / 2, 499, 23, '#d8c397');
  }
  if (floating) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - floatProgress) * 4);
    panel({ x: 258, y: 430 - floatProgress * 35, w: 424, h: 65 }, '#11141aee', '#ffdc80');
    text(floating, W / 2, 464 - floatProgress * 35, 27); ctx.restore();
  }
  drawHighCardsAnnouncement();
  drawGambleShuffle();
}

function resize() {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); render();
}

function animate(duration: number, update: (progress: number) => void = () => {}, fixedDuration = false) {
  return new Promise<void>(resolve => {
    const start = performance.now();
    const frame = (now: number) => {
      const elapsedDuration = fixedDuration ? duration : fast ? Math.min(duration, 45) : duration * GAMEPLAY_DURATION_SCALE;
      const progress = Math.min(1, (now - start) / elapsedDuration);
      update(progress); render();
      if (progress < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

async function move(items: Motion[], duration: number) {
  motions = items;
  await animate(duration, p => motions.forEach(m => { m.progress = p; }));
  motions = []; render();
}

function updateWin(ended = false) {
  document.querySelector('#round-win')!.textContent = money(finalWin(baseWin, multiplier));
  document.querySelector('#win-detail')!.textContent = `${money(baseWin)} base × ${Number((multiplier || 1).toFixed(1))}${ended ? ' · paid' : ''}`;
}

function updateStats() {
  document.querySelector('#spins')!.textContent = String(spins);
  document.querySelector('#free-spins-hits')!.textContent = String(freeSpinHits);
  document.querySelector('#total-win')!.textContent = money(totalWin);
  document.querySelector('#rtp')!.textContent = `${(spins ? totalWin / (spins * BET) * 100 : 0).toFixed(2)}%`;
}

function showBonusAward(freeSpins: number) {
  document.querySelector('#free-spin-award')!.textContent = String(freeSpins);
  document.querySelector('#bonus-copy')!.textContent = `${scatterCount} Scatters uncovered the treasure map.`;
  bonusAward.showModal();
  return new Promise<void>(resolve => { bonusContinueResolver = resolve; });
}

function showBonusResult(payout: number, bonusMultiplier: number) {
  document.querySelector('#bonus-result-copy')!.textContent = `The map collected ×${Number(bonusMultiplier.toFixed(1))}. Your full round win is ${money(payout)} units.`;
  bonusResult.showModal();
  return new Promise<void>(resolve => { bonusResultResolver = resolve; });
}

function showGambleOffer(win: number) {
  document.querySelector('#gamble-stake')!.textContent = money(win);
  const dialog = document.querySelector<HTMLDialogElement>('#gamble-offer')!;
  dialog.showModal();
  return new Promise<'collect' | 'gamble'>(resolve => { gambleOfferResolver = resolve; });
}

function showGambleChoice(win: number) {
  document.querySelector('#gamble-choice-stake')!.textContent = money(win);
  const dialog = document.querySelector<HTMLDialogElement>('#gamble-choice')!;
  dialog.showModal();
  return new Promise<GambleSuit>(resolve => { gambleChoiceResolver = resolve; });
}

async function playGamble(win: number) {
  const offer = await showGambleOffer(win);
  if (offer === 'collect') return { payout: win, message: `${money(win)} collected` };
  const choice = await showGambleChoice(win);
  const outcome = drawGambleSuit(random);
  gambleShuffle = { progress: 0, choice, outcome, showResult: false };
  status.textContent = `Gambling on ${choice}…`;
  await animate(GAMBLE_SHUFFLE_MS, progress => {
    if (!gambleShuffle) return;
    gambleShuffle.progress = progress;
    if (import.meta.env.DEV) canvas.dataset.gamblePhase = progress < 5 / 7 ? 'shuffle' : 'slowdown';
  }, true);
  const payout = gamblePayout(win, choice, outcome);
  gambleShuffle = { progress: 1, choice, outcome, showResult: true };
  if (import.meta.env.DEV) canvas.dataset.gamblePhase = 'result';
  status.textContent = payout ? `Correct: ${outcome} · ${money(payout)} won` : `Missed: ${outcome} · winnings lost`;
  await animate(1500, () => {}, true);
  gambleShuffle = null; delete canvas.dataset.gamblePhase;
  return { payout, message: payout ? `${outcome} picked · ${money(payout)} won` : `${outcome} picked · winnings lost` };
}

async function playBonus(freeSpins: number) {
  await showBonusAward(freeSpins);
  bonusActive = true; bonusFreeSpins = freeSpins; bonusSpinTotal = freeSpins; bonusSpinNumber = 0; bonusTotalMultiplier = 0;
  bonusGrid = Array(BONUS_GRID_SIZE ** 2).fill(null); bonusAngle = null; bonusEntry = null; bonusAffected.clear();
  bonusAnglePreviewProgress = null; bonusLandingProgress = null; bonusRayProgress = null; render();
  for (let spinNumber = 1; spinNumber <= freeSpins; spinNumber++) {
    bonusSpinNumber = spinNumber;
    bonusGrid = drawBonusGrid(random);
    bonusAngle = drawBonusAngle(random);
    bonusEntry = null;
    bonusAffected.clear(); bonusCollecting = false;
    if (import.meta.env.DEV) canvas.dataset.bonusPhase = 'grid';
    status.textContent = `Free Spin ${spinNumber} of ${freeSpins} · multipliers placed`;
    await animate(520);
    bonusScannerProgress = 0;
    if (import.meta.env.DEV) canvas.dataset.bonusPhase = 'scanner';
    status.textContent = `Free Spin ${spinNumber} of ${freeSpins} · choosing an angle`;
    await animate(BONUS_SCANNER_MS, progress => { bonusScannerProgress = progress; }, true);
    bonusAnglePreviewProgress = 0;
    if (import.meta.env.DEV) canvas.dataset.bonusPhase = 'angle-preview';
    status.textContent = `Free Spin ${spinNumber} of ${freeSpins} · ${bonusAngle.replace('-', ' ')} angle selected`;
    await animate(BONUS_ANGLE_PAUSE_MS, progress => { bonusAnglePreviewProgress = progress; }, true);
    bonusScannerProgress = null;
    bonusAnglePreviewProgress = null;
    bonusEntry = Math.min(BONUS_GRID_SIZE ** 2 - 1, Math.floor(random() * BONUS_GRID_SIZE ** 2));
    bonusLandingProgress = 0;
    if (import.meta.env.DEV) canvas.dataset.bonusPhase = 'x-landing';
    status.textContent = `Free Spin ${spinNumber} of ${freeSpins} · X marks the treasure`;
    await animate(BONUS_X_LANDING_MS, progress => { bonusLandingProgress = progress; }, true);
    bonusLandingProgress = null;
    bonusAffected = new Set(bonusAngleCells(bonusEntry, bonusAngle));
    bonusRayProgress = 0;
    if (import.meta.env.DEV) canvas.dataset.bonusPhase = 'rays';
    status.textContent = `Free Spin ${spinNumber} of ${freeSpins} · entry found, mapping treasure rays`;
    await animate(BONUS_RAYS_MS, progress => { bonusRayProgress = progress; }, true);
    bonusRayProgress = null;
    const gained = collectBonusMultipliers(bonusGrid, bonusEntry, bonusAngle);
    bonusTotalMultiplier = Math.round((bonusTotalMultiplier + gained) * 10) / 10;
    bonusCollecting = true;
    if (import.meta.env.DEV) canvas.dataset.bonusPhase = 'collect';
    status.textContent = `Free Spin ${spinNumber} of ${freeSpins} · +${Number(gained.toFixed(1))}× collected`;
    await animate(1000);
    bonusFreeSpins--; bonusCollecting = false;
  }
  bonusActive = false; bonusScannerProgress = null; delete canvas.dataset.bonusPhase; render();
  return bonusTotalMultiplier;
}

function settleRound(win: number, message: string) {
  totalWin = Math.round((totalWin + win) * 100) / 100; updateStats();
  document.querySelector('#round-win')!.textContent = money(win);
  document.querySelector('#win-detail')!.textContent = `${message} · paid`;
}

async function shiftBoard(next: Board) {
  const transitions: Motion[] = [];
  next.forEach((card, to) => {
    if (!card) return;
    const from = board.findIndex(old => old?.id === card.id);
    if (from !== to) transitions.push({ card, from: boardRect(from), to: boardRect(to), progress: 0 });
  });
  board = next;
  if (transitions.length) await move(transitions, 300);
}

async function refill(initial = false) {
  for (let i = 0; i < 16; i++) {
    if (board[i] || !shoe.length) continue;
    const visible = shoe.slice(0, 17);
    const card = shoe.shift()!; board[i] = card;
    await move([
      { card, from: queueRect(0), to: boardRect(i), progress: 0 },
      ...visible.slice(1).map((next, index) => ({ card: next, from: queueRect(index + 1), to: queueRect(index), progress: 0, inQueue: true })),
    ], initial ? 100 : 160);
  }
}

async function startRound() {
  if (!ready || busy || bonusAward.open || bonusResult.open || rules.open) return;
  busy = true; spin.disabled = true; canvas.setAttribute('aria-disabled', 'true');
  roundStarted = true; board = Array(16).fill(null); shoe = []; ranks = []; collected = {}; baseWin = 0; multiplier = 0; scatterCount = 0;
  spins++; updateStats();
  updateWin();
  const highCardsFeature = drawHighCardsFeature(random);
  if (highCardsFeature) {
    status.textContent = 'HIGH CARDS FEATURE!'; featureProgress = 0;
    await animate(FEATURE_ANNOUNCEMENT_MS, progress => {
      featureProgress = progress;
      if (import.meta.env.DEV) canvas.dataset.featurePhase = progress < .2 ? 'grow' : progress < .8 ? 'hold' : 'shrink';
    }, true);
    featureProgress = null;
    delete canvas.dataset.featurePhase;
  }
  const generatedDeck = generateDeck(random);
  const deck = highCardsFeature ? upgradeLowCards(generatedDeck, random) : generatedDeck;
  ranks = uniqueRanks(deck);
  status.textContent = highCardsFeature ? 'High cards deck revealed · all low sets upgraded' : 'Your current deck is revealed'; await animate(750);
  shoe = shuffle(deck, random); status.textContent = 'Shuffling & dealing…'; await animate(250); await refill(true);
  while (true) {
    const match = findMatch(board);
    if (!match) break;
    const cards = match.map(index => board[index]!); const rank = cards[0]!.rank;
    status.textContent = `${rank} diagonal match`; highlighted = match; matchProgress = 0;
    await animate(460, progress => { matchProgress = progress; }); highlighted = [];
    status.textContent = `${rank} pair collected`;
    match.forEach(index => { board[index] = null; });
    const target = rankRect(ranks.indexOf(rank));
    await move(cards.map((card, i) => ({ card, from: boardRect(match[i]!), to: { ...target, h: 43 }, progress: 0, fade: true })), 390);
    collected[rank] = (collected[rank] || 0) + 1;
    baseWin = Math.round((baseWin + pairWin(rank)) * 100) / 100;
    if (rank === 'Scatter') scatterCount += 2;
    if (rank === 'Wild') {
      const reveal = drawMultiplier(random); multiplier = Math.round((multiplier + reveal) * 10) / 10;
      floating = `WILD +${reveal}× · TOTAL ${multiplier}×`;
    } else if (rank === 'Scatter') floating = `${scatterCount} SCATTERS · BONUS UNLOCKED`;
    else floating = `${rank} PAIR · +${money(pairWin(rank))}`;
    floatProgress = 0; updateWin();
    await animate(rank === 'Wild' || rank === 'Scatter' ? 900 : 430, p => { floatProgress = p; }); floating = '';
    status.textContent = 'Sliding left & up…';
    await shiftBoard(compactRows(board)); await shiftBoard(compactBoard(board));
    if (shoe.length) status.textContent = 'Dealing the next cards…';
    await refill(); await animate(170);
  }
  const baseRoundWin = finalWin(baseWin, multiplier);
  const gambleEligible = isGambleEligible(board, shoe);
  const result = gambleEligible ? await playGamble(baseRoundWin) : { payout: baseRoundWin, message: `${money(baseRoundWin)} won` };
  const freeSpins = scatterCount === 4 ? 20 : scatterCount === 2 ? 10 : 0;
  let payout = result.payout, message = result.message, bonusMultiplier = 0;
  if (freeSpins) {
    freeSpinHits++; updateStats();
    bonusMultiplier = await playBonus(freeSpins);
    payout = bonusPayout(result.payout, bonusMultiplier);
    message = `${result.message} · bonus ×${Number(bonusMultiplier.toFixed(1))}`;
  }
  settleRound(payout, message);
  status.textContent = `${gambleEligible ? 'Deck drained' : 'No diagonal pairs remain'} · ${message}`;
  if (freeSpins) await showBonusResult(payout, bonusMultiplier);
  busy = false; spin.disabled = false; spin.innerHTML = 'Deal again <span>↗</span>'; canvas.setAttribute('aria-disabled', 'false');
  render();
}

function play() {
  void startRound().catch(error => {
    console.error(error); status.textContent = 'The round could not finish. Reload to try again.';
    busy = false; ready = false; spin.disabled = true; canvas.setAttribute('aria-disabled', 'true');
  });
}
canvas.addEventListener('click', play); spin.addEventListener('click', play);
document.addEventListener('keydown', event => {
  if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat && !bonusAward.open && !bonusResult.open && !rules.open &&
      !document.querySelector<HTMLDialogElement>('#gamble-offer')!.open && !document.querySelector<HTMLDialogElement>('#gamble-choice')!.open &&
      (document.activeElement === document.body || document.activeElement === canvas)) {
    event.preventDefault(); play();
  }
});
document.querySelector('.rules-button')!.addEventListener('click', () => rules.showModal());
document.querySelector('#close-rules')!.addEventListener('click', () => rules.close());
bonusAward.addEventListener('cancel', event => event.preventDefault());
bonusResult.addEventListener('cancel', event => event.preventDefault());
document.querySelector('#start-bonus')!.addEventListener('click', () => {
  bonusAward.close(); bonusContinueResolver?.(); bonusContinueResolver = null;
});
document.querySelector('#close-bonus-result')!.addEventListener('click', () => {
  bonusResult.close(); bonusResultResolver?.(); bonusResultResolver = null;
});
document.querySelector('#gamble-offer')!.addEventListener('cancel', event => event.preventDefault());
document.querySelector('#gamble-choice')!.addEventListener('cancel', event => event.preventDefault());
document.querySelector('#gamble-collect')!.addEventListener('click', () => {
  document.querySelector<HTMLDialogElement>('#gamble-offer')!.close(); gambleOfferResolver?.('collect'); gambleOfferResolver = null;
});
document.querySelector('#gamble-start')!.addEventListener('click', () => {
  document.querySelector<HTMLDialogElement>('#gamble-offer')!.close(); gambleOfferResolver?.('gamble'); gambleOfferResolver = null;
});
document.querySelector('#pick-hearts')!.addEventListener('click', () => {
  document.querySelector<HTMLDialogElement>('#gamble-choice')!.close(); gambleChoiceResolver?.('hearts'); gambleChoiceResolver = null;
});
document.querySelector('#pick-spades')!.addEventListener('click', () => {
  document.querySelector<HTMLDialogElement>('#gamble-choice')!.close(); gambleChoiceResolver?.('spades'); gambleChoiceResolver = null;
});
new ResizeObserver(resize).observe(canvas);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { fast = testMotion || event.matches; });

async function init() {
  const images = await Promise.all([backgroundUrl, bonusBackgroundUrl, heartsUrl, spadesUrl, diamondsUrl, clubsUrl, jokerUrl].map(loadImage));
  artwork = images[0]!;
  bonusArtwork = images[1]!;
  SUITS.forEach((suit, index) => {
    sprites[suit] = images[index + 2]!;
    RANKS.forEach((rank, frame) => symbolMap.set(`${rank}-${suit}`, { image: sprites[suit], index: frame, frames: 12 }));
  });
  sprites.joker = images[6]!;
  symbolMap.set('Scatter', { image: sprites.joker, index: 0, frames: 2 });
  symbolMap.set('Wild', { image: sprites.joker, index: 1, frames: 2 });
  ready = true; document.querySelector('.loading')!.remove(); spin.disabled = false;
  status.textContent = 'Tap the reels to begin'; resize();
}
void init().catch(error => {
  console.error(error); document.querySelector('.loading')!.textContent = 'Artwork could not load. Please reload to try again.';
  status.textContent = 'Unable to load game assets';
});
