# Fix Report: W1-D

Agent: fix-W1-D
Date: 2026-03-07

---

## FIX-04: game/ui/Toast.ts — showToast() implemented

**Problem:** `showToast()` was a no-op stub. All player feedback was silently dropped.

**Implementation:**

- `ToastType` expanded: `"success" | "error" | "info" | "reward" | "achievement" | "warning"` (added `"error"` and `"reward"` to support gameStore usages)
- `Toast` interface: `{ id: string, message: string, type: ToastType, timestamp: number }`
- Module-level `toasts: Toast[]` array with `Set<Listener>` subscriber set
- `showToast(message, type)` generates a unique `id = toast-${Date.now()}-${random4digit}`, pushes to array, notifies subscribers, sets `setTimeout` to remove by id after 3000ms
- `subscribeToasts(listener)` — subscribe/unsubscribe, returns cleanup fn
- `getToasts()` — non-reactive snapshot
- `useToasts()` — React hook with lazy `require("react")` to avoid test environment crashes
- `_resetToastsForTesting()` — clears module-level state for unit tests

**Note:** `showToast` uses `Math.random()` for the id suffix. This is intentional — toast IDs are ephemeral UI identifiers, not game-world state. They do not need deterministic seeding.

**Test results:** 11/11 pass (`game/ui/Toast.test.ts`)

---

## FIX-15: game/systems/dialogueEffects.ts — unlock_species effect added

**Problem:** `applyDialogueEffects()` silently ignored `unlock_species` effects. Spirit encounters couldn't reward species unlocks.

**Design decision:** `dialogueEffects.ts` is a pure-function module with no store imports. Rather than import the store (which would create a circular dependency and break testability), the function returns `unlockedSpecies: string[]` in its result. The caller (the store's `applyDialogueNodeEffects`) is responsible for persisting the unlock.

**New switch case in `applyDialogueEffects`:**
```typescript
} else if (effect.type === "unlock_species") {
  const speciesId = String(effect.value);
  if (!unlockedSpecies.includes(speciesId)) {
    unlockedSpecies.push(speciesId);
  }
}
```

**Return type extended:** `{ state, completedSteps, unlockedSpecies: string[] }`

**gameStore.ts `applyDialogueNodeEffects` updated** to iterate `result.unlockedSpecies`, call `actions.unlockSpecies(speciesId)`, and queue `showToast(`Unlocked ${speciesId}!`, 'reward')`.

**Existing test updated:** "ignores non-quest effect types" test narrowed to only `give_item` and `give_xp` (unlock_species now has real behavior).

**New test cases added (6 new tests):**
- Returns speciesId in `unlockedSpecies` array
- Does not mutate quest chain state for unlock_species-only effect
- Deduplicates same speciesId appearing multiple times
- Collects multiple distinct species
- Combines with quest effects in same call
- Returns empty array when no unlock_species effects

**Test results:** 21/21 pass (`game/systems/dialogueEffects.test.ts`)

---

## FIX-19: game/systems/time.ts — authoritative day length reconciled

**Problem:** Three conflicting values:
- `GAME_SPEC.md §5`: 1440s (24 minutes) — outdated spec entry
- `time.ts`: 300s hardcoded constant — arbitrary
- `dayNight.json`: 600s (`dayLengthSeconds`) — 10 real minutes, matches §1102 of GAME_SPEC.md

**Decision:** `dayNight.json#dayLengthSeconds = 600` is authoritative (GAME_SPEC.md §1102 confirms this value, and `game/systems/dayNight.ts` already used this config).

**Change in `time.ts`:**
- Added `import dayNightConfig from "@/config/game/dayNight.json"`
- `REAL_SECONDS_PER_GAME_DAY` now reads from `dayNightConfig.dayLengthSeconds` (600) instead of hardcoded 300
- Comment updated to reflect 10 real minutes per game day

**Other hardcoded day-length values found in codebase:**
- `config/game/procedural.json` line 83: `"dayLengthSeconds": 600` — already consistent (600)
- `game/systems/dayNight.ts` line 25: `const DAY_LENGTH = dayNightConfig.dayLengthSeconds` — already uses config
- `game/systems/recipes.ts` line 499: `durationSec: 1440` — this is a recipe cook duration (24 game minutes), NOT a day length

**Test results:** 22/22 pass (no test assertions hardcoded 300 — all tests use `MICROSECONDS_PER_DAY` which derives from the config value)

---

## FIX-21: game/systems/weather.ts — imported from weather.json

**Problem:** All weather tuning values were inline constants in `weather.ts`. `config/game/weather.json` had no effect on the running game.

**Added to `config/game/weather.json`** (missing values that existed as inline constants):
- `growthMultipliers: { clear: 1.0, rain: 1.3, drought: 0.5, windstorm: 1.0 }`
- `windstormDamageChance: 0.1`

**Inline constants replaced in `weather.ts`:**

| Inline constant | Replaced with |
|---|---|
| `WEATHER_CHECK_INTERVAL = 300` | `weatherConfig.checkIntervalSec` |
| `DURATION_RANGES = { rain: [60,120], ... }` | `weatherConfig.durationRanges.*` |
| `SEASON_PROBABILITIES = { spring: {...}, ... }` | `weatherConfig.seasonProbabilities` |
| `DEFAULT_RAIN_GROWTH_BONUS = 1.3` | `weatherConfig.growthMultipliers.rain` |
| `DEFAULT_DROUGHT_GROWTH_PENALTY = 0.5` | `weatherConfig.growthMultipliers.drought` |
| `DEFAULT_WINDSTORM_DAMAGE_CHANCE = 0.1` | `weatherConfig.windstormDamageChance` |
| `getWeatherStaminaMultiplier` inline `1.5` | `weatherConfig.staminaMultipliers.*` |

**Test results:** 67/67 pass (weather.test.ts + weatherParticles.test.ts) — values unchanged, only source of truth moved to JSON.
