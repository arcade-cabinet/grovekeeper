# Grove Keeper - API Reference

## ECS (Entity Component System)

### World (`src/game/ecs/world.ts`)

The game uses Miniplex for entity management.

```typescript
import { world, treesQuery, playerQuery, gridCellsQuery } from "./ecs/world";
```

#### Entity Interface

```typescript
interface Entity {
  id: string;
  position?: Position;
  renderable?: Renderable;
  tree?: TreeComponent;
  player?: PlayerComponent;
  gridCell?: GridCellComponent;
}
```

#### Component Types

**Position**
```typescript
interface Position {
  x: number;
  y: number;
  z: number;
}
```

**TreeComponent**
```typescript
interface TreeComponent {
  speciesId: string;      // References TREE_SPECIES
  growthProgress: number; // 0 to 1+ (>1 for ancient)
  health: number;         // 0 to 100
  wateredAt: number | null;
  plantedAt: number;
}
```

**PlayerComponent**
```typescript
interface PlayerComponent {
  coins: number;
  xp: number;
  level: number;
  currentTool: string;
  unlockedTools: string[];
  unlockedSpecies: string[];
}
```

**GridCellComponent**
```typescript
interface GridCellComponent {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
  treeEntityId: string | null;
}
```

#### Queries

```typescript
// All trees with required components
for (const tree of treesQuery) {
  console.log(tree.tree.growthProgress);
}

// Player entity
const player = playerQuery.first;

// All grid cells
for (const cell of gridCellsQuery) {
  console.log(cell.gridCell.type);
}
```

### Archetypes (`src/game/ecs/archetypes.ts`)

Factory functions for creating entities.

```typescript
import { createTreeEntity, createPlayerEntity, createGridCellEntity } from "./ecs/archetypes";

// Create a tree at grid position (5, 5) with oak species
const tree = createTreeEntity(5, 5, "oak");
world.add(tree);

// Create player (singleton)
const player = createPlayerEntity();
world.add(player);

// Create grid cell
const cell = createGridCellEntity(0, 0, "soil");
world.add(cell);
```

---

## Systems

### Growth System (`src/game/systems/growth.ts`)

Handles tree growth over time.

```typescript
import { growthSystem, getGrowthStage } from "./systems/growth";

// Call in game loop with delta time in seconds
growthSystem(deltaTime);

// Get visual stage from progress
const stage = getGrowthStage(0.5); // { name: "sapling", progress: 0.5, scale: 0.55 }
```

**Growth Stages**
| Stage | Progress | Scale |
|-------|----------|-------|
| seed | 0.00 | 0.1 |
| sprout | 0.10 | 0.2 |
| seedling | 0.25 | 0.35 |
| sapling | 0.50 | 0.55 |
| young | 0.75 | 0.75 |
| mature | 1.00 | 1.0 |
| ancient | 1.50 | 1.2 |

### Movement System (`src/game/systems/movement.ts`)

Handles player movement with joystick input.

```typescript
import { movementSystem, getPlayerPosition } from "./systems/movement";

// Input from joystick (-1 to 1)
movementSystem({ x: 0.5, z: -0.3 }, deltaTime);

// Get current position
const pos = getPlayerPosition(); // { x: 6, z: 6 } | null
```

---

## State Management

### Game Store (`src/game/stores/gameStore.ts`)

Zustand store for UI and persistent state.

```typescript
import { useGameStore } from "./stores/gameStore";

// In React components
const { coins, addCoins, setScreen } = useGameStore();

// Outside React
useGameStore.getState().addCoins(100);
```

#### State Shape

```typescript
interface GameState {
  screen: "menu" | "playing" | "paused" | "seedSelect";
  selectedTool: string;
  selectedSpecies: string;
  coins: number;
  xp: number;
  level: number;
  unlockedTools: string[];
  unlockedSpecies: string[];
  treesPlanted: number;
  treesMatured: number;
}
```

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setScreen` | `screen` | Change game screen |
| `setSelectedTool` | `toolId` | Select active tool |
| `setSelectedSpecies` | `speciesId` | Select seed type |
| `addCoins` | `amount` | Add/subtract coins |
| `addXp` | `amount` | Add XP (auto-levels) |
| `unlockTool` | `toolId` | Unlock a tool |
| `unlockSpecies` | `speciesId` | Unlock a species |
| `incrementTreesPlanted` | - | Track planted count |
| `incrementTreesMatured` | - | Track matured count |
| `resetGame` | - | Reset to initial state |

---

## Constants

### Config (`src/game/constants/config.ts`)

```typescript
GRID_SIZE = 12        // Grid dimensions (12x12)
CELL_SIZE = 1         // World units per cell
PLAYER_SPEED = 3      // Units per second
INTERACTION_RADIUS = 1.5

COLORS = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  autumnGold: "#FFB74D",
  skyMist: "#E8F5E9",
  sunsetWarm: "#FFAB91",
  earthRed: "#8D6E63",
}
```

### Trees (`src/game/constants/trees.ts`)

```typescript
interface TreeSpecies {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  growthTime: number;  // seconds to mature
  reward: number;      // coins on harvest
  trunkColor: string;
  leafColor: string;
  description: string;
}

// Get species by ID
const oak = getTreeById("oak");
```

### Tools (`src/game/constants/tools.ts`)

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  icon: string;
}

// Get tool by ID
const shovel = getToolById("shovel");
```

---

## UI Components

### Joystick

nipplejs wrapper for mobile controls.

```tsx
<Joystick
  onMove={(x, z) => handleMove(x, z)}
  onEnd={() => handleStop()}
/>
```

### HUD

In-game heads-up display.

```tsx
<HUD
  onPlant={() => openSeedSelect()}
  onOpenMenu={() => pause()}
  onOpenTools={() => openToolWheel()}
/>
```

### SeedSelect

Modal for choosing tree species.

```tsx
<SeedSelect
  open={isOpen}
  onClose={() => setOpen(false)}
  onSelect={(speciesId) => plant(speciesId)}
/>
```

### ToolWheel

Tool selection modal.

```tsx
<ToolWheel
  open={isOpen}
  onClose={() => setOpen(false)}
/>
```

### PauseMenu

Stats and navigation modal.

```tsx
<PauseMenu
  open={isOpen}
  onClose={() => resume()}
  onMainMenu={() => goToMenu()}
/>
```

---

## Testing

Tests use Vitest with happy-dom.

```bash
pnpm test:run
```

### Test Utilities

```typescript
import { describe, it, expect, beforeEach } from "vitest";

// Clear world between tests
beforeEach(() => {
  for (const entity of [...world]) {
    world.remove(entity);
  }
});
```

### Test Files

- `src/game/ecs/world.test.ts` - ECS tests
- `src/game/systems/growth.test.ts` - Growth system tests
- `src/game/systems/movement.test.ts` - Movement tests
- `src/game/stores/gameStore.test.ts` - Store tests
