# Grovekeeper: Unified Game Design & Implementation Plan

**Date:** 2026-03-07
**Status:** Master synthesis of 10 domain-specific design docs + Grok integration plan + asset inventory
**Approach:** Grok conversation is the forward vision baseline. BabylonJS archive is reference only.

---

## Table of Contents

1. [Design Pillars](#pillars)
2. [The Procedural/Model Balance](#balance)
3. [Game Modes: Survival](#modes)
4. [Open World: Infinite Procedural Exploration](#world)
5. [Tree Species & Growth](#trees)
6. [Tool Actions & First-Person Feel](#tools)
7. [Economy, Crafting, & Trading](#economy)
8. [NPCs, Quests, & Dialogue](#npcs)
9. [Progression, New Game+, & Achievements](#progression)
10. [Day/Night, Weather, & Atmosphere](#atmosphere)
11. [Audio & Spatial Sound](#audio)
12. [Tutorial & User Flow](#flow)
13. [Asset Integration Strategy](#assets)
14. [Implementation Phases](#phases)
15. [Cross-Cutting Concerns](#cross-cutting)
16. [World Quest Narrative System](#world-quests)

---

<a id="pillars"></a>
## 1. Design Pillars

**Become a Grovekeeper.** The name IS the game. You're a nobody who sets out into an infinite procedural world and discovers the dormant Grovekeepers — ancient guardians of tree species hidden deep within hedge labyrinths. Find them all, unlock every species, master the land. Survival-style resource accumulation and consumption: hunt, fish, plant, farm, gather minerals, forge tools. Every comfort is earned.

**PSX Aesthetic.** No antialiasing. Pixel ratio 1. Flat shading. Chunky geometry. Low segment counts. Pixelated textures (NearestFilter). This is an intentional art direction, not a limitation.

**Seeded Determinism.** Same seed = same world, always. Zero Math.random(). All randomness via `scopedRNG(scope, worldSeed, ...extra)`. Seed phrases: "Adjective Adjective Noun" using brand-aligned word lists.

**Mobile-First.** 375px portrait minimum. 44px touch targets. <50 draw calls. <30K visible vertices. 55+ FPS on mid-range mobile.

**Models Where Craft Matters, Procedural Where Variation Matters.** 3DPSX GLB models for trees, NPCs, structures, props, fences, seasonal bushes, hedge maze, crops, tools. Procedural for terrain, water, sky, weather, audio.

---

<a id="balance"></a>
## 2. The Procedural/Model Balance

This is the critical design decision. The Grok conversation demonstrated sophisticated procedural techniques. The asset library provides 37,497 pre-made models. Neither extreme is right -- the balance IS the game's visual identity.

### Procedural (shaders, effects, terrain)

| Element | Why Procedural | Technique |
|---------|---------------|-----------|
| **Terrain** | Infinite variation from seed. Per-biome noise profiles. | AdvancedSeededNoise: fBm + ridged + domain warping. PlaneGeometry vertex displacement. |
| **Water** | Animated, interactive, must respond to splashes/wind. | Gerstner wave shader (4-6 waves mobile, 8 desktop). Foam + caustics + fresnel. |
| **Sky** | Continuous color transitions across time-of-day x season. | ShaderMaterial with 8-stop gradient interpolation. Procedural cloud noise. |
| **Weather particles** | Rain, snow, leaves, dust -- ephemeral, count varies. | CSS overlays (zero draw calls) OR instanced points. |
| **Audio** | 6-layer ambient soundscape, spatial positioning, FM synthesis. | Tone.js PolySynth/FMSynth/NoiseSynth + Panner3D HRTF. |
| **Tree growth** | Scale interpolation between stages, season color tint. | GLB base models + procedural scale/color uniforms. |

### GLB Models (the visual foundation)

The 3DPSX library IS the game's visual identity. PSX-native models with pixel-art texture atlases, intentionally low-poly, stylistically coherent.

| Element | Why Models | Source | Count |
|---------|-----------|--------|-------|
| **Trees** | 8 hand-crafted PSX tree silhouettes (32-45 KB each). Growth stages via scale. Seasons via winter variant GLB swap or color tint. Replaces 951-line SPS generator with ~50 lines. | 3DPSX Retro Nature trees | 8 + 6 winter |
| **NPCs** | Mix-and-match chibi characters with professional PSX modeling. Night glow via "pr" emission variants. | 3DPSX ChibiCharacters + individual items | 7 base + 33 items |
| **Farm structures** | Barn, 5 houses, windmill, water well, 2 campfires, chicken coops, storage, notice board, lamp. 2-65 KB each. | 3DPSX Farm Assets | 85 |
| **Seasonal bushes** | 52 bush shapes x 5 seasons (spring/summer/autumn/winter/dead) with baked seasonal textures. Swap GLB, no material changes. | 3DPSX All Bushes | 262 |
| **Fences/walls** | Brick, drystone, wooden, metal, plackard, plaster, white picket. Corners, gates, broken variants. | 3DPSX Fences | 79 |
| **Trees (decorative)** | Border/background trees. 8 types + 6 winter variants. Player-planted trees also use GLB models with scale-per-stage growth. | 3DPSX Retro Nature | 14 |
| **Grass blades** | 9 blade types + grass bush + patches. 1-2 KB each. Instance thousands. | 3DPSX Retro Nature | 11 |
| **Tools** | Player holds at point-blank range. 56-127 verts, shared 128x128 texture atlas. | 3DPSX PSX Tools | 5 |
| **Crops** | Apple, carrot, cucumber, pumpkin, tomato. Farming expansion ready. | 3DPSX Farm Assets | 5 |
| **Modular structures** | Walls, floors, roofs for player custom building. | PSX Mega Pack II | ~210 |
| **Survival props** | Crates, barrels, shelves, buckets, jerry cans, toolboxes, lamps (on/off). | PSX Mega Pack II | ~137 |
| **Kitchen/food** | Market/trading visuals: pizza, toast, bowls, utensils, bottles. | 3DPSX Kitchen Props | 48 |
| **Fantasy props** | Books/scrolls, bottles, treasure, crates, barrels. Merchant/NPC interiors. | 3DPSX Fantasy Mega Pack | ~10 |
| **Villager NPCs (composite)** | Additional NPC variety. Needs Blender split into individual meshes. | 3DPSX Fantasy Villager NPCs | 1 (multi-mesh) |
| **Village buildings (composite)** | Pre-placed village structures. Needs Blender split. | 3DPSX Fantasy Village Buildings | 1 (multi-mesh) |

### Hybrid (procedural placement of models)

| Element | How It Works |
|---------|-------------|
| **World generation** | Procedural noise determines WHERE; GLB models fill the spots. Flower positions from noise threshold, model from pool. |
| **Vegetation groundcover** | Noise-driven density maps. GLB flowers/grass/bushes placed at sample points. |
| **Rock formations** | Noise ridges define rocky areas. GLB rock models scattered within. |
| **Structure placement** | Procedural rules (flat terrain, adjacent to path) determine valid positions. GLB structure models placed. |

### Vertex Budget (per chunk, single rendered chunk)

| Category | Verts per Instance | Max Count | Total |
|---------|-------------------|-----------|-------|
| Terrain plane (64x64) | 4,096 | 1 | 4,096 |
| Trees (GLB, instanced) | ~100-400 | 50 | ~10,000 |
| NPCs (ChibiCharacter GLBs) | ~300-600 | 10 | ~4,000 |
| Structure GLBs | ~50-200 | 20 | ~2,000 |
| Prop GLBs | ~30-100 | 40 | ~2,000 |
| Decoration GLBs | ~20-50 | 60 | ~1,800 |
| Water surface | ~146 | 3 | 438 |
| Tool view model | ~127 | 1 | 127 |
| Seasonal bushes (GLB) | ~50-150 | 30 | ~3,000 |
| Fences (GLB) | ~30-80 | 20 | ~1,000 |
| Grass blades (GLB instanced) | ~10-20 | 200 | ~3,000 |
| **Total** | | | **~30,000** |

Well within budget. GLB trees are dramatically cheaper than SPS procedural trees (100-400 verts vs 200-1,300). Instanced rendering via InstancedMesh for same-model repetitions.

---

<a id="modes"></a>
## 3. Survival — The Only Mode

Grovekeeper is a survival game. No "exploration mode." No "creative mode." Every resource is earned. Weather hurts. Nights are dangerous. Comfort is built, not given.

This doesn't mean punishing — it means MEANINGFUL. Planting a tree matters because the seed cost resources. Finding a village matters because you need the campfire. Discovering a Grovekeeper matters because it unlocks a new species you couldn't access before.

### New Game Flow

```
Seed Phrase → Difficulty Tier → Start → Tutorial Village → Set Out
```

### Difficulty Tiers

| Tier | Hearts | Growth | Yield | Weather | Stamina | Target Player |
|------|--------|--------|-------|---------|---------|--------------|
| Seedling | 7 | 1.0x | 1.0x | 0.5x | 1.0x | First playthrough, learning |
| Sapling | 5 | 0.8x | 0.75x | 1.0x | 1.3x | Standard experience |
| Hardwood | 4 | 0.6x | 0.5x | 1.5x | 1.6x | Experienced players |
| Ironwood | 3 | 0.4x | 0.3x | 2.0x | 2.0x | Permadeath. One life. |

### Core Survival Systems

| System | Behavior |
|--------|---------|
| **Hearts** | 3-7 max (tier). Damage from exposure, exhaustion, storms, maze enemies. |
| **Hunger** | Eat harvested food (fruit, fish, crops) to maintain stamina regen. Starving = no stamina regen, slow heart drain. |
| **Stamina** | 100 max (tier-adjusted regen). Drain on tool use, sprinting, combat. Exhaustion at 0 = vulnerable. |
| **Weather** | Real impact: rain (growth boost but cold exposure), drought (reduced yields), windstorm (structural/tree damage), snow (movement slow, exposure). |
| **Temperature** | Biome + weather + time-of-day. Campfire/shelter = warmth. Frozen Peaks without gear = heart drain. |
| **Healing** | Eat fruit (+1), campfire rest (+0.5/min), herbal remedy (+2), dawn renewal (+1). Cooked food heals more than raw. |
| **Death** | Drop carried resources, respawn at last campfire. Ironwood: permadeath — game over, start new seed. |
| **Structures** | Degrade over time. Campfire/shelter/windbreak are essential, not optional. |

### Resource Loop

```
Chop trees → Timber
Harvest fruit → Food (eat or trade)
Fish at ponds → Food + rare materials
Mine rock formations → Stone, Ore
Forage bushes → Berries, Herbs
Hunt (Survival) → Meat, Hide
Farm crops → Renewable food source

Timber + Stone → Structures (campfire, shelter, windbreak, storage)
Ore + Timber → Tool upgrades (better axe, pickaxe, etc.)
Herbs → Remedies (healing items)
Hide → Warm clothing (cold resistance)
```

### Starting Gear (Tutorial Village)

| Item | Purpose |
|------|---------|
| Basic Axe | Chop trees (slow, low yield) |
| Basic Trowel | Plant seeds, dig |
| Watering Can | Water plants |
| 3 White Oak seeds | Starter species (the only one you begin with) |
| Leather Satchel | Inventory (small capacity, upgradeable) |
| Worn Compass | Always points home + nearest campfire |

No fishing rod (craft it). No pickaxe (forge it). No warm clothing (make it). Progression is EARNING your toolkit.

### Essential Structures

| Structure | Effect | Source | Unlock |
|-----------|--------|--------|--------|
| Campfire | Heart regen, warmth, cooking, fast travel point | 3DPSX Farm campfire GLB | Start (taught in tutorial) |
| Lean-to Shelter | Sleep to advance time, weather protection | 3DPSX Farm storage GLB | Craft: 10 Timber |
| Windbreak Wall | Block wind damage in radius | 3DPSX Farm fence GLBs | Craft: 8 Timber + 4 Stone |
| Storage Chest | Safe resource storage (death-proof) | PSX Mega Pack crate GLB | Craft: 12 Timber + 2 Stone |
| Rain Collector | Water supply during drought | 3DPSX Farm barrel GLB | Craft: 6 Timber + 4 Stone |
| Herb Garden | Grow healing herbs renewable | 3DPSX Farm terrain GLB | Craft: 8 Timber + Herb seeds |
| Forge | Upgrade tools, smelt ore | PSX Mega Pack structure GLB | Craft: 20 Stone + 10 Ore + 15 Timber |
| Fishing Dock | Better fishing yield at water | 3DPSX Farm wooden frame GLB | Craft: 15 Timber + 5 Stone |

### Architecture: Config-Driven

Systems read numeric multipliers from `getDifficultyConfig(tier)`. All tuning in `config/game/difficulty.json`. Never `if (tier === 'ironwood')` — always multiplied values that naturally scale.

---

<a id="world"></a>
## 4. Open World: Infinite Procedural Exploration

### Core Architecture: Chunk-Based Generation

**No fixed world size. No zone boundaries. No loading screens.**

The world is an infinite 2D plane divided into chunks. Chunks generate on demand as the player explores. The world is seeded — same seed always produces the same terrain, features, NPCs, and quests at the same coordinates. The player can walk in any direction forever and always find new things.

```
Player position → active chunk ring (viewport radius)
  → generate missing chunks from seed + coordinates
  → render active chunks
  → unload distant chunks (keep delta in store)
  → re-entering old area = regenerate from seed + apply stored delta
```

### Chunk System

- **Chunk size:** 16x16 tiles (same as old zone, but no borders — seamless stitching)
- **Active radius:** 3x3 chunks around player (48x48 visible tiles)
- **Pre-generation ring:** 5x5 chunks (outer ring generates in background, not rendered)
- **Chunk key:** `"${chunkX},${chunkZ}"` — deterministic from coordinates
- **Generation:** `generateChunk(worldSeed, chunkX, chunkZ)` — pure function, zero side effects
- **Seamless:** terrain noise, biome blending, and path networks stitch across chunk boundaries because they use global coordinates, not chunk-local

### Persistence: Delta-Only Storage

The critical insight: **if generation is deterministic from seed, you only store what the player CHANGED.**

```typescript
interface ChunkDelta {
  plantedTrees: { tileX: number; tileZ: number; speciesId: string; plantedAt: number; stage: number }[];
  harvestedTrees: { tileX: number; tileZ: number; harvestedAt: number }[];  // marks procedural tree as removed
  builtStructures: { tileX: number; tileZ: number; structureId: string; rotation: number }[];
  removedItems: { tileX: number; tileZ: number; itemType: string }[];       // player broke/picked up a procedural item
  npcRelationships: { npcId: string; relationship: number }[];              // only store if modified from default
  completedQuests: string[];
  discoveredSpecies: string[];
}
```

- **New area:** generate from seed, no delta exists, everything is pristine
- **Revisited area:** generate from seed, overlay delta — player's planted trees are back, harvested trees stay gone
- **Storage:** only chunks the player has MODIFIED get a delta entry. Exploring without interacting = zero storage cost
- **Offline growth:** iterate stored deltas, advance plantedTrees stages. Procedural trees don't need offline growth — they regenerate at their seeded stage

### Biome Determination (Global Noise)

Biomes determined by large-scale noise evaluated at global coordinates — NOT per-chunk. This gives smooth, continent-scale biome regions.

```
biomeNoise = fBm(globalX * 0.005, globalZ * 0.005, worldSeed, 'biome')
temperatureNoise = fBm(globalX * 0.003, globalZ * 0.003, worldSeed, 'temperature')
moistureNoise = fBm(globalX * 0.004, globalZ * 0.004, worldSeed, 'moisture')
```

| Biome | Temperature | Moisture | Identity | Exclusive Species |
|-------|------------|----------|----------|-------------------|
| Starting Grove | 0.4-0.6 | 0.4-0.6 | Safe, abundant, tutorial area | White Oak, Birch |
| Meadow | 0.5-0.7 | 0.3-0.5 | Open, flowers, gentle wind | Golden Apple, Elm |
| Ancient Forest | 0.3-0.5 | 0.6-0.8 | Dark canopy, tall trees, mushrooms | Redwood, Ironbark |
| Wetlands | 0.4-0.6 | 0.8-1.0 | Ponds, aquatic plants, mud | Weeping Willow, Ash |
| Rocky Highlands | 0.2-0.4 | 0.1-0.3 | Sparse, mineral-rich, windy | Cedar, Elder Pine |
| Orchard Valley | 0.6-0.8 | 0.5-0.7 | Fruit trees, harvest bonuses | Golden Apple, Maple |
| Frozen Peaks | 0.0-0.2 | 0.2-0.5 | Snow-locked, hardy species only | Ghost Birch, Pine |
| Twilight Glade | 0.3-0.5 | 0.5-0.7 | Luminescent, rare Grovekeeper species | Crystal Oak, Worldtree |

- Biome transitions blend over ~8 tiles (interpolate props, terrain colors, tree species pools)
- Starting Grove is always centered at `(0,0)` with a forced biome override in a 2-chunk radius
- Distance from origin influences biome rarity: Twilight Glade only appears 20+ chunks from origin

### Procedural Feature Placement: Discovery Cadence

The magic: **guaranteed discovery pacing.** The player always finds something new at a predictable rhythm, but the WHAT is seeded and surprising.

**Feature placement uses Poisson-disk sampling on a per-chunk basis with global coordination:**

```
featureRNG = scopedRNG('features', worldSeed, chunkX, chunkZ)
```

#### Major Features (every ~8-12 chunks of new exploration)

| Feature | Description | GLB Assets Used |
|---------|------------|-----------------|
| **Village** | 3-8 buildings (seeded layout), 2-5 NPCs, notice board, well, fences. Procedural name from seed. | Farm houses, barn, windmill, well, fences, notice board, lamp |
| **Garden Labyrinth** | Seeded hedge maze (12x12 grid), fountain center, Hedge Keeper NPC. Max 1 per world quadrant. | Modular hedge pack (94 pieces), stone decorations, flowerbeds |
| **Pond / Lake** | Gerstner wave water surface, lily pads, reeds, fishing spot. Size from noise. | Procedural water shader + nature GLBs |
| **Hilltop Overlook** | Elevated terrain with panoramic view. Stone columns, bench, wind. Reveals surrounding chunk map. | Stone columns, bench, stairs GLBs |
| **Ruined Tower** | Tall climbable structure. Loot at top. Skeleton warrior (Survival only). | Tower GLB, crates, barrels, skeleton warrior GLB |
| **Merchant Camp** | Traveling merchant NPC, cart, campfire, unique trade goods. Rotates inventory daily. | Cart, campfire, crate GLBs, ChibiCharacter merchant |
| **Ancient Grove** | Ring of Old Growth trees, rare species seeds, lore stone. Peaceful — no weather events here. | Largest tree GLBs, stone table, books GLB |
| **Mine Entrance** | Rocky terrain, mine props, ore nodes. Survival: resource-rich but dangerous. | Mine props GLB, rock GLBs, pickaxe-able nodes |

#### Minor Features (every ~3-4 chunks of new exploration)

| Feature | Description | GLB Assets Used |
|---------|------------|-----------------|
| **NPC Encounter** | Lone NPC with a single quest or trade offer. Seeded personality + appearance. | ChibiCharacter + items |
| **Rock Formation** | Decorative cluster, sometimes with hidden item. | Rock GLBs, grass |
| **Flower Meadow** | Dense flowerbed patch, rare seed chance. | Flowerbed GLBs (7 types) |
| **Abandoned Cart** | Lootable cart with resources. | Cart destroyed GLB, crate GLBs |
| **Campfire Ring** | Pre-built campfire. Survival: free rest point. | Campfire GLB, logs, stones |
| **Wooden Bridge** | Spans a stream or ravine. | Bridge GLB |
| **Signpost** | Points toward nearest major features. Reveals 2 chunks on map. | Wooden post GLB, notice board |
| **Rare Bush** | Single bush with exclusive berry type. | Seasonal bush GLB |

#### Micro Features (every ~1 chunk)

Procedural scatter: individual trees, grass patches, rocks, fences, bushes. Density and type from biome + noise. These are the ambient fill that makes the world feel alive.

### Discovery Guarantee System

```typescript
function shouldPlaceMajorFeature(worldSeed: string, chunkX: number, chunkZ: number): boolean {
  // Hash chunk coordinates to get consistent placement
  const hash = scopedRNG('feature-major', worldSeed, chunkX, chunkZ).next();
  // ~1 in 10 chunks gets a major feature (but never within 6 chunks of another)
  if (hash < 0.10) {
    // Check minimum distance from other major features via neighbor hash check
    return !hasNearbyMajorFeature(worldSeed, chunkX, chunkZ, 6);
  }
  return false;
}
```

- Major features: minimum 6 chunks apart, maximum 12 chunks apart (if none found in 12 chunks of straight-line travel, force one)
- Minor features: minimum 2 chunks apart, maximum 4 chunks apart
- The player NEVER walks for more than ~3 minutes without finding something interesting
- Feature type selected from biome-weighted pool (Wetlands gets ponds, Highlands gets overlooks, etc.)

### Procedural NPCs

NPCs generate at feature points (villages, camps, encounters). Each NPC is seeded from their location:

```typescript
const npcSeed = scopedRNG('npc', worldSeed, featureChunkX, featureChunkZ, npcIndex);
// Deterministic: name, personality, appearance (ChibiCharacter base + items), dialogue pool, quest pool
```

- **Appearance:** seeded pick of ChibiCharacter base (7 options) + hair + outfit + shoes from 33 items
- **Name:** seeded from brand-aligned name list
- **Personality:** 1 of 10 personality profiles (from quest-dialogue design doc)
- **Dialogue:** personality-based pool, influenced by biome and nearby features
- **Quests:** procedural from templates + nearby context (e.g., "bring me 5 [biome-local resource]", "find the [nearest major feature]", "plant [biome species] near my [structure]")

### Procedural Quests

Quest templates + seeded context = infinite unique quests:

| Template | Parameters (seeded from location) | Example |
|----------|----------------------------------|---------|
| Gather | resource type, count, biome | "Bring me 8 Willow Sap from the Wetlands" |
| Plant | species, count, location constraint | "Plant 3 Cedar trees on the hilltop" |
| Explore | target feature type, direction hint | "I've heard of a ruined tower to the northwest..." |
| Deliver | item, target NPC, target village | "Take this parcel to the merchant in Fernhollow" |
| Build | structure type, location | "Build a windbreak wall near my garden" |
| Discover | species or biome | "Have you seen the Frozen Peaks? I hear Ghost Birch grows there." |

- Quest rewards scale with distance from origin (farther = better)
- Chain quests: completing one NPC's quest unlocks their next (stored in delta)
- Daily refresh: some NPCs offer a rotating daily quest (seeded from day number)

### The Grovekeeper Labyrinths (The Spine of the Game)

**This is WHY the game exists.** 14 dormant Grovekeepers (one per unlockable tree species) sleep at the centers of 14 hedge labyrinths scattered across the infinite world. Finding them IS the game. Each Grovekeeper, when awakened, unlocks its tree species for the player to plant and grow anywhere.

The player starts with only White Oak (given in tutorial). Every other species must be earned by finding its Grovekeeper.

**Placement:** Labyrinths are the LARGEST feature span — much farther apart than major or minor features. They are the rarest, most significant discovery in the world.

```
Feature span hierarchy:
  Micro features:  every ~1 chunk     (~30 seconds of walking)
  Minor features:  every ~3-4 chunks  (~2 minutes)
  Major features:  every ~8-12 chunks (~5-8 minutes)
  LABYRINTHS:      every ~30-50 chunks (~20-40 minutes of dedicated exploration)
```

Each labyrinth is biome-appropriate: the Weeping Willow Grovekeeper is in Wetlands, the Ghost Birch Grovekeeper is in Frozen Peaks, etc.

**Generation Algorithm:**
- Seeded recursive backtracker on a 12x12-16x16 grid (larger = later game, harder)
- Seed: `scopedRNG('labyrinth', worldSeed, grovekeeperId)`
- Grid cells map to modular hedge GLBs based on wall adjacency:
  - Straight wall: `basic_{W}x{H}` (width = consecutive wall cells)
  - L-corner: `basic_L_{variant}` or `round_{W}x{H}_{variant}` (seeded variant pick)
  - T-junction: `basic_T_{variant}`
  - Crossroad: `basic_X_{variant}`
  - Dead end cap: `basic_1x{H}`
  - Decorative curves: `round_*` variants mixed in via seeded probability (30%)
- 3 height tiers (1/2/3) mixed by seeded noise — outer walls tall (x3), inner walls varied
- Diagonal pieces (`diagonal_*`) used at maze entry for a grand entrance feel

**Maze Enemies (difficulty-scaled):**
- Bat GLBs patrol corridors (avoid or fight — drains stamina/hearts on contact)
- Skeleton warrior GLB guards the inner ring (one per labyrinth, harder in later labyrinths)
- Thorny hedge patches (environmental hazard — heart damage on contact, need to find alternate path)
- Fog thickens deeper into the maze (reduced visibility, Tone.js eerie ambient shift)

**The Grovekeeper Encounter (center of maze):**
- Clearing at center: fountain GLB with water, columns at corners, stone table with lore
- The Grovekeeper: a special NPC model (unique per species — larger ChibiCharacter variant with species-themed clothing/accessories)
- Player approaches → dialogue: the Grovekeeper awakens, speaks about its trees, the ancient purpose of the Grovekeepers, lore specific to this species
- **Seed-variant narrative:** dialogue has A/B/C variations pulled from `scopedRNG('grovekeeper-dialogue', worldSeed, grovekeeperId)` — same seed = same dialogue variant, different seed = different telling of the same lore
- **Unlock moment:** particle effect (species-colored sparkles spiral around player), flash, player is teleported to just outside the labyrinth entrance
- Toast: "The [Species Name] Grovekeeper has awakened. [Species] seeds are now available."
- Moving forward: the new tree species appears in the landscape (procedurally placed in appropriate biome chunks) and becomes available in the seed selection UI

**Maze Dressing (seeded scatter):**
- Flowerbeds (7 types × 2 sizes) at dead ends and wide corridors
- Vases at T-junctions
- Stone table with books/scrolls at secondary alcoves (lore fragments about the Grovekeepers)
- Seasonal bush GLBs at intersections (swap with season)
- Campfire at entrance (rest point before attempting, fast travel anchor)

**Maze Properties:**
- Always solvable (recursive backtracker guarantees perfect maze)
- Fog-of-war within maze: paths reveal as you walk them (mini-map shows explored paths)
- ~100-150 hedge GLB instances per maze (InstancedMesh — same model, different transforms)
- No time limit — player can leave, rest, return. Progress (explored paths) persists in delta.

**The 14 Grovekeepers (mapped to biomes):**

| # | Grovekeeper | Species Unlocked | Biome | Maze Size | Difficulty |
|---|------------|-----------------|-------|-----------|-----------|
| 1 | Birchmother | Birch | Starting Grove (nearby) | 8x8 | Easy (tutorial-ish) |
| 2 | Elmward | Elm | Meadow | 10x10 | Easy |
| 3 | Willowsong | Weeping Willow | Wetlands | 12x12 | Medium |
| 4 | Ashguard | Ash | Wetlands | 12x12 | Medium |
| 5 | Mapleseer | Maple | Orchard Valley | 12x12 | Medium |
| 6 | Goldenbough | Golden Apple | Orchard Valley | 12x12 | Medium |
| 7 | Cedarwarden | Cedar | Rocky Highlands | 14x14 | Hard |
| 8 | Ironroot | Ironbark | Ancient Forest | 14x14 | Hard |
| 9 | Redwoodancient | Redwood | Ancient Forest | 14x14 | Hard |
| 10 | Pineheart | Elder Pine | Rocky Highlands | 14x14 | Hard |
| 11 | Frostbark | Ghost Birch | Frozen Peaks | 16x16 | Very Hard |
| 12 | Crystalsoul | Crystal Oak | Twilight Glade | 16x16 | Very Hard |
| 13 | Moonkeeper | Moonwood Ash | Twilight Glade | 16x16 | Very Hard |
| 14 | Worldroot | Worldtree | Center of world (special) | 20x20 | Final |

**Worldroot (the final Grovekeeper):**
- Only accessible after awakening all other 13 Grovekeepers
- Located at a unique coordinates revealed by the 13th Grovekeeper's dialogue
- Largest maze (20x20), all enemy types, multiple skeleton warriors
- Unlocking Worldroot = "You are now a Grovekeeper" — endgame achievement, prestige unlock
- Worldtree seed: can only plant ONE. It grows to 2x scale, visible from adjacent chunks. The ultimate monument.

### Rendering: Only What You See

- **Active chunks (3x3):** fully rendered — terrain, trees, structures, NPCs, props
- **Buffer chunks (5x5 outer ring):** generated but not rendered. Data ready for instant activation when player moves.
- **Distant chunks:** not in memory. Regenerated from seed when re-entered, delta applied.
- **View distance:** terrain LOD at chunk edges (reduce tree detail, skip grass/flowers beyond 2 chunks)
- **Chunk generation budget:** <16ms per chunk (must not cause frame drops). Heavy chunks generate across 2-3 frames.

### Map & Navigation

- **Mini-map:** shows explored chunks as filled tiles, unexplored as fog
- **World map (full-screen):** scrollable, shows all explored area with biome colors + feature icons
- **Signposts:** at minor features, point toward nearest major feature with distance
- **Compass:** always visible, cardinal directions + marker for home (Starting Grove)
- **Fast travel:** unlock campfire network. Light a campfire at a village = add it to fast travel list. Maximum 8 fast travel points.

---

<a id="trees"></a>
## 5. Tree Species & Growth

**Full spec:** `docs/game-design/tree-species-visual-spec.md`

### 15 Species (12 base + 3 rare Grovekeeper-unlocked)

GLB-based from 3DPSX tree packs. 8 retro nature trees + 72 tree_pack_1.1 models = 80 unique silhouettes mapped to 15 species. Each species has:
- Assigned GLB model(s) from the tree packs (seeded selection for variation)
- Scale per growth stage (seed=0.1x, sprout=0.25x, sapling=0.5x, mature=1.0x, old growth=1.3x)
- Season color tint via material uniform OR winter variant GLB swap (6 winter models available)
- Seeded rotation + scale jitter (0.85x-1.15x) for natural variation
- Unique visual trait mapped to specific GLB silhouettes (willow = droopy model, pine = conifer model, etc.)

### 5 Growth Stages

| Stage | Name | Visual | GLB Approach |
|-------|------|--------|-------------|
| 0 | Seed | Small dirt mound with seed visible | Tiny hardcoded geometry (cone + sphere, ~20 verts) |
| 1 | Sprout | Tiny green stem + 2-3 leaf triangles | Hardcoded geometry (cylinder + triangles, ~30 verts) |
| 2 | Sapling | Small tree, sparse branches | Species GLB at 0.5x scale |
| 3 | Mature | Full tree, dense canopy | Species GLB at 1.0x scale |
| 4 | Old Growth | Massive, gnarled, wider canopy | Species GLB at 1.3x scale + slight Y-axis squash (0.95) for gnarled look |

### Growth Animation

- Lerp-based scale interpolation (factor 3.0/sec, ease-out curve)
- Stage 0→1 and 1→2: geometry swap (hardcoded → GLB, scale continuity via lerp)
- Stage 2→3→4: smooth scale lerp on same GLB model
- 6-10 green sparkle particles on stage-up
- Mobile haptic feedback on stage transition

### Rare Species Effects (Grovekeeper #12-14 unlocks)

| Species | Effect | Implementation |
|---------|--------|---------------|
| Crystal Oak | Prismatic seasonal tints (amethyst/teal/amber/ice-blue) | Material color uniform tinting + optional 4s shimmer |
| Moonwood Ash | Silver shimmer, night-only growth boost | Emissive material at night (#C0C0E0, intensity 0.25) — uses "pr" emission variant pattern |
| Worldtree | Massive scale (2x), visible from adjacent chunks | Largest GLB model at 2.0x scale + crown decoration GLBs |

### Instanced Rendering

- One `InstancedMesh` per template key: `${speciesId}_${stage}_${season}[_night]`
- Start capacity 20, double on overflow
- Stage 4 static trees: `matrixAutoUpdate = false`
- Draw call target: <35 for trees

---

<a id="tools"></a>
## 6. Tool Actions & First-Person Feel

**Full spec:** `docs/architecture/tool-action-system.md`

### 5 Tool GLBs (already in project)

| Tool | GLB | Verts | Game Action |
|------|-----|-------|-------------|
| Trowel | Hoe.glb | 70 | Plant, till |
| Axe | Axe.glb | 56 | Chop, harvest |
| Pruning Shears | Hatchet.glb | 56 | Prune, shape |
| Shovel | Shovel.glb | 127 | Dig, clear |
| Pickaxe | Pickaxe.glb | 94 | Mine rocks |

### Use Animations (keyframe-driven)

| Tool | Animation | Duration | Impact Frame |
|------|-----------|----------|-------------|
| Trowel | Stab (forward thrust, spring back) | 400ms | 180ms (45%) |
| Axe | Chop (arc overhead, embed pause, pull) | 550ms | 275ms (50%) |
| Shears | Snip (quick squeeze scale-X) | 300ms | 135ms (45%) |
| Shovel | Dig (push down, lever up) | 600ms | 300ms (50%) |
| Pickaxe | Strike (forward hit, recoil) | 500ms | 275ms (55%) |

### Impact Effects (layered feedback)

1. Screen shake (camera rotation perturbation, NOT position)
2. Camera FOV punch (subtle +2 degree bump)
3. Particle burst at hit point (max 32, PSX unlit quads)
4. Sound trigger via AudioManager
5. Haptic feedback (Capacitor)
6. Target entity reaction (tree shake, rock pulse)

### View Model Juice

| Effect | Parameters | Reduced Motion |
|--------|-----------|---------------|
| Hand sway | 1.5x turn multiplier, +/-0.2 clamp, 10/s recovery | Disabled |
| Walk bob | 10Hz/0.02 walk, 15Hz/0.05 sprint, horizontal component | Disabled |
| Idle breath | 2Hz/0.005 amplitude | Disabled |
| Sprint FOV | 65->72 at 8/s lerp | Disabled |
| Tool switch | 250ms drop + 250ms rise with easeOutBack overshoot | Instant swap |

### Raycast Interaction

- Ray from camera center, per-tool range (3.0/4.0/6.0 units)
- Per-tool layer masks (axe only hits trees, pickaxe only hits rocks)
- Crosshair color: green (valid), amber (out-of-range), red (invalid)
- Context label below crosshair: "Chop" / "Plant" / "Mine" etc.

### Stamina Feedback

- 4 visual states: full (green) / caution (yellow) / danger (red) / exhausted (grey)
- Exhaustion hysteresis: blocks at 0%, re-enables at 5%
- Low stamina: slower swing animation, reduced walk bob, screen vignette
- Heavy breathing audio below 20%

### New Survival Tools (craftable)

Not every tool is given at the start. Survival means earning your toolkit (see Starting Gear in Section 3).

| Tool | GLB | Game Action | Craft Recipe | Unlock Condition |
|------|-----|-------------|--------------|-----------------|
| Fishing Rod | Procedural (rod + line) | Fish at ponds/rivers | 5 Timber + 3 String | Reach first pond |
| Hammer | PSX Mega Pack tool GLB | Build/repair structures | 8 Timber + 4 Stone | Craft at workbench |
| Needle | Procedural (small spike) | Sew clothing from Hide | 2 Ore + 1 Timber | Forge required |
| Pickaxe | Pickaxe.glb (94v) | Mine rock formations | 6 Timber + 4 Stone | Forge required |

**String** is harvested from mature vines (forage) or crafted from plant fiber (3 Herb = 1 String).

### Tool Upgrade Tiers

All physical tools (Axe, Trowel, Shovel, Pickaxe, Shears, Fishing Rod, Hammer, Needle) have three upgrade tiers. Each tier improves damage/speed, durability, and visual appearance.

| Tier | Damage | Speed | Durability | Visual Change | Requirement |
|------|--------|-------|------------|---------------|-------------|
| **Basic** | 1.0x | 1.0x | 50 uses | Default GLB (wood/stone) | Starting or first craft |
| **Iron** | 1.5x | 1.25x | 150 uses | Metal head, darker handle | Forge + Iron Ingot recipe |
| **Grovekeeper** | 2.0x | 1.5x | 500 uses | Glowing edge, vine-wrapped handle | Forge + Grove Essence |

**Iron Ingot** — Smelted at Forge: 3 Ore + 1 Timber (fuel) = 1 Iron Ingot.

**Iron tier upgrade cost per tool:**

| Tool | Materials |
|------|-----------|
| Iron Axe | Basic Axe + 3 Iron Ingot + 2 Timber |
| Iron Trowel | Basic Trowel + 2 Iron Ingot + 1 Timber |
| Iron Shovel | Basic Shovel + 3 Iron Ingot + 2 Timber |
| Iron Pickaxe | Basic Pickaxe + 4 Iron Ingot + 2 Stone |
| Iron Shears | Basic Shears + 2 Iron Ingot + 1 Timber |
| Iron Fishing Rod | Basic Fishing Rod + 2 Iron Ingot + 2 String |
| Iron Hammer | Basic Hammer + 3 Iron Ingot + 3 Stone |
| Iron Needle | Basic Needle + 1 Iron Ingot + 1 String |

### Grovekeeper-Tier Tools

The ultimate tier. Requires **Grove Essence** — a rare material that only drops from labyrinth enemies (Skeleton Warriors, Bats at deeper labyrinths). Drop rate: 1 per Skeleton Warrior kill, 10% chance per Bat kill.

**Grovekeeper tier upgrade cost per tool:**

| Tool | Materials |
|------|-----------|
| Grovekeeper Axe | Iron Axe + 3 Grove Essence + 5 Iron Ingot |
| Grovekeeper Trowel | Iron Trowel + 2 Grove Essence + 3 Iron Ingot |
| Grovekeeper Shovel | Iron Shovel + 3 Grove Essence + 5 Iron Ingot |
| Grovekeeper Pickaxe | Iron Pickaxe + 4 Grove Essence + 6 Iron Ingot |
| Grovekeeper Shears | Iron Shears + 2 Grove Essence + 3 Iron Ingot |
| Grovekeeper Fishing Rod | Iron Fishing Rod + 2 Grove Essence + 3 Iron Ingot |
| Grovekeeper Hammer | Iron Hammer + 3 Grove Essence + 5 Iron Ingot |
| Grovekeeper Needle | Iron Needle + 1 Grove Essence + 2 Iron Ingot |

**Grovekeeper-tier visual:** emissive vine pattern wraps the tool handle (species-colored based on the Grovekeeper that dropped the essence). Subtle particle trail on swing.

### Tool Durability System

Tools degrade with use. When durability reaches 0, the tool breaks and must be re-crafted or repaired.

| Action | Durability Cost |
|--------|----------------|
| Standard use (chop, dig, mine, etc.) | 1 per use |
| Use on wrong target (axe on rock) | 3 per use (penalty) |
| Critical hit (bonus damage, random) | 0 (free swing) |
| Use while exhausted (0 stamina) | 2 per use (stress penalty) |

**Repair:** Bring a damaged tool to the Forge with half the original upgrade materials (rounded up) to restore full durability. Repair is always cheaper than re-crafting.

**Durability UI:** Small bar under the tool icon in the HUD. Color: green (>50%), yellow (25-50%), red (<25%). Tool icon cracks visually at <10%.

**Non-degrading tools:** Watering Can, Almanac, Seed Pouch, Worn Compass. These are utility items, not physical tools.

---

<a id="economy"></a>
## 7. Economy, Crafting, & Trading

**Full spec:** `docs/ECONOMY_DESIGN.md`

### 7.1 Resource Table

12 resources sourced from 7 survival activities. Every resource has a clear source, a clear sink, and a scarcity tier that drives trading decisions.

| Resource | Source Activity | Primary Use | Scarcity | Notes |
|----------|----------------|-------------|----------|-------|
| Timber | Chop trees | Structures, tool upgrades, crafting | Common | 5 species produce it. Over-produced mid-game; absorbed by structure chains + grid expansion |
| Stone | Mine rock formations | Structures, forge, windbreak | Common | Found in all biomes, concentrated in Rocky Highlands |
| Ore | Mine rock formations (rare veins) | Smelting → Iron Ingots, tool upgrades | Uncommon | ~20% of mineable rocks yield ore. Rocky Highlands 2x density |
| Sap | Harvest willows, birches, ferns | Elixirs, tonics, tool upgrades | Uncommon | 4 species produce it. Mid-scarcity, alchemical ingredient |
| Fruit | Harvest fruit trees | Cooking, seed recipes, trading | Seasonal | Cherry Blossom, Flame Maple, Golden Apple. Winter dormancy = 0 yield |
| Berries | Forage bushes | Cooking (raw snack), remedies | Common | Found in all biomes. 262 seasonal bush GLBs. Quick hunger fix |
| Herbs | Forage bushes (herb variants) | Remedies, advanced cooking | Uncommon | Wetlands + Ancient Forest concentration. Herb Garden makes renewable |
| Meat | Hunt animals (Survival) | Cooking (best food), hide byproduct | Scarce | Animals flee; requires stealth or traps |
| Hide | Hunt animals (byproduct) | Warm clothing, leather gear, satchel upgrade | Scarce | 1-2 per hunt. Essential for Frozen Peaks exploration |
| Fish | Fish at ponds/docks | Cooking, rare material chance | Moderate | Requires crafted Fishing Rod. Dock improves yield. Rare drops: pearls, bones |
| Acorns | Harvest Ghost Birch, Crystal Oak, Moonwood Ash | Seed crafting, late-game recipes, grid expansion | Rare | Only 3 species produce them. Intentional late-game bottleneck |
| Seeds | Crafting, quest rewards, wild harvest, merchant | Planting trees | Varies | Per-species. White Oak free; Worldtree costs 20 of every resource |

**Resource Balance Design:**
- **Timber** over-produced mid-game — absorbed by structure upgrade chains (total one-time sinks: ~3,530)
- **Acorns** under-sourced by design — creates trading pressure and late-game bottleneck
- **Fruit** has strong seasonal variance — autumn windfall (Golden Apple 3x), winter dormancy (0 yield)
- **Ore** is the forge gatekeeper — without ore, no Iron Ingots, no tool upgrades past Basic tier
- **No circular arbitrage** in trading — each full loop loses ~90% of value

### 7.2 Forging System

The Forge structure (20 Stone + 10 Ore + 15 Timber, Level 8) unlocks smelting and advanced tool crafting. All forging requires the player to be near a built Forge. Tool upgrade tiers and costs are defined in Section 6.

#### Smelting Recipes

| Recipe | Inputs | Output | Time | Notes |
|--------|--------|--------|------|-------|
| Iron Ingot | 3 Ore + 1 Timber (fuel) | 1 Iron Ingot | 10s | Base forging material |
| Grove Essence Infusion | 1 Grove Essence + 2 Iron Ingots + 5 Sap | 1 Infused Essence | 20s | Required for Grovekeeper-tier upgrades (see Section 6) |
| Charcoal | 5 Timber | 2 Charcoal | 8s | Fuel for advanced smelting, cooking boost |
| Refined Stone | 4 Stone + 1 Charcoal | 2 Cut Stone | 12s | Used in advanced structures |

### 7.3 Cooking System

Raw food restores hunger but provides minimal healing. Cooking at a Campfire transforms raw ingredients into meals with better stats. Higher-tier recipes require the Cooking Pot structure (L12).

#### Raw vs Cooked

| Food | Raw Effect | Cooked Effect | Cook Time | Notes |
|------|-----------|---------------|-----------|-------|
| Berries | +5 hunger | +8 hunger, +0.5 heart | 3s | Always available, quick snack |
| Fruit | +10 hunger, +0.5 heart | +15 hunger, +1 heart | 5s | Seasonal availability |
| Fish | +8 hunger | +20 hunger, +1 heart | 8s | Requires Fishing Rod |
| Meat | +12 hunger (risk: -0.5 heart raw) | +25 hunger, +1.5 hearts | 10s | Raw meat has 30% food poisoning chance |
| Herbs | No hunger (bitter) | — (used in remedies, not meals) | — | Cooking herbs = waste; use in crafting |

#### Campfire Recipes (no structure beyond Campfire)

| Recipe | Ingredients | Effect | Notes |
|--------|------------|--------|-------|
| Grilled Fish | 1 Fish + 1 Herb | +25 hunger, +1.5 hearts, stamina regen +10% / 120s | Best early healing food |
| Berry Jam | 5 Berries + 1 Fruit | +20 hunger, +1 heart, move speed +5% / 60s | Quick energy boost |
| Roast Meat | 1 Meat + 1 Charcoal | +30 hunger, +2 hearts | Best raw healing. Charcoal = flavor bonus |
| Trail Mix | 3 Berries + 2 Acorns + 1 Fruit | +15 hunger, stamina +30 instant | Portable stamina food |
| Herbal Tea | 2 Herbs + 1 Sap | +1 heart, cold resistance / 300s | Essential for Frozen Peaks |

#### Cooking Pot Recipes (requires Cooking Pot structure, L12)

| Recipe | Ingredients | Effect | Notes |
|--------|------------|--------|-------|
| Hunter's Stew | 2 Meat + 1 Fish + 3 Herbs | +40 hunger, +3 hearts, stamina regen +25% / 300s | Best meal in the game |
| Fruit Compote | 4 Fruit + 2 Berries + 1 Sap | +25 hunger, +2 hearts, growth aura +10% / 180s | Eating boosts nearby trees |
| Fisherman's Chowder | 3 Fish + 2 Herbs | +35 hunger, +2.5 hearts, fishing +20% / 300s | Buff stacks with rod tier |
| Forager's Salad | 5 Herbs + 3 Berries | +15 hunger, +1 heart, foraging yield +30% / 300s | Herb-heavy, boosts herb finding |
| Ironbark Broth | 1 Meat + 2 Herbs + 1 Iron Ingot | +20 hunger, +2 hearts, damage resist / 600s | The Iron Ingot dissolves (mineral supplement) |

**Hunger System:**
- Hunger bar: 100 max, drains at 1/min (difficulty-scaled: Seedling 0.5/min, Ironwood 2/min)
- 0 hunger = no stamina regen + slow heart drain (0.25 hearts/min)
- Eating past 80 hunger = "Well Fed" buff (+10% stamina regen for 120s)
- Food spoilage: none (PSX simplicity — food stacks indefinitely)

### 7.4 Complete Recipe Table (28 Recipes, 4 Tiers)

Crafting is accessed via the Crafting icon in the tool belt (always available) or at specific structures. Recipes unlock by player level. Structure-gated recipes require the structure to exist anywhere in the world.

#### Tier 1 — Basic (Levels 1-5)

| # | Name | Inputs | Output / Effect | Level | Structure | Intent |
|---|------|--------|-----------------|-------|-----------|--------|
| 1 | Wooden Plank | 8 Timber | 4 Sap | 1 | — | Resource conversion, teaches crafting |
| 2 | Simple Fertilizer | 5 Fruit + 3 Acorns | Growth +15% / 120s | 2 | — | Introduces effect crafting |
| 3 | Seed Pouch | 10 Acorns | 3 Seeds (oak/pine/willow) | 2 | — | Seed acquisition path |
| 4 | Basic Tonic | 5 Sap + 3 Fruit | Stamina +30 (instant) | 3 | — | Stamina management |
| 5 | Bark Mulch | 6 Timber + 4 Sap | Growth +10% / 180s | 4 | — | Weaker but longer fertilizer |
| 6 | Fruit Preserve | 8 Fruit | 12 Acorns | 5 | — | Fruit → acorn conversion |
| 7 | Herbal Remedy | 3 Herbs + 2 Sap | +2 hearts (instant) | 3 | — | Primary healing craft |

#### Tier 2 — Intermediate (Levels 6-10)

| # | Name | Inputs | Output / Effect | Level | Structure | Intent |
|---|------|--------|-----------------|-------|-----------|--------|
| 8 | Sturdy Plank | 15 Timber + 5 Sap | 8 Sap + 25 XP | 6 | — | Better conversion + XP |
| 9 | Growth Elixir | 10 Sap + 8 Fruit | Growth +35% / 180s | 7 | — | Strong growth accelerant |
| 10 | Weather Charm | 12 Acorns + 8 Sap | Rain Call / 300s | 7 | — | Weather control (growth-boosting rain) |
| 11 | Pruning Oil | 8 Sap + 5 Timber | Harvest +25% / 240s | 8 | — | Yield boosting |
| 12 | Seed Bundle | 15 Acorns + 10 Fruit | 5 Seeds (cherry/ghost/silver) | 9 | — | Rare species seeds |
| 13 | Dewdrop Vial | 6 Sap + 4 Fruit | Auto-water all trees in chunk / 300s | 8 | — | Addresses watering tedium mid-game |
| 14 | Grove Lantern | 8 Timber + 6 Sap | Placeable: +5% XP in 2-tile radius | 9 | — | Cosmetic-hybrid, minor bonus |

#### Tier 3 — Advanced (Levels 11-18)

| # | Name | Inputs | Output / Effect | Level | Structure | Intent |
|---|------|--------|-----------------|-------|-----------|--------|
| 15 | Compost Heap | 10 Timber + 10 Fruit | Growth +20% / 600s | 10 | Trading Post | Long-duration, structure-gated |
| 16 | Hardwood Beam | 25 Timber + 10 Sap | 15 Acorns | 11 | Trading Post | Timber → acorn conversion |
| 17 | Builder's Catalyst | 20 Timber + 15 Sap + 10 Acorns | Structure upgrade token (consumed on upgrade) | 12 | Forge | Structure upgrades need a resource cost |
| 18 | Essence of Growth | 20 Sap + 15 Fruit + 10 Acorns | Growth +50% / 300s | 13 | — | Premium growth boost |
| 19 | Storm Shield | 20 Acorns + 15 Timber | Weather Protection / 600s | 14 | — | Storm insurance |
| 20 | Ancient Compost | Bark Mulch active + 15 Sap + 10 Acorns | Growth +40% / 600s | 15 | — | Recipe chain (must craft Bark Mulch first) |
| 21 | Ancient Fertilizer | 15 Sap + 15 Fruit + 15 Timber | Growth +60% / 420s | 15 | — | Best non-permanent fertilizer |
| 22 | Rare Seed Kit | 25 Acorns + 20 Fruit | 3 Seeds (redwood/flame/ironbark) | 16 | — | Late-game species seeds |
| 23 | Master Tonic | 15 Sap + 10 Fruit + 10 Timber | Stamina +100 (full restore) | 18 | — | Full stamina recovery |

#### Tier 4 — Master (Levels 19-25+)

| # | Name | Inputs | Output / Effect | Level | Structure | Intent |
|---|------|--------|-----------------|-------|-----------|--------|
| 24 | Worldtree Sap | 40 Sap + 30 Timber + 20 Fruit | 50 Acorns + 100 XP | 19 | — | Massive conversion + XP |
| 25 | Eternal Fertilizer | 35 Sap + 25 Fruit + 25 Acorns | Permanent Growth +25% (1 tree) | 20 | — | Permanent single-tree boost (aspirational endgame) |
| 26 | Alchemist's Brew | 30 Sap + 25 Fruit + 15 Timber + 15 Acorns | All Resources 2x / 300s | 22 | — | Ultimate harvest window |
| 27 | Ancient Seed | 40 Acorns + 30 Fruit + 20 Sap | 1 Prestige species seed | 23 | — | Prestige species access |
| 28 | Grove Blessing | 25 each (Timber, Sap, Fruit, Acorns) | XP 2x / 1440s (24 min) | 25 | — | XP acceleration |

**Recipe Categories:**

```
RECIPES (28 total)
  +-- Conversion (5): Wooden Plank, Fruit Preserve, Sturdy Plank, Hardwood Beam, Worldtree Sap
  +-- Growth Boosters (7): Simple Fertilizer, Bark Mulch, Growth Elixir, Compost Heap,
  |                         Essence of Growth, Ancient Fertilizer, Ancient Compost
  +-- Harvest Boosters (2): Pruning Oil, Alchemist's Brew
  +-- Healing / Stamina (3): Basic Tonic, Master Tonic, Herbal Remedy
  +-- Weather Control (2): Weather Charm, Storm Shield
  +-- Seed Acquisition (4): Seed Pouch, Seed Bundle, Rare Seed Kit, Ancient Seed
  +-- Permanent Effects (1): Eternal Fertilizer
  +-- XP Boosters (1): Grove Blessing
  +-- Utility (2): Dewdrop Vial, Builder's Catalyst
  +-- Cosmetic-Hybrid (1): Grove Lantern
```

### 7.5 Trading System

Fixed prices with dynamic modifiers. No haggling mini-game — the "haggling" comes from TIMING (selling during events or favorable seasons IS the skill). Tap to trade, mobile-first.

#### Base Trade Routes (circular chain with intentional friction)

```
Timber (10) → Sap (5)       [2:1 ratio]
Sap (10)    → Fruit (3)     [3.3:1 ratio]
Fruit (15)  → Acorns (5)    [3:1 ratio]
Acorns (20) → Timber (10)   [2:1 ratio]
```

Full circular loop (100 Timber → 50 Sap → 15 Fruit → 5 Acorns → not enough for 10 Timber). ~90% loss per loop. No profitable arbitrage.

**Expanded trades (survival resources):**

| Sell | Amount | Buy | Amount | Where |
|------|--------|-----|--------|-------|
| Stone | 8 | Timber | 5 | Any village |
| Timber | 10 | Stone | 6 | Any village |
| Fish | 5 | Sap | 8 | Fishing Dock village |
| Herbs | 6 | Sap | 4 | Willow (Herbalist NPC) |
| Meat | 3 | Hide | 1 | Hunter NPC at villages |
| Hide | 2 | Timber | 10 | Oakley (Carpenter NPC) |
| Iron Ingots | 2 | Any resource | 15 | Forge village |

#### Price Modifiers

```
effectiveRate = baseRate × seasonalModifier × supplyDemandMultiplier × marketEventModifier
```

**Seasonal Modifiers:**

| Season | Timber | Sap | Fruit | Acorns | Stone | Fish |
|--------|--------|-----|-------|--------|-------|------|
| Spring | 1.0 | 1.2 | 0.8 | 1.0 | 1.0 | 1.1 |
| Summer | 0.8 | 1.0 | 1.2 | 1.0 | 1.0 | 1.3 |
| Autumn | 1.2 | 0.8 | 1.5 | 1.3 | 0.9 | 0.8 |
| Winter | 1.5 | 0.6 | 0.5 | 1.5 | 1.2 | 0.5 |

**Supply/Demand** (`supplyDemand.ts`):
- Formula: `multiplier = 1.0 + (buyVolume - sellVolume) / 100`
- Clamped to [0.5, 2.5]. 30-day rolling window.
- Selling pressure lowers price; buying pressure raises it. Self-correcting.

**Market Events** (`marketEvents.ts`):

| Event | Duration | Effect | Trigger |
|-------|----------|--------|---------|
| Timber Boom | 5 days | Timber 2.0x | 15% chance after 10-day cooldown |
| Sap Shortage | 4 days | Sap 2.5x | 15% chance |
| Fruit Festival | 6 days | Fruit 1.5x | 15% chance |
| Acorn Rush | 3 days | Acorns 2.0x | 15% chance |
| Merchant Holiday | 5 days | All 0.7x | 15% chance |
| Rare Influx | 4 days | All 1.5x | 15% chance |

#### NPC Merchant Specialties

| NPC | Specialty | Rate Modifier |
|-----|-----------|--------------|
| Hazel | General goods, best rates | -5% cost (loyalty discount after quest chain) |
| Elder Rowan | Rare seeds only, high prices | Seeds at 1.5x cost but exclusive species |
| Botanist Fern | Sap and fruit trades | Sap/fruit trades at 10% better rate |
| Oakley | Timber, structure materials | Timber trades at 15% better rate |
| Blossom | Seeds and fruit | Fruit → seed trades at better ratios |
| Bramble | Weather charms, protection | Weather-related recipes cheaper |
| Willow | Herbs, remedies | Herb trades at 20% better rate |
| Ember | Rare recipes, alchemy supplies | Rare recipe ingredients at 10% discount |

#### Traveling Merchant

- Visits every 7-14 days (seeded interval per world)
- Stays for 2 days at a random village
- 14 offer templates: species-specific seeds, rare materials, unique recipes, cosmetic items
- Quantity-limited per visit (prevents stockpiling)
- After visit 5+, may offer prestige species seeds
- Announced by village NPC dialogue: "A merchant was spotted heading this way..."

### 7.6 Complete Structure List

Structures split into two categories: **Essential** (survival/utility, from Section 3) and **Upgrade Chains** (base building, Fallout-style kitbashing from PSX assets). All structures rendered as GLB models from 3DPSX Farm pack + PSX Mega Pack II.

#### Essential Structures (survival foundations, taught in Section 3)

| Structure | Cost | Level | Effect | GLB Source |
|-----------|------|-------|--------|-----------|
| Campfire | 5 Stone + 5 Timber | Start | Heart regen (+0.5/min), warmth, cooking, fast travel | 3DPSX Farm campfire |
| Lean-to Shelter | 10 Timber | 2 | Sleep (advance time), weather protection | 3DPSX Farm storage |
| Windbreak Wall | 8 Timber + 4 Stone | 3 | Block wind damage in 3-tile radius | 3DPSX Farm fence |
| Storage Chest | 12 Timber + 2 Stone | 4 | Safe resource storage (death-proof) | PSX Mega Pack crate |
| Rain Collector | 6 Timber + 4 Stone | 5 | Water supply during drought, auto-water 1 tile | 3DPSX Farm barrel |
| Herb Garden | 8 Timber + Herb seeds | 6 | Grow healing herbs (renewable) | 3DPSX Farm terrain |
| Fishing Dock | 15 Timber + 5 Stone | 7 | Better fishing yield at water (+30%) | 3DPSX Farm wooden frame |
| Forge | 20 Stone + 10 Ore + 15 Timber | 8 | Smelt ore, upgrade tools, advanced crafting | PSX Mega Pack structure |
| Cooking Pot | 10 Stone + 5 Iron Ingots + 8 Timber | 12 | Advanced cooking recipes (see 7.3) | PSX Mega Pack cauldron |

#### Growth Boost Chain: Well → Irrigation → Sprinkler

| Structure | Footprint | Cost | Level | Radius | Magnitude |
|-----------|-----------|------|-------|--------|-----------|
| Well | 1x1 | 30 Timber + 20 Sap | 6 | 2 tiles | +15% growth |
| Irrigation System | 2x2 | 60 Timber + 40 Sap + Builder's Catalyst | 12 | 4 tiles | +25% growth |
| Sprinkler Network | 3x3 | 120 Timber + 80 Sap + 40 Fruit + Builder's Catalyst | 18 | 6 tiles | +35% growth |

#### Growth Boost Chain: Greenhouse → Conservatory → Biodome

| Structure | Footprint | Cost | Level | Radius | Magnitude |
|-----------|-----------|------|-------|--------|-----------|
| Greenhouse | 2x2 | 100 Timber + 50 Sap + 30 Fruit | 10 | 4 tiles | +20% growth |
| Conservatory | 3x2 | 200 Timber + 100 Sap + 60 Fruit + Builder's Catalyst | 16 | 5 tiles | +30% growth |
| Biodome | 3x3 | 400 Timber + 200 Sap + 120 Fruit + 50 Acorns + Builder's Catalyst | 22 | 7 tiles | +40% growth |

#### Stamina Regen Chain: Tool Shed → Workshop

| Structure | Footprint | Cost | Level | Radius | Magnitude |
|-----------|-----------|------|-------|--------|-----------|
| Tool Shed | 2x1 | 50 Timber + 20 Sap | 5 | 3 tiles | +20% stamina regen |
| Workshop | 2x2 | 100 Timber + 40 Sap + Builder's Catalyst | 11 | 4 tiles | +30% stamina regen |

#### Harvest Boost Chain: Market Stall → Trading Post → Grand Market

| Structure | Footprint | Cost | Level | Radius | Magnitude |
|-----------|-----------|------|-------|--------|-----------|
| Market Stall | 2x1 | 40 Timber + 15 Acorns | 8 | 3 tiles | +30% harvest |
| Trading Post | 2x2 | 80 Timber + 30 Acorns + 20 Sap + Builder's Catalyst | 14 | 4 tiles | +40% harvest |
| Grand Market | 3x2 | 160 Timber + 60 Acorns + 40 Sap + 30 Fruit + Builder's Catalyst | 20 | 6 tiles | +50% harvest |

#### Decorative Structures

| Structure | Footprint | Cost | Level | Effect |
|-----------|-----------|------|-------|--------|
| Wooden Fence | 1x1 | 5 Timber | 3 | None (decorative) |
| Bench | 1x1 | 15 Timber | 4 | None (decorative) |
| Grove Lantern | 1x1 | Crafted (recipe #14) | 9 | +5% XP in 2-tile radius |

#### Structure Mechanics

- **Effect stacking cap:** +100% maximum total bonus per effect type (prevents degenerate placement)
- **Additive stacking:** `effectiveRate = baseRate × (1.0 + sum_of_boost_magnitudes)`
- **Grid-snapped:** integer tile coordinates, no overlap with structures or trees
- **Upgrades:** old structure removed, new placed at same position. Player pays full new cost (including Builder's Catalyst for tier 2+ upgrades). 50% material refund from old structure (rounded down).
- **No decay:** structures are permanent progress. No repair/maintenance mechanics.
- **Placement rules:** no water tiles, no rock tiles (must clear first), level requirement met, resources available

### 7.7 Seed Economy

Seeds are the core progression currency — unlocking new species drives exploration. Primary acquisition is through Grovekeeper discovery (labyrinth completion), with crafting and trading as secondary paths.

| Source | Seeds Available | Cost / Requirement | Repeatability |
|--------|----------------|-------------------|---------------|
| Starting inventory | 3 White Oak | Free | Once (per NG+) |
| Grovekeeper discovery | 1 species unlock per Grovekeeper | Solve labyrinth maze | Once per Grovekeeper (14 total) |
| Crafting: Seed Pouch (T1) | 3× oak/pine/willow | 10 Acorns | Repeatable |
| Crafting: Seed Bundle (T2) | 5× cherry/ghost/silver | 15 Acorns + 10 Fruit | Repeatable |
| Crafting: Rare Seed Kit (T3) | 3× redwood/flame/ironbark | 25 Acorns + 20 Fruit | Repeatable |
| Crafting: Ancient Seed (T4) | 1× prestige species | 40 Acorns + 30 Fruit + 20 Sap | Repeatable |
| Traveling Merchant | Species-specific | 15-40 resources | Per visit |
| Quest rewards | Specific species | Complete quest | Once per quest |
| Wild tree harvest | Random chance seed drop | Harvest any tree | ~5% chance |

**Planting costs** (resource cost consumed per plant, on top of the seed):
- Common (White Oak, Willow, Pine): 0-5 resources
- Uncommon (Cherry, Ghost Birch, Silver Birch): 4-8 resources
- Rare (Redwood, Flame Maple, Ironbark, Baobab): 10-15 resources
- Legendary (Crystal Oak, Moonwood Ash): 15-20 resources
- Worldtree: 20 Timber + 20 Sap + 20 Fruit + 20 Acorns (can only plant ONE)

### 7.8 Progression Pacing

| Milestone | Expected Time | Key Gate |
|-----------|--------------|----------|
| First Campfire | 10 minutes | Tutorial teaches it |
| First tool craft (Pickaxe) | 30 minutes | 6 Timber + 4 Stone (see Section 6) |
| Forge built | 2-3 hours | 20 Stone + 10 Ore + 15 Timber |
| First Iron tool | 3-4 hours | Forge + Iron Ingots + materials |
| First Grovekeeper found | 2-3 hours | Nearest labyrinth, learn maze mechanics |
| All 14 Grovekeepers | 25-35 hours | Escalating maze size + distance |
| First Grovekeeper-tier tool | 15-20 hours | Grove Essence drops + Iron Ingots (see Section 6) |
| New Game+ | 30-40 hours | All 14 Grovekeepers + Worldroot encounter |
| NG+ cycles | Progressively faster | Retained knowledge, all species, better tools |

---

<a id="npcs"></a>
## 8. NPCs, Quests, & Dialogue

**Full specs:** `docs/design/quest-dialogue-system.md`, Grok integration plan (chibi system)

### 10 NPCs with Full Personalities

| NPC | Role | Personality | Key Mechanic |
|-----|------|------------|-------------|
| Elder Rowan | Village elder, tips | Wise, patient, formal | Tutorial advice, lore |
| Hazel | Wandering trader | Cheerful, haggling | Trading, rare items |
| Botanist Fern | Species researcher | Curious, enthusiastic | Quests, species discovery |
| Blossom | Seed merchant | Gentle, nurturing | Seed sales, planting tips |
| Bramble | Weather watcher | Gruff, protective | Weather warnings |
| Willow | Herbalist | Calm, mystical | Healing recipes, remedies |
| Oakley | Master carpenter | Practical, proud | Crafting, structures |
| Thorn | Forest ranger | Bold, adventurous | Wilderness quests, trail blazing |
| Sage | Lore keeper | Thoughtful, ancient | World lore, codex |
| Ember | Wandering alchemist | Eccentric, curious | Alchemy, rare recipes |

These 10 named NPCs are the **Tutorial Village residents** — the player's home base population. In the open world, **procedural NPCs** populate generated villages using the same ChibiCharacter GLB system with seeded personalities drawn from the 10 personality profiles above. Named NPCs can also appear at procedural locations (e.g., Hazel shows up at merchant camps as a wandering trader, Thorn appears at ranger outposts near labyrinths).

### Chibi NPC Visuals (3DPSX ChibiCharacters)

- **GLB-based:** 7 base characters (basemesh, archer, knight, merchant, ninja, student) + 33 mix-and-match items (6 hair, hat, 3 outfits, 5 armor, shoes, bags, skirts, pants)
- **"pr" emission variants** for night glow (matches Ghost Birch pattern)
- **Seeded appearance:** `scopedRNG('npc-appearance', worldSeed, npcId)` picks base character + items + color tint
- **Lego-style animation via anime.js** (rigid body part rotation, no skeletal rigs):
  - Idle: Y-axis breathing bob `sin(t*2.8)*0.016` + head rotation sway `sin(t*0.6)*0.05`
  - Walk: arm swing (shoulder rotation ±30°) + leg swing (hip rotation ±25°) + vertical bounce, synced to movement speed
  - Look-around: head yaw rotation ±45° on random interval (seeded)
  - Talk: head nod + slight arm gesture
  - All easing via anime.js timeline — PSX-authentic rigid part animation (exactly how PS1 characters moved)

### Quest System

**Three quest layers:**

1. **Main Quest: The Grovekeeper Path** — Find all 14 Grovekeepers. Non-linear (any order except Worldroot last). Each Grovekeeper encounter is a unique narrative beat. Compass hints guide toward undiscovered labyrinths.

2. **World Quests (Seed-Variant Narrative)** — The overarching narrative spine. Each seed generates a unique world quest chain via `scopedRNG('world-quest', seed)`. Template structure with A/B/C dialogue variations so that different seeds produce different narrative arcs while maintaining coherent storytelling. Examples:
   - "The Withered Road" — a blight is spreading; find its source (variant: mushroom/frost/shadow)
   - "The Lost Village" — ruins of an old settlement; piece together what happened
   - "The Merchant's Burden" — Hazel asks for help with a dangerous trade route
   - Each world quest spans 3-5 steps across multiple chunks, pointing the player toward undiscovered areas

3. **Procedural Quests** — Generated by village NPCs from templates:
   - **65+ templates** across 9 categories (gather, plant, explore, deliver, build, discover, hunt, fish, craft)
   - **Daily quests:** 1-4 per day scaling by level, streak bonuses at 3/5/7/10/14 days
   - **Context-sensitive:** template picks resources/species/locations that exist near the NPC's village
   - **Relationship gated:** better quests from higher-relationship NPCs

### Relationship System

- 4 tiers: Stranger (0-9) / Acquaintance (10-29) / Friend (30-59) / Best Friend (60-100)
- Gain: complete quests, trade, gift items
- Rewards: better trade rates, exclusive dialogue, rare seed gifts
- **No decay** -- relationships don't degrade from absence (but NPC gifts/quests pause while away)

### NPC Schedules

- Dawn/Day/Dusk/Night locations per NPC
- Night-active: only Sage and Ember (gives night exploration purpose)
- NPC-to-NPC conversations: 6 pairs with topic lists, 20% chance when idle + adjacent

---

<a id="progression"></a>
## 9. Progression, New Game+, & Achievements

**Full spec:** `docs/game-design/progression-system-design.md`

### XP Curve

Formula: `xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200`

| Level | XP Required | Cumulative | ~Sessions |
|-------|------------|------------|-----------|
| 1->2 | 100 | 100 | 1 |
| 5->6 | 350 | 1,100 | 8 |
| 10->11 | 800 | 5,350 | 25 |
| 15->16 | 1,250 | 12,850 | 50 |
| 20->21 | 1,700 | 23,600 | 80 |
| 25->26 | 2,150 | 37,600 | 115 |

### 25 XP Sources

Core actions (plant, water, harvest, chop, prune), economy (craft, trade, sell), quests (daily, chain step, chain complete), NPCs (first meeting, friendship tier), discovery (new species, codex tier, zone, biome, landmark).

### Unlock Pacing

Every single level 1-25 has at least one unlock. No species unlocks here — those come from Grovekeepers (see Section 4 labyrinths). Categories: tools, recipes, structures, features, base building, abilities, HUD.

| Level | Unlock | Category | Notes |
|-------|--------|----------|-------|
| 1 | Trowel, Watering Can | Tools | Starting tools. Plant + water from the start |
| 1 | Wooden Plank recipe | Recipe (T1) | Timber → Sap conversion. Teaches crafting |
| 2 | Almanac | Tool | Inspect trees, view species info (0 stamina) |
| 2 | Simple Fertilizer recipe | Recipe (T1) | First growth-boosting craft |
| 2 | Seed Pouch recipe | Recipe (T1) | First seed acquisition path |
| 2 | Lean-to Shelter | Structure | Sleep to advance time, weather protection. 10 Timber |
| 3 | Pruning Shears | Tool | Prune mature trees for yield bonus |
| 3 | Herbal Remedy recipe | Recipe (T1) | Primary healing craft. 3 Herbs + 2 Sap |
| 3 | Basic Tonic recipe | Recipe (T1) | Stamina +30 instant |
| 3 | Windbreak Wall | Structure | Block wind damage in 3-tile radius. 8 Timber + 4 Stone |
| 4 | Seed Pouch (tool) | Tool | Open seed inventory (0 stamina) |
| 4 | Bark Mulch recipe | Recipe (T1) | Weaker but longer growth boost |
| 4 | Storage Chest | Structure | Death-proof resource storage. 12 Timber + 2 Stone |
| 5 | Shovel | Tool | Clear blocked tiles, dig irrigation |
| 5 | Fruit Preserve recipe | Recipe (T1) | Fruit → Acorn conversion |
| 5 | Rain Collector | Structure | Water supply during drought. 6 Timber + 4 Stone |
| 5 | Tool Shed | Structure | +20% stamina regen in 3-tile radius |
| 5 | Basic base building | Base Building | Place fences, basic walls. Wooden Fence (5 Timber) |
| 6 | Sturdy Plank recipe | Recipe (T2) | Better conversion + XP bonus |
| 6 | Well | Structure | +15% growth in 2-tile radius. 30 Timber + 20 Sap |
| 6 | Herb Garden | Structure | Renewable healing herbs. 8 Timber + Herb seeds |
| 7 | Axe | Tool | Chop old growth for big timber. 10 stamina |
| 7 | Growth Elixir recipe | Recipe (T2) | Strong growth +35% / 180s |
| 7 | Weather Charm recipe | Recipe (T2) | Call rain for 300s (growth boost) |
| 7 | Fishing Dock | Structure | +30% fishing yield at water. 15 Timber + 5 Stone |
| 8 | Forge | Structure | Smelt ore, upgrade tools. 20 Stone + 10 Ore + 15 Timber |
| 8 | Pruning Oil recipe | Recipe (T2) | Harvest +25% / 240s |
| 8 | Dewdrop Vial recipe | Recipe (T2) | Auto-water all trees in chunk / 300s |
| 8 | Market Stall | Structure | +30% harvest in 3-tile radius. 40 Timber + 15 Acorns |
| 8 | Iron tool upgrades | Ability | Forge unlocks Iron tier for all tools (see Section 6) |
| 9 | Seed Bundle recipe | Recipe (T2) | Rare species seeds (cherry/ghost/silver) |
| 9 | Grove Lantern recipe | Recipe (T2) | Placeable: +5% XP in 2-tile radius |
| 10 | Compost Bin | Tool | Convert waste to fertilizer (2x growth / 1 cycle) |
| 10 | Compost Heap recipe | Recipe (T3) | Long-duration growth boost. Requires Trading Post |
| 10 | Greenhouse | Structure | +20% growth in 4-tile radius |
| 10 | Walls and fences | Base Building | Stone walls, gate posts, fence variants (79 GLBs) |
| 11 | Rain Catcher | Tool | Auto-waters trees in 2-tile radius during rain |
| 11 | Hardwood Beam recipe | Recipe (T3) | Timber → Acorn conversion at Trading Post |
| 11 | Workshop | Structure | Upgrades Tool Shed: +30% stamina regen in 4-tile radius |
| 12 | Builder's Catalyst recipe | Recipe (T3) | Structure upgrade token. Requires Forge |
| 12 | Cooking Pot | Structure | Advanced cooking recipes (see Section 7.3) |
| 12 | Irrigation System | Structure | Upgrades Well: +25% growth in 4-tile radius |
| 13 | Fertilizer Spreader | Tool | Area fertilize: 2x growth in 2-tile radius |
| 13 | Essence of Growth recipe | Recipe (T3) | Premium growth +50% / 300s |
| 14 | Storm Shield recipe | Recipe (T3) | Weather protection / 600s |
| 14 | Trading Post | Structure | Upgrades Market Stall: +40% harvest in 4-tile radius |
| 15 | Ancient Compost recipe | Recipe (T3) | Recipe chain: requires Bark Mulch active first |
| 15 | Ancient Fertilizer recipe | Recipe (T3) | Best non-permanent fertilizer (+60% / 420s) |
| 15 | Full base building kit | Base Building | Roofs, floors, stairs, windows, doors. Full Fallout-style kitbashing |
| 16 | Scarecrow | Tool | Windstorm protection in 3-tile radius |
| 16 | Rare Seed Kit recipe | Recipe (T3) | Late-game species seeds (redwood/flame/ironbark) |
| 16 | Conservatory | Structure | Upgrades Greenhouse: +30% growth in 5-tile radius |
| 17 | Codex completion tracker | HUD | Shows discovery %, species studied, lore fragments found |
| 18 | Master Tonic recipe | Recipe (T3) | Full stamina restore (100 instant) |
| 18 | Sprinkler Network | Structure | Upgrades Irrigation: +35% growth in 6-tile radius |
| 19 | Worldtree Sap recipe | Recipe (T4) | Massive resource conversion + 100 XP |
| 20 | Grafting Tool | Tool | Graft mature trees to combine yields from 2 species |
| 20 | Eternal Fertilizer recipe | Recipe (T4) | Permanent +25% growth on 1 tree |
| 20 | Grand Market | Structure | Upgrades Trading Post: +50% harvest in 6-tile radius |
| 20 | Decorative building | Base Building | Lanterns, banners, signs, planters, archways |
| 21 | Grovekeeper tool upgrades | Ability | Forge + Grove Essence unlocks Grovekeeper tier (see Section 6) |
| 22 | Alchemist's Brew recipe | Recipe (T4) | All resources 2x / 300s |
| 22 | Biodome | Structure | Upgrades Conservatory: +40% growth in 7-tile radius |
| 23 | Ancient Seed recipe | Recipe (T4) | 1 prestige species seed |
| 24 | Prestige borders | Feature | 5 visual border themes unlocked via NG+ milestones |
| 25 | Grove Blessing recipe | Recipe (T4) | XP 2x / 1440s (24 min). Capstone recipe |

**Design Notes:**
- **No dead levels.** Every level from 1-25 has at least one meaningful unlock.
- **Logical ordering:** Forge (L8) before Iron upgrades (L8). Trading Post (L14) before recipes that require it. Builder's Catalyst (L12) before structures that consume it.
- **Pacing rhythm:** Tools and recipes alternate with structures. No level is overloaded with the same category.
- **Base building progression:** L5 (fences) → L10 (walls) → L15 (full kit) → L20 (decorative). Unlocks the building system gradually.
- **Species unlocks are separate.** They come from Grovekeeper discovery in labyrinths, not from leveling. This table only covers non-species progression.

### 45 Achievements (10 categories)

- 35 existing + 5 new progressive tiers + 5 secret achievements
- Secret triggers: Moonlit Grove (plant at midnight), Perfect Symmetry (4x4 grid same species), Storm Survivor (harvest during windstorm), etc.
- Rewards: XP, resources, titles, cosmetic badges

### Grovekeeper Progression (replaces traditional prestige)

The 14 Grovekeepers ARE the progression spine. Each one unlocks a new tree species, expands your capabilities, and reveals more of the world's lore. Finding all 14 is the "main quest."

- **Species unlock:** Each Grovekeeper grants its associated tree species (see Section 5)
- **Codex expansion:** Each Grovekeeper tells you the lore of its species — auto-fills codex entry to "Studied" tier
- **World impact:** After unlocking a Grovekeeper, its tree species begins appearing naturally in the world's biomes (procedurally placed via `scopedRNG`)
- **Escalation:** Labyrinths get harder: bigger mazes, tougher enemies, more complex puzzles (see Section 4 labyrinth table)

### New Game+ (Post-14 Grovekeepers)

Finding all 14 Grovekeepers and unlocking the Worldroot doesn't end the game — it **transforms** it.

**Trigger:** Defeat the Worldroot → "You are now a Grovekeeper" achievement → New Game+ unlocks

**What changes:**
- **All 15 species permanently unlocked** — they spawn naturally in all biomes
- **Base building mode activates** — Fallout-style kitbashing from PSX assets (not Minecraft block placement)
- **Base raids begin** — defend your settlements from corrupted forest creatures
- **Prestige cosmetics unlock** — 5 visual border themes (Stone Wall → Ancient Runes) earned via NG+ milestones
- **Difficulty escalation** — world enemies scale up, weather more extreme, labyrinth re-sealing (re-runnable with harder variants)
- **Full toolkit** — all tools, all recipes, all structures available from the start

**What carries over (into NG+ and beyond):**
- Achievements, cosmetics, prestige borders
- Codex entries (all species at Studied+)
- NPC relationships
- Base building blueprints and learned recipes

**What resets:**
- Resources (start fresh, earn it again)
- Map exploration (new seed or re-seeded world)
- Grovekeeper labyrinths re-seal (can be re-run for resources/cosmetics)
- Tool upgrades (back to basic)

### Base Building (Available During AND After Main Quest)

Not Minecraft-style block placement. **Fallout-style kitbashing** — snap together PSX asset pieces to create settlements.

**How it works:**
- Place structures from a radial build menu (unlocked via crafting progression)
- Assets snap to a coarse grid (2x2 tile footprint minimum)
- Buildings composed of PSX Mega Pack structural pieces: walls, roofs, floors, doors, windows, fences
- Light sources (PSX Mega Pack on/off variants) placed inside/outside buildings
- Props (barrels, crates, furniture, kitchen items) placed freely inside structures
- Functional stations: forge, herb garden, fishing dock, storage chest placed as gameplay elements within your base

**Available PSX assets for base building:**
- 14 PSX Mega Pack II buildings (pre-made structures)
- 7 PSX Mega Pack II structural pieces (modular walls/roofs/floors)
- 137 PSX Mega Pack II props (barrels, crates, furniture, tools, food, decoration)
- 10 PSX Mega Pack II light sources (torches, lanterns, candles — on/off toggle)
- 79 3DPSX fences (7 types for perimeter)
- 85 3DPSX Farm assets (functional structures: barn, windmill, well, campfires)

**Base building unlocks progressively:**
- Level 5: Basic structures (campfire, lean-to, storage)
- Level 10: Walls, fences, simple buildings
- Level 15: Full building kit (roofs, doors, windows, floors)
- Level 20: Decorative props, lighting, furniture
- NG+: Everything unlocked, including rare/prestige building materials

### Base Raids

Settlements attract attention. The bigger and more valuable your base, the more likely raids become.

**Mechanics:**
- Raid probability scales with base value (total placed structures + stored resources)
- Warning system: Bramble warns 1 game-day before a raid ("Something stirs in the forest...")
- Corrupted creatures spawn at chunk edges, move toward your base
- Structures take damage — undefended structures can be destroyed
- Player defends with tools + placed defenses (spike fences, watch towers, traps)
- Raid tiers: small (3-5 creatures), medium (8-12), large (15-20 + mini-boss)
- Loot: defeated creatures drop rare materials, corrupted wood, shadow seeds

**Raid frequency:**
- Pre-NG+: Rare (every 15-20 game days, small raids only, can be disabled on Seedling difficulty)
- NG+: Regular (every 8-12 game days, scaling tiers)
- Ironwood NG+: Frequent (every 5-8 days, large raids include labyrinth-tier enemies)

### Species Discovery Codex

- 5 tiers per species: Unknown / Spotted / Studied / Harvested / Legendary
- Each tier reveals more information (silhouette → name → growth → harvest → lore)
- Grovekeeper encounters auto-fill species to "Studied" tier
- 9 completion milestones with rewards and titles
- NG+: Legendary tier unlockable (requires planting 100+ of a species across playthroughs)

---

<a id="atmosphere"></a>
## 10. Day/Night, Weather, & Atmosphere

**Full spec:** `docs/architecture/day-night-weather-visual-system.md`

### Sky System

- 8-stop color interpolation (smooth, not 4-phase snap)
- Clouds rendered IN the sky shader (procedural noise in horizon band, zero draw calls)
- Cloud density driven by weather state (0.0 clear -> 0.55 rain)
- No star particles, no moon mesh -- PSX atmospheric darkness is sufficient

### Lighting

- 2-light system: ambient + directional
- Golden hour emerges naturally from 8-stop ramp at dawn/dusk
- Structure point lights (max 4, warm #ffcc66) activate when sunIntensity < 0.2
- Total atmosphere GPU: 2.5ms on mobile

### Seasonal Visual Changes

- Variable day length: summer 165s real daylight vs winter 105s
- 5-day season transition blend (not abrupt snap)
- Per-season fog modifiers (winter closes in, summer opens up)
- Per-season sky palette

### Weather Types

| Weather | Visual | Gameplay Impact |
|---------|--------|----------------|
| Rain | CSS overlay (20 drops), darker/wetter ground | +30% growth, flood risk |
| Drought | Heat haze, desaturated colors, dust | -50% growth, +50% stamina cost |
| Windstorm | Tree sway (instance matrix rotation), camera shake, debris | Structure damage, tree breakage |
| Snow (winter) | 25 drifting flakes, white ground tint | Cold damage, water freezes |

### Weather Transitions

- Fade-in: 5 seconds, fade-out: 8 seconds (slower clearing feels natural)
- Approach cues: 30 game seconds before event, clouds darken, fog closes in
- Bramble warns player before weather events

### Gameplay Integration

- Golden hour XP bonus: +15% harvest XP during dawn/dusk
- Species weather affinities: Weeping Willow +30% rain yield, Ghost Birch +50% snow growth
- Night penalties: cold exposure (heart drain without campfire/shelter), reduced visibility, hostile creatures near labyrinths
- Night rewards: Ghost Birch glow reveals hidden paths, NPC Sage/Ember available for lore/alchemy, lunar herbs only harvestable at night

---

<a id="audio"></a>
## 11. Audio & Spatial Sound

**Full spec:** Grok integration plan (layers 8-11)

### Architecture

- **Tone.js** for all audio synthesis, scheduling, and spatial positioning
  - PolySynth, FMSynth, NoiseSynth for procedural sounds
  - Panner3D with HRTF for spatial audio
  - Transport for musical scheduling (cricket chirps, wind gusts, owl hoots)
  - ~150KB gzipped -- worth it for FM bird synthesis, spatial API, iOS context handling, and schedule-based ambient layers that would require 2,000+ lines of raw Web Audio boilerplate
- Existing AudioManager refactored to use Tone.js as backend
- AudioListener synced to camera at 60fps

### Ambient Soundscape (6 layers)

| Layer | Synthesis | Time of Day |
|-------|----------|-------------|
| Wind | Brown noise, LPF 380Hz | Always, louder at night |
| Birds | FM synth, random notes | Dawn (loud), day (moderate) |
| Insects | White noise, BPF 5200Hz | Day (loud) |
| Crickets | Pulse osc 2400Hz | Dusk + night |
| Water | Brown noise, LPF 240Hz | Near water tiles |
| Wheat/grass | Pink noise, BPF 620Hz | Near vegetation |

### Spatial Sounds

- Tool impacts positioned at hit point
- NPC footsteps (surface-aware: grass/path/wet)
- Water splashes at interaction point
- Structure ambient (campfire crackle)

### Audio Assets from Library

- `/Volumes/home/assets/Audio/Retro Sounds 1 & 2/` -- PSX-matched SFX (99 files)
- `/Volumes/home/assets/Audio/Foley Sounds/` -- Ambient nature (85 files)
- `/Volumes/home/assets/Audio/Music Loops/` -- Background music (29 loops)
- These SUPPLEMENT procedural synthesis, not replace it

---

<a id="flow"></a>
## 12. Tutorial & User Flow

**Full spec:** `docs/ui-ux/tutorial-user-flow.md`

### Complete User Journey

```
App Launch → Load fonts + init persistence
  → Main Menu (Logo + FarmerMascot + buttons)
     → [Continue] → game (if save exists)
     → [New Game] → Seed phrase (shuffle/manual) → Difficulty tier → Start
        → LoadingOverlay (4 phases, flavor tips)
           → Tutorial Village (in-world, not modal)
              → Learn basics → Receive starter gear → Elder's farewell
                 → Set out into the world (Pokemon-style departure)
                    → Survival gameplay + open world
```

### Seed Phrase System

- 70 adjectives × 60 nouns = 289,800 combinations (already implemented in `seedWords.ts`)
- Brand-aligned: "Whispering Ancient Grove", "Misty Golden Meadow"
- Shuffle button (dice icon) + manual text input
- Seed drives ALL world generation, quest variants, NPC appearances, labyrinth layouts

### Tutorial Village (In-World, Not Modal)

The tutorial IS the opening of the game. No modal overlays, no separate "tutorial mode." You wake up in a small village and learn by doing. The village is always at chunk (0,0) and is handcrafted (not procedural).

**Act 1: Waking Up (2 minutes)**

1. Fade in. You're lying by a campfire. Elder Rowan is standing nearby.
2. "Ah, you're awake. The forest brought you to us." (establishes amnesia-lite — no heavy lore dump)
3. Look around (swipe/mouse) — camera tutorial, see the village: 4-5 buildings, garden, well, a few NPCs going about their day
4. Move to Elder Rowan (joystick/WASD/tap) — movement tutorial

**Act 2: Learning Tools (3 minutes)**

5. Elder Rowan: "Every villager earns their keep. Here — take these." → Receive Basic Axe + Basic Trowel + Watering Can
6. "See that old oak? Show me you can fell it." → Chop a marked tree (tool selection + tool use tutorial)
7. Collect the timber. → Resource pickup tutorial, HUD resource bar lights up
8. "Good. Now plant something new in its place." → Select trowel, plant one of 3 White Oak seeds in the cleared soil
9. Water the sapling. → Watering tutorial

**Act 3: Village Life (2 minutes)**

10. "Go speak with Blossom at the seed stall. She has something for you." → NPC interaction tutorial, walk to Blossom
11. Blossom gives you 2 more seeds + teaches about species ("White Oaks are hardy — good for a beginner.")
12. Quick HUD tour: stamina gauge, hearts, XP bar, tool belt. Toast-style callouts, not blocking modals.

**Act 4: The Departure (2 minutes)**

13. Return to Elder Rowan. He gives you the Leather Satchel and Worn Compass.
14. "The forest is vast. There are... others out there. Older than this village. Older than memory." (first hint at Grovekeepers — cryptic, not explained)
15. "Make camp before nightfall. The cold doesn't forgive." (survival hint)
16. Elder Rowan gestures toward the village gate. The path leads out into procedurally generated wilderness.
17. You walk through the gate. Camera pulls back slightly. The village shrinks behind you. Title card: **"Every forest begins with a single seed."**

**Total tutorial time: ~8-10 minutes.** All gameplay. Zero modal screens. Skip option available (experienced players get starter gear dumped into inventory, teleported to village gate).

### Progressive Hints (20+ one-time tips)

Fire when player encounters features for first time. 30-second global cooldown. Uses existing toast system.

| Trigger | Hint |
|---------|------|
| First night | "Build a campfire before dark. Cold drains your hearts." |
| First rain | "Rain helps trees grow faster — but stay warm." |
| First level-up | "New level! Check what you've unlocked." |
| First hunger warning | "Eat fruit or fish to keep your stamina regenerating." |
| First species discovery | "New species discovered! Check your codex." |
| First ore deposit | "You'll need a forge to work with ore. Craft one with stone." |
| Near labyrinth entrance | "Something ancient lies within..." |
| First NPC gift | "Gifts build friendships. Friends offer better trades." |
| First structure placement | "Structures degrade over time. Maintain them with resources." |
| First death | "You respawn at your last campfire. Dropped resources are recoverable." |
| First night creature | "Stay near light sources at night. The dark has teeth." |
| Approaching biome border | "The landscape changes ahead. Prepare for different conditions." |
| First campfire placement | "Campfires are fast travel points. Place them wisely." |
| First weather warning | "Bramble's warnings mean severe weather is coming — find shelter." |
| First fishing spot | "Craft a fishing rod to fish here. Ponds have rare materials too." |
| First Grovekeeper found | "A dormant guardian... its trees are yours now." |
| Compass use | "Your compass points to the nearest campfire." |
| Storage chest built | "Items in storage chests survive death." |
| 10 trees planted | "You're shaping the landscape. Keep going." |
| First village discovered | "Villages have traders and quest-givers. Worth returning to." |

---

<a id="assets"></a>
## 13. Asset Integration Strategy

### Priority 1: 3DPSX Core (PSX-native, perfect aesthetic match)

| Asset Pack | Count | Use For |
|-----------|-------|---------|
| **3DPSX ChibiCharacters** | 7 base + 33 items | NPC system: basemesh + hair + outfit + shoes assembled per NPC. "pr" emission variants for night glow. |
| **3DPSX Farm Assets** | 85 GLBs | Structures (barn, 5 houses, windmill, well, campfires), props (carts, storage, notice board), crops (5 types), fences (9 variants). 2-65 KB each. |
| **3DPSX All Bushes** | 262 GLBs | Seasonal decoration: 52 shapes x 5 seasons (spring/summer/autumn/winter/dead). Swap GLB on season change. ~95-115 KB each. |
| **3DPSX Fences** | 79 GLBs | Chunk borders, player placement: brick, drystone, wooden, metal, plackard, plaster, white picket. 9-190 KB each. |
| **3DPSX Retro Nature** | 40 GLBs | Trees (8 + 6 winter), bushes (8 + 6 winter), grass (9 + 2 patches). 1-45 KB each. |
| **3DPSX PSX Tools** | 5 GLBs | Already proven. Tool view models: Axe (56v), Hatchet (56v), Hoe (70v), Pickaxe (94v), Shovel (127v). |

### Priority 2: 3DPSX Extended

| Asset Pack | Count | Use For |
|-----------|-------|---------|
| **3DPSX Kitchen/Food** | 48 GLBs | Market/trading visuals, merchant inventory, Survival healing items. |
| **3DPSX Fantasy Mega Pack** | ~20 GLBs | Books/scrolls, bottles, treasure, crates/barrels, knight, weapons. NPC shops, quest rewards. |
| **3DPSX Fantasy Villager NPCs** | 1 composite | Additional NPC variety. Needs Blender split into individual meshes. |
| **3DPSX Fantasy Village Buildings** | 1 composite | Pre-placed village structures. Needs Blender split. |
| **3DPSX Mega Nature** | 1 composite (230 KB) | Additional nature variety. |
| **PSX Mega Pack II** | 549 GLBs | Modular structures (210), survival props (137), buildings (14), lights with on/off (10), tools (31). Survival mode emphasis. |

### Priority 3: Supplementary (non-PSX, may need style adjustment)

| Asset Pack | Count | Use For |
|-----------|-------|---------|
| Nature Kit (Kenney) | 329 GLBs | Flowers, additional rocks, bridges (lower-poly Kenney style, may clash with PSX) |
| Audio (Retro Sounds) | 99 files | Supplement Tone.js procedural SFX |
| Audio (Foley) | 85 files | Ambient nature sounds |
| Audio (Music Loops) | 29 files | Background music |
| Food Kit / Holiday Kit (Kenney) | 300+ GLBs | Only if 3DPSX Kitchen doesn't cover enough |

### Asset Pipeline

1. Copy selected GLBs to `assets/models/` organized by category
2. Shared texture atlases where possible (PSX Mega Pack already uses 512x512 atlases)
3. `useGLTF.preload()` for critical models (tools, common structures)
4. Lazy load biome-specific models on chunk entry
5. Conversion scripts at `/Volumes/home/assets/scripts/` for any FBX->GLB needs

---

<a id="phases"></a>
## 14. Implementation Phases

### Phase 0: Foundation (enables everything)

| Task | New/Modify | Source |
|------|-----------|--------|
| `game/utils/SeededNoise.ts` (Perlin + fBm + ridged multifractal + domain warping) | NEW | Grok integration plan |
| Config JSON files (terrain, water, audio, npcAnimation, seasons, seedWords, combat, cooking, fishing) | NEW | Grok integration plan |
| Wire difficulty multipliers to systems (growth, stamina, harvest, weather, combat, raids) | MODIFY | Game Modes design |
| Difficulty config resolver `getDifficultyConfig(tier)` — single param, survival-only tiers | NEW | Game Modes design |
| Copy 3DPSX GLBs to assets/: ChibiCharacters, Farm Assets, All Bushes, Fences, Retro Nature, Kitchen, Fantasy, PSX Mega Pack II | SETUP | 3DPSX asset library |
| Tone.js integration (add dependency, refactor AudioManager) | NEW | Audio design |
| Split composite GLBs in Blender: Villager_NPCs_glb.glb, Buildings.glb, Mega_Nature.glb | SETUP | 3DPSX asset library |
| Save system foundation (delta-only persistence, auto-save on visibilitychange, manual save) | NEW | Cross-cutting design |

### Phase 1: Core Visual Identity

| Task | New/Modify | Source |
|------|-----------|--------|
| GLB tree system (8 base trees, scale-per-stage, winter variant swap, InstancedMesh) | NEW | 3DPSX Retro Nature |
| GLB seasonal bush system (262 bushes, swap on season change) | NEW | 3DPSX All Bushes |
| ChibiCharacter NPC system (GLB loader + mix-and-match assembly + seeded appearance) | NEW | 3DPSX ChibiCharacters + Grok personality system |
| Terrain heightmap with SeededNoise | NEW | Grok integration plan + Open World |
| Sky shader (8-stop gradient + procedural clouds) | MODIFY | Day/Night design |
| Lighting ramps (golden hour, night point lights) | MODIFY | Day/Night design |
| GLB structure loader + grid-snap placement | NEW | Asset strategy |
| GLB prop instancing (flowers, rocks, decorations) | NEW | Asset strategy |

### Phase 2: Interaction & Feel

| Task | New/Modify | Source |
|------|-----------|--------|
| Tool view model positioning + animations (5 keyframe types) | NEW | Tool Actions design |
| Raycast interaction (per-tool layers, crosshair feedback) | NEW | Tool Actions design |
| Impact effects (shake, particles, sound, haptics) | NEW | Tool Actions design |
| Resource drop visuals (floating text + icon arc) | NEW | Tool Actions design |
| Stamina feedback (4 states, hysteresis, vignette) | MODIFY | Tool Actions design |

### Phase 3: Open World & Navigation

| Task | New/Modify | Source |
|------|-----------|--------|
| Chunk-based world system (16x16 chunks, 3x3 active, 5x5 buffer, seamless stitching) | NEW | Open World design |
| Chunk generation pipeline (terrain + biome + features + props from seed in <16ms) | NEW | Open World design |
| Delta-only persistence (ChunkDelta: planted, harvested, built, removed) | NEW | Open World design |
| Biome noise system (temperature + moisture → 8 biomes, smooth blending) | NEW | Open World design |
| Feature placement system (major every 8-12 chunks, minor every 3-4, micro every 1) | NEW | Open World design |
| Procedural village generator (3-8 buildings, 2-5 NPCs, seeded layout/names) | NEW | Open World design |
| Procedural NPC generator (seeded appearance, personality, quests from templates) | NEW | Open World design |
| World map UI (explored chunks, biome colors, feature icons, fog-of-war) | NEW | Open World design |
| Compass + signpost system (navigation toward features) | NEW | Open World design |
| Campfire fast travel network (max 8 points) | NEW | Open World design |

### Phase 4: Grovekeeper Labyrinths & Combat

| Task | New/Modify | Source |
|------|-----------|--------|
| Grovekeeper Labyrinth system (14 labyrinths, seeded recursive backtracker on 12x12 grid) | NEW | Hedge maze pack + Open World design |
| Modular hedge maze assembly (94 pieces: basic/diagonal/round/slope/triangle, NxM sizing) | NEW | 3DPSX hedge pack |
| Labyrinth dressing (flowerbeds, vases, stone table, seasonal bushes, fountains) | NEW | 3DPSX stone decorations |
| Combat system — maze enemies (bats, skeleton warriors, thorny hedges) | NEW | Survival design |
| Enemy AI (patrol paths, aggro range, attack patterns via Yuka behaviors) | NEW | Survival design |
| Player combat (melee swing, block/dodge, damage calculation, death/respawn) | NEW | Survival design |
| Hearts HUD + damage/healing systems | NEW | Game Modes design |
| Grovekeeper encounter system (14 unique encounters, dialogue variants, species unlock) | NEW | Open World design |
| Grovekeeper teleport-out (return to labyrinth entrance after species unlock) | NEW | Open World design |
| Labyrinth center reward (fountain GLB + benches + rare species seed) | NEW | Open World design |

### Phase 5: Survival Systems

| Task | New/Modify | Source |
|------|-----------|--------|
| Fishing system (fishing rod craft, pond interaction, cast/reel minigame, 8+ fish types) | NEW | Survival design |
| Hunting system (creature AI, pursuit/flee behaviors, drops: meat, hide, bone) | NEW | Survival design |
| Mining system (ore node generation in rocky biomes, pickaxe interaction, 4 ore types) | NEW | Survival design |
| Cooking system (campfire cooking, raw vs cooked food, saturation/healing, 12+ recipes) | NEW | Economy design |
| Cooking Pot structure (advanced recipes requiring Cooking Pot, recipe discovery) | NEW | Economy design |
| Food quality system (raw: minor heal, cooked: moderate heal + buff, recipe: major buff) | NEW | Economy design |
| Creature spawning (biome-appropriate, day/night variants, seeded density) | NEW | Survival design |

### Phase 6: Base Building & Raids

| Task | New/Modify | Source |
|------|-----------|--------|
| Base building system (radial build menu, coarse grid snap, PSX asset placement) | NEW | Base building design |
| Structure placement (85 farm GLBs: barn, houses, windmill, well, campfires, crops) | NEW | 3DPSX Farm Assets |
| Fence/wall system (79 GLBs: 7 types with corners, gates, broken variants) | NEW | 3DPSX Fences |
| Structure upgrade paths (Lean-to → Cabin, Well → Irrigation, Market Stall → Trading Post) | NEW | Progression design |
| Base raid system — raid probability per night (scales with difficulty tier, base value) | NEW | Survival design |
| Raid warning system (horn sound, red sky tint, 60s preparation window) | NEW | Survival design |
| Raid creature waves (corrupted creatures: 1-3 waves, increasing difficulty) | NEW | Survival design |
| Defense structures (spike walls, watch towers, alarm bells — reduce raid severity) | NEW | Survival design |
| Raid loot (bonus resources, rare materials from defeated creatures) | NEW | Survival design |

### Phase 7: Water & Effects

| Task | New/Modify | Source |
|------|-----------|--------|
| Gerstner wave water shader (4-8 layers) | NEW | Grok integration plan |
| Foam + caustics + fresnel | NEW | Grok integration plan |
| Water splash particles + ripple injection | NEW | Grok integration plan |
| Bubble trails | NEW | Grok integration plan |
| Seasonal particles (leaves, snow) | NEW | Grok + Day/Night designs |
| Weather visual effects (rain/drought/wind/snow) | MODIFY | Day/Night design |

### Phase 8: Audio & Ambience

| Task | New/Modify | Source |
|------|-----------|--------|
| Tone.js integration (PolySynth, FMSynth, Panner3D, Transport) | NEW | Grok integration plan |
| Spatial audio (Tone.js Panner3D pool, HRTF, listener sync) | NEW | Grok integration plan |
| Ambient soundscape (6 Tone.js layers, time-of-day crossfade) | NEW | Grok integration plan |
| NPC footsteps (surface-aware, Tone.js spatial) | NEW | Grok integration plan |
| Tool impact sounds (Tone.js procedural synthesis) | MODIFY | Tool Actions design |
| Combat audio (hit impacts, enemy cries, death sounds, raid horn) | NEW | Grok integration plan |
| Copy + integrate audio assets from library | SETUP | Asset strategy |

### Phase 9: Content, Quests, & Progression

| Task | New/Modify | Source |
|------|-----------|--------|
| World quest system (seed-variant narrative chains, 5+ quest templates per biome) | NEW | World Quest design (Section 16) |
| 5 NPC quest chains (JSON quest definitions) | NEW | Quest design |
| NPC personality + dialogue expansion | MODIFY | Quest design |
| NPC relationship system (4 tiers, gift/trade/quest progression) | NEW | Quest design |
| NPC schedules + NPC-to-NPC conversations | NEW | Quest design |
| 10 new achievements + 5 secret achievements | MODIFY | Progression design |
| XP source config (25 sources) + level-up celebration | NEW | Progression design |
| Codex UI (book-style species pages, discovery %) | NEW | Progression design |
| Seasonal milestones + year completion | NEW | Progression design |
| Expanded crafting (forging at Forge, tool upgrades: Wood → Iron → Grovekeeper tier) | NEW | Economy design |
| Clothing/armor crafting (hide + ore → wearable gear with stat bonuses) | NEW | Economy design |

### Phase 10: Tutorial & Game Flow

| Task | New/Modify | Source |
|------|-----------|--------|
| In-world tutorial village (4 acts, Pokemon-style departure into the wild) | NEW | Tutorial design |
| Progressive hints system (20+ contextual hints, unlocked by player actions) | NEW | Tutorial design |
| Loading screen overlay (seed phrase display, biome preview) | NEW | Tutorial design |
| New Game+ unlock + prestige system | NEW | Endgame design |
| Grovekeeper encounter celebration modal (species unlock fanfare) | NEW | Endgame design |
| Pause menu Help tab (replay tutorial, controls reference, hint log) | MODIFY | Tutorial design |

### Phase 11: Polish & Ship

| Task | New/Modify | Source |
|------|-----------|--------|
| Performance verification (55+ FPS mobile, <50 draw calls, <16ms chunk gen) | TEST | All designs |
| Accessibility audit (reduced motion, touch targets, contrast, color blind modes) | TEST | All designs |
| Save system hardening (corruption recovery, low storage warnings, cloud backup) | NEW | Cross-cutting design |
| Weather approach cues + Bramble warnings | MODIFY | Day/Night design |
| Daily quest streak bonuses | MODIFY | Quest design |
| Balance pass (difficulty tiers, economy flow, XP curve, combat difficulty) | TEST | All designs |
| Error states (save corruption, low storage, network failure) | NEW | Tutorial design |

---

<a id="cross-cutting"></a>
## 15. Cross-Cutting Concerns

### Seeded Determinism

Every source of randomness uses `scopedRNG(scope, worldSeed, ...extra)`:
- Terrain heightmap: `scopedRNG('terrain', seed, chunkX, chunkZ)`
- Vegetation placement: `scopedRNG('vegetation', seed, chunkX, chunkZ)`
- NPC appearance: `scopedRNG('npc-appearance', seed, npcId)`
- NPC spawning: `scopedRNG('npc', seed, chunkX, chunkZ)`
- Water phases: `scopedRNG('water', seed)`
- Quest generation: `scopedRNG('quests', seed, day)`
- World quests: `scopedRNG('world-quest', seed, questId)`
- Weather: `scopedRNG('weather', seed, day)`
- Labyrinth layout: `scopedRNG('labyrinth', seed, chunkX, chunkZ)`
- Grovekeeper dialogue: `scopedRNG('grovekeeper-dialogue', seed, grovekeeperId)`
- Major features: `scopedRNG('feature-major', seed, chunkX, chunkZ)`
- Minor features: `scopedRNG('feature-minor', seed, chunkX, chunkZ)`
- Base raids (Survival): `scopedRNG('base-raid', seed, day)`
- Cooking outcomes: `scopedRNG('cooking', seed, recipeId, day)`

### Config-Driven Design

All tuning constants in `config/game/*.json`. Systems read config, never hardcode values. This enables:
- Game mode multipliers applied uniformly
- Balance tuning without code changes
- Future modding support

### PSX Aesthetic Enforcement

| Rule | Implementation |
|------|---------------|
| No antialiasing | `gl={{ antialias: false }}` on R3F Canvas |
| Pixel ratio 1 | `gl={{ pixelRatio: 1 }}` on R3F Canvas |
| No tone mapping | `gl={{ toneMapping: NoToneMapping }}` |
| Linear color space | `gl={{ outputColorSpace: LinearSRGBColorSpace }}` |
| Flat shading | `flatShading: true` on all MeshStandardMaterial |
| Nearest filter | `NearestFilter` on all texture `.minFilter` / `.magFilter` |
| Low segments | Cylinders: 6 radialSegments, Spheres: icosahedron detail 1 |

### Accessibility

- `prefers-reduced-motion`: disable sway, bob, shake, FOV effects, particle arcs
- All touch targets >= 44px
- `motion-safe:` prefix on CSS transitions
- Audio respects mute setting
- Night penalties scale with difficulty tier (Seedling: minimal exposure, Ironwood: full)
- Readable text at 375px width (14px minimum)

### Performance Budget

| Metric | Target |
|--------|--------|
| FPS mobile | >= 55 |
| FPS desktop | >= 60 |
| Draw calls | < 50 |
| Visible vertices | < 30K (mobile LOD) |
| Time to interactive | < 3s |
| Memory mobile | < 100 MB |
| Bundle initial | < 200 KB |
| Chunk generation | < 16ms |
| Labyrinth generation | < 100ms |
| Save delta write | < 50ms |

### Save System

Delta-only persistence: store ONLY what the player changed (planted, harvested, built, removed). Unmodified chunks regenerate from seed.

| Mechanism | Details |
|-----------|---------|
| Auto-save | Triggers on `visibilitychange` (app backgrounded / tab hidden) |
| Manual save | Available from pause menu |
| Storage format | Per-chunk delta maps keyed by `chunkX,chunkZ` |
| Save file budget | < 1 MB for 100 hours of play |
| Cold load | Deserialize deltas + regenerate visible chunks from seed |

Save deltas include: placed entities (position, type, growth stage), removed entities (original seed index), inventory snapshots, quest progress, campfire fast-travel points, and structure placements.

---

<a id="world-quests"></a>
## 16. World Quest Narrative System

### Design Philosophy

World quests are the **narrative spinal column** of Grovekeeper. While the Grovekeeper Path (find all 14 labyrinths) provides mechanical motivation, world quests provide *meaning* — why these forests matter, who walked here before, what the Grovekeepers were protecting, and what happens when guardians sleep too long.

**Narrative tone:** Mysterious, wondrous, bittersweet. The world is beautiful but wild. The Grovekeepers are not villains — they are sad, dormant guardians who failed or were forgotten. Ancient things linger. Nature reclaims. The player is not a hero saving the world; they are a wanderer slowly understanding a world that was already saved once, long ago, by beings who gave everything and were then forgotten.

**Tagline resonance:** "Every forest begins with a single seed." World quests reveal that the Grovekeepers WERE those seeds — each one planted themselves into the earth to protect a species. The player's journey mirrors theirs.

### Seed-Variant Architecture

Every world quest is a **template** with **variant slots**. The world seed determines which variant fills each slot, producing a unique narrative chain per seed while maintaining coherent story structure.

```
Template: "The [adjective] [noun]"
  Seed → variant selection via scopedRNG('world-quest', worldSeed, questTemplateId)

  Variant slots:
    - Title adjective (A/B/C)
    - Premise framing (A/B/C)
    - Key NPC personality shift (A/B/C)
    - Step 2 branch (A/B/C — changes middle of quest)
    - Resolution tone (A/B/C — bittersweet / hopeful / melancholic)
    - Lore fragment revealed (A/B/C — different Grovekeeper backstory)

  3 variants per slot × 6 slots = 729 unique combinations per template
  8 templates × 729 = 5,832 distinct world quest experiences
```

**Technical implementation:**

```typescript
interface WorldQuestTemplate {
  id: string;
  titlePattern: string;                          // e.g., "The {adj} {noun}"
  variants: {
    adjectives: [string, string, string];         // A/B/C title adjective
    premises: [string, string, string];           // A/B/C opening framing
    npcShifts: [string, string, string];          // A/B/C key NPC behavior
    midBranches: [string, string, string];        // A/B/C step 2-3 variation
    resolutions: [string, string, string];        // A/B/C ending tone
    loreFragments: [string, string, string];      // A/B/C Grovekeeper lore
  };
  steps: WorldQuestStep[];                        // 3-5 steps, some vary by branch
  involvedNpcRoles: string[];                     // NPC personality roles needed
  biomeRequirements: string[];                    // which biomes steps occur in
  rewards: WorldQuestReward;
  grovekeeperHints: string[];                     // clues toward labyrinth locations
}

// Variant resolution at world creation
function resolveWorldQuest(template: WorldQuestTemplate, worldSeed: string): ResolvedWorldQuest {
  const rng = scopedRNG('world-quest', worldSeed, template.id);
  return {
    ...template,
    adjective: template.variants.adjectives[Math.floor(rng.next() * 3)],
    premise: template.variants.premises[Math.floor(rng.next() * 3)],
    npcShift: template.variants.npcShifts[Math.floor(rng.next() * 3)],
    midBranch: template.variants.midBranches[Math.floor(rng.next() * 3)],
    resolution: template.variants.resolutions[Math.floor(rng.next() * 3)],
    loreFragment: template.variants.loreFragments[Math.floor(rng.next() * 3)],
  };
}
```

**Same seed = same quest variant, always.** Two players with the same seed phrase share the same world quest narrative. Different seed = different telling of the same underlying story — recognizable structure, fresh details.

### Dialogue System Structure

All NPC dialogue follows a rigid 4-phase structure. Seed determines which dialogue variant pool is active for each NPC.

```
Phase 1: GREETING
  → Personality-driven opener (Sage speaks formally, Thorn speaks bluntly)
  → Mood modifier based on relationship tier + time of day + weather
  → Variant A/B/C selected from scopedRNG('dialogue-greeting', worldSeed, npcId)

Phase 2: TOPIC SELECTION
  → Player sees 2-4 topic options based on:
     - Active world quest steps (if NPC is involved)
     - Available procedural quests
     - Lore topics (unlocked by codex progress)
     - Trade (if NPC is a merchant)
     - Gift (always available)
  → Topics ordered by narrative priority (world quest > chain quest > daily > trade)

Phase 3: DIALOGUE TREE
  → Selected topic expands to a conversation tree
  → World quest dialogue: 3-8 lines with 1-2 player response choices
  → Player choices affect tone (curious / cautious / bold) but NOT quest outcome
     (PSX-era design: choices color the experience, not branch the plot)
  → Lore fragments embedded naturally: "The old ones... they didn't just guard
     the trees. They BECAME the trees. Rowan told me that, once, when I was young."
  → Seed variant determines WHICH lore fragment, WHICH phrasing, WHICH emotional beat

Phase 4: FAREWELL
  → Personality-driven closer
  → If quest step completed: NPC acknowledges progress, hints at next step
  → If relationship milestone hit: special farewell line
  → Variant A/B/C from scopedRNG('dialogue-farewell', worldSeed, npcId)
```

**Dialogue config** lives in `config/game/dialogues.json`. Each NPC has a `dialoguePool` keyed by topic, with 3 variant arrays per topic. World quest dialogue is stored in `config/game/world-quests.json` alongside the template definitions.

### The 8 World Quest Templates

Each seed activates **all 8 world quests** simultaneously, but they unlock progressively as the player explores farther from origin. World quests are encountered naturally through exploration — an NPC mentions something strange, a signpost has a cryptic warning, a lore stone describes an old event. The player follows the thread.

**Unlock distance from origin:**
- Quests 1-2: available within 10 chunks (early game, near tutorial village)
- Quests 3-4: available within 25 chunks (mid-game, 2-3 biomes explored)
- Quests 5-6: available within 40 chunks (late-mid game, 4-5 biomes)
- Quests 7-8: available within 60+ chunks (late game, deep exploration)

---

#### World Quest 1: The Withered Road

**Unlock:** 5+ chunks from origin. Triggered by finding dead trees along a path.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Withered | Blighted | Ashen |
| Premise | A fungal rot creeps along an old trade road, killing every tree it touches | An unnatural frost line cuts through the forest, freezing sap in living wood | A shadow stain spreads from a collapsed shrine, draining color from the canopy |
| NPC shift | Bramble is frightened (unusual for him — he's never seen weather do THIS) | Fern is obsessively collecting samples, barely sleeping | Elder Rowan grows quiet and won't explain why he recognizes the signs |
| Mid-branch | The source is a corrupted pond — purify it by planting 5 Willow saplings around its edge | The source is a frozen Grovekeeper's tear — thaw it by building a campfire ring and waiting through a full day cycle | The source is an old shrine — rebuild it with 20 stone + 10 timber, then place a Grove Lantern |
| Resolution | The road heals slowly. Bramble admits he's seen this before, in a dream. "They warned us. We forgot." | The frost recedes. Fern finds a seed frozen inside the tear — a species she's never catalogued. "It's older than any of us." | The shrine glows faintly. Rowan visits it alone at night. You find him there, talking to no one. "Thank you. They can rest now." |
| Lore fragment | The trade roads were planted, not built. Grovekeepers grew paths between their labyrinths — living roots that hardened into stone. When the keepers slept, the roads began to die. | Grovekeepers could cry seeds. A single tear could birth a forest. But the tears only came from grief — for every species they saved, they lost something of themselves. | Before the labyrinths, the Grovekeepers gathered at shrines to share memories. The shrines held their knowledge. When the keepers slept, the shrines went dark, and the knowledge scattered like leaves. |

**Steps:**
1. Discover dead trees along a path (procedurally placed in the nearest Meadow or Starting Grove biome)
2. Ask village NPCs about the dead trees — Bramble/Fern/Rowan responds based on variant
3. Follow the trail of dead trees to the source (2-3 chunks of pathfinding, with increasingly severe decay)
4. Resolve the source (variant-specific action — see mid-branch above)
5. Return to the NPC. Receive lore fragment + reward.

**Rewards:** 500 XP, 1 rare seed (biome-appropriate), lore stone unlocked in codex, compass hint toward nearest undiscovered labyrinth.

---

#### World Quest 2: The Lost Village

**Unlock:** 8+ chunks from origin. Triggered by discovering ruins (a major feature with collapsed buildings).

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Lost | Sunken | Hollow |
| Premise | Overgrown ruins of a village that vanished in a single night — gardens still growing, meals still on tables, but no people | A village half-submerged in a new pond that wasn't there a season ago — the water rose from below | Empty buildings standing perfectly preserved, but every tree within 3 chunks is dead — as if the village drained the life from the land to survive |
| NPC shift | Hazel recognizes a merchant's mark on a crate — it's HER family's mark, generations old | Willow senses herbal preparations left mid-brew — someone was treating an illness she's seen before | Sage finds a book in the ruins written in a script only Grovekeepers used |
| Mid-branch | Find 3 personal items in the ruins (seeded locations) and bring them to Hazel. She pieces together a family history. | Collect 4 herb samples from around the village and bring them to Willow. She identifies a remedy for "Grovekeeper's sleep." | Bring the book to Sage. He can read fragments. It describes a "sealing" — the village chose to sleep WITH their Grovekeeper. |
| Resolution | Hazel plants a memorial garden at the ruins. "They were traders. They carried seeds between the keepers. When the keepers slept, they had nowhere left to go." | Willow brews the remedy but has no one to give it to. She pours it on the roots of the nearest tree. It blooms, out of season. "Maybe they'll wake up. Someday." | Sage closes the book. "They weren't trapped. They chose this. The keeper couldn't sleep alone, so the whole village lay down with them." He won't speak of it again. |
| Lore fragment | Between the labyrinths, there were villages of Seedbearers — people who carried seeds and stories between the Grovekeepers. They were the connective tissue of the old world. When the keepers slept, the Seedbearers lost their purpose and wandered until they faded. | Grovekeepers could fall ill — not from disease, but from loneliness. A keeper without visitors would grow roots, slow down, stop speaking. The villages kept them human. Without the villages, the keepers had no reason to stay awake. | The "sealing" was a last resort. When a Grovekeeper was dying (not sleeping — dying), the village could choose to bind their life force to the keeper's roots. The village would sleep, but the keeper would endure. It always worked. The keeper always endured. The village never woke up. |

**Steps:**
1. Discover ruins (procedurally placed as a major feature in any biome except Starting Grove)
2. Explore the ruins — find 3-4 interactable objects (seeded from ruin layout)
3. Bring findings to the relevant NPC (variant determines which NPC)
4. NPC asks for a follow-up task (variant mid-branch)
5. Resolution dialogue + lore fragment + reward

**Rewards:** 600 XP, structure blueprint (Memorial Garden — decorative, +5% growth in 2-chunk radius), lore stone, relationship boost with involved NPC.

---

#### World Quest 3: The Merchant's Burden

**Unlock:** 12+ chunks from origin. Triggered by Hazel mentioning a "difficult route" in conversation.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Merchant's | Trader's | Peddler's |
| Premise | Hazel's trade route passes through a corridor where tools rust overnight and seeds won't germinate | A section of the old trade network has become impassable — the path itself fights back, growing thorns faster than they can be cut | Hazel's cart was attacked by night creatures on a route she's walked a hundred times — something has changed |
| NPC shift | Hazel is scared but won't admit it — she jokes more, prices drop (she's trying to sell everything before the next trip) | Thorn volunteers to scout ahead — comes back shaken, won't say what he saw | Oakley examines Hazel's cart damage — the claw marks are too large for any animal he knows |
| Mid-branch | Escort Hazel through the corridor (3-chunk journey, environmental hazards: stamina drain zones, rust patches that damage tools) | Clear the path by planting fast-growing species at 5 thorn nodes (requires Willow or Ash seeds — wetland species that outcompete thorns) | Track the creature to its den (2-chunk trail of destruction), discover it's a massive root system that's grown feral — plant 3 trees around it to calm it |
| Resolution | The corridor clears. Hazel finds an old waystone — a Seedbearer marker. "My ancestors walked this route. They knew the safe paths because the keepers TOLD them." She marks it on your map — it points toward a labyrinth. | The thorns recede. Underneath, an old Grovekeeper path is visible — stone roots forming a road. Thorn kneels. "I've walked these woods my whole life. I never knew this was here." | The root system calms. At its center, a tiny shrine with a single seed — perfectly preserved. Oakley: "That's not natural wood. That's a keeper's heartwood. Someone planted a piece of themselves here to guard this route." |
| Lore fragment | The Seedbearers didn't just carry seeds — they carried SONGS. Each species had a planting song that the Grovekeepers taught them. The songs are lost now, but sometimes, in deep forests, you can hear the wind hum something that sounds almost like a melody. | The Grovekeepers grew the first roads — living root networks that connected every labyrinth. The roots could sense travelers and would guide them safely. When the keepers slept, the roots kept growing, but without purpose. They grew wild, grew thorns, grew hungry. | Each Grovekeeper planted a piece of their own heartwood at the center of their labyrinth. It's what keeps them alive through the long sleep. But some keepers planted fragments along the roads too — insurance, in case the labyrinth fell. These fragments grew into something neither tree nor keeper. Something confused. |

**Steps:**
1. Speak with Hazel after reaching 12+ chunks explored — she mentions the route problem
2. Investigate the route (travel to the affected area, 2-3 chunks from Hazel's village)
3. Complete the variant-specific challenge (escort / plant / track)
4. Return to the involved NPCs for resolution dialogue
5. Receive lore + map marker (always points toward an undiscovered labyrinth)

**Rewards:** 700 XP, permanent 10% trade discount with Hazel, map marker toward nearest undiscovered labyrinth, lore stone.

---

#### World Quest 4: The Keeper's Memory

**Unlock:** 15+ chunks from origin. Triggered by finding a lore stone that plays a sound when approached.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Keeper's | Guardian's | Warden's |
| Premise | Lore stones scattered across 3 biomes are humming in sequence — they're trying to play a song that was interrupted centuries ago | A Grovekeeper's dream is leaking into reality — NPC villagers report seeing a translucent figure walking the forest at dawn, planting invisible seeds | Stone tablets with carved instructions are appearing at the base of Old Growth trees — instructions for a ritual no one alive understands |
| NPC shift | Sage becomes agitated — he's HEARD this song before, in a book he read as a child. He can't remember the ending. | Willow sees the figure too — she recognizes the herbs it gathers. "Those are for Grovekeeper's Sleep remedy. It's trying to wake itself up." | Elder Rowan reads the tablets and goes pale. "These aren't instructions. They're an apology." |
| Mid-branch | Find 4 lore stones across 3 biomes (each stone plays a note — the player must visit them in the correct order, revealed by Sage's partial memory + trial) | Follow the figure's path across 3 dawn cycles (each dawn it appears in a different chunk, planting phantom trees that point toward something) | Collect 5 tablets and arrange them at an ancient stone table (the apology, when read in order, reveals coordinates of a "first labyrinth" — one that existed before the 14) |
| Resolution | The song completes. Every tree within earshot sways in unison, even without wind. Sage weeps. "That was their lullaby. The keepers sang it to each other before they slept. They were saying goodbye." | The figure reaches its destination — a barren hilltop. It kneels, places both hands on the ground, and fades. Where it knelt, a single seedling pushes through. It's a species you've never seen. Willow: "It finished what it started. After all this time." | The apology, in full: "We chose sleep because we could not choose death. We chose labyrinths because we could not choose to be forgotten. We chose thorns because we could not choose to be easy to find. Forgive us. We were afraid." Rowan: "They were just people. Extraordinary people. But just people." |
| Lore fragment | The Grovekeepers were not born — they were chosen. Ordinary people who loved a single species so deeply that the forest offered them a bond. They accepted, knowing it meant they could never leave. The lullaby was the only thing they shared — it was the sound of choosing to stay. | Grovekeepers don't truly sleep. They dream. And in their dreams, they tend infinite forests — perfect, endless, without blight or season. The dream is so beautiful that waking feels like loss. Some keepers chose never to wake. The phantom was one who was trying. | The first Grovekeeper was not one of the 14. There was a fifteenth — the one who taught the others. They didn't build a labyrinth. They planted a single tree on a hilltop and sat beneath it. They're still there. The tree grew around them. No one knows which hilltop. |

**Steps:**
1. Discover a humming lore stone / translucent figure / carved tablet (variant-specific trigger)
2. Consult Sage / Willow / Elder Rowan (variant-specific NPC)
3. Multi-step investigation across 3 biomes (variant mid-branch)
4. Witness the resolution event
5. Receive lore fragment + reward

**Rewards:** 800 XP, codex chapter unlock ("The Old Ones"), compass upgrade (now shows direction to nearest lore stone in addition to campfires), lore stone.

---

#### World Quest 5: The Singing Stones

**Unlock:** 20+ chunks from origin. Triggered by finding a stone circle in a Rocky Highlands biome.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Singing | Whispering | Resonant |
| Premise | 5 stone circles across 5 biomes each produce a different tone when a specific species is planted nearby — together they form a chord that "opens" something | 5 ancient wells in different biomes reflect not the sky but scenes from the past — watering them with specific resources causes the visions to sharpen | 5 carved monoliths in a line across the world map, each pointing toward the next, each inscribed with a riddle about a species |
| NPC shift | Ember is ecstatic — she's theorized about "resonance botany" for years and everyone thought she was mad | Sage recognizes the well visions — they match illustrations in the oldest book in his collection, one he's never been able to fully translate | Botanist Fern realizes the riddle answers correspond to species growth properties she's measured but never understood WHY they were those specific numbers |
| Mid-branch | Plant the correct species at each circle (clues from Ember's notes + stone inscriptions: species chosen by seed variant from the 15 available) | Pour specific resources into each well (timber/sap/fruit/acorns — sequence determined by seed variant, clued by Sage's partial translation) | Solve each riddle by planting the described species at the monolith's base (riddles are poetic descriptions of growth stage, bark color, leaf shape — seed variant changes which species matches) |
| Resolution | The chord sounds. Deep underground, something shifts. A new path opens in the nearest labyrinth — a shortcut past the hardest section. Ember: "The keepers built backdoors. Sound-locked. They never wanted to make it IMPOSSIBLE. Just... difficult enough that you'd have to understand the trees first." | The wells show one final vision: the moment the Grovekeepers chose to sleep. They stood in a circle, held hands, and sank into the earth together. One by one. The last one standing looked directly at the well — directly at YOU. Sage: "They knew someone would look. Someday." | The monoliths light up in sequence, and a map etches itself into the final stone — every labyrinth location in the world, faintly glowing. Fern: "They LEFT us a map. This whole time. We just had to prove we knew the trees well enough to read it." |
| Lore fragment | The Grovekeepers could hear trees grow. Not metaphorically — literally. Each species had a frequency, a vibration in the wood as cells divided. The stone circles were amplifiers. The keepers used them to listen to the health of forests hundreds of chunks away. When they slept, the stones went silent. | The wells were memory pools — shared consciousness anchors. Any Grovekeeper could look into a well and see through another keeper's eyes. It was how they coordinated across the vast distances between labyrinths. The visions playing now are echoes — the last things the wells recorded before the keepers slept. | The monolith line is a teaching tool. The first Grovekeeper (the fifteenth, the teacher) carved them as a test for future keepers. "If you can read the trees, you can find us. If you can find us, you deserve what we protect." The test was never meant for Grovekeepers. It was meant for the person who would come AFTER. |

**Steps:**
1. Find the first stone circle / well / monolith (major feature in Rocky Highlands)
2. Consult Ember / Sage / Fern about the discovery
3. Travel to all 5 locations across 5 different biomes (each 8-15 chunks apart)
4. Complete the variant-specific puzzle at each location
5. Witness the resolution event at the final location

**Rewards:** 1000 XP, labyrinth shortcut (variant A) OR labyrinth map reveal (variant C) OR codex vision chapter (variant B). All variants: 2 rare seeds, relationship boost with involved NPC.

---

#### World Quest 6: The Frozen Garden

**Unlock:** 25+ chunks from origin. Triggered by discovering a grove of crystallized trees in a Frozen Peaks biome.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Frozen | Crystalline | Glacial |
| Premise | An entire grove of mature trees stands perfectly preserved in ice — not dead, not alive, suspended. Something is keeping them frozen long after winter has passed. | A garden of impossible beauty — flowers made of ice, trees of glass, water flowing upward — exists in a pocket where the laws of growth are reversed | Stone-hard trees that ring like bells when struck stand in precise geometric patterns — not a natural grove but a planted one, species interleaved with mathematical precision |
| NPC shift | Bramble says the weather around the grove is "wrong" — it's not cold, it's the ABSENCE of warmth. "Something is drinking the heat." | Willow wants to harvest the ice flowers for remedies but they shatter at her touch. "They're not ice. They're tears. Crystallized tears." | Oakley examines the tree placement and realizes it follows building blueprints he's seen in old carpentry manuals — the grove IS a structure |
| Mid-branch | Find the heat source being drained — a hot spring 2 chunks away that's been diverted underground by root growth. Redirect it by planting 8 trees in a channel pattern. | Find 5 "warm seeds" — seeds that radiate heat, found in Orchard Valley and Meadow biomes near campfire sites. Plant them in a ring around the garden. | Determine the structure's purpose by planting the missing species in the empty positions (blueprint from Oakley's manuals + species clues from growth patterns) |
| Resolution | The ice melts slowly. Underneath, the trees are alive — they've been growing at 1/1000th speed for centuries. The grove is the oldest living thing in the world. Bramble: "The keeper froze them to protect them from a blight. It worked. But no one came to thaw them." | The warm seeds ignite. The ice garden transforms — ice flowers become real flowers, glass trees become saplings, reversed water settles. At the center, a sleeping figure becomes visible beneath the ice. Not a Grovekeeper — a child. Willow: "The keeper's apprentice. They were too young for the sleep. The keeper turned them to ice to preserve them. To give them TIME." | The structure activates. The bell-trees ring in harmony — and every labyrinth in the world briefly pulses with light (visible from any distance). Oakley: "It's a beacon. The keeper built a signal to tell the other keepers 'I'm still here.' It's been silent for centuries. Until now." |
| Lore fragment | Not every Grovekeeper chose to sleep. Some were frozen by others — keepers who saw a blight coming and chose to preserve their siblings rather than let them fight and die. The frozen keepers don't dream. They wait. They have been waiting for someone to decide it's safe to let them wake. | The Grovekeepers took apprentices — children from the Seedbearer villages who showed affinity for a species. Most apprentices grew up and chose normal lives. A few stayed. The youngest were the most devoted, and the most heartbroken when the keepers chose to sleep. Some keepers couldn't bear to leave their apprentices behind. | The Grovekeeper network was not just labyrinths and roads — it was a living communication system. Bell-trees, resonance stones, memory wells, and beacon groves formed a web that connected every keeper to every other. When the keepers slept, the network went dormant. Every world quest the player completes reactivates a node. The network is waking up. |

**Steps:**
1. Discover the frozen / crystalline / geometric grove (major feature in Frozen Peaks or deep biome)
2. Investigate the grove (interact with 3 objects, discover the anomaly)
3. Consult Bramble / Willow / Oakley
4. Complete multi-step resolution (variant mid-branch, spans 2-3 chunks)
5. Witness the resolution + receive lore

**Rewards:** 1100 XP, unique structure blueprint (Frost Beacon — reveals weather 2 days in advance in 3-chunk radius), rare species seed (Ghost Birch if not yet unlocked, otherwise Crystal Oak seed), lore stone.

---

#### World Quest 7: The Wanderer's Journal

**Unlock:** 35+ chunks from origin. Triggered by finding torn journal pages in abandoned carts and campfire sites.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Wanderer's | Pilgrim's | Drifter's |
| Premise | Scattered journal pages describe a traveler who visited every Grovekeeper BEFORE they slept — the last person to speak to all 14. The pages are numbered but out of order. | A series of carved walking sticks left at campfire sites, each notched with a count of days walked. Together they trace a single journey that took a lifetime. | Letters, never sent, found in hollow trees. Written to someone named "Root." Each describes a different Grovekeeper as if the writer knew them personally. |
| NPC shift | Sage becomes obsessed — the journal's handwriting matches annotations in his oldest book. The author visited HIS village, generations ago. | Thorn finds one of the walking sticks and recognizes the wood — it's heartwood. "No one carves heartwood. It's sacred. This person was either a keeper or..." He trails off. | Hazel finds a letter addressed to "Root" that mentions a merchant family by name — HER family. "Root traded with my great-great-grandmother. Root was... what WAS Root?" |
| Mid-branch | Collect 7 journal pages from 7 different feature sites across the world (each page reveals one Grovekeeper's personality before the sleep — who they were as PEOPLE) | Follow the walking stick trail — 5 campfire sites in a spiral pattern converging on a location that isn't a labyrinth. It's a cottage. A real, intact, unlocked cottage. | Find 6 letters in hollow trees (seeded locations in Old Growth tree clusters). The last letter is unfinished. It says: "I cannot find the fifteenth. I have looked everywhere. I think I AM the—" |
| Resolution | The full journal reveals: the wanderer was the Seedbearer elder — the leader of all the Seedbearer villages. When the keepers chose to sleep, the elder visited each one to say goodbye. The last page: "I have said goodbye to the last of them. Now I must decide what to do with what they taught me. I think I will walk." The journal has no ending. Sage: "They never stopped walking." | The cottage belongs to Root. Inside: a single room, a bed, a desk, a garden out back still growing (delta-persisted, self-sustaining). On the desk, a seed packet labeled "For whoever comes next." Inside: one seed of every species. Thorn: "Root wasn't a keeper. Root was the first Grovekeeper's FRIEND. The one who said 'I'll remember you.' And they did. For their whole life." | The unfinished letter reveals Root's identity: they were the fifteenth Grovekeeper's apprentice — the one who was told to "go live" instead of sleeping. Root refused. They spent their entire life trying to find the fifteenth Grovekeeper, the teacher, the one who planted a single tree on a hilltop. Hazel: "Root never found them. But Root planted trees everywhere they looked. That's why the forests are so vast. Root was planting hope." |
| Lore fragment | The Seedbearers had an elder who served as diplomat between the keepers. When the keepers disagreed (and they did — fiercely, about which species to prioritize, which biomes to protect), the elder would mediate. The elder loved all 14 keepers equally. Saying goodbye to each one broke them 14 times. They walked to keep moving because stopping meant feeling it. | Root was not special. Root had no powers, no species bond, no affinity. Root was simply a person who loved the forest and befriended the first Grovekeeper by bringing them lunch every day for 40 years. The first Grovekeeper said Root was the reason they stayed awake as long as they did. "I would have slept centuries ago. But you kept bringing lunch." | The fifteenth Grovekeeper — the teacher — never built a labyrinth because they never bonded with a single species. They loved ALL trees equally. The other 14 thought this was weakness. Root thought it was the greatest strength of all. "To love everything equally is the hardest love. That's why they were the teacher. That's why they were the first to sleep." |

**Steps:**
1. Find first journal page / walking stick / letter (minor feature drops)
2. Consult Sage / Thorn / Hazel about the artifact
3. Collect remaining artifacts across the world (7/5/6 pieces, scattered across biomes)
4. Assemble the complete story at a lore table
5. Visit the resolution site (variant-specific) for final revelation

**Rewards:** 1200 XP, unique item (Wanderer's Compass — points toward the nearest uncollected journal page / lore stone in the world), all labyrinth locations partially revealed on world map (foggy markers), major relationship boost with involved NPC.

---

#### World Quest 8: The Worldroot's Dream

**Unlock:** 50+ chunks from origin, AND at least 8 Grovekeepers awakened. This is the final world quest — the narrative climax that sets up the Worldroot encounter.

| Slot | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| Adjective | Worldroot's | Dreamer's | Deeproot's |
| Premise | The ground trembles. Not earthquakes — breathing. Something vast beneath the world is stirring. Trees across multiple biomes lean toward the same point. | The awakened Grovekeepers begin speaking through their trees — whispered words in the rustle of leaves. They're all saying the same thing: a name. YOUR name. | Night lasts 2 minutes longer each day. Dawn comes slower. The world is not growing darker — it's growing DEEPER. Colors are richer. Stars are closer. The dream is leaking into the waking world. |
| NPC shift | Every NPC in the world has the same dream on the same night: a tree so large it holds the sky. They can all describe it perfectly. None of them have ever seen it. | Elder Rowan stops pretending. He knows what the Worldroot is. "I was a Seedbearer child. I was the last one born before the keepers slept. I REMEMBER." | Sage's books rewrite themselves overnight. New pages appear. The books are updating with information about the player — things the player has done. "The books are alive. They've been alive this whole time. They're part of the Worldroot." |
| Mid-branch | Plant one tree of each awakened species in a circle at the trembling's epicenter (requires travel to 3+ biomes to gather seeds if not already held) | Answer the Grovekeepers' call — visit each awakened labyrinth and speak to the Grovekeeper there (they've changed — new dialogue, more awake, grateful) | Bring Sage's self-writing book to the center of the world — the book will guide you, adding new pages as you travel, recording your journey in real-time |
| Resolution | The circle of trees grows instantly to Old Growth. At the center, a crack in the earth reveals roots going down forever. A voice from below — not words, a feeling: gratitude, loneliness, hope. The Worldroot knows you're coming. It has been waiting since before you were born. The path to the final labyrinth opens. | The Grovekeepers speak in unison, through every tree you've planted: "We were not sleeping. We were holding. Holding the world together while it healed. It has healed. You healed it. Come to the center. Finish what we started." The Worldroot labyrinth location blazes on your map. | The book writes its final page: "The Worldroot does not guard a species. It guards the DREAM — the shared dream of every Grovekeeper, the dream of a world where every tree is loved. You have been walking through that dream. The labyrinth at the center is not a test. It is an invitation." The book closes. It cannot be reopened. It has become a seed. |
| Lore fragment | The Worldroot is not the largest Grovekeeper. It is the first tree — planted before there were Grovekeepers, before there were people. The Grovekeepers grew from its seeds. They ARE its children. When it sleeps, it dreams of a world full of trees, tended by people who love them. It has been dreaming for a very long time. It would like to see if the dream came true. | The 14 Grovekeepers were not holding labyrinths. They were holding ROOT LINES — underground connections to the Worldroot. If they let go, the Worldroot would die, and every tree in the world would die with it. They chose to sleep holding on. For centuries. Their arms must ache. | The Worldroot is not asleep the way the other keepers are asleep. The Worldroot is AWAKE — has always been awake — but cannot move, cannot speak, cannot act. It can only dream. And its dream is the world. The forests, the weather, the seasons — all of it is the Worldroot dreaming. When you plant a tree, the Worldroot smiles. When you chop one down, it understands. It has been watching you since the first seed. |

**Steps:**
1. Observe the world anomaly (trembling / whispers / extended nights)
2. Consult ALL available NPCs — each has a unique reaction
3. Complete the variant-specific pilgrimage (plant circle / visit labyrinths / carry the book)
4. Arrive at the revelation site (center of the world, or directed location)
5. The Worldroot labyrinth location is fully revealed. Final lore fragment delivered.

**Rewards:** 1500 XP, Worldroot labyrinth location revealed on map, all remaining labyrinth locations revealed, unique title "Dreamsower", codex final chapter unlock ("The Dream").

---

### World Quest / Grovekeeper Path Integration

World quests are not separate from the Grovekeeper hunt — they are **scaffolding** for it. Every world quest enriches and assists the main path:

| Integration Point | How It Works |
|-------------------|-------------|
| **Labyrinth hints** | Quests 1, 3, 5, 7, 8 all provide map markers, compass upgrades, or direct labyrinth reveals. A player who engages with world quests finds labyrinths faster. |
| **Labyrinth preparation** | Quest 5 (variant A) provides labyrinth shortcuts. Quest 6 rewards provide weather forecasting near labyrinths. Quest 4's compass upgrade helps navigate TO labyrinths. |
| **Lore context** | Each world quest reveals WHO the Grovekeepers were as people. By the time the player reaches the Worldroot, they understand what they're waking up — not just game mechanics, but characters with histories, fears, and sacrifices. |
| **Emotional escalation** | Quests 1-2 establish mystery. Quests 3-4 establish tragedy. Quests 5-6 establish wonder. Quests 7-8 establish personal connection. The Worldroot encounter is earned emotionally, not just mechanically. |
| **Item rewards** | Wanderer's Compass (quest 7), Frost Beacon (quest 6), labyrinth shortcuts (quest 5) — all directly useful in labyrinth exploration. |
| **NPC depth** | World quests reveal that the village NPCs are not random — they are descendants of Seedbearers, the people who served the Grovekeepers. Elder Rowan REMEMBERS. Sage's books are ALIVE. Hazel's family CARRIED seeds between the keepers. The village is not a tutorial zone — it's the last fragment of the old world. |

### Narrative Arc Summary

```
Act I   (Quests 1-2):  DISCOVERY  — "Something ancient happened here."
Act II  (Quests 3-4):  LOSS       — "They gave everything. We forgot."
Act III (Quests 5-6):  WONDER     — "The world they built was extraordinary."
Act IV  (Quests 7-8):  CONNECTION — "They were just people. Like us."
Climax  (Worldroot):   BECOMING   — "Now it's your turn. Every forest begins with a single seed."
```

The player begins as a nobody leaving a village. Through world quests, they learn they are not discovering the Grovekeepers — they are BECOMING one. The Worldroot encounter confirms it: the dream needs a new dreamer. The forest needs a new seed.

---

## Source Design Documents

| Document | Path |
|----------|------|
| Grok Integration Plan | `docs/plans/2026-03-07-grok-integration-plan.md` |
| Open World System | `docs/architecture/open-world-system.md` |
| Tree Species Visual Spec | `docs/game-design/tree-species-visual-spec.md` |
| Quest & Dialogue System | `docs/design/quest-dialogue-system.md` |
| Tutorial & User Flow | `docs/ui-ux/tutorial-user-flow.md` |
| Tool Action System | `docs/architecture/tool-action-system.md` |
| Economy Design | `docs/ECONOMY_DESIGN.md` |
| Progression System Design | `docs/game-design/progression-system-design.md` |
| Day/Night & Weather | `docs/architecture/day-night-weather-visual-system.md` |
| Game Mode System | `docs/plans/game-mode-system-design.md` |
| 3D Asset Inventory | Agent output (see task transcript) |
| Master Completion Plan (historical) | `docs/plans/2026-03-06-master-completion-plan.md` |
