# Chunk World + Open World Audit

## Summary

The chunk-based open world system is substantively real. The core streaming architecture (3x3 active / 5x5 buffer), noise-based terrain generation, biome system, entity spawning, and delta-only persistence are all implemented with genuine algorithmic depth. The system has comprehensive unit tests and correct wiring into the ECS. The critical gap is a single broken link in the live game: **ChunkManager.update() is never called from the running game loop or any React component**, so the system generates terrain data perfectly but no chunk will ever load at runtime.

---

## What Works

**ChunkManager (`game/world/ChunkManager.ts`):**
- Full 3x3 active + 5x5 buffer ring is implemented and parameterized from `config/game/grid.json`.
- `update(playerPos)` correctly computes chunk boundary crossings, queues new chunks, and synchronously unloads out-of-range chunks.
- Async generation via `requestIdleCallback` / `setTimeout` fallback is real — one chunk per idle tick to avoid frame drops.
- `flushQueue()` escape hatch for synchronous testing.
- Loads all child entities per chunk: water bodies, audio zones, trail paths, signposts, villages, hedge labyrinths, spirits, trees, bushes, grass, rocks, vegetation pipeline, structures.
- 25+ unit tests covering coordinate helpers, determinism, visibility toggling, chunk streaming transitions, ECS entity creation — all passing patterns are meaningful.

**TerrainChunk (`components/scene/TerrainChunk.tsx`):**
- Real `BufferGeometry` built from the heightmap: CHUNK_SIZE^2 vertices, height-displaced in Y, `(CHUNK_SIZE-1)^2` quads with indexed triangles.
- Vertex colors computed per vertex with biome blending (cosine falloff over `BLEND_ZONE=8` tiles) toward neighboring biome colors — real shader-free blending.
- Rapier `fixed()` `RigidBodyDesc` + `trimesh` collider created per chunk from the same heightmap data — player physics will land on actual terrain.
- Geometry cache keyed by entity ID; `dirty` flag triggers rebuild. Correct disposal on chunk unload.
- Registered in the game screen Canvas: `<TerrainChunks />` is present at `app/game/index.tsx:214`.

**SeededNoise (`game/utils/seededNoise.ts`):**
- Real Perlin noise implementation with a seeded 512-entry permutation table (Fisher-Yates shuffle via Mulberry32 PRNG).
- Quintic fade function (C2-continuous, eliminates gradient artifacts).
- fBm (fractional Brownian Motion): multi-octave accumulation with amplitude normalization.
- Ridged multifractal: inverted absolute value with signal-weighted octave suppression.
- Domain warping (Inigo Quilez technique): two-pass fBm offset for swirled terrain.

**terrainGenerator (`game/world/terrainGenerator.ts`):**
- Uses `SeededNoise.fbm(gx, gz, 4, 2.0, 0.5)` at global world-space coordinates scaled by `0.05`.
- Seamless across chunk boundaries — same noise instance, global coords, no per-chunk re-seeding.
- Returns `Float32Array` of `CHUNK_SIZE * CHUNK_SIZE` values in `[-1, 1]`.

**biomeMapper (`game/world/biomeMapper.ts`):**
- 8 distinct biomes: `starting-grove`, `meadow`, `ancient-forest`, `wetlands`, `rocky-highlands`, `orchard-valley`, `frozen-peaks`, `twilight-glade`.
- Two independent noise axes (temperature, moisture), each a full Perlin instance seeded from `worldSeed:temp` / `worldSeed:moist`.
- Priority-ordered classification rules with distance gating (Twilight Glade requires 20+ chunks from origin).

**Biome blending (`ChunkManager.ts` + `TerrainChunk.tsx`):**
- No separate `biomeBlending.ts` file exists — blending logic lives in `ChunkManager.generateChunkData()` and `TerrainChunk.buildTerrainGeometry()`.
- `biomeBlend[i]` = 1 if neighbor i has a different biome color, 0 if same — binary boundary detection.
- `computeBlendedColor()` applies cosine-falloff weighted average of base color + active neighbor colors per vertex.
- Test file `biomeBlending.test.ts` imports from `ChunkManager` and tests all blend invariants.

**chunkPersistence (`game/world/chunkPersistence.ts`):**
- Delta-only design is real: only player-modified chunks get a `ChunkDiff` entry keyed by chunk key.
- `chunkDiffs$` is a Legend State observable — automatically persisted via the store's expo-sqlite sync.
- `recordPlantedTree()` creates or appends to a chunk's diff on planting.
- `applyChunkDiff()` re-spawns player-planted trees after chunk regeneration.
- Only `PlantedTree` (7 fields) is stored per diff entry. Budget comment: `<1 MB for 100 hours`.

**entitySpawner (`game/world/entitySpawner.ts`):**
- Biome-mapped species pools per biome (8 biomes, 2-3 species each).
- Density config loaded from `config/game/vegetation.json` at runtime.
- All 4 entity types (trees, bushes, grass, rocks) spawned at heightmap-sampled Y positions.
- Uses `scopedRNG("entity-trees" | "entity-bushes" | "entity-grass" | "entity-rocks", worldSeed, chunkX, chunkZ)` — deterministic, no `Math.random()`.

**mazeGenerator (`game/world/mazeGenerator.ts`):**
- Stochastic labyrinth detection: `scopedRNG("labyrinth-roll", ...)`, `probability = 0.03` (~1 in 33 chunks).
- Origin chunk (0,0) is always excluded.
- Delegates maze grid generation to `game/systems/hedgePlacement` (recursive backtracker).
- Converts maze pieces to world-space `HedgeComponent` placements with height sampling.
- Stable `mazeIndex = hashString(chunkCoords) % 8` for spirit/dialogue lookup across sessions.

**waterPlacer (`game/world/waterPlacer.ts`):**
- Real local-minima detection: 8-neighbor test below `LOW_POINT_THRESHOLD = -0.2`.
- Flow direction computed via central differences (gradient of heightmap → steepest descent).
- Biome-specific placement rules (probability, river/stream/pond distribution).
- Gerstner wave layers configured from `config/game/procedural.json`.

**WaterBodies (`components/scene/WaterBody.tsx`):**
- Real Gerstner wave `ShaderMaterial` from `game/shaders/gerstnerWater`.
- `useFrame` time uniform updated each frame — animated water.
- Caustic plane rendered below water surface when `causticsEnabled` is true.
- `PlaneGeometry` with 32x32 segments per water body for smooth wave deformation.

**pathGenerator (`game/world/pathGenerator.ts`):**
- Quadratic Bezier splines between landmark chunks (15% landmark probability).
- Spline carved into heightmap in-place (`carveSplineIntoHeightmap`) using cosine falloff.
- Signpost placement at intersections (2+ landmark neighbors).

**villageGenerator (`game/world/villageGenerator.ts`):**
- Village at `getLandmarkType === "village"` chunks only.
- 3-8 buildings radially distributed (seeded angle + distance).
- 2-4 NPCs with seeded name, personality, function, daily schedule.
- Campfire with `fastTravelId = village-${chunkX}-${chunkZ}`.

---

## What Is Stubbed / Shallow

**terrainGenerator.ts:42** — `seededNoise.fbm(gx, gz, 4, 2.0, 0.5)` only. The spec (§31.1) calls for "ridged multifractal + domain warping" in addition to fBm. Only fBm is used in the heightmap. The `ridged()` and `domainWarp()` methods exist on `SeededNoise` but are not applied.

**chunkPersistence.ts:37** — `ChunkDiff` only tracks `plantedTrees: PlantedTree[]`. No persistence of: player-dug terrain modifications, harvested resource states, placed structures, killed enemies, opened chests. If the spec expects full delta tracking of all player world changes, this is significantly incomplete.

**entitySpawner.ts:141-145** — `resolveSpeciesModels()` falls back to `"tree01"` silently when a `speciesId` has no entry in `vegetationConfig.speciesModelMapping`. This is a masked error — wild trees with unregistered species IDs will render as generic trees with no warning.

**useWorldLoader.ts** — This hook loads from `config/world/starting-world.json` (a static pre-authored zone file), not from the procedural `ChunkManager`. It creates `gridCell` entities (old grid-based model), not `terrainChunk` entities (new chunk-based model). The two systems coexist in the same ECS world without coordination.

**app/game/index.tsx:166** — `useWorldLoader()` is the active world loading hook. It loads a static zone from JSON. The `ChunkManager` is not called anywhere from the game screen or game loop.

---

## Missing Entirely

1. **ChunkManager is not called from any runtime hook or component.** `ChunkManager.update(playerPos)` must be called every frame (inside `useFrame`) with the current player position. There is no `useChunkManager` hook, no `useFrame` integration, and no call site in `useGameLoop.ts` or `app/game/index.tsx`. The system is complete in isolation but dead at runtime.

2. **`biomeBlending.ts` does not exist as a standalone file.** The glob search confirmed this. The `biomeBlending.test.ts` file imports directly from `ChunkManager.ts` — the blend logic is embedded in the chunk generation pipeline. This is fine architecturally but the test file was named as if a dedicated module existed.

3. **No WaterBodies component in the game screen Canvas.** `app/game/index.tsx` includes `<TerrainChunks />` but not `<WaterBodies />`. Water body ECS entities are created by ChunkManager but never rendered.

4. **No hedge maze / spirit renderer wired to the Canvas.** `ChunkManager.loadChunk()` creates `hedge`, `hedgeDecoration`, and `grovekeeperSpirit` ECS entities but there is no R3F component in the game screen that queries and renders them.

5. **No MiniMap integration with ChunkManager.** The MiniMap (US-150) likely renders from the old `gridCell` ECS query, not from `terrainChunk` / `chunk` components. No cross-wiring observed.

6. **`applyChunkDiff()` is never called.** The chunk persistence module defines it but `ChunkManager.loadChunk()` does not call it after generating a chunk. Player-planted trees would be regenerated from seed as wild trees rather than restored from the diff.

7. **WorldGenerator.ts generates zone graphs, not open-world chunks.** `generateWorld()` produces a `WorldDefinition` with connected `ZoneDefinition` nodes (old grid model). This system is architecturally separate from the infinite chunk system and appears to be a legacy pre-pivot design that was never replaced. It is used by `ZoneLoader` and `useWorldLoader` — the runtime path — while `ChunkManager` is unused.

---

## Chunk Streaming Reality Check

**Is 3x3 active / 5x5 buffer real?**
Yes — fully implemented in `ChunkManager.ts`. `ACTIVE_RADIUS=1` (from `grid.json`), `BUFFER_RADIUS=2`, giving 9 active and 25 total chunks. Visibility toggling between active/buffer is correct. Unit tests confirm the exact counts and transitions.

**Does it stream as player moves?**
The streaming logic is correct — chunk boundary crossing detected, old columns synchronously unloaded, new columns queued for async generation. However, the streaming never fires at runtime because `ChunkManager.update()` is never called from the game loop or any component. The system is correct but unwired.

---

## Terrain Reality Check

**Is noise-based terrain real?**
Yes. `SeededNoise` implements genuine Perlin noise with a seeded permutation table, quintic fade, and bilinear gradient interpolation — not value noise or a flat plane. `generateHeightmap()` uses `fbm()` (4 octaves, lacunarity 2.0, gain 0.5) at global world-space coordinates scaled by 0.05. Output is `Float32Array` in `[-1, 1]`, displaced by `HEIGHT_SCALE=4` in world units.

**Are biomes real and blended?**
8 biomes are implemented with genuine temperature/moisture classification. Blending is real — per-vertex cosine-falloff interpolation toward neighbor biome colors within 8 tiles of each chunk edge. The blend is binary (0 or 1 weight per neighbor direction) rather than smooth, which means blending only activates at biome boundaries, not within them. The visual result will be sharp biome borders with a gradient transition zone — adequate but not the fully smooth biome blending the spec implies.

---

## Persistence Reality Check

**Is delta-only persistence real?**
Structurally yes — only modified chunks create diff entries. The Legend State `chunkDiffs$` observable is properly set up for expo-sqlite sync. However:
- Only planted trees are tracked in the diff (no harvests, no terrain edits, no structure placements).
- `applyChunkDiff()` is never called from `ChunkManager.loadChunk()`, so even the tracked planted trees would not be restored.
- The persistence module is correct in design but incomplete in scope and disconnected from the chunk loader.

---

## Critical Issues (numbered)

1. **ChunkManager.update() has zero call sites in runtime code.** The entire open world streaming system is dead. No chunks ever load during gameplay via this path. Fix: create a `useChunkManager` hook that calls `manager.update(playerPos)` inside `useFrame`, or integrate directly into `useGameLoop`.

2. **applyChunkDiff() is never called from ChunkManager.loadChunk().** Player-planted trees will vanish on chunk unload and re-enter as wild trees. Fix: call `applyChunkDiff(key, chunkX, chunkZ)` in `loadChunk()` after generating terrain.

3. **useWorldLoader uses the old zone-based model, not ChunkManager.** The live game loads a static `starting-world.json` zone with `gridCell` entities. This is architecturally incompatible with the chunk system. They share the same ECS world but use different entity schemas. The transition from grid-zones to infinite chunks is incomplete.

4. **WaterBodies, hedge mazes, and spirits have no renderer in the Canvas.** ChunkManager creates their ECS entities but no R3F component renders them. The Canvas is missing: `<WaterBodies />`, a hedge/maze renderer, and a spirit orb renderer.

5. **terrainGenerator uses only fBm; ridged multifractal and domain warping are unused.** The spec calls for all three. `SeededNoise.ridged()` and `SeededNoise.domainWarp()` exist but are not applied in `generateHeightmap()`. Terrain will lack sharp ridges and swirled structure.

6. **resolveSpeciesModels() silently falls back to "tree01".** Any species ID not in `vegetationConfig.speciesModelMapping` renders as a generic tree with no error. This masks missing asset registrations for biome-specific species in the wild spawning pool.

7. **WorldGenerator.ts (zone graph model) and ChunkManager.ts (infinite chunk model) coexist without integration.** `generateWorld()` is called by tests but nothing in the runtime uses it for the open world. It is a dead code path relative to the current chunk architecture unless the intent is to use it for the starting zone only — which is not documented.

---

## Verdict: Chunk World Is PARTIAL

The implementation is real in all its constituent parts — the algorithms, data structures, determinism, and test coverage are genuine and high quality. The `ChunkManager`, terrain generator, biome mapper, entity spawner, water placer, path generator, maze generator, and persistence module are all substantive implementations, not stubs.

The system fails at the integration layer. `ChunkManager.update()` is never driven by the game loop, `applyChunkDiff()` is never called on chunk load, and the R3F renderers for water, hedges, and spirits are absent from the Canvas. The old zone-loading path (`useWorldLoader` + `ZoneLoader` + `starting-world.json`) is the active runtime path, and the chunk system runs only in unit tests via `flushQueue()`.

The chunk world is one wiring pass away from being functional end-to-end.
