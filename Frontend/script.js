const WORDS = ["ALBUM","ALLEY","ANGLE","APPLE","AUDIO","BEACH","BERRY","BLOOM","BRAIN",
    "BRANT","BRAVE","BREAD","CANDY","CLOUD","CRANE","DANCE","DENIM","DRIFT","EAGLE",
    "EARTH","FIELD","FLAME","FROST","GHOST","GLOVE", "GRAIN","GRAPE","HEART","HONEY",
    "HOUSE","INBOX","IVORY","JELLY","JOKER","KNACK","KNIFE","KNOCK","LASER","LEARN",
    "LEMON","LIGHT","MANGO","MARCH","MONEY","NIGHT","NOBLE","OCEAN","OLIVE","PEACE",
    "PILOT","PLANT","POWER","PULSE","QUEEN","QUART","RANGE","RAVEN","RIVER","ROBOT",
    "SCALE","SCORE","SHEEP","SHINE","SMILE","SOLAR","STONE","STORM","TIGER","TRAIN",
    "TRAIL","ULTRA","UNITY","VAPOR","VIVID","VOICE","WATER","WHEAT","WHEEL","WORLD",
    "YACHT",
  "YOUNG",
  "ZEBRA",
  "ZESTY",
];

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const boardElement = document.getElementById("board");
const keyboardElement = document.getElementById("keyboard");
const statusBanner = document.getElementById("status-banner");
const newGameButton = document.getElementById("new-game-btn");

let secretWord = "";
let currentGuess = [];
let currentRow = 0;
let gameOver = false;
let keyStates = {};
let boardRows = [];

const keyboardLayout = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
}

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

function buildBoard() {
  boardElement.innerHTML = "";
  boardRows = [];

  for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "board-row";

    const tiles = [];

    for (let colIndex = 0; colIndex < WORD_LENGTH; colIndex += 1) {
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
      button.setAttribute(
        "aria-label",
        key === "BACKSPACE" ? "Backspace" : key,
      );

      if (key === "ENTER" || key === "BACKSPACE") {
        button.classList.add("wide");
      }

      button.addEventListener("click", () => handleKeyPress(key));
      rowElement.appendChild(button);
    });

    keyboardElement.appendChild(rowElement);
  });
}

function renderKeyboard() {
  const keyButtons = keyboardElement.querySelectorAll(".key");

  keyButtons.forEach((button) => {
    const keyValue = button.dataset.key;
    const state = keyStates[keyValue];
    button.classList.remove("correct", "present", "absent");

    if (state) {
      button.classList.add(state);
    }
  });
}

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

  if (key.length !== 1 || !/[A-Z]/.test(key)) {
    return;
  }

  addLetter(key);
}

function addLetter(letter) {
  if (currentGuess.length >= WORD_LENGTH) {
    return;
  }

  const rowTiles = boardRows[currentRow];
  const nextIndex = currentGuess.length;
  const tile = rowTiles[nextIndex];

  currentGuess.push(letter);
  tile.textContent = letter;
  tile.classList.add("filled", "pop");

  window.setTimeout(() => tile.classList.remove("pop"), 120);

  const keyButton = keyboardElement.querySelector(`.key[data-key="${letter}"]`);
  if (keyButton) {
    keyButton.classList.add("pressed");
    window.setTimeout(() => keyButton.classList.remove("pressed"), 120);
  }
}

function deleteLetter() {
  if (currentGuess.length === 0) {
    return;
  }

  const rowTiles = boardRows[currentRow];
  const lastIndex = currentGuess.length - 1;
  const tile = rowTiles[lastIndex];

  currentGuess.pop();
  tile.textContent = "";
  tile.classList.remove("filled");
  tile.dataset.state = "";
}

function evaluateGuess(guess) {
  const result = Array(WORD_LENGTH).fill("absent");
  const secretArray = secretWord.split("");

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guess[index] === secretArray[index]) {
      result[index] = "correct";
      secretArray[index] = null;
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index] !== "correct") {
      const letter = guess[index];
      const secretIndex = secretArray.indexOf(letter);

      if (secretIndex !== -1) {
        result[index] = "present";
        secretArray[secretIndex] = null;
      }
    }
  }

  return result;
}

function updateKeyboardStates(guess, result) {
  guess.split("").forEach((letter, index) => {
    const newState = result[index];
    const currentState = keyStates[letter];
    const priority = { absent: 0, present: 1, correct: 2 };

    if (!currentState || priority[newState] > priority[currentState]) {
      keyStates[letter] = newState;
    }
  });

  renderKeyboard();
}

function submitGuess() {
  if (gameOver) {
    return;
  }

  if (currentGuess.length < WORD_LENGTH) {
    showStatus("Not enough letters", "error");
    shakeRow();
    return;
  }

  const guess = currentGuess.join("");
  // Evaluate any 5-letter guess (even if it's not in the WORDS list).
  // This ensures letters that exist in the secret word still get colored correctly.
  const evaluation = evaluateGuess(guess);
  const rowTiles = boardRows[currentRow];

  rowTiles.forEach((tile, index) => {
    // ensure letter is visible (in case it was never filled via addLetter)
    tile.textContent = currentGuess[index] || guess[index] || "";
    tile.dataset.state = evaluation[index];
    tile.classList.add("flip");

    window.setTimeout(() => {
      tile.classList.add("filled");
    }, 120);
  });

  // Update keyboard colors according to evaluation regardless of dictionary membership
  updateKeyboardStates(guess, evaluation);

  if (guess === secretWord) {
    gameOver = true;
    showStatus("You solved it!", "success");
    return;
  }

  currentRow += 1;

  if (currentRow >= MAX_GUESSES) {
    gameOver = true;
    showStatus(`Out of guesses! The word was ${secretWord}.`, "error");
    return;
  }

  currentGuess = [];
  // Do not show the "not in list" banner for invalid words; keep UI clean.
  showStatus("", "");
}

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

function resetGame() {
  secretWord = getRandomWord();
  currentGuess = [];
  currentRow = 0;
  gameOver = false;
  keyStates = {};
  buildBoard();
  buildKeyboard();
  renderKeyboard();
  showStatus("Use the clues to find the hidden word. You have 6 tries.", "");
}

newGameButton.addEventListener("click", resetGame);

document.addEventListener("keydown", (event) => {
  const { key } = event;

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

resetGame();
