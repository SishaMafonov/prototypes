import { deck, shuffle, suiteImage } from './src/deck/deck.mjs';
import { board, fill } from './src/game/board.mjs';
import { turn } from './src/game/game.mjs';

const button = document.getElementById("draw");
button.addEventListener("click", drawCard);

const newDeck = deck();
const shuffled = shuffle(newDeck);
const newBoard = board();

fill(newBoard, shuffled);

function drawCard() {
    newBoard.state = "up";
    const status = Object.keys(newBoard.bottom).find(ace => newBoard.bottom[ace].position > 5);
    if (status) {
        const winner = document.getElementById(`winner`);
        winner.textContent = `WINNER IS ${status.toUpperCase()}!`;
        return;
    }
    const card = turn(newBoard, shuffled);
    update(card)
}

function update(card) {
    const currentCardView = document.getElementById("current-card");
    const display = {
        suite: "",
        rank: card.replace(/[HSDC]/, ""),
        name: "",
        currentPosition: 0,
        previousPosition: 0,

    }
    
    if (card.includes("H")) {
        display.suite = suiteImage("H");
        display.currentPosition = newBoard.bottom.hearts.position;
        display.name = "hearts";
    } else if (card.includes("S")) {
        display.suite = suiteImage("S");
        display.currentPosition = newBoard.bottom.spades.position;
        display.name = "spades";
    } else if (card.includes("D")) {
        display.suite = suiteImage("D");
        display.currentPosition = newBoard.bottom.diamonds.position;
        display.name = "diamonds";
    } else if (card.includes("C")) {
        display.suite = suiteImage("C");
        display.currentPosition = newBoard.bottom.clubs.position;
        display.name = "clubs";
    }

    currentCardView.textContent = `${display.rank} ${display.suite}`;
    display.previousPosition = display.currentPosition - 1;

    updatePosition(display);
}

function updatePosition(config) {
    const heartsCurrentPosition = document.getElementById(`${config.name}-${config.currentPosition}`);
    const previousPosition = document.getElementById(`${config.name}-${config.previousPosition}`);
    heartsCurrentPosition.textContent = `A${config.suite}`;
    previousPosition.textContent = "";
}
