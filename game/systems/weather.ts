/**
 * Weather Events System
 *
 * Pure-function module that manages weather events affecting tree growth
 * rates and stamina costs. Weather transitions are deterministic via
 * seeded RNG.
 *
 * All tuning values (probabilities, durations, multipliers) are loaded
 * from config/game/weather.json — no inline constants.
 *
 * Weather types:
 * - Clear   : normal conditions (default)
 * - Rain    : +30% growth rate, lasts 60-120 game seconds
 * - Drought : -50% growth rate, +50% stamina cost, lasts 90-180 game seconds
 * - Windstorm: 10% chance to damage seedling/sprout trees, lasts 30-60 game seconds
 */

import weatherConfig from "@/config/game/weather.json" with { type: "json" };
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
// Config-derived constants
// ============================================

const WEATHER_CHECK_INTERVAL: number = weatherConfig.checkIntervalSec;

const DURATION_RANGES: Record<Exclude<WeatherType, "clear">, [number, number]> = {
  rain: weatherConfig.durationRanges.rain as [number, number],
  drought: weatherConfig.durationRanges.drought as [number, number],
  windstorm: weatherConfig.durationRanges.windstorm as [number, number],
};

const SEASON_PROBABILITIES: Record<string, { rain: number; drought: number; windstorm: number }> =
  weatherConfig.seasonProbabilities;

const STAMINA_MULTIPLIERS: Record<string, number> = weatherConfig.staminaMultipliers;

const GROWTH_MULTIPLIERS: Record<string, number> = weatherConfig.growthMultipliers;

const WINDSTORM_DAMAGE_CHANCE: number = weatherConfig.windstormDamageChance;

// ============================================
// Growth & Stamina Multipliers
// ============================================

export function getWeatherGrowthMultiplier(weather: WeatherType): number {
  return GROWTH_MULTIPLIERS[weather] ?? 1.0;
}

export function getWeatherStaminaMultiplier(weather: WeatherType): number {
  return STAMINA_MULTIPLIERS[weather] ?? 1.0;
}

// ============================================
// State Initialization
// ============================================

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
    if (state.current.type === "clear" && state.current.startTime === eventEnd) {
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
  return rngValue < WINDSTORM_DAMAGE_CHANCE;
}

// ============================================
// Internal Helpers
// ============================================

function rollWeatherType(roll: number, season: string): WeatherType {
  const probs = SEASON_PROBABILITIES[season] ?? SEASON_PROBABILITIES["spring"];

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
