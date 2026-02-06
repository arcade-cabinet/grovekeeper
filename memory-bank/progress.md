# Progress — Grovekeeper

## Implementation Status

### Legend
- [x] Complete and working
- [~] Partially implemented (needs alignment with spec)
- [ ] Not started

## Spec Section Compliance

### Foundation (Spec Sections 1-2)
- [x] Tech stack configured (React, BabylonJS, Miniplex, Zustand, Vite, TypeScript, Biome)
- [~] Project structure — game code in `src/game/` (differs from spec's flat `src/` layout, but organized)
- [x] pnpm + Vite build pipeline working
- [~] Biome config — basic rules, needs spec's full config (quoteStyle, trailingCommas, etc.)

### Brand & Visual (Spec Sections 3-8)
- [~] Color system — using `COLORS` from config.ts, not spec's full design token system
- [ ] Typography — no Fredoka/Nunito fonts, using system fonts
- [ ] Design tokens CSS — `tokens.css` not created
- [~] Logo SVG — exists but simpler than spec's detailed badge/shield design
- [~] Farmer mascot — exists ("Fern" SVG) with bounce animation, close to spec
- [~] Main menu — working but uses different color scheme and layout than spec

### Core Game Loop (Spec Section 9)
- [x] Explore: farmer walks grid
- [x] Plant: select seed → select tile → plant
- [~] Tend: watering works, pruning not implemented
- [~] Harvest: axe removes mature trees for coins (resource yields defined but not connected)
- [ ] Expand & Unlock: no grid expansion, partial level unlocks

### Grid System (Spec Section 10)
- [x] 12x12 grid initialized
- [~] Tile types — only soil, no water/rock/path tiles
- [ ] Grid generation algorithm (70% empty, 15% blocked, 10% water, 5% path)
- [ ] Grid expansion (16, 20, 24, 32)
- [x] Grid math utilities (gridToWorld, worldToGrid, tilesInRadius, gridDistance, etc.) — **Phase A**

### 3D Scene (Spec Section 11)
- [x] Isometric ArcRotateCamera (locked)
- [x] Ground plane with procedural grass texture
- [x] Grid overlay
- [x] Hemisphere + directional lighting
- [~] Skybox — using clearColor, not full skybox
- [x] Dynamic sky colors based on time of day
- [ ] Shadow generator
- [ ] Post-processing (vignette, bloom)

### Farmer Character (Spec Section 12)
- [x] Low-poly mesh from primitives (body, head, hat)
- [x] Movement via joystick input
- [ ] Y-axis bob while moving
- [ ] Smooth rotation to face movement direction
- [ ] Exhausted speed (2 units/sec when stamina=0)

### Controls (Spec Section 13)
- [x] Mobile joystick (nipplejs)
- [x] Isometric input conversion (45deg rotation)
- [ ] Desktop WASD/arrow keys
- [ ] Tile selection via raycast (tap)
- [ ] Context-sensitive action button

### Tree Catalog (Spec Section 14)
- [x] 8 of 8 base species with full spec data — **Phase A**
- [ ] 0 of 3 prestige species
- [x] Species data includes: biome, yields, harvest cycles, specials, difficulty, evergreen — **Phase A**
- [ ] Seed costs connected to resource economy

### Growth System (Spec Section 15)
- [x] 5-stage model (Seed 0 → Sprout 1 → Sapling 2 → Mature 3 → Old Growth 4) — **Phase A**
- [x] Growth formula: `progressPerSec = (seasonMult * waterMult) / (baseTime * diffMult)` — **Phase A**
- [x] Difficulty multipliers (0.5x Easy, 1.0x Normal, 2.0x Hard) — **Phase A**
- [x] Season growth multipliers (spring 1.3x, summer 1.0x, autumn 0.7x, winter 0.0x) — **Phase A**
- [x] Evergreen winter growth (0.3x) — **Phase A**
- [x] Ghost-birch winter growth (0.5x) — **Phase A**
- [x] Watering bonus (1.3x) — **Phase A**
- [x] Stage visual interpolation (smooth scale preview) — **Phase A**
- [x] Stage bounds validation (clamped to [0, MAX_STAGE]) — **Phase A**

### Procedural Trees (Spec Section 16)
- [~] Basic cylinder trunk + sphere canopy
- [x] Seeded RNG utility (`seedRNG.ts`) — **Phase A** (not yet wired into mesh generation)
- [ ] Species-specific shapes (pine cones, willow strands, baobab bulge, etc.)
- [~] Seasonal canopy color variation (autumn/winter on border trees, not player trees)

### Tool System (Spec Section 17)
- [x] 8 tools defined with full spec data — **Phase A**
- [x] Stamina costs per tool — **Phase A**
- [x] Level-based unlocking — **Phase A**
- [x] Keyboard shortcuts defined — **Phase A**
- [x] Tool actions — trowel (plant), watering can, axe (harvest), compost bin (fertilize)
- [~] Pruning shears — defined but action not fully connected
- [ ] Context-sensitive action labels in HUD

### Stamina System (Spec Section 17.1)
- [x] Stamina component and system — **Phase A**
- [x] Drain on tool use (per-tool costs) — **Phase A**
- [x] Regen 2/sec when not acting — **Phase A**
- [x] Exhaustion at 0 (blocks actions) — **Phase A**
- [ ] Stamina HUD gauge (vertical bar)

### Season System (Spec Section 18)
- [x] Season cycling (spring → summer → autumn → winter)
- [x] Day/night cycle with dynamic lighting
- [x] Seasonal visual effects (sky, ground, canopy colors)
- [x] Season growth multipliers applied to tree growth — **Phase A**
- [ ] Weather events (rain, drought, windstorm, fog, golden hour)

### Resource Economy (Spec Section 19)
- [x] Four resource types defined (Timber, Sap, Fruit, Acorns) — **Phase A**
- [x] Resources tracked in Zustand store — **Phase A**
- [x] Species-specific yields defined in tree catalog — **Phase A**
- [ ] Harvest yields connected (harvest action → resource award)
- [ ] Seed purchase costs (deduct Acorns)
- [ ] Grid expansion costs
- [ ] Resource HUD display

### HUD (Spec Section 20)
- [x] Top bar with coins, XP, level
- [x] Tool selector (dialog-based)
- [x] Time display (day/season)
- [x] Quest panel
- [ ] Resource bar (2x2 grid of Timber/Sap/Fruit/Acorns)
- [ ] Stamina gauge (vertical bar, right side)
- [ ] Tool belt (2x4 grid, bottom-right)
- [ ] Context action button (bottom-right, shows "PLANT"/"WATER"/etc.)
- [ ] Toast notification system
- [ ] Pause menu redesign (spec's full-screen overlay)

### Progression (Spec Section 21)
- [x] XP earned from actions
- [x] Level calculation
- [~] XP formula — simple 500/level, spec has more complex formula
- [ ] Level unlock table (spec's detailed milestones)

### Achievement System (Spec Section 22)
- [ ] Not implemented (0/15 achievements from spec)

### Daily Challenge System (Spec Section 23)
- [~] Quest system exists with goal pools — different structure than spec's templates
- [ ] 24-hour real-time rotation
- [ ] Streak bonuses

### Prestige System (Spec Section 24)
- [ ] Not implemented

### ECS Architecture (Spec Section 25)
- [x] Miniplex world created
- [x] Basic entity types (tree, player, gridCell)
- [~] Entity shape differs from spec (missing: velocity, tileState tags, aura, harvestable)
- [x] Pre-defined queries

### State Management (Spec Section 26)
- [x] Zustand gameStore with persist
- [x] Resources in store — **Phase A**
- [x] Stamina in store — **Phase A**
- [ ] Separate uiStore (currently merged into gameStore)
- [ ] Separate groveStore for grid serialization

### Save System (Spec Section 27)
- [~] Zustand persist saves player state
- [ ] ECS entity serialization (trees with positions, stages)
- [ ] Auto-save on visibility change
- [ ] Offline growth calculation on resume

### Performance (Spec Section 28)
- [ ] Performance audit not done
- [ ] Instance meshes for trees
- [ ] Frozen world matrices on tiles
- [ ] Dynamic imports for code splitting

### Testing (Spec Section 29)
- [x] Vitest configured
- [x] gameStore tests (24 tests) — expanded in **Phase A**
- [x] growth system tests (16 tests) — rewritten in **Phase A**
- [x] movement system tests (9 tests)
- [x] ECS world tests (8 tests)
- [x] Grid math tests (16 tests) — **Phase A**
- [x] Seed RNG tests (7 tests) — **Phase A**
- [x] Tool catalog tests (8 tests) — **Phase A**
- [x] Tree catalog tests (8 tests) — **Phase A**
- [x] Stamina system tests (6 tests) — **Phase A**
- [ ] Season system tests
- [ ] Harvest system tests
- [ ] Component tests (MainMenu, HUD, ToolBelt)
- [ ] Integration tests (planting flow, season cycle)

## Test Coverage Summary
- **102 tests** across 9 test files, all passing
- Test files: `gridMath.test.ts`, `seedRNG.test.ts`, `tools.test.ts`, `trees.test.ts`, `world.test.ts`, `movement.test.ts`, `growth.test.ts`, `stamina.test.ts`, `gameStore.test.ts`

## Known Issues
1. `index.html` contains Onlook iframe editor script (~500 lines of injected JS) — should be removed
2. Next.js shims in `src/components/next/` are unused cruft — should be removed
3. `styled-jsx` babel plugin configured but not needed — should be removed
4. Border/player tree meshes still use `Math.random()` — not yet wired to seeded RNG
5. No error boundaries — BabylonJS errors crash the whole app
6. ECS entities not serialized in saves — trees lost on hard refresh
7. Stage 0 (Seed) nearly invisible at scale 0.05 — needs ground decal or larger mesh
8. `build` script uses `--mode development` — production builds won't tree-shake

## Version History
- **v0.1.0** — Working prototype with basic plant/grow/harvest loop
- **v0.2.0** (2026-02-06) — Phase A Foundation: spec-aligned growth, resources, stamina, tools, tree catalog. 102 tests. PR #1 merged.
