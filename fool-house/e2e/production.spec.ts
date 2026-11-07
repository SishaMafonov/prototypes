import {test,expect} from '@playwright/test';

test('production build boots without a test observer and accepts the first keyboard round',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.clock.install({time:new Date('2026-11-07T12:00:00Z')});
 await page.goto('/');const canvas=page.getByRole('button',{name:'Start a Fool House round',exact:true});
 await expect(canvas).toHaveAttribute('aria-disabled','false');await page.clock.pauseAt(new Date('2026-11-07T12:01:00Z'));
 expect(await page.evaluate(()=>Object.hasOwn(window,'__foolHouseTest'))).toBe(false);
 await expect(page.locator('[data-stat="spins"]')).toHaveText('0');await canvas.focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-stat="spins"]')).toHaveText('1');await expect(canvas).toHaveAttribute('aria-disabled','true');expect(errors).toEqual([]);await page.clock.resume();
});
