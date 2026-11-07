import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyRoomMultipliers, BET_CENTS, clearForFloor, collectWins, findWins, generateBoard,
  getMultiplier, getScatterBonusMoves, isCollectionComplete, refillBoard, refillForRoom, removeWins, revealMysteries, shouldContinueRoom, SYMBOL_WEIGHTS, PRE_MYSTERY_WEIGHTS, PAYTABLE_CENTS, PRE_BALANCE_PAYTABLE_CENTS,
} from '../src/game.ts';
import { applyBonusPrize, BONUS_WEIGHTS, PRE_BALANCE_BONUS_WEIGHTS, PRE_ROUND_POT_BONUS_WEIGHTS, createBonusState, drawBonusPrize } from '../src/bonus.ts';

const argumentsByName = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [name, value] = argument.replace(/^--/, '').split('=');
  return [name, value];
}));
const rounds = Number(argumentsByName.rounds ?? 100000);
const seed = Number(argumentsByName.seed ?? 42);
const weights = argumentsByName.weights
  ? Object.fromEntries((argumentsByName.weights.split(',').length===5?['low','mid','high','scatter','mystery']:['low','mid','high','scatter']).map((tier, index) => [tier, Number(argumentsByName.weights.split(',')[index])]))
  : argumentsByName.mystery === 'off' ? PRE_MYSTERY_WEIGHTS : SYMBOL_WEIGHTS;
assert.ok(Number.isSafeInteger(rounds) && rounds > 1);
assert.ok(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff);
assert.ok(Object.values(weights).every((weight) => Number.isFinite(weight) && weight >= 0));
assert.ok(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 100) < 1e-9);

// Seeded generator for repeatable prototype studies; production uses Math.random.
let randomState = seed >>> 0;
const random = () => {
  randomState = (randomState + 0x6d2b79f5) >>> 0;
  let value = Math.imul(randomState ^ randomState >>> 15, randomState | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 0x100000000;
};
const otherRoom = (current) => {
  const choice = Math.floor(random() * 4);
  return choice >= current ? choice + 1 : choice;
};
const roomBonusEnabled = argumentsByName.bonus !== 'off';
const doorBonusEnabled = argumentsByName['door-bonus'] !== 'off';
const roomRefillsEnabled = argumentsByName['room-refills'] !== 'off';
const keepScatters = argumentsByName['keep-scatters'] !== 'off';
// Legacy studies used early entry; current play waits for the whole chain to settle.
const bonusAtChainEnd = argumentsByName['scatter-timing'] === 'early' ? false : keepScatters;
const bonusStartsWithRoundWin = bonusAtChainEnd && argumentsByName['bonus-pot'] !== 'zero';
const bonusFloorDoubling = keepScatters && argumentsByName['floor-prizes'] !== 'legacy';
const bonusWeights = argumentsByName['door-odds'] === 'v13' ? PRE_BALANCE_BONUS_WEIGHTS : argumentsByName['door-odds'] === 'legacy' || !keepScatters ? PRE_ROUND_POT_BONUS_WEIGHTS : BONUS_WEIGHTS;
const paytable = argumentsByName.paytable === 'legacy' || !keepScatters ? PRE_BALANCE_PAYTABLE_CENTS : PAYTABLE_CENTS;
let room = Math.floor(random() * 5);
const staticPreview = keepScatters && argumentsByName.preview !== 'random';
// Current decorative preview consumes no game RNG. Preserve historical replay explicitly.
if (!staticPreview) revealMysteries(generateBoard(random, weights), room, random);
let totalCents = 0n;
let mean = 0;
let m2 = 0;
let hits = 0;
let freeStages = 0;
let winningBatches = 0;
let roomGroups = 0;
let capStages = 0;
let maximumRoundWinCents = 0n;
let doorBonuses = 0;
let doorBonusSteps = 0;
let doorBonusAwardsCents = 0n;
const doorPrizeCounts = { coin: 0, multiplier: 0, stairs: 0, ghost: 0 };
let extraRoomClears = 0;
let roomRefillBatches = 0;
let maximumEvaluations = 0;
let maximumRespinNumber = 0;
const winningGroupsByTier = { low: 0, mid: 0, high: 0 };
const awardsCentsByTier = { low: 0, mid: 0, high: 0 };
const histogram = Array(11).fill(0);

for (let round = 1; round <= rounds; round++) {
  let roundWin = 0n;
  let scatterAwarded = false;
  let respin = 0;
  let evaluations = 0;
  room = otherRoom(room);
  let collected = new Set();
  let board = generateBoard(random, weights);
  const awardScatterBonus = () => {
    if (doorBonusEnabled && !scatterAwarded) {
      const moves = getScatterBonusMoves(board);
      if (moves) {
        scatterAwarded = true;
        doorBonuses++;
        let bonus = createBonusState(moves, bonusStartsWithRoundWin ? roundWin : 0n);
        while (bonus.completedSteps < bonus.totalSteps) {
          const prize = drawBonusPrize(random, bonusWeights);
          bonus = applyBonusPrize(bonus, prize, bonusFloorDoubling);
          doorPrizeCounts[prize.kind]++;
          doorBonusSteps++;
        }
        const gain = bonus.totalWinCents - bonus.startingWinCents;
        roundWin += gain;
        doorBonusAwardsCents += gain;
      }
    }
  };
  while (true) {
    evaluations++;
    // Diagnostic stop fails the study instead of counting a truncated chain as settled.
    if (evaluations > 1000000) throw new Error(`Unsettled chain at paid round ${round}`);
    board = revealMysteries(board, room, random).board;
    if (!bonusAtChainEnd) awardScatterBonus();
    const baseWins = findWins(board, getMultiplier(respin),paytable);
    if (baseWins.length === 0) {
      if (!roomRefillsEnabled || !shouldContinueRoom(collected, keepScatters ? board : undefined)) {
        if (bonusAtChainEnd) awardScatterBonus();
        break;
      }
      extraRoomClears++;
      roomRefillBatches++;
      board = refillForRoom(keepScatters ? clearForFloor(board) : Array.from({ length: 5 }, () => Array(5).fill(null)), collected, room, random, weights);
      continue;
    }
    const wins = roomBonusEnabled ? applyRoomMultipliers(baseWins, room, random) : baseWins;
    winningBatches++;
    roomGroups += wins.filter((win) => win.roomMultiplier > 1).length;
    for (const win of wins) {
      winningGroupsByTier[win.symbol.tier]++;
      awardsCentsByTier[win.symbol.tier] += win.winCents;
    }
    roundWin += BigInt(wins.reduce((sum, win) => sum + win.winCents, 0));
    board = removeWins(board, wins);
    collected = collectWins(collected, wins, room);
    if (isCollectionComplete(collected)) {
      room = otherRoom(room);
      collected = new Set();
      if (!keepScatters) scatterAwarded = false;
      respin++;
      freeStages++;
      histogram[Math.min(respin, 10)]++;
      if (respin >= 10) capStages++;
      board = keepScatters ? refillBoard(clearForFloor(board), random, weights) : generateBoard(random, weights);
    } else {
      if (roomRefillsEnabled) {
        if (collected.size) roomRefillBatches++;
        board = refillForRoom(board, collected, room, random, weights);
      } else board = refillBoard(board, random, weights);
    }
  }
  totalCents += roundWin;
  if (roundWin > 0n) hits++;
  const delta = Number(roundWin) - mean;
  mean += delta / round;
  m2 += delta * (Number(roundWin) - mean);
  maximumRoundWinCents = maximumRoundWinCents > roundWin ? maximumRoundWinCents : roundWin;
  maximumEvaluations = Math.max(maximumEvaluations, evaluations);
  maximumRespinNumber = Math.max(maximumRespinNumber, respin);
}
const standardErrorRtp = Math.sqrt(m2 / (rounds - 1) / rounds) / BET_CENTS * 100;
const rtp = Number(totalCents) / (rounds * BET_CENTS) * 100;
const jsonCents = (value) => value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
const result = {
  study: 'completed-paid-round Monte Carlo; not certified RTP',
  rounds, seed, weights, roomBonusEnabled, doorBonusEnabled, roomRefillsEnabled, keepScatters, bonusAtChainEnd, staticPreview, bonusStartsWithRoundWin, bonusFloorDoubling, bonusWeights, paytable,
  totalWagerCents: rounds * BET_CENTS, totalWinCents: jsonCents(totalCents),
  rtpPercent: rtp, standardErrorRtpPercentagePoints: standardErrorRtp,
  sampleVarianceWinCents: m2 / (rounds - 1),
  approximate95PercentInterval: [rtp - 1.96 * standardErrorRtp, rtp + 1.96 * standardErrorRtp],
  hitPercent: hits / rounds * 100, freeStagesPerPaidRound: freeStages / rounds,
  winningBatchesPerPaidRound: winningBatches / rounds, roomGroupsPerPaidRound: roomGroups / rounds,
  freeStageHistogramByRespinNumberCappedAt10: histogram,
  capStages, maximumRoundWinCents: jsonCents(maximumRoundWinCents), maximumEvaluations, maximumRespinNumber,
  doorBonuses, doorBonusSteps, doorBonusAwardsCents: jsonCents(doorBonusAwardsCents), doorPrizeCounts,
  extraRoomClears, roomRefillBatches,
  winningGroupsByTier, awardsCentsByTier,
  truncatedChains: 0,
};
if (argumentsByName.out) {
  fs.mkdirSync(path.dirname(argumentsByName.out), { recursive: true });
  fs.writeFileSync(argumentsByName.out, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result));
