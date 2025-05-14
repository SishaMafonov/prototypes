import { addAvg, stats } from "./statistics.mjs";
import { RESULT } from "./config.mjs";
import { getResult, getSymbol } from "./game.mjs";

for (let round = 0; round < 100000000; round++) {
    const playerSymbol = getSymbol();
    const computerSymbol = getSymbol();

    stats.player[playerSymbol].count++;
    stats.computer[computerSymbol].count++;

    const roundResult = getResult(playerSymbol, computerSymbol);

    if (roundResult === RESULT.WIN) {
        stats.computer[computerSymbol].lose++;
        stats.player[playerSymbol].win++;
    }

    if (roundResult === RESULT.LOSE) {
        stats.computer[computerSymbol].win++;
        stats.player[playerSymbol].lose++;
    }

    if (roundResult === RESULT.DRAW) {
        stats.computer[computerSymbol].draw++;
        stats.player[playerSymbol].draw++;
    }
}

addAvg("player", stats);
addAvg("computer", stats);

console.log(stats)
