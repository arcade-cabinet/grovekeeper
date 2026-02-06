# Grove Keeper - Game Systems Deep Dive

## Entity Component System (ECS)

### Why ECS?

Grove Keeper uses Miniplex ECS for:
- **Separation of concerns**: Data (components) separate from logic (systems)
- **Performance**: Efficient iteration over entities with specific components
- **Flexibility**: Easy to add new features without modifying existing code
- **Testability**: Systems are pure functions, easy to unit test

### Entity Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Creation   │ ──▶ │   Active    │ ──▶ │  Removal    │
│             │     │             │     │             │
│ archetype() │     │ systems()   │     │ dispose()   │
│ world.add() │     │ render()    │     │ world.rm()  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Component Composition

Entities are composed of optional components:

```typescript
// A tree has position, tree data, and rendering info
const tree: Entity = {
  id: "tree_1",
  position: { x: 5, y: 0, z: 5 },
  tree: { speciesId: "oak", growthProgress: 0.5, ... },
  renderable: { meshId: "mesh_1", visible: true, scale: 0.55 }
};

// Player has position, player data, and rendering
const player: Entity = {
  id: "player",
  position: { x: 6, y: 0, z: 6 },
  player: { coins: 100, xp: 500, ... },
  renderable: { meshId: "player_mesh", visible: true, scale: 1 }
};

// Grid cell only has position and cell data
const cell: Entity = {
  id: "cell_0_0",
  position: { x: 0, y: 0, z: 0 },
  gridCell: { gridX: 0, gridZ: 0, type: "soil", ... }
};
```

---

## Growth System

### Growth Formula

```
baseGrowthRate = 1 / species.growthTime
waterBonus = watered_recently ? 1.5 : 1.0
healthFactor = tree.health / 100

finalRate = baseGrowthRate * waterBonus * healthFactor
newProgress = progress + (finalRate * deltaTime)
```

### Stage Transitions

```
Progress:  0%    10%    25%    50%    75%   100%   150%
           │      │      │      │      │      │      │
Stage:   SEED  SPROUT SEEDLING SAPLING YOUNG MATURE ANCIENT
           │      │      │      │      │      │      │
Scale:   0.1    0.2   0.35   0.55   0.75   1.0    1.2
```

### Watering Mechanics

- Watering sets `wateredAt` timestamp
- Bonus active for 30 seconds after watering
- 50% growth speed increase while bonus active
- Visual indicator shows watered state

### Health System (Future)

```typescript
// Factors affecting health
health -= drought_damage;      // No water for too long
health -= pest_damage;         // Random events
health += fertilizer_heal;     // Tool usage
health = clamp(health, 0, 100);

// Death at 0 health
if (health === 0) {
  tree.state = "dead";
  // Can be removed with axe
}
```

---

## Movement System

### Joystick Input Processing

```typescript
// nipplejs provides normalized vector (-1 to 1)
joystick.on("move", (evt, data) => {
  const x = data.vector.x;  // Left/right
  const y = data.vector.y;  // Up/down (inverted for 3D)
});

// Convert to isometric movement
movementInput = {
  x: joystick.x,
  z: -joystick.y  // Invert Y axis
};
```

### Movement Calculation

```typescript
// Apply speed and delta time
newX = position.x + (input.x * PLAYER_SPEED * deltaTime);
newZ = position.z + (input.z * PLAYER_SPEED * deltaTime);

// Clamp to grid bounds
newX = clamp(newX, 0, GRID_SIZE - 1);
newZ = clamp(newZ, 0, GRID_SIZE - 1);
```

### Collision Detection (Future)

```typescript
// Check for obstacles
const targetCell = getCellAt(newX, newZ);
if (targetCell.type === "rock" || targetCell.type === "water") {
  // Block movement
  return currentPosition;
}
```

---

## Interaction System

### Tool-Based Actions

| Tool | Target | Action | Result |
|------|--------|--------|--------|
| Shovel | Empty cell | Plant | Opens seed select |
| Watering Can | Tree | Water | Sets wateredAt |
| Fertilizer | Tree | Boost | +10% growth |
| Axe | Mature tree | Harvest | Coins + remove |
| Axe | Dead tree | Clear | Remove only |
| Pruning Shears | Tree | Shape | Future feature |
| Rake | Debris | Clear | Future feature |

### Interaction Flow

```
┌──────────────┐
│ Player taps  │
│ action button│
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Get player   │────▶│ Get cell at  │
│ grid position│     │ position     │
└──────────────┘     └──────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Check current │
                    │ tool type     │
                    └───────┬───────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   SHOVEL     │    │ WATERING CAN │    │     AXE      │
│              │    │              │    │              │
│ If empty:    │    │ If has tree: │    │ If mature:   │
│ Open seeds   │    │ Water it     │    │ Harvest      │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Progression System

### XP Rewards

| Action | XP Gain |
|--------|---------|
| Plant tree | +10 |
| Water tree | +5 |
| Fertilize | +5 |
| Tree matures | +50 |
| Ancient tree | +200 |
| Clear debris | +5 |

### Level Calculation

```typescript
XP_PER_LEVEL = 500;
level = Math.floor(xp / XP_PER_LEVEL) + 1;

// Level 1: 0-499 XP
// Level 2: 500-999 XP
// Level 3: 1000-1499 XP
// etc.
```

### Unlock Requirements (Future)

| Level | Unlocks |
|-------|---------|
| 1 | Oak, Birch, Shovel, Watering Can |
| 3 | Pine |
| 5 | Maple, Rake |
| 7 | Fertilizer |
| 10 | Cherry, Pruning Shears |
| 15 | Axe |
| 20 | Redwood |

---

## Rendering System

### Scene Setup

```typescript
// Fixed diorama camera - no user control
camera = new ArcRotateCamera(
  "camera",
  -Math.PI / 4,     // 45° rotation
  Math.PI / 3.5,    // ~51° tilt for diorama view
  18,               // Fixed distance
  gridCenter,
  scene
);

// Lock camera completely
camera.inputs.clear();
camera.lowerRadiusLimit = 18;
camera.upperRadiusLimit = 18;
```

### Ground & Environment

```typescript
// Forest floor with procedural grass texture
const grassTexture = new GrassProceduralTexture("grassTex", 512, scene);
grassTexture.grassColors = [
  new Color3(0.25, 0.18, 0.12),  // Dark soil
  new Color3(0.35, 0.25, 0.15),  // Medium soil
  new Color3(0.28, 0.22, 0.14),  // Brown soil
];

// Soil tiles for planting area (darker)
const soilMat = new StandardMaterial("soilMat", scene);
soilMat.diffuseColor = Color3.FromHexString("#3d2817");

// Grid overlay (wireframe)
gridMat.wireframe = true;
gridMat.alpha = 0.3;
```

### Border Trees

Decorative trees surround the planting area:

```typescript
const positions = [
  // Left side
  { x: -2, z: 2 }, { x: -2.5, z: 5 }, ...
  // Right side
  { x: GRID_SIZE + 1, z: 1 }, ...
  // Back
  { x: 2, z: GRID_SIZE + 1.5 }, ...
];
```

### Tree Mesh Creation

```typescript
// Simple tree: cylinder trunk + sphere canopy
trunk = CreateCylinder("trunk", {
  height: 1,
  diameterTop: 0.15,
  diameterBottom: 0.2
});

canopy = CreateSphere("canopy", { diameter: 1 });
canopy.position.y = 0.7;
canopy.parent = trunk;

// Scale based on growth stage
trunk.scaling.setAll(stage.scale);
```

### Render Loop

```typescript
engine.runRenderLoop(() => {
  // Calculate delta time
  const deltaTime = (now - lastTime) / 1000;
  
  // Update game systems
  movementSystem(input, deltaTime);
  growthSystem(deltaTime);
  
  // Sync ECS to meshes
  syncPlayerMesh();
  syncTreeMeshes();
  
  // Render frame
  scene.render();
});
```

---

## State Persistence

### Save Data Structure

```typescript
interface SaveData {
  // Zustand persisted state
  screen: GameScreen;
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

### Auto-Save Triggers

- Zustand middleware auto-persists to localStorage
- Key: `grove-keeper-save`
- Triggers on any state change

### Future: ECS Persistence

```typescript
// Save full world state
const worldSave = {
  trees: [...treesQuery].map(serializeTree),
  cells: [...gridCellsQuery].map(serializeCell),
  player: serializePlayer(playerQuery.first)
};

localStorage.setItem("grove-keeper-world", JSON.stringify(worldSave));
```

---

## Performance Considerations

### Current Optimizations

- Lazy BabylonJS module loading
- Efficient ECS queries with Miniplex
- Memoized React callbacks
- Ref-based movement state (no re-renders)

### Future Optimizations

```typescript
// Instance meshes for many trees
const treeInstances = new InstancedMesh("trees", baseMesh, MAX_TREES);

// LOD for distant trees
mesh.addLODLevel(20, lowPolyMesh);
mesh.addLODLevel(40, null); // Hide at distance

// Object pooling
const particlePool = new ObjectPool(ParticleSystem, 50);
```
