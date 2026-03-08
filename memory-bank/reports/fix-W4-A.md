# fix-W4-A: useGameLoop — Ambient Audio, Combat Pipeline, Look Tutorial

**Date:** 2026-03-07
**Agent:** Fix Agent (Claude Sonnet 4.6)
**Branch:** feat/expo-migration
**File owned:** `game/hooks/useGameLoop/index.ts`

---

## Summary

All 3 fixes applied to `game/hooks/useGameLoop/index.ts`. Tests: **3,864 passed / 0 failed**. TypeScript: 0 new errors in owned files.

---

## Fix A: Wire ambientAudio tick

**Location:** `game/hooks/useGameLoop/index.ts`

### What was done

- Added imports: `ambientZonesQuery`, `combatQuery`, `enemiesQuery` from `@/game/ecs/world`; `TimeOfDay` type from `@/game/ecs/components/procedural/atmosphere`; `computeAmbientMix`, `tickAmbientAudio`, `AmbientAudioState`, `ZoneInput` from `@/game/systems/ambientAudio`.
- Added `ambientAudioRef = useRef<AmbientAudioState | null>(null)` (line 103).
- Added module-level `hourToTimeOfDay(hour: number): TimeOfDay` helper (lines 72–81) mapping integer game hours to the 8-value `TimeOfDay` enum used by `computeAmbientMix`.
- Added tick block at **lines 161–189** (section `2b. Ambient Audio Tick`), after weather updates and before growth. The tick guard-checks `ambientAudioRef.current` — if `null` (no `initAmbientLayers` caller yet), the block is skipped silently. When initialized, it:
  1. Reads player position from `playerQuery`.
  2. Collects `ZoneInput[]` from `ambientZonesQuery` (entities with `ambientZone` + `position` components).
  3. Calls `computeAmbientMix(zones, playerPos, timeOfDay)`.
  4. Calls `tickAmbientAudio(ambientAudioRef.current, ambientMix)`.

### Complication

The `computeAmbientMix` function takes `ZoneInput[]`, not the raw ECS query — a mapping step is required. `timeState` does not carry a `TimeOfDay` label; only `hour: number` (0–23). Added `hourToTimeOfDay` to bridge the gap. `AmbientAudioState` is not auto-initialized (requires a `nodeFactory` for Tone.js nodes), so the tick is gated on `ambientAudioRef.current !== null`. Callers that set up audio nodes must assign `ambientAudioRef.current` externally — this is the correct pattern for audio init (done once on user gesture, not per-frame).

---

## Fix B: Wire enemy spawning + combat tick

**Location:** `game/hooks/useGameLoop/index.ts`, lines 253–295 (section `6c. Combat Pipeline`)

### What was done

Added import: `EnemyEntityManager` from `@/game/systems/enemyAI`; `tickAttackCooldown`, `tickInvulnFrames` from `@/game/systems/combat`.

Added combat block after `tickNpcAI` and before achievements:

1. **Enemy AI tick** (lines 257–289): Collects player position and enemy positions into a local map, then calls `EnemyEntityManager.updateAll(dt, getCtx)`. The `getCtx` callback resolves per-brain context from `enemiesQuery` for each registered brain. Uses `[...enemiesQuery].find(...)` to look up entities by id within the callback — safe since the registry only contains enemies that were explicitly spawned.

2. **Combat component tick** (lines 292–295): Iterates `combatQuery` (entities with `combat + health + position`), calls `tickInvulnFrames(entity.health, dt)` and `tickAttackCooldown(entity.combat, dt)` per entity.

### Complication

`enemySpawning.ts` has no `tickEnemySpawning(world, store, deltaTime)` function — spawning is chunk-load-time only (`spawnEnemiesForChunk` returns entries for insertion). The per-frame tick surface is `EnemyEntityManager.updateAll()` (enemy AI brains) and the individual `tick*` functions in `combat.ts`. There is no monolithic `tickCombat(world, store, dt)` — combat damage events are initiated by player tool swings (in `useInteraction`), not by a frame tick. The per-frame combat tick is limited to timer decay (`invulnFrames`, `cooldownRemaining`), which is what was wired.

---

## Fix C: Wire advanceTutorial to look action

**Location:** `game/hooks/useGameLoop/index.ts`, lines 68–69 (module level), lines 222–233 (tick)

### What was done

- Added `let hasFirefiredLookTutorial = false` at module level (line 69).
- Added import: `advanceTutorial` from `@/game/stores/settings`; `inputManager` from `@/game/input/InputManager`.
- Added check at **lines 222–233** (section `5b. Look Tutorial`), after harvest cooldowns and before NPC movement. Each frame, if `!hasFirefiredLookTutorial`, reads `inputManager.getFrame()`, computes `Math.sqrt(lookDeltaX^2 + lookDeltaY^2)`, and if magnitude > 0.1, calls `advanceTutorial("action:look")` and sets the flag.

### Complication

`advanceTutorial` is exported from `@/game/stores/settings` but is NOT re-exported from `@/game/stores` barrel (the barrel only re-exports `./core` and `./chunkDeltas`). Initial import from `@/game/stores` caused TS error `TS2305: Module has no exported member 'advanceTutorial'`. Fixed by importing directly from `@/game/stores/settings`.

`InputManager.getFrame()` is the correct method (not `getCurrentFrame()` as the task spec suggested). Look deltas are named `lookDeltaX` and `lookDeltaY` (not a single `lookDelta` object).

---

## Test Result

```
Test Suites: 162 passed, 162 total
Tests:       3864 passed, 0 failed
Time:        7.164 s
```

## TypeScript Result

```
npx tsc --noEmit 2>&1 | grep "useGameLoop"
(no output — zero errors in owned file)
```

Pre-existing errors in non-owned files (163 non-test errors) are unchanged from before this wave.
