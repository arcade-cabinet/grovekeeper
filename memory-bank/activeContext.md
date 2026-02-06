# Active Context — Grovekeeper

## Current State (2025-02-06)

The project has a **working prototype** with a playable core loop but is far from the production-complete state described in `GROVEKEEPER_BUILD_PROMPT.md`. The gap between current code and spec needs systematic closing.

## Last Session

### Completed
- Comprehensive codebase audit comparing current state vs canonical spec
- Created `CLAUDE.md` — project-specific development guidance for Claude Code
- Created `AGENTS.md` — multi-agent orchestration guide with memory bank protocol
- Initialized memory bank with all 6 core files
- Identified all gaps between current implementation and spec

### Decisions Made
- **Keep Tailwind + shadcn/ui** — better DX than spec's CSS Modules, already integrated
- **Keep BabylonJS 8.x** — newer than spec's 7.x, no downgrade needed
- **Keep Capacitor** — additive to spec's PWA approach, enables native haptics
- **Keep enhanced time system** — richer than spec's simple 4-day seasons
- **Keep quest system** — complements spec's daily challenges
- **Prioritize foundation alignment** over new features — growth system, resource economy, and stamina are the critical gaps

## What's Working Right Now
- BabylonJS scene with isometric camera, lighting, ground plane
- Farmer character (low-poly primitives) with joystick movement
- Grid initialization (12x12 soil tiles)
- Tree planting (shovel → seed select → plant on tile)
- Tree growth (time-based, affected by watering)
- Harvesting via axe (mature trees → coins)
- Day/night cycle with dynamic sky and lighting
- Season cycle with visual changes (ground, canopy colors)
- Quest/goal system with daily generation
- Main menu with continue/new game
- HUD with stats, tools, time display
- Zustand persistence to localStorage
- Haptic feedback via Capacitor

## Current Focus: Foundation Alignment

The next work should focus on aligning the game systems with the canonical spec before adding new features.

### Priority 1: Growth System Alignment
- Current: 7 stages (seed/sprout/seedling/sapling/young/mature/ancient), progress 0→1.5
- Spec: 5 stages (Seed 0 / Sprout 1 / Sapling 2 / Mature 3 / Old Growth 4), progress 0→1 per stage
- Need: Refactor to spec's model with difficulty multipliers, season/water bonuses

### Priority 2: Resource Economy
- Current: Simple coins
- Spec: Timber, Sap, Fruit, Acorns — each earned from specific species
- Need: New resource types, species yields, seed costs, grid expansion costs

### Priority 3: Stamina System
- Current: Not implemented
- Spec: 100 max stamina, drain per tool action, regen 2/sec
- Need: New ECS component + system + HUD gauge

### Priority 4: Tree Catalog Alignment
- Current: 6 species (oak, birch, pine, maple, cherry, redwood) with simple data
- Spec: 8 base + 3 prestige species with complex data (biomes, yields, harvest cycles, specials)
- Need: Major data restructure

## Open Questions
- Should we migrate colors to spec's design token system or keep current approach?
- Should we introduce Fredoka + Nunito fonts now or defer to polish phase?
- What's the minimum viable save system for ECS entity serialization?

## Next Steps (Priority Order)
1. Refactor growth system to spec's 5-stage model
2. Add resource types (Timber/Sap/Fruit/Acorns) to store and HUD
3. Implement stamina system (component, system, HUD gauge)
4. Add seeded RNG utility (`seedRNG.ts`)
5. Add grid math utilities (`gridMath.ts`)
6. Update tree species data to match spec's catalog
7. Update tool definitions with stamina costs and unlock levels
