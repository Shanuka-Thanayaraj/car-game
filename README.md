# 🏎️ 3D Car Racing Game

A fun **3D browser-based car racing game** built with **Three.js** + vanilla JavaScript.

## How to Play

1. Open `index.html` in your browser (or use a local server)
2. Click **Start Game** or press **Space**
3. Use **← →** Arrow keys or **A / D** to steer
4. Dodge the other cars and survive as long as possible!

## Features

- Real 3D graphics with Three.js
- Dynamic camera that follows your car
- Increasing speed & difficulty
- High score saved in localStorage
- Shadows & lighting
- No build step required

## Controls

| Key | Action |
|-----|--------|
| ← / A | Steer left |
| → / D | Steer right |
| Space | Start game |

## Run Locally

```bash
# Just open the file
start index.html          # Windows
open index.html          # Mac
xdg-open index.html      # Linux

# Or better – use a local server
python -m http.server 8000
# then open http://localhost:8000
```

## Project Structure

```
car-game/
├── index.html   # Main page + Three.js CDN
├── style.css    # UI styles
├── game.js      # 3D game logic
└── README.md
```

Enjoy the 3D race! 🚗🏎️
