import {test,expect} from './fixtures';
import {preview} from './scenarios';
for(const[room,name]of ['basement','hall','museum','guests','attic'].entries()){
 test(`opening layout: ${name}`,async({game})=>{
  await game.open(preview(room));expect((await game.read()).theme).toBe(name);
  await game.shot(`${name}.png`);
 });
}
