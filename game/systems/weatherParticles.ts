/**
 * Weather particles system — rain, snow, and wind-driven particles.
 *
 * Spec §36.1:
 *   Rain  : gravity 1.0, wind-affected, 500 max (also covers thunderstorm)
 *   Snow  : gravity 0.3, wind-affected, 300 max
 *   Wind  : gravity 0.1, wind-affected, 100 max (dust driven by windstorm)
 *
 * Driven by WeatherComponent state (weatherType, intensity, windDirection, windSpeed).
 * Emitter is created/replaced/removed as weather changes each tick.
 */

import type { World } from "miniplex";
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };
import type { WeatherComponent, WeatherType } from "@/game/ecs/components/procedural/atmosphere";
import type { ParticleEmitterComponent } from "@/game/ecs/components/procedural/particles";

// ── Constants from config ────────────────────────────────────────────────────

export const RAIN_MAX_PARTICLES: number = proceduralConfig.particles.rain.maxParticles;
export const SNOW_MAX_PARTICLES: number = proceduralConfig.particles.snow.maxParticles;
export const WIND_MAX_PARTICLES: number = proceduralConfig.particles.wind.maxParticles;

// ── Types ────────────────────────────────────────────────────────────────────

/** Particle weather category — drives which emitter builder is used. */
export type ParticleWeatherCategory = "rain" | "snow" | "wind";

/** Minimal entity shape required by this system. */
export interface WeatherParticleEntity {
  id: string;
  position?: { x: number; y: number; z: number };
  particleEmitter?: ParticleEmitterComponent;
}

/** Mutable state held by the game loop between ticks. */
export interface WeatherParticlesState {
  /** Which category was active last tick (null = no active emitter). */
  activeCategory: ParticleWeatherCategory | null;
  /** Current particle emitter entity, or null if weather is clear. */
  particleEntity: WeatherParticleEntity | null;
}

// ── Pure builder functions ───────────────────────────────────────────────────

/**
 * Builds a rain ParticleEmitterComponent.
 * Spec §36.1: gravity 1.0, wind-affected, 500 max.
 * emissionRate scales with intensity (0-1) so a light drizzle emits less.
 */
export function buildRainEmitter(intensity: number): ParticleEmitterComponent {
  const cfg = proceduralConfig.particles.rain;
  return {
    particleType: "rain",
    emissionRate: cfg.emissionRate * Math.max(0.1, intensity),
    lifetime: cfg.lifetime,
    emissionRadius: cfg.emissionRadius,
    size: cfg.size,
    color: cfg.color,
    gravity: cfg.gravity,
    windAffected: cfg.windAffected,
    maxParticles: cfg.maxParticles,
    active: true,
  };
}

/**
 * Builds a snow ParticleEmitterComponent.
 * Spec §36.1: gravity 0.3, wind-affected, 300 max.
 * Drifting flakes — lower emission rate than rain.
 */
export function buildSnowEmitter(intensity: number): ParticleEmitterComponent {
  const cfg = proceduralConfig.particles.snow;
  return {
    particleType: "snow",
    emissionRate: cfg.emissionRate * Math.max(0.1, intensity),
    lifetime: cfg.lifetime,
    emissionRadius: cfg.emissionRadius,
    size: cfg.size,
    color: cfg.color,
    gravity: cfg.gravity,
    windAffected: cfg.windAffected,
    maxParticles: cfg.maxParticles,
    active: true,
  };
}

/**
 * Builds a wind (dust) ParticleEmitterComponent for windstorm weather.
 * Spec §36.1: gravity 0.1, wind-affected, 100 max.
 */
export function buildWindEmitter(intensity: number): ParticleEmitterComponent {
  const cfg = proceduralConfig.particles.wind;
  return {
    particleType: "dust",
    emissionRate: cfg.emissionRate * Math.max(0.1, intensity),
    lifetime: cfg.lifetime,
    emissionRadius: cfg.emissionRadius,
    size: cfg.size,
    color: cfg.color,
    gravity: cfg.gravity,
    windAffected: cfg.windAffected,
    maxParticles: cfg.maxParticles,
    active: true,
  };
}

// ── Weather type mapping ─────────────────────────────────────────────────────

/**
 * Maps a WeatherType to its particle category, or null for no particles.
 *
 * - rain + thunderstorm → "rain" (same visual, thunderstorm adds lightning via separate system)
 * - snow                → "snow"
 * - windstorm           → "wind" (dust streaks)
 * - clear / fog         → null
 */
export function resolveParticleCategory(weatherType: WeatherType): ParticleWeatherCategory | null {
  if (weatherType === "rain" || weatherType === "thunderstorm") return "rain";
  if (weatherType === "snow") return "snow";
  if (weatherType === "windstorm") return "wind";
  return null;
}

// ── ECS-coupled tick ─────────────────────────────────────────────────────────

/**
 * Ticks the weather particles system each frame.
 *
 * Lifecycle:
 * - No weather / clear: remove any active emitter
 * - Weather category changes: remove old emitter, spawn new one
 * - Same category: do nothing (renderer handles per-frame updates)
 *
 * @param world      Miniplex world (injectable for testing)
 * @param weather    Current WeatherComponent state (null = no weather entity)
 * @param playerPos  Player world position used to anchor emitter above player
 * @param state      Mutable state held by caller between ticks
 */
export function tickWeatherParticles(
  world: World<WeatherParticleEntity>,
  weather: WeatherComponent | null,
  playerPos: { x: number; y: number; z: number } | null,
  state: WeatherParticlesState,
): void {
  // No weather component or no player — clear any active emitter
  if (!weather || !playerPos) {
    if (state.particleEntity) {
      world.remove(state.particleEntity);
      state.particleEntity = null;
      state.activeCategory = null;
    }
    return;
  }

  const desiredCategory = resolveParticleCategory(weather.weatherType);

  // Category changed (including transition to null) — remove stale emitter
  if (state.activeCategory !== desiredCategory && state.particleEntity) {
    world.remove(state.particleEntity);
    state.particleEntity = null;
    state.activeCategory = null;
  }

  // Spawn emitter for the new category
  if (desiredCategory && !state.particleEntity) {
    let emitter: ParticleEmitterComponent;
    if (desiredCategory === "rain") {
      emitter = buildRainEmitter(weather.intensity);
    } else if (desiredCategory === "snow") {
      emitter = buildSnowEmitter(weather.intensity);
    } else {
      emitter = buildWindEmitter(weather.intensity);
    }

    const entity = world.add({
      id: `weather_${desiredCategory}`,
      // Position above the player so particles fall through them
      position: { x: playerPos.x, y: playerPos.y + 15, z: playerPos.z },
      particleEmitter: emitter,
    });

    state.particleEntity = entity;
    state.activeCategory = desiredCategory;
  }
}
