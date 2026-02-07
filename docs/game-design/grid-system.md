# Grid System

The grove is a square grid of plantable tiles viewed from a locked orthographic diorama camera angle. The grid starts at 12x12 and expands through five tiers (0-4) as the player levels up.

## Grid Dimensions

Starting size: **12x12** (144 tiles).

### Expansion Tiers

Defined in `src/game/systems/gridExpansion.ts`:

| Tier | Size | Required Level | Resource Cost |
|------|------|---------------|---------------|
| 0 (start) | 12x12 | 1 | Free |
| 1 | 16x16 | 5 | 100 Timber, 50 Sap |
| 2 | 20x20 | 10 | 250 Timber, 100 Sap, 50 Fruit |
| 3 | 24x24 | 15 | 500 Timber, 250 Sap, 100 Fruit, 50 Acorns |
| 4 | 32x32 | 20 | 1,000 Timber, 500 Sap, 250 Fruit, 100 Acorns |

Expansion is triggered from the Pause Menu. The `expandGrid()` action in `gameStore` checks level requirements and resource costs, then updates `gridSize` in persisted state.

When expanding from `oldSize` to `newSize`, new cells form an L-shaped border. The function `getNewCellPositions(oldSize, newSize)` returns all positions where `col >= oldSize OR row >= oldSize`.

## Tile Types

The grid generation system (`gridGeneration.ts`) procedurally places four tile types:

| Type | Approximate % | Plantable | Notes |
|------|--------------|-----------|-------|
| Soil | ~70% | Yes | Default plantable surface |
| Water | ~10% | No | Willow trees get +30% yield when adjacent |
| Rock | ~15% | No | Can be cleared with Shovel (stamina cost: 8) |
| Path | ~5% | No | Decorative walkway |

Each tile is represented as an ECS entity with a `gridCell` component containing its type, grid position, and whether it is occupied by a tree.

## Coordinate System

The game uses two coordinate spaces:

### Grid Coordinates

Integer pairs `(gridX, gridZ)` where `0 <= gridX < gridSize` and `0 <= gridZ < gridSize`. Used for tile lookup, planting, and serialization.

### World Coordinates

Floating-point `(worldX, worldZ)` in BabylonJS scene space. The isometric camera views the grid at an angle, so world coordinates do not map 1:1 to screen pixels.

### Conversion

```text
Grid cell size: CELL_SIZE = 1 (defined in constants/config.ts)

gridToWorld(gridX, gridZ):
  worldX = gridX * CELL_SIZE
  worldZ = gridZ * CELL_SIZE

worldToGrid(worldX, worldZ):
  gridX = Math.floor(worldX / CELL_SIZE)
  gridZ = Math.floor(worldZ / CELL_SIZE)
```

**Critical:** grid snapping uses `Math.floor`, not `Math.round`. Using `Math.round` caused off-by-one tile selection bugs in early development.

### Isometric Input Mapping

WASD keyboard input is rotated to match the isometric camera angle:

```text
worldX = inputX - inputY
worldZ = -(inputX + inputY)
```

Where `inputX` is the horizontal axis (A/D) and `inputY` is the vertical axis (W/S). The virtual joystick applies the same rotation to its normalized direction vector.

## Grid Generation

On new game start, `generateGrid(gridSize)` creates all tile entities:

1. Initialize an empty `gridSize x gridSize` array.
2. Place water tiles using noise-based clustering (~10% coverage).
3. Place rock tiles with scattered distribution (~15% coverage).
4. Place path tiles connecting key areas (~5% coverage).
5. Fill remaining cells with soil tiles.
6. Create ECS entities for each cell via `createGridCellEntity()`.

The grid is regenerated when the grove is expanded. Existing tiles are preserved; new tiles follow the same procedural rules.

## Player Interaction with Grid

1. Player moves with joystick/WASD. Movement system updates player entity position every frame.
2. `INTERACTION_RADIUS = 1.5` -- the player can interact with tiles within 1.5 units of their position.
3. Tap the action button to perform the selected tool's action on the nearest valid tile.
4. Planting: requires an empty soil tile, the Trowel tool, available seeds, and sufficient stamina.
5. Watering: requires a tile with a tree at stage 0--2 that is not already watered.

## Source Files

| File | Role |
|------|------|
| `src/game/systems/gridExpansion.ts` | Expansion tier definitions, cost checking, new cell positions |
| `src/game/systems/gridGeneration.ts` | Procedural grid layout |
| `src/game/constants/config.ts` | `GRID_SIZE`, `CELL_SIZE`, `INTERACTION_RADIUS` |
| `src/game/ecs/archetypes.ts` | `createGridCellEntity()` factory |
| `src/game/ecs/world.ts` | `gridCellsQuery` for tile lookups |
