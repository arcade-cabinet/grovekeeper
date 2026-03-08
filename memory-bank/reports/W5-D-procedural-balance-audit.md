# W5-D: Procedural vs GLB Balance Audit
**Date:** 2026-03-07
**Scope:** All game entity categories — design intent (procedural vs GLB) vs actual runtime implementation
**Branch:** feat/expo-migration

---

## Summary Verdict

The design intent is well-modeled in code (config JSONs, ECS components, renderer components), but the **runtime Canvas mounts only a procedural substitute for trees and a capsule stand-in for NPCs**. The GLB infrastructure for every other category exists and is correct, but is not mounted in `app/game/index.tsx`. A second critical mismatch: trees themselves use a procedural geometry generator at runtime despite the design mandating GLB models.

| Category | Design Intent | Implementation Quality | Runtime State | Verdict |
|----------|-------------|----------------------|--------------|---------|
| Trees (growth stages 0–1) | Procedural hardcoded geometry | Correct per spec | Called at runtime | CORRECT |
| Trees (growth stages 2–4) | GLB from 3DPSX tree pack | Procedural via `createTreeGeometry` | Active (wrong renderer) | **WRONG** |
| Bushes | GLB seasonal swap (260 variants) | GLB renderer built correctly | Never mounted in Canvas | **MISSING** |
| Grass | GLB instanced | GLB InstancedMesh renderer built | Mounted in Canvas | CORRECT |
| NPCs / Characters | ChibiCharacter GLBs (mix-and-match) | `NpcModel.tsx` fully built | `NpcMeshes.tsx` (capsules) mounted instead | **WRONG** |
| Structures | GLB (3DPSX Farm Assets) | `StructureInstances.tsx` fully built | Never mounted in Canvas | **MISSING** |
| Fences / Walls | GLB (7 fence types) | `FenceInstances.tsx` fully built | Never mounted in Canvas | **MISSING** |
| Hedge Maze walls | GLB (94 modular pieces, InstancedMesh) | `HedgeMaze.tsx` fully built | Never mounted in Canvas | **MISSING** |
| Hedge decorations | GLB (fountain, benches, columns) | Part of `HedgeMaze.tsx` | Never mounted in Canvas | **MISSING** |
| Props / Items | GLB (barrels, crates, kitchen, traps) | `PropInstances.tsx` + `PropModel.tsx` built | Never mounted in Canvas | **MISSING** |
| Enemies | GLB (bat, skeleton-warrior, knight) | ECS component has `modelPath`; no renderer component | No enemy renderer exists | **MISSING** |
| Held Tools | GLB via `ToolViewModel.tsx` | `ToolViewModel.tsx` fully built | Never mounted in Canvas | **MISSING** |
| Water | Procedural Gerstner shader (correct) | `WaterBody.tsx` built correctly | Never mounted in Canvas | CORRECT design, MISSING mount |
| Spirits (Grovekeepers) | Procedural IcosahedronGeometry (correct) | `GrovekeeperSpirit.tsx` built correctly | Never mounted in Canvas | CORRECT design, MISSING mount |
| Birchmother | Procedural assembly (correct) | `BirmotherMesh.tsx` built correctly | Mounted in Canvas | CORRECT |
| Terrain | Procedural heightmap (correct) | `TerrainChunks.tsx` built correctly | Mounted in Canvas | CORRECT |
| Sky / Atmosphere | Procedural shader (correct) | `Sky.tsx` built correctly | Mounted in Canvas | CORRECT |

---

## Critical Mismatches (Wrong Approach)

### WRONG-1: Trees render procedural geometry, not GLBs

**Design (unified-game-design.md §5):**
- Stages 0 and 1: hardcoded geometry (~20-30 verts each) — CORRECT
- Stages 2, 3, 4: species GLB from `3DPSX Retro Nature trees` at scale 0.5x / 1.0x / 1.3x

**Implementation:**
- `components/entities/TreeInstances.tsx:4,14,55` — imports `createTreeGeometry` from `game/utils/treeGeometry.ts` and uses it for ALL stages including 2, 3, 4
- `game/utils/treeGeometry.ts` — a 300+ line port of the BabylonJS SPS Tree Generator; produces procedural `BufferGeometry` with vertex-colored baked geometry
- `game/ecs/components/vegetation.ts:24-27` — `TreeComponent` correctly stores `baseModel`, `winterModel`, `useWinterModel` fields
- `game/systems/vegetationPlacement.ts:26-65` — `speciesToTreeModel()` and `resolveTreeModelPath()` correctly resolve GLB paths per species
- `game/world/entitySpawner.ts:189` — `resolveSpeciesModels()` correctly populates `baseModel`/`winterModel` in the ECS tree entity

**The mismatch:** The ECS tree entity carries the correct GLB path in `tree.baseModel` (e.g., `tree01`, `tree02`). `TreeInstances.tsx` never reads `tree.baseModel`. It always calls `createTreeGeometry(tree.speciesId, tree.stage, tree.meshSeed)` regardless of stage. The 1,439 GLBs in `assets/models/trees/` are never loaded.

**Evidence:**
- `components/entities/TreeInstances.tsx:14` — `import { createTreeGeometry } from "@/game/utils/treeGeometry";`
- `components/entities/TreeInstances.tsx:55` — `cache.set(key, createTreeGeometry(tree.speciesId, tree.stage, tree.meshSeed));`
- No `useGLTF` import anywhere in `TreeInstances.tsx`
- `assets/models/trees/base/` contains tree01.glb through tree08.glb (all referenced species' GLBs exist on disk)
- `assets/models/trees/extra/` contains tree01.glb through tree36.glb (all rare species GLBs including tree09, tree15, tree20, tree25, tree30 exist on disk)
- `assets/models/trees/winter/` contains tree01_winter.glb through tree06_winter.glb (all winter variants exist)

**Impact:** All trees in the running game render as procedural geometry (the legacy BabylonJS SPS port), not the PSX GLB aesthetic. The "PSX Aesthetic" pillar is violated for the most prominent visual element in the game. The vertex budget benefit of GLBs (100-400 verts vs the SPS generator's 200-1,300) is also lost.

---

### WRONG-2: NPCs render capsule primitives, not ChibiCharacter GLBs

**Design (unified-game-design.md §2):**
- NPCs use ChibiCharacter GLBs: seeded selection of 1 of 7 base models + up to 5 item slots from 33 items
- Mix-and-match assembly: `basemesh`, `archer`, `knight`, `merchant`, `ninja`, `student`, `allinone` + hair, torso, legs, feet, accessories

**Implementation — built but not used:**
- `components/entities/NpcModel.tsx` — fully implemented GLB-based NPC renderer using `useGLTF` and `generateNpcAppearance`
- `config/game/npcAssets.json` — complete asset manifest with 7 base models + items
- `assets/models/npcs/base/` — all 14 GLBs present (7 base + 7 `-pr` emission variants)
- `assets/models/npcs/items/` — item GLBs present

**Implementation — actually mounted:**
- `components/entities/NpcMeshes.tsx` — renders NPCs as colored `CapsuleGeometry` primitives, one color per NPC function type (trading=gold, quests=blue, etc.)
- `app/game/index.tsx:231` — `<NpcMeshes onNpcTap={onNpcTap} />` is what's in the Canvas

**Evidence:**
- `components/entities/NpcMeshes.tsx:35-40` — `const sharedGeometry = new THREE.CapsuleGeometry(...)` — primitive, no GLB
- `app/game/index.tsx:7` — imports `NpcMeshes`, not `NpcModel`
- `NpcModel.tsx` has zero import sites in `app/`

**Impact:** NPCs appear as color-coded capsules in the running game. The carefully built mix-and-match ChibiCharacter assembly system is entirely dead. PSX aesthetic is violated for the second-most-visible entity type.

---

## Missing Canvas Mounts (Built But Never Rendered)

All components below are implemented with correct GLB loading, instancing, and ECS query patterns. None appear in `app/game/index.tsx` Canvas. The mounted components at `app/game/index.tsx:205-233` are:

```
<GameSystems /> <FPSCamera /> <Lighting /> <Sky /> <TerrainChunks />
<Ground /> <PlayerCapsule /> <TreeInstances /> <GrassInstances />
<NpcMeshes /> <BirmotherMesh />
```

### MISSING-1: BushModel / bush GLBs never rendered

- `components/entities/BushModel.tsx` — GLB renderer using `assets/models/bushes/{season}/{shape}_{season}.glb`
- `config/game/vegetation.json bushShapes` — 52 shapes defined
- `assets/models/bushes/summer/` — 53+ GLBs present (verified), multiple seasons present
- Not mounted in Canvas
- Wild bushes are generated in ECS by `entitySpawner.ts` and `vegetationPlacement.ts` with correct `BushComponent` data, but no renderer exists in the Canvas to render them

### MISSING-2: StructureInstances / structure GLBs never rendered

- `components/entities/StructureInstances.tsx` — batched InstancedMesh renderer per `structure.modelPath`
- `components/entities/StructureModel.tsx` — individual GLB renderer by `templateId`
- `config/game/structures.json` — 20+ structure templates with `modelPath: "assets/models/structures/farm/..."`
- `assets/models/structures/farm/` — barn.glb, house-1.glb through house-5.glb, campfire-1.glb, campfire-2.glb, etc. present
- Not mounted in Canvas

### MISSING-3: FenceInstances / fence GLBs never rendered

- `components/entities/FenceInstances.tsx` — batched InstancedMesh renderer grouped by `fence.modelPath`
- `components/entities/FenceModel.tsx` — individual GLB renderer with auto-connect topology
- `config/game/fences.json` — 7 fence types with per-variant GLB paths
- `assets/models/fences/drystone/`, `assets/models/fences/wooden/`, etc. — all GLBs present
- Not mounted in Canvas

### MISSING-4: HedgeMaze GLBs never rendered

- `components/entities/HedgeMaze.tsx` — hedge walls via InstancedMesh batched by modelPath; decorations as individual GLBs
- `assets/models/hedges/basic/` — 24 GLBs; `assets/models/hedges/round/` — 42 GLBs; `assets/models/hedges/diagonal/` — 15 GLBs
- `config/game/hedgeMaze.json` — fountain, bench, column, flowerbed GLB paths defined
- Not mounted in Canvas

### MISSING-5: PropInstances / prop GLBs never rendered

- `components/entities/PropInstances.tsx` — batched InstancedMesh renderer per `prop.modelPath`
- `components/entities/PropModel.tsx` — individual GLB renderer
- `config/game/propAssets.json` — structures, crops, kitchen, traps, weapons, misc categories
- `assets/models/props/` — GLBs present in misc, traps, dungeon, survival, kitchen, fantasy subdirectories
- Not mounted in Canvas

### MISSING-6: ToolViewModel / held tool GLBs never rendered

- `components/player/ToolViewModel.tsx` — fully implemented; loads GLB from `config/game/toolVisuals.json`, portals into camera space, applies sway/bob/swap animations
- `config/game/toolVisuals.json` — 5 tools configured: `trowel→Hoe.glb`, `axe→Axe.glb`, `pruning-shears→Hatchet.glb`, `shovel→Shovel.glb`, `pickaxe→Pickaxe.glb`
- `assets/models/tools/` — Axe.glb, Hatchet.glb, Hoe.glb, Pickaxe.glb, Shovel.glb all present
- Not mounted in Canvas
- Impact: no first-person held tool visible — core "first-person with held tool model" identity missing

### MISSING-7: WaterBody Gerstner shader never rendered

- `components/scene/WaterBody.tsx` — Gerstner wave shader, ECS-driven
- `game/shaders/gerstnerWater.ts` — full shader implementation
- Not mounted in Canvas (but this is correct design — procedural)

### MISSING-8: GrovekeeperSpirit orbs never rendered

- `components/entities/GrovekeeperSpirit.tsx` — IcosahedronGeometry, emissive, bob/pulse/trail particles
- Not mounted in Canvas
- (See also master-analysis.md C5 — `discoverSpirit()` also never called)

---

## Enemies: No Renderer Component Exists

**Design:** bat.glb, skeleton-warrior.glb, knight.glb via `EnemyComponent.modelPath`

**Evidence:**
- `config/game/enemies.json` — `modelPath: "assets/models/enemies/bat.glb"`, `"skeleton-warrior.glb"`, `"knight.glb"`, `"corrupted-hedge"` uses hedge GLB
- `game/ecs/components/combat.ts:11` — `EnemyComponent.modelPath: string` field exists
- `assets/models/enemies/` — bat.glb, skeleton-warrior.glb, knight.glb, loose-bones.glb all present
- **No R3F component exists to render enemies** — no `EnemyMesh.tsx` or equivalent anywhere in `components/`
- `game/systems/enemySpawning.ts` and `game/systems/enemyAI.ts` exist and are tested but no renderer

**Verdict:** MISSING — design says GLB, GLB files exist, ECS component has the modelPath field, but no rendering component was ever built.

---

## Correctly Procedural (Design Matches Implementation)

### Terrain — CORRECT
- Design: PlaneGeometry vertex displacement via fBm noise
- `components/scene/TerrainChunk.tsx` — procedural heightmap, mounted in Canvas

### Sky / Atmosphere — CORRECT
- Design: ShaderMaterial gradient interpolation
- `components/scene/Sky.tsx` — procedural shader, mounted in Canvas

### Water — CORRECT (design), MISSING (mount)
- Design: Gerstner wave shader — correctly implemented in `components/scene/WaterBody.tsx`
- Missing Canvas mount is a wiring gap, not a design mismatch

### Grovekeeper Spirits — CORRECT (design), MISSING (mount)
- Design: IcosahedronGeometry emissive orbs — correctly implemented in `components/entities/GrovekeeperSpirit.tsx`
- Not a GLB; design intent is honored

### Birchmother — CORRECT
- Design: procedural assembly (IcosahedronGeometry base + CylinderGeometry trunk + SphereGeometry canopy)
- `components/scene/BirmotherMesh.tsx` — procedural, mounted in Canvas

### Tree Growth Stages 0–1 — CORRECT
- Design (unified-game-design.md §5): "Tiny hardcoded geometry (cone + sphere, ~20 verts)" / "Hardcoded geometry (cylinder + triangles, ~30 verts)"
- These stages are covered by `createTreeGeometry` in the current renderer
- Note: the current renderer uses procedural geometry for ALL stages, which is correct for 0-1 but wrong for 2-4

---

## GLB Asset Inventory: What Exists on Disk

All paths are relative to `assets/models/`:

| Category | Directory | Count | Key Files |
|----------|-----------|-------|-----------|
| Trees (base) | `trees/base/` | 8 | tree01.glb–tree08.glb |
| Trees (winter) | `trees/winter/` | 6 | tree01_winter.glb–tree06_winter.glb |
| Trees (extra/rare) | `trees/extra/` | 36 | tree01.glb–tree36.glb (includes tree09, tree15, tree20, tree25, tree30 for rare species) |
| Bushes (summer) | `bushes/summer/` | 53+ | all 52 shapes present |
| Bushes (autumn/winter/spring/dead) | `bushes/{season}/` | ~52 each | seasonal variants present |
| Grass | `grass/` | 12 | grass01.glb–grass09.glb + patches |
| Fences | `fences/{type}/` | ~79 | 7 types × variants |
| Structures | `structures/farm/` | 15+ | barn, houses, campfire-1/2, etc. |
| Hedges (basic) | `hedges/basic/` | 24 | basic_1x1 through basic_3x3 |
| Hedges (round) | `hedges/round/` | 42 | round variants |
| Hedges (diagonal) | `hedges/diagonal/` | 15 | diagonal pieces |
| NPCs (base) | `npcs/base/` | 14 | 7 base + 7 -pr emission variants |
| NPCs (items) | `npcs/items/` | 33+ | hair, torso, legs, feet, accessories |
| Tools | `tools/` | 5 | Axe, Hatchet, Hoe, Pickaxe, Shovel |
| Enemies | `enemies/` | 4 | bat, skeleton-warrior, knight, loose-bones |
| Props | `props/{category}/` | 100+ | misc, traps, dungeon, survival, kitchen, fantasy |

**Total GLBs on disk: 1,439** (verified via filesystem). Zero of these are loaded by the running game at boot, with the exception of fence GLBs (if fences were ever spawned — but `FenceInstances` is not mounted so they are not). Grass GLBs would load if `GrassInstances` were ever populated by a mounted chunk streamer.

---

## Specification Alignment Issues

### resolveSpeciesModels() silent fallback (entitySpawner.ts:152-165)
- `resolveSpeciesModels()` in `game/world/entitySpawner.ts:157-159` silently falls back to `baseModel: "tree01"` for unrecognized speciesIds
- Species IDs used in `BIOME_SPECIES_POOL` (`entitySpawner.ts:132-141`) that don't match `vegetation.json speciesModelMapping` entries will silently render as tree01
- The spec IDs used in the spawner (`white-oak`, `cherry-blossom`, `silver-birch`, `baobab`, `weeping-willow`, etc.) do match `vegetation.json`, so this fallback is not currently triggered — but the fallback violates the "no silent fallbacks" hard rule

### vegetation.json speciesModelMapping vs GAME_SPEC.md species IDs
- `vegetation.json` has 15 species correctly mapped
- `species.json` (runtime config) has different IDs (`cherry-blossom`, `flame-maple`, etc.)
- `entitySpawner.ts BIOME_SPECIES_POOL` also uses the `vegetation.json`-compatible IDs
- The mismatch documented in master-analysis.md M6 remains: runtime species store uses wrong IDs

### Growth stage scales
- `vegetation.json:79` — `"growthScaleByStage": [0.15, 0.35, 0.6, 0.85, 1.0]`
- Spec §8 — stages 2/3/4 = 0.5x / 1.0x / 1.3x
- At stage 4 (Old Growth), the config caps at 1.0x instead of 1.3x — Old Growth and Mature trees are visually identical

---

## Priority Ranking of Issues

| Priority | Issue | Fix Required |
|----------|-------|-------------|
| P0 | WRONG-1: TreeInstances uses procedural geometry for GLB stages (2-4) | Rewrite `TreeInstances.tsx` to use `useGLTF` for stages 2-4, keep `createTreeGeometry` for stages 0-1 |
| P0 | WRONG-2: `NpcMeshes` (capsules) mounted instead of `NpcModel` (GLBs) | Replace `NpcMeshes` with `NpcModel` in Canvas, or add `NpcModel` alongside for GLB NPCs |
| P1 | MISSING: `ToolViewModel` not mounted — no held tool visible | Mount `<ToolViewModel>` inside Canvas |
| P1 | MISSING: `StructureInstances` not mounted | Mount inside Canvas |
| P1 | MISSING: `FenceInstances` not mounted | Mount inside Canvas |
| P1 | MISSING: `BushModel` / bush renderer not mounted | Need a `BushInstances` wrapper or direct ECS query for bush GLBs; mount in Canvas |
| P2 | MISSING: `HedgeMaze` not mounted | Mount inside Canvas |
| P2 | MISSING: `PropInstances` not mounted | Mount inside Canvas |
| P2 | MISSING: `GrovekeeperSpirit` not mounted | Mount inside Canvas |
| P2 | MISSING: `WaterBody` not mounted | Mount inside Canvas |
| P3 | MISSING: Enemy renderer component doesn't exist | Build `EnemyMesh.tsx` reading `EnemyComponent.modelPath` via `useGLTF`; mount in Canvas |
| P3 | Growth stage scale mismatch (1.0 cap vs 1.3 spec) | Update `vegetation.json growthScaleByStage[4]` to 1.3 |
| P3 | `resolveSpeciesModels()` silent fallback | Change to throw, matching "no placeholders" hard rule |

---

## What Is Currently Rendered in the Running Game

The runtime Canvas (`app/game/index.tsx:205-233`) renders exactly:
1. `<TerrainChunks />` — procedural heightmap planes (CORRECT)
2. `<Ground />` — flat plane fallback (CORRECT as fallback)
3. `<TreeInstances />` — procedural SPS geometry for ALL trees (WRONG for stages 2-4)
4. `<GrassInstances />` — GLB InstancedMesh (CORRECT, but never populated since chunk streamer not wired)
5. `<NpcMeshes />` — capsule primitives (WRONG — should be ChibiCharacter GLBs)
6. `<BirmotherMesh />` — procedural assembly (CORRECT)
7. `<FPSCamera />` — camera only (CORRECT)
8. `<PlayerCapsule />` — physics capsule (CORRECT)
9. `<Lighting />`, `<Sky />` — procedural (CORRECT)

**Everything else — bushes, structures, fences, hedges, props, enemies, held tools, water, spirits — renders nothing.**
