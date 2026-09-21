const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const isLocal =
  window.location.protocol === "file:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const BACKEND_URL = isLocal ? "http://localhost:3000" : "";

const boardElement = document.getElementById("board");
const keyboardElement = document.getElementById("keyboard");
const statusBanner = document.getElementById("status-banner");
const newGameButton = document.getElementById("new-game-btn");

let currentGuess = [];
let currentRow = 0;
let gameOver = false;
let keyStates = {};
let boardRows = [];

// --------------------------------
// KEYBOARD
// --------------------------------

const keyboardLayout = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

// --------------------------------
// STATUS
// --------------------------------

function showStatus(message, type = "") {
  statusBanner.textContent = message;

  statusBanner.classList.remove("hidden", "success", "error");

  if (type) {
    statusBanner.classList.add(type);
  }

  if (!message) {
    statusBanner.classList.add("hidden");
  }
}

// --------------------------------
// BUILD BOARD
// --------------------------------

function buildBoard() {
  boardElement.innerHTML = "";

  boardRows = [];

  for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex++) {
    const row = document.createElement("div");

    row.className = "board-row";

    const tiles = [];

    for (let colIndex = 0; colIndex < WORD_LENGTH; colIndex++) {
      const tile = document.createElement("div");

      tile.className = "tile";

      tile.dataset.state = "";

      tile.setAttribute(
        "aria-label",
        `Row ${rowIndex + 1} column ${colIndex + 1}`,
      );

      row.appendChild(tile);

      tiles.push(tile);
    }

    boardElement.appendChild(row);

    boardRows.push(tiles);
  }
}

// --------------------------------
// BUILD KEYBOARD
// --------------------------------

function buildKeyboard() {
  keyboardElement.innerHTML = "";

  keyboardLayout.forEach((row) => {
    const rowElement = document.createElement("div");

    rowElement.className = "keyboard-row";

    row.forEach((key) => {
      const button = document.createElement("button");

      button.type = "button";

      button.className = "key";

      button.textContent = key === "BACKSPACE" ? "⌫" : key;

      button.dataset.key = key;

      if (key === "ENTER" || key === "BACKSPACE") {
        button.classList.add("wide");
      }

      button.addEventListener("click", () => handleKeyPress(key));

      rowElement.appendChild(button);
    });

    keyboardElement.appendChild(rowElement);
  });
}

// --------------------------------
// KEYBOARD COLORS
// --------------------------------

function renderKeyboard() {
  const buttons = keyboardElement.querySelectorAll(".key");

  buttons.forEach((button) => {
    const key = button.dataset.key;

    const state = keyStates[key];

    button.classList.remove("correct", "present", "absent");

    if (state) {
      button.classList.add(state);
    }
  });
}

function updateKeyboardStates(guess, result) {
  guess.split("").forEach((letter, index) => {
    const newState = result[index];

    const oldState = keyStates[letter];

    const priority = {
      absent: 0,
      present: 1,
      correct: 2,
    };

    if (!oldState || priority[newState] > priority[oldState]) {
      keyStates[letter] = newState;
    }
  });

  renderKeyboard();
}

// --------------------------------
// KEY PRESS
// --------------------------------

function handleKeyPress(value) {
  if (gameOver) {
    return;
  }

  const key = value.toUpperCase();

  if (key === "ENTER") {
    submitGuess();

    return;
  }

  if (key === "BACKSPACE" || value === "BACKSPACE") {
    deleteLetter();

    return;
  }

  if (key.length === 1 && /[A-Z]/.test(key)) {
    addLetter(key);
  }
}

// --------------------------------
// ADD LETTER
// --------------------------------

function addLetter(letter) {
  if (currentGuess.length >= WORD_LENGTH) {
    return;
  }

  const rowTiles = boardRows[currentRow];

  const index = currentGuess.length;

  const tile = rowTiles[index];

  currentGuess.push(letter);

  tile.textContent = letter;

  tile.classList.add("filled", "pop");

  setTimeout(() => {
    tile.classList.remove("pop");
  }, 120);
}

// --------------------------------
// DELETE LETTER
// --------------------------------

function deleteLetter() {
  if (currentGuess.length === 0) {
    return;
  }

  const rowTiles = boardRows[currentRow];

  const index = currentGuess.length - 1;

  const tile = rowTiles[index];

  currentGuess.pop();

  tile.textContent = "";

  tile.classList.remove("filled");

  tile.dataset.state = "";
}

// --------------------------------
// SUBMIT GUESS
// --------------------------------

async function submitGuess() {
  if (gameOver) {
    return;
  }

  if (currentGuess.length < WORD_LENGTH) {
    showStatus("Not enough letters", "error");

    shakeRow();

    return;
  }

  const guess = currentGuess.join("");

  try {
    const response = await fetch(`${BACKEND_URL}/api/guess`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        guess: guess,
      }),
    });

    const data = await response.json();

    // Backend rejected the guess
    if (!response.ok) {
      showStatus(data.message, "error");

      shakeRow();

      const rowTiles = boardRows[currentRow];

      rowTiles.forEach((tile, index) => {
        tile.dataset.state = data.result[index];
        tile.classList.add("flip");
      });

      updateKeyboardStates(guess, data.result);

      currentGuess = [];
      currentRow++;

      if (data.status === "lose") {
        gameOver = true;
        showStatus(`Out of guesses! The word was ${data.secretWord}.`, "error");
      }

      return;
    }

    // --------------------------------
    // DISPLAY BACKEND RESULT
    // --------------------------------

    const result = data.result;

    const rowTiles = boardRows[currentRow];

    rowTiles.forEach((tile, index) => {
      tile.textContent = currentGuess[index];

      tile.dataset.state = result[index];

      tile.classList.add("flip");
    });

    updateKeyboardStates(guess, result);

    // --------------------------------
    // WIN
    // --------------------------------

    if (data.status === "win") {
      gameOver = true;

      showStatus(`You solved it! Score: ${data.score}`, "success");

      return;
    }

    // --------------------------------
    // LOSE
    // --------------------------------

    if (data.status === "lose") {
      gameOver = true;

      showStatus(`Out of guesses! The word was ${data.secretWord}.`, "error");

      return;
    }

    // Continue
    currentRow++;

    currentGuess = [];

    showStatus(`Guess ${data.attempts} of ${data.maxAttempts}`);
  } catch (error) {
    console.error(error);

    showStatus("Could not connect to the backend.", "error");
  }
}

// --------------------------------
// SHAKE ROW
// --------------------------------

function shakeRow() {
  const rowTiles = boardRows[currentRow];

  rowTiles.forEach((tile) => {
    tile.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(8px)" },
        { transform: "translateX(0)" },
      ],
      {
        duration: 180,
        easing: "ease-in-out",
      },
    );
  });
}

// --------------------------------
// NEW GAME
// --------------------------------

async function resetGame() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/new-game`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Could not start new game");
    }

    currentGuess = [];

    currentRow = 0;

    gameOver = false;

    keyStates = {};

    buildBoard();

    buildKeyboard();

    renderKeyboard();

    showStatus("Use the clues to find the hidden word. You have 6 tries.");
  } catch (error) {
    console.error(error);

    showStatus("Could not connect to the backend.", "error");
  }
}

// --------------------------------
// NEW GAME BUTTON
// --------------------------------

newGameButton.addEventListener("click", resetGame);

// --------------------------------
// PHYSICAL KEYBOARD
// --------------------------------

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === "Enter") {
    event.preventDefault();

    handleKeyPress("ENTER");

    return;
  }

  if (key === "Backspace") {
    event.preventDefault();

    handleKeyPress("BACKSPACE");

    return;
  }

  if (key.length === 1 && /[a-z]/i.test(key)) {
    event.preventDefault();

    handleKeyPress(key);
  }
});

// --------------------------------
// START
// --------------------------------

resetGame();
console.log("NEW WORDLY SCRIPT IS RUNNING");
