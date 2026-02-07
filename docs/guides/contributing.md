# Contributing

This guide covers how to contribute to Grovekeeper, including agent roles for AI-assisted development, parallel work boundaries, and the memory bank protocol that preserves context between sessions.

## Agent Roles

Development is organized around four specialized roles. Each role owns specific files and has clear boundaries.

### Game Systems Architect

**Scope:** ECS systems, game loop, growth mechanics, season/weather, resource economy, progression and prestige.

**Owned files:**
- `src/game/ecs/` -- World, components, archetypes
- `src/game/systems/` -- All system modules
- `src/game/stores/gameStore.ts` -- Persistent state and actions
- `src/game/constants/` -- Species, tools, config, resources

**Key rules:**
- Systems are pure functions: `(world, deltaTime, ...context) => void`
- Write tests before implementing system logic.
- ECS for per-frame state, Zustand for persistent state.
- All balance values in `constants/` -- never hardcode in systems.
- Growth formulas must account for season, water, difficulty, and species traits.

### 3D Scene Engineer

**Scope:** BabylonJS rendering, procedural meshes, camera, lighting, performance budgets.

**Owned files:**
- `src/game/scenes/GameScene.tsx` -- Scene initialization + render loop
- `src/game/utils/spsTreeGenerator.ts` -- SPS tree mesh generator
- `src/game/utils/treeMeshBuilder.ts` -- Species-specific PBR meshes
- `src/game/systems/time.ts` -- Sky colors, seasonal visuals

**Key rules:**
- All meshes built from BabylonJS primitives -- no external model loading.
- Tree meshes must be deterministic (seeded RNG from species + position).
- Use template caching and `Mesh.clone()` for same-species trees.
- Freeze world matrices on static geometry.
- Max 50 draw calls total. Shadow map: 512px mobile, 1024px desktop.
- BabylonJS operates outside React render cycle -- use refs, not state.

### UI/UX Developer

**Scope:** HUD, menus, dialogs, responsive layout, touch interactions, accessibility.

**Owned files:**
- `src/game/ui/` -- All 23 UI components
- `src/components/ui/` -- shadcn/ui primitives
- `src/hooks/` -- Custom React hooks

**Key rules:**
- shadcn/ui for structural components (Dialog, Button, Card, Progress).
- Tailwind for responsive layout utilities.
- All touch targets >= 44x44px.
- Joystick zone (bottom-left 200x200px) is reserved -- no overlapping elements.
- Test every UI change at 375px viewport width (iPhone SE).
- Mobile portrait is the primary layout; desktop is a graceful enhancement.

### Testing and Quality

**Scope:** Unit tests, integration tests, type checking, linting, performance audits.

**Owned files:**
- `src/game/**/*.test.ts(x)` -- All test files
- `vitest.config.ts` -- Test configuration
- `biome.json` -- Lint and format rules

**Key rules:**
- TDD: write the test, watch it fail, implement, watch it pass.
- Pure functions get unit tests. Store actions get state transition tests.
- Run `pnpm check` before any commit.

## Parallel Work Boundaries

These domains can be worked on simultaneously without merge conflicts:

| Domain          | Files                         | Can Work In Parallel With |
|-----------------|-------------------------------|---------------------------|
| ECS Systems     | `src/game/ecs/`, `src/game/systems/` | UI, Tests          |
| UI Components   | `src/game/ui/`                | Systems, Tests            |
| Store Logic     | `src/game/stores/`            | 3D Scene                  |
| 3D Scene        | `src/game/scenes/`            | Store, UI                 |
| Tests           | `*.test.ts(x)`                | Everything                |
| Constants/Data  | `src/game/constants/`         | Nothing (shared dependency) |

### Conflict Zone

**`GameScene.tsx`** is the integration point where ECS, 3D rendering, UI, and store logic all converge. Only one contributor should modify this file at a time. If multiple changes are needed, coordinate to apply them sequentially.

## Memory Bank Protocol

The memory bank (`memory-bank/` directory) is the persistent context that survives between development sessions. It is critical for AI agents whose context resets between conversations.

### Structure

```
memory-bank/
├── projectbrief.md      # Foundation -- core requirements, goals, scope
├── productContext.md     # Why this exists, target audience, UX goals
├── systemPatterns.md     # Architecture decisions, component relationships
├── techContext.md        # Tech stack versions, setup, known constraints
├── activeContext.md      # Current focus, recent changes, next steps
├── progress.md           # What works, what is left, known issues
└── features/             # Deep dives on complex subsystems
```

### On Session Start (Required)

1. Read all memory bank files, starting with `activeContext.md` and `progress.md`.
2. Read `CLAUDE.md` for project conventions.
3. Verify understanding against the codebase before making changes.

### On Session End (Required)

1. Update `activeContext.md` with what was accomplished, decisions made, and next steps.
2. Update `progress.md` if implementation status changed.
3. Update other files if new patterns, tech changes, or architectural decisions were made.

### Session Handoff Format

Every session should end by writing to `activeContext.md`:

```markdown
## Last Session (YYYY-MM-DD)

### Completed
- [What was built, fixed, or changed]

### Decisions Made
- [Any architectural or design choices]

### Blockers / Open Questions
- [Anything that needs resolution]

### Next Steps
- [Priority-ordered list of what to do next]
```

## Development Workflow

### Before Starting Work

1. Read the memory bank (see protocol above).
2. Run `pnpm test:run` to confirm existing tests pass.
3. Run `pnpm check` to confirm lint/format compliance.
4. Identify which files you will modify and check for conflicts with other active work.

### During Development

1. Write tests first for new systems or utilities.
2. Make changes in small, testable increments.
3. Run `pnpm test` in watch mode to catch regressions immediately.
4. Keep `GameScene.tsx` modifications minimal and focused.

### Before Committing

1. Run `pnpm check` -- lint and format must pass.
2. Run `pnpm test:run` -- all tests must pass.
3. Run `pnpm tsc` -- TypeScript must compile without errors.
4. Verify mobile layout at 375px viewport width for any UI changes.

## Game Design Reference

The game design documentation lives in the `docs/game-design/` directory:

- [Core Loop](../game-design/core-loop.md) -- Session flow, game loop
- [Grid System](../game-design/grid-system.md) -- Tiles, expansion, coordinates
- [Tree Catalog](../game-design/tree-catalog.md) -- 15 species (12 base + 3 prestige), growth stages
- [Tools](../game-design/tools.md) -- 8 tools, stamina costs
- [Economy](../game-design/economy.md) -- Resources, seed costs, harvesting
- [Progression](../game-design/progression.md) -- XP, levels, achievements, prestige
- [Seasons and Weather](../game-design/seasons-weather.md) -- Day/night, seasons, weather events

See also: [Brand Identity](../brand/identity.md), [Design Tokens](../brand/design-tokens.md), [HUD Layout](../ui-ux/hud-layout.md).

## Useful Links

- [Architecture Overview](../architecture/overview.md) -- Tech stack, directory layout, data flow
- [ECS Patterns](../architecture/ecs-patterns.md) -- Entity interface, queries, system conventions
- [State Management](../architecture/state-management.md) -- Zustand store shape and actions
- [Rendering](../architecture/rendering.md) -- BabylonJS scene, meshes, animations
- [Performance](../architecture/performance.md) -- Budgets, optimizations, code splitting
- [Getting Started](./getting-started.md) -- Installation, dev server, testing
- [Coding Standards](./coding-standards.md) -- Naming, imports, Biome config, test patterns
