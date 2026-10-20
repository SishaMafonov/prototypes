import manifestData from './generated/manifest.json';
import { ManualRunner } from './vision/manual-runner';
import { observe } from './vision/observe';
import { loadAssets } from './vision/assets';
import { loadOpenCv } from '../opencv.mjs';
import { applicable } from './vision/evaluate';
import type { CapturedScreenshot,CaptureOptions,CvTestTool } from './capture';
import type { Defaults,Requirement,Suite,TemplateConfig,Observation,Result } from './vision/types';
const manifest=manifestData as unknown as {defaults:Defaults;templates:TemplateConfig[];represented:{id:string;by:string[]}[];skipped:{id:string;reason:string}[]};
const requirements=Object.values(import.meta.glob('./generated/requirements/*.json',{eager:true,import:'default'})) as Requirement[];
const suites=Object.values(import.meta.glob('./generated/suites/*.json',{eager:true,import:'default'})) as Suite[];
function get<T extends HTMLElement>(id:string):T {const e=document.getElementById(id);if(!e)throw new Error('Missing suite element '+id);return e as T;}
export class SuiteControls {
  readonly runner:ManualRunner;
  private readonly sampleContexts=new WeakMap<CapturedScreenshot,Observation>();
  private selected='space-balls';private observed='';private timer:number;
  constructor(readonly frame:HTMLIFrameElement,tool:CvTestTool,readonly story:()=>string,
    capture:(options:CaptureOptions)=>Promise<readonly CapturedScreenshot[]>,readonly frameReady:()=>boolean,changed:()=>void) {
    const prepare=loadOpenCv().then(async cv=>({cv,assets:await loadAssets(cv,manifest.templates)}));
    this.runner=new ManualRunner({requirements,defaults:manifest.defaults,prepare,
      capture:()=>capture({count:5}).then(frames=>frames.map(screenshot=>({screenshot,observation:this.sampleContexts.get(screenshot)??observe(frame,story())}))),
      context:()=>observe(frame,story()),changed:()=>{this.render();changed();}});
    tool.addEventListener('sample',event=>{const screenshot=(event as CustomEvent<CapturedScreenshot>).detail;this.sampleContexts.set(screenshot,observe(frame,story()));});
    const select=get<HTMLSelectElement>('suite-select');
    for(const suite of suites){const option=document.createElement('option');option.value=suite.id;option.textContent=suite.title;select.append(option);}
    select.value=this.selected;select.addEventListener('change',()=>{this.selected=select.value;get<HTMLInputElement>('requirement-filter').value='';this.render();});
    get('run-suite').addEventListener('click',()=>{void this.runSuite().catch(error=>this.showError(error));});
    get('reset-results').addEventListener('click',()=>{this.runner.reset(this.current().requirementIds);this.render();});
    get('requirement-filter').addEventListener('input',()=>this.render());
    this.timer=window.setInterval(()=>{const o=observe(frame,story()),key=o.story+o.stage+o.width+o.height;
      if(key!==this.observed){this.observed=key;this.render();}},400);
    window.addEventListener('pagehide',()=>{window.clearInterval(this.timer);this.runner.dispose();},{once:true});
    this.render();
  }
  get busy(){return this.runner.busy;}
  cancel(){this.runner.cancel();}
  private current(){return suites.find(s=>s.id===this.selected)!;}
  onStoryChanged(){this.selected=this.story()==='motion'?'motion':'space-balls';get<HTMLSelectElement>('suite-select').value=this.selected;get<HTMLInputElement>('requirement-filter').value='';this.render();}
  async runRequirement(id:string):Promise<Result>{const result=(await this.runner.run([id]))[0];this.render();return result;}
  async runSuite(id=this.selected):Promise<Result[]> {
    const suite=suites.find(s=>s.id===id);if(!suite)throw new Error('Unknown suite '+id);
    const results=await this.runner.run(suite.requirementIds);this.render();return results;
  }
  private showError(error:unknown){get('suite-status').textContent=error instanceof Error?error.message:String(error);}
  refresh(){this.render();}
  private render() {
    if(!this.runner)return;
    const suite=this.current(),o=observe(this.frame,this.story()),busy=this.runner.busy;
    const records=suite.requirementIds.map(id=>requirements.find(r=>r.id===id)!);
    const results=records.map(r=>this.runner.results.get(r.id)!);
    const passed=results.filter(r=>r.status==='PASSED').length,failed=results.filter(r=>r.status==='FAILED').length,na=results.length-passed-failed;
    get('coverage-summary').textContent='Coverage '+(passed+failed)+'/'+results.length+' · PASSED '+passed+' · FAILED '+failed+' · NA '+na;
    const progress=get<HTMLProgressElement>('suite-coverage');progress.max=results.length||1;progress.value=passed+failed;
    get('observed-stage').textContent=o.stage+' · '+Math.round(o.width)+' × '+Math.round(o.height);
    get('suite-status').textContent=busy?'Running visual checks… '+this.runner.progress+' evaluated':this.runner.error||(
      this.runner.available?'Click a requirement or Run suite. Change game state manually; results stay until reset.':'Loading OpenCV and template masks…');
    get<HTMLButtonElement>('run-suite').disabled=busy||!this.frameReady()||!this.runner.available;
    get<HTMLButtonElement>('reset-results').disabled=busy;
    get<HTMLSelectElement>('suite-select').disabled=busy;
    const filter=get<HTMLInputElement>('requirement-filter').value.toLowerCase();
    const list=get('requirement-list'),fragment=document.createDocumentFragment();
    for(const r of records.filter(r=>(r.id+' '+r.title).toLowerCase().includes(filter))) {
      const result=this.runner.results.get(r.id)!,row=document.createElement('div');row.className='requirement-row';
      row.classList.toggle('applicable',!applicable(r,o.story,o.stage));row.dataset.requirement=r.id;
      const button=document.createElement('button');button.type='button';button.className='requirement-name';
      button.textContent=r.id+' · '+r.title;button.disabled=busy||!this.frameReady()||!this.runner.available;
      button.addEventListener('click',()=>{void this.runRequirement(r.id).catch(error=>this.showError(error));});
      const badge=document.createElement('span');badge.className='requirement-status';badge.dataset.status=result.status;badge.textContent=result.status;
      const reason=document.createElement('p');reason.className='requirement-reason';
      reason.textContent=result.at?result.reason+' ('+result.stage+', '+new Date(result.at).toLocaleTimeString()+')':
        applicable(r,o.story,o.stage)??'Not run · applicable to this state';
      const scope=document.createElement('small');scope.className='requirement-scope';scope.textContent=r.scope;
      const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');
      summary.textContent='Evidence and source';pre.textContent=JSON.stringify({source:r.source,relatedIds:r.relatedIds,scope:r.scope,evidence:result.evidence},null,2);
      details.append(summary,pre);row.append(button,badge,reason,scope,details);fragment.append(row);
    }
    list.replaceChildren(fragment);
    get('excluded-summary').textContent=manifest.skipped.length+' DOM/functional requirements excluded; '+(manifest.represented?.length??0)+' component/integration clauses linked to visual projections. Thresholds are experimental.';
  }
}
