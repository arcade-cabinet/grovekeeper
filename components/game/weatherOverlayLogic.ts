/**
 * Pure functions for WeatherOverlay ECS-driven calculations.
 *
 * Extracted to a plain .ts file for testability — no React/RN imports.
 * See GAME_SPEC.md §12, §36.
 */

import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };

/** Ratio of 3D particle count to use for 2D overlay display (performance budget). */
const RAIN_DISPLAY_RATIO = 0.06; // 500 * 0.06 = 30 at full intensity
const WIND_DISPLAY_RATIO = 0.08; // 100 * 0.08 = 8 at full intensity

/**
 * Compute the number of 2D rain drop overlays to display based on ECS weather intensity.
 * Scales from config/game/procedural.json weather.particleCounts.rain.
 * Returns a minimum of 1 drop even at near-zero intensity.
 */
export function computeRainDropCount(intensity: number): number {
  const base = proceduralConfig.weather.particleCounts.rain;
  return Math.max(1, Math.round(base * RAIN_DISPLAY_RATIO * intensity));
}

/**
 * Compute the number of 2D wind streak overlays based on ECS weather intensity.
 * Scales from config/game/procedural.json weather.particleCounts.dust.
 */
export function computeWindStreakCount(intensity: number): number {
  const base = proceduralConfig.weather.particleCounts.dust;
  return Math.max(1, Math.round(base * WIND_DISPLAY_RATIO * intensity));
}

/**
 * Compute CSS rotation angle (degrees) from ECS WeatherComponent.windDirection.
 * windDirection is a normalized [x, z] vector in world space.
 * Maps x component to ±45° tilt for 2D streak overlays.
 */
export function computeWindAngleDeg(windDirection: [number, number]): number {
  const [x] = windDirection;
  return x * 45;
}

/**
 * Compute overlay element opacity scaled by ECS weather intensity.
 * Smoothly scales the base opacity (max at intensity=1) down to 0.
 *
 * @param baseOpacity Maximum opacity at intensity=1 (e.g. 0.7).
 * @param intensity ECS WeatherComponent.intensity (0–1).
 */
export function computeIntensityOpacity(baseOpacity: number, intensity: number): number {
  return Math.max(0, Math.min(baseOpacity, baseOpacity * intensity));
}

/**
 * Compute animated rain drop fall duration (ms) based on intensity.
 * Higher intensity → faster drops (heavier rain).
 * Range: baseDuration at intensity=0.5 down to baseDuration*0.5 at intensity=1.
 */
export function computeDropDuration(baseDurationMs: number, intensity: number): number {
  const speedFactor = 0.5 + intensity * 0.5;
  return Math.max(200, Math.round(baseDurationMs / speedFactor));
}
