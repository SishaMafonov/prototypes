import { drawCard } from '../deck/deck.mjs';

const aces = {
    hearts: { position: 0 },
    spades: { position: 0 },
    diamonds: { position: 0 },
    clubs: { position: 0 },
};

const sideCards = [
    { position: 1, card: "", shown: false },
    { position: 2, card: "", shown: false },
    { position: 3, card: "", shown: false },
    { position: 4, card: "", shown: false },
    { position: 5, card: "", shown: false },
];

export const board = () => ({ bottom: aces, side: sideCards, state: "up" });
export const fill = (board, deck) => board.side.forEach( (el) => el.card = drawCard(deck));
