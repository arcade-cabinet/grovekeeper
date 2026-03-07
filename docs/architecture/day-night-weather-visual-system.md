# Day/Night Cycle & Weather Visual System -- Complete Design

> **NOTE (2026-03-07):** Core atmosphere system remains accurate. Updates from `docs/plans/2026-03-07-unified-game-design.md` Section 10:
>
> - **Survival weather impact:** Rain = cold exposure (heart drain without shelter). Drought = +50% stamina cost. Windstorm = structure damage, tree breakage. Snow = cold damage, water freezes.
> - **Temperature system:** Biome + weather + time-of-day. Campfire/shelter = warmth. Frozen Peaks without gear = heart drain.
> - **Night penalties:** Cold exposure (heart drain without campfire/shelter), reduced visibility, hostile creatures near labyrinths.
> - **Night rewards:** Ghost Birch glow reveals hidden paths, NPC Sage/Ember available for lore/alchemy, lunar herbs harvestable only at night.
> - **Weather warnings:** Bramble NPC warns player 30 game seconds before severe weather.
> - **Species weather affinities:** Weeping Willow +30% rain yield, Ghost Birch +50% snow growth.
> - **Golden hour XP bonus:** +15% harvest XP during dawn/dusk.

This document specifies every visual parameter for Grovekeeper's atmosphere system: sky gradients, lighting ramps, seasonal palettes, weather particle effects, transitions, gameplay integration, and performance constraints. It is the implementation blueprint -- code should match these tables exactly.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Sky System](#2-sky-system)
3. [Lighting Ramps](#3-lighting-ramps)
4. [Seasonal Visual Changes](#4-seasonal-visual-changes)
5. [Weather Visual Effects](#5-weather-visual-effects)
6. [Weather Transitions](#6-weather-transitions)
7. [Gameplay Integration](#7-gameplay-integration)
8. [Performance Budget](#8-performance-budget)
9. [Config JSON Schemas](#9-config-json-schemas)
10. [Implementation File Map](#10-implementation-file-map)

---

## 1. System Overview

### Architecture

```
useGameLoop (useFrame)
  |
  +-- advanceTime(deltaMicroseconds) --> TimeState { dayProgress, season, phase, hour }
  |
  +-- updateWeather(state, gameTimeSec, season, rngSeed) --> WeatherState
  |
  v
Atmosphere components (inside <Canvas>):
  <Sky skyColors={...} season={...} sunIntensity={...} weatherType={...} />
  <Lighting timeOfDay={...} season={...} sunIntensity={...} skyColors={...} weatherType={...} />

HUD overlay (outside <Canvas>):
  <WeatherOverlay weatherType={...} />
```

### Data Flow

1. `useGameLoop` advances the time system every frame.
2. `computeTimeState()` returns `dayProgress` (0-1), `phase`, `season`, `hour`.
3. The new `getSkyColorsInterpolated(dayProgress, season)` function returns four interpolated hex colors: zenith, horizon, sun tint, ambient.
4. `getLightIntensity(dayProgress)` returns sun intensity (0-1).
5. `getAmbientIntensity(sunIntensity)` returns ambient intensity (0.15-0.8).
6. These values are passed as props to `<Sky>` and `<Lighting>`.
7. Weather type is passed to both the 3D components (for lighting/fog adjustments) and the React Native `<WeatherOverlay>` (for screen-space effects).

### Time Phases (current, unchanged)

| Phase | dayProgress range | Duration (real seconds) |
|-------|-------------------|------------------------|
| Night (pre-dawn) | 0.000 -- 0.200 | 60s |
| Dawn | 0.200 -- 0.300 | 30s |
| Day | 0.300 -- 0.750 | 135s |
| Dusk | 0.750 -- 0.850 | 30s |
| Night (post-dusk) | 0.850 -- 1.000 | 45s |

Total: 300 real seconds = 5 real minutes = 1 game day.

---

## 2. Sky System

### 2.1 Sky Color Ramp -- 8-Stop Interpolation

The current implementation snaps between 4 phase colors. The new system uses 8 color stops with linear RGB interpolation between adjacent stops, matching the spec (GAME_SPEC.md Section 5.3).

#### Base Sky Color Stops (Season-Neutral)

| Stop | dayProgress | Zenith Hex | Horizon Hex | Sun Tint Hex | Ambient Hex |
|------|-------------|-----------|-------------|-------------|-------------|
| 0 - Midnight | 0.000 | `#0a1628` | `#1a2a4a` | `#1a2a4a` | `#0d1b2e` |
| 1 - Dawn | 0.208 | `#2a3a5a` | `#ff9966` | `#ffb347` | `#4a5a7a` |
| 2 - Morning | 0.333 | `#4a90d9` | `#87ceeb` | `#fff5e6` | `#6090b0` |
| 3 - Noon | 0.500 | `#1e90ff` | `#87ceeb` | `#fffff0` | `#7ab0d0` |
| 4 - Afternoon | 0.625 | `#4a90d9` | `#87ceeb` | `#fff5e6` | `#6090b0` |
| 5 - Dusk | 0.792 | `#5a4a7a` | `#ff7744` | `#ff8855` | `#5a4a6a` |
| 6 - Evening | 0.875 | `#2a2a4a` | `#4a3a5a` | `#3a3050` | `#2a2a3a` |
| 7 - Night | 0.958 | `#0a1628` | `#1a2a4a` | `#1a2a4a` | `#0d1b2e` |

#### Interpolation Function

```typescript
function getSkyColorsInterpolated(
  dayProgress: number,
  season: Season,
): { zenith: string; horizon: string; sun: string; ambient: string } {
  // 1. Find the two surrounding stops from SKY_COLOR_STOPS[]
  // 2. Compute t = (dayProgress - stop[i].progress) / (stop[i+1].progress - stop[i].progress)
  // 3. Lerp each channel (R, G, B) independently: result = a + (b - a) * t
  // 4. Apply seasonal tint (multiply blend at 8% strength)
  // 5. Return as hex strings
}
```

#### Pseudocode for Sky Gradient Shader

The existing sky shader in `components/scene/Sky.tsx` is correct in structure. The fragment shader remains:

```glsl
// Sky.tsx fragment shader (unchanged structure, updated uniforms)
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uSeasonTint;
uniform float uIntensity;
uniform float uCloudDensity;    // NEW: 0.0 (clear) to 0.6 (overcast)
uniform float uCloudScroll;     // NEW: time-based scroll offset
varying vec3 vWorldPosition;

void main() {
  float height = normalize(vWorldPosition).y;
  float t = clamp(height, 0.0, 1.0);
  float smoothT = t * t * (3.0 - 2.0 * t); // smoothstep

  vec3 color = mix(uHorizonColor, uZenithColor, smoothT);

  // Seasonal tint (8% blend)
  color = mix(color, color * uSeasonTint, 0.08);

  // Cloud layer: simple scrolling noise band at horizon
  float cloudBand = smoothstep(0.15, 0.35, t) * smoothstep(0.55, 0.35, t);
  float noise = fract(sin(dot(vWorldPosition.xz + uCloudScroll, vec2(12.9898, 78.233))) * 43758.5453);
  float cloud = cloudBand * noise * uCloudDensity;
  color = mix(color, vec3(0.9, 0.9, 0.95), cloud);

  // Day/night intensity
  color *= uIntensity;

  gl_FragColor = vec4(color, 1.0);
}
```

### 2.2 Sun/Moon Position

The sun position is already computed in `Lighting.tsx`. Formalize the calculation:

```typescript
// Sun position from game hours (0-24)
function getSunPosition(hours: number): { x: number; y: number; z: number } {
  const sunAngle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
  return {
    x: -Math.cos(sunAngle) * 10,
    y: Math.max(0, 10 * Math.sin(sunAngle)), // clamp below horizon
    z: -Math.sin(sunAngle) * 6,
  };
}

// Moon: offset by 12 hours, smaller radius, always visible at night
function getMoonPosition(hours: number): { x: number; y: number; z: number } {
  const moonAngle = ((hours + 12) / 24) * Math.PI * 2 - Math.PI / 2;
  return {
    x: -Math.cos(moonAngle) * 8,
    y: Math.max(0, 8 * Math.sin(moonAngle)),
    z: -Math.sin(moonAngle) * 5,
  };
}
```

Moon: NOT rendered as a mesh (PSX aesthetic). Moonlight is implicit via the blue-tinted ambient and hemisphere ground color at night.

### 2.3 Stars

No star particle system. The dark night sky gradient (`#0a1628` zenith) provides the atmosphere. Stars would add draw calls and complexity for minimal PSX-aesthetic benefit. The night sky is "dark and moody" -- not a planetarium.

If stars are later desired: use a single `<Points>` buffer with 200 vertices, alpha-fading based on `sunIntensity` (visible only when intensity < 0.2). Cost: 1 draw call, ~0.1ms GPU.

### 2.4 Cloud Layer

Clouds are rendered as part of the sky shader (see section 2.1), not as separate geometry.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Method | Procedural noise band in sky shader | Zero additional draw calls |
| Scroll speed | 0.02 units/sec | Gentle drift rightward |
| Band height | 0.15 -- 0.55 normalized sky height | Concentrated around horizon-to-mid-sky |
| Density (clear) | 0.0 | No clouds |
| Density (normal) | 0.15 | Wispy |
| Density (rain approaching) | 0.45 | Building overcast |
| Density (rain active) | 0.55 | Heavy overcast |
| Density (drought) | 0.05 | Almost cloudless |
| Density (windstorm) | 0.35 | Scattered, fast-moving |
| Cloud color | `rgb(230, 230, 242)` | Slightly blue-white |

Cloud density transitions use `lerp(currentDensity, targetDensity, Math.min(1, dt * 0.5))` for smooth 2-second ramp.

### 2.5 Horizon Fog

Fog is already implemented in `Lighting.tsx`. The design formalizes the parameters:

| Parameter | Day Value | Night Value | Notes |
|-----------|-----------|-------------|-------|
| Fog near | 20 | 12 | Night fog closes in |
| Fog far | 40 | 28 | Shorter visibility at night |
| Fog color base | `rgb(77, 107, 64)` | `rgb(20, 35, 50)` | Earthy green day, deep blue night |
| Sky tint blend | 12% zenith color | 8% zenith color | Matches horizon |

Fog near/far are interpolated with `sunIntensity`:

```typescript
const fogNear = 12 + sunIntensity * 8;   // 12 (night) -> 20 (day)
const fogFar  = 28 + sunIntensity * 12;  // 28 (night) -> 40 (day)
```

Weather overrides:

| Weather | Fog Near | Fog Far | Fog Color Shift |
|---------|----------|---------|-----------------|
| Clear | default | default | none |
| Rain | -4 | -8 | +10% blue (`#4060a0` blend) |
| Drought | +4 | +6 | +15% warm (`#c09060` blend) |
| Windstorm | -2 | -6 | +8% grey (`#808080` blend) |

---

## 3. Lighting Ramps

### 3.1 Sun (Directional Light)

| dayProgress | Intensity | Color Hex | Color Temp (K) | Shadow Direction |
|-------------|-----------|-----------|----------------|-----------------|
| 0.000 (Midnight) | 0.00 | `#1a2a4a` | 3000 | N/A (no shadow) |
| 0.208 (Dawn) | 0.15 | `#ffb347` | 3200 | Long, from east |
| 0.250 (Early Morning) | 0.40 | `#ffd699` | 4000 | Medium, from east |
| 0.333 (Morning) | 0.75 | `#fff5e6` | 5200 | Short, from east |
| 0.500 (Noon) | 1.00 | `#fffff0` | 6500 | Directly overhead |
| 0.625 (Afternoon) | 0.85 | `#fff5e6` | 5500 | Short, from west |
| 0.750 (Golden Hour) | 0.55 | `#ffcc88` | 3800 | Long, from west |
| 0.792 (Dusk) | 0.25 | `#ff8855` | 2800 | Very long, from west |
| 0.875 (Evening) | 0.05 | `#3a3050` | 2200 | N/A (fading) |
| 0.958 (Night) | 0.00 | `#1a2a4a` | 2000 | N/A (no shadow) |

Sun intensity is already computed by `getLightIntensity()`. The color is derived from the `sun` field of the interpolated sky colors.

Shadow map: 512px on mobile, 1024px on desktop (unchanged from current).

### 3.2 Ambient Light

Formula: `ambientIntensity = max(0.15, sunIntensity * 0.6 + 0.2)`

| dayProgress | Sun Intensity | Ambient Intensity | Ambient Color Hex |
|-------------|---------------|-------------------|-------------------|
| 0.000 | 0.00 | 0.20 | `#0d1b2e` |
| 0.208 | 0.15 | 0.29 | `#4a5a7a` |
| 0.333 | 0.75 | 0.65 | `#6090b0` |
| 0.500 | 1.00 | 0.80 | `#7ab0d0` |
| 0.625 | 0.85 | 0.71 | `#6090b0` |
| 0.792 | 0.25 | 0.35 | `#5a4a6a` |
| 0.875 | 0.05 | 0.23 | `#2a2a3a` |
| 0.958 | 0.00 | 0.20 | `#0d1b2e` |

### 3.3 Hemisphere Light (New)

Not currently implemented. A hemisphere light should be added for more natural outdoor illumination. It provides a sky-to-ground gradient fill that ambient light alone cannot achieve.

| Parameter | Day | Night |
|-----------|-----|-------|
| Sky color | `#87ceeb` | `#0a1628` |
| Ground color | `#3a5a2a` | `#0a1a0a` |
| Intensity | 0.3 | 0.08 |

Both colors interpolate using `sunIntensity` as the blend factor:

```typescript
hemisphereLight.skyColor.lerpColors(nightSkyColor, daySkyColor, sunIntensity);
hemisphereLight.groundColor.lerpColors(nightGroundColor, dayGroundColor, sunIntensity);
hemisphereLight.intensity = 0.08 + sunIntensity * 0.22;
```

**Decision: defer hemisphere light.** The current 2-light setup (ambient + directional) meets the performance budget and visual target. Add hemisphere light only if the scene looks flat after PSX shader integration. Adding it would bring the light count to 3 (within the max 4 budget).

### 3.4 Night Lighting

| Element | Implementation | Notes |
|---------|---------------|-------|
| Moonlight | Blue-tinted ambient (`#0d1b2e`) at 0.20 intensity | Already covers this |
| Structure point lights | One warm `<pointLight>` per structure at night | Max 4, 1.5-unit radius, `#ffcc66`, intensity 0.4 |
| Ghost Birch glow | Emissive material (`#aaddff`) on Ghost Birch meshes | Already implemented in species materials |
| Fireflies | NOT implemented | Would need particle system; defer to post-ship |

Structure point lights activation:

```typescript
// In StructureMeshes.tsx useFrame:
const showNightLights = sunIntensity < 0.2;
pointLight.intensity = showNightLights ? 0.4 * (1 - sunIntensity / 0.2) : 0;
```

Max 4 structure point lights (closest 4 to player). Each costs ~0 draw calls (lights are not meshes) but does add to per-pixel shader cost.

### 3.5 Golden Hour

Dawn (dayProgress 0.20 -- 0.30) and dusk (dayProgress 0.75 -- 0.85) produce warm orange lighting automatically through the interpolated sky colors. The sun tint at these times is `#ffb347` (dawn) and `#ff8855` (dusk), creating the golden hour effect.

No special-case code needed -- the 8-stop color ramp handles it naturally.

---

## 4. Seasonal Visual Changes

### 4.1 Per-Season Sky Palette Modifiers

Each season applies a multiplicative tint to the sky gradient. The tint is blended at 8% strength (see sky shader, section 2.1).

| Season | Tint Color | Hex | Effect |
|--------|-----------|-----|--------|
| Spring | Pastel green | `#90EE90` | Brighter, greener sky |
| Summer | Warm yellow | `#FFD54F` | Deeper, warmer blue |
| Autumn | Warm orange | `#FF8A65` | Amber-tinted horizon |
| Winter | Pale blue | `#90CAF9` | Desaturated, cooler sky |

These are already defined in `config/theme.json` as `springGreen`, `summerYellow`, `autumnOrange`, `winterBlue` and consumed by `Sky.tsx`.

### 4.2 Per-Season Fog Density and Color

| Season | Fog Near | Fog Far | Fog Color Modifier | Description |
|--------|----------|---------|-------------------|-------------|
| Spring | default | default | +5% green (`#90EE90`) | Fresh, misty mornings |
| Summer | +2 | +3 | +3% yellow (`#FFD54F`) | Clear, long visibility |
| Autumn | -2 | -3 | +8% orange (`#FF8A65`) | Hazy, warm fog |
| Winter | -4 | -6 | +10% blue (`#90CAF9`) | Dense, cold fog |

Applied as modifiers to the base fog values from section 2.5:

```typescript
const seasonFogModifiers: Record<Season, { nearDelta: number; farDelta: number; tintHex: string; tintStrength: number }> = {
  spring:  { nearDelta:  0, farDelta:  0, tintHex: "#90EE90", tintStrength: 0.05 },
  summer:  { nearDelta:  2, farDelta:  3, tintHex: "#FFD54F", tintStrength: 0.03 },
  autumn:  { nearDelta: -2, farDelta: -3, tintHex: "#FF8A65", tintStrength: 0.08 },
  winter:  { nearDelta: -4, farDelta: -6, tintHex: "#90CAF9", tintStrength: 0.10 },
};
```

### 4.3 Per-Season Ambient Light Color Shift

The ambient color from section 3.2 is further modified by season:

| Season | Ambient Shift | Method |
|--------|--------------|--------|
| Spring | +5% green | `ambient.lerp(#90EE90, 0.05)` |
| Summer | +3% warm | `ambient.lerp(#FFD54F, 0.03)` |
| Autumn | +8% orange | `ambient.lerp(#FF8A65, 0.08)` |
| Winter | +10% blue | `ambient.lerp(#90CAF9, 0.10)` |

### 4.4 Day Length Variation by Season

The current system uses fixed phase thresholds for all seasons. Adding seasonal day length variation:

| Season | Dawn Start | Day Start | Dusk Start | Night Start | Daylight Hours | Real Daylight (sec) |
|--------|-----------|-----------|-----------|-------------|---------------|-------------------|
| Spring | 0.20 | 0.28 | 0.77 | 0.85 | ~11.8h | 147s |
| Summer | 0.17 | 0.25 | 0.80 | 0.88 | ~13.2h | 165s |
| Autumn | 0.22 | 0.32 | 0.73 | 0.83 | ~9.8h | 123s |
| Winter | 0.25 | 0.35 | 0.70 | 0.80 | ~8.4h | 105s |

Implementation:

```typescript
const SEASON_PHASE_THRESHOLDS: Record<Season, { dawn: number; day: number; dusk: number; night: number }> = {
  spring:  { dawn: 0.20, day: 0.28, dusk: 0.77, night: 0.85 },
  summer:  { dawn: 0.17, day: 0.25, dusk: 0.80, night: 0.88 },
  autumn:  { dawn: 0.22, day: 0.32, dusk: 0.73, night: 0.83 },
  winter:  { dawn: 0.25, day: 0.35, dusk: 0.70, night: 0.80 },
};
```

This modifies `phaseFromProgress()` and `getLightIntensity()` to accept a `season` parameter.

### 4.5 Season Transition

Season transitions happen over the last 5 game days of each season (seasonDay 25-29 for 30-day seasons). During this period, the outgoing season's visual parameters (sky tint, fog, ambient shift) gradually blend toward the incoming season.

```typescript
function getSeasonBlend(seasonDay: number, seasonLength: number): { current: Season; next: Season; t: number } | null {
  const transitionStart = seasonLength - 5;
  if (seasonDay < transitionStart) return null;
  const t = (seasonDay - transitionStart) / 5; // 0.0 -> 1.0 over 5 days
  return { current: currentSeason, next: nextSeason, t };
}
```

During transition, all seasonal modifiers (sky tint, fog, ambient) are lerped:

```typescript
const effectiveTint = lerpColor(currentSeasonTint, nextSeasonTint, blend.t);
```

This provides a gradual 5-day visual shift instead of an abrupt snap.

---

## 5. Weather Visual Effects

### Design Decision: CSS/React Native Overlays vs. 3D Particles

The current implementation uses React Native Animated overlays. This is the correct approach for Grovekeeper:

| Criterion | CSS/RN Overlays | 3D Particles |
|-----------|----------------|-------------|
| Draw calls | 0 | 1-3 per system |
| GPU cost | ~0.5ms | ~2-4ms |
| PSX aesthetic match | Good (flat, stylized) | Over-detailed |
| Bundle impact | None (React Native) | +three/examples particle imports |
| Platform consistency | Identical on all devices | GPU-dependent |
| **Verdict** | **Use this** | Defer |

However, some 3D-world effects (puddles, wet surfaces, snow cover) must happen in the scene.

### 5.1 Rain

#### Screen-Space Overlay (WeatherOverlay.tsx)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Drop count | 30 (mobile) / 50 (desktop) | Current: 30. Keep for mobile. |
| Drop width | 1px | CSS width |
| Drop height | 16px | CSS height |
| Drop color | `rgba(147, 197, 253, 0.7)` | `blue-300/70` -- current |
| Fall duration | 600-1000ms per drop | Randomized per drop |
| Angle | Vertical (0deg) | Straight down for cozy feel |
| Fade | 0.7 -> 0.3 opacity over fall | Current behavior |
| Reduced-motion fallback | Static `bg-blue-300/15` overlay | Current behavior |

#### 3D Scene Effects

| Effect | Implementation | Cost |
|--------|---------------|------|
| Wet ground | Darken ground material color by 15% | 0 draw calls (uniform change) |
| Specular boost | Increase ground roughness from 0.95 to 0.65 | 0 draw calls (uniform change) |
| Puddles | NOT implemented | Would require decals or texture overlay -- defer |

Ground wetness in `Ground.tsx`:

```typescript
// In useFrame:
if (weatherType === "rain") {
  mat.color.lerp(wetGroundColor, 0.05); // 15% darker
  mat.roughness = THREE.MathUtils.lerp(mat.roughness, 0.65, 0.05);
} else {
  mat.color.lerp(dryGroundColor, 0.02); // slow dry
  mat.roughness = THREE.MathUtils.lerp(mat.roughness, 0.95, 0.02);
}
```

#### Lightning

| Parameter | Value | Notes |
|-----------|-------|-------|
| Frequency | Every 8-15 seconds during rain | Not during light rain -- only heavy (future) |
| Duration | 100ms flash + 50ms dark + 80ms flash | Double-flash pattern |
| Screen flash | White overlay at 0.15 opacity | React Native Animated View |
| Sound | Thunder clap, delayed 0.5-2.0s after flash | Future audio system |
| Directional light boost | +0.5 intensity for 100ms | Simulates lightning illumination |

Lightning implementation: NOT in initial build. Add as post-ship polish. The double-flash is visually striking but adds complexity to the weather overlay.

#### Rain Sound Ramp

| Phase | Duration | Volume |
|-------|----------|--------|
| Fade in | 3 seconds | 0.0 -> 0.6 |
| Sustained | event duration | 0.6 |
| Fade out | 3 seconds | 0.6 -> 0.0 |

Handled by AudioManager (future) with `crossfade(ambientTrack, rainTrack, 3.0)`.

### 5.2 Drought

#### Screen-Space Overlay (WeatherOverlay.tsx)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Haze color | `rgba(251, 146, 60, 0.20)` | `orange-300` -- current |
| Haze pulse | 0.15 -> 0.25 opacity, 2s cycle | Current behavior (slow breathe) |
| Reduced-motion fallback | Static `bg-orange-300/20` | Current behavior |

#### Heat Haze (Screen-Space Distortion)

True screen-space distortion is expensive and not PSX-appropriate. Instead, use a subtle shimmer band:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Method | Animated opacity band on overlay | NOT shader distortion |
| Band height | Bottom 30% of screen | Heat rises from ground |
| Shimmer speed | 1.5s cycle | Gentle wave |
| Opacity range | 0.03 -> 0.08 | Very subtle |

#### Color Desaturation

| Parameter | Value | Notes |
|-----------|-------|-------|
| Amount | 15% uniform desaturation | Applied via scene fog color shift |
| Method | Shift fog color toward grey by 15% | `fog.color.lerp(grey, 0.15)` |
| Scope | Entire scene (via fog) | No per-object changes needed |

#### Dust Particles (Overlay)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Count | 6 | Small number, drift slowly |
| Size | 3-6px circles | Rounded, semi-transparent |
| Color | `rgba(194, 154, 108, 0.3)` | `--gk-warm-clay` at 30% |
| Drift speed | 15-25 seconds across screen | Very slow horizontal drift |
| Direction | Left to right | Consistent with wind |

Implementation: 6 additional `Animated.View` circles in `WeatherOverlay.tsx`, animated with `withRepeat` + `withTiming`.

#### 3D Scene Effects

| Effect | Implementation | Cost |
|--------|---------------|------|
| Dry ground | Lighten ground color by 10%, increase roughness to 1.0 | 0 draw calls |
| Cracked ground | NOT implemented | Would need texture swap -- defer |
| Wilted trees | NOT implemented | Would need per-instance color shift -- defer |

### 5.3 Windstorm

#### Screen-Space Overlay (WeatherOverlay.tsx)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Streak count | 8 (current) | Keep |
| Streak width | 60px | Current |
| Streak height | 2px | Current |
| Streak color | `rgba(156, 163, 175, 0.5)` | `gray-400/50` -- current |
| Angle | -15deg rotation | Current |
| Travel duration | 800-1400ms | Current |
| Background tint | `bg-gray-500/10` | Current |
| Reduced-motion fallback | Static `bg-gray-400/15` | Current |

#### Leaf/Debris Particles (Overlay)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Count | 5 leaves + 3 twigs | Small count |
| Leaf size | 8-12px | Small enough to look like debris |
| Leaf color | Season-dependent canopy color | Matches current tree colors |
| Twig size | 15-25px x 2px | Thin rectangles |
| Twig color | `#8B6F47` (`--gk-bark-brown`) | |
| Direction | Left to right, slight downward arc | 10deg from horizontal |
| Speed | 400-800ms across screen | Fast |
| Rotation | Leaves tumble (continuous rotate) | `withRepeat(rotate 0->360)` |

#### 3D Scene Effects: Tree Sway

| Parameter | Value | Notes |
|-----------|-------|-------|
| Method | Instance matrix rotation offset | Applied in `TreeInstances.tsx` useFrame |
| Sway amplitude | 5deg (0.087 rad) | All trees lean in wind direction |
| Sway frequency | 0.8 Hz | Gentle oscillation around lean |
| Wind direction | Positive X | Fixed direction for simplicity |
| Oscillation formula | `lean + sin(time * 0.8 * 2PI) * 0.02` | Small oscillation around base lean |
| Young trees (stage 0-1) | 2x amplitude (10deg) | More vulnerable |
| Old growth (stage 4) | 0.5x amplitude (2.5deg) | Sturdier |

```typescript
// In TreeInstances.tsx useFrame, when weatherType === "windstorm":
const leanAngle = 0.087; // 5 degrees base
const stageFactor = tree.stage <= 1 ? 2.0 : tree.stage >= 4 ? 0.5 : 1.0;
const oscillation = Math.sin(elapsedTime * 0.8 * Math.PI * 2) * 0.02;
const rotation = (leanAngle * stageFactor) + oscillation;
// Apply as Z-axis rotation to instance matrix
```

#### Camera Shake

| Parameter | Value | Notes |
|-----------|-------|-------|
| Method | Additive offset to camera position | In `Camera.tsx` useFrame |
| Amplitude | 0.03 units X, 0.02 units Y | Very subtle |
| Frequency | Perlin-like noise, 2-3 Hz | Not regular sine -- feels organic |
| Implementation | `sin(t * 2.3) * 0.03 + sin(t * 3.7) * 0.01` | Two sine waves for organic feel |
| Reduced-motion | Disabled entirely | Respect accessibility |

```typescript
// In Camera.tsx, when weatherType === "windstorm" && !prefersReducedMotion:
const shakeX = Math.sin(elapsedTime * 2.3) * 0.03 + Math.sin(elapsedTime * 3.7) * 0.01;
const shakeY = Math.sin(elapsedTime * 1.9) * 0.02;
cam.position.x += shakeX;
cam.position.y += shakeY;
```

### 5.4 Snow (Winter-Only Weather Event)

Snow is a new weather type that replaces rain in winter. When the weather system rolls "rain" during winter, it becomes "snow" instead.

#### Weather System Change

```typescript
// In weather.ts rollWeatherType():
if (season === "winter" && result === "rain") return "snow";
```

Add `"snow"` to the `WeatherType` union:

```typescript
export type WeatherType = "clear" | "rain" | "drought" | "windstorm" | "snow";
```

Snow has the same growth multiplier as rain (+30% -- moisture for evergreens).

#### Screen-Space Overlay

| Parameter | Value | Notes |
|-----------|-------|-------|
| Flake count | 25 (mobile) / 40 (desktop) | Fewer than rain, larger |
| Flake size | 3-6px circles | Rounded, soft edges |
| Flake color | `rgba(255, 255, 255, 0.7)` | Pure white |
| Fall duration | 2000-4000ms per flake | Slow drift |
| Horizontal drift | +/- 30px sine wave | Gentle side-to-side |
| Drift formula | `translateX: sin(t * 0.5) * 30` | Combined with vertical fall |
| Reduced-motion fallback | Static `bg-white/10` overlay | |

#### 3D Scene Effects

| Effect | Implementation | Cost |
|--------|---------------|------|
| Ground snow tint | Lerp ground color toward `#dde8dd` (grey-white) by 20% | 0 draw calls |
| Snow accumulation | NOT implemented | Would need vertex displacement -- defer |
| Frozen water tiles | Tint water tile material toward `#a8dadc` (winter-frost) | 0 draw calls |
| Frost on trees | NOT implemented | Emissive edge glow too expensive for PSX look -- defer |

Ground snow in `Ground.tsx`:

```typescript
if (weatherType === "snow") {
  const snowColor = new THREE.Color("#dde8dd");
  mat.color.lerp(snowColor, 0.04); // gradual whitening
  mat.roughness = THREE.MathUtils.lerp(mat.roughness, 0.98, 0.05); // matte snow
}
```

---

## 6. Weather Transitions

### 6.1 Transition Timing

Weather changes are NOT instant. All visual effects fade in/out over a transition period:

| Transition | Duration | Method |
|-----------|----------|--------|
| Clear -> Any weather | 5 seconds | Gradual overlay fade-in + fog shift |
| Any weather -> Clear | 8 seconds | Slower clearing, natural feel |
| Weather -> Different weather | 3s out + 2s gap + 5s in | Brief clear period between |
| Cloud density shift | 4 seconds | Lerp cloud uniform |

### 6.2 Weather Approach (Pre-Event)

Before a weather event starts, visual cues hint at the change:

| Time Before Event | Visual Cue |
|-------------------|-----------|
| 30 game seconds (~0.5 real sec) | Cloud density increases to 0.35 |
| 15 game seconds (~0.25 real sec) | Fog far distance decreases by 4 |
| Event start | Full weather visuals activate |

Implementation: the weather system already knows `nextCheckTime`. When `gameTimeSec > nextCheckTime - 30`, begin the approach visuals. This requires exposing `nextCheckTime` from the weather state to the rendering layer.

```typescript
function getWeatherApproachFactor(state: WeatherState, gameTimeSec: number): number {
  const timeToNext = state.nextCheckTime - gameTimeSec;
  if (timeToNext > 30 || timeToNext < 0) return 0;
  return 1 - (timeToNext / 30); // 0 -> 1 as event approaches
}
```

### 6.3 Weather Clearing

When a weather event ends:

| Phase | Duration (real seconds) | Visual |
|-------|------------------------|--------|
| Particle fade-out | 3s | Overlay opacity -> 0 |
| Fog return to normal | 5s | Lerp fog near/far back |
| Cloud density drop | 4s | Lerp density to 0.15 |
| Ground drying (rain) | 8s | Roughness returns to 0.95 |
| Ground cooling (drought) | 5s | Color returns to normal |
| Tree sway stop (wind) | 2s | Lean angle -> 0 |

All transitions use frame-rate-independent lerp: `current = lerp(current, target, Math.min(1, dt * speed))`.

### 6.4 Compound Weather

The current system does not support simultaneous weather types. Weather events are mutually exclusive -- only one active at a time. This is correct for gameplay clarity and visual simplicity.

However, windstorm + rain is a natural combination for future consideration. If added:
- Rain drops would be angled (matching wind direction)
- Both overlays would render simultaneously
- Growth multiplier would be `rain * 1.0` (windstorm has no growth effect)

Decision: NOT in initial implementation. Keep weather types exclusive.

---

## 7. Gameplay Integration

### 7.1 Night Gameplay

Night is darker but never unplayable. The ambient minimum of 0.15 ensures all objects are visible.

| Feature | Details |
|---------|---------|
| Visibility | Reduced but playable. Fog closes in (near: 12, far: 28). |
| Ghost Birch glow | Emissive material visible at night, serves as natural landmark. |
| Structure lights | Warm point lights near structures help navigation. |
| Night growth bonus | Moonwood Ash species gets +25% growth rate at night. |
| Night harvest bonus | None. Avoid punishing players who play at different times of day. |
| Night-active NPCs | Bramble (mushroom NPC) has different dialogue at night. |

#### Moonwood Ash Night Growth

Already specified in species catalog. Implementation:

```typescript
// In growth rate calculation:
if (speciesId === "moonwood-ash" && isNightTime(dayProgress)) {
  rate *= 1.25; // +25% at night
}
```

### 7.2 Golden Hour Bonuses

Dawn (dayProgress 0.20-0.30) and dusk (dayProgress 0.75-0.85) are "golden hours."

| Bonus | Value | Scope |
|-------|-------|-------|
| Harvest XP bonus | +15% XP from harvesting | All species |
| Visual indicator | Warm golden vignette tint | Subtle `rgba(255, 179, 71, 0.06)` overlay |
| Duration | ~30 real seconds each (dawn + dusk) | Total ~60s/day with bonus |

Implementation: the harvest system checks `phase === "dawn" || phase === "dusk"` and applies a 1.15x XP multiplier. The vignette is a React Native overlay (same pattern as WeatherOverlay).

### 7.3 Weather Warnings

NPC "Bramble" warns about incoming weather when the player is nearby.

| Trigger | Bramble's Line | Display |
|---------|---------------|---------|
| 30 game seconds before rain | "Smell that? Rain's coming. Good for the saplings." | NPC dialogue bubble |
| 30 game seconds before drought | "Getting dry... keep your seedlings watered." | NPC dialogue bubble |
| 30 game seconds before windstorm | "Wind's picking up. Watch your young trees!" | NPC dialogue bubble |
| 30 game seconds before snow | "Snowfall soon. Only the evergreens will grow." | NPC dialogue bubble |

Implementation: in the NPC brain, when `getWeatherApproachFactor() > 0` and the NPC is within 3 tiles of the player, trigger weather-specific dialogue. One warning per weather event (cooldown flag).

### 7.4 Weather-Specific Species Traits

These are already defined in the species catalog but documented here for completeness:

| Species | Weather Affinity | Effect |
|---------|-----------------|--------|
| Weeping Willow | Rain | +30% yield when harvested during rain |
| Elder Pine | Windstorm | Immune to windstorm damage |
| Flame Maple | Drought | No growth penalty during drought (1.0x instead of 0.5x) |
| Ghost Birch | Snow | +50% growth during snow (stacks with rain bonus) |
| Baobab | Drought | Stores water internally; no growth penalty |

These affinities modify the growth rate calculation and are checked in `calcGrowthRate()`.

### 7.5 Season-Locked Activities

| Season | Activity | Details |
|--------|----------|---------|
| Spring | Flower picking | Decorative flowers spawn on grass tiles (purely cosmetic). |
| Summer | Extended daylight | Longer work hours, more growth time. |
| Autumn | Harvest festival | Festival event (in event scheduler). 2x harvest yields for 3 days. |
| Winter | Dormant grove | Most trees stop growing. Focus on crafting, trading, planning. |

These are handled by the event scheduler (`game/events/eventScheduler.ts`) and do not require visual system changes.

---

## 8. Performance Budget

### 8.1 Atmosphere System Budget

| Component | Draw Calls | GPU Time (mobile) | GPU Time (desktop) |
|-----------|-----------|-------------------|-------------------|
| Sky sphere | 1 | 0.3ms | 0.2ms |
| Fog (built-in) | 0 | 0.1ms | 0.1ms |
| Directional light + shadow | 0 + shadow pass | 1.5ms | 1.0ms |
| Ambient light | 0 | 0ms | 0ms |
| Structure point lights (max 4) | 0 | 0.5ms | 0.3ms |
| Weather overlay (RN Animated) | 0 (CPU) | 0ms GPU | 0ms GPU |
| Cloud noise (in sky shader) | 0 (same draw call) | +0.1ms | +0.1ms |
| **Total atmosphere** | **1** | **2.5ms** | **1.7ms** |

Target: atmosphere visuals < 3ms GPU on mobile. This is well within budget.

### 8.2 Weather Overlay CPU Budget

| Overlay | Animated Views | CPU per frame |
|---------|---------------|---------------|
| Rain (30 drops) | 30 | ~0.5ms (RN Animated on UI thread) |
| Rain (50 drops, desktop) | 50 | ~0.8ms |
| Drought (haze + 6 dust) | 7 | ~0.1ms |
| Windstorm (8 streaks + 8 debris) | 16 | ~0.3ms |
| Snow (25 flakes) | 25 | ~0.4ms |
| Golden hour vignette | 1 | ~0ms |

All well within CPU budget. React Native Reanimated runs animations on the UI thread (or native driver), avoiding JS thread blocking.

### 8.3 Tree Sway Budget (Windstorm)

Tree sway modifies instance matrices per frame during windstorm. This is O(N) where N is tree count.

| Tree Count | Cost per Frame | Notes |
|-----------|---------------|-------|
| 50 trees | ~0.2ms | Matrix multiplication per instance |
| 100 trees | ~0.4ms | Still acceptable |
| 200 trees | ~0.8ms | Near limit -- cap visible trees |

Since maximum grid is 32x32 = 1024 tiles, but trees typically occupy 30-50% of tiles, expect 300-500 trees max. However, instance culling means only ~50-100 are visible at once (fog at 40 units). Cost stays under 0.5ms.

### 8.4 Light Count Budget

| Light | Type | Shadow | Count |
|-------|------|--------|-------|
| Sun | Directional | Yes (1 shadow map) | 1 |
| Ambient | Ambient | No | 1 |
| Structure point lights | Point | No | 0-4 (night only) |
| **Total** | | | **2 (day) / 6 (night)** |

Mobile WebGL limit is typically 8 lights. We use at most 6. Safe.

---

## 9. Config JSON Schemas

### 9.1 Sky Color Stops Config

File: `config/game/skyColors.json`

```json
{
  "stops": [
    {
      "dayProgress": 0.000,
      "label": "midnight",
      "zenith": "#0a1628",
      "horizon": "#1a2a4a",
      "sun": "#1a2a4a",
      "ambient": "#0d1b2e"
    },
    {
      "dayProgress": 0.208,
      "label": "dawn",
      "zenith": "#2a3a5a",
      "horizon": "#ff9966",
      "sun": "#ffb347",
      "ambient": "#4a5a7a"
    },
    {
      "dayProgress": 0.333,
      "label": "morning",
      "zenith": "#4a90d9",
      "horizon": "#87ceeb",
      "sun": "#fff5e6",
      "ambient": "#6090b0"
    },
    {
      "dayProgress": 0.500,
      "label": "noon",
      "zenith": "#1e90ff",
      "horizon": "#87ceeb",
      "sun": "#fffff0",
      "ambient": "#7ab0d0"
    },
    {
      "dayProgress": 0.625,
      "label": "afternoon",
      "zenith": "#4a90d9",
      "horizon": "#87ceeb",
      "sun": "#fff5e6",
      "ambient": "#6090b0"
    },
    {
      "dayProgress": 0.792,
      "label": "dusk",
      "zenith": "#5a4a7a",
      "horizon": "#ff7744",
      "sun": "#ff8855",
      "ambient": "#5a4a6a"
    },
    {
      "dayProgress": 0.875,
      "label": "evening",
      "zenith": "#2a2a4a",
      "horizon": "#4a3a5a",
      "sun": "#3a3050",
      "ambient": "#2a2a3a"
    },
    {
      "dayProgress": 0.958,
      "label": "night",
      "zenith": "#0a1628",
      "horizon": "#1a2a4a",
      "sun": "#1a2a4a",
      "ambient": "#0d1b2e"
    }
  ],
  "seasonalTints": {
    "spring":  { "hex": "#90EE90", "strength": 0.08 },
    "summer":  { "hex": "#FFD54F", "strength": 0.08 },
    "autumn":  { "hex": "#FF8A65", "strength": 0.08 },
    "winter":  { "hex": "#90CAF9", "strength": 0.08 }
  }
}
```

### 9.2 Weather Visual Config

File: `config/game/weatherVisuals.json`

```json
{
  "rain": {
    "overlay": {
      "dropCount": { "mobile": 30, "desktop": 50 },
      "dropWidth": 1,
      "dropHeight": 16,
      "dropColor": "rgba(147, 197, 253, 0.7)",
      "fallDurationRange": [600, 1000],
      "opacityRange": [0.3, 0.7]
    },
    "scene": {
      "groundDarken": 0.15,
      "roughnessTarget": 0.65,
      "fogNearDelta": -4,
      "fogFarDelta": -8,
      "fogTint": { "hex": "#4060a0", "strength": 0.10 },
      "cloudDensity": 0.55
    },
    "transition": {
      "fadeInSeconds": 5,
      "fadeOutSeconds": 8
    }
  },
  "drought": {
    "overlay": {
      "hazeColor": "rgba(251, 146, 60, 0.20)",
      "hazePulseRange": [0.15, 0.25],
      "hazePulseDuration": 2000,
      "dustCount": 6,
      "dustSizeRange": [3, 6],
      "dustColor": "rgba(194, 154, 108, 0.3)",
      "dustDriftDuration": [15000, 25000]
    },
    "scene": {
      "groundLighten": 0.10,
      "roughnessTarget": 1.0,
      "desaturation": 0.15,
      "fogNearDelta": 4,
      "fogFarDelta": 6,
      "fogTint": { "hex": "#c09060", "strength": 0.15 },
      "cloudDensity": 0.05
    },
    "transition": {
      "fadeInSeconds": 5,
      "fadeOutSeconds": 8
    }
  },
  "windstorm": {
    "overlay": {
      "streakCount": 8,
      "streakWidth": 60,
      "streakHeight": 2,
      "streakColor": "rgba(156, 163, 175, 0.5)",
      "streakAngle": -15,
      "streakDurationRange": [800, 1400],
      "leafCount": 5,
      "twigCount": 3
    },
    "scene": {
      "treeSway": {
        "baseAmplitude": 0.087,
        "frequency": 0.8,
        "youngMultiplier": 2.0,
        "oldGrowthMultiplier": 0.5
      },
      "cameraShake": {
        "amplitudeX": 0.03,
        "amplitudeY": 0.02,
        "frequencyX": 2.3,
        "frequencyY": 1.9
      },
      "fogNearDelta": -2,
      "fogFarDelta": -6,
      "fogTint": { "hex": "#808080", "strength": 0.08 },
      "cloudDensity": 0.35
    },
    "transition": {
      "fadeInSeconds": 3,
      "fadeOutSeconds": 5
    }
  },
  "snow": {
    "overlay": {
      "flakeCount": { "mobile": 25, "desktop": 40 },
      "flakeSizeRange": [3, 6],
      "flakeColor": "rgba(255, 255, 255, 0.7)",
      "fallDurationRange": [2000, 4000],
      "horizontalDrift": 30,
      "driftFrequency": 0.5
    },
    "scene": {
      "groundSnowColor": "#dde8dd",
      "groundSnowBlend": 0.20,
      "roughnessTarget": 0.98,
      "waterTintColor": "#a8dadc",
      "fogNearDelta": -3,
      "fogFarDelta": -5,
      "fogTint": { "hex": "#b0c4de", "strength": 0.12 },
      "cloudDensity": 0.45
    },
    "transition": {
      "fadeInSeconds": 6,
      "fadeOutSeconds": 10
    }
  }
}
```

### 9.3 Season Phase Thresholds Config

File: `config/game/seasonPhases.json`

```json
{
  "spring":  { "dawn": 0.20, "day": 0.28, "dusk": 0.77, "night": 0.85 },
  "summer":  { "dawn": 0.17, "day": 0.25, "dusk": 0.80, "night": 0.88 },
  "autumn":  { "dawn": 0.22, "day": 0.32, "dusk": 0.73, "night": 0.83 },
  "winter":  { "dawn": 0.25, "day": 0.35, "dusk": 0.70, "night": 0.80 }
}
```

### 9.4 Fog Config

File: `config/game/fog.json`

```json
{
  "base": {
    "nearDay": 20,
    "nearNight": 12,
    "farDay": 40,
    "farNight": 28,
    "colorDay": { "r": 0.30, "g": 0.42, "b": 0.25 },
    "colorNight": { "r": 0.08, "g": 0.14, "b": 0.20 },
    "skyTintStrengthDay": 0.12,
    "skyTintStrengthNight": 0.08
  },
  "seasonModifiers": {
    "spring":  { "nearDelta": 0,  "farDelta": 0,  "tintHex": "#90EE90", "tintStrength": 0.05 },
    "summer":  { "nearDelta": 2,  "farDelta": 3,  "tintHex": "#FFD54F", "tintStrength": 0.03 },
    "autumn":  { "nearDelta": -2, "farDelta": -3, "tintHex": "#FF8A65", "tintStrength": 0.08 },
    "winter":  { "nearDelta": -4, "farDelta": -6, "tintHex": "#90CAF9", "tintStrength": 0.10 }
  }
}
```

---

## 10. Implementation File Map

### Files to Modify

| File | Changes |
|------|---------|
| `game/systems/time.ts` | Add `getSkyColorsInterpolated()`, add season-aware `phaseFromProgress()`, add `getAmbientIntensity()`, add `SEASON_PHASE_THRESHOLDS`, add `getSeasonBlend()` |
| `game/systems/time.test.ts` | Tests for new interpolation, seasonal phases, season blend |
| `game/systems/weather.ts` | Add `"snow"` to `WeatherType`, add `rollWeatherType` snow-in-winter conversion, add `getWeatherApproachFactor()` |
| `components/scene/Sky.tsx` | Add `uCloudDensity` and `uCloudScroll` uniforms, update shader, accept `weatherType` prop |
| `components/scene/Lighting.tsx` | Accept `weatherType` and `season` for fog modifiers, add structure point light logic, seasonal ambient shift |
| `components/scene/Ground.tsx` | Add weather-responsive material changes (wet, dry, snowy) |
| `components/scene/Camera.tsx` | Add windstorm camera shake |
| `components/game/WeatherOverlay.tsx` | Add `SnowOverlay`, add `DustParticles` to drought, add leaf/twig debris to windstorm, add golden hour vignette, add weather transition fade |
| `game/hooks/useGameLoop.ts` | Pass weather state to scene components, compute approach factor |

### New Files

| File | Purpose |
|------|---------|
| `config/game/skyColors.json` | Sky color stop data (section 9.1) |
| `config/game/weatherVisuals.json` | Weather visual parameters (section 9.2) |
| `config/game/seasonPhases.json` | Season-specific day phase thresholds (section 9.3) |
| `config/game/fog.json` | Fog parameters (section 9.4) |
| `game/systems/atmosphere.ts` | Pure functions: `interpolateSkyColors()`, `computeFogParams()`, `computeWeatherSceneEffects()` |
| `game/systems/atmosphere.test.ts` | Tests for atmosphere computation functions |

### Files NOT Modified

| File | Reason |
|------|--------|
| `game/stores/gameStore.ts` | Weather state stays in useRef (not persisted). No store changes needed. |
| `game/ecs/world.ts` | No new ECS components for atmosphere. |
| `game/config/species.ts` | Species weather affinities are already in the species data. |

---

## Appendix A: Complete Color Ramp Tables

### A.1 Spring Sky Colors by Time of Day

| Time | Zenith | Horizon | Sun | Ambient | Sun Intensity | Ambient Intensity |
|------|--------|---------|-----|---------|--------------|-------------------|
| 0.00 (Midnight) | `#0a1729` | `#1a2b4c` | `#1a2b4c` | `#0d1c2f` | 0.00 | 0.20 |
| 0.10 (Pre-dawn) | `#0a1729` | `#1a2b4c` | `#1a2b4c` | `#0d1c2f` | 0.00 | 0.20 |
| 0.20 (Dawn start) | `#2b3b5c` | `#ff9a68` | `#ffb449` | `#4b5b7c` | 0.00 | 0.20 |
| 0.25 (Mid-dawn) | `#3a6899` | `#c3b479` | `#ffd598` | `#567696` | 0.35 | 0.41 |
| 0.28 (Day start) | `#439dd3` | `#96c8e4` | `#ffeed9` | `#5c8aab` | 0.60 | 0.56 |
| 0.50 (Noon) | `#1f91ff` | `#88cfec` | `#fffff1` | `#7bb1d1` | 1.00 | 0.80 |
| 0.77 (Dusk start) | `#4e6ea7` | `#c4a298` | `#ffcfa0` | `#5e6e90` | 0.45 | 0.47 |
| 0.85 (Night start) | `#2c2c4c` | `#4c3c5c` | `#3c3252` | `#2c2c3c` | 0.00 | 0.20 |
| 0.95 (Deep night) | `#0a1729` | `#1a2b4c` | `#1a2b4c` | `#0d1c2f` | 0.00 | 0.20 |

Spring tint (`#90EE90`) applied at 8% blend to all colors.

### A.2 Summer Sky Colors by Time of Day

| Time | Zenith | Horizon | Sun | Ambient | Sun Intensity | Ambient Intensity |
|------|--------|---------|-----|---------|--------------|-------------------|
| 0.00 (Midnight) | `#0a1628` | `#1b2b4b` | `#1b2b4b` | `#0e1c2e` | 0.00 | 0.20 |
| 0.17 (Dawn start) | `#2a3b5b` | `#ff9a67` | `#ffb448` | `#4b5b7b` | 0.00 | 0.20 |
| 0.25 (Day start) | `#4a91da` | `#88cfeb` | `#fff6e7` | `#6191b1` | 0.60 | 0.56 |
| 0.50 (Noon) | `#1e91ff` | `#88cfeb` | `#fffff1` | `#7bb1d1` | 1.00 | 0.80 |
| 0.80 (Dusk start) | `#5b4b7b` | `#ff7845` | `#ff8956` | `#5b4b6b` | 0.20 | 0.32 |
| 0.88 (Night start) | `#2a2a4b` | `#4a3a5b` | `#3a3051` | `#2a2a3b` | 0.00 | 0.20 |

Summer tint (`#FFD54F`) applied at 8% blend -- warmer, deeper blue at noon.

### A.3 Autumn Sky Colors by Time of Day

| Time | Zenith | Horizon | Sun | Ambient | Sun Intensity | Ambient Intensity |
|------|--------|---------|-----|---------|--------------|-------------------|
| 0.00 (Midnight) | `#0b1729` | `#1b2b4b` | `#1b2b4b` | `#0e1c2f` | 0.00 | 0.20 |
| 0.22 (Dawn start) | `#2d3d5c` | `#ff9b69` | `#ffb64a` | `#4d5d7d` | 0.00 | 0.20 |
| 0.32 (Day start) | `#4c92db` | `#89d0ec` | `#fff7e8` | `#6392b2` | 0.75 | 0.65 |
| 0.50 (Noon) | `#2092ff` | `#89d0ec` | `#fffff2` | `#7cb2d2` | 1.00 | 0.80 |
| 0.73 (Dusk start) | `#5d4d7d` | `#ff7946` | `#ff8a57` | `#5d4d6d` | 0.35 | 0.41 |
| 0.83 (Night start) | `#2c2c4c` | `#4c3c5c` | `#3c3252` | `#2c2c3c` | 0.00 | 0.20 |

Autumn tint (`#FF8A65`) applied at 8% blend -- amber-tinged horizons, especially at dawn/dusk.

### A.4 Winter Sky Colors by Time of Day

| Time | Zenith | Horizon | Sun | Ambient | Sun Intensity | Ambient Intensity |
|------|--------|---------|-----|---------|--------------|-------------------|
| 0.00 (Midnight) | `#0a1729` | `#1b2c4d` | `#1b2c4d` | `#0e1d30` | 0.00 | 0.20 |
| 0.25 (Dawn start) | `#2c3d5e` | `#ffa06b` | `#ffb74c` | `#4d5e7f` | 0.00 | 0.20 |
| 0.35 (Day start) | `#4d93dc` | `#8ad1ed` | `#fff8e9` | `#6493b3` | 0.75 | 0.65 |
| 0.50 (Noon) | `#2193ff` | `#8ad1ed` | `#fffff3` | `#7db3d3` | 1.00 | 0.80 |
| 0.70 (Dusk start) | `#5e4e7e` | `#ff7a47` | `#ff8b58` | `#5e4e6e` | 0.35 | 0.41 |
| 0.80 (Night start) | `#2d2d4d` | `#4d3d5d` | `#3d3353` | `#2d2d3d` | 0.00 | 0.20 |

Winter tint (`#90CAF9`) applied at 8% blend -- pale, desaturated sky with blue-grey horizon.

---

## Appendix B: Timing Diagrams

### B.1 One Game Day (5 Real Minutes)

```
Real seconds: 0         60        120       180       240       300
              |---------|---------|---------|---------|---------|
dayProgress:  0.0       0.2       0.4       0.6       0.8       1.0
              |         |         |         |         |         |
Phase:     [  NIGHT  ][DAWN][ --------- DAY ---------- ][DUSK][ NIGHT ]
              |         |    |                          |    |         |
Sun:       0.0       0.0   0.3        1.0            1.0  0.25      0.0
              |         |    |         |               |    |         |
Ambient:   0.20      0.20  0.38      0.80            0.80 0.35      0.20
```

### B.2 Weather Event Lifecycle

```
Time:    ----[approach]--[fade in]--[=== active event ===]--[fade out]--[clear]---->
              30 game sec   5 real s    60-180 game sec       8 real s

Clouds:  0.15 -----> 0.45 -----> 0.55 ========================> 0.15
Fog far:  40 -------> 36 -------> 32 =========================> 40
Overlay:  0.0 -------> 0.0 ------> 1.0 ========================> 0.0
Ground:   dry --------> dry -------> wet ========================> dry (8s)
```

### B.3 Season Transition (5-Day Blend)

```
Season day: 25    26    27    28    29    0 (new season)
Blend t:    0.0   0.2   0.4   0.6   0.8   1.0
            |     |     |     |     |     |
Sky tint:   [current season tint]--->[next season tint]
Fog:        [current season fog]--------->[next season fog]
Ambient:    [current ambient shift]------>[next ambient shift]
Ground:     [current season color]------->[next season color]
Tree canopy:[rebuild on season boundary]
```

---

## Appendix C: Shader Reference

### C.1 Sky Gradient Fragment Shader (Complete)

```glsl
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uSeasonTint;
uniform float uIntensity;
uniform float uCloudDensity;
uniform float uCloudScroll;
varying vec3 vWorldPosition;

// Simple pseudo-random for cloud noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Value noise for softer clouds
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 dir = normalize(vWorldPosition);
  float height = dir.y;
  float t = clamp(height, 0.0, 1.0);

  // Smooth gradient
  float smoothT = t * t * (3.0 - 2.0 * t);
  vec3 color = mix(uHorizonColor, uZenithColor, smoothT);

  // Seasonal tint (8% multiply blend)
  color = mix(color, color * uSeasonTint, 0.08);

  // Cloud layer -- concentrated in lower-mid sky
  float cloudBand = smoothstep(0.10, 0.30, t) * smoothstep(0.50, 0.30, t);
  float cloudNoise = noise(dir.xz * 3.0 + vec2(uCloudScroll, 0.0));
  cloudNoise = smoothstep(0.3, 0.7, cloudNoise); // sharpen edges
  float cloud = cloudBand * cloudNoise * uCloudDensity;
  color = mix(color, vec3(0.90, 0.90, 0.95), cloud);

  // Day/night intensity
  color *= uIntensity;

  gl_FragColor = vec4(color, 1.0);
}
```

### C.2 Ground Wetness (Material Uniform Updates)

```typescript
// In Ground.tsx useFrame, pseudocode:
const mat = groundRef.current.material as THREE.MeshStandardMaterial;
const dt = delta;

switch (weatherType) {
  case "rain":
    targetColor = baseGroundColor.clone().multiplyScalar(0.85); // 15% darker
    targetRoughness = 0.65;
    lerpSpeed = 0.05;
    break;
  case "drought":
    targetColor = baseGroundColor.clone().lerp(new THREE.Color(0.7, 0.65, 0.55), 0.10);
    targetRoughness = 1.0;
    lerpSpeed = 0.03;
    break;
  case "snow":
    targetColor = baseGroundColor.clone().lerp(new THREE.Color("#dde8dd"), 0.20);
    targetRoughness = 0.98;
    lerpSpeed = 0.04;
    break;
  default: // clear, windstorm
    targetColor = baseGroundColor;
    targetRoughness = 0.95;
    lerpSpeed = 0.02; // slow return to normal
}

mat.color.lerp(targetColor, Math.min(1, dt * lerpSpeed * 60));
mat.roughness = THREE.MathUtils.lerp(mat.roughness, targetRoughness, Math.min(1, dt * lerpSpeed * 60));
```

---

## Appendix D: Migration Notes

### From Current Implementation

1. **`time.ts` SKY_COLORS`:** The current 4-phase snap (`dawn/day/dusk/night`) is replaced by 8-stop interpolation. The `getSkyColors()` function signature changes to return 4 colors instead of 2. Backward compatibility: keep the old function as `getSkyColorsLegacy()` until all consumers migrate.

2. **`time.ts` phase thresholds:** Currently hardcoded constants. After migration, they read from `SEASON_PHASE_THRESHOLDS[season]`. The `phaseFromProgress()` function gains a `season` parameter.

3. **`WeatherOverlay.tsx`:** Currently uses React Native Animated. Add `SnowOverlay`, `DustParticles`, and `LeafDebris` components. The main component gains a `transitionProgress` prop for fade in/out.

4. **`Lighting.tsx`:** Currently computes fog in `useFrame`. Add seasonal and weather fog modifiers. The fog computation should move to a shared `computeFogParams()` pure function in `atmosphere.ts`.

5. **`Sky.tsx`:** Add two new uniforms (`uCloudDensity`, `uCloudScroll`). The fragment shader gains the cloud noise calculation. Cloud scroll advances in `useFrame`.

6. **`Ground.tsx`:** Add `weatherType` prop. Material updates in `useFrame` for wetness/dryness/snow.

7. **`Camera.tsx`:** Add `weatherType` prop. Windstorm shake in `useFrame`, gated by reduced-motion preference.

8. **New `"snow"` weather type:** Add to `WeatherType` union in `weather.ts`. Add snow visual config. Conversion from rain->snow in winter is handled in `rollWeatherType()`.
