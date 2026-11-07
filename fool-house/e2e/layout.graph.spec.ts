import {test,expect,sceneJSON} from './fixtures';
import {preview} from './scenarios';

test('renderer scene has 25 clipped cells, correct layer order, centered reels and device-pixel backing',async({game,page})=>{
 await game.open(preview());const s=await game.read();
 const scene=s.scene!,reels=scene.children!.find(n=>n.id==='reels')!,cells=reels.children!.filter(n=>n.kind==='cell');
 expect(sceneJSON(scene)).toMatchSnapshot('opening-scene.json');
 expect(cells).toHaveLength(25);expect(new Set(cells.map(n=>n.id)).size).toBe(25);
 expect(reels.children!.find(n=>n.id==='reel-frame')!.z).toBeGreaterThan(cells[0].z);
 expect(reels.children!.find(n=>n.id==='mystery-picker')!.visible).toBe(false);
 expect(reels.bounds.x+reels.bounds.width/2).toBeCloseTo(scene.bounds.width/2);
 for(const cell of cells){expect(cell.clip).toEqual(cell.bounds);expect(cell.bounds.x).toBeGreaterThan(reels.bounds.x);expect(cell.bounds.y+cell.bounds.height).toBeLessThan(reels.bounds.y+reels.bounds.height);}
 const collection=scene.children!.find(n=>n.id==='collection')!,hud=scene.children!.find(n=>n.id==='hud')!;
 expect(collection.bounds.y).toBeGreaterThan(reels.bounds.y+reels.bounds.height);
 expect(collection.bounds.y+collection.bounds.height).toBeLessThan(hud.bounds.y);
 const backing=await page.locator('canvas[role="button"]').evaluate((c:HTMLCanvasElement)=>({width:c.width,height:c.height,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height,dpr:devicePixelRatio}));
 expect(backing.width).toBe(Math.round(backing.cssWidth*backing.dpr));expect(backing.height).toBe(Math.round(backing.cssHeight*backing.dpr));
});

test('resizing the live canvas preserves board, theme, collection and all counters',async({game,page})=>{
 await game.open(preview(4));const before=await game.read();await page.setViewportSize({width:600,height:900});
 await expect.poll(async()=>(await game.read()).scene?.bounds.width).toBe(600);
 const after=await game.read();expect(after.board).toEqual(before.board);expect(after.session).toEqual(before.session);expect(after.theme).toBe(before.theme);expect(after.collected).toEqual(before.collected);
});

test('test observer is read-only and observations cannot mutate gameplay',async({game,page})=>{
 await game.open(preview());const before=await game.read();
 await page.evaluate(()=>{const copy=window.__foolHouseTest!.read();copy.board[0][0]=null;copy.session.wager='999999';copy.collected.push('high');});
 const after=await game.read();expect(after.board).toEqual(before.board);expect(after.session).toEqual(before.session);expect(after.collected).toEqual(before.collected);
 expect(await page.evaluate(()=>Object.isFrozen(window.__foolHouseTest))).toBe(true);
});
