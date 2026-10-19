import { readFileSync } from 'node:fs';
import { loadOpenCv } from '../tools/opencv.mjs';
export const cv=await loadOpenCv();
export const manifest=JSON.parse(readFileSync(new URL('../tools/cv-test-tool/generated/manifest.json',import.meta.url),'utf8'));
const profile=JSON.parse(readFileSync(new URL('../requirements/assets/geometry.json',import.meta.url),'utf8')).landscape;
export const requirement=id=>JSON.parse(readFileSync(new URL('../tools/cv-test-tool/generated/requirements/'+id+'.json',import.meta.url),'utf8'));
export function observation(overrides={}) {return {story:'space-balls',stage:'S-PLAY',width:960,height:540,selectedPlanet:'Earth',drive:false,winner:null,rects:{},occlusions:[],...overrides};}
export function assets(){
  const templates=new Map(),owned=[];
  manifest.templates.forEach((config,index)=>{
    const gray=new cv.Mat(config.height,config.width,cv.CV_8UC1),mask=cv.Mat.zeros(config.height,config.width,cv.CV_8UC1);
    for(let y=0;y<gray.rows;y++)for(let x=0;x<gray.cols;x++){
      const cellX=Math.floor(x/65),cellY=Math.floor(y/85);
      gray.data[y*gray.cols+x]=30+(cellX*73+cellY*47+index*137+cellX*cellY*19)%210;
      if(Math.hypot(x+.5-config.bodyCenter[0],y+.5-config.bodyCenter[1])<config.bodyRadius*.7)mask.data[y*gray.cols+x]=255;
    }
    owned.push(gray,mask);templates.set(config.id,{config,gray,mask});
  });
  const background=cv.Mat.zeros(540,960,cv.CV_8UC1);owned.push(background);
  return {templates,background,dispose(){owned.reverse().forEach(m=>m.delete());}};
}
function data(gray){const rgba=new cv.Mat();try{cv.cvtColor(gray,rgba,cv.COLOR_GRAY2RGBA);return {width:rgba.cols,height:rgba.rows,data:new Uint8ClampedArray(rgba.data)};}finally{rgba.delete();}}
export function planetSample(art,{missing='',wrong='',flipRight=true,occlusions=[]}={}){
  const scene=new cv.Mat(540,960,cv.CV_8UC1,new cv.Scalar(31));
  try{
    for(const p of profile.planets){
      if(p.id===missing)continue;
      const expected='planet-'+p.name.toLowerCase(),t=art.templates.get(p.id===wrong?'planet-lava':expected);
      const width=Math.round(p.diameter),height=Math.round(p.diameter*724/543),gray=new cv.Mat(),mask=new cv.Mat();
      cv.resize(t.gray,gray,new cv.Size(width,height),0,0,cv.INTER_AREA);
      cv.resize(t.mask,mask,new cv.Size(width,height),0,0,cv.INTER_NEAREST);
      if(p.side&&flipRight){cv.flip(gray,gray,1);cv.flip(mask,mask,1);}
      const roi=scene.roi(new cv.Rect(Math.round(p.x-width/2),Math.round(p.y-height/2),width,height));
      try{gray.copyTo(roi,mask);}finally{roi.delete();gray.delete();mask.delete();}
    }
    return {screenshot:{imageData:data(scene),offsetMs:0,timestampMs:1000,mediaTime:0},observation:observation({occlusions})};
  }finally{scene.delete();}
}
export function fixtureSamples({moving=true,swatches=true}={}){
  return [0,200,400,600,800].map((offset,index)=>{
    const image=new cv.Mat(540,960,cv.CV_8UC4,new cv.Scalar(16,27,54,255));
    try{
      if(swatches){cv.rectangle(image,new cv.Point(765,466),new cv.Point(824,505),new cv.Scalar(66,101,234,255),cv.FILLED);
        cv.rectangle(image,new cv.Point(840,466),new cv.Point(899,505),new cv.Scalar(138,255,207,255),cv.FILLED);}
      const t=moving?offset/1000:0,x=Math.round(480+300*Math.sin(2*t)),y=Math.round(300+50*Math.cos(2*t));
      cv.circle(image,new cv.Point(x,y),36,new cv.Scalar(113,156,255,255),cv.FILLED);
      return {screenshot:{imageData:{width:960,height:540,data:new Uint8ClampedArray(image.data)},offsetMs:offset,timestampMs:1000+offset,mediaTime:index/5},observation:observation({story:'motion',stage:'FIXTURE'})};
    }finally{image.delete();}
  });
}
