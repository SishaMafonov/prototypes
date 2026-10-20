import type { Evidence,Rect,Mat } from './types.ts';
import { fail,na,pass } from './types.ts';
import { Session } from './session.ts';
export interface Match { evidence:Evidence; x?:number; y?:number; error?:number; box?:Rect }
function coverage(mask:Mat,box:Rect,occlusions:Rect[],width:number,height:number) {
  let total=0,visible=0;
  for(let y=0;y<mask.rows;y++)for(let x=0;x<mask.cols;x++)if(mask.data[y*mask.cols+x]){
    total++;const px=box.x+x,py=box.y+y;
    if(px>=0&&py>=0&&px<width&&py<height&&!occlusions.some(r=>px>=r.x&&px<r.x+r.width&&py>=r.y&&py<r.y+r.height))visible++;
  }
  return total?visible/total:0;
}
export function match(s:Session,i:number,id:string,widthCss:number,heightCss:number,center?:{x:number;y:number},flip=false):Match {
  const key='match'+i+id+widthCss+heightCss+JSON.stringify(center)+flip;
  return s.memo(key,()=>{
    const {cv}=s,t=s.assets.templates.get(id),image=s.gray(i),scale=s.scale(i),threshold=s.defaults.thresholds;
    if(!t)return {evidence:na('Missing template '+id)};
    if(Math.min(widthCss*scale.x,heightCss*scale.y)<threshold.minTexturePixels)return {evidence:na(id+' is below the texture resolution floor')};
    const occlusions=s.samples[i].observation.occlusions.map(r=>s.pixels(i,r));
    const e=Math.max(2,.005*Math.min(s.samples[i].observation.width,s.samples[i].observation.height));
    let best:Match|undefined,visibleCandidate=false;
    for(const factor of threshold.scales) {
      const w=Math.max(1,Math.round(widthCss*scale.x*factor)),h=Math.max(1,Math.round(heightCss*scale.y*factor));
      const prepared=s.memo('scaled'+id+w+'x'+h+flip,()=>{
        const gray=s.own(new cv.Mat()),mask=s.own(new cv.Mat());
        cv.resize(t.gray,gray,new cv.Size(w,h),0,0,w<t.gray.cols?cv.INTER_AREA:cv.INTER_LINEAR);
        cv.resize(t.mask,mask,new cv.Size(w,h),0,0,cv.INTER_NEAREST);
        if(flip){cv.flip(gray,gray,1);cv.flip(mask,mask,1);}return {gray,mask};
      });
      let search:Rect;
      if(center) search={x:Math.floor(center.x*scale.x-w/2-e*scale.x),y:Math.floor(center.y*scale.y-h/2-e*scale.y),width:w+Math.ceil(2*e*scale.x)+2,height:h+Math.ceil(2*e*scale.y)+2};
      else {const a=s.model(i);search=s.pixels(i,{x:a.left,y:a.top,width:a.cw,height:a.ch});}
      const x=Math.max(0,search.x),y=Math.max(0,search.y),right=Math.min(image.cols,search.x+search.width),bottom=Math.min(image.rows,search.y+search.height);
      if(right-x<w||bottom-y<h)continue;
      if(center&&coverage(prepared.mask,{x:center.x*scale.x-w/2,y:center.y*scale.y-h/2,width:w,height:h},occlusions,image.cols,image.rows)<threshold.minMaskVisibility)continue;
      visibleCandidate=true;
      const roi=image.roi(new cv.Rect(x,y,right-x,bottom-y)),result=new cv.Mat();
      try {
        cv.matchTemplate(roi,prepared.gray,result,cv.TM_SQDIFF_NORMED,prepared.mask);
        let finite=0;for(let n=0;n<result.data32F.length;n++)if(Number.isFinite(result.data32F[n]))finite++;else result.data32F[n]=3.4e38;
        if(!finite)continue;
        // JS accepts one argument; the package declarations describe a native overload.
        const minMaxLoc=cv.minMaxLoc as unknown as (src:Mat)=>{minVal:number;minLoc:{x:number;y:number}};
        const peak=minMaxLoc(result),box={x:x+peak.minLoc.x,y:y+peak.minLoc.y,width:w,height:h};
        if(coverage(prepared.mask,box,occlusions,image.cols,image.rows)<threshold.minMaskVisibility)continue;
        const bodyX=box.x+(flip?(t.config.width-t.config.bodyCenter[0]):t.config.bodyCenter[0])*w/t.config.width;
        const bodyY=box.y+t.config.bodyCenter[1]*h/t.config.height;
        const candidate={error:peak.minVal,x:bodyX/scale.x,y:bodyY/scale.y,box:s.css(i,box),
          evidence:peak.minVal<=threshold.maxSqdiff?pass(id+' matched',{error:peak.minVal,box:s.css(i,box)}):fail(id+' texture mismatch',{error:peak.minVal})};
        if(!center&&candidate.evidence.status==='PASSED'){
          let second=Infinity;
          for(let row=0;row<result.rows;row++)for(let col=0;col<result.cols;col++)if(Math.hypot(col-peak.minLoc.x,row-peak.minLoc.y)>w*.65)second=Math.min(second,result.data32F[row*result.cols+col]);
          if(second<peak.minVal+.03)candidate.evidence=na(id+' has ambiguous distinct peaks',{best:peak.minVal,second});
        }
        if(!best||candidate.error<best.error!)best=candidate;
      }finally{roi.delete();result.delete();}
    }
    return best??{evidence:na(visibleCandidate?'No finite, unobscured template peak':'Template is cropped or occluded')};
  });
}
