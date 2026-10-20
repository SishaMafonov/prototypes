import { Session } from './session.ts';
import { netsAt,ballAt,contours } from './shapes.ts';
import { pass,fail,na,combine,type Evidence,type Rect } from './types.ts';
export function motion(s:Session,target:string):Evidence {
  if(s.samples.length<2)return na('A sequence needs at least two frames');
  if(target==='nets') {
    const detections=s.samples.map((_,i)=>netsAt(s,i)),bad=detections.find(d=>d.evidence.status!=='PASSED');
    if(bad)return bad.evidence;
    return combine([0,1].map(side=>{
      const ys=detections.map(d=>d.boxes[side].y),distance=Math.max(...ys)-Math.min(...ys);
      return distance>=s.defaults.thresholds.minMovementCss?pass('Net moved',{side,distance}):fail('Net did not visibly move',{side,distance});
    }),'Net motion');
  }
  const cores=s.samples.map((_,i)=>ballAt(s,i));
  if(cores.some(c=>c.evidence.status==='NA'))return na('Core is occluded or too small during the sequence');
  if(cores.some(c=>c.evidence.status==='FAILED'))return fail('Asteroid core could not be tracked throughout the sequence');
  const displacement=Math.max(...cores.map(p=>Math.hypot(p.x!-cores[0].x!,p.y!-cores[0].y!)));
  return displacement>=s.defaults.thresholds.minMovementCss?pass('Asteroid moved',{displacement}):fail('Asteroid remained stationary',{displacement});
}
export function tail(s:Session):Evidence {
  if(s.samples.length<2)return na('Tail direction requires multiple frames');
  const cores=s.samples.map((_,i)=>ballAt(s,i));
  for(let i=1;i<cores.length;i++) {
    const a=cores[i-1],b=cores[i];if(a.evidence.status!=='PASSED'||b.evidence.status!=='PASSED')continue;
    const dx=b.x!-a.x!,dy=b.y!-a.y!,distance=Math.hypot(dx,dy),d=s.model(i).ballDiameter;
    if(distance<1)continue;
    const o=s.samples[i].observation,m=s.model(i),scale=s.scale(i),warm=s.color(i,[255,145,50],100,110);
    if(b.x!-m.left<2*d||m.right-b.x!<2*d||b.y!-m.top<2*d||m.bottom-b.y!<2*d)continue;
    let eligible=0,hit=0;
    for(let y=Math.floor((b.y!-2*d)*scale.y);y<Math.ceil((b.y!+2*d)*scale.y);y++)for(let x=Math.floor((b.x!-2*d)*scale.x);x<Math.ceil((b.x!+2*d)*scale.x);x++){
      const cx=x/scale.x,cy=y/scale.y,vx=cx-b.x!,vy=cy-b.y!;
      const behind=-(vx*dx+vy*dy)/distance,lateral=Math.abs(vx*dy-vy*dx)/distance;
      if(behind<d*.7||behind>d*2.8||lateral>d*.65||o.occlusions.some(r=>cx>=r.x&&cx<r.x+r.width&&cy>=r.y&&cy<r.y+r.height))continue;
      // Warm source planets can otherwise impersonate a plume.
      if(m.slots.some(p=>{const t=s.assets.templates.get('planet-'+p.name.toLowerCase())!;const k=p.diameter/543;
        const px=p.x+(t.config.bodyCenter[0]-271.5)*k*(p.side?-1:1),py=p.y+(t.config.bodyCenter[1]-362)*k;
        return Math.hypot(cx-px,cy-py)<t.config.bodyRadius*k*1.1;}))continue;
      if(x<0||y<0||x>=warm.cols||y>=warm.rows)continue;eligible++;if(warm.data[y*warm.cols+x])hit++;
    }
    if(eligible<d*d*scale.x*scale.y*.2)continue;
    return hit/eligible>.015?pass('Warm plume behind measured motion',{support:hit/eligible}):fail('Trailing plume not visible',{support:hit/eligible});
  }
  return na('No unoccluded moving core/rear region for tail analysis');
}
export function stable(s:Session,target:string):Evidence {
  const r=s.samples[0].observation.rects[target];if(!r)return na('Stable region is not visible');
  if(s.samples.length<2)return na('Multiple frames required');
  const cv=s.cv,p=s.pixels(0,r),rect=new cv.Rect(p.x,p.y,p.width,p.height),first=s.gray(0).roi(rect),delta=new cv.Mat();
  try {
    let maximum=0;for(let i=1;i<s.samples.length;i++){const current=s.gray(i).roi(rect);try{cv.absdiff(first,current,delta);maximum=Math.max(maximum,cv.mean(delta)[0]);}finally{current.delete();}}
    return maximum<=s.defaults.thresholds.stableMeanDifference?pass('Modal pixels persisted',{maximumMeanDifference:maximum}):fail('Modal changed during persistence window',{maximumMeanDifference:maximum});
  }finally{first.delete();delta.delete();}
}
export function glow(s:Session):Evidence {
  const off=s.samples.findIndex(f=>!f.observation.drive),on=s.samples.findIndex(f=>f.observation.drive);
  if(off<0||on<0)return na('Observe both drive-off and drive-on in this sequence; manually hold Boost after starting');
  const values=[off,on].map(i=>{
    const o=s.samples[i].observation,a=s.model(i),slot=a.slots.find(p=>!p.side&&p.name===o.selectedPlanet)!;
    if(!slot)return NaN;
    const t=s.assets.templates.get('planet-'+slot.name.toLowerCase())!,k=slot.diameter/543;
    const cx=slot.x+(t.config.bodyCenter[0]-271.5)*k,cy=slot.y+(t.config.bodyCenter[1]-362)*k;
    const radius=t.config.bodyRadius*k*s.defaults.geometry.ringScales[slot.name],gray=s.gray(i),scale=s.scale(i);
    let sum=0,count=0;
    for(let deg=0;deg<360;deg++){const angle=deg*Math.PI/180,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
      if(o.occlusions.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height))continue;
      const px=Math.round(x*scale.x),py=Math.round(y*scale.y);if(px>=0&&py>=0&&px<gray.cols&&py<gray.rows){sum+=gray.data[py*gray.cols+px];count++;}}
    return count>=252?sum/count:NaN;
  });
  if(values.some(v=>!Number.isFinite(v)))return na('Controlled annulus is obscured');
  const increase=values[1]-values[0];return increase>=5?pass('Controlled ring brightened',{increase}):fail('Drive-on ring did not brighten',{increase});
}
export function countdown(s:Session):Evidence {
  if(s.samples[0].observation.stage!=='S-COUNT-READY')return na('Capture must start during Ready? after the stream is approved');
  const duration=s.samples.at(-1)!.screenshot.timestampMs-s.samples[0].screenshot.timestampMs;
  if(duration<3000)return na('Countdown observation window is too short');
  const phases=new Set(s.samples.map(f=>f.observation.stage));
  if(!['S-COUNT-READY','S-COUNT-STEADY','S-COUNT-GO','S-PLAY'].every(stage=>phases.has(stage)))return na('The capture missed part of the countdown; retry with sharing already active');
  const brightness=s.samples.map((sample,i)=>{const r=sample.observation.rects.round;if(!r)return 0;const p=s.pixels(i,r),gray=s.gray(i);let n=0;
    for(let y=Math.max(0,p.y);y<Math.min(gray.rows,p.y+p.height);y++)for(let x=Math.max(0,p.x);x<Math.min(gray.cols,p.x+p.width);x++)if(gray.data[y*gray.cols+x]>160)n++;return n;});
  return Math.max(...brightness)>30&&s.samples.at(-1)!.observation.stage==='S-PLAY'?pass('Central glyph pixels changed then disappeared',{glyphPixels:brightness,duration}):fail('Countdown glyph pixels were not observed');
}
export function goalReset(s:Session):Evidence {
  if(s.samples[0].observation.stage!=='S-GOAL')return na('Capture must begin during a nonwinning goal');
  const contact=ballAt(s,0);if(contact.evidence.status!=='PASSED')return na('Contact core is clipped/occluded; reset cannot be proved from these pixels');
  for(let i=1;i<s.samples.length;i++)if(s.samples[i].observation.stage.startsWith('S-COUNT')) {
    const core=ballAt(s,i);if(core.evidence.status!=='PASSED')continue;
    const a=s.model(i),distance=Math.hypot(core.x!-(a.left+a.cw/2),core.y!-(a.top+a.ch/2));
    if(distance<3)return pass('Core returned to the court center',{distance});
  }
  return na('Centered reset core was obscured by countdown text; no pixel verdict');
}
export function fixture(s:Session):Evidence {
  const centers:{x:number;y:number}[]=[],checks:Evidence[]=[];
  for(let i=0;i<s.samples.length;i++) {
    const o=s.samples[i].observation,sx=o.width/960,sy=o.height/540;
    for(const [rgb,x]of [[[66,101,234],765],[[138,255,207],840]] as [number[],number][]) {
      const mask=s.color(i,rgb,60,100),r=s.pixels(i,{x:(x+5)*sx,y:471*sy,width:50*sx,height:30*sy});
      const roi=mask.roi(new s.cv.Rect(r.x,r.y,r.width,r.height));try{const ratio=s.cv.countNonZero(roi)/(r.width*r.height);checks.push(ratio>.9?pass('Fixture swatch',{x,ratio}):fail('Fixture swatch mismatch',{x,ratio}));}finally{roi.delete();}
    }
    const blue=s.color(i,[113,156,255],50,100),roi={x:130*sx,y:205*sy,width:700*sx,height:190*sy};
    const boxes=contours(s,i,blue,roi).filter(b=>b.width>40*sx&&b.height>40*sy);
    boxes.sort((a,b)=>b.width*b.height-a.width*a.height);const b=boxes[0];
    if(!b){checks.push(fail('Fixture sphere missing'));continue;}
    const c={x:(b.x+b.width/2)/sx,y:(b.y+b.height/2)/sy};centers.push(c);
    const orbit=((c.x-480)/300)**2+((c.y-300)/50)**2;
    checks.push(Math.abs(orbit-1)<.25?pass('Sphere on orbit',{center:c,orbit}):fail('Sphere off orbit',{center:c,orbit}));
  }
  if(centers.length<2)checks.push(na('More fixture frames required'));
  else{const displacement=Math.max(...centers.map(c=>Math.hypot(c.x-centers[0].x,c.y-centers[0].y)));checks.push(displacement>1?pass('Sphere moved',{displacement}):fail('Sphere stationary',{displacement}));}
  return combine(checks,'Motion fixture');
}
