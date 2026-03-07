# Grovekeeper Fix Task List
**Generated:** 2026-03-07
**Context:** Post-audit of US-001–151. Ralph is currently on US-152.
**Scope:** Issues NOT covered by ralph's remaining US-152–171 queue.

---

## Priority Tiers

- **P0 — Blockers:** Game cannot function without these
- **P1 — Critical gaps:** Core design pillars absent
- **P2 — Spec violations:** Hard rules broken, data wrong
- **P3 — Polish:** Quality improvements

---

## P0 — Blockers (fix first, everything depends on these)

### FIX-01: Wire ChunkManager to runtime
**Problem:** `ChunkManager.update()` has zero runtime call sites. World does not stream.
**Fix:** In `game/hooks/useWorldLoader.ts`, replace legacy `starting-world.json` logic with `ChunkManager.update(playerPosition)` called each frame (via `useGameLoop` or a dedicated `useFrame` in the Canvas).
**Blocks:** All open world features, chunk persistence, biome exploration

### FIX-02: Wire applyChunkDiff in loadChunk
**Problem:** `chunkPersistence.applyChunkDiff()` is never called when a chunk loads, so player changes vanish.
**Fix:** In `ChunkManager.loadChunk()`, after generating the chunk, call `applyChunkDiff(chunkKey, chunkEntities)` to restore delta.
**Blocks:** All persistent world changes

### FIX-03: Fix weather RNG seed
**Problem:** `useGameLoop.ts:153` uses `store.worldSeed.length` (a number, not the seed). Two seeds of equal length get identical weather.
**Fix:** Import `hashString` from `game/utils/seedRNG.ts`, use `hashString(store.worldSeed)` as the seed value.
**Files:** `game/hooks/useGameLoop.ts:153`

### FIX-04: Wire showToast to real implementation
**Problem:** `game/ui/Toast.ts` — `showToast()` is an empty function. All player feedback silently drops.
**Fix:** Connect `showToast()` to Legend State toast queue. US-171 (GameUI mount) will render the ToastStack, but `showToast()` must write to state.
**Files:** `game/ui/Toast.ts`
**Blocks:** All player feedback (actions, errors, level-ups, rewards)

---

## P1 — Critical Gaps (core design pillars)

### FIX-05: Add survival state to gameStore
**Problem:** `gameStore.ts` has no `hunger`, `hearts`, `maxHearts`, `bodyTemp`, or `lastCampfireId` fields. The survival system has no state to operate on.
**Fix:** Add these fields to the store schema. Add corresponding DB columns. Set initial values based on difficulty tier.
**Files:** `game/stores/gameStore.ts`, `game/db/schema.ts`
**Blocks:** FIX-06, FIX-07, FIX-08

### FIX-06: Wire hunger drain to game loop
**Problem:** `tickHunger()`, `tickHeartsFromStarvation()`, `tickHeartsFromExposure()` in `survival.ts` are never called.
**Fix:** Call these from `useGameLoop.ts` each tick, passing player difficulty multiplier from `difficulty.json`.
**Files:** `game/hooks/useGameLoop.ts`, `game/systems/survival.ts`
**Depends on:** FIX-05

### FIX-07: Wire difficulty multipliers throughout
**Problem:** Difficulty selection has no gameplay effect. `growthSpeedMult`, `staminaDrainMult`, `hungerDrainMult`, `damageMult` from `difficulty.json` are loaded but never passed to the systems that use them.
**Fix:** Read player difficulty from store. Pass multipliers to `calcGrowthRate`, `spendToolStamina`, `tickHunger`, and combat damage functions.
**Files:** `game/hooks/useGameLoop.ts`, `game/systems/growth.ts`, `game/systems/stamina.ts`, `game/systems/survival.ts`

### FIX-08: Implement death handler + campfire respawn
**Problem:** No death detection, no death screen, no respawn logic, no inventory drop.
**Fix:** In game loop, check `isPlayerDead()` each tick. On death: drop resources at position, show death screen, respawn at `lastCampfireId` position, restore base hearts per difficulty. Wire permadeath flag to reset world on death in Ironwood mode.
**Files:** `game/hooks/useGameLoop.ts`, new `game/systems/death.ts`
**Depends on:** FIX-05, FIX-06

### FIX-09: Swap Camera → FPSCamera in app/game/index.tsx
**Problem:** Game mounts third-person orbit `<Camera>` instead of `<FPSCamera>`. First-person perspective does not exist.
**Fix:** In `app/game/index.tsx`, replace `<Camera>` import/usage with `<FPSCamera>`. Ensure `<PlayerCapsule>` is also mounted (see FIX-10).
**Files:** `app/game/index.tsx`, `components/scene/index.tsx`
**Note:** Coordinate with US-171 (GameUI) and US-163 (VirtualJoystick) — all three must land together.

### FIX-10: Mount PlayerCapsule (Rapier physics body)
**Problem:** Game mounts visual `<Player>` mesh; no Rapier physics body exists for the player at runtime.
**Fix:** Replace `<Player>` with `<PlayerCapsule>` in the scene. Ensure `@react-three/rapier` `<Physics>` wrapper is present in the Canvas.
**Files:** `components/scene/index.tsx`, `app/game/index.tsx`
**Depends on:** FIX-09

### FIX-11: Add Rapier-to-ECS position sync for player
**Problem:** `FPSCamera` reads player position from ECS `playerQuery`, but `PlayerCapsule`'s Rapier `RigidBody` position is never synced back to ECS. Camera would not track physics movement.
**Fix:** In `PlayerCapsule.tsx`, add a `useFrame` that reads `body.translation()` and writes it to the ECS player entity position component.
**Files:** `components/scene/PlayerCapsule.tsx`
**Depends on:** FIX-10

### FIX-12: Add touch look-zone component
**Problem:** `TouchProvider.ts` is implemented but no UI component drives it. Mobile players cannot look around.
**Fix:** Create `components/player/TouchLookZone.tsx` — a right-half-screen PanResponder that feeds delta into `TouchProvider.updateLook(dx, dy)`. Mount in GameUI.
**Files:** New `components/player/TouchLookZone.tsx`
**Depends on:** US-163 (VirtualJoystick wiring) landing first

### FIX-13: Wire discoverSpirit() proximity detection
**Problem:** `discoverSpirit()` is never called. Players cannot interact with Grovekeeper spirits. The main story cannot progress.
**Fix:** In `useGameLoop.ts` or a dedicated `useSpiritProximity` hook, query ECS spirits each tick. If player is within 2m of an undiscovered spirit, call `discoverSpirit(spiritId)` and initiate dialogue session.
**Files:** `game/hooks/useGameLoop.ts` or new `game/hooks/useSpiritProximity.ts`

### FIX-14: Write 8 spirit dialogue trees
**Problem:** ChunkManager assigns `spirit-dialogue-0` through `spirit-dialogue-7` as dialogue tree IDs, but these trees don't exist. Only 3 generic trees exist in `dialogue-trees.json`.
**Fix:** Write 8 distinct dialogue trees for each spirit encounter (personality, narrative arc, branch choices). Connect to GAME_SPEC.md §narrative for tone and content.
**Files:** `game/systems/dialogueLoader.ts` data, or new JSON files

### FIX-15: Implement unlock_species dialogue effect
**Problem:** `dialogueEffects.ts` does not handle the `unlock_species` effect type. Spirit encounters cannot reward species unlocks.
**Fix:** Add `case "unlock_species"` to `applyDialogueEffect()` that calls `speciesDiscovery.unlockSpecies(speciesId)` and shows toast.
**Files:** `game/systems/dialogueEffects.ts`

### FIX-16: Create Birchmother (from scratch)
**Problem:** The game's climactic encounter/destination does not exist in any file.
**Fix:** This is a multi-part creation:
1. Add `BirmotherComponent` to ECS
2. Define world placement (fixed chunk coords near world center, spec §narrative)
3. Write Birchmother dialogue tree
4. Create Birchmother R3F visual (unique geometry + material)
5. Add `worldroot_reached` quest objective emitter to Birchmother encounter
6. Create ending sequence
**Files:** Multiple new files across ECS, world, components, and dialogue

### FIX-17: Wire AudioManager (remove stubs)
**Problem:** `AudioManager.playMusic()` returns early (explicit stub). Game is completely silent.
**Fix:** Remove the early return. Ensure Tone.js `Transport.start()` is called on game start. Wire `ambientAudio.ts` system to game loop for zone-based ambient transitions.
**Files:** `game/systems/AudioManager.ts`, `game/hooks/useGameLoop.ts`

### FIX-18: Wire crafting systems to interaction handler
**Problem:** `cooking.ts`, `forging.ts`, `mining.ts`, `fishing.ts`, `traps.ts`, `kitbashing/` — all implemented and tested, all unreachable from gameplay.
**Fix:** In `game/actions/actionDispatcher.ts` and `useInteraction.ts`, add action handlers for each crafting type. Ensure GameUI panels (CampfireUI, ForgePanel, etc.) are mounted and connected.
**Files:** `game/actions/actionDispatcher.ts`, `game/hooks/useInteraction.ts`

---

## P2 — Spec/Config Violations

### FIX-19: Fix time system — pick one authoritative value
**Problem:** GAME_SPEC.md = 1440s/day, `time.ts` = 300s/day, `dayNight.json` = 600s/day.
**Fix:** Decide on one value (recommend 600s = 10 min per spec intent), update `time.ts` `SECONDS_PER_DAY` to read from `dayNight.json`, update GAME_SPEC.md to match.
**Files:** `game/systems/time.ts`, `config/game/dayNight.json`, `docs/GAME_SPEC.md`

### FIX-20: Fix difficulty tier naming consistency
**Problem:** Three different naming schemes across spec, config, and UI.
**Fix:** Canonical names from GAME_SPEC.md §2.1: Seedling/Sapling/Hardwood/Ironwood. Update `config/game/difficulty.json` keys. Update all UI references.
**Files:** `config/game/difficulty.json`, all UI components referencing difficulty

### FIX-21: Fix weather.ts to read from weather.json
**Problem:** All weather probabilities and durations are inline constants in `weather.ts`. `config/game/weather.json` has no effect.
**Fix:** Import `weather.json` in `weather.ts` and replace inline constants.
**Files:** `game/systems/weather.ts`

### FIX-22: Fix species IDs (align config with spec §9)
**Problem:** 10 of 15 species IDs in `species.json` don't match spec §9.
**Fix:** Reconcile species IDs. Either update config to match spec, or update spec to match config (with justification). Update `resolveSpeciesModels()` to handle all 15 IDs without silent fallback.
**Files:** `config/game/species.json`, `game/world/entitySpawner.ts`

### FIX-23: Fix growth.json stage scales
**Problem:** Config scales `[0.2, 0.4, 0.6, 0.8, 1.0]` vs spec `[_, _, 0.5, 1.0, 1.3]`.
**Fix:** Update `config/game/growth.json` stage scales to match spec §8.
**Files:** `config/game/growth.json`

### FIX-24: Add missing resources to resources.json
**Problem:** 7 of 12 resource types missing: Ore, Berries, Herbs, Meat, Hide, Fish, Seeds.
**Fix:** Add all 7 to `config/game/resources.json` with proper definitions.
**Files:** `config/game/resources.json`

### FIX-25: Add 5 missing quest chains to quests data
**Problem:** 5 quest chains missing from `game/quests/data/questChains.json`.
**Fix:** Add the 5 missing chains (seasonal events and unlockable species chains).
**Files:** `game/quests/data/questChains.json`

### FIX-26: Fix Math.random() → scopedRNG (10 instances)
**Problem:** 10 `Math.random()` calls in `PlayerGovernor.ts`, `NpcBrain.ts`, `AudioManager.ts`, `WeatherOverlay.tsx`. Violates hard rule.
**Fix:** Replace each with `scopedRNG(scope, store.worldSeed, ...extras)`.
**Files:** `game/ai/PlayerGovernor.ts`, `game/ai/NpcBrain.ts`, `game/systems/AudioManager.ts`, `components/game/WeatherOverlay.tsx`

### FIX-27: Move inline constants to config
**Problem:** `time.ts`, `survival.ts`, `stamina.ts`, `NpcBrain.ts`, `villageGenerator.ts`, `useGameLoop.ts` contain tuning values that should be in JSON config.
**Fix:** Extract inline constants to appropriate `config/game/*.json` files. Load at runtime.

### FIX-28: Wire recipesUnlocked and npcsFriended achievement counters
**Problem:** `useGameLoop.ts:372,375` hardcodes these as 0 with TODO comments, permanently preventing related achievements.
**Fix:** Track `recipesUnlocked` and `npcsFriended` in the store. Increment appropriately on crafting completion and NPC relationship advancement.
**Files:** `game/hooks/useGameLoop.ts`, `game/stores/gameStore.ts`

---

## P3 — Polish

### FIX-29: Wire tutorial advanceTutorial() to interactions
**Problem:** Tutorial permanently stuck on step 0. `advanceTutorial()` never called.
**Fix:** Wire tutorial step advancement to the relevant interaction events (first plant, first harvest, etc.) in `useInteraction.ts`.

### FIX-30: Add labyrinth/spirit markers to minimap
**Problem:** Minimap shows no labyrinth or spirit locations.
**Fix:** Add labyrinth center markers and spirit discovered/undiscovered icons to MiniMap component snapshot types.

### FIX-31: Wire NPC animation and schedule systems
**Problem:** `npcAnimation.ts` and `npcSchedule.ts` are tested but not called from game loop.
**Fix:** Add NPC animation tick and schedule update to `useGameLoop.ts`.

### FIX-32: Create GamepadProvider
**Problem:** Input architecture supports gamepad but no provider exists.
**Fix:** Create `game/input/GamepadProvider.ts` implementing the `InputProvider` interface using the Gamepad API.

---

## Suggested Fix Ordering (dependency chain)

```
Phase A (blockers — nothing else works without these):
  FIX-03 (weather RNG) — 5 min
  FIX-04 (showToast) — 15 min
  FIX-01 (ChunkManager runtime) — 2-3 hours
  FIX-02 (applyChunkDiff) — 30 min

Phase B (survival loop — in dependency order):
  FIX-05 (store fields) → FIX-06 (tick hunger) → FIX-07 (difficulty) → FIX-08 (death)

Phase C (FPS identity — do together, they're all or nothing):
  FIX-09 (swap Camera) + FIX-10 (PlayerCapsule) + FIX-11 (Rapier-ECS sync) + FIX-12 (look zone)
  -- Wait for US-171 (GameUI) and US-163 (VirtualJoystick) from ralph first --

Phase D (Grovekeeper path):
  FIX-13 (discoverSpirit proximity) → FIX-14 (8 dialogue trees) → FIX-15 (unlock_species)
  FIX-16 (Birchmother) — standalone creation task

Phase E (audio + crafting):
  FIX-17 (audio stubs) → FIX-18 (crafting wiring)

Phase F (config/spec alignment):
  FIX-19–28 (can be done in any order, mostly data changes)

Phase G (polish):
  FIX-29–32
```

---

## Handoff Notes for Specialist Agents

When dispatching fix agents, provide each with:
1. The specific FIX-XX task from this list
2. The relevant section from `memory-bank/reports/` for detailed evidence
3. The spec section from `docs/GAME_SPEC.md` they're implementing against
4. Instruction to write a test BEFORE implementation (mandatory workflow)
5. Instruction NOT to touch `.ralph-tui/` directory (ralph is actively running)
