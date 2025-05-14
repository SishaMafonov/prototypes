import { STATUS } from "./config.mjs";

export const stats = {
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

export const addAvg = (player, data) => {
    for (const currentStatus of STATUS) {
        for (const key in data[player]) {
            data[player][key][`${currentStatus}_avg`] = `${((data[player][key][currentStatus] / data[player][key].count) * 100).toFixed(2)}%`
        }
    }
}
