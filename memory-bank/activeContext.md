# Active Context -- Grovekeeper

## Current State (2026-02-08)

Alpha release is live at https://arcade-cabinet.github.io/grovekeeper/. All game systems implemented. Mobile UX overhaul complete with perspective camera, virtual joystick, radial action menu, and mobile action buttons. 1188 tests across 58 files, all passing. TypeScript clean.

## What's Working

Complete list of all implemented systems:

### Mobile UX Overhaul (NEW -- v0.7.0)
- Perspective ArcRotateCamera (replaced orthographic)
- 3D character models (player farmer, NPC villagers) with smooth rotation
- Virtual joystick (bottom-left): custom woodland-themed, 60fps DOM mutation, dead zone, spring-back
- Mobile action buttons (bottom-right): context-sensitive primary action, seeds, pause
- Radial action menu: circular action picker at tap position for trees/NPCs/ground/structures
- Selection ring: 3D torus highlight on tapped objects
- Walk-to-act: pathfind to target, show radial menu on arrival
- worldToScreen projection utility (engine hardware scaling aware)
- InputManager joystick integration (prevents drag conflicts)

### World Architecture
- Multi-zone world system with seamless zone transitions
- 3 starting zones: Starting Grove (12x12, soil), Forest Trail (4x8, dirt), Sunlit Clearing (8x8, grass)
- WorldManager with zone loading/unloading and structure mesh rendering
- WorldGenerator for procedural world creation from seed + player level (1-4: starting grove; 20+: 8-12 zones)
- Prestige resets generate fresh worlds
- Per-zone tree save format
- Zone archetype definitions with biome rules

### Structure System
- 6 structures: Wooden Fence, Tool Shed, Greenhouse, Market Stall, Well, Bench
- StructureManager with placement validation and effect queries
- BlockMeshFactory for procedural mesh generation from block definitions
- BuildPanel UI for build mode
- PlacementGhost for translucent placement preview
- Block catalog (blocks.json) and structure templates (structures.json)

### Scene Architecture
- GameScene.tsx orchestrator (~1600 lines with mobile UX additions)
- Modular managers:
  - SceneManager: Engine + Scene creation/disposal
  - CameraManager: Perspective ArcRotateCamera, viewport-adaptive
  - LightingManager: Hemisphere + directional light, day/night sync
  - GroundBuilder: DynamicTexture biome blending
  - SkyManager: HDRI skybox + IBL environment
  - PlayerMeshManager: Player mesh lifecycle with smooth rotation
  - TreeMeshManager: Template cache, clone, growth animation lerp, matrix freezing
  - BorderTreeManager: Decorative border tree placement
  - SelectionRingManager: 3D torus highlight ring for tap interactions

### 3D Scene and Rendering
- BabylonJS scene with perspective camera
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
- Unified InputManager: virtual joystick (mobile), WASD (desktop), tap-to-move with A* pathfinding
- Radial action menu for tap interactions (replaces old InteractionMenu)
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
- Code splitting (138 KB initial gzip, ~500 KB total game load)
- PWA manifest + service worker
- Zustand persistence with localStorage
- Capacitor configured (not yet built for native)
- Biome 2.3 with configured overrides for tests, .d.ts, shadcn, game UI

## Active Work (2026-02-08)

Working on the next round of improvements:

1. **SonarCloud quality gate** -- Failing on CI, needs investigation and fix
2. **Sound/audio system** -- No audio currently, adding ambient + SFX
3. **Tutorial improvements** -- Replace basic RulesModal with interactive onboarding
4. **Capacitor native builds** -- Initialize iOS/Android platforms
5. **E2E tests** -- Add Playwright for critical user flows
6. **Performance profiling** -- Real device testing and optimization

## Known Issues

1. SonarCloud quality gate failing on CI (pre-existing, not from recent changes)
2. Capacitor native builds not yet created (no `ios/` or `android/` directories)
3. No audio system (sound effects and ambient audio)
4. RulesModal tutorial is basic
5. No E2E tests
