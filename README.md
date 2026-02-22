# Browser RTS Game

A real-time strategy game built entirely in the browser using TypeScript, Phaser 3, and procedurally generated graphics and sound.

![RTS Game](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Phaser 3](https://img.shields.io/badge/Phaser-3-blue)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

## 🎮 Features

### Core Gameplay
- **Resource Gathering**: Collect food, wood, and gold from resource nodes
- **Unit Training**: Spawn villagers and military units (Spearmen, Archers, Horsemen)
- **Combat System**: Automatic targeting and attacking with unit-specific stats
- **Fog of War**: Strategic vision system - see only around your units
- **Unit Selection**: Click to select units, right-click to move

### Technical Highlights
- **Zero Assets**: All graphics procedurally generated using Phaser Graphics API
- **Procedural Audio**: Attack sounds synthesized using Web Audio API
- **Collision Avoidance**: Units don't overlap and navigate around each other
- **Auto-Gathering**: Villagers automatically start gathering when near resources
- **Resource Depletion**: Resource nodes deplete over time and disappear when exhausted

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd browser-rts-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Deploying to GitHub Pages

This project includes automated deployment to GitHub Pages via GitHub Actions.

**Setup:**

1. **Update the base path** in `vite.config.ts`:
   ```typescript
   base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
   ```
   Replace `your-repo-name` with your actual GitHub repository name.

2. **Enable GitHub Pages** in your repository:
   - Go to repository Settings → Pages
   - Under "Build and deployment", select:
     - Source: **GitHub Actions**

3. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

4. **Wait for deployment**: The Actions tab will show the workflow progress. Once complete, your game will be live at:
   ```
   https://your-username.github.io/your-repo-name/
   ```

**Manual deployment** (alternative):
```bash
npm run build
npx gh-pages -d dist
```

## 🎯 Game Mechanics

### Resources
- **Food** (🌾): Gathered from farms - used to train all units
- **Wood** (🌲): Gathered from trees - required for Spearmen and Archers
- **Gold** (⚒️): Gathered from mines - required for Horsemen

### Units

| Unit | HP | Attack | Armor | Range | Speed | Cost |
|------|-----|--------|-------|-------|-------|------|
| **Villager** | 40 | 2 | 0 | 10px | 80 | 50 food |
| **Spearman** | 60 | 8 | 1 | 18px | 70 | 50 food, 30 wood |
| **Archer** | 40 | 7 | 0 | 120px | 75 | 35 food, 45 wood |
| **Horseman** | 80 | 10 | 1 | 24px | 110 | 70 food, 40 gold |

### Controls
- **Left Click**: Select unit(s)
- **Right Click**: Move selected units to location
- **Unit Training**: Click buttons in the Actions panel (bottom right)
- **Sound Toggles**: Top-right corner - music and SFX buttons

### Combat
- Units automatically attack the nearest enemy when in range
- Damage calculation: `max(1, attack - enemy_armor)`
- 1 second cooldown between attacks
- Different attack sounds per unit type (arrow whistle, spear thrust, etc.)

### Resource Gathering
- Villagers automatically gather from nearby resources (150px range)
- Multiple villagers can gather from the same resource
- Gather rates (per second):
  - Food: 0.8/sec per villager
  - Wood: 0.7/sec per villager
  - Gold: 0.5/sec per villager

## 📁 Project Structure

```
src/
├── game/
│   ├── core/
│   │   ├── GameState.ts      # Core game state types and data
│   │   └── Systems.ts         # Game logic (movement, combat, resources)
│   ├── rendering/
│   │   ├── MapRenderer.ts     # Background terrain
│   │   ├── UnitRenderer.ts    # Unit graphics and animations
│   │   ├── ResourceRenderer.ts # Resource node graphics
│   │   └── FogOfWarRenderer.ts # Fog of war overlay
│   ├── input/
│   │   └── InputHandler.ts    # Mouse input and unit selection
│   ├── scenes/
│   │   └── MainScene.ts       # Phaser scene setup
│   └── GameClient.ts          # Main game coordinator
├── ui/
│   └── HUD.ts                 # Resource bar and action panels
├── audio/
│   ├── music.ts               # Background music system
│   └── sfx.ts                 # Procedural sound effects
├── style.css                  # UI styling
└── main.ts                    # Entry point
```

## 🎨 Visual Design

All graphics are drawn procedurally using Phaser's Graphics API:
- **Farms**: Crop rows, farmhouse, fence posts
- **Trees**: Multiple tree cluster with varied sizes
- **Mines**: Mountain silhouette with gold veins and entrance
- **Units**: Circular bodies with unit-type specific weapons
- **Fog of War**: Grid-based overlay (32×32px cells)

## 🔊 Audio System

### Music
- Background music loaded from `/public/music/background.mp3`
- Toggle button in top-right corner
- Persists preference to localStorage

### Sound Effects
- Procedurally generated using Web Audio API oscillators
- **Arrow**: Sine wave sweep (800→400Hz) - whistle sound
- **Spear**: Sawtooth wave + noise burst - metallic thrust
- **Melee**: Triangle wave (120→60Hz) - dull thud
- **Lance**: Combined sine + square waves - heavy impact

## 🗺️ Fog of War

- **Grid-based**: 32×32px cells covering 1280×720 world
- **Three states**:
  - Unexplored (black, 92% opacity)
  - Explored (black, 55% opacity)
  - Visible (transparent)
- **Vision ranges**: Villager 100px, Spearman 120px, Archer 150px, Horseman 140px
- **Entity filtering**: Enemy units hidden in fog, resources always visible

## 🛠️ Tech Stack

- **TypeScript**: Type-safe game logic
- **Phaser 3**: Game engine and rendering
- **Vite**: Build tool and dev server
- **Web Audio API**: Procedural sound synthesis
- **localStorage**: Save user preferences (sound settings)

## 🎯 Gameplay Tips

1. **Start by training villagers** to boost resource income
2. **Position villagers near resources** - they auto-gather within 150px
3. **Balance your economy** - food for growth, wood for basic military, gold for cavalry
4. **Archers have long range** - keep them behind your frontline
5. **Horsemen are fast** - use them for hit-and-run tactics
6. **Watch the fog** - enemies can surprise you from unexplored areas

## 🚧 Development

### Running Tests
```bash
npm run test
```

### Linting
```bash
npm run lint
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This is an educational project demonstrating:
- Entity-component patterns in game development
- Immutable state management
- Procedural content generation
- Real-time strategy game mechanics

---

**Built with ❤️ using TypeScript and Phaser 3**
