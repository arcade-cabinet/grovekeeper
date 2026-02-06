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
+----------------+     +----------------+
|   BabylonJS    |---->|   Miniplex     |
|   (3D Scene)   |<----|   (ECS World)  |
+----------------+     +----------------+
       |
       | runRenderLoop
       v
+------------------------------------------------------+
|                    Systems (per-frame)                |
| growth, movement, time, harvest, stamina, weather    |
+------------------------------------------------------+
       |
       | on resume
       v
+------------------------------------------------------+
|              Offline Systems (on load)               |
| offlineGrowth, achievement checking                  |
+------------------------------------------------------+
```

## State Management Split

### ECS (Miniplex) -- Runtime State
- Entity positions (farmer, trees)
- Growth progress per tree
- Tile states (empty, planted, blocked)
- Harvest cooldown timers
- Per-frame velocity
- Harvestable flag (ready for harvest)
- Farmer state (idle, moving, acting)

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
- Grove data (serialized ECS trees)

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
           wateredAt: number | null; plantedAt: number };
  player?: { coins: number; xp: number; level: number; currentTool: string };
  gridCell?: { gridX: number; gridZ: number; type: string; occupied: boolean;
               treeEntityId: string | null };
  harvestable?: boolean;
  farmerState?: string;
}
```

### Queries (pre-defined, fast)
```typescript
treesQuery       = world.with('tree', 'position', 'renderable')
playerQuery      = world.with('player', 'position')
gridCellsQuery   = world.with('gridCell', 'position')
farmerQuery      = world.with('farmerState', 'position')
harvestableQuery = world.with('tree', 'harvestable')
```

### Entity Factories (archetypes.ts)
- `createTreeEntity(gridX, gridZ, speciesId)` -- new tree at grid position
- `createPlayerEntity()` -- farmer at grid center
- `createGridCellEntity(gridX, gridZ, type)` -- tile

## BabylonJS Scene Pattern

The 3D scene is **imperative, not declarative**. React does NOT manage BabylonJS objects.

```
GameScene.tsx (~1050 lines)
+-- useEffect[mount] -> Initialize Engine, Scene, Camera, Lights, Ground
+-- useEffect[mount] -> Initialize ECS entities, load saved grove
+-- engine.runRenderLoop -> Game loop
|   +-- movementSystem(world, dt)
|   +-- growthSystem(dt, weatherMultiplier)
|   +-- updateTime(dt) -> sky, lighting, season
|   +-- weatherSystem check
|   +-- Sync player mesh position from ECS
|   +-- Sync tree meshes from ECS (create/update/delete)
|   +-- Growth animation lerp (smooth scale transitions)
+-- Refs for all BabylonJS objects (meshes, materials, camera)
+-- React overlay (GameUI) positioned absolutely over canvas
```

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
  - Assigns PBR materials (5 bark + 2 leaf texture sets)
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

On prestige: reset level/XP/grove, keep achievements, apply cumulative bonuses, unlock cosmetic border theme.

## Grid Expansion Pattern

Tier-based expansion with resource and coin costs:

```
Tier 0: 12x12 (default)
Tier 1: 16x16 (cost: coins + timber)
Tier 2: 20x20 (cost: coins + timber + sap)
Tier 3: 24x24 (cost: coins + all resources)
Tier 4: 32x32 (cost: coins + all resources, high)
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
  2. saveGrove() -> serialize ECS tree entities to store

Load (on mount):
  1. Zustand rehydrates from localStorage
  2. loadGrove() -> deserialize tree entities into ECS world
  3. offlineGrowth() -> advance trees by elapsed time
```

## Toast Notification Pattern

`showToast(message, type)` utility queues toast messages displayed by `Toast.tsx`. Used for:
- Resource gains on harvest ("+3 Timber")
- Achievement unlocks
- Level-up notifications
- Weather event announcements

## Input Flow

### Mobile (Primary)
```
nipplejs joystick
  -> onMove(x, z) callback
  -> Rotate to isometric axes (45deg)
  -> movementRef.current = { x, z }
  -> movementSystem reads ref each frame
  -> Updates ECS entity position
  -> Render loop syncs mesh position
```

Isometric WASD conversion: `worldX = inputX - inputY; worldZ = -(inputX + inputY)`

### Desktop (Secondary)
```
Keyboard (WASD/arrows)
  -> useKeyboard hook
  -> Same movementRef path
  -> Desktop adaptations: mini-map, keyboard badges on tools, resource labels
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
- Sky colors (time.ts -> getSkyColors)
- Ground/canopy colors (time.ts -> getSeasonalColors)
- Tree mesh rebuild (seasonal canopy tints, Crystal Oak prismatic shifts)
- Cherry blossom petal overlay (Spring, stage 3+)
- Weather event probabilities

## Component Conventions

### UI Components
- Named exports only (no `export default`)
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
