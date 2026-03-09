# AGENTS.md -- Grovekeeper Multi-Agent Orchestration

**Purpose:** Guide any AI agent (Claude Code, Cursor, Cline, Windsurf, or custom) to effectively contribute to Grovekeeper. This document defines agent roles, coordination protocols, and the project memory bank that survives between sessions.

**Architecture Migration:** The project has migrated from BabylonJS + Vite + Capacitor to React Three Fiber + Expo SDK 55. All new work targets the Expo/R3F stack.

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

3. **`systemPatterns.md`** -- Architecture decisions. ECS vs Zustand split. R3F declarative scene pattern. Config-driven data hierarchy. How systems compose together.

4. **`techContext.md`** -- Exact tech stack versions (Expo 55, R3F, drizzle-orm, expo-sqlite). Build tooling. Development setup. Known constraints. Dependency notes.

5. **`activeContext.md`** -- **Most important for returning agents.** Current work focus. Recent changes. Active decisions being made. Blockers. What the last session accomplished and what the next session should tackle.

6. **`progress.md`** -- Implementation status tracker. What's built and working. What's partially done. What's not started. Known bugs. Migration status from BabylonJS archive.

### Memory Bank Protocols

**On Session Start (MANDATORY):**
1. Read ALL memory bank files, starting with `activeContext.md` and `progress.md`
2. Read `CLAUDE.md` for project conventions
3. Verify understanding against the codebase before making changes
4. Check `config/` JSON files for game data before hardcoding constants

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

### Orchestrator (Main Claude Code Session)

**Scope:** Coordinates all agents, manages memory bank, handles cross-cutting concerns, resolves conflicts between agent domains.

**Responsibilities:**
- Assign tasks to specialized agents based on domain
- Maintain `activeContext.md` and `progress.md`
- Resolve integration conflicts (e.g., when Scene and UI agents both need a shared type)
- Run final `pnpm check` and `pnpm test` before commits
- Manage the config/ JSON hierarchy and ensure consistency

**Rules:**
- Never delegate memory bank updates -- always do them directly
- Run type checking (`pnpm tsc`) after integrating work from multiple agents
- When in doubt about domain ownership, check the Parallel Work Boundaries table

### Game Systems Agent

**Scope:** ECS systems, game loop logic, growth mechanics, season/weather, resource economy, progression/prestige. Pure logic -- no rendering, no UI.

**Key Files:**
- `src/game/ecs/` -- Miniplex World, components, archetypes
- `src/game/systems/growth.ts` -- 5-stage tree growth with spec formula
- `src/game/systems/weather.ts` -- Weather events (rain/drought/windstorm)
- `src/game/systems/achievements.ts` -- Achievements
- `src/game/systems/prestige.ts` -- Level 25+ prestige + cosmetic borders
- `src/game/systems/gridExpansion.ts` -- Grid expansion (12/16/20/24/32)
- `src/game/systems/levelUnlocks.ts` -- Level-based unlock progression
- `src/game/systems/offlineGrowth.ts` -- Offline growth calculation
- `src/game/systems/harvest.ts` -- Harvest yield + resource drops
- `src/game/systems/stamina.ts` -- Stamina drain + regen
- `src/game/systems/saveLoad.ts` -- Save/load serialization (expo-sqlite via drizzle-orm)
- `src/game/systems/movement.ts` -- Player movement
- `src/game/systems/time.ts` -- Day/night + season cycle
- `src/game/systems/quests.ts` -- Quest/goal generation
- `src/game/systems/discovery.ts` -- Species discovery
- `src/game/systems/recipes.ts` -- Crafting recipes
- `src/game/systems/trading.ts` -- Resource trading
- `src/game/systems/supplyDemand.ts` -- Supply/demand market pricing
- `src/game/systems/travelingMerchant.ts` -- Traveling merchant events
- `src/game/systems/marketEvents.ts` -- Market event system
- `src/game/systems/speciesDiscovery.ts` -- Species discovery progression
- `src/game/stores/gameStore.ts` -- Zustand persistent state
- `src/game/constants/` -- Species, tools, config, resources
- `config/` -- JSON config hierarchy (game balance, species data, recipes)


**Rules:**
- Systems are pure functions: `(world, dt, ...context) => void`
- Write tests BEFORE implementing system logic (Jest, not Vitest)
- ECS for per-frame state, Zustand for persistent state
- All balance values in `config/` JSON files -- never hardcode in systems
- Growth formulas must account for: season multiplier, water bonus, difficulty multiplier, species traits
- No rendering imports (no `three`, no `@react-three/*`, no React Native components)

**Mobile Awareness:**
- deltaTime must be capped at 100ms to prevent death spirals on backgrounded mobile tabs
- Offline growth calculation needed when app resumes from background (Expo AppState)
- Auto-save on app state change (`AppState.addEventListener('change', ...)`)

### Scene Agent

**Scope:** React Three Fiber components, declarative 3D scene, camera, lighting, sky, ground, entity rendering, interaction overlays.

**Architecture:** The old `GameScene.tsx` monolith is GONE. The scene is now composed of declarative R3F components:

```
<Canvas>
  <WorldScene>        -- Camera, Lighting, Sky, Ground
  <EntityLayer>        -- Player, TreeInstances, NpcMeshes, Structures
  <InteractionLayer>   -- SelectionRing, PlacementGhost
</Canvas>
```

Each component owns its own `useFrame` hook. There is no monolithic game loop.

**Key Files:**
- `src/game/scenes/` -- R3F scene components
  - `WorldScene.tsx` -- Camera + Lighting + Sky + Ground composition
  - `EntityLayer.tsx` -- Player + Trees + NPCs + Structures composition
  - `InteractionLayer.tsx` -- Selection ring, placement ghost, tap targets
- `src/game/scene/` -- Scene subsystem components
  - `Camera.tsx` -- Orthographic diorama camera (R3F `<OrthographicCamera>` + drei helpers)
  - `Lighting.tsx` -- Hemisphere + directional lights, day/night sync via `useFrame`
  - `Sky.tsx` -- Procedural sky or environment map
  - `Ground.tsx` -- Biome-blended ground plane with grid overlay
  - `Player.tsx` -- Player mesh component with movement animation
  - `TreeInstances.tsx` -- Instanced tree rendering (drei `<Instances>` / `<Merged>`)
  - `NpcMeshes.tsx` -- NPC mesh rendering with Yuka AI integration
  - `Structures.tsx` -- Structure mesh rendering
  - `SelectionRing.tsx` -- Tile selection indicator
  - `PlacementGhost.tsx` -- Structure placement preview
- `src/game/utils/treeMeshBuilder.ts` -- Species-specific geometry generation (Three.js)
- `src/game/utils/spsTreeGenerator.ts` -- Ported SPS-style tree generator (adapted for Three.js)
- `src/game/utils/seedRNG.ts` -- Seeded RNG for deterministic meshes
- `src/game/utils/gridMath.ts` -- Grid coordinate math


**Rules:**
- Declarative R3F components -- no imperative `scene.add()` calls
- Each visual component owns its `useFrame` hook for per-frame updates
- Use drei helpers (`<OrthographicCamera>`, `<Environment>`, `<Instances>`) over raw Three.js
- Tree meshes must be deterministic (seeded RNG from `species + col + row`)
- Use Three.js `InstancedMesh` (via drei `<Instances>`) for same-species same-stage trees
- Freeze transforms on stage 4 (Old Growth) static geometry (`matrixAutoUpdate = false`)
- Max 50 draw calls total
- No inline `style={{}}` objects in JSX -- use NativeWind classes for any UI overlay within the canvas

**Mobile Awareness:**
- Reduce geometry detail on mobile (fewer segments, simpler trees)
- Shadow map: 512px on mobile, 1024px on desktop
- Test at 375px viewport width
- Use `expo-gl` for WebGL context on native platforms

### UI Agent

**Scope:** HUD, menus, dialogs, responsive layout, touch interactions, accessibility. Uses React Native Reusables + NativeWind (NOT shadcn/ui + Radix).

**Key Files:**
- `src/game/ui/GameUI.tsx` -- Composite HUD + joystick + dialogs
- `src/game/ui/HUD.tsx` -- In-game overlay container
- `src/game/ui/ResourceBar.tsx` -- Timber/Sap/Fruit/Acorn display
- `src/game/ui/StaminaGauge.tsx` -- Stamina bar
- `src/game/ui/ToolBelt.tsx` -- Tool belt HUD (bottom-right)
- `src/game/ui/XPBar.tsx` -- XP + level display
- `src/game/ui/ActionButton.tsx` -- Context-sensitive action button
- `src/game/ui/WeatherOverlay.tsx` -- Weather visual effects
- `src/game/ui/AchievementPopup.tsx` -- Achievement modal
- `src/game/ui/MiniMap.tsx` -- Minimap (desktop overlay, mobile fullscreen)
- `src/game/ui/Toast.tsx` -- Toast notification system
- `src/game/ui/FloatingParticles.tsx` -- +XP / +Timber floating numbers
- `src/game/ui/SeedSelect.tsx` -- Species picker dialog
- `src/game/ui/PauseMenu.tsx` -- Pause overlay + settings
- `src/game/ui/MainMenu.tsx` -- Start screen
- `src/game/ui/ErrorBoundary.tsx` -- React error boundary
- `src/components/ui/` -- React Native Reusables primitives

**Rules:**
- React Native Reusables for structural components (Dialog, Button, Card, Progress)
- NativeWind classes everywhere -- **no inline `style={{}}` objects**
- Design tokens defined in `tailwind.config.js`, not scattered constants
- All touch targets >= 44x44px
- Joystick zone (bottom-left 200x200px) is sacred -- nothing overlaps it
- Test every UI change at 375px width minimum
- Use `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` for all animations
- Components must work on both web and native (no `div`, `span` -- use `View`, `Text`, `Pressable`)

**Mobile Awareness:**
- This IS the mobile agent. Everything is mobile-first.
- Portrait orientation is the primary layout
- Desktop adaptations use responsive NativeWind breakpoints (`sm:`, `md:`, `lg:`)
- Joystick hidden on desktop (>768px), show WASD hints instead
- Tool belt layout: bottom-right on mobile, right sidebar on desktop

### Infrastructure Agent

**Scope:** CI/CD, Expo configuration, database (expo-sqlite + drizzle-orm), config/ JSON hierarchy, Metro bundler, EAS Build.

**Key Files:**
- `app.json` / `app.config.ts` -- Expo app configuration
- `metro.config.js` -- Metro bundler configuration
- `tailwind.config.js` -- NativeWind / design token configuration
- `drizzle.config.ts` -- Drizzle ORM configuration
- `src/db/` -- Database schema, migrations, connection
- `config/` -- JSON config hierarchy
  - `config/species.json` -- Tree species definitions
  - `config/recipes.json` -- Crafting recipes
  - `config/balance.json` -- Game balance tuning values
  - `config/structures.json` -- Structure templates
  - `config/quests.json` -- Quest definitions
  - `config/achievements.json` -- Achievement definitions
- `.github/workflows/` -- CI/CD pipelines
- `eas.json` -- EAS Build configuration
- `biome.json` -- Lint/format rules
- `tsconfig.json` -- TypeScript config
- `jest.config.ts` -- Jest test configuration

**Rules:**
- Config JSON files are imported statically via Metro -- no dynamic `require()` or `fetch()`
- Database migrations via drizzle-kit
- expo-sqlite for native + web (WASM fallback on web)
- EAS Build for iOS + Android distribution
- Expo Router for navigation (if applicable)
- All environment-specific values in `app.config.ts`, never hardcoded

### Testing Agent

**Scope:** Unit tests (Jest), component tests (@testing-library/react-native), E2E tests (Maestro), type checking, linting, performance audits.

**Key Files:**
- `src/game/systems/*.test.ts` -- System unit tests
- `src/game/stores/*.test.ts` -- Store action tests
- `src/game/ecs/*.test.ts` -- ECS tests
- `src/game/utils/*.test.ts` -- Utility function tests
- `src/game/constants/*.test.ts` -- Constant validation tests
- `maestro/` -- Maestro E2E test flows (YAML)
- `jest.config.ts` -- Jest configuration
- `biome.json` -- Lint/format rules
- `tsconfig.json` -- Type checking config

**Rules:**
- TDD: write the test, watch it fail, implement, watch it pass
- Jest (NOT Vitest) -- Expo's default test runner
- Pure functions (grid math, RNG, systems) get unit tests
- Store actions get state transition tests
- UI components get render + interaction tests via `@testing-library/react-native`
- E2E flows via Maestro (YAML-based, runs on simulators/devices)
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

**Maestro E2E Pattern:**

```yaml
appId: com.grovekeeper.app
---
- launchApp
- assertVisible: "Start Game"
- tapOn: "Start Game"
- assertVisible: "Level 1"
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
| ECS Systems | `src/game/ecs/`, `src/game/systems/` | UI, Scene, Tests |
| R3F Scene | `src/game/scenes/`, `src/game/scene/` | Systems, UI, Tests |
| UI Components | `src/game/ui/`, `src/components/ui/` | Systems, Scene, Tests |
| Store Logic | `src/game/stores/` | Scene, UI |
| World System | `src/game/world/` | UI, Tests |
| NPC System | `src/game/npcs/` | UI, Tests |
| Config Data | `config/` | Nothing (shared dependency) |
| Database | `src/db/` | Systems, Scene, UI |
| Tests | `*.test.ts(x)` | Everything |

**No Single Conflict Zone:** Unlike the old BabylonJS architecture, there is no monolithic integration file. The R3F `<Canvas>` composes independent components. However, be careful with:
- `src/game/ecs/world.ts` -- shared ECS world definition (coordinate changes)
- `src/game/stores/gameStore.ts` -- shared persistent state (coordinate changes)
- `config/` JSON files -- shared game data (coordinate changes)
- `tailwind.config.js` -- shared design tokens (coordinate changes)

### Implementation Status Tracking

Documentation lives in `docs/`. Track implementation status in `memory-bank/progress.md` using this format:

```markdown
## Implementation Status
- [x] Growth system -- 5-stage, spec formula, all multipliers
- [x] Weather system -- rain/drought/windstorm with visual overlays
- [ ] R3F scene migration -- porting BabylonJS visuals to R3F
- [ ] expo-sqlite integration -- replacing localStorage persistence
```

---

## Maintenance and Enhancement

### Completed Phases (BabylonJS Era -- Archived)

**Phase A: Foundation Alignment** -- COMPLETE (archived)
- 5-stage growth model, resource economy (Timber/Sap/Fruit/Acorns), stamina system, seeded RNG, grid math utilities

**Phase B: Content Completeness** -- COMPLETE (archived)
- 15 tree species (12 base + 3 prestige), 8 tools with stamina costs, tile types (soil/water/rock/path), species-specific SPS tree meshes

**Phase C: Progression and Retention** -- COMPLETE (archived)
- 15 achievements, prestige system (level 25+ with 5 cosmetic borders), quest system, grid expansion (12/16/20/24/32), XP formula

**Phase D: Polish and Ship** -- COMPLETE (archived)
- Design tokens CSS, typography, toast notifications, floating particles, growth animations, weather overlays, PWA manifest + service worker, save system with offline growth, code splitting, desktop adaptations

**World Architecture Overhaul** -- COMPLETE (archived)
- Scene decomposition, multi-zone world system, procedural world generation, structure system, orthographic diorama camera, HDRI skybox, SVG minimap, build mode UI

### Current: Expo/R3F Migration

**Phase M1: Foundation** -- Port core systems
- [ ] Expo SDK 55 project scaffold (app.json, metro.config.js, eas.json)
- [ ] Miniplex ECS world + archetypes (port from archive)
- [ ] Zustand stores (port from archive, replace localStorage with expo-sqlite)
- [ ] Config JSON hierarchy in config/ (extract from scattered constants)
- [ ] Jest test suite (port from Vitest)
- [ ] NativeWind + tailwind.config.js with design tokens

**Phase M2: Scene** -- Declarative R3F scene
- [ ] R3F `<Canvas>` + `<WorldScene>` (Camera, Lighting, Sky, Ground)
- [ ] `<EntityLayer>` (Player, TreeInstances, NpcMeshes, Structures)
- [ ] `<InteractionLayer>` (SelectionRing, PlacementGhost)
- [ ] Tree mesh generation ported to Three.js geometry
- [ ] Instanced rendering for trees (drei `<Instances>`)

**Phase M3: UI** -- React Native Reusables
- [ ] HUD components (ResourceBar, StaminaGauge, XPBar, ToolBelt)
- [ ] Menus (MainMenu, PauseMenu, SeedSelect)
- [ ] Dialogs and overlays (Achievement, Toast, Weather)
- [ ] Input system (gesture handler for mobile, keyboard for desktop)

**Phase M4: Data** -- expo-sqlite + drizzle-orm
- [ ] Database schema and migrations
- [ ] Save/load system via drizzle-orm
- [ ] Offline growth calculation on AppState change

**Phase M5: Distribution**
- [ ] EAS Build for iOS + Android
- [ ] Expo web export for browser play
- [ ] Maestro E2E test flows
- [ ] App store assets and metadata

### Phase F: Future Enhancements (IDEAS)

- Sound and audio (expo-av, ambient, SFX, seasonal music)
- Social features (visit friend groves, leaderboards)
- Additional content (more species, tools, achievements)
- Accessibility audit (screen reader, color-blind mode, reduced motion enhancements)
- Localization / i18n (expo-localization)
- Seasonal events (holiday-themed weather, limited species)
- Push notifications for offline growth (expo-notifications)

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase.tsx | `ToolBelt.tsx` |
| R3F Scene Components | PascalCase.tsx | `TreeInstances.tsx` |
| Hooks | useCamelCase.ts | `useGameLoop.ts` |
| Systems | camelCase.ts | `growth.ts` |
| Tests | *.test.ts(x) | `growth.test.ts` |
| Stores | camelCaseStore.ts | `gameStore.ts` |
| Constants | camelCase.ts | `trees.ts` |
| Utilities | camelCase.ts | `gridMath.ts` |
| Config JSON | camelCase.json | `species.json` |
| Maestro Flows | kebab-case.yaml | `plant-tree-flow.yaml` |

## Import Order (Biome-enforced)

1. React / React Native (`react`, `react-native`)
2. Expo (`expo-*`, `@expo/*`)
3. Three.js / R3F (`three`, `@react-three/fiber`, `@react-three/drei`)
4. Third-party (`zustand`, `miniplex`, `drizzle-orm`, `yuka`)
5. Internal absolute (`~/components/*`, `~/lib/*`)
6. Relative game imports (`../stores/*`, `../systems/*`)
7. Config imports (`../../config/*`)

## Key Principle: Mobile-First Everything

This is not a web app that happens to work on mobile. This is a **mobile game** that happens to work on desktop. Every agent, every decision, every line of code should ask: *"Does this work on a phone in portrait mode during a commute?"*

- 3-15 minute sessions, not hour-long marathons
- One-handed play with thumb on joystick
- Forgiving touch targets, not pixel-precise clicking
- Instant resume from background, auto-save on exit
- Low battery drain (cap frame rate, minimize GPU work)
- Works offline after initial load
- Universal: one codebase for iOS, Android, and web (Expo)
