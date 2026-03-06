# Grovekeeper Documentation

> "Every forest begins with a single seed."

Grovekeeper is a cozy 2.5D isometric tree-planting simulation and idle tending
game. Mobile-first (portrait), desktop secondary. Target session length:
3-15 minutes.

Built with Expo SDK 55, React Three Fiber, and Miniplex ECS. See the [Migration Design](plans/2026-03-06-expo-r3f-migration-design.md) for background on the migration from BabylonJS.

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
| `pnpm tsc`           | TypeScript type check              |

---

## Documentation Index

### Architecture

- [Overview](architecture/overview.md) -- Tech stack, directory layout, data flow
- [ECS Patterns](architecture/ecs-patterns.md) -- Miniplex world, components, queries
- [State Management](architecture/state-management.md) -- Zustand store, persistence
- [Rendering](architecture/rendering.md) -- R3F scene components, tree meshes, lighting
- [Performance](architecture/performance.md) -- Budgets, instancing, code splitting

### Game Design

- [Core Loop](game-design/core-loop.md) -- Session flow, game loop
- [Grid System](game-design/grid-system.md) -- Tiles, expansion, coordinates
- [Tree Catalog](game-design/tree-catalog.md) -- 15 species (12 base + 3 prestige), growth stages
- [Tools](game-design/tools.md) -- 8 tools, stamina costs
- [Economy](game-design/economy.md) -- Resources, seed costs, harvesting
- [Progression](game-design/progression.md) -- XP, levels, achievements, prestige
- [Seasons and Weather](game-design/seasons-weather.md) -- Day/night, seasons, weather events

### Brand

- [Identity](brand/identity.md) -- Pillars, tagline, visual style, mascot
- [Design Tokens](brand/design-tokens.md) -- Design tokens (colors, spacing, shadows, z-index)
- [Typography](brand/typography.md) -- Fonts, type scale, loading strategy

### UI/UX

- [HUD Layout](ui-ux/hud-layout.md) -- Mobile and desktop panel positions, component map
- [Controls](ui-ux/controls.md) -- Joystick, keyboard, context actions, canvas config

### Guides

- [Getting Started](guides/getting-started.md) -- Install, dev server, build, test
- [Coding Standards](guides/coding-standards.md) -- Conventions, patterns, testing
- [Contributing](guides/contributing.md) -- Agent roles, coordination, memory bank

### Plans

- [Expo/R3F Migration Design](plans/2026-03-06-expo-r3f-migration-design.md) -- Migration design document
- [Phase A Plan](plans/2025-02-06-phase-a-foundation.md) -- Foundation alignment (historical, BabylonJS era)
- [Phase B Plan](plans/2025-02-06-phase-b-systems-persistence.md) -- Systems and persistence (historical, BabylonJS era)

---

## Tech Stack

| Layer      | Technology                | Version | Notes |
|------------|---------------------------|---------|-------|
| Framework  | Expo SDK                  | 55      | Universal: web + iOS + Android |
| Runtime    | React + React Native      | 19 / 0.83 | UI runtime |
| 3D Engine  | React Three Fiber + drei  | 9.x / 10.x | Declarative scene via React components |
| ECS        | Miniplex                  | 2.x     | Entity-component-system for runtime state |
| State      | Zustand                   | 5.x     | Persistent player state via expo-sqlite |
| NPC AI     | Yuka                      | 0.7.x   | NPC brain, goal-driven AI |
| Styling    | NativeWind + RN Reusables | 4.x     | Universal Tailwind (web + native) |
| Database   | expo-sqlite + drizzle-orm | --      | Native SQLite + web WASM |
| Language   | TypeScript                | 5.9+    | Strict mode |
| Lint/Fmt   | Biome                     | 2.4+    | Single tool for lint + format |
| Package    | pnpm                      | --      | Fast, strict dependency resolution |
| Testing    | Jest (unit) + Maestro (E2E)| --     | jest-expo preset |
| CI/CD      | GitHub Actions            | --      | Lint, test, build, deploy |

---

## Project Structure

```text
grovekeeper/
  CLAUDE.md                       AI assistant context
  AGENTS.md                       Multi-agent orchestration guide
  memory-bank/                    Persistent project context
  docs/                           This documentation
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
      tools.json                  8 tools + stamina costs
      resources.json              Resource type definitions
      growth.json                 Stage names, multipliers, timing
      weather.json                Event probabilities, multipliers
      achievements.json           Trigger conditions, display data
      prestige.json               Tiers, bonuses, cosmetic themes
      grid.json                   Expansion tiers, costs, sizes
      npcs.json                   NPC template definitions
      dialogues.json              Dialogue trees
      quests.json                 Quest chain definitions
      difficulty.json             Difficulty multipliers
    world/                        World data
      starting-world.json         Zone definitions
      blocks.json                 Block catalog
      structures.json             Structure recipes
      encounters.json             Random encounters
      festivals.json              Seasonal festivals
  game/                           Game logic (engine-agnostic)
    ecs/                          Miniplex ECS (world, archetypes, queries)
    systems/                      Pure game systems (growth, weather, etc.)
    stores/                       Zustand persistent state
    hooks/                        Custom hooks (useInput, useMovement)
    ai/                           Yuka NPC AI (brains, governor)
    npcs/                         NPC management
    quests/                       Quest system
    events/                       Event system
    world/                        World generation, zone loading
    structures/                   Structure placement + effects
    actions/                      Game action dispatcher
    config/                       Runtime config loaders (species.ts, tools.ts)
    db/                           expo-sqlite + drizzle-orm
    ui/                           Game-specific UI utilities
    utils/                        Pure utilities (treeGeometry, seedRNG)
  lib/                            Shared utilities (cn(), etc.)
  assets/                         Textures, models, fonts
  .maestro/                       Maestro E2E test flows
  app.json                        Expo config
  tailwind.config.js              NativeWind theme config
  metro.config.js                 Metro bundler config
  jest.config.ts                  Jest test config
  drizzle.config.ts               Drizzle ORM config
  biome.json                      Linter/formatter config
  tsconfig.json                   TypeScript config
```
