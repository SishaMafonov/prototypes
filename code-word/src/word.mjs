const letters = [...Array(27)].map( (_,i) => i === 0 ? " " : String.fromCharCode(64 + i) );
const sum = (ch1, ch2) => {
    const sum = letters.indexOf(ch1) + letters.indexOf(ch2);
    return sum >= letters.length ? (sum - letters.length) + 1 : sum;
};
const newCode = (word1, word2) => {
    const newWord = [];
    if (word1.length !== word2.length) {
        return;
    }
    for (let i = 0; i < word1.length; i++) {
        newWord.push(letters[sum(word1.toUpperCase()[i], word2.toUpperCase()[i])]);
    }
    return newWord.join("");
}

console.log(newCode("case", "vase"));
