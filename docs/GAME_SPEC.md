# Grovekeeper Game Specification

This document is the **single source of truth** for all game systems, UI/UX flows,
formulas, and data. Code implements what this document specifies. Tests verify
what this document specifies. If code and spec disagree, the spec wins.

**Canonical design:** [`docs/plans/2026-03-07-unified-game-design.md`](plans/2026-03-07-unified-game-design.md)

Last updated: 2026-03-08 (§39 re-audited — 4,071 tests passing, 12 failing; crafting panels now mounted; 13 orphaned systems confirmed)

---

## Table of Contents

1. [User Flow](#1-user-flow)
2. [Difficulty System](#2-difficulty-system)
3. [World Seed System](#3-world-seed-system)
4. [Core Game Loop](#4-core-game-loop)
5. [Time System](#5-time-system)
6. [Season System](#6-season-system)
7. [Weather System](#7-weather-system)
8. [Growth System](#8-growth-system)
9. [Species Catalog](#9-species-catalog)
10. [Economy](#10-economy)
11. [Tools](#11-tools)
12. [Stamina & Survival](#12-stamina--survival)
13. [Harvest System](#13-harvest-system)
14. [Quest System](#14-quest-system)
15. [Achievement System](#15-achievement-system)
16. [Progression & New Game+](#16-progression--new-game)
17. [Open World](#17-open-world)
18. [Structure System](#18-structure-system)
19. [NPC System](#19-npc-system)
20. [Trading System](#20-trading-system)
21. [Discovery System](#21-discovery-system)
22. [Crafting & Forging](#22-crafting--forging)
23. [Input System](#23-input-system)
24. [HUD Layout](#24-hud-layout)
25. [Tutorial System](#25-tutorial-system)
26. [Save and Persistence](#26-save-and-persistence)
27. [Audio](#27-audio)
28. [Visual Identity](#28-visual-identity)
29. [Seeded RNG](#29-seeded-rng)
30. [World Quest Narrative System](#30-world-quest-narrative-system)
31. [Procedural Terrain & Water](#31-procedural-terrain--water)
32. [Grovekeeper Spirits](#32-grovekeeper-spirits)
33. [Dialogue Branching System](#33-dialogue-branching-system)
34. [Combat System](#34-combat-system)
35. [Base Building (Kitbashing) — SUPERSEDED BY §43](#35-base-building-kitbashing--superseded-by-43)
36. [Particle Systems](#36-particle-systems)
37. [Game Modes](#37-game-modes)
38. [ECS Component Architecture](#38-ecs-component-architecture)
39. [Implementation Status](#39-implementation-status)
40. [World Naming System](#40-world-naming-system)
41. [RPG Combat & Random Encounters](#41-rpg-combat--random-encounters--confirmed-2026-03-07)
42. [Procedural World Rendering (GLB-Free)](#42-procedural-world-rendering-glb-free)
43. [Procedural Town Generation (Street-Grid + Blueprints)](#43-procedural-town-generation-street-grid--blueprints)
44. [Fishing Mechanic](#44-fishing-mechanic)
45. [Mining Mechanic](#45-mining-mechanic)
46. [Player Building Flow](#46-player-building-flow)

---

## 1. User Flow

The complete user journey from app launch to gameplay.

### 1.1 App Launch

```
App opens
  -> Root layout loads fonts (Fredoka, Nunito)
  -> Persistence layer initializes (Legend State -> expo-sqlite)
  -> Offline growth calculated if returning player
  -> Route to Main Menu screen
```

### 1.2 Main Menu

- **Background:** Vertical gradient (skyMist -> leafLight -> forestGreen)
- **Decorative elements:** Tree silhouettes (SVG), floating leaf particles
- **Card (centered):** Logo SVG, Farmer mascot "Fern", tagline, buttons
- **Buttons:** "Continue Grove" (if save), "New Grove", Settings
- **Footer:** Version number

### 1.3 New Game Flow

```
Seed Phrase -> Difficulty Tier -> Start -> Loading -> Tutorial Village -> Depart
```

1. **Seed phrase:** "Adjective Adjective Noun" with shuffle/manual input
2. **Difficulty tier:** Seedling / Sapling / Hardwood / Ironwood
3. **Loading overlay:** 4-phase progress (fonts, store, world gen, first frame)
4. **Tutorial Village:** In-world, Pokemon-style departure (see Section 25)

### 1.4 Game Screen (Playing)

- **3D Canvas** (R3F): Terrain, trees, player, NPCs, structures, sky, lighting
- **HUD Overlay:** Resources, hearts, hunger, XP, time, tool belt, stamina, compass
- **PSX aesthetic:** No antialiasing, pixel ratio 1, flat shading, nearest filter

### 1.5 Pause Menu

Overlay with tabs: Stats, Progress, Codex, World Map, Settings, Help.

---

## 2. Difficulty System

**Two game modes:** Exploration (cozy, no survival) and Survival (4 sub-difficulties).
See Section 37 for full game mode details. Data: `config/game/difficulty.json`.

### 2.1 Tier Definitions

| Field | Seedling | Sapling | Hardwood | Ironwood |
|-------|----------|---------|----------|----------|
| **Hearts** | 7 | 5 | 4 | 3 |
| **Growth** | 1.0x | 0.8x | 0.6x | 0.4x |
| **Yield** | 1.0x | 0.75x | 0.5x | 0.3x |
| **Weather** | 0.5x | 1.0x | 1.5x | 2.0x |
| **Stamina drain** | 1.0x | 1.3x | 1.6x | 2.0x |
| **Hunger drain** | 0.5/min | 1.0/min | 1.5/min | 2.0/min |
| **Permadeath** | No | Optional | Optional | Forced |

### 2.2 Survival Systems

| System | Behavior |
|--------|---------|
| **Hearts** | 3-7 max. Damage from exposure, exhaustion, storms, maze enemies. |
| **Hunger** | 100 max. Drains per minute (tier-scaled). 0 hunger = no stamina regen + slow heart drain. |
| **Stamina** | 100 max. Drain on tool use, sprint. Exhaustion at 0 = vulnerable. |
| **Weather** | Real impact: rain (growth + cold), drought (reduced yields), windstorm (damage), snow (slow + exposure). |
| **Temperature** | Biome + weather + time-of-day. Campfire/shelter = warmth. |
| **Healing** | Eat fruit (+0.5-1), campfire rest (+0.5/min), herbal remedy (+2), cooked food (better). |
| **Death** | Drop carried resources, respawn at last campfire. Ironwood: permadeath. |

### 2.3 Starting Gear (Tutorial Village)

| Item | Purpose |
|------|---------|
| Basic Axe | Chop trees (slow, low yield) |
| Basic Trowel | Plant seeds, dig |
| Watering Can | Water plants |
| 3 White Oak seeds | Starter species (the only one you begin with) |
| Leather Satchel | Inventory (small, upgradeable) |
| Worn Compass | Points home + nearest campfire |

### 2.4 Architecture: Config-Driven

Systems read numeric multipliers from `getDifficultyConfig(tier)`. All tuning in
`config/game/difficulty.json`. Never `if (tier === 'ironwood')` -- always multiplied
values that naturally scale.

---

## 3. World Seed System

ALL randomness uses deterministic seeded RNG derived from the world seed phrase.

### 3.1 Seed Phrase Format

"Adjective Adjective Noun" -- three title-cased words.

- **70+ adjectives** in 8 categories (Texture, Light, Temperature, Age, Nature, Sound, Size, Mood)
- **60 nouns** in 6 categories (Trees, Forest, Water, Earth, Creatures, Magical)
- Two adjectives guaranteed different

### 3.2 RNG Architecture

```
World Seed Phrase (e.g., "Gentle Mossy Hollow")
  -> hashString(phrase) -> numeric seed
  -> createRNG(seed) -> Mulberry32 PRNG

Subsystem-scoped RNG:
  scopedRNG(scope, worldSeed, ...extraParams)
  -> hashString("scope-worldSeed-param1-param2-...")
  -> createRNG(hash)
```

### 3.3 Zero Math.random()

NO code path may use `Math.random()`. All randomness flows through `scopedRNG()`.
Same seed = same world, always.

---

## 4. Core Game Loop

Systems run every frame inside the R3F `useFrame` hook.

### 4.1 System Execution Order

```
1. Time Advancement      -- advance game clock, detect day/season changes
2. Weather Update        -- roll weather events, compute growth multiplier
3. Growth System         -- advance tree progress, handle stage transitions
4. Stamina Regeneration  -- time-based stamina recovery
5. Hunger Update         -- drain hunger, check starvation
6. Harvest Cooldowns     -- tick cooldown timers
7. NPC Movement          -- interpolate NPC positions
8. NPC AI (throttled 2s) -- brain evaluation
9. Achievement Check (5s)-- scan stats against conditions
10. Event Scheduler (10s)-- festivals, encounters, market events
```

### 4.2 Frame Safety

- `dt = Math.min(delta, 0.1)` -- cap at 100ms
- Skip all systems when `screen !== "playing"`
- Store writes batched and throttled

---

## 5. Time System

### 5.1 Time Scale

| Real Time | Game Time |
|-----------|-----------|
| 1 second | 1 minute |
| 24 minutes | 1 day |
| 36 hours | 1 season (90 days) |
| 6 days | 1 year (360 days) |

Game starts: Spring, Day 1, Year 1, 8:00 AM.

### 5.2 Day Periods

| Period | Hours | Light Intensity |
|--------|-------|-----------------|
| Midnight | 0:00-4:59 | 0.0 |
| Dawn | 5:00-5:59 | 0.0 -> 0.3 |
| Morning | 6:00-11:59 | 0.3 -> 1.0 |
| Noon | 12:00-13:59 | 1.0 |
| Afternoon | 14:00-17:59 | 1.0 -> 0.5 |
| Dusk | 18:00-19:59 | 0.5 -> 0.1 |
| Evening | 20:00-21:59 | 0.1 -> 0.0 |
| Night | 22:00-23:59 | 0.0 |

### 5.3 Sky Colors

8-stop gradient interpolation. Zenith and horizon colors per time period.
Procedural cloud noise in horizon band (zero draw calls).

---

## 6. Season System

### 6.1 Calendar

4 seasons, 90 game days each. Season length modified by difficulty.

### 6.2 Growth Multipliers

| Season | Multiplier |
|--------|-----------|
| Spring | 1.5x |
| Summer | 1.0x |
| Autumn | 0.8x |
| Winter | 0.0x (evergreens: 0.3x, Ghost Birch: 0.5x) |

### 6.3 Seasonal Visuals

- GLB seasonal bush swap: 52 shapes x 5 seasons (262 3DPSX GLBs)
- Tree color tint via material uniform OR winter variant GLB swap
- Variable day length: summer 165s real daylight vs winter 105s
- 5-day season transition blend

---

## 7. Weather System

### 7.1 Weather Types

| Type | Growth Mult | Duration (game sec) | Visual | Survival Impact |
|------|------------|---------------------|--------|----------------|
| Clear | 1.0x | Until next check | None | None |
| Rain | 1.3x | 60-120 | CSS overlay drops | Cold exposure |
| Drought | 0.5x | 90-180 | Heat shimmer | +50% stamina cost |
| Windstorm | 1.0x | 30-60 | Particle streaks | Structure/tree damage |
| Snow (winter) | 0.0x | 120-240 | Drifting flakes | Cold damage, slow movement |

### 7.2 Check Interval

New weather rolled every 300 game seconds.

### 7.3 Season Probabilities

| Season | Rain | Drought | Windstorm | Clear |
|--------|------|---------|-----------|-------|
| Spring | 30% | 5% | 10% | 55% |
| Summer | 15% | 25% | 5% | 55% |
| Autumn | 20% | 10% | 20% | 50% |
| Winter | 5% | 15% | 15% | 65% |

Weather uses `scopedRNG("weather", worldSeed, nextCheckTime)`.

---

## 8. Growth System

### 8.1 Five Stages

| Stage | Name | Visual |
|-------|------|--------|
| 0 | Seed | Tiny mound (hardcoded geometry, ~20 verts) |
| 1 | Sprout | Small stem (hardcoded, ~30 verts) |
| 2 | Sapling | Species GLB at 0.5x scale |
| 3 | Mature | Species GLB at 1.0x scale, harvestable |
| 4 | Old Growth | Species GLB at 1.3x scale, frozen matrix |

### 8.2 Growth Formula

```
rate = 1 / baseTime
rate *= seasonMultiplier
rate *= (watered ? 1.5 : 1.0)
rate *= difficultyGrowthSpeedMult
rate *= weatherMultiplier
rate *= (fertilized ? 2.0 : 1.0)

progress += rate * deltaTime
if progress >= 1.0: advance stage, reset progress
```

### 8.3 Growth Animation

- Lerp-based scale interpolation (factor 3.0/sec, ease-out)
- Stage 0->1 and 1->2: geometry swap with scale continuity
- 6-10 green sparkle particles on stage-up
- Mobile haptic on stage transition

---

## 9. Species Catalog

15 species. Player starts with only White Oak. All others unlocked by finding
Grovekeepers in hedge labyrinths (see Section 17).

### 9.1 Species Table

| Species | ID | Biome | Evergreen | Special |
|---------|-----|-------|-----------|---------|
| White Oak | `white-oak` | Starting Grove | No | Starter species |
| Birch | `birch` | Starting Grove | No | Fast growth |
| Elm | `elm` | Meadow | No | Hardy |
| Weeping Willow | `weeping-willow` | Wetlands | No | +30% yield near water |
| Ash | `ash` | Wetlands | No | Sap producer |
| Maple | `maple` | Orchard Valley | No | Autumn 2x yield |
| Golden Apple | `golden-apple` | Orchard Valley | No | Fruit producer |
| Cedar | `cedar` | Rocky Highlands | Yes | Wind resistant |
| Elder Pine | `elder-pine` | Rocky Highlands | Yes | Grows in winter (0.3x) |
| Ironbark | `ironbark` | Ancient Forest | Yes | Timber + hardwood |
| Redwood | `redwood` | Ancient Forest | Yes | +1 acorn at Old Growth |
| Ghost Birch | `ghost-birch` | Frozen Peaks | No | Glows at night (emissive) |
| Crystal Oak | `crystal-oak` | Twilight Glade | Yes | Prismatic seasonal tints |
| Moonwood Ash | `moonwood-ash` | Twilight Glade | No | Nighttime growth bonus |
| Worldtree | `worldtree` | Special | Yes | 2x scale, can only plant ONE |

### 9.2 Harvest Yields

Each species yields 1-4 resource types. Yields modified by difficulty, season,
pruning, and structure bonuses. See unified design Section 5 for full table.

### 9.3 Grovekeeper Unlocks

| # | Grovekeeper | Species | Biome | Maze Size |
|---|------------|---------|-------|-----------|
| 1 | Birchmother | Birch | Starting Grove | 8x8 |
| 2 | Elmward | Elm | Meadow | 10x10 |
| 3 | Willowsong | Weeping Willow | Wetlands | 12x12 |
| 4 | Ashguard | Ash | Wetlands | 12x12 |
| 5 | Mapleseer | Maple | Orchard Valley | 12x12 |
| 6 | Goldenbough | Golden Apple | Orchard Valley | 12x12 |
| 7 | Cedarwarden | Cedar | Rocky Highlands | 14x14 |
| 8 | Ironroot | Ironbark | Ancient Forest | 14x14 |
| 9 | Redwoodancient | Redwood | Ancient Forest | 14x14 |
| 10 | Pineheart | Elder Pine | Rocky Highlands | 14x14 |
| 11 | Frostbark | Ghost Birch | Frozen Peaks | 16x16 |
| 12 | Crystalsoul | Crystal Oak | Twilight Glade | 16x16 |
| 13 | Moonkeeper | Moonwood Ash | Twilight Glade | 16x16 |
| 14 | Worldroot | Worldtree | Special | 20x20 |

---

## 10. Economy

### 10.1 Resources (12 types)

| Resource | Source | Scarcity |
|----------|--------|----------|
| Timber | Chop trees | Common |
| Stone | Mine rocks | Common |
| Ore | Mine rare veins | Uncommon |
| Sap | Harvest willows, birches | Uncommon |
| Fruit | Harvest fruit trees | Seasonal |
| Berries | Forage bushes | Common |
| Herbs | Forage herb variants | Uncommon |
| Meat | Hunt animals | Scarce |
| Hide | Hunt byproduct | Scarce |
| Fish | Fish at ponds | Moderate |
| Acorns | Harvest rare species | Rare |
| Seeds | Craft, quest, merchant | Varies |

Resources are integers. Lifetime totals tracked for achievements.

### 10.2 XP Formula

```
xpToNext(level) = 100 + max(0, (level - 2) * 50) + floor((level - 1) / 5) * 200
```

25 XP sources across core actions, economy, quests, NPCs, and discovery.

---

## 11. Tools

### 11.1 Starting + Craftable Tools

| Tool | Stamina | Action | How Obtained |
|------|---------|--------|-------------|
| Trowel | 5 | Plant, till | Starting gear |
| Watering Can | 3 | Water trees | Starting gear |
| Axe | 8 | Chop, harvest | Starting gear |
| Pruning Shears | 4 | Prune, shape | Level 3 |
| Shovel | 6 | Dig, clear | Level 5 |
| Pickaxe | 10 | Mine rocks | Craft (6 Timber + 4 Stone) |
| Fishing Rod | 4 | Fish at water | Craft (5 Timber + 3 String) |
| Hammer | 8 | Build/repair | Craft (8 Timber + 4 Stone) |

### 11.2 Tool Upgrade Tiers

| Tier | Damage | Speed | Durability | Requirement |
|------|--------|-------|------------|-------------|
| Basic | 1.0x | 1.0x | 50 uses | Starting / first craft |
| Iron | 1.5x | 1.25x | 150 uses | Forge + Iron Ingots |
| Grovekeeper | 2.0x | 1.5x | 500 uses | Forge + Grove Essence |

### 11.3 Tool Durability

- Standard use: 1 durability per use
- Wrong target: 3 per use (penalty)
- Exhausted use: 2 per use (stress)
- Repair at Forge: half original materials

Non-degrading: Watering Can, Almanac, Compass.

---

## 12. Stamina & Survival

### 12.1 Stamina

| Parameter | Value |
|-----------|-------|
| Max stamina | 100 |
| Regen rate | 2/second (modified by difficulty + hunger) |
| Exhaustion | Blocks at 0%, re-enables at 5% |

Visual: vertical bar, green (>50%), orange (25-50%), red (<25%).

### 12.2 Hunger

| Parameter | Value |
|-----------|-------|
| Max hunger | 100 |
| Drain rate | 1/min (difficulty-scaled: Seedling 0.5, Ironwood 2.0) |
| 0 hunger | No stamina regen + 0.25 hearts/min drain |
| Well Fed | >80 hunger: +10% stamina regen for 120s |

### 12.3 Hearts

3-7 max based on difficulty tier. Damage from exposure, starvation, storms,
maze enemies, night creatures. Healing from food, campfire rest, remedies,
dawn renewal (+1).

---

## 13. Harvest System

### 13.1 Harvest Flow

```
Tree reaches stage 3+ -> initHarvestable() sets cooldown timer
  -> Cooldown elapses -> tree.harvestable.ready = true
  -> Player uses axe -> collectHarvest()
    -> Species yields * pruned bonus * difficulty yieldMult * structure bonus
    -> Math.ceil() on fractional yields
    -> Resources added to store
    -> Tree entity removed
    -> XP awarded
```

### 13.2 Yield Modifiers

Pruning, difficulty multiplier, Flame Maple autumn bonus (2x), Willow water
adjacency (+30%), structure radius bonuses, prestige bonus.

---

## 14. Quest System

Three quest layers working together.

### 14.1 Main Quest: The Grovekeeper Path

Find all 14 dormant Grovekeepers in hedge labyrinths. Non-linear (any order
except Worldroot last). Compass hints guide toward undiscovered labyrinths.

### 14.2 World Quests (Seed-Variant Narrative)

8 templates with A/B/C dialogue variations per seed. Each spans 3-5 steps across
multiple chunks. See Section 30 for full spec.

### 14.3 Procedural Quests

65+ templates across 9 categories (gather, plant, explore, deliver, build,
discover, hunt, fish, craft). Generated by village NPCs from templates + seeded
context.

- Daily quests: 1-4 per day scaling by level
- Streak bonuses at 3/5/7/10/14 days
- Context-sensitive: templates pick nearby resources/species/locations
- Relationship-gated: better quests from higher-relationship NPCs
- Rewards scale with distance from origin

### 14.4 NPC Quest Chains

13 quest chains (8 existing + 5 new) driven by named NPCs:

| Chain | NPC | Theme |
|-------|-----|-------|
| rowan-history | Elder Rowan | Grove lore |
| hazel-trade | Hazel | Trading |
| fern-collection | Botanist Fern | Species research |
| blossom-seeds | Blossom | Seed discovery |
| bramble-weather | Bramble | Weather mastery |
| oakley-crafting | Oakley | Crafting |
| sage-lore | Sage | Ancient knowledge |
| dying-forest | Multiple | Main story |
| willow-remedies | Willow | Herbalism |
| thorn-trails | Thorn | Wilderness |
| ember-alchemy | Ember | Rare recipes |
| seasonal-cycle | Multiple | Seasonal events |
| ancient-grove | Multiple | Endgame |

---

## 15. Achievement System

45 achievements in 10 categories. Checked every ~5 seconds.

- 35 progressive tiers (planting, harvesting, resource collection, etc.)
- 5 new progressive tiers
- 5 secret achievements (Moonlit Grove, Perfect Symmetry, Storm Survivor, etc.)

Achievement popup: gold border, sparkle effect, auto-dismiss 3 seconds.

---

## 16. Progression & New Game+

### 16.1 Grovekeeper Progression (The Spine)

The 14 Grovekeepers ARE the progression spine. Each unlocks a species, expands
codex, and reveals lore. Finding all 14 = main quest completion.

### 16.2 Level 1-25 Unlocks

Every level has at least one meaningful unlock. Categories: tools, recipes,
structures, features, base building, abilities, HUD. Species unlocks come from
Grovekeepers, not levels. See unified design Section 9 for full table.

### 16.3 New Game+ (Post-14 Grovekeepers)

**Trigger:** Defeat Worldroot -> "You are now a Grovekeeper" achievement.

**Changes:**
- All 15 species permanently unlocked
- Base building mode activates (Fallout-style kitbashing)
- Base raids begin (defend settlements)
- Prestige cosmetics unlock (5 border themes)
- Difficulty escalation (enemies scale, weather more extreme)
- Labyrinths re-seal (re-runnable with harder variants)

**Carries over:** Achievements, cosmetics, codex, NPC relationships, blueprints.
**Resets:** Resources, map, labyrinths, tool upgrades.

### 16.4 Prestige Cosmetic Borders

| Prestige | Theme | Border Color |
|----------|-------|-------------|
| 1 | Stone Wall | #78909C |
| 2 | Ivy Trellis | #4CAF50 |
| 3 | Autumn Wreath | #FF9800 |
| 4 | Crystal Frame | #7C4DFF |
| 5 | Ancient Runes | #FFD700 |

---

## 17. Open World

### 17.1 Chunk-Based Infinite World

No fixed world size. No zone boundaries. No loading screens.

- **Chunk size:** 16x16 tiles
- **Active radius:** 3x3 chunks (48x48 visible tiles)
- **Buffer ring:** 5x5 chunks (pre-generated, not rendered)
- **Generation:** `generateChunk(worldSeed, chunkX, chunkZ)` -- pure function
- **Seamless:** terrain noise and biome blending use global coordinates

### 17.2 Delta-Only Persistence

Only store what the player CHANGED. Unmodified chunks regenerate from seed.

```typescript
interface ChunkDelta {
  plantedTrees: { tileX: number; tileZ: number; speciesId: string; stage: number }[];
  harvestedTrees: { tileX: number; tileZ: number }[];
  builtStructures: { tileX: number; tileZ: number; structureId: string }[];
  removedItems: { tileX: number; tileZ: number; itemType: string }[];
  npcRelationships: { npcId: string; relationship: number }[];
  completedQuests: string[];
}
```

### 17.3 Biomes (8 types)

| Biome | Temperature | Moisture | Exclusive Species |
|-------|------------|----------|-------------------|
| Starting Grove | 0.4-0.6 | 0.4-0.6 | White Oak, Birch |
| Meadow | 0.5-0.7 | 0.3-0.5 | Golden Apple, Elm |
| Ancient Forest | 0.3-0.5 | 0.6-0.8 | Redwood, Ironbark |
| Wetlands | 0.4-0.6 | 0.8-1.0 | Weeping Willow, Ash |
| Rocky Highlands | 0.2-0.4 | 0.1-0.3 | Cedar, Elder Pine |
| Orchard Valley | 0.6-0.8 | 0.5-0.7 | Golden Apple, Maple |
| Frozen Peaks | 0.0-0.2 | 0.2-0.5 | Ghost Birch |
| Twilight Glade | 0.3-0.5 | 0.5-0.7 | Crystal Oak, Worldtree |

Biome transitions blend over ~8 tiles. Starting Grove forced at (0,0) in 2-chunk
radius. Twilight Glade only 20+ chunks from origin.

### 17.3a Fixed Starting Village (AUTHORED — NOT PROCEDURAL)

**Design rationale:** The starting village is the player's critical first impression.
Procedural generation is powerful but unpredictable; the first 5 minutes must be
fully authored and controlled. Once the player departs the village, everything is
procedural. NPCs in the village naturally reference the unknown world around them:
*"Nobody knows what lies past the Thornwood..."* This contrast (safe/known village
vs. unknown world) is the game's central emotional arc.

**The starting village is named Rootmere.** This name is fixed — not seed-derived.
It references the grove's roots (thematic) and "mere" (a small woodland lake — cozy,
English countryside). It bookends with "The Worldroot's Dream" (the game's final
quest). Village name appears on the notice board, in dialogue, and on the minimap.

**Village layout is fixed at world origin (tile 8,8 within chunk 0,0):**

| Structure | Tile (relative to village center) | Source |
|-----------|----------------------------------|--------|
| Elder Rowan's Hut | (0, 0) | Fixed |
| Village Well | (3, 0) | Fixed |
| Campfire Ring | (-3, 2) | Fixed |
| Seed Merchant's Stall | (2, 3) | Fixed |
| Storage Shed | (-2, -3) | Fixed |
| Notice Board | (0, 3) | Fixed |
| Village Gate (toward world) | (0, -8) | Fixed |

**NPC spawn positions are fixed per village layout** (they then follow schedules).

**Terrain flattening:** `heightmap` values in the 14-tile radius around village
center are clamped to `baseFlatLevel` before terrain mesh is built. The perimeter
blends back to natural terrain over 4 tiles. This is applied in `terrainGenerator.ts`
when `chunkX === 0 && chunkZ === 0`.

**Procedural still applies:**
- Trees and bushes grow at the village perimeter (not inside the flat zone)
- The biome, ambient audio, weather, and time-of-day all apply normally
- NPC dialogue is seed-keyed (different seeds = different dialogue personalities)
- The rest of chunk (0,0) and all neighboring chunks are fully procedural

### 17.4 Discovery Cadence

| Feature Level | Frequency | Examples |
|--------------|-----------|---------|
| Micro | Every ~1 chunk | Trees, grass, rocks, bushes |
| Minor | Every ~3-4 chunks | NPC encounter, rock formation, campfire ring |
| Major | Every ~8-12 chunks | Village, pond/lake, ruined tower, merchant camp |
| Labyrinth | Every ~30-50 chunks | Grovekeeper hedge maze |

### 17.5 The Grovekeeper Labyrinths

14 hedge labyrinths scattered across the world. Each contains a dormant
Grovekeeper who unlocks a tree species when awakened.

- Seeded recursive backtracker on 8x8 to 20x20 grid
- Modular hedge GLBs (94 pieces) from 3DPSX pack
- Maze enemies: bats (corridor patrol), skeleton warrior (inner ring), thorny patches
- Center: fountain + columns + stone table + the Grovekeeper NPC
- Fog-of-war within maze, explored paths persist in delta
- Campfire at entrance for rest + fast travel

### 17.6 Map & Navigation

- Mini-map: explored chunks, biome colors, feature icons
- World map (full-screen): scrollable, fog-of-war
- Signposts at minor features point toward nearest major feature
- Compass: cardinal directions + home marker + nearest campfire
- Fast travel: campfire network, max 8 points

---

## 18. Structure System

### 18.1 Essential Structures

| Structure | Cost | Level | Effect |
|-----------|------|-------|--------|
| Campfire | 5 Stone + 5 Timber | Start | Heart regen, warmth, cooking, fast travel |
| Lean-to Shelter | 10 Timber | 2 | Sleep, weather protection |
| Windbreak Wall | 8 Timber + 4 Stone | 3 | Block wind in 3-tile radius |
| Storage Chest | 12 Timber + 2 Stone | 4 | Death-proof storage |
| Rain Collector | 6 Timber + 4 Stone | 5 | Water during drought |
| Herb Garden | 8 Timber + Herb seeds | 6 | Renewable herbs |
| Fishing Dock | 15 Timber + 5 Stone | 7 | +30% fishing yield |
| Forge | 20 Stone + 10 Ore + 15 Timber | 8 | Smelt, upgrade tools |
| Cooking Pot | 10 Stone + 5 Iron + 8 Timber | 12 | Advanced cooking |

### 18.2 Upgrade Chains

- **Growth:** Well (L6) -> Irrigation (L12) -> Sprinkler (L18)
- **Growth (alt):** Greenhouse (L10) -> Conservatory (L16) -> Biodome (L22)
- **Stamina:** Tool Shed (L5) -> Workshop (L11)
- **Harvest:** Market Stall (L8) -> Trading Post (L14) -> Grand Market (L20)

### 18.3 Structure Mechanics

- Effect stacking cap: +100% max per effect type
- Grid-snapped placement, no overlap
- Upgrades require Builder's Catalyst (craftable)
- 50% material refund from old structure on upgrade

### 18.4 Base Building (Progressive, L5+)

Fallout-style kitbashing with PSX asset pieces. Progressive unlocks:
- L5: Fences, basic walls
- L10: Stone walls, gates
- L15: Full kit (roofs, doors, windows, floors)
- L20: Decorative props, lighting
- NG+: Everything unlocked

### 18.5 Base Raids (NG+)

Settlements attract raids. Warning 1 day before. Corrupted creatures spawn at
chunk edges. Structures take damage. Loot: rare materials. Frequency scales with
base value and difficulty tier.

---

## 19. NPC System

### 19.1 Named NPCs (Fixed Starting Village)

| NPC | Role | Personality |
|-----|------|------------|
| Elder Rowan | Village elder | Wise, patient |
| Hazel | Wandering trader | Cheerful, haggling |
| Botanist Fern | Researcher | Curious, enthusiastic |
| Blossom | Seed merchant | Gentle, nurturing |
| Bramble | Weather watcher | Gruff, protective |
| Willow | Herbalist | Calm, mystical |
| Oakley | Carpenter | Practical, proud |
| Thorn | Forest ranger | Bold, adventurous |
| Sage | Lore keeper | Thoughtful, ancient |
| Ember | Alchemist | Eccentric, curious |

### 19.2 NPC Visuals (3DPSX ChibiCharacters)

- 7 base characters + 33 mix-and-match items
- Seeded appearance via `scopedRNG('npc-appearance', worldSeed, npcId)`
- Lego-style animation via anime.js (rigid body part rotation, no skeletal rigs)
- "pr" emission variants for night glow

### 19.3 Procedural NPCs

World-generated NPCs at villages, camps, encounters. Seeded appearance, name,
personality, dialogue pool, quest pool from location coordinates.

### 19.4 Relationship System

4 tiers: Stranger (0-9) / Acquaintance (10-29) / Friend (30-59) / Best Friend (60-100).
Gain from quests, trading, gifts. No decay. Better trade rates and exclusive
dialogue at higher tiers.

### 19.5 NPC Schedules

Dawn/Day/Dusk/Night locations per NPC. Night-active: Sage and Ember only.
NPC-to-NPC conversations: 6 pairs, 20% chance when idle + adjacent.

---

## 20. Trading System

### 20.1 Trade Routes (Circular, No Arbitrage)

```
Timber (10) -> Sap (5)       [2:1]
Sap (10)    -> Fruit (3)     [3.3:1]
Fruit (15)  -> Acorns (5)    [3:1]
Acorns (20) -> Timber (10)   [2:1]
```

Full loop loses ~90%. Expanded trades for survival resources (Stone, Fish, Herbs,
Meat, Hide, Iron Ingots).

### 20.2 Price Modifiers

```
effectiveRate = baseRate x seasonalModifier x supplyDemandMultiplier x marketEventModifier
```

Supply/demand: `multiplier = 1.0 + (buyVolume - sellVolume) / 100`, clamped [0.5, 2.5].

### 20.3 Market Events

6 events (Timber Boom, Sap Shortage, Fruit Festival, Acorn Rush, Merchant Holiday,
Rare Influx). 15% chance each after 10-day cooldown.

### 20.4 Traveling Merchant

Visits every 7-14 days. Stays 2 days at random village. 14 offer templates.
Quantity-limited per visit.

---

## 21. Discovery System

### 21.1 Species Codex

5 tiers per species: Unknown / Spotted / Studied / Harvested / Legendary.
Each tier reveals more info. Grovekeeper encounters auto-fill to "Studied."

### 21.2 Codex Milestones

9 completion milestones with rewards and titles. NG+ unlocks Legendary tier
(requires planting 100+ of a species across playthroughs).

---

## 22. Crafting & Forging

### 22.1 Recipe Table (28 Recipes, 4 Tiers)

- **Tier 1 (L1-5):** 7 recipes -- Wooden Plank, Simple Fertilizer, Seed Pouch, Basic Tonic, Bark Mulch, Fruit Preserve, Herbal Remedy
- **Tier 2 (L6-10):** 7 recipes -- Sturdy Plank, Growth Elixir, Weather Charm, Pruning Oil, Seed Bundle, Dewdrop Vial, Grove Lantern
- **Tier 3 (L11-18):** 9 recipes -- Compost Heap through Master Tonic
- **Tier 4 (L19-25):** 5 recipes -- Worldtree Sap, Eternal Fertilizer, Alchemist's Brew, Ancient Seed, Grove Blessing

See unified design Section 7 for full recipe table.

### 22.2 Forging

Forge (L8) required for smelting and advanced crafting.

| Recipe | Inputs | Output |
|--------|--------|--------|
| Iron Ingot | 3 Ore + 1 Timber | 1 Iron Ingot |
| Charcoal | 5 Timber | 2 Charcoal |
| Refined Stone | 4 Stone + 1 Charcoal | 2 Cut Stone |

### 22.3 Cooking

Raw food restores hunger with minimal healing. Cooking at campfire or Cooking Pot
(L12) produces meals with better stats.

5 campfire recipes + 5 Cooking Pot recipes. See unified design Section 7.3.

---

## 23. Input System

### 23.1 Mobile (Primary)

| Input | Handler | Action |
|-------|---------|--------|
| Virtual joystick (left) | `VirtualJoystick.tsx` | Player movement |
| Tap on target | Raycast | Select/interact |
| Action buttons (right) | `MobileActionButtons.tsx` | Tool action |

### 23.2 Desktop

| Input | Handler | Action |
|-------|---------|--------|
| WASD / arrows | `useInput` hook | Movement |
| Click | Raycast | Select/interact |
| 1-8 | `useInput` hook | Tool selection |
| Escape | `useInput` hook | Pause menu |

### 23.3 FPS Pivot (Planned)

Mouse look (desktop), swipe-to-look (mobile), raycast from camera center with
per-tool range and crosshair feedback.

---

## 24. HUD Layout

### 24.1 Mobile Portrait (Primary)

```
+------------------------------------------+
| [Resources] [Hearts] [XP] [Time] [Menu]  |  <- Top bar
| [Compass]                                 |
|                                           |
|          (3D Canvas)                      |
|     WeatherOverlay / FloatingParticles    |
|                                           |
|                  StaminaGauge (right)      |
|                  Hunger bar (right)        |
|                  ToolBelt (right, 4x2)     |
|                                           |
| Joystick (left)        ActionBtn (right)  |  <- Bottom bar
+------------------------------------------+
```

### 24.2 All touch targets >= 44px. All text >= 14px.

---

## 25. Onboarding System

**Status: REVISED 2026-03-07** — The 11-step overlay tutorial has been retired.
Onboarding is now handled entirely by the Elder Awakening starting quest chain.

### 25.1 Elder Awakening Quest (Starting Quest)

Onboarding is organic and quest-driven. No overlay modals, no scripted step
sequences. On `startNewGame()`, the `"elder-awakening"` quest chain is
automatically started and the player receives a toast: "Speak with the village
elder near the well."

**Quest chain: `elder-awakening`** (see `game/quests/data/questChains.json`)

| Step | Objective | Reward |
|------|-----------|--------|
| Find the Elder | Talk to Elder Rowan | 25 XP |
| Tend the Grove | Plant 1 tree | 25 XP |
| Into the Wild | Discover a hedge labyrinth | 50 XP + compass activated |

Action signals from `actionDispatcher.ts` (`action:plant`, `action:harvest`,
`action:water`) are forwarded to the quest engine via `ONBOARDING_SIGNAL_MAP`
in `game/systems/tutorial.ts`. No overlay UI is rendered.

### 25.2 Progressive Hints (20+)

One-time tips fired on first encounter with features. 30-second cooldown.
Triggers include: first night, first rain, first level-up, first hunger warning,
first species discovery, near labyrinth, first death, first village, and more.

---

## 26. Save and Persistence

### 26.1 Architecture

| Layer | Technology | Data |
|-------|-----------|------|
| Runtime | Legend State observables | All game state |
| Persistence | expo-sqlite | Auto-sync |
| Auto-save | `visibilitychange` event | Immediate on background |

### 26.2 Delta-Only Storage

Only modified chunks get delta entries. Exploring without interacting = zero
storage cost. Budget: <1 MB for 100 hours of play.

### 26.3 Offline Growth

On resume: calculate elapsed time, run simplified growth, update stages.
Display "Your trees grew while you were away!"

---

## 27. Audio

### 27.1 Tone.js (All Audio)

- PolySynth, FMSynth, NoiseSynth for procedural sounds
- Panner3D with HRTF for spatial audio
- Transport for musical scheduling
- ~150KB gzipped

### 27.2 Ambient Soundscape (6 Layers)

| Layer | Synthesis | Time |
|-------|----------|------|
| Wind | Brown noise, LPF 380Hz | Always |
| Birds | FM synth | Dawn/day |
| Insects | White noise, BPF 5200Hz | Day |
| Crickets | Pulse osc 2400Hz | Dusk/night |
| Water | Brown noise, LPF 240Hz | Near water |
| Vegetation | Pink noise, BPF 620Hz | Near plants |

### 27.3 Audio Assets

Supplementary retro SFX and ambient files from `/Volumes/home/assets/Audio/`.

---

## 28. Visual Identity

### 28.1 PSX Aesthetic

| Rule | Implementation |
|------|---------------|
| No antialiasing | `gl={{ antialias: false }}` |
| Pixel ratio 1 | `gl={{ pixelRatio: 1 }}` |
| Flat shading | `flatShading: true` on all materials |
| Nearest filter | `NearestFilter` on textures |
| Low segments | Cylinders: 6, Spheres: icosahedron detail 1 |

### 28.2 Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Forest Green | #2D5A27 | Primary brand, buttons |
| Bark Brown | #5D4037 | Trunks, frames |
| Soil Dark | #3E2723 | Backgrounds, text |
| Leaf Light | #81C784 | Highlights, success |
| Sky Mist | #E8F5E9 | Light backgrounds |
| Autumn Gold | #FFB74D | Tutorial ring, achievements |

### 28.3 Typography

Headings: Fredoka (500/700). Body: Nunito (400/600/700).

### 28.4 GLB Models (3DPSX)

The visual foundation. PSX-native models with pixel-art textures.

| Category | Count | Source |
|----------|-------|--------|
| Trees | 14 | 3DPSX Retro Nature |
| NPCs | 7 base + 33 items | 3DPSX ChibiCharacters |
| Farm structures | 85 | 3DPSX Farm Assets |
| Seasonal bushes | 262 | 3DPSX All Bushes |
| Fences | 79 | 3DPSX Fences |
| Tools | 5 | 3DPSX PSX Tools |
| Modular structures | ~210 | PSX Mega Pack II |
| Survival props | ~137 | PSX Mega Pack II |

---

## 29. Seeded RNG

### 29.1 PRNG

Mulberry32 (32-bit). Implementation in `game/utils/seedRNG.ts`.

### 29.2 Scoped Usage

| Scope | Used For |
|-------|----------|
| `terrain` | Terrain heightmap per chunk |
| `vegetation` | Vegetation placement |
| `npc-appearance` | NPC appearance assembly |
| `npc` | NPC spawning at features |
| `weather` | Weather event rolls |
| `quests` | Quest generation |
| `world-quest` | World quest variant selection |
| `labyrinth` | Maze layout generation |
| `grovekeeper-dialogue` | Dialogue variant selection |
| `feature-major` | Major feature placement |
| `feature-minor` | Minor feature placement |
| `base-raid` | Raid event generation |
| `cooking` | Cooking outcomes |
| `spirit` | Spirit emissive color, bob/pulse phase |
| `dialogue-branch` | Default branch selection in dialogue trees |
| `quest-branch` | Quest chain branch path selection |
| `village` | Village layout, building placement, NPC population |
| `particle` | Particle spawn positions, velocities |
| `fish` | Fish species selection per cast |

---

## 30. World Quest Narrative System

8 world quest templates with A/B/C variant slots. Each seed activates all 8 but
they unlock progressively as the player explores farther from origin.

| # | Quest | Unlock Distance | Involved NPCs |
|---|-------|----------------|---------------|
| 1 | The Withered Road | 5 chunks | Bramble / Fern / Rowan |
| 2 | The Lost Village | 8 chunks | Hazel / Willow / Sage |
| 3 | The Merchant's Burden | 12 chunks | Hazel / Thorn / Oakley |
| 4 | The Keeper's Memory | 15 chunks | Sage / Willow / Rowan |
| 5 | The Singing Stones | 20 chunks | Ember / Sage / Fern |
| 6 | The Frozen Garden | 25 chunks | Bramble / Willow / Oakley |
| 7 | The Wanderer's Journal | 35 chunks | Sage / Thorn / Hazel |
| 8 | The Worldroot's Dream | 50 chunks + 8 Grovekeepers | All |

Each template has 6 variant slots x 3 options = 729 combinations per template.
8 templates x 729 = 5,832 distinct world quest experiences.

Dialogue follows 4-phase structure: Greeting -> Topic Selection -> Dialogue Tree
-> Farewell. See unified design Section 16 for full quest details.

---

## 31. Procedural Terrain & Water

All procedural entities are ECS entities with the same query pattern as GLB model entities.
Config: `config/game/procedural.json`. Components: `game/ecs/components/procedural/`.

### 31.1 Terrain Generation

- **ChunkManager** loads 3x3 active, 5x5 buffer ring around player
- **Heightmap**: `AdvancedSeededNoise` (Perlin + fBm + ridged multifractal + domain warping)
- **Biome**: temperature + moisture noise → 8 biomes (forest, meadow, desert, swamp, tundra, mountains, beach, volcanic)
- **Blending**: smooth 8-tile transition at biome boundaries via `biomeBlend` weights
- **Vertex colors**: biome-derived base color applied to terrain mesh
- **Rapier collider**: trimesh per terrain chunk for physics
- **Paths**: spline-carved trails between landmarks (`PathSegmentComponent`)
- ECS: `TerrainChunkComponent` (heightmap, baseColor, biomeBlend, dirty flag)

### 31.2 Gerstner Wave Water

Full Gerstner wave implementation per the Grok doc. Each water body is an ECS entity.

| Water Type | Wave Layers | Foam | Caustics | Flow |
|-----------|-------------|------|----------|------|
| Ocean | 4 (high amplitude) | Yes (steepness) | No | No |
| River | 2 + flow direction | Yes (edge) | Yes | Yes (flowDirection + flowSpeed) |
| Pond | 2 (low amplitude) | No | Yes | No |
| Stream | 1-2 + fast flow | No | Yes | Yes |
| Waterfall | N/A (particle) | Splash at base | No | Downward |

**Gerstner vertex displacement** (per wave layer):
```
P' = P + sum_i [ D_i * (steepness_i * amplitude_i) * cos(dot(D_i, P.xz) * (2pi/wavelength_i) + time * speed_i) ]
P'.y += sum_i [ amplitude_i * sin(dot(D_i, P.xz) * (2pi/wavelength_i) + time * speed_i) ]
```

**Foam**: appears where wave steepness > `foamThreshold` (default 0.6). White overlay.
**Caustics**: animated pattern projected on terrain below water surface. Scale 0.5, speed 0.8.
**Splash particles**: 12 particles on player water entry, lifetime 0.8s.

ECS: `WaterBodyComponent` (waveLayers[], color, opacity, size, foam, caustics, flow)

### 31.3 Sky & Day/Night

- **SkyComponent**: 8-stop gradient, sun/moon position, star intensity, cloud coverage
- **DayNightComponent**: game hour (0-24), time-of-day label, season, ambient/directional light
- Day length: 600 seconds (10 real minutes = 1 game day)
- 8 time slots: dawn, morning, noon, afternoon, dusk, evening, night, midnight
- Ambient light color + intensity shifts per time slot
- Shadow opacity fades at dawn/dusk, zero at night
- Moon phases: 8-phase cycle (one phase per game day)

### 31.4 Weather & Fog

- **WeatherComponent**: type, intensity, wind direction/speed, duration, gameplay impact flag
- Weather types: clear, rain, snow, fog, windstorm, thunderstorm
- Fog volumes: `FogVolumeComponent` entities placed in swamps, valleys, caves
- Thunderstorm: lightning flash (directional light pulse) + delayed thunder audio (4-12s interval)
- In Survival mode: weather affects stamina, growth, heart drain
- In Exploration mode: weather is visual/audio only

---

## 32. Grovekeeper Spirits

Navi-style floating emissive orbs found at the center of each hedge maze.
Each spirit is a procedural ECS entity (no GLB model — shader sphere).

### 32.1 Visual Design

- **Shape**: IcosahedronGeometry (low-poly sphere, PSX aesthetic)
- **Material**: MeshStandardMaterial with emissive color, no texture
- **Emissive color**: unique per spirit, seeded from `scopedRNG("spirit", worldSeed, mazeIndex)`
- **Color palette**: warm greens, teals, golds, soft violets — grove-aligned, never harsh
- **Emissive intensity**: pulses via sine wave (slightly out of phase with bob)
- **Size**: orbRadius 0.15-0.25 world units
- **Trail**: particle emitter matching emissive color at lower opacity

### 32.2 Animation

- **Spawn**: rises from hedge maze floor when player enters maze center area
  - `spawnProgress` lerps 0→1 over 2 seconds
  - Y position = `spawnProgress * hoverHeight` (hoverHeight ~1.5 units)
  - Emissive intensity fades in during spawn
- **Idle bob**: `y = hoverHeight + bobAmplitude * sin(time * bobSpeed + bobPhase)`
  - bobAmplitude: 0.15-0.25 units, bobSpeed: 1.5-2.5 rad/s
  - Each spirit has seeded bobPhase for desync
- **Pulse**: emissiveIntensity = `base + 0.3 * sin(time * pulseSpeed + pulsePhase)`

### 32.3 Narrative Role

- 8 spirits total (one per hedge maze, matching the 8 world quests)
- Each spirit has a `dialogueTreeId` linking to the dialogue branching system
- Discovering all 8 spirits unlocks the final world quest ("The Worldroot's Dream")
- Spirit dialogue reveals grove lore and guides the player toward quest objectives
- Player must physically reach the maze center and approach within interaction radius

### 32.4 Scope

| Scope Key | Extra | Used For |
|-----------|-------|----------|
| `spirit` | `[mazeIndex]` | Emissive color, bob phase, pulse phase |
| `grovekeeper-dialogue` | `[spiritId, nodeIndex]` | Dialogue branch selection |

ECS: `GrovekeeperSpiritComponent` in `game/ecs/components/procedural/spirits.ts`
Query: `grovekeeperSpiritsQuery` in `world.ts`

---

## 33. Dialogue Branching System

A unified dialogue system serving both NPCs and Grovekeeper spirits. Dialogue
displays as floating speech bubbles above entities. Branch choices create
seed-deterministic unique quest paths.

### 33.1 Dialogue Trees

Each dialogue tree is a directed graph of nodes with branch choices.

```
DialogueTree {
  treeId: string
  entryNodeId: string
  nodes: DialogueNode[]     // all nodes in tree
  maxDepth: number          // for path counting
}

DialogueNode {
  nodeId: string
  speaker: string           // NPC name or spirit ID
  text: string              // displayed in speech bubble
  branches: DialogueBranch[]  // A/B/C choices (empty = terminal)
  conditions?: DialogueCondition[]
  effects?: DialogueEffect[]
}

DialogueBranch {
  label: string             // choice text shown to player
  targetNodeId: string
  seedBias: number          // 0-1, weight for seed selection
  conditions?: DialogueCondition[]
}
```

### 33.2 Seed-Keyed Branch Selection

When a dialogue node has multiple branches, the "default" path is selected by:

```typescript
const rng = scopedRNG("grovekeeper-dialogue", worldSeed, entityId, nodeIndex);
const roll = rng();
// Normalize seedBias weights, select branch by cumulative probability
```

This means **each world seed produces a deterministic unique path** through every
dialogue tree. The player can still manually choose different branches, but the
"natural" path (for NPCs who auto-advance, or for quest-critical spirits) is
always seed-determined.

### 33.3 Branching Math

With B branch options per node and D depth levels per tree:
- **Paths per tree**: B^D
- **Total unique experiences**: product of all trees' B^D values

Current design: 8 spirit trees + 10 NPC trees = 18 dialogue trees.
Average B=3, D=4 → 3^4 = 81 paths per tree.
18 trees → theoretical max 81^18 ≈ 10^34 unique combinations.

**Practical uniqueness**: Since seed selects one path per tree deterministically,
each seed maps to exactly one of 81^18 total experiences. Two different seeds have
a vanishingly small chance of producing the same overall narrative.

### 33.4 Conditions & Effects

**Conditions** gate branches: `has_item`, `has_level`, `quest_complete`, `season`,
`time_of_day`, `spirit_discovered`. Negatable.

**Effects** trigger on node display: `give_item`, `give_xp`, `start_quest`,
`advance_quest`, `unlock_species`, `unlock_recipe`, `set_relationship`, `reveal_location`.

### 33.5 Speech Bubble Rendering

- World-space billboarded quad above entity position
- Text rendered with Fredoka font at readable size
- Branch choices shown as tappable buttons below text (44px touch targets)
- Auto-advance after 3s if no player input (uses seed-selected branch)
- Bubble fades in/out with 0.3s animation

ECS: `DialogueComponent`, `QuestBranchComponent` in `game/ecs/components/dialogue.ts`
Config: `config/game/dialogues.json` (trees), `config/game/quests.json` (chains)

---

## 34. Combat System

Combat uses Rapier physics for collision and the ECS for state management.
Active throughout the open world, hedge mazes, and night raids. Survival mode
only (Sapling/Hardwood/Ironwood) for lethal damage. Seedling difficulty has no
enemies. See §41 for the confirmed design decision.

### 34.1 Enemies

Spawned from biome templates. Config: `config/game/enemies.json`.
Models: `assets/models/enemies/` (3DPSX GLBs, all rigged with armatures).

| Enemy | Key | Biomes | Behavior | Tier | HP | Damage | Night Only |
|-------|-----|--------|----------|------|----|--------|------------|
| Bat | bat | forest, labyrinth | swarm | 1 | 8 | 3 | yes |
| Thorn Sprite | thorn-sprite | forest, meadow | patrol | 1 | 3 | 1 | no |
| Killer Pig | killer-pig | meadow, wetlands, forest | patrol | 1 | 12 | 4 | no |
| Abomination | abomination | ruins, wetlands | ambush | 1 | 15 | 5 | no |
| Elk Demon | elk-demon | forest, wetlands, meadow | patrol | 2 | 30 | 7 | no |
| Green Goliath | green-goliath | forest, meadow | guard | 2 | 40 | 9 | no |
| Bigfoot | bigfoot | forest, frozen-peaks | patrol | 2 | 35 | 8 | no |
| Plague Doctor | plague-doctor | wetlands, ruins | patrol | 2 | 28 | 6 | no |
| Skeleton Warrior | skeleton-warrior | labyrinth, ruins | guard | 2 | 25 | 8 | no |
| Knight | knight | ruins, labyrinth | patrol | 3 | 50 | 12 | no |
| Werewolf | werewolf | forest, frozen-peaks | patrol | 3 | 45 | 11 | yes |
| Cyclops | cyclops | rocky-highlands, ruins | guard | 3 | 55 | 13 | no |
| Blood Wraith | blood-wraith | labyrinth, ruins | swarm | 3 | 35 | 10 | yes |
| Devil | devil | labyrinth | guard | 5 | 120 | 20 | no |
| Corrupted Hedge | corrupted-hedge | labyrinth | ambush | 4 | 15 | 5 | no |

AI behaviors: patrol (wander path), guard (defend area), swarm (group aggro),
ambush (hide + surprise). Config-driven speeds, ranges, and aggro radius in
`config/game/enemies.json`.

### 34.2 Combat Mechanics

- Tool-based melee: axe deals chop damage, pick deals pierce, watering can has no combat use
- Raycast hit detection from FPS camera
- Damage = tool.effectPower × difficulty.damageMultiplier
- Enemy knockback on hit (Rapier impulse)
- Player damage = enemy.damage × difficulty.incomingDamageMultiplier
- Loot drops on death (LootDropComponent, despawn timer)
- Random encounters trigger when player enters a chunk containing spawned enemies and proximity ≤ aggroRange
- Enemy tier scales with chunk distance from world origin: `tier = Math.min(5, Math.floor(chunkDistance / 8) + 1)`
- Night multiplies enemy spawn chance by 1.5×
- Difficulty gating: Seedling — no enemies; Sapling/Hardwood/Ironwood — enemies active with scaling damage and counts per `config/game/difficulty.json`

### 34.3 Loot

Loot tables in `config/game/loot.json`. All 15 enemy types have loot table entries.
Resource categories: timber, sap, hide, meat, herbs, fiber, acorns, seeds, metal_scrap, ore.
Seeded rolls from `scopedRNG("loot", worldSeed, enemyId)`.

ECS: `EnemyComponent`, `HealthComponent`, `CombatComponent`, `LootDropComponent`
Config: `config/game/enemies.json`, `config/game/loot.json`

---

## 35. Base Building (Kitbashing) — SUPERSEDED BY §43

> **Note:** GLB-based kitbashing is replaced by the procedural building system (§43).
> Player-placed structures use the same blueprint-driven procedural geometry.
> The snap system (§35.1) is preserved; piece categories become procedural box blueprints.

~~Fallout-style modular building using 549 PSX Mega Pack II GLBs.~~

### 35.1 Snap System

- Each `ModularPieceComponent` defines snap points with direction (N/S/E/W/up/down)
- Placement validates: matching directions, clearance check, ground contact
- Coarse grid snapping (1.0 unit intervals)
- Rotation in 90-degree increments

### 35.2 Piece Categories

| Category | Examples | Unlock Level |
|----------|---------|-------------|
| Foundation | Floors, platforms | 1 |
| Walls | Solid, window, door frame | 3 |
| Roofs | Flat, sloped, peaked | 5 |
| Doors | Wooden, metal, gate | 3 |
| Stairs | Straight, spiral | 8 |
| Decorations | Lights, signs, shelves | 10 |
| Advanced | Turrets, reinforced | 16 |

### 35.3 Base Value

`baseValue = sum(piece.tier × piece.material.multiplier)` across all placed pieces.
Higher base value increases raid probability (§34) but also increases available
defenses and prestige rewards.

### 35.4 Build UI

- Radial menu: category → piece selection
- Ghost preview: translucent mesh at snap position
- Color coding: green (valid), red (invalid/collision)
- Build cost display with resource availability check
- Resource deduction on placement

ECS: `ModularPieceComponent`, `BuildableComponent`, `LightSourceComponent`
Config: `config/game/building.json`, `config/game/megapackAssets.json`

---

## 36. Particle Systems

All particles use instanced billboard quads via `ParticleEmitterComponent` entities.
Config: `config/game/procedural.json` (particles section).

### 36.1 Particle Types

| Type | Trigger | Gravity | Wind | Budget |
|------|---------|---------|------|--------|
| Rain | Weather rain | 1.0 | Yes | 500 |
| Snow | Weather snow | 0.3 | Yes | 300 |
| Leaves | Autumn + wind | 0.2 | Yes | 50 |
| Pollen | Spring/summer meadow | -0.02 | Yes | 40 |
| Fireflies | Night near water | -0.1 | No | 30 |
| Sparks | Campfire, forging | -0.8 | No | 15 |
| Smoke | Campfire | -0.5 | Yes | 25 |
| Dust | Dry biomes, windstorm | 0.1 | Yes | 100 |
| Splash | Water entry, waterfall | 0.5 | No | 30 |
| Bubbles | Underwater | -0.3 | No | 20 |

### 36.2 Performance Budget

Total active particles across all emitters must stay under 800 on mobile.
Each emitter has `maxParticles` cap. System prioritizes nearest emitters to camera.

ECS: `ParticleEmitterComponent` in `game/ecs/components/procedural/particles.ts`

---

## 37. Game Modes

Replaces old difficulty-only system. Minecraft-inspired mode selection.

### 37.1 Exploration Mode

- No hearts, no hunger, no stamina drain
- Weather is visual/audio only (no gameplay effects)
- Free building (no resource cost)
- Enemies passive (can still interact but won't attack)
- Perfect for: casual play, building, photography, relaxation

### 37.2 Survival Mode

Full survival mechanics with sub-difficulties:

| Sub-difficulty | Hearts | Hunger | Weather Impact | Permadeath |
|---------------|--------|--------|---------------|------------|
| Gentle | 7 | 0.5/min | Light | No |
| Standard | 5 | 1.0/min | Full | No |
| Harsh | 4 | 1.5/min | Severe | Optional |
| Ironwood | 3 | 2.0/min | Extreme | Forced |

All multipliers in `config/game/difficulty.json`. Systems check
`weather.affectsGameplay` flag (set by game mode at start).

---

## 38. ECS Component Architecture

All game entities use Miniplex 2.x with a unified `Entity` type.
Components are organized into domain-specific files under `game/ecs/components/`.

### 38.1 Component Files

| File | Components | Domain |
|------|-----------|--------|
| `core.ts` | Position, Renderable, PlayerComponent, ChunkComponent, Harvestable | Spatial + player |
| `npc.ts` | NpcComponent (merged: appearance + personality + animation) | NPCs |
| `combat.ts` | EnemyComponent, HealthComponent, CombatComponent, LootDropComponent | Combat |
| `building.ts` | ModularPieceComponent, BuildableComponent, LightSourceComponent | Base building |
| `structures.ts` | StructureComponent, CampfireComponent, CropComponent | Farm structures |
| `items.ts` | FoodComponent, ToolComponent, TrapComponent | Items |
| `vegetation.ts` | TreeComponent, BushComponent, GrassComponent | Vegetation |
| `terrain.ts` | FenceComponent, RockComponent, HedgeComponent, HedgeDecorationComponent | Terrain |
| `procedural/terrain.ts` | TerrainChunkComponent, PathSegmentComponent | Proc. terrain |
| `procedural/water.ts` | WaterBodyComponent, GerstnerWaveLayer | Proc. water |
| `procedural/atmosphere.ts` | SkyComponent, DayNightComponent, WeatherComponent, FogVolumeComponent | Proc. atmosphere |
| `procedural/particles.ts` | ParticleEmitterComponent | Proc. particles |
| `procedural/spirits.ts` | GrovekeeperSpiritComponent | Proc. spirits |
| `procedural/audio.ts` | AmbientZoneComponent | Proc. audio |
| `dialogue.ts` | DialogueComponent, QuestBranchComponent, DialogueTree, DialogueNode | Dialogue |

### 38.2 Query Pattern

All entities — model-based AND procedural — use the same `world.with()` query:

```typescript
// Model entities
const treesQuery = world.with("tree", "position", "renderable");
const npcsQuery = world.with("npc", "position", "renderable");

// Procedural entities (same pattern)
const waterBodiesQuery = world.with("waterBody", "position");
const particleEmittersQuery = world.with("particleEmitter", "position");
const spiritsQuery = world.with("grovekeeperSpirit", "position");

// Singletons (no position needed)
const skyQuery = world.with("sky");
const weatherQuery = world.with("weather");
```

The rendering pipeline queries entities uniformly regardless of whether they're
backed by GLB models or procedural shaders/particles.

### 38.3 Config-Driven Values

ALL tuning constants live in `config/game/*.json`. Systems load config at init.
No inline magic numbers. Enforced by `.claude/hooks/no-magic-numbers.sh`.

---

## 39. Implementation Status

**Last audited: 2026-03-08** — 4,071 tests passing (12 failing across 3 suites) in 176 total suites. 178 test files.
All systems in `game/systems/` (98 non-test .ts files across flat files + subdirectories) have corresponding test files.

### 39.1 System Wiring Status

Systems wired to the game loop (`useGameLoop`) and/or mounted UI:

| System | File | Tests | Wired to Loop | Wired to UI |
|--------|------|-------|---------------|-------------|
| Growth (§8) | `game/systems/growth.ts` | YES | YES (tickGrowth) | Via ProceduralTrees |
| Crop Growth (§8) | `game/systems/cropGrowth.ts` | YES | YES (tickGrowth) | Via ProceduralTrees |
| Weather (§7) | `game/systems/weather.ts` | YES | YES (useGameLoop) | Via HUD time display |
| Time (§5) | `game/systems/time.ts` | YES | YES (useGameLoop) | Via HUD time display |
| Day/Night (§31.3) | `game/systems/dayNight.ts` | YES | YES (syncDayNight) | Via Lighting + Sky |
| Stamina (§12) | `game/systems/stamina.ts` | YES | YES (useGameLoop) | Via HUD (crosshair ring) |
| Survival (§12) | `game/systems/survival.ts` | YES | YES (tickSurvival) | Via HUD hearts + store |
| Harvest (§13) | `game/systems/harvest.ts` | YES | YES (harvestCooldownTick) | Via useInteraction |
| Achievements (§15) | `game/systems/achievements/` | YES | YES (tickAchievements) | PauseMenu (list only) |
| Prestige (§16) | `game/systems/prestige.ts` | YES | Via store | PauseMenu |
| Pathfinding (§19) | `game/systems/pathfinding.ts` | YES | YES (NPC AI) | Via NPC movement |
| NPC Movement (§19) | `game/systems/npcMovement.ts` | YES | YES (useGameLoop) | Via ChibiNpcScene |
| NPC Animation (§19) | `game/systems/npcAnimation.ts` | YES | YES (useGameLoop) | Via ChibiNpcScene |
| NPC Schedule (§19) | `game/systems/npcSchedule.ts` | YES | YES (tickNpcSchedules) | Via NPC movement |
| NPC Relationship (§19) | `game/systems/npcRelationship.ts` | YES | Via store | NO dedicated UI |
| Path Following (§19) | `game/systems/pathFollowing.ts` | YES | Via NPC movement | Via ChibiNpcScene |
| Combat (§34, §41) | `game/systems/combat.ts` | YES | YES (tickInvulnFrames, tickAttackCooldown) | Via ProceduralEnemies |
| Enemy AI (§34) | `game/systems/enemyAI.ts` | YES | YES (EnemyEntityManager.updateAll) | Via ProceduralEnemies |
| Enemy Spawning (§34) | `game/systems/enemySpawning.ts` | YES | Via ChunkManager | Via ProceduralEnemies |
| Trading (§20) | `game/systems/trading.ts` | YES | Via store | TradeDialog |
| Market Events (§20) | `game/systems/marketEvents.ts` | YES | Via store events | Via store |
| Supply/Demand (§20) | `game/systems/supplyDemand.ts` | YES | Via store | Via store |
| Grid Expansion (§17) | `game/systems/gridExpansion.ts` | YES | Via store | PauseMenu |
| Level Unlocks (§16) | `game/systems/levelUnlocks.ts` | YES | Via store | Via store |
| Offline Growth (§26) | `game/systems/offlineGrowth.ts` | YES | Via store init | Via store |
| Wild Tree Regrowth (§17) | `game/systems/wildTreeRegrowth.ts` | YES | YES (useGameLoop) | Via ProceduralTrees |
| Death/Respawn (§12.5) | `game/systems/deathRespawn.ts` | YES | YES (tickSurvival) | DeathScreen / PermadeathScreen |
| Tutorial (§25) | `game/systems/tutorial.ts` | YES | YES (advanceTutorial) | TutorialOverlay |
| Ambient Audio (§27) | `game/systems/ambientAudio.ts` | YES | YES (tickAmbientAudio) | Audio output |
| Tone Layer Factory (§27) | `game/systems/toneLayerFactory.ts` | YES | Via ambientAudio | Audio output |
| Audio Manager (§27) | `game/systems/AudioManager.ts` | YES | Via first gesture | Audio output |
| Water Particles (§36) | `game/systems/waterParticles.ts` | YES | YES (tickWaterParticles) | Via ECS particles |
| Haptics (§23) | `game/systems/haptics.ts` | YES | Via actions | Device haptics |
| Dialogue Branch (§33) | `game/systems/dialogueBranch.ts` | YES | Via dialogueBridge | NpcDialogue |
| Dialogue Effects (§33) | `game/systems/dialogueEffects.ts` | YES | Via dialogueBridge | NpcDialogue |
| Dialogue Loader (§33) | `game/systems/dialogueLoader.ts` | YES | Via dialogueBridge | NpcDialogue |
| Building Geometry (§42, §43) | `game/systems/buildingGeometry/` | YES | Via ProceduralTown | ProceduralBuilding |
| Hedge Geometry (§17) | `game/systems/hedgeGeometry.ts` | YES | Via ChunkManager | ProceduralHedgeMaze |
| Hedge Placement (§17) | `game/systems/hedgePlacement/` | YES | Via ChunkManager | ProceduralHedgeMaze |
| Vegetation Placement (§17) | `game/systems/vegetationPlacement.ts` | YES | Via ChunkManager | ProceduralBushes + ProceduralGrass |
| Structure Placement (§18) | `game/systems/structurePlacement.ts` | YES | Via ChunkManager | ProceduralProps |
| Kitbashing (§43) | `game/systems/kitbashing/` | YES | Via ProceduralTown | ProceduralBuilding |
| Save/Load (§26) | `game/systems/saveLoad.ts` | YES | Via usePersistence | Via store |
| Cooking (§22) | `game/systems/cooking.ts` | YES | Via actionDispatcher | CookingPanel (MOUNTED) |
| Forging (§22) | `game/systems/forging.ts` | YES | Via actionDispatcher | ForgingPanel (MOUNTED) |
| Fishing (§22) | `game/systems/fishing.ts` | YES | Via actionDispatcher | Via store |
| Mining (§22) | `game/systems/mining.ts` | YES | Via actionDispatcher | Via store |
| Traps (§22) | `game/systems/traps.ts` | YES | Via actionDispatcher | Via store |
| Tool Upgrades (§11) | `game/systems/toolUpgrades.ts` | YES | Via store + ForgingPanel | ForgingPanel (MOUNTED) |
| Fast Travel (§17) | `game/systems/fastTravel.ts` | YES | Via store | FastTravelMenu (NOT MOUNTED) |
| Species Discovery (§21) | `game/systems/speciesDiscovery.ts` | YES | Via store | NO codex UI |
| Traveling Merchant (§20) | `game/systems/travelingMerchant/` | YES | Via store (questState, core, progression) | Via store |
| Tree Scale (§42) | `game/systems/treeScaleSystem.ts` | YES | NOT WIRED | NOT WIRED |

Orphaned systems (tested but not imported by any non-test code):

| System | File | Tests | Status |
|--------|------|-------|--------|
| Recipes (§22) | `game/systems/recipes/` | YES | NOT IMPORTED by any non-test code |
| Seasonal Market (§20) | `game/systems/seasonalMarket.ts` | YES | NOT IMPORTED by any non-test code |
| Discovery (§21) | `game/systems/discovery.ts` | YES | NOT IMPORTED (speciesDiscovery.ts is the active system) |
| Seasonal Effects (§6) | `game/systems/seasonalEffects.ts` | YES | NOT IMPORTED by any non-test code |
| Base Raids (§35) | `game/systems/baseRaids.ts` | YES | NOT IMPORTED by any non-test code |
| Spatial Hash (§17) | `game/systems/spatialHash.ts` | YES | NOT IMPORTED by any non-test code |
| Zone Bonuses (§17) | `game/systems/zoneBonuses.ts` | YES | NOT IMPORTED by any non-test code |
| Grid Generation (§17) | `game/systems/gridGeneration.ts` | YES | NOT IMPORTED by any non-test code (legacy) |
| Loot System (§41.2) | `game/systems/lootSystem.ts` | YES | NOT IMPORTED by any non-test code |
| Audio Engine (§27) | `game/systems/audioEngine.ts` | YES | IMPORTED by AudioManager.ts (internal dependency, not directly orphaned) |
| Native Audio Manager (§27) | `game/systems/NativeAudioManager.ts` | YES | NOT IMPORTED by any non-test code |
| Weather Particles (§36) | `game/systems/weatherParticles.ts` | YES | NOT IMPORTED by any non-test code |
| Ambient Particles (§36) | `game/systems/ambientParticles.ts` | YES | NOT IMPORTED by any non-test code |

### 39.2 ECS Foundation (Complete)

| System | File | Tests |
|--------|------|-------|
| Procedural components | `game/ecs/components/procedural/` (6 files + barrel) | YES |
| Dialogue components | `game/ecs/components/dialogue.ts` | Via dialogueBridge |
| Core components | `game/ecs/components/core.ts` | Via world tests |
| NPC components | `game/ecs/components/npc.ts` (merged: appearance+personality+anim) | Via NpcManager |
| Combat components | `game/ecs/components/combat.ts` | Via enemySpawning |
| Building components | `game/ecs/components/building.ts` | Via kitbashing |
| Vegetation components | `game/ecs/components/vegetation.ts` | Via vegetationPlacement |
| Terrain components | `game/ecs/components/terrain.ts` (fences, hedges) | Via hedgePlacement |
| Structure components | `game/ecs/components/structures.ts` | Via structurePlacement |
| Item components | `game/ecs/components/items.ts` | Via actionDispatcher |
| World queries | `game/ecs/world.ts` — 40+ queries, all entity types | Implicit |

### 39.3 Remaining Gaps (audited 2026-03-08)

Previous gap list (2026-03-07) had 10 items. Status of each:

1. ~~MainMenu -> Game skips NewGameModal~~ **RESOLVED.** `app/index.tsx` mounts `NewGameModal`, wires seed phrase + difficulty + permadeath to store via `startNewGame()`.
2. ~~Difficulty multipliers not consumed~~ **RESOLVED.** `useGameLoop` calls `getDifficultyById()` every frame, passes multipliers to growth, stamina, survival. Integration tests in `difficultyMultipliers.test.ts`.
3. ~~Math.random() violations in 5 files~~ **RESOLVED.** Only 1 occurrence remains in `saveLoad.test.ts` (test mock, acceptable). Comments referencing Math.random() exist but are documentation, not violations.
4. ~~Multiple unwired systems~~ **PARTIALLY RESOLVED.** Recipes, seasonalMarket, discovery, lootSystem, weatherParticles, ambientParticles remain orphaned (see table above). Tool upgrades wired to store.
5. ~~Hearts/hunger not implemented~~ **RESOLVED.** `tickSurvival()` runs every frame: hunger drain, heart damage from starvation, body temperature exposure, death detection. HUD shows hearts via `HeartsDisplay`.
6. ~~Chunk-based world not implemented~~ **RESOLVED.** `ChunkManager` + `ChunkStreamer` (useFrame) + `TerrainChunks` render procedural terrain. 3x3 active chunks, 5x5 buffer.
7. ~~Labyrinth generation not implemented~~ **RESOLVED.** `mazeGenerator.ts` (Growing Tree algorithm), `hedgePlacement/`, `ProceduralHedgeMaze` mounted in Canvas, `GrovekeeperSpirit` at maze centers.
8. ~~Base building / raids not implemented~~ **PARTIALLY RESOLVED.** `kitbashing/` system exists with placement + commit + Rapier colliders + unlocks. ProceduralTown renders buildings. `baseRaids.ts` has tests but is NOT IMPORTED by any non-test code.
9. ~~Forging / cooking not implemented~~ **FULLY RESOLVED.** `cooking.ts` and `forging.ts` are implemented + tested + wired to actionDispatcher. `CookingPanel`, `ForgingPanel`, and `BuildPanel` are all mounted in `app/game/index.tsx` via `resolvePanelState(activeCraftingStation)`.
10. ~~World quest system not implemented~~ **RESOLVED.** `worldQuestSystem.ts`, `proceduralQuests.ts`, `config/game/worldQuests.json`, `config/game/proceduralQuests.json` all exist and are loaded.

**Current gaps (re-audited 2026-03-08):**

1. **Orphaned systems (12):** recipes, seasonalMarket, discovery, seasonalEffects, baseRaids, spatialHash, zoneBonuses, gridGeneration, lootSystem, NativeAudioManager, weatherParticles, ambientParticles — tested but not imported by any non-test production code. (`audioEngine.ts` was previously listed but IS imported by `AudioManager.ts` as an internal dependency.) `treeScaleSystem.ts` is also not wired.
2. **Unmounted UI components:** FastTravelMenu, QuestPanel, MiniMap, AchievementPopup, HungerBar, StaminaGauge (bar version), ToolBelt, XPBar, StatsDashboard, RulesModal, FloatingParticles, ErrorBoundary, WeatherOverlay, WeatherForecast, VirtualJoystick, MobileActionButtons, FishingPanel, ToolWheel, RadialActionMenu, BatchHarvestButton, ActionButton — exist in `components/game/` but are not rendered in any mounted parent. Note: ResourceBar and StaminaGauge ARE imported by HUD.tsx (used internally). CookingPanel, ForgingPanel, and BuildPanel are now MOUNTED (resolved since last audit).
3. **GameUI orchestrator not mounted:** `components/game/GameUI/` was designed to consolidate HUD sub-components (BuildPanel, MiniMap, ToolWheel, WeatherOverlay, etc.) but is not imported by `app/game/index.tsx`. The game screen mounts HUD and other overlays directly.
4. **Legacy scene components:** `Camera.tsx`, `Ground.tsx`, `SelectionRing.tsx` in `components/scene/` and `Player.tsx` in `components/entities/` are superseded by FPSCamera, TerrainChunks, raycast system, and PlayerCapsule respectively. Not deleted.
5. **Config/code mismatch:** `config/game/achievements.json` exists but is never loaded — achievements are hardcoded in `game/systems/achievements/core.ts`. `config/game/npcs.json` exists but NpcManager loads from `game/npcs/data/npcs.json` instead.
6. **SpeechBubble not mounted:** R3F component exists with tests but not rendered by ChibiNpc or ChibiNpcScene.
7. **No codex/discovery UI:** Species discovery system tracks progress in store but has no player-facing UI.
8. **Quest chain UI missing:** Quest chains run via store + engine but have no in-game panel. QuestPanel exists but is not mounted.
9. **3 test suites failing (12 tests):** `audioEngine.test.ts`, `AudioManager.test.ts`, and `fishingWiring.test.ts` fail due to Tone.js ESM import issues in the Jest environment. Not a runtime bug — audio works at runtime via first-gesture bootstrap.

### 39.4 Priority Phases (audited 2026-03-08)

| Phase | Task | Status |
|-------|------|--------|
| P0-A | Tear out legacy grid/zone/farmer code | COMPLETE |
| P0-B | Rapier physics + FPS camera | COMPLETE |
| P0-C | Chunk system + terrain heightmap | COMPLETE |
| P0-D | Input system + save + difficulty | COMPLETE |
| P1-A | Procedural trees + bushes + grass | COMPLETE |
| P1-B | NPCs + animation + structures | COMPLETE |
| P1-C | Gerstner water + foam + caustics | COMPLETE |
| P2 | Tool view model + raycast + HUD | COMPLETE |
| P3 | Open world streaming + villages | COMPLETE |
| P4 | Hedge maze + spirits + combat | COMPLETE |
| P5 | Survival: hunger/fish/hunt/cook/forge | COMPLETE — systems + CookingPanel/ForgingPanel/BuildPanel mounted |
| P6 | Dialogue branching + NPC relationships | COMPLETE |
| P7 | Quest system + seed branching | COMPLETE (engine); UI NOT MOUNTED |
| P8 | Base building (kitbashing) | COMPLETE (system); raids NOT WIRED |
| P9 | Raids + NG+ + achievements | PARTIAL — prestige + achievements COMPLETE; raids NOT WIRED |
| P10 | Audio (Tone.js) + weather + particles | COMPLETE (ambient audio); weather/ambient particles NOT WIRED |
| P11 | Tutorial + menu + polish | PARTIAL — tutorial + menus COMPLETE; UI polish needed |

### 39.5 Test Coverage Summary

- **Test suites:** 173 passing, 3 failing (176 total)
- **Individual tests:** 4,071 passing, 12 failing (4,083 total)
- **Test files:** 178 (+ 3 `.pending` files not yet active)
- **Systems with tests:** all `game/systems/` files have corresponding test files
- **Failing suites:** `audioEngine.test.ts`, `AudioManager.test.ts`, `fishingWiring.test.ts` — Tone.js ESM import issue in Jest only
- **Math.random() violations:** 0 in production code (1 in test mock in `saveLoad.test.ts`, acceptable; 3 comment references in documentation, not violations)

---

## 40. World Naming System

**Status: NEW 2026-03-07** — Seeded, deterministic names for all procedural
areas, POIs, and NPCs. Same world seed = same names everywhere.

### 40.1 Starting Village Name

**Fixed name: Rootmere.** Not seed-derived. Appears on notice board, NPC
dialogue, minimap legend. Rootmere is the home base — the only permanently
named location.

### 40.2 Procedural Area Names

All other named locations are generated from a seeded word bank.
Format: `generateAreaName(type, worldSeed, chunkX, chunkZ)`

**Labyrinth names:** `[Adjective] [Noun] Labyrinth`
- Adjective pool: Thorn, Briar, Hollow, Pale, Ember, Moss, Silver, Veil, Dusk,
  Ancient, Gnarled, Verdant, Twilight, Ashen
- Noun pool: Wood, Root, Glen, Mere, Rise, Stone, Gate, Arch, Ring, Veil, Watch
- Example: "The Emberveil Labyrinth", "The Pale Root Labyrinth"

**Procedural village names:** `[Prefix][Suffix]`
- Prefix pool: Briar, Fern, Moss, Oak, Ash, Thorn, Elm, Reed, Rowan, Birch,
  Alder, Heather
- Suffix pool: wick, holm, dale, mere, haven, ford, shaw, hollow, fell, gate
- Example: "Fernwick", "Mosshollow", "Brierhaven"

**Landmark names (ruins, towers, camps):** `The [Adjective] [Type]`
- Adjective pool: Pale, Crumbled, Mossy, Forgotten, Overgrown, Weathered, Still
- Type pool: Tower, Ruin, Camp, Ring, Mound, Hollow, Crossing, Well
- Example: "The Forgotten Tower", "The Mossy Ring"

### 40.3 Procedural NPC Names

Named starting-village NPCs (Elder Rowan, Hazel, Bramble, etc.) are fixed.
All procedural NPCs (scattered world encounters) have seed-derived names.

Format: `generateNpcName(worldSeed, npcId)` — stable for the life of the NPC.

**First names (nature-rooted, gender-neutral):**
Alder, Ash, Birch, Brier, Cedar, Clover, Dusk, Elder, Elm, Fern, Finch, Flint,
Garnet, Haze, Hazel, Ivy, Juniper, Lichen, Linden, Maple, Marsh, Mist, Mossy,
Needle, Oak, Pine, Reed, Robin, Rowan, Rush, Sage, Sedge, Slate, Sorrel, Thorn,
Wren, Yarrow

**Optional descriptive titles (10% chance):**
"the Young", "of the Grove", "Far-Walker", "Root-Finder", "Storm-Watcher",
"Seed-Bearer", "Thorn-Hand"

**Implementation:** `game/utils/worldNames.ts` — all pure functions using
`scopedRNG("area-name" | "npc-name", worldSeed, ...extraSeeds)`.

### 40.4 Compass / Minimap Integration

- First time a named location comes within ~2 chunk radius: "Discovered: Fernwick"
  toast + minimap label appears
- Labyrinth names appear in the labyrinth compass system
- NPC name appears above speech bubble on first encounter

---

## 41. RPG Combat & Random Encounters — CONFIRMED 2026-03-07

Combat and random encounters are a **confirmed core feature** of Grovekeeper.
The game is an open-world RPG grove-tending game with:

- **Tool-based melee combat**: axe deals chop damage, pick deals pierce, watering can has no combat use
- **Random encounters** throughout the open world — enemy density increases with distance from Rootmere
- **15 enemy types** across tiers 1–5, biome-matched, many with night-only spawning
- **Survival mode only** for lethal mechanics; Exploration/Seedling = no enemies
- **Loot tables** for all enemy types in `config/game/loot.json` — drops are grove-relevant resources (timber, sap, hide, meat, herbs, fiber, acorns, seeds, metal_scrap, ore)
- **Labyrinth zones** have highest enemy density (skeleton warriors, blood wraiths, devil boss)
- **Devil** is a rare Tier 5 boss found only in labyrinth centers — defeating it advances the Grovekeeper narrative
- All enemy models: 3DPSX GLBs + PSX Horror-Fantasy Megapack (PSX aesthetic, rigged armatures)

### 41.1 Confirmed Environmental Conflict (Non-Enemy)

These apply regardless of difficulty tier, including Seedling:
- **Thorny patches** in labyrinths: touching them deals small damage (environmental)
- **Campfire light** deters night hostility (distance-based passive mechanic)
- **Weather threats**: lightning strikes deal damage; storms affect visibility
- **Hunger/exposure death** from survival loop (not combat — environmental)

### 41.2 Loot Tables (All Resource Sources)

Loot tables in `config/game/loot.json` cover all drop sources:
- Enemy kills (all 15 enemy types — grove-relevant resources only)
- Tree harvest yields (`loot.json:treeLoot`)
- Fishing yields (`config/game/fishing.json`)
- Foraging yields (bushes, herbs, mushrooms)
- Mining yields (rocks, ore nodes)
- Seeded rolls: `scopedRNG("loot", worldSeed, entityId, entityType)`

Status: Design confirmed. Implementation: `game/systems/enemySpawning.ts`, `game/ecs/components/combat.ts`, `config/game/enemies.json`. See §34 for full spec.

---

## 42. Procedural World Rendering (GLB-Free)

All GLB-based entity renderers are replaced by procedural geometry. No external
model files are required for trees, fences, props, or bushes. Every visual is
generated from code using Three.js geometry + canvas textures.

### 42.1 Procedural Trees

Component: `components/entities/ProceduralTrees.tsx`

- **Trunk**: `CylinderGeometry(0.15, 0.3, 1, 8)` — wood canvas texture
- **Canopy**: `DodecahedronGeometry(1.5, 1)` — leaves canvas texture
- Stage-to-scale mapping (trunk height multipliers):

| Stage | Name | Trunk Scale | Canopy Scale |
|-------|------|-------------|--------------|
| 0 | Seed | 0.3 | 0.2 |
| 1 | Sprout | 0.5 | 0.4 |
| 2 | Sapling | 0.7 | 0.7 |
| 3 | Mature | 1.0 | 1.0 |
| 4 | Old Growth | 1.4 | 1.5 |

- One `InstancedMesh` per geometry type (trunk / canopy) — two draw calls total
- Instance matrices updated in `useFrame` — zero React re-renders
- Per-tree random scale variation via `scopedRNG("tree-mesh", meshSeed)`
- `onTreeTap` callback for interaction
- Species meshParams (`trunkRadius`, `canopyRadius`, `color.trunk`, `color.canopy`)
  drive per-species variation loaded from `config/game/species.json`

### 42.2 Procedural Fences

Component: `components/entities/ProceduralFences.tsx`

- **Posts**: `CylinderGeometry(0.08, 0.08, 1.2, 6)` — wood canvas texture
- **Rails**: `BoxGeometry(2.0, 0.1, 0.08)` — wood canvas texture
- Each fence entity produces 2 posts + 2 rails (one fence segment)
- Y-rotation from `entity.rotationY`
- Two `InstancedMesh` instances (posts + rails) — two draw calls total

### 42.3 Procedural Props

Component: `components/entities/ProceduralProps.tsx`

Prop type determined from `entity.prop.modelPath` string matching:

| Type | Geometry | Texture |
|------|----------|---------|
| barrel | `CylinderGeometry(0.4, 0.4, 0.8, 8)` | wood |
| crate | `BoxGeometry(0.6, 0.6, 0.6)` | wood |
| default | `CylinderGeometry(0.3, 0.3, 1.0, 8)` | stone |

Each type has its own `InstancedMesh` — one draw call per prop type.

### 42.4 Procedural Bushes

Component: `components/entities/ProceduralBushes.tsx`

- **Shape**: `SphereGeometry(0.6, 10, 10)` — hedge canvas texture
- **Season color tints** applied per-instance via `mesh.setColorAt`:

| Season | R | G | B |
|--------|---|---|---|
| spring | 0.2 | 0.7 | 0.3 |
| summer | 0.15 | 0.6 | 0.2 |
| autumn | 0.7 | 0.5 | 0.2 |
| winter | 0.6 | 0.6 | 0.65 |
| dead | 0.3 | 0.2 | 0.15 |

- Random scale variation 0.6–1.2 from `scopedRNG("bush-mesh", entityId hash)`
- One `InstancedMesh` — one draw call

### 42.5 Texture System

All procedural entities use canvas textures from `game/utils/proceduralTextures.ts`.
Wrap: `RepeatWrapping` on both axes.
Filter: `NearestFilter` (PSX aesthetic rule — §28.1).
Created once at component mount, disposed on unmount.

ECS queries: `treesQuery`, `fencesQuery`, `propsQuery`, `bushesQuery` (existing — no changes to world.ts).
Config: `config/game/species.json` (tree meshParams), `config/game/proceduralMesh.json` (tuning).

Status: **IMPLEMENTED** — `components/entities/ProceduralTrees.tsx`, `ProceduralFences.tsx`,
`ProceduralProps.tsx`, `ProceduralBushes.tsx`. Replaces: `TreeInstances`, `FenceInstances`,
`PropInstances`, `BushScene` in `app/game/index.tsx`.

---

## 43. Procedural Town Generation (Street-Grid + Blueprints)

Procedural villages use a **street-grid layout** with **blueprint-typed buildings**.
Each building type has a distinct function, interior furnishings, and visual identity
— all rendered from procedural geometry (zero GLBs). Towns feel designed, not random.

**Design philosophy:** The POC demonstrated that procedural buildings with street connectivity,
multi-story traversal (including stairs), and per-type variation can feel hand-crafted.
Blueprint-typed buildings give towns character: a barn looks different from an inn, a forge
has an anvil visible through its door, a doctor's house has herb planters. But all variation
is compositional — the same box-based geometry system drives everything.

### 43.1 Street-Grid Layout Algorithm

Villages use a simplified **L-shaped or cross-shaped street grid** instead of radial scatter.

**Algorithm** (pure function in `game/world/villageLayout.ts`):

1. **Determine village footprint**: `gridW × gridD` tiles (seeded 3–6 × 3–6 from config)
2. **Generate street axes**:
   - Always one **main street** along longest axis (1 tile wide)
   - 50% chance (seeded) of one **cross street** perpendicular to main
   - Streets create 2–4 **building lots** (rectangular zones between streets and edges)
3. **Assign lots to blueprints**:
   - Each lot gets a `BlueprintId` chosen from the village's `buildingPool` (seeded)
   - Lot size determines building footprint (clamped to blueprint min/max)
   - Buildings orient toward the street they face (door faces street)
4. **Place buildings in lots**:
   - Building footprint centered in lot with 0.5-tile margin
   - Y position sampled from heightmap at lot center
   - Rotation: 0° (facing +Z street), 90° (facing +X street), etc.
5. **Place street furniture**:
   - Lamp posts at intersections (every 3 tiles along streets)
   - Well/fountain at largest intersection (if cross street exists)
   - Crates/barrels at building fronts (1–2 per building, seeded)

**Config** (`config/game/structures.json` → `villageLayout`):
```json
{
  "villageLayout": {
    "minGridW": 3,
    "maxGridW": 6,
    "minGridD": 3,
    "maxGridD": 6,
    "streetWidth": 1,
    "lotMargin": 0.5,
    "crossStreetChance": 0.5,
    "lampPostSpacing": 3,
    "streetFurniturePerBuilding": { "min": 1, "max": 2 }
  }
}
```

**Rootmere override**: Chunk (0,0) keeps its §17.3a authored layout. Street-grid only
applies to procedural villages (non-origin landmark chunks).

### 43.2 Building Blueprints

Each blueprint defines a building's **function, dimensions, stories, material, and interior**.
Blueprints are config-driven (`config/game/structures.json` → `blueprints`).

| BlueprintId | Name | Footprint | Stories | Material | Functional Feature |
|-------------|------|-----------|---------|----------|-------------------|
| `cottage` | Cottage | 3×3 | 1 | plaster | Bed + chest (NPC home) |
| `townhouse` | Townhouse | 3×4 | 2 | brick | Larger NPC home, balcony box |
| `barn` | Barn | 4×5 | 1 | timber | Open interior, hay bales, animal pens |
| `inn` | Inn | 4×4 | 2 | plaster | Counter, fireplace, 2 beds upstairs |
| `forge` | Forge | 4×3 | 1 | brick | Anvil, coal bin, chimney stack |
| `kitchen` | Kitchen | 3×3 | 1 | plaster | Cooking pot, counter, shelving |
| `apothecary` | Apothecary | 3×3 | 1 | plaster | Herb planters, potion shelf |
| `watchtower` | Watchtower | 2×2 | 3 | brick | Open top floor, viewing platform |
| `storehouse` | Storehouse | 3×3 | 1 | brick | Crates and barrels fill interior |
| `chapel` | Chapel | 3×4 | 1 | plaster | Peaked roof (double height), pews |

**Blueprint pool per village size:**
- Small village (3–4 buildings): 1 cottage, 1 storehouse, 1 random from pool
- Medium village (5–6): + 1 inn or forge, 1 cottage
- Large village (7–8): + 1 of every remaining type (seeded selection)

**Every village has exactly 1 campfire** (at the main intersection or village center).

### 43.3 Building Interior Furnishings

Interior furnishings are **additional BoxSpecs** appended to the building geometry.
Same merged-geometry, single-draw-call approach. Furnishings use existing `BoxMatType`
plus new types: `"furniture"`, `"chimney"`.

**Furnishing specs** (per blueprint, generated by `generateBlueprintInterior()`):

| Blueprint | Furnishings |
|-----------|-------------|
| `cottage` | Bed (box 1.0×0.5×2.0), chest (box 0.6×0.5×0.6) |
| `inn` | Counter (box 2.5×1.0×0.5), fireplace wall (box 0.8×2.0×0.2), beds upstairs |
| `forge` | Anvil (box 0.6×0.8×0.4), coal bin (box 0.8×0.5×0.8), chimney (box 0.5×4.0×0.5) |
| `kitchen` | Cooking pot (cylinder → box approx 0.5×0.4×0.5), counter, shelf (box 0.8×1.5×0.3) |
| `apothecary` | Planters (2× box 0.8×0.4×0.3), shelf (box 1.5×1.5×0.3) |
| `barn` | Hay bale (box 1.0×0.8×1.0 × 3), trough (box 1.5×0.4×0.5) |
| `storehouse` | Crates (3–5× box 0.6×0.6×0.6), barrels (box 0.4×0.8×0.4 × 2) |
| `watchtower` | Railing (thin box perimeter on top floor) |
| `chapel` | Pews (4× box 2.0×0.5×0.4, spaced along Z) |
| `townhouse` | Bed upstairs, table ground floor (box 1.2×0.8×0.8) |

**Color palette additions** (in `config/game/structures.json` → `proceduralBuilding.colors`):
```json
{
  "furniture": [0.50, 0.35, 0.22],
  "chimney":   [0.30, 0.28, 0.26],
  "timber":    [0.55, 0.38, 0.22],
  "hay":       [0.78, 0.72, 0.40]
}
```

### 43.4 Door and Window Openings

Doors and windows are **subtractive boxes** — instead of cutting geometry (complex),
we render the opening as a **dark-colored recessed box** that reads as a void.

- **Door opening**: Box at front wall, `doorWidth × doorHeight × wallThickness`, color `[0.05, 0.05, 0.05]`
- **Window opening**: Box at side walls, `windowWidth × windowHeight × wallThickness`, at `windowSillHeight` Y offset, color `[0.08, 0.10, 0.15]` (dark blue-grey for glass illusion)
- Config values already exist in `structures.json.proceduralBuilding`: `doorWidth`, `doorHeight`, `windowWidth`, `windowHeight`, `windowSillHeight`

**Rules** (in `generateBlueprintOpenings()`):
- Every building gets 1 door on the street-facing wall
- Every story gets 1–2 windows on side walls (seeded placement)
- No windows on walls shared with adjacent buildings (lot boundary check)
- Barn gets double-wide door (2× `doorWidth`)
- Watchtower: no door on ground floor (accessed from adjacent building's 2nd floor or ladder)

### 43.5 Building Variation (Seeded)

Same blueprint type renders differently based on seed:
- **Material**: brick vs plaster per-story (e.g., brick ground floor, plaster upper)
- **Roof style**: flat cap (current) vs peaked (doubled `roofOverhang` + triangular ridge box)
- **Chimney**: 30% chance per 1-story building (box column from roof)
- **Balcony**: 20% chance per 2+ story (floor slab extension on front, railing boxes)
- **Awning**: 40% chance per ground-floor shop (angled box above door)

All variation computed in `deriveVariation(blueprintId, seed)` → stored in `ProceduralBuildingComponent`.

### 43.6 Traversability

**Guaranteed walkability** — the street grid is always traversable:

- **Street surfaces**: Ground-level, flattened heightmap (same approach as Rootmere §17.3a flattening)
- **Building entries**: Door threshold at street level (no step up)
- **Stairs**: Existing stair system (§42 `buildingGeometry.ts`) for multi-story buildings
- **Between buildings**: 0.5-tile gaps between lots allow passage
- **Rapier colliders**: Every building has TrimeshCollider (already implemented in `ProceduralBuilding.tsx`). Interior furnishings are collidable — player navigates around furniture.

### 43.7 ECS Integration

**ProceduralBuildingComponent** extension:
```typescript
interface ProceduralBuildingComponent {
  footprintW: number;
  footprintD: number;
  stories: number;
  materialType: "brick" | "plaster" | "timber";
  blueprintId: BlueprintId;           // NEW: determines interior + openings
  facing: 0 | 90 | 180 | 270;        // NEW: door faces this direction (degrees)
  variation: number;                   // NEW: seeded variation hash
}
```

**New entity pattern** (spawned by ChunkManager during village load):
```
entity = {
  position: { x, y, z },
  proceduralBuilding: { footprintW, footprintD, stories, materialType, blueprintId, facing, variation },
  structure: { templateId, category, ... },
  renderable: { visible: true }
}
```

### 43.8 Data Flow

```
villageLayout.ts (pure function)
  ├─ Input: worldSeed, chunkX, chunkZ, heightmap, config
  ├─ Output: VillageLayout { streets, lots, buildingPlacements[], furniturePlacements[] }
  └─ Algorithm: street grid → lot assignment → blueprint selection → placement

  ↓ (ChunkManager spawns entities)

buildingGeometry.ts (pure function, extended)
  ├─ generateBuildingBoxes(footprintW, footprintD, stories)     — walls/floors/stairs/roof
  ├─ generateBlueprintInterior(blueprintId, footprintW, footprintD, stories, variation)  — furniture
  ├─ generateBlueprintOpenings(blueprintId, footprintW, footprintD, stories, facing)     — doors/windows
  └─ All return BoxSpec[] → merged into one array per building

  ↓ (ProceduralBuilding.tsx renders)

ProceduralBuilding.tsx (existing, extended)
  ├─ boxes = [...wallBoxes, ...interiorBoxes, ...openingBoxes]
  ├─ buildMergedGeometry(boxes, materialType) → one draw call
  └─ buildColliderArrays(boxes) → Rapier TrimeshCollider
```

### 43.9 §35 Deprecation

**§35 (Base Building / Kitbashing) references 549 PSX Mega Pack II GLBs.** This is incompatible
with the GLB-free procedural architecture (§42). Player-placed structures now use the same
procedural building system:

- Player selects a blueprint from the build menu (§18.4)
- Ghost preview renders using `ProceduralBuilding` with translucent material
- On placement, ChunkManager spawns a `proceduralBuilding` entity at the snapped position
- **Modular snap system (§35.1) is preserved** — but pieces are procedural boxes, not GLBs

### 43.10 Implementation Plan

| Step | File | Description |
|------|------|-------------|
| 1 | `config/game/structures.json` | Add `villageLayout` + `blueprints` config sections |
| 2 | `game/world/villageLayout.ts` | Street-grid generation algorithm (pure function) |
| 3 | `game/systems/buildingGeometry.ts` | Extend with `generateBlueprintInterior()` + `generateBlueprintOpenings()` |
| 4 | `game/ecs/components/structures.ts` | Extend `ProceduralBuildingComponent` with `blueprintId`, `facing`, `variation` |
| 5 | `game/world/villageGenerator.ts` | Replace radial placement with `villageLayout` call |
| 6 | `game/world/ChunkManager.ts` | Pass new fields when spawning building entities |
| 7 | `components/scene/ProceduralBuilding.tsx` | Consume `blueprintId` for interior + openings |
| 8 | Tests | `villageLayout.test.ts`, `buildingGeometry.test.ts` (interiors), `villageGenerator.test.ts` (grid) |

Status: **IMPLEMENTED — tests: 37, wired to game loop: NO (ChunkManager step pending §43.10 step 5-6), wired to UI: NO**

---

## 44. Fishing Mechanic

Player casts a fishing rod at any fishable water body and plays a timing minigame
to catch fish. Fish species are biome- and season-dependent via seeded RNG.

### 44.1 Fishing Rod Tool

| Parameter | Value |
|-----------|-------|
| Tool ID | `fishing-rod` |
| Stamina cost | 4 |
| Unlock level | 6 |
| Action | `FISH` |
| Craft cost | 5 Timber + 3 Fiber |

Added to `config/game/tools.json`. Uses `dispatchAction` with targetType `water`.

### 44.2 Fishing Flow

```
Player equips fishing rod
  -> Raycast/tap hits water body entity
  -> ActionButton shows "FISH"
  -> dispatchAction sets activeCraftingStation { type: "fishing" }
  -> FishingPanel opens (fullscreen overlay)
  -> State machine: idle -> casting -> waiting -> biting -> minigame -> caught/escaped
  -> On caught: selectFishSpecies(biome, season, rng) -> computeFishYield(hasDock)
  -> addResource("fish", yield) + toast
  -> Panel closes, activeCraftingStation set to null
```

### 44.3 Timing Minigame

Config from `config/game/fishing.json`:

| Parameter | Value |
|-----------|-------|
| Cast duration | 0.5s |
| Wait duration | 3-10s (seeded) |
| Bite duration | 4s (window to respond) |
| Timing bar speed | 0.8 |
| Success zone width | 0.25 (25% of bar) |

Bouncing cursor on a horizontal bar. Player taps when cursor is inside the
success zone. Hit = caught, miss = escaped, timeout = escaped.

### 44.4 Species Selection

Per-biome species lists with seasonal weight modifiers.
8 biomes × 2-3 species each. See `config/game/fishing.json` biomeSpecies.

### 44.5 Yield

- Base yield: 1 fish per catch
- Fishing Dock structure (§18.1): +30% yield bonus
- Result is `Math.ceil(baseYield * (1 + bonus))`

### 44.6 Implementation Files

| File | Purpose |
|------|---------|
| `game/systems/fishing.ts` | Pure state machine + species selection |
| `game/systems/fishing.test.ts` | 30+ tests covering all phases |
| `config/game/fishing.json` | Timing, species, seasonal weights |
| `components/game/FishingPanel.tsx` | FPS overlay UI for minigame |
| `components/game/fishingPanelLogic.ts` | Pure display helpers |
| `game/actions/actionDispatcher.ts` | FISH action wiring |

Status: **System logic COMPLETE, tests COMPLETE, UI panel IMPLEMENTING, wiring to GameUI IMPLEMENTING**

---

## 45. Mining Mechanic

Player equips pickaxe and mines rock/ore nodes for stone and ore resources.
Stamina cost scales with rock hardness. Ore type depends on chunk biome.

### 45.1 Pickaxe Tool

Already in `config/game/tools.json` as `pick` (id: `pick`, action: `MINE`,
stamina: 10, unlock level: 6, effectPower: 4.0).

### 45.2 Mining Flow

```
Player equips pick
  -> Raycast/tap hits rock entity (RockComponent in ECS)
  -> ActionButton shows "Mine"
  -> dispatchAction resolves MINE action
  -> resolveMiningInteraction checks isRock, computes staminaCost
  -> If stamina sufficient: deduct stamina, call mineRock(rock, biome, rng)
  -> addResource(oreType, amount) + incrementToolUse("pick")
  -> Toast: "Mined rock!"
```

### 45.3 Rock Hardness & Stamina

From `config/game/mining.json`:

| Rock Type | Hardness | Stamina Cost |
|-----------|----------|-------------|
| default | 1 | 8 |
| granite | 2 | 16 |
| iron-vein | 3 | 24 |
| obsidian | 4 | 32 |

Formula: `staminaCost = hardness × baseStaminaPerHardness (8)`

### 45.4 Ore Table (Per Biome)

| Biome | Ore Type | Min | Max |
|-------|----------|-----|-----|
| starting-grove | stone | 1 | 2 |
| meadow | stone | 1 | 2 |
| ancient-forest | stone | 2 | 3 |
| wetlands | stone | 1 | 2 |
| rocky-highlands | ore | 1 | 2 |
| orchard-valley | stone | 1 | 2 |
| frozen-peaks | ore | 1 | 3 |
| twilight-glade | ore | 2 | 3 |

### 45.5 Implementation Files

| File | Purpose |
|------|---------|
| `game/systems/mining.ts` | Pure functions: hardness, stamina, ore yield |
| `game/systems/mining.test.ts` | 25+ tests covering all functions |
| `config/game/mining.json` | Hardness table, ore table |
| `game/actions/actionDispatcher.ts` | MINE action wiring |
| `game/hooks/useInteraction/actionHandlers.ts` | handlePickAction |

Status: **System logic COMPLETE, tests COMPLETE, wired to dispatcher COMPLETE, resource type fix IMPLEMENTING**

---

## 46. Player Building Flow

Player presses B key (desktop) or Build button (mobile) to enter build mode.
Build panel shows piece categories and material options. Ghost preview follows
camera raycast with snap-to-grid and Rapier collision validation.

### 46.1 Hammer Tool

| Parameter | Value |
|-----------|-------|
| Tool ID | `hammer` |
| Stamina cost | 8 |
| Unlock level | 5 |
| Action | `BUILD` |
| Craft cost | 8 Timber + 4 Stone |

Added to `config/game/tools.json`.

### 46.2 Build Flow

```
Player presses B key or taps Build button
  -> OR: equips hammer + taps ground -> dispatchAction(BUILD)
  -> store.setActiveCraftingStation({ type: "kitbash" })
  -> BuildPanel opens (modal bottom sheet)
  -> Player selects category (radial wheel) -> piece list
  -> Player selects piece + material (checks level unlock + resource cost)
  -> store.setBuildMode(true, "pieceType:material")
  -> BuildPanel closes
  -> PlacementGhost appears (3D mesh follows camera raycast)
  -> Ghost snaps to grid (1.0 unit), shows green/red validity
  -> Q/E rotate (desktop) or overlay buttons (mobile)
  -> Confirm: deduct resources, spawn ECS entity, award XP
  -> Cancel: exit build mode, no cost
```

### 46.3 Piece Categories (§35.2)

6 categories with 11 piece types across 5 materials:
- Foundation: foundation, floor, platform
- Walls: wall, window, pillar
- Roofs: roof, beam
- Doors: door
- Stairs: stairs
- Utility: pipe

### 46.4 Material Unlock Levels

| Material | Unlock Level |
|----------|-------------|
| thatch | 1 |
| wood | 5 |
| stone | 10 |
| metal | 15 |
| reinforced | 16 |

### 46.5 Implementation Files

| File | Purpose |
|------|---------|
| `components/game/BuildPanel.tsx` | Category wheel + piece selection UI |
| `components/game/buildPanelUtils.ts` | Pure cost/unlock logic |
| `components/game/PlacementGhost.tsx` | 3D ghost mesh + UI overlay |
| `game/actions/actionDispatcher.ts` | BUILD action wiring |
| `config/game/building.json` | Build costs, unlock levels, snap points |

Status: **UI panel COMPLETE, ghost preview COMPLETE, B-key shortcut IMPLEMENTING, resource deduction on placement IMPLEMENTING**

Files:
- `game/world/villageLayout/index.ts` — `generateVillageLayout()` entry point
- `game/world/villageLayout/types.ts` — `VillageLayout`, `StreetSegment`, `BuildingLot`, `BlueprintPlacement`, `FurniturePlacement`
- `game/world/villageLayout/lots.ts` — `buildLots()`, `pickBlueprintId()`, blueprint pool
- `game/world/villageLayout/furniture.ts` — `lampPostsAlongStreet()`, `wellAtIntersection()`, `buildingFrontFurniture()`
- `game/world/villageLayout.test.ts` — 37 tests covering determinism, grid dims, buildings, lots, furniture, cross-street probability, height sampling
