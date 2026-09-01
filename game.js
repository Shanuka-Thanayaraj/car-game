const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');

// Game state
let score = 0;
let highScore = localStorage.getItem('carGameHighScore') || 0;
highScoreEl.textContent = highScore;
let gameRunning = false;
let animationId;

// Player car
const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 100,
  width: 50,
  height: 80,
  speed: 6,
  color: '#00cec9'
};

// Obstacles (enemy cars)
let obstacles = [];
let obstacleSpeed = 4;
let spawnTimer = 0;
const spawnInterval = 60; // frames

// Road lines for scrolling effect
let roadLines = [];
for (let i = 0; i < 10; i++) {
  roadLines.push({ y: i * 70 });
}

// Controls
const keys = {
  left: false,
  right: false
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function drawRoad() {
  // Road background
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Side borders
  ctx.fillStyle = '#636e72';
  ctx.fillRect(0, 0, 20, canvas.height);
  ctx.fillRect(canvas.width - 20, 0, 20, canvas.height);

  // Center dashed lines
  ctx.fillStyle = '#dfe6e9';
  roadLines.forEach((line) => {
    ctx.fillRect(canvas.width / 2 - 5, line.y, 10, 40);
  });
}

function drawCar(x, y, width, height, color, isPlayer = false) {
  // Car body
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  // Roof
  ctx.fillStyle = isPlayer ? '#81ecec' : '#fab1a0';
  ctx.fillRect(x + 8, y + 15, width - 16, 30);

  // Windows
  ctx.fillStyle = '#74b9ff';
  ctx.fillRect(x + 10, y + 18, width - 20, 12);

  // Wheels
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(x - 4, y + 10, 8, 18);
  ctx.fillRect(x + width - 4, y + 10, 8, 18);
  ctx.fillRect(x - 4, y + height - 28, 8, 18);
  ctx.fillRect(x + width - 4, y + height - 28, 8, 18);
}

function spawnObstacle() {
  const laneWidth = (canvas.width - 40) / 3;
  const lane = Math.floor(Math.random() * 3);
  const x = 20 + lane * laneWidth + (laneWidth - 50) / 2;
  const colors = ['#e17055', '#fdcb6e', '#6c5ce7', '#fd79a8', '#a29bfe'];
  obstacles.push({
    x: x,
    y: -90,
    width: 50,
    height: 80,
    color: colors[Math.floor(Math.random() * colors.length)]
  });
}

function update() {
  if (!gameRunning) return;

  // Move player
  if (keys.left && player.x > 25) {
    player.x -= player.speed;
  }
  if (keys.right && player.x < canvas.width - player.width - 25) {
    player.x += player.speed;
  }

  // Scroll road lines
  roadLines.forEach((line) => {
    line.y += obstacleSpeed;
    if (line.y > canvas.height) {
      line.y = -50;
    }
  });

  // Spawn obstacles
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
    // Gradually increase difficulty
    if (obstacleSpeed < 12) {
      obstacleSpeed += 0.05;
    }
  }

  // Move obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].y += obstacleSpeed;

    // Collision detection
    if (
      player.x < obstacles[i].x + obstacles[i].width &&
      player.x + player.width > obstacles[i].x &&
      player.y < obstacles[i].y + obstacles[i].height &&
      player.y + player.height > obstacles[i].y
    ) {
      endGame();
      return;
    }

    // Remove off-screen obstacles & add score
    if (obstacles[i].y > canvas.height) {
      obstacles.splice(i, 1);
      score += 10;
      scoreEl.textContent = score;
    }
  }
}

function draw() {
  drawRoad();
  drawCar(player.x, player.y, player.width, player.height, player.color, true);

  obstacles.forEach((obs) => {
    drawCar(obs.x, obs.y, obs.width, obs.height, obs.color);
  });
}

function gameLoop() {
  update();
  draw();
  if (gameRunning) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  score = 0;
  scoreEl.textContent = score;
  obstacles = [];
  obstacleSpeed = 4;
  spawnTimer = 0;
  player.x = canvas.width / 2 - 25;
  gameRunning = true;
  gameOverEl.style.display = 'none';
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  gameLoop();
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);
  finalScoreEl.textContent = score;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('carGameHighScore', highScore);
    highScoreEl.textContent = highScore;
  }

  gameOverEl.style.display = 'block';
  restartBtn.style.display = 'inline-block';
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial draw
draw();
