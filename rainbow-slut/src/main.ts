import './style.css'

const COLORS = [
  { name: 'Red', value: '#f34351', light: '#ff8991' },
  { name: 'Orange', value: '#ff8d37', light: '#ffc16f' },
  { name: 'Yellow', value: '#ffd847', light: '#fff29b' },
  { name: 'Green', value: '#5bcf79', light: '#a5efad' },
  { name: 'Blue', value: '#3b9dea', light: '#82d5ff' },
  { name: 'Indigo', value: '#6254d8', light: '#aaa0ff' },
  { name: 'Violet', value: '#b75bd8', light: '#e8a6ff' },
] as const

type ColorIndex = number
interface Reel { startAngle: number; endAngle: number }
interface Particle { x: number; y: number; vx: number; vy: number; size: number; life: number; maxLife: number; color: string; kind: 'sparkle' | 'bug' }
interface Stats { spins: number; wins: number; returnAmount: number; maxHits: number }

function required<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message)
  return value
}

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('App container not found')

app.innerHTML = `
  <main class="game-shell">
    <header class="masthead">
      <div><p class="eyebrow">Five reels · Seven colours · One lucky clover</p><h1><span>St. Jackpotrick</span></h1></div>
      <div class="bet-badge"><small>Bet</small><strong>1.00</strong></div>
    </header>
    <section class="machine-wrap" aria-label="Rainbow Rush slot machine">
      <label class="autoplay-control"><input id="autoplay" type="checkbox" /><span class="toggle" aria-hidden="true"></span><span>Auto play</span></label>
      <canvas id="game" tabindex="0" aria-label="Rainbow slot machine. Click or press Enter to spin."></canvas>
      <p id="win-burst" class="win-burst" aria-live="polite"></p>
      <p id="result" class="result" aria-live="polite">Tap the rainbow to spin</p>
    </section>
    <section class="status-bar" aria-label="Game statistics">
      <div><span>Spins</span><strong id="spins">0</strong></div><div><span>Winning rounds</span><strong id="wins">0</strong></div><div><span>Total won</span><strong id="total-win">0.00</strong></div><div><span>Average win</span><strong id="average">0.00</strong></div><div><span>Return to player</span><strong id="rtp">0.0%</strong></div><div><span>Max rainbow hits</span><strong id="max-hits">0</strong></div><div><span>Horseshoe hits</span><strong id="horseshoe-hits">0</strong></div>
    </section>
    <p class="help">Match colours across a line. A full five-reel rainbow wins the maximum prize.</p>
  </main>`

const canvas = required(document.querySelector<HTMLCanvasElement>('#game'), 'Game canvas not found')
const result = required(document.querySelector<HTMLElement>('#result'), 'Result panel not found')
const winBurst = required(document.querySelector<HTMLElement>('#win-burst'), 'Win display not found')
const autoplay = required(document.querySelector<HTMLInputElement>('#autoplay'), 'Autoplay control not found')
const spinValue = required(document.querySelector<HTMLElement>('#spins'), 'Spin counter not found')
const winValue = required(document.querySelector<HTMLElement>('#wins'), 'Win counter not found')
const totalWinValue = required(document.querySelector<HTMLElement>('#total-win'), 'Total-win counter not found')
const averageValue = required(document.querySelector<HTMLElement>('#average'), 'Average panel not found')
const rtpValue = required(document.querySelector<HTMLElement>('#rtp'), 'RTP panel not found')
const maxHitsValue = required(document.querySelector<HTMLElement>('#max-hits'), 'Max-hit panel not found')
const horseshoeHitsValue = required(document.querySelector<HTMLElement>('#horseshoe-hits'), 'Horseshoe-hit counter not found')
const context = required(canvas.getContext('2d'), 'Canvas is not supported in this browser')

const WIDTH = 1200
const HEIGHT = 830
const BET = 1
const MULTIPLIERS = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 8, 8]
const PAYOUTS = [0, 0, 0, 0.2, 0.75, 5]
const reelStart = Math.PI + .055
const reelEnd = Math.PI * 2 - .055
const reelWidth = (reelEnd - reelStart) / 5
const reels: Reel[] = Array.from({ length: 5 }, (_, index) => ({
  startAngle: reelStart + reelWidth * index + .014,
  endAngle: reelStart + reelWidth * (index + 1) - .014,
}))
let reelColors: ColorIndex[][] = reels.map(() => shuffledRainbow())
let targets: ColorIndex[][] = reelColors.map((reel) => [...reel])
let offsets = reels.map(() => 0)
let stopped = reels.map(() => true)
let spinning = false
let spinStartedAt = 0
let lastShuffleAt = 0
let horseShoe = 0
let multiplier = 2
let cloverRevealStartedAt = 0
let celebrationUntil = 0
let winGlowUntil = 0
let lastFrame = 0
let particles: Particle[] = []
let winningCells = new Set<string>()
let goldenReels: number[] = []
let goldenFeatureUntil = 0
let goldenFeatureActive = false
let horseshoeHits = 0
let autoSpinTimer: number | undefined
let winBurstTimer: number | undefined
const stats: Stats = { spins: 0, wins: 0, returnAmount: 0, maxHits: 0 }

function shuffledRainbow(): ColorIndex[] {
  const colors = Array.from({ length: COLORS.length }, (_, index) => index)
  for (let index = colors.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[colors[index], colors[swap]] = [colors[swap], colors[index]]
  }
  return colors
}
function randomMultiplier(): number { return MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)] }
function mod(value: number, divisor: number): number { return ((value % divisor) + divisor) % divisor }
function resizeCanvas(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const { width } = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(width * ratio))
  canvas.height = Math.floor((width * HEIGHT / WIDTH) * ratio)
  context.setTransform(ratio * width / WIDTH, 0, 0, ratio * width / WIDTH, 0, 0)
}
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath()
}
function drawBackground(now: number): void {
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, '#130a39'); sky.addColorStop(.58, '#261061'); sky.addColorStop(1, '#10072d')
  context.fillStyle = sky; context.fillRect(0, 0, WIDTH, HEIGHT)
  const glow = context.createRadialGradient(600, 360, 40, 600, 360, 620)
  glow.addColorStop(0, 'rgba(255, 219, 121, .2)'); glow.addColorStop(1, 'rgba(67, 37, 173, 0)')
  context.fillStyle = glow; context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = 'rgba(255,255,255,.65)'
  for (let index = 0; index < 45; index += 1) { const x = (index * 127.4) % WIDTH; const y = 20 + ((index * 71.9) % 620); context.globalAlpha = .25 + .35 * Math.sin(now / 650 + index); context.fillRect(x, y, 2, 2) }
  context.globalAlpha = 1
}
function arcCell(outerRadius: number, innerRadius: number, startAngle: number, endAngle: number): void {
  context.beginPath()
  context.arc(600, 680, outerRadius, startAngle, endAngle)
  context.arc(600, 680, innerRadius, endAngle, startAngle, true)
  context.closePath()
}
function drawReel(reel: Reel, column: number, now: number): void {
  const rotations = Math.floor(offsets[column] / 27)
  for (let row = 0; row < 7; row += 1) {
    const outerRadius = 520 - row * 26
    const innerRadius = outerRadius - 23
    const color = COLORS[reelColors[column][mod(row - rotations, 7)]]
    const isWinning = now < winGlowUntil && winningCells.has(`${column}:${row}`)
    const fill = context.createRadialGradient(600, 680, innerRadius, 600, 680, outerRadius)
    fill.addColorStop(0, color.light)
    fill.addColorStop(.56, color.value)
    fill.addColorStop(1, color.light)
    context.save()
    if (isWinning) { context.shadowColor = '#fff7a7'; context.shadowBlur = 25 + 12 * Math.sin(now / 90) }
    arcCell(outerRadius, innerRadius, reel.startAngle, reel.endAngle)
    context.fillStyle = fill
    context.fill()
    context.lineWidth = isWinning ? 4 : 1.4
    context.strokeStyle = isWinning ? '#fffde0' : 'rgba(255,255,255,.64)'
    context.stroke()
    if (spinning) {
      context.globalAlpha = .45
      context.strokeStyle = '#fff'
      context.lineWidth = 3
      context.setLineDash([10, 10])
      context.lineDashOffset = -offsets[column]
      context.beginPath()
      context.arc(600, 680, innerRadius + 11.5, reel.startAngle + .02, reel.endAngle - .02)
      context.stroke()
    }
    context.restore()
  }
  const labelAngle = (reel.startAngle + reel.endAngle) / 2
  const labelRadius = 548
  context.fillStyle = 'rgba(255,255,255,.82)'
  context.font = '800 12px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.fillText(`REEL ${column + 1}`, 600 + Math.cos(labelAngle) * labelRadius, 680 + Math.sin(labelAngle) * labelRadius)
}
function drawClover(now: number): void {
  const spinProgress = Math.min(1, (now - spinStartedAt) / 580)
  const revealProgress = cloverRevealStartedAt ? Math.min(1, (now - cloverRevealStartedAt) / 1150) : 1
  const pulse = 1 + Math.sin(now / 450) * .025
  const scale = spinning ? .72 * (1 - spinProgress) : .72 * (1 - (1 - revealProgress) ** 3) * pulse
  const rotation = spinning ? now / 45 : (1 - revealProgress) * Math.PI * 10
  const textProgress = spinning ? 0 : Math.max(0, (revealProgress - .3) / .7)
  if (scale < .01) return
  context.save(); context.translate(1060, 755); context.scale(scale, scale); context.rotate(rotation); context.shadowColor = '#d4ff66'; context.shadowBlur = spinning || now < celebrationUntil ? 42 : 20; context.fillStyle = '#4fba4c'
  for (let leaf = 0; leaf < 4; leaf += 1) { context.save(); context.rotate((Math.PI / 2) * leaf + Math.PI / 4); context.beginPath(); context.ellipse(0, -42, 31, 45, 0, 0, Math.PI * 2); context.fill(); context.restore() }
  context.shadowBlur = 0; context.fillStyle = '#2c8438'; context.beginPath(); context.arc(0, 0, 21, 0, Math.PI * 2); context.fill()
  if (textProgress > 0) { context.save(); context.rotate(-rotation); context.scale(textProgress, textProgress); context.fillStyle = '#fffbe7'; context.font = '900 25px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(`x${multiplier}`, 0, 2); context.restore() }
  context.restore()
}
function drawGoldenHorseshoe(now: number): void {
  if (goldenReels.length !== 3 || now > goldenFeatureUntil) return
  context.save()
  context.translate(600, 108)
  context.rotate(Math.sin(now / 290) * .12)
  context.shadowColor = '#ffe070'
  context.shadowBlur = 26
  context.lineCap = 'round'
  context.strokeStyle = '#ffd23f'
  context.lineWidth = 12
  context.beginPath()
  context.arc(0, 0, 30, Math.PI * .1, Math.PI * .9)
  context.stroke()
  context.fillStyle = '#fff4ad'
  for (const angle of [.18, .36, .64, .82]) {
    context.beginPath()
    context.arc(Math.cos(Math.PI * angle) * 30, Math.sin(Math.PI * angle) * 30, 3.5, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
  context.save()
  context.fillStyle = '#fff1a0'
  context.font = '900 15px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.shadowColor = '#ffd23f'
  context.shadowBlur = 14
  context.fillText('GOLDEN HORSESHOE', 600, 54)
  context.restore()

  goldenReels.forEach((column) => {
    const reel = reels[column]
    const coinSlots = [[.16, 548], [.5, 552], [.84, 548], [.16, 333], [.5, 329], [.84, 333], [0, 430], [1, 430]] as const
    coinSlots.forEach(([progress, baseRadius], coin) => {
      const angle = reel.startAngle + (reel.endAngle - reel.startAngle) * progress
      const radius = baseRadius + Math.sin(now / 180 + coin * 1.7) * 6
      const x = 600 + Math.cos(angle) * radius
      const y = 680 + Math.sin(angle) * radius
      context.save()
      context.translate(x, y)
      context.rotate(now / 350 + coin)
      context.shadowColor = '#ffd23f'
      context.shadowBlur = 13
      context.fillStyle = '#f8bd28'
      context.beginPath()
      context.arc(0, 0, 10, 0, Math.PI * 2)
      context.fill()
      context.lineWidth = 2
      context.strokeStyle = '#fff0a2'
      context.stroke()
      context.fillStyle = '#fff5bb'
      context.font = '900 11px Inter, system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText('★', 0, 1)
      context.restore()
    })
  })
}
function drawMachine(now: number): void {
  drawBackground(now); reels.forEach((reel, index) => drawReel(reel, index, now)); drawGoldenHorseshoe(now); drawClover(now)
  const hint = spinning ? (goldenFeatureActive ? 'GOLDEN HORSESHOE APPROACHING…' : 'RAINBOW IN MOTION…') : 'TAP THE CURVED REELS TO SPIN'
  context.save(); context.fillStyle = goldenFeatureActive ? '#ffe475' : '#fff9d5'; context.font = '900 30px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.shadowColor = '#ffe564'; context.shadowBlur = 18 + Math.sin(now / 180) * 7; context.fillText(hint, WIDTH / 2, 765); context.restore()
}
function drawParticle(particle: Particle): void {
  context.save(); context.globalAlpha = Math.max(0, particle.life / particle.maxLife); context.translate(particle.x, particle.y); context.fillStyle = particle.color
  if (particle.kind === 'bug') { context.fillStyle = '#ffea72'; context.beginPath(); context.ellipse(-6, -2, 9, 4, -.55, 0, Math.PI * 2); context.ellipse(6, -2, 9, 4, .55, 0, Math.PI * 2); context.fill(); context.fillStyle = '#423162'; context.beginPath(); context.ellipse(0, 3, 3, 8, 0, 0, Math.PI * 2); context.fill() } else { context.rotate(Math.PI / 4); context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size); context.fillStyle = '#fff'; context.fillRect(-particle.size / 6, -particle.size / 6, particle.size / 3, particle.size / 3) }
  context.restore()
}
function drawLeprechaun(): void {
  context.save(); context.translate(126, 705); context.shadowColor = '#d9ff75'; context.shadowBlur = 18; context.fillStyle = '#51b94b'; roundedRect(context, -30, -18, 60, 72, 14); context.fill(); context.fillStyle = '#ffb46d'; context.beginPath(); context.arc(0, -38, 26, 0, Math.PI * 2); context.fill(); context.fillStyle = '#e46725'; context.beginPath(); context.arc(0, -24, 30, 0, Math.PI); context.fill(); context.fillStyle = '#26793a'; context.fillRect(-42, -76, 84, 15); context.beginPath(); context.moveTo(-25, -76); context.lineTo(0, -128); context.lineTo(25, -76); context.closePath(); context.fill(); context.fillStyle = '#ffd857'; context.strokeStyle = '#ffeeb0'; context.lineWidth = 4; context.strokeRect(-12, -68, 24, 17); context.restore()
}
function spawnSparkles(amount: number, celebration = false): void {
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2; const radius = celebration ? 30 + Math.random() * 250 : 50 + Math.random() * 410
    particles.push({ x: 600 + Math.cos(angle) * radius, y: 365 + Math.sin(angle) * radius * .6, vx: Math.cos(angle) * (celebration ? .07 : .02), vy: -.02 - Math.random() * .06, size: 4 + Math.random() * 9, life: celebration ? 1700 + Math.random() * 900 : 240 + Math.random() * 260, maxLife: celebration ? 2600 : 500, color: COLORS[Math.floor(Math.random() * COLORS.length)].light, kind: celebration && index % 5 === 0 ? 'bug' : 'sparkle' })
  }
}
function updateParticles(delta: number): void { particles.forEach((particle) => { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.life -= delta }); particles = particles.filter((particle) => particle.life > 0) }
function showWin(prize: number): void {
  if (winBurstTimer !== undefined) window.clearTimeout(winBurstTimer)
  winBurst.textContent = `WIN ${prize.toFixed(2)}`
  winBurst.classList.remove('is-visible')
  void winBurst.offsetWidth
  winBurst.classList.add('is-visible')
  winBurstTimer = window.setTimeout(() => winBurst.classList.remove('is-visible'), 1800)
}
function scheduleAutoplay(): void {
  if (autoSpinTimer !== undefined) window.clearTimeout(autoSpinTimer)
  if (!autoplay.checked) return
  autoSpinTimer = window.setTimeout(() => { autoSpinTimer = undefined; startSpin() }, 1450)
}
function startSpin(): void {
  if (spinning) return
  if (autoSpinTimer !== undefined) { window.clearTimeout(autoSpinTimer); autoSpinTimer = undefined }
  spinning = true
  cloverRevealStartedAt = 0
  winningCells.clear()
  stopped = reels.map(() => false)
  offsets = reels.map(() => 0)
  targets = reels.map(() => shuffledRainbow())
  goldenReels = []
  goldenFeatureUntil = 0
  goldenFeatureActive = false
  multiplier = 2
  spinStartedAt = performance.now()
  lastShuffleAt = spinStartedAt
  horseShoe = Math.floor(Math.random() * 100)
  if ([10,20,30,40,50].includes(horseShoe)) {
    const firstGoldenReel = Math.floor(Math.random() * 3)
    const lockedRainbow = shuffledRainbow()
    goldenReels = [firstGoldenReel, firstGoldenReel + 1, firstGoldenReel + 2]
    goldenReels.forEach((column) => { targets[column] = [...lockedRainbow] })
    goldenFeatureActive = true
    goldenFeatureUntil = spinStartedAt + 5600
    horseshoeHits += 1
    updateStats()
    result.textContent = 'GOLDEN HORSESHOE APPROACHING! The reels are slowing down…'
  } else {
    result.textContent = 'Reels are spinning…'
  }
}
function scoreRound(): void {
  const fullRainbow = reelColors.every((reel) => reel.every((color, row) => color === reelColors[0][row]))
  let baseWin = 0
  winningCells.clear()
  if (fullRainbow) {
    baseWin = 7
    stats.maxHits += 1
    for (let column = 0; column < reels.length; column += 1) for (let row = 0; row < 7; row += 1) winningCells.add(`${column}:${row}`)
  } else {
    for (let row = 0; row < 7; row += 1) { let column = 0; while (column < reels.length) { const color = reelColors[column][row]; let run = 1; while (column + run < reels.length && reelColors[column + run][row] === color) run += 1; if (run >= 3) { baseWin += PAYOUTS[run]; for (let offset = 0; offset < run; offset += 1) winningCells.add(`${column + offset}:${row}`) } column += run } }
  }
  multiplier = randomMultiplier(); cloverRevealStartedAt = performance.now(); stats.spins += 1
  if (baseWin > 0) { const prize = baseWin * multiplier * BET; stats.wins += 1; stats.returnAmount += prize; winGlowUntil = performance.now() + 1900; showWin(prize); if (fullRainbow) { celebrationUntil = performance.now() + 5200; spawnSparkles(105, true); result.textContent = `FULL RAINBOW! ${baseWin.toFixed(2)} × x${multiplier} = ${prize.toFixed(2)}` } else if (goldenReels.length === 3) { spawnSparkles(70, true); result.textContent = `GOLDEN HORSESHOE WIN ${prize.toFixed(2)} · multiplier x${multiplier}` } else { spawnSparkles(38); result.textContent = `WIN ${prize.toFixed(2)} · multiplier x${multiplier}` } } else result.textContent = `No 3+ colour streaks · multiplier x${multiplier}`
  updateStats(); scheduleAutoplay()
}
function updateStats(): void { spinValue.textContent = String(stats.spins); winValue.textContent = String(stats.wins); totalWinValue.textContent = stats.returnAmount.toFixed(2); averageValue.textContent = stats.wins ? (stats.returnAmount / stats.wins).toFixed(2) : '0.00'; rtpValue.textContent = stats.spins ? `${((stats.returnAmount / (stats.spins * BET)) * 100).toFixed(1)}%` : '0.0%'; maxHitsValue.textContent = String(stats.maxHits); horseshoeHitsValue.textContent = String(horseshoeHits) }
function frame(now: number): void {
  const delta = Math.min(now - lastFrame || 16, 40); lastFrame = now
  if (spinning) {
    const elapsed = now - spinStartedAt
    const spinDuration = goldenFeatureActive ? 2 : 1
    reels.forEach((_, index) => { if (!stopped[index]) { offsets[index] += delta * (1.15 + index * .09); if (elapsed >= (820 + index * 260) * spinDuration) { reelColors[index] = targets[index]; offsets[index] = 0; stopped[index] = true } } })
    if (now - lastShuffleAt > 75) { reelColors = reelColors.map((reel, index) => stopped[index] ? reel : shuffledRainbow()); lastShuffleAt = now; spawnSparkles(10) }
    if (stopped.every(Boolean)) { spinning = false; scoreRound() }
  }
  updateParticles(delta); drawMachine(now); particles.forEach(drawParticle); if (now < celebrationUntil) drawLeprechaun(); requestAnimationFrame(frame)
}
canvas.addEventListener('click', startSpin)
canvas.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startSpin() } })
autoplay.addEventListener('change', () => {
  if (autoplay.checked) startSpin()
  else if (autoSpinTimer !== undefined) { window.clearTimeout(autoSpinTimer); autoSpinTimer = undefined }
})
window.addEventListener('resize', resizeCanvas)
resizeCanvas(); requestAnimationFrame(frame)
