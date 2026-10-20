import type { Assets,Cv,Defaults,Mat,Sample,Rect } from './types.ts';
import { geometry } from './geometry.ts';
export class Session {
  readonly owned:Mat[]=[];
  readonly cache=new Map<string,unknown>();
  readonly cv:Cv; readonly assets:Assets; readonly defaults:Defaults; readonly samples:Sample[];
  constructor(cv:Cv,assets:Assets,defaults:Defaults,samples:Sample[]) {this.cv=cv;this.assets=assets;this.defaults=defaults;this.samples=samples;}
  own<T extends Mat>(mat:T):T {this.owned.push(mat);return mat;}
  memo<T>(key:string,make:()=>T):T {if(!this.cache.has(key))this.cache.set(key,make());return this.cache.get(key) as T;}
  gray(i:number):Mat {return this.memo('gray'+i,()=>{const raw=this.cv.matFromImageData(this.samples[i].screenshot.imageData);
    try{const out=this.own(new this.cv.Mat());this.cv.cvtColor(raw,out,this.cv.COLOR_RGBA2GRAY);return out;}finally{raw.delete();}});}
  hsv(i:number):Mat {return this.memo('hsv'+i,()=>{const raw=this.cv.matFromImageData(this.samples[i].screenshot.imageData),rgb=new this.cv.Mat(),out=this.own(new this.cv.Mat());
    try{this.cv.cvtColor(raw,rgb,this.cv.COLOR_RGBA2RGB);this.cv.cvtColor(rgb,out,this.cv.COLOR_RGB2HSV);return out;}finally{raw.delete();rgb.delete();}});}
  edge(i:number):Mat {return this.memo('edge'+i,()=>{const out=this.own(new this.cv.Mat());this.cv.Canny(this.gray(i),out,25,80);return out;});}
  color(i:number,rgb:number[],minS=60,minV=70):Mat {
    return this.memo('color'+i+rgb.join(',')+'/'+minS+'/'+minV,()=>{
      const cv=this.cv,pixel=cv.matFromArray(1,1,cv.CV_8UC3,rgb),hue=new cv.Mat(),hsv=this.hsv(i);
      const out=this.own(cv.Mat.zeros(hsv.rows,hsv.cols,cv.CV_8UC1)),t=this.defaults.thresholds.hueTolerance;
      const temp=new cv.Mat();
      try {
        cv.cvtColor(pixel,hue,cv.COLOR_RGB2HSV);const h=hue.data[0];
        for(const shift of [-180,0,180]) {const low=Math.max(0,h-t+shift),high=Math.min(179,h+t+shift);if(low>high)continue;
          const lo=new cv.Mat(hsv.rows,hsv.cols,hsv.type(),new cv.Scalar(low,minS,minV));
          const hi=new cv.Mat(hsv.rows,hsv.cols,hsv.type(),new cv.Scalar(high,255,255));
          try{cv.inRange(hsv,lo,hi,temp);cv.bitwise_or(out,temp,out);}finally{lo.delete();hi.delete();}
        }
        return out;
      }finally{pixel.delete();hue.delete();temp.delete();}
    });
  }
  model(i:number) {const o=this.samples[i].observation;return geometry(o.width,o.height,this.defaults);}
  scale(i:number) {const f=this.samples[i];return {x:f.screenshot.imageData.width/f.observation.width,y:f.screenshot.imageData.height/f.observation.height};}
  pixels(i:number,r:Rect):Rect {const s=this.scale(i);return {x:Math.round(r.x*s.x),y:Math.round(r.y*s.y),width:Math.round(r.width*s.x),height:Math.round(r.height*s.y)};}
  css(i:number,r:Rect):Rect {const s=this.scale(i);return {x:r.x/s.x,y:r.y/s.y,width:r.width/s.x,height:r.height/s.y};}
  dispose(){this.owned.splice(0).reverse().forEach(m=>m.delete());this.cache.clear();}
}
