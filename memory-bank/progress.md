# Progress -- Grovekeeper

## Implementation Status

All 32 spec sections are implemented. Phase D is complete. World Architecture Overhaul is complete. Mobile UX Overhaul is complete.

## Spec Section Compliance

### Foundation (Spec Sections 1-2)
- [x] Tech stack configured (React 19, BabylonJS 8, Miniplex 2, Zustand 5, Vite 6, TypeScript 5.7, Biome 2.3)
- [x] Project structure organized under `src/game/`
- [x] pnpm + Vite build pipeline with code splitting
- [x] Biome config with assist.actions.source.organizeImports + overrides for tests, .d.ts, shadcn, game UI

### Brand and Visual (Spec Sections 3-8)
- [x] Design tokens CSS -- all spec section 5 CSS custom properties
- [x] Typography -- Fredoka headings, Nunito body
- [x] Color system -- full design token system implemented
- [x] Logo SVG
- [x] Farmer mascot ("Fern" SVG) with bounce animation
- [x] Main menu with continue/new game

### Core Game Loop (Spec Section 9)
- [x] Explore: farmer walks grid across multiple zones
- [x] Plant: select seed, select tile, plant
- [x] Tend: watering, pruning, fertilizing
- [x] Harvest: species-specific resource yields
- [x] Expand and Unlock: grid expansion + level-gated species/tools

### Grid System (Spec Section 10)
- [x] Grid initialized (default 12x12 per zone)
- [x] Grid math utilities (gridToWorld, worldToGrid, tilesInRadius, gridDistance)
- [x] Grid expansion (12, 16, 20, 24, 32) with resource costs
- [x] Tile types
- [x] Multi-zone support with per-zone grid sizes

### 3D Scene (Spec Section 11)
- [x] Perspective ArcRotateCamera (replaced orthographic; viewport-adaptive, 14-40 tiles visible)
- [x] Ground plane with DynamicTexture biome blending
- [x] Grid overlay
- [x] Hemisphere + directional lighting
- [x] HDRI skybox with IBL environment
- [x] Dynamic sky colors based on time of day
- [x] StandardMaterial (NOT PBR) for structures and trees
- [x] 3D character models (player farmer, NPC villagers)

### Farmer Character (Spec Section 12)
- [x] Low-poly mesh from primitives (body, head, hat)
- [x] Movement via virtual joystick (mobile) + WASD (desktop)
- [x] Perspective camera input conversion
- [x] Smooth rotation toward movement direction
- [x] Camera follows player across zones

### Controls (Spec Section 13)
- [x] Unified InputManager (replaced nipplejs)
- [x] Virtual joystick (mobile, bottom-left), WASD/arrow keys (desktop)
- [x] Tap/click-to-move with A* pathfinding
- [x] Radial action menu on tap (trees, NPCs, ground, structures)
- [x] Selection ring (3D torus) on tapped objects
- [x] Walk-to-act: pathfind then show radial menu on arrival
- [x] Mobile action buttons (bottom-right): primary action, seeds, pause
- [x] Tile selection via raycast (tap)
- [x] Context-sensitive action button (desktop BottomControls)
- [x] Passive pointer listeners, prefers-reduced-motion camera
- [x] Joystick active flag prevents drag-to-move conflicts

### Tree Catalog (Spec Section 14)
- [x] 12 base species with full spec data
- [x] 3 prestige species (Ghost Birch, Crystal Oak, Cherry Blossom)
- [x] Species data: biome, yields, harvest cycles, specials, difficulty, evergreen
- [x] Seed costs connected to resource economy

### Growth System (Spec Section 15)
- [x] 5-stage model (Seed 0, Sprout 1, Sapling 2, Mature 3, Old Growth 4)
- [x] Growth formula: progressPerSec = (seasonMult * waterMult) / (baseTime * diffMult)
- [x] Difficulty multipliers (0.5x Easy, 1.0x Normal, 2.0x Hard)
- [x] Season growth multipliers (Spring 1.3x, Summer 1.0x, Autumn 0.7x, Winter 0.0x)
- [x] Evergreen winter growth (0.3x)
- [x] Ghost Birch winter growth (0.5x)
- [x] Watering bonus (1.3x)
- [x] Growth animations (lerp-based smooth scaling)

### Procedural Trees (Spec Section 16)
- [x] SPS Tree Generator ported from BabylonJS Extensions
- [x] Seeded RNG (seedRNG.ts) for deterministic shapes
- [x] Species-specific shapes (pine cones, willow strands, baobab bulge, etc.)
- [x] Template mesh caching with Mesh.clone instancing
- [x] Seasonal canopy color variation on player trees
- [x] Matrix freezing on stage 4 static trees

### Tool System (Spec Section 17)
- [x] 8 tools defined with full spec data
- [x] Stamina costs per tool
- [x] Level-based unlocking
- [x] Keyboard shortcuts
- [x] Tool belt HUD (bottom-right)
- [x] Context-sensitive action labels

### Stamina System (Spec Section 17.1)
- [x] Stamina drain on tool use (per-tool costs)
- [x] Regen 2/sec when not acting
- [x] Exhaustion at 0 (blocks actions)
- [x] Stamina HUD gauge

### Season System (Spec Section 18)
- [x] Season cycling (Spring, Summer, Autumn, Winter)
- [x] Day/night cycle with dynamic lighting
- [x] Seasonal visual effects (sky, ground, canopy colors)
- [x] Season growth multipliers applied
- [x] Weather events (rain, drought, windstorm)
- [x] CSS weather overlays (WeatherOverlay.tsx)
- [x] Cherry blossom petal overlay (Spring, stage 3+)

### Resource Economy (Spec Section 19)
- [x] Four resource types (Timber, Sap, Fruit, Acorns)
- [x] Resources tracked in Zustand store
- [x] Species-specific yields from tree catalog
- [x] Harvest yields connected to resource award
- [x] Seed purchase costs (deduct Acorns)
- [x] Grid expansion costs
- [x] Resource bar HUD display
- [x] Floating resource particles on harvest

### HUD (Spec Section 20)
- [x] Top bar with coins, XP, level
- [x] Resource bar (Timber/Sap/Fruit/Acorns)
- [x] Stamina gauge
- [x] Tool belt (bottom-right)
- [x] Context action button
- [x] Time display (day/season)
- [x] Quest panel
- [x] XP bar
- [x] Toast notification system
- [x] Pause menu with grid expansion and prestige
- [x] Build mode UI with structure catalog
- [x] SVG minimap with zone/structure/tree overlay

### Progression (Spec Section 21)
- [x] XP earned from actions
- [x] Level calculation
- [x] Level unlock table (species and tools)

### Achievement System (Spec Section 22)
- [x] 15 achievements implemented
- [x] Achievement checking (pure functions)
- [x] Gold-border modal with sparkle effect
- [x] Achievements list in Pause Menu

### Quest System (Spec Section 23)
- [x] Quest system with goal pools

### Prestige System (Spec Section 24)
- [x] Level 25+ threshold
- [x] Cumulative growth/XP bonuses
- [x] 5 cosmetic border themes (Stone Wall, Iron Fence, Hedge Row, Crystal Border, Ancient Runes)
- [x] Prestige UI in Pause Menu
- [x] Prestige resets generate fresh procedural worlds

### ECS Architecture (Spec Section 25)
- [x] Miniplex world with pre-defined queries
- [x] Entity types: tree, player, gridCell, harvestable, farmerState, zone, structure
- [x] Entity factories (archetypes.ts + world/archetypes.ts)
- [x] miniplex-react integration for reactive UI rendering

### State Management (Spec Section 26)
- [x] Zustand gameStore with persist middleware
- [x] Resources, stamina, achievements, prestige in store
- [x] Grove serialization (saveGrove/loadGrove) with per-zone trees
- [x] Current zone tracking

### Save System (Spec Section 27)
- [x] Zustand persist for player state
- [x] ECS entity serialization (trees with positions, stages, zones)
- [x] Auto-save on visibility change
- [x] Offline growth calculation on resume

### Performance (Spec Section 28)
- [x] Code splitting: 107 KB initial, ~500 KB total
- [x] Template mesh caching (Mesh.clone instancing)
- [x] Matrix freezing on static trees
- [x] Lazy import for GameScene
- [x] Manual chunks for BabylonJS in Vite config

### Testing (Spec Section 29)
- [x] Vitest configured with happy-dom
- [x] 1188 tests across 58 test files, all passing

### PWA (Spec Section 30-32)
- [x] PWA manifest (public/manifest.json)
- [x] Service worker (public/sw.js)
- [x] Capacitor configured (native builds not yet created)
- [x] Desktop adaptations (SVG minimap, keyboard badges, resource labels)

## World Architecture Phases

### Phase 1: Scene Decomposition
- [x] Refactor GameScene.tsx from ~1050-line monolith to ~400-line orchestrator
- [x] Extract SceneManager (Engine + Scene creation)
- [x] Extract CameraManager (orthographic, viewport-adaptive)
- [x] Extract LightingManager (day/night sync)
- [x] Extract GroundBuilder (DynamicTexture biome blending)
- [x] Extract SkyManager (HDRI skybox + IBL)
- [x] Extract PlayerMeshManager
- [x] Extract TreeMeshManager (template cache, growth animations)
- [x] Extract BorderTreeManager

### Phase 2: World Data Layer + Zones
- [x] Define ZoneDefinition and WorldDefinition interfaces
- [x] Implement WorldManager for zone loading/unloading
- [x] Create starting-world.json with 3 zones
- [x] Add structure mesh rendering to WorldManager
- [x] Update save format for per-zone trees
- [x] Implement player zone transitions
- [x] Write WorldManager tests (18 tests)

### Phase 3: Structure System
- [x] Define BlockDefinition and StructureTemplate interfaces
- [x] Create blocks.json catalog
- [x] Create structures.json with 6 structures
- [x] Implement StructureManager (placement validation, effect queries)
- [x] Implement BlockMeshFactory (procedural mesh generation)
- [x] Create BuildPanel UI
- [x] Create PlacementGhost component

### Phase 4: Minimap + miniplex-react
- [x] Create miniplex-react ECS integration (src/game/ecs/react.ts)
- [x] Rewrite MiniMap.tsx as SVG-based with ECS.Entities
- [x] Create MiniMapOverlay.tsx for mobile fullscreen

### Phase 5: World Generator
- [x] Define zone archetypes (starting, water-zone, meadow-grove, rocky-ridge, dense-forest)
- [x] Implement WorldGenerator (procedural world from seed + level)
- [x] Level-based world complexity (1-4: starting grove; 20+: 8-12 zones)
- [x] Write WorldGenerator tests (32 tests)
- [x] Integrate with prestige reset

## Mobile UX Overhaul (PR #12-15)

### Phase 1: Camera Overhaul
- [x] Switch from orthographic to perspective ArcRotateCamera
- [x] Update input conversion for perspective projection

### Phase 2: 3D Character Models
- [x] Player farmer mesh with smooth rotation
- [x] NPC villager meshes
- [x] Prevent mesh disappearing during rotation

### Phase 3: Tap/Click Object Interaction
- [x] Object picking via raycast (trees, NPCs, structures)
- [x] Radial action menu at tap position
- [x] Walk-to-act: pathfind to target, then show radial on arrival
- [x] Selection ring (3D torus) for tapped objects
- [x] radialActions.ts: pure function building actions per tile/entity state
- [x] worldToScreen.ts: BabylonJS Vector3 to screen coordinate projection

### Phase 4: Input Refinement
- [x] InputManager joystickActive flag to prevent drag conflicts
- [x] Keyboard overrides joystick movement

### Phase 5: Custom Virtual Joystick + Mobile Action Buttons
- [x] VirtualJoystick.tsx: woodland-themed (parchment base, moss knob, cardinal dots)
- [x] 60fps DOM mutation pattern (no React re-renders during drag)
- [x] Dead zone, pointer capture, spring-back animation
- [x] MobileActionButtons.tsx: context-sensitive primary action, seeds, pause
- [x] Responsive layout: joystick bottom-left, buttons bottom-right

### Phase 6: Polish
- [x] Removed deprecated InteractionMenu.tsx
- [x] Verified all touch targets >= 44px
- [x] Production bundle: 138KB initial gzip
- [x] CodeRabbit review fixes: hardware scaling, double-init guard, event handling, mesh fallback

## Test Coverage Summary

**1188 tests** across **58 test files**, all passing. TypeScript clean.

Test files cover:
- gameStore (state transitions)
- growth, movement, weather, time systems
- achievements, prestige, prestige milestones
- gridExpansion, gridGeneration, levelUnlocks
- offlineGrowth, stamina, harvest, saveLoad
- InputManager, pathfinding, pathFollowing
- discovery, recipes, trading, seasonalMarket
- toolUpgrades, wildTreeRegrowth, zoneBonuses
- treeMeshBuilder, spsTreeGenerator, gridMath, seedRNG, projection
- tool catalog, tree catalog, config, difficulty, resources
- ECS world, archetypes
- WorldManager, WorldGenerator, ZoneLoader, world archetypes
- PropFactory, BlockMeshFactory, StructureManager
- NpcManager, NpcDialogue, NewGameModal
- Integration tests, HeadlessGameLoop, GovernorAgent, governor E2E
- PlayerGovernor, db queries, localStorage migration

## Known Issues

Minimal remaining issues:
1. Capacitor native builds not yet created (no `ios/` or `android/` directories)
2. No audio system (sound effects and ambient audio are future work)
3. RulesModal tutorial is basic and could be improved

## Version History

- **v0.1.0** -- Working prototype with basic plant/grow/harvest loop
- **v0.2.0** -- Phase A Foundation: spec-aligned growth, resources, stamina, tools, tree catalog. 102 tests. PR #1 merged.
- **v0.2.1** -- Phase A bug fixes: 8 known issues resolved. PR #3 merged.
- **v0.3.0** -- Phase B: Systems and Persistence. Save/load with ECS serialization, offline growth, stamina gauge, resource bar, seed costs, species-specific harvesting. PR #4 merged.
- **v0.3.5** -- Phase C: Visual Polish. SPS Tree Generator ported, PBR materials, weather overlays, growth animations, floating particles, design tokens, typography, code splitting. Achievement system, grid expansion, prestige system.
- **v0.4.0** -- Phase D: Feature Complete. All 32 spec sections implemented. 11 species (8 base + 3 prestige). 15 achievements. 5 prestige border tiers. Desktop adaptations. PWA manifest + service worker. 410 tests across 21 files. TypeScript clean.
- **v0.5.0** -- World Architecture Overhaul: Multi-zone world system, structure placement, procedural world generation, scene decomposition, miniplex-react integration, SVG minimap. GameScene.tsx refactored from ~1050 to ~400 lines. Camera changed to orthographic diorama (NOT isometric). Biome 2.3 with configured overrides.
- **v0.6.0** -- Alpha Release: New systems (discovery, recipes, trading, seasonal market, tool upgrades, wild tree regrowth, zone bonuses). 15 species (12 base + 3 prestige). 751 tests across 37 files.
- **v0.6.1** -- Unified InputManager (replaced nipplejs), A* pathfinding, tap/click-to-move. CI/CD with GitHub Pages deploy. 6 CodeRabbit improvements (O(n) growth, late-binding harvest, passive listeners, reduced-motion camera, deterministic wild trees). 755 tests.
- **v0.7.0** -- Mobile UX Overhaul: Perspective camera, 3D character models, virtual joystick (custom woodland-themed), mobile action buttons, radial action menu with selection ring, walk-to-act, worldToScreen projection. PR #12-15. 1188 tests across 58 files.
