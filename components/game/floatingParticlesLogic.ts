/**
 * Pure functions for FloatingParticles ECS weather particle overlay.
 *
 * Extracted to a plain .ts file for testability — no React/RN imports.
 * See GAME_SPEC.md §36 (Particle Emitter Effects).
 */

import type { ParticleEmitterComponent } from "@/game/ecs/components/procedural/particles";

/** Maximum 2D overlay particles per emitter type (React Native performance budget). */
export const MAX_DISPLAY_WEATHER_PARTICLES = 30;

/**
 * Compute screen-space horizontal drift in pixels driven by ECS wind.
 *
 * @param windDirection Normalized [x, z] world-space wind vector from WeatherComponent.
 * @param windSpeed Wind speed multiplier from WeatherComponent.
 * @param screenWidth Screen width in pixels for proportional drift scaling.
 */
export function computeWindDrift(
  windDirection: [number, number],
  windSpeed: number,
  screenWidth: number,
): number {
  const [x] = windDirection;
  // Drift up to 30% of screen width at max wind speed in the x direction
  return x * windSpeed * screenWidth * 0.3;
}

/**
 * Compute how many 2D overlay particles to display for an ECS emitter.
 * Scales emitter.maxParticles by intensity, capped to a 2D budget.
 *
 * @param emitter Partial ParticleEmitterComponent (only maxParticles needed).
 * @param intensity ECS WeatherComponent.intensity (0–1).
 * @param maxDisplay Hard cap for 2D display performance.
 */
export function computeDisplayParticleCount(
  emitter: Pick<ParticleEmitterComponent, "maxParticles">,
  intensity: number,
  maxDisplay: number = MAX_DISPLAY_WEATHER_PARTICLES,
): number {
  const raw = Math.round(emitter.maxParticles * intensity);
  return Math.max(0, Math.min(raw, maxDisplay));
}

/**
 * Map a lifecycle progress fraction (0–1) to particle opacity.
 * Fade in over first 20% of lifetime, hold, fade out over last 30%.
 *
 * @param progress Fraction of particle lifetime elapsed (0–1).
 * @param baseOpacity Maximum opacity at peak visibility.
 */
export function computeParticleOpacity(progress: number, baseOpacity: number): number {
  if (progress <= 0) return 0;
  if (progress < 0.2) return baseOpacity * (progress / 0.2);
  if (progress > 0.7) return baseOpacity * (1 - (progress - 0.7) / 0.3);
  return baseOpacity;
}
