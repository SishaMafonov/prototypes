import { Session } from './session.ts';
import { evaluate,applicable } from './evaluate.ts';
import type { Assets,Cv,Defaults,Observation,Requirement,Result,Sample } from './types.ts';
export interface RunnerOptions {
  requirements:Requirement[]; defaults:Defaults; prepare:Promise<{cv:Cv;assets:Assets}>;
  capture():Promise<Sample[]>; context():Observation; changed():void;
}
export class ManualRunner {
  readonly results=new Map<string,Result>();
  readonly ready:Promise<void>;
  busy=false; progress=0; error=''; private prepared?:{cv:Cv;assets:Assets};
  private canceled=false; private disposed=false;
  readonly options:RunnerOptions;
  constructor(options:RunnerOptions) {
    this.options=options;
    this.reset();
    this.ready=options.prepare.then(value=>{if(this.disposed)value.assets.dispose();else this.prepared=value;options.changed();})
      .catch(error=>{this.error='OpenCV/templates unavailable: '+String(error);options.changed();});
  }
  get available(){return !!this.prepared&&!this.disposed;}
  private unavailable(r:Requirement,reason:string,at=Date.now()):Result {
    const o=this.options.context();return {id:r.id,status:'NA',reason,at,stage:o.stage,width:o.width,height:o.height,evidence:[]};
  }
  reset(ids=this.options.requirements.map(r=>r.id)) {
    for(const r of this.options.requirements.filter(r=>ids.includes(r.id)))this.results.set(r.id,this.unavailable(r,'Not run',0));
  }
  cancel(){this.canceled=true;}
  async run(ids:string[]):Promise<Result[]> {
    if(this.busy)throw new Error('A visual run is already in progress');
    const requested=ids.map(id=>{const r=this.options.requirements.find(r=>r.id===id);if(!r)throw new Error('Unknown requirement '+id);return r;});
    const initial=this.options.context();
    const eligible=requested.filter(r=>!applicable(r,initial.story,initial.stage));
    for(const r of requested)if(!eligible.includes(r)&&this.results.get(r.id)?.at===0)this.results.set(r.id,this.unavailable(r,applicable(r,initial.story,initial.stage)!,0));
    if(!eligible.length){for(const r of requested)this.results.set(r.id,this.unavailable(r,applicable(r,initial.story,initial.stage)??'No applicable evidence'));this.options.changed();return requested.map(r=>this.results.get(r.id)!);}
    if(!this.available){for(const r of eligible)this.results.set(r.id,this.unavailable(r,this.error||'OpenCV/templates are still loading'));this.options.changed();return requested.map(r=>this.results.get(r.id)!);}
    this.busy=true;this.canceled=false;this.progress=0;this.options.changed();
    const sessions=new Map<number,Session>();let samples:Sample[]=[];
    try {
      // No await before capture: preserve activation for the first native picker.
      const firstCapture=this.options.capture();
      samples=await firstCapture;
      if(this.canceled)throw new Error('Run canceled');
      const first=samples[0]?.observation;
      if(!first)throw new Error('No observed screenshot context');
      const active=requested.filter(r=>!applicable(r,first.story,first.stage));
      const duration=Math.max(0,...active.map(r=>r.durationMs));
      let bursts=1;
      while(samples.at(-1)!.screenshot.timestampMs-samples[0].screenshot.timestampMs<duration-40&&bursts<8) {
        if(this.canceled)throw new Error('Run canceled');
        samples.push(...await this.options.capture());bursts++;
      }
      for(const r of requested) {
        if(this.canceled)throw new Error('Run canceled');
        const why=applicable(r,first.story,first.stage);
        if(why){if(this.results.get(r.id)?.at===0)this.results.set(r.id,this.unavailable(r,why,0));continue;}
        let window=samples.slice(0,5);
        if(r.durationMs>800){const end=samples.findIndex(f=>f.screenshot.timestampMs-samples[0].screenshot.timestampMs>=r.durationMs-40);window=end<0?samples:samples.slice(0,end+1);}
        let session=sessions.get(window.length);
        if(!session){session=new Session(this.prepared!.cv,this.prepared!.assets,this.options.defaults,window);sessions.set(window.length,session);}
        this.results.set(r.id,evaluate(r,session));this.progress++;this.options.changed();
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }catch(error) {
      const reason='Capture/run unavailable: '+(error instanceof Error?error.message:String(error));
      for(const r of eligible)this.results.set(r.id,this.unavailable(r,reason));
    }finally{
      sessions.forEach(s=>s.dispose());samples=[];this.busy=false;
      if(this.disposed)this.prepared?.assets.dispose();
      this.options.changed();
    }
    return requested.map(r=>this.results.get(r.id)!);
  }
  dispose(){this.disposed=true;this.cancel();if(!this.busy)this.prepared?.assets.dispose();}
}
