# AGENTS.md -- Grovekeeper Multi-Agent Orchestration

**Purpose:** Guide any AI agent (Claude Code, Cursor, Cline, Windsurf, or custom) to effectively contribute to Grovekeeper. This document defines agent roles, coordination protocols, and the project memory bank that survives between sessions.

---

## Memory Bank

Every agent's context resets between sessions. The Memory Bank is the **only persistent link** between work sessions. Agents MUST read all memory bank files at the start of EVERY task.

### Memory Bank Structure

```
memory-bank/
├── projectbrief.md      # Foundation -- core requirements, goals, scope
├── productContext.md     # Why this exists, who it's for, UX goals
├── systemPatterns.md     # Architecture, patterns, component relationships
├── techContext.md        # Tech stack, setup, constraints, dependencies
├── activeContext.md      # Current focus, recent changes, next steps
├── progress.md           # What works, what's left, known issues
└── features/             # Deep dives on complex subsystems
    ├── tree-catalog.md   # Species data, growth mechanics
    ├── ecs-systems.md    # ECS architecture details
    └── mobile-ux.md      # Mobile-first patterns and constraints
```

### File Hierarchy

```
projectbrief.md ──┬──> productContext.md ──┐
                  ├──> systemPatterns.md ──┼──> activeContext.md ──> progress.md
                  └──> techContext.md ──────┘
```

Lower files build on higher files. `projectbrief.md` is the root of truth. `activeContext.md` and `progress.md` change most frequently.

### Core Files

1. **`projectbrief.md`** -- Foundation document. Defines core requirements, scope, and success criteria. Created once, rarely changed. Source of truth for project direction.

2. **`productContext.md`** -- Why Grovekeeper exists. Problems it solves. Target audience. UX goals. Mobile-first philosophy. Session design (3-15 min commute play).

3. **`systemPatterns.md`** -- Architecture decisions. ECS vs Zustand split. BabylonJS scene management. Component conventions. How systems compose together.

4. **`techContext.md`** -- Exact tech stack versions. Build tooling. Development setup. Known constraints. Dependency notes. What works, what's brittle.

5. **`activeContext.md`** -- **Most important for returning agents.** Current work focus. Recent changes. Active decisions being made. Blockers. What the last session accomplished and what the next session should tackle.

6. **`progress.md`** -- Implementation status tracker. What's built and working. What's partially done. What's not started. Known bugs.

### Memory Bank Protocols

**On Session Start (MANDATORY):**
1. Read ALL memory bank files, starting with `activeContext.md` and `progress.md`
2. Read `CLAUDE.md` for project conventions
3. Verify understanding against the codebase before making changes

**On Session End (MANDATORY):**
1. Update `activeContext.md` with what was accomplished, decisions made, and next steps
2. Update `progress.md` if implementation status changed
3. Update other files if new patterns, tech changes, or architectural decisions were made

**Trigger: "update memory bank":**
When explicitly asked, review EVERY memory bank file -- even those that seem unchanged. Focus especially on `activeContext.md` and `progress.md`.

**When to Create New Memory Files:**
- Complex feature documentation -> `memory-bank/features/`
- API or integration specs -> `memory-bank/features/`
- Testing strategies for specific systems -> `memory-bank/features/`
- Deployment procedures -> `memory-bank/features/`

---

## Agent Roles

### Game Systems Architect

**Scope:** ECS systems, game loop, growth mechanics, season/weather, resource economy, progression/prestige.

**Key Files:**
- `src/game/ecs/` -- World, components, archetypes
- `src/game/systems/growth.ts` -- 5-stage tree growth with spec formula
- `src/game/systems/weather.ts` -- Weather events (rain/drought/windstorm)
- `src/game/systems/achievements.ts` -- 15 achievements
- `src/game/systems/prestige.ts` -- Level 25+ prestige + cosmetic borders
- `src/game/systems/gridExpansion.ts` -- Grid expansion (12/16/20/24/32)
- `src/game/systems/levelUnlocks.ts` -- Level-based unlock progression
- `src/game/systems/offlineGrowth.ts` -- Offline growth calculation
- `src/game/systems/harvest.ts` -- Harvest yield + resource drops
- `src/game/systems/stamina.ts` -- Stamina drain + regen
- `src/game/systems/saveLoad.ts` -- Save/load serialization
- `src/game/systems/movement.ts` -- Player movement
- `src/game/systems/time.ts` -- Day/night + season cycle
- `src/game/systems/quests.ts` -- Quest/goal generation
- `src/game/stores/gameStore.ts` -- Persistent state
- `src/game/constants/` -- Species, tools, config, resources
- See `docs/game-design/` and `docs/architecture/` for design reference

**Rules:**
- Systems are pure functions: `(world, dt, ...context) => void`
- Write tests BEFORE implementing system logic
- ECS for per-frame state, Zustand for persistent state
- All balance values in `constants/` -- never hardcode in systems
- Growth formulas must account for: season multiplier, water bonus, difficulty multiplier, species traits

**Mobile Awareness:**
- deltaTime must be capped at 100ms to prevent death spirals on backgrounded mobile tabs
- Offline growth calculation needed when app resumes from background
- Auto-save on `document.visibilitychange`

### 3D Scene Engineer

**Scope:** BabylonJS rendering, procedural meshes, camera, lighting, shadows, performance, scene modules.

**Key Files:**
- `src/game/scenes/GameScene.tsx` -- ~400-line orchestrator (delegates to scene managers)
- `src/game/scene/SceneManager.ts` -- Engine + Scene creation/disposal
- `src/game/scene/CameraManager.ts` -- Orthographic diorama camera (viewport-adaptive 14-40 tiles)
- `src/game/scene/LightingManager.ts` -- Hemisphere + directional light, day/night sync
- `src/game/scene/GroundBuilder.ts` -- DynamicTexture biome blending (distance fields)
- `src/game/scene/SkyManager.ts` -- HDRI skybox + IBL environment
- `src/game/scene/PlayerMeshManager.ts` -- Player mesh lifecycle
- `src/game/scene/TreeMeshManager.ts` -- Template cache, clone, growth lerp, matrix freezing
- `src/game/scene/BorderTreeManager.ts` -- Decorative border tree placement
- `src/game/structures/BlockMeshFactory.ts` -- Procedural structure mesh generation
- `src/game/utils/treeMeshBuilder.ts` -- Species-specific mesh generation
- `src/game/utils/spsTreeGenerator.ts` -- Ported SPS Tree Generator
- `src/game/utils/seedRNG.ts` -- Seeded RNG for deterministic meshes
- `src/game/utils/gridMath.ts` -- Grid coordinate math
- `src/game/systems/time.ts` -- Sky colors, seasonal visuals
- See `docs/architecture/` for rendering architecture reference

**Rules:**
- All meshes built from BabylonJS primitives -- no external model loading
- Tree meshes must be deterministic (seeded RNG from `species + col + row`)
- Use SPS template mesh caching (`Mesh.clone`) for same-species same-stage trees
- Freeze world matrices on stage 4 (Old Growth) static geometry
- Shadow map: 512px on mobile, 1024px on desktop
- Max 50 draw calls total
- BabylonJS operates outside React render cycle -- use refs, not state

**Mobile Awareness:**
- Reduce particle counts on mobile
- Simpler shadow maps on mobile
- Lower tessellation for distant trees
- Test at 375px viewport width

### UI/UX Developer

**Scope:** HUD, menus, dialogs, responsive layout, touch interactions, accessibility.

**Key Files:**
- `src/game/ui/GameUI.tsx` -- Composite HUD + joystick + dialogs
- `src/game/ui/HUD.tsx` -- In-game overlay container
- `src/game/ui/ResourceBar.tsx` -- Timber/Sap/Fruit/Acorn display
- `src/game/ui/StaminaGauge.tsx` -- Stamina bar
- `src/game/ui/ToolBelt.tsx` -- Tool belt HUD (bottom-right)
- `src/game/ui/XPBar.tsx` -- XP + level display
- `src/game/ui/ActionButton.tsx` -- Context-sensitive action button
- `src/game/ui/WeatherOverlay.tsx` -- CSS weather effects + petals
- `src/game/ui/AchievementPopup.tsx` -- Gold border + sparkle modal
- `src/game/ui/MiniMap.tsx` -- Desktop-only canvas mini-map
- `src/game/ui/Toast.tsx` -- Toast notification system
- `src/game/ui/FloatingParticles.tsx` -- +XP / +Timber floating numbers
- `src/game/ui/SeedSelect.tsx` -- Species picker dialog
- `src/game/ui/PauseMenu.tsx` -- Pause overlay + settings
- `src/game/ui/MainMenu.tsx` -- Start screen
- `src/game/ui/ErrorBoundary.tsx` -- React error boundary
- `src/components/ui/` -- shadcn/ui primitives
- See `docs/ui-ux/` and `docs/brand/` for design reference

**Rules:**
- shadcn/ui for structural components (Dialog, Button, Card, Progress)
- Tailwind for responsive layout utilities
- Game-specific colors via inline styles from `COLORS` constants
- All touch targets >= 44x44px
- Joystick zone (bottom-left 200x200px) is sacred -- nothing overlaps it
- Test every UI change at 375px width minimum
- Transitions: 150ms ease-out default, 600ms ease-in-out for growth animations
- Use `prefers-reduced-motion` media query for all animations

**Mobile Awareness:**
- This IS the mobile agent. Everything is mobile-first.
- Portrait orientation is the primary layout
- Desktop adaptations use `sm:`, `md:`, `lg:` Tailwind breakpoints
- Joystick hidden on desktop (>768px), show WASD hints instead
- Tool belt layout: bottom-right on mobile, right sidebar on desktop

### World and Structure Architect

**Scope:** Zone system, world generation, structure placement, multi-zone world data.

**Key Files:**
- `src/game/world/types.ts` -- ZoneDefinition, WorldDefinition interfaces
- `src/game/world/WorldManager.ts` -- Zone loading/unloading, tile management, structure rendering
- `src/game/world/WorldGenerator.ts` -- Procedural world generation from seed + player level
- `src/game/world/archetypes.ts` -- Zone archetype definitions
- `src/game/world/data/starting-world.json` -- Starting world (3 zones)
- `src/game/structures/types.ts` -- BlockDefinition, StructureTemplate interfaces
- `src/game/structures/StructureManager.ts` -- Placement validation, effect radius queries
- `src/game/structures/BlockMeshFactory.ts` -- Procedural mesh generation from block definitions
- `src/game/structures/data/blocks.json` -- Block catalog
- `src/game/structures/data/structures.json` -- 6 structure templates
- `src/game/ui/BuildPanel.tsx` -- Build mode UI
- `src/game/ui/PlacementGhost.tsx` -- Placement preview overlay

**Rules:**
- Zones defined in JSON (data-driven, not hardcoded)
- WorldGenerator must be deterministic (seeded RNG from world seed)
- Zone complexity scales with player level (1-4: grove only; 20+: 8-12 zones)
- Structure effects must compose (growth_boost + harvest_boost stack)
- Prestige resets generate fresh worlds from new seeds

### Testing and Quality Agent

**Scope:** Unit tests, integration tests, type checking, linting, performance audits.

**Current Status:** 516 tests across 25 test files. TypeScript clean. Zero lint errors.

**Test Files:**
- `src/game/systems/growth.test.ts`
- `src/game/systems/weather.test.ts`
- `src/game/systems/achievements.test.ts`
- `src/game/systems/prestige.test.ts`
- `src/game/systems/gridExpansion.test.ts`
- `src/game/systems/gridGeneration.test.ts`
- `src/game/systems/levelUnlocks.test.ts`
- `src/game/systems/offlineGrowth.test.ts`
- `src/game/systems/harvest.test.ts`
- `src/game/systems/saveLoad.test.ts`
- `src/game/systems/stamina.test.ts`
- `src/game/systems/movement.test.ts`
- `src/game/stores/gameStore.test.ts`
- `src/game/ecs/world.test.ts`
- `src/game/ecs/archetypes.test.ts`
- `src/game/utils/treeMeshBuilder.test.ts`
- `src/game/utils/gridMath.test.ts`
- `src/game/utils/seedRNG.test.ts`
- `src/game/constants/trees.test.ts`
- `src/game/constants/tools.test.ts`
- `src/game/hooks/useKeyboardInput.test.ts`
- `src/game/world/WorldManager.test.ts`
- `src/game/world/WorldGenerator.test.ts`
- `vitest.config.ts` -- Test configuration
- `biome.json` -- Lint/format rules
- `tsconfig.json` -- Type checking config

**Rules:**
- TDD: write the test, watch it fail, implement, watch it pass
- Pure functions (grid math, RNG, systems) get unit tests
- Store actions get state transition tests
- UI components get render + interaction tests via @testing-library/react
- Coverage targets: 80%+ for logic, 60%+ overall
- Run `pnpm check` before any commit

**Test Pattern:**
```typescript
describe('systemName', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## Coordination Protocols

### Handoff Between Sessions

Every session must end by writing to `memory-bank/activeContext.md`:

```markdown
## Last Session (YYYY-MM-DD)
### Completed
- [What was built/fixed/changed]

### Decisions Made
- [Any architectural or design choices]

### Blockers / Open Questions
- [Anything that needs resolution]

### Next Steps
- [Priority-ordered list of what to do next]
```

### Parallel Work Boundaries

Agents can work in parallel on these independent domains:

| Domain | Files | Can Parallel With |
|--------|-------|-------------------|
| ECS Systems | `src/game/ecs/`, `src/game/systems/` | UI, Tests |
| UI Components | `src/game/ui/` | Systems, Tests |
| Store Logic | `src/game/stores/` | 3D Scene |
| 3D Scene | `src/game/scenes/`, `src/game/scene/` | Store, UI |
| World System | `src/game/world/` | UI, Tests |
| Structures | `src/game/structures/` | UI, Tests |
| Tests | `*.test.ts(x)` | Everything |
| Constants/Data | `src/game/constants/` | Nothing (shared dependency) |

**Conflict Zone:** `GameScene.tsx` is the integration point where ECS, 3D, UI, and store all meet. Only one agent should modify it at a time.

### Implementation Status Tracking

Documentation lives in `docs/`. Track implementation status in `memory-bank/progress.md` using this format:

```markdown
## Implementation Status
- [x] Growth system -- 5-stage, spec formula, all multipliers
- [x] Weather system -- rain/drought/windstorm with CSS overlays
- [x] Achievement system -- 15 achievements with popup UI
- [ ] Sound/Audio -- Not started
```

---

## Maintenance and Enhancement

### Completed Phases

**Phase A: Foundation Alignment** -- COMPLETE
- 5-stage growth model, resource economy (Timber/Sap/Fruit/Acorns), stamina system, seeded RNG, grid math utilities

**Phase B: Content Completeness** -- COMPLETE
- 11 tree species (8 base + 3 prestige), 8 tools with stamina costs, tile types (soil/water/rock/path), species-specific SPS tree meshes

**Phase C: Progression and Retention** -- COMPLETE
- 15 achievements, prestige system (level 25+ with 5 cosmetic borders), quest system, grid expansion (12/16/20/24/32), XP formula

**Phase D: Polish and Ship** -- COMPLETE
- Design tokens CSS, Fredoka + Nunito typography, toast notifications, floating particles, growth animations, weather overlays (rain/drought/windstorm/cherry petals), PWA manifest + service worker, save system with offline growth, code splitting (~107 KB initial), desktop adaptations (mini-map, keyboard badges)

**World Architecture Overhaul** -- COMPLETE
- Scene decomposition (1050-line monolith -> ~400-line orchestrator + 8 scene managers)
- Multi-zone world system with data-driven zones from JSON
- Procedural world generation (level-based complexity, prestige resets)
- Structure system (6 types with grid-snap placement + effect radii)
- Orthographic diorama camera (replaced isometric), DynamicTexture biome blending
- HDRI skybox, SVG minimap with miniplex-react, build mode UI
- 516 tests across 25 files. Zero lint errors.

### Phase E: Native and Distribution (TODO)

- Capacitor build for iOS + Android
- App store assets (screenshots, descriptions)
- Analytics (session tracking, funnel metrics)
- Push notifications for offline growth
- Deep link support

### Phase F: Future Enhancements (IDEAS)

- Sound and audio (ambient, SFX, seasonal music)
- Social features (visit friend groves, leaderboards)
- Additional content (more species, tools, achievements)
- Accessibility audit (screen reader, color-blind mode, reduced motion enhancements)
- Localization / i18n
- Seasonal events (holiday-themed weather, limited species)

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase.tsx | `ToolBelt.tsx` |
| Hooks | useCamelCase.ts | `useGameLoop.ts` |
| Systems | camelCase.ts | `growth.ts` |
| Tests | *.test.ts(x) | `growth.test.ts` |
| Stores | camelCaseStore.ts | `gameStore.ts` |
| Constants | camelCase.ts | `trees.ts` |
| Utilities | camelCase.ts | `gridMath.ts` |

## Import Order (Biome-enforced)

1. React / framework (`react`, `react-dom`)
2. Third-party (`@babylonjs/*`, `zustand`, `nipplejs`, `miniplex`)
3. Internal absolute (`@/components/*`, `@/lib/*`)
4. Relative game imports (`../stores/*`, `../systems/*`)
5. Style imports

## Key Principle: Mobile-First Everything

This is not a web app that happens to work on mobile. This is a **mobile game** that happens to work on desktop. Every agent, every decision, every line of code should ask: *"Does this work on a phone in portrait mode during a commute?"*

- 3-15 minute sessions, not hour-long marathons
- One-handed play with thumb on joystick
- Forgiving touch targets, not pixel-precise clicking
- Instant resume from background, auto-save on exit
- Low battery drain (cap frame rate, minimize GPU work)
- Works offline after initial load
