import './style.css';

const canvas: HTMLCanvasElement = document.querySelector<HTMLCanvasElement>('#slot-canvas')
  ?? (() => { throw new Error('Slot canvas was not found.'); })();
const context: CanvasRenderingContext2D = canvas.getContext('2d')
  ?? (() => { throw new Error('Canvas 2D context is unavailable.'); })();

const suits = [
  { mark: 'H', icon: '♥', color: '#d9364c' },
  { mark: 'D', icon: '♦', color: '#d9364c' },
  { mark: 'C', icon: '♣', color: '#172033' },
  { mark: 'S', icon: '♠', color: '#172033' },
] as const;
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const deck = ranks.map((rank, index) => ({ code: `${rank}${suits[index % suits.length].mark}`, ...suits[index % suits.length] }));

type Card = (typeof deck)[number];
type Reel = { cards: Card[]; startedAt: number; duration: number; offset: number; settled: boolean };

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const reels: Reel[] = Array.from({ length: 3 }, () => ({
  cards: shuffle(deck), startedAt: 0, duration: 0, offset: 0, settled: true,
}));

let running = false;
let width = 0;
let height = 0;

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, Math.round(rect.width * ratio));
  height = Math.max(1, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;
}

function roundedRect(x: number, y: number, w: number, h: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, w, h, radius);
}

function drawCard(card: Card, x: number, y: number, cardWidth: number, cardHeight: number): void {
  const padding = cardWidth * 0.12;
  roundedRect(x, y, cardWidth, cardHeight, cardWidth * 0.1);
  context.fillStyle = '#f7f4ed';
  context.fill();
  context.lineWidth = Math.max(1, cardWidth * 0.025);
  context.strokeStyle = '#d4cbbd';
  context.stroke();
  context.fillStyle = card.color;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.font = `700 ${Math.floor(cardWidth * 0.21)}px ui-monospace, monospace`;
  context.fillText(card.code, x + padding, y + padding);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${Math.floor(cardHeight * 0.45)}px serif`;
  context.fillText(card.icon, x + cardWidth / 2, y + cardHeight / 2 + cardHeight * 0.05);
}

function draw(timestamp: number): void {
  const scale = Math.min(width / 720, height / 1000);
  const machineW = 720 * scale;
  const machineH = 1000 * scale;
  const left = (width - machineW) / 2;
  const top = (height - machineH) / 2;
  const reelGap = 18 * scale;
  const margin = 52 * scale;
  const reelW = (machineW - margin * 2 - reelGap * 2) / 3;
  const reelH = 760 * scale;
  const reelTop = top + 145 * scale;
  const cellH = reelH / 5;

  context.clearRect(0, 0, width, height);
  const background = context.createLinearGradient(left, top, left, top + machineH);
  background.addColorStop(0, '#f7bf42'); background.addColorStop(.25, '#b83e32'); background.addColorStop(1, '#631b2b');
  roundedRect(left, top, machineW, machineH, 46 * scale);
  context.fillStyle = background; context.fill();
  context.lineWidth = 9 * scale; context.strokeStyle = '#ffd975'; context.stroke();
  context.fillStyle = '#fff1c3'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `900 ${Math.floor(54 * scale)}px system-ui, sans-serif`;
  context.fillText('CARD SLOTS', width / 2, top + 76 * scale);

  reels.forEach((reel, reelIndex) => {
    const reelLeft = left + margin + reelIndex * (reelW + reelGap);
    roundedRect(reelLeft - 7 * scale, reelTop - 7 * scale, reelW + 14 * scale, reelH + 14 * scale, 15 * scale);
    context.fillStyle = '#291c2a'; context.fill();
    context.save();
    roundedRect(reelLeft, reelTop, reelW, reelH, 10 * scale); context.clip();
    const speed = 13 + reelIndex * 1.8; // cards per second
    const currentOffset = reel.settled ? reel.offset : ((timestamp - reel.startedAt) / 1000) * speed;
    const shift = (currentOffset % 1) * cellH;
    const first = Math.floor(currentOffset) % reel.cards.length;
    for (let row = -1; row <= 5; row++) {
      const index = (first + row + reel.cards.length) % reel.cards.length;
      drawCard(reel.cards[index], reelLeft + 6 * scale, reelTop + row * cellH + shift + 5 * scale, reelW - 12 * scale, cellH - 10 * scale);
    }
    context.restore();
  });
  // Centre payline
  context.fillStyle = 'rgba(255, 211, 78, .28)';
  context.fillRect(left + margin, reelTop + cellH * 2, machineW - margin * 2, cellH);
  context.strokeStyle = '#ffe585'; context.lineWidth = 3 * scale;
  context.strokeRect(left + margin, reelTop + cellH * 2, machineW - margin * 2, cellH);

  if (running) requestAnimationFrame(draw);
}

function spin(): void {
  if (running) return;
  running = true;
  const now = performance.now();
  reels.forEach((reel, index) => {
    reel.cards = shuffle(deck);
    reel.startedAt = now;
    reel.duration = 1850 + index * 430; // final reel stops at 2.71 seconds
    reel.settled = false;
  });
  const settle = (): void => {
    const elapsed = performance.now() - now;
    reels.forEach((reel, index) => {
      if (!reel.settled && elapsed >= reel.duration) {
        reel.offset = Math.ceil((reel.duration / 1000) * (13 + index * 1.8));
        reel.settled = true;
      }
    });
    if (reels.every((reel) => reel.settled)) { running = false; draw(performance.now()); return; }
    requestAnimationFrame(settle);
  };
  requestAnimationFrame(draw);
  requestAnimationFrame(settle);
}

new ResizeObserver(() => { resize(); draw(performance.now()); }).observe(canvas);
canvas.addEventListener('pointerup', spin);
resize();
draw(performance.now());
