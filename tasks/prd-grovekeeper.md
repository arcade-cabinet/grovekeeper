# PRD: Grovekeeper Full Game Implementation

## Introduction

Complete implementation of Grovekeeper, a Wind Waker-inspired first-person grove-tending survival game built with Expo + React Three Fiber + Miniplex ECS. The game features infinite procedural worlds, Gerstner wave water, 1,437 stylized GLB assets, seed-deterministic quest branching, and Grovekeeper spirits at hedge maze centers.

Full spec: `docs/GAME_SPEC.md` (1,510 lines, 39 sections). ECS components pre-defined. Config JSONs in place. 1,244 tests passing.

## Goals

- Implement all 12 phases from design to playable game
- Every system has Jest unit tests written alongside implementation
- Zero TypeScript errors at every step
- Mobile-first (375px min, 44px touch targets, FPS >= 55)
- All randomness via scopedRNG (zero Math.random)
- All tuning in config/game/*.json (zero inline constants)

## User Stories

### US-001: Remove GridCellComponent references from game systems
**Description:** As a developer, I want to remove legacy grid-based code so the codebase is ready for chunk-based world generation. See GAME_SPEC.md S39.3.
**Acceptance Criteria:**
- [ ] Find all files importing GridCellComponent from game/systems/ and game/hooks/
- [ ] Replace grid-based logic with chunk-based equivalents
- [ ] `grep -r "GridCellComponent" game/systems/` returns 0 matches
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-002: Remove FarmerState references from game systems
**Description:** As a developer, I want to eliminate FarmerState so player state uses PlayerComponent exclusively.
**Acceptance Criteria:**
- [ ] Replace all FarmerState stamina/state references with PlayerComponent
- [ ] `grep -r "FarmerState" game/` returns 0 matches
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-003: Remove ZoneComponent references from game systems
**Description:** As a developer, I want to remove zone-based logic in favor of chunk coordinates.
**Acceptance Criteria:**
- [ ] Replace all ZoneComponent references with ChunkComponent
- [ ] `grep -r "ZoneComponent" game/` returns 0 matches (except LEGACY comments)
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-004: Remove legacy queries and Entity fields from world.ts
**Description:** As a developer, I want world.ts clean of all legacy fields and queries.
**Acceptance Criteria:**
- [ ] Remove gridCellsQuery, farmerQuery from world.ts
- [ ] Remove gridCell, farmerState, zone, zoneId from Entity interface
- [ ] Remove all "LEGACY" comments
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-005: Remove legacy component interfaces from core.ts
**Description:** As a developer, I want core.ts to contain only active component interfaces.
**Acceptance Criteria:**
- [ ] Delete GridCellComponent, FarmerState, ZoneComponent interfaces
- [ ] core.ts is under 50 lines
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-006: Update all tests to remove legacy type references
**Description:** As a developer, I want all tests passing without any legacy type references.
**Acceptance Criteria:**
- [ ] Fix all test files referencing removed types
- [ ] Full test suite passes with 0 failures
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-007: Install @react-three/rapier and add Physics provider
**Description:** As a developer, I want Rapier physics available in the R3F scene. See GAME_SPEC.md S38.
**Acceptance Criteria:**
- [ ] `pnpm add @react-three/rapier` succeeds
- [ ] Wrap Canvas children in `<Physics>` in app/game/index.tsx
- [ ] App renders without errors
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-008: Create player capsule RigidBody component
**Description:** As a developer, I want a physics-enabled player capsule for FPS movement.
**Acceptance Criteria:**
- [ ] New file components/player/PlayerCapsule.tsx
- [ ] RigidBody type="dynamic" with CapsuleCollider (height 1.8, radius 0.3)
- [ ] Component renders in scene without errors
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-009: Implement FPS camera attached to player capsule
**Description:** As a player, I want to see the world from first-person perspective.
**Acceptance Criteria:**
- [ ] New file components/player/FPSCamera.tsx
- [ ] Camera position = capsule position + (0, 1.6, 0) eye height
- [ ] useFrame updates camera position every frame
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-010: Add WASD movement via capsule velocity
**Description:** As a player, I want to move with WASD keys relative to where I'm looking.
**Acceptance Criteria:**
- [ ] Forward/back/strafe movement relative to camera yaw
- [ ] Movement speed configurable
- [ ] Sprint on Shift key (increased speed)
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-011: Implement jump and gravity
**Description:** As a player, I want to jump and experience gravity.
**Acceptance Criteria:**
- [ ] Space key applies upward impulse when grounded
- [ ] Ground detection via raycast down from capsule
- [ ] Cannot double-jump
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-012: Add mouse look with pointer lock
**Description:** As a player, I want to look around by moving the mouse.
**Acceptance Criteria:**
- [ ] Click canvas to lock pointer
- [ ] Mouse delta rotates camera yaw (horizontal) and pitch (vertical)
- [ ] Pitch clamped to +-85 degrees
- [ ] ESC unlocks pointer
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-013: Write Jest tests for player physics
**Description:** As a developer, I want physics behavior verified by tests.
**Acceptance Criteria:**
- [ ] Test capsule dimensions match spec (height 1.8, radius 0.3)
- [ ] Test movement vector from WASD input
- [ ] Test jump impulse magnitude
- [ ] Test ground detection raycast
- [ ] 8+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-014: Write Jest tests for camera follow
**Description:** As a developer, I want camera behavior verified by tests.
**Acceptance Criteria:**
- [ ] Test eye height offset (1.6 above capsule)
- [ ] Test yaw rotation from mouse deltaX
- [ ] Test pitch clamping at +-85 degrees
- [ ] 6+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-015: Implement SeededNoise utility
**Description:** As a developer, I want deterministic noise for terrain generation. See GAME_SPEC.md S31.1.
**Acceptance Criteria:**
- [ ] New file game/utils/seededNoise.ts
- [ ] Perlin noise, fBm, ridged multifractal, domain warping
- [ ] All functions accept seed parameter
- [ ] Same seed+coords always returns same value
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-016: Write Jest tests for SeededNoise
**Description:** As a developer, I want noise determinism verified.
**Acceptance Criteria:**
- [ ] Test same seed+coords = same output (10 samples)
- [ ] Test different seeds produce different output
- [ ] Test fBm produces fractal detail (stddev > 0)
- [ ] Test ridged produces ridge features
- [ ] 10+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-017: Implement ChunkManager
**Description:** As a developer, I want chunks to load/unload around the player. See GAME_SPEC.md S31.1.
**Acceptance Criteria:**
- [ ] New file game/world/ChunkManager.ts
- [ ] Tracks player chunk coordinates
- [ ] Loads 3x3 active ring, 5x5 buffer ring
- [ ] Unloads chunks outside buffer ring
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-018: Write Jest tests for ChunkManager
**Description:** As a developer, I want chunk management verified.
**Acceptance Criteria:**
- [ ] Test correct chunks load for player at (0,0)
- [ ] Test chunks update when player crosses boundary
- [ ] Test no duplicate chunk loads
- [ ] Test unload fires for distant chunks
- [ ] 8+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-019: Generate terrain heightmap per chunk
**Description:** As a developer, I want terrain height data for each chunk.
**Acceptance Criteria:**
- [ ] New file game/world/terrainGenerator.ts
- [ ] Fills TerrainChunkComponent.heightmap (16x16 Float32Array)
- [ ] Uses SeededNoise with worldSeed + chunkCoords
- [ ] Deterministic output for same seed
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-020: Implement biome assignment
**Description:** As a developer, I want each chunk assigned a biome. See GAME_SPEC.md S31.1.
**Acceptance Criteria:**
- [ ] New file game/world/biomeMapper.ts
- [ ] Temperature + moisture noise at chunk scale
- [ ] Maps to 8 biomes: forest, meadow, desert, swamp, tundra, mountains, beach, volcanic
- [ ] Assigns baseColor from config/game/procedural.json
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-021: Write Jest tests for biome mapper
**Description:** As a developer, I want biome assignment verified.
**Acceptance Criteria:**
- [ ] Test same seed+coords = same biome
- [ ] Test all 8 biomes are reachable
- [ ] Test baseColor matches procedural.json config
- [ ] 8+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-022: Create terrain mesh R3F component
**Description:** As a player, I want to see the terrain in 3D.
**Acceptance Criteria:**
- [ ] New file components/scene/TerrainChunk.tsx
- [ ] PlaneGeometry with vertex displacement from heightmap
- [ ] Vertex colors from biome baseColor
- [ ] Renders without errors
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-023: Add Rapier trimesh collider per terrain chunk
**Description:** As a player, I want to walk on the terrain.
**Acceptance Criteria:**
- [ ] TrimeshCollider from terrain geometry vertices
- [ ] Player capsule rests on terrain surface
- [ ] Collision works on slopes
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-024: Implement delta-only chunk persistence
**Description:** As a player, I want my changes to persist when I revisit areas. See GAME_SPEC.md S26.
**Acceptance Criteria:**
- [ ] New file game/world/chunkPersistence.ts
- [ ] Only stores player-modified entities (planted, harvested, built, removed)
- [ ] On chunk load: regenerate from seed, then apply stored diffs
- [ ] Legend State storage via gameStore
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-025: Create InputManager with InputFrame
**Description:** As a developer, I want a unified input system. See GAME_SPEC.md S23.
**Acceptance Criteria:**
- [ ] New file game/input/InputManager.ts
- [ ] InputFrame interface: moveX, moveZ, lookDeltaX, lookDeltaY, jump, interact, toolSwap, sprint
- [ ] Singleton pattern with getFrame() method
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-026: Implement KeyboardMouseProvider
**Description:** As a desktop player, I want WASD + mouse controls.
**Acceptance Criteria:**
- [ ] New file game/input/KeyboardMouseProvider.ts
- [ ] WASD for movement, mouse for look, space for jump, E for interact
- [ ] Registers event listeners on window
- [ ] Produces normalized InputFrame values
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-027: Implement TouchProvider with virtual joystick
**Description:** As a mobile player, I want touch controls. See GAME_SPEC.md S23.
**Acceptance Criteria:**
- [ ] New file game/input/TouchProvider.ts
- [ ] Custom virtual joystick (left side, no nipplejs dependency)
- [ ] Look zone (right side for camera rotation)
- [ ] Jump and interact buttons (44px touch targets)
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-028: Write Jest tests for input system
**Description:** As a developer, I want input processing verified.
**Acceptance Criteria:**
- [ ] Test InputFrame normalization (values -1 to 1)
- [ ] Test keyboard key mapping
- [ ] Test joystick angle to direction vector
- [ ] 10+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-029: Implement save/load with Legend State
**Description:** As a player, I want my progress saved. See GAME_SPEC.md S26.
**Acceptance Criteria:**
- [ ] gameStore.ts save/load: player state, chunk deltas, quest progress, settings
- [ ] Auto-save on app background event
- [ ] expo-sqlite persistence
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-030: Write Jest tests for save/load
**Description:** As a developer, I want save persistence verified.
**Acceptance Criteria:**
- [ ] Test round-trip: create state, save, clear, load, verify equality
- [ ] Test auto-save trigger on background event
- [ ] 6+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-031: Implement game mode config
**Description:** As a player, I want to choose Exploration or Survival mode. See GAME_SPEC.md S37.
**Acceptance Criteria:**
- [ ] Update config/game/difficulty.json with exploration mode
- [ ] Exploration: all survival multipliers zero, weather visual-only
- [ ] Survival sub-difficulties: Gentle/Standard/Harsh/Ironwood
- [ ] Systems check affectsGameplay flag
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-032: Write Jest tests for difficulty config
**Description:** As a developer, I want difficulty loading verified.
**Acceptance Criteria:**
- [ ] Test all tiers load correctly from JSON
- [ ] Test exploration mode zeroes survival drains
- [ ] Test multiplier application to stamina/growth/damage
- [ ] 6+ tests pass
- [ ] npx tsc --noEmit passes
- [ ] npx jest --no-coverage passes

### US-033 through US-144
*See prd.json for complete story definitions. Each follows the same format with specific acceptance criteria, all ending with TypeScript and test verification.*

## Functional Requirements

- FR-1: All randomness via scopedRNG(scope, worldSeed, ...extra) -- zero Math.random()
- FR-2: All tuning constants in config/game/*.json -- zero inline magic numbers
- FR-3: No file exceeds 300 lines -- decompose into subpackage with index.ts barrel
- FR-4: Mobile-first: 375px min viewport, 44px touch targets, portrait-primary
- FR-5: Modern Zelda-style rendering: MSAA antialiasing, device-native pixel ratio, smooth PBR shading, linear filtering
- FR-6: FPS >= 55 on mobile, >= 60 on desktop
- FR-7: Draw calls < 50 via InstancedMesh batching
- FR-8: Memory < 100MB on mobile
- FR-9: Named exports only -- never export default
- FR-10: pnpm only -- never npm or yarn
- FR-11: Biome lint/format only -- never ESLint or Prettier
- FR-12: Tests written WITH each story, not deferred

## Non-Goals

- No multiplayer or networking
- No procedural music generation (use Tone.js for synth SFX only)
- No skeletal animation (anime.js rigid-body rotation only)
- No cloud saves (local expo-sqlite only)
- No microtransactions or IAP
- No web deployment (mobile native only via Expo)

## Technical Considerations

- ECS components are fully defined in game/ecs/components/ (10 files + procedural subpackage)
- 1,437 stylized GLB assets copied into assets/models/ from asset library
- Config JSONs in config/game/ cover all tunable parameters
- Rapier physics replaces grid-based collision
- Chunk-based infinite world replaces zone-based fixed areas
- Git LFS configured for all binary assets

## Success Metrics

- All 144 user stories pass their acceptance criteria
- Full test suite (target 2,500+ tests) passes with zero failures
- Zero TypeScript errors
- Playable end-to-end: menu -> new game -> tutorial -> open world -> quests -> NG+
- Meets all performance budgets (FPS, memory, draw calls)
