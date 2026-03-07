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
| Physics | @react-three/rapier (planned -- FPS pivot) |
| ECS | Miniplex 2.x |
| State | Legend State 3.x (persistent via expo-sqlite) |
| AI/Behavior | Yuka 0.7 |
| Database | expo-sqlite + drizzle-orm |
| Styling | NativeWind 4 + Tailwind CSS 3 |
| Language | TypeScript 5.9, strict mode |
| Lint/Fmt | Biome 2.4 |
| Testing | Jest + Maestro (E2E) |
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

The scene uses React Three Fiber components inside an R3F `<Canvas>`. NOT imperative Three.js calls.

- `components/scene/` -- Camera, Lighting, Sky, Ground, SelectionRing
- `components/entities/` -- Player, TreeInstances, NpcMeshes
- `components/game/` -- HUD, menus, overlays (React Native UI)
- `components/player/` -- PlayerController, ToolViewModel, Crosshair, TargetInfo (FPS pivot -- planned)

### Input System (FPS pivot -- planned)

See `docs/architecture/input-system.md` for full spec. Architecture:

```
InputManager (singleton)
  -> KeyboardMouseProvider (desktop: WASD + mouse look)
  -> TouchProvider (mobile: joystick + look zone + buttons)
  -> GamepadProvider (controller)
  -> AIProvider (autoplay/testing governor)
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
│   └── plans/                        # Design documents
│       └── 2026-03-06-fps-perspective-design.md
├── config/                           # JSON config (all tuning values here)
│   ├── theme.json                    # Colors, typography, spacing
│   └── game/                         # Game balance data
│       ├── species.json              # 15 tree species catalog
│       ├── tools.json                # 12 tools + stamina costs
│       ├── resources.json            # Resource type definitions
│       ├── growth.json               # Stage names, multipliers, timing
│       ├── weather.json              # Event probabilities, multipliers
│       ├── achievements.json         # Trigger conditions, display data
│       ├── prestige.json             # Tiers, bonuses, cosmetic themes
│       ├── grid.json                 # Expansion tiers, costs, sizes
│       ├── npcs.json                 # NPC template definitions
│       ├── dialogues.json            # Dialogue trees
│       ├── quests.json               # Quest chain definitions
│       └── difficulty.json           # Difficulty multipliers
├── app/                              # Expo Router screens
│   ├── _layout.tsx                   # Root layout
│   ├── index.tsx                     # Main menu
│   └── game/
│       └── index.tsx                 # Game screen (Canvas + HUD)
├── components/                       # React Native + R3F components
│   ├── ui/                           # Base UI (button, text, icon)
│   ├── game/                         # Game UI (HUD, menus, dialogs)
│   ├── scene/                        # R3F scene (Camera, Lighting, Sky, Ground)
│   └── entities/                     # R3F entities (Player, Trees, NPCs)
├── game/                             # Game logic (engine-agnostic)
│   ├── ecs/                          # Miniplex world, archetypes, queries
│   ├── systems/                      # Pure game systems (growth, weather, etc.)
│   ├── stores/                       # Legend State persistent store
│   ├── hooks/                        # Custom hooks (useInput, useMovement, etc.)
│   ├── ai/                           # Yuka NPC AI + PlayerGovernor
│   ├── npcs/                         # NPC management
│   ├── quests/                       # Quest chain engine
│   ├── events/                       # Event scheduler
│   ├── world/                        # World generation, zone loading
│   ├── structures/                   # Structure placement + effects
│   ├── actions/                      # Game action dispatcher
│   ├── config/                       # Runtime config loaders (species, tools, resources)
│   ├── constants/                    # Codex + derived constants
│   ├── db/                           # expo-sqlite + drizzle-orm
│   └── utils/                        # Pure utilities (treeGeometry, seedRNG)
├── assets/                           # Textures, models, fonts
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

1. `docs/GAME_SPEC.md` -- Single source of truth for game design
2. `docs/plans/2026-03-06-fps-perspective-design.md` -- FPS perspective pivot design
3. `app/game/index.tsx` -- Game screen (R3F Canvas + HUD)
4. `game/stores/gameStore.ts` -- Persistent state
5. `game/ecs/world.ts` -- Miniplex world + queries
6. `config/game/species.json` -- Tree species catalog
7. `config/game/tools.json` -- Tool definitions

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
