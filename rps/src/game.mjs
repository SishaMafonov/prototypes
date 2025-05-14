import { SYMBOL_WEIGHT, SYMBOLS } from "./config.mjs";

export const getSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
export const getResult = (sym1, sym2) => SYMBOL_WEIGHT[sym1][sym2];
