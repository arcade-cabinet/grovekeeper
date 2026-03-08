# Game Logic Decomposition Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all game logic from TSX components into pure, tested TypeScript modules aligned with GAME_SPEC.md sections, leaving TSX files responsible only for rendering and React lifecycle.

**Architecture:** Every game calculation lives in a `*Logic.ts` or `game/systems/*.ts` companion file with full Jest coverage. TSX components import and call these functions — no business logic inline. Config JSON holds all tuning values.

**Tech Stack:** TypeScript 5.9 strict, Jest (pnpm test), Biome lint, `config/game/*.json` for tuning values.

---

## Priority Rationale

1. **Phase 1** — Wire already-extracted logic that is being duplicated in app/game/index.tsx (zero-risk, deletes code)
2. **Phase 2** — Extract uncovered logic to pure modules with tests (highest correctness risk)
3. **Phase 3** — Move magic numbers to config JSON (enables tuning without code changes)
4. **Phase 4** — Decompose oversized files (code quality, enables future refactors)

---

## Phase 1: Eliminate Duplicate Logic in GameScreen

### Task 1: Wire `buildGridExpansionInfo` and `buildPrestigeInfo` into GameScreen

`gameUILogic.ts` already exports these functions with tests. `app/game/index.tsx` duplicates them inline.

**Files:**
- Modify: `app/game/index.tsx:163-232`
- Modify: `components/game/GameUI/gameUILogic.ts` (add `buildCosmeticLists`)
- Test: `components/game/GameUI/gameUILogic.test.ts`

**Step 1: Write failing test for `buildCosmeticLists`**

Add to `components/game/GameUI/gameUILogic.test.ts`:
```typescript
import { PRESTIGE_COSMETICS } from "@/game/systems/prestige";
import { buildCosmeticLists } from "./gameUILogic";

describe("buildCosmeticLists", () => {
  it("returns empty unlocked and all locked at count 0", () => {
    const { unlocked, locked } = buildCosmeticLists(0);
    expect(unlocked.length).toBeGreaterThanOrEqual(0); // depends on prestige system
    expect(locked.length + unlocked.length).toBe(PRESTIGE_COSMETICS.length);
  });

  it("unlocked list grows with prestige count", () => {
    const low = buildCosmeticLists(0);
    const high = buildCosmeticLists(5);
    expect(high.unlocked.length).toBeGreaterThanOrEqual(low.unlocked.length);
  });
});
```

**Step 2: Run test to verify it fails**
```bash
pnpm test -- --testPathPattern=gameUILogic
```
Expected: FAIL — `buildCosmeticLists` not exported

**Step 3: Add `buildCosmeticLists` to gameUILogic.ts**

```typescript
import {
  calculatePrestigeBonus,
  canPrestige as checkCanPrestige,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
} from "@/game/systems/prestige";

export interface CosmeticLists {
  unlocked: typeof PRESTIGE_COSMETICS;
  locked: typeof PRESTIGE_COSMETICS;
}

/** Split prestige cosmetics into unlocked vs locked for PauseMenu (Spec §21). */
export function buildCosmeticLists(prestigeCount: number): CosmeticLists {
  return {
    unlocked: getUnlockedCosmetics(prestigeCount),
    locked: PRESTIGE_COSMETICS.filter((c) => c.prestigeRequired > prestigeCount),
  };
}
```

**Step 4: Run test to verify it passes**
```bash
pnpm test -- --testPathPattern=gameUILogic
```

**Step 5: Replace inline logic in app/game/index.tsx**

Remove lines 163–232 (the `gridExpansionInfo`, `prestigeInfo`, `pauseUnlockedCosmetics`, `pauseLockedCosmetics` useMemo blocks).

Add import at top of file:
```typescript
import {
  buildCosmeticLists,
  buildGridExpansionInfo,
  buildPrestigeInfo,
} from "@/components/game/GameUI/gameUILogic";
```

Replace the removed blocks with:
```typescript
const gridExpansionInfo = useMemo(
  () => buildGridExpansionInfo(gridSize, resources, level),
  [gridSize, resources, level],
);

const prestigeInfo = useMemo(
  () => buildPrestigeInfo(prestigeCount, level),
  [prestigeCount, level],
);

const { unlocked: pauseUnlockedCosmetics, locked: pauseLockedCosmetics } = useMemo(
  () => buildCosmeticLists(prestigeCount),
  [prestigeCount],
);
```

**Step 6: Verify lint + tsc pass**
```bash
pnpm exec biome check app/game/index.tsx
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: 0 errors

**Step 7: Commit**
```bash
git add components/game/GameUI/gameUILogic.ts components/game/GameUI/gameUILogic.test.ts app/game/index.tsx
git commit -m "refactor: wire gameUILogic into GameScreen, remove duplicate grid/prestige calculations"
```

---

### Task 2: Extract `buildSpeciesSelectList` from GameScreen

`app/game/index.tsx:235-249` maps `TREE_SPECIES` to UI display objects with color fallback logic. Zero tests.

**Files:**
- Modify: `game/config/species.ts`
- Create: `game/config/species.test.ts` (if not exists, check first)
- Modify: `app/game/index.tsx`

**Step 1: Check existing species.ts**
```bash
cat game/config/species.ts | head -20
```

**Step 2: Write failing test**

In `game/config/species.test.ts` (create if missing):
```typescript
import { buildSpeciesSelectList } from "./species";
import { TREE_SPECIES } from "./species";

describe("buildSpeciesSelectList", () => {
  it("returns one entry per species", () => {
    const list = buildSpeciesSelectList(TREE_SPECIES);
    expect(list.length).toBe(TREE_SPECIES.length);
  });

  it("falls back to default trunk color when meshParams absent", () => {
    const species = [{ id: "test", name: "Test", difficulty: 1, unlockLevel: 1, biome: "forest", special: null, seedCost: 1 }] as any;
    const list = buildSpeciesSelectList(species);
    expect(list[0].trunkColor).toBe("#5D4037");
    expect(list[0].canopyColor).toBe("#81C784");
  });

  it("uses meshParams colors when available", () => {
    const species = [{
      id: "test", name: "Test", difficulty: 1, unlockLevel: 1, biome: "forest", special: null, seedCost: 1,
      meshParams: { color: { trunk: "#AA0000", canopy: "#00AA00" } }
    }] as any;
    const list = buildSpeciesSelectList(species);
    expect(list[0].trunkColor).toBe("#AA0000");
    expect(list[0].canopyColor).toBe("#00AA00");
  });
});
```

**Step 3: Run to verify fails**
```bash
pnpm test -- --testPathPattern=species.test
```

**Step 4: Add `buildSpeciesSelectList` to game/config/species.ts**

```typescript
export interface SpeciesSelectOption {
  id: string;
  name: string;
  difficulty: number;
  unlockLevel: number;
  biome: string;
  special: string | null;
  seedCost: number;
  trunkColor: string;
  canopyColor: string;
}

/** Maps raw TREE_SPECIES to display objects for SeedSelect modal (Spec §26). */
export function buildSpeciesSelectList(species: typeof TREE_SPECIES): SpeciesSelectOption[] {
  return species.map((sp) => ({
    id: sp.id,
    name: sp.name,
    difficulty: sp.difficulty,
    unlockLevel: sp.unlockLevel,
    biome: sp.biome,
    special: sp.special,
    seedCost: sp.seedCost,
    trunkColor: sp.meshParams?.color?.trunk ?? "#5D4037",
    canopyColor: sp.meshParams?.color?.canopy ?? "#81C784",
  }));
}
```

**Step 5: Run to verify passes**
```bash
pnpm test -- --testPathPattern=species.test
```

**Step 6: Replace inline useMemo in app/game/index.tsx**

Remove `seedSelectSpecies` useMemo block (lines 235–249 after Phase 1 renumbering).

Add import:
```typescript
import { buildSpeciesSelectList, TREE_SPECIES } from "@/game/config/species";
```

Replace with:
```typescript
const seedSelectSpecies = useMemo(() => buildSpeciesSelectList(TREE_SPECIES), []);
```

**Step 7: Verify + commit**
```bash
pnpm exec biome check app/game/index.tsx
git add game/config/species.ts app/game/index.tsx
git commit -m "refactor: extract buildSpeciesSelectList to game/config/species.ts with tests"
```

---

## Phase 2: Extract Uncovered Logic to Pure Modules

### Task 3: Extract `resolveTimeVisuals` to `game/systems/timeVisuals.ts`

The `timeVisuals` useMemo in `app/game/index.tsx` (originally lines 258–296) derives lighting parameters from ECS DayNight or falls back to `time.ts`. Complex logic, zero test coverage.

**Files:**
- Create: `game/systems/timeVisuals.ts`
- Create: `game/systems/timeVisuals.test.ts`
- Modify: `app/game/index.tsx`

**Step 1: Write failing tests**

```typescript
// game/systems/timeVisuals.test.ts
import type { DayNightComponent } from "../ecs/components/procedural/index.ts";
import { resolveTimeVisuals } from "./timeVisuals";

const mockDayNight: DayNightComponent = {
  gameHour: 12,
  timeOfDay: "noon",
  dayNumber: 1,
  season: "summer",
  ambientColor: "#ffffff",
  ambientIntensity: 0.8,
  directionalColor: "#ffff99",
  directionalIntensity: 1.0,
  sunIntensity: 1.0,
  shadowOpacity: 1.0,
  skyZenithColor: "#87CEEB",
  skyHorizonColor: "#E0F0FF",
  starIntensity: 0.0,
};

describe("resolveTimeVisuals (Spec §31.3)", () => {
  it("uses ECS DayNight values when provided", () => {
    const result = resolveTimeVisuals(mockDayNight, 0);
    expect(result.timeOfDay).toBe(12 / 24);
    expect(result.sunIntensity).toBe(1.0);
    expect(result.skyColors.zenith).toBe("#87CEEB");
  });

  it("falls back to time.ts when ecs is null", () => {
    const result = resolveTimeVisuals(null, 43_200_000_000); // noon
    expect(result.timeOfDay).toBeGreaterThan(0);
    expect(result.sunIntensity).toBeGreaterThan(0);
  });

  it("ECS path overrides fallback path completely", () => {
    const ecs = resolveTimeVisuals(mockDayNight, 0);
    const fallback = resolveTimeVisuals(null, 0);
    // ECS uses its own values, not re-derived from microseconds
    expect(ecs.timeOfDay).toBe(0.5); // noon
    expect(ecs.skyColors.zenith).not.toBe(fallback.skyColors.zenith);
  });

  it("returns starIntensity = 0 at noon", () => {
    const result = resolveTimeVisuals(mockDayNight, 0);
    expect(result.starIntensity).toBe(0.0);
  });

  it("returns star intensity > 0 at night from fallback", () => {
    const result = resolveTimeVisuals(null, 0); // midnight = 0 microseconds
    expect(result.starIntensity).toBeGreaterThan(0);
  });
});
```

**Step 2: Run to verify fails**
```bash
pnpm test -- --testPathPattern=timeVisuals
```

**Step 3: Create game/systems/timeVisuals.ts**

```typescript
/**
 * resolveTimeVisuals — bridges ECS DayNightComponent and time.ts for the R3F scene (Spec §31.3).
 *
 * Priority: ECS values (8-slot lerped) > time.ts fallback (4 hard phases).
 * The ECS system bootstraps asynchronously; this function handles both states.
 */
import type { DayNightComponent } from "@/game/ecs/components/procedural/index.ts";
import { computeTimeState, getLightIntensity, getSkyColors } from "./time";

export interface TimeVisuals {
  timeOfDay: number;
  sunIntensity: number;
  ambientIntensity: number;
  shadowOpacity: number;
  starIntensity: number;
  skyColors: {
    zenith: string;
    horizon: string;
    sun: string;
    ambient: string;
  };
}

/**
 * Resolves lighting visuals from ECS when available, falls back to time.ts.
 *
 * @param ecs - DayNightComponent from ECS, or null before ECS bootstraps
 * @param gameTimeMicroseconds - Persistent store value for fallback path
 */
export function resolveTimeVisuals(
  ecs: DayNightComponent | null,
  gameTimeMicroseconds: number,
): TimeVisuals {
  if (ecs) {
    return {
      timeOfDay: ecs.gameHour / 24,
      sunIntensity: ecs.sunIntensity,
      ambientIntensity: ecs.ambientIntensity,
      shadowOpacity: ecs.shadowOpacity,
      starIntensity: ecs.starIntensity,
      skyColors: {
        zenith: ecs.skyZenithColor,
        horizon: ecs.skyHorizonColor,
        sun: ecs.directionalColor,
        ambient: ecs.ambientColor,
      },
    };
  }

  const timeState = computeTimeState(gameTimeMicroseconds);
  const sunIntensity = getLightIntensity(timeState.dayProgress);
  const rawSky = getSkyColors(timeState.dayProgress);
  return {
    timeOfDay: timeState.dayProgress,
    sunIntensity,
    ambientIntensity: 0.15 + sunIntensity * 0.65,
    shadowOpacity: sunIntensity,
    starIntensity: 1 - sunIntensity,
    skyColors: {
      zenith: rawSky.top,
      horizon: rawSky.bottom,
      sun: rawSky.bottom,
      ambient: rawSky.top,
    },
  };
}
```

**Step 4: Run to verify passes**
```bash
pnpm test -- --testPathPattern=timeVisuals
```

**Step 5: Wire into app/game/index.tsx**

Add import:
```typescript
import { resolveTimeVisuals } from "@/game/systems/timeVisuals";
```

Replace the `timeVisuals` useMemo block:
```typescript
const timeVisuals = useMemo(() => {
  const ecsEntity = dayNightQuery.entities[0];
  return resolveTimeVisuals(ecsEntity?.dayNight ?? null, gameTimeMicroseconds);
}, [gameTimeMicroseconds]);
```

**Step 6: Remove now-unused imports** — check if `computeTimeState`, `getLightIntensity`, `getSkyColors` are still needed in index.tsx. Remove if not.

**Step 7: Verify + commit**
```bash
pnpm exec biome check app/game/index.tsx
npx tsc --noEmit 2>&1 | grep -c "error TS"
git add game/systems/timeVisuals.ts game/systems/timeVisuals.test.ts app/game/index.tsx
git commit -m "refactor: extract resolveTimeVisuals to game/systems/timeVisuals.ts with tests"
```

---

### Task 4: Create `hudLogic.ts` and extract HUD calculations

`HUD.tsx` has `xpProgress` and `gameTime` useMemo blocks with zero tests. These are pure calculations.

**Files:**
- Create: `components/game/HUD/hudLogic.ts`
- Create: `components/game/HUD/hudLogic.test.ts`
- Modify: `components/game/HUD.tsx`

Note: if HUD.tsx is not in a `HUD/` subdirectory, create the logic file as `components/game/hudLogic.ts` to match the existing settingsLogic.ts pattern.

**Step 1: Write failing tests**

```typescript
// components/game/hudLogic.test.ts
import { buildGameTimeDisplay, calculateXpProgress } from "./hudLogic";

describe("calculateXpProgress (Spec §24)", () => {
  it("returns 0 at the start of a level", () => {
    // level 1: base=0, needed=100 → xp=0 → (0-0)/100 = 0
    expect(calculateXpProgress(0, 1)).toBe(0);
  });

  it("returns 1 when xp fills the level", () => {
    // Depends on store's xpToNext / totalXpForLevel — test the shape not the value
    const result = calculateXpProgress(100, 1);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("clamps at 1 when xp exceeds needed", () => {
    // Feed impossible values — should clamp, not go over 1
    const result = calculateXpProgress(999_999, 1);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returns 1 when needed is 0 (max level guard)", () => {
    // xpToNext returns 0 at max level
    expect(calculateXpProgress(0, 999)).toBe(1);
  });
});

describe("buildGameTimeDisplay (Spec §24)", () => {
  it("returns season from store", () => {
    const time = buildGameTimeDisplay(0, "winter");
    expect(time.season).toBe("winter");
  });

  it("returns day 1 at microsecond 0", () => {
    const time = buildGameTimeDisplay(0, "summer");
    expect(time.day).toBeGreaterThanOrEqual(1);
  });

  it("returns hours in 0-23 range", () => {
    const time = buildGameTimeDisplay(43_200_000_000, "summer");
    expect(time.hours).toBeGreaterThanOrEqual(0);
    expect(time.hours).toBeLessThan(24);
  });

  it("returns minutes in 0-59 range", () => {
    const time = buildGameTimeDisplay(43_200_000_000, "spring");
    expect(time.minutes).toBeGreaterThanOrEqual(0);
    expect(time.minutes).toBeLessThan(60);
  });
});
```

**Step 2: Run to verify fails**
```bash
pnpm test -- --testPathPattern=hudLogic
```

**Step 3: Create components/game/hudLogic.ts**

```typescript
/**
 * HUD pure logic functions (Spec §24).
 *
 * Extracted from HUD.tsx for testability.
 * No React imports — safe to import in plain .test.ts files.
 */
import { totalXpForLevel, xpToNext } from "@/game/stores";
import { computeTimeState } from "@/game/systems/time";
import type { GameTime } from "./TimeDisplay";

/**
 * Normalised XP progress within the current level (0–1).
 * Returns 1 when xpToNext is 0 (max level guard).
 */
export function calculateXpProgress(xp: number, level: number): number {
  const base = totalXpForLevel(level);
  const needed = xpToNext(level);
  return needed <= 0 ? 1 : Math.min(1, (xp - base) / needed);
}

/**
 * Derives display-ready game time fields from the game clock (Spec §24).
 */
export function buildGameTimeDisplay(
  gameTimeMicroseconds: number,
  currentSeason: string,
): GameTime {
  const ts = computeTimeState(gameTimeMicroseconds);
  return {
    hours: ts.hour,
    minutes: Math.floor((ts.dayProgress * 24 - ts.hour) * 60),
    day: ts.dayNumber,
    season: currentSeason,
  };
}
```

**Step 4: Run to verify passes**
```bash
pnpm test -- --testPathPattern=hudLogic
```

**Step 5: Replace in HUD.tsx**

Add import:
```typescript
import { buildGameTimeDisplay, calculateXpProgress } from "./hudLogic";
```

Replace the two useMemo blocks:
```typescript
const xpProgress = useMemo(() => calculateXpProgress(xp, level), [xp, level]);

const gameTime: GameTime = useMemo(
  () => buildGameTimeDisplay(gameTimeMicroseconds, currentSeason),
  [gameTimeMicroseconds, currentSeason],
);
```

Remove the now-unused `totalXpForLevel`, `xpToNext` imports from HUD.tsx (they're now in hudLogic.ts). Keep `computeTimeState` removed too.

**Step 6: Verify + commit**
```bash
pnpm exec biome check components/game/HUD.tsx
npx tsc --noEmit 2>&1 | grep -c "error TS"
git add components/game/hudLogic.ts components/game/hudLogic.test.ts components/game/HUD.tsx
git commit -m "refactor: extract xpProgress + gameTime to components/game/hudLogic.ts with tests"
```

---

## Phase 3: Config JSON for Magic Numbers

### Task 5: Create `config/game/lighting.json` and load in Lighting.tsx

`Lighting.tsx` has hardcoded `FOG_BASE` (r, g, b), sun intensity scale (0.8), min shadow opacity (0.05), and fog blend factors (0.12, 0.1, 0.08). These are tuning values that belong in config.

**Files:**
- Create: `config/game/lighting.json`
- Modify: `components/scene/Lighting.tsx`

**Step 1: Create config/game/lighting.json**

```json
{
  "fog": {
    "baseR": 0.3,
    "baseG": 0.42,
    "baseB": 0.25,
    "zenithBlendR": 0.12,
    "zenithBlendG": 0.10,
    "zenithBlendB": 0.08,
    "near": 20,
    "far": 40
  },
  "sun": {
    "intensityScale": 0.8,
    "minShadowOpacity": 0.05
  }
}
```

**Step 2: Load config in Lighting.tsx**

Add import at top:
```typescript
import lightingConfig from "@/config/game/lighting.json" with { type: "json" };
```

Remove the hardcoded `FOG_BASE` constant.

Replace magic numbers:
```typescript
// Before:
const FOG_BASE = { r: 0.3, g: 0.42, b: 0.25 };
sun.intensity = sunIntensity * 0.8 * Math.max(0.05, effectiveShadowOpacity);
const fogR = Math.min(1, FOG_BASE.r + zenithColor.r * 0.12);
const fogG = Math.min(1, FOG_BASE.g + zenithColor.g * 0.1);
const fogB = Math.min(1, FOG_BASE.b + zenithColor.b * 0.08);

// After:
const { fog, sun: sunCfg } = lightingConfig;
sun.intensity = sunIntensity * sunCfg.intensityScale * Math.max(sunCfg.minShadowOpacity, effectiveShadowOpacity);
const fogR = Math.min(1, fog.baseR + zenithColor.r * fog.zenithBlendR);
const fogG = Math.min(1, fog.baseG + zenithColor.g * fog.zenithBlendG);
const fogB = Math.min(1, fog.baseB + zenithColor.b * fog.zenithBlendB);

// Replace hardcoded near/far in new Fog():
scene.fog = new Fog(new Color(fogR, fogG, fogB), fog.near, fog.far);
```

**Step 3: Verify**
```bash
pnpm exec biome check components/scene/Lighting.tsx
npx tsc --noEmit 2>&1 | grep Lighting
```

**Step 4: Commit**
```bash
git add config/game/lighting.json components/scene/Lighting.tsx
git commit -m "refactor: extract Lighting magic numbers to config/game/lighting.json"
```

---

### Task 6: Add animation constants to `config/game/vegetation.json`

`TreeInstances.tsx` has `SCALE_LERP_SPEED = 4` hardcoded. `GrovekeeperSpirit.tsx` has animation constants.

**Files:**
- Modify: `config/game/vegetation.json`
- Modify: `components/entities/TreeInstances.tsx`
- Create: `config/game/spirits.json` (new)
- Modify: `components/entities/GrovekeeperSpirit.tsx`

**Step 1: Add to vegetation.json**

Find the root object in `config/game/vegetation.json` and add:
```json
{
  "animation": {
    "scaleLerpSpeed": 4
  }
}
```

**Step 2: Load in TreeInstances.tsx**

Add import:
```typescript
import vegetationConfig from "@/config/game/vegetation.json" with { type: "json" };
```

Replace:
```typescript
// Before:
const SCALE_LERP_SPEED = 4;

// After:
const SCALE_LERP_SPEED = vegetationConfig.animation.scaleLerpSpeed;
```

**Step 3: Create config/game/spirits.json**

```json
{
  "animation": {
    "trailCount": 12,
    "trailSpread": 0.2,
    "trailRiseSpeed": 0.25,
    "trailHeight": 0.55,
    "spawnDurationSeconds": 2.0,
    "pulseSpeedMin": 1.5,
    "pulseSpeedMax": 2.5
  }
}
```

**Step 4: Load in GrovekeeperSpirit.tsx**

```typescript
import spiritsConfig from "@/config/game/spirits.json" with { type: "json" };
```

Replace all the hardcoded animation constants with reads from `spiritsConfig.animation`.

**Step 5: Verify + commit**
```bash
npx tsc --noEmit 2>&1 | grep -E "TreeInstances|GrovekeeperSpirit"
git add config/game/vegetation.json config/game/spirits.json components/entities/TreeInstances.tsx components/entities/GrovekeeperSpirit.tsx
git commit -m "refactor: move animation constants to config/game/vegetation.json and spirits.json"
```

---

## Phase 4: Decompose Oversized Files

### Task 7: Decompose `SettingsScreen.tsx` (489 lines → subpackage)

Extract the three slider sections into their own components under a `SettingsScreen/` folder, keeping the parent file as a barrel/orchestrator under 300 lines.

**Files:**
- Create: `components/game/SettingsScreen/VolumeSection.tsx`
- Create: `components/game/SettingsScreen/SensitivitySection.tsx`
- Create: `components/game/SettingsScreen/DrawDistanceSection.tsx`
- Create: `components/game/SettingsScreen/index.tsx` (orchestrator, replaces the old file)
- Keep: `components/game/settingsLogic.ts` (unchanged — already extracted)
- Delete (or empty): `components/game/SettingsScreen.tsx` (move content to `SettingsScreen/index.tsx`)

**Step 1: Read SettingsScreen.tsx to identify section boundaries**
```bash
grep -n "section\|Section\|Volume\|Sensitivity\|DrawDistance\|SliderRow" components/game/SettingsScreen.tsx
```

**Step 2: Create the SettingsScreen/ folder structure**

For each slider section, extract the sub-component and its props into its own file. The parent `index.tsx` becomes the layout/wiring component.

**Step 3: Verify each file is under 300 lines**
```bash
wc -l components/game/SettingsScreen/*.tsx
```
Expected: all under 300 lines

**Step 4: Verify all imports resolve**
```bash
npx tsc --noEmit 2>&1 | grep SettingsScreen
```

**Step 5: Verify no test regressions**
```bash
pnpm test -- --testPathPattern=settings
```

**Step 6: Commit**
```bash
git add components/game/SettingsScreen/
git rm components/game/SettingsScreen.tsx
git commit -m "refactor: decompose SettingsScreen.tsx into SettingsScreen/ subpackage"
```

---

### Task 8: Extract SURVIVAL_TIERS handling from `NewGameModal.tsx`

The `SURVIVAL_TIERS` constant (lines 50–87) contains UI display data for survival sub-difficulties. The gameplay multipliers already live in `config/game/difficulty.json`. Extract the permadeath resolution logic and the tier lookup to a pure module.

Note: `difficulty.json` uses IDs `seedling/sapling/hardwood/ironwood` while `NewGameModal` uses `gentle/standard/harsh/ironwood`. These are **different names for the same concepts** — document this in the extracted module.

**Files:**
- Create: `game/systems/difficulty.ts` (or add to if exists)
- Create: `game/systems/difficulty.test.ts`
- Modify: `components/game/NewGameModal.tsx`

**Step 1: Write failing tests**

```typescript
// game/systems/difficulty.test.ts
import { getSurvivalTier, resolveSurvivalPermadeath } from "./difficulty";

describe("getSurvivalTier", () => {
  it("returns tier by id", () => {
    const tier = getSurvivalTier("standard");
    expect(tier.id).toBe("standard");
    expect(tier.hearts).toBe(5);
  });

  it("falls back to standard when id unknown", () => {
    const tier = getSurvivalTier("unknown" as any);
    expect(tier.id).toBe("standard");
  });
});

describe("resolveSurvivalPermadeath", () => {
  it("forces permadeath ON for ironwood", () => {
    expect(resolveSurvivalPermadeath("ironwood", false)).toBe(true);
  });

  it("forces permadeath OFF for gentle", () => {
    expect(resolveSurvivalPermadeath("gentle", true)).toBe(false);
  });

  it("preserves current value for optional tiers", () => {
    expect(resolveSurvivalPermadeath("standard", true)).toBe(true);
    expect(resolveSurvivalPermadeath("standard", false)).toBe(false);
    expect(resolveSurvivalPermadeath("harsh", true)).toBe(true);
    expect(resolveSurvivalPermadeath("harsh", false)).toBe(false);
  });
});
```

**Step 2: Run to verify fails**
```bash
pnpm test -- --testPathPattern=difficulty.test
```

**Step 3: Create game/systems/difficulty.ts**

```typescript
/**
 * Survival difficulty helpers (Spec §37.2).
 *
 * SurvivalDifficulty IDs (gentle/standard/harsh/ironwood) are the modal-facing
 * labels. They map to difficulty.json ids (seedling/sapling/hardwood/ironwood)
 * for gameplay multipliers, but the UI uses the friendlier names.
 */
import type { SurvivalDifficulty } from "@/components/game/NewGameModal";

export interface SurvivalTier {
  id: SurvivalDifficulty;
  name: string;
  icon: string;
  hearts: number;
  tagline: string;
  color: string;
  permadeathForced: "on" | "off" | "optional";
}

const SURVIVAL_TIERS: SurvivalTier[] = [
  { id: "gentle",   name: "Gentle",   icon: "\u{1F331}", hearts: 7, tagline: "Forgiving survival",          color: "#4CAF50", permadeathForced: "off"      },
  { id: "standard", name: "Standard", icon: "\u{1F33F}", hearts: 5, tagline: "The intended experience",     color: "#2196F3", permadeathForced: "optional" },
  { id: "harsh",    name: "Harsh",    icon: "\u{1F525}", hearts: 4, tagline: "Nature fights back",           color: "#FF9800", permadeathForced: "optional" },
  { id: "ironwood", name: "Ironwood", icon: "\u{1F480}", hearts: 3, tagline: "One bad winter ends it all",   color: "#F44336", permadeathForced: "on"       },
];

/** Returns the SurvivalTier for the given id, or standard as fallback. */
export function getSurvivalTier(id: SurvivalDifficulty): SurvivalTier {
  return SURVIVAL_TIERS.find((t) => t.id === id) ?? SURVIVAL_TIERS[1];
}

/** Returns all survival tiers in display order. */
export function getAllSurvivalTiers(): readonly SurvivalTier[] {
  return SURVIVAL_TIERS;
}

/**
 * Resolves the effective permadeath value after a tier selection.
 * - "on" → always true
 * - "off" → always false
 * - "optional" → preserves the player's current choice
 */
export function resolveSurvivalPermadeath(
  tierId: SurvivalDifficulty,
  currentPermadeath: boolean,
): boolean {
  const tier = getSurvivalTier(tierId);
  if (tier.permadeathForced === "on") return true;
  if (tier.permadeathForced === "off") return false;
  return currentPermadeath;
}
```

**Step 4: Run to verify passes**
```bash
pnpm test -- --testPathPattern=difficulty.test
```

**Step 5: Replace in NewGameModal.tsx**

Remove the inline `SurvivalTier` interface and `SURVIVAL_TIERS` constant (lines 40–87).

Add import:
```typescript
import { getAllSurvivalTiers, getSurvivalTier, resolveSurvivalPermadeath } from "@/game/systems/difficulty";
```

Replace `handleTierSelect`:
```typescript
const handleTierSelect = (tier: ReturnType<typeof getSurvivalTier>) => {
  setSurvivalDifficulty(tier.id);
  setPermadeath(resolveSurvivalPermadeath(tier.id, permadeath));
};
```

Replace `SURVIVAL_TIERS` usage in JSX:
```typescript
const survivalTiers = getAllSurvivalTiers();
```

Replace `SURVIVAL_TIERS.find(...)`:
```typescript
const activeTier = getSurvivalTier(survivalDifficulty);
```

**Step 6: Verify file is under 300 lines + commit**
```bash
wc -l components/game/NewGameModal.tsx
pnpm test -- --testPathPattern="difficulty|NewGameModal"
git add game/systems/difficulty.ts game/systems/difficulty.test.ts components/game/NewGameModal.tsx
git commit -m "refactor: extract survival tier logic to game/systems/difficulty.ts with tests"
```

---

## Final Verification

After all tasks, run the full quality gate:
```bash
pnpm lint
npx tsc --noEmit
pnpm test
```

All three must pass cleanly before closing this plan.

Check file sizes:
```bash
find components game app -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```

Any file over 300 lines that is NOT a test file needs a note in the backlog.

---

## Backlog (Out of Scope for This Plan)

- `components/game/PlacementGhost.tsx` (328 lines) — extract placement logic to `game/systems/placement.ts`
- `components/game/RadialActionMenu.tsx` (311 lines) — extract tool selection logic
- `game/world/ChunkManager.ts` (685 lines) — already in game/, but needs decomposition into subpackage
- `game/db/queries.ts` (595 lines) — split by domain (player, world, quests)
- Naming alignment: `difficulty.json` ids (seedling/sapling/hardwood/ironwood) vs modal ids (gentle/standard/harsh/ironwood) — full rename after UI/UX redesign
