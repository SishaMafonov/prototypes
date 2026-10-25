import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyRoomMultipliers, BET_CENTS, collectWins, findWins, generateBoard,
  getMultiplier, isCollectionComplete, refillBoard, removeWins, SYMBOL_WEIGHTS,
} from '../src/game.ts';

const argumentsByName = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [name, value] = argument.replace(/^--/, '').split('=');
  return [name, value];
}));
const rounds = Number(argumentsByName.rounds ?? 100000);
const seed = Number(argumentsByName.seed ?? 42);
const weights = argumentsByName.weights
  ? Object.fromEntries(['low', 'mid', 'high', 'scatter'].map((tier, index) => [tier, Number(argumentsByName.weights.split(',')[index])]))
  : SYMBOL_WEIGHTS;
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
let room = Math.floor(random() * 5);
// Consume the real unpaid preview draws, without resolving or awarding it.
generateBoard(random, weights);
let totalCents = 0;
let mean = 0;
let m2 = 0;
let hits = 0;
let freeStages = 0;
let winningBatches = 0;
let roomGroups = 0;
let capStages = 0;
let maximumRoundWinCents = 0;
let maximumEvaluations = 0;
let maximumRespinNumber = 0;
const histogram = Array(11).fill(0);

for (let round = 1; round <= rounds; round++) {
  let roundWin = 0;
  let respin = 0;
  let evaluations = 0;
  room = otherRoom(room);
  let collected = new Set();
  let board = generateBoard(random, weights);
  while (true) {
    evaluations++;
    // Diagnostic stop fails the study instead of counting a truncated chain as settled.
    if (evaluations > 1000000) throw new Error(`Unsettled chain at paid round ${round}`);
    const baseWins = findWins(board, getMultiplier(respin));
    if (baseWins.length === 0) break;
    const wins = roomBonusEnabled ? applyRoomMultipliers(baseWins, room, random) : baseWins;
    winningBatches++;
    roomGroups += wins.filter((win) => win.roomMultiplier > 1).length;
    roundWin += wins.reduce((sum, win) => sum + win.winCents, 0);
    board = removeWins(board, wins);
    collected = collectWins(collected, wins, room);
    if (isCollectionComplete(collected)) {
      room = otherRoom(room);
      collected = new Set();
      respin++;
      freeStages++;
      histogram[Math.min(respin, 10)]++;
      if (respin >= 10) capStages++;
      board = generateBoard(random, weights);
    } else {
      board = refillBoard(board, random, weights);
    }
  }
  totalCents += roundWin;
  if (roundWin > 0) hits++;
  const delta = roundWin - mean;
  mean += delta / round;
  m2 += delta * (roundWin - mean);
  maximumRoundWinCents = Math.max(maximumRoundWinCents, roundWin);
  maximumEvaluations = Math.max(maximumEvaluations, evaluations);
  maximumRespinNumber = Math.max(maximumRespinNumber, respin);
}
const standardErrorRtp = Math.sqrt(m2 / (rounds - 1) / rounds) / BET_CENTS * 100;
const rtp = totalCents / (rounds * BET_CENTS) * 100;
const result = {
  study: 'completed-paid-round Monte Carlo; not certified RTP',
  rounds, seed, weights, roomBonusEnabled,
  totalWagerCents: rounds * BET_CENTS, totalWinCents: totalCents,
  rtpPercent: rtp, standardErrorRtpPercentagePoints: standardErrorRtp,
  sampleVarianceWinCents: m2 / (rounds - 1),
  approximate95PercentInterval: [rtp - 1.96 * standardErrorRtp, rtp + 1.96 * standardErrorRtp],
  hitPercent: hits / rounds * 100, freeStagesPerPaidRound: freeStages / rounds,
  winningBatchesPerPaidRound: winningBatches / rounds, roomGroupsPerPaidRound: roomGroups / rounds,
  freeStageHistogramByRespinNumberCappedAt10: histogram,
  capStages, maximumRoundWinCents, maximumEvaluations, maximumRespinNumber,
  truncatedChains: 0,
};
if (argumentsByName.out) {
  fs.mkdirSync(path.dirname(argumentsByName.out), { recursive: true });
  fs.writeFileSync(argumentsByName.out, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result));
