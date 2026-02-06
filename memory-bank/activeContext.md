# Active Context — Grovekeeper

## Current State (2026-02-06)

**Phase A: Foundation** is complete and merged to main (PR #1). The project now has spec-aligned core systems: 5-stage growth, 8 tree species, 8 tools, 4 resource types, stamina, seeded RNG, and grid math utilities. 102 unit tests passing.

## Last Session

### Completed
- Executed full Phase A Foundation plan (8 tasks)
- Seeded RNG utility (`seedRNG.ts`) with 7 tests
- Grid math utilities (`gridMath.ts`) with 16 tests
- Resource type definitions (`resources.ts`)
- Tree catalog aligned to spec: 8 base species with full data
- Tool system: 8 tools with stamina costs, unlock levels, keybinds
- Growth system refactored: 5-stage model with season/difficulty/water multipliers
- Stamina system: drain on tool use, regen over time, exhaustion at 0
- Integration: all new systems wired into GameScene + gameStore
- CodeRabbit review fixes: Math.floor for grid, bounds checks in growth
- Browser play-tested via Chrome MCP: confirmed rendering, planting, HUD
- PR #1 merged to main via squash merge

### Bug Fixes Applied
- `worldToGrid` used `Math.round` (wrong for tile centers) → `Math.floor`
- `getStageScale` had no bounds validation → clamped to [0, MAX_STAGE]
- `calcGrowthRate` could divide by zero with invalid baseTime → guard added
- `getActionButtonStyle` used old tool IDs → updated to new 8-tool set
- RulesModal tutorial text referenced "shovel" → updated to "trowel"

### Known Issues from Play-Testing
- Stage 0 (Seed) has scale 0.0, min clamped to 0.05 — planted trees are nearly invisible behind player (spec intends ground decal for seed stage)
- Border trees still use `Math.random()` for colors (not seeded RNG yet)
- Player tree meshes still use `Math.random()` for slight variation (not seeded RNG yet)

## What's Working Right Now
- BabylonJS scene with isometric camera, lighting, ground plane
- Farmer character with joystick + WASD movement
- Grid initialization (12x12 soil tiles)
- Tree planting (trowel → seed select → plant on tile)
- 5-stage tree growth with spec-aligned formula
- Season/difficulty/water growth multipliers
- Stamina system (drain + regen)
- 4 resource types (Timber/Sap/Fruit/Acorns) in store
- 8 tree species with full catalog data
- 8 tools with stamina costs and unlock levels
- Harvesting via axe (mature trees → coins + resources)
- Day/night cycle with dynamic sky colors
- Season cycle with visual changes
- Quest/goal system
- Main menu, HUD, tool selection
- Zustand persistence to localStorage
- Haptic feedback via Capacitor
- 102 unit tests passing

## Current Focus: Phase B — Systems & Persistence

### Priority 1: Save/Load with ECS Serialization
- Trees are lost on page refresh (ECS entities not persisted)
- Need `saveGrove()` / `loadGrove()` that serialize tree entities
- Auto-save on visibility change
- Offline growth calculation on resume

### Priority 2: Stamina HUD Integration
- Stamina system exists but no visual gauge in HUD
- Spec calls for vertical bar on right side

### Priority 3: Resource HUD Integration
- Resources tracked in store but not displayed
- Spec calls for 2x2 resource grid in HUD

### Priority 4: Seed Costs & Resource Spending
- Currently free planting
- Need to deduct seed costs (Acorns) from resources

### Priority 5: Species-specific Harvesting
- Harvest yields defined in tree catalog but not connected
- Need to award correct resource types per species

## Open Questions
- Should we implement grid expansion (16→20→24→32) in Phase B or defer?
- What's the UX for the seed stage visibility problem (ground decal vs larger mesh)?
- Should offline growth use simplified calculation or full simulation?
