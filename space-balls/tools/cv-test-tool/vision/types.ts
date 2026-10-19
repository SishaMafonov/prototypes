import type { loadOpenCv } from '../../opencv.mjs';
import type { CapturedScreenshot } from '../capture.ts';
export type Cv = Awaited<ReturnType<typeof loadOpenCv>>;
export type Mat = InstanceType<Cv['Mat']>;
export type Status = 'PASSED' | 'FAILED' | 'NA';
export interface Rect { x:number; y:number; width:number; height:number }
export interface Observation {
  story:string; stage:string; width:number; height:number; selectedPlanet:string;
  drive:boolean; winner:0|1|null; rects:Record<string,Rect>; occlusions:Rect[];
}
export interface Sample { screenshot:CapturedScreenshot; observation:Observation }
export interface Check { op:string; target?:string; side?:number }
export interface Requirement {
  schemaVersion:number; id:string; title:string; story:string; stages:string[]; durationMs:number;
  scope:string; naReason?:string; checks:Check[]; relatedIds?:string[]; source:{path:string;sha256:string};
}
export interface Suite { id:string; title:string; requirementIds:string[] }
export interface Result {
  id:string; status:Status; reason:string; stage:string; at:number; width:number; height:number;
  evidence:Evidence[];
}
export interface Evidence { status:Status; detail:string; values?:Record<string,unknown> }
export interface TemplateConfig {
  id:string; width:number; height:number; bodyCenter:number[]; bodyRadius:number;
  template:string; mask:string; templateHash:string; maskHash:string;
}
export interface Defaults {
  geometry:{court:number[];sizes:{jupiter:number;earth:number;small:number;goal:number;ballRadius:number};
    gap:number;verticalSeparation:number;ringScales:Record<string,number>};
  thresholds:{maxSqdiff:number;scales:number[];minMaskVisibility:number;minTexturePixels:number;
    ringSupport:number;hueTolerance:number;backgroundCorrelation:number;stableMeanDifference:number;minMovementCss:number};
}
export interface PreparedTemplate { config:TemplateConfig; gray:Mat; mask:Mat }
export interface Assets { templates:Map<string,PreparedTemplate>; background:Mat; dispose():void }
export const pass=(detail:string,values?:Record<string,unknown>):Evidence=>({status:'PASSED',detail,values});
export const fail=(detail:string,values?:Record<string,unknown>):Evidence=>({status:'FAILED',detail,values});
export const na=(detail:string,values?:Record<string,unknown>):Evidence=>({status:'NA',detail,values});
export function combine(items:Evidence[],label:string):Evidence {
  const status=items.some(e=>e.status==='FAILED')?'FAILED':items.some(e=>e.status==='NA')?'NA':'PASSED';
  return {status,detail:label+': '+items.map(e=>e.detail).join('; '),values:{checks:items}};
}
