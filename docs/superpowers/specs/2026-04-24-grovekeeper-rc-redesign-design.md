---
title: Grovekeeper RC Redesign — Engine Port, Voxel Worlds, Grove Loop
updated: 2026-04-24
status: current
domain: technical
---

# Grovekeeper RC Redesign

## Why this exists

The deployed game is a cozy 2.5D third-person tree-tender on BabylonJS with 9 hardcoded JSON zones, no chunk streaming, no procedural generation, no voxel building, no animation cycles, and procedural chibi meshes. The internal docs (`MEMORY.md`, `CLAUDE.md`) describe an aspirational FPS-survival-Daggerfall game that does not exist. The MainMenu sells a cozy gardener — which the game *is* — but the journey from landing to first meaningful action feels POC because the game's structural identity (procedural worlds, voxel building, biome variety) is not actually present in the code.

The user's diagnosis: the game is on the wrong engine. BabylonJS does not natively give us chunks, voxels, or biome procgen. The sibling project `voxel-realms` already runs on Jolly Pixel (`@jolly-pixel/engine` + `@jolly-pixel/voxel.renderer`) with chunk streaming, Koota state, mobile Capacitor, and an itch.io asset pipeline producing real voxel GLBs with animation cycles. Grovekeeper should run on the same engine.

This spec is the RC redesign. It covers the engine port, the asset pipeline, the world architecture, the gameplay loop, the doc cleanup, and the verification gates.

---

## The game, in one paragraph

Grovekeeper is a third-person voxel tree-tending and town-building game. **You are The Gardener** — singular, mythic, the only one. You wander an **infinite procedural outer world** of biome archetypes (meadow / forest / coast), each with its own flora, fauna, voxel palette, weather, and **threats** (hostile creatures, hazards, light combat). Out in the wilderness, somewhere, you find a **Grove**: a special, consistent, glowing meadow biome that is unmistakably different from anywhere else. Groves are PRNG-seeded across the world. Inside a grove there is no danger — only soft light, ambient peaceful creatures, NPCs with random-pool flavor dialogue, and a **Grove Spirit** at the center. To claim the grove, you build a **Hearth** (biome-themed prefab). Lighting the hearth makes the grove yours, unlocks fast travel between all your claimed groves, and opens the grove for free voxel building and tree tending. The reward is what you build, not what NPCs ask of you. The two-mode tonal contrast — dangerous wild, peaceful grove — is the entire design.

---

## Architecture

### Engine

The renderer is split between two Jolly Pixel packages, with very different jobs. Confusing them is the failure mode that this section exists to prevent.

- **`@jolly-pixel/engine`** (v2.5.0) — Three.js-based ECS framework. Provides `Actor` / `ActorComponent` for scene entities, `ModelRenderer` for **GLB models with animation cycles** (the Gardener, NPCs, creatures, Grove Spirit, peaceful animals — anything that walks, idles, or emotes), `Camera3DControls` (we extend with a follow-lerp behavior), `Input` polling (keyboard/mouse/touch), `Systems.Assets` autoload + progress, and the `AudioManager` / `AudioLibrary` / `AudioBackground` / `GlobalAudio` audio stack (Howler-based).
- **`@jolly-pixel/voxel.renderer`** (v1.4.0) — Voxel chunk renderer. Provides `VoxelRenderer` actor component, `blockRegistry` for cube type registration, **PNG tileset loading via `loadTileset({id, src, tileSize})`** for block textures, JSON chunk format, configurable chunk size (we use 16³ matching voxel-realms), and a Rapier transitive dep for collision (we wrap it ourselves because the package doesn't expose collision query helpers).
- **`@jolly-pixel/runtime`** (v3.3.0) — Wraps engine init: canvas creation, asset autoload, GPU tier detection (sets FPS + pixel ratio), built-in `<jolly-loading>` element with progress tracking. We use it for boot. Replaces our hand-rolled landing-loader plan.

**Two-pipeline rendering rule.** The world's *terrain and structural voxels* (ground, building blocks, hearth, walls) render through the voxel renderer using **PNG tilesets per biome**. The world's *animated things* (Gardener, NPCs, creatures, Grove Spirit, ambient animals, certain props) render through the engine's `ModelRenderer` using **GLB models with animation cycles** sourced from the itch.io library. Both live in the same Three.js scene; the distinction is by data shape, not by location.

- **State**: Koota (already in use). Keep — for *pure game state* (claimed-grove DB, inventory, recipes-known, dialogue history, encounter timers). Engine `Actor` / `ActorComponent` is used for *scene-bound state* (the player Actor, NPC Actors, the chunk Actor). Voxel-realms uses both side-by-side; we follow the same split.
- **UI**: SolidJS (already in use). Keep — overlay HUD, menus, crafting surface, dialogue bubbles, fast-travel map. The engine has no UI overlay system; this is fully on us.
- **Bundler**: Vite (already in use). Keep.
- **Mobile shell**: Capacitor (already in use). Keep.
- **Persistence**: full stack is `drizzle-orm` (type-safe query layer, kept) → `@capacitor-community/sqlite` (unified SQL interface) → native SQLite on iOS/Android, sql.js under the hood on web (Capacitor SQLite's web adapter). One typed schema, three backends, transparently. `@capacitor/preferences` for small key-value settings (audio volume, graphics tier, last-played timestamp, world seed). Pattern matches `../mean-streets`.
- **Audio**: Jolly Pixel's `AudioManager` / `AudioLibrary` / `AudioBackground` / `GlobalAudio` (Howler-backed). We do *not* hand-roll a SoundManager. Real recorded SFX, music, and ambient assets sourced from itch.io packs via the asset pipeline. Tone.js dropped — engine's audio stack covers what we need: looped music beds via `AudioBackground`, one-shot SFX via `AudioLibrary` + `AudioManager`, channel/volume control via `GlobalAudio`. Music-by-biome is implemented at the gameplay layer (track-swap on biome change), not as an engine feature.
- **Physics**: Rapier — already a transitive dep of voxel.renderer. We write a thin collision wrapper because the package doesn't expose query helpers. Pattern aligned with voxel-realms.
- **Input**: engine's `Input` + `CombinedInput` for desktop (keyboard/mouse/gamepad). Mobile virtual joystick uses `nipplejs` (already a project dep) on top of engine touch polling. Action-mapping is DIY thin layer over engine input — we name actions (`move`, `interact`, `swing`, `place`, `open-craft`) so input is rebindable later.
- **Camera**: extend `Camera3DControls` with a follow-lerp behavior (pattern from voxel-realms' `CameraFollowBehavior`). Third-person, lerps to player position with a configurable offset, optional shake on hits.
- **Pathfinding**: existing A* on tile grid is removed. Movement is direct character control with voxel collision; pathfinding is not part of the gameplay anymore.

### What is deleted

The following systems exist in the current codebase but are made obsolete by this redesign and are removed in the port:

- BabylonJS scene managers: `SceneManager`, `CameraManager`, `GroundBuilder`, `LightingManager`, `SkyManager`, `PlayerMeshManager`, `TreeMeshManager`, `BorderTreeManager`, `BlockMeshFactory`. Replaced by Jolly Pixel scene primitives + voxel chunk renderer.
- Procedural chibi meshes: SPS tree generator, `treeMeshBuilder`, `FarmerMascot` SVG. Replaced by voxel GLB assets with animation cycles.
- 9-zone JSON world: `src/world-data/data/starting-world.json` and the zone loader. Replaced by procedural chunk streaming.
- Tap-to-move A* pathfinding: `pathfinding.ts`, `pathFollowing.ts`. Replaced by direct WASD / virtual-joystick movement against voxel collision.
- 2.5D orthographic diorama camera. Replaced by third-person follow camera over the voxel world.
- Tone.js dependency. Replaced by Jolly Pixel's `AudioManager` / `AudioLibrary` / `AudioBackground` / `GlobalAudio` stack (Howler-backed) loading curated recorded assets from `public/assets/audio/`. We do not hand-roll a SoundManager — see line 43 above for the canonical audio architecture.

### What is kept and ported

Game logic that is engine-agnostic stays. These run on Koota state and pure functions; they need their effects wired to the new renderer but their logic does not change:

- Tree growth lifecycle (`growth.ts`)
- Weather system (`weather.ts`) — visuals re-implemented as voxel particle layer
- Time / day-night (`time.ts`)
- Stamina (`stamina.ts`)
- Harvest (`harvest.ts`)
- NPC dialogue framework — adapted to the new phrase-pool model below
- Save / load (`saveLoad.ts`) — drizzle schema extended for chunks, biomes, groves, claim state, inventory, known recipes
- Achievements, discovery, recipes — kept where they survive the design contact below

### What is new

- **ChunkManager** — streams biome chunks of the outer world around the player (configurable radius, e.g. 3×3 active, 5×5 buffer). Each chunk is voxel terrain + voxel entities + biome metadata. Chunks far from any claimed grove and far from the player are unloaded; their seed regenerates them deterministically on revisit.
- **BiomeRegistry** — declarative definitions of each biome archetype (palette, voxel block set, flora table, fauna table, weather behavior, threat table, architectural prefab style, ambient audio palette).
- **GroveRegistry / GroveDB** — persistent state for every grove the player has discovered or claimed. Discovered = marker on map. Claimed = hearth lit, fast-travel enabled, building permitted.
- **Encounter system** — outer-world only. Probability tables driven by biome + time-of-day + weather. Spawns hostile or neutral fauna near the player.
- **Combat system (light)** — crafted weapons (axe, staff, spear, etc.). Stamina-gated swings. Damage to player; retreat to a claimed grove restores safety. No death state for RC; out-of-stamina or out-of-HP forces retreat. Player must craft their first weapon *before* the first wilderness leg.
- **Crafting + Building system (one system, Minecraft-style consumption/production loop)** — voxel materials gathered in the wilderness flow into crafting stations placed in groves. Crafting consumes inputs and produces outputs: tools, weapons, structural prefabs (Hearth, fence, walls), decorative blocks, processed materials. Building is just *placing* what crafting produces. The two are not separate screens — they share one surface, one menu, one mental model. Recipes live in JSON, biome-aware (coast salt-press, forest carpenter bench, etc.), scope-locked to RC's actual asset inventory. Different biomes unlock different production lines, giving each claimed grove economic identity.
- **Asset pipeline** — `.env` (with `ITCH_API_KEY`), `raw-assets/`, `scripts/fetch-itch-audio.mjs`, `scripts/import-from-voxel-realms.mjs`. Imports curate copies into `public/assets/voxels/{biomes,characters,creatures,props,structures,trees}/` and `public/assets/audio/`. Copies, never symlinks. Each Grovekeeper repo deploys self-contained.
- **Asset manifest** — generated JSON describing every imported asset (path, category, biome, has-animations, animation list, polycount, source). Drives runtime loading and shows up in `docs/asset-inventory.md`.

---

## World architecture

### Two distinct chunk types

**Outer-world chunk**: procedural, biome-typed, infinite. Generated from `(worldSeed, chunkX, chunkZ)`. Contains terrain voxels, ambient flora, fauna spawns, encounter triggers, weather state. May contain a *grove marker* if the PRNG roll for that chunk hits.

**Grove chunk**: special, consistent, glowing meadow biome. Always the same biome (Grove), regardless of where in the outer world it is placed. PRNG seed only varies layout details (NPC positions, ambient creature paths, prefab Grove Spirit pose, grass swirl direction). Glow shader and ambient audio are constants. Distinct enough that a player who has seen one knows another grove on sight.

The grove biome is *the* signature visual moment. Every grove looks like a grove. The contrast against whatever wilderness biome surrounds it is the diegetic announcement of safety.

### Biome archetypes

**Three wilderness biomes (Meadow, Forest, Coast) plus the special Grove biome.** Locked at this size by the Wave 2 asset inventory (`docs/asset-inventory.md`): these are the biomes whose flora, fauna, and audio coverage the itch.io library actually supports. Wetland, Alpine, and Scrub were considered but cut from RC and parked in `docs/post-rc.md` pending the assets and shaders they'd each require.

| Biome | Palette | Flora | Fauna | Threats | Architecture |
|---|---|---|---|---|---|
| Meadow | warm greens, gold | tall grass, daisies, oak | rabbits, deer, foxes | wolves at dusk, brambles | timber + thatch cottage |
| Forest | deep greens, moss | pine, fern, mushroom | squirrels, owls | bears, falling logs | log lodge |
| Coast | sand, foam, sea-blue | palm, dune grass, kelp | crabs, gulls, turtles | rogue waves, jellyfish | driftwood shack |

Plus the special Grove biome:

| Grove | luminous green-gold, soft white-gold glow | flowering grasses, blossom trees, single great central tree | rabbits, butterflies, fireflies | none | hearth-and-home (style depends on surrounding biome) |

Each biome's data file lives in `src/world/biomes/{biome}.ts` and references assets by path under `public/assets/voxels/biomes/{biome}/`. The hearth prefab style is chosen based on the *surrounding* biome at the moment of grove discovery, so a meadow-grove gets a timber cottage hearth and a coast-grove gets a driftwood shack hearth — diegetic continuity with the world the player just walked out of.

### Chunk streaming

Active radius and buffer radius are mobile-tuned (likely 2 active / 3 buffer on phone, 3 active / 5 buffer on desktop). Specifics live in `config/world.json` for tuning without code change. Streaming happens off the main loop where Jolly Pixel allows; otherwise time-sliced.

Determinism rule: any random behavior in chunk generation goes through `scopedRNG(scope, worldSeed, chunkX, chunkZ, ...)` (already a project convention). Same seed → same world, always.

---

## The Grove loop

### States

A grove progresses through three states:

1. **Undiscovered** — exists in the world's PRNG but not in player save data. Visible only by walking near it (not on map).
2. **Discovered** — player has entered the grove chunk. Marker added to map. Grove Spirit greets player. Building disabled. Fast-travel disabled. Player can hang out, talk to NPCs, watch creatures, but cannot yet make it home.
3. **Claimed** — player has placed and lit the Hearth. Grove is now part of the player's home network. Building enabled (voxel placement). Fast-travel enabled. Tree planting and growth enabled. Grove Spirit transitions from greeter to ambient resident.

### Grove Spirit

One per grove. Voxel character with idle and greet animation cycles. Speaks once on first arrival (welcoming line, biome-flavored), then idles ambient near the grove center. Not a quest giver. Not an obstacle. A presence.

The dormant `GrovekeeperSpirit` code in the current memory bank's notes is *aspirational*; the actual spec is what's written here. If existing code surfaces during the port, it is rebuilt to match this spec, not preserved.

### NPCs in groves

Peaceful villagers (1–4 per grove, voxel chibi-style with walk/idle animation cycles from the imported asset library). Phrase-pool dialogue — each NPC has a small array of context-appropriate phrases (biome flavor, weather flavor, time-of-day flavor, grove-flavor). Talking to an NPC pulls a random phrase from the pool. Not a quest system. No fetch tasks. Just life and atmosphere. Phrases live in `src/content/dialogue/phrase-pools.ts` keyed by biome × tag.

### Ambient creatures in groves

Always peaceful. Rabbits hop, butterflies drift, fireflies at dusk. Deterministic AI on simple wander/flee-from-player-at-distance routines. No combat against them.

### Hearth and claim ritual

The Hearth is the player's first crafted structure. It is a prefab voxel structure (4–6 blocks tall, biome-themed in style chosen by the surrounding outer-world biome) that is *produced* by the crafting system, then *placed* by the building system, then *lit* by interaction. The full chain:

1. Gather a small starter set of materials in the discovered grove itself (a fallen-log pile, a stone cairn — visible voxel resources placed by the grove generator specifically for the first claim, so the player never has to leave the grove to claim it).
2. Open the crafting surface at the grove's central crafting station (or a primitive workbench placed by the Grove Spirit before the player arrives — this is the player's first crafting interaction).
3. Craft the Hearth recipe. Inputs consumed; Hearth blueprint produced and added to the player's place-able list.
4. Place the Hearth somewhere on the grove surface (player choice — the spec allows the player to pick the spot, which is itself a small act of claiming).
5. Light the Hearth (single interaction). Cinematic moment: flame ignites, grove glow intensifies, Grove Spirit acknowledges with a second line, ambient music swells, fast-travel UI unlocks for this grove.

Once lit, the player has a home. Beyond the hearth, they craft and place whatever they want using voxel materials. The reward is the building.

### Crafting

Crafting is the production half of the production/consumption loop. It is not a separate screen with abstract recipes; it is a surface attached to a placed crafting station, and what it produces is either an item (tool, weapon, consumable) or a place-able blueprint (structural block, prefab, decorative). The first crafting station the player ever uses is the **primitive workbench** that the Grove Spirit has set up in the starter grove before the player arrives — diegetic teaching that this is how things get made here.

Recipe data lives in `src/content/recipes/*.json`, biome-tagged. A recipe specifies: input materials and counts, station type required, output (item or blueprint), unlock condition (always, or "after first claim", or "after discovering biome X"). Recipes are scope-locked to assets in the RC inventory — no recipes for items without voxel models.

The first weapon (the starter axe or staff — biome-flavored choice based on starter biome) is the second thing the player ever crafts, immediately after lighting the hearth. It is the single recipe pre-unlocked at the primitive workbench in the starter grove. This sequence is the entire pre-wilderness tutorial: gather → craft hearth → place hearth → light hearth → claim → craft weapon → step into the wild armed and homed.

Later crafting stations are themselves crafted and placed. Each grove the player claims can host its own production setup. Biome-specific stations unlock biome-specific recipes — coast salt-press unlocks preserved goods, forest carpenter bench unlocks joined timber structures, etc. This is the long-tail reason to claim multiple groves: each one is a different production capability.

For RC, the crafting recipe set is intentionally small — what is sufficient to teach the loop and support gameplay through the success-criterion playthrough — not a full Minecraft-scale tech tree. The tree expands post-RC as content additions, not as engine work.

### Fast travel

Map UI shows all claimed groves as nodes. Selecting a node fast-travels there. Travel from a claimed grove → outer world spawn at the grove's edge. Travel from outer world → only to claimed groves, must be on solid ground and not in active combat encounter.

---

## The outer world

### Combat and encounters

Light combat. Tools are weapons (axe, hoe, etc., depending on what's equipped). Stamina-gated swings. Hostile creatures have simple state machines (idle / chase / attack / flee at low health). Damage to player tracked as a small HP pool that regenerates inside groves and slowly outside.

For RC: no death state. Out-of-stamina or out-of-HP triggers a forced retreat — player is teleported back to nearest claimed grove with a faded screen transition. This keeps the cozy spirit while still making wilderness *feel* dangerous.

Encounters are biome- and time-of-day-driven. `EncounterTable` per biome lists creatures and weights. Triggered by player movement + dice + cooldown.

### Weather

Existing weather (rain / drought / windstorm) is preserved and extended per-biome — coast gets squalls, forest weather softens visibility, meadow weather is the baseline. Weather is biome-aware and affects encounter tables (some creatures only spawn in rain, etc.).

### Resource gathering

Voxel blocks are mined / chopped / dug from the outer world. Each biome has its signature material set. Carry inventory is capped (cozy-tier limits, not survival-tier punishment). Materials are spent in groves on hearth, structures, and free-build.

---

## The journey (landing → first claim → first wilderness)

This is the surface the user described as "POC and clumsy." The redesign treats the entire arc as one cinematic. The starter grove is the player's *first claim*, not a pre-claimed gift — claiming it is the tutorial.

1. **Landing** (`index.html` first paint, before JS hydrates). A single static SVG/CSS scene of the Grove biome — central blossom tree, soft glow, "Grovekeeper" wordmark. No spinner. Loads in under 200ms. Gives the player something to look at while the bundle hydrates.
2. **MainMenu**. Same Grove vignette as living motion. Voxel render of the grove central tree if engine is up; static SVG if not yet. "Begin" / "Continue" buttons. No mascot. Tone is *warm reverence*, not cute. Tagline retained: *"Every forest begins with a single seed."*
3. **New Game** flow. Single screen: world seed input (random by default, regenerable), Gardener name. No difficulty selector (cut from RC entirely). One "Begin" button.
4. **First spawn — discovered, unclaimed starter grove.** Player wakes inside a glowing grove that has *not* yet been claimed. The Grove Spirit is at the center. A primitive workbench has been set up. A small fallen-log pile and a stone cairn are visible nearby. No NPCs yet — this grove is unclaimed and the villagers haven't moved in. Daytime, calm music. The Grove Spirit speaks a single line that names what's needed: *"Light a hearth here, and this place is yours."* No modal popup. No quest log entry. The line is the instruction.
5. **Diegetic move teaching**. The Grove Spirit gestures toward the log pile. Movement controls fade in on first input.
6. **Diegetic gather teaching**. Approaching the log pile surfaces a single contextual interact prompt. Pressing it harvests one log (animation, voxel pickup, inventory increments). Repeat at the stone cairn. After a small target count is met (e.g. 3 logs + 2 stones), the Grove Spirit speaks again: *"The bench knows what to do."*
7. **Diegetic craft teaching — Hearth recipe.** Approaching the primitive workbench surfaces a crafting interact prompt. Opening the surface shows one recipe pre-unlocked: **Hearth**. Required inputs match what the player just gathered. One press crafts it; the Hearth blueprint enters the place-able list. The crafting surface is the same surface that will later show all recipes — the player learns the production half of the loop with their first interaction.
8. **Diegetic placement teaching — Hearth placement.** With the Hearth blueprint selected, a ghost preview follows the player. Placing it on the grove ground commits the structure (animation: voxel blocks settle in). The player chose the spot — that's their first act of authorship.
9. **The claim ritual**. Approaching the placed (unlit) Hearth surfaces a "light" prompt. Pressing it triggers the cinematic: flame ignites, grove glow intensifies, ambient music swells, Grove Spirit acknowledges with their second line, fast-travel UI appears (one node — *yours*), and 1–4 villager NPCs begin to enter the grove from the threshold edge over the next several seconds (the grove is now alive). The save state writes the first claimed grove to SQLite.
10. **Diegetic craft teaching — first weapon.** A second recipe is now unlocked at the workbench: a starter weapon (axe in meadow/forest starter biomes; spear in coast — biome-flavored). The Grove Spirit gestures toward the threshold and speaks a third line: *"Beyond the glow it's wild. Take a tool you can swing."* The player crafts the weapon. Inventory updates; the equipped-tool slot fills.
11. **The threshold**. Edge of the starter grove visibly transitions to wild biome. Palette, audio bed, and weather change at the boundary. A soft chime sounds at the edge — warning and invitation. The player chooses when to cross.
12. **First wilderness moment**. Outside the grove for the first time. Some gather-able material is within sight (signal that the production loop continues out here). A peaceful fauna walks past (signal that not everything in the wild is hostile). After a small wander distance, a non-lethal hostile encounter triggers — a wolf pup or equivalent that posts up. Because the player has a weapon, this is the *combat tutorial*: swing teaches the verb. The encounter is balanced so a few hits resolve it. Stamina drains visibly. Resolution: the player either wins (drops a small voxel reward) or retreats (proves retreat works). Either outcome is a successful tutorial.
13. **Discovery of second grove**. Within walking distance (PRNG biased to place a second grove close to spawn — hand-tuned, deterministic for the starter seed). Player approaches → sees the glow → recognizes it. Grove Spirit greets. Discovery state recorded.
14. **Open game**. From here the loop is the player's. Wander, gather, craft, claim, build, repeat. Fast-travel network grows with every claim.

Steps 4–13 are the entire RC tutorial. No modal popups. No tooltips beyond contextual interact prompts. Three Grove Spirit lines plus diegetic ghost-previews and visible affordances do all the teaching. By step 14 the player has experienced the full meta-loop: *gather → craft → build → claim → arm → wander → fight → discover*. The seventh success criterion (a cold player emerges with the loop in their head) is achievable because the loop itself was the tutorial.

---

## Asset pipeline

### Source

Assets are sourced from itch.io packs (Chaos-Slice, voxel character/creature/prop packs, audio SFX packs). The voxel-realms repo already has `.env` with `ITCH_API_KEY`, `raw-assets/{archives,extracted}/`, and `scripts/fetch-itch-audio.mjs`. That same pattern is lifted into Grovekeeper as its own copy.

### Repo isolation

Two repos. Two asset roots. Copies flow one way at developer discretion. Deployed builds depend on nothing outside their own repo. Symlinks are forbidden — they break CI and Pages deploys.

### Pipeline scripts

In Grovekeeper:

- `.env` — Grovekeeper's own copy of `ITCH_API_KEY` and any other tokens.
- `raw-assets/archives/` — gitignored. Downloaded zips.
- `raw-assets/extracted/` — gitignored. Unpacked source assets.
- `scripts/fetch-itch.mjs` — generalized version of voxel-realms' `fetch-itch-audio.mjs`. Pulls a configured allow-list of itch.io packs into `raw-assets/`.
- `scripts/import-from-voxel-realms.mjs` — copies a curated subset from `../voxel-realms/raw-assets/extracted/` into Grovekeeper's `raw-assets/extracted/`, then through the rest of the pipeline. Manual run, configured by category map. Used to bootstrap the asset library without re-downloading.
- `scripts/build-asset-manifest.mjs` — walks `public/assets/`, generates `src/assets/manifest.generated.ts` and `docs/asset-inventory.md`. Run on every asset change.
- `scripts/curate-assets.mjs` — copies selected assets from `raw-assets/extracted/` into the runtime tree under `public/assets/{tilesets,models,audio}/...` per a configured curation map. Tilesets that don't exist as PNG atlases in the source library are generated by a sub-step that picks block textures from the source library and packs them into per-biome atlases. The curation map (`asset-curation.json`) is the human-edited list of "these specific files / blocks / models / clips are in the game."

### Runtime layout

```text
public/assets/
  tilesets/             # PNG atlases for @jolly-pixel/voxel.renderer
    biomes/             # one tileset per biome — block textures
      meadow.png
      meadow.json       # tile-id mapping
      forest.png
      forest.json
      coast.png
      coast.json
      grove.png
      grove.json
    structures/         # block textures for crafted/placed structures
      hearth.png
      hearth.json
      common.png        # shared building blocks (planks, stone, glass)
      common.json
  models/               # GLB animated models for @jolly-pixel/engine ModelRenderer
    characters/
      gardener/         # the player — idle, walk, run, swing, place, gather, sit
    npcs/
      grove-spirit/     # idle, greet
      villagers/        # idle, walk, talk
    creatures/
      peaceful/         # rabbits, butterflies, deer, etc. — idle, walk, flee
      hostile/          # wolf-pup, scorpion, etc. — idle, alert, chase, attack, flee
    props/              # animated props (fluttering banners, swaying lanterns)
  audio/
    music/
      menu/             # landing + main menu
      grove/            # peaceful, glowing — looped per claimed grove
      biomes/           # one music bed per outer-world biome
        meadow/
        forest/
        coast/
      moments/          # claim cinematic, first weapon, encounter sting
    sfx/
      ui/               # menu, crafting, inventory clicks
      footsteps/        # per surface (grass, stone, sand, snow, water, wood)
      tools/            # axe chop, hoe dig, water splash, hammer
      crafting/         # forge, wickerwork, bench
      creatures/        # peaceful chirps, hostile growls, hits
      hearth/           # ignition, ambient crackle
    ambient/
      grove/            # birds, breeze, distant chimes
      biomes/           # one ambient bed per outer-world biome
        meadow/
        forest/
        coast/
      weather/          # rain, wind, surf
```

Files are committed. The `manifest.generated.ts` is committed too so the runtime loader has a typed manifest without re-walking the filesystem at runtime.

### First task in implementation: inventory

The first task in the implementation plan is to **walk `voxel-realms/raw-assets/extracted/` and write `docs/asset-inventory.md`** — full list of what already exists by category, with format, polycount, and animation-cycle status. We design around the actual asset pool, not an imagined one.

---

## Doc cleanup

This is a precondition, not an afterthought. Stale docs are what steered the project wrong.

- **`MEMORY.md`** — rewritten to describe the redesigned game. The current FPS / spirits-already-placed / Daggerfall-scale claims are deleted. New content describes the engine port, the loop, the biome system.
- **`CLAUDE.md`** (project root) — rewritten. Project identity section reflects the voxel + grove + outer-world game. The current "BabylonJS 8.x" tech stack table is updated to Jolly Pixel. Common commands stay accurate.
- **`docs/STATE.md`** — created if missing. Living doc of current build status. Updated as port progresses.
- **`docs/ARCHITECTURE.md`** — rewritten or replaced. Describes Jolly Pixel renderer, chunk streaming, biome registry, grove registry, asset pipeline.
- **`docs/DESIGN.md`** — rewritten. The two-mode loop. The Grove biome's special status. NPC phrase-pool model. No quests.
- **`docs/LORE.md`** — minimal. *You are The Gardener. The world holds groves. You find them and tend them.* That's the story.
- **`docs/ROADMAP.md`** — replaced. RC scope only. Anything beyond RC moves to a `post-rc.md` note.
- **`docs/TESTING.md`** — updated for the verification protocol below.
- **`memory-bank/activeContext.md`** and **`memory-bank/progress.md`** — rewritten. These are the files the autoloop reads on startup.

Docs are rewritten **before** any code lands so all subsequent agents in the task batch read accurate context.

---

## Testing & verification

Velocity is tied to objectivity. The user said "tested and tested and visually confirmed with screenshots." This section makes that concrete enough that task-batch can self-grade.

### Unit / integration

- All ported pure-function systems (growth, weather, time, stamina, harvest, encounters, biome lookup, grove state machine) keep or extend their existing tests.
- New systems get tests adjacent to source: `*.test.ts`.
- Determinism tests: `scopedRNG` for chunk generation must produce identical chunks for identical inputs.

### Browser tests

Vitest + Playwright (existing setup). Cover:

- Boot to MainMenu under 3s.
- New Game → spawn in starter grove. Player visible. Camera tracking.
- Movement input → player moves. WASD and mobile joystick.
- Interaction with first ripe tree → fruit collected.
- Cross grove threshold → biome change visible (palette delta detected via screenshot diff).
- Encounter triggers within a tuned distance budget.
- Discovery of second grove changes UI state (map node added).
- Hearth placement + lighting → claim state changes; fast-travel UI shows two nodes.

### Screenshot gates

A `docs/rc-journey/` directory is created. Every gate produces a committed PNG:

```text
docs/rc-journey/
  01-landing.png
  02-mainmenu.png
  03-newgame.png
  04-firstspawn-unclaimed-grove.png
  05-spirit-greets.png
  06-gather-logs.png
  07-craft-hearth.png
  08-place-hearth.png
  09-light-hearth-cinematic.png
  10-fasttravel-first-node.png
  11-villagers-arrive.png
  12-craft-first-weapon.png
  13-grove-threshold.png
  14-wilderness-first.png
  15-first-encounter.png
  16-second-grove-discovery.png
```

Screenshots are produced by a Playwright suite (`e2e/rc-journey.spec.ts`) that walks the deterministic playthrough end-to-end. The suite is part of CI and fails if any screenshot diverges materially from its committed baseline (tolerance configured per shot — landing is strict, in-world shots are lenient).

### Performance

- Lighthouse audit on landing — score budgets: Performance ≥ 90 mobile, Best Practices ≥ 95.
- Runtime FPS — ≥ 55 mobile, ≥ 60 desktop, measured on a fixed test rig over a 30-second walk in each of the four biomes (Meadow, Forest, Coast, Grove). Numbers committed to `docs/rc-journey/perf.md`.
- Bundle — gzipped initial under 500 KB. Asset budget under 20 MB total at RC.

### Rubric

`docs/rc-journey/REVIEW.md` contains a checklist scored per surface. Each surface is graded:

- **Tone coherence** (0–3): does it feel like one game?
- **Diegesis** (0–3): is the player taught by the world rather than UI?
- **Polish** (0–3): animation, lighting, audio, transitions feel finished?
- **Performance** (0–3): meets budgets?

A surface ships at score ≥ 10/12. Below that, the task batch keeps iterating on it.

### Visual verification by agent

The task-batch agents responsible for each surface MUST take Playwright screenshots, view them, and self-grade against the rubric before marking the task complete. Agents that mark complete without a committed screenshot in `docs/rc-journey/` fail the task gate.

---

## Implementation ordering

This spec is large. The implementation plan that comes next from `writing-plans` will decompose it into ordered tasks suitable for `task-batch`. Here is the rough ordering for plan-writing (not the plan itself):

1. **Doc cleanup wave** — rewrite `MEMORY.md`, `CLAUDE.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/STATE.md`, `memory-bank/*`. No code changes. Lands first so every later agent reads accurate context.
2. **Asset inventory wave** — write `docs/asset-inventory.md` from `voxel-realms/raw-assets/extracted/` covering both voxels *and* audio. No code changes.
3. **Asset pipeline wave** — Grovekeeper's `.env`, `raw-assets/`, `scripts/fetch-itch.mjs` (voxel + audio), `scripts/import-from-voxel-realms.mjs`, `scripts/curate-assets.mjs`, `scripts/build-asset-manifest.mjs`, `public/assets/` directory layout (voxels + audio trees), `asset-curation.json`. End state: pipeline runs, generates manifest, ships nothing yet.
4. **Persistence wave** — extend drizzle schema for chunks, biomes, groves, claim state, inventory, recipes-known, dialogue history. Wire `@capacitor-community/sqlite` (with sql.js web adapter) and `@capacitor/preferences`. Pattern matched to `mean-streets`. Tests for save/load round-trip.
5. **Audio wave** — drop Tone.js dependency. Wire engine audio (`AudioManager`, `AudioLibrary`, `AudioBackground`, `GlobalAudio`) to load curated clips from `public/assets/audio/`. Build a thin biome-music coordinator on top that swaps `AudioBackground` tracks on biome change and crossfades. SFX dispatched via `AudioLibrary` + `AudioManager`. No SoundManager hand-roll.
6. **Engine port scaffold wave** — install `@jolly-pixel/engine`, `@jolly-pixel/voxel.renderer`, `@jolly-pixel/runtime`, Rapier. Create new game scene Actor. Wire `loadRuntime` for boot + loading screen. Replace BabylonJS imports. Old systems still in place but not rendered. Build still passes.
7. **Tileset generation wave** — produce per-biome PNG tilesets + JSON tile-id maps under `public/assets/tilesets/biomes/`. Either curated from source library or generated by `scripts/curate-assets.mjs`'s tileset sub-step. Each biome gets ground, wall, accent, foliage-edge tiles minimum.
8. **Voxel terrain wave** — register block types with `blockRegistry`, load a tileset, render a single test chunk with biome palette. Player Actor with `ModelRenderer` (Gardener GLB) walks on it. Camera follow behavior tracks player.
9. **Biome registry wave** — three wilderness biomes (Meadow, Forest, Coast) implemented with tileset + voxel block sets + flora + ambient audio bed + biome music bed. Switching biome triggers tileset swap, music crossfade, ambient swap. Grove biome registered separately in wave 11.
10. **Chunk streaming wave** — infinite world wandering works.
11. **Grove biome wave** — Grove biome implemented as the special fourth biome. Glow shader. Discovery placement logic. Starter grove pre-set with workbench, log pile, stone cairn, Grove Spirit.
12. **Grove Spirit + NPC wave** — animated GLB characters via `ModelRenderer`. Spirit's three scripted lines. Villager phrase-pool dialogue. Villager arrival animation on first claim.
13. **Crafting + Building wave** — recipe data files, crafting station Actor, crafting surface UI (SolidJS overlay), voxel block placement against the chunk renderer, ghost preview, place commit. Hearth and starter weapon recipes pre-unlocked at primitive workbench. Tests for production/consumption math.
14. **Hearth + claim wave** — claim state machine, claim cinematic, fast-travel node registration, fast-travel UI. Wires to crafting + building wave for the placement step.
15. **Outer-world fauna wave** — peaceful and hostile creatures as animated `ModelRenderer` Actors. Encounter table.
16. **Combat wave** — crafted-weapon swings, stamina gating, hostile creature state machines, retreat-to-grove fallback. Balanced so the first encounter is winnable with the starter weapon.
17. **Resource gathering wave** — voxel mining/chopping/digging in the outer world via block interactions on the chunk renderer. Material drops feeding back into crafting.
18. **Journey wave** — landing, MainMenu, new game, the full step-4-through-step-13 cinematic. The actual surface the user complained about. This is where everything before this gets tied into a deterministic playable arc.
19. **Verification wave** — Playwright journey suite, all 16 screenshot baselines, Lighthouse, perf measurement per biome, rubric scoring.
20. **Polish wave** — anything below rubric threshold gets re-passed.

Each wave is one or more tasks in the plan; the plan defines tasks atomically with acceptance criteria.

---

## Out of scope for RC

- Quests, fetch chains, escort missions. The phrase-pool model is *all* the dialogue. No goals from NPCs.
- Player death, permadeath, difficulty tiers. Cut.
- Full 8-spirit collection arc. Each grove has *its* spirit; there is no overarching collection meta yet.
- Multiplayer, anything networked.
- Cosmetics, skins, prestige.
- Anything previously planned that isn't in the loop above.

These can come back post-RC if they earn it.

---

## Risks

- **Jolly Pixel maturity**. We're betting RC on an engine that's been used by one sibling project. The survey already identified concrete gaps: no built-in particle system (we need this for grove glow, weather, encounter VFX), no greedy meshing in the voxel renderer (perf risk on dense chunks), no shader plumbing exposed (grove glow needs a custom shader pass), no GLB animation blending in `ModelRenderer` (clip-by-clip switching only — fine for chibi, but no walk→run blends). Mitigation: build minimal Jolly Pixel proof of life through the engine scaffold + voxel terrain waves before deeper feature work; for each gap, pick "build thin layer ourselves" vs "contribute upstream" deliberately and document the call. The grove glow and weather particles get prototyped early — they're the highest-risk DIY layers.
- **Asset coverage**. *Partially mitigated.* The Wave 2 asset inventory (`docs/asset-inventory.md`) confirmed the itch.io library does not cover every biome originally proposed: Wetland (no water shader, thin fauna), Alpine (no snow tileset, no snow footsteps; visually collapses into Forest), and Scrub (no scrub flora, africa fauna pack clashes with cozy tone, no dust footsteps) were cut from RC and parked in `docs/post-rc.md`. RC is locked to **three wilderness biomes (Meadow, Forest, Coast) plus the special Grove biome** — the floor and ceiling are now the same number. Residual risk: late asset gaps inside the four locked biomes still surface during build; mitigation is the curated `asset-curation.json` plus inventory re-check on every pipeline run.
- **Scope**. This is a rewrite framed as a redesign. Mitigation: doc cleanup first means *every* agent in the batch has accurate context. The task batch is allowed to run for as long as it takes, with screenshot + rubric gates preventing regression. The user has stated time is not the constraint; quality is.
- **Mobile performance** with chunk streaming + voxel rendering + Rapier physics. Mitigation: tunable active/buffer chunk radius in `config/world.json`, perf measurement in the verification wave with explicit budgets.

---

## Success criteria

RC ships when all of the following are true:

1. Every screenshot gate in `docs/rc-journey/` is committed and matches a Playwright baseline.
2. Every surface scores ≥ 10/12 on the rubric.
3. Lighthouse landing performance ≥ 90 mobile.
4. Runtime FPS budgets hit in all three wilderness biomes + the grove biome.
5. Bundle and asset budgets met.
6. Internal docs (`MEMORY.md`, `CLAUDE.md`, `docs/*.md`, `memory-bank/*`) describe the actual game.
7. A new player who lands cold can play through landing → MainMenu → first spawn → gather → craft hearth → place hearth → light hearth (claim starter grove) → craft first weapon → cross threshold → first encounter → discover second grove, *without ever reading a tutorial popup*, and emerge with the full meta-loop (gather → craft → build → claim → arm → wander → fight → discover) in their head.

The seventh criterion is the one that matters. The screenshots, the rubric, the budgets all exist to serve it.
