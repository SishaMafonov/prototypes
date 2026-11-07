import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregate } from '../scripts/rtp/report.mjs';
function observation(base,bonus){
  const b=Number(base),d=Number(bonus);
  return {Rounds:1,BaseCents:String(base),BonusCents:String(bonus),BaseSquares:b*b,BonusSquares:d*d,TotalSquares:(b+d)**2,ConditionalSquares:(b+d)**2,ExpectedBonusCents:d,Hits:1,FreeStages:0,Bonuses:0,BonusMoves:0,ExtraClears:0,Evaluations:1,MaxEvaluations:1,MaxRespin:0,TierGroups:[0,0,0],TierCents:[0,0,0],PrizeCounts:[0,0,0,0],StageCounts:Array(11).fill(0),BonusByMoves:Array(26).fill(0),RandomCalls:0};
}
test('RTP uses paid wagers and preserves base/bonus covariance in the combined interval',()=>{
  const report=aggregate([observation(100,0),observation(0,100)]);
  assert.equal(report.paidRounds,2);assert.equal(report.wageredCents,'200');
  assert.equal(report.base.rtpPercent,50);assert.equal(report.bonus.rtpPercent,50);
  assert.equal(report.base.standardErrorPercentagePoints,50);
  assert.equal(report.bonus.standardErrorPercentagePoints,50);
  assert.equal(report.total.rtpPercent,100);
  assert.equal(report.total.standardErrorPercentagePoints,0);
  assert.deepEqual(report.total.approximate95PercentInterval,[100,100]);
});
test('audit totals remain exact decimal strings beyond Number integer precision',()=>{
  const cents=9007199254740993n;
  const report=aggregate([observation(cents,1),observation(cents,2)]);
  assert.equal(report.base.cents,String(2n*cents));
  assert.equal(report.bonus.cents,'3');
  assert.equal(report.total.cents,String(2n*cents+3n));
});
test('an initial checkpoint with no paid observations has no fabricated RTP',()=>{
  assert.deepEqual(aggregate([]),{paidRounds:0});
});
