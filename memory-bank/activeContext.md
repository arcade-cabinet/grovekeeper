# Active Context -- Grovekeeper

## Current State (2026-02-07)

Alpha release is live at https://arcade-cabinet.github.io/grovekeeper/. All game systems implemented. CI/CD pipeline with GitHub Actions (CI + Deploy + Release). Unified InputManager replaced nipplejs with drag-to-move, WASD, and tap/click-to-move A* pathfinding. 755 tests across 37 files, all passing. TypeScript clean.

## What's Working

Complete list of all implemented systems:

### World Architecture (NEW)
- Multi-zone world system with seamless zone transitions
- 3 starting zones: Starting Grove (12x12, soil), Forest Trail (4x8, dirt), Sunlit Clearing (8x8, grass)
- WorldManager with zone loading/unloading and structure mesh rendering
- WorldGenerator for procedural world creation from seed + player level (1-4: starting grove; 20+: 8-12 zones)
- Prestige resets generate fresh worlds
- Per-zone tree save format
- Zone archetype definitions with biome rules

### Structure System (NEW)
- 6 structures: Wooden Fence, Tool Shed, Greenhouse, Market Stall, Well, Bench
- StructureManager with placement validation and effect queries
- BlockMeshFactory for procedural mesh generation from block definitions
- BuildPanel UI for build mode
- PlacementGhost for translucent placement preview
- Block catalog (blocks.json) and structure templates (structures.json)

### Scene Architecture (REFACTORED)
- GameScene.tsx reduced from ~1050 lines to ~400-line orchestrator
- Modular managers:
  - SceneManager: Engine + Scene creation/disposal
  - CameraManager: Orthographic ArcRotateCamera (NOT isometric), viewport-adaptive scaling (14-40 tiles visible)
  - LightingManager: Hemisphere + directional light, day/night sync
  - GroundBuilder: DynamicTexture biome blending (distance-field weights, inverse smoothstep)
  - SkyManager: HDRI skybox (HDRCubeTexture) + IBL environment
  - PlayerMeshManager: Player mesh lifecycle
  - TreeMeshManager: Template cache, clone, growth animation lerp, matrix freezing
  - BorderTreeManager: Decorative border tree placement

### Minimap (REWRITTEN)
- SVG-based minimap using miniplex-react's createReactAPI
- ECS.Entities for reactive zone/structure/tree rendering
- MiniMapOverlay for mobile fullscreen minimap

### 3D Scene and Rendering
- BabylonJS scene with orthographic diorama camera (30° beta, camera from south)
- HDRI skybox from Poly Haven with IBL environment
- DynamicTexture ground with smooth biome blending
- StandardMaterial (NOT PBR) for structures and trees
- SPS Tree Generator (ported from BabylonJS Extensions) with 15 species (12 base + 3 prestige)
- Template mesh caching with Mesh.clone instancing
- Matrix freezing on stage 4 static trees (LOD)
- Ghost Birch night glow variant (emissive material, separate cache entry)
- Crystal Oak prismatic seasonal tints
- Cherry blossom falling petal overlay (CSS)
- Growth animations (lerp-based smooth scaling)
- Seasonal tree mesh rebuild on season change

### Gameplay Systems
- Unified InputManager: drag-to-move (mobile), WASD (desktop), tap/click-to-move with A* pathfinding
- Camera follows player smoothly across zone transitions (snaps when prefers-reduced-motion)
- 5-stage growth system with spec formula (season, difficulty, water multipliers)
- Weather events (rain/drought/windstorm) with CSS overlays
- 4 resource types (Timber, Sap, Fruit, Acorns)
- 8 tools with stamina system (drain, regen, exhaustion)
- Resource floating particles on harvest
- Quest/goal system
- Offline growth calculation on resume
- Save/load with ECS serialization (per-zone trees)

### Progression and Meta-Systems
- 15 achievements with gold-border modal UI (sparkle effect, auto-dismiss)
- Prestige system (level 25+) with 5 cosmetic border themes (Stone Wall through Ancient Runes)
- Grid expansion (12 to 16 to 20 to 24 to 32) with resource costs
- Level unlocks for species and tools
- XP and coin economy

### UI and Polish
- Desktop adaptations (SVG minimap, keyboard badges, resource labels)
- Design tokens (all CSS custom properties from spec section 5)
- Typography (Fredoka headings, Nunito body)
- Toast notification system
- Stamina gauge, resource bar, tool belt, XP bar
- Action button with context-sensitive labels
- Achievements list in Pause Menu
- Grid expansion purchase in Pause Menu
- Build mode UI with structure catalog

### Infrastructure
- CI/CD: GitHub Actions (CI + Deploy to GitHub Pages + Release)
- Live at: https://arcade-cabinet.github.io/grovekeeper/
- Code splitting (107 KB initial, ~500 KB total game load)
- PWA manifest + service worker
- Zustand persistence with localStorage
- Capacitor configured (not yet built for native)
- Biome 2.3 with configured overrides for tests, .d.ts, shadcn, game UI

## No Active Work

The game is feature-complete. Alpha release live on GitHub Pages.

## Potential Future Work

- Native Capacitor builds (iOS/Android) -- config exists, no platform directories yet
- Sound effects and ambient audio -- no audio system implemented
- Social features (compare groves) -- would require a backend
- Additional prestige species beyond current 3
- Additional zone types and biomes beyond current archetypes
- Structure upgrade tiers (basic → enhanced → advanced)
- Tutorial improvements (current RulesModal is basic)
- Performance profiling on actual mobile devices
- E2E testing with Playwright or Cypress
