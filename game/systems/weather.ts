/**
 * Weather Events System
 *
 * Pure-function module that manages weather events affecting tree growth
 * rates and stamina costs. Weather transitions are deterministic via
 * seeded RNG.
 *
 * Weather types:
 * - Clear   : normal conditions (default)
 * - Rain    : +30% growth rate, lasts 60-120 game seconds
 * - Drought : -50% growth rate, +50% stamina cost, lasts 90-180 game seconds
 * - Windstorm: 10% chance to damage seedling/sprout trees, lasts 30-60 game seconds
 */

import { createRNG, hashString } from "@/game/utils/seedRNG";

// ============================================
// Public Types
// ============================================

export type WeatherType = "clear" | "rain" | "drought" | "windstorm";

export interface WeatherEvent {
  type: WeatherType;
  startTime: number;
  duration: number;
}

export interface WeatherState {
  current: WeatherEvent;
  nextCheckTime: number;
}

// ============================================
// Constants
// ============================================

const WEATHER_CHECK_INTERVAL = 300; // 5 game minutes

const DURATION_RANGES: Record<
  Exclude<WeatherType, "clear">,
  [number, number]
> = {
  rain: [60, 120],
  drought: [90, 180],
  windstorm: [30, 60],
};

const SEASON_PROBABILITIES: Record<
  string,
  { rain: number; drought: number; windstorm: number }
> = {
  spring: { rain: 0.3, drought: 0.05, windstorm: 0.1 },
  summer: { rain: 0.15, drought: 0.25, windstorm: 0.05 },
  autumn: { rain: 0.2, drought: 0.1, windstorm: 0.2 },
  winter: { rain: 0.05, drought: 0.15, windstorm: 0.15 },
};

// Default multipliers when no difficulty system is available
const DEFAULT_RAIN_GROWTH_BONUS = 1.3;
const DEFAULT_DROUGHT_GROWTH_PENALTY = 0.5;
const DEFAULT_WINDSTORM_DAMAGE_CHANCE = 0.1;

// ============================================
// Growth & Stamina Multipliers
// ============================================

export function getWeatherGrowthMultiplier(weather: WeatherType): number {
  if (weather === "rain") return DEFAULT_RAIN_GROWTH_BONUS;
  if (weather === "drought") return DEFAULT_DROUGHT_GROWTH_PENALTY;
  return 1.0;
}

export function getWeatherStaminaMultiplier(weather: WeatherType): number {
  if (weather === "drought") return 1.5;
  return 1.0;
}

// ============================================
// State Initialization
// ============================================

export function initializeWeather(
  currentGameTimeSeconds: number,
): WeatherState {
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

export function updateWeather(
  state: WeatherState,
  currentGameTimeSeconds: number,
  season: string,
  rngSeed: number,
): WeatherState {
  const eventEnd = state.current.startTime + state.current.duration;

  // Event still active
  if (currentGameTimeSeconds < eventEnd) {
    return state;
  }

  // Event expired but haven't reached next check time
  if (currentGameTimeSeconds < state.nextCheckTime) {
    if (
      state.current.type === "clear" &&
      state.current.startTime === eventEnd
    ) {
      return state;
    }
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

export function rollWindstormDamage(rngValue: number): boolean {
  return rngValue < DEFAULT_WINDSTORM_DAMAGE_CHANCE;
}

// ============================================
// Internal Helpers
// ============================================

function rollWeatherType(roll: number, season: string): WeatherType {
  const probs = SEASON_PROBABILITIES[season] ?? SEASON_PROBABILITIES.spring;

  if (roll < probs.rain) return "rain";
  if (roll < probs.rain + probs.drought) return "drought";
  if (roll < probs.rain + probs.drought + probs.windstorm) return "windstorm";
  return "clear";
}

function rollDuration(type: WeatherType, roll: number): number {
  if (type === "clear") {
    return WEATHER_CHECK_INTERVAL;
  }

  const [min, max] = DURATION_RANGES[type];
  return min + roll * (max - min);
}
