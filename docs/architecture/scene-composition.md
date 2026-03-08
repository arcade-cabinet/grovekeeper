# Scene Composition

> **NOTE (2026-03-07):** Scene composition principles remain accurate. Updates:
> - **Zone transitions replaced by chunk streaming.** No fade-to-black. Chunks load/unload seamlessly as player moves.
> - **No `<BorderTrees>` component** -- decorative trees are GLB instances placed during chunk generation.
> - **Additional components** for chunk-based world: `<ChunkManager>`, `<SeasonalBushes>`, `<FenceInstances>`.
> - **NPCs use GLB models** (ChibiCharacter) with anime.js animation, not procedural box geometry.

## Principle

The 3D scene is a tree of React components inside a single R3F `<Canvas>`. Each component owns its own geometry, materials, and per-frame logic. There is no monolithic game loop file, no manager class hierarchy, no imperative scene graph manipulation.

## Full Scene Tree

```jsx
<Canvas shadows gl={{ antialias: false, pixelRatio: 1 }}>
  {/* Physics */}
  <Physics>
    {/* World layer: static environment */}
    <Terrain heightAt={worldData.terrain.heightAt} />
    <WorldInstances batches={worldData.instances} />

    {/* Entity layer: interactive game objects */}
    <PlayerController />
    <ToolViewModel />
    <TreeInstances />
    <NpcMeshes />
    <StructureMeshes />

    {/* Atmosphere */}
    <Lighting />
    <Sky />

    {/* Interaction */}
    <Crosshair />
    <TargetInfo />
  </Physics>
</Canvas>
```

## Layer Responsibilities

### World Layer (Static)

Generated once per zone load. No per-frame updates except terrain vertex normals.

| Component | Source | Draw Calls |
|-----------|--------|------------|
| `<Terrain />` | `worldData.terrain.heightAt` | 1 |
| `<WorldInstances />` | `worldData.instances` | 6-8 (one per material batch) |

### Entity Layer (Dynamic)

ECS-driven. Updated every frame via `useFrame`.

| Component | Source | Draw Calls |
|-----------|--------|------------|
| `<PlayerController />` | InputFrame + Rapier | 0 (invisible capsule) |
| `<ToolViewModel />` | Tool state + GLB | 1 (current tool model) |
| `<TreeInstances />` | ECS tree query | 1-15 (one per species) |
| `<NpcMeshes />` | ECS npc query | 1 per NPC (~5) |
| `<StructureMeshes />` | ECS structure query | 1 per structure (~10) |

### Atmosphere Layer

Driven by time system. Updates once per game-minute (not every frame).

| Component | Source | Draw Calls |
|-----------|--------|------------|
| `<Lighting />` | Time system | 0 (lights, not meshes) |
| `<Sky />` | Season + time | 1 (skybox) |

### Interaction Layer

HUD elements rendered in screen space or as camera children.

| Component | Source | Draw Calls |
|-----------|--------|------------|
| `<Crosshair />` | HTML overlay | 0 (CSS) |
| `<TargetInfo />` | Raycast result | 0 (CSS) |

## Total Draw Call Budget

| Category | Count |
|----------|-------|
| Terrain | 1 |
| World instances | 8 |
| Tool model | 1 |
| Trees (species) | 10 |
| NPCs | 5 |
| Structures | 6 |
| Sky | 1 |
| Shadow pass | ~10 |
| **Total** | **~42** |

Target: under 50 draw calls on mobile.

## Canvas Configuration

```tsx
<Canvas
  shadows
  gl={{
    antialias: true,         // MSAA for smooth edges
    powerPreference: 'high-performance',
    alpha: false,            // No transparency needed
  }}
  dpr={[1, 2]}               // Device-native pixel ratio
  camera={{
    fov: 65,
    near: 0.1,
    far: 100,
    position: [0, 1.6, 0],  // Eye height
  }}
  onCreated={({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }}
>
```

### Modern Zelda-Style Rendering Settings

| Setting | Value | Why |
|---------|-------|-----|
| antialias | true | MSAA for smooth, polished edges |
| dpr | [1, 2] | Device-native pixel ratio for sharp output |
| toneMapping | None | Raw colors, no HDR processing |
| colorSpace | LinearSRGB | Flat shading, no gamma curve |
| Shadow map size | 512 (mobile) / 1024 (desktop) | Low-res shadows match aesthetic |

## Chunk Streaming

The world uses seamless chunk streaming -- no loading screens or fade transitions:

1. Player moves -> `<ChunkManager>` detects active chunk ring change
2. New chunks in the 3x3 active ring are generated from seed (`generateChunk(worldSeed, chunkX, chunkZ)`)
3. Buffer ring (5x5 outer) generates in background (data ready, not rendered)
4. Distant chunks unload -- ECS entities removed, instances disposed
5. Chunk deltas (player modifications) applied on re-entry

The `<Canvas>` is NEVER remounted. Chunk content streams in/out as the player moves.

**Chunk generation budget:** <16ms per chunk. Heavy chunks generate across 2-3 frames.

## Component File Map

```
components/
  scene/
    InstancedBatch.tsx        -- Reusable instanced mesh renderer
    SharedGeometries.tsx      -- Shared box/cylinder/sphere geometries
    Terrain.tsx               -- Ground plane with vertex displacement
    WorldInstances.tsx        -- Maps WorldData.instances to InstancedBatch
    Lighting.tsx              -- Ambient + directional, time-driven
    Sky.tsx                   -- Skybox with seasonal rotation

  entities/
    TreeInstances.tsx         -- Per-species instanced tree meshes
    NpcMeshes.tsx             -- NPC mesh orchestrator
    NpcMesh.tsx               -- Individual NPC mesh + animation
    StructureMeshes.tsx       -- Structure block meshes

  player/
    PlayerController.tsx      -- FPS camera + Rapier capsule + movement
    ToolViewModel.tsx         -- First-person held tool model + juice
    Crosshair.tsx             -- Screen-center crosshair overlay
    TargetInfo.tsx            -- "Looking at X / action" HUD element

  interaction/
    SelectionRing.tsx         -- Torus highlight on selected tile
    PlacementGhost.tsx        -- Translucent structure preview
```

## Game Loop

There is no single game loop file. Each system runs in its own `useFrame`:

| Priority | System | Component | Frequency |
|----------|--------|-----------|-----------|
| -100 | Input poll | PlayerController | Every frame |
| 0 | Player movement | PlayerController | Every frame |
| 0 | Tool view model | ToolViewModel | Every frame |
| 0 | Tree growth lerp | TreeInstances | Every frame |
| 0 | NPC movement | NpcMeshes | Every frame |
| 100 | Time advance | TimeSystem (hook) | Every frame |
| 100 | Growth tick | GrowthSystem (hook) | Every game-minute |
| 100 | Weather tick | WeatherSystem (hook) | Every game-hour |

R3F's `useFrame` runs callbacks in registration order. Use the priority parameter to control execution order when needed (negative = earlier).

## Data Flow

```
InputManager.poll(dt) --> InputFrame
    |
    v
PlayerController reads InputFrame
    |-- moves Rapier capsule
    |-- updates camera rotation
    |-- writes player position to ECS
    |
    v
ToolViewModel reads InputFrame + camera state
    |-- applies sway/bob juice
    |-- plays use animation on useTool
    |-- plays switch animation on toolCycle
    |
    v
ECS systems read player position + tool state
    |-- growth system advances tree growth
    |-- NPC system updates movement
    |-- interaction system raycasts for targets
    |
    v
Scene components read ECS entities
    |-- TreeInstances updates instance matrices
    |-- NpcMeshes updates positions
    |-- TargetInfo displays current target
```
