# Seasons and Weather

Grovekeeper features a continuous day/night cycle with four seasons and dynamic weather events that affect tree growth rates and player stamina costs.

## Time System

Defined in `src/game/systems/time.ts`. Time runs on microsecond precision.

### Time Scale

| Real Time | Game Time |
|-----------|-----------|
| 1 second | 1 minute |
| 1 minute | 1 hour |
| 24 minutes | 1 day |
| 12 hours | 1 month (30 days) |
| 36 hours | 1 season (3 months) |
| 6 days | 1 year (12 months) |

The time scale constant is `60` (1 real second = 60 game seconds = 1 game minute). This can be adjusted at runtime via `setTimeScale()` but defaults to 60.

### Day Structure

The day is divided into named periods based on the current game hour:

| Period | Game Hours | Description |
|--------|-----------|-------------|
| Midnight | 0:00 -- 4:59 | Darkest period, minimal ambient light |
| Dawn | 5:00 -- 5:59 | Sky begins to lighten |
| Morning | 6:00 -- 11:59 | Sun rises, full daylight ramps up |
| Noon | 12:00 -- 13:59 | Peak sunlight |
| Afternoon | 14:00 -- 17:59 | Sun begins descent |
| Dusk | 18:00 -- 19:59 | Sunset colors |
| Evening | 20:00 -- 21:59 | Twilight, light fading |
| Night | 22:00 -- 23:59 | Dark sky |

### Light Values

Two computed light values drive the BabylonJS scene:

- **Sun intensity:** 0.0 at night, ramps from 0 to 1 between dawn and noon, then 1 to 0 between afternoon and evening. Never goes below 0.
- **Ambient intensity:** `max(0.15, sunIntensity * 0.6 + 0.2)`. Always at least 0.15, so the scene is never completely black.

### Dynamic Sky Colors

`getSkyColors(time)` returns four hex colors (zenith, horizon, sun tint, ambient) interpolated between 8 predefined color stops using linear color lerp. Season modifiers for saturation and warmth are defined but the current implementation uses the time-based colors directly.

Sky color stops:

| Time | Zenith | Horizon |
|------|--------|---------|
| Midnight | `#0a1628` | `#1a2a4a` |
| Dawn | `#2a3a5a` | `#ff9966` |
| Morning | `#4a90d9` | `#87ceeb` |
| Noon | `#1e90ff` | `#87ceeb` |
| Afternoon | `#4a90d9` | `#87ceeb` |
| Dusk | `#5a4a7a` | `#ff7744` |
| Evening | `#2a2a4a` | `#4a3a5a` |
| Night | `#0a1628` | `#1a2a4a` |

## Seasons

### Season Calendar

| Season | Months | Month Numbers |
|--------|--------|---------------|
| Spring | March -- May | 3, 4, 5 |
| Summer | June -- August | 6, 7, 8 |
| Autumn | September -- November | 9, 10, 11 |
| Winter | December -- February | 12, 1, 2 |

Each month is 30 game days. Each season spans 3 months (90 game days). A full year is 12 months (360 game days).

The game starts on Spring, Day 1, Year 1, at 8:00 AM.

### Season Growth Multipliers

Defined in `src/game/constants/config.ts`:

| Season | Multiplier | Effect |
|--------|-----------|--------|
| Spring | 1.5x | Fastest growth season |
| Summer | 1.0x | Baseline |
| Autumn | 0.8x | Slightly slower |
| Winter | 0.0x | Growth halted for most species |

**Winter exceptions:**

| Species | Winter Multiplier | Why |
|---------|------------------|-----|
| Elder Pine | 0.3x | Evergreen flag |
| Redwood | 0.3x | Evergreen flag |
| Crystalline Oak | 0.3x | Evergreen flag |
| Worldtree | 0.3x | Evergreen flag |
| Ghost Birch | 0.5x | Special hardcoded override |
| All others | 0.0x | Growth halted |

### Seasonal Visual Changes

`getSeasonalColors(season, seasonProgress)` returns season-specific leaf colors, ground color, and grass color:

| Season | Leaf Palette | Ground |
|--------|-------------|--------|
| Spring | Light greens (`#90EE90`, `#7CFC00`, `#98FB98`, `#00FA9A`, `#66CDAA`) | `#2d5a27` |
| Summer | Deep greens (`#228B22`, `#2E8B57`, `#3CB371`, `#32CD32`, `#006400`) | `#3d6b35` |
| Autumn | Warm reds/golds (`#FF6347`, `#FF4500`, `#FFD700`, `#FFA500`, `#8B4513`) | `#5a4a27` |
| Winter | Muted greens (`#1C4C27`, `#2F4F4F`, `#1a3a1a`, `#2B4B2B`, `#365C36`) | `#4a4a52` |

Tree meshes are rebuilt on season transitions to apply the new canopy colors.

## Weather System

Defined in `src/game/systems/weather.ts`. Weather events overlay the seasonal system, providing short-term environmental variation.

### Weather Types

| Type | Growth Effect | Stamina Effect | Duration (game sec) | Visual |
|------|-------------|----------------|---------------------|--------|
| Clear | 1.0x (normal) | 1.0x (normal) | Until next check | None |
| Rain | 1.3x (boost) | 1.0x (normal) | 60 -- 120 | CSS rain overlay |
| Drought | 0.5x (penalty) | 1.5x (costly) | 90 -- 180 | CSS heat haze overlay |
| Windstorm | 1.0x (normal) | 1.0x (normal) | 30 -- 60 | CSS wind overlay |

**Windstorm damage:** 10% chance per check to damage trees at stage 0 (Seed) or stage 1 (Sprout). Damage resets growth progress within the current stage but does not reduce the stage.

### Weather Check Interval

New weather is rolled every **300 game seconds** (5 game minutes). Between events, conditions default to Clear.

### Season-Specific Probabilities

Each season has different likelihoods for weather events. Values are raw probabilities (remainder is Clear):

| Season | Rain | Drought | Windstorm | Clear |
|--------|------|---------|-----------|-------|
| Spring | 30% | 5% | 10% | 55% |
| Summer | 15% | 25% | 5% | 55% |
| Autumn | 20% | 10% | 20% | 50% |
| Winter | 5% | 15% | 15% | 65% |

### Deterministic RNG

Weather rolls are seeded using `hashString("weather-{rngSeed}-{nextCheckTime}")` and the `createRNG()` utility from `src/game/utils/seedRNG.ts`. This makes weather deterministic for a given game time and seed, ensuring consistency across save/load cycles.

### Weather State Machine

```text
initializeWeather(currentGameTimeSeconds)
  --> WeatherState { current: Clear, nextCheckTime: now + 300 }

updateWeather(state, currentTime, season, rngSeed)
  if event still active  --> return unchanged
  if event expired but before next check  --> transition to Clear
  if at or past next check  --> roll new weather type and duration
```

The `updateWeather()` function is pure (no side effects). It is called from the game loop each frame with the current game time in seconds.

### Growth Formula Integration

The weather multiplier is passed as the third argument to `growthSystem()`:

```typescript
const weatherMult = getWeatherGrowthMultiplier(weatherRef.current.current.type);
growthSystem(deltaTime, currentSeason, weatherMult);
```

Inside `growthSystem`, the per-tree progress update is:

```text
tree.progress += rate * weatherMultiplier * deltaTime
```

Where `rate` already includes season, difficulty, and water bonuses.

### Visual Effects

Weather visuals are implemented as CSS overlays in `src/game/ui/WeatherOverlay.tsx`, avoiding the bundle size and performance cost of BabylonJS particle systems:

- **Rain:** Animated vertical streaks
- **Drought:** Heat shimmer / haze effect
- **Windstorm:** Horizontal particle streaks
- **Cherry petals:** Dedicated falling petal overlay (active when a Cherry Blossom at stage 3+ exists), independent of weather type

The `setWeatherVisual(type)` and `setShowPetals(boolean)` functions are called from the game loop to update the CSS overlay state.

## Source Files

| File | Role |
|------|------|
| `src/game/systems/time.ts` | `TIME_CONFIG`, `updateTime()`, `getSkyColors()`, `getSeasonalColors()` |
| `src/game/systems/weather.ts` | `WeatherState`, `updateWeather()`, multiplier functions |
| `src/game/constants/config.ts` | `SEASON_GROWTH_MULTIPLIERS`, `WATER_BONUS` |
| `src/game/ui/WeatherOverlay.tsx` | CSS-based rain, drought, windstorm, petal overlays |
| `src/game/ui/TimeDisplay.tsx` | Day/night/season indicator in HUD |
