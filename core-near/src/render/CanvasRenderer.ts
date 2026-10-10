import { pointKey, vectors } from '../game/Geometry.js';
import type { GameState, GridPoint, LaunchPoint, RaySimulation, StaticBoard } from '../game/types.js';
import type { AnimationFrame } from './RayAnimator.js';
import { canvasThemes } from './Theme.js';
import type { Theme } from './Theme.js';

interface View {
  selected: LaunchPoint | null; preview: RaySimulation | null; active: AnimationFrame | null;
  coordinates: boolean; captureKeys: ReadonlySet<string>; captureTime: number; now: number;
  theme?: Theme;
  interactive?: boolean;
}
export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private scale = 1;
  private origin = { x: 0, y: 0 };
  constructor(readonly canvas: HTMLCanvasElement, readonly board: StaticBoard) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser does not support Canvas 2D.');
    this.ctx = ctx;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dense = this.board.width > 10;
    const padding = dense ? (this.width < 500 ? 40 : 64) : 88;
    this.scale = Math.min((this.width - padding) / this.board.width, (this.height - (dense ? padding : 90)) / this.board.height);
    this.origin = { x: (this.width - this.scale * this.board.width) / 2, y: (this.height - this.scale * this.board.height) / 2 };
  }
  private pixel(p: GridPoint): GridPoint { return { x: this.origin.x + p.x * this.scale, y: this.origin.y + p.y * this.scale }; }
  hitTest(clientX: number, clientY: number): LaunchPoint | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * this.width / rect.width, y = (clientY - rect.top) * this.height / rect.height;
    let nearest: LaunchPoint | null = null, distance = Math.min(24, this.scale * 0.4);
    for (const launch of this.board.launchPoints) {
      const p = this.pixel(launch), d = Math.hypot(p.x - x, p.y - y);
      if (d <= distance) { nearest = launch; distance = d; }
    }
    return nearest;
  }
  private line(points: readonly GridPoint[], color: string, width: number, dash: number[] = []) {
    if (!points.length) return;
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach((p, i) => { const q = this.pixel(p); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
  }
  private circle(p: GridPoint, radius: number, fill: string, stroke?: string, width = 1) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  draw(state: GameState, view: View) {
    const ctx = this.ctx, s = this.scale, o = this.origin;
    const palette = canvasThemes[view.theme ?? 'light'];
    const wallWidth = Math.min(3.5, Math.max(1.4, s * 0.09));
    const traceWidth = Math.min(2.8, Math.max(1.2, s * 0.07));
    const dotRadius = Math.min(4.5, Math.max(2.1, s * 0.115));
    ctx.clearRect(0, 0, this.width, this.height); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, this.width, this.height);
    for (const cell of this.board.cells) { const p = this.pixel(cell); ctx.fillStyle = palette.cell; ctx.fillRect(p.x, p.y, s, s); }
    ctx.strokeStyle = palette.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = o.x % s; x <= this.width; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, this.height); }
    for (let y = o.y % s; y <= this.height; y += s) { ctx.moveTo(0, y); ctx.lineTo(this.width, y); }
    ctx.stroke();
    const captureProgress = Math.min(1, Math.max(0, (view.now - view.captureTime) / 420));
    for (const cell of state.cells) {
      const p = this.pixel(cell);
      if (cell.owner) { ctx.fillStyle = cell.owner === 'X' ? palette.captureX : palette.captureO; ctx.fillRect(p.x + 2, p.y + 2, s - 4, s - 4); }
      if (cell.blocked) {
        ctx.fillStyle = palette.blocked; ctx.fillRect(p.x, p.y, s, s);
        ctx.save(); ctx.beginPath(); ctx.rect(p.x + 3, p.y + 3, s - 6, s - 6); ctx.clip();
        ctx.strokeStyle = palette.hatch; ctx.lineWidth = 1;
        for (let n = -s; n < s * 2; n += 9) { ctx.beginPath(); ctx.moveTo(p.x + n, p.y); ctx.lineTo(p.x + n + s, p.y + s); ctx.stroke(); }
        ctx.restore();
      }
    }
    for (const e of this.board.staticEdges) this.line([{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }], palette.wall, wallWidth);
    for (const trace of state.trajectories) for (const e of trace.edges) this.line([{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }], palette[trace.player], traceWidth);
    for (const cell of state.cells) {
      if (!cell.owner) continue;
      const p = this.pixel({ x: cell.x + 0.5, y: cell.y + 0.5 });
      const fresh = view.captureKeys.has(pointKey(cell));
      const size = s * 0.15 * (fresh ? 0.5 + 0.5 * (1 - (1 - captureProgress) ** 3) : 1);
      ctx.strokeStyle = palette[cell.owner]; ctx.lineWidth = Math.max(1, s * 0.043); ctx.beginPath();
      if (cell.owner === 'X') { ctx.moveTo(p.x - size, p.y - size); ctx.lineTo(p.x + size, p.y + size); ctx.moveTo(p.x + size, p.y - size); ctx.lineTo(p.x - size, p.y + size); }
      else ctx.arc(p.x, p.y, size * 1.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    const color = palette[state.currentPlayer];
    if (view.active) {
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 9;
      this.line(view.active.points, color, traceWidth + 1); this.circle(this.pixel(view.active.head), dotRadius + 0.5, palette.cell, color, traceWidth); ctx.restore();
    }
    if (view.preview?.termination === 'flat-wall' && state.phase === 'ready') {
      ctx.save(); ctx.globalAlpha = 0.55; this.line(view.preview.points, color, traceWidth, [Math.min(5, s * 0.22), Math.min(7, s * 0.25)]); ctx.restore();
      this.circle(this.pixel(view.preview.points[view.preview.points.length - 1]), dotRadius, palette.cell, color, Math.min(2, traceWidth));
    }
    if (state.phase !== 'finished') for (const launch of this.board.launchPoints) {
      const p = this.pixel(launch), selected = state.phase === 'ready' && launch.id === view.selected?.id;
      if (selected) this.circle(p, Math.min(16, s * 0.4), `${color}18`);
      this.circle(p, selected ? dotRadius * 1.5 : dotRadius, selected ? color : palette.cell, state.phase === 'animating' || view.interactive === false ? palette.inactive : color, Math.min(2, traceWidth));
      if (selected) {
        const v = vectors[launch.direction], length = Math.min(29, s * 0.8), wing = Math.min(4, s * 0.15);
        const tip = { x: p.x + v.x * length, y: p.y + v.y * length };
        ctx.beginPath(); ctx.moveTo(p.x + v.x * dotRadius * 2, p.y + v.y * dotRadius * 2); ctx.lineTo(tip.x, tip.y);
        ctx.moveTo(tip.x - v.x * wing - v.y * wing, tip.y - v.y * wing + v.x * wing); ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(tip.x - v.x * wing + v.y * wing, tip.y - v.y * wing - v.x * wing); ctx.strokeStyle = color; ctx.lineWidth = Math.min(2, traceWidth); ctx.stroke();
      }
    }
    if (view.coordinates) {
      ctx.fillStyle = palette.coordinates; ctx.font = `${s < 20 ? 8 : 10}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const step = s < 20 ? 2 : 1, margin = this.width < 500 ? 13 : 22;
      for (let x = 0; x <= this.board.width; x += step) ctx.fillText(String(x), o.x + x * s, o.y - margin);
      for (let y = 0; y <= this.board.height; y += step) ctx.fillText(String(y), o.x - margin, o.y + y * s);
    }
  }
}
