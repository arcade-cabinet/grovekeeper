# Grovekeeper QC Master Analysis
**Date:** 2026-03-07
**Scope:** US-001 through US-151 (151 completed ralph-tui iterations)
**Method:** 6 parallel investigative agents across independent domains
**Branch:** feat/expo-migration (currently on US-152)

---

## Executive Summary

Ralph-tui has implemented every game system as a correct, well-tested pure-function module. The test suite (3,503 tests, 148 suites, 0 failures) and TypeScript (0 errors) give a green surface. Under the surface, **roughly 70% of the codebase is disconnected from the running game.**

The failure mode is systemic and consistent across all domains: ralph built the functions, wrote the tests, committed a "Wire X to Y" story, and moved on — but the wiring is shallow or entirely absent. The actual runtime game is a narrow slice of what exists in the codebase.

**What actually runs at runtime:**
- Tree growth (stages, offline growth)
- Stamina regeneration (tool spend only — not exhaustion blocking)
- Weather state machine (transitions only — no gameplay impact)
- Harvest cooldowns
- NPC pathfinding movement (not animation, not schedule, not dialogue)
- Achievement checks (2 hardcoded values permanently block related ones)
- Event scheduler ticks (no events actually registered)

**What is implemented but dead:**
- FPS camera, Rapier physics player, ToolViewModel, VirtualJoystick
- Entire survival loop: hunger, hearts, temperature, death, respawn
- All audio — the game is completely silent
- All crafting: cooking, forging, mining, fishing, traps, kitbashing
- Entire combat pipeline: enemy spawning, enemy AI, combat, loot, raids
- Grovekeeper path: spirits detected, dialogue sessions, species unlocks
- Chunk streaming (ChunkManager.update() has zero runtime call sites)
- Tutorial (permanently stuck on step 0)
- All player feedback (showToast() is an empty function)

---

## Domain Verdicts

| Domain | Verdict | Key Evidence |
|--------|---------|--------------|
| Game Loop + Wiring | PARTIAL | 70% codebase dead; showToast() is empty |
| FPS Camera + Input | PARTIAL | All pieces real; game runs third-person orbit camera |
| Chunk World | PARTIAL | Real algorithms; ChunkManager.update() never called |
| Survival Loop | STUB | No hunger/hearts in store; permanent Explore mode |
| Grovekeeper Path | PARTIAL | Mazes/spirits real; discoverSpirit() never called |
| Spec Alignment | WEAK | 3-way time disagreement; wrong RNG; 10 Math.random() |

---

## Critical Issues (Game-Breaking)

### C1 — FPS perspective is dead code; game runs third-person
**Domain:** FPS Camera
**Evidence:** `app/game/index.tsx` mounts `<Camera>` (third-person orbit) not `<FPSCamera>`. `<Player>` is a visual lerping mesh, not `<PlayerCapsule>` (Rapier). `<ToolViewModel>` never mounted. `<GameUI>` (the full orchestrator containing VirtualJoystick, HUD, dialogs) is never mounted — only a stripped-down alternate layout is used.
**Impact:** The game's core identity ("first-person with held tool model") does not exist at runtime. This is the foundational design requirement.

### C2 — Chunk streaming is dead; world uses legacy static zone model
**Domain:** Chunk World
**Evidence:** `ChunkManager.update()` has zero runtime call sites. `useWorldLoader.ts` still calls the legacy `starting-world.json` + `gridCell` entity path. The entire chunk generation pipeline (terrain, biome blending, maze spawning, water, entity spawner) only executes during unit tests.
**Impact:** The open world does not stream. The game loads one static zone. Infinite world does not exist at runtime.

### C3 — Survival loop is unimplemented; all difficulties are identical
**Domain:** Survival Loop
**Evidence:** `gameStore.ts` has no `hunger`, `hearts`, or `maxHearts` fields. `createPlayerEntity()` has no `HealthComponent`. `tickHunger()`, `tickHeartsFromStarvation()`, `tickHeartsFromExposure()`, `isPlayerDead()` exist in `survival.ts` but are never called from the game loop. No death handler, no respawn logic, no inventory drop. `lastCampfireId` does not exist in the store.
**Impact:** All 4 difficulty tiers produce identical gameplay — permanent Explore mode. The game's survival identity is entirely absent.

### C4 — GameUI orchestrator is dead; player feedback is silently dropped
**Domain:** Game Loop
**Evidence:** `game/ui/Toast.ts` — `showToast()` is an empty function body. `GameUI` (the orchestrator component containing VirtualJoystick, HUD, QuestPanel, DialogueUI, ToastStack) is not mounted in `app/game/index.tsx`. All calls to `showToast()` from `GameActions` (plant success, harvest, errors, level-ups) silently disappear.
**Impact:** Players have no feedback on any action. Quests, dialogue, radial menu, toast notifications — all UI is unreachable.

### C5 — Grovekeeper path cannot complete; discoverSpirit() never called
**Domain:** Grovekeeper Path
**Evidence:** No game loop hook, proximity detector, or interaction handler calls `discoverSpirit()`. The `spirit.discovered` ECS flag is always `false`. The compass points at spirits correctly but interacting with them is impossible. The 8 spirit-specific dialogue trees do not exist in `dialogue-trees.json` (only 3 generic placeholders).
**Impact:** The main narrative arc cannot progress. The game has no ending.

### C6 — Birchmother does not exist
**Domain:** Grovekeeper Path
**Evidence:** Referenced in project memory and GAME_SPEC.md as the game's ultimate destination. Absent from all source files, config, ECS components, quest data, and world generators.
**Impact:** The game's climactic encounter and ending cannot be implemented without first creating Birchmother from scratch.

---

## High-Priority Issues (Major Feature Gaps)

### H1 — Audio completely absent; game is silent
**Evidence:** `AudioManager`, `NativeAudioManager`, `audioEngine` (Tone.js), `ambientAudio` all instantiate correctly but are never called from the game loop. `AudioManager.playMusic()` is an explicit stub returning early.
**Impact:** No music, no SFX, no ambient sound. Violates the "Tone.js for ALL audio" architectural rule.

### H2 — Entire crafting pipeline is unreachable
**Evidence:** `cooking.ts`, `forging.ts`, `mining.ts`, `fishing.ts`, `traps.ts`, `kitbashing/` — all exist with tests but have zero call sites in the game loop or any interaction handler.
**Impact:** No resource processing, no tool crafting, no economy progression.

### H3 — applyChunkDiff() never called; delta persistence is broken
**Evidence:** `chunkPersistence.ts` implements correct delta-only storage via Legend State, but `loadChunk()` in `ChunkManager.ts` never calls `applyChunkDiff()`. Planted trees, structures, and changes vanish on chunk unload.
**Impact:** Player progress in the world is not persistent.

### H4 — Weather RNG uses string length instead of seed value
**Evidence:** `useGameLoop.ts:153` — `scopedRNG("weather", store.worldSeed.length, ...)`. Two seeds of the same character count (e.g., "apple" and "maple") produce identical weather sequences. The core "same seed = same world" contract is broken for weather.

### H5 — Three-way time system disagreement
**Evidence:** GAME_SPEC.md §5 = 1440s/day (24 min). `time.ts` = 300s/day (5 min). `dayNight.json` = 600s/day (10 min). `time.ts` is authoritative at runtime but contradicts spec by 4.8x. `tickDayNight()` is also never called from the game loop.

### H6 — Difficulty multipliers never applied
**Evidence:** `calcGrowthRate` receives `species.difficulty` (per-species value), not the player's `growthSpeedMult` from `difficulty.json`. `spendToolStamina()` uses raw tool cost without `staminaDrainMult`. Combat damage ignores `damageMult`. All difficulty scaling functions exist and pass tests, but nothing passes the player's chosen difficulty into them.

### H7 — Touch look-zone missing; mobile FPS look unimplemented
**Evidence:** `TouchProvider.ts` is implemented and tested. No look-zone component exists to drive it. Mobile players cannot look around even if FPSCamera were mounted.

### H8 — ECS sync from Rapier physics missing
**Evidence:** Even if `PlayerCapsule` were mounted, its Rapier `RigidBody` translation is never synced back into the ECS `playerQuery` position. `FPSCamera` reads from ECS. This would cause FPS camera to not track the physics body.

---

## Medium-Priority Issues (Spec/Config Violations)

### M1 — Hard rule: 10 Math.random() instances in non-test files
Files: `PlayerGovernor.ts`, `NpcBrain.ts` (3 live calls in game loop), `AudioManager.ts`, `WeatherOverlay.tsx`.
Rule: All randomness must use `scopedRNG(scope, worldSeed, ...extra)`.

### M2 — Hard rule: 21 game/ files + 8 components/ files over 300 lines
Led by `gameStore.ts` at 1,317 lines (4.4x limit). Full list in `06-spec-alignment-config.md`.
Note: US-160-162 in ralph's queue address this for specific files.

### M3 — Hard rule: app/game/index.tsx is 308 lines (over 300 limit)

### M4 — weather.ts uses inline constants; weather.json has no effect
All weather probabilities and durations are hardcoded in `weather.ts`. Changes to `config/game/weather.json` do not affect the running game. Violates the "no inline tuning constants" rule.

### M5 — Significant inline constants in multiple game files
`time.ts`, `survival.ts`, `stamina.ts`, `NpcBrain.ts`, `villageGenerator.ts`, `useGameLoop.ts` all contain tuning values that should be in `config/game/*.json`.

### M6 — Species ID mismatch: 10 of 15 IDs don't match spec
Species in spec but missing from config: `birch`, `elm`, `ash`, `maple`, `cedar`.
Species in config but not in spec: `cherry-blossom`, `flame-maple`, `baobab`, `silver-birch`, `mystic-fern`.
`resolveSpeciesModels()` silently falls back to `"tree01"` for unknown species.

### M7 — Difficulty tier names triply inconsistent
Spec §2.1: Seedling/Sapling/Hardwood/Ironwood. Spec §37.2: Gentle/Standard/Harsh/Ironwood. Config (`difficulty.json`): `explore/normal/hard/brutal/ultra-brutal`.
Five config tiers vs four spec tiers.

### M8 — growth.json stage scales don't match spec
Config: `[0.2, 0.4, 0.6, 0.8, 1.0]`. Spec §8: stages 2/3/4 = 0.5x/1.0x/1.3x. Old Growth trees visually identical to Mature trees.

### M9 — Missing resources in config (7 of 12 absent)
Missing: Ore, Berries, Herbs, Meat, Hide, Fish, Seeds. Present: Wood, Stone, Fiber, Fruit, Water (and 3 others).

### M10 — 5 quest chains missing from quests.json
8 of 13 chains present. Missing 5, including chains tied to unlockable species and seasonal events.

### M11 — config/game/dialogues.json is a dead file
Runtime loads from `game/quests/data/questChains.json` and `game/systems/dialogueLoader.ts`. The `config/game/dialogues.json` and `config/game/quests.json` files are not imported anywhere.

### M12 — unlock_species dialogue effect unimplemented
`dialogueEffects.ts` handles `give_item`, `give_xp`, `start_quest`, `reveal_location` — but not `unlock_species`. Spirit encounters cannot reward new species.

### M13 — recipesUnlocked and npcsFriended hardcoded as 0
`useGameLoop.ts:372,375` — TODO comments, permanently blocking crafting-related and NPC-related achievements.

---

## Lower-Priority Issues (Polish / Cleanup)

### L1 — Tutorial permanently stuck on step 0
`advanceTutorial()` is never called from any interaction handler. The tutorial cannot advance.

### L2 — NPC animation and schedule systems dead
`npcAnimation.ts` and `npcSchedule.ts` exist with tests. NPCs move (pathfinding works) but never animate and have no daily schedule.

### L3 — Labyrinth and spirit markers missing from minimap
No labyrinth or spirit markers in the minimap snapshot types. Players can't see maze locations on the map even though the compass points at them.

### L4 — GamepadProvider does not exist
Input architecture is designed for keyboard/mouse + touch + gamepad. No gamepad provider implemented.

### L5 — worldGenerator.ts (zone graph) and ChunkManager.ts (chunk model) coexist
Legacy architecture not cleaned up. Two competing world models exist simultaneously.

### L6 — terrainGenerator ridged() and domainWarp() unused
Implemented but not applied in fBm pipeline. Terrain uses only basic fBm.

### L7 — WaterBodies, hedge mazes, spirit orbs have no renderer in Canvas
ECS entities created by spawners but never rendered (no R3F component consuming them).
*(Partially: GrovekeeperSpirit renderer exists but spirits never discovered; WaterBody.tsx exists but no Canvas mounting.)*

---

## What Ralph's Remaining Queue (US-152–171) Addresses

| Task | Addresses |
|------|-----------|
| US-152: Wire hedgePlacement to maze generator | Chunk wiring (partial) |
| US-153: Wire cropGrowth to chunk farming | Crafting dead code |
| US-154–155: Wire trading + market | Economy dead code |
| US-156: Wire NpcDialogue to speech bubble | Dialogue dead code |
| US-157: Wire WeatherOverlay + FloatingParticles | Weather visual dead code |
| US-158–159: Settings + MainMenu styling | New screens |
| US-160–162: Decompose oversized files | M2/M3 violations |
| US-163: Wire VirtualJoystick + MobileActionButtons to TouchProvider | C1/H7 (partial) |
| US-164–165: Wire offlineGrowth + wildTreeRegrowth | Growth dead code |
| US-166–167: Performance optimization | Draw calls, FPS |
| US-168: Wire ToolWheel + RadialActionMenu to FPS | C1 (partial) |
| US-169: Decompose treeGeometry + PlayerGovernor | M2 violation |
| US-170: Wire saveLoad to chunk persistence | H3 |
| US-171: Wire GameUI orchestration | C4 — critical |

**US-171 is the single most impactful remaining task** — mounting GameUI correctly would activate the VirtualJoystick, HUD, QuestPanel, DialogueUI, and ToastStack simultaneously.

**NOT addressed by ralph's remaining queue:**
- C1: FPSCamera vs Camera swap (GameUI mount helps but doesn't do the Camera swap)
- C2: ChunkManager.update() call site
- C3: Survival loop (hunger/hearts in store, tickHunger in game loop)
- C5: discoverSpirit() proximity trigger
- C6: Birchmother
- H1: Audio activation
- H4: Weather RNG fix
- H5: Time system reconciliation
- H6: Difficulty multiplier wiring
- M1: Math.random() fixes
- M4–M8: Config/spec alignment

---

## Issues NOT in Ralph's Queue (Need New Tasks)

These must be added as new work items:

1. Fix weather RNG (worldSeed.length → hashString(worldSeed))
2. Add hunger/hearts/maxHearts/lastCampfireId to gameStore
3. Wire tickHunger/tickHeartsFromStarvation to game loop
4. Implement death handler + respawn at campfire
5. Wire difficulty multipliers (stamina, hunger, growth, damage)
6. Reconcile time system (pick one authoritative value, propagate to spec + config)
7. Fix difficulty tier naming consistency (spec §2.1 names are canonical)
8. Wire ChunkManager.update() to useFrame/useWorldLoader
9. Wire applyChunkDiff() in loadChunk()
10. Swap Camera → FPSCamera in app/game/index.tsx
11. Swap Player → PlayerCapsule in scene
12. Add Rapier-to-ECS position sync for player
13. Write 8 spirit dialogue trees
14. Implement discoverSpirit() proximity detection in game loop
15. Implement unlock_species dialogue effect
16. Create Birchmother (ECS component, world placement, encounter flow, dialogue)
17. Wire AudioManager.playMusic() — remove stub
18. Wire ambient audio to game loop
19. Wire cooking/forging/mining/fishing/traps to interaction handler
20. Fix weather.ts to import and use weather.json
21. Fix species IDs (align config with spec §9)
22. Fix growth.json stage scales (align with spec §8)
23. Add missing resources to resources.json (Ore, Berries, Herbs, Meat, Hide, Fish, Seeds)
24. Add 5 missing quest chains
25. Fix Math.random() → scopedRNG in PlayerGovernor, NpcBrain, AudioManager, WeatherOverlay
26. Wire tutorial advanceTutorial() to interaction handlers
27. Add labyrinth/spirit markers to minimap
28. Wire npcAnimation and npcSchedule to game loop
29. Wire ECS recipesUnlocked and npcsFriended counters
30. Add mobile touch look-zone component
