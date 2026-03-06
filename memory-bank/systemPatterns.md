# System Patterns -- Grovekeeper

## Architecture Overview (Expo/R3F)

```
+-------------------+     +----------------+     +-----------------+
|   React Native UI |---->|    Zustand      |---->|   expo-sqlite   |
| (NativeWind + RNR)|<----|   (gameStore)   |<----|  (drizzle-orm)  |
+--------+----------+     +----------------+     +-----------------+
         |
         | props + hooks
         v
+-------------------+     +----------------+     +-----------------+
|   R3F <Canvas>    |---->|   Miniplex     |---->| miniplex-react  |
|   (declarative)   |<----|   (ECS World)  |<----|   (ECS hooks)   |
+--------+----------+     +----------------+     +-----------------+
         |
         | useFrame hooks
         v
+--------------------------------------------------------------+
|                 R3F Scene Components                          |
| <WorldScene> -> <EntityLayer> -> <InteractionLayer>          |
| <CameraRig>, <Lighting>, <Ground>, <Sky>                     |
| <PlayerMesh>, <TreeMesh>, <StructureMesh>                    |
+--------------------------------------------------------------+
         |
         | per-frame
         v
+--------------------------------------------------------------+
|                    Systems (per-frame via useFrame)           |
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

## Key Architectural Shift: Imperative -> Declarative

The BabylonJS version used imperative scene management (classes, refs, manual lifecycle). The Expo/R3F version uses **declarative React components** with hooks:

```tsx
// OLD (BabylonJS): Imperative manager classes
class TreeMeshManager {
  syncTrees(trees: Entity[]): void { /* manual mesh create/update/dispose */ }
}

// NEW (R3F): Declarative components with useFrame
function TreeMesh({ entity }: { entity: TreeEntity }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    // Growth animation lerp
    if (meshRef.current) {
      meshRef.current.scale.lerp(targetScale, Math.min(1, delta * speed));
    }
  });
  return <mesh ref={meshRef} position={[entity.position.x, 0, entity.position.z]}>
    <cylinderGeometry args={[trunkRadius, trunkRadius, height]} />
    <meshStandardMaterial color={barkColor} />
  </mesh>;
}
```

### Scene Component Tree
```tsx
<Canvas>
  <WorldScene>
    <CameraRig />           {/* Orthographic diorama camera */}
    <Lighting />             {/* Hemisphere + directional, day/night sync */}
    <Ground />               {/* Biome-blended ground plane */}
    <Sky />                  {/* Skybox with seasonal rotation */}
    <EntityLayer>
      <PlayerMesh />         {/* Farmer character */}
      {trees.map(t => <TreeMesh key={t.id} entity={t} />)}
      {structures.map(s => <StructureMesh key={s.id} entity={s} />)}
    </EntityLayer>
    <InteractionLayer />     {/* Raycasting, selection ring, tap handling */}
  </WorldScene>
</Canvas>
```

## State Management Split (Unchanged)

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

**Characteristic:** Changes every frame or every few seconds. Lives in memory. Serialized for saves.

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

**Characteristic:** Changes on player actions. Persisted to expo-sqlite via drizzle-orm. Survives app restart.

### Rule of Thumb
If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Zustand.

## ECS Entity Model (Unchanged)

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

## Configuration Pattern (New)

Game data lives in JSON config files in the `config/` directory, replacing scattered `constants/*.ts` files:

```
config/
  trees.json        # 15 species definitions (12 base + 3 prestige)
  tools.json         # 8 tool definitions with stamina costs
  resources.json     # Resource type definitions
  structures.json    # 6 structure templates
  blocks.json        # Block catalog for structures
  achievements.json  # 15 achievement definitions
  growth.json        # Growth stage parameters
  seasons.json       # Season multipliers and colors
  quests.json        # Quest pool definitions
```

## Navigation Pattern (New)

React Native navigation replaces web routing:

```
App
  -> MainMenuScreen     (start / continue)
  -> GameScreen          (R3F Canvas + HUD overlay)
  -> SettingsScreen      (pause menu equivalent)
```

## Styling Pattern (New)

NativeWind 4 (Tailwind for React Native) + React Native Reusables replaces shadcn/ui + Radix:

```tsx
// NativeWind classes on React Native components
<View className="flex-1 bg-background">
  <Text className="text-lg font-fredoka text-foreground">Grovekeeper</Text>
  <Pressable className="w-11 h-11 items-center justify-center">
    {/* 44px minimum touch target */}
  </Pressable>
</View>
```

## World System Pattern (Unchanged)

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

### WorldGenerator Pattern
```typescript
class WorldGenerator {
  generate(seed: number, playerLevel: number): WorldDefinition
}
```

Level-based complexity:
- Level 1-4: Starting grove only
- Level 5-9: 2-3 zones
- Level 10-14: 4-6 zones
- Level 15-19: 6-8 zones
- Level 20+: 8-12 zones

Prestige resets generate fresh worlds.

## Weather System Pattern (Unchanged)

Weather is a pure function. The system generates events, and the caller passes the multiplier to growthSystem:

```typescript
// weather.ts -- pure function, no side effects
weatherCheck(season, rng) -> WeatherEvent | null

// Game loop applies multiplier
const event = weatherCheck(currentSeason, rng);
const weatherMult = event?.growthMultiplier ?? 1.0;
growthSystem(dt, seasonMult * weatherMult);
```

Weather events:
- Rain: 1.5x growth multiplier
- Drought: 0.5x growth multiplier
- Windstorm: chance to damage young trees

## Growth Animation Pattern (Unchanged)

Smooth scale transitions use frame-rate-independent lerp:

```typescript
const lerpFactor = Math.min(1, deltaTime * animationSpeed);
currentScale = currentScale + (targetScale - currentScale) * lerpFactor;
```

`Math.min(1, dt * speed)` prevents overshoot on lag spikes.

## Achievement Checking Pattern (Unchanged)

Achievements are pure functions that compare game state against trigger conditions:

```typescript
checkAchievements(state: GameState) -> Achievement[]
// Returns newly unlocked achievements (not previously in state.unlockedAchievements)
```

## Prestige System Pattern (Unchanged)

```typescript
canPrestige(level) -> boolean            // level >= 25
calculatePrestigeBonus(count) -> Bonuses // cumulative growth/XP multipliers
getPrestigeTier(count) -> CosmeticTier   // 5 tiers: Stone Wall -> Ancient Runes
```

On prestige: reset level/XP/grove, keep achievements, apply cumulative bonuses, unlock cosmetic border theme, generate fresh procedural world.

## Save/Load Pattern (Updated for expo-sqlite)

```
Save (auto on app background + periodic):
  1. Zustand persist -> expo-sqlite via drizzle-orm (player state)
  2. saveGrove() -> serialize ECS tree entities per zone to store
  3. Save current zone ID

Load (on mount):
  1. Zustand rehydrates from expo-sqlite
  2. loadGrove() -> deserialize tree entities into ECS world per zone
  3. offlineGrowth() -> advance trees by elapsed time
  4. Load current zone
```

## Input Flow (Updated)

### Mobile (Primary)
```
Virtual joystick component
  -> onMove(x, z) callback
  -> Convert to movement vector
  -> movementRef.current = { x, z }
  -> movementSystem reads ref each frame (useFrame)
  -> Updates ECS entity position
  -> Zone transition check
  -> Camera follows player
```

### Desktop (Secondary)
```
Keyboard (WASD/arrows)
  -> useKeyboard hook
  -> Same movementRef path
```

### Tile Interaction
```
Tap/press on canvas
  -> R3F raycasting (onClick / onPointerDown on meshes)
  -> Snap to nearest grid cell (Math.floor, not Math.round)
  -> Context action based on: selectedTool + tileState
```

## Season System (Unchanged)

```
1 real second = 1 game minute (timeScale: 60)
Full year = ~96 real minutes
```

Seasons affect:
- Growth multipliers (Spring: 1.3x, Summer: 1.0x, Autumn: 0.7x, Winter: 0.0x)
- Sky colors
- Ground/canopy colors
- Tree mesh rebuild (seasonal canopy tints, Crystal Oak prismatic shifts)
- Cherry blossom petal overlay (Spring, stage 3+)
- Weather event probabilities

## Component Conventions (Updated)

### UI Components
- Named exports only (no `export default`)
- Props typed with `interface Props`
- React Native Reusables for Dialog, Button, Card, Progress, etc.
- NativeWind classes for layout and styling
- Mobile-first sizing with minimum 44px touch targets

### Game Scene Components
- Declarative R3F components with useFrame hooks
- Refs for Three.js objects (meshes, materials, lights)
- R3F event handlers (onClick, onPointerDown) for interaction

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Platform | Expo SDK 55 | Universal (iOS + Android + Web) from single codebase |
| 3D | React Three Fiber | Declarative, React-native, replaces imperative BabylonJS |
| Styling | NativeWind 4 + RN Reusables | Tailwind for React Native, replaces shadcn/Radix |
| State | ECS + Zustand split | Each tool for its strength (unchanged) |
| Persistence | expo-sqlite + drizzle-orm | Native SQLite, replaces localStorage |
| Testing | Jest + Maestro | Jest for unit/integration, Maestro for mobile E2E |
| NPC AI | Yuka 0.7.x | Lightweight game AI library |
| Config | JSON files in config/ | Replaces scattered constants/*.ts |
| Lint/Fmt | Biome | Single tool for lint + format (unchanged) |
| ECS | Miniplex 2.x | Entity-component-system (unchanged) |
