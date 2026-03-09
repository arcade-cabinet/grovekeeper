# System Patterns -- Grovekeeper

## Architecture Overview

```
+-------------------+     +------------------+     +-------------------+
|   React Native UI |---->|   Legend State    |---->|   expo-sqlite     |
| (NativeWind + RNR)|<----|   (gameStore)     |<----|  (drizzle-orm)    |
+--------+----------+     +------------------+     +-------------------+
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
| <WorldScene> -> <ChunkRenderer> -> <EntityLayer>             |
| <CameraRig>, <Lighting>, <Sky>, <Water>                      |
| <PlayerController>, <TreeInstances>, <NpcMeshes>             |
+--------------------------------------------------------------+
         |
         | per-frame
         v
+--------------------------------------------------------------+
|                    Systems (pure functions)                    |
| growth, movement, time, harvest, stamina, weather, hunger    |
| temperature, durability, survival, chunk-loading             |
+--------------------------------------------------------------+
```

## State Management Split

### ECS (Miniplex) -- Runtime State
- Entity positions (player, trees, NPCs, structures, props)
- Growth progress per tree
- Tile states within active chunks
- Harvest cooldown timers, stamina recovery
- NPC AI state (Yuka behaviors)
- Active chunk entities

**Characteristic:** Changes every frame or every few seconds. Lives in memory only.

### Legend State (gameStore) -- Persistent State
- Player level, XP, hearts, hunger, stamina
- Resources (Timber, Stone, Ore, Sap, Fruit, Berries, Herbs, Meat, Hide, Fish, Acorns, Seeds)
- Unlocked species, tools, recipes, structures
- Tool durability and upgrade tier
- Chunk deltas (planted, harvested, built, removed)
- Quest progress, NPC relationships
- Codex discovery tiers
- Campfire fast-travel points
- Settings (difficulty tier, audio, haptics)
- Achievement + NG+ data

**Characteristic:** Changes on player actions. Persisted to expo-sqlite. Survives app restart.

### Rule of Thumb
If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Legend State.

## Chunk-Based World System

### Core Concept
Infinite procedural world. No fixed size, no zone boundaries, no loading screens. Chunks generate on demand from seed + coordinates.

```
Player position -> active chunk ring (3x3)
  -> generate missing chunks: generateChunk(worldSeed, chunkX, chunkZ)
  -> render active chunks (terrain, entities, props)
  -> unload distant chunks (keep delta in Legend State)
  -> re-entering old area = regenerate from seed + apply stored delta
```

### Chunk Specs
- **Size:** 16x16 tiles per chunk
- **Active radius:** 3x3 chunks (48x48 visible tiles)
- **Buffer ring:** 5x5 chunks (pre-generated, not rendered)
- **Key format:** `"${chunkX},${chunkZ}"` -- deterministic from coordinates
- **Generation:** pure function, zero side effects, <16ms budget
- **Seamless stitching:** global coordinates for noise, biome, paths

### Delta-Only Persistence

```typescript
interface ChunkDelta {
  plantedTrees: { tileX: number; tileZ: number; speciesId: string; plantedAt: number; stage: number }[];
  harvestedTrees: { tileX: number; tileZ: number; harvestedAt: number }[];
  builtStructures: { tileX: number; tileZ: number; structureId: string; rotation: number }[];
  removedItems: { tileX: number; tileZ: number; itemType: string }[];
  npcRelationships: { npcId: string; relationship: number }[];
  completedQuests: string[];
  discoveredSpecies: string[];
}
```

- New area: generate from seed, no delta
- Revisited area: generate from seed + overlay delta
- Exploring without interacting = zero storage cost

### Biome System (Global Noise)
```
biomeNoise = fBm(globalX * 0.005, globalZ * 0.005, worldSeed, 'biome')
temperatureNoise = fBm(globalX * 0.003, globalZ * 0.003, worldSeed, 'temperature')
moistureNoise = fBm(globalX * 0.004, globalZ * 0.004, worldSeed, 'moisture')
```

8 biomes: Starting Grove, Meadow, Ancient Forest, Wetlands, Rocky Highlands, Orchard Valley, Frozen Peaks, Twilight Glade. Transitions blend over ~8 tiles.

### Feature Placement (Discovery Cadence)
- **Micro:** every ~1 chunk (ambient scatter: trees, grass, rocks)
- **Minor:** every ~3-4 chunks (NPC encounters, rock formations, campfires, signposts)
- **Major:** every ~8-12 chunks (villages, ponds, overlooks, towers, merchant camps)
- **Labyrinths:** every ~30-50 chunks (14 total, the rarest discovery)
- Minimum distance enforcement via neighbor hash checks
- Feature type weighted by biome

## Seeded Determinism Pattern

Every source of randomness: `scopedRNG(scope, worldSeed, ...extra)`

```
terrain:           scopedRNG('terrain', seed, chunkX, chunkZ)
vegetation:        scopedRNG('vegetation', seed, chunkX, chunkZ)
npc-appearance:    scopedRNG('npc-appearance', seed, npcId)
npc spawning:      scopedRNG('npc', seed, chunkX, chunkZ)
quests:            scopedRNG('quests', seed, day)
world-quest:       scopedRNG('world-quest', seed, questId)
weather:           scopedRNG('weather', seed, day)
labyrinth:         scopedRNG('labyrinth', seed, chunkX, chunkZ)
grovekeeper-dialogue: scopedRNG('grovekeeper-dialogue', seed, grovekeeperId)
feature-major:     scopedRNG('feature-major', seed, chunkX, chunkZ)
feature-minor:     scopedRNG('feature-minor', seed, chunkX, chunkZ)
base-raid:         scopedRNG('base-raid', seed, day)
cooking:           scopedRNG('cooking', seed, recipeId, day)
```

Same seed = same world, always.

## Config-Driven Design

All tuning constants in `config/game/*.json`. Systems read config, never hardcode values.

- Difficulty multipliers via `getDifficultyConfig(tier)` -- never `if (tier === 'ironwood')`
- Balance tuning without code changes
- Game mode config resolver: `getModeConfig(mode, tier)`

## Systems Are Pure Functions

```typescript
(world: World, deltaTime: number, ...context: unknown[]) => void
```

Config from `config/game/*.json`. Randomness from `scopedRNG`. No side effects beyond ECS mutations.

## Rendering Patterns

### Instanced Meshes
- One `InstancedMesh` per template key: `${speciesId}_${stage}_${season}[_night]`
- Same-model repetitions (trees, grass, props) use instanced rendering
- Static entities: `matrixAutoUpdate = false` (zero per-frame cost)

### GLB Model System
- Stylized GLBs for all entities (trees, NPCs, structures, props, tools)
- Tree growth = scale on GLB model (seed=0.1x -> old growth=1.3x)
- Season = winter variant GLB swap OR color tint uniform
- NPC appearance = mix-and-match ChibiCharacter base + items (seeded)
- `useGLTF.preload()` for critical models, lazy load biome-specific

### Modern Zelda-Style Rendering
| Rule | Implementation |
|------|---------------|
| MSAA antialiasing | `gl={{ antialias: true }}` |
| Device pixel ratio | Device-native `dpr` |
| ACESFilmic tone mapping | `gl={{ toneMapping: ACESFilmicToneMapping }}` |
| sRGB color space | `gl={{ outputColorSpace: SRGBColorSpace }}` |
| Smooth shading | PBR `MeshStandardMaterial` with smooth normals |
| Linear filtering | Default texture filtering for clean visuals |
| Stylized geometry | Low-poly shapes for whimsy, not as constraint |

## NPC Animation Pattern (anime.js)

Lego-style rigid body part rotation (no skeletal rigs):
- **Idle:** Y-axis breathing bob + head rotation sway
- **Walk:** arm swing (shoulder +-30deg) + leg swing (hip +-25deg) + vertical bounce
- **Look-around:** head yaw +-45deg on seeded random interval
- **Talk:** head nod + slight arm gesture
- All easing via anime.js timeline -- stylized rigid part animation

## Save/Load Pattern

```
Save (auto on app background + periodic):
  1. Legend State auto-persists to expo-sqlite
  2. Chunk deltas stored per modified chunk
  3. Only player-changed data stored (delta-only)

Load (on mount):
  1. Legend State rehydrates from expo-sqlite
  2. Regenerate visible chunks from seed
  3. Apply stored deltas to regenerated chunks
  4. offlineGrowth() for planted trees
```

## Growth Animation Pattern

Smooth scale transitions using frame-rate-independent lerp:
```typescript
const lerpFactor = Math.min(1, deltaTime * animationSpeed);
currentScale += (targetScale - currentScale) * lerpFactor;
```

`Math.min(1, dt * speed)` prevents overshoot on lag spikes.

## Tool Action Pattern

1. Raycast from camera center (per-tool range: 3.0/4.0/6.0 units)
2. Per-tool layer masks (axe -> trees, pickaxe -> rocks)
3. Keyframe animation (400-600ms with impact frame at 45-55%)
4. Impact effects: screen shake + FOV punch + particles + sound + haptics
5. Stamina deduction + durability cost
6. Target entity reaction (tree shake, rock pulse)
