# Fix W1-C: Math.random() Violations

**Date:** 2026-03-07
**Agent:** fix-W1-C
**Files touched:** 3

---

## Replacements Made

### 1. `game/ai/PlayerGovernor.ts`

**Violations:** 2x `Math.random()` in `resolveTarget()` → `"explore"` case (lines 375–376)

**Before:**
```ts
const tx = bounds.minX + Math.floor(Math.random() * rangeX);
const tz = bounds.minZ + Math.floor(Math.random() * rangeZ);
```

**After:**
```ts
const worldSeed = useGameStore.getState().worldSeed;
const rng = scopedRNG("governor-explore", worldSeed, this.exploreDecisionCount++);
const tx = bounds.minX + Math.floor(rng() * rangeX);
const tz = bounds.minZ + Math.floor(rng() * rangeZ);
```

**Scope:** `"governor-explore"`
**Extra seed params:** `exploreDecisionCount` (new private counter incremented per explore decision)
**Import added:** `import { scopedRNG } from "@/game/utils/seedWords";`
**Field added:** `private exploreDecisionCount = 0;`

---

### 2. `game/ai/NpcBrain.ts`

**Violation 1:** `Math.random()` in constructor for wander timer stagger (line 156)

**Before:**
```ts
this.entity.wanderTimer = Math.random() * WANDER_INTERVAL;
```

**After:**
```ts
const worldSeed = useGameStore.getState().worldSeed;
const staggerRng = scopedRNG("npc-wander-stagger", worldSeed, entityId);
this.entity.wanderTimer = staggerRng() * WANDER_INTERVAL;
```

**Scope:** `"npc-wander-stagger"`
**Extra seed params:** `entityId` (unique per NPC, stable per session)

---

**Violation 2:** 2x `Math.random()` in `executeWander()` for random offsets (lines 274–275)

**Before:**
```ts
const offsetX = Math.floor(Math.random() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
const offsetZ = Math.floor(Math.random() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
```

**After:**
```ts
const worldSeed = useGameStore.getState().worldSeed;
const rng = scopedRNG("npc-wander", worldSeed, this.entityId, this.wanderDecisionCount++);
const offsetX = Math.floor(rng() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
const offsetZ = Math.floor(rng() * (WANDER_RANGE * 2 + 1)) - WANDER_RANGE;
```

**Scope:** `"npc-wander"`
**Extra seed params:** `entityId` + `wanderDecisionCount` (new private counter incremented per wander decision)
**Imports added:** `import { useGameStore } from "@/game/stores/gameStore";` and `import { scopedRNG } from "@/game/utils/seedWords";`
**Field added:** `private wanderDecisionCount = 0;`

---

### 3. `components/game/WeatherOverlay.tsx`

**Violation 1:** `Math.random()` in `RainDrop` `useMemo` for left position offset (line 61)

**Before:**
```ts
const leftPct = useMemo(() => (index / total) * 100 + Math.random() * 3, [index, total]);
```

**After:**
```ts
const leftPct = useMemo(() => {
  const rng = scopedRNG("weather-rain-left", worldSeed, index);
  return (index / total) * 100 + rng() * 3;
}, [index, total, worldSeed]);
```

**Scope:** `"weather-rain-left"`

---

**Violation 2:** `Math.random()` in `RainDrop` `useMemo` for delay (line 62)

**Before:**
```ts
const _delay = useMemo(() => Math.random() * 800, []);
```

**After:**
```ts
const _delay = useMemo(() => {
  const rng = scopedRNG("weather-rain-delay", worldSeed, index);
  return rng() * 800;
}, [index, worldSeed]);
```

**Scope:** `"weather-rain-delay"`

---

**Violation 3:** `Math.random()` in `RainDrop` `useMemo` for duration (line 63)

**Before:**
```ts
const duration = useMemo(() => 600 + Math.random() * 400, []);
```

**After:**
```ts
const duration = useMemo(() => {
  const rng = scopedRNG("weather-rain-duration", worldSeed, index);
  return 600 + rng() * 400;
}, [index, worldSeed]);
```

**Scope:** `"weather-rain-duration"`

---

**Violation 4:** `Math.random()` in `WindStreak` `useMemo` for duration (line 152)

**Before:**
```ts
const duration = useMemo(() => 800 + Math.random() * 600, []);
```

**After:**
```ts
const duration = useMemo(() => {
  const rng = scopedRNG("weather-wind-duration", worldSeed, index);
  return 800 + rng() * 600;
}, [index, worldSeed]);
```

**Scope:** `"weather-wind-duration"`
**Imports added:** `import { useGameStore } from "@/game/stores/gameStore";` and `import { scopedRNG } from "@/game/utils/seedWords";`
**worldSeed sourced via:** `useGameStore((s) => s.worldSeed)` in both `RainDrop` and `WindStreak` components

---

## Test Results

**Tests run (targeted):** `PlayerGovernor | NpcBrain | WeatherOverlay | NpcManager`
- `game/ai/NpcBrain.test.ts` — PASS (18 tests)
- `game/npcs/NpcManager.test.ts` — PASS (17 tests)
- WeatherOverlay has no test file.
- PlayerGovernor test file not present in codebase (confirmed by test runner pattern match).

**Full test suite:** 2 pre-existing failures in `game/systems/survival.test.ts` and `game/config/difficulty.test.ts` — both confirmed pre-existing before our changes (verified by stash test).

## Lint Results

**Our 3 files:** 0 errors after `biome check --write` applied safe import-ordering fixes.
**Full codebase:** 354 pre-existing errors (not introduced by this work).
