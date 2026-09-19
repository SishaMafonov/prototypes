import './style.css';
import { directionName } from './game/Board.js';
import { generateBoard } from './game/BoardGenerator.js';
import type { GeneratedBoard } from './game/BoardGenerator.js';
import { Game } from './game/Game.js';
import { pointKey } from './game/Geometry.js';
import { winner } from './game/Scoring.js';
import type { LaunchPoint, RaySimulation, StaticBoard } from './game/types.js';
import { CanvasRenderer } from './render/CanvasRenderer.js';
import { RayAnimator } from './render/RayAnimator.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="./" aria-label="Core Near home"><span class="brand-mark" aria-hidden="true">↳</span>CORE<span class="wordmark-light">NEAR</span><span class="edition">01</span></a>
    <div class="header-meta"><span class="live-dot"></span> LOCAL TWO-PLAYER <span class="meta-divider">/</span> A PAPER GAME, REIMAGINED</div>
    <button class="text-button" id="how-to">How to play <span aria-hidden="true">↗</span></button>
  </header>
  <main>
    <section class="intro" aria-labelledby="game-title">
      <div><p class="eyebrow">A LITTLE GEOMETRY. A LITTLE STRATEGY.</p><h1 id="game-title">Find your angle.</h1><p class="intro-copy">Launch a line. Turn a corner. Make the space yours.</p></div>
      <div class="intro-note"><span class="note-symbols">× <span>○</span></span><p>Two players.<br>One shared possibility.</p></div>
    </section>
    <div class="game-layout">
      <section class="board-card" aria-label="Game board">
        <div class="board-toolbar"><div><span class="small-caps">THE ISLANDS</span><span class="board-meta" id="board-meta">20 × 20</span></div><span class="board-number" id="board-number"></span></div>
        <div class="canvas-wrap">
          <canvas id="board" tabindex="0" aria-label="Core Near game board. Use arrow keys to select a boundary point and Enter or Space to launch. A launch selector is also available below." aria-describedby="canvas-help">Play using the launch-point selector and Launch ray button.</canvas>
          <div class="result-panel" id="result" hidden><span class="eyebrow">ALL SPACES SPOKEN FOR</span><h2 id="result-title"></h2><p id="result-score"></p><button class="primary-button" id="play-again">Play again <span>↗</span></button></div>
        </div>
        <div class="board-footer"><p id="canvas-help"><span class="hint-dot"></span> Choose a boundary dot to launch.</p><span id="path-info"></span></div>
        <div class="board-options"><label class="switch-label"><input type="checkbox" id="preview" checked><span class="switch" aria-hidden="true"></span>Trajectory preview</label><label class="checkbox-label"><input type="checkbox" id="coordinates">Coordinates</label></div>
      </section>
      <aside class="sidebar" aria-label="Game controls and scores">
        <section class="turn-card" id="turn-card"><div class="turn-heading"><span class="small-caps" id="turn-number">TURN 01</span><span class="turn-status" id="phase-label">YOUR MOVE</span></div><div class="current-player"><span id="current-symbol">×</span><div><h2 id="current-name">Player X</h2><p id="turn-instruction">The next line is yours.</p></div></div><p class="turn-message" id="turn-message" role="status" aria-live="polite">Pick any dot along the boundary. Your ray finds its own way.</p></section>
        <section class="score-section" aria-label="Score"><div class="section-heading"><h2>Claimed spaces</h2><span id="claimed-total"></span></div><div class="score-grid"><div class="score-card player-x"><span class="score-player">× <span>PLAYER X</span></span><strong id="score-x">0</strong><span class="score-unit">cells</span></div><div class="score-card player-o"><span class="score-player">○ <span>PLAYER O</span></span><strong id="score-o">0</strong><span class="score-unit">cells</span></div></div><div class="progress-track" role="img" id="progress" aria-label="No cells claimed"><span id="progress-x"></span><span id="progress-o"></span></div></section>
        <section class="launch-controls"><label for="launch-select" class="small-caps">POINT OF DEPARTURE</label><select id="launch-select"><option value="">Choose a dot or select a point</option></select><button class="primary-button" id="launch" disabled>Launch ray <span aria-hidden="true">↗</span></button></section>
        <section class="last-move"><div class="section-heading"><h2>Last move</h2><span id="last-player">—</span></div><p id="last-move">A blank page. Make the first move.</p></section>
        <section class="board-controls" aria-label="Board layout"><button id="new-board" class="secondary-button new-board-button">New Board <span aria-hidden="true">⤨</span></button><p id="board-details"></p></section>
        <div class="reset-controls"><button id="restart" class="secondary-button"><span aria-hidden="true">↻</span> Restart Board</button><button id="reset" class="text-button">Reset Game</button></div>
      </aside>
    </div>
    <section class="rule-strip" aria-label="Quick rules"><div><span class="rule-number">01</span><p><strong>Pick a starting point.</strong><span>Launch inward from any boundary dot.</span></p></div><div><span class="rule-number">02</span><p><strong>Let the corners lead.</strong><span>Corners turn your ray. Flat walls stop it.</span></p></div><div><span class="rule-number">03</span><p><strong>Close a square. Claim it.</strong><span>The fourth side earns you the space.</span></p></div></section>
    <footer class="page-footer"><span>OLD LINES ARE PATHS, NEVER WALLS.</span><span>CORE NEAR <span class="footer-cross">+</span> A SHARED-PAPER STRATEGY GAME</span></footer>
  </main>
  <dialog id="rules-dialog"><div class="dialog-heading"><span class="eyebrow">THE RULES OF THE PAGE</span><button id="close-rules" aria-label="Close rules">×</button></div><h2>A line can change<br>everything.</h2><ol><li><strong>Take turns, X then O.</strong> Choose a dot on a straight outer boundary. Your ray launches perpendicular to the wall.</li><li><strong>Follow the fixed geometry.</strong> The ray turns 90° at a corner and stops at a flat wall. The dark islands are solid.</li><li><strong>Cross any old line.</strong> Traces from either player can be crossed or retraced. Claimed cells never block a ray.</li><li><strong>Finish a cell to claim it.</strong> All four sides must exist. Walls and either player's traces count. Every cell you close on your turn is yours permanently.</li><li><strong>Most cells wins.</strong> Turns always alternate, even after scoring or retracing. The game ends when every playable cell is claimed.</li></ol><div class="rules-note"><strong>At the keyboard</strong><p>Focus the board and use arrow keys to cycle launch points, then Enter or Space to launch. You can also use the selector.</p><strong>A new page, every time</strong><p>New Board creates a random 20 × 20 layout with boundary notches and interior islands. Restart Board replays the same layout. The claimable cell count varies with its shape.</p></div><button class="primary-button" id="got-it">Back to the board <span>↗</span></button></dialog>
`;

function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
let board: StaticBoard;
function randomSeed(): number { return crypto.getRandomValues(new Uint32Array(1))[0]; }
let generated: GeneratedBoard;
try { generated = generateBoard(randomSeed()); board = generated.board; }
catch (error) {
  app.replaceChildren();
  const message = document.createElement('p');
  message.textContent = error instanceof Error ? error.message : 'The board could not be loaded.';
  app.append(message); throw error;
}
let game = new Game(board);
const canvas = element<HTMLCanvasElement>('board');
let renderer = new CanvasRenderer(canvas, board);
const previewToggle = element<HTMLInputElement>('preview');
const coordinates = element<HTMLInputElement>('coordinates');
const selector = element<HTMLSelectElement>('launch-select');
const launchButton = element<HTMLButtonElement>('launch');
const rules = element<HTMLDialogElement>('rules-dialog');
let selected: LaunchPoint | null = null;
let preview: RaySimulation | null = null;
let animator: RayAnimator | null = null;
let animationToken: number | null = null;
let captureKeys = new Set<string>();
let captureTime = -Infinity;
let frameRequest = 0;
let lastMessage = 'Pick any dot along the boundary. Your ray finds its own way.';

function syncBoard() {
  selector.replaceChildren(new Option('Choose a dot or select a point', ''));
  for (const launch of board.launchPoints) {
    const option = new Option(`${launch.id.slice(1)} · (${launch.x}, ${launch.y}) → ${directionName[launch.direction]}`, launch.id);
    selector.append(option);
  }
  element('board-meta').textContent = `${board.width} × ${board.height} / ${board.playableCount} claimable cells`;
  element('board-number').textContent = `#${generated.seed.toString(16).padStart(8, '0').toUpperCase()}`;
  element('board-details').textContent = `${generated.islands} islands · ${generated.notches} boundary notches`;
  element('path-info').textContent = `${board.launchPoints.length} starting points`;
}
function pathSummary(sim: RaySimulation): string {
  let turns = 0;
  for (let i = 1; i < sim.edges.length; i++) {
    const a = sim.edges[i - 1], b = sim.edges[i];
    if (a.x2 - a.x1 !== b.x2 - b.x1 || a.y2 - a.y1 !== b.y2 - b.y1) turns++;
  }
  return `${sim.edges.length} steps · ${turns} ${turns === 1 ? 'turn' : 'turns'}`;
}
function select(launch: LaunchPoint | null) {
  if (game.state.phase !== 'ready') return;
  selected = launch; preview = launch ? game.preview(launch) : null;
  selector.value = launch?.id ?? '';
  launchButton.disabled = !launch || preview?.termination !== 'flat-wall';
  element('path-info').textContent = preview ? preview.termination === 'flat-wall' ? pathSummary(preview) : `Unavailable: ${preview.termination}` : `${board.launchPoints.length} starting points`;
  canvas.style.cursor = launch ? 'pointer' : 'default'; requestDraw();
}
function syncUI() {
  const state = game.state, finished = state.phase === 'finished', busy = state.phase === 'animating';
  element('turn-card').dataset.player = state.currentPlayer;
  element('turn-number').textContent = finished ? 'BOARD COMPLETE' : `TURN ${String(state.trajectories.length + 1).padStart(2, '0')}`;
  element('phase-label').textContent = finished ? 'FINISHED' : busy ? 'IN MOTION' : 'YOUR MOVE';
  element('current-symbol').textContent = state.currentPlayer === 'X' ? '×' : '○';
  element('current-name').textContent = `Player ${state.currentPlayer}`;
  element('turn-instruction').textContent = busy ? 'Watch the line unfold.' : 'The next line is yours.';
  element('turn-message').textContent = lastMessage;
  element('score-x').textContent = String(state.scoreX); element('score-o').textContent = String(state.scoreO);
  const total = state.scoreX + state.scoreO;
  element('claimed-total').textContent = `${total} / ${board.playableCount}`;
  element('progress').setAttribute('aria-label', `${total} of ${board.playableCount} cells claimed`);
  element('progress-x').style.width = `${state.scoreX / board.playableCount * 100}%`;
  element('progress-o').style.width = `${state.scoreO / board.playableCount * 100}%`;
  selector.disabled = busy || finished;
  launchButton.disabled = busy || finished || !selected || preview?.termination !== 'flat-wall';
  canvas.setAttribute('aria-disabled', String(busy || finished));
  element('canvas-help').innerHTML = `<span class="hint-dot"></span> ${finished ? 'Every cell has found its owner.' : busy ? 'Following the corners…' : 'Choose a boundary dot to launch.'}`;
  const last = state.trajectories.at(-1);
  element('last-player').textContent = last ? `PLAYER ${last.player}` : '—';
  element('last-move').textContent = last ? `Point ${last.launchId.slice(1)} · ${last.edges.length} steps · ${last.captured === 0 ? 'no cells claimed' : `+${last.captured} ${last.captured === 1 ? 'cell' : 'cells'} claimed`}` : 'A blank page. Make the first move.';
  element('result').hidden = !finished;
  if (finished) {
    const result = winner(state.scoreX, state.scoreO), title = result === 'draw' ? 'A perfect draw.' : `Player ${result} wins.`;
    element('current-name').textContent = title; element('current-symbol').textContent = result === 'draw' ? '=' : result === 'X' ? '×' : '○';
    element('turn-card').dataset.player = result === 'draw' ? 'X' : result;
    element('turn-instruction').textContent = 'A page well played.'; element('result-title').textContent = title;
    element('result-score').textContent = `X claimed ${state.scoreX} · O claimed ${state.scoreO}`;
  }
}
function launch(launchPoint: LaunchPoint | null) {
  if (!launchPoint || game.state.phase !== 'ready') return;
  const pending = game.beginMove(launchPoint);
  if (!pending) { lastMessage = 'That ray cannot finish at a flat wall. Choose another point.'; syncUI(); return; }
  animator = new RayAnimator(pending.simulation, performance.now()); animationToken = pending.token;
  selected = null; preview = null; selector.value = '';
  lastMessage = `Player ${pending.player} launched from point ${launchPoint.id.slice(1)}. Corners choose the way.`;
  element('path-info').textContent = pathSummary(pending.simulation); syncUI(); requestDraw();
}
function restart(resetSettings = false) {
  animator = null; animationToken = null; game.restart(); captureKeys.clear(); captureTime = -Infinity;
  if (resetSettings) { previewToggle.checked = true; coordinates.checked = false; }
  lastMessage = 'A fresh page. Player X, choose your point of departure.'; select(null); syncUI(); requestDraw();
}
function newBoard() {
  // Generate before replacing anything: an unexpected failure leaves the current game intact.
  try {
    let seed = randomSeed();
    if (seed === generated.seed) seed = (seed + 1) >>> 0;
    const next = generateBoard(seed);
    animator = null; animationToken = null; game.restart();
    generated = next; board = next.board;
    game = new Game(board); renderer = new CanvasRenderer(canvas, board);
    captureKeys.clear(); captureTime = -Infinity;
    syncBoard(); renderer.resize();
    lastMessage = 'New corners, new possibilities. Player X, find your angle.';
    select(null); syncUI(); requestDraw();
  } catch (error) {
    lastMessage = error instanceof Error ? error.message : 'Could not create a new board. Try again.';
    syncUI();
  }
}
function requestDraw() { if (!frameRequest) frameRequest = requestAnimationFrame(draw); }
function draw(now: number) {
  frameRequest = 0;
  let active = animator?.frame(now) ?? null;
  if (active?.complete && animationToken !== null) {
    const mover = game.pending!.player, captured = game.completeMove(animationToken);
    captureKeys = new Set(captured?.map(pointKey) ?? []); captureTime = now;
    animator = null; animationToken = null; active = null;
    const count = captured?.length ?? 0;
    lastMessage = game.state.phase === 'finished' ? `All ${board.playableCount} cells are claimed. The page is complete.` :
      count ? `Player ${mover} claimed ${count} ${count === 1 ? 'cell' : 'cells'}. Player ${game.state.currentPlayer}, your move.` : `No new cells this time. Player ${game.state.currentPlayer}, find your angle.`;
    syncUI();
  }
  renderer.draw(game.state, { selected, preview: previewToggle.checked ? preview : null, active,
    coordinates: coordinates.checked, captureKeys, captureTime, now });
  if (animator || now - captureTime < 450) requestDraw();
}
canvas.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') select(renderer.hitTest(event.clientX, event.clientY)); });
canvas.addEventListener('pointerleave', () => { if (document.activeElement !== selector) select(null); });
canvas.addEventListener('click', event => launch(renderer.hitTest(event.clientX, event.clientY)));
canvas.addEventListener('keydown', event => {
  if (game.state.phase !== 'ready') return;
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const current = selected ? board.launchPoints.indexOf(selected) : direction === 1 ? -1 : 0;
    select(board.launchPoints[(current + direction + board.launchPoints.length) % board.launchPoints.length]);
  } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); launch(selected); }
});
selector.addEventListener('change', () => select(board.launchPoints.find(p => p.id === selector.value) ?? null));
launchButton.addEventListener('click', () => launch(selected));
previewToggle.addEventListener('change', requestDraw); coordinates.addEventListener('change', requestDraw);
element('restart').addEventListener('click', () => restart()); element('reset').addEventListener('click', () => restart(true));
element('new-board').addEventListener('click', newBoard);
element('play-again').addEventListener('click', () => restart());
element('how-to').addEventListener('click', () => rules.showModal());
element('close-rules').addEventListener('click', () => rules.close()); element('got-it').addEventListener('click', () => rules.close());
rules.addEventListener('click', event => { if (event.target === rules) { const r = rules.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) rules.close(); } });
new ResizeObserver(() => { renderer.resize(); requestDraw(); }).observe(canvas);
window.addEventListener('resize', () => { renderer.resize(); requestDraw(); });
syncBoard(); renderer.resize(); syncUI(); requestDraw();
