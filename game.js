// ======================================================
//  TURBO DRIFT - Impressive 3D Car Racing Game
// ======================================================

const scoreEl     = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const speedEl     = document.getElementById('speed');
const startBtn    = document.getElementById('startBtn');
const restartBtn  = document.getElementById('restartBtn');
const gameOverEl  = document.getElementById('gameOver');
const finalScoreEl= document.getElementById('finalScore');
const messageEl   = document.getElementById('message');

let score = 0;
let highScore = parseInt(localStorage.getItem('turboDriftHighScore') || '0');
highScoreEl.textContent = highScore;

let gameRunning = false;
let clock = new THREE.Clock();
let currentSpeed = 0;          // visual speed in km/h
let targetSpeed = 0;

// -------------------- SCENE --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1628);
scene.fog = new THREE.FogExp2(0x0a1628, 0.012);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 6, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// -------------------- LIGHTS --------------------
const ambient = new THREE.AmbientLight(0x4060a0, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.001;
scene.add(sun);

// Hemisphere for nicer sky light
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x1a3a1a, 0.35);
scene.add(hemi);

// -------------------- ROAD & ENVIRONMENT --------------------
const ROAD_WIDTH = 14;
const ROAD_LENGTH = 500;

// Asphalt
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 })
);
road.rotation.x = -Math.PI / 2;
road.position.z = -ROAD_LENGTH / 2 + 30;
road.receiveShadow = true;
scene.add(road);

// Center dashed lines
const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
const roadLines = [];
for (let i = 0; i < 50; i++) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 5), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.03, -i * 12);
  scene.add(line);
  roadLines.push(line);
}

// Side white lines
[-ROAD_WIDTH/2 + 0.4, ROAD_WIDTH/2 - 0.4].forEach(x => {
  const side = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, ROAD_LENGTH),
    new THREE.MeshBasicMaterial({ color: 0xecf0f1 })
  );
  side.rotation.x = -Math.PI / 2;
  side.position.set(x, 0.025, -ROAD_LENGTH/2 + 30);
  scene.add(side);
});

// Barriers (red-white)
function createBarrier(x) {
  const group = new THREE.Group();
  for (let i = 0; i < 40; i++) {
    const color = i % 2 === 0 ? 0xe74c3c : 0xecf0f1;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
    );
    block.position.set(0, 0.55, -i * 12);
    block.castShadow = true;
    group.add(block);
  }
  group.position.x = x;
  scene.add(group);
  return group;
}
const leftBarrier  = createBarrier(-ROAD_WIDTH/2 - 0.5);
const rightBarrier = createBarrier( ROAD_WIDTH/2 + 0.5);

// Grass / ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 600),
  new THREE.MeshStandardMaterial({ color: 0x145a32, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.position.z = -100;
ground.receiveShadow = true;
scene.add(ground);

// Distant mountains (simple low-poly)
function createMountain(x, z, scale) {
  const geo = new THREE.ConeGeometry(18 * scale, 35 * scale, 5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, 10 * scale, z);
  scene.add(m);
}
createMountain(-60, -180, 1.4);
createMountain(-90, -220, 1.8);
createMountain(70, -160, 1.2);
createMountain(100, -240, 2.0);
createMountain(-40, -280, 1.6);
createMountain(50, -300, 1.5);

// Trees along the road
function createTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x5d4037 })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  group.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0x27ae60, flatShading: true })
  );
  leaves.position.y = 4.2;
  leaves.castShadow = true;
  group.add(leaves);
  return group;
}

const trees = [];
for (let i = 0; i < 30; i++) {
  const t1 = createTree();
  t1.position.set(-18 - Math.random()*8, 0, -i * 25 - Math.random()*10);
  scene.add(t1);
  trees.push(t1);

  const t2 = createTree();
  t2.position.set(18 + Math.random()*8, 0, -i * 25 - Math.random()*10);
  scene.add(t2);
  trees.push(t2);
}

// Street lamps
function createLamp(x) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 7, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
  );
  pole.position.y = 3.5;
  group.add(pole);

  const lightBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
  );
  lightBulb.position.y = 7.1;
  group.add(lightBulb);

  const point = new THREE.PointLight(0xfff0c0, 0.7, 25);
  point.position.y = 7;
  group.add(point);

  group.position.x = x;
  return group;
}

const lamps = [];
for (let i = 0; i < 20; i++) {
  const l1 = createLamp(-ROAD_WIDTH/2 - 2);
  l1.position.z = -i * 30;
  scene.add(l1);
  lamps.push(l1);

  const l2 = createLamp(ROAD_WIDTH/2 + 2);
  l2.position.z = -i * 30 - 15;
  scene.add(l2);
  lamps.push(l2);
}

// -------------------- CAR FACTORY --------------------
function createDetailedCar(color, isPlayer = false) {
  const group = new THREE.Group();

  // Main body
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.7,
    roughness: 0.25
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Hood slope
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 1.3), bodyMat);
  hood.position.set(0, 0.75, 1.4);
  hood.rotation.x = 0.18;
  hood.castShadow = true;
  group.add(hood);

  // Cabin
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.4, roughness: 0.3 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 2.0), cabinMat);
  cabin.position.set(0, 1.15, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Glass
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x74b9ff,
    transparent: true,
    opacity: 0.55,
    metalness: 0.9,
    roughness: 0.1
  });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.08), glassMat);
  windshield.position.set(0, 1.2, 0.85);
  windshield.rotation.x = -0.25;
  group.add(windshield);

  // Rear spoiler for player
  if (isPlayer) {
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x00cec9, metalness: 0.8 })
    );
    spoiler.position.set(0, 1.35, -2.0);
    group.add(spoiler);
  }

  // Headlights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  [-0.7, 0.7].forEach(x => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headMat);
    light.position.set(x, 0.55, 2.2);
    group.add(light);
  });

  // Taillights
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
  [-0.7, 0.7].forEach(x => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), tailMat);
    light.position.set(x, 0.55, -2.2);
    group.add(light);
  });

  // Wheels + store them for rotation
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
  const rimMat   = new THREE.MeshStandardMaterial({ color: 0xb2bec3, metalness: 0.9, roughness: 0.2 });

  const wheelPositions = [
    { x: -1.05, z:  1.4 },
    { x:  1.05, z:  1.4 },
    { x: -1.05, z: -1.4 },
    { x:  1.05, z: -1.4 }
  ];

  const wheels = [];
  wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.z = Math.PI / 2;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(pos.x, 0.42, pos.z);
    wheelGroup.castShadow = true;
    group.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  group.userData.wheels = wheels;
  return group;
}

// Player
const player = createDetailedCar(0x00cec9, true);
player.position.set(0, 0, 6);
scene.add(player);

// -------------------- ENEMIES --------------------
const enemies = [];
const enemyColors = [0xe17055, 0xfdcb6e, 0x6c5ce7, 0xfd79a8, 0xa29bfe, 0xff7675, 0x00b894];

function spawnEnemy() {
  const color = enemyColors[Math.floor(Math.random() * enemyColors.length)];
  const enemy = createDetailedCar(color);
  const lane = (Math.floor(Math.random() * 3) - 1) * 4.0;
  enemy.position.set(lane, 0, -90 - Math.random() * 50);
  scene.add(enemy);
  enemies.push(enemy);
}

// -------------------- PARTICLES (exhaust) --------------------
const particleCount = 60;
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const particleMat = new THREE.PointsMaterial({
  color: 0xaaaaaa,
  size: 0.25,
  transparent: true,
  opacity: 0.55,
  depthWrite: false
});
for (let i = 0; i < particleCount; i++) {
  positions[i*3] = 0;
  positions[i*3+1] = 0;
  positions[i*3+2] = 0;
}
particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleSystem = new THREE.Points(particles, particleMat);
scene.add(particleSystem);
let particleIndex = 0;

// -------------------- CONTROLS --------------------
const keys = { left: false, right: false };

document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight'|| e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' && !gameRunning) startGame();
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight'|| e.code === 'KeyD') keys.right = false;
});

// -------------------- GAME STATE --------------------
let moveSpeed = 0.55;
let spawnTimer = 0;
let steerVelocity = 0;

function startGame() {
  score = 0;
  scoreEl.textContent = '0';
  moveSpeed = 0.55;
  spawnTimer = 0;
  steerVelocity = 0;
  currentSpeed = 0;

  enemies.forEach(e => scene.remove(e));
  enemies.length = 0;

  player.position.set(0, 0, 6);
  player.rotation.set(0, 0, 0);

  gameRunning = true;
  gameOverEl.classList.add('hidden');
  startBtn.classList.add('hidden');
  messageEl.textContent = 'Dodge the traffic!';
  messageEl.style.opacity = '0.7';
}

function endGame() {
  gameRunning = false;
  finalScoreEl.textContent = score;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('turboDriftHighScore', highScore);
    highScoreEl.textContent = highScore;
  }

  gameOverEl.classList.remove('hidden');
  messageEl.textContent = '';
}

// -------------------- UPDATE --------------------
function update(delta) {
  if (!gameRunning) {
    // idle camera sway
    camera.position.x = Math.sin(clock.elapsedTime * 0.3) * 1.5;
    camera.lookAt(0, 1, 0);
    return;
  }

  // Steering with inertia
  if (keys.left)  steerVelocity -= 18 * delta;
  if (keys.right) steerVelocity += 18 * delta;
  steerVelocity *= (1 - 5 * delta); // friction
  player.position.x += steerVelocity * delta * 2.2;

  // Clamp to road
  player.position.x = THREE.MathUtils.clamp(player.position.x, -5.2, 5.2);

  // Body roll + pitch feel
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -steerVelocity * 0.04, 0.1);
  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, Math.abs(steerVelocity) * 0.008, 0.1);

  // Speed feel
  targetSpeed = 80 + moveSpeed * 140;
  currentSpeed += (targetSpeed - currentSpeed) * 0.05;
  speedEl.textContent = Math.floor(currentSpeed);

  // Rotate wheels
  const wheelSpin = moveSpeed * 25 * delta;
  player.userData.wheels.forEach(w => w.rotation.x += wheelSpin);

  // Exhaust particles
  const posArr = particleSystem.geometry.attributes.position.array;
  for (let i = 0; i < 3; i++) {
    const idx = particleIndex % particleCount;
    posArr[idx*3]     = player.position.x + (Math.random()-0.5)*0.6;
    posArr[idx*3 + 1] = 0.4 + Math.random()*0.3;
    posArr[idx*3 + 2] = player.position.z - 2.4;
    particleIndex++;
  }
  // Fade them backward
  for (let i = 0; i < particleCount; i++) {
    posArr[i*3 + 2] += moveSpeed * 40 * delta;
    posArr[i*3 + 1] += 0.4 * delta;
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;

  // Scroll world elements for infinite feel
  const scroll = moveSpeed * 70 * delta;

  roadLines.forEach(l => {
    l.position.z += scroll;
    if (l.position.z > 25) l.position.z -= 600;
  });

  trees.forEach(t => {
    t.position.z += scroll;
    if (t.position.z > 30) t.position.z -= 750;
  });

  lamps.forEach(l => {
    l.position.z += scroll;
    if (l.position.z > 30) l.position.z -= 600;
  });

  // Spawn enemies
  spawnTimer += delta;
  const spawnRate = Math.max(0.55, 1.3 - moveSpeed * 0.4);
  if (spawnTimer > spawnRate) {
    spawnEnemy();
    spawnTimer = 0;
  }

  // Move + collide enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.position.z += scroll;
    e.userData.wheels.forEach(w => w.rotation.x += wheelSpin * 0.9);

    // Collision
    const dx = Math.abs(player.position.x - e.position.x);
    const dz = Math.abs(player.position.z - e.position.z);
    if (dx < 2.0 && dz < 4.0) {
      endGame();
      return;
    }

    if (e.position.z > 20) {
      scene.remove(e);
      enemies.splice(i, 1);
      score += 15;
      scoreEl.textContent = score;
      if (moveSpeed < 1.45) moveSpeed += 0.012;
    }
  }

  // Camera – cinematic follow
  const camTargetX = player.position.x * 0.75;
  camera.position.x += (camTargetX - camera.position.x) * 0.07;
  camera.position.y = 5.5 + Math.sin(clock.elapsedTime * 2) * 0.08;
  camera.position.z = player.position.z + 13;
  camera.lookAt(player.position.x * 0.5, 1.2, player.position.z - 8);
}

// -------------------- LOOP --------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  update(delta);
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
