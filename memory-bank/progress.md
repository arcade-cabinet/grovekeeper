# Progress -- Grovekeeper

## Migration Status: BabylonJS -> Expo/R3F

The original BabylonJS implementation is **ARCHIVED** at `grovekeeper-babylonjs-archive/`. It was fully feature-complete (all 32 spec sections, 1188 tests, 58 test files). The project is now being rebuilt on Expo/R3F using a clean room approach.

---

## Phase 0: Foundation (COMPLETE)

- [x] Expo SDK 55 project initialization
- [x] React Three Fiber integration with Expo
- [x] NativeWind 4 setup + design tokens (earth tones, Fredoka/Nunito fonts)
- [x] React Native Reusables component library setup
- [x] Biome config
- [x] Jest test infrastructure setup
- [x] Config JSON files migrated to `config/` directory
- [x] Project structure established (app/, components/, game/, config/)
- [x] Basic navigation (MainMenu -> Game)
- [x] CI/CD and labels

## Phase 1: Port Game Logic (IN PROGRESS)

### Phase 1A: Port engine-agnostic game systems (IN PROGRESS)
- [x] Time system
- [x] Grid expansion, level unlocks, prestige
- [x] Achievements, quests, seasonal market
- [x] Tool upgrades, wild tree regrowth, zone bonuses
- [x] Species discovery
- [x] Supply/demand, market events, traveling merchant
- [ ] Remaining system ports

### Phase 1B: Port ECS + state + AI layer (IN PROGRESS)
- [x] Miniplex world + queries + archetypes
- [x] Zustand gameStore
- [x] Yuka NPC AI
- [ ] Full integration testing

### Phase 1C: expo-sqlite + drizzle integration (IN PROGRESS)
- [x] Schema definition (game/db/schema.ts)
- [x] Client setup (game/db/client.ts)
- [ ] Zustand persist middleware adapted for SQLite storage
- [ ] Migration scripts

## Phase 2: Scene Components (IN PROGRESS)

### Phase 2A: Tree generator (COMPLETE)
- [x] Three.js procedural tree geometry (game/utils/treeGeometry.ts)

### Phase 2B: R3F scene components (COMPLETE)
- [x] Camera (components/scene/Camera.tsx)
- [x] Lighting (components/scene/Lighting.tsx)
- [x] Sky (components/scene/Sky.tsx)
- [x] Ground (components/scene/Ground.tsx)
- [x] SelectionRing (components/scene/SelectionRing.tsx)

### Phase 2C: R3F entity components (IN PROGRESS)
- [ ] Player mesh
- [ ] Tree instances
- [ ] NPC meshes
- [ ] Structure meshes

### Phase 2D: Input + movement hooks (COMPLETE)
- [x] useInput hook (game/hooks/useInput.ts)
- [x] useMovement hook (game/hooks/useMovement.ts)

## Phase 3: UI Layer (IN PROGRESS)

### Phase 3A: React Native UI components (COMPLETE)
- [x] HUD (components/game/HUD.tsx)
- [x] MainMenu (components/game/MainMenu.tsx)
- [x] PauseMenu (components/game/PauseMenu.tsx)
- [x] ResourceBar, StaminaGauge, XPBar, TimeDisplay
- [x] ToolBelt, ActionButton
- [x] AchievementPopup, Toast

### Phase 3B: Game orchestrator screen (IN PROGRESS)
- [ ] Game screen integration (app/game/index.tsx)

## Phase 4: Audio + E2E (IN PROGRESS)

### Phase 4A: Audio system (IN PROGRESS)
- [x] AudioManager (game/systems/AudioManager.ts)
- [ ] Sound assets integration

### Phase 4B: Maestro E2E + Yuka governor flow (PENDING)
- [ ] Maestro E2E tests for critical flows
- [ ] Yuka governor integration

## Phase 5: Polish and Ship (PENDING)

- [ ] Performance profiling on real devices
- [ ] Weather visual effects (R3F or Animated)
- [ ] Growth animations (lerp-based)
- [ ] Desktop adaptations
- [ ] iOS build via EAS
- [ ] Android build via EAS
- [ ] Web build verification
- [ ] App store assets and metadata

---

## Archived: BabylonJS Implementation (COMPLETE)

The following was fully implemented in the BabylonJS version. See `grovekeeper-babylonjs-archive/` for reference code.

### Spec Sections (All 32 Complete)
- Foundation (Sections 1-2): React 19, BabylonJS 8, Miniplex 2, Zustand 5, Vite 6
- Brand and Visual (Sections 3-8): Design tokens, typography, logo, mascot, main menu
- Core Game Loop (Section 9): Explore, Plant, Tend, Harvest, Expand
- Grid System (Section 10): Multi-zone grids, expansion tiers
- 3D Scene (Section 11): Perspective camera, HDRI skybox, DynamicTexture ground
- Farmer Character (Section 12): Low-poly mesh, smooth rotation
- Controls (Section 13): Unified InputManager, A* pathfinding, radial action menu
- Tree Catalog (Section 14): 15 species (12 base + 3 prestige)
- Growth System (Section 15): 5-stage with spec formula
- Procedural Trees (Section 16): SPS Tree Generator, template caching
- Tool System (Section 17): 8 tools, stamina costs
- Season System (Section 18): 4 seasons, weather events, CSS overlays
- Resource Economy (Section 19): Timber, Sap, Fruit, Acorns
- HUD (Section 20): Full mobile-first HUD
- Progression (Section 21): XP, levels, unlocks
- Achievements (Section 22): 15 achievements
- Quests (Section 23): Goal pools
- Prestige (Section 24): 5 cosmetic tiers
- ECS (Section 25): Miniplex with queries
- State (Section 26): Zustand with persist
- Save System (Section 27): Auto-save, offline growth
- Performance (Section 28): Code splitting, template caching
- Testing (Section 29): 1188 tests, 58 files
- PWA (Sections 30-32): Manifest, service worker, Capacitor config

### Version History (BabylonJS Era)
- v0.1.0 -- Working prototype
- v0.2.0 -- Phase A Foundation (102 tests)
- v0.2.1 -- Phase A bug fixes
- v0.3.0 -- Phase B: Systems and Persistence
- v0.3.5 -- Phase C: Visual Polish
- v0.4.0 -- Phase D: Feature Complete (410 tests, 21 files)
- v0.5.0 -- World Architecture Overhaul
- v0.6.0 -- Alpha Release (751 tests, 37 files)
- v0.6.1 -- Unified InputManager, CI/CD (755 tests)
- v0.7.0 -- Mobile UX Overhaul (1188 tests, 58 files)
