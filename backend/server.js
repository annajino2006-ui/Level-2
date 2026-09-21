const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const words = require("./words.json");
const validWords = require("./valid-words.json");

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

let secretWord = "";
let attempts = 0;

// Start a new game
function startNewGame() {
  const randomIndex = Math.floor(Math.random() * words.length);

  secretWord = words[randomIndex];
  attempts = 0;

  console.log("New game started!");
  console.log("Secret word:", secretWord);
}

// Start first game
startNewGame();

// Test backend
app.get("/", (req, res) => {
  res.json({
    message: "Wordly backend is working!",
  });
});

// New game
app.post("/api/new-game", (req, res) => {
  startNewGame();

  res.json({
    message: "New game started",
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
  });
});

// Guess
app.post("/api/guess", (req, res) => {
  const guess = req.body.guess;

  // No guess
  if (!guess) {
    return res.status(400).json({
      message: "Please enter a word.",
    });
  }

  const playerGuess = guess.toUpperCase();

  // Must be 5 letters
  if (playerGuess.length !== WORD_LENGTH) {
    return res.status(400).json({
      message: "Word must contain exactly 5 letters.",
    });
  }

  // Must be in our word list
  if (!validWords.includes(playerGuess)) {
    return res.status(400).json({
      message: "Not a valid word.",
    });
  }

  // Count the attempt
  attempts++;

  // --------------------------------
  // CHECK THE LETTERS
  // --------------------------------

  const result = Array(WORD_LENGTH).fill("absent");

  const secretArray = secretWord.split("");

  // First check correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (playerGuess[i] === secretArray[i]) {
      result[i] = "correct";

      secretArray[i] = null;
    }
  }

  // Then check wrong positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") {
      continue;
    }

    const letter = playerGuess[i];

    const secretIndex = secretArray.indexOf(letter);

    if (secretIndex !== -1) {
      result[i] = "present";

      secretArray[secretIndex] = null;
    }
  }

  // --------------------------------
  // WIN / LOSE
  // --------------------------------

  const won = playerGuess === secretWord;

  const lost = !won && attempts >= MAX_ATTEMPTS;

  // --------------------------------
  // SCORE
  // --------------------------------

  let score = 0;

  if (won) {
    score = 100 - (attempts - 1) * 10;
  }

  // --------------------------------
  // SEND RESULT TO FRONTEND
  // --------------------------------

  res.json({
    guess: playerGuess,

    result: result,

    attempts: attempts,

    maxAttempts: MAX_ATTEMPTS,

    status: won ? "win" : lost ? "lose" : "continue",

    score: score,

    secretWord: lost ? secretWord : null,
  });
});

// Run directly for local development. Vercel imports the app as a handler.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Wordly backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
