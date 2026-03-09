# Game Loop + Wiring Audit

## Summary

The core game loop is **real and functional** for a limited slice of the game: time advancement, weather, tree growth, stamina regen, harvest cooldowns, NPC movement/AI, achievement checks, and event scheduler ticks all genuinely fire each frame via `useGameLoop` inside the R3F Canvas. However, the vast majority of game systems — combat, survival/hunger, enemy spawning, crop growth, fishing, cooking, mining, forging, base raids, audio, NPC animation, ambient audio, day/night ECS ticking, and more — exist as well-written pure-function modules that are never called from anywhere in the running game. The `app/game/index.tsx` is 308 lines (over the 300-line hard limit) and imports from many systems that appear meaningful on the surface but are not actually exercised at runtime. The `showToast` function used throughout the codebase is a silent stub that swallows all notifications.

---

## Systems Actually Called From Game Loop

These are imported and invoked inside `game/hooks/useGameLoop.ts` (the only live game loop):

- `advanceTime` / `setGameTime` — `game/systems/time.ts` — drives game clock each frame
- `updateWeather` / `getWeatherGrowthMultiplier` / `initializeWeather` — `game/systems/weather.ts` — real weather state machine
- `calcGrowthRate` — `game/systems/growth.ts` — per-tree growth delta each frame
- `regenStamina` — `game/systems/stamina.ts` — player stamina regen per frame
- `harvestCooldownTick` / `initHarvestable` — `game/systems/harvest.ts` — harvest cooldown bookkeeping
- `updateNpcMovement` — `game/systems/npcMovement.ts` — NPC position update per frame
- `buildWalkabilityGrid` — `game/systems/pathfinding.ts` — grid rebuilt every 5s for NPC AI
- `checkAchievements` — `game/systems/achievements/` (subpackage) — checked every 5s
- `checkRegrowth` / `initializeRegrowthState` — `game/systems/wildTreeRegrowth.ts` — wild tree timer on day change
- `NpcBrain.update()` — `game/ai/NpcBrain.ts` — goal-based NPC AI, throttled every 2s
- `store.updateEconomy` — called on day change from game loop (wired into store)
- `store.refreshAvailableChains` — called on day change (quest chain engine in store)
- `store.tickEvents` — called every 10s (event scheduler via store action)

From `useRaycast` (also wired via `GameSystems` component inside Canvas):
- Center-screen raycasting each frame; resolves tree/NPC/structure entities by mesh userData

From `useInteraction` (input handler, not in Canvas):
- `plantTree`, `waterTree`, `harvestTree`, `pruneTree`, `clearRock`, `fertilizeTree` — `game/actions/GameActions.ts`
- `spendToolStamina` — delegates to stamina drain
- `showToast` — wired but is a **silent stub** (see Stubs section)

From `useWorldLoader` (mount-time ECS hydration):
- `loadZoneEntities` — `game/world/ZoneLoader.ts` — loads starting zone into ECS

From `usePersistence` (startup, via `app/_layout.tsx`):
- `calculateAllOfflineGrowth` — `game/systems/offlineGrowth.ts` — applied on startup correctly
- `hydrateGameStore` — `game/db/queries.ts` — SQLite hydration

---

## Systems That Exist But Are NOT Wired

None of the following are imported by `useGameLoop.ts` or called from any non-test runtime path:

### Core Gameplay Gaps (High Impact)

| System File | Description | Lines |
|---|---|---|
| `game/systems/survival.ts` | Hunger drain, starvation heart drain, exposure damage | 146 |
| `game/systems/dayNight.ts` | `tickDayNight()` — ECS DayNightComponent + SkyComponent mutation each frame | 175 |
| `game/systems/cropGrowth.ts` | 4-stage crop growing, harvest, replanting | ~80 |
| `game/systems/enemySpawning.ts` | Enemy wave spawning by biome/distance/difficulty | ~100 |
| `game/systems/enemyAI.ts` | Enemy patrol/chase/attack state machine | 331 |
| `game/systems/combat.ts` | Damage calculations, invulnerability windows, knockback | ~100 |
| `game/systems/lootSystem.ts` | Loot drop tables on enemy death | 83 |
| `game/systems/baseRaids.ts` | Base raid waves, defense logic | ~200 |
| `game/systems/npcAnimation.ts` | Lego-style rigid body rotation for NPC limbs (Spec §24) | 134 |
| `game/systems/npcSchedule.ts` | NPC daily schedule / wandering zones | 182 |

### Audio (Completely Absent From Runtime)

| System File | Description | Lines |
|---|---|---|
| `game/systems/AudioManager.ts` | Web Audio API SFX synthesizer — never called | 328 |
| `game/systems/NativeAudioManager.ts` | Cross-platform audio wrapper — never called | 83 |
| `game/systems/audioEngine.ts` | Tone.js master volume + Panner3D pool — never initialized | ~150 |
| `game/systems/ambientAudio.ts` | 6-layer ambient soundscape (wind/birds/insects/crickets/water/vegetation) — `initAmbientLayers` / `tickAmbientAudio` never called | ~200 |

No game action (plant, harvest, tool select, level up) triggers any audio. `AudioManager.playSound` has zero callers outside its own file and test files.

### Crafting / Progression Systems

| System File | Description |
|---|---|
| `game/systems/fishing.ts` | Minigame state machine — no entry point |
| `game/systems/cooking.ts` | Recipe + saturation system — no entry point |
| `game/systems/mining.ts` | Rock/ore mining — no entry point |
| `game/systems/forging.ts` | Tool/weapon smithing — no entry point |
| `game/systems/traps.ts` | Trap placement and trigger — no entry point |
| `game/systems/recipes.ts` (535 lines) | Recipe tree — imported in store but not surfaced to player |
| `game/systems/kitbashing/` | Modular building system (4 files) — no entry point in game loop |

### World / Environment

| System File | Description |
|---|---|
| `game/systems/weatherParticles.ts` | Particle effects for rain/snow — no renderer calls it |
| `game/systems/waterParticles.ts` | Splash/ripple particles — no renderer calls it |
| `game/systems/ambientParticles.ts` | Floating dust/fireflies — never ticked |
| `game/systems/seasonalEffects.ts` | Seasonal visual/gameplay modifiers — never applied |
| `game/systems/zoneBonuses.ts` | Biome zone bonuses — never queried at runtime |
| `game/systems/structurePlacement.ts` | Structure collision/validation — referenced in `GameActions.ts` only for build mode, which `buildMode` is never set to true in-game |
| `game/systems/hedgePlacement.ts` | Hedge maze generation — no runtime caller |
| `game/systems/treeScaleSystem.ts` | Per-stage tree scale — not applied in TreeInstances renderer |

### NPC / Social Layer

| System File | Description |
|---|---|
| `game/systems/npcRelationship.ts` | Trust/friendship levels — store has `npcRelationships` field but `npcsFriended` hardcoded to 0 in achievement stats |
| `game/systems/dialogueBranch.ts` | Seed-keyed dialogue branching — no UI ever opens dialogue |
| `game/systems/dialogueLoader.ts` | Dialogue tree loader — not called |
| `game/systems/dialogueEffects.ts` | `give_item`, `start_quest` effects — only wired in store action `applyDialogueEffect`, which is never triggered |
| `game/systems/fastTravel.ts` | Campfire fast travel — `discoverCampfire` in store but UI button not present |
| `game/systems/travelingMerchant.ts` | Traveling merchant system — fully implemented in store but no merchant spawn |

### Tutorial

`game/systems/tutorial.ts` — `tickTutorial()` exists; `TutorialOverlay` is rendered with `targetRect={null}` (no target highlighting); `advanceTutorial()` is not called from any player action in `useInteraction.ts`. Tutorial state machine is inert — it will never auto-advance past the initial step since no game action dispatches tutorial signals.

---

## Stubs / Shallow Implementations

### Critical Stubs

1. **`game/ui/Toast.ts`** — `showToast()` is an empty function body. Every success/failure message in the game is silently dropped. File comment: `"Stub: actual toast UI implementation pending"`. Called from `useInteraction`, `GameActions`, `gameStore`, and throughout. **All player feedback is invisible.**

2. **`game/systems/AudioManager.ts:playMusic()`** (line 154) and **`stopMusic()`** (line 160) — both stubs. Comment: `"Background music will be added when audio assets are available"`.

3. **`game/systems/AudioManager.ts:playNoiseBurst()`** (line 303) — uses raw `Math.random()` violating the no-Math.random rule (see Hard Rule Violations).

### Hardcoded Stub Values in Live Code

4. **`game/hooks/useGameLoop.ts:372`** — `recipesUnlocked: 0, // TODO: wire when recipe store is available` — achievement stat is permanently zero regardless of actual recipe unlocks.

5. **`game/hooks/useGameLoop.ts:375`** — `npcsFriended: 0, // TODO: wire when NPC friendship store is available` — always zero, making NPC-related achievements permanently unachievable.

6. **`game/systems/saveLoad.ts:195`** — `// This is a no-op for now; the caller should use setupNewGame.` — `loadGame()` function is inert.

### Weather RNG Seed (Shallow)

7. **`game/hooks/useGameLoop.ts:153`** — `const rngSeed = store.worldSeed ? store.worldSeed.length : Date.now() % 10000` — uses string *length* as a seed, not the actual seed value. World seed "abc" and "xyz" produce identical weather despite different names. `Date.now() % 10000` fallback is effectively random across sessions.

---

## Hard Rule Violations

### Files Over 300 Lines (production source files only, excluding tests)

| File | Lines | Rule |
|---|---|---|
| `game/stores/gameStore.ts` | **1317** | >300 — should be decomposed into subpackage |
| `game/systems/quests.ts` | **995** | >300 — should be decomposed |
| `game/utils/treeGeometry.ts` | **950** | >300 — should be decomposed |
| `components/game/PauseMenu.tsx` | **755** | >300 |
| `game/world/ChunkManager.ts` | **645** | >300 |
| `game/ai/PlayerGovernor.ts` | **621** | >300 |
| `game/db/queries.ts` | **594** | >300 |
| `game/systems/recipes.ts` | **535** | >300 |
| `components/game/GameUI.tsx` | **463** | >300 |
| `game/constants/codex.ts` | **433** | >300 |
| `game/actions/GameActions.ts` | **425** | >300 |
| `game/hooks/useGameLoop.ts` | **406** | >300 |
| `game/world/WorldGenerator.ts` | **399** | >300 |
| `game/hooks/useInteraction.ts` | **381** | >300 |
| `game/world/pathGenerator.ts` | **381** | >300 |
| `game/ai/NpcBrain.ts` | **373** | >300 |
| `components/game/BuildPanel.tsx` | **354** | >300 |
| `game/world/entitySpawner.ts` | **353** | >300 |
| `game/quests/questChainEngine.ts` | **314** | >300 |
| `game/systems/mining.ts` | (>300 from count) | >300 |
| `game/systems/enemyAI.ts` | **331** | >300 |
| `game/systems/travelingMerchant.ts` | **328** | >300 |
| `game/systems/AudioManager.ts` | **328** | >300 |
| `components/game/PlacementGhost.tsx` | **328** | >300 |
| `components/scene/TerrainChunk.tsx` | **325** | >300 |
| `components/game/MainMenu.tsx` | **324** | >300 |
| `game/world/villageGenerator.ts` | **317** | >300 |
| `components/game/NewGameModal.tsx` | **332** | >300 |
| `components/game/AchievementPopup.tsx` | **309** | >300 |
| `app/game/index.tsx` | **308** | >300 — the main game screen itself violates the rule |
| `game/systems/fishing.ts` | **301** | >300 |

### Math.random() in Game Code

| File | Lines | Context |
|---|---|---|
| `game/ai/PlayerGovernor.ts` | 375, 376 | Random target position for AI autoplay |
| `game/ai/NpcBrain.ts` | 156, 274, 275 | NPC wander timer and offset — **called every NPC AI tick in the live game loop** |
| `game/systems/AudioManager.ts` | 303 | Noise buffer generation |
| `game/systems/prestige.ts` | comment only — not actual usage | safe |
| `components/game/WeatherOverlay.tsx` | 61, 62, 63, 152 | Rain/snow particle position and duration |

The `NpcBrain.ts` violations are the most critical: this code runs every 2 seconds in the live game loop for all active NPCs, producing non-deterministic, non-reproducible NPC behavior that cannot be debugged or replayed.

---

## Critical Issues (Numbered, Prioritized)

1. **Silent toast stub** — `showToast()` is a no-op. The player receives zero feedback on every action: planting, watering, harvesting, errors, level-ups, achievements. The entire feedback layer is invisible. (`game/ui/Toast.ts:8`)

2. **Survival system completely unwired** — `tickHunger()`, `tickHeartsFromStarvation()`, `tickHeartsFromExposure()` in `game/systems/survival.ts` are never called from the game loop. In Survival mode, hunger and starvation have no effect. The player cannot die from starvation despite the store holding a `stamina` field.

3. **Combat / enemy loop absent** — `enemySpawning.ts`, `enemyAI.ts`, `combat.ts`, and `lootSystem.ts` form a complete, tested combat pipeline that is never invoked. The game has zero enemies at runtime.

4. **Audio system entirely dead** — Both `AudioManager` (Web Audio API) and `NativeAudioManager` (cross-platform wrapper) are instantiated as singletons but never called. `audioEngine.initialize()` is never called. `ambientAudio.initAmbientLayers()` and `tickAmbientAudio()` are never called. The game is completely silent regardless of the `soundEnabled` store flag.

5. **Day/night ECS not ticked** — `tickDayNight()` in `game/systems/dayNight.ts` is never called. The `DayNightComponent` and `SkyComponent` in the ECS world are never mutated. Time-of-day visual state flows through `gameTimeMicroseconds` → `computeTimeState()` → Lighting/Sky props (which is correct), but ECS entities with `dayNight` and `sky` components remain static.

6. **NpcBrain uses Math.random()** — Three raw `Math.random()` calls in `NpcBrain.ts` (lines 156, 274, 275) execute every 2 seconds for every NPC in the live game loop. This violates the hard no-Math.random rule and produces irreproducible NPC behavior.

7. **Tutorial state machine inert** — `TutorialOverlay` renders but `advanceTutorial()` is never called from any interaction handler in `useInteraction.ts` or `GameActions.ts`. The tutorial is permanently stuck on its initial step.

8. **`recipesUnlocked` and `npcsFriended` hardcoded to 0** — Two achievement inputs are permanently zero-valued with explicit TODO comments (`useGameLoop.ts:372,375`). Achievements gated on these values are permanently blocked.

9. **Weather RNG seed is string length** — `store.worldSeed.length` produces a 1–2 digit seed. All world seeds of the same length (e.g., any 8-char seed) generate identical weather sequences. (`useGameLoop.ts:153`)

10. **~50 system files over 300 lines** — `gameStore.ts` at 1317 lines is the most severe. The rule exists to force decomposition; having the persistent state store, all its actions, and all its derived helpers in a single 1317-line file is the hardest maintenance problem in the codebase.

---

## Verdict: Game Loop Is PARTIAL

The game loop is **architecturally real** — it runs every frame via `useFrame` inside the R3F Canvas, calls genuine ECS queries, and drives growth/stamina/weather/NPC movement with actual logic. The core grove-tending loop (plant, grow, water, harvest) is functionally wired end-to-end.

However, roughly **70% of the implemented game systems are completely disconnected from the running game**. Combat, survival, audio, NPC animation, ambient sound, fishing, cooking, mining, forging, base raids, dialogue, crafting, and the tutorial are all production-quality implementations that exist in isolation. The game as it runs today is a grove-tending simulation with silent feedback (toast stub), no enemies, no survival pressure, no audio, and no tutorial progression.
