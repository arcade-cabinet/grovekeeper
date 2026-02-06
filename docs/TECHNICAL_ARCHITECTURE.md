# Grove Keeper - Technical Architecture

## Overview

This document outlines the technical architecture for Grove Keeper, a 2.5D tree planting game built with React, BabylonJS, and modern web technologies.

---

## Technology Stack

### Core Framework
- **React 19**: UI rendering and component architecture
- **TypeScript**: Type safety and developer experience
- **Vite**: Build tool and development server

### 3D Rendering
- **BabylonJS 8.x**: 3D engine for rendering
- **Reactylon**: React bindings for BabylonJS
- **BabylonJS Procedural Textures**: Ground and sky textures
- **BabylonJS Materials**: PBR and procedural materials

### State Management
- **Miniplex**: Entity Component System (ECS) for game entities
- **Zustand**: React state for UI and game settings

### Controls
- **nipplejs**: Virtual joystick for mobile controls

### Testing
- **Vitest**: Unit and integration testing
- **Testing Library**: React component testing

### Code Quality
- **Biome 2.3**: Linting and formatting

---

## Directory Structure

```
src/
├── game/
│   ├── ecs/
│   │   ├── world.ts          # Miniplex world setup
│   │   ├── entities.ts       # Entity type definitions
│   │   └── archetypes.ts     # Common entity archetypes
│   ├── systems/
│   │   ├── movement.ts       # Player movement system
│   │   ├── growth.ts         # Tree growth system
│   │   ├── interaction.ts    # Player-grid interaction
│   │   ├── weather.ts        # Weather effects
│   │   └── progression.ts    # XP and level system
│   ├── components/
│   │   ├── Position.ts       # 3D position component
│   │   ├── Renderable.ts     # Visual representation
│   │   ├── Tree.ts           # Tree-specific data
│   │   ├── Player.ts         # Player state
│   │   ├── Tool.ts           # Tool properties
│   │   └── GridCell.ts       # Grid cell state
│   ├── scenes/
│   │   ├── GameScene.tsx     # Main game scene
│   │   ├── MenuScene.tsx     # Main menu scene
│   │   └── LoadingScene.tsx  # Asset loading
│   ├── ui/
│   │   ├── HUD.tsx           # In-game HUD
│   │   ├── MainMenu.tsx      # Main menu UI
│   │   ├── ToolWheel.tsx     # Tool selection
│   │   ├── Joystick.tsx      # nipplejs wrapper
│   │   └── ResourceBar.tsx   # Coins/XP display
│   ├── hooks/
│   │   ├── useGameLoop.ts    # Main game tick
│   │   ├── useInput.ts       # Input handling
│   │   └── usePersistence.ts # Save/load
│   ├── utils/
│   │   ├── grid.ts           # Grid calculations
│   │   ├── procedural.ts     # Procedural generation
│   │   └── math.ts           # Math utilities
│   ├── assets/
│   │   └── index.ts          # Asset manifest
│   └── constants/
│       ├── trees.ts          # Tree definitions
│       ├── tools.ts          # Tool definitions
│       └── config.ts         # Game configuration
├── components/
│   └── ui/                   # shadcn/ui components
├── __tests__/
│   ├── ecs/                  # ECS tests
│   ├── systems/              # System tests
│   └── components/           # Component tests
└── App.tsx                   # Application entry
```

---

## Entity Component System (ECS)

### Why Miniplex?
- React-first design
- Type-safe queries
- Efficient iteration
- Simple API

### Entity Types

```typescript
// Base entity shape
interface Entity {
  id: string;
  position?: Position;
  renderable?: Renderable;
  tree?: TreeComponent;
  player?: PlayerComponent;
  gridCell?: GridCellComponent;
  tool?: ToolComponent;
}
```

### Archetypes

```typescript
// Tree entity
const treeArchetype = {
  position: { x: 0, y: 0, z: 0 },
  tree: { species: 'oak', growthStage: 0, health: 100 },
  renderable: { meshId: null, visible: true }
};

// Player entity
const playerArchetype = {
  position: { x: 0, y: 0, z: 0 },
  player: { name: 'Oakley', coins: 0, xp: 0, level: 1 },
  renderable: { meshId: null, visible: true }
};
```

### Systems

Systems process entities each frame:

```typescript
// Growth system example
function growthSystem(world: World, deltaTime: number) {
  for (const entity of world.with('tree', 'position')) {
    entity.tree.growthProgress += entity.tree.growthRate * deltaTime;
    if (entity.tree.growthProgress >= entity.tree.nextStageThreshold) {
      advanceGrowthStage(entity);
    }
  }
}
```

---

## Rendering Pipeline

### Scene Setup
1. Create BabylonJS engine
2. Initialize scene with Reactylon
3. Set up isometric camera (45-degree angle)
4. Create procedural ground grid
5. Add dynamic skybox

### Grid Rendering
- Ground plane with grid decals
- Cell highlighting for interaction
- Procedural soil textures
- Water/rock cell variations

### Tree Rendering
- BabylonJS procedural tree generation
- Growth stage interpolation
- LOD for distant trees
- Shadow casting

### Post-Processing
- Ambient occlusion
- Soft shadows
- Color grading (earth tones)

---

## Input System

### Joystick Configuration
```typescript
const joystickConfig = {
  zone: document.getElementById('joystick-zone'),
  mode: 'static',
  position: { left: '80px', bottom: '80px' },
  size: 120,
  color: 'rgba(45, 90, 39, 0.5)'
};
```

### Input Mapping
- **Joystick move**: Player movement
- **Single tap**: Select cell
- **Long press**: Open tool wheel
- **Double tap**: Quick action

---

## State Persistence

### Local Storage Schema
```typescript
interface SaveData {
  version: string;
  player: {
    name: string;
    coins: number;
    xp: number;
    level: number;
    unlockedTools: string[];
    unlockedSpecies: string[];
  };
  grid: {
    size: { width: number; height: number };
    cells: GridCellSave[];
  };
  trees: TreeSave[];
  settings: GameSettings;
  lastPlayed: string;
}
```

### Auto-save Triggers
- Every 30 seconds during gameplay
- On tree growth stage change
- On purchase/unlock
- On app blur/close

---

## Performance Optimization

### Rendering
- Instance meshes for repeated objects
- Frustum culling
- Dynamic LOD
- Texture atlasing

### Memory
- Object pooling for particles
- Lazy loading of distant content
- Garbage collection awareness

### Mobile
- Reduced shadow quality option
- Lower poly mode
- Battery-aware throttling

---

## Testing Strategy

### Unit Tests
- ECS component logic
- Math utilities
- State transformations

### Integration Tests
- System interactions
- Save/load cycles
- UI state sync

### Visual Tests
- Render output verification
- Animation timing
- Responsive layouts

### Test File Naming
```
__tests__/
├── ecs/
│   └── world.test.ts
├── systems/
│   └── growth.test.ts
└── utils/
    └── grid.test.ts
```

---

## Build Configuration

### Vite Config
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core'],
          react: ['react', 'react-dom']
        }
      }
    }
  }
});
```

### Biome Config
```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

---

## Deployment

### Build Process
1. Run tests
2. Type check
3. Lint
4. Build
5. Optimize assets
6. Deploy

### Environment Variables
```
VITE_API_URL=https://api.grovekeeper.game
VITE_ANALYTICS_ID=UA-XXXXX
VITE_VERSION=$npm_package_version
```

---

## Monitoring

### Error Tracking
- Console error capture
- Performance metrics
- User interaction logging

### Analytics
- Session duration
- Feature usage
- Conversion funnel
