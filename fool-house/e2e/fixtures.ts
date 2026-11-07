import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { GameSnapshot } from '../src/e2e/bridge';
import type { Scenario } from './scenarios';

export function sceneJSON(scene:unknown):string {
  return JSON.stringify(scene,(key,value)=>key==='elapsed'?undefined:typeof value==='number'?Math.round(value*10000)/10000:value,2);
}

export class GameDriver {
  constructor(readonly page:Page){}
  async open(scenario:Scenario){
    await this.page.clock.install({time:new Date('2026-11-07T12:00:00Z')});
    await this.page.addInitScript(({rolls,name})=>{
      let index=0;
      Math.random=()=>{if(index>=rolls.length)throw Error(`Scenario ${name} exhausted RNG at ${index}`);return rolls[index++];};
    },scenario);
    await this.page.goto('/',{waitUntil:'domcontentloaded'});
    await this.page.waitForFunction(()=>window.__foolHouseTest?.read().state==='ready'||window.__foolHouseTest?.read().state==='error');
    await this.page.evaluate(()=>document.fonts.ready);
    // Image decode/rendering must initialize before freezing. Jump to an identical
    // virtual timestamp after the static startup scene, independent of load speed.
    await this.page.clock.pauseAt(new Date('2026-11-07T12:01:00Z'));
  }
  async read():Promise<GameSnapshot>{return this.page.evaluate(()=>window.__foolHouseTest!.read());}
  async advance(ms:number){await this.page.clock.runFor(ms);}
  async clickCanvas(){await this.page.getByRole('button',{name:'Start a Fool House round',exact:true}).click({force:true});}
  async nextPhase(){const s=await this.read();await this.page.clock.fastForward(Math.max(1,Math.ceil(s.phase.duration-(s.phase.now-s.phase.startedAt)))+17);}
  async until(state:string,maxPhases=80){for(let i=0;i<maxPhases;i++){if((await this.read()).state===state)return;await this.nextPhase();}throw Error(`Did not reach ${state}: ${JSON.stringify(await this.read())}`);}
  async bonusReady(){const s=await this.read();if(s.bonus.phase==='choosing')return;await this.page.clock.fastForward(Math.max(1,3000-Number(s.corridor?.data?.elapsed??0))+17);await expect(this.page.getByRole('button',{name:'Choose left door',exact:true})).toBeEnabled();}
  async choose(door:'left'|'middle'|'right'='left'){await this.bonusReady();await this.page.getByRole('button',{name:`Choose ${door} door`,exact:true}).click({force:true});}
  async finishDoor(){const s=await this.read();const elapsed=Number(s.corridor?.data?.elapsed??0);await this.page.clock.fastForward(Math.max(1,2600-elapsed)+17);await this.advance(32);}
  async enterBonus(){await this.until('bonus-trigger');await this.page.getByRole('button',{name:'Continue',exact:true}).click({force:true});}
  async shot(name:string){await expect(this.page).toHaveScreenshot(name);}
}

export const test=base.extend<{game:GameDriver}>({
  game:async({page},use,testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
    if(process.env.E2E_COVERAGE==='1')await page.coverage.startJSCoverage({resetOnNavigation:false});
    await use(new GameDriver(page));
    // Restore native progression before Playwright disposes its tracing/page context.
    // Video encoding is intentionally off for virtual-time runs; trace filmstrips remain.
    if(!page.isClosed())await page.clock.resume();
    if(process.env.E2E_COVERAGE==='1'){
      const entries=await page.coverage.stopJSCoverage();await fs.mkdir('coverage/e2e/raw',{recursive:true});
      const id=createHash('sha256').update(testInfo.testId+'-'+testInfo.retry).digest('hex');
      await fs.writeFile(`coverage/e2e/raw/${id}.json`,JSON.stringify(entries));
    }
    if(errors.length)await testInfo.attach('browser-errors',{body:errors.join('\n'),contentType:'text/plain'});
    expect(errors,'Unhandled browser errors').toEqual([]);
  },
});
export {expect};
