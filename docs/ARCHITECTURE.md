---
title: Grovekeeper — Technical Architecture
updated: 2026-04-24
status: current
domain: technical
---

# Grovekeeper — Technical Architecture

This document describes *how the game is built*. The full source-of-truth
spec from which it derives is at
`superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`. The
gameplay-level "what" lives in `DESIGN.md`.

## Engine layering

Grovekeeper runs on three Jolly Pixel packages plus Three.js underneath.
Each package has a distinct job. **Confusing the three is the failure
mode** that this section exists to prevent.

### `@jolly-pixel/engine` (v2.5.0)

Three.js-based ECS framework. Provides:

- `Actor` and `ActorComponent` for scene entities. The Player, NPC,
  creature, crafting-station, and chunk are all Actors.
- `ModelRenderer` — renders **GLB models with animation cycles**. This is
  the pipeline for the Gardener, NPCs, creatures, the Grove Spirit,
  ambient animals, and animated props (banners, lanterns).
- `Camera3DControls` — base camera control component. We extend it with a
  `CameraFollowBehavior` that lerps to the player position with a
  configurable offset and supports optional shake on hits.
- `Input` polling for keyboard, mouse, touch. `CombinedInput` aggregates
  keyboard + mouse + gamepad on desktop.
- `Systems.Assets` — autoload + progress tracking for the asset manifest.
- `AudioManager` / `AudioLibrary` / `AudioBackground` / `GlobalAudio` —
  Howler-backed audio stack. Looped music beds via `AudioBackground`,
  one-shot SFX via `AudioLibrary` + `AudioManager`, master volume / channel
  control via `GlobalAudio`.

### `@jolly-pixel/voxel.renderer` (v1.4.0)

Voxel chunk renderer. Provides:

- `VoxelRenderer` — an `ActorComponent` that renders voxel chunks.
- `blockRegistry` — registry for cube types (id, tile uvs, opacity, etc).
- `loadTileset({id, src, tileSize})` — **PNG tileset loading** for block
  textures. One tileset per biome (plus a `structures` tileset for built
  blocks).
- JSON chunk format. We use 16³ chunks, matching the sibling `voxel-realms`
  project.
- Rapier as a transitive dependency. The renderer does not expose collision
  query helpers itself, so we own a thin wrapper.

### `@jolly-pixel/runtime` (v3.3.0)

Boot wrapper. Provides:

- Canvas creation.
- Asset autoload from the engine's `Systems.Assets`.
- GPU tier detection — sets target FPS and pixel ratio per tier.
- Built-in `<jolly-loading>` element with progress tracking. We use this
  as the loading screen between landing and first frame; it replaces our
  hand-rolled landing-loader plan.

### Two-pipeline rendering rule

Two render pipelines coexist in the same Three.js scene:

| Pipeline | Renderer | Data shape | Examples |
|---|---|---|---|
| **Voxel terrain** | `@jolly-pixel/voxel.renderer` | PNG tilesets + JSON chunks | ground, walls, hearth, structural blocks, decorative voxels |
| **Animated entities** | `@jolly-pixel/engine` `ModelRenderer` | GLB + animation cycles | Gardener, NPCs, creatures, Grove Spirit, ambient animals, animated props |

The distinction is by *data shape*, not by location. A Gardener stands
inside a chunk. A wolf chases over voxel terrain. Both are in the same
scene; the voxel chunk under their feet is the voxel pipeline, and they
are the GLB pipeline.

## State

Three state stores run side-by-side, with strict rules on what goes where:

### Koota — pure game state

Koota is the existing project ECS for *pure game data*. Everything that is
not scene-bound and is not a small KV setting goes here:

- Claimed-grove DB (one record per claimed grove: id, biome, hearth style,
  player-built blocks, villager state, last-visit timestamp).
- Inventory (materials, items, equipped tool).
- Recipes-known.
- Dialogue history (which NPC said what, last-spoken timestamps for
  variety logic).
- Encounter cooldowns and timers.

Koota records are persisted via the persistence stack below.

### Engine `Actor` / `ActorComponent` — scene-bound state

The Player Actor, NPC Actors, creature Actors, chunk Actors, and crafting-
station Actors live in the engine's scene graph. Their per-frame state
(position, animation phase, AI state) is engine state, not Koota state.

Voxel-realms uses Koota and engine Actors side-by-side; we follow the same
split.

**Rule.** If it changes every frame and is bound to a Three.js object, it's
an Actor. If it's pure game data that survives across sessions, it's Koota.

### `@capacitor/preferences` — small KV settings

Small key-value settings that don't need a relational store:

- audio volume
- graphics tier (auto-detected from GPU tier, user-overridable)
- last-played timestamp
- world seed
- input bindings

## Persistence stack

Full stack, top to bottom:

```text
src/persistence/schema.ts        ← drizzle-orm typed schema
        ↓
drizzle-orm                       ← type-safe query layer
        ↓
@capacitor-community/sqlite       ← unified SQL interface
        ↓
┌──────────────────┬───────────────────────┐
│ native iOS/Android │ web                  │
│ native SQLite     │ sql.js (web adapter)  │
└──────────────────┴───────────────────────┘
```

One typed schema, three backends, transparently. The pattern is matched to
the sibling `mean-streets` project.

The drizzle schema covers:

- **chunks** — generated chunk data per `(worldSeed, chunkX, chunkZ)`.
  Stores player-modifications only; un-modified chunks regenerate
  deterministically from seed.
- **biomes** — runtime cache of biome assignments per chunk for fast
  lookup; reproducible from seed.
- **groves** — discovered + claimed groves (state, biome, surrounding
  biome at discovery, hearth style, player-built blocks, villager seeds).
- **claim_state** — fast-travel network nodes.
- **inventory** — materials, items, equipped tool.
- **recipes_known** — unlock progression.
- **dialogue_history** — last-spoken timestamps per NPC × phrase tag.
- **player** — Gardener name, world seed, current grove, current biome,
  current chunk, position.

`@capacitor/preferences` runs in parallel for small KV settings (above).

## Input

Engine `Input` + `CombinedInput` for desktop. `nipplejs` virtual joystick
for mobile, layered over engine touch polling.

We name actions in a thin DIY layer (`src/input/ActionMap.ts`):

- `move` — directional vector
- `interact` — context-sensitive primary action
- `swing` — weapon / tool use
- `place` — commit blueprint placement
- `open-craft` — open crafting surface

Naming actions (rather than raw key codes) makes input rebindable later
without touching gameplay code. Bindings are persisted in
`@capacitor/preferences`.

## Camera

We extend `Camera3DControls` with a `CameraFollowBehavior` patterned after
voxel-realms' equivalent:

- Third-person.
- Lerps to player position with a configurable offset (slightly above and
  behind, looking down).
- Optional shake on hits, damage, or hearth-ignition cinematic moments.
- Pitch and yaw clamps on mobile to prevent disorienting touch-look.

## Audio

The engine's `AudioManager` / `AudioLibrary` / `AudioBackground` /
`GlobalAudio` stack covers everything we need. **Tone.js is dropped.**

- **Looped music beds** — `AudioBackground`. One bed per outer-world
  biome, one bed per claimed grove (shared grove track), one bed for menu,
  one for each cinematic moment (claim ignition, first weapon, encounter
  sting).
- **One-shot SFX** — `AudioLibrary` + `AudioManager`. UI clicks,
  footsteps (per-surface), tool sounds, crafting station sounds, creature
  vocalizations, hits, hearth crackle.
- **Ambient beds** — `AudioBackground` on a separate channel. Layered with
  music: birds + breeze in groves, biome ambient in wilderness, weather
  ambient (rain, blizzard, surf, dust) on top.
- **Master volume / channel mixing** — `GlobalAudio`.

A thin `BiomeMusicCoordinator` (`src/audio/BiomeMusicCoordinator.ts`) sits
on top of `AudioBackground`. When the player crosses a biome boundary, it
crossfades the wilderness music and ambient beds to the new biome. The
grove music bed crossfades on grove entry/exit.

We do **not** hand-roll a `SoundManager`. The engine's stack is the
SoundManager.

## Physics

Rapier is a transitive dep of `voxel.renderer` and is reused. We own a
thin collision wrapper (`src/physics/collision.ts`) because the package
doesn't expose query helpers we need (raycast, sphere overlap). The
wrapper pattern is aligned with voxel-realms' equivalent.

Movement is direct character control with voxel collision. The legacy A*
pathfinding from the BabylonJS build is removed.

## World architecture

### Two distinct chunk types

**Outer-world chunk.** Procedural, biome-typed, infinite. Generated from
`(worldSeed, chunkX, chunkZ)` via `scopedRNG`. Contains terrain voxels,
ambient flora, fauna spawn anchors, encounter triggers, weather state.
*May* contain a grove marker if the PRNG roll for that chunk hits.

**Grove chunk.** Special, consistent, glowing meadow biome. Always the
same biome (`grove`), regardless of where in the outer world it is placed.
PRNG seed only varies layout details (NPC positions, ambient creature
paths, prefab spirit pose, grass swirl direction). Glow shader and
ambient audio are constants. Distinct enough that a player who has seen
one knows another grove on sight.

### Biome registry

**Three wilderness biomes (Meadow, Forest, Coast) plus the special Grove biome.** Locked by the Wave 2 asset inventory (`docs/asset-inventory.md`); Wetland, Alpine, and Scrub are deferred to `docs/post-rc.md`. Each biome's data lives in `src/world/biomes/{biome}.ts`:

```ts
export const meadow: BiomeDefinition = {
  id: "meadow",
  palette: { /* ... */ },
  tilesetId: "meadow",
  blockSet: [/* registered ids */],
  flora: floraTable,
  fauna: { peaceful: peacefulTable, hostile: hostileTable },
  weather: weatherProfile,
  ambientAudio: "ambient/biomes/meadow",
  musicBed: "music/biomes/meadow",
  hearthStyle: "timber-cottage",
  // ...
};
```

`BiomeRegistry` (`src/world/BiomeRegistry.ts`) registers each biome on
boot. Lookups are by `id`. Adding a biome is a single-file change plus
asset additions under `public/assets/`.

### Grove registry

`src/world/GroveRegistry.ts`. In-memory registry of every grove the
player has interacted with (discovered or claimed), backed by the
`groves` and `claim_state` tables in the persistence layer. The registry
is hydrated on save load and updated on every state transition.

A grove's record carries: id, world coords, surrounding biome at
discovery (drives hearth style), discovered timestamp, claimed timestamp
(nullable), player-placed-blocks log, villager seeds.

### Chunk streaming

`src/world/ChunkManager.ts`. Maintains an active radius (chunks rendered
+ ticked) and a buffer radius (chunks loaded but not rendered).

- Mobile target: ~2 active / ~3 buffer.
- Desktop target: ~3 active / ~5 buffer.

Specifics live in `config/world.json` for tuning without code change.

Streaming is time-sliced where Jolly Pixel does not allow off-main-loop
work, otherwise off-loop. Chunks far from the player and far from any
claimed grove are unloaded; their seed regenerates them deterministically
on revisit. Player modifications are persisted in the `chunks` table
keyed on `(worldSeed, chunkX, chunkZ)`.

### Determinism rule

Any random behavior in chunk generation goes through
`scopedRNG(scope, worldSeed, chunkX, chunkZ, ...extra)`. This is already a
project convention. Same seed → same world, always. The screenshot test
suite depends on this guarantee.

## Crafting + Building

Crafting and Building share one surface, one menu, and one mental model.
Implementation:

- **Recipe data** — JSON files in `src/content/recipes/*.json`. Each
  recipe specifies: inputs (material id + count), station type required,
  output (item or blueprint), unlock condition.
- **Crafting station Actor** — placed in groves. On interaction opens the
  crafting surface UI for that station type.
- **Crafting surface UI** — single SolidJS overlay
  (`src/ui/CraftingSurface.tsx`). Shows recipes for the active station,
  filtered by player's known recipes. Crafting consumes inputs from
  inventory and produces an item or a blueprint.
- **Place-able list** — blueprints sit in a place-able list separate
  from inventory. Selecting a blueprint enters placement mode.
- **Placement mode** — ghost preview follows the player against voxel
  collision; commit on `place` action; cancel on `interact` from placement
  mode.
- **Building system** — `src/systems/building.ts`. Wraps voxel block
  placement on the chunk renderer; persists modifications to the `chunks`
  table.

Recipes are scope-locked to the RC asset inventory. The full tech tree is
deferred to post-RC.

## Encounters and combat

`src/systems/encounters.ts`. Encounter tables are per-biome, weighted by
time-of-day and weather. A roll on player movement + dice + cooldown
spawns a creature near the player.

`src/systems/combat.ts`. Crafted-weapon swings are stamina-gated. Hostile
creatures have simple state machines (idle / chase / attack / flee at low
health). Damage to player is tracked in a small HP pool that regenerates
inside groves and slowly outside.

**No death.** Out-of-stamina or out-of-HP triggers a forced retreat — the
player is teleported back to the nearest claimed grove with a faded screen
transition, HP/stamina restore.

## Claim state machine

`src/systems/claim.ts`. A grove progresses through states: `undiscovered →
discovered → claimed`. Transitions are gated by side-effect events:

- `undiscovered → discovered`: player Actor enters grove chunk for the
  first time.
- `discovered → claimed`: player commits a `light` interaction on a
  placed Hearth in the grove.

The `claimed` transition triggers the cinematic (camera shake, audio
swell, glow shader intensification, villager arrival animation), writes
the save, and registers the grove as a fast-travel node.

## Fast travel

`src/systems/fastTravel.ts` + `src/ui/FastTravelMap.tsx`. Map UI shows
claimed groves as nodes. Selecting a node teleports the player to that
grove's edge spawn. Outer-world → grove travel is allowed; outer-world →
outer-world is not. Travel is blocked during active combat encounters and
when the player is not on solid ground.

## NPC dialogue

`src/systems/npcDialogue.ts` + `src/content/dialogue/phrase-pools.ts`.
Phrases keyed by **biome × tag** (biome flavor / weather / time-of-day /
grove). On talk, pull a random phrase weighted to avoid recent repeats
(uses `dialogue_history` table for variance).

The Grove Spirit's three scripted lines are special-cased — they are
content data, not phrase-pool draws, and play in sequence during the
first-claim ritual.

## Asset pipeline

Assets are sourced from itch.io packs (Chaos-Slice, voxel character /
creature / prop packs, audio SFX packs). The voxel-realms repo already has
the infrastructure; we lift the same pattern into Grovekeeper as its own
copy.

### Repo isolation

Two repos. Two asset roots. Copies flow one way at developer discretion.
Deployed builds depend on nothing outside their own repo. Symlinks are
forbidden — they break CI and Pages deploys.

### Pipeline scripts

In Grovekeeper:

- `.env` — own copy of `ITCH_API_KEY` and tokens.
- `raw-assets/archives/` — gitignored. Downloaded zips.
- `raw-assets/extracted/` — gitignored. Unpacked source assets.
- `scripts/fetch-itch.mjs` — pulls a configured allow-list of itch.io
  packs into `raw-assets/`.
- `scripts/import-from-voxel-realms.mjs` — copies a curated subset from
  `../voxel-realms/raw-assets/extracted/` into Grovekeeper's
  `raw-assets/extracted/`. Manual run, configured by category map. Used
  to bootstrap without re-downloading.
- `scripts/curate-assets.mjs` — copies selected assets from
  `raw-assets/extracted/` into `public/assets/{tilesets,models,audio}/...`
  per `asset-curation.json`. Tilesets that don't exist as PNG atlases in
  the source library are generated by a sub-step that picks block
  textures from the source library and packs them into per-biome atlases.
- `scripts/build-asset-manifest.mjs` — walks `public/assets/`, generates
  `src/assets/manifest.generated.ts` and `docs/asset-inventory.md`.

Both `manifest.generated.ts` and `asset-inventory.md` are committed.

### Runtime layout

```text
public/assets/
  tilesets/
    biomes/
      {biome}.png + {biome}.json    # one tileset per biome
    structures/
      hearth.{png,json}
      common.{png,json}             # shared building blocks
  models/
    characters/gardener/            # idle, walk, run, swing, place, gather, sit
    npcs/grove-spirit/              # idle, greet
    npcs/villagers/                 # idle, walk, talk
    creatures/peaceful/             # idle, walk, flee
    creatures/hostile/              # idle, alert, chase, attack, flee
    props/                          # banners, lanterns
  audio/
    music/menu/
    music/grove/
    music/biomes/{biome}/
    music/moments/                  # claim cinematic, first weapon, encounter sting
    sfx/ui/
    sfx/footsteps/                  # per surface
    sfx/tools/
    sfx/crafting/
    sfx/creatures/
    sfx/hearth/
    ambient/grove/
    ambient/biomes/{biome}/
    ambient/weather/
```

The first task in the implementation plan is to walk
`voxel-realms/raw-assets/extracted/` and write `docs/asset-inventory.md`
covering both voxels and audio. **We design around the actual asset pool,
not an imagined one.** The biome list shrinks if assets don't exist.

## What is deleted from the BabylonJS build

The following systems are made obsolete by this redesign and are removed
in the engine port wave:

- BabylonJS scene managers: `SceneManager`, `CameraManager`,
  `GroundBuilder`, `LightingManager`, `SkyManager`, `PlayerMeshManager`,
  `TreeMeshManager`, `BorderTreeManager`, `BlockMeshFactory`. Replaced by
  Jolly Pixel scene primitives + voxel chunk renderer.
- Procedural chibi meshes: SPS tree generator, `treeMeshBuilder`,
  `FarmerMascot` SVG. Replaced by voxel GLB assets with animation cycles.
- 9-zone JSON world: `src/world-data/data/starting-world.json` and the
  zone loader. Replaced by procedural chunk streaming.
- Tap-to-move A* pathfinding: `pathfinding.ts`, `pathFollowing.ts`.
  Replaced by direct WASD / virtual-joystick movement against voxel
  collision.
- 2.5D orthographic diorama camera. Replaced by third-person follow camera
  over the voxel world.
- Tone.js dependency. Replaced by engine `AudioManager` /
  `AudioLibrary` / `AudioBackground` / `GlobalAudio` loading recorded
  assets from `public/assets/audio/`.

## What is kept and ported

Game logic that is engine-agnostic survives; effects re-wire to the new
renderer but the logic doesn't change:

- Tree growth lifecycle (`growth.ts`)
- Weather system (`weather.ts`) — visuals re-implemented as voxel particle
  layer
- Time / day-night (`time.ts`)
- Stamina (`stamina.ts`)
- Harvest (`harvest.ts`)
- Save / load (`saveLoad.ts`) — drizzle schema extended for chunks,
  biomes, groves, claim state, inventory, recipes-known, dialogue history
- Achievements, discovery, recipes — kept where they survive the design
  contact in `DESIGN.md`

## Risks (tracked from the spec)

- **Jolly Pixel maturity.** No built-in particle system, no greedy meshing,
  no shader plumbing exposed, no GLB animation blending. Mitigation: thin
  layers we own; earliest validation through the engine scaffold + voxel
  terrain waves; grove glow and weather particles prototyped early.
- **Asset coverage.** *Partially mitigated.* The Wave 2 inventory locked
  RC to **three wilderness biomes (Meadow, Forest, Coast) plus the special
  Grove biome.** Wetland, Alpine, and Scrub were cut to `docs/post-rc.md`.
  Floor and ceiling are now both four. Residual risk: late asset gaps
  inside the locked biomes — mitigated by `asset-curation.json` plus
  inventory re-check on every pipeline run.
- **Mobile performance** under chunk streaming + voxel rendering + Rapier.
  Mitigation: tunable chunk radius in `config/world.json`; per-biome FPS
  measured in the verification wave.
- **Scope.** This is a rewrite. Mitigation: doc cleanup (this wave) lands
  first; the task batch is allowed to run as long as it takes; screenshot
  + rubric gates prevent regression.
