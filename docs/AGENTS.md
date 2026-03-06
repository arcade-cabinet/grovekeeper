# docs/AGENTS.md -- Agentic Navigation Guide

This file helps AI agents navigate the `docs/` directory and find the right documentation for any task.

**Migration Notice:** Grovekeeper is migrating from BabylonJS/Vite/Capacitor to Expo/React Three Fiber. Some docs may contain stale BabylonJS references. The migration design is the source of truth for the new architecture. When in doubt, prefer the migration design over older docs.

---

## Directory Map

```
docs/
  AGENTS.md                  THIS FILE -- agentic navigation guide
  README.md                  Documentation index, tech stack, project structure
  architecture/              Technical architecture deep dives
    overview.md              System architecture, data flow, entry point chain
    ecs-patterns.md          Miniplex ECS: entity model, queries, archetypes, systems
    state-management.md      Zustand store: state shape, actions, persistence
    rendering.md             R3F scene components, tree rendering, day/night cycle
    performance.md           Mobile performance budgets, instancing, code splitting
  brand/                     Visual identity (engine-agnostic, stable)
    identity.md              Brand pillars, tagline, visual style, mascot "Fern"
    design-tokens.md         CSS custom properties: colors, spacing, shadows, z-index
    typography.md            Fonts (Fredoka headings, Nunito body), type scale
  game-design/               Game mechanics (engine-agnostic, stable)
    core-loop.md             Session flow, plant-tend-harvest loop
    grid-system.md           Tiles, expansion tiers, coordinate math
    tree-catalog.md          15 species (12 base + 3 prestige), growth stages
    tools.md                 8 tools, stamina costs
    economy.md               Resources, seed costs, harvesting yields
    progression.md           XP formula, levels, achievements, prestige system
    seasons-weather.md       Day/night cycle, 4 seasons, weather events
  guides/                    Developer guides
    getting-started.md       Setup, dev server, build, test commands
    coding-standards.md      Conventions, patterns, testing standards
    contributing.md          Agent roles, coordination, memory bank protocols
  plans/                     Build plans (historical + active)
    2025-02-06-phase-a-foundation.md         Phase A build plan (historical)
    2025-02-06-phase-b-systems-persistence.md Phase B build plan (historical)
    2026-03-06-expo-r3f-migration-design.md  Expo/R3F migration design (ACTIVE)
  ui-ux/                     UI/UX patterns (engine-agnostic, stable)
    hud-layout.md            Mobile and desktop panel positions, component map
    controls.md              Joystick, keyboard, context actions, canvas config
```

---

## Which Docs to Read for Which Tasks

### Starting any work session
1. `docs/README.md` -- overview, tech stack, project structure
2. `memory-bank/activeContext.md` -- current work focus
3. `memory-bank/progress.md` -- what is done, what is next

### Working on game systems (growth, weather, economy, quests)
- `docs/architecture/ecs-patterns.md` -- entity model, system conventions
- `docs/architecture/state-management.md` -- Zustand store shape and actions
- `docs/game-design/core-loop.md` -- session flow
- Relevant game-design doc (e.g., `progression.md` for XP/leveling)

### Working on 3D rendering (scene, meshes, camera, lighting)
- `docs/architecture/rendering.md` -- R3F scene decomposition, tree rendering
- `docs/architecture/performance.md` -- draw call budgets, instancing strategy
- `docs/plans/2026-03-06-expo-r3f-migration-design.md` -- scene component architecture

### Working on UI/UX (HUD, menus, dialogs, touch)
- `docs/ui-ux/hud-layout.md` -- panel positions, component map
- `docs/ui-ux/controls.md` -- input handling, touch targets
- `docs/brand/design-tokens.md` -- color tokens, spacing scale
- `docs/brand/typography.md` -- font usage

### Working on the migration (BabylonJS to Expo/R3F)
- `docs/plans/2026-03-06-expo-r3f-migration-design.md` -- THE source of truth
- `docs/architecture/rendering.md` -- new R3F rendering architecture
- `docs/architecture/performance.md` -- new performance strategy
- `docs/guides/getting-started.md` -- new dev setup commands

### Working on world/zone/structure systems
- `docs/game-design/grid-system.md` -- tile types, grid coordinates
- `docs/architecture/ecs-patterns.md` -- entity factories, grid cell components

### Working on brand/visual identity
- `docs/brand/identity.md` -- pillars, tagline, mascot
- `docs/brand/design-tokens.md` -- all design tokens
- `docs/brand/typography.md` -- font families and scale

---

## Document Stability

| Directory | Stability | Notes |
|-----------|-----------|-------|
| `game-design/` | Stable | Engine-agnostic game mechanics. Rarely changes. |
| `brand/` | Stable | Visual identity. Rarely changes. |
| `ui-ux/` | Stable | Layout patterns. Rarely changes. |
| `architecture/` | Updating | Being rewritten for Expo/R3F migration. |
| `guides/` | Updating | Being rewritten for Expo dev workflow. |
| `plans/` | Append-only | Historical plans preserved. New plans added. |

---

## Key Conventions

- **Engine-agnostic code** (ECS, Zustand, pure systems) ports verbatim between engines
- **Engine-specific code** (scene rendering, input, mesh builders) requires full rewrite
- All game balance values live in JSON config files under `config/`, not hardcoded in systems
- Test files are co-located with source: `foo.ts` has `foo.test.ts` beside it
- The migration is a clean-room rewrite (Approach A), not an incremental port
