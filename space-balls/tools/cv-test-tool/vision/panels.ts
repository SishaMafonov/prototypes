import { Session } from './session.ts';
import { match } from './templates.ts';
import { pass,fail,na,combine,type Evidence,type Rect } from './types.ts';
import { center } from './geometry.ts';
function pixelCount(s:Session,i:number,rect:Rect,kind:'bright'|'cyan'|'pink'|'gold') {
  const raw=s.samples[i].screenshot.imageData,r=s.pixels(i,rect);
  let total=0,hit=0;
  for(let y=Math.max(0,r.y);y<Math.min(raw.height,r.y+r.height);y++)for(let x=Math.max(0,r.x);x<Math.min(raw.width,r.x+r.width);x++){
    const n=(y*raw.width+x)*4,R=raw.data[n],G=raw.data[n+1],B=raw.data[n+2];total++;
    if(kind==='bright'?Math.min(R,G,B)>150:kind==='cyan'?B>130&&G>R*1.15:kind==='pink'?R>140&&B>G*1.12: R>150&&G>100&&B<G*.85)hit++;
  }
  return total?hit/total:0;
}
function edgeSupport(s:Session,i:number,r:Rect) {
  const edge=s.edge(i),p=s.pixels(i,r);let total=0,hit=0;
  for(let side=0;side<4;side++)for(let t=.15;t<.85;t+=.02){
    const x=Math.round(side<2?p.x+p.width*t:p.x+(side===2?0:p.width-1));
    const y=Math.round(side>=2?p.y+p.height*t:p.y+(side===0?0:p.height-1));let found=false;total++;
    for(let dy=-3;dy<=3&&!found;dy++)for(let dx=-3;dx<=3&&!found;dx++)if(x+dx>=0&&y+dy>=0&&x+dx<edge.cols&&y+dy<edge.rows&&edge.data[(y+dy)*edge.cols+x+dx])found=true;
    if(found)hit++;
  }
  return total?hit/total:0;
}
export function panel(s:Session,target:string):Evidence {
  const i=0,o=s.samples[i].observation,r=o.rects[target];
  if(!r)return fail(target+' is not visible in the expected stage');
  const e=Math.max(3,.005*Math.min(o.width,o.height)),c=center(r),checks:Evidence[]=[];
  if(r.x< -e||r.y< -e||r.x+r.width>o.width+e||r.y+r.height>o.height+e)return fail(target+' is clipped',{box:r});
  if(Math.abs(c.x-o.width/2)>e)return fail(target+' is not horizontally centered',{center:c});
  if(target==='start'||target==='round') {
    const brightness=pixelCount(s,i,r,'bright');
    checks.push(brightness>.015?pass('Bright central glyph pixels',{brightness}):fail('Central glyph pixels missing',{brightness}));
    if(Math.abs(c.y-o.height/2)>Math.max(65,o.height*.18))checks.push(fail('Message is outside the central band',{center:c}));
    if(target==='round'&&o.rects.hint&&o.rects.hint.y<r.y+r.height)checks.push(fail('Hint is above/overlapping main glyph region'));
  }else {
    const support=edgeSupport(s,i,r);checks.push(support>.35?pass(target+' border pixels',{support}):fail(target+' border pixels missing',{support}));
  }
  if(target==='hud') {
    if(Math.abs(r.y-Math.max(.06*o.height,0))>e+5)checks.push(fail('HUD vertical position',{top:r.y}));
    for(const [key,color]of [['you','cyan'],['opponent','pink']]as const){const group=o.rects[key];if(!group)checks.push(fail(key+' group missing'));else{const ratio=pixelCount(s,i,group,color);checks.push(ratio>.01?pass(key+' color',{ratio}):fail(key+' color missing',{ratio}));}}
  }
  if(target==='voice') {
    const expectedWidth=Math.min(o.height<=420?300:460,o.width-40),bottom=o.height<=420?5:.03*o.height;
    if(Math.abs(r.width-expectedWidth)>e||Math.abs(o.height-r.y-r.height-bottom)>e+3)checks.push(fail('Voice panel geometry',{box:r,expectedWidth,bottom}));
    for(const key of ['mic','meter','boost'])if(!o.rects[key])checks.push(fail('Voice control '+key+' missing'));
  }
  if(target==='result') {
    if(Math.abs(r.width-Math.min(440,o.width-40))>e||Math.abs(c.y-o.height/2)>e+5)checks.push(fail('Modal geometry',{box:r}));
    for(const [key,color]of [['winner',o.winner===0?'cyan':'pink'],['trophy','gold']]as const){
      const glyph=o.rects[key];if(!glyph)checks.push(fail(key+' not visible'));else{const ratio=pixelCount(s,i,glyph,color);checks.push(ratio>.01?pass(key+' color',{ratio}):fail(key+' color missing',{ratio}));}
    }
  }
  return combine(checks,target+' visual projection');
}
export function picker(s:Session):Evidence {
  const o=s.samples[0].observation,preview=o.rects.preview;
  if(!preview)return fail('Picker preview missing');
  const size=o.height<=420?Math.min(.3*o.width,.35*o.height):Math.max(76,Math.min(.42*o.width,.38*o.height,280));
  const result=match(s,0,'planet-'+o.selectedPlanet.toLowerCase(),size,size*724/543,center(preview));
  const checks=[result.evidence],e=Math.max(3,.005*Math.min(o.width,o.height));
  if(Math.abs(preview.width-size)>e||Math.abs(center(preview).x-o.width/2)>e)checks.push(fail('Picker planet geometry',{box:preview,expected:size}));
  for(const key of ['previous','next']) {
    const arrow=o.rects[key];
    if(!arrow){checks.push(fail(key+' arrow missing'));continue;}
    if(Math.abs(arrow.width-48)>e||Math.abs(arrow.height-48)>e||Math.abs(center(arrow).y-center(preview).y)>e)checks.push(fail(key+' arrow geometry'));
    else checks.push(edgeSupport(s,0,arrow)>.25?pass(key+' circle edges'):fail(key+' circle edges missing'));
    if(key==='previous'?arrow.x+arrow.width>preview.x:arrow.x<preview.x+preview.width)checks.push(fail(key+' arrow ordering'));
  }
  const button=o.rects.confirm;
  if(!button)checks.push(fail('Confirm absent'));else{
    const cyan=pixelCount(s,0,button,'cyan');checks.push(cyan>.4?pass('Cyan confirm pixels',{cyan}):fail('Confirm color',{cyan}));
    if(button.y<preview.y+preview.height||button.width<168-e||button.height<48-e)checks.push(fail('Confirm geometry/order'));
  }
  return combine(checks,'Picker');
}
export function layout(s:Session):Evidence {
  const o=s.samples[0].observation,checks:Evidence[]=[];
  const keys=o.stage==='S-PICK'?['previous','next','confirm']:o.stage.startsWith('S-FINISH')?['result']:o.stage==='S-READY'?['start','voice']:['hud','voice'];
  for(const key of keys) {
    const r=o.rects[key];if(!r){checks.push(fail(key+' missing'));continue;}
    if(r.x<0||r.y<0||r.x+r.width>o.width+1||r.y+r.height>o.height+1)checks.push(fail(key+' clipped',{box:r}));
    else checks.push(pixelCount(s,0,r,'bright')+pixelCount(s,0,r,'cyan')+pixelCount(s,0,r,'pink')>.002?pass(key+' visible pixels'):fail(key+' pixel content missing'));
  }
  return combine(checks,'Current viewport layout');
}
