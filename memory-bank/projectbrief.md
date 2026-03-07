# Project Brief -- Grovekeeper

## Core Identity

**Name:** Grovekeeper
**Tagline:** *"Every forest begins with a single seed."*
**Genre:** First-person survival grove-tending game with PSX aesthetic
**Platform:** Universal app (iOS + Android + Web) via Expo SDK 55
**Target Session:** 3-15 minutes (commute-friendly), with longer exploration sessions supported

## The Game

Grovekeeper is a survival game. You are a nobody who sets out into an infinite procedural world and discovers the dormant Grovekeepers -- ancient guardians of tree species hidden deep within hedge labyrinths. Find all 14, unlock every species, master the land. Survival-style resource accumulation and consumption: hunt, fish, plant, farm, gather minerals, forge tools. Every comfort is earned.

No "exploration mode." No "creative mode." Weather hurts. Nights are dangerous. Comfort is built, not given. This doesn't mean punishing -- it means MEANINGFUL.

## Design Pillars

1. **Become a Grovekeeper** -- The name IS the game. Find 14 dormant Grovekeepers in hedge labyrinths, awaken them, unlock their tree species. The Worldroot (15th species) is the endgame.
2. **PSX Aesthetic** -- No antialiasing. Pixel ratio 1. Flat shading. Chunky geometry. Pixelated textures (NearestFilter). Intentional art direction.
3. **Seeded Determinism** -- Same seed = same world. Zero Math.random(). All via `scopedRNG(scope, worldSeed, ...extra)`. Seed phrases: "Adjective Adjective Noun."
4. **Mobile-First** -- 375px portrait minimum. 44px touch targets. <50 draw calls. <30K visible vertices. 55+ FPS on mid-range mobile.
5. **Models Where Craft Matters, Procedural Where Variation Matters** -- 3DPSX GLBs for trees, NPCs, structures, props. Procedural for terrain, water, sky, weather, audio.

## Core Requirements

### Survival Systems
- **Hearts** (3-7 max, difficulty-scaled), **Hunger**, **Stamina**, **Temperature**
- Weather impacts: rain (growth boost + cold), drought (reduced yields), windstorm (damage), snow (exposure)
- Death drops resources, respawn at last campfire. Ironwood tier: permadeath.
- Structures degrade over time. Campfire/shelter/windbreak are essential.

### Open World
- Infinite chunk-based procedural world (16x16 tiles per chunk, 3x3 active, 5x5 buffer)
- 8 biomes determined by global temperature + moisture noise
- Delta-only persistence: store ONLY what the player changed
- Discovery cadence: major feature every 8-12 chunks, minor every 3-4, micro every 1
- 14 Grovekeeper labyrinths scattered across the world (the narrative spine)

### Economy & Crafting
- 12 resources from 7 survival activities (chop, mine, harvest, forage, hunt, fish, farm)
- 28 crafting recipes across 4 tiers (L1-25)
- Forging system: Ore -> Iron Ingots -> tool upgrades
- Cooking system: raw food -> cooked meals with better stats
- Trading with NPC merchants (seasonal modifiers, supply/demand, market events)

### Tool System
- 5 base tools (PSX GLBs) + 4 craftable survival tools
- 3 upgrade tiers: Basic -> Iron -> Grovekeeper
- Durability system with repair at Forge
- First-person view model with keyframe animations and impact effects

### Progression
- 25 levels, each with meaningful unlocks (tools, recipes, structures, features)
- Species unlocks via Grovekeeper discovery (separate from leveling)
- New Game+ after finding all 14 Grovekeepers + Worldroot
- 45 achievements across 10 categories
- Species Discovery Codex (5 tiers per species)

### NPCs & Quests
- 10 named Tutorial Village NPCs with full personalities
- Procedural NPCs at generated villages (ChibiCharacter GLBs, seeded appearance)
- 3 quest layers: Main (Grovekeeper Path), World Quests (seed-variant narrative), Procedural (65+ templates)
- Relationship system: 4 tiers with trade rate rewards

### Difficulty Tiers
| Tier | Hearts | Growth | Weather | Target |
|------|--------|--------|---------|--------|
| Seedling | 7 | 1.0x | 0.5x | First playthrough |
| Sapling | 5 | 0.8x | 1.0x | Standard |
| Hardwood | 4 | 0.6x | 1.5x | Experienced |
| Ironwood | 3 | 0.4x | 2.0x | Permadeath |

## Scope Boundaries

- **No multiplayer** -- single-player experience
- **No microtransactions** -- no real-money purchases
- **No server backend** -- all data is local (expo-sqlite, delta-only persistence)
- **3DPSX GLBs** are the visual foundation -- not procedural geometry for entities
- **Tone.js** for all audio -- never raw Web Audio (user mandate)

## Canonical Design Document

**`docs/plans/2026-03-07-unified-game-design.md`** -- master synthesis of 10 domain-specific design docs + Grok integration plan + asset inventory. This is the single source of truth for game design.
