# Grovekeeper Documentation

> "Every forest begins with a single seed."

Grovekeeper is a cozy 2.5D isometric tree-planting simulation and idle tending
game. Mobile-first PWA (portrait), desktop secondary. Target session length:
3-15 minutes.

---

## Quick Start

```bash
pnpm install
pnpm dev
```

| Command              | Description                    |
|-----------------------|--------------------------------|
| `pnpm dev`           | Start development server       |
| `pnpm build`         | Build for production           |
| `pnpm preview`       | Preview production build       |
| `pnpm test`          | Run tests (watch mode)         |
| `pnpm test:run`      | Run tests once (CI)            |
| `pnpm test:coverage` | Generate coverage report       |
| `pnpm lint`          | Lint with Biome                |
| `pnpm format`        | Format with Biome              |
| `pnpm check`         | Full check (lint + format)     |
| `pnpm tsc`           | TypeScript type check          |

---

## Documentation Index

### Architecture

- [Overview](architecture/overview.md) -- Tech stack, directory layout, data flow
- [ECS Patterns](architecture/ecs-patterns.md) -- Miniplex world, components, queries
- [State Management](architecture/state-management.md) -- Zustand store, persistence
- [Rendering](architecture/rendering.md) -- BabylonJS scene, meshes, lighting
- [Performance](architecture/performance.md) -- Budgets, optimizations, code splitting

### Game Design

- [Core Loop](game-design/core-loop.md) -- Session flow, game loop
- [Grid System](game-design/grid-system.md) -- Tiles, expansion, coordinates
- [Tree Catalog](game-design/tree-catalog.md) -- 11 species, growth stages
- [Tools](game-design/tools.md) -- 8 tools, stamina costs
- [Economy](game-design/economy.md) -- Resources, seed costs, harvesting
- [Progression](game-design/progression.md) -- XP, levels, achievements, prestige
- [Seasons and Weather](game-design/seasons-weather.md) -- Day/night, seasons, weather events

### Brand

- [Identity](brand/identity.md) -- Pillars, tagline, visual style, mascot
- [Design Tokens](brand/design-tokens.md) -- CSS custom properties (colors, spacing, shadows, z-index)
- [Typography](brand/typography.md) -- Fonts, type scale, loading strategy

### UI/UX

- [HUD Layout](ui-ux/hud-layout.md) -- Mobile and desktop panel positions, component map
- [Controls](ui-ux/controls.md) -- Joystick, keyboard, context actions, canvas config

### Guides

- [Getting Started](guides/getting-started.md) -- Install, dev server, build, test
- [Coding Standards](guides/coding-standards.md) -- Conventions, patterns, testing
- [Contributing](guides/contributing.md) -- Agent roles, coordination, memory bank

### Historical

- [Phase A Plan](plans/2025-02-06-phase-a-foundation.md) -- Foundation alignment with canonical spec
- [Phase B Plan](plans/2025-02-06-phase-b-systems-persistence.md) -- Systems and persistence

---

## Project Structure

```
grovekeeper/
  CLAUDE.md                       AI assistant context
  AGENTS.md                       Multi-agent orchestration guide
  memory-bank/                    Persistent project context
  src/
    main.tsx                      Entry point
    App.tsx                       Root component
    index.css                     Tailwind 4 + design tokens
    game/
      Game.tsx                    Screen router (menu | playing)
      scenes/
        GameScene.tsx             BabylonJS canvas + game loop (~1050 lines)
      ecs/
        world.ts                  Miniplex World + queries
        archetypes.ts             Entity factory functions
      systems/
        growth.ts                 5-stage tree growth
        movement.ts               Player movement
        time.ts                   Day/night + season cycle
        quests.ts                 Quest/goal generation
        weather.ts                Rain, drought, windstorm events
        achievements.ts           15 achievements
        prestige.ts               Level 25+ prestige + 5 cosmetic borders
        gridExpansion.ts          Grid size upgrades (12 -> 16 -> 20 -> 24 -> 32)
        offlineGrowth.ts          Offline growth calculation
        levelUnlocks.ts           Species + tool unlock thresholds
        platform.ts               Capacitor haptics bridge
      stores/
        gameStore.ts              Zustand persistent state (XP, coins, resources, ...)
      constants/
        config.ts                 Grid size, colors, growth stages
        trees.ts                  11 tree species definitions
        tools.ts                  8 tool definitions
      utils/
        spsTreeGenerator.ts       Ported BabylonJS SPS Tree Generator
        treeMeshBuilder.ts        Species-specific PBR meshes
      ui/
        MainMenu.tsx              Start screen
        HUD.tsx                   Top bar overlay
        GameUI.tsx                HUD + joystick + dialogs + frames
        Joystick.tsx              nipplejs wrapper
        ToolBelt.tsx              2x4 tool grid
        ToolWheel.tsx             Tool selection dialog
        ActionButton.tsx          Context-sensitive action button
        SeedSelect.tsx            Species picker dialog
        PauseMenu.tsx             Pause overlay (stats, achievements, prestige)
        ResourceBar.tsx           Timber/Sap/Fruit/Acorns display
        XPBar.tsx                 Level + XP progress bar
        StaminaGauge.tsx          Vertical stamina bar
        TimeDisplay.tsx           Day/night/season indicator
        QuestPanel.tsx            Active quest tracker
        WeatherOverlay.tsx        CSS rain/drought/windstorm/petals
        AchievementPopup.tsx      Gold border + sparkle achievement modal
        FloatingParticles.tsx     +XP/+Timber floating text
        Toast.tsx                 Notification system
        MiniMap.tsx               Desktop-only canvas mini-map
        Logo.tsx                  SVG logo
        FarmerMascot.tsx          SVG farmer "Fern"
        RulesModal.tsx            First-time tutorial
    components/ui/                shadcn/ui components
    hooks/                        Responsive/mobile detection hooks
    lib/utils.ts                  cn() Tailwind merge utility
  public/
    textures/                     PBR bark and leaf textures
    manifest.json                 PWA manifest
    sw.js                         Service worker
  docs/                           This documentation
  capacitor.config.ts             Capacitor native config
  biome.json                      Linter/formatter config
  vitest.config.ts                Test runner config
  vite.config.ts                  Bundler config
  tsconfig.json                   TypeScript config
```

---

## Tech Stack

| Layer      | Technology              | Version |
|------------|-------------------------|---------|
| Runtime    | React                   | 19      |
| 3D Engine  | BabylonJS               | 8.x     |
| ECS        | Miniplex                | 2.x     |
| State      | Zustand                 | 5.x     |
| Input      | nipplejs                | 0.10.x  |
| Styling    | Tailwind CSS + shadcn/ui| 4.x     |
| Bundler    | Vite                    | 6.x     |
| Language   | TypeScript              | 5.7+    |
| Lint/Fmt   | Biome                   | 2.3     |
| Package    | pnpm                    | --      |
| Testing    | Vitest + Testing Library| 4.x     |
| Mobile     | Capacitor               | 8.x     |
