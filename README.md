# Grovekeeper

*"Every forest begins with a single seed."*

A bright, whimsical Wind Waker-inspired survival game where you explore an infinite procedural world, tend groves, and discover the 14 ancient Grovekeepers hidden deep within hedge labyrinths. Plant, chop, water, dig, forage, fish, farm, forge -- every comfort is earned. Same seed, same world, always.

**Mobile-first** -- designed for 3-15 minute sessions. Runs on iOS, Android, and Web.

## The Game

You start with a basic axe, a trowel, a watering can, three White Oak seeds, and a worn compass. Set out from the tutorial village into a chunk-based infinite world with 8 biomes, procedural villages, merchant camps, ancient groves, and garden labyrinths. Find the dormant Grovekeepers, unlock all 15 tree species, and master the land.

- **Survival systems** -- hearts, hunger, stamina, temperature, weather impact
- **Seeded determinism** -- "Adjective Adjective Noun" seed phrases, zero Math.random()
- **Wind Waker-inspired visuals** -- MSAA, smooth shading, PBR materials, bright whimsical palette
- **Infinite world** -- chunk-based generation with delta-only persistence
- **4 difficulty tiers** -- Seedling, Sapling, Hardwood, Ironwood (permadeath)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 (New Architecture) |
| Runtime | React 19, React Native 0.83 |
| 3D Engine | React Three Fiber 9 + drei 10 |
| ECS | Miniplex 2.x |
| State | Legend State 3.x (persistent via expo-sqlite) |
| NPC AI | Yuka 0.7 |
| NPC Animation | anime.js (rigid body part rotation) |
| Audio | Tone.js (spatial, FM synthesis) |
| Database | expo-sqlite + drizzle-orm |
| Styling | NativeWind 4 + Tailwind CSS 3 |
| Language | TypeScript 5.9, strict mode |
| Lint/Format | Biome 2.4 |
| Testing | Jest (unit) + Maestro (E2E) |
| Package Manager | pnpm |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run on specific platform
pnpm ios      # iOS simulator (Mac only)
pnpm android  # Android emulator
pnpm web      # Browser
```

## Development

```bash
pnpm test             # Run tests (Jest)
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:e2e         # Maestro mobile E2E
pnpm lint             # Biome lint + format check
pnpm format           # Biome format (write)
pnpm check            # Full check (lint + format, write fixes)
npx tsc --noEmit      # TypeScript type check
```

## Project Structure

```
grovekeeper/
  CLAUDE.md              -- Agent instructions and project rules
  docs/
    GAME_SPEC.md         -- Single source of truth for game design
    plans/               -- Design documents (unified design is the master)
    architecture/        -- Technical architecture deep dives
    game-design/         -- Game mechanics docs
    brand/               -- Visual identity
    ui-ux/               -- HUD layout, controls, tutorial flow
    guides/              -- Getting started, coding standards, contributing
  app/                   -- Expo Router screens (MainMenu, Game)
  components/
    scene/               -- R3F 3D components (Camera, Sky, Ground, Lighting)
    entities/            -- R3F entity renderers (Player, Trees, NPCs)
    game/                -- HUD, menus, dialogs (React Native)
    ui/                  -- Base UI primitives
  game/
    systems/             -- Pure-function game systems (growth, weather, harvest)
    stores/              -- Legend State persistent state
    ecs/                 -- Miniplex world, queries, archetypes
    hooks/               -- R3F hooks (useInput, useMovement)
    npcs/                -- NPC management and data
    quests/              -- Quest chain engine
    events/              -- Event scheduler
    world/               -- World generation, zone loading
    structures/          -- Structure placement + effects
    actions/             -- Game action dispatcher
    config/              -- Runtime config loaders
    constants/           -- Codex + derived constants
    ai/                  -- Yuka NPC AI + PlayerGovernor
    db/                  -- expo-sqlite + drizzle-orm
    utils/               -- Pure utilities (seedRNG, treeGeometry)
  config/                -- JSON game data (species, tools, quests, difficulty)
  assets/                -- Textures, models, fonts
  .maestro/              -- Maestro E2E test flows
  .claude/               -- Agent infrastructure (hooks, agents, commands)
```

## Architecture

- **ECS (Miniplex)** -- runtime game state: entity positions, growth progress, tile states
- **Legend State** -- persistent player state: level, XP, resources, unlocks, settings
- **Pure systems** -- `(world, deltaTime, ...context) => void`, config from JSON, randomness from `scopedRNG`
- **GLB models** -- chibi-style low-poly models for trees, NPCs, structures, props (procedural for terrain, water, sky, weather, audio)
- **Chunk-based world** -- 16x16 tiles per chunk, 3x3 active, 5x5 buffer, delta-only persistence

## Documentation

See [docs/README.md](docs/README.md) for the full documentation index.

The **[Unified Game Design](docs/plans/2026-03-07-unified-game-design.md)** is the master design document covering all game systems, world generation, economy, NPCs, progression, and implementation phases.

## Deploy

- **Web**: GitHub Pages via GitHub Actions
- **Native**: EAS Build for iOS + Android

---

Built with [Expo](https://expo.dev/), [React Three Fiber](https://r3f.docs.pmnd.rs/), and [Three.js](https://threejs.org/).
