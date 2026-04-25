---
title: CLAUDE.md — Grovekeeper
updated: 2026-04-24
status: current
domain: technical
---

# CLAUDE.md — Grovekeeper

This file is the agent entry point. The full source-of-truth design is at
`docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`. Read it
first if you are starting fresh on this codebase.

## Project identity

**Grovekeeper** is a third-person voxel tree-tending and town-building game.
You are **The Gardener** — singular, mythic. You wander an infinite procedural
voxel outer-world of biome archetypes (each with its own flora, fauna, voxel
palette, weather, and threats) and discover **Groves** — a special, glowing,
peaceful biome scattered through the wilderness by PRNG. You **claim** a grove
by gathering, crafting, placing, and lighting a Hearth. Claimed groves form
your fast-travel network and become safe spaces for free voxel building, tree
tending, and ambient NPC life.

The two-mode tonal contrast — dangerous wild, peaceful grove — is the design.

**Tagline:** *"Every forest begins with a single seed."*

**Mobile-first PWA** (portrait), desktop secondary. Target session: 3–15
minutes. Capacitor wraps it for native iOS/Android.

## Status

Mid-redesign. The currently-deployed game (1.0.0-alpha.1 on
`https://arcade-cabinet.github.io/grovekeeper/`) is a cozy 2.5D BabylonJS
tree-tender with 9 hardcoded JSON zones. That game is being replaced per the
RC spec. Active branch: `release/workflows-v2`. See `docs/STATE.md` for the
current wave.

## Critical context

### Mobile-first is non-negotiable

- Touch targets ≥ 44×44px
- Test at 375px width (iPhone SE) as the minimum viewport
- Passive event listeners for all pointer handlers
- `touch-action: none` on the game canvas
- Mobile virtual joystick via `nipplejs` over engine touch input
- Haptic feedback via `@capacitor/haptics` on supported devices
- Chunk active/buffer radius is mobile-tuned (smaller on phone, larger on
  desktop) and tunable in `config/world.json`

### Two-pipeline rendering rule

The world's *terrain and structural voxels* (ground, building blocks, hearth,
walls) render through `@jolly-pixel/voxel.renderer` using **PNG tilesets per
biome**. The world's *animated things* (Gardener, NPCs, creatures, Grove
Spirit, ambient animals) render through `@jolly-pixel/engine`'s `ModelRenderer`
using **GLB models with animation cycles**. Both live in the same Three.js
scene. Confusing the two is the failure mode.

### Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Engine | `@jolly-pixel/engine` v2.5.0 | Three.js-based ECS, `Actor`/`ActorComponent`, `ModelRenderer` for GLBs, `Camera3DControls`, `Input`, `Systems.Assets` |
| Voxel renderer | `@jolly-pixel/voxel.renderer` v1.4.0 | Chunk renderer, `blockRegistry`, PNG tileset loading, JSON chunk format, 16³ chunks |
| Runtime | `@jolly-pixel/runtime` v3.3.0 | Boot wrapper, GPU tier detection, `<jolly-loading>` element |
| Physics | Rapier (transitive via voxel.renderer) | Thin collision wrapper we own |
| ECS state | Koota | Pure game state (claimed groves, inventory, recipes, dialogue history). Engine `Actor` for scene-bound state |
| UI | SolidJS 1.9 | Overlay HUD, menus, crafting surface, dialogue, fast-travel map |
| Audio | Engine `AudioManager` / `AudioLibrary` / `AudioBackground` / `GlobalAudio` (Howler-backed) | Real recorded SFX/music/ambient from itch.io packs. **No Tone.js.** |
| Input | Engine `Input` + `CombinedInput` desktop, `nipplejs` mobile | Thin action-mapping layer (`move`, `interact`, `swing`, `place`, `open-craft`) |
| Camera | Extended `Camera3DControls` follow-lerp | Third-person, lerps to player, optional hit shake |
| Persistence | `drizzle-orm` → `@capacitor-community/sqlite` (sql.js web adapter) | Plus `@capacitor/preferences` for small KV settings |
| Bundler | Vite 6.x | |
| Mobile shell | Capacitor 8.x | |
| Language | TypeScript 5.7+ strict | |
| Lint/format | Biome 2.3 | |
| Package manager | pnpm 10 | |
| Testing | Vitest 4.x (node + browser projects) + Playwright 1.59 | Includes screenshot baselines |

**No BabylonJS. No Tone.js. No SPS tree generator. No A* tap-to-move. No
9-zone JSON world.** All deleted in the port.

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
pnpm test:e2e             # build + Playwright e2e
pnpm test:playthrough     # the journey screenshot suite (RC gate)
pnpm tsc                  # typecheck (no emit)
pnpm lint                 # biome lint
pnpm format               # biome format --write
pnpm check                # biome check (lint + format)
pnpm size                 # size-limit budget check
```

## Project structure (post-port target)

The current tree still has BabylonJS scaffolding; the structure below is what
the codebase *converges to* across the implementation waves.

```
grovekeeper/
├── CLAUDE.md                           # This file
├── AGENTS.md                           # Extended operating protocols
├── README.md                           # Human-facing intro
├── CHANGELOG.md
├── STANDARDS.md
├── memory-bank/                        # Persistent project context (autoloop reads on startup)
│   ├── activeContext.md
│   ├── progress.md
│   └── ...
├── docs/
│   ├── README.md                       # Index
│   ├── DESIGN.md                       # Game design (product domain)
│   ├── ARCHITECTURE.md                 # Technical architecture
│   ├── STATE.md                        # Current build state, wave-by-wave
│   ├── TESTING.md                      # Verification protocol, gates, rubric
│   ├── LORE.md                         # Minimal world tone
│   ├── ROADMAP.md                      # RC scope only
│   ├── post-rc.md                      # Anything beyond RC
│   ├── asset-inventory.md              # Generated by build-asset-manifest.mjs
│   ├── rc-journey/                     # Screenshot gates + REVIEW.md rubric + perf.md
│   └── superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md
├── config/
│   ├── world.json                      # Chunk radius, streaming tunables
│   └── ...
├── public/
│   └── assets/
│       ├── tilesets/biomes/{biome}.{png,json}    # Per-biome voxel tilesets
│       ├── tilesets/structures/                  # Hearth + common building blocks
│       ├── models/characters/gardener/           # Player GLB + animation cycles
│       ├── models/npcs/{grove-spirit,villagers}/
│       ├── models/creatures/{peaceful,hostile}/
│       ├── models/props/
│       ├── audio/music/{menu,grove,biomes/{biome},moments}/
│       ├── audio/sfx/{ui,footsteps,tools,crafting,creatures,hearth}/
│       └── audio/ambient/{grove,biomes/{biome},weather}/
├── raw-assets/                         # gitignored — itch.io archives + extracted
├── scripts/
│   ├── fetch-itch.mjs                  # Pulls configured packs into raw-assets/
│   ├── import-from-voxel-realms.mjs    # Lifts curated subset from sibling repo
│   ├── curate-assets.mjs               # raw-assets/ → public/assets/
│   ├── build-asset-manifest.mjs        # Walks public/assets, emits manifest + inventory
│   └── asset-curation.json
├── src/
│   ├── main.tsx                        # Boot
│   ├── App.tsx
│   ├── game/
│   │   ├── Game.tsx                    # Screen router (menu | playing)
│   │   ├── GameScene.ts                # Engine Actor for the scene
│   │   ├── PlayerActor.ts              # Gardener Actor + ModelRenderer
│   │   ├── camera/CameraFollow.ts      # Lerp follow behavior on Camera3DControls
│   │   └── ...
│   ├── world/
│   │   ├── ChunkManager.ts             # Active/buffer radius, load/unload
│   │   ├── BiomeRegistry.ts
│   │   ├── biomes/                     # Six target biomes (final list adapts to asset inventory) plus the special grove biome
│   │   │   ├── meadow.ts
│   │   │   ├── forest.ts
│   │   │   ├── wetland.ts
│   │   │   ├── alpine.ts
│   │   │   ├── coast.ts
│   │   │   ├── scrub.ts
│   │   │   └── grove.ts                # Special seventh biome
│   │   ├── GroveRegistry.ts            # In-memory registry of discovered/claimed
│   │   └── chunkGen.ts                 # scopedRNG-driven generators
│   ├── systems/                        # Pure-function systems, ticked per frame
│   │   ├── growth.ts                   # Tree lifecycle (ported)
│   │   ├── weather.ts                  # Biome-aware weather (ported, extended)
│   │   ├── time.ts                     # Day/night
│   │   ├── stamina.ts
│   │   ├── harvest.ts
│   │   ├── encounters.ts               # Biome × time × weather → spawn
│   │   ├── combat.ts                   # Light, stamina-gated, retreat-on-zero
│   │   ├── crafting.ts                 # Production half of the loop
│   │   ├── building.ts                 # Placement of crafted blueprints
│   │   ├── claim.ts                    # Hearth → claim state machine
│   │   ├── fastTravel.ts
│   │   ├── npcDialogue.ts              # Phrase-pool model
│   │   └── saveLoad.ts                 # drizzle-backed
│   ├── content/
│   │   ├── recipes/                    # JSON, biome-tagged
│   │   └── dialogue/phrase-pools.ts    # Keyed by biome × tag
│   ├── audio/
│   │   ├── BiomeMusicCoordinator.ts    # AudioBackground crossfade on biome change
│   │   └── sfx.ts                      # Thin dispatch over AudioLibrary
│   ├── persistence/
│   │   ├── schema.ts                   # drizzle schema (chunks, biomes, groves, claim, inventory, recipes-known, dialogue history)
│   │   └── db.ts                       # Capacitor SQLite + sql.js init
│   ├── ui/                             # SolidJS overlays
│   │   ├── MainMenu.tsx
│   │   ├── HUD/
│   │   ├── CraftingSurface.tsx         # Same surface for items + place-able blueprints
│   │   ├── DialogueBubble.tsx
│   │   ├── FastTravelMap.tsx
│   │   ├── PauseMenu.tsx
│   │   └── ...
│   ├── input/
│   │   └── ActionMap.ts                # Thin layer over engine Input
│   ├── utils/
│   │   └── seedRNG.ts                  # `scopedRNG(scope, worldSeed, ...extra)` — already a project convention
│   └── assets/
│       └── manifest.generated.ts       # Emitted by build-asset-manifest.mjs (committed)
├── capacitor.config.ts
├── biome.json
├── vitest.config.ts
├── vite.config.ts
└── tsconfig.json
```

## Architecture patterns

### State split

- **Koota** — pure game state. Claimed-grove DB, inventory, recipes-known,
  dialogue history, encounter timers. Persisted.
- **Engine `Actor` / `ActorComponent`** — scene-bound state. Player Actor,
  NPC Actors, chunk Actors, crafting-station Actors. Lives with the scene.
- **`@capacitor/preferences`** — small KV settings (audio volume, graphics
  tier, last-played timestamp, world seed).
- **drizzle + Capacitor SQLite (sql.js on web)** — the persistent store
  underneath save/load.

Rule: if it changes every frame and is scene-bound, it's an Actor. If it's
pure game data that survives across sessions, it's Koota → drizzle.

### Determinism

All randomness flows through `scopedRNG(scope, worldSeed, chunkX, chunkZ, ...)`,
already a project convention. Same seed → same world, always. This is what
makes chunks regenerable on revisit and screenshot tests stable.

### Phrase-pool dialogue (no quests)

NPCs have no quest system. Each villager has a small array of context-tagged
phrases (biome × tag). Talking pulls a random phrase. The Grove Spirit speaks
exactly three scripted lines during the first-claim sequence and then idles.
**No fetch tasks. No goals from NPCs. The reward is what you build.**

### Crafting + Building is one loop

Voxel materials gathered in the wild flow into crafting stations placed in
groves. Crafting consumes inputs and produces outputs: items (tools, weapons,
consumables) or place-able blueprints (structural blocks, prefabs, decorative).
**Building is just placing what crafting produces.** One surface, one menu,
one mental model. Recipes are JSON, biome-tagged, scope-locked to actual
asset inventory.

## Key files to read first

When starting a session:

1. `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md` —
   the full RC spec, source of truth.
2. `docs/STATE.md` — current wave, what's done, what's next.
3. `memory-bank/activeContext.md` — current work focus.
4. `memory-bank/progress.md` — wave-by-wave progress.
5. `docs/ARCHITECTURE.md` — Jolly Pixel layering, persistence stack, asset
   pipeline, registries.
6. `docs/DESIGN.md` — the loop, NPC model, claim ritual, biome archetypes.
7. `docs/TESTING.md` — verification gates, screenshot list, rubric.

## Mobile-first development checklist

Before merging any UI change, verify:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets ≥ 44px
- [ ] No overlap with bottom action bar / virtual joystick
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming (≥ 14px body)
- [ ] Dialogs don't extend beyond viewport
- [ ] Canvas has `touch-action: none`
- [ ] Animations respect `prefers-reduced-motion`
- [ ] FPS ≥ 55 on mid-range mobile
- [ ] Screenshot gate updated if the surface is in `docs/rc-journey/`

## Performance budgets

| Metric | Target |
|--------|--------|
| FPS (mobile) | ≥ 55 |
| FPS (desktop) | ≥ 60 |
| Initial bundle (gz) | < 500 KB |
| Asset budget total | < 20 MB at RC |
| Lighthouse Performance (landing, mobile) | ≥ 90 |
| Lighthouse Best Practices (landing) | ≥ 95 |
| Time to interactive | < 3s |
| Memory (mobile) | < 100 MB |

Measured per-biome on a fixed test rig over a 30-second walk; numbers
committed to `docs/rc-journey/perf.md`.

## What is out of scope for RC

- Quests, fetch chains, escort missions
- Player death, permadeath, difficulty tiers
- Full 8-spirit collection arc
- Multiplayer / networked anything
- Cosmetics, skins, prestige
- Full Minecraft-scale tech tree (RC ships a small, scope-locked recipe set)

These can return post-RC if they earn it. See `docs/post-rc.md`.
