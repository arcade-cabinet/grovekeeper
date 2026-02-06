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
- [x] Explore: farmer walks grid ✓
- [x] Plant: select seed → select tile → plant ✓
- [~] Tend: watering works, pruning not implemented, no stamina
- [~] Harvest: axe removes mature trees for coins (not spec's resource types)
- [ ] Expand & Unlock: no grid expansion, partial level unlocks

### Grid System (Spec Section 10)
- [x] 12x12 grid initialized ✓
- [~] Tile types — only soil, no water/rock/path tiles
- [ ] Grid generation algorithm (70% empty, 15% blocked, 10% water, 5% path)
- [ ] Grid expansion (16, 20, 24, 32)
- [ ] Grid math utilities (gridToWorld, worldToGrid, tilesInRadius, etc.)

### 3D Scene (Spec Section 11)
- [x] Isometric ArcRotateCamera (locked) ✓
- [x] Ground plane with procedural grass texture ✓
- [x] Grid overlay ✓
- [x] Hemisphere + directional lighting ✓
- [~] Skybox — using clearColor, not full skybox
- [x] Dynamic sky colors based on time of day ✓
- [ ] Shadow generator
- [ ] Post-processing (vignette, bloom)

### Farmer Character (Spec Section 12)
- [x] Low-poly mesh from primitives (body, head, hat) ✓
- [x] Movement via joystick input ✓
- [ ] Y-axis bob while moving
- [ ] Smooth rotation to face movement direction
- [ ] Exhausted speed (2 units/sec when stamina=0)

### Controls (Spec Section 13)
- [x] Mobile joystick (nipplejs) ✓
- [x] Isometric input conversion (45deg rotation) ✓
- [ ] Desktop WASD/arrow keys
- [ ] Tile selection via raycast (tap)
- [ ] Context-sensitive action button

### Tree Catalog (Spec Section 14)
- [~] 6 of 8 base species (missing Weeping Willow, Baobab)
- [ ] 0 of 3 prestige species
- [~] Species data simplified (missing: biome, yields, harvest cycle, specials, mesh params)
- [ ] Seed costs (currently free planting)

### Growth System (Spec Section 15)
- [~] Growth progresses over time ✓
- [~] Watering bonus (1.5x for 30 sec) — spec says 1.3x permanent until stage advance
- [ ] 5-stage model (currently 7 stages)
- [ ] Difficulty multipliers
- [ ] Season growth multipliers (spec formula)
- [ ] Evergreen winter growth (0.3x)
- [ ] Stage visual interpolation

### Procedural Trees (Spec Section 16)
- [~] Basic cylinder trunk + sphere canopy ✓
- [ ] Seeded RNG for deterministic meshes
- [ ] Species-specific shapes (pine cones, willow strands, baobab bulge, etc.)
- [~] Seasonal canopy color variation (autumn/winter on border trees, not player trees)

### Tool System (Spec Section 17)
- [~] 6 tools defined (missing seed pouch, compost bin)
- [ ] Stamina costs per tool
- [ ] Level-based unlocking (currently cost-based)
- [~] Tool actions — shovel (plant), watering can, axe (harvest), fertilizer work
- [ ] Pruning shears action
- [ ] Context-sensitive action labels

### Season System (Spec Section 18)
- [x] Season cycling (spring → summer → autumn → winter) ✓
- [x] Day/night cycle with dynamic lighting ✓
- [x] Seasonal visual effects (sky, ground, canopy colors) ✓
- [ ] Season growth multipliers applied to tree growth
- [ ] Weather events (rain, drought, windstorm, fog, golden hour)

### Resource Economy (Spec Section 19)
- [ ] Four resource types (Timber, Sap, Fruit, Acorns) — currently just coins
- [ ] Species-specific yields
- [ ] Harvest cooldown timers
- [ ] Grid expansion costs
- [ ] Seed purchase costs

### HUD (Spec Section 20)
- [x] Top bar with coins, XP, level ✓
- [x] Tool selector (dialog-based) ✓
- [x] Time display (day/season) ✓
- [x] Quest panel ✓
- [ ] Season indicator panel (spec's detailed layout)
- [ ] Resource bar (2x2 grid of Timber/Sap/Fruit/Acorns)
- [ ] Stamina gauge (vertical bar, right side)
- [ ] Tool belt (2x4 grid, bottom-right)
- [ ] Context action button (bottom-right, shows "PLANT"/"WATER"/etc.)
- [ ] Toast notification system
- [ ] Pause menu redesign (spec's full-screen overlay)

### Progression (Spec Section 21)
- [x] XP earned from actions ✓
- [x] Level calculation ✓
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
- [x] Miniplex world created ✓
- [x] Basic entity types (tree, player, gridCell) ✓
- [~] Entity shape differs from spec (missing: velocity, tileState tags, aura, harvestable)
- [x] Pre-defined queries ✓

### State Management (Spec Section 26)
- [x] Zustand gameStore with persist ✓
- [ ] Separate uiStore (currently merged into gameStore)
- [ ] Separate groveStore for grid serialization

### Save System (Spec Section 27)
- [~] Zustand persist saves player state ✓
- [ ] ECS entity serialization (trees with positions, stages)
- [ ] Auto-save on visibility change
- [ ] Offline growth calculation on resume

### Performance (Spec Section 28)
- [ ] Performance audit not done
- [ ] Instance meshes for trees
- [ ] Frozen world matrices on tiles
- [ ] Dynamic imports for code splitting

### Testing (Spec Section 29)
- [x] Vitest configured ✓
- [x] gameStore tests ✓
- [x] growth system tests ✓
- [x] movement system tests ✓
- [x] ECS world tests ✓
- [ ] Grid math tests (utility not yet written)
- [ ] Seed RNG tests (utility not yet written)
- [ ] Season system tests
- [ ] Harvest system tests
- [ ] Stamina system tests
- [ ] Component tests (MainMenu, HUD, ToolBelt)
- [ ] Integration tests (planting flow, season cycle)

## Known Issues
1. `index.html` contains Onlook iframe editor script (~500 lines of injected JS) — should be removed
2. Next.js shims in `src/components/next/` are unused cruft — should be removed
3. `styled-jsx` babel plugin configured but not needed — should be removed
4. Tree meshes are not deterministic (random colors in autumn) — need seeded RNG
5. No error boundaries — BabylonJS errors crash the whole app
6. ECS entities not serialized in saves — trees lost on hard refresh

## Version History
- **v0.1.0** (current) — Working prototype with basic plant/grow/harvest loop
