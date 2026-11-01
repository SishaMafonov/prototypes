import { createHash } from 'node:crypto';
import { SYMBOL_WEIGHTS, PAYTABLE_CENTS, ROOM_MULTIPLIERS, getMultiplier, REEL_COLUMNS, REEL_ROWS, SYMBOLS_PER_SPRITE, BET_CENTS, MIN_WIN_COUNT, MIN_BONUS_SCATTERS, KEEP_SCATTERS_ON_FLOOR_CHANGE } from '../../src/game.ts';
import { BONUS_WEIGHTS, BONUS_MULTIPLIERS, BONUS_COIN_CENTS, MAX_BONUS_FLOOR } from '../../src/bonus.ts';
export function config({ weights=SYMBOL_WEIGHTS, bonus=BONUS_WEIGHTS, seed=20261101, keepScatters=KEEP_SCATTERS_ON_FLOOR_CHANGE, bonusAtChainEnd=keepScatters, staticPreview=keepScatters }={}) {
  if(REEL_COLUMNS!==5||REEL_ROWS!==5||SYMBOLS_PER_SPRITE!==5||BET_CENTS!==100||MIN_WIN_COUNT!==5||MIN_BONUS_SCATTERS!==6||ROOM_MULTIPLIERS.length!==30||BONUS_MULTIPLIERS.length!==10||getMultiplier(10)!==144||getMultiplier(100)!==144)throw Error('Native model contract changed; update and re-verify the engine before running');
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Seed must be uint32');
  for(const vector of [weights,bonus]) {
    if(Object.values(vector).some(n=>!Number.isFinite(n)||n<=0)||Math.abs(Object.values(vector).reduce((a,b)=>a+b,0)-100)>1e-9)throw Error('Positive percentage vector summing to 100 required');
  }
  const c={Low:weights.low,Mid:weights.mid,High:weights.high,Scatter:weights.scatter,
    Coin:bonus.coin,Multiplier:bonus.multiplier,Stairs:bonus.stairs,Ghost:bonus.ghost,
    Pay:['low','mid','high'].map(t=>[5,6,7].map(n=>PAYTABLE_CENTS[t][n])),RoomBag:[...ROOM_MULTIPLIERS],
    Stage:Array.from({length:11},(_,i)=>getMultiplier(i)),DoorBag:[...BONUS_MULTIPLIERS],CoinCents:BONUS_COIN_CENTS,FloorCap:MAX_BONUS_FLOOR,Seed:seed};
  // Omit the flag in legacy mode so the archived v8 configuration/hash stays reproducible.
  if(keepScatters){c.KeepScatters=true;c.BonusOncePerPaidChain=true;}
  if(bonusAtChainEnd)c.BonusAtEndOfPaidChain=true;
  if(weights.mystery)c.Mystery=weights.mystery;
  if(staticPreview)c.StaticPreview=true;
  c.Id=createHash('sha256').update(JSON.stringify(c)).digest('hex');return c;
}
