import './style.css';

type Vector = { x: number; y: number };

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const context = canvas.getContext('2d')!;
const overlay = document.querySelector<HTMLElement>('#start-overlay')!;
const micButton = document.querySelector<HTMLButtonElement>('#mic-button')!;
const silentButton = document.querySelector<HTMLButtonElement>('#silent-button')!;
const repeatButton = document.querySelector<HTMLButtonElement>('#repeat-button')!;
const newGameButton = document.querySelector<HTMLButtonElement>('#new-game-button')!;
const durationPanel = document.querySelector<HTMLElement>('#duration-panel')!;
const controlPanel = document.querySelector<HTMLElement>('#control-panel')!;
const resultsPanel = document.querySelector<HTMLElement>('#results-panel')!;
const durationButtons = document.querySelectorAll<HTMLButtonElement>('[data-duration]');
const selectedDurationNode = document.querySelector<HTMLElement>('#selected-duration')!;
const winnerName = document.querySelector<HTMLElement>('#winner-name')!;
const finalScore = document.querySelector<HTMLElement>('#final-score')!;
const clockNode = document.querySelector<HTMLElement>('#match-clock')!;
const playerScoreNode = document.querySelector<HTMLElement>('#player-score')!;
const aiScoreNode = document.querySelector<HTMLElement>('#ai-score')!;
const signalStatus = document.querySelector<HTMLElement>('#signal-status')!;
const signalDot = document.querySelector<HTMLElement>('#signal-dot')!;

const WORLD = { width: 100, height: 56, field: { x: 5, y: 4, width: 90, height: 48 } };
const planetRadius = 10.4;
const fieldRadius = planetRadius * 1.25;
const ballRadius = 0.9;
const goalHalfLength = planetRadius / 2;
const ballLaunchSpeed = 78;
const ballMaxSpeed = 192;
const planets = [
  { position: { x: 23, y: 28 }, color: '#63e8fb', glow: '#27b5d4' },
  { position: { x: 77, y: 28 }, color: '#fa916e', glow: '#e74f5f' },
];

let ball: Vector = { x: 50, y: 28 };
let velocity: Vector = { x: ballLaunchSpeed, y: -30 };
let playerScore = 0;
let aiScore = 0;
let started = false;
let selectedDuration = 120;
let matchRemaining = selectedDuration;
let microphoneLevel = 0;
let visualLevel = 0;
let previousMicrophoneLevel = 0;
let userKick = 0;
let goalPhase = 0;
let nextAiAction = 1.8;
let aiPulse = 0;
let lastTime = performance.now();
let audioContext: AudioContext | undefined;
let analyser: AnalyserNode | undefined;
let audioSamples: Uint8Array<ArrayBuffer> | undefined;

function length(vector: Vector): number { return Math.hypot(vector.x, vector.y); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }

function resize(): void {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  context.setTransform(canvas.width / WORLD.width, 0, 0, canvas.height / WORLD.height, 0, 0);
}

function formatTime(seconds: number): string {
  const wholeSeconds = Math.ceil(Math.max(0, seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

function showPanel(panel: HTMLElement): void {
  durationPanel.classList.toggle('hidden', panel !== durationPanel);
  controlPanel.classList.toggle('hidden', panel !== controlPanel);
  resultsPanel.classList.toggle('hidden', panel !== resultsPanel);
  overlay.classList.remove('hidden');
}

function resetMatch(): void {
  playerScore = 0;
  aiScore = 0;
  playerScoreNode.textContent = '0';
  aiScoreNode.textContent = '0';
  matchRemaining = selectedDuration;
  clockNode.textContent = formatTime(matchRemaining);
  goalPhase = 0;
  nextAiAction = 1.2;
  aiPulse = 0;
  userKick = 0;
  resetBall(Math.random() > .5 ? 1 : -1);
}

function endMatch(): void {
  started = false;
  winnerName.textContent = playerScore === aiScore ? 'DRAW' : playerScore > aiScore ? 'YOU WIN' : 'AI WINS';
  finalScore.textContent = `FINAL SCORE  YOU ${playerScore} — ${aiScore} AI`;
  repeatButton.textContent = `Play again · ${selectedDuration / 60} min`;
  showPanel(resultsPanel);
}

function readMicrophone(): void {
  if (!analyser || !audioSamples) return;
  analyser.getByteTimeDomainData(audioSamples);
  let sum = 0;
  for (const sample of audioSamples) {
    const value = (sample - 128) / 128;
    sum += value * value;
  }
  microphoneLevel = clamp(Math.sqrt(sum / audioSamples.length) * 14, 0, 1);
  visualLevel += (microphoneLevel - visualLevel) * 0.18;
}

async function enableMicrophone(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true } });
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioSamples = new Uint8Array(analyser.fftSize);
    audioContext.createMediaStreamSource(stream).connect(analyser);
    signalStatus.textContent = 'Microphone live — make a sound to pulse';
    signalDot.classList.add('live');
    begin();
  } catch {
    signalStatus.textContent = 'Microphone blocked — playing in silent mode';
    begin();
  }
}

function begin(): void {
  resetMatch();
  started = true;
  lastTime = performance.now();
  overlay.classList.add('hidden');
}

function resetBall(direction: number): void {
  ball = { x: 50, y: 28 };
  velocity = { x: direction * ballLaunchSpeed, y: (Math.random() - 0.5) * 60 };
}

function applyPlanetForce(planet: Vector, attraction: number, impulse: number, dt: number): void {
  const delta = { x: planet.x - ball.x, y: planet.y - ball.y };
  const distance = length(delta);
  if (distance > fieldRadius || distance < 0.01) return;
  const direction = { x: delta.x / distance, y: delta.y / distance };
  const edge = 1 - distance / fieldRadius;
  // The field grabs aggressively as soon as the asteroid enters it. A pulse reverses
  // that pull into a short, kick-like blast instead of a gentle sustained push.
  const magneticPull = attraction * Math.pow(edge, 0.55) * 480;
  const kick = impulse * Math.pow(edge, 0.35) * 1600;
  const force = impulse > 0 ? -kick : magneticPull;
  velocity.x += direction.x * force * dt;
  velocity.y += direction.y * force * dt;
}

function moveGoal(phase: number): number {
  const center = WORLD.field.y + WORLD.field.height / 2;
  const range = WORLD.field.height / 2 - goalHalfLength - 1.2;
  return center + Math.sin(phase) * range;
}

function update(dt: number): void {
  readMicrophone();
  matchRemaining = Math.max(0, matchRemaining - dt);
  clockNode.textContent = formatTime(matchRemaining);
  if (matchRemaining === 0) { endMatch(); return; }
  goalPhase += dt * 1.35;
  aiPulse = Math.max(0, aiPulse - dt * 2.7);
  userKick = Math.max(0, userKick - dt * 5.5);
  if (microphoneLevel > 0.07 && microphoneLevel > previousMicrophoneLevel + 0.015) {
    userKick = Math.max(userKick, microphoneLevel);
  }
  previousMicrophoneLevel = microphoneLevel;
  nextAiAction -= dt;
  if (nextAiAction <= 0) {
    aiPulse = 0.3 + Math.random() * 0.7;
    nextAiAction = 0.65 + Math.random() * 2.1;
  }

  const userAttraction = 1 - microphoneLevel;
  applyPlanetForce(planets[0].position, userAttraction, userKick, dt);
  applyPlanetForce(planets[1].position, 0.35, aiPulse, dt);

  velocity.x *= 1 - dt * 0.09;
  velocity.y *= 1 - dt * 0.09;
  const speed = length(velocity);
  if (speed > ballMaxSpeed) { velocity.x *= ballMaxSpeed / speed; velocity.y *= ballMaxSpeed / speed; }
  ball.x += velocity.x * dt;
  ball.y += velocity.y * dt;

  const { x, y, width, height } = WORLD.field;
  const leftGoalY = moveGoal(goalPhase);
  const rightGoalY = moveGoal(goalPhase + Math.PI);
  const hitsLeftGoal = Math.abs(ball.y - leftGoalY) <= goalHalfLength + ballRadius;
  const hitsRightGoal = Math.abs(ball.y - rightGoalY) <= goalHalfLength + ballRadius;
  // Score before applying the regular wall bounce. The centre divider is visual only.
  if (hitsLeftGoal && ball.x - ballRadius <= x + 0.55 && velocity.x < 0) {
    aiScore += 1; aiScoreNode.textContent = String(aiScore); resetBall(1);
  } else if (hitsRightGoal && ball.x + ballRadius >= x + width - 0.55 && velocity.x > 0) {
    playerScore += 1; playerScoreNode.textContent = String(playerScore); resetBall(-1);
  } else {
    if (ball.y - ballRadius < y) { ball.y = y + ballRadius; velocity.y = Math.abs(velocity.y); }
    if (ball.y + ballRadius > y + height) { ball.y = y + height - ballRadius; velocity.y = -Math.abs(velocity.y); }
    if (ball.x - ballRadius < x) { ball.x = x + ballRadius; velocity.x = Math.abs(velocity.x); }
    if (ball.x + ballRadius > x + width) { ball.x = x + width - ballRadius; velocity.x = -Math.abs(velocity.x); }
  }
}

function circle(position: Vector, radius: number, fill: string, alpha = 1): void {
  context.globalAlpha = alpha;
  context.beginPath(); context.arc(position.x, position.y, radius, 0, Math.PI * 2); context.fillStyle = fill; context.fill();
  context.globalAlpha = 1;
}

function drawGoal(x: number, y: number, color: string): void {
  context.strokeStyle = color; context.lineWidth = 0.65; context.lineCap = 'round';
  context.beginPath(); context.moveTo(x, y - goalHalfLength); context.lineTo(x, y + goalHalfLength); context.stroke();
  context.lineCap = 'butt';
}

function draw(): void {
  const { x, y, width, height } = WORLD.field;
  context.clearRect(0, 0, WORLD.width, WORLD.height);
  context.fillStyle = '#071c2b'; context.fillRect(x, y, width, height);
  context.strokeStyle = '#72c6df'; context.globalAlpha = .7; context.lineWidth = .27;
  context.strokeRect(x, y, width, height);
  context.globalAlpha = .28; context.beginPath(); context.moveTo(50, y); context.lineTo(50, y + height); context.stroke(); context.globalAlpha = 1;
  drawGoal(x + .55, moveGoal(goalPhase), '#72f4df');
  drawGoal(x + width - .55, moveGoal(goalPhase + Math.PI), '#ff9a78');

  planets.forEach((planet, index) => {
    const pulse = index === 0 ? visualLevel : aiPulse;
    circle(planet.position, fieldRadius, planet.glow, .055 + pulse * .12);
    context.setLineDash([.7, .8]); context.strokeStyle = planet.color; context.globalAlpha = .22;
    context.lineWidth = .12; context.beginPath(); context.arc(planet.position.x, planet.position.y, fieldRadius, 0, Math.PI * 2); context.stroke(); context.setLineDash([]); context.globalAlpha = 1;
    circle(planet.position, planetRadius + pulse * .65, planet.glow, .22);
    circle(planet.position, planetRadius, planet.color);
    circle({ x: planet.position.x - 1.2, y: planet.position.y - 1.3 }, planetRadius * .46, '#d5fbff', .35);
  });

  circle(ball, ballRadius, '#f8fbff');
  circle({ x: ball.x - .23, y: ball.y - .23 }, ballRadius * .35, '#b9e1ff');
}

function frame(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.035);
  lastTime = now;
  if (started) update(dt);
  draw();
  requestAnimationFrame(frame);
}

micButton.addEventListener('click', () => { if (analyser) begin(); else void enableMicrophone(); });
silentButton.addEventListener('click', () => { signalStatus.textContent = 'Silent mode — planet is pulling'; begin(); });
durationButtons.forEach((button) => button.addEventListener('click', () => {
  selectedDuration = Number(button.dataset.duration);
  selectedDurationNode.textContent = `${selectedDuration / 60} MINUTE MATCH`;
  clockNode.textContent = formatTime(selectedDuration);
  showPanel(controlPanel);
}));
repeatButton.addEventListener('click', begin);
newGameButton.addEventListener('click', () => { started = false; clockNode.textContent = '--:--'; showPanel(durationPanel); });
window.addEventListener('resize', resize);
resize();
clockNode.textContent = '--:--';
requestAnimationFrame(frame);
