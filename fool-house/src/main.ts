import './style.css';
import reelsUrl from './assets/reels/main-5x5.png';
import titleUrl from './assets/reels/title.png';
import lowSymbolsUrl from './assets/symbols/low.png';
import midSymbolsUrl from './assets/symbols/mid.png';
import highSymbolsUrl from './assets/symbols/high.png';
import scatterUrl from './assets/symbols/scatter.png';
import bonusBackgroundUrl from './assets/background/bonus.png';
import {
  applyRoomMultipliers, BET_CENTS, clearForFloor, collectWins, createPreviewBoard, findWins, generateBoard, getMultiplier, getScatterBonusMoves, isCollectionComplete,
  REEL_COLUMNS, REEL_ROWS, refillBoard, refillForRoom, removeWins, revealMysteries, shouldContinueRoom, SYMBOLS_PER_SPRITE, SYMBOL_TIERS,
} from './game';
import type { Board, RegularSymbol, SymbolKind, SymbolTier } from './game';
import { applyBonusPrize, BONUS_COIN_CENTS, BONUS_WEIGHTS, createBonusState, drawBonusPrize, formatCents, MAX_BONUS_FLOOR } from './bonus';
import type { BonusPrize } from './bonus';
import { BonusCorridor } from './bonus-scene';
import { baseSceneGraph, layoutBaseScene } from './scene';
import type { BaseLayout } from './scene';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) throw new Error('Missing app element');
const app = root;

app.innerHTML = `
  <main class="game">
    <div class="base-scene">
    <canvas role="button" tabindex="0" aria-label="Start a Fool House round" aria-disabled="true"
      aria-describedby="game-message collection-description reels-description">Fool House requires a browser with canvas support.</canvas>
    <p id="collection-description" class="sr-only"></p>
    <p id="reels-description" class="sr-only"></p>
    <div class="reel-overlay" aria-hidden="true">
      <span class="bonus-bank" hidden></span>
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
    </div>
    <section class="bonus-scene" aria-label="Fool House bonus game" tabindex="-1" hidden>
      <img class="bonus-blueprint" src="${bonusBackgroundUrl}" alt="">
      <header class="bonus-header">
        <img class="bonus-logo" src="${titleUrl}" alt="Fool House">
        <h1 class="bonus-heading">Bonus</h1>
      </header>
      <div class="bonus-content">
        <section class="bonus-prizes" aria-label="Potential bonus prizes">
          <div class="bonus-floor"><strong data-bonus-floor>Floor 1</strong><span data-bonus-floor-factor>Coin prizes ×1</span></div>
          <div class="bonus-prize-grid">
            <div><span>Coin · ${BONUS_WEIGHTS.coin.toFixed(2)}%</span><strong data-bonus-coin>1.00</strong></div>
            <div><span>Multiplier · ${BONUS_WEIGHTS.multiplier.toFixed(2)}%</span><strong>×2–×8</strong></div>
            <div><span>Stairs · ${BONUS_WEIGHTS.stairs}%</span><strong data-bonus-stairs>Floor 2 ↑</strong></div>
            <div><span>Ghost · ${BONUS_WEIGHTS.ghost.toFixed(2)}%</span><strong>0.00</strong></div>
          </div>
        </section>
        <div class="bonus-corridor">
          <canvas class="corridor-canvas" aria-hidden="true"></canvas>
          <div class="bonus-doors">
            <button type="button" class="bonus-door" aria-label="Choose left door" disabled>Left</button>
            <button type="button" class="bonus-door" aria-label="Choose middle door" disabled>Middle</button>
            <button type="button" class="bonus-door" aria-label="Choose right door" disabled>Right</button>
          </div>
          <div class="bonus-complete" hidden>
            <h2>Bonus complete</h2><span>Round win</span><p data-bonus-final-win>0.00</p>
            <button type="button" class="bonus-collect">Return to mansion</button>
          </div>
        </div>
        <p class="bonus-action" role="status" aria-live="polite">Walking through the corridor…</p>
      </div>
      <section class="bonus-status" aria-label="Bonus status">
        <dl class="bonus-stats" aria-live="polite" aria-atomic="true">
          <div class="bonus-step-count">
            <dt>Steps</dt>
            <dd><span data-bonus-stat="current-step">1</span> of <span data-bonus-stat="total-steps">0</span> steps</dd>
            <small><span data-bonus-stat="remaining-steps">0</span> remaining</small>
          </div>
          <div><dt>Step win</dt><dd data-bonus-stat="step-win">0.00</dd></div>
          <div><dt>Round win</dt><dd data-bonus-stat="total-win">0.00</dd></div>
        </dl>
      </section>
    </section>
    <dialog class="scatter-bonus-dialog" aria-labelledby="scatter-bonus-title" aria-describedby="scatter-bonus-description">
      <div class="haunted-card">
        <svg class="bonus-web" viewBox="0 0 160 160" aria-hidden="true">
          <path d="M0 0L160 20M0 0L148 68M0 0L112 112M0 0L68 148M0 0L20 160
            M0 32Q18 20 32 4M0 64Q35 40 64 8M0 96Q52 60 96 12M0 128Q70 80 128 16
            M32 4Q30 24 29 58Q48 42 59 27Q58 51 55 80Q77 68 86 40Q88 70 82 102
            M20 44Q40 45 45 20M30 68Q61 68 68 30M44 98Q88 98 98 44M58 128Q114 128 128 58"/>
        </svg>
        <svg class="bonus-web bonus-web-right" viewBox="0 0 160 160" aria-hidden="true">
          <path d="M0 0L160 20M0 0L148 68M0 0L112 112M0 0L68 148M0 0L20 160
            M0 32Q18 20 32 4M0 64Q35 40 64 8M0 96Q52 60 96 12M0 128Q70 80 128 16
            M32 4Q30 24 29 58Q48 42 59 27Q58 51 55 80Q77 68 86 40Q88 70 82 102
            M20 44Q40 45 45 20M30 68Q61 68 68 30M44 98Q88 98 98 44M58 128Q114 128 128 58"/>
        </svg>
        <div class="bonus-dust" aria-hidden="true"></div>
        <div class="blood-drips" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <p class="bonus-eyebrow">The mansion has awakened</p>
        <h1 id="scatter-bonus-title">BONUS<br>TRIGGERED</h1>
        <img class="bonus-mansion" src="${scatterUrl}" alt="" aria-hidden="true">
        <p class="bonus-award"><strong data-bonus-award>6</strong><span>FREE MOVES</span></p>
        <p id="scatter-bonus-description"></p>
        <button class="bonus-continue" type="button" autofocus>Continue</button>
        <p class="bonus-footnote">Your free moves await inside.</p>
        <div class="bonus-ooze" aria-hidden="true"></div>
      </div>
    </dialog>
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
const scatterBonusDialog = app.querySelector<HTMLDialogElement>('.scatter-bonus-dialog')!;
const bonusAward = app.querySelector<HTMLElement>('[data-bonus-award]')!;
const bonusDescription = app.querySelector<HTMLParagraphElement>('#scatter-bonus-description')!;
const bonusContinue = app.querySelector<HTMLButtonElement>('.bonus-continue')!;
const bonusBank = app.querySelector<HTMLSpanElement>('.bonus-bank')!;
const baseScene = app.querySelector<HTMLDivElement>('.base-scene')!;
const bonusScene = app.querySelector<HTMLElement>('.bonus-scene')!;
const bonusStat = (name: string): HTMLElement => app.querySelector<HTMLElement>(`[data-bonus-stat="${name}"]`)!;
const bonusContent = app.querySelector<HTMLDivElement>('.bonus-content')!;
const bonusPrizes = app.querySelector<HTMLElement>('.bonus-prizes')!;
const bonusCorridorFrame = app.querySelector<HTMLDivElement>('.bonus-corridor')!;
const corridorCanvas = app.querySelector<HTMLCanvasElement>('.corridor-canvas')!;
const bonusDoors = [...app.querySelectorAll<HTMLButtonElement>('.bonus-door')];
const bonusAction = app.querySelector<HTMLParagraphElement>('.bonus-action')!;
const bonusComplete = app.querySelector<HTMLDivElement>('.bonus-complete')!;
const bonusCollect = app.querySelector<HTMLButtonElement>('.bonus-collect')!;
const statSpins = app.querySelector<HTMLElement>('[data-stat="spins"]')!;
const statRtp = app.querySelector<HTMLElement>('[data-stat="rtp"]')!;
const statTotalWin = app.querySelector<HTMLElement>('[data-stat="total-win"]')!;
const statRoundWin = app.querySelector<HTMLElement>('[data-stat="round-win"]')!;

type GameState = 'loading' | 'ready' | 'drawing' | 'winning' | 'room-bonus' | 'bonus-trigger' | 'removing' | 'cleared'
  | 'refilling' | 'switching' | 'mystery-waiting' | 'mystery-picking' | 'mystery-reveal' | 'bonus' | 'error';
let gameState: GameState = 'loading';
let bonusMoves = 0;
let scatterBonusAwarded = false;
let bonusSession = createBonusState(1);
let bonusPhase: 'walking' | 'choosing' | 'revealing' | 'complete' = 'walking';
let bonusCorridor: BonusCorridor | undefined;
const session = { spins: 0, totalWagerCents: 0n, totalWinCents: 0n, roundWinCents: 0n };
const formatWin = formatCents;

function renderStats(): void {
  statSpins.textContent = session.spins.toLocaleString('en-US');
  statRtp.textContent = session.totalWagerCents > 0n
    ? `${(Number(session.totalWinCents) / Number(session.totalWagerCents) * 100).toFixed(2)}%`
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
    scatterBonusAwarded = false;
    board = generateBoard();
    session.spins++;
    session.totalWagerCents += BigInt(BET_CENTS);
    session.roundWinCents = 0n;
    renderStats();
    growingCells = allCells();
    await playPhase('drawing', 'Drawing symbols…', DEAL_DURATION);
    if (await resolveRound()) return;
    growingCells.clear();
    updateBoardDescription();
    setGameState('ready', `Won ${formatWin(session.roundWinCents)} · Tap or click · Bet 1.00${bonusMoves ? ` · Bonus: ${bonusMoves} moves saved` : ''}`);
    draw();
  } catch (error) {
    interruptRound(error);
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
  sprites: Record<Exclude<SymbolKind, 'mystery'>, HTMLImageElement>;
}

let assets: SceneAssets | undefined;
let width = 0;
let height = 0;
let board: Board = [];
let collected = new Set<SymbolTier>();
let growingCells = new Set<number>();
let winningCells = new Set<number>();
const mysteryCells = new Set<number>();
let mysteryChoice: RegularSymbol | null = null;
const MYSTERY_PICK_DURATION = 1600;
const MYSTERY_RESULTS_DURATION = 500;
const MYSTERY_REVEAL_DURATION = 450;
const roomBonusCells = new Map<number, number>();
let phaseStartedAt = 0;
let phaseDuration = 1;
let renderedLayout: BaseLayout | undefined;
let respinNumber = 0;
let multiplier = 1;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const GROW_DURATION = 340;
const COLUMN_DELAY = 65;
const ROW_DELAY = 35;
const DEAL_DURATION = GROW_DURATION + (REEL_COLUMNS - 1) * COLUMN_DELAY + (REEL_ROWS - 1) * ROW_DELAY;
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const backgrounds = new Map<Theme['id'], HTMLImageElement>();

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
    `${tier} ${collected.has(tier) ? 'collected' : 'waiting'}`).join(', ')}. Icon index ${assets.theme.symbolIndex}.${collected.size ? ' Refills use this room’s symbols until the set is complete.' : ''}`;
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
      : symbol.tier === 'scatter' ? 'scatter' : symbol.tier === 'mystery' ? 'mystery question mark' : `${symbol.tier}[${symbol.index}]`).join(', ')}.`).join(' ')}`;
}

function playPhase(state: GameState, message: string, duration: number): Promise<void> {
  setGameState(state, message);
  phaseStartedAt = performance.now();
  phaseDuration = reducedMotion.matches && state !== 'switching' && state !== 'room-bonus' && state !== 'mystery-waiting'
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

function renderBonusStats(currentStep: number): void {
  bonusStat('current-step').textContent = String(currentStep);
  bonusStat('total-steps').textContent = String(bonusSession.totalSteps);
  bonusStat('remaining-steps').textContent = String(bonusSession.totalSteps - bonusSession.completedSteps);
  bonusStat('step-win').textContent = formatWin(bonusSession.stepWinCents);
  bonusStat('total-win').textContent = formatWin(bonusSession.totalWinCents);
  app.querySelector<HTMLElement>('[data-bonus-floor]')!.textContent = `Floor ${bonusSession.floor}`;
  app.querySelector<HTMLElement>('[data-bonus-floor-factor]')!.textContent = `Coin prizes ×${bonusSession.floor}`;
  app.querySelector<HTMLElement>('[data-bonus-coin]')!.textContent = formatWin(BONUS_COIN_CENTS * bonusSession.floor);
  app.querySelector<HTMLElement>('[data-bonus-stairs]')!.textContent = bonusSession.floor < MAX_BONUS_FLOOR
    ? `Floor ${bonusSession.floor + 1} ↑` : 'Top floor';
}

function layoutBonusScene(): void {
  if (bonusScene.hidden) return;
  const baseFrame = reelOverlay.getBoundingClientRect();
  const header = app.querySelector<HTMLElement>('.bonus-header')!.getBoundingClientRect();
  const footer = app.querySelector<HTMLElement>('.bonus-status')!.getBoundingClientRect();
  // Keep four prize columns readable even when the landscape reel frame is narrow.
  const contentWidth = Math.min(width - 12, Math.max(320, baseFrame.width));
  bonusContent.style.width = `${contentWidth}px`;
  const extra = bonusPrizes.getBoundingClientRect().height + bonusAction.getBoundingClientRect().height + 12;
  const available = footer.top - header.bottom - 12;
  const stageHeight = Math.max(60, Math.min(baseFrame.height, available - extra));
  const stageWidth = Math.min(contentWidth, stageHeight * 1164 / 1351);
  const actualHeight = stageWidth * 1351 / 1164;
  bonusCorridorFrame.style.width = `${stageWidth}px`;
  bonusCorridorFrame.style.height = `${actualHeight}px`;
  bonusContent.style.top = `${header.bottom + 6 + Math.max(0, (available - actualHeight - extra) / 2)}px`;
  bonusCorridor?.resize();
}

function enterBonusScene(): void {
  bonusSession = createBonusState(bonusMoves, session.roundWinCents);
  bonusComplete.hidden = true;
  bonusCollect.disabled = false;
  bonusCorridor ??= new BonusCorridor(corridorCanvas, bonusDoors);
  setGameState('bonus', `Bonus · ${bonusSession.totalSteps} steps`);
  baseScene.inert = true;
  baseScene.setAttribute('aria-hidden', 'true');
  bonusScene.hidden = false;
  renderBonusStats(1);
  layoutBonusScene();
  void startBonusStep().catch(interruptRound);
}

async function startBonusStep(): Promise<void> {
  bonusPhase = 'walking';
  bonusScene.focus({ preventScroll: true });
  bonusDoors.forEach((door) => { door.disabled = true; });
  renderBonusStats(bonusSession.completedSteps + 1);
  bonusAction.textContent = 'Walking through the corridor…';
  layoutBonusScene();
  await bonusCorridor!.walk();
  bonusPhase = 'choosing';
  bonusDoors.forEach((door) => { door.disabled = false; });
  bonusAction.textContent = 'Choose a door: left, middle or right';
}

function bonusPrizeText(prize: BonusPrize, next: typeof bonusSession): string {
  if (prize.kind === 'coin') return `Coin · +${formatWin(next.stepWinCents)}`;
  if (prize.kind === 'multiplier') return `×${prize.multiplier} · Round win ${formatWin(next.totalWinCents)}`;
  if (prize.kind === 'stairs') return next.floor === bonusSession.floor ? 'Already on the top floor · ×6' : `Upstairs · Floor ${next.floor} · Coin prizes ×${next.floor}`;
  return 'Ghost · No win';
}

async function chooseBonusDoor(index: number): Promise<void> {
  if (gameState !== 'bonus' || bonusPhase !== 'choosing') return;
  bonusPhase = 'revealing';
  bonusScene.focus({ preventScroll: true });
  bonusDoors.forEach((door) => { door.disabled = true; });
  bonusStat('step-win').textContent = '0.00';
  bonusAction.textContent = 'Opening the door…';
  const prize = drawBonusPrize();
  const next = applyBonusPrize(bonusSession, prize);
  const text = bonusPrizeText(prize, next);
  await bonusCorridor!.reveal(index, prize, text, () => {
    bonusSession = next;
    // The starting base win is already credited. Add only each increase to the combined round pot.
    session.totalWinCents += next.stepWinCents;
    session.roundWinCents += next.stepWinCents;
    renderStats();
    renderBonusStats(next.completedSteps);
    bonusAction.textContent = text;
  });
  if (bonusSession.completedSteps === bonusSession.totalSteps) {
    bonusPhase = 'complete';
    bonusAction.textContent = 'All moves complete';
    app.querySelector<HTMLElement>('[data-bonus-final-win]')!.textContent = formatWin(bonusSession.totalWinCents);
    bonusComplete.hidden = false;
    bonusCollect.focus({ preventScroll: true });
  } else await startBonusStep();
}

bonusDoors.forEach((door,index) => door.addEventListener('click', () => { void chooseBonusDoor(index).catch(interruptRound); }));
bonusDoors.forEach((door) => door.addEventListener('keydown', (event) => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
}));
bonusCollect.addEventListener('click', () => { void returnFromBonus().catch(interruptRound); });

async function returnFromBonus(): Promise<void> {
  if (gameState !== 'bonus' || bonusPhase !== 'complete') return;
  bonusCollect.disabled = true;
  bonusCorridor?.stop();
  bonusMoves = 0;
  bonusBank.hidden = true;
  bonusScene.hidden = true;
  baseScene.inert = false;
  baseScene.removeAttribute('aria-hidden');
  setGameState('drawing', 'Returning to the mansion…');
  canvas.focus({ preventScroll: true });
  if (await resolveRound()) return;
  growingCells.clear();
  updateBoardDescription();
  setGameState('ready', `Won ${formatWin(session.roundWinCents)} · Tap or click · Bet 1.00`);
  draw();
}

function interruptRound(error: unknown): void {
  bonusCorridor?.stop();
  bonusScene.hidden = true;
  baseScene.inert = false;
  baseScene.removeAttribute('aria-hidden');
  roomBonusPopup.hidden = true;
  roomBonusCells.clear();
  setGameState('error', 'Round interrupted. Please reload.');
  console.error('Failed to resolve Fool House round:', error);
}

for (const target of [bonusPrizes, bonusAction, app.querySelector('.bonus-header')!, app.querySelector('.bonus-status')!]) {
  new ResizeObserver(layoutBonusScene).observe(target);
}

async function checkScatterBonus(): Promise<boolean> {
  const moves = getScatterBonusMoves(board, scatterBonusAwarded);
  if (!moves) return false;
  // Retain this guard through every floor until the next paid round.
  scatterBonusAwarded = true;
  bonusMoves += moves;
  bonusBank.hidden = false;
  bonusBank.textContent = `BONUS\n${bonusMoves} moves saved`;
  bonusAward.textContent = String(moves);
  bonusDescription.textContent = `${moves} Scatters unlocked ${moves} free moves. ${bonusMoves} moves saved in total.`;
  setGameState('bonus-trigger', `Bonus triggered · ${moves} free moves · Press Continue`);
  updateBoardDescription();
  growingCells.clear();
  draw();
  scatterBonusDialog.showModal();
  return new Promise<boolean>((resolve) => {
    bonusContinue.addEventListener('click', () => {
      enterBonusScene();
      scatterBonusDialog.close();
      bonusScene.focus({ preventScroll: true });
      resolve(true);
    }, { once: true });
  });
}

// The explicit Continue action is required; neither Escape nor a backdrop click dismisses it.
scatterBonusDialog.addEventListener('cancel', (event) => event.preventDefault());

async function refillCurrentRoom(clearBoard = false): Promise<void> {
  if (!assets) return;
  if (clearBoard) board = clearForFloor(board);
  await playPhase('cleared', clearBoard ? `Finding the remaining ${assets.theme.name} symbols…` : 'Refilling empty cells…', 120);
  growingCells = new Set(board.flatMap((row, rowIndex) => row.flatMap((symbol, column) =>
    symbol ? [] : [rowIndex * REEL_COLUMNS + column])));
  board = refillForRoom(board, collected, assets.theme.symbolIndex);
  await playPhase('refilling', collected.size ? `Drawing ${assets.theme.name} symbols…` : 'Drawing replacement symbols…', DEAL_DURATION);
  growingCells.clear();
}

async function revealMysterySymbols(): Promise<void> {
  if (!assets) return;
  if (!board.some((row) => row.some((symbol) => symbol?.tier === 'mystery'))) return;
  growingCells.clear();
  await playPhase('mystery-waiting', 'Reel results · Mystery reveal coming…', MYSTERY_RESULTS_DURATION);
  const reveal = revealMysteries(board, assets.theme.symbolIndex);
  if (!reveal.symbol) return;
  mysteryChoice = reveal.symbol;
  reveal.cells.forEach(({ row, column }) => mysteryCells.add(row * REEL_COLUMNS + column));
  await playPhase('mystery-picking', `${assets.theme.name} mystery · Choosing one symbol…`, MYSTERY_PICK_DURATION);
  board = reveal.board;
  await playPhase('mystery-reveal', `Mystery reveals ${reveal.symbol.tier.toUpperCase()} · ${assets.theme.name}`, MYSTERY_REVEAL_DURATION);
  mysteryCells.clear();
  mysteryChoice = null;
}

// True hands control to the bonus scene after the entire base chain has settled.
async function resolveRound(): Promise<boolean> {
  while (assets) {
    await revealMysterySymbols();
    const baseWins = findWins(board, multiplier);
    if (baseWins.length === 0) {
      // Retained Scatters keep accumulating through cascades, room features and free floors.
      // Only the final board awards bonus moves; Return then settles without retriggering.
      if (!shouldContinueRoom(collected, board)) return checkScatterBonus();
      // No award for clearing unmatched survivors; retain room, progress and Scatter guard.
      await refillCurrentRoom(true);
      continue;
    }
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
    session.totalWinCents += BigInt(award);
    session.roundWinCents += BigInt(award);
    renderStats();
    updateCollectionDescription();

    if (isCollectionComplete(collected)) {
      stagePopup.hidden = false;
      stageDetail.textContent = `Free respin · x${getMultiplier(respinNumber + 1)}`;
      await playPhase('switching', 'Switching to the next stage', 1200);
      board = clearForFloor(board);
      await playPhase('switching', 'Switching to the next stage', 180);
      applyTheme(nextTheme());
      respinNumber++;
      updateMultiplier();
      session.spins++;
      renderStats();
      stagePopup.hidden = true;
      growingCells = new Set(board.flatMap((row, rowIndex) => row.flatMap((symbol, column) =>
        symbol ? [] : [rowIndex * REEL_COLUMNS + column])));
      board = refillBoard(board);
      await playPhase('drawing', `Free respin · x${multiplier}`, DEAL_DURATION);
    } else {
      await refillCurrentRoom();
    }
    growingCells.clear();
  }
  return false;
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

function drawMysterySymbol(x: number, y: number, width: number, height: number, growth: number): void {
  const pulse = reducedMotion.matches ? 1 : .87 + Math.sin(performance.now() / 145) * .13;
  const cx = x + width / 2, cy = y + height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(growth * pulse, growth * pulse);
  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, width * .65);
  aura.addColorStop(0, '#ff80d5aa');
  aura.addColorStop(1, '#ed258e00');
  ctx.fillStyle = aura;
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.strokeStyle = '#ff9bdd';
  ctx.lineWidth = Math.max(1.5, width * .035);
  ctx.shadowColor = '#ff37ae';
  ctx.shadowBlur = width * .3;
  ctx.beginPath();
  ctx.roundRect(-width * .4, -height * .42, width * .8, height * .84, width * .14);
  ctx.stroke();
  const ink = ctx.createLinearGradient(0, -height * .36, 0, height * .36);
  ink.addColorStop(0, '#fff4fd');
  ink.addColorStop(.55, '#ffb7e6');
  ink.addColorStop(1, '#ff45b8');
  ctx.fillStyle = ink;
  ctx.font = `900 ${height * .77}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, height * .035, width * .7);
  ctx.restore();
}

function drawMysteryPicker(left: number, top: number, width: number, height: number): void {
  if (!assets || !mysteryChoice) return;
  const progress = Math.min(1, (performance.now() - phaseStartedAt) / phaseDuration);
  const selected = reducedMotion.matches || progress >= .78
    ? SYMBOL_TIERS.indexOf(mysteryChoice.tier) : Math.floor(10 * (1 - (1 - progress) ** 2)) % 3;
  const w = Math.min(390, width * .88), h = Math.min(190, height * .32);
  const x = left + (width - w) / 2, y = top + (height - h) / 2;
  ctx.save();
  ctx.fillStyle = '#20091bf5';
  ctx.strokeStyle = '#ff7ed1';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff3bb5';
  ctx.shadowBlur = reducedMotion.matches ? 10 : 22;
  ctx.beginPath();ctx.roundRect(x, y, w, h, 12);ctx.fill();ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd4f0';ctx.font = `800 ${Math.max(10, h * .1)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';ctx.textBaseline = 'middle';
  ctx.fillText(`${assets.theme.name.toUpperCase()} MYSTERY`, x + w / 2, y + h * .13, w * .9);
  SYMBOL_TIERS.forEach((tier, index) => {
    const slotX = x + w * (.04 + index * .32), slotW = w * .28;
    if (selected === index) {
      ctx.fillStyle = '#b92c7b99';ctx.strokeStyle = '#ffe4f7';
      ctx.beginPath();ctx.roundRect(slotX, y + h * .25, slotW, h * .68, 7);ctx.fill();ctx.stroke();
    }
    const sprite = assets!.sprites[tier], frameW = sprite.width / SYMBOLS_PER_SPRITE;
    const scale = Math.min(slotW * .9 / frameW, h * .49 / sprite.height);
    const iconW = frameW * scale, iconH = sprite.height * scale;
    ctx.drawImage(sprite, assets!.theme.symbolIndex * frameW, 0, frameW, sprite.height,
      slotX + (slotW - iconW) / 2, y + h * .29 + (h * .49 - iconH) / 2, iconW, iconH);
    ctx.fillStyle = selected === index ? '#fff2fb' : '#b68ca6';
    ctx.font = `800 ${Math.max(8, h * .085)}px system-ui, sans-serif`;
    ctx.fillText(tier.toUpperCase(), slotX + slotW / 2, y + h * .85, slotW);
  });
  ctx.restore();
}

function drawReelSymbols(layout: BaseLayout): void {
  if (!assets) return;
  const scale = layout.scale;
  const sprites = assets.sprites;
  const elapsed = performance.now() - phaseStartedAt;
  const phaseProgress = Math.min(1, elapsed / phaseDuration);
  // Map each cell into its measured aperture beneath the frame artwork.
  board.forEach((row, rowIndex) => row.forEach((symbol, columnIndex) => {
    const cellId = rowIndex * REEL_COLUMNS + columnIndex;
    const { x, y, width: cellWidth, height: cellHeight } = layout.cells[rowIndex][columnIndex];
    const isGrowing = (gameState === 'drawing' || gameState === 'refilling') && growingCells.has(cellId);
    const progress = reducedMotion.matches || !isGrowing ? 1 : Math.max(0, Math.min(1,
      (elapsed - columnIndex * COLUMN_DELAY - rowIndex * ROW_DELAY) / GROW_DURATION));
    const isWinner = winningCells.has(cellId);
    const isRoomBonus = gameState === 'room-bonus' && roomBonusCells.has(cellId);
    const removalScale = gameState === 'removing' && isWinner ? 1 - phaseProgress : 1;
    const isMysteryReveal = gameState === 'mystery-reveal' && mysteryCells.has(cellId);
    const growth = (1 - (1 - progress) ** 3) * removalScale * (isMysteryReveal ? .7 + .3 * (1 - (1 - phaseProgress) ** 3) : 1);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cellWidth, cellHeight, 16 * scale);
    ctx.clip();
    const isScatter = symbol?.tier === 'scatter';
    const isMystery = symbol?.tier === 'mystery';
    ctx.fillStyle = isRoomBonus ? '#175648f2' : isWinner ? '#624014ed' : isMystery ? '#3b092df2' : isScatter ? '#2a103ff2' : '#0c080ce6';
    ctx.fillRect(x, y, cellWidth, cellHeight);
    if (symbol && symbol.tier !== 'scatter' && symbol.tier !== 'mystery' && !isWinner) {
      drawTierOverlay(symbol.tier, x, y, cellWidth, cellHeight);
    }
    if (isMystery && growth > 0) {
      drawMysterySymbol(x, y, cellWidth, cellHeight, growth);
    } else if (symbol && symbol.tier !== 'mystery' && growth > 0) {
      const sprite = sprites[symbol.tier];
      const frameWidth = sprite.width / (isScatter ? 1 : SYMBOLS_PER_SPRITE);
      const labelSpace = isScatter ? cellHeight * 0.25 : 0;
      const iconAreaHeight = cellHeight - labelSpace;
      // Regular sheets include transparent margins; fill more of the aperture without stretching the art.
      const iconScale = Math.min(cellWidth * 0.98 / frameWidth,
        iconAreaHeight * (isScatter ? 1 : 1.08) / sprite.height) * growth;
      const iconWidth = frameWidth * iconScale;
      const iconHeight = sprite.height * iconScale;
      if (isWinner) {
        ctx.shadowColor = isRoomBonus ? '#7affde' : '#ffd16c';
        ctx.shadowBlur = reducedMotion.matches ? 8 : 12 + Math.sin(elapsed / 70) * 6;
      }
      ctx.drawImage(sprite, symbol.index * frameWidth, 0, frameWidth, sprite.height,
        x + (cellWidth - iconWidth) / 2, y + labelSpace + (iconAreaHeight - iconHeight) / 2, iconWidth, iconHeight);
      if (isScatter) drawScatterAccent(x, y, cellWidth, cellHeight, growth);
      if (isMysteryReveal) {
        ctx.strokeStyle = '#ff9cde';
        ctx.shadowColor = '#ff45bc';
        ctx.shadowBlur = reducedMotion.matches ? 8 : 24 * (1 - phaseProgress);
        ctx.lineWidth = Math.max(2, cellWidth * .04);
        ctx.strokeRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
      }
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
  const layout = renderedLayout = layoutBaseScene(width, height, hud.getBoundingClientRect().height, background, reels, title);
  const { x: reelsLeft, y: reelsTop, width: reelsWidth, height: reelsHeight } = layout.reels;
  const { symbolHeight, labelHeight } = layout;
  const collectionHeight = symbolHeight + labelHeight;
  ctx.drawImage(background, layout.background.x, layout.background.y, layout.background.width, layout.background.height);
  reelOverlay.style.left = `${reelsLeft}px`;
  reelOverlay.style.top = `${reelsTop}px`;
  reelOverlay.style.width = `${reelsWidth}px`;
  reelOverlay.style.height = `${reelsHeight}px`;
  reelOverlay.style.fontSize = `${Math.max(10, Math.min(18, reelsWidth * 0.06))}px`;
  multiplierBadge.style.fontSize = `${Math.max(16, Math.min(36, reelsWidth * 0.11))}px`;
  drawReelSymbols(layout);
  ctx.drawImage(reels, reelsLeft, reelsTop, reelsWidth, reelsHeight);
  if (gameState === 'mystery-picking') drawMysteryPicker(reelsLeft, reelsTop, reelsWidth, reelsHeight);

  const collectionTop = layout.slots[0].y;
  const slotWidth = layout.slots[0].width;
  const collectionLeft = layout.collection.x;
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
  ctx.drawImage(title, layout.title.x, layout.title.y, layout.title.width, layout.title.height);
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
  layoutBonusScene();
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
      loadImage(scatterUrl), loadImage(bonusBackgroundUrl),
    ]);
    themes.forEach((room, index) => backgrounds.set(room.id, roomImages[index]));
    const sprites = { low, mid, high, scatter };
    assets = { background: backgrounds.get(theme.id)!, reels, title, theme, sprites, collection: [] };
    applyTheme(theme);
    // Show a quiet, nonwinning preview. The first player tap starts all gameplay.
    board = createPreviewBoard();
    updateBoardDescription();
    setGameState('ready', 'Tap or click to start · Bet 1.00');
    draw();
  } catch (error) {
    setGameState('error', 'Unable to load the game artwork. Please reload to try again.');
    console.error('Failed to load Fool House assets:', error);
  }
}

// Read-only observations are available only in the dedicated development test mode.
// Vite removes this import and the test bridge from production builds.
if (import.meta.env.MODE === 'e2e') {
  void import('./e2e/bridge').then(({ installBridge, observeElements }) => installBridge(() => ({
    state: gameState, phase: { startedAt: phaseStartedAt, duration: phaseDuration, now: performance.now() },
    theme: assets?.theme.id, board, collected: [...collected], multiplier,
    session: { spins: session.spins, wager: String(session.totalWagerCents), win: String(session.totalWinCents), roundWin: String(session.roundWinCents) },
    bonus: { ...bonusSession, startingWinCents: String(bonusSession.startingWinCents), totalWinCents: String(bonusSession.totalWinCents), stepWinCents: String(bonusSession.stepWinCents), phase: bonusPhase },
    scene: renderedLayout ? baseSceneGraph(renderedLayout, board, collected, gameState) : null,
    corridor: bonusCorridor?.getScene() ?? null,
    ui: observeElements([
      { id: 'base-layer', element: baseScene, z: 0 }, { id: 'status', element: hud, z: 60 },
      { id: 'multiplier', element: multiplierBadge, z: 60 }, { id: 'room-award', element: roomBonusPopup, z: 70 },
      { id: 'stage-transition', element: stagePopup, z: 70 }, { id: 'bonus-layer', element: bonusScene, z: 80 },
      { id: 'bonus-prizes', element: bonusPrizes, z: 81 }, { id: 'bonus-complete', element: bonusComplete, z: 82 },
      { id: 'scatter-intro', element: scatterBonusDialog, z: 100 },
    ]),
  })));
}
void start();
