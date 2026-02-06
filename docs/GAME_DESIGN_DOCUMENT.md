# Grove Keeper - Game Design Document

## Overview

**Grove Keeper** is a 2.5D isometric tree planting simulation game with mobile-first controls. Players take on the role of a humble farmer who cultivates forests, manages growth cycles, and builds thriving ecosystems.

---

## Brand Identity

### Name: Grove Keeper
*"Tend. Grow. Thrive."*

### Color Palette (Earth Tones)

| Name | Hex | Usage |
|------|-----|-------|
| Forest Green | `#2D5A27` | Primary brand, healthy trees |
| Bark Brown | `#5D4037` | UI elements, ground |
| Soil Dark | `#3E2723` | Background accents |
| Leaf Light | `#81C784` | Success states, new growth |
| Autumn Gold | `#FFB74D` | Rewards, highlights |
| Sky Mist | `#E8F5E9` | Background, light areas |
| Sunset Warm | `#FFAB91` | Warnings, attention |
| Earth Red | `#8D6E63` | Destructive actions |

### Typography
- **Headers**: Bold, organic rounded sans-serif
- **Body**: Clean, readable sans-serif
- **Game UI**: Pixel-influenced for retro charm

### Mascot: Oakley the Farmer
A cheerful, round-faced farmer with:
- Weathered straw hat with a seedling tucked in
- Green overalls with leaf patches
- Rosy cheeks and warm smile
- Small shovel always at the ready
- Boots caked with rich soil

---

## Core Gameplay Loop

### Macro Loop (Session Goals)
1. **Plan** - Survey land, decide what to plant
2. **Plant** - Place seeds in grid cells
3. **Nurture** - Water, fertilize, protect
4. **Harvest** - Collect mature trees for rewards
5. **Expand** - Unlock new areas and species

### Meso Loop (Individual Trees)
1. **Seed Selection** - Choose from unlocked species
2. **Placement** - Position on grid
3. **Growth Stages** - Seedling > Sapling > Young > Mature > Ancient
4. **Maintenance** - Handle pests, weather, soil depletion
5. **Completion** - Tree reaches target stage

### Micro Loop (Moment-to-Moment)
1. **Navigate** - Move farmer with joystick
2. **Interact** - Tap/hold to use tools
3. **Observe** - Watch growth animations
4. **React** - Address immediate needs

---

## Game Systems

### Grid System
- **Size**: Configurable (default 12x12)
- **Cell Types**: Soil, Water, Rock, Path
- **Visualization**: 2.5D isometric projection
- **Interaction**: Tap to select, hold to interact

### Tree Species

| Species | Difficulty | Growth Time | Rewards | Special |
|---------|------------|-------------|---------|---------|
| Oak | Easy | 5 min | 100 coins | Sturdy |
| Birch | Easy | 3 min | 60 coins | Fast growing |
| Pine | Medium | 8 min | 150 coins | Winter hardy |
| Maple | Medium | 7 min | 180 coins | Autumn colors |
| Cherry | Hard | 12 min | 300 coins | Blooming bonus |
| Redwood | Expert | 30 min | 1000 coins | Ancient growth |
| Willow | Medium | 6 min | 120 coins | Water lover |
| Bamboo | Hard | 2 min | 40 coins | Rapid spread |

### Growth Stages
1. **Seed** (0%) - Just planted
2. **Sprout** (10%) - Breaking soil
3. **Seedling** (25%) - Small shoot visible
4. **Sapling** (50%) - Thin trunk forming
5. **Young Tree** (75%) - Branch structure
6. **Mature** (100%) - Full canopy
7. **Ancient** (Bonus) - Rare achievement

### Tools

| Tool | Function | Unlock Cost |
|------|----------|-------------|
| Shovel | Dig/plant holes | Free |
| Watering Can | Hydrate trees | Free |
| Pruning Shears | Shape growth | 500 coins |
| Fertilizer | Speed growth | 200 coins |
| Axe | Remove dead trees | 300 coins |
| Rake | Clear debris | 100 coins |
| Seed Pouch | Carry more seeds | 400 coins |

---

## Progression System

### Experience Points (XP)
- Plant a tree: +10 XP
- Tree reaches maturity: +50 XP
- Ancient tree: +200 XP
- Clear debris: +5 XP
- Complete daily task: +100 XP

### Levels
Each level unlocks new content:
- Level 1-5: Basic trees, starter tools
- Level 6-10: Medium difficulty trees
- Level 11-15: Hard trees, premium tools
- Level 16-20: Expert trees, special areas
- Level 21+: Prestige rewards

### Currency
- **Coins**: Primary currency from harvests
- **Seeds**: Species-specific planting tokens
- **Acorns**: Premium currency for speedups

---

## Retention Mechanics

### Daily Rewards
- Day 1: 50 coins
- Day 2: 100 coins
- Day 3: Rare seed
- Day 4: 200 coins
- Day 5: Tool upgrade
- Day 6: 300 coins
- Day 7: Premium seed pack

### Achievements
- "First Sprout" - Plant your first tree
- "Green Thumb" - Grow 100 trees
- "Forest Guardian" - Maintain 50 mature trees
- "Ancient Keeper" - Grow an ancient tree
- "Collector" - Unlock all species
- "Master Gardener" - Reach level 20

### Seasonal Events
- **Spring Bloom**: Cherry blossom bonus
- **Summer Heat**: Drought challenges
- **Autumn Harvest**: Maple bonus rewards
- **Winter Rest**: Snow effects, evergreen focus

### Social Features
- Compare groves with friends
- Gift seeds to neighbors
- Cooperative planting events
- Leaderboards by grove value

---

## Technical Specifications

### Rendering
- Engine: BabylonJS with Reactylon integration
- View: 2.5D isometric (45-degree rotation)
- Grid: Decal-based ground textures
- Trees: Procedural generation with BabylonJS
- Skybox: Dynamic time-of-day cycle

### Controls
- **Movement**: nipplejs virtual joystick (bottom-left)
- **Actions**: Context-sensitive button (bottom-right)
- **UI**: Top bar for resources, radial menu for tools

### State Management
- ECS: Miniplex for entity management
- UI State: Zustand for React components
- Persistence: LocalStorage with cloud sync option

### Performance Targets
- 60 FPS on modern mobile devices
- < 3 second initial load
- < 100MB total asset size
- Offline-capable gameplay

---

## UI/UX Design

### Main Menu
- Logo with animated Oakley
- New Game / Continue Game buttons
- Settings gear icon
- Daily reward notification

### HUD Layout
```
┌─────────────────────────────────────┐
│ [Coins] [XP Bar] [Level]    [Menu]  │
├─────────────────────────────────────┤
│                                     │
│                                     │
│          GAME VIEWPORT              │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [JOYSTICK]              [TOOL/ACT]  │
└─────────────────────────────────────┘
```

### Tool Selection
- Radial menu activated by long-press
- Quick-swap with swipe gestures
- Visual feedback on selection

---

## Audio Design

### Music
- Ambient nature sounds
- Gentle instrumental during gameplay
- Triumphant fanfare for achievements

### Sound Effects
- Shovel digging
- Water splashing
- Leaves rustling
- Growth "pop" sounds
- UI interactions

---

## Future Roadmap

### Phase 1: Core Game
- Basic planting mechanics
- 4 tree species
- Essential tools
- Local save

### Phase 2: Expansion
- 4 additional species
- Weather system
- Achievements
- Cloud save

### Phase 3: Social
- Friend system
- Leaderboards
- Cooperative events
- Trading

### Phase 4: Premium
- Cosmetic customization
- Special tree variants
- Expanded grid sizes
- Premium events
