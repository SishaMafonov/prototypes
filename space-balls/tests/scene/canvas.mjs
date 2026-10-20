import assert from 'node:assert/strict';

const identity = () => [1, 0, 0, 1, 0, 0];
export function multiply([a, b, c, d, e, f], [g, h, i, j, k, l]) {
  return [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f];
}
export function project([a, b, c, d, e, f], x, y) { return [a*x+c*y+e, b*x+d*y+f]; }

// Records what the real renderer submits. No expected components are fabricated.
// save/restore creates parent/child scope nodes; paint nodes retain transform,
// clip ancestry, style, path, and global submission order. This does not rasterize.
export class CanvasScene {
  state = { transform: identity(), clips: [], fillStyle: '#000', strokeStyle: '#000',
    globalAlpha: 1, lineWidth: 1, shadowBlur: 0, font: '10px sans-serif' };
  stack = [];
  path = [];
  root = { kind: 'canvas', children: [] };
  parent = this.root;
  commands = [];
  context;
  constructor() {
    const api = {
      save: () => {
        const group = { kind: 'scope', children: [] };
        this.parent.children.push(group);
        this.stack.push({ parent: this.parent, state: { ...this.state, transform: [...this.state.transform], clips: [...this.state.clips] } });
        this.parent = group;
      },
      restore: () => {
        assert.ok(this.stack.length, 'Canvas restore without save');
        const saved = this.stack.pop(); this.parent = saved.parent; this.state = saved.state;
      },
      setTransform: (...matrix) => { this.state.transform = matrix; },
      translate: (x,y) => { this.state.transform = multiply(this.state.transform, [1,0,0,1,x,y]); },
      scale: (x,y) => { this.state.transform = multiply(this.state.transform, [x,0,0,y,0,0]); },
      rotate: a => { this.state.transform = multiply(this.state.transform, [Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]); },
      beginPath: () => { this.path = []; },
      rect: (...args) => { this.path.push({ op: 'rect', args }); },
      arc: (...args) => { this.path.push({ op: 'arc', args }); },
      moveTo: (...args) => { this.path.push({ op: 'moveTo', args }); },
      lineTo: (...args) => { this.path.push({ op: 'lineTo', args }); },
      clip: () => { this.state.clips.push({ path: structuredClone(this.path), transform: [...this.state.transform] }); },
      fill: () => this.paint('fill'), stroke: () => this.paint('stroke'),
      fillRect: (...args) => this.paint('fillRect', args),
      strokeRect: (...args) => this.paint('strokeRect', args),
      fillText: (...args) => this.paint('fillText', args),
      drawImage: (image,...args) => this.paint('drawImage', args, image.src),
      createRadialGradient: (...args) => {
        const gradient = { kind: 'radialGradient', args, stops: [] };
        return Object.assign(gradient, { addColorStop: (offset,color) => gradient.stops.push([offset,color]) });
      },
    };
    this.context = new Proxy(api, {
      get: (target,key) => {
        if (key in target) return target[key];
        assert.ok(key in this.state, `Unsupported canvas API: ${String(key)}`);
        return this.state[key];
      },
      set: (_target,key,value) => { this.state[key] = value; return true; },
    });
  }
  paint(op, args = [], image) {
    const node = { kind: 'paint', op, args: [...args], image, order: this.commands.length,
      state: { ...this.state, transform: [...this.state.transform], clips: [...this.state.clips] },
      path: structuredClone(this.path) };
    this.parent.children.push(node); this.commands.push(node);
    return node;
  }
  reset() {
    assert.equal(this.stack.length, 0, 'Renderer leaked a saved canvas scope');
    this.root = { kind: 'canvas', children: [] }; this.parent = this.root; this.commands = [];
  }
  assertBalanced() { assert.equal(this.stack.length, 0, 'Renderer leaked a saved canvas scope'); }
}
