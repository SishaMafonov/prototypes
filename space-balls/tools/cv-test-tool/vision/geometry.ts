import type { Defaults, Rect } from './types.ts';
export function geometry(width:number,height:number,defaults:Defaults) {
  const g=defaults.geometry, [l,r,xDen,t,b,yDen]=g.court;
  const left=width*l/xDen,right=width*r/xDen,top=height*t/yDen,bottom=height*b/yDen;
  const cw=right-left,ch=bottom-top,size=Math.min(cw/2,ch),half=cw/2;
  const j=size*g.sizes.jupiter,e=size*g.sizes.earth,d=size*g.sizes.small,gap=half*g.gap;
  const jx=left+gap+j/2,ex=left+half-gap-e/2,mx=(jx+j/2+ex-e/2)/2,cy=(top+bottom)/2;
  const dy=(d+(ch-2*d)/3*g.verticalSeparation)/2;
  const slots=[{name:'Jupiter',x:jx,y:cy,diameter:j},{name:'Ice',x:mx,y:cy-dy,diameter:d},
    {name:'Lava',x:mx,y:cy+dy,diameter:d},{name:'Earth',x:ex,y:cy,diameter:e}]
    .flatMap(p=>[0,1].map(side=>({...p,id:side+':'+p.name,side,x:side?left+right-p.x:p.x})));
  return {left,right,top,bottom,cw,ch,size,slots,goalHeight:size*g.sizes.goal,
    goalXs:[width*40/xDen,width*1633/xDen],ballDiameter:2*size*g.sizes.ballRadius};
}
export const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export function intersection(a:Rect,b:Rect):Rect {
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
  return {x,y,width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-x),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-y)};
}
export const center=(r:Rect)=>({x:r.x+r.width/2,y:r.y+r.height/2});
