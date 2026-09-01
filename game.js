// ======================================================
//  TURBO DRIFT - Full Featured 3D Racing
// ======================================================

const scoreEl      = document.getElementById('score');
const highScoreEl  = document.getElementById('highScore');
const speedEl      = document.getElementById('speed');
const startBtn     = document.getElementById('startBtn');
const restartBtn   = document.getElementById('restartBtn');
const resumeBtn    = document.getElementById('resumeBtn');
const gameOverEl   = document.getElementById('gameOver');
const pauseMenuEl  = document.getElementById('pauseMenu');
const finalScoreEl = document.getElementById('finalScore');
const messageEl    = document.getElementById('message');
const nitroFill    = document.getElementById('nitro-fill');
const healthBars   = document.querySelectorAll('.h-bar');

let score = 0;
let highScore = parseInt(localStorage.getItem('turboDriftHighScore') || '0');
highScoreEl.textContent = highScore;

let gameRunning = false;
let paused = false;
let clock = new THREE.Clock();
let currentSpeed = 0;

// Gameplay stats
let health = 3;
let nitro = 100;
let invincible = 0;          // seconds of invincibility
let moveSpeed = 0.55;
let baseSpeed = 0.55;
let nitroActive = false;
let spawnTimer = 0;
let powerupTimer = 0;
let steerVelocity = 0;

// -------------------- AUDIO (Web Audio) --------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, duration, type = 'square', vol = 0.08) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function sfxCrash()  { playTone(80, 0.4, 'sawtooth', 0.12); setTimeout(() => playTone(40, 0.5, 'sawtooth', 0.1), 100); }
function sfxHit()    { playTone(150, 0.2, 'square', 0.1); }
function sfxPickup() { playTone(600, 0.1, 'sine', 0.1); setTimeout(() => playTone(900, 0.15, 'sine', 0.08), 80); }
function sfxNitro()  { playTone(220, 0.08, 'sawtooth', 0.06); }

// -------------------- SCENE --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070f1c);
scene.fog = new THREE.FogExp2(0x070f1c, 0.011);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 6, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0x304060, 0.4));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.25);
sun.position.set(25, 45, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
sun.shadow.bias = -0.001;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x6080c0, 0x1a3a1a, 0.35));

// -------------------- ROAD & WORLD --------------------
const ROAD_WIDTH = 14;

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_WIDTH, 500),
  new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.88, metalness: 0.08 })
);
road.rotation.x = -Math.PI / 2;
road.position.z = -220;
road.receiveShadow = true;
scene.add(road);

const roadLines = [];
const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
for (let i = 0; i < 55; i++) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 4.5), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.04, -i * 11);
  scene.add(line);
  roadLines.push(line);
}

[-ROAD_WIDTH/2 + 0.35, ROAD_WIDTH/2 - 0.35].forEach(x => {
  const side = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 500),
    new THREE.MeshBasicMaterial({ color: 0xdfe6e9 })
  );
  side.rotation.x = -Math.PI / 2;
  side.position.set(x, 0.03, -220);
  scene.add(side);
});

function createBarrier(x) {
  const g = new THREE.Group();
  for (let i = 0; i < 45; i++) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 1.05, 7.5),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xecf0f1 : 0xe74c3c, roughness: 0.55 })
    );
    block.position.set(0, 0.52, -i * 11);
    block.castShadow = true;
    g.add(block);
  }
  g.position.x = x;
  scene.add(g);
  return g;
}
createBarrier(-ROAD_WIDTH/2 - 0.45);
createBarrier( ROAD_WIDTH/2 + 0.45);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(320, 700),
  new THREE.MeshStandardMaterial({ color: 0x0e3d22, roughness: 0.92 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.1, -120);
ground.receiveShadow = true;
scene.add(ground);

// Mountains
function mountain(x, z, s) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(16*s, 32*s, 6),
    new THREE.MeshStandardMaterial({ color: 0x1e2a3a, flatShading: true })
  );
  m.position.set(x, 8*s, z);
  scene.add(m);
}
[[-70,-170,1.5],[-100,-230,2], [80,-150,1.3],[110,-250,2.1],[-50,-290,1.7],[60,-310,1.6]].forEach(p => mountain(...p));

// Trees
function createTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.45, 2.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x4e342e })
  );
  trunk.position.y = 1.4; trunk.castShadow = true; g.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 7, 5),
    new THREE.MeshStandardMaterial({ color: 0x1e8449, flatShading: true })
  );
  leaves.position.y = 3.9; leaves.castShadow = true; g.add(leaves);
  return g;
}
const trees = [];
for (let i = 0; i < 36; i++) {
  const t1 = createTree(); t1.position.set(-17 - Math.random()*10, 0, -i*22 - Math.random()*8); scene.add(t1); trees.push(t1);
  const t2 = createTree(); t2.position.set( 17 + Math.random()*10, 0, -i*22 - Math.random()*8); scene.add(t2); trees.push(t2);
}

// Lamps
function createLamp(x) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 6.5, 6), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
  pole.position.y = 3.25; g.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff3c0 }));
  bulb.position.y = 6.6; g.add(bulb);
  const pl = new THREE.PointLight(0xfff0c0, 0.65, 22); pl.position.y = 6.5; g.add(pl);
  g.position.x = x;
  return g;
}
const lamps = [];
for (let i = 0; i < 22; i++) {
  const a = createLamp(-ROAD_WIDTH/2 - 2.2); a.position.z = -i*28; scene.add(a); lamps.push(a);
  const b = createLamp( ROAD_WIDTH/2 + 2.2); b.position.z = -i*28 - 14; scene.add(b); lamps.push(b);
}

// -------------------- CAR --------------------
function createDetailedCar(color, isPlayer = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.22 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.52, 4.3), bodyMat);
  body.position.y = 0.52; body.castShadow = true; g.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.22, 1.25), bodyMat);
  hood.position.set(0, 0.72, 1.35); hood.rotation.x = 0.2; hood.castShadow = true; g.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.95), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4 }));
  cabin.position.set(0, 1.1, -0.15); cabin.castShadow = true; g.add(cabin);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x74b9ff, transparent: true, opacity: 0.5, metalness: 0.9, roughness: 0.1 })
  );
  glass.position.set(0, 1.15, 0.82); glass.rotation.x = -0.28; g.add(glass);

  if (isPlayer) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.1, 0.45), new THREE.MeshStandardMaterial({ color: 0x00cec9, metalness: 0.85 }));
    spoiler.position.set(0, 1.3, -1.95); g.add(spoiler);
  }

  // Lights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfffff0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  [-0.68, 0.68].forEach(x => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), headMat); h.position.set(x, 0.52, 2.15); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.07), tailMat); t.position.set(x, 0.52, -2.15); g.add(t);
  });

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb2bec3, metalness: 0.9, roughness: 0.2 });
  const wheels = [];
  [[-1.02,1.35],[1.02,1.35],[-1.02,-1.35],[1.02,-1.35]].forEach(([x,z]) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat); tire.rotation.z = Math.PI/2; wg.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), rimMat); rim.rotation.z = Math.PI/2; wg.add(rim);
    wg.position.set(x, 0.4, z); wg.castShadow = true; g.add(wg); wheels.push(wg);
  });
  g.userData.wheels = wheels;
  return g;
}

const player = createDetailedCar(0x00cec9, true);
player.position.set(0, 0, 6);
scene.add(player);

// Nitro trail light
const nitroLight = new THREE.PointLight(0x74b9ff, 0, 12);
nitroLight.position.set(0, 0.5, -2.5);
player.add(nitroLight);

// -------------------- ENEMIES & POWERUPS --------------------
const enemies = [];
const powerups = [];
const enemyColors = [0xe17055, 0xfdcb6e, 0x6c5ce7, 0xfd79a8, 0xa29bfe, 0xff7675, 0x00b894, 0xe84393];

function spawnEnemy() {
  const enemy = createDetailedCar(enemyColors[Math.floor(Math.random()*enemyColors.length)]);
  const lane = (Math.floor(Math.random()*3) - 1) * 4.0;
  enemy.position.set(lane, 0, -100 - Math.random()*60);
  enemy.userData.speedMul = 0.85 + Math.random()*0.3;
  scene.add(enemy);
  enemies.push(enemy);
}

function createPowerup(type) {
  const g = new THREE.Group();
  const colors = { nitro: 0x74b9ff, shield: 0x00b894, score: 0xfdcb6e };
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7),
    new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 0.5, metalness: 0.6 })
  );
  g.add(mesh);
  const glow = new THREE.PointLight(colors[type], 0.8, 8);
  g.add(glow);
  g.userData.type = type;
  return g;
}

function spawnPowerup() {
  const types = ['nitro', 'shield', 'score'];
  const type = types[Math.floor(Math.random()*types.length)];
  const p = createPowerup(type);
  const lane = (Math.floor(Math.random()*3) - 1) * 4.0;
  p.position.set(lane, 1.2, -110 - Math.random()*40);
  scene.add(p);
  powerups.push(p);
}

// -------------------- PARTICLES --------------------
const particleCount = 80;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pMat = new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.22, transparent: true, opacity: 0.5, depthWrite: false });
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particleSystem = new THREE.Points(pGeo, pMat);
scene.add(particleSystem);
let pIdx = 0;

// -------------------- CONTROLS --------------------
const keys = { left: false, right: false, nitro: false };

document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight'|| e.code === 'KeyD') keys.right = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.nitro = true;
  if (e.code === 'Space' && !gameRunning && !paused) startGame();
  if (e.code === 'Escape' && gameRunning) togglePause();
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight'|| e.code === 'KeyD') keys.right = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.nitro = false;
});

// -------------------- UI HELPERS --------------------
function updateHealthUI() {
  healthBars.forEach((bar, i) => {
    bar.classList.toggle('empty', i >= health);
  });
}

function updateNitroUI() {
  nitroFill.style.width = Math.max(0, nitro) + '%';
}

// -------------------- GAME FLOW --------------------
function startGame() {
  score = 0; scoreEl.textContent = '0';
  health = 3; updateHealthUI();
  nitro = 100; updateNitroUI();
  invincible = 0;
  moveSpeed = 0.55; baseSpeed = 0.55;
  nitroActive = false;
  spawnTimer = 0; powerupTimer = 0;
  steerVelocity = 0; currentSpeed = 0;

  enemies.forEach(e => scene.remove(e)); enemies.length = 0;
  powerups.forEach(p => scene.remove(p)); powerups.length = 0;

  player.position.set(0, 0, 6);
  player.rotation.set(0, 0, 0);
  nitroLight.intensity = 0;

  gameRunning = true; paused = false;
  gameOverEl.classList.add('hidden');
  pauseMenuEl.classList.add('hidden');
  startBtn.classList.add('hidden');
  messageEl.textContent = '\u2190 \u2192 Steer  |  Shift Nitro  |  Esc Pause';
  messageEl.style.opacity = '0.75';
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function endGame() {
  gameRunning = false;
  sfxCrash();
  finalScoreEl.textContent = score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('turboDriftHighScore', highScore);
    highScoreEl.textContent = highScore;
  }
  gameOverEl.classList.remove('hidden');
  messageEl.textContent = '';
}

function togglePause() {
  paused = !paused;
  pauseMenuEl.classList.toggle('hidden', !paused);
  if (!paused) clock.getDelta(); // reset delta spike
}

function takeDamage() {
  if (invincible > 0) return;
  health--;
  updateHealthUI();
  invincible = 1.6;
  sfxHit();
  // screen shake via camera
  camera.position.x += (Math.random()-0.5) * 1.2;
  if (health <= 0) endGame();
}

// -------------------- UPDATE --------------------
function update(delta) {
  if (!gameRunning || paused) {
    if (!gameRunning) {
      camera.position.x = Math.sin(clock.elapsedTime * 0.25) * 1.8;
      camera.lookAt(0, 1, 0);
    }
    return;
  }

  // Nitro
  nitroActive = keys.nitro && nitro > 0;
  if (nitroActive) {
    nitro -= 28 * delta;
    moveSpeed = baseSpeed * 1.65;
    nitroLight.intensity = 1.8;
    sfxNitro();
  } else {
    moveSpeed += (baseSpeed - moveSpeed) * 0.08;
    nitroLight.intensity *= 0.9;
    if (nitro < 100) nitro += 7 * delta; // slow regen
  }
  nitro = Math.max(0, Math.min(100, nitro));
  updateNitroUI();

  // Steering
  if (keys.left)  steerVelocity -= 20 * delta;
  if (keys.right) steerVelocity += 20 * delta;
  steerVelocity *= (1 - 6 * delta);
  player.position.x += steerVelocity * delta * 2.4;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -5.3, 5.3);

  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -steerVelocity * 0.045, 0.12);
  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, Math.abs(steerVelocity) * 0.01, 0.1);

  // Speed display
  const targetKmh = 70 + moveSpeed * 160 + (nitroActive ? 40 : 0);
  currentSpeed += (targetKmh - currentSpeed) * 0.06;
  speedEl.textContent = Math.floor(currentSpeed);

  // Wheels
  const spin = moveSpeed * 28 * delta;
  player.userData.wheels.forEach(w => w.rotation.x += spin);

  // Exhaust particles
  const arr = particleSystem.geometry.attributes.position.array;
  const count = nitroActive ? 5 : 2;
  for (let i = 0; i < count; i++) {
    const idx = pIdx % particleCount;
    arr[idx*3]   = player.position.x + (Math.random()-0.5)*0.7;
    arr[idx*3+1] = 0.35 + Math.random()*0.3;
    arr[idx*3+2] = player.position.z - 2.3;
    pIdx++;
  }
  for (let i = 0; i < particleCount; i++) {
    arr[i*3+2] += moveSpeed * 45 * delta;
    arr[i*3+1] += 0.5 * delta;
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.material.color.set(nitroActive ? 0x74b9ff : 0xaabbcc);

  // World scroll
  const scroll = moveSpeed * 72 * delta;
  roadLines.forEach(l => { l.position.z += scroll; if (l.position.z > 25) l.position.z -= 605; });
  trees.forEach(t => { t.position.z += scroll; if (t.position.z > 30) t.position.z -= 800; });
  lamps.forEach(l => { l.position.z += scroll; if (l.position.z > 30) l.position.z -= 620; });

  // Spawn
  spawnTimer += delta;
  if (spawnTimer > Math.max(0.5, 1.25 - baseSpeed * 0.45)) {
    spawnEnemy(); spawnTimer = 0;
  }
  powerupTimer += delta;
  if (powerupTimer > 4.5) {
    spawnPowerup(); powerupTimer = 0;
  }

  // Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.position.z += scroll * e.userData.speedMul;
    e.userData.wheels.forEach(w => w.rotation.x += spin * 0.85);

    const dx = Math.abs(player.position.x - e.position.x);
    const dz = Math.abs(player.position.z - e.position.z);
    if (dx < 1.95 && dz < 3.9) {
      takeDamage();
      // push enemy away a bit
      e.position.z -= 6;
    }

    if (e.position.z > 22) {
      scene.remove(e); enemies.splice(i, 1);
      score += nitroActive ? 25 : 15;
      scoreEl.textContent = score;
      if (baseSpeed < 1.5) baseSpeed += 0.01;
    }
  }

  // Powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.position.z += scroll;
    p.rotation.y += 2.5 * delta;
    p.position.y = 1.2 + Math.sin(clock.elapsedTime * 4 + i) * 0.25;

    const dx = Math.abs(player.position.x - p.position.x);
    const dz = Math.abs(player.position.z - p.position.z);
    if (dx < 1.8 && dz < 2.5) {
      sfxPickup();
      if (p.userData.type === 'nitro')  { nitro = 100; updateNitroUI(); }
      if (p.userData.type === 'shield') { invincible = 4; health = Math.min(3, health + 1); updateHealthUI(); }
      if (p.userData.type === 'score')  { score += 100; scoreEl.textContent = score; }
      scene.remove(p); powerups.splice(i, 1);
    } else if (p.position.z > 25) {
      scene.remove(p); powerups.splice(i, 1);
    }
  }

  // Invincibility blink
  if (invincible > 0) {
    invincible -= delta;
    player.visible = Math.floor(invincible * 10) % 2 === 0;
  } else {
    player.visible = true;
  }

  // Camera
  const fovTarget = nitroActive ? 78 : 68;
  camera.fov += (fovTarget - camera.fov) * 0.08;
  camera.updateProjectionMatrix();

  const camX = player.position.x * 0.7;
  camera.position.x += (camX - camera.position.x) * 0.08;
  camera.position.y = 5.4 + Math.sin(clock.elapsedTime * 2.2) * 0.07;
  camera.position.z = player.position.z + 12.5;
  camera.lookAt(player.position.x * 0.4, 1.1, player.position.z - 9);
}

// -------------------- LOOP --------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  update(delta);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);
