# Fix W7-A: TreeInstances — GLB Rendering for Stages 2-4

## Summary

Modified `components/entities/TreeInstances.tsx` to split tree rendering by growth stage:

- **Stage 0 (Seed)**: procedural sphere mound geometry (brown, `#795548`)
- **Stage 1 (Sprout)**: procedural cylinder stem geometry (green, `#4CAF50`)
- **Stages 2-4 (Sapling / Mature / Old Growth)**: species GLB via `StaticModelInstances`, batched by model path

Previously all stages used `createTreeGeometry()` (procedural geometry), ignoring the `tree.baseModel` and `tree.winterModel` fields that `vegetationPlacement.ts` had populated.

Created `components/entities/TreeInstances.test.ts` with 33 passing tests.

## GLB Instancing Structure

The new implementation uses two sub-components:

### `ProceduralTreeRenderer` (stages 0-1)
- Imperative Three.js mesh management inside `useFrame`
- Per-entity mesh created/destroyed as entities appear/despawn
- Geometry: `SphereGeometry` for stage 0, `CylinderGeometry` for stage 1
- Smooth scale lerp on visibility transitions

### `GlbTreeBatcher` (stages 2-4)
- Mirrors the pattern from `StructureInstances.tsx` exactly
- Each frame: reads `treesQuery.entities`, skips stage 0-1, groups stage 2-4 by resolved model path
- Mounts one `StaticModelInstances` per distinct model path (grows-only capacity)
- `StaticModelInstances` handles multi-mesh GLBs and InstancedMesh matrix updates
- Season check: `gameState$.currentSeason.get() === "winter"` → swap to `tree.winterModel` when `tree.useWinterModel` is true and `tree.winterModel` is non-empty

### Stage scale constants
```
Stage 0: 0.05  (Seed)
Stage 1: 0.15  (Sprout)
Stage 2: 0.5   (Sapling)
Stage 3: 1.0   (Mature)
Stage 4: 1.3   (Old Growth)
```

## Exported Pure Functions (testable without WebGL)

- `resolveTreeModelPath(baseModel, winterModel, useWinterModel, isWinter)` — resolves final model path with winter swap logic; throws on empty baseModel
- `partitionTreeEntities(entities, isWinter)` — splits an entity array into `{ procedural, glbByModel }` buckets

## Technical Decisions

1. **No separate file for GLB helper**: `GlbTreeBatcher` and `ProceduralTreeRenderer` are co-located in `TreeInstances.tsx` as private components to keep the module cohesive (both are rendering strategies for the same tree entity type).

2. **`onTreeTap` applies only to procedural meshes**: Stage 0-1 meshes are real Three.js `Mesh` objects with `userData.entityId`. Stage 2-4 trees use `InstancedMesh` (via `StaticModelInstances`) which has different tap handling — this is consistent with how `StructureInstances` works.

3. **Winter season from `gameState$.currentSeason`**: The `GlbTreeBatcher` reads the season in `useFrame` each tick. If season transitions during runtime, the next frame picks up the new value and resolves the correct model path automatically.

4. **Grows-only capacity**: `GlbTreeBatcher` tracks capacity per model path and only increases it (never shrinks), matching the `StructureInstances` pattern to avoid GPU buffer re-uploads.

## Test Coverage (33 tests)

- `PROCEDURAL_STAGE_MAX` constant value
- `STAGE_SCALES` per-stage values and monotonic ordering
- `resolveTreeModelPath`: all combinations of isWinter / useWinterModel / winterModel presence; throws on empty baseModel
- `partitionTreeEntities`: empty input, each stage (0-4), mixed stages, GLB grouping by model path, winter model swap, position/scale preservation, immutability

## Pre-existing Failures (not caused by this fix)

`game/systems/wildTreeRegrowth.test.ts` — 19 tests fail because `getSeasonSpawnMultiplier`, `shouldSpawnWildTree`, `buildWildTreeSpawn`, and `tickWildEcology` are not exported from `wildTreeRegrowth.ts`. This is another agent's unfinished work that was in the working tree before this session.
