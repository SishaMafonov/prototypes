import { Session } from './session.ts';
import { match,type Match } from './templates.ts';
import { pass,fail,na,combine,type Evidence,type Rect } from './types.ts';
import { intersection } from './geometry.ts';
export function frameCheck(s:Session):Evidence {
  if(!s.samples.length)return na('No captured frames');
  const first=s.samples[0];
  for(const sample of s.samples) {
    const {imageData}=sample.screenshot,o=sample.observation;
    if(!o.width||!o.height||!imageData.width||!imageData.height)return na('Unknown viewport or empty image');
    if(imageData.data.length!==imageData.width*imageData.height*4)return fail('Invalid RGBA buffer length');
    if(o.width!==first.observation.width||o.height!==first.observation.height||imageData.width!==first.screenshot.imageData.width||imageData.height!==first.screenshot.imageData.height)return na('Viewport/capture changed size');
  }
  return pass('Consistent RGBA frames and CSS-to-image mapping',{frames:s.samples.length,width:first.screenshot.imageData.width,height:first.screenshot.imageData.height});
}
export function planets(s:Session,side?:number):Evidence {
  const a=s.model(0),results:Evidence[]=[];
  for(const slot of a.slots.filter(p=>side===undefined||p.side===side)) {
    const attempts=s.samples.slice(0,5).map((_,i)=>{
      const expected=match(s,i,'planet-'+slot.name.toLowerCase(),slot.diameter,slot.diameter*724/543,{x:slot.x,y:slot.y},slot.side===1);
      if(expected.evidence.status!=='PASSED')return expected;
      const opposite=match(s,i,'planet-'+slot.name.toLowerCase(),slot.diameter,slot.diameter*724/543,{x:slot.x,y:slot.y},slot.side!==1);
      if(opposite.error!==undefined&&opposite.error+.03<expected.error!)return {...expected,evidence:fail(slot.id+' has the opposite orientation',{expected:expected.error,opposite:opposite.error})};
      if(opposite.error!==undefined&&opposite.error<expected.error!+.03)return {...expected,evidence:na(slot.id+' orientation is ambiguous',{expected:expected.error,opposite:opposite.error})};
      return expected;
    });
    results.push(attempts.find(m=>m.evidence.status==='PASSED')?.evidence??
      attempts.find(m=>m.evidence.status==='NA')?.evidence??attempts.sort((a,b)=>(a.error??Infinity)-(b.error??Infinity))[0].evidence);
  }
  return combine(results,'Planet slots');
}
export function contours(s:Session,i:number,mask:ReturnType<Session['gray']>,region:Rect):Rect[] {
  const {cv}=s,r=s.pixels(i,region),x=Math.max(0,r.x),y=Math.max(0,r.y);
  const w=Math.min(mask.cols,r.x+r.width)-x,h=Math.min(mask.rows,r.y+r.height)-y;
  if(w<=0||h<=0)return [];
  const roi=mask.roi(new cv.Rect(x,y,w,h)),copy=roi.clone(),vector=new cv.MatVector(),hierarchy=new cv.Mat();
  try {cv.findContours(copy,vector,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
    const boxes:Rect[]=[];for(let n=0;n<vector.size();n++){const contour=vector.get(n);try{const b=cv.boundingRect(contour);boxes.push(s.css(i,{x:x+b.x,y:y+b.y,width:b.width,height:b.height}));}finally{contour.delete();}}
    return boxes;
  }finally{roi.delete();copy.delete();vector.delete();hierarchy.delete();}
}
export interface NetDetection { evidence:Evidence; boxes:Rect[] }
export function netsAt(s:Session,i:number):NetDetection {
  return s.memo('nets'+i,()=>{
    const a=s.model(i),o=s.samples[i].observation,boxes:Rect[]=[],results:Evidence[]=[];
    for(const side of [0,1]) {
      const region={x:a.goalXs[side]-a.goalHeight*.35-4,y:a.top-4,width:a.goalHeight*.7+8,height:a.ch+8};
      if(o.occlusions.some(r=>intersection(r,region).height>region.height*.4&&intersection(r,region).width>region.width*.4)){results.push(na('Net region obscured'));continue;}
      if(a.goalHeight*Math.min(s.scale(i).x,s.scale(i).y)<s.defaults.thresholds.minTexturePixels){results.push(na('Net is too small'));continue;}
      const mask=s.color(i,side?[255,145,232]:[134,234,255],60,150);
      const candidates=contours(s,i,mask,region).filter(b=>b.height>a.goalHeight*.5&&b.width>a.goalHeight*.15);
      candidates.sort((b,c)=>Math.abs(b.height-a.goalHeight)-Math.abs(c.height-a.goalHeight));
      const b=candidates[0];if(!b){results.push(fail((side?'Pink':'Cyan')+' net missing'));continue;}
      boxes.push(b);const e=Math.max(3,.005*Math.min(o.width,o.height));
      const valid=Math.abs(b.height-a.goalHeight)<=e+3&&Math.abs(b.width-a.goalHeight*.4)<=e+3&&
        Math.abs(b.x+b.width/2-a.goalXs[side])<=e+2&&b.y>=a.top-e-3&&b.y+b.height<=a.bottom+e+3;
      results.push(valid?pass('Net geometry',{side,box:b}):fail('Net geometry mismatch',{side,box:b,expectedHeight:a.goalHeight}));
    }
    return {evidence:combine(results,'Goal nets'),boxes};
  });
}
export function nets(s:Session):Evidence {return netsAt(s,0).evidence;}
export function ballAt(s:Session,i:number):Match {const d=s.model(i).ballDiameter;return match(s,i,'asteroid',d,d);}
export function ball(s:Session):Evidence {
  const attempts=s.samples.slice(0,5).map((_,i)=>ballAt(s,i));
  return attempts.find(m=>m.evidence.status==='PASSED')?.evidence??attempts.find(m=>m.evidence.status==='NA')?.evidence??attempts[0].evidence;
}
const colors:Record<string,number[]>={Earth:[103,232,216],Jupiter:[255,193,116],Ice:[131,215,255],Lava:[255,143,105]};
export function rings(s:Session):Evidence {
  const i=0,a=s.model(i),o=s.samples[i].observation,scale=s.scale(i);
  if(o.drive)return na('Quiet-ring check needs input off');
  const results:Evidence[]=[];
  for(const slot of a.slots) {
    const template=s.assets.templates.get('planet-'+slot.name.toLowerCase())!;
    const k=slot.diameter/543,cx=slot.x+(template.config.bodyCenter[0]-271.5)*k*(slot.side?-1:1),cy=slot.y+(template.config.bodyCenter[1]-362)*k;
    const radius=template.config.bodyRadius*k*s.defaults.geometry.ringScales[slot.name],mask=s.color(i,colors[slot.name]);
    const tolerance=Math.max(2,radius*.05),band=Math.ceil(tolerance*Math.max(scale.x,scale.y));
    let visible=0,support=0;
    for(let degree=0;degree<360;degree++) {
      const angle=degree*Math.PI/180,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
      if(o.occlusions.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)||x<0||y<0||x>=o.width||y>=o.height)continue;
      visible++;let found=false;
      for(let shift=-band;shift<=band&&!found;shift++){
        const px=Math.round(x*scale.x+Math.cos(angle)*shift),py=Math.round(y*scale.y+Math.sin(angle)*shift);
        found=px>=0&&py>=0&&px<mask.cols&&py<mask.rows&&mask.data[py*mask.cols+px]>0;
      }
      if(found)support++;
    }
    if(visible<252)results.push(na(slot.id+' ring occluded',{visibleDegrees:visible}));
    else results.push(support/visible>=s.defaults.thresholds.ringSupport?pass(slot.id+' ring',{support:support/visible}):fail(slot.id+' ring missing/misaligned',{support:support/visible}));
  }
  return combine(results,'Ring geometry');
}
export function background(s:Session):Evidence {
  const i=0,image=s.gray(i),o=s.samples[i].observation,{cv}=s,reference=new cv.Mat(),result=new cv.Mat(),checks:Evidence[]=[];
  try {
    cv.resize(s.assets.background,reference,new cv.Size(image.cols,image.rows),0,0,cv.INTER_AREA);
    for(const [x,y]of [[0,0],[.84,0],[0,.84],[.84,.84]]) {
      const region={x:x*o.width,y:y*o.height,width:.16*o.width,height:.16*o.height};
      if(o.occlusions.some(r=>intersection(r,region).width*intersection(r,region).height>region.width*region.height*.1))continue;
      const p=s.pixels(i,region),rect=new cv.Rect(p.x,p.y,Math.min(p.width,image.cols-p.x),Math.min(p.height,image.rows-p.y));
      const actual=image.roi(rect),expected=reference.roi(rect);
      try {
        let sum=0,squares=0;for(const value of expected.data){sum+=value;squares+=value*value;}
        if(squares/expected.data.length-(sum/expected.data.length)**2<4)continue;
        cv.matchTemplate(actual,expected,result,cv.TM_CCOEFF_NORMED);
        const score=result.data32F[0];
        checks.push(Number.isFinite(score)&&score>=s.defaults.thresholds.backgroundCorrelation?pass('Background landmark',{score,x,y}):fail('Background landmark mismatch',{score,x,y}));
      }finally{actual.delete();expected.delete();}
    }
    return checks.length>=2?combine(checks,'Court background'):na('Too few unobscured textured background landmarks');
  }finally{reference.delete();result.delete();}
}
