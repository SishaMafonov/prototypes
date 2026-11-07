import {test,expect,sceneJSON} from './fixtures';
import {preview,quiet,mystery,cascade,floors,bonus,allScatters} from './scenarios';

test('startup stays nonwinning and idle; mouse/touch starts exactly one paid round',async({game,page},info)=>{
 await game.open(quiet());const before=await game.read();await game.advance(10_000);
 expect((await game.read()).session).toEqual({spins:0,wager:'0',win:'0',roundWin:'0'});
 expect((await game.read()).board).toEqual(before.board);
 const box=(await page.locator('canvas[role="button"]').boundingBox())!;
 if(info.project.use.hasTouch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 expect((await game.read()).state).toBe('drawing');
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await game.until('ready');
 expect((await game.read()).session).toEqual({spins:1,wager:'100',win:'0',roundWin:'0'});
});

test('keyboard activation works, held repeats are ignored and the next paid round resets',async({game,page})=>{
 await game.open(quiet());await page.locator('canvas[role="button"]').focus();await page.keyboard.down('Enter');await game.until('ready');
 await page.keyboard.down('Enter');expect((await game.read()).session.spins).toBe(1);await page.keyboard.up('Enter');
 await page.keyboard.press('Space');await game.until('ready');expect((await game.read()).session).toEqual({spins:2,wager:'200',win:'0',roundWin:'0'});
});

test('Mystery waits the committed 500ms after landing, locks input, then reveals one shared floor symbol',async({game,page})=>{
 await game.open(mystery('mid'));await game.clickCanvas();await game.advance(739);expect((await game.read()).state).toBe('drawing');
 await game.until('mystery-waiting');let s=await game.read();expect(s.board.flat().filter(c=>c?.tier==='mystery')).toHaveLength(3);
 expect(s.phase.duration).toBe(500);await game.advance(Math.max(0,499-(s.phase.now-s.phase.startedAt)));expect((await game.read()).state).toBe('mystery-waiting');
 const box=(await page.locator('canvas[role="button"]').boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await game.until('mystery-picking');expect((await game.read()).session.wager).toBe('100');
 await game.until('ready');s=await game.read();for(const[r,c]of [[0,0],[1,3],[3,1]])expect(s.board[r][c]).toEqual({tier:'mid',index:1});
 expect(s.session.roundWin).toBe('0');expect(s.board.flat().some(c=>c?.tier==='mystery')).toBe(false);
});

test('ordinary cascade clears winners only, preserves survivors and pauses a refill Mystery wave',async({game})=>{
 await game.open(cascade());await game.clickCanvas();await game.until('winning');const before=await game.read();
 await game.until('cleared');let s=await game.read();expect(s.board[0].every(c=>c===null)).toBe(true);expect(s.board.slice(1)).toEqual(before.board.slice(1));
 expect(s.session.roundWin).toBe('1');await game.until('mystery-waiting');expect((await game.read()).session.spins).toBe(1);
 await game.until('ready');s=await game.read();expect(s.session).toEqual({spins:1,wager:'100',win:'1',roundWin:'1'});
});

test('room extra clears retain Scatters; all free floors and wins finish before final-count bonus entry',async({game,page})=>{
 await game.open(floors());await game.clickCanvas();await game.until('refilling');let s=await game.read();expect(s.collected).toEqual(['low']);
 await game.nextPhase();s=await game.read();expect(s.state).toBe('cleared');expect(s.board.flat().filter(c=>c?.tier==='scatter')).toHaveLength(5);expect(s.board.flat().filter(c=>c&&c.tier!=='scatter')).toHaveLength(0);
 await game.until('switching');expect((await game.read()).session.roundWin).toBe('18');
 await game.until('drawing');s=await game.read();expect(s.multiplier).toBe(2);expect(s.board.flat().filter(c=>c?.tier==='scatter')).toHaveLength(6);await expect(page.locator('dialog')).not.toBeVisible();
 await game.until('switching');expect((await game.read()).session.roundWin).toBe('42');
 await game.until('bonus-trigger');s=await game.read();expect(s.multiplier).toBe(3);expect(s.session.spins).toBe(3);expect(s.session.wager).toBe('100');expect(s.board.flat().filter(c=>c?.tier==='scatter')).toHaveLength(7);
 await expect(page.locator('[data-bonus-award]')).toHaveText('7');
});

test('modal requires Continue, blocks base actions and keeps focus contained',async({game,page})=>{
 await game.open(bonus());await game.clickCanvas();await game.until('bonus-trigger');
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeFocused();await page.keyboard.press('Escape');await page.mouse.click(1,1);
 expect((await game.read()).ui.find(n=>n.id==='scatter-intro')?.data?.topLayer).toBe(true);
 expect((await game.read()).state).toBe('bonus-trigger');expect((await game.read()).session.wager).toBe('100');
 expect(await page.locator('dialog').evaluate(d=>d.contains(document.activeElement))).toBe(true);
 await page.getByRole('button',{name:'Continue',exact:true}).focus();await page.keyboard.press('Enter');expect((await game.read()).state).toBe('bonus');
 expect((await game.read()).ui.find(n=>n.id==='bonus-layer')?.visible).toBe(true);
 expect((await game.read()).ui.find(n=>n.id==='base-layer')?.data?.inert).toBe(true);
 await expect(page.locator('.base-scene')).toHaveAttribute('aria-hidden','true');await expect(page.locator('.bonus-scene')).toBeFocused();
});

test('bonus credits only at door reveal, compounds the base pot, resets doors and returns without duplicate credit',async({game,page})=>{
 await game.open(bonus());await game.clickCanvas();await game.enterBonus();expect((await game.read()).bonus.totalWinCents).toBe('1');
 await game.bonusReady();expect(sceneJSON((await game.read()).corridor)).toMatchSnapshot('neutral-door-scene.json');
 await game.choose();await game.advance(699);expect((await game.read()).bonus.completedSteps).toBe(0);await game.advance(32);
 expect((await game.read()).bonus.totalWinCents).toBe('3');expect((await game.read()).session.roundWin).toBe('3');
 await game.finishDoor();let s=await game.read();expect(s.corridor?.data?.selected).toBe(null);expect(s.corridor?.children?.every(n=>n.data?.selected===false)).toBe(true);
 const totals=['103','103','303','303','606'];for(const total of totals){await game.choose();await game.advance(720);expect((await game.read()).session.roundWin).toBe(total);await game.finishDoor();}
 s=await game.read();expect(s.bonus.phase).toBe('complete');expect(s.bonus.floor).toBe(2);expect(s.session.win).toBe('606');
 await page.getByRole('button',{name:'Return to mansion'}).click({force:true});expect((await game.read()).state).toBe('ready');expect((await game.read()).session.win).toBe('606');
 await game.clickCanvas();await game.until('ready');expect((await game.read()).session).toEqual({spins:2,wager:'200',roundWin:'0',win:'606'});
});

test('stairs cap at floor six, consume a move at the cap and preserve the starting pot',async({game})=>{
 await game.open(bonus(['stairs','stairs','stairs','stairs','stairs','stairs']));await game.clickCanvas();await game.enterBonus();
 for(let i=0;i<6;i++){await game.choose('right');await game.finishDoor();expect((await game.read()).bonus.floor).toBe(Math.min(6,i+2));expect((await game.read()).session.roundWin).toBe('1');}
 expect((await game.read()).bonus.completedSteps).toBe(6);expect((await game.read()).bonus.phase).toBe('complete');
});

test('zero-win bonus entry still multiplies zero and later coins grow the pot',async({game})=>{
 await game.open(bonus([8,'coin','ghost','ghost','ghost','ghost'],false));await game.clickCanvas();await game.enterBonus();expect((await game.read()).bonus.totalWinCents).toBe('0');
 await game.choose();await game.advance(720);expect((await game.read()).session.roundWin).toBe('0');await game.finishDoor();await game.choose();await game.advance(720);expect((await game.read()).session.roundWin).toBe('100');
});

test('all 25 Scatters award exactly 25 moves at settlement',async({game,page})=>{
 await game.open(allScatters());await game.clickCanvas();await game.until('bonus-trigger');await expect(page.locator('[data-bonus-award]')).toHaveText('25');expect((await game.read()).session.roundWin).toBe('0');
});

test('reduced motion preserves the full Mystery hold while shortening only animated phases',async({game,page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await game.open(mystery('high'));await game.clickCanvas();await game.until('mystery-waiting');expect((await game.read()).phase.duration).toBe(500);
 await game.until('mystery-picking');expect((await game.read()).phase.duration).toBe(180);await game.until('ready');expect((await game.read()).board[0][0]).toEqual({tier:'high',index:1});
});

test('missing art enters an accessible locked error state; reload restores a fresh idle preview',async({game,page})=>{
 const fail=async(route:import('@playwright/test').Route)=>route.request().resourceType()==='image'?route.abort():route.continue();
 const hall=/\/hall(?:-[\w-]+)?\.png(?:\?|$)/;
 await page.route(hall,fail);await game.open(quiet());expect((await game.read()).state).toBe('error');
 await expect(page.locator('#game-message')).toContainText('Unable to load');await game.clickCanvas();expect((await game.read()).session.wager).toBe('0');
 await page.unroute(hall,fail);await page.clock.resume();await page.reload();await page.waitForFunction(()=>window.__foolHouseTest?.read().state==='ready');expect((await game.read()).session.spins).toBe(0);
});
