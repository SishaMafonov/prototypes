import { drawCard, suiteImage } from '../deck/deck.mjs';

export const turn = (board, deck) => {
    const currentCard = drawCard(deck);
    if (currentCard.includes("H")) {
        board.bottom.hearts.position++;
    } else if (currentCard.includes("S")) {
        board.bottom.spades.position++;
    } else if (currentCard.includes("D")) {
        board.bottom.diamonds.position++;
    } else if (currentCard.includes("C")) {
        board.bottom.clubs.position++;
    }
    checker(board);
    return currentCard;
}

const checker = (board) => {
    for (let position = 1; position < 5; position++) {
        const currentPosition = board.side.find(card => card.position === position)
        if (!currentPosition.shown) {
            if (Object.values(board.bottom).every((ace) => ace.position >= position)){
                currentPosition.shown = true;
                if (currentPosition.card.includes("H") && board.bottom.hearts.position) {
                    board.bottom.hearts.position--;
                } else if (currentPosition.card.includes("S") && board.bottom.spades.position) {
                    board.bottom.spades.position--;
                } else if (currentPosition.card.includes("D") && board.bottom.diamonds.position) {
                    board.bottom.diamonds.position--;
                } else if (currentPosition.card.includes("C") && board.bottom.clubs.position) {
                    board.bottom.clubs.position--;
                }
                board.state = "down";
                const sidePanel = document.getElementById(`side-${position}`);
                const formattedCard = currentPosition.card.split("").map(char => {
                    if (Number.isInteger(Number.parseInt(char))) {
                        return char;
                    }
                    return suiteImage(char);
                }).join("");
                sidePanel.textContent = `${formattedCard}`;
            }
        }
    }
}
