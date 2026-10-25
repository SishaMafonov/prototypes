import './style.css';
import reelsUrl from './assets/reels/main-5x5.png';
import titleUrl from './assets/reels/title.png';
import lowSymbolsUrl from './assets/symbols/low.png';
import midSymbolsUrl from './assets/symbols/mid.png';
import highSymbolsUrl from './assets/symbols/high.png';
import scatterUrl from './assets/symbols/scatter.png';
import {
  applyRoomMultipliers, BET_CENTS, collectWins, findWins, generateBoard, getMultiplier, isCollectionComplete,
  REEL_COLUMNS, REEL_ROWS, refillBoard, removeWins, SYMBOLS_PER_SPRITE, SYMBOL_TIERS,
} from './game';
import type { Board, SymbolKind, SymbolTier } from './game';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('Missing app element');

app.innerHTML = `
  <main class="game">
    <canvas role="button" tabindex="0" aria-label="Start a Fool House round" aria-disabled="true"
      aria-describedby="game-message collection-description reels-description">Fool House requires a browser with canvas support.</canvas>
    <p id="collection-description" class="sr-only"></p>
    <p id="reels-description" class="sr-only"></p>
    <div class="reel-overlay" aria-hidden="true">
      <span class="multiplier">x1</span>
      <div class="room-bonus-popup" hidden>
        <strong class="room-bonus-title">Room bonus</strong>
        <div class="room-bonus-list"></div>
      </div>
      <div class="stage-popup" hidden>Switching to the next stage<small></small></div>
    </div>
    <section class="hud" aria-label="Game status">
      <p id="game-message" class="message" role="status" aria-live="polite" aria-atomic="true">Loading Fool House…</p>
      <div class="stats-bar">
        <dl class="stats" aria-label="Session statistics">
          <div><dt>Spins</dt><dd data-stat="spins">0</dd></div>
          <div><dt>RTP</dt><dd data-stat="rtp">—</dd></div>
          <div><dt>Session win</dt><dd data-stat="total-win">0.00</dd></div>
          <div><dt>Round win</dt><dd data-stat="round-win">0.00</dd></div>
        </dl>
      </div>
    </section>
  </main>
`;

const canvas = app.querySelector('canvas')!;
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable');
const ctx = context;
const status = app.querySelector<HTMLParagraphElement>('.message')!;
const hud = app.querySelector<HTMLElement>('.hud')!;
const collectionDescription = app.querySelector<HTMLParagraphElement>('#collection-description')!;
const reelsDescription = app.querySelector<HTMLParagraphElement>('#reels-description')!;
const reelOverlay = app.querySelector<HTMLDivElement>('.reel-overlay')!;
const multiplierBadge = app.querySelector<HTMLSpanElement>('.multiplier')!;
const roomBonusPopup = app.querySelector<HTMLDivElement>('.room-bonus-popup')!;
const roomBonusTitle = app.querySelector<HTMLElement>('.room-bonus-title')!;
const roomBonusList = app.querySelector<HTMLDivElement>('.room-bonus-list')!;
const stagePopup = app.querySelector<HTMLDivElement>('.stage-popup')!;
const stageDetail = stagePopup.querySelector('small')!;
const statSpins = app.querySelector<HTMLElement>('[data-stat="spins"]')!;
const statRtp = app.querySelector<HTMLElement>('[data-stat="rtp"]')!;
const statTotalWin = app.querySelector<HTMLElement>('[data-stat="total-win"]')!;
const statRoundWin = app.querySelector<HTMLElement>('[data-stat="round-win"]')!;

type GameState = 'loading' | 'ready' | 'drawing' | 'winning' | 'room-bonus' | 'removing' | 'cleared'
  | 'refilling' | 'switching' | 'error';
let gameState: GameState = 'loading';
const session = { spins: 0, totalWagerCents: 0, totalWinCents: 0, roundWinCents: 0 };
const winFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatWin = (cents: number): string => winFormat.format(cents / 100);

function renderStats(): void {
  statSpins.textContent = session.spins.toLocaleString('en-US');
  statRtp.textContent = session.totalWagerCents > 0
    ? `${(session.totalWinCents / session.totalWagerCents * 100).toFixed(2)}%`
    : '—';
  statTotalWin.textContent = formatWin(session.totalWinCents);
  statRoundWin.textContent = formatWin(session.roundWinCents);
}

function setGameState(state: GameState, message: string): void {
  gameState = state;
  status.textContent = message;
  canvas.setAttribute('aria-disabled', String(state !== 'ready'));
}

async function requestRound(): Promise<void> {
  if (gameState !== 'ready' || !assets) return;
  setGameState('drawing', 'Preparing the next round…');
  try {
    respinNumber = 0;
    updateMultiplier();
    applyTheme(nextTheme());
    board = generateBoard();
    session.spins++;
    session.totalWagerCents += BET_CENTS;
    session.roundWinCents = 0;
    renderStats();
    growingCells = allCells();
    await playPhase('drawing', 'Drawing symbols…', DEAL_DURATION);
    await resolveRound();
    growingCells.clear();
    updateBoardDescription();
    setGameState('ready', `Won ${formatWin(session.roundWinCents)} · Tap or click · Bet 1.00`);
    draw();
  } catch (error) {
    roomBonusPopup.hidden = true;
    roomBonusCells.clear();
    setGameState('error', 'Round interrupted. Please reload.');
    console.error('Failed to resolve Fool House round:', error);
  }
}

canvas.addEventListener('click', requestRound);
canvas.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  if (!event.repeat) requestRound();
});
renderStats();

// Decode all backgrounds at startup so automatic free stages never wait for artwork.
const backgroundUrls = import.meta.glob<string>(
  './assets/background/*.png',
  { eager: true, query: '?url', import: 'default' },
);

// This order is the sprite contract: never derive indexes from glob/file order.
const themes = [
  { id: 'basement', name: 'Basement', symbolIndex: 0 },
  { id: 'hall', name: 'Hall', symbolIndex: 1 },
  { id: 'museum', name: 'Museum', symbolIndex: 2 },
  { id: 'guests', name: 'Guests', symbolIndex: 3 },
  { id: 'attic', name: 'Attic', symbolIndex: 4 },
] as const;
type Theme = typeof themes[number];

interface CollectionSymbol {
  id: `${Theme['id']}:${SymbolTier}`;
  tier: SymbolTier;
  index: number;
  sprite: HTMLImageElement;
}

interface SceneAssets {
  background: HTMLImageElement;
  reels: HTMLImageElement;
  title: HTMLImageElement;
  theme: Theme;
  collection: CollectionSymbol[];
  sprites: Record<SymbolKind, HTMLImageElement>;
}

let assets: SceneAssets | undefined;
let width = 0;
let height = 0;
let board: Board = [];
let collected = new Set<SymbolTier>();
let growingCells = new Set<number>();
let winningCells = new Set<number>();
const roomBonusCells = new Map<number, number>();
let phaseStartedAt = 0;
let phaseDuration = 1;
let respinNumber = 0;
let multiplier = 1;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const GROW_DURATION = 340;
const COLUMN_DELAY = 65;
const ROW_DELAY = 35;
const DEAL_DURATION = GROW_DURATION + (REEL_COLUMNS - 1) * COLUMN_DELAY + (REEL_ROWS - 1) * ROW_DELAY;
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const backgrounds = new Map<Theme['id'], HTMLImageElement>();

// Transparent opening bounds in main-5x5.png (1164 × 1351 source pixels).
const REEL_COLUMN_OPENINGS = [[143, 147], [321, 153], [505, 154], [690, 153], [875, 146]] as const;
const REEL_ROW_OPENINGS = [[202, 143], [377, 161], [572, 164], [769, 160], [963, 162]] as const;

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const pending = (async () => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  })();
  imageCache.set(url, pending);
  // A failed download can be retried on the next round request.
  void pending.catch(() => imageCache.delete(url));
  return pending;
}

function loadBackground(theme: Theme): Promise<HTMLImageElement> {
  const url = backgroundUrls[`./assets/background/${theme.id}.png`];
  if (!url) return Promise.reject(new Error(`Missing background for ${theme.id}`));
  return loadImage(url);
}

function nextTheme(): Theme {
  const candidates = themes.filter((theme) => theme.id !== assets?.theme.id);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function updateCollectionDescription(): void {
  if (!assets) return;
  collectionDescription.textContent = `${assets.theme.name} collection: ${SYMBOL_TIERS.map((tier) =>
    `${tier} ${collected.has(tier) ? 'collected' : 'waiting'}`).join(', ')}. Icon index ${assets.theme.symbolIndex}.`;
}

function applyTheme(theme: Theme): void {
  if (!assets) return;
  assets.theme = theme;
  assets.background = backgrounds.get(theme.id)!;
  collected = new Set();
  assets.collection = SYMBOL_TIERS.map((tier) => ({
    id: `${theme.id}:${tier}`,
    tier,
    index: theme.symbolIndex,
    sprite: assets!.sprites[tier],
  }));
  updateCollectionDescription();
}

function updateMultiplier(): void {
  multiplier = getMultiplier(respinNumber);
  multiplierBadge.textContent = `x${multiplier}`;
  multiplierBadge.classList.toggle('boosted', multiplier > 1);
}

function allCells(): Set<number> {
  return new Set(Array.from({ length: REEL_ROWS * REEL_COLUMNS }, (_, index) => index));
}

function updateBoardDescription(): void {
  reelsDescription.textContent = `Multiplier x${multiplier}. ${REEL_COLUMNS} columns and ${REEL_ROWS} rows. ${board.map((row, index) =>
    `Row ${index + 1}: ${row.map((symbol) => !symbol ? 'empty'
      : symbol.tier === 'scatter' ? 'scatter' : `${symbol.tier}[${symbol.index}]`).join(', ')}.`).join(' ')}`;
}

function playPhase(state: GameState, message: string, duration: number): Promise<void> {
  setGameState(state, message);
  phaseStartedAt = performance.now();
  phaseDuration = reducedMotion.matches && state !== 'switching' && state !== 'room-bonus'
    ? Math.min(duration, 180) : duration;
  updateBoardDescription();
  draw();
  return new Promise((resolve) => {
    function frame(now: number): void {
      draw();
      if (now - phaseStartedAt >= phaseDuration) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

async function resolveRound(): Promise<void> {
  while (assets) {
    const baseWins = findWins(board, multiplier);
    if (baseWins.length === 0) return;
    winningCells = new Set(baseWins.flatMap((win) => win.cells.map((cell) => cell.row * REEL_COLUMNS + cell.column)));
    const baseAward = baseWins.reduce((sum, win) => sum + win.winCents, 0);
    await playPhase('winning', `Win ${formatWin(baseAward)} · x${multiplier}`, 550);
    const wins = applyRoomMultipliers(baseWins, assets.theme.symbolIndex);
    const boosted = wins.filter((win) => win.roomMultiplier > 1);
    const award = wins.reduce((sum, win) => sum + win.winCents, 0);
    if (boosted.length > 0) {
      roomBonusTitle.textContent = `${assets.theme.name} bonus`;
      roomBonusList.innerHTML = boosted.map((win) => `
        <div class="room-bonus-row">
          <span>${win.symbol.tier.toUpperCase()}</span><strong>×${win.roomMultiplier}</strong>
          <small>${formatWin(win.unboostedWinCents)} → ${formatWin(win.winCents)}</small>
        </div>
      `).join('');
      for (const win of boosted) {
        for (const cell of win.cells) roomBonusCells.set(cell.row * REEL_COLUMNS + cell.column, win.roomMultiplier);
      }
      roomBonusPopup.hidden = false;
      await playPhase('room-bonus', `Room bonus ${boosted.map((win) => `×${win.roomMultiplier}`).join('/')} · Win ${formatWin(award)}`, 1100);
      roomBonusPopup.hidden = true;
      roomBonusCells.clear();
    }
    await playPhase('removing', `Collecting ${formatWin(award)}…`, 240);
    board = removeWins(board, wins);
    collected = collectWins(collected, wins, assets.theme.symbolIndex);
    winningCells.clear();
    session.totalWinCents += award;
    session.roundWinCents += award;
    renderStats();
    updateCollectionDescription();

    if (isCollectionComplete(collected)) {
      stagePopup.hidden = false;
      stageDetail.textContent = `Free respin · x${getMultiplier(respinNumber + 1)}`;
      await playPhase('switching', 'Switching to the next stage', 1200);
      board = Array.from({ length: REEL_ROWS }, () => Array(REEL_COLUMNS).fill(null));
      await playPhase('switching', 'Switching to the next stage', 180);
      applyTheme(nextTheme());
      respinNumber++;
      updateMultiplier();
      session.spins++;
      renderStats();
      stagePopup.hidden = true;
      board = generateBoard();
      growingCells = allCells();
      await playPhase('drawing', `Free respin · x${multiplier}`, DEAL_DURATION);
    } else {
      await playPhase('cleared', 'Refilling empty cells…', 120);
      growingCells = new Set(board.flatMap((row, rowIndex) => row.flatMap((symbol, column) =>
        symbol ? [] : [rowIndex * REEL_COLUMNS + column])));
      board = refillBoard(board);
      await playPhase('refilling', 'Drawing replacement symbols…', DEAL_DURATION);
    }
    growingCells.clear();
  }
}

function drawTierOverlay(tier: SymbolTier, x: number, y: number, width: number, height: number): void {
  if (tier === 'low') return;
  const tint = ctx.createRadialGradient(
    x + width / 2, y + height / 2, 0,
    x + width / 2, y + height / 2, Math.max(width, height) * 0.7,
  );
  tint.addColorStop(0, tier === 'mid' ? 'rgba(255, 145, 145, 0.28)' : 'rgba(255, 218, 140, 0.30)');
  tint.addColorStop(1, tier === 'mid' ? 'rgba(215, 78, 90, 0.10)' : 'rgba(230, 171, 66, 0.10)');
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, width, height);
}

function drawScatterAccent(x: number, y: number, width: number, height: number, growth: number): void {
  ctx.save();
  ctx.globalAlpha *= growth;
  const inset = Math.max(1, width * 0.045);
  const border = ctx.createLinearGradient(x, y, x + width, y + height);
  border.addColorStop(0, '#fff0ff');
  border.addColorStop(0.45, '#d88bff');
  border.addColorStop(1, '#8d3de8');
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.max(1, Math.min(2.5, width * 0.045));
  ctx.shadowColor = '#c658ff';
  ctx.shadowBlur = Math.min(12, width * 0.2);
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, width - inset * 2, height - inset * 2, width * 0.1);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const labelHeight = height * 0.22;
  ctx.fillStyle = '#310b4ff2';
  ctx.beginPath();
  ctx.roundRect(x + width * 0.07, y + height * 0.035, width * 0.86, labelHeight, width * 0.05);
  ctx.fill();
  ctx.font = `900 ${labelHeight * 0.75}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff4ff';
  ctx.fillText('SCATTER', x + width / 2, y + height * 0.035 + labelHeight / 2, width * 0.79);
  ctx.restore();
}

function drawReelSymbols(left: number, top: number, scale: number): void {
  if (!assets) return;
  const sprites = assets.sprites;
  const elapsed = performance.now() - phaseStartedAt;
  const phaseProgress = Math.min(1, elapsed / phaseDuration);
  // Map each cell into its measured aperture beneath the frame artwork.
  board.forEach((row, rowIndex) => row.forEach((symbol, columnIndex) => {
    const cellId = rowIndex * REEL_COLUMNS + columnIndex;
    const [sourceX, sourceWidth] = REEL_COLUMN_OPENINGS[columnIndex];
    const [sourceY, sourceHeight] = REEL_ROW_OPENINGS[rowIndex];
    const x = left + sourceX * scale;
    const y = top + sourceY * scale;
    const cellWidth = sourceWidth * scale;
    const cellHeight = sourceHeight * scale;
    const isGrowing = (gameState === 'drawing' || gameState === 'refilling') && growingCells.has(cellId);
    const progress = reducedMotion.matches || !isGrowing ? 1 : Math.max(0, Math.min(1,
      (elapsed - columnIndex * COLUMN_DELAY - rowIndex * ROW_DELAY) / GROW_DURATION));
    const isWinner = winningCells.has(cellId);
    const isRoomBonus = gameState === 'room-bonus' && roomBonusCells.has(cellId);
    const removalScale = gameState === 'removing' && isWinner ? 1 - phaseProgress : 1;
    const growth = (1 - (1 - progress) ** 3) * removalScale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cellWidth, cellHeight, 16 * scale);
    ctx.clip();
    const isScatter = symbol?.tier === 'scatter';
    ctx.fillStyle = isRoomBonus ? '#175648f2' : isWinner ? '#624014ed' : isScatter ? '#2a103ff2' : '#0c080ce6';
    ctx.fillRect(x, y, cellWidth, cellHeight);
    if (symbol && symbol.tier !== 'scatter' && !isWinner) {
      drawTierOverlay(symbol.tier, x, y, cellWidth, cellHeight);
    }
    if (symbol && growth > 0) {
      const sprite = sprites[symbol.tier];
      const frameWidth = sprite.width / (isScatter ? 1 : SYMBOLS_PER_SPRITE);
      const labelSpace = isScatter ? cellHeight * 0.25 : 0;
      const iconAreaHeight = cellHeight - labelSpace;
      const iconScale = Math.min(cellWidth * 0.9 / frameWidth, iconAreaHeight * 0.94 / sprite.height) * growth;
      const iconWidth = frameWidth * iconScale;
      const iconHeight = sprite.height * iconScale;
      if (isWinner) {
        ctx.shadowColor = isRoomBonus ? '#7affde' : '#ffd16c';
        ctx.shadowBlur = reducedMotion.matches ? 8 : 12 + Math.sin(elapsed / 70) * 6;
      }
      ctx.drawImage(sprite, symbol.index * frameWidth, 0, frameWidth, sprite.height,
        x + (cellWidth - iconWidth) / 2, y + labelSpace + (iconAreaHeight - iconHeight) / 2, iconWidth, iconHeight);
      if (isScatter) drawScatterAccent(x, y, cellWidth, cellHeight, growth);
    }
    ctx.restore();
    if (isWinner) {
      ctx.save();
      ctx.strokeStyle = isRoomBonus ? '#7affde' : '#ffdc83';
      ctx.lineWidth = Math.max(1, 6 * scale);
      ctx.strokeRect(x + 2 * scale, y + 2 * scale, cellWidth - 4 * scale, cellHeight - 4 * scale);
      ctx.restore();
    }
  }));
}

function draw(): void {
  ctx.clearRect(0, 0, width, height);
  if (!assets) return;

  const { background, reels, title } = assets;
  const backgroundScale = Math.max(width / background.width, height / background.height);
  const backgroundWidth = background.width * backgroundScale;
  const backgroundHeight = background.height * backgroundScale;
  ctx.drawImage(background, (width - backgroundWidth) / 2, (height - backgroundHeight) / 2,
    backgroundWidth, backgroundHeight);

  const padding = Math.min(24, Math.min(width, height) * 0.03);
  const gap = Math.min(16, height * 0.02);
  const titleScale = Math.min(
    (width - padding * 2) / title.width,
    Math.min(150, height * 0.14) / title.height,
  );
  const titleWidth = title.width * titleScale;
  const titleHeight = title.height * titleScale;

  const compact = height < 500;
  const symbolHeight = Math.min(80, height * (compact ? 0.08 : 0.09));
  const labelHeight = compact ? 13 : 15;
  const collectionHeight = symbolHeight + labelHeight;

  // Keep the reels centered, with the collection below them and clear of the HUD.
  const topReserve = padding + titleHeight + gap;
  const hudTop = height - hud.getBoundingClientRect().height;
  const bottomReserve = height - hudTop + collectionHeight + gap * 2;
  const reelsScale = Math.min(
    (width - padding * 2) / reels.width,
    Math.max(1, height - 2 * Math.max(topReserve, bottomReserve)) / reels.height,
  );
  const reelsWidth = reels.width * reelsScale;
  const reelsHeight = reels.height * reelsScale;
  const reelsLeft = (width - reelsWidth) / 2;
  const reelsTop = (height - reelsHeight) / 2;
  reelOverlay.style.left = `${reelsLeft}px`;
  reelOverlay.style.top = `${reelsTop}px`;
  reelOverlay.style.width = `${reelsWidth}px`;
  reelOverlay.style.height = `${reelsHeight}px`;
  reelOverlay.style.fontSize = `${Math.max(10, Math.min(18, reelsWidth * 0.06))}px`;
  multiplierBadge.style.fontSize = `${Math.max(16, Math.min(36, reelsWidth * 0.11))}px`;
  drawReelSymbols(reelsLeft, reelsTop, reelsScale);
  ctx.drawImage(reels, reelsLeft, reelsTop, reelsWidth, reelsHeight);

  const collectionTop = ((height + reelsHeight) / 2 + hudTop - collectionHeight) / 2;
  const slotWidth = Math.min(compact ? 64 : 100, (width - padding * 2) / 3);
  const collectionLeft = (width - slotWidth * 3) / 2;
  ctx.fillStyle = '#100d0bd9';
  ctx.strokeStyle = '#92724399';
  ctx.beginPath();
  ctx.roundRect(collectionLeft, collectionTop - 4, slotWidth * 3, collectionHeight + 8, 6);
  ctx.fill();
  ctx.stroke();
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  assets.collection.forEach((symbol, slot) => {
    const frameWidth = symbol.sprite.width / SYMBOLS_PER_SPRITE;
    const scale = Math.min(symbolHeight / symbol.sprite.height, (slotWidth - 8) / frameWidth);
    const iconWidth = frameWidth * scale;
    const iconHeight = symbol.sprite.height * scale;
    const centerX = collectionLeft + slotWidth * (slot + 0.5);
    const hasCollected = collected.has(symbol.tier);
    ctx.save();
    if (!hasCollected) {
      drawTierOverlay(symbol.tier, centerX - slotWidth / 2 + 2, collectionTop, slotWidth - 4, collectionHeight);
    }
    if (hasCollected) {
      ctx.fillStyle = '#95702255';
      ctx.fillRect(centerX - slotWidth / 2 + 2, collectionTop, slotWidth - 4, collectionHeight);
      ctx.strokeStyle = '#ffe29a';
      ctx.strokeRect(centerX - slotWidth / 2 + 2, collectionTop, slotWidth - 4, collectionHeight);
      ctx.shadowColor = '#ffd16c';
      ctx.shadowBlur = 14;
    }
    ctx.drawImage(symbol.sprite,
      symbol.index * frameWidth, 0, frameWidth, symbol.sprite.height,
      centerX - iconWidth / 2, collectionTop + (symbolHeight - iconHeight) / 2,
      iconWidth, iconHeight);
    ctx.shadowBlur = 0;
    ctx.fillStyle = hasCollected ? '#ffe29a' : '#f5e4c5';
    ctx.fillText(`${symbol.tier.toUpperCase()}${hasCollected ? ' ✓' : ''}`, centerX, collectionTop + symbolHeight + 2);
    ctx.restore();
  });
  ctx.drawImage(title, (width - titleWidth) / 2, padding, titleWidth, titleHeight);
}

function resize(): void {
  const bounds = canvas.getBoundingClientRect();
  width = bounds.width;
  height = bounds.height;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  draw();
}

new ResizeObserver(resize).observe(canvas);
new ResizeObserver(draw).observe(hud);
window.addEventListener('resize', resize);
resize();

async function start(): Promise<void> {
  try {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const [roomImages, reels, title, low, mid, high, scatter] = await Promise.all([
      Promise.all(themes.map(loadBackground)), loadImage(reelsUrl), loadImage(titleUrl),
      loadImage(lowSymbolsUrl), loadImage(midSymbolsUrl), loadImage(highSymbolsUrl),
      loadImage(scatterUrl),
    ]);
    themes.forEach((room, index) => backgrounds.set(room.id, roomImages[index]));
    const sprites = { low, mid, high, scatter };
    assets = { background: backgrounds.get(theme.id)!, reels, title, theme, sprites, collection: [] };
    applyTheme(theme);
    // Populate the opening scene without charging or counting a player spin.
    board = generateBoard();
    growingCells = allCells();
    await playPhase('drawing', 'Drawing symbols…', DEAL_DURATION);
    growingCells.clear();
    setGameState('ready', 'Tap or click to start · Bet 1.00');
    draw();
  } catch (error) {
    setGameState('error', 'Unable to load the game artwork. Please reload to try again.');
    console.error('Failed to load Fool House assets:', error);
  }
}

void start();
