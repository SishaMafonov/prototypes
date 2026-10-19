import { Session } from './session.ts';
import { frameCheck,planets,rings,nets,ball,background } from './shapes.ts';
import { panel,picker,layout } from './panels.ts';
import { motion,tail,stable,glow,countdown,goalReset,fixture } from './temporal.ts';
import { na,type Assets,type Cv,type Defaults,type Requirement,type Result,type Sample,type Evidence } from './types.ts';
export function applicable(requirement:Requirement,story:string,stage:string):string|undefined {
  if(requirement.naReason)return requirement.naReason;
  if(requirement.story!==story)return 'Open '+requirement.story+' manually before running this requirement';
  if(requirement.stages.length&&!requirement.stages.includes(stage))return 'Requires '+requirement.stages.join(', ')+'; observed '+stage;
}
export function evaluate(requirement:Requirement,session:Session):Result {
  const first=session.samples[0],o=first?.observation,base={id:requirement.id,stage:o?.stage??'UNKNOWN',at:Date.now(),width:o?.width??0,height:o?.height??0};
  const unavailable=applicable(requirement,o?.story??'',o?.stage??'UNKNOWN');
  if(unavailable)return {...base,status:'NA',reason:unavailable,evidence:[]};
  const frame=frameCheck(session);if(frame.status!=='PASSED')return {...base,status:'NA',reason:frame.detail,evidence:[frame]};
  const isTransition=requirement.checks.some(c=>['countdown','goalReset'].includes(c.op));
  if(!isTransition&&session.samples.some(f=>f.observation.stage!==o.stage))return {...base,status:'NA',reason:'Stage changed during the captured sequence',evidence:[]};
  if(requirement.durationMs&&session.samples.at(-1)!.screenshot.timestampMs-first.screenshot.timestampMs<requirement.durationMs-40)return {...base,status:'NA',reason:'Captured sequence is shorter than the required window',evidence:[]};
  const evidence:Evidence[]=[];
  try {
    for(const check of requirement.checks){
      switch(check.op){
        case 'frame':evidence.push(frame);break;
        case 'planets':evidence.push(planets(session,check.side));break;
        case 'rings':evidence.push(rings(session));break;
        case 'nets':evidence.push(nets(session));break;
        case 'ball':evidence.push(ball(session));break;
        case 'tail':evidence.push(tail(session));break;
        case 'background':evidence.push(background(session));break;
        case 'picker':evidence.push(picker(session));break;
        case 'panel':evidence.push(panel(session,check.target!));break;
        case 'layout':evidence.push(layout(session));break;
        case 'motion':evidence.push(motion(session,check.target!));break;
        case 'glow':evidence.push(glow(session));break;
        case 'countdown':evidence.push(countdown(session));break;
        case 'goalReset':evidence.push(goalReset(session));break;
        case 'stable':evidence.push(stable(session,check.target!));break;
        case 'fixture':evidence.push(fixture(session));break;
        default:evidence.push(na('Unsupported operator '+check.op));
      }
    }
  }catch(error){evidence.push(na('Analysis unavailable: '+(error instanceof Error?error.message:String(error))));}
  const status=evidence.some(e=>e.status==='FAILED')?'FAILED':evidence.some(e=>e.status==='NA')||!evidence.length?'NA':'PASSED';
  const summary=evidence.filter(e=>e.status===status).map(e=>e.detail).join('; ');
  return {...base,status,reason:summary,evidence};
}
export function analyze(cv:Cv,assets:Assets,defaults:Defaults,requirement:Requirement,samples:Sample[]):Result {
  const session=new Session(cv,assets,defaults,samples);try{return evaluate(requirement,session);}finally{session.dispose();}
}
