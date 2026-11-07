import { SYMBOL_WEIGHTS } from '../src/game';
import { BONUS_WEIGHTS, BONUS_MULTIPLIERS } from '../src/bonus';
type Tier='low'|'mid'|'high';
type Kind=Tier|'mystery'|'scatter';
export type Prize='coin'|'stairs'|'ghost'|2|3|5|8;
export interface Scenario { name:string; rolls:number[] }
const tiers:Tier[]=['low','mid','high'];
class Script {
  rolls:number[]=[];
  room(index:number,previous?:number){const options=[0,1,2,3,4].filter(i=>i!==previous);this.rolls.push((options.indexOf(index)+.5)/options.length);}
  symbol(tier:Kind,index=0,targeted=false){
    const order:Kind[]=['mystery','low','mid','high','scatter'];let start=0;for(const t of order){if(t===tier)break;start+=SYMBOL_WEIGHTS[t];}
    this.rolls.push((start+SYMBOL_WEIGHTS[tier]/2)/100);
    if(tier!=='scatter'&&tier!=='mystery'&&!targeted)this.rolls.push((index+.5)/5);
  }
  quiet(n=25){for(let i=0;i<n;i++)this.symbol(tiers[Math.floor((i%15)/5)],i%5);}
  foreign(n:number,room=1,excludeLowZero=false){const pool=tiers.flatMap(t=>[0,1,2,3,4].filter(i=>i!==room&&!(excludeLowZero&&t==='low'&&i===0)).map(i=>[t,i] as const));for(let i=0;i<n;i++)this.symbol(...pool[i%pool.length]);}
  prize(prize:Prize){
    if(typeof prize==='number'){this.rolls.push((BONUS_WEIGHTS.coin+BONUS_WEIGHTS.multiplier/2)/100,(BONUS_MULTIPLIERS.indexOf(prize)+.5)/10);return;}
    const order=['coin','multiplier','stairs','ghost'] as const;let start=0;for(const k of order){if(k===prize)break;start+=BONUS_WEIGHTS[k];}this.rolls.push((start+BONUS_WEIGHTS[prize]/2)/100);
  }
  done(name:string):Scenario{return{name,rolls:this.rolls};}
}
export function preview(room=0){const s=new Script();s.room(room);return s.done(`preview-${room}`);}
export function quiet(){const s=new Script();s.room(0);s.room(1,0);s.quiet();s.room(0,1);s.quiet();return s.done('quiet-two-rounds');}
export function mystery(tier:Tier='mid'){
 const s=new Script();s.room(0);s.room(1,0);const foreign=tiers.flatMap(t=>[0,2,3,4].map(i=>[t,i] as const));let j=0;
 for(let i=0;i<25;i++)if([0,8,16].includes(i))s.symbol('mystery');else s.symbol(...foreign[j++%foreign.length]);
 s.rolls.push((tiers.indexOf(tier)+.5)/3);return s.done(`mystery-${tier}`);
}
export function cascade(){
 const s=new Script();s.room(0);s.room(1,0);for(let i=0;i<5;i++)s.symbol('low',0);s.foreign(20,1,true);
 for(let i=0;i<3;i++)s.symbol('mystery');s.symbol('high',4);s.symbol('high',4);s.rolls.push(.5);return s.done('cascade-mystery');
}
export function bonus(prizes:Prize[]=[3,'coin','stairs','coin','ghost',2],seedWin=true){
 const s=new Script();s.room(0);s.room(1,0);
 if(seedWin){for(let i=0;i<5;i++)s.symbol('low',0);s.foreign(14,1,true);}else s.foreign(19,1);
 for(let i=0;i<6;i++)s.symbol('scatter');
 if(seedWin)for(const[t,i]of [['low',2],['low',3],['mid',2],['mid',3],['high',3]] as const)s.symbol(t,i);
 prizes.forEach(p=>s.prize(p));s.room(0,1);s.quiet();return s.done(seedWin?'bonus-seeded':'bonus-zero');
}
export function floors(){
 const s=new Script();s.room(0);s.room(1,0);
 for(let i=0;i<5;i++)s.symbol('low',1);s.foreign(15);for(let i=0;i<5;i++)s.symbol('scatter');
 s.rolls.push(0);for(let i=0;i<5;i++)s.symbol(i<4?'low':'mid',1,true);
 for(let i=0;i<20;i++)s.symbol(i<10?'low':i<15?'mid':'high',1,true);s.rolls.push(0,0,0);
 s.room(0,1);s.symbol('scatter');for(const t of tiers)for(let i=0;i<5;i++)s.symbol(t,0);
 for(const[t,i]of [['low',1],['low',2],['mid',1],['high',1]] as const)s.symbol(t,i);s.rolls.push(0,0,0);
 s.room(1,0);s.symbol('scatter');s.quiet(18);
 [3,'coin','stairs','coin','ghost',2,'ghost'].forEach(p=>s.prize(p as Prize));return s.done('two-free-floors');
}
export function allScatters(){const s=new Script();s.room(0);s.room(1,0);for(let i=0;i<25;i++)s.symbol('scatter');return s.done('all-scatters');}
