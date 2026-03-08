# Active Context -- Grovekeeper

## Current State (2026-03-07)

The unified game design document is complete. Grovekeeper has been fully redesigned from a cozy idle grove-tending sim into a first-person survival game with bright, whimsical Wind Waker-inspired aesthetic, infinite procedural world, and a narrative spine built around 14 Grovekeepers hidden in hedge labyrinths.

**The design phase is complete. Implementation is next.**

### Design Documents Complete
- **`docs/plans/2026-03-07-unified-game-design.md`** -- Master synthesis (THE source of truth)
- 10+ domain-specific design docs covering every system
- Architecture docs for all major subsystems
- Grok integration plan as forward vision baseline

### Current Tech Stack
- **Expo SDK 55** -- Universal app (iOS + Android + Web)
- **React 19 + React Native 0.83** -- UI runtime
- **React Three Fiber 9 + drei 10** -- Declarative 3D
- **Miniplex 2.x** -- ECS (runtime game state)
- **Legend State 3.x** -- Persistent state (expo-sqlite)
- **Yuka 0.7** -- NPC AI behaviors
- **anime.js** -- NPC animation (Lego-style rigid body part rotation)
- **Tone.js** -- Audio synthesis, spatial sound, scheduling
- **Biome 2.4** -- Lint/format
- **Jest + Maestro** -- Testing

### What Exists (Built)
- Expo project structure, R3F integration, NativeWind setup
- Miniplex ECS world + queries + archetypes
- Legend State gameStore (persistent player state)
- Core game systems as pure functions: growth, weather, time, stamina, harvest, achievements, prestige
- R3F scene components: Camera, Lighting, Sky, Ground, SelectionRing
- React Native UI: HUD, MainMenu, PauseMenu, ResourceBar, ToolBelt, etc.
- Input hooks: useInput, useMovement
- ~1,057 tests across 57 test files
- 23,260 source lines, 9,917 test lines, 0 TypeScript errors

### What Needs Building (Implementation Priority)

**Phase 0: Foundation**
- SeededNoise utility (AdvancedSeededNoise: Perlin + fBm + ridged + domain warping)
- Config JSON files for new systems (terrain, water, audio, npcAnimation, seasons)
- Wire difficulty multipliers to existing systems
- Copy stylized GLBs to assets/ directory
- Tone.js integration + AudioManager refactor
- Split composite GLBs in Blender

**Phase 1: Core Visual Identity**
- GLB tree system (8 base trees, scale-per-stage, InstancedMesh)
- GLB seasonal bush system (262 bushes, season swap)
- ChibiCharacter NPC system (GLB loader + mix-and-match + anime.js animation)
- Terrain heightmap with SeededNoise
- GLB structure loader + grid-snap placement

**Phase 2: Interaction & Feel**
- Tool view model positioning + keyframe animations
- Raycast interaction (per-tool layers, crosshair)
- Impact effects (shake, particles, sound, haptics)

**Phase 3: Open World**
- Chunk-based world system (16x16, 3x3 active, 5x5 buffer)
- Delta-only persistence (ChunkDelta)
- Biome noise system (8 biomes)
- Feature placement system (discovery cadence)
- Procedural village + NPC generators
- Garden Labyrinth feature (seeded maze + hedge GLBs)

**Phase 4-8: Water, Audio, Content, UI, Polish**
- Gerstner wave water shader
- Tone.js ambient soundscape + spatial audio
- Quest system expansion (65+ templates)
- Survival HUD (hearts, hunger, temperature)
- NG+ and base building/raids
- Performance verification

## Key Design Decisions Made

1. **Survival game** -- no exploration/creative mode. Every resource earned.
2. **Infinite procedural world** -- chunk-based, delta-only persistence, seeded determinism
3. **14 Grovekeepers** as narrative spine -- hedge labyrinths, species unlocks, escalating difficulty
4. **Stylized GLBs** as visual foundation -- NOT procedural geometry for entities
5. **Tool upgrade tiers** -- Basic -> Iron (Forge) -> Grovekeeper (Grove Essence from labyrinths)
6. **12 resources** from 7 survival activities -- interlocking economy
7. **Cooking + Forging systems** -- campfire recipes + forge smelting
8. **NG+ transforms the game** -- base building mode, base raids, prestige cosmetics
9. **Tone.js** for all audio (user mandate: quality over bundle size)
10. **anime.js** for NPC animation (Lego-style rigid body part rotation)

## Known Issues

None critical. Design is complete and coherent. Implementation has not begun for the new survival/open-world systems.
