const stats = {
    player: {
        R: {
            count: 0,
            win: 0,
            lose: 0,
            draw: 0,
        },
        P: {
            count: 0,
            win: 0,
            lose: 0,
            draw: 0,
        },
        S: {
            count: 0,
            win: 0,
            lose: 0,
            draw: 0,
        }
    },
    computer: {
        R: {
            count: 0,
            win: 0,
            lose: 0,
            draw: 0,
        },
        P: {
            count: 0,
            win: 0,
            lose: 0,
            draw: 0,
        },
        S: {
            count: 0,
            win: 0,
            lose: 0,
            draw: 0,
        }
    }
};

const RESULT = Object.freeze({
    WIN: 0,
    LOSE: 1,
    DRAW: 2,
});
const STATUS = ["win", "lose", "draw"];
const SYMBOLS = ["R", "P", "S"];
const SYMBOL_WEIGHT = {
    "R": {
        "S": RESULT.WIN,
        "P": RESULT.LOSE,
        "R": RESULT.DRAW,
    },
    "P": {
        "R": RESULT.WIN,
        "S": RESULT.LOSE,
        "P": RESULT.DRAW,
    },
    "S": {
        "P": RESULT.WIN,
        "R": RESULT.LOSE,
        "S": RESULT.DRAW,
    }
};
const getSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
const getResult = (sym1, sym2) => SYMBOL_WEIGHT[sym1][sym2];

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

const addAvg = (player, data) => {
    for (const currentStatus of STATUS) {
        for (const key in data[player]) {
            data[player][key][`${currentStatus}_avg`] = `${((data[player][key][currentStatus] / data[player][key].count) * 100).toFixed(2)}%`
        }
    }
}

addAvg("player", stats);
addAvg("computer", stats);

console.log(stats)
