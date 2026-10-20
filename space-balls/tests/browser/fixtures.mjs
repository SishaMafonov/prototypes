import { test as base, expect } from '@playwright/test';
export { contract } from '../struct/graph.mjs';
export { expect };

export const test = base.extend({
  pageHealth: [async ({ page }, use) => {
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await use();
    expect(errors,'No uncaught browser exceptions').toEqual([]);
  },{auto:true}],
});

export async function installClock(page) {
  const epoch=new Date('2026-10-20T12:00:00Z');
  await page.clock.install({time:epoch});
  await page.clock.pauseAt(new Date(epoch.getTime()+1000));
  await page.addInitScript(()=>{
    let seed=42;
    Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  });
}

export async function openGame(page) {
  await installClock(page);
  await page.goto('/');
  await expect(page.locator('.selection .confirm')).toBeEnabled();
  await page.evaluate(()=>document.fonts.ready);
}

export async function startGame(page,planet='Earth') {
  const order=['Earth','Jupiter','Lava','Ice'];
  for(let i=0;i<order.indexOf(planet);i++)await page.getByRole('button',{name:'Next planet'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.getByRole('button',{name:/Tap or click to start/}).click();
  await page.clock.runFor(32);
  await expect(page.locator('.round-word')).toHaveText('Ready?');
}

export async function playGame(page,planet='Earth') {
  await startGame(page,planet);
  await page.clock.runFor(3040);
  await expect(page.locator('.round-message')).toBeHidden();
}

export const snapshot=page=>page.evaluate(()=>window.__spaceBallsTest.snapshot());
export const arrange=(page,fixture)=>page.evaluate(value=>window.__spaceBallsTest.arrange(value),fixture);

// The ball is outside every field so waiting feedback cannot become an impulse.
export const waitingBall={x:0.5,y:0.02,vx:0,vy:0};

export async function aimAtNet(page,side,scores=[0,0]) {
  const viewport=page.viewportSize(),left=viewport.width*44/1672,right=viewport.width*1629/1672;
  const goalX=viewport.width*(side===0?40:1633)/1672;
  await arrange(page,{phase:'playing',elapsed:0,scores,winner:null,scorer:null,
    ball:{x:(goalX-left)/(right-left),y:0.5,vx:0,vy:0},
    goals:[{position:0.5,direction:1,speed:0},{position:0.5,direction:1,speed:0}]});
  // Score through real collision detection on an actual animation frame.
  await page.clock.runFor(32);
}

export async function reachable(page,selector) {
  const result=await page.locator(selector).evaluate(element=>{
    const r=element.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const hit=document.elementFromPoint(x,y);
    return {inViewport:r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
      receivesPointer:!!hit&&(hit===element||element.contains(hit))};
  });
  expect(result,`${selector} must be on screen and receive pointer input`).toEqual({inViewport:true,receivesPointer:true});
}
