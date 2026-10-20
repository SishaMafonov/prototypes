import type { Assets,Cv,TemplateConfig,Mat } from './types.ts';
import backgroundUrl from '../../../src/assets/background.png';
const urls=import.meta.glob('../../../requirements/assets/templates/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
async function readPixels(url:string):Promise<ImageData> {
  const image=new Image();image.src=url;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas unavailable');
  try {context.drawImage(image,0,0);return context.getImageData(0,0,canvas.width,canvas.height);}
  finally {canvas.width=canvas.height=0;}
}
export async function loadAssets(cv:Cv,configs:TemplateConfig[]):Promise<Assets> {
  const owned:Mat[]=[],templates=new Map();
  const gray=(data:ImageData)=>{const raw=cv.matFromImageData(data),out=new cv.Mat();
    try{cv.cvtColor(raw,out,cv.COLOR_RGBA2GRAY);owned.push(out);return out;}catch(e){out.delete();throw e;}finally{raw.delete();}};
  try {
    for(const config of configs) {
      const url=(path:string)=>{const result=urls['../../../requirements/assets/'+path];if(!result)throw new Error('Missing bundled template '+path);return result;};
      const template=gray(await readPixels(url(config.template))),mask=gray(await readPixels(url(config.mask)));
      if(template.cols!==config.width||template.rows!==config.height||mask.cols!==template.cols||mask.rows!==template.rows)throw new Error('Template/mask dimensions changed: '+config.id);
      cv.threshold(mask,mask,127,255,cv.THRESH_BINARY);
      if(!cv.countNonZero(mask))throw new Error('Empty mask: '+config.id);
      templates.set(config.id,{config,gray:template,mask});
    }
    const background=gray(await readPixels(backgroundUrl));
    return {templates,background,dispose(){owned.splice(0).reverse().forEach(mat=>mat.delete());}};
  }catch(error){owned.reverse().forEach(mat=>mat.delete());throw error;}
}
