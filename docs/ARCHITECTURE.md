---
title: Grovekeeper — Technical Architecture
updated: 2026-04-29
status: current
domain: technical
---

# Grovekeeper — Technical Architecture

This document describes *how the game is built*. The full source-of-truth
specs are at:

- `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
  — RC build (shipped; reference for what exists)
- `docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`
  — Voxel pivot (governs active development)

The gameplay "what" lives in `DESIGN.md`.

---

## Engine layering

Grovekeeper runs on three Jolly Pixel packages plus Three.js underneath.

### `@jolly-pixel/engine` (v2.5.0)

Three.js-based ECS framework. Provides:

- `Actor` and `ActorComponent` for scene entities.
- `Camera3DControls` — first-person camera (native mode; no follow
  extension needed after the voxel pivot).
- `Input` polling for keyboard, mouse, touch. `CombinedInput` aggregates
  keyboard + mouse + gamepad on desktop.
- `Systems.Assets` — autoload + progress tracking for the asset manifest.
- **JollyPixel engine audio stack** — `GlobalAudio` (master volume, shared
  `THREE.AudioListener`), `GlobalAudioManager` (load/create/destroy
  `THREE.Audio` / `THREE.PositionalAudio` instances), `AudioBackground`
  (playlist-based looped music with crossfade). Backed by Three.js Audio /
  Web Audio API. **Not Howler.**

> `ModelRenderer` is included in the engine package but is no longer used
> in production code after the voxel pivot. All creature and character
> rendering uses VoxelRenderer instead.

### `@jolly-pixel/voxel.renderer` (v1.4.0)

Voxel chunk renderer. The single rendering pipeline for everything in the
world after the voxel pivot. Provides:

- `VoxelRenderer` — `ActorComponent` that renders a `VoxelWorld`.
- `VoxelWorld` / `VoxelLayer` — layered data model. Multiple named layers
  composited highest-order-first.
- `blockRegistry` — registry for block types (id, shape, tile UVs, opacity,
  collision hint).
- `TilesetLoader` / `TilesetManager` — PNG atlas loading; `NearestFilter`
  applied automatically for pixel-art crispness.
- Built-in shapes: `cube`, `slabBottom`, `slabTop`, `poleY`, `pole`,
  `ramp`, `rampCornerInner`, `rampCornerOuter`, `stair`, `stairCornerInner`,
  `stairCornerOuter`, plus `flipY` for ceiling variants.
- `setLayerOffset` / `translateLayer` — shift a named layer in world space,
  marking all chunks dirty. Used for creature limb animation.
- Rapier integration: pass a Rapier instance at construction; colliders
  built and updated automatically alongside chunk meshes.

### `@jolly-pixel/runtime` (v3.3.0)

Boot wrapper. Canvas creation, GPU tier detection, asset autoload progress,
built-in `<jolly-loading>` element.

---

## Rendering — single pipeline

After the voxel pivot, everything renders through `@jolly-pixel/voxel.renderer`.

| Entity type | VoxelRenderer approach |
|---|---|
| Terrain | Standard chunk layers per biome |
| Structures (hearth, workbench, buildings) | Placed blocks committed to chunk data |
| Creatures (hostile + peaceful) | Multi-layer assemblies; limbs translated per frame |
| Grove Spirit | Voxel assembly of impossible grove-only materials |
| Ambient animals | Minimal voxel assemblies (2–4 blocks) |
| NPC villagers | 4-block assemblies |
| Weather particles | `poleY` layer translated each frame |

**Layer animation pattern:** Each creature body part is a named `VoxelLayer`.
The creature Actor calls `world.translateLayer(partName, delta)` each frame
to produce limb-swing animation.

**Layer naming convention:** `{entityId}-{partName}`
(e.g. `wolf-42-left-front-leg`). All layers are removed on despawn.

**Per-creature VoxelWorld:** To avoid `translateLayer` marking the entire
terrain world dirty, each creature Actor owns a separate `VoxelRenderer`
component with its own small `VoxelWorld`. The creature's layers exist only
in that local world; they're positioned by moving the Actor's `object3D`
in the shared Three.js scene.

---

## First-person camera

`Camera3DControls` in its native first-person mode. Eye height 1.6 units.
Mouse-look on desktop. Touch-drag to look on mobile. No custom follow
behavior. The Gardener player character (GLB) is removed — there is no
visible player body.

---

## State

Three state stores, strict rules on what goes where:

### Koota — pure game state

Everything that is not scene-bound and not a small KV setting:

- Claimed-grove DB
- Inventory (materials, items, equipped tool)
- Known compounds (discovered recipes via trait system)
- Journal entries
- Encounter cooldowns and timers
- `HasCraftedNamedWeapon` player trait (encounter gate)

### Engine `Actor` / `ActorComponent` — scene-bound state

Player camera position, creature Actors, chunk Actors, crafting-station
Actors. Per-frame state is engine state, not Koota state.

**Rule:** frame-rate state bound to a Three.js object → Actor. Pure game
data that survives sessions → Koota.

### `@capacitor/preferences` — small KV settings

Audio volume, graphics tier, last-played timestamp, world seed, input
bindings.

---

## Persistence stack

```text
src/db/schema/rc.ts             ← drizzle-orm typed schema
        ↓
drizzle-orm                     ← type-safe query layer
        ↓
@capacitor-community/sqlite     ← unified SQL interface
        ↓
┌──────────────────┬──────────────────────┐
│ native iOS/Android │ web                │
│ native SQLite      │ sql.js web adapter │
└──────────────────┴──────────────────────┘
```

Schema tables: `worlds`, `groves`, `chunks`, `inventory`, `known_recipes`
(legacy; kept for save compat), `known_compounds` (new; trait system),
`placed_structures`, `dialogue_history` (repurposed as journal), 
`journal_entries` (new).

---

## Input

JollyPixel engine `Input` + `CombinedInput` for desktop. `nipplejs` virtual
joystick for mobile.

Action map (`src/input/ActionMap.ts`):

- `move` — directional vector
- `interact` — context-sensitive primary action
- `swing` — weapon / tool use
- `combine` — combine two held items (trait compound resolution)
- `place` — commit blueprint placement
- `open-craft` — open crafting surface

---

## Audio

**JollyPixel engine audio stack** — `GlobalAudio`, `GlobalAudioManager`,
`AudioBackground`. Backed by `THREE.Audio` / Web Audio API. **Not Howler.**

- **Looped music beds** — `AudioBackground`. One bed per wilderness biome,
  one for grove, one for menu, one per cinematic moment.
- **One-shot SFX** — `GlobalAudioManager.createAudio` from pre-loaded
  buffers. UI clicks, footsteps, tool sounds, crafting, creatures,
  hearth crackle.
- **Ambient beds** — `AudioBackground` on a separate channel. Layered with
  music.
- **Master volume / channel mixing** — `GlobalAudio`.

`BiomeMusicCoordinator` (`src/audio/BiomeMusicCoordinator.ts`) crossfades
music + ambient beds on biome boundary crossing.

---

## Compound trait + crafting system

### Traits

Every material carries a bitmask of traits. `src/systems/traits.ts`.
Combining two materials unions their trait bitmasks.

### Compound resolution

`src/systems/compounds.ts` holds a declarative `COMPOUNDS` table. When
combined traits satisfy a rule's `requires` set, the compound is resolved
and named. First discovery writes to `known_compounds` and fires a Tracery
narrator event. Subsequent crafts: player can craft from name directly.

### Durability

Each crafted item instance has a `uses` count. Tracked in inventory.

### Time transforms

Some materials transform with time (wet stick → soft stick after 60s
game-time). Tracked via Koota `PendingTransforms` component.

---

## Tracery narrator + journal

`src/systems/narrator.ts`. Grammar in `src/content/narrator-grammar.json`.
Three registers: `neutral`, `impressed`, `baffled`. Events that trigger
narrator: first pick-up, compound naming, encounter trigger, claim,
journal entries.

Journal persisted in `journal_entries` table. Rendered in PauseMenu Journal
tab. No checkboxes — prose only.

---

## Physics

Rapier passed to `VoxelRenderer` at construction. Colliders built per-chunk
automatically. Movement is direct character control with voxel collision.

---

## World architecture

### Chunk types

**Wilderness chunk:** procedural, biome-typed, infinite. Generated from
`(worldSeed, chunkX, chunkZ)` via `scopedRNG`.

**Grove chunk:** special glowing meadow biome. Always `grove` biome type.
PRNG varies layout details only. Always placed within 32 voxels of spawn
for the default starter seed (spawn-outside-grove model).

### Biome registry

**Three wilderness biomes (Meadow, Forest, Coast) + Grove.** Locked by
asset inventory. Each biome: `BiomeDefinition` in
`src/world/biomes/{biome}.ts`.

### Encounter system

`src/systems/encounters.ts`. Gate: biome (non-grove) AND time-of-day weight
AND `hasCraftedNamedWeapon === true`. Until the first named weapon, no
hostile encounters spawn.

### Claim state machine

`undiscovered → discovered → claimed`. Discovery on grove entry.
Claim on hearth light. Claim cinematic: glow intensification, Grove Spirit
oscillation increase, fast-travel node registration, save write.

---

## Asset pipeline

Same as RC. Assets from itch.io packs. Pipeline scripts under `scripts/`.
After the voxel pivot, `public/assets/models/` is no longer needed for
creatures (they're procedurally assembled from registered block types).
The Gardener GLB under `models/characters/gardener/` is removed.

---

## What was deleted in the voxel pivot

- `PlayerActor.ts` — Gardener GLB character actor (no player character model)
- `CameraFollowBehavior.ts` — replaced by native first-person camera
- `GroveSpiritActor.ts` (GLB version) — replaced by `GroveSpiritVoxelActor.ts`
- All `ModelRenderer` usage in production code
- GLB model files under `public/assets/models/` (creatures, NPCs, Grove Spirit)
- Old `known_recipes` unlock gating in `CraftingPanel` (compound system replaces)
