import type { BonusPrize } from './bonus';
import { layoutCorridor } from './scene';
import type { Rect, SceneNode } from './scene';

export const CORRIDOR_WALK_MS = 3000;
export const DOOR_OPEN_MS = 700;
type Point = [number, number];

// Perspective geometry is rendered every frame; visual noise never consumes gameplay RNG.
export class BonusCorridor {
  private ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private frame = 0;
  private phase: 'walking' | 'choosing' | 'reveal' | 'rest' = 'rest';
  private started = 0;
  private selected: number | null = null;
  private prize: BonusPrize = { kind: 'ghost' };
  private caption = '';
  private revealed = false;
  private onReveal = () => {};
  private done: (() => void) | null = null;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private doorBounds: Rect[] = [];

  getScene(): SceneNode {
    return { id: 'corridor', kind: 'scene', bounds: { x: 0, y: 0, width: this.width, height: this.height }, z: 0, visible: true,
      data: { phase: this.phase, selected: this.selected, revealed: this.revealed, prize: this.revealed ? this.prize.kind : null, elapsed: performance.now() - this.started },
      children: this.doorBounds.map((bounds,i) => ({ id: `door-${i}`, kind: 'door', bounds, z: 10, visible: true, data: { selected: i === this.selected, enabled: !this.doors[i].disabled } })) };
  }

  constructor(private canvas: HTMLCanvasElement, private doors: HTMLButtonElement[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Bonus canvas is unavailable');
    this.ctx = ctx;
  }

  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    const ratio = devicePixelRatio || 1;
    const w = Math.max(1, Math.round(this.width * ratio));
    const h = Math.max(1, Math.round(this.height * ratio));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  walk(): Promise<void> {
    this.phase = 'walking';
    this.started = performance.now();
    this.selected = null;
    this.revealed = false;
    this.prize = { kind: 'ghost' };
    this.caption = '';
    this.onReveal = () => {};
    this.startFrames();
    return new Promise((resolve) => { this.done = resolve; });
  }

  reveal(door: number, prize: BonusPrize, caption: string, onReveal: () => void): Promise<void> {
    this.phase = 'reveal';
    this.selected = door;
    this.prize = prize;
    this.caption = caption;
    this.onReveal = onReveal;
    this.revealed = false;
    this.started = performance.now();
    return new Promise((resolve) => { this.done = resolve; });
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private startFrames(): void {
    if (this.frame) return;
    const tick = (now: number) => {
      this.resize();
      const elapsed = now - this.started;
      if (this.phase === 'walking' && elapsed >= CORRIDOR_WALK_MS) {
        this.phase = 'choosing';
        const done = this.done; this.done = null; done?.();
      }
      if (this.phase === 'reveal') {
        if (!this.revealed && elapsed >= DOOR_OPEN_MS) { this.revealed = true; this.onReveal(); }
        if (elapsed >= DOOR_OPEN_MS + (this.prize.kind === 'ghost' ? 1900 : 1600)) {
          this.phase = 'rest';
          const done = this.done; this.done = null; done?.();
        }
      }
      this.draw(now);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private polygon(points: Point[], fill: string, stroke?: string): void {
    const c = this.ctx;
    c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }

  private draw(now: number): void {
    const c = this.ctx, w = this.width, h = this.height;
    c.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
    c.clearRect(0,0,w,h);
    const elapsed = now - this.started;
    const walking = this.phase === 'walking';
    const geometry = layoutCorridor(w, h, elapsed, !walking || this.reduced.matches);
    const { distance, camera, focal, project } = geometry;
    this.doorBounds = geometry.doors;
    const topLeft = project(-4.7,5.8), topRight = project(4.7,5.8);
    const bottomLeft = project(-4.7,0), bottomRight = project(4.7,0);
    const room = c.createLinearGradient(0,0,0,h);
    room.addColorStop(0,'#080b0c'); room.addColorStop(.5,'#252c29'); room.addColorStop(1,'#111211');
    c.fillStyle = room; c.fillRect(0,0,w,h);
    this.polygon([topLeft,topRight,bottomRight,bottomLeft],'#252b27','#7b79503d');
    for(let row=0;row<10;row++) for(let col=-5;col<5;col++) {
      const x=col+(row%2)*.5;
      this.polygon([project(x,.58*row),project(x+.98,.58*row),project(x+.98,.58*row+.56),project(x,.58*row+.56)],
        `rgba(120,115,84,${.025+(Math.sin(row*17+col*11)*.5+.5)*.055})`,'#9f96702b');
    }
    for (const side of [-1,1]) {
      for (let zWorld = 17; zWorld > camera + .7; zWorld -= 1.1) {
        const far = zWorld - camera;
        const near = Math.max(.6,far - 1.1);
        for (let y = 0; y < 5.8; y += .72) {
          const shade = Math.round(24 + far * .8 + Math.sin(zWorld * 19 + y * 11) * 4);
          this.polygon([project(side*4.7,y,near),project(side*4.7,y,far),
            project(side*4.7,y+.7,far),project(side*4.7,y+.7,near)],
          `rgb(${shade},${shade+4},${shade+1})`,'#79745a24');
        }
      }
    }
    // Receding floor/ceiling lines and dusty runner give clear forward motion.
    this.polygon([project(-1.2,0),project(1.2,0),[w*.85,h],[w*.15,h]],'#3c2522a0','#8b65464d');
    for (let world = 17; world > camera + .6; world -= .8) {
      const z = world - camera;
      for (const y of [0,5.8]) {
        const a=project(-4.7,y,z), b=project(4.7,y,z);
        c.strokeStyle = '#b0a27b26'; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
      }
    }
    for (const x of [-3,-1.5,0,1.5,3]) {
      c.strokeStyle='#c5b4811a'; c.beginPath(); c.moveTo(...project(x,0)); c.lineTo(...project(x,0,.4)); c.stroke();
    }
    // Sconces are fixed in world space and pass the camera as the player walks.
    for (const world of [5,10,15]) for (const side of [-1,1]) {
      const z=world-camera;
      if (z < .8 || z > distance) continue;
      const [x,y]=project(side*4.55,3.2,z), scale=focal/z;
      const glow=c.createRadialGradient(x,y,0,x,y,scale*1.2);
      glow.addColorStop(0,'#ffc46b66'); glow.addColorStop(1,'#b96e1700');
      c.fillStyle=glow; c.fillRect(x-scale*1.2,y-scale*1.2,scale*2.4,scale*2.4);
      c.fillStyle='#1c1510'; c.fillRect(x-scale*.04,y,scale*.08,scale*.45);
      c.fillStyle='#ffd091'; c.beginPath();
      c.ellipse(x,y,scale*.06,scale*(.15+(this.reduced.matches?0:Math.sin(now/91+world)*.02)),0,0,Math.PI*2); c.fill();
    }
    const opening = this.selected !== null && (this.phase === 'reveal' || this.phase === 'rest');
    for(const wallX of [-1.05,1.05]) {
      const [x,y]=project(wallX,3.35), size=focal/distance;
      const glow=c.createRadialGradient(x,y,0,x,y,size*1.5);
      glow.addColorStop(0,'#f9b75766');glow.addColorStop(1,'#d07b1900');
      c.fillStyle=glow;c.fillRect(x-size*1.5,y-size*1.5,size*3,size*3);
      c.fillStyle='#5b4930';c.fillRect(x-size*.045,y+size*.1,size*.09,size*.42);
      c.fillStyle='#f2c174';c.beginPath();c.ellipse(x,y,size*.055,size*.16,0,0,Math.PI*2);c.fill();
    }
    const openP = opening ? (this.phase==='rest' ? 1 : Math.min(1,elapsed/DOOR_OPEN_MS)) : 0;
    for (let i=0;i<3;i++) {
      const {x,y,width:dw,height:dh} = geometry.doors[i];
      const bottom=y+dh;
      const button=this.doors[i];
      Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${dw}px`,height:`${dh}px`,fontSize:`${Math.max(6,Math.min(14,dw*.23))}px`});
      c.save();
      const selected=opening && i===this.selected;
      c.shadowColor=selected?'#adffb8':'#000'; c.shadowBlur=selected?dw*.35:dw*.18;
      c.fillStyle='#050a08'; c.strokeStyle='#8c805d'; c.lineWidth=Math.max(2,dw*.065);
      c.beginPath(); c.roundRect(x,y,dw,dh,[dw*.48,dw*.48,1,1]); c.fill(); c.stroke();
      c.shadowBlur=0;
      if (selected && openP > .3) {
        const glow=c.createRadialGradient(x+dw/2,y+dh*.6,0,x+dw/2,y+dh*.6,dh*.7);
        glow.addColorStop(0,this.prize.kind==='ghost'?'#b4efff99':'#cae99e99'); glow.addColorStop(1,'#c2ffca00');
        c.fillStyle=glow; c.fillRect(x-dw*.3,y,dw*1.6,dh);
      }
      c.beginPath(); c.roundRect(x+dw*.05,y+dw*.05,dw*.9,dh-dw*.07,[dw*.43,dw*.43,0,0]); c.clip();
      const faceWidth=dw*(selected?Math.max(.045,Math.cos(openP*Math.PI*.47)):1);
      const wood=c.createLinearGradient(x,0,x+dw,0);
      wood.addColorStop(0,'#1b1210'); wood.addColorStop(.5,'#52382a'); wood.addColorStop(1,'#1c1813');
      c.fillStyle=wood; c.fillRect(x,y,faceWidth,dh);
      c.strokeStyle='#ad8d5740'; c.lineWidth=1;
      for(let plank=1;plank<6;plank++) { c.beginPath(); c.moveTo(x+faceWidth*plank/6,y); c.lineTo(x+faceWidth*plank/6,bottom); c.stroke(); }
      c.strokeStyle='#9b7956'; c.lineWidth=Math.max(1,dw*.035);
      c.strokeRect(x+faceWidth*.13,y+dh*.25,faceWidth*.72,dh*.6);
      c.fillStyle='#c6a367'; c.beginPath(); c.arc(x+faceWidth*.8,y+dh*.58,Math.max(1,dw*.045),0,Math.PI*2); c.fill();
      c.restore();
      if(selected && this.revealed) {
        const rp=this.phase==='rest'?1:Math.min(1,(elapsed-DOOR_OPEN_MS)/(this.prize.kind==='ghost'?1900:1600));
        this.drawPrize(x+dw/2,y+dh*.53,dw,dh,rp,now);
      }
    }
    // Dust motes and corner cobwebs, with deterministic seeds rather than random draws.
    for(let i=0;i<65;i++) {
      const seed=(Math.sin(i*131.7)*43758.5)%1;
      const t=this.reduced.matches?0:now*.000012;
      const x=((seed+t*(1+i%3))%1+1)%1*w;
      const y=((Math.sin(i*23)*.5+.5-t*(1+i%2))%1+1)%1*h;
      c.fillStyle=`rgba(221,213,178,${.10+(i%4)*.045})`;
      c.beginPath(); c.arc(x,y,Math.max(.5,w*.0015*(1+i%2)),0,Math.PI*2); c.fill();
    }
    c.strokeStyle='#d5d8c329'; c.lineWidth=.8;
    for(const flip of [false,true]) {
      c.save(); if(flip){c.translate(w,0);c.scale(-1,1);}
      for(let i=1;i<=5;i++) { c.beginPath(); c.moveTo(0,0); c.lineTo(w*.23*Math.cos(i*.24),h*.22*Math.sin(i*.24)); c.stroke(); }
      for(let j=1;j<=4;j++){ c.beginPath(); c.ellipse(0,0,w*.055*j,h*.053*j,0,0,Math.PI/2); c.stroke(); }
      c.restore();
    }
    const shade=c.createRadialGradient(w/2,h*.48,w*.1,w/2,h*.48,Math.max(w,h)*.7);
    shade.addColorStop(0,'#00000000'); shade.addColorStop(1,'#000000d9');
    c.fillStyle=shade;c.fillRect(0,0,w,h);
    if(opening && this.revealed) {
      c.fillStyle='#090e0eee'; c.fillRect(w*.04,h*.85,w*.92,h*.12);
      c.fillStyle='#f5ecd3'; c.font=`700 ${Math.max(10,w*.037)}px system-ui`; c.textAlign='center';c.textBaseline='middle';
      c.fillText(this.caption,w/2,h*.91,w*.86);
    }
  }

  private drawPrize(x:number,y:number,w:number,h:number,p:number,now:number):void {
    const c=this.ctx;
    c.save(); c.translate(x,y); c.textAlign='center'; c.textBaseline='middle';
    c.shadowColor='#c8ffa9'; c.shadowBlur=w*.4;
    if(this.prize.kind==='ghost') {
      const size=this.reduced.matches?1:.65+p*2.5;
      c.scale(size,size); c.globalAlpha=this.reduced.matches ? 1-p : Math.min(1,p*5)*Math.min(1,(1-p)*4);
      const g=c.createRadialGradient(0,-h*.06,0,0,0,w*.65);
      g.addColorStop(0,'#f1ffffed');g.addColorStop(1,'#a7dbe76b');c.fillStyle=g;
      c.beginPath();c.moveTo(-w*.48,h*.24);c.bezierCurveTo(-w*.6,-h*.34,w*.6,-h*.34,w*.48,h*.24);
      c.quadraticCurveTo(w*.2,h*.14,0,h*.28);c.quadraticCurveTo(-w*.2,h*.14,-w*.48,h*.24);c.fill();
      c.shadowBlur=0;c.fillStyle='#10202b';
      for(const eye of [-1,1]) {c.beginPath();c.ellipse(eye*w*.16,-h*.07,w*.08,h*.045,eye*.2,0,Math.PI*2);c.fill();}
      c.beginPath();c.ellipse(0,h*.04,w*.055,h*.045,0,0,Math.PI*2);c.fill();
    } else if(this.prize.kind==='coin') {
      c.fillStyle='#eec461';c.strokeStyle='#fff2a8';c.lineWidth=Math.max(2,w*.07);
      c.beginPath();c.ellipse(0,0,w*.43,w*.43,0,0,Math.PI*2);c.fill();c.stroke();
      c.shadowBlur=0;c.fillStyle='#6c421c';c.font=`900 ${w*.5}px Georgia`;c.fillText('1',0,0);
    } else if(this.prize.kind==='multiplier') {
      const pulse=this.reduced.matches?1:1+Math.sin(now/130)*.07;c.scale(pulse,pulse);
      c.fillStyle='#d6ffaf';c.font=`900 ${w*.83}px Georgia`;c.fillText(`×${this.prize.multiplier}`,0,0);
    } else {
      c.fillStyle='#b7d2db';c.strokeStyle='#f2ffef';c.lineWidth=1;
      for(let i=0;i<6;i++){c.fillRect(-w*.45+i*w*.14,h*.2-i*h*.07,w*.75-i*w*.075,h*.07);c.strokeRect(-w*.45+i*w*.14,h*.2-i*h*.07,w*.75-i*w*.075,h*.07);}
      c.fillStyle='#e6ffbc';c.font=`900 ${w*.65}px Georgia`;c.fillText('↑',0,-h*.23);
    }
    c.restore();
  }
}
