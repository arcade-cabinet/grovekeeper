# Grovekeeper Documentation

> "Every forest begins with a single seed."

Grovekeeper is a PSX-aesthetic survival game. Mobile-first (portrait), desktop secondary. Target session: 3-15 minutes. Infinite procedural world, chunk-based generation, seeded determinism.

Built with Expo SDK 55, React Three Fiber, Miniplex ECS, Legend State, Tone.js, and anime.js.

---

## Master Design Document

**[Unified Game Design & Implementation Plan](plans/2026-03-07-unified-game-design.md)** -- THE single authoritative document for all game design decisions. Covers design pillars, world generation, survival systems, economy, NPCs, progression, audio, and implementation phases. All other docs are subordinate to this.

---

## Quick Start

```bash
pnpm install
pnpm dev        # Start Expo dev server
pnpm web        # Run in browser
pnpm android    # Android (requires Android SDK)
pnpm ios        # iOS (requires Xcode, macOS only)
```

| Command              | Description                        |
|-----------------------|------------------------------------|
| `pnpm dev`           | Start Expo dev server              |
| `pnpm web`           | Run in browser                     |
| `pnpm android`       | Run on Android device/emulator     |
| `pnpm ios`           | Run on iOS simulator               |
| `pnpm test`          | Run tests (Jest)                   |
| `pnpm test:watch`    | Run tests in watch mode            |
| `pnpm test:coverage` | Run tests with coverage            |
| `pnpm test:e2e`      | Run Maestro E2E tests              |
| `pnpm lint`          | Lint with Biome                    |
| `pnpm format`        | Format with Biome                  |
| `pnpm check`         | Full check (lint + format)         |
| `npx tsc --noEmit`   | TypeScript type check              |

---

## Documentation Index

### Game Spec

- **[GAME_SPEC.md](GAME_SPEC.md)** -- Single source of truth for game design (spec sections referenced by all tests)

### Architecture

- [Overview](architecture/overview.md) -- System architecture, data flow, entry point chain
- [ECS Patterns](architecture/ecs-patterns.md) -- Miniplex world, components, queries
- [State Management](architecture/state-management.md) -- Legend State store, persistence
- [Rendering](architecture/rendering.md) -- R3F scene components, tree rendering, day/night cycle
- [Scene Composition](architecture/scene-composition.md) -- Full scene tree, draw call budget, game loop
- [Procedural World](architecture/procedural-world.md) -- Terrain, paths, instances, structure placement
- [Instanced Rendering](architecture/instanced-rendering.md) -- InstancedBatch, material batching, shared geometries
- [Open World System](architecture/open-world-system.md) -- 8 biomes, hex grid, zone transitions
- [Input System](architecture/input-system.md) -- InputManager, providers, InputFrame
- [FPS Camera](architecture/fps-camera.md) -- PlayerController, Rapier capsule, movement
- [Tool View Model](architecture/tool-viewmodel.md) -- Tool GLBs, use animations, raycast interaction
- [Tool Action System](architecture/tool-action-system.md) -- 5 keyframe animations, impact effects, raycast
- [View Model Juice](architecture/view-model-juice.md) -- Hand sway, walk bob, sprint FOV
- [Touch Controls](architecture/touch-controls.md) -- Virtual joystick, swipe-to-look, action buttons
- [NPC System](architecture/npc-system.md) -- Chibi NPCs, path-following, seeded appearance
- [HUD Overlay](architecture/hud-overlay.md) -- HUD layout, component specs, design tokens
- [Day/Night & Weather](architecture/day-night-weather-visual-system.md) -- 8-stop sky, 4 weather types, seasons
- [Performance](architecture/performance.md) -- Budgets, instancing, code splitting

### Game Design

- [Core Loop](game-design/core-loop.md) -- Session flow, plant-tend-harvest loop
- [Grid System](game-design/grid-system.md) -- Tiles, expansion, coordinates
- [Tree Catalog](game-design/tree-catalog.md) -- 15 species (12 base + 3 prestige), growth stages
- [Tree Species Visual Spec](game-design/tree-species-visual-spec.md) -- 15 species x 5 stages, visual parameters
- [Tools](game-design/tools.md) -- Tools, stamina costs, upgrade tiers
- [Economy](game-design/economy.md) -- Resources, seed costs, harvesting
- [Progression](game-design/progression.md) -- XP, levels, achievements, prestige
- [Progression System Design](game-design/progression-system-design.md) -- XP curve, 45 achievements, prestige tiers
- [Seasons and Weather](game-design/seasons-weather.md) -- Day/night, seasons, weather events

### Design

- [Quest & Dialogue System](design/quest-dialogue-system.md) -- 10 NPC personalities, 13 quest chains, relationships
- [Economy Design](ECONOMY_DESIGN.md) -- Resource flow, recipes, trading balance

### Brand

- [Identity](brand/identity.md) -- Pillars, tagline, visual style, mascot
- [Design Tokens](brand/design-tokens.md) -- Colors, spacing, shadows, z-index
- [Typography](brand/typography.md) -- Fonts, type scale, loading strategy

### UI/UX

- [HUD Layout](ui-ux/hud-layout.md) -- Mobile and desktop panel positions, component map
- [Controls](ui-ux/controls.md) -- Joystick, keyboard, context actions, canvas config
- [Tutorial & User Flow](ui-ux/tutorial-user-flow.md) -- 11-step tutorial, loading screen, seed phrases

### Guides

- [Getting Started](guides/getting-started.md) -- Install, dev server, build, test
- [Coding Standards](guides/coding-standards.md) -- Conventions, patterns, testing
- [Contributing](guides/contributing.md) -- Agent roles, coordination

### Plans

- **[Unified Game Design](plans/2026-03-07-unified-game-design.md)** -- Master synthesis: design + implementation plan
- [Grok Integration Plan](plans/2026-03-07-grok-integration-plan.md) -- Chibi NPCs, water, audio, seasonal integration
- [Game Mode System Design](plans/game-mode-system-design.md) -- Survival mode, difficulty tiers
- [FPS Perspective Design](plans/2026-03-06-fps-perspective-design.md) -- First-person pivot design
- [Expo/R3F Migration Design](plans/2026-03-06-expo-r3f-migration-design.md) -- Migration from BabylonJS
- [Gap Analysis](plans/2026-03-06-gap-analysis.md) -- Feature gap analysis
- [Master Completion Plan](plans/2026-03-06-master-completion-plan.md) -- Historical reference
- [Phase A Plan](plans/2025-02-06-phase-a-foundation.md) -- Foundation (historical, BabylonJS era)
- [Phase B Plan](plans/2025-02-06-phase-b-systems-persistence.md) -- Systems and persistence (historical, BabylonJS era)

---

## Tech Stack

| Layer      | Technology                | Version   | Notes |
|------------|---------------------------|-----------|-------|
| Framework  | Expo SDK                  | 55        | Universal: web + iOS + Android |
| Runtime    | React + React Native      | 19 / 0.83 | New Architecture required |
| 3D Engine  | React Three Fiber + drei  | 9.x / 10.x | Declarative scene via React components |
| ECS        | Miniplex                  | 2.x       | Entity-component-system for runtime state |
| State      | Legend State              | 3.x       | Persistent player state via expo-sqlite |
| NPC AI     | Yuka                      | 0.7.x     | Goal-driven NPC behavior |
| NPC Anim   | anime.js                  | --        | Rigid body part rotation (Lego-style) |
| Audio      | Tone.js                   | --        | Spatial audio, FM synthesis, ambient soundscapes |
| Styling    | NativeWind                | 4.x       | Universal Tailwind (web + native) |
| Database   | expo-sqlite + drizzle-orm | --        | Native SQLite + web WASM |
| Language   | TypeScript                | 5.9+      | Strict mode |
| Lint/Fmt   | Biome                     | 2.4+      | Single tool for lint + format |
| Package    | pnpm                      | --        | Fast, strict dependency resolution |
| Testing    | Jest (unit) + Maestro (E2E) | --      | jest-expo preset |
| CI/CD      | GitHub Actions            | --        | Lint, test, build, deploy |

---

## Project Structure

```text
grovekeeper/
  CLAUDE.md                       Agent instructions and project rules
  docs/                           This documentation
    GAME_SPEC.md                  Single source of truth for game design
    ECONOMY_DESIGN.md             Economy design document
  app/                            Expo Router screens
    _layout.tsx                   Root layout
    index.tsx                     Main menu screen
    game/index.tsx                Game screen (R3F Canvas + HUD)
  components/                     React Native + R3F components
    ui/                           Base UI components (button, text, icon)
    game/                         Game UI (HUD, menus, popups, overlays)
    scene/                        R3F scene components (Camera, Lighting, Sky, Ground)
    entities/                     R3F entity components (Player, Trees, NPCs)
  config/                         JSON config hierarchy
    theme.json                    Colors, typography, spacing
    game/                         Game balance data
      species.json                15 tree species catalog
      tools.json                  Tool definitions + stamina costs
      resources.json              Resource type definitions
      growth.json                 Stage names, multipliers, timing
      weather.json                Event probabilities, multipliers
      achievements.json           Trigger conditions, display data
      prestige.json               Tiers, bonuses, cosmetic themes
      grid.json                   Expansion tiers, costs, sizes
      npcs.json                   NPC template definitions
      dialogues.json              Dialogue trees
      quests.json                 Quest chain definitions
      difficulty.json             Difficulty tier multipliers
    world/                        World data
      starting-world.json         Starting world definitions
      blocks.json                 Block catalog
      structures.json             Structure recipes
      encounters.json             Random encounters
      festivals.json              Seasonal festivals
  game/                           Game logic (engine-agnostic)
    ecs/                          Miniplex ECS (world, archetypes, queries)
    systems/                      Pure game systems (growth, weather, economy)
    stores/                       Legend State persistent store
    hooks/                        Custom hooks (useInput, useMovement)
    ai/                           Yuka NPC AI (brains, governor)
    npcs/                         NPC management
    quests/                       Quest chain engine
    events/                       Event scheduler
    world/                        World generation, zone loading
    structures/                   Structure placement + effects
    actions/                      Game action dispatcher
    config/                       Runtime config loaders (species.ts, tools.ts)
    constants/                    Codex + derived constants
    db/                           expo-sqlite + drizzle-orm
    utils/                        Pure utilities (treeGeometry, seedRNG)
  assets/                         Textures, models, fonts
  .maestro/                       Maestro E2E test flows
  .claude/                        Agent infrastructure
    hooks/                        Automatic quality gates
    agents/                       Specialized agent roles
    commands/                     Slash commands
    skills/                       Repeatable pipelines
```
