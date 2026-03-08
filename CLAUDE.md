# CLAUDE.md -- Grovekeeper

## Mandatory Workflow: Docs > Tests > Code

**This is the single most important rule in the project.** Every agent session must follow this pipeline:

```
GAME_SPEC.md  ->  *.test.ts  ->  *.ts  ->  wire to game loop  ->  update spec status
```

1. **Nothing is implemented without a spec section.** If you want to build something, write it in `docs/GAME_SPEC.md` first.
2. **Nothing is specced without tests.** Before writing implementation code, write tests that reference the spec section.
3. **Nothing is tested without implementation.** Make the tests pass.
4. **Nothing is implemented without being wired up.** Connect to the game loop, UI, or store.

See `.claude/skills/docs-first-pipeline.md` for the full workflow.

### When the user gives you a concept or story:
1. Translate it to a spec section in `docs/GAME_SPEC.md`
2. **DO NOT write code.** Stop after the spec.

### When you're implementing a specced section:
1. Read the spec section
2. Write tests first (each test references the spec section number)
3. Write implementation
4. Wire it up
5. Update spec status

### When you're fixing a bug:
1. Find the spec section -- what should happen?
2. Write a failing test
3. Fix the code
4. If the spec was wrong, fix the spec too

---

## Project Identity

**Grovekeeper** is a cozy first-person grove-tending simulation. Mobile-first native app (portrait-primary), built with Expo and React Three Fiber. Target session: 3-15 minutes (commute-friendly).

**Tagline:** *"Every forest begins with a single seed."*

**Perspective:** First-person with held tool model. The player DIG, CHOP, WATER, PLANT, PRUNE -- every action must feel physical and embodied. See `docs/plans/2026-03-06-fps-perspective-design.md` for the full design.

**Architecture patterns** are fully documented in `docs/architecture/` — input system, FPS camera, tool view model. No need to reference external codebases.

---

## Hard Rules

These are non-negotiable. The `.claude/hooks/` directory enforces several automatically.

| Rule | Enforced by | Details |
|------|-------------|---------|
| Spec before code | `spec-coverage-check.sh` | Every game system file needs a GAME_SPEC.md section |
| No file over 300 lines | `file-size-sentinel.sh` | Decompose into subpackage with index.ts barrel |
| No Math.random() | `no-math-random.sh` | Use `scopedRNG(scope, worldSeed, ...extra)` from `game/utils/seedRNG.ts` |
| No inline tuning constants | `no-magic-numbers.sh` | Put numbers in `config/game/*.json`, load at runtime |
| Quality gate on commit | `pre-commit-quality.sh` | `lint + tsc + test` must pass before any git commit |
| No placeholders/fallbacks | manual | If an asset or feature is missing, hard-error. Never mask incomplete work with stubs. |
| Mobile-first | manual | 375px minimum viewport, 44px touch targets, portrait-primary |
| Named exports only | manual | Never `export default` |
| pnpm only | manual | Never npm or yarn |
| Biome only | manual | Never ESLint or Prettier |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 (New Architecture required) |
| Runtime | React 19, React Native 0.83 |
| 3D Engine | React Three Fiber 9 + drei 10 |
| Physics | @react-three/rapier 2.x (active -- FPS capsule + terrain colliders) |
| ECS | Miniplex 2.x |
| State | Legend State 3.x (persistent via expo-sqlite) |
| AI/Behavior | Yuka 0.7 |
| Audio | Tone.js 15.x (procedural synthesis + spatial audio) |
| Animation | animejs 3.x (NPC rigid body part rotation) |
| Database | expo-sqlite + drizzle-orm |
| Styling | NativeWind 4 + Tailwind CSS 3 |
| Language | TypeScript 5.9, strict mode |
| Lint/Fmt | Biome 2.4 |
| Testing | Jest + Maestro (E2E) + Playwright (web E2E) |
| Package Mgr | pnpm |

---

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Expo dev server
pnpm android          # Run on Android
pnpm ios              # Run on iOS
pnpm web              # Run on web
pnpm test             # Run tests (Jest)
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:e2e         # Maestro mobile E2E
pnpm lint             # Biome lint + format check
pnpm format           # Biome format (write)
pnpm check            # Full check (lint + format, write fixes)
npx tsc --noEmit      # TypeScript type check
```

---

## Architecture

### State Split: ECS vs Legend State

- **ECS (Miniplex):** Runtime game state -- entity positions, growth progress, tile states. Lives in memory.
- **Legend State:** Persistent player state -- level, XP, resources, unlocks, settings, stamina, prestige. Persisted via expo-sqlite.
- **Rule:** If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in Legend State.

### 3D Scene (R3F Declarative)

The scene uses React Three Fiber components inside an R3F `<Canvas>` wrapped in `<Physics>` (Rapier). NOT imperative Three.js calls.

- `components/scene/` -- Lighting, Sky, TerrainChunk, WaterBody, ProceduralTown, ProceduralBuilding, BirmotherMesh
- `components/entities/` -- ProceduralTrees, ProceduralBushes, ProceduralFences, ProceduralProps, ProceduralGrass, ProceduralHedgeMaze, ProceduralEnemies, ChibiNpcScene, GrovekeeperSpirit
- `components/game/` -- HUD, menus, panels, overlays (React Native UI)
- `components/player/` -- FPSCamera, PlayerCapsule, ProceduralToolView, TouchLookZone, TargetInfo

### Input System (Active)

See `docs/architecture/input-system.md` for full spec. Implementation in `game/input/`.

```
InputManager (singleton) -- game/input/InputManager.ts
  -> KeyboardMouseProvider (desktop: WASD + mouse look)
  -> TouchProvider (mobile: joystick + look zone + buttons)
  -> GamepadProvider (controller)
  -> AIProvider (autoplay/testing governor -- planned)
```

Game code reads an `InputFrame` per tick. Never reads raw events.

### Systems are Pure Functions

```typescript
(world: World, deltaTime: number, ...context: unknown[]) => void
```

Config from `config/game/*.json`. Randomness from `scopedRNG`. No side effects beyond ECS mutations.

---

## Project Structure

```
grovekeeper/
├── CLAUDE.md                         # This file -- governs all agent behavior
├── .claude/                          # Agent infrastructure
│   ├── settings.json                 # Hook configuration
│   ├── hooks/                        # Automatic quality gates
│   │   ├── pre-commit-quality.sh     # Blocks commit without lint+tsc+test
│   │   ├── spec-coverage-check.sh    # Warns: system file without spec section
│   │   ├── no-magic-numbers.sh       # Warns: inline const UPPER = number
│   │   ├── file-size-sentinel.sh     # Warns: file over 300 lines
│   │   └── no-math-random.sh         # Warns: Math.random() in game code
│   ├── agents/                       # Specialized agent roles
│   │   ├── system-designer.md        # Designs game systems (docs > tests > code)
│   │   ├── scene-builder.md          # Builds R3F 3D scene (FPS perspective)
│   │   ├── spec-writer.md            # ONLY writes GAME_SPEC.md -- no code
│   │   ├── ui-builder.md             # Builds HUD, mobile-first, brand-aligned
│   │   └── playtest-governor.md      # Validates game is playable end-to-end
│   ├── commands/                     # Slash commands
│   │   ├── add-system.md             # /add-system: docs > tests > code workflow
│   │   ├── spec-idea.md              # /spec-idea: concept -> spec (no code)
│   │   └── audit-game.md             # /audit-game: full playability audit
│   └── skills/                       # Repeatable pipelines
│       └── docs-first-pipeline.md    # The mandatory workflow
├── docs/                             # Game design and architecture
│   ├── README.md                     # Documentation index
│   ├── GAME_SPEC.md                  # SINGLE SOURCE OF TRUTH for game design
│   ├── architecture/                 # Architecture docs (18 files)
│   └── plans/                        # Design documents (13 files)
├── config/                           # JSON config (all tuning values here)
│   ├── theme.json                    # Colors, typography, spacing
│   ├── world/                        # World data (starting-world, blocks, structures, encounters, festivals)
│   └── game/                         # Game balance data (46 JSON files)
│       ├── species.json              # 15 tree species catalog
│       ├── tools.json                # Tools + stamina costs
│       ├── resources.json            # Resource type definitions
│       ├── growth.json               # Stage names, multipliers, timing
│       ├── weather.json              # Event probabilities, multipliers
│       ├── difficulty.json           # Difficulty multipliers
│       ├── dialogue-trees.json       # Dialogue trees
│       ├── fishing.json              # Fishing species, timing
│       ├── mining.json               # Rock hardness, ore tables
│       ├── cooking.json              # Cooking recipes
│       ├── forging.json              # Smelting + tool upgrade recipes
│       ├── building.json             # Build costs, unlock levels
│       ├── enemies.json              # Enemy types, stats, behaviors
│       ├── combat.json               # Combat parameters
│       ├── loot.json                 # Loot tables for all sources
│       ├── vegetation.json           # Bush shapes, placement density
│       └── ...                       # 30+ more config files
├── app/                              # Expo Router screens
│   ├── _layout.tsx                   # Root layout
│   ├── index.tsx                     # Main menu (+ NewGameModal)
│   ├── settings.tsx                  # Settings screen
│   └── game/
│       └── index.tsx                 # Game screen (Canvas + HUD + all overlays)
├── components/                       # React Native + R3F components
│   ├── ui/                           # Base UI (button, text, icon, tokens)
│   ├── game/                         # Game UI (HUD, menus, panels, dialogs)
│   │   ├── GameUI/                   # Orchestrator (designed but not mounted)
│   │   ├── PauseMenu/               # Tabbed pause overlay
│   │   ├── minimap/                  # MiniMap + snapshot
│   │   └── AchievementPopup/        # Achievement popup + sparkle
│   ├── scene/                        # R3F scene (Lighting, Sky, TerrainChunk, WaterBody, ProceduralTown, ProceduralBuilding)
│   ├── entities/                     # R3F entities (ProceduralTrees, ProceduralBushes, ProceduralFences, ProceduralProps, ProceduralGrass, ProceduralHedgeMaze, ProceduralEnemies, ChibiNpc, GrovekeeperSpirit)
│   └── player/                       # FPS player (FPSCamera, PlayerCapsule, ProceduralToolView, TouchLookZone, TargetInfo)
├── game/                             # Game logic (engine-agnostic)
│   ├── ecs/                          # Miniplex world, archetypes, queries
│   │   └── components/              # Domain-specific ECS components (core, npc, combat, building, structures, items, vegetation, terrain, dialogue, procedural/)
│   ├── systems/                      # Pure game systems (90+ files with tests)
│   │   ├── achievements/            # Achievement checker (core, types, world)
│   │   ├── buildingGeometry/        # Procedural building boxes + interiors
│   │   ├── hedgePlacement/          # Maze wall generation
│   │   ├── kitbashing/              # Modular building placement + Rapier
│   │   ├── recipes/                 # Crafting recipe catalog
│   │   ├── quests/                  # Quest goal types + registry
│   │   └── travelingMerchant/       # Merchant offer pools + scheduling
│   ├── stores/                       # Legend State persistent store (gameStore, inventory, questState, settings, survivalState)
│   ├── hooks/                        # Custom hooks (useGameLoop/, useInteraction/, useInput, useMovement, useRaycast, useBuildMode, etc.)
│   ├── input/                        # Input system (InputManager, KeyboardMouseProvider, TouchProvider, GamepadProvider)
│   ├── player/                       # Player utilities (teleport)
│   ├── ai/                           # Yuka NPC AI + PlayerGovernor
│   ├── npcs/                         # NPC management + data
│   ├── quests/                       # Quest chain engine + data
│   ├── events/                       # Event scheduler
│   ├── world/                        # World generation (ChunkManager, terrainGenerator, villageLayout/, mazeGenerator, entitySpawner)
│   ├── structures/                   # Structure placement + effects
│   ├── actions/                      # Game action dispatcher
│   ├── config/                       # Runtime config loaders (species, tools, resources, difficulty)
│   ├── constants/                    # Codex + derived constants
│   ├── db/                           # expo-sqlite + drizzle-orm
│   ├── shaders/                      # GLSL shaders (Gerstner water)
│   ├── ui/                           # UI bridge (dialogueBridge, Toast)
│   ├── debug/                        # Debug bridge for dev tools
│   └── utils/                        # Pure utilities (seedRNG, proceduralTextures, worldNames)
├── assets/                           # Textures, fonts (GLB models removed -- all procedural)
└── .maestro/                         # Maestro E2E test flows
```

---

## Agent Infrastructure

### Agents (`.claude/agents/`)

| Agent | Role | When to use |
|-------|------|-------------|
| `spec-writer` | Translates concepts to GAME_SPEC.md sections | User gives a gameplay idea |
| `system-designer` | Implements systems: spec > tests > code > wire | Building a new game system |
| `scene-builder` | Builds R3F 3D scene components | 3D rendering, FPS camera, tool models |
| `ui-builder` | Builds HUD and UI components | UI work, mobile-first |
| `playtest-governor` | Validates game is playable | After changes, before merge |

### Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/spec-idea <concept>` | Turn a gameplay concept into a spec section (no code) |
| `/add-system <name>` | Build a system following docs > tests > code |
| `/audit-game` | Full playability audit |

### Hooks (`.claude/hooks/`)

Hooks run automatically on tool use. They cannot be bypassed. They catch:
- Commits without passing quality checks
- Game system files without spec coverage
- Inline tuning constants that should be in JSON config
- Files over 300 lines
- Math.random() in game code

---

## Key Files to Read First

When starting any work session:

1. `docs/GAME_SPEC.md` -- Single source of truth for game design (46 sections)
2. `app/game/index.tsx` -- Game screen (Canvas + Physics + all R3F + HUD + overlays)
3. `game/stores/index.ts` -- Legend State persistent store barrel
4. `game/ecs/world.ts` -- Miniplex world + 40+ queries
5. `game/hooks/useGameLoop/index.ts` -- System execution order per frame
6. `game/input/InputManager.ts` -- FPS input system
7. `config/game/species.json` -- Tree species catalog
8. `config/game/tools.json` -- Tool definitions

---

## Performance Budgets

| Metric | Target |
|--------|--------|
| FPS (mobile) | >= 55 |
| FPS (desktop) | >= 60 |
| Time to interactive | < 3s |
| Memory (mobile) | < 100 MB |
| Draw calls | < 50 |

### Key Optimizations

- Instanced meshes for same-species same-stage trees (drei `<Instances>`)
- Freeze world matrices on static meshes
- Code splitting via Expo Router
- No barrel imports from Three.js -- import specific modules
- Lerp-based growth animations: `Math.min(1, dt * speed)` for frame-rate independence

---

## Testing

Test files live adjacent to source: `*.test.ts(x)`.

Write tests first. Each test references its GAME_SPEC.md section number:

```typescript
// growth.test.ts
describe('Growth System (Spec §8)', () => {
  it('should advance from Seed to Sprout at 100 growth points', () => {
    // ...
  });
});
```

---

## Mobile-First Checklist

Before merging any UI change:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets >= 44px
- [ ] No overlap with bottom action bar
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming (minimum 14px body)
- [ ] Dialogs don't extend beyond viewport
- [ ] Animations respect `prefers-reduced-motion`
- [ ] FPS >= 55 on mid-range mobile

---

## Anti-Patterns (things that cause spot-welding)

- Writing code without checking the spec
- Creating a system without a test file
- Hardcoding tuning values instead of using `config/game/*.json`
- Using `Math.random()` instead of `scopedRNG`
- Making files over 300 lines instead of decomposing
- Implementing a feature across multiple sessions without updating the spec
- Assuming a system works because code exists (it might not be wired up)
- Rushing to fix ONE thing instead of addressing the structural problem
- Treating the codebase as the source of truth instead of the spec
- Using placeholder boxes, stub data, or fallback paths that mask missing work
- Creating a "fallback" instead of hard-erroring when an asset or feature is incomplete
