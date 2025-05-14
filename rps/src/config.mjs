export const RESULT = Object.freeze({
    WIN: 0,
    LOSE: 1,
    DRAW: 2,
});

export const STATUS = ["win", "lose", "draw"];

export const SYMBOLS = ["R", "P", "S"];

export const SYMBOL_WEIGHT = {
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
