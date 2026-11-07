import {test,expect} from './fixtures';
import {mystery,cascade,floors,bonus,allScatters} from './scenarios';

test('landed Mystery results, picker midpoint and shared reveal',async({game})=>{
 await game.open(mystery('mid'));await game.clickCanvas();await game.advance(240);await game.shot('symbols-growing.png');
 await game.until('mystery-waiting');await game.advance(300);await game.shot('mystery-results.png');
 await game.until('mystery-picking');await game.advance(800);await game.shot('mystery-picker.png');
 await game.until('mystery-reveal');await game.advance(160);await game.shot('mystery-reveal.png');
});

test('winning highlight, shrinking removal and empty apertures',async({game})=>{
 await game.open(cascade());await game.clickCanvas();await game.until('winning');await game.advance(160);await game.shot('winning.png');
 await game.until('removing');await game.advance(96);await game.shot('removing.png');await game.until('cleared');await game.shot('empty-winner-cells.png');
});

test('room multiplier, collected panel and next-floor popup',async({game})=>{
 await game.open(floors());await game.clickCanvas();await game.until('room-bonus');await game.advance(400);await game.shot('room-multiplier.png');
 await game.until('refilling');await game.advance(240);await game.shot('room-collected.png');
 await game.until('switching');await game.advance(400);await game.shot('next-floor.png');
 await game.until('drawing');await game.advance(240);await game.shot('next-floor-scatter-retention.png');
});

test('bonus intro, corridor midpoint, neutral doors and opening',async({game})=>{
 await game.open(bonus());await game.clickCanvas();await game.until('bonus-trigger');await game.shot('bonus-intro.png');
 await game.enterBonus();await game.advance(1500);await game.shot('corridor-midpoint.png');
 await game.bonusReady();await game.shot('neutral-doors.png');await game.choose();await game.advance(350);await game.shot('door-opening.png');
});

test('multiplier, coin, stairs, ghost, reset doors and completion',async({game})=>{
 test.setTimeout(90_000);
 await game.open(bonus());await game.clickCanvas();await game.enterBonus();
 for(const[i,name]of ['multiplier','coin','stairs','floor-two-coin','ghost','final-multiplier'].entries()){
  await game.choose();await game.advance(1050);await game.shot(`prize-${name}.png`);await game.finishDoor();
  if(i===0){expect((await game.read()).corridor?.data?.selected).toBe(null);await game.shot('reset-after-previous-choice.png');}
 }
 await game.shot('bonus-complete.png');
});

test('maximum move intro fits the popup',async({game})=>{
 await game.open(allScatters());await game.clickCanvas();await game.until('bonus-trigger');await game.shot('bonus-25-moves.png');
});
