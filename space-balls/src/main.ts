import './style.css';
import backgroundUrl from './assets/background.png';
import planetsUrl from './assets/planets.png';
import ballUrl from './assets/ball.png';
import tailUrl from './assets/ball_tail.png';
import type { GoalMotion } from './goals';
import { advanceMatch, createArena, createMatch, roundMessage, scoreStatus, type Match } from './match';
import { createPlanetField, planetDefinitions, planetNames, type FieldPlanet, type PlanetName } from './planets';
import { MicrophoneInput } from './microphone';

declare const __BROWSER_TEST__: boolean;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app element');

const canvas = document.createElement('canvas');
canvas.setAttribute('aria-label', 'Space Balls game court');
canvas.textContent = 'Your browser needs canvas support to display Space Balls.';
app.append(canvas);

type GameState = 'selecting' | 'ready' | 'playing';
let state: GameState = 'selecting';
let selectedPlanet = 0;

const interfaceLayer = document.createElement('div');
interfaceLayer.className = 'interface';
interfaceLayer.innerHTML = `
  <section class="selection" aria-labelledby="selection-title">
    <p class="eyebrow">Space Balls</p>
    <h1 id="selection-title">Pick your planet</h1>
    <div class="carousel">
      <button class="arrow" type="button" aria-label="Previous planet">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M20 6 10 16 20 26" />
        </svg>
      </button>
      <div class="planet-preview" role="img" aria-label="Earth"></div>
      <button class="arrow arrow-next" type="button" aria-label="Next planet"></button>
    </div>
    <p class="planet-name" aria-live="polite" aria-atomic="true"></p>
    <p class="planet-count"></p>
    <button class="confirm" type="button" disabled>Loading game…</button>
    <p class="load-status" role="status"></p>
  </section>
  <button class="start" type="button" hidden>
    <span class="eyebrow">Ready for launch</span>
    <span class="start-title">Tap or click to start</span>
    <span class="start-hint">First to 10 points. Win by 2.</span>
  </button>
  <div class="scoreboard" role="status" aria-label="Score" aria-live="polite" aria-atomic="true" hidden>
    <span class="score-you"><span>You</span><strong>0</strong></span>
    <span class="score-divider" aria-hidden="true">:</span>
    <span class="score-opponent"><strong>0</strong><span>Opponent</span></span>
    <span class="match-rule">First to 10 · Win by 2</span>
  </div>
  <div class="round-message" role="status" aria-live="polite" aria-atomic="true" hidden>
    <strong class="round-word"></strong>
    <span class="round-hint"></span>
  </div>
  <section class="voice-controls" aria-label="Asteroid boost controls" hidden>
    <p class="voice-help"></p>
    <div class="voice-actions">
      <button class="microphone-toggle" type="button">Enable microphone</button>
      <meter class="voice-meter" min="0" max="1" value="0" aria-label="Voice loudness"></meter>
      <button class="boost" type="button">Boost</button>
    </div>
    <p class="voice-status" role="status" aria-live="polite"></p>
  </section>
  <dialog class="result-dialog" aria-labelledby="result-title" aria-describedby="result-summary">
    <svg class="winner-trophy" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 10h24v16a12 12 0 0 1-24 0Zm0 4H10v8a12 12 0 0 0 13 12m21-20h10v8a12 12 0 0 1-13 12M32 38v12m-12 5h24M24 50h16" />
    </svg>
    <p class="eyebrow">Congratulations!</p>
    <h2 id="result-title"></h2>
    <div class="result-score" role="group" aria-label="Final score">
      <span>You<strong class="result-you-score"></strong></span>
      <span class="result-colon" aria-hidden="true">:</span>
      <span>Opponent<strong class="result-opponent-score"></strong></span>
    </div>
    <p id="result-summary">Choose a new planet and play another match.</p>
    <button class="new-game confirm" type="button" autofocus>New Game</button>
  </dialog>
`;
app.append(interfaceLayer);

function requireElement<T extends Element>(selector: string): T {
  const element = interfaceLayer.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
}

const selection = requireElement<HTMLElement>('.selection');
const preview = requireElement<HTMLElement>('.planet-preview');
const planetName = requireElement<HTMLElement>('.planet-name');
const planetCount = requireElement<HTMLElement>('.planet-count');
const previous = requireElement<HTMLButtonElement>('.arrow');
const next = requireElement<HTMLButtonElement>('.arrow-next');
const confirm = requireElement<HTMLButtonElement>('.confirm');
const start = requireElement<HTMLButtonElement>('.start');
const scoreboard = requireElement<HTMLElement>('.scoreboard');
const yourScore = requireElement<HTMLElement>('.score-you strong');
const opponentScore = requireElement<HTMLElement>('.score-opponent strong');
const matchRule = requireElement<HTMLElement>('.match-rule');
const resultDialog = requireElement<HTMLDialogElement>('.result-dialog');
const resultTitle = requireElement<HTMLElement>('#result-title');
const resultYouScore = requireElement<HTMLElement>('.result-you-score');
const resultOpponentScore = requireElement<HTMLElement>('.result-opponent-score');
const newGame = requireElement<HTMLButtonElement>('.new-game');
const roundOverlay = requireElement<HTMLElement>('.round-message');
const roundWord = requireElement<HTMLElement>('.round-word');
const roundHint = requireElement<HTMLElement>('.round-hint');
const voiceControls = requireElement<HTMLElement>('.voice-controls');
const voiceHelp = requireElement<HTMLElement>('.voice-help');
const voiceStatus = requireElement<HTMLElement>('.voice-status');
const microphoneToggle = requireElement<HTMLButtonElement>('.microphone-toggle');
const voiceMeter = requireElement<HTMLMeterElement>('.voice-meter');
const boostButton = requireElement<HTMLButtonElement>('.boost');
const microphone = new MicrophoneInput();
let pointerBoost = false;
let keyboardBoost = false;
let boostUntil = 0;
let playerDrive = 0;
let lastPlayerBoosts = 0;
let boostFeedbackUntil = 0;
// Reuse the same drawn arrow; CSS reflects it for the opposite direction.
next.append(previous.querySelector('svg')!.cloneNode(true));

const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D rendering is unavailable');

const background = new Image();
const planets = new Image();
const asteroid = new Image();
const asteroidTail = new Image();
let viewportWidth = 0;
let viewportHeight = 0;
let match: Match | null = null;
let interfaceKey = '';
let lastFrameTime: number | null = null;

function drawGoal(goal: GoalMotion, x: number, top: number, bottom: number, size: number, color: string): void {
  if (!context) return;

  const width = size * 0.4;
  const y = top + goal.position * (bottom - top - size);
  const left = x - width / 2;
  context.save();
  context.fillStyle = '#031023dc';
  context.fillRect(left, y, width, size);

  // Draw the mesh inside the frame, with the frame centered on the court line.
  context.strokeStyle = color;
  context.lineWidth = Math.max(0.7, size * 0.009);
  context.globalAlpha = 0.5;
  context.beginPath();
  for (let column = 1; column < 4; column++) {
    const meshX = left + width * column / 4;
    context.moveTo(meshX, y);
    context.lineTo(meshX, y + size);
  }
  for (let row = 1; row < 8; row++) {
    const meshY = y + size * row / 8;
    context.moveTo(left, meshY);
    context.lineTo(left + width, meshY);
  }
  context.stroke();
  context.globalAlpha = 1;
  context.lineWidth = Math.max(1, Math.min(3, size * 0.025));
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.strokeRect(left, y, width, size);
  context.restore();
}

function animate(time: number): void {
  if (lastFrameTime !== null) {
    // Avoid a jump when returning from a suspended/background tab.
    const seconds = Math.min((time - lastFrameTime) / 1000, 0.1);
    const voiceLevel = microphone.read(seconds);
    const manualLevel = match?.phase !== 'finished' && (pointerBoost || keyboardBoost || time < boostUntil) ? 0.75 : 0;
    playerDrive = Math.max(voiceLevel, manualLevel);
    if (state === 'playing' && match) {
      advanceMatch(match, seconds, createArena(viewportWidth, viewportHeight), Math.random,
        { voiceLevel: playerDrive });
      const boosts = match.planetEffects[`0:${match.selectedPlanet}`].boosts;
      if (boosts > lastPlayerBoosts) boostFeedbackUntil = time + 650;
      lastPlayerBoosts = boosts;
    }
  }
  lastFrameTime = time;
  syncMatchInterface();
  syncVoiceControls();
  if (state === 'playing') render();
  requestAnimationFrame(animate);
}

function syncVoiceControls(): void {
  const status = microphone.state;
  const buttonText = status === 'active' ? 'Turn mic off'
    : status === 'requesting' ? 'Cancel microphone' : status === 'paused' ? 'Resume microphone' : 'Enable microphone';
  if (microphoneToggle.textContent !== buttonText) microphoneToggle.textContent = buttonText;
  microphoneToggle.setAttribute('aria-pressed', String(status === 'active'));
  const messages = {
    off: 'Mic off · Hold Boost or Space to play without a mic.',
    requesting: 'Allow microphone access in your browser to use your voice.',
    active: 'Speak louder for a stronger boost · Audio stays on this device.',
    paused: 'Audio paused · Resume microphone or hold Boost.',
    denied: 'Microphone permission declined · Use Boost or Space instead.',
    unavailable: window.isSecureContext ? 'No microphone available · Use Boost or Space instead.'
      : 'Microphone needs HTTPS or localhost · Use Boost or Space instead.',
    error: 'Could not start microphone · Try again or use Boost.',
  };
  let message = messages[status];
  const speaking = playerDrive > 0.03;
  if (match && match.phase === 'playing' && performance.now() < boostFeedbackUntil) {
    message = `${match.selectedPlanet} boosted the asteroid!`;
  } else if (speaking) {
    const detected = microphone.level > 0.03 ? 'Voice detected' : 'Boost ready';
    message = `${detected} · Waiting for the asteroid in ${planetNames[selectedPlanet]}'s ring.`;
    if (state !== 'playing' || match?.phase !== 'playing') {
      message = `${detected} · ${planetNames[selectedPlanet]} is ready for the next launch.`;
    }
  } else if (status === 'active') {
    message = `Mic listening · Speak to light up your ${planetNames[selectedPlanet]}.`;
  }
  if (voiceStatus.textContent !== message) voiceStatus.textContent = message;
  voiceControls.classList.toggle('voice-detected', speaking);
  voiceControls.classList.toggle('boost-applied', performance.now() < boostFeedbackUntil);
  const help = `Boost your ${planetNames[selectedPlanet]} on the left when the asteroid enters its field.`;
  if (voiceHelp.textContent !== help) voiceHelp.textContent = help;
  voiceMeter.value = microphone.level;
}

microphoneToggle.addEventListener('click', async () => {
  if (microphone.state === 'active' || microphone.state === 'requesting') {
    microphone.stop();
    syncVoiceControls();
  } else {
    const pending = microphone.enable();
    syncVoiceControls();
    await pending;
    syncVoiceControls();
  }
});
boostButton.addEventListener('pointerdown', event => {
  pointerBoost = true;
  boostButton.setPointerCapture(event.pointerId);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  boostButton.addEventListener(type, () => { pointerBoost = false; });
}
boostButton.addEventListener('click', () => { boostUntil = performance.now() + 180; });
window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || state !== 'playing' || match?.phase === 'finished' ||
      (event.target instanceof HTMLButtonElement && event.target !== boostButton)) return;
  event.preventDefault();
  keyboardBoost = true;
});
window.addEventListener('keyup', event => { if (event.code === 'Space') keyboardBoost = false; });
window.addEventListener('blur', () => { keyboardBoost = false; pointerBoost = false; boostUntil = 0; });

function syncMatchInterface(): void {
  if (!match) return;
  const message = roundMessage(match);
  const key = `${match.scores.join(':')}/${match.phase}/${message}`;
  if (key === interfaceKey) return;
  interfaceKey = key;
  scoreboard.hidden = false;
  yourScore.textContent = String(match.scores[0]);
  opponentScore.textContent = String(match.scores[1]);
  matchRule.textContent = scoreStatus(match.scores);
  matchRule.classList.toggle('match-point', matchRule.textContent.startsWith('Match point'));
  roundOverlay.hidden = !message;
  roundWord.textContent = message;
  roundHint.textContent = match.phase === 'goal' ? 'Next round starting…' : 'Get ready for launch';
  if (match.phase === 'finished' && !resultDialog.open) {
    microphone.stop();
    pointerBoost = false;
    keyboardBoost = false;
    boostUntil = 0;
    playerDrive = 0;
    boostFeedbackUntil = 0;
    voiceControls.hidden = true;
    roundOverlay.hidden = true;
    resultTitle.textContent = match.winner === 0 ? 'You win!' : 'Opponent wins!';
    resultYouScore.textContent = String(match.scores[0]);
    resultOpponentScore.textContent = String(match.scores[1]);
    resultDialog.dataset.winner = String(match.winner);
    resultDialog.showModal();
  }
}

// The result remains visible until the player explicitly starts a new game.
resultDialog.addEventListener('cancel', event => event.preventDefault());
newGame.addEventListener('click', () => {
  microphone.stop();
  state = 'selecting';
  match = null;
  selectedPlanet = 0;
  pointerBoost = false;
  keyboardBoost = false;
  boostUntil = 0;
  playerDrive = 0;
  lastPlayerBoosts = 0;
  boostFeedbackUntil = 0;
  interfaceKey = '';
  lastFrameTime = null;
  resultDialog.close();
  scoreboard.hidden = true;
  yourScore.textContent = '0';
  opponentScore.textContent = '0';
  matchRule.textContent = 'First to 10 · Win by 2';
  matchRule.classList.remove('match-point');
  roundOverlay.hidden = true;
  roundWord.textContent = '';
  roundHint.textContent = '';
  voiceControls.hidden = true;
  start.hidden = true;
  selection.hidden = false;
  canvas.setAttribute('aria-label', 'Space Balls game court');
  syncVoiceControls();
  updateSelection();
  previous.focus({ preventScroll: true });
});

function drawBall(): void {
  if (!context || !match || !asteroid.complete || asteroid.naturalWidth === 0) return;

  const arena = createArena(viewportWidth, viewportHeight);
  const ball = match.ball;
  const x = arena.left + ball.x * arena.width;
  const y = arena.top + ball.y * arena.height;
  const diameter = arena.ballRadius * 2;
  context.save();
  // Tail and asteroid stay inside the same boundary used by the physics.
  context.beginPath();
  context.rect(arena.left, arena.top, arena.width, arena.height);
  context.clip();
  if (match.phase === 'playing' && asteroidTail.complete && asteroidTail.naturalWidth > 0) {
    const heading = Math.atan2(ball.vy * arena.height, ball.vx * arena.width);
    const tailWidth = diameter * 4.5;
    const tailHeight = tailWidth * asteroidTail.naturalHeight / asteroidTail.naturalWidth;
    context.save();
    context.translate(x, y);
    // The source tail points toward its bright head at (93%, 71%), on a slight diagonal.
    // Align that axis to velocity so its plume always extends behind the asteroid.
    const sourceHeading = Math.atan2(0.42 * asteroidTail.naturalHeight, 0.87 * asteroidTail.naturalWidth);
    context.rotate(heading - sourceHeading);
    context.globalAlpha = 0.85;
    context.drawImage(asteroidTail, -tailWidth * 0.93, -tailHeight * 0.71, tailWidth, tailHeight);
    context.restore();
  }
  // Crop only the transparent padding from the supplied asteroid sprite.
  context.drawImage(asteroid, 248, 156, 912, 880,
    x - diameter / 2, y - diameter / 2, diameter, diameter);
  context.restore();
}

function drawGravityArea(planet: FieldPlanet): void {
  if (!context) return;

  const { color } = planetDefinitions[planet.name];
  const { centerX: x, centerY: y, gravityRadius: radius, bodyRadius, diameter } = planet;
  const pulse = match?.planetEffects[planet.id]?.pulse ?? 0;
  const controlled = planet.side === 0 && planet.name === planetNames[selectedPlanet];
  // Voice feedback is immediate, even while the asteroid is elsewhere on the court.
  // The physical impulse still requires the asteroid to enter this planet's ring.
  const voiceGlow = controlled ? Math.sqrt(playerDrive) : 0;
  const glowLevel = Math.max(pulse, voiceGlow);
  context.save();
  const glow = context.createRadialGradient(x, y, bodyRadius * 0.7, x, y, radius);
  glow.addColorStop(0, `rgba(${color}, 0)`);
  glow.addColorStop(1, `rgba(${color}, ${0.16 + glowLevel * 0.45})`);
  context.fillStyle = glow;
  context.strokeStyle = voiceGlow > 0.1 ? '#dcfaff' : `rgba(${color}, ${controlled ? 0.95 : 0.75})`;
  context.lineWidth = Math.max(1, Math.min(2, diameter * 0.012)) + glowLevel * 5;
  context.shadowColor = `rgb(${color})`;
  context.shadowBlur = 8 + glowLevel * 30;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  if (controlled && voiceGlow > 0.1) {
    context.strokeStyle = `rgba(255, 255, 255, ${voiceGlow})`;
    context.lineWidth = 2 + voiceGlow * 3;
    context.lineCap = 'round';
    const rotation = performance.now() * 0.001;
    for (let arc = 0; arc < 3; arc++) {
      const angle = rotation + arc * Math.PI * 2 / 3;
      context.beginPath();
      context.arc(x, y, radius + 4, angle, angle + 0.15 + voiceGlow * 0.45);
      context.stroke();
    }
  }
  context.restore();
}

function drawPlanet(
  planet: PlanetName,
  x: number,
  y: number,
  diameter: number,
  mirrored = false,
): void {
  if (!context || !planets.complete || planets.naturalWidth === 0) return;

  const frameWidth = planets.naturalWidth / planetNames.length;
  const height = diameter * planets.naturalHeight / frameWidth;
  context.save();
  context.translate(x, y);
  context.scale(mirrored ? -1 : 1, 1);
  // Preserve the full sprite frame and its transparent vertical padding.
  context.drawImage(
    planets,
    planetNames.indexOf(planet) * frameWidth, 0, frameWidth, planets.naturalHeight,
    -diameter / 2, -height / 2, diameter, height,
  );
  context.restore();
}

function drawPlayingField(): void {
  const arena = createArena(viewportWidth, viewportHeight);
  const { top, bottom, goalSize } = arena;
  const formation = createPlanetField(arena);

  // Keep the gravity areas behind the planet artwork on both halves.
  for (const planet of formation) {
    drawGravityArea(planet);
  }

  for (const planet of formation) {
    drawPlanet(planet.name, planet.x, planet.y, planet.diameter, planet.side === 1);
  }

  const controlled = formation.find(planet => planet.side === 0 && planet.name === planetNames[selectedPlanet]);
  if (context && controlled) {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.font = `700 ${Math.max(9, Math.min(12, arena.size * 0.025))}px system-ui`;
    context.fillStyle = playerDrive > 0.03 ? '#ffffff' : '#b8eeff';
    context.shadowColor = '#030719';
    context.shadowBlur = 6;
    const activeLabel = microphone.level > 0.03 ? 'VOICE ACTIVE' : 'BOOST ACTIVE';
    context.fillText(playerDrive > 0.03 ? activeLabel : `YOUR ${controlled.name.toUpperCase()}`,
      controlled.centerX, controlled.centerY - controlled.gravityRadius - 8);
    context.restore();
  }

  if (match) {
    drawGoal(match.goals[0], arena.goalX[0], top, bottom, goalSize, '#86eaff');
    drawGoal(match.goals[1], arena.goalX[1], top, bottom, goalSize, '#ff91e8');
  }
}

function render(): void {
  if (!context) return;

  context.fillStyle = '#030719';
  context.fillRect(0, 0, viewportWidth, viewportHeight);

  if (background.complete && background.naturalWidth > 0) {
    // Keep the entire court visible at every screen aspect ratio.
    context.drawImage(background, 0, 0, viewportWidth, viewportHeight);
  }

  if (state === 'playing') {
    drawPlayingField();
    drawBall();
  }

  if (state !== 'playing') {
    context.fillStyle = 'rgba(3, 7, 25, 0.72)';
    context.fillRect(0, 0, viewportWidth, viewportHeight);
  }

  if (state === 'selecting' && planets.complete && planets.naturalWidth > 0) {
    const bounds = preview.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    drawPlanet(
      planetNames[selectedPlanet],
      bounds.left - canvasBounds.left + bounds.width / 2,
      bounds.top - canvasBounds.top + bounds.height / 2,
      bounds.width,
    );
  }
}

function updateSelection(): void {
  const name = planetNames[selectedPlanet];
  planetName.textContent = name;
  planetCount.textContent = `${selectedPlanet + 1} / ${planetNames.length}`;
  preview.setAttribute('aria-label', name);
  render();
}

function switchPlanet(direction: number): void {
  selectedPlanet = (selectedPlanet + direction + planetNames.length) % planetNames.length;
  updateSelection();
}

previous.addEventListener('click', () => switchPlanet(-1));
next.addEventListener('click', () => switchPlanet(1));
selection.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  switchPlanet(event.key === 'ArrowLeft' ? -1 : 1);
});
confirm.addEventListener('click', () => {
  if (state !== 'selecting' || confirm.disabled) return;
  state = 'ready';
  selection.hidden = true;
  start.hidden = false;
  voiceControls.hidden = false;
  syncVoiceControls();
  canvas.setAttribute('aria-label', `Space Balls court. Selected planet: ${planetNames[selectedPlanet]}`);
  render();
  start.focus({ preventScroll: true });
});
start.addEventListener('click', () => {
  if (state !== 'ready') return;
  state = 'playing';
  match = createMatch(Math.random, planetNames[selectedPlanet]);
  lastPlayerBoosts = 0;
  boostFeedbackUntil = 0;
  lastFrameTime = null;
  start.hidden = true;
  canvas.setAttribute('aria-label',
    `Space Balls court. Selected planet: ${planetNames[selectedPlanet]}. ` +
    'Each side has Jupiter near the outer border, Ice above Lava in the middle, and Earth near the center line. ' +
    'A goal net moves independently up and down each outer vertical boundary. ' +
    'The asteroid rebounds at the outer borders and scores for the opposite side when it hits a net.');
  syncMatchInterface();
  render();
});

function resizeCanvas(): void {
  if (!context) return;

  const bounds = canvas.getBoundingClientRect();
  viewportWidth = bounds.width;
  viewportHeight = bounds.height;
  if (viewportWidth <= 0 || viewportHeight <= 0) return;
  const pixelRatio = window.devicePixelRatio || 1;

  // CSS pixels remain the drawing coordinates; the backing store uses device pixels.
  canvas.width = Math.max(1, Math.round(viewportWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(viewportHeight * pixelRatio));
  context.setTransform(
    canvas.width / viewportWidth, 0,
    0, canvas.height / viewportHeight, 0, 0,
  );
  render();
}

// Browser zoom and moving between monitors can change DPR without a CSS resize.
function watchPixelRatio(): void {
  const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  query.addEventListener('change', () => {
    resizeCanvas();
    watchPixelRatio();
  }, { once: true });
}

const assets = [
  { image: background, url: backgroundUrl },
  { image: planets, url: planetsUrl },
  { image: asteroid, url: ballUrl },
  { image: asteroidTail, url: tailUrl },
];
for (const asset of assets) {
  asset.image.addEventListener('load', () => {
    if (assets.every(({ image }) => image.complete && image.naturalWidth > 0)) {
      confirm.disabled = false;
      confirm.textContent = 'Confirm';
    }
    render();
  });
  asset.image.addEventListener('error', () => {
    confirm.disabled = true;
    confirm.textContent = 'Game assets unavailable';
    requireElement<HTMLElement>('.load-status').textContent =
      'Unable to load the game artwork. Please reload to try again.';
  });
  asset.image.src = asset.url;
}

document.addEventListener('visibilitychange', () => {
  lastFrameTime = null;
  if (document.hidden) {
    microphone.stop();
    pointerBoost = false;
    keyboardBoost = false;
    boostUntil = 0;
    playerDrive = 0;
    syncVoiceControls();
  }
});
window.addEventListener('pagehide', () => microphone.stop());

new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener('resize', resizeCanvas);
window.visualViewport?.addEventListener('resize', resizeCanvas);
watchPixelRatio();
updateSelection();
resizeCanvas();
requestAnimationFrame(animate);

// Only the dedicated browser-test build exposes controlled fixtures. Vite removes
// this entire branch from ordinary dev/production builds, including the API name.
if (typeof __BROWSER_TEST__ !== 'undefined' && __BROWSER_TEST__) {
  Object.defineProperty(window, '__spaceBallsTest', { value: Object.freeze({
    snapshot: () => structuredClone({ state, selectedPlanet: planetNames[selectedPlanet], match,
      playerDrive, microphone: { state: microphone.state, level: microphone.level } }),
    arrange: (fixture: Partial<Match>) => {
      if (!match) throw new Error('Start a match before arranging a browser fixture');
      Object.assign(match, structuredClone(fixture));
      interfaceKey = '';
      syncMatchInterface();
      syncVoiceControls();
      render();
    },
  }) });
}
