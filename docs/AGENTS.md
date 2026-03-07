# docs/AGENTS.md -- Agentic Navigation Guide

This file helps AI agents navigate the `docs/` directory and find the right documentation for any task.

**Source of truth:** The [Unified Game Design](plans/2026-03-07-unified-game-design.md) is the master design document. All other docs are subordinate. When in doubt, the unified design wins.

---

## Directory Map

```
docs/
  AGENTS.md                  THIS FILE -- agentic navigation guide
  README.md                  Documentation index, tech stack, project structure
  GAME_SPEC.md               Single source of truth for game design (referenced by tests)
  ECONOMY_DESIGN.md          Economy design document
  architecture/              Technical architecture deep dives
    overview.md              System architecture, data flow, entry point chain
    ecs-patterns.md          Miniplex ECS: entity model, queries, archetypes, systems
    state-management.md      Legend State store: state shape, actions, persistence
    rendering.md             R3F scene components, tree rendering, day/night cycle
    scene-composition.md     Full scene tree, draw call budget, game loop
    procedural-world.md      Terrain height, path carving, instance collection, seeded RNG
    instanced-rendering.md   InstancedBatch, material batching, shared geometries
    open-world-system.md     8 biomes, chunk-based infinite world, zone transitions
    input-system.md          InputManager, providers, InputFrame
    fps-camera.md            PlayerController, Rapier capsule, movement
    tool-viewmodel.md        Tool GLBs, use animations, raycast interaction
    tool-action-system.md    5 keyframe animations, impact effects, raycast
    view-model-juice.md      Hand sway, walk bob, sprint FOV, config-driven
    touch-controls.md        Virtual joystick, swipe-to-look, action buttons
    npc-system.md            Chibi NPCs (3DPSX GLBs), anime.js animation, seeded appearance
    hud-overlay.md           HUD layout, component specs, design tokens
    day-night-weather-visual-system.md  8-stop sky, 4 weather types, seasons
    performance.md           Mobile performance budgets, instancing, code splitting
  game-design/               Game mechanics docs
    core-loop.md             Session flow, plant-tend-harvest-survive loop
    grid-system.md           Tiles, expansion tiers, coordinate math
    tree-catalog.md          15 species (12 base + 3 prestige), growth stages
    tree-species-visual-spec.md  15 species x 5 stages, visual parameters
    tools.md                 Tools, stamina costs, upgrade tiers
    economy.md               Resources, seed costs, harvesting yields
    progression.md           XP formula, levels, achievements, prestige
    progression-system-design.md  XP curve, 45 achievements, prestige tiers
    seasons-weather.md       Day/night cycle, 4 seasons, weather events
  design/                    System design docs
    quest-dialogue-system.md 10 NPC personalities, 13 quest chains, relationships
  brand/                     Visual identity (stable)
    identity.md              Brand pillars, tagline, visual style, mascot "Fern"
    design-tokens.md         CSS custom properties: colors, spacing, shadows, z-index
    typography.md            Fonts (Fredoka headings, Nunito body), type scale
  ui-ux/                     UI/UX patterns (stable)
    hud-layout.md            Mobile and desktop panel positions, component map
    controls.md              Input handling, touch targets
    tutorial-user-flow.md    11-step tutorial, loading screen, seed phrases
  guides/                    Developer guides
    getting-started.md       Setup, dev server, build, test commands
    coding-standards.md      Conventions, patterns, testing standards
    contributing.md          Agent roles, coordination
  plans/                     Design plans (historical + active)
    2026-03-07-unified-game-design.md   THE master design document
    2026-03-07-grok-integration-plan.md Chibi NPCs, water, audio, seasonal
    game-mode-system-design.md          Survival mode, difficulty tiers
    2026-03-06-fps-perspective-design.md FPS perspective pivot
    2026-03-06-expo-r3f-migration-design.md  Expo/R3F migration (historical)
    2026-03-06-gap-analysis.md          Feature gap analysis
    2026-03-06-master-completion-plan.md Historical reference only
    2025-02-06-phase-a-foundation.md    Phase A (historical, BabylonJS era)
    2025-02-06-phase-b-systems-persistence.md Phase B (historical, BabylonJS era)
```

---

## Which Docs to Read for Which Tasks

### Starting any work session
1. `CLAUDE.md` (project root) -- mandatory workflow, hard rules, project structure
2. `docs/GAME_SPEC.md` -- single source of truth for game design
3. `docs/plans/2026-03-07-unified-game-design.md` -- master design document

### Working on game systems (growth, weather, economy, quests, survival)
- `docs/architecture/ecs-patterns.md` -- entity model, system conventions
- `docs/architecture/state-management.md` -- Legend State store shape and actions
- `docs/game-design/core-loop.md` -- session flow
- Relevant game-design doc (e.g., `progression.md` for XP/leveling)
- `docs/plans/2026-03-07-unified-game-design.md` -- canonical survival mechanics, economy

### Working on world generation (chunks, biomes, features)
- `docs/architecture/procedural-world.md` -- terrain, paths, instances
- `docs/architecture/open-world-system.md` -- biomes, chunk system
- `docs/plans/2026-03-07-unified-game-design.md` Section 4 -- infinite world architecture

### Working on 3D rendering (scene, meshes, camera, lighting)
- `docs/architecture/rendering.md` -- R3F scene decomposition, tree rendering
- `docs/architecture/scene-composition.md` -- scene tree, draw call budget
- `docs/architecture/instanced-rendering.md` -- InstancedBatch, material batching
- `docs/architecture/performance.md` -- draw call budgets, instancing strategy

### Working on NPCs (appearance, AI, dialogue, quests)
- `docs/architecture/npc-system.md` -- chibi NPCs, 3DPSX GLBs, anime.js animation
- `docs/design/quest-dialogue-system.md` -- personalities, quest chains
- `docs/plans/2026-03-07-unified-game-design.md` Section 8 -- NPCs, quests, dialogue

### Working on tools and FPS interaction
- `docs/architecture/tool-viewmodel.md` -- tool GLBs, animations
- `docs/architecture/tool-action-system.md` -- keyframe animations, impact effects
- `docs/architecture/view-model-juice.md` -- hand sway, walk bob, sprint FOV
- `docs/architecture/fps-camera.md` -- PlayerController, movement

### Working on UI/UX (HUD, menus, dialogs, touch)
- `docs/ui-ux/hud-layout.md` -- panel positions, component map
- `docs/ui-ux/controls.md` -- input handling, touch targets
- `docs/ui-ux/tutorial-user-flow.md` -- tutorial flow
- `docs/brand/design-tokens.md` -- color tokens, spacing scale
- `docs/brand/typography.md` -- font usage

### Working on audio
- `docs/plans/2026-03-07-unified-game-design.md` Section 11 -- Tone.js, spatial sound, FM synthesis
- `docs/plans/2026-03-07-grok-integration-plan.md` -- audio integration details

### Working on brand/visual identity
- `docs/brand/identity.md` -- pillars, tagline, mascot
- `docs/brand/design-tokens.md` -- all design tokens
- `docs/brand/typography.md` -- font families and scale

---

## Agent Infrastructure (`.claude/`)

The project uses Claude Code's agent infrastructure for enforcing workflow and quality.

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

Hooks run automatically and cannot be bypassed.

| Hook | Catches |
|------|---------|
| `pre-commit-quality.sh` | Commits without passing lint + tsc + test |
| `spec-coverage-check.sh` | Game system files without a GAME_SPEC.md section |
| `no-magic-numbers.sh` | Inline tuning constants (should be in `config/game/*.json`) |
| `file-size-sentinel.sh` | Files over 300 lines |
| `no-math-random.sh` | `Math.random()` in game code (use `scopedRNG`) |

---

## Document Stability

| Directory | Stability | Notes |
|-----------|-----------|-------|
| `game-design/` | Stable | Engine-agnostic game mechanics. |
| `brand/` | Stable | Visual identity. Rarely changes. |
| `ui-ux/` | Stable | Layout patterns. |
| `design/` | Stable | Quest/dialogue system design. |
| `architecture/` | Active | Being expanded for new systems. |
| `guides/` | Active | Developer workflow docs. |
| `plans/` | Append-only | Historical plans preserved. New plans added. |

---

## Key Conventions

- **Mandatory workflow:** spec (GAME_SPEC.md) > tests > code > wire up > update spec status
- All game balance values live in JSON config under `config/game/`, never hardcoded
- All randomness via `scopedRNG(scope, worldSeed, ...extra)`, zero `Math.random()`
- Test files are co-located with source: `foo.ts` has `foo.test.ts` beside it
- Each test references its GAME_SPEC.md section number: `describe('Growth System (Spec S8)', ...)`
- No file over 300 lines -- decompose into subpackage with `index.ts` barrel
- Named exports only, never `export default`
- pnpm only, Biome only
