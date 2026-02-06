# Active Context -- Grovekeeper

## Current State (2026-02-06)

World Architecture Overhaul is complete. The project has evolved from a single 12x12 grid to a multi-zone world with modular scene management, procedural world generation, and a structure placement system. 516 tests across 25 files, all passing. TypeScript clean (zero errors).

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
- SPS Tree Generator (ported from BabylonJS Extensions) with 11 species
- Template mesh caching with Mesh.clone instancing
- Matrix freezing on stage 4 static trees (LOD)
- Ghost Birch night glow variant (emissive material, separate cache entry)
- Crystal Oak prismatic seasonal tints
- Cherry blossom falling petal overlay (CSS)
- Growth animations (lerp-based smooth scaling)
- Seasonal tree mesh rebuild on season change

### Gameplay Systems
- Farmer character with joystick (mobile) + WASD (desktop) movement
- Camera follows player smoothly across zone transitions
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
- Code splitting (107 KB initial, ~500 KB total game load)
- PWA manifest + service worker
- Zustand persistence with localStorage
- Capacitor configured (not yet built for native)
- Biome 2.3 with configured overrides for tests, .d.ts, shadcn, game UI

## No Active Work

The game is feature-complete with World Architecture. No active development tasks.

## Potential Future Work

- Native Capacitor builds (iOS/Android) -- config exists, no platform directories yet
- Sound effects and ambient audio -- no audio system implemented
- Social features (compare groves) -- would require a backend
- Additional prestige species beyond current 3
- Additional zone types and biomes beyond current archetypes
- Structure upgrade tiers (basic → enhanced → advanced)
- Tutorial improvements (current RulesModal is basic)
- Error boundaries for BabylonJS crash recovery
- Performance profiling on actual mobile devices
- E2E testing with Playwright or Cypress
