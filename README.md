# 🏎️ Turbo Drift

**A fast, feature-rich 3D browser racing game** built with [Three.js](https://threejs.org/) and vanilla JavaScript.

No install. No build step. Just open and play.

---

## 🎮 Features

- **Real 3D graphics** – detailed cars, metal materials, glass, headlights & spoilers
- **Rotating wheels** and dynamic exhaust particles
- **Nitro boost** – hold Shift for a speed surge (blue trail + camera FOV effect)
- **Armor system** – survive 3 hits before crashing out
- **Power-ups** floating on the road
- **Pause menu** (Esc)
- **Sound effects** (nitro, hit, pickup, crash)
- **Cinematic camera** that follows your car smoothly
- **Environment** – trees, street lamps with lights, mountains, fog, barriers
- **Increasing difficulty** as your score rises
- **High score** saved in localStorage

---

## 🖱️ Controls

| Key | Action |
|-------------|--------------------------------|
| `\u2190` / `A` | Steer left |
| `\u2192` / `D` | Steer right |
| `Shift` | Nitro boost |
| `Space` | Start race |
| `Esc` | Pause / Resume |

---

## ✨ Power-ups

| Color | Effect |
|----------|--------------------------------|
| 💧 Blue | Full nitro refill |
| 🛡️ Green | Temporary shield + restore 1 armor |
| ⭐ Yellow | +100 score bonus |

---

## 🚀 How to Run

### Option 1 – Open directly
```bash
# Windows
start index.html

# Mac
open index.html

# Linux
xdg-open index.html
```

### Option 2 – Local server (recommended)
```bash
python -m http.server 8000
```
Then open: **http://localhost:8000**

### Clone the repo
```bash
git clone https://github.com/Shanuka-Thanayaraj/car-game.git
cd car-game
```

---

## 📁 Project Structure

```
car-game/
├── index.html   # Main page + Three.js CDN
├── style.css    # HUD & UI styles
├── game.js      # Full 3D game logic
└── README.md    # This file
```

---

## 🛠️ Tech Stack

- **Three.js** (r128) – 3D rendering
- **Vanilla JavaScript** – game logic
- **Web Audio API** – sound effects
- **HTML5 + CSS3** – UI / HUD

---

## 🏆 Tips

- Save nitro for tight situations
- Grab green power-ups to stay alive longer
- Speed increases over time — stay alert!

---

**Made for fun. Drive safe (or don't).** 🚗💨
