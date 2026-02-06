# ECS Patterns

Grovekeeper uses [Miniplex 2.x](https://github.com/hmans/miniplex) as its Entity-Component-System framework. The ECS manages all runtime game state that changes every frame: entity positions, tree growth progress, grid cell occupancy, and player location.

## Entity Interface

All entities share a single `Entity` interface defined in `src/game/ecs/world.ts`. Components are optional properties on the interface:

```typescript
interface Entity {
  id: string;
  position?: Position;
  renderable?: Renderable;
  tree?: TreeComponent;
  player?: PlayerComponent;
  gridCell?: GridCellComponent;
  farmerState?: FarmerState;
  harvestable?: {
    resources: { type: string; amount: number }[];
    cooldownElapsed: number;
    cooldownTotal: number;
    ready: boolean;
  };
}
```

### Component Types

**Position** -- 3D world coordinates for any positioned entity.

```typescript
interface Position {
  x: number;  // grid X
  y: number;  // height (usually 0)
  z: number;  // grid Z
}
```

**TreeComponent** -- Growth state for a planted tree.

```typescript
interface TreeComponent {
  speciesId: string;        // references TREE_SPECIES or PRESTIGE_TREE_SPECIES
  stage: 0 | 1 | 2 | 3 | 4;  // Seed, Sprout, Sapling, Mature, Old Growth
  progress: number;         // [0, 1) within current stage
  watered: boolean;         // whether tree has been watered (1.3x growth bonus)
  totalGrowthTime: number;  // cumulative seconds grown
  plantedAt: number;        // timestamp when planted
  meshSeed: number;         // seed for deterministic procedural mesh generation
}
```

**PlayerComponent** -- Player state synced from Zustand each frame.

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

**GridCellComponent** -- State of a single tile on the grid.

```typescript
interface GridCellComponent {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
  treeEntityId: string | null;
}
```

**Renderable** -- Visual representation metadata.

```typescript
interface Renderable {
  meshId: string | null;
  visible: boolean;
  scale: number;  // lerped toward target for smooth growth animations
}
```

**FarmerState** -- Stamina tracking for the player entity.

```typescript
interface FarmerState {
  stamina: number;
  maxStamina: number;
}
```

## World and Queries

The ECS world is a singleton created in `world.ts`:

```typescript
export const world = new World<Entity>();
```

Pre-defined queries provide efficient access to entity subsets:

| Query              | Components Required                    | Usage                              |
|--------------------|----------------------------------------|------------------------------------|
| `treesQuery`       | `tree`, `position`, `renderable`       | Growth system, mesh sync           |
| `playerQuery`      | `player`, `position`                   | Movement system, action detection  |
| `farmerQuery`      | `farmerState`, `position`              | Stamina system                     |
| `gridCellsQuery`   | `gridCell`, `position`                 | Grid operations, tile lookup       |
| `harvestableQuery` | `tree`, `harvestable`                  | Harvest cooldown system            |

Queries are reactive. When an entity gains or loses the required components, it is automatically added to or removed from the query result set.

## Entity Factory Functions

Factory functions in `src/game/ecs/archetypes.ts` create entities with the correct component shape:

| Factory                | Creates                         | Key Behavior                           |
|------------------------|---------------------------------|----------------------------------------|
| `createTreeEntity`     | New tree at grid position       | Generates meshSeed from position hash  |
| `restoreTreeEntity`    | Tree from serialized save data  | Preserves all saved state              |
| `createPlayerEntity`   | Player entity                   | Starts at grid center, default tools   |
| `createGridCellEntity` | Grid tile                       | Sets tile type, unoccupied by default  |

### ID Generation

Entity IDs use a timestamp prefix combined with an incrementing counter to avoid collisions after page reloads:

```typescript
let entityIdCounter = 0;
export const generateEntityId = (): string => {
  entityIdCounter += 1;
  return `entity_${Date.now()}_${entityIdCounter}`;
};
```

## Systems

Systems are pure functions that operate on the ECS world each frame. They follow a consistent pattern:

```typescript
function systemName(deltaTime: number, ...context): void {
  for (const entity of relevantQuery) {
    // Read component data
    // Compute new values
    // Mutate component data in place
  }
}
```

### System Execution Order

Systems run sequentially inside `GameScene.tsx`'s `engine.runRenderLoop` callback:

1. **Time system** (`updateTime`) -- Advances game clock, determines season.
2. **Weather system** (`updateWeather`) -- Rolls for weather events based on season probabilities.
3. **Movement system** (`movementSystem`) -- Applies joystick/WASD input to player position.
4. **Growth system** (`growthSystem`) -- Advances tree growth based on species, season, weather, and water state.
5. **Stamina system** (`staminaSystem`) -- Regenerates stamina over time.
6. **Harvest system** (`harvestSystem`) -- Advances harvest cooldown timers on mature trees.

Additional periodic checks (not every frame):

- **Achievement check** -- Every 5 seconds, evaluates all 15 achievement triggers.
- **Time persistence** -- Every 5 seconds, syncs game time to Zustand store.
- **Auto-save** -- Every 30 seconds, serializes ECS state to localStorage.

### System Purity Rules

- Systems must not import from `gameStore.ts` directly. Context values (season, weather multipliers) are passed as arguments.
- Side effects (toast notifications, XP awards) are handled by the caller in `GameScene.tsx`, not inside the system.
- Systems must not create or destroy entities. Entity lifecycle is managed by the game loop.

## ECS vs Zustand Split

The split between ECS and Zustand follows a clear rule:

| Changes every frame?   | Persists across sessions? | Where it lives |
|------------------------|---------------------------|----------------|
| Yes                    | No                        | ECS only       |
| Yes                    | Yes                       | ECS + serialized to Zustand |
| No                     | Yes                       | Zustand only   |

**ECS-only examples:** Player position during movement, tree renderable.scale during growth animation.

**ECS + serialized examples:** Tree stage and progress (stored in ECS at runtime, serialized to `groveData` in Zustand on save).

**Zustand-only examples:** Player level, XP, coins, resources, unlocked tools/species, achievements, settings.

## Grove Serialization

Trees are serialized from ECS to Zustand for persistence:

```typescript
interface SerializedTree {
  speciesId: string;
  gridX: number;
  gridZ: number;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  meshSeed: number;
}
```

Serialization happens:
- On manual save (debounced 1 second after plant/harvest actions)
- Every 30 seconds via auto-save
- Immediately when the browser tab loses focus (`visibilitychange` event)

On load, serialized trees are restored into the ECS world via `restoreTreeEntity`, and grid cells are marked as occupied.
