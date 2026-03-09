# Grovekeeper Fix Task List — With Blockers
**Generated:** 2026-03-07 (post US-151 audit)
**Ralph currently:** US-152 (Wire hedgePlacement to maze generator)
**Do NOT touch:** `.ralph-tui/` directory

---

## File Conflict Map (critical — parallel agents must not share files)

```
useGameLoop.ts        <- FIX-03, FIX-06, FIX-07, FIX-08, FIX-17b, FIX-28, FIX-29, FIX-31 → ONE agent
gameStore.ts          <- FIX-05, FIX-28 → FIX-05 first, FIX-28 after
AudioManager.ts       <- FIX-17, FIX-26 → ONE agent
app/game/index.tsx    <- FIX-09 only (scoped)
components/scene/index.tsx <- FIX-10 only (scoped)
useInteraction.ts     <- FIX-18, FIX-29 → sequential
```

---

## WAVE 1 — Parallel (8 agents, no file conflicts)

### W1-A | fix-config-data
**Fixes:** FIX-20, FIX-22, FIX-23, FIX-24
**Blockers:** none
**Files:** `config/game/difficulty.json`, `config/game/species.json`, `config/game/growth.json`, `config/game/resources.json`
**Work:**
- FIX-20: Rename difficulty keys → `seedling/sapling/hardwood/ironwood` (canonical from spec §2.1). Update all references.
- FIX-22: Fix 10/15 wrong species IDs to match spec §9. Add `birch, elm, ash, maple, cedar` configs. Remove or rename mismatched ones.
- FIX-23: Update growth.json stage scales: `[seed:0.1, sprout:0.3, sapling:0.5, mature:1.0, oldGrowth:1.3]`
- FIX-24: Add 7 missing resource types: `ore, berries, herbs, meat, hide, fish, seeds`

### W1-B | fix-quest-dialogue-data
**Fixes:** FIX-14, FIX-25
**Blockers:** none
**Files:** New dialogue data files in `game/systems/` or `game/quests/data/`, `game/quests/data/questChains.json`
**Work:**
- FIX-14: Write 8 spirit dialogue trees (`spirit-dialogue-0` through `spirit-dialogue-7`). Each: unique personality, 3+ branch nodes, `unlock_species` effect on first meeting, seed-deterministic choices. Load format must match what `dialogueLoader.ts` expects.
- FIX-25: Add 5 missing quest chains to `questChains.json` (seasonal event chains + unlockable species chains). Check spec §narrative for content.

### W1-C | fix-math-random
**Fixes:** FIX-26 (partial — excludes AudioManager.ts which is handled by W1-F)
**Blockers:** none
**Files:** `game/ai/PlayerGovernor.ts`, `game/ai/NpcBrain.ts`, `components/game/WeatherOverlay.tsx`
**Work:**
- Replace all `Math.random()` with `scopedRNG(scope, store.worldSeed, entityId, index)` pattern.
- `NpcBrain.ts` has 3 live calls in the game loop tick — these must use entity ID as extra seed param.
- Verify tests still pass after each file change.

### W1-D | fix-isolated-code
**Fixes:** FIX-04, FIX-15, FIX-19, FIX-21
**Blockers:** none
**Files:** `game/ui/Toast.ts`, `game/systems/dialogueEffects.ts`, `game/systems/time.ts`, `config/game/dayNight.json`, `game/systems/weather.ts`
**Work:**
- FIX-04: Implement `showToast(msg, type)` — write to a Legend State `$.toasts` array. (GameUI will render the stack via US-171.) Write test.
- FIX-15: Add `case "unlock_species"` to `applyDialogueEffect()` → call `speciesDiscovery.unlockSpecies(speciesId)` + `showToast`. Write test.
- FIX-19: Reconcile time system. Set `SECONDS_PER_DAY = 600` in `time.ts` (10 min/day, matching dayNight.json). Remove hardcoded 300. Update spec §5 status.
- FIX-21: In `weather.ts`, import `weatherConfig` from `config/game/weather.json`. Replace all inline probability/duration constants with config values.

### W1-E | fix-chunk-runtime
**Fixes:** FIX-01, FIX-02
**Blockers:** none (independent of other wave 1 agents)
**Files:** `game/hooks/useWorldLoader.ts`, `game/world/ChunkManager.ts`
**Work:**
- FIX-01: In `useWorldLoader.ts`, replace legacy `starting-world.json` / `gridCell` path with `ChunkManager.update(playerPosition)` called each frame. `ChunkManager` needs a singleton or React context. Add a `useFrame` or wire to game loop.
- FIX-02: In `ChunkManager.loadChunk()`, after generating chunk entities, call `applyChunkDiff(chunkKey, entities)` from `chunkPersistence.ts` to restore player delta.
- Write/update tests for the new loading path. Verify ChunkManager.update() is called with correct player position.

### W1-F | fix-survival-store
**Fixes:** FIX-05
**Blockers:** none
**Files:** `game/stores/gameStore.ts`, `game/db/schema.ts`
**Work:**
- Add to store: `hunger: number` (0-100), `maxHunger: 100`, `hearts: number`, `maxHearts: number`, `bodyTemp: number`, `lastCampfireId: string | null`, `lastCampfirePosition: {x,y,z} | null`
- Set initial values from difficulty config (Seedling: 3 hearts; Sapling: 3; Hardwood: 2; Ironwood: 1)
- Add corresponding DB columns to `schema.ts`
- Write tests verifying store initializes correctly for each difficulty tier

### W1-G | fix-fps-identity
**Fixes:** FIX-09, FIX-10, FIX-11
**Blockers:** none (independent files)
**Files:** `app/game/index.tsx`, `components/scene/index.tsx`, `components/scene/PlayerCapsule.tsx`
**Work:**
- FIX-09: In `app/game/index.tsx`, replace `<Camera>` import and usage with `<FPSCamera>` from `components/scene/FPSCamera.tsx`. Ensure `<Physics>` from `@react-three/rapier` wraps the Canvas content.
- FIX-10: In `components/scene/index.tsx` (and/or `app/game/index.tsx`), replace visual `<Player>` mesh with `<PlayerCapsule>`.
- FIX-11: In `components/scene/PlayerCapsule.tsx`, add a `useFrame` that reads `body.translation()` and writes to ECS `playerQuery` position component, so `FPSCamera` can track physics body.
- CRITICAL: Check that `@react-three/rapier` `<Physics>` wrapper exists in the Canvas — add if missing.
- Write tests for the Rapier-to-ECS sync (useFrame callback logic).

### W1-H | fix-spirit-proximity
**Fixes:** FIX-13
**Blockers:** none
**Files:** New `game/hooks/useSpiritProximity.ts`
**Work:**
- Create `useSpiritProximity.ts` hook: queries ECS spirits each frame, checks distance from player position, calls `store.discoverSpirit(spiritId)` when within 2m.
- On discovery: call `showToast("Grovekeeper spirit encountered...")`, initiate dialogue session (set Legend State `$.activeDialogue = {spiritId, treeId}`).
- Mount hook in `app/game/index.tsx` or the Canvas's `useFrame` context.
- Write unit tests for the distance check and discovery trigger.

---

## WAVE 2 — After Wave 1 (depends on results)

### W2-A | fix-gameloop-omnibus
**Fixes:** FIX-03, FIX-06, FIX-07, FIX-08, FIX-28, FIX-29, FIX-31
**Blockers:** W1-F (survival store fields must exist), W1-A (difficulty key names)
**Files:** `game/hooks/useGameLoop.ts` ONLY — one agent owns this file
**Work:**
- FIX-03: Line 153 — replace `store.worldSeed.length` with `hashString(store.worldSeed)` for weather RNG seed
- FIX-06: Add `tickHunger(store, deltaTime, difficultyMult)` call each tick. Add `tickHeartsFromStarvation` and `tickHeartsFromExposure` calls.
- FIX-07: Read `difficulty.json` multipliers for the player's tier. Pass `hungerDrainMult` to tickHunger, `staminaDrainMult` to spendToolStamina, `growthSpeedMult` to calcGrowthRate.
- FIX-08: After survival ticks, check `isPlayerDead()`. On death: call new `handleDeath()` action (drops loot at position, sets respawn flag, shows death overlay).
- FIX-28: Track `recipesUnlocked` and `npcsFriended` from store (remove hardcoded 0 with TODO).
- FIX-29: Call `advanceTutorial(event)` from relevant interaction points (first plant, first harvest, first tool use).
- FIX-31: Add `npcAnimation.tick(world, dt)` and `npcSchedule.tick(world, time)` calls.
- Write tests for each new call site.

### W2-B | fix-audio-activation
**Fixes:** FIX-17, FIX-26 (AudioManager.ts Math.random)
**Blockers:** none from Wave 1
**Files:** `game/systems/AudioManager.ts`, `game/systems/NativeAudioManager.ts`
**Work:**
- Remove early return stub from `AudioManager.playMusic()`.
- Initialize Tone.js Transport on first user interaction (required by browser autoplay policy).
- Fix `Math.random()` in AudioManager → `scopedRNG`.
- Wire `ambientAudio.ts` (already implemented) — call `updateAmbientZone(playerPosition)` from game loop.
- Write smoke test: AudioManager.playMusic() no longer throws, Transport is started.

### W2-C | fix-touch-lookzone
**Fixes:** FIX-12
**Blockers:** none (new file)
**Files:** New `components/player/TouchLookZone.tsx`
**Work:**
- Create right-half-screen `PanResponder`-based look zone.
- On pan move: call `TouchProvider.instance.updateLook(dx * sensitivity, dy * sensitivity)`.
- Mount in `GameUI` (or wherever GameUI mounts after US-171 lands).
- Write unit test for the sensitivity scaling and dead zone.

### W2-D | fix-birchmother
**Fixes:** FIX-16
**Blockers:** W1-B (dialogue tree format established), W1-H (spirit proximity pattern established)
**Files:** Multiple new files
**Work:**
1. Add `BirmotherComponent` to `game/ecs/components/procedural/spirits.ts`
2. Add world placement to `WorldGenerator.ts` (fixed coords at world center, spec §narrative)
3. Create Birchmother dialogue tree (unique, narrative climax of all 8 spirits)
4. Create `components/scene/BirmotherMesh.tsx` (distinctive geometry — ancient tree of light)
5. Add `worldroot_reached` quest objective emitter to Birchmother encounter logic
6. Add `worldroots_dream` quest completion trigger
7. Write tests for placement, encounter trigger, and quest completion

### W2-E | fix-crafting-wiring
**Fixes:** FIX-18
**Blockers:** none from Wave 1
**Files:** `game/actions/actionDispatcher.ts`, `game/hooks/useInteraction.ts`
**Work:**
- Add action handlers in `actionDispatcher.ts` for: `COOK`, `FORGE`, `MINE`, `FISH`, `TRAP_SET`, `TRAP_CHECK`, `KITBASH`
- In `useInteraction.ts`, detect target type (campfire → cook menu, forge → forge menu, etc.) and dispatch correct action
- Ensure GameUI panels are connected to the active action state (via Legend State)
- Write integration tests for each action dispatch path

### W2-F | fix-config-inline-constants
**Fixes:** FIX-27
**Blockers:** W1-A (config keys established), W1-D (time.ts already done)
**Files:** `game/systems/survival.ts`, `game/systems/stamina.ts`, `game/ai/NpcBrain.ts`, `game/world/villageGenerator.ts`
**Work:**
- Extract inline tuning constants to appropriate config JSON files
- Load via runtime config loader (existing `game/config/` pattern)
- Verify tests still pass after extraction

### W2-G | fix-polish
**Fixes:** FIX-30, FIX-32
**Blockers:** none
**Files:** MiniMap component, new `game/input/GamepadProvider.ts`
**Work:**
- FIX-30: Add labyrinth center markers and spirit discovered/undiscovered icons to MiniMap snapshot types and renderer
- FIX-32: Create `GamepadProvider.ts` implementing `InputProvider` interface using Web Gamepad API (`navigator.getGamepads()`). Register with InputManager.

---

## WAVE 3 — After Wave 2

### W3-A | verify-integration
**Fixes:** Integration verification pass
**Blockers:** ALL Wave 2 tasks
**Work:**
- Run `pnpm test` — all 3503+ tests must pass
- Run `npx tsc --noEmit` — 0 errors
- Run `pnpm lint` — 0 violations
- Verify ChunkManager.update() is called in runtime (grep for call sites)
- Verify FPSCamera is mounted in app/game/index.tsx
- Verify hunger/hearts in gameStore
- Verify discoverSpirit() is called from proximity hook
- Write comprehensive audit summary to `memory-bank/reports/07-post-fix-verification.md`

---

## Summary Table

| Task | Fixes | Wave | Depends On | Unblocks |
|------|-------|------|------------|----------|
| W1-A fix-config-data | FIX-20,22,23,24 | 1 | — | W2-A |
| W1-B fix-quest-dialogue | FIX-14,25 | 1 | — | W2-D |
| W1-C fix-math-random | FIX-26 (partial) | 1 | — | — |
| W1-D fix-isolated-code | FIX-04,15,19,21 | 1 | — | W2-A |
| W1-E fix-chunk-runtime | FIX-01,02 | 1 | — | W3-A |
| W1-F fix-survival-store | FIX-05 | 1 | — | W2-A |
| W1-G fix-fps-identity | FIX-09,10,11 | 1 | — | W3-A |
| W1-H fix-spirit-proximity | FIX-13 | 1 | — | W2-D |
| W2-A fix-gameloop-omnibus | FIX-03,06,07,08,28,29,31 | 2 | W1-A,W1-D,W1-F | W3-A |
| W2-B fix-audio-activation | FIX-17,26b | 2 | — | W3-A |
| W2-C fix-touch-lookzone | FIX-12 | 2 | — | W3-A |
| W2-D fix-birchmother | FIX-16 | 2 | W1-B,W1-H | W3-A |
| W2-E fix-crafting-wiring | FIX-18 | 2 | — | W3-A |
| W2-F fix-config-inline | FIX-27 | 2 | W1-A | W3-A |
| W2-G fix-polish | FIX-30,32 | 2 | — | W3-A |
| W3-A verify-integration | all | 3 | ALL | done |
