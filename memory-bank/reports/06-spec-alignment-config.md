# Spec Alignment + Config Integrity Audit

**Date:** 2026-03-07
**Auditor:** Claude Code (investigative QC run)
**Scope:** GAME_SPEC.md alignment, config/game/*.json integrity, hard rule violations

---

## Summary

The codebase is substantially implemented with a solid ECS foundation, chunk-based world, FPS camera, Rapier physics, and most core systems wired. However, there are **critical data consistency failures** between GAME_SPEC.md, config JSON files, and implementation. The most serious issues are: a three-way time system disagreement (spec, time.ts, and dayNight.json all have different values), species IDs in species.json that do not match GAME_SPEC.md §9, a broken weather RNG seed (uses `worldSeed.length` instead of a hash), difficulty tier names that are inconsistent between spec sections AND config, and growth formula deviations from spec. The spec itself contains internal inconsistencies that need to be resolved before implementation can be authoritative.

---

## GAME_SPEC.md Section Status

| # | Section | Spec Status | Implementation Status |
|---|---------|-------------|----------------------|
| 1 | User Flow | Defined | PARTIAL — NewGameModal exists, seed/difficulty flow partially wired |
| 2 | Difficulty System | Defined | PARTIAL — config exists but tier names differ from spec; systems don't consume player difficulty multipliers |
| 3 | World Seed System | Defined | PARTIAL — scopedRNG exists in seedWords.ts (not seedRNG.ts); game loop uses worldSeed.length not hash |
| 4 | Core Game Loop | Defined | DONE — useGameLoop.ts wires all 10 systems |
| 5 | Time System | Defined | DEVIATION — day length and season length differ from spec AND from dayNight.json |
| 6 | Season System | Defined | PARTIAL — season multipliers in config; seasonal visual swap not yet wired |
| 7 | Weather System | Defined | DONE — weather.ts, weather.json match; but weather.ts does not import weather.json (inline consts) |
| 8 | Growth System | Defined | PARTIAL — formula deviates: waterBonus 1.3 vs spec 1.5; player difficulty tier not applied |
| 9 | Species Catalog | Defined | DEVIATION — species.json has different 15 species than GAME_SPEC.md §9 specifies |
| 10 | Economy | Defined | PARTIAL — resources.json has 8 types vs spec's 12 |
| 11 | Tools | Defined | DEVIATION — tools.json has 13 tools (fishing-rod and hammer missing, 7 extras not in spec §11.1) |
| 12 | Stamina & Survival | Defined | DONE — survival.ts implements hunger/hearts/stamina correctly |
| 13 | Harvest System | Defined | DONE — harvest.ts wired via GameActions |
| 14 | Quest System | Defined | PARTIAL — 8 of 13 quest chains in config; chain engine wired; procedural quest system done |
| 15 | Achievement System | Defined | DONE — 45 achievements in config matches spec |
| 16 | Progression & New Game+ | Defined | PARTIAL — level unlocks wired; NG+ not implemented |
| 17 | Open World | Defined | DONE — ChunkManager, chunk streaming, biome system implemented |
| 18 | Structure System | Defined | DONE — structures.json populated; StructureManager, structurePlacement wired |
| 19 | NPC System | Defined | DONE — 10 NPCs in config; NpcBrain, NpcManager implemented |
| 20 | Trading System | Defined | PARTIAL — trading.ts exists, TradeDialog wired |
| 21 | Discovery System | Defined | DONE — speciesDiscovery.ts wired to store |
| 22 | Crafting & Forging | Defined | PARTIAL — recipes.ts and forging.ts exist but not wired to UI |
| 23 | Input System | Defined | DONE — KeyboardMouseProvider, TouchProvider, FPSCamera, PlayerCapsule |
| 24 | HUD Layout | Defined | DONE — HUD.tsx wired |
| 25 | Tutorial System | Defined | PARTIAL — tutorial.ts exists |
| 26 | Save and Persistence | Defined | DONE — drizzle + expo-sqlite, chunkPersistence, delta-only |
| 27 | Audio | Defined | PARTIAL — AudioManager.ts, audioEngine.ts; Tone.js integration partial |
| 28 | Visual Identity | Defined | DONE — Modern Zelda-style rendering in TerrainChunk, MSAA, device-native DPR |
| 29 | Seeded RNG | Defined | PARTIAL — createRNG/hashString in seedRNG.ts; scopedRNG in seedWords.ts (wrong file per CLAUDE.md) |
| 30 | World Quest Narrative | Defined | PARTIAL — worldQuestSystem.ts exists; dialogue branching exists |
| 31 | Procedural Terrain & Water | Defined | DONE — TerrainChunk, WaterBody, terrainGenerator, waterPlacer |
| 32 | Grovekeeper Spirits | Defined | DONE — GrovekeeperSpirit.tsx, spirits ECS component |
| 33 | Dialogue Branching | Defined | PARTIAL — dialogueBranch.ts, dialogueLoader.ts, SpeechBubble; trees in config |
| 34 | Combat System | Defined | PARTIAL — combat.ts, enemyAI.ts, enemySpawning.ts implemented; not fully wired |
| 35 | Base Building | Defined | PARTIAL — BuildPanel.tsx, PlacementGhost.tsx; kitbashing not complete |
| 36 | Particle Systems | Defined | PARTIAL — ambientParticles.ts, weatherParticles.ts; ECS components done |
| 37 | Game Modes | Defined | DEVIATION — spec §37 names (Gentle/Standard/Harsh/Ironwood) don't match config (normal/hard/brutal/ultra-brutal) |
| 38 | ECS Architecture | Defined | DONE — all component files match spec §38.1 |
| 39 | Implementation Status | Defined (meta) | CURRENT — self-documents gaps |

---

## Config Files Integrity

| File | Expected | Actual | Status |
|------|----------|--------|--------|
| `species.json` | 15 species matching spec §9 IDs | 15 species (12 base + 3 prestige) but WRONG IDs — 5 spec species absent, 5 non-spec species present | FAIL |
| `tools.json` | 8 tools per spec §11.1 | 13 tools — missing `fishing-rod`, `hammer`; 7 extras not in spec §11.1 | PARTIAL |
| `growth.json` | Stage scales: 0=hardcoded, 2=0.5x, 3=1.0x, 4=1.3x; waterBonus=1.5 | Scales [0.2, 0.4, 0.6, 0.8, 1.0]; waterBonus=1.3 | FAIL |
| `difficulty.json` | Exploration + 4 survival tiers: Seedling/Sapling/Hardwood/Ironwood OR Gentle/Standard/Harsh/Ironwood | 5 tiers: explore/normal/hard/brutal/ultra-brutal | DEVIATED |
| `npcs.json` | 10 named NPCs | 10 NPCs present — Elder Rowan, Hazel, Botanist Fern, Blossom, Bramble, Willow, Oakley, Thorn, Sage, Ember | PASS |
| `structures.json` | Structure definitions with kitbashing support | 21 structures + biomeTemplates | PASS |
| `vegetation.json` | 15-species model mapping, seasonal tints, bush shapes, biome density | All present and populated with 15 species mapped | PASS |
| `dialogues.json` | Dialogue tree nodes | 92 dialogue nodes | PASS |
| `quests.json` | 13 NPC quest chains per spec §14.4 | 8 chains — 5 missing: willow-remedies, thorn-trails, ember-alchemy, seasonal-cycle, ancient-grove | FAIL |
| `weather.json` | All weather types, probabilities, durations | Matches spec §7 exactly | PASS |
| `achievements.json` | 45 achievements | 45 achievements | PASS |
| `resources.json` | 12 resource types per spec §10.1 | 8 types — missing: Ore, Berries, Herbs, Meat, Hide, Fish, Seeds | FAIL |
| `dayNight.json` | Day length 1440s (24 min), 90 days/season | dayLengthSeconds=600 (10 min), daysPerSeason=7 | FAIL |
| `prestige.json` | 5 prestige tiers per spec §16.4 | Present with 5 cosmetic tiers — colors differ from spec's named themes | PASS (acceptable) |

---

## Spec Violations Found

### 1. Species ID Mismatch — species.json vs GAME_SPEC.md §9

GAME_SPEC.md §9.1 defines these 15 species:
`white-oak, birch, elm, weeping-willow, ash, maple, golden-apple, cedar, elder-pine, ironbark, redwood, ghost-birch, crystal-oak, moonwood-ash, worldtree`

`config/game/species.json` has instead:
`white-oak, weeping-willow, elder-pine, cherry-blossom, ghost-birch, redwood, flame-maple, baobab, silver-birch, ironbark, golden-apple, mystic-fern, crystal-oak, moonwood-ash, worldtree`

**In spec but NOT in config:** `birch, elm, ash, maple, cedar`
**In config but NOT in spec:** `cherry-blossom, flame-maple, baobab, silver-birch, mystic-fern`

Evidence: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/config/game/species.json` — all 15 entries.

### 2. Growth Scale Values — growth.json vs GAME_SPEC.md §8.1

Spec §8.1 defines: Stage 2 (Sapling) = 0.5x, Stage 3 (Mature) = 1.0x, Stage 4 (Old Growth) = 1.3x.
`config/game/growth.json` stageVisuals = `[0.2, 0.4, 0.6, 0.8, 1.0]` — all five stages at uniform increments with max=1.0 (no 1.3x old growth scale).

Evidence: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/config/game/growth.json:4-10`

The unified design document (`docs/plans/2026-03-07-unified-game-design.md`) at §5 specifies yet another set: `seed=0.1x, sprout=0.25x, sapling=0.5x, mature=1.0x, old growth=1.3x`. Three different scale tables exist across spec, config, and unified design.

### 3. Time System — Three-Way Discrepancy

**Day length:**
- GAME_SPEC.md §5.1: 1440 seconds real-time per game day (1 real sec = 1 game minute)
- `game/systems/time.ts:25`: `REAL_SECONDS_PER_GAME_DAY = 300` (5 real minutes)
- `config/game/dayNight.json`: `dayLengthSeconds: 600` (10 real minutes)

**Days per season:**
- GAME_SPEC.md §6.1: 90 game days
- `game/systems/time.ts:37`: `DEFAULT_SEASON_LENGTH = 30`
- `config/game/dayNight.json`: `daysPerSeason: 7`

`time.ts` does not import `dayNight.json`, so the inline constants are authoritative in practice but all three sources disagree with each other. Evidence: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/game/systems/time.ts:25-37`, `/Users/jbogaty/src/arcade-cabinet/grovekeeper/config/game/dayNight.json`.

### 4. Growth Formula — waterBonus and Difficulty Multiplier

GAME_SPEC.md §8.2:
```
rate *= (watered ? 1.5 : 1.0)
rate *= difficultyGrowthSpeedMult   # from player's difficulty tier
```

Implementation (`game/systems/growth.ts:27,81-84`):
- `waterBonus = 1.3` (from `growth.json`) — should be 1.5
- `diffMult` comes from `DIFFICULTY_MULTIPLIERS[species.difficulty]` where `species.difficulty` is 1-5 per species — NOT the player's difficulty tier (explore/normal/hard/brutal/ultra-brutal)

The player-tier `growthSpeedMult` from `difficulty.json` is never applied to the growth formula. Evidence: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/game/hooks/useGameLoop.ts:170-177` — `calcGrowthRate` is called with `difficulty: species.difficulty`, not with the player's chosen difficulty tier.

### 5. Difficulty Tier Name Inconsistency — Spec vs Spec vs Config

GAME_SPEC.md §2.1 calls the survival tiers: `Seedling / Sapling / Hardwood / Ironwood`
GAME_SPEC.md §37.2 calls them: `Gentle / Standard / Harsh / Ironwood`
`config/game/difficulty.json` uses: `explore / normal / hard / brutal / ultra-brutal`

The spec contradicts itself internally (two different name systems), and the config matches neither. Evidence: GAME_SPEC.md lines 109, 1374-1379.

### 6. Resources — Incomplete config vs Spec §10.1

Spec §10.1 defines 12 resource types: Timber, Stone, Ore, Sap, Fruit, Berries, Herbs, Meat, Hide, Fish, Acorns, Seeds.
`config/game/resources.json` has 8 types: timber, sap, fruit, acorns, wood, stone, metal_scrap, fiber.

Missing: Ore, Berries, Herbs, Meat, Hide, Fish, Seeds. Present in config but not in spec: wood, metal_scrap, fiber. Evidence: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/config/game/resources.json`.

### 7. Weather System — Does Not Import weather.json

`config/game/weather.json` exists with the correct season probabilities and duration ranges. However, `game/systems/weather.ts` does not import this file — it re-declares the same data as inline module-level constants (`SEASON_PROBABILITIES`, `DURATION_RANGES`, `DEFAULT_RAIN_GROWTH_BONUS`, etc.). The values happen to match but this violates the "no inline tuning constants" hard rule and means changes to `weather.json` have no effect on the running system.

Evidence: `game/systems/weather.ts` — zero JSON imports.

### 8. Broken Weather RNG Seed — Spec §3 Violation

`game/hooks/useGameLoop.ts:153`:
```typescript
const rngSeed = store.worldSeed ? store.worldSeed.length : Date.now() % 10000;
```

This uses `worldSeed.length` (a number between 1 and ~50) as the RNG seed for weather. Two different world seeds with the same number of characters will generate identical weather sequences. The `Date.now()` fallback is non-deterministic. Spec §3.3 requires zero non-determinism: "Same seed = same world, always."

The correct call is `hashString(store.worldSeed)` from `game/utils/seedRNG.ts`.

Evidence: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/game/hooks/useGameLoop.ts:153`

### 9. Quest Chain Count — 8 of 13 Present

Spec §14.4 defines 13 NPC quest chains. `config/game/quests.json` has 8. Missing chains: `willow-remedies`, `thorn-trails`, `ember-alchemy`, `seasonal-cycle`, `ancient-grove`. All 5 missing chains have corresponding NPC entries in `npcs.json` (Willow, Thorn, Ember are present).

### 10. scopedRNG in Wrong File

CLAUDE.md rule states: "Use `scopedRNG(scope, worldSeed, ...extra)` from `game/utils/seedRNG.ts`".
`scopedRNG` is actually defined in `game/utils/seedWords.ts:195` — mixed with word lists for seed phrase generation. `seedRNG.ts` only exports `createRNG` and `hashString`. All 25 files that import `scopedRNG` import it from `seedWords`. This is a file organization deviation, not a correctness issue, but it breaks the CLAUDE.md contract.

---

## Hard Rule Violations

### Math.random() Usages: 10 found in 4 files

All violate GAME_SPEC.md §3.3 ("Zero Math.random()"):

| File | Line | Context |
|------|------|---------|
| `game/ai/PlayerGovernor.ts` | 375-376 | Target tile selection for AI governor |
| `game/ai/NpcBrain.ts` | 156 | Initial wander timer |
| `game/ai/NpcBrain.ts` | 274-275 | NPC wander offset calculation |
| `game/systems/AudioManager.ts` | 303 | White noise buffer generation |
| `components/game/WeatherOverlay.tsx` | 61-63, 152 | Rain/snow animation randomness (4 calls) |

Note: spec §39.3 already documents "Math.random() violations in 5 files" as a known critical gap.

### Inline Tuning Constants: Significant count

Files with tuning constants that should be in config JSON:

| File | Constants | Should be in |
|------|-----------|-------------|
| `game/systems/time.ts` | `REAL_SECONDS_PER_GAME_DAY=300`, `DEFAULT_SEASON_LENGTH=30`, `DAWN_START`, `DAY_START`, `DUSK_START`, `NIGHT_START` | `dayNight.json` |
| `game/systems/weather.ts` | `WEATHER_CHECK_INTERVAL=300`, `DURATION_RANGES`, `SEASON_PROBABILITIES`, `DEFAULT_RAIN_GROWTH_BONUS=1.3`, `DEFAULT_DROUGHT_GROWTH_PENALTY=0.5`, `DEFAULT_WINDSTORM_DAMAGE_CHANCE=0.1` | `weather.json` (values duplicated) |
| `game/systems/stamina.ts` | `BASE_STAMINA_REGEN_PER_SEC=2` | stamina config or difficulty.json |
| `game/systems/survival.ts` | `BASE_HUNGER_DRAIN_PER_MIN=1.0`, `STARVATION_HEART_DRAIN_PER_MIN=0.25`, `WELL_FED_THRESHOLD=80` | difficulty.json |
| `game/ai/NpcBrain.ts` | `WANDER_RANGE=3`, `WANDER_INTERVAL=8`, `NOTICE_RANGE=6`, `APPROACH_RANGE=3`, `ADJACENT_RANGE=1.5` | `npcs.json` or `npcAnimation.json` |
| `game/world/villageGenerator.ts` | `MIN_BUILDINGS=3`, `MAX_BUILDINGS=8`, `MIN_NPC_COUNT=2`, `MAX_NPC_COUNT=4`, `BUILDING_MIN_DISTANCE=2`, `BUILDING_MAX_DISTANCE=6` | `vegetation.json` or world config |
| `game/hooks/useGameLoop.ts` | `MAX_DELTA=0.1`, `ACHIEVEMENT_CHECK_INTERVAL=5`, `EVENT_TICK_INTERVAL=10`, `NPC_AI_TICK_INTERVAL=2`, `GRID_REBUILD_INTERVAL=5` | `grid.json` or game config |

### Files Over 300 Lines: 21 in game/ and components/

**game/ (non-test):**
| File | Lines |
|------|-------|
| `game/stores/gameStore.ts` | 1317 |
| `game/systems/quests.ts` | 995 |
| `game/utils/treeGeometry.ts` | 950 |
| `game/world/ChunkManager.ts` | 645 |
| `game/ai/PlayerGovernor.ts` | 621 |
| `game/db/queries.ts` | 594 |
| `game/systems/recipes.ts` | 535 |
| `game/constants/codex.ts` | 433 |
| `game/actions/GameActions.ts` | 425 |
| `game/hooks/useGameLoop.ts` | 406 |
| `game/world/WorldGenerator.ts` | 399 |
| `game/world/pathGenerator.ts` | 381 |
| `game/hooks/useInteraction.ts` | 381 |
| `game/ai/NpcBrain.ts` | 373 |
| `game/world/entitySpawner.ts` | 353 |
| `game/systems/enemyAI.ts` | 331 |
| `game/systems/travelingMerchant.ts` | 328 |
| `game/systems/AudioManager.ts` | 328 |
| `game/world/villageGenerator.ts` | 317 |
| `game/quests/questChainEngine.ts` | 314 |
| `game/systems/fishing.ts` | 301 |

**components/ (non-test):**
| File | Lines |
|------|-------|
| `components/game/PauseMenu.tsx` | 755 |
| `components/game/GameUI.tsx` | 463 |
| `components/game/BuildPanel.tsx` | 354 |
| `components/game/NewGameModal.tsx` | 332 |
| `components/game/PlacementGhost.tsx` | 328 |
| `components/scene/TerrainChunk.tsx` | 325 |
| `components/game/MainMenu.tsx` | 324 |
| `components/game/AchievementPopup.tsx` | 309 |

`game/stores/gameStore.ts` at 1317 lines is the most severe single-file violation (4.4x the limit).

---

## Missing Implementations (specced but not built)

1. **Player difficulty tier growth multiplier** — `growthSpeedMult` from `difficulty.json` is never passed to `calcGrowthRate`. The growth formula ignores player difficulty.
2. **Fishing Rod + Hammer tools** — Listed in spec §11.1 but absent from `tools.json` and no implementation files.
3. **5 missing quest chains** — `willow-remedies`, `thorn-trails`, `ember-alchemy`, `seasonal-cycle`, `ancient-grove` have no config entries.
4. **7 missing resource types** — Ore, Berries, Herbs, Meat, Hide, Fish, Seeds (spec §10.1) have no config entries.
5. **5 missing species** — `birch`, `elm`, `ash`, `maple`, `cedar` from spec §9.1 have no config entries.
6. **New Game+ / Raids** — `baseRaids.ts` exists but spec §16.3 base building mode + raid defense is not wired.
7. **Labyrinth fog-of-war + explored path persistence** — Spec §17.5; maze generator exists but explored state not persisted in delta.
8. **14 Grovekeepers** — Spec §9.3 defines 14 specific Grovelkeeper entities. `GrovekeeperSpirit` component exists for 8 spirits; 14-Grovekeeper mapping not implemented.
9. **Cooking system UI** — `cooking.ts` exists but no wired UI or crafting interface.
10. **codex UI** — `speciesDiscovery.ts` wired to store but no codex display UI (noted in §39.3).

---

## Extra Implementations (built but not fully specced)

1. **Ultra-brutal difficulty tier** — `difficulty.json` has 5 tiers; spec §37.2 defines only 4 survival sub-difficulties. `ultra-brutal` is an unspecced addition.
2. **7 extra tools in tools.json** — `almanac`, `seed-pouch`, `compost-bin`, `rain-catcher`, `fertilizer-spreader`, `scarecrow`, `grafting-tool` are not in spec §11.1. They may be intended additions but lack spec coverage.
3. **5 extra species in species.json** — `cherry-blossom`, `flame-maple`, `baobab`, `silver-birch`, `mystic-fern` not in spec §9. Well-populated with data; likely intentional replacements for spec species.
4. **gridGeneration / gridExpansion systems** — Legacy zone-grid systems still exist (`game/systems/gridGeneration.ts`, `gridExpansion.ts`); spec §17 moved to chunk-based world.
5. **ZoneLoader** — `game/world/ZoneLoader.ts` exists; spec describes chunk-based world only.
6. **zoneBonuses system** — `game/systems/zoneBonuses.ts`; zone-based system not referenced in spec.

---

## Critical Issues (numbered, priority order)

1. **Weather RNG is non-deterministic** — `useGameLoop.ts:153` uses `worldSeed.length` instead of `hashString(worldSeed)`. Two seeds of the same character length get identical weather. Date.now() fallback is fully non-deterministic. This breaks the core "same seed = same world" contract.

2. **Three-way time system disagreement** — `time.ts` (300s/day, 30 days/season), `dayNight.json` (600s/day, 7 days/season), and spec (1440s/day, 90 days/season) all differ. `time.ts` is authoritative in practice. Which is intended? This determines entire game pacing.

3. **Species catalog mismatch** — 10 of 15 species in `species.json` differ from spec §9. Five spec species (birch, elm, ash, maple, cedar) have no config or implementation. Five config species (cherry-blossom, flame-maple, baobab, silver-birch, mystic-fern) have no spec coverage. Vegetation placement, Grovekeeper unlock table, and world quest references all assume specific species IDs.

4. **Player difficulty tier not applied to growth** — The `difficulty.json` `growthSpeedMult` field exists but `calcGrowthRate` receives `species.difficulty` (1-5), not the player's chosen tier multiplier. Difficulty selection has no effect on tree growth speed. Critical gameplay mechanic broken.

5. **Difficulty tier names triply inconsistent** — Spec §2.1 vs spec §37.2 vs config IDs all differ. Code checking tier by ID (e.g., `tier === "ironwood"`) will fail since config uses `"ultra-brutal"` for permadeath. Spec §2.4 explicitly prohibits string-matching on tier names.

6. **growth.json stage scales wrong** — Config uses `[0.2, 0.4, 0.6, 0.8, 1.0]`, spec §8.1 says stages 2/3/4 should be 0.5/1.0/1.3. Old Growth trees do not grow larger than Mature trees in current config (max scale 1.0 vs spec 1.3). Visual differentiation lost.

7. **waterBonus 1.3 vs spec 1.5** — A 17% deviation in a core growth formula parameter. All watered-growth calculations are wrong relative to spec. Filed separately because this is config-only (fix: change `growth.json` waterBonus to 1.5).

8. **weather.ts does not import weather.json** — The config file is authoritative for human editors but has zero effect on the running game. Weather probabilities and durations in `weather.ts` are duplicated inline constants. Changes to `weather.json` will be silently ignored.

9. **13 tools.json tools vs 8 in spec §11.1** — Missing `fishing-rod` and `hammer`; 7 extras present. No fishing or hammering/building tool implementation in `tools.json` means those actions cannot be registered by the tool system.

10. **gameStore.ts is 1317 lines** — 4.4x the 300-line limit. Should be decomposed into at minimum: `playerStore.ts`, `worldStore.ts`, `economyStore.ts`, `questStore.ts`, `settingsStore.ts` with a barrel `index.ts`.

---

## Verdict: Spec Alignment Is WEAK

The ECS architecture, chunk streaming, FPS camera, Rapier physics, and most system skeletons are solid. The hard rule violations (Math.random, inline constants, oversized files) are numerous but individually fixable. The critical failures are **data consistency**: species IDs don't match between spec and config, time parameters have three different values across three sources, growth formula is missing player difficulty scaling, and the weather RNG seed is broken in a way that violates the fundamental seed determinism contract. These are not minor drift — they represent fundamental disagreements about what the game's core parameters are, and until they are resolved in `GAME_SPEC.md` first (as the single source of truth), no implementation can be considered correct.

**Priority fix order:**
1. Resolve time scale (decide: spec 1440s, time.ts 300s, or dayNight.json 600s?) — update spec and one source of truth
2. Fix weather RNG: `hashString(store.worldSeed)` not `store.worldSeed.length`
3. Resolve species IDs between spec §9 and species.json
4. Wire player difficulty tier `growthSpeedMult` into `calcGrowthRate`
5. Fix `growth.json` stage scales to match spec (0.5/1.0/1.3 for stages 2/3/4)
6. Fix `growth.json` waterBonus to 1.5
7. Make `weather.ts` import `weather.json` instead of duplicating constants
8. Decompose `gameStore.ts` (1317 lines)
9. Complete 5 missing quest chain configs
10. Resolve difficulty tier naming across spec and config
