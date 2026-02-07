# System Patterns -- Grovekeeper

## Architecture Overview

```
+---------------+     +----------------+     +-----------------+
|   React UI    |---->|    Zustand      |---->|   localStorage  |
|  (HUD, Menu)  |<----|   (gameStore)   |<----|  (persistence)  |
+------+--------+     +----------------+     +-----------------+
       |
       | refs + callbacks
       v
+----------------+     +----------------+     +-----------------+
|   GameScene    |---->|   Miniplex     |---->| miniplex-react  |
| (~400 lines)   |<----|   (ECS World)  |<----|   (ECS.Entities)|
+-------+--------+     +----------------+     +-----------------+
        |
        | orchestrates
        v
+--------------------------------------------------------------+
|                    Scene Modules                              |
| SceneManager, CameraManager, LightingManager, GroundBuilder  |
| SkyManager, PlayerMeshManager, TreeMeshManager, BorderTrees  |
+--------------------------------------------------------------+
        |
        | renders
        v
+--------------------------------------------------------------+
|                    World + Structures                         |
| WorldManager (zone loading, structure meshes)                |
| WorldGenerator (procedural world from seed + level)          |
| StructureManager (placement validation, effect queries)      |
+--------------------------------------------------------------+
        |
        | runRenderLoop
        v
+--------------------------------------------------------------+
|                    Systems (per-frame)                        |
| growth, movement, time, harvest, stamina, weather            |
+--------------------------------------------------------------+
        |
        | on resume
        v
+--------------------------------------------------------------+
|              Offline Systems (on load)                       |
| offlineGrowth, achievement checking                          |
+--------------------------------------------------------------+
```

## State Management Split

### ECS (Miniplex) -- Runtime State
- Entity positions (farmer, trees, zones, structures)
- Growth progress per tree
- Tile states (empty, planted, blocked)
- Harvest cooldown timers
- Per-frame velocity
- Harvestable flag (ready for harvest)
- Farmer state (idle, moving, acting)
- Zone boundaries and biomes
- Structure positions and types

**Characteristic:** Changes every frame or every few seconds. Lives in memory. Serialized for saves via `saveGrove()` / `loadGrove()`.

### Zustand (gameStore) -- Persistent State
- Player level, XP, coins
- Resources (Timber, Sap, Fruit, Acorns)
- Stamina (current, max, regen rate)
- Unlocked species and tools
- Selected tool and species
- Quest progress
- Achievements (unlocked set)
- Prestige data (count, bonuses, cosmetic tier)
- Grid expansion tier
- Settings (haptics, sound)
- Game time (microseconds)
- Grove data (serialized ECS trees, per-zone)
- Current zone ID

**Characteristic:** Changes on player actions. Persisted to localStorage via `persist` middleware. Survives browser refresh.

### Rule of Thumb
If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Zustand.

## ECS Entity Model

```typescript
interface Entity {
  id: string;
  position?: { x: number; y: number; z: number };
  renderable?: { meshId: string | null; visible: boolean; scale: number };
  tree?: { speciesId: string; growthProgress: number; health: number;
           wateredAt: number | null; plantedAt: number; zoneId: string };
  player?: { coins: number; xp: number; level: number; currentTool: string };
  gridCell?: { gridX: number; gridZ: number; type: string; occupied: boolean;
               treeEntityId: string | null; zoneId: string };
  harvestable?: boolean;
  farmerState?: string;
  zone?: { id: string; name: string; sizeX: number; sizeZ: number; biome: string };
  structure?: { templateId: string; zoneId: string; gridPositions: Array<{x: number, z: number}> };
}
```

### Queries (pre-defined, fast)
```typescript
treesQuery       = world.with('tree', 'position', 'renderable')
playerQuery      = world.with('player', 'position')
gridCellsQuery   = world.with('gridCell', 'position')
farmerQuery      = world.with('farmerState', 'position')
harvestableQuery = world.with('tree', 'harvestable')
zonesQuery       = world.with('zone')
structuresQuery  = world.with('structure', 'position')
```

### Entity Factories
- **archetypes.ts** -- `createTreeEntity(gridX, gridZ, speciesId, zoneId)`, `createPlayerEntity()`, `createGridCellEntity(gridX, gridZ, type, zoneId)`
- **world/archetypes.ts** -- Zone archetype definitions for world generation

## BabylonJS Scene Pattern

The 3D scene is **imperative, not declarative**. React does NOT manage BabylonJS objects.

```
GameScene.tsx (~400 lines, down from ~1050)
+-- useEffect[mount] -> SceneManager.initialize()
|   +-- Create Engine, Scene
|   +-- CameraManager.setupCamera() -- orthographic, viewport-adaptive
|   +-- LightingManager.setupLighting() -- hemisphere + directional
|   +-- GroundBuilder.createGround() -- DynamicTexture biome blend
|   +-- SkyManager.setupSky() -- HDRI skybox + IBL
|   +-- PlayerMeshManager.createPlayerMesh()
|   +-- BorderTreeManager.placeDecorativeTrees()
+-- useEffect[mount] -> WorldManager.initialize()
|   +-- Load starting world or generate procedural world
|   +-- Spawn zone entities
|   +-- Load saved grove per zone
+-- engine.runRenderLoop -> Game loop
|   +-- movementSystem(world, dt)
|   +-- Check zone transitions (WorldManager.checkZoneTransition)
|   +-- growthSystem(dt, weatherMultiplier)
|   +-- updateTime(dt) -> LightingManager, SkyManager
|   +-- weatherSystem check
|   +-- PlayerMeshManager.syncPosition()
|   +-- TreeMeshManager.syncTrees()
|   +-- CameraManager.followPlayer()
|   +-- Growth animation lerp (smooth scale transitions)
+-- Refs for all BabylonJS managers and objects
+-- React overlay (GameUI) positioned absolutely over canvas
```

## Scene Module Pattern

Each scene module is a class with lifecycle methods:

```typescript
class SceneManager {
  initialize(): { engine: Engine; scene: Scene }
  dispose(): void
}

class CameraManager {
  setupCamera(scene: Scene, canvas: HTMLCanvasElement): Camera
  followPlayer(playerPos: Vector3): void
  getVisibleTileCount(): number  // 14-40 based on viewport
}

class TreeMeshManager {
  syncTrees(trees: Entity[], nightTime: boolean): void
  animateGrowth(deltaTime: number): void
  private getOrCreateTemplate(key: string): Mesh
  private cloneTemplate(template: Mesh): Mesh
}
```

Managers are instantiated in GameScene and called from the game loop or lifecycle hooks.

## World System Pattern

### Multi-Zone World
```
World contains multiple Zones
Zone defines:
  - size (sizeX, sizeZ)
  - biome (grassland, forest, rocky, water)
  - connections to other zones (cardinal directions)
  - tiles (soil, water, rock, path)

Player walks between zones
Camera follows smoothly
Save format stores per-zone trees
```

### WorldManager Pattern
```typescript
class WorldManager {
  initialize(scene: Scene, world: World): void
  loadZone(zoneId: string): void
  unloadZone(zoneId: string): void
  checkZoneTransition(playerPos: Vector3): string | null
  renderStructures(structures: Entity[]): void
  private createTileGrid(zone: ZoneDefinition): void
  private updateGroundTexture(zone: ZoneDefinition): void
}
```

### WorldGenerator Pattern
```typescript
class WorldGenerator {
  generate(seed: number, playerLevel: number): WorldDefinition
  private selectArchetypes(level: number): ZoneArchetype[]
  private generateZone(archetype: ZoneArchetype, seed: number): ZoneDefinition
  private connectZones(zones: ZoneDefinition[]): void
}
```

Level-based complexity:
- Level 1-4: Starting grove only
- Level 5-9: 2-3 zones
- Level 10-14: 4-6 zones
- Level 15-19: 6-8 zones
- Level 20+: 8-12 zones

Prestige resets generate fresh worlds.

## Structure System Pattern

### Structure Placement
```
Structure = collection of blocks on grid tiles
Validation checks:
  - All tiles must be empty
  - Tiles must be contiguous
  - Cost must be affordable
Effects:
  - Growth boost (Greenhouse)
  - Stamina regen (Bench)
  - Decorative (Fence)
```

### StructureManager Pattern
```typescript
class StructureManager {
  canPlace(template: StructureTemplate, gridX: number, gridZ: number): boolean
  place(template: StructureTemplate, gridX: number, gridZ: number): Entity
  getEffectsAt(gridX: number, gridZ: number): StructureEffect[]
  private checkTilesAvailable(positions: GridPosition[]): boolean
}
```

### BlockMeshFactory Pattern
```typescript
class BlockMeshFactory {
  createBlockMesh(block: BlockDefinition, scene: Scene): Mesh
  private createBoxMesh(): Mesh
  private createCylinderMesh(): Mesh
  private applyMaterial(mesh: Mesh, color: string): void
}
```

Structures are composed from block primitives defined in `blocks.json`.

## Template Mesh Caching Pattern

Tree meshes are expensive to generate. The system uses template caching with clone-based instancing:

```
Cache key: `{speciesId}-{stage}-{nightSuffix}`
Example:  "ghost-birch-3-night"

On first request:
  1. Generate full SPS tree mesh via treeMeshBuilder
  2. Store as template in cache Map
  3. Clone template for actual scene placement

On subsequent requests:
  1. Look up cache key
  2. Mesh.clone() from template (fast)
  3. Position and scale the clone

Ghost Birch special case:
  - Night variant has emissive glow material
  - Separate cache entry with "-night" suffix
  - Rebuilds on day/night transition
```

Matrix freezing is applied to stage 4 (Old Growth) trees since they no longer change scale.

## SPS Tree Generator Pattern

Ported from BabylonJS Extensions repository (TypeScript, not an npm package):

```
spsTreeGenerator.ts
  - Creates trunk + branch geometry via SolidParticleSystem
  - Seeded RNG (seedRNG.ts) for deterministic tree shapes
  - Parameters per species: trunk height, branch count, twist, taper
  - Returns BabylonJS Mesh ready for material assignment

treeMeshBuilder.ts
  - Assigns StandardMaterial (NOT PBR)
  - Species-specific mesh details:
    - Willow: drooping bow branches
    - Pine: conical fork shape
    - Baobab: thick trunk taper
    - Cherry: petal particle overlay (CSS)
    - Ghost Birch: emissive night glow
    - Crystal Oak: prismatic seasonal color tints
  - nightTime parameter triggers glow variant for Ghost Birch
```

## Weather System Pattern

Weather is a pure function. The system generates events, and the caller passes the multiplier to growthSystem:

```typescript
// weather.ts -- pure function, no side effects
weatherCheck(season, rng) -> WeatherEvent | null

// GameScene.tsx -- caller applies multiplier
const event = weatherCheck(currentSeason, rng);
const weatherMult = event?.growthMultiplier ?? 1.0;
growthSystem(dt, seasonMult * weatherMult);
```

Weather events:
- Rain: 1.5x growth multiplier
- Drought: 0.5x growth multiplier
- Windstorm: chance to damage young trees

CSS overlays (`WeatherOverlay.tsx`) provide visual effects without BabylonJS ParticleSystem bundle bloat.

## Growth Animation Pattern

Smooth scale transitions use frame-rate-independent lerp:

```typescript
const lerpFactor = Math.min(1, deltaTime * animationSpeed);
currentScale = currentScale + (targetScale - currentScale) * lerpFactor;
```

`Math.min(1, dt * speed)` prevents overshoot on lag spikes.

## Achievement Checking Pattern

Achievements are pure functions that compare game state against trigger conditions:

```typescript
// achievements.ts
checkAchievements(state: GameState) -> Achievement[]
// Returns newly unlocked achievements (not previously in state.unlockedAchievements)

// 15 achievements with triggers like:
// - Plant first tree
// - Harvest 100 trees
// - Reach level 10/25
// - Unlock all species
// - Complete prestige
```

`AchievementPopup.tsx` displays a gold-border modal with sparkle effect, auto-dismisses after 3 seconds.

## Prestige System Pattern

Pure functions for prestige mechanics:

```typescript
// prestige.ts
canPrestige(level) -> boolean            // level >= 25
calculatePrestigeBonus(count) -> Bonuses // cumulative growth/XP multipliers
getPrestigeTier(count) -> CosmeticTier   // 5 tiers: Stone Wall -> Ancient Runes
```

On prestige: reset level/XP/grove, keep achievements, apply cumulative bonuses, unlock cosmetic border theme, generate fresh procedural world.

## Grid Expansion Pattern

Tier-based expansion with resource costs (no coins):

```text
Tier 0: 12x12 (default, free)
Tier 1: 16x16 (level 5, cost: 100 Timber, 50 Sap)
Tier 2: 20x20 (level 10, cost: 250 Timber, 100 Sap, 50 Fruit)
Tier 3: 24x24 (level 15, cost: 500 Timber, 250 Sap, 100 Fruit, 50 Acorns)
Tier 4: 32x32 (level 20, cost: 1000 Timber, 500 Sap, 250 Fruit, 100 Acorns)
```

Accessible from Pause Menu. Adds new grid cells, repositions camera.

## Offline Growth Pattern

On game resume, simplified growth calculation runs:

```typescript
// offlineGrowth.ts
const elapsed = Date.now() - lastSaveTimestamp;
for (each saved tree) {
  tree.growthProgress += elapsed * growthRate * seasonMultiplier;
  // Cap at next stage boundary
}
```

Avoids full simulation. Uses last-known season for multiplier.

## Save/Load Pattern

```
Save (auto on visibility change + every 30s):
  1. Zustand persist -> localStorage (player state)
  2. saveGrove() -> serialize ECS tree entities per zone to store
  3. Save current zone ID

Load (on mount):
  1. Zustand rehydrates from localStorage
  2. loadGrove() -> deserialize tree entities into ECS world per zone
  3. offlineGrowth() -> advance trees by elapsed time
  4. WorldManager.loadZone(currentZoneId)
```

## Toast Notification Pattern

`showToast(message, type)` utility queues toast messages displayed by `Toast.tsx`. Used for:
- Resource gains on harvest ("+3 Timber")
- Achievement unlocks
- Level-up notifications
- Weather event announcements
- Zone transition messages

## Minimap Pattern

Rewritten to use miniplex-react for reactive rendering:

```typescript
// src/game/ecs/react.ts
export const ECS = createReactAPI(world);

// MiniMap.tsx
<svg>
  <ECS.Entities in={zonesQuery}>
    {(entity) => <rect {...zoneRect(entity)} />}
  </ECS.Entities>
  <ECS.Entities in={structuresQuery}>
    {(entity) => <rect {...structureRect(entity)} />}
  </ECS.Entities>
  <ECS.Entities in={treesQuery}>
    {(entity) => <circle {...treeCircle(entity)} />}
  </ECS.Entities>
</svg>
```

Desktop: Fixed bottom-right overlay.
Mobile: Fullscreen MiniMapOverlay.

## Input Flow

### Mobile (Primary)
```
nipplejs joystick
  -> onMove(x, z) callback
  -> Convert to orthographic movement vector
  -> movementRef.current = { x, z }
  -> movementSystem reads ref each frame
  -> Updates ECS entity position
  -> WorldManager.checkZoneTransition()
  -> CameraManager.followPlayer()
  -> Render loop syncs mesh position
```

### Desktop (Secondary)
```
Keyboard (WASD/arrows)
  -> useKeyboard hook
  -> Same movementRef path
  -> Desktop adaptations: SVG minimap, keyboard badges on tools, resource labels
```

### Tile Interaction
```
Tap/click on canvas
  -> Raycast from touch point to ground plane
  -> Snap to nearest grid cell (Math.floor, not Math.round)
  -> Context action based on: selectedTool + tileState
```

## Season System

```
1 real second = 1 game minute (timeScale: 60)
Full year = ~96 real minutes
```

Seasons affect:
- Growth multipliers (Spring: 1.3x, Summer: 1.0x, Autumn: 0.7x, Winter: 0.0x)
- Sky colors (LightingManager -> getSkyColors)
- Ground/canopy colors (time.ts -> getSeasonalColors)
- Tree mesh rebuild (seasonal canopy tints, Crystal Oak prismatic shifts)
- Cherry blossom petal overlay (Spring, stage 3+)
- Weather event probabilities

## Component Conventions

### UI Components
- Named exports only (no `export default`) unless shadcn/ui or game UI (biome override)
- Props typed with `interface Props`
- shadcn/ui for Dialog, Button, Card, Progress, etc.
- Tailwind for layout (`flex`, `grid`, responsive breakpoints)
- Inline styles for game-specific colors from `COLORS` constants
- Mobile-first sizing: `className="w-8 h-8 sm:w-9 sm:h-9"`

### Game Scene Components
- NOT React components -- imperative BabylonJS code inside `useEffect`
- React refs for all mesh/material/light references
- Callbacks (`handleMove`, `handleAction`, `handlePlant`) bridge UI to ECS

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Styling | Tailwind + shadcn/ui | Better DX than CSS Modules, consistent component library |
| 3D | Imperative BabylonJS | Declarative too opaque for game loop control |
| State | ECS + Zustand split | Each tool for its strength |
| Tree meshes | SPS + template cache | Procedural variety with clone-based performance |
| Weather visuals | CSS overlays | Avoids BabylonJS ParticleSystem bundle bloat |
| Testing | Vitest + happy-dom | Fast, Vite-native, React Testing Library compatible |
| Mobile | Capacitor bridge | PWA + native haptics/device APIs |
| Persistence | localStorage only | No backend, offline-first |
| Code splitting | Lazy GameScene import | 107 KB initial, ~500 KB total game load |
| Camera | Orthographic diorama | Better for multi-zone world than isometric lock |
| Scene architecture | Modular managers | GameScene.tsx 1050 lines → 400 lines |
| World generation | Procedural from seed | Prestige resets create fresh worlds |
| Minimap | SVG + miniplex-react | Reactive, no canvas overhead, ECS-driven |
