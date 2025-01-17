const suites = ["H", "S", "D", "C"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const pics = ["♥️", "️♠️", "♦️", "♣️"];

export const deck = () => suites.flatMap(suite => values.map(value => `${value}${suite}`));
export const shuffle = (deck) => deck
    .map(card => ({card, id: Math.random()}))
    .sort((a, b) => a.id - b.id)
    .map(({card}) => card);
export const drawCard = (deck) => deck.length > 0 && deck.shift();
export const suiteImage = (suite) => pics[suites.indexOf(suite)];
