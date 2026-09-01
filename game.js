// ======================
// 3D Car Racing Game
// ======================

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const messageEl = document.getElementById('message');

let score = 0;
let highScore = parseInt(localStorage.getItem('carGame3DHighScore') || '0');
highScoreEl.textContent = highScore;

let gameRunning = false;
let clock = new THREE.Clock();

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue
scene.fog = new THREE.Fog(0x87ceeb, 40, 180);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// ===== Road =====
const roadWidth = 12;
const roadLength = 400;
const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.position.z = -roadLength / 2 + 20;
road.receiveShadow = true;
scene.add(road);

// Road lines (center dashed)
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lines = [];
for (let i = 0; i < 40; i++) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.02, -i * 10);
  scene.add(line);
  lines.push(line);
}

// Side barriers
function createBarrier(x) {
  const geo = new THREE.BoxGeometry(0.6, 1.2, roadLength);
  const mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
  const barrier = new THREE.Mesh(geo, mat);
  barrier.position.set(x, 0.6, -roadLength / 2 + 20);
  barrier.castShadow = true;
  scene.add(barrier);
}
createBarrier(-roadWidth / 2 - 0.3);
createBarrier(roadWidth / 2 + 0.3);

// Ground (grass)
const groundGeo = new THREE.PlaneGeometry(200, 500);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.position.z = -100;
ground.receiveShadow = true;
scene.add(ground);

// ===== Player Car =====
function createCar(color = 0x00cec9) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.6, 4.2),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x2d3436 })
  );
  cabin.position.set(0, 1.15, -0.3);
  cabin.castShadow = true;
  group.add(cabin);

  // Windows
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, transparent: true, opacity: 0.7 });
  const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), windowMat);
  frontWindow.position.set(0, 1.15, 0.8);
  group.add(frontWindow);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wheelPositions = [
    [-1.1, 0.4, 1.3],
    [1.1, 0.4, 1.3],
    [-1.1, 0.4, -1.3],
    [1.1, 0.4, -1.3]
  ];
  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    wheel.castShadow = true;
    group.add(wheel);
  });

  return group;
}

const player = createCar(0x00cec9);
player.position.set(0, 0, 5);
scene.add(player);

// ===== Enemy cars =====
const enemies = [];
const enemyColors = [0xe17055, 0xfdcb6e, 0x6c5ce7, 0xfd79a8, 0xa29bfe, 0xff7675];

function spawnEnemy() {
  const color = enemyColors[Math.floor(Math.random() * enemyColors.length)];
  const enemy = createCar(color);
  const lane = (Math.floor(Math.random() * 3) - 1) * 3.5; // -3.5, 0, 3.5
  enemy.position.set(lane, 0, -80 - Math.random() * 40);
  scene.add(enemy);
  enemies.push(enemy);
}

// ===== Controls =====
const keys = { left: false, right: false };

document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' && !gameRunning) startGame();
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});

// ===== Game logic =====
let speed = 0.4;
let spawnTimer = 0;

function startGame() {
  score = 0;
  scoreEl.textContent = '0';
  speed = 0.4;
  spawnTimer = 0;

  // Remove old enemies
  enemies.forEach(e => scene.remove(e));
  enemies.length = 0;

  player.position.set(0, 0, 5);
  gameRunning = true;
  gameOverEl.classList.add('hidden');
  startBtn.classList.add('hidden');
  messageEl.textContent = 'Use ← → or A D to steer';
}

function endGame() {
  gameRunning = false;
  finalScoreEl.textContent = score;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('carGame3DHighScore', highScore);
    highScoreEl.textContent = highScore;
  }

  gameOverEl.classList.remove('hidden');
  messageEl.textContent = 'Crashed!';
}

function update(delta) {
  if (!gameRunning) return;

  // Move player left/right
  if (keys.left) player.position.x -= 0.25;
  if (keys.right) player.position.x += 0.25;

  // Limit to road
  player.position.x = Math.max(-4.5, Math.min(4.5, player.position.x));

  // Slight banking
  player.rotation.z = -player.position.x * 0.05;

  // Move road lines for illusion of speed
  lines.forEach(line => {
    line.position.z += speed * 60 * delta;
    if (line.position.z > 20) line.position.z -= 400;
  });

  // Spawn enemies
  spawnTimer += delta;
  if (spawnTimer > 1.1) {
    spawnEnemy();
    spawnTimer = 0;
  }

  // Move enemies toward player
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.position.z += speed * 60 * delta;

    // Collision (simple box)
    const dx = Math.abs(player.position.x - enemy.position.x);
    const dz = Math.abs(player.position.z - enemy.position.z);
    if (dx < 2.2 && dz < 4.2) {
      endGame();
      return;
    }

    // Passed the player → score + remove
    if (enemy.position.z > 15) {
      scene.remove(enemy);
      enemies.splice(i, 1);
      score += 10;
      scoreEl.textContent = score;

      // Increase speed gradually
      if (speed < 1.2) speed += 0.008;
    }
  }

  // Camera follow
  camera.position.x += (player.position.x - camera.position.x) * 0.08;
  camera.position.z = player.position.z + 12;
  camera.lookAt(player.position.x, 1, player.position.z - 5);
}

// ===== Animation loop =====
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  update(delta);
  renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
