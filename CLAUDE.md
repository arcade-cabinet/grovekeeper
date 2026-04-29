---
title: CLAUDE.md — Grovekeeper
updated: 2026-04-29
status: current
domain: technical
---

# CLAUDE.md — Grovekeeper

## Specs (read in this order)

1. `docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`
   — **active development spec** (supersedes relevant RC sections)
2. `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
   — RC build (shipped; reference for what exists in code today)
3. `docs/STATE.md` — current status and PRQ queue
4. `docs/ARCHITECTURE.md` — technical architecture
5. `docs/DESIGN.md` — gameplay design

## Project identity

**Grovekeeper** is a **first-person voxel exploration and town-building game.**
You are **The Gardener** — singular, mythic. You see the world through your
own eyes. There is no visible player character.

You wander an infinite procedural voxel world of biome archetypes and
discover **Groves** — special glowing peaceful biomes scattered by PRNG.
You **claim** a grove by gathering materials, discovering compound recipes,
crafting a Hearth, placing it, and lighting it. Claimed groves form your
fast-travel network and become spaces for free voxel building.

**Tagline:** *"Every forest begins with a single seed."*

**Mobile-first PWA** (portrait), desktop secondary. Target session: 3–15
minutes. Capacitor wraps it for native iOS/Android.

## Status

RC complete. Voxel pivot in progress.
- Shipped: v1.5.0-alpha.1 at `https://arcade-cabinet.github.io/grovekeeper/`
- Active PRQ queue: PRQ-01 → PRQ-02 → PRQ-03
- See `docs/STATE.md` for details.

## Critical context

### Mobile-first is non-negotiable

- Touch targets ≥ 44×44px
- Test at 375px width (iPhone SE) as the minimum viewport
- Passive event listeners for all pointer handlers
- `touch-action: none` on the game canvas
- Mobile virtual joystick via `nipplejs`
- Haptic feedback via `@capacitor/haptics` on supported devices
- Chunk radius is mobile-tuned; tunable in `config/world.json`

### Single-pipeline rendering (voxel pivot)

**Everything renders through `@jolly-pixel/voxel.renderer`.** There is no
GLB ModelRenderer pipeline in production code after the voxel pivot.

- Terrain: standard chunk layers per biome
- Structures: placed blocks in chunk data
- Creatures: multi-layer voxel assemblies; limbs translated per frame
- Grove Spirit: voxel assembly of impossible grove-only materials
- Villagers: 4-block voxel assemblies

`VoxelWorld.translateLayer(name, delta)` is the animation primitive.
Per-creature VoxelWorld instances prevent dirty-mark propagation.

> The RC used two pipelines (voxel terrain + GLB characters). PRQ-01
> removes the GLB pipeline. During PRQ-01 work: do NOT add new GLB usage;
> remove existing GLB usage.

### Audio

**JollyPixel engine audio stack** (`GlobalAudio`, `GlobalAudioManager`,
`AudioBackground`) — backed by `THREE.Audio` / Web Audio API.
**NOT Howler.** Any reference to "Howler" in this codebase is wrong.

- `GlobalAudio` — master volume, shared `THREE.AudioListener`
- `GlobalAudioManager` — load/create/destroy `THREE.Audio` instances
- `AudioBackground` — playlist-based looped music with crossfade

### Crafting model (voxel pivot)

The old "unlock-gated recipe list" is replaced by a **compound trait
discovery system**. Materials carry trait bitmasks. Combining materials
unions traits. When combined traits satisfy a `CompoundRule`, the result
is named. First discovery writes to `known_compounds` + fires Tracery
narrator. Re-craft by name thereafter.

**Do NOT add to `known_recipes` for new gameplay features.** The
`known_recipes` table is legacy; kept for save compat.

### Encounter gate

Encounters require: non-grove biome + time-of-day weight + 
`hasCraftedNamedWeapon === true`. Until the player has crafted a named
weapon compound, no hostile spawns.

### Spawn model

Player spawns OUTSIDE the first grove, ~30 voxels from its edge. First
grove is within 32 voxels of spawn (always in +X direction for starter
seed). Encounters off until first weapon.

### Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Engine | `@jolly-pixel/engine` v2.5.0 | ECS, `Actor`/`ActorComponent`, `Camera3DControls` (first-person), `Input`, `Systems.Assets` |
| Voxel renderer | `@jolly-pixel/voxel.renderer` v1.4.0 | **Single rendering pipeline.** Chunk renderer, blockRegistry, tileset loading, VoxelWorld/VoxelLayer, translateLayer |
| Runtime | `@jolly-pixel/runtime` v3.3.0 | Boot wrapper, GPU tier detection, `<jolly-loading>` element |
| Physics | Rapier (via voxel.renderer) | Pass at VoxelRenderer construction; colliders built automatically |
| ECS state | Koota | Pure game state. Known compounds, inventory, journal, encounter timers |
| UI | SolidJS 1.9 | Overlay HUD, crafting surface, journal, fast-travel map |
| Audio | JP engine `GlobalAudio` / `GlobalAudioManager` / `AudioBackground` | THREE.Audio / Web Audio API. **Not Howler. Not bare THREE.Audio.** |
| Narrator | Tracery grammar (`src/content/narrator-grammar.json`) | First-person discovery text, journal entries |
| Input | Engine `Input` + `CombinedInput` desktop, `nipplejs` mobile | Actions: `move`, `interact`, `swing`, `combine`, `place`, `open-craft` |
| Camera | `Camera3DControls` native first-person | Eye height 1.6 units. No follow extension. |
| Persistence | `drizzle-orm` → `@capacitor-community/sqlite` (sql.js web adapter) | Plus `@capacitor/preferences` for small KV |
| Bundler | Vite 6.x | |
| Mobile shell | Capacitor 8.x | |
| Language | TypeScript 5.7+ strict | |
| Lint/format | Biome 2.3 | |
| Package manager | pnpm 10 | |
| Testing | Vitest 4.x (node + browser) + Playwright 1.59 | |

**No BabylonJS. No Tone.js. No Howler. No SPS tree generator. No A* tap-to-move. No
9-zone JSON world. No GLB ModelRenderer in production code (post-PRQ-01).**

## Common commands

```bash
pnpm install              # install deps
pnpm dev                  # dev server
pnpm build                # production build
pnpm preview              # preview built artifact on :8080
pnpm test                 # vitest, node project (default)
pnpm test:run             # vitest, node project, single run
pnpm test:browser         # vitest, browser project (Playwright-driven)
pnpm test:all             # all vitest projects
pnpm test:coverage        # node project with coverage
pnpm test:e2e             # build + Playwright e2e (golden-path)
pnpm test:rc-journey      # RC journey screenshot suite (16 gates)
pnpm test:rc-perf         # perf FPS measurement per biome
pnpm tsc                  # typecheck (no emit)
pnpm lint                 # biome lint
pnpm format               # biome format --write
pnpm check                # biome check (lint + format)
pnpm size                 # size-limit budget check
```

## Project structure (post-pivot target)

```text
grovekeeper/
├── CLAUDE.md
├── AGENTS.md
├── docs/
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── STATE.md
│   ├── ROADMAP.md
│   ├── TESTING.md
│   ├── post-rc.md
│   ├── plans/
│   │   ├── prq-01-voxel-creatures-first-person.md
│   │   ├── prq-02-compound-traits-tracery.md
│   │   └── prq-03-spawn-model-e2e-tests.md
│   └── superpowers/specs/
│       ├── 2026-04-24-grovekeeper-rc-redesign-design.md  # RC ref
│       └── 2026-04-29-grovekeeper-voxel-pivot-design.md  # ACTIVE
├── src/
│   ├── game/scene/
│   │   ├── VoxelCreatureActor.ts       # base; limb layer animation
│   │   ├── GroveSpiritVoxelActor.ts    # voxel Spirit (no dialogue)
│   │   ├── CraftingStationActor.ts
│   │   ├── GameScene.ts
│   │   └── runtime.ts
│   ├── systems/
│   │   ├── traits.ts                   # Trait enum + bitmask
│   │   ├── compounds.ts                # CompoundRule table + resolver
│   │   ├── narrator.ts                 # Tracery grammar driver
│   │   ├── journal.ts                  # Journal append/read
│   │   ├── hints.ts                    # Partial-discovery hints
│   │   ├── encounters.ts               # Gate: biome + time + weapon
│   │   ├── crafting.ts
│   │   ├── building.ts
│   │   ├── claim.ts
│   │   └── fastTravel.ts
│   ├── content/
│   │   ├── compounds/                  # CompoundRule JSON
│   │   └── narrator-grammar.json       # Tracery grammar
│   ├── world/
│   │   ├── ChunkManager.ts
│   │   ├── BiomeRegistry.ts
│   │   └── biomes/{meadow,forest,coast,grove}.ts
│   ├── db/schema/rc.ts                 # drizzle schema
│   ├── input/ActionMap.ts
│   └── ui/
│       ├── HUD/
│       ├── CraftingSurface.tsx
│       ├── FastTravelMap.tsx
│       └── PauseMenu.tsx               # includes Journal tab
└── e2e/
    └── golden-path.spec.ts             # real keyboard input E2E
```

## Architecture patterns

### State split

- **Koota** — known compounds, inventory, journal entries, encounter
  timers, `HasCraftedNamedWeapon` trait.
- **Engine Actor** — creature Actors (own VoxelRenderer + VoxelWorld),
  chunk Actors, crafting-station Actors.
- **`@capacitor/preferences`** — audio volume, graphics tier, world seed.
- **drizzle + Capacitor SQLite** — persistent store.

Rule: frame-rate scene-bound state → Actor. Persistent game data → Koota + drizzle.

### Determinism

All randomness via `scopedRNG(scope, worldSeed, chunkX, chunkZ, ...)`.
Same seed → same world. Screenshot tests depend on this.

### Crafting is discovery

Materials have traits. Combining unions traits. `resolveCompound` checks
against `COMPOUNDS` table. First match → narrator fires → `known_compounds`
written. No pre-gated unlock list. The table IS the tech tree.

### No NPCs with goals

Villagers wander. They do not speak. They are a presence. The Grove Spirit
is a voxel presence — no scripted lines, no dialogue system.

## Mobile-first development checklist

Before merging any UI change:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets ≥ 44px
- [ ] No overlap with bottom action bar / virtual joystick
- [ ] Canvas has `touch-action: none`
- [ ] FPS ≥ 55 on mid-range mobile

## Performance budgets

| Metric | Target |
|--------|--------|
| FPS (mobile) | ≥ 55 |
| FPS (desktop) | ≥ 60 |
| Initial bundle (gz) | < 500 KB |
| Lighthouse Performance (landing, mobile) | ≥ 90 |
| Memory (mobile) | < 100 MB |

## Out of scope (permanent)

- Quests, fetch chains, escort missions
- Player death, permadeath, difficulty tiers
- 8-spirit collection meta arc (permanently cut; contradicts design)
- Multiplayer
- Cosmetics, skins, prestige
- Third-person camera (first-person only)
- Howler audio library
