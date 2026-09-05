import './style.css';
import backgroundUrl from './assets/reels/main.png';
import heartsUrl from './assets/symbols/hearts.png';
import spadesUrl from './assets/symbols/spades.png';
import diamondsUrl from './assets/symbols/diamonds.png';
import clubsUrl from './assets/symbols/clubs.png';
import jokerUrl from './assets/symbols/joker.png';
import { BET, RANKS, SUITS, generateDeck, shuffle, uniqueRanks, findMatch, compactRows, compactBoard,
  pairWin, drawMultiplier, finalWin, type Card, type Board, type Rank, type Suit } from './game';

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
    <footer aria-label="Session statistics"><div><span>SPINS</span><strong id="spins">0</strong></div><div><span>TOTAL WIN</span><strong id="total-win">0.00</strong></div><div><span>RETURN TO PLAYER</span><strong id="rtp">0.00%</strong></div></footer>
    <p class="footnote">Prototype · Play units · Tap the reels or press Space to deal</p>
  </main>
  <dialog id="bonus"><span class="eyebrow">THE MAP IS COMPLETE</span><h2>Bonus unlocked</h2><p id="bonus-copy"></p><div class="bonus-icon">✦</div><p>Your next adventure is coming soon.<br>This is the bonus game placeholder.</p><button id="close-bonus">Back to the kingdoms</button></dialog>
  <dialog id="rules"><span class="eyebrow">A GAME OF DIAGONALS</span><h2>How to play</h2>
    <p>Each 1.00-unit round draws a 48-card deck. The top bar shows its unique ranks; the lower strip previews the next 16 cards.</p>
    <p>Equal ranks match diagonally within rows 1–2, then rows 3–4. Descending diagonals are checked left to right before ascending diagonals right to left. Suits do not affect matches. Cards slide left, then up, and refill from the upcoming strip.</p>
    <div class="paytable"><span>2–6 / pair</span><b>0.10</b><span>7–10 / pair</span><b>0.50</b><span>J–K / pair</span><b>1.00</b></div>
    <p>Wild matches Wild. Each collected pair reveals a multiplier; these add together and multiply the round’s base win. No Wild means ×1. Two or four collected Scatters unlock the bonus placeholder.</p>
    <p class="muted">Draw weights: low 50, medium 40, high 30, Scatter 10, Wild 20, normalized across available groups. Each draw adds four cards; normal ranks include all four suits. At most one four-Scatter draw per deck. Counters show collected pairs. Statistics last for this page session.</p>
    <button id="close-rules">Let’s play</button></dialog>`;

const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const ctx = canvas.getContext('2d')!;
const spin = document.querySelector<HTMLButtonElement>('#spin')!;
const status = document.querySelector<HTMLElement>('#status')!;
const bonus = document.querySelector<HTMLDialogElement>('#bonus')!;
const rules = document.querySelector<HTMLDialogElement>('#rules')!;
const money = (n: number) => n.toFixed(2);
const W = 941, H = 990, CROP_Y = 450;
const GAMEPLAY_DURATION_SCALE = 1.25;
interface Rect { x: number; y: number; w: number; h: number }
interface Motion { card: Card; from: Rect; to: Rect; progress: number; fade?: boolean; inQueue?: boolean }
const boardRect = (index: number): Rect => ({ x: 161 + (index % 4) * 157, y: 641 - CROP_Y + Math.floor(index / 4) * 156, w: 140, h: 137 });
const queueRect = (index: number): Rect => ({ x: 82 + index * 48.6, y: 1320 - CROP_Y, w: 45, h: 52 });
const rankRect = (index: number): Rect => ({ x: 42 + index * 67.1, y: 521 - CROP_Y, w: 56, h: 58 });

let artwork: HTMLImageElement;
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
let spins = 0, totalWin = 0;
let floating = '', floatProgress = 0;
let roundStarted = false;
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
  const direction = Math.sign(end.x - start.x);
  const entryX = direction > 0 ? 133 : 808;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = '#ffc44f'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(entryX, start.y); ctx.lineTo(start.x, start.y); ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = '#41230c'; ctx.lineWidth = 13; ctx.stroke();
  ctx.strokeStyle = '#ffd065'; ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = '#fff5ca'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;

  // The entry badge identifies the scan side; the traveling arrow points at the second card.
  ctx.beginPath(); ctx.arc(entryX, start.y, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#24180f'; ctx.fill(); ctx.strokeStyle = '#ffe098'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(entryX - direction * 5, start.y - 7);
  ctx.lineTo(entryX + direction * 5, start.y);
  ctx.lineTo(entryX - direction * 5, start.y + 7);
  ctx.stroke();

  ctx.beginPath(); ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#24180f'; ctx.fill(); ctx.stroke();
  const travel = fast ? .6 : .22 + matchProgress * .5;
  ctx.translate(start.x + (end.x - start.x) * travel, start.y + (end.y - start.y) * travel);
  ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, -10); ctx.lineTo(-5, 0); ctx.lineTo(-9, 10); ctx.closePath();
  ctx.fillStyle = '#fff5ca'; ctx.fill(); ctx.strokeStyle = '#7c4c15'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!ready) return;
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
}

function resize() {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); render();
}

function animate(duration: number, update: (progress: number) => void = () => {}) {
  return new Promise<void>(resolve => {
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / (fast ? Math.min(duration, 45) : duration * GAMEPLAY_DURATION_SCALE));
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
  document.querySelector('#total-win')!.textContent = money(totalWin);
  document.querySelector('#rtp')!.textContent = `${(spins ? totalWin / (spins * BET) * 100 : 0).toFixed(2)}%`;
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
  if (!ready || busy || bonus.open || rules.open) return;
  busy = true; spin.disabled = true; canvas.setAttribute('aria-disabled', 'true');
  roundStarted = true; board = Array(16).fill(null); shoe = []; collected = {}; baseWin = 0; multiplier = 0; scatterCount = 0;
  spins++; updateStats();
  const deck = generateDeck(random); ranks = uniqueRanks(deck);
  updateWin(); status.textContent = 'Your current deck is revealed'; await animate(750);
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
  const win = finalWin(baseWin, multiplier);
  totalWin = Math.round((totalWin + win) * 100) / 100; updateStats();
  updateWin(true);
  status.textContent = `${board.every(card => !card) ? 'All cards collected' : 'No diagonal pairs remain'} · ${money(win)} won`;
  busy = false; spin.disabled = false; spin.innerHTML = 'Deal again <span>↗</span>'; canvas.setAttribute('aria-disabled', 'false');
  if (scatterCount >= 2) {
    document.querySelector('#bonus-copy')!.textContent = `${scatterCount} Scatters collected · Base-game win ${money(win)} units.`;
    bonus.showModal();
  }
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
  if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat && !bonus.open && !rules.open &&
      (document.activeElement === document.body || document.activeElement === canvas)) {
    event.preventDefault(); play();
  }
});
document.querySelector('.rules-button')!.addEventListener('click', () => rules.showModal());
document.querySelector('#close-rules')!.addEventListener('click', () => rules.close());
document.querySelector('#close-bonus')!.addEventListener('click', () => { bonus.close(); spin.focus(); });
new ResizeObserver(resize).observe(canvas);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { fast = testMotion || event.matches; });

async function init() {
  const images = await Promise.all([backgroundUrl, heartsUrl, spadesUrl, diamondsUrl, clubsUrl, jokerUrl].map(loadImage));
  artwork = images[0]!;
  SUITS.forEach((suit, index) => {
    sprites[suit] = images[index + 1]!;
    RANKS.forEach((rank, frame) => symbolMap.set(`${rank}-${suit}`, { image: sprites[suit], index: frame, frames: 12 }));
  });
  sprites.joker = images[5]!;
  symbolMap.set('Scatter', { image: sprites.joker, index: 0, frames: 2 });
  symbolMap.set('Wild', { image: sprites.joker, index: 1, frames: 2 });
  ready = true; document.querySelector('.loading')!.remove(); spin.disabled = false;
  status.textContent = 'Tap the reels to begin'; resize();
}
void init().catch(error => {
  console.error(error); document.querySelector('.loading')!.textContent = 'Artwork could not load. Please reload to try again.';
  status.textContent = 'Unable to load game assets';
});
