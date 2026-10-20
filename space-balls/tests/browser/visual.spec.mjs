import { existsSync } from 'node:fs';
import { test,expect,contract,openGame,installClock,playGame,arrange,aimAtNet,reachable,waitingBall } from './fixtures.mjs';

async function shot(page,name){
  await page.mouse.move(0,0);
  await page.evaluate(()=>{
    if(!window.__spaceBallsTest?.snapshot().match)return;
    // Navigation can shift the fake performance origin by a fraction of a frame.
    // Pin the decorative arc angle for this redraw, then restore the runner clock.
    const descriptor=Object.getOwnPropertyDescriptor(performance,'now');
    Object.defineProperty(performance,'now',{configurable:true,value:()=>5000});
    try{window.__spaceBallsTest.arrange({});}
    finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;}
  });
  await expect(page).toHaveScreenshot(name+'.png');
}

test(contract(['C-BOOT-02','C-BOOT-03','V-TEXT-01'], 'visual: loading gate and artwork error'),async({page})=>{
  await installClock(page);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/*.png',async route=>{await gate;await route.continue();});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.selection .confirm')).toHaveText('Loading game…');
  await shot(page,'landscape-loading');release();await expect(page.locator('.selection .confirm')).toBeEnabled();
  await page.unroute('**/*.png');await page.route(/\/assets\/ball-[^/]+\.png$/,route=>route.abort('failed'));
  await page.reload();await expect(page.locator('.selection .confirm')).toHaveText('Game assets unavailable');
  await shot(page,'landscape-asset-error');
});

test(contract(['V-MENU-01','C-PICK-01'], 'visual: all four real planet picker sprites'),async({page})=>{
  await openGame(page);
  for(const planet of ['earth','jupiter','lava','ice']){
    await shot(page,'landscape-picker-'+planet);await page.getByRole('button',{name:'Next planet'}).click();
  }
});

test(contract(['V-MENU-02','V-STAGE-01'], 'visual: ready and all three countdown overlays'),async({page})=>{
  await openGame(page);await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await shot(page,'landscape-ready');await page.locator('.start').click();await page.clock.runFor(32);
  await shot(page,'landscape-count-ready');
  await arrange(page,{phase:'countdown',elapsed:1});await shot(page,'landscape-count-steady');
  await arrange(page,{phase:'countdown',elapsed:2});await shot(page,'landscape-count-go');
});

test(contract(['V-STAGE-02','C-INPUT-05','C-BALL-03'], 'visual: playing field, tail, selected ring and manual drive glow'),async({page})=>{
  await openGame(page);await playGame(page);await arrange(page,{ball:{x:0.5,y:0.5,vx:0.4,vy:0.2}});
  await shot(page,'landscape-playing');await arrange(page,{ball:waitingBall});
  const bounds=await page.getByRole('button',{name:'Boost',exact:true}).boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.clock.runFor(32);
  await expect(page.locator('.voice-controls')).toHaveClass(/voice-detected/);
  await shot(page,'landscape-boost-active');await page.mouse.up();
});

test(contract(['V-STAGE-03','V-UI-03','I-FLOW-08'], 'visual: scoring hold, deuce, and match-point HUD'),async({page})=>{
  await openGame(page);await playGame(page);await aimAtNet(page,1);await shot(page,'landscape-goal');
  await arrange(page,{phase:'playing',elapsed:0,scorer:null,scores:[9,9],ball:waitingBall});await shot(page,'landscape-deuce');
  await arrange(page,{scores:[10,9]});await shot(page,'landscape-match-point');
});

for(const winner of [0,1]){
  test(contract(['V-STAGE-04','C-RESULT-02'], `visual: winner ${winner} final modal and backdrop`),async({page})=>{
    await openGame(page);await playGame(page);await aimAtNet(page,winner===0?1:0,winner===0?[9,7]:[7,9]);
    await shot(page,winner===0?'landscape-result-you':'landscape-result-opponent');
  });
}

for(const [name,width,height]of [['portrait',390,844],['short',844,390]]){
  test(contract(['V-RESP-01','V-RESP-05'], `visual: ${name} picker, ready, play, result with reachable controls`),async({page})=>{
    await page.setViewportSize({width,height});await openGame(page);await reachable(page,'.selection .confirm');
    await shot(page,name+'-picker');await page.getByRole('button',{name:'Confirm',exact:true}).click();
    await reachable(page,'.boost');await shot(page,name+'-ready');
    await page.locator('.start').click();await page.clock.runFor(3072);await arrange(page,{ball:waitingBall});
    await reachable(page,'.boost');await shot(page,name+'-playing');
    await aimAtNet(page,1,[9,7]);await reachable(page,'.new-game');await shot(page,name+'-result');
  });
}

test.describe('DPR 2',()=>{
  test.use({deviceScaleFactor:2});
  test(contract(['V-RESP-02','I-PHYSICS-08'], 'visual: dense backing store preserves logical field geometry'),async({page})=>{
    await openGame(page);await playGame(page);await arrange(page,{ball:waitingBall});
    expect(await page.locator('canvas').evaluate(c=>[c.width,c.height])).toEqual([1920,1080]);
    await shot(page,'landscape-playing-dpr2');
  });
});

test('visual negative control: hiding the rendered canvas is rejected by the actual snapshot matcher',async({page},testInfo)=>{
  test.skip(testInfo.config.updateSnapshots!=='none','Run negative control after baseline generation');
  expect(existsSync(testInfo.snapshotPath('landscape-picker-earth.png')),'Reviewed baseline must exist').toBe(true);
  await openGame(page);await page.locator('canvas').evaluate(c=>{c.style.visibility='hidden';});
  let rejected;
  try {await expect(page).toHaveScreenshot('landscape-picker-earth.png',{timeout:1000});}
  catch(error){rejected=error;}
  expect(String(rejected)).toMatch(/pixels|Screenshot|screenshot/);
});
