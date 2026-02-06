/**
 * Weather Events System
 *
 * Pure-function module that manages weather events affecting tree growth
 * rates and stamina costs. Weather transitions are deterministic via
 * seeded RNG so they reproduce identically given the same game-time
 * and seed.
 *
 * Weather types:
 * - Clear   : normal conditions (default)
 * - Rain    : +30% growth rate, lasts 60-120 game seconds
 * - Drought : -50% growth rate, +50% stamina cost, lasts 90-180 game seconds
 * - Windstorm: 10% chance to damage seedling/sprout trees, lasts 30-60 game seconds
 */

import { createRNG, hashString } from "../utils/seedRNG";

// ============================================
// Public Types
// ============================================

export type WeatherType = "clear" | "rain" | "drought" | "windstorm";

export interface WeatherEvent {
  /** Weather condition currently active */
  type: WeatherType;
  /** Game time (seconds) when this event started */
  startTime: number;
  /** Duration of the event in game seconds */
  duration: number;
}

export interface WeatherState {
  /** The currently active weather event */
  current: WeatherEvent;
  /** Game time (seconds) when the next weather roll occurs */
  nextCheckTime: number;
}

// ============================================
// Constants
// ============================================

/** How often (in game seconds) the system rolls for new weather */
const WEATHER_CHECK_INTERVAL = 300; // 5 game minutes

/** Duration ranges per weather type [min, max] in game seconds */
const DURATION_RANGES: Record<Exclude<WeatherType, "clear">, [number, number]> = {
  rain: [60, 120],
  drought: [90, 180],
  windstorm: [30, 60],
};

/**
 * Season-specific probability tables.
 * Each array is ordered: [rain, drought, windstorm, clear].
 * Values are cumulative thresholds (the final "clear" is implicit remainder).
 */
const SEASON_PROBABILITIES: Record<string, { rain: number; drought: number; windstorm: number }> = {
  spring:  { rain: 0.30, drought: 0.05, windstorm: 0.10 },
  summer:  { rain: 0.15, drought: 0.25, windstorm: 0.05 },
  autumn:  { rain: 0.20, drought: 0.10, windstorm: 0.20 },
  winter:  { rain: 0.05, drought: 0.15, windstorm: 0.15 },
};

/** Windstorm damage probability for stage 0-1 trees per check */
const WINDSTORM_DAMAGE_CHANCE = 0.10;

// ============================================
// Growth & Stamina Multipliers
// ============================================

/**
 * Returns the growth-rate multiplier for the given weather.
 * 1.0 = normal. Values > 1 speed up growth; < 1 slow it down.
 */
export function getWeatherGrowthMultiplier(weather: WeatherType): number {
  switch (weather) {
    case "rain":
      return 1.3;
    case "drought":
      return 0.5;
    case "windstorm":
    case "clear":
    default:
      return 1.0;
  }
}

/**
 * Returns the stamina-cost multiplier for the given weather.
 * 1.0 = normal. Values > 1 make actions more expensive.
 */
export function getWeatherStaminaMultiplier(weather: WeatherType): number {
  switch (weather) {
    case "drought":
      return 1.5;
    case "rain":
    case "windstorm":
    case "clear":
    default:
      return 1.0;
  }
}

// ============================================
// State Initialization
// ============================================

/**
 * Create a fresh weather state starting with clear skies.
 * The first weather roll will happen after one full check interval.
 */
export function initializeWeather(currentGameTimeSeconds: number): WeatherState {
  return {
    current: {
      type: "clear",
      startTime: currentGameTimeSeconds,
      duration: WEATHER_CHECK_INTERVAL,
    },
    nextCheckTime: currentGameTimeSeconds + WEATHER_CHECK_INTERVAL,
  };
}

// ============================================
// Weather Update
// ============================================

/**
 * Advance the weather state. If the current event has expired AND we have
 * reached the next check time, roll for a new weather event using seeded RNG.
 *
 * This function is pure: no side effects, no store/ECS imports.
 *
 * @param state            Current weather state
 * @param currentGameTime  Current game time in seconds
 * @param season           Current season ("spring" | "summer" | "autumn" | "winter")
 * @param rngSeed          Seed for deterministic random rolls
 * @returns                Updated weather state (may be same reference if no change)
 */
export function updateWeather(
  state: WeatherState,
  currentGameTimeSeconds: number,
  season: string,
  rngSeed: number,
): WeatherState {
  const eventEnd = state.current.startTime + state.current.duration;

  // Event still active -- no change
  if (currentGameTimeSeconds < eventEnd) {
    return state;
  }

  // Event expired but haven't reached next check time -- stay clear until check
  if (currentGameTimeSeconds < state.nextCheckTime) {
    // If current weather already transitioned to clear waiting state, return as-is
    if (state.current.type === "clear" && state.current.startTime === eventEnd) {
      return state;
    }
    // Transition to clear while waiting for the next check
    return {
      current: {
        type: "clear",
        startTime: eventEnd,
        duration: state.nextCheckTime - eventEnd,
      },
      nextCheckTime: state.nextCheckTime,
    };
  }

  // Time to roll for new weather
  const combinedSeed = hashString(`weather-${rngSeed}-${state.nextCheckTime}`);
  const rng = createRNG(combinedSeed);

  const weatherRoll = rng();
  const durationRoll = rng();

  const newType = rollWeatherType(weatherRoll, season);
  const newDuration = rollDuration(newType, durationRoll);

  return {
    current: {
      type: newType,
      startTime: state.nextCheckTime,
      duration: newDuration,
    },
    nextCheckTime: state.nextCheckTime + WEATHER_CHECK_INTERVAL,
  };
}

// ============================================
// Windstorm Damage
// ============================================

/**
 * Determine whether a windstorm damages a tree.
 * Only trees at stage 0 (seedling) or stage 1 (sprout) are vulnerable.
 * The caller is responsible for only invoking this on eligible trees.
 *
 * @param rngValue A value in [0, 1) from any RNG source
 * @returns true if the tree takes damage (progress resets within current stage)
 */
export function rollWindstormDamage(rngValue: number): boolean {
  return rngValue < WINDSTORM_DAMAGE_CHANCE;
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Given a random roll [0, 1) and a season, determine the weather type
 * using the season's probability table.
 */
function rollWeatherType(roll: number, season: string): WeatherType {
  const probs = SEASON_PROBABILITIES[season] ?? SEASON_PROBABILITIES.spring;

  // Cumulative thresholds: rain | drought | windstorm | clear
  if (roll < probs.rain) return "rain";
  if (roll < probs.rain + probs.drought) return "drought";
  if (roll < probs.rain + probs.drought + probs.windstorm) return "windstorm";
  return "clear";
}

/**
 * Given a weather type and a random roll [0, 1), compute the event duration.
 * Clear weather lasts until the next check interval.
 */
function rollDuration(type: WeatherType, roll: number): number {
  if (type === "clear") {
    return WEATHER_CHECK_INTERVAL;
  }

  const [min, max] = DURATION_RANGES[type];
  return min + roll * (max - min);
}
