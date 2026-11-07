export function aggregate(records){
  const n=records.reduce((s,r)=>s+r.Rounds,0);
  const sum=(key)=>records.reduce((s,r)=>s+Number(r[key]??0),0);
  const exact=(key)=>records.reduce((s,r)=>s+BigInt(r[key]),0n).toString();
  const component=(money,squares)=>{
    const cents=exact(money),mean=Number(cents)/n;
    const se=n>1?Math.sqrt(Math.max(0,(sum(squares)-n*mean*mean)/(n-1))/n):null;
    return {cents,rtpPercent:mean,standardErrorPercentagePoints:se,approximate95PercentInterval:se===null?null:[mean-1.96*se,mean+1.96*se]};
  };
  if(!n)return {paidRounds:0};
  const base=component('BaseCents','BaseSquares'),bonus=component('BonusCents','BonusSquares');
  const totalCents=(BigInt(base.cents)+BigInt(bonus.cents)).toString(),totalMean=Number(totalCents)/n;
  const se=n>1?Math.sqrt(Math.max(0,(sum('TotalSquares')-n*totalMean*totalMean)/(n-1))/n):null;
  const arrays=key=>records[0][key].map((_,i)=>records.reduce((s,r)=>s+r[key][i],0));
  const conditional=base.rtpPercent+sum('ExpectedBonusCents')/n;
  const conditionalSE=Math.sqrt(Math.max(0,(sum('ConditionalSquares')-n*conditional*conditional)/(n-1))/n);
  return {paidRounds:n,wageredCents:(BigInt(n)*100n).toString(),base,bonus,total:{cents:totalCents,rtpPercent:totalMean,standardErrorPercentagePoints:se,approximate95PercentInterval:[totalMean-1.96*se,totalMean+1.96*se]},conditionalExpectedBonusRtpPercent:sum('ExpectedBonusCents')/n,conditionalExpectedTotalRtpPercent:conditional,conditionalStandardErrorPercentagePoints:conditionalSE,hitRatePercent:100*sum('Hits')/n,freeStages:sum('FreeStages'),bonuses:sum('Bonuses'),bonusMoves:sum('BonusMoves'),extraClears:sum('ExtraClears'),evaluations:sum('Evaluations'),maximumEvaluations:Math.max(...records.map(r=>r.MaxEvaluations)),maximumRespin:Math.max(...records.map(r=>r.MaxRespin)),tierGroups:arrays('TierGroups'),tierCents:arrays('TierCents'),prizeCounts:arrays('PrizeCounts'),stageCounts:arrays('StageCounts'),bonusByMoves:arrays('BonusByMoves'),randomCalls:sum('RandomCalls'),truncatedChains:0};
}
