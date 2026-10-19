import type { Observation,Rect } from './types.ts';
const selectors:Record<string,string>={preview:'.planet-preview',previous:'.arrow',next:'.arrow-next',confirm:'.selection .confirm',
  hud:'.scoreboard',rule:'.match-rule',voice:'.voice-controls',start:'.start-title',round:'.round-word',
  hint:'.round-hint',result:'.result-dialog',winner:'#result-title',trophy:'.winner-trophy',
  mic:'.microphone-toggle',boost:'.boost',meter:'.voice-meter',you:'.score-you',opponent:'.score-opponent'};
export function observe(frame:HTMLIFrameElement,story:string):Observation {
  const empty:Observation={story,stage:'UNKNOWN',width:frame.clientWidth,height:frame.clientHeight,
    selectedPlanet:'Earth',drive:false,winner:null,rects:{},occlusions:[]};
  try {
    const doc=frame.contentDocument;
    if(!doc?.defaultView) return empty;
    const visible=(e:Element|null):e is HTMLElement=>!!e&&e.getClientRects().length>0&&doc.defaultView!.getComputedStyle(e).visibility!=='hidden';
    const bounds=(e:Element):Rect=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const canvas=doc.querySelector('canvas'),view=canvas?bounds(canvas):{width:frame.clientWidth,height:frame.clientHeight};
    const rects:Record<string,Rect>={};
    for(const [name,selector]of Object.entries(selectors)) {const e=doc.querySelector(selector);if(visible(e))rects[name]=bounds(e);}
    let stage='UNKNOWN';
    if(story==='motion') stage='FIXTURE';
    else if(rects.result) stage=doc.querySelector('.result-dialog')?.getAttribute('data-winner')==='0'?'S-FINISH-YOU':'S-FINISH-OPP';
    else if(visible(doc.querySelector('.selection'))) stage=doc.querySelector('.selection .confirm')?.textContent==='Confirm'?'S-PICK':
      doc.querySelector('.load-status')?.textContent?'S-ASSET-ERROR':'S-LOAD';
    else if(rects.start) stage='S-READY';
    else if(rects.round) stage=({'Ready?':'S-COUNT-READY','Steady!':'S-COUNT-STEADY','GO!':'S-COUNT-GO'}as Record<string,string>)[doc.querySelector('.round-word')?.textContent??'']??'S-GOAL';
    else if(rects.hud) stage='S-PLAY';
    const occlusions=['hud','rule','voice','result'].flatMap(key=>rects[key]?[rects[key]]:[]);
    const round=doc.querySelector('.round-message');if(visible(round))occlusions.push(bounds(round));
    const selectedPlanet=doc.querySelector('.planet-name')?.textContent??'Earth';
    return {...empty,stage,width:view.width,height:view.height,selectedPlanet,rects,occlusions,
      drive:doc.querySelector('.voice-controls')?.classList.contains('voice-detected')??false,
      winner:stage==='S-FINISH-YOU'?0:stage==='S-FINISH-OPP'?1:null};
  } catch {return empty;}
}
