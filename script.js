const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const okButton = document.getElementById("okButton");

const COLS = 20;
const ROWS = 15;
const TICK = 125;

let snake = [];
let food = null;
let direction = "right";
let nextDirection = "right";
let score = 0;
let highScore = Number(localStorage.getItem("nokiaSnakeHighScore") || 0);

let running = false;
let paused = false;
let timer = null;

highScoreEl.textContent = highScore;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);

  ctx.setTransform(
    canvas.width / (COLS * 20), 0,
    0, canvas.height / (ROWS * 20),
    0, 0
  );

  draw();
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function startGame() {
  snake = [
    {x: 10, y: 7},
    {x: 9, y: 7},
    {x: 8, y: 7},
    {x: 7, y: 7}
  ];

  direction = "right";
  nextDirection = "right";
  score = 0;
  running = true;
  paused = false;

  scoreEl.textContent = "0";
  highScoreEl.textContent = highScore;

  createFood();
  hideOverlay();

  clearInterval(timer);
  timer = setInterval(update, TICK);

  draw();
}

function createFood() {
  do {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
  } while (snake.some(p => p.x === food.x && p.y === food.y));
}

function changeDirection(next) {
  if (!running || paused) return;

  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  if (next !== opposite[direction]) {
    nextDirection = next;
  }
}

function update() {
  if (!running || paused) return;

  direction = nextDirection;

  const head = {...snake[0]};

  if (direction === "up") head.y--;
  if (direction === "down") head.y++;
  if (direction === "left") head.x--;
  if (direction === "right") head.x++;

  if (
    head.x < 0 || head.x >= COLS ||
    head.y < 0 || head.y >= ROWS
  ) {
    gameOver();
    return;
  }

  const hitBody = snake.some(p => p.x === head.x && p.y === head.y);
  if (hitBody) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem("nokiaSnakeHighScore", String(highScore));
    }

    createFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  const w = COLS * 20;
  const h = ROWS * 20;

  ctx.fillStyle = "#d4d4d4";
  ctx.fillRect(0, 0, w, h);

  // Very subtle LCD pixel grid.
  ctx.strokeStyle = "rgba(0,0,0,.055)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * 20, 0);
    ctx.lineTo(x * 20, h);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * 20);
    ctx.lineTo(w, y * 20);
    ctx.stroke();
  }

  // Food: old-school solid LCD pixel.
  if (food) {
    ctx.fillStyle = "#090909";
    ctx.fillRect(food.x * 20 + 4, food.y * 20 + 4, 12, 12);
    ctx.fillRect(food.x * 20 + 7, food.y * 20 + 7, 6, 6);
  }

  // Snake: blocky pixels, head slightly darker.
  snake.forEach((part, i) => {
    ctx.fillStyle = i === 0 ? "#050505" : "#1a1a1a";
    ctx.fillRect(part.x * 20 + 2, part.y * 20 + 2, 16, 16);
  });
}

function gameOver() {
  running = false;
  paused = false;
  clearInterval(timer);

  showOverlay("GAME OVER", "PRESS 5 TO RESTART");
  draw();
}

function togglePause() {
  if (!running) {
    startGame();
    return;
  }

  paused = !paused;

  if (paused) {
    showOverlay("PAUSED", "PRESS 5 TO CONTINUE");
  } else {
    hideOverlay();
  }
}

function pressVisual(button) {
  button.classList.remove("pressed");
  void button.offsetWidth;
  button.classList.add("pressed");

  window.setTimeout(() => {
    button.classList.remove("pressed");
  }, 110);
}

function pressKey(key, button) {
  if (button) pressVisual(button);

  if (key === "2") changeDirection("up");
  else if (key === "4") changeDirection("left");
  else if (key === "6") changeDirection("right");
  else if (key === "8") changeDirection("down");
  else if (key === "5") togglePause();
}

document.querySelectorAll(".key").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    pressKey(button.dataset.key, button);
  });
});

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    pressVisual(button);
    changeDirection(button.dataset.action);
  });
});

okButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  pressVisual(okButton);
  togglePause();
});

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "2", "4", "5", "6", "8", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w" || key === "2") changeDirection("up");
  else if (key === "arrowdown" || key === "s" || key === "8") changeDirection("down");
  else if (key === "arrowleft" || key === "a" || key === "4") changeDirection("left");
  else if (key === "arrowright" || key === "d" || key === "6") changeDirection("right");
  else if (key === "5" || key === " ") togglePause();
});

window.addEventListener("resize", resizeCanvas);

showOverlay("NOKIA", "PRESS 5 TO START");
resizeCanvas();
