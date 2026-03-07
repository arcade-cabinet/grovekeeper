/**
 * Time system — microsecond-precision day/night + season cycle.
 *
 * Pure functions operating on a module-level accumulator. The game loop
 * calls advanceTime(deltaMicroseconds) each frame; UI reads the computed
 * TimeState.
 *
 * Authoritative day length is sourced from config/game/dayNight.json
 * (secondsPerDay / dayLengthSeconds = 600s = 10 real minutes per game day).
 */

import dayNightConfig from "@/config/game/dayNight.json";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type TimePhase = "night" | "dawn" | "day" | "dusk";

export interface TimeState {
  totalMicroseconds: number;
  dayNumber: number;
  dayProgress: number; // [0, 1) within current day
  phase: TimePhase;
  season: Season;
  seasonDay: number; // day within current season
  hour: number; // 0-23
}

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Real seconds per in-game day.
 * Authoritative value: config/game/dayNight.json#dayLengthSeconds = 600s (10 real minutes).
 */
const REAL_SECONDS_PER_GAME_DAY: number = dayNightConfig.dayLengthSeconds;

/** Microseconds per real second. */
const MICROSECONDS_PER_REAL_SECOND = 1_000_000;

/** Microseconds per in-game day. */
export const MICROSECONDS_PER_DAY = REAL_SECONDS_PER_GAME_DAY * MICROSECONDS_PER_REAL_SECOND;

/** How many microseconds per "game second" (1/86400 of a day). */
export const MICROSECONDS_PER_GAME_SECOND = MICROSECONDS_PER_DAY / 86400;

/** Days per season (default). */
const DEFAULT_SEASON_LENGTH = 30;

/** Day progress thresholds for time-of-day phases. */
const DAWN_START = 0.2;
const DAY_START = 0.3;
const DUSK_START = 0.75;
const NIGHT_START = 0.85;

// ── Sky Colors ──────────────────────────────────────────────────────────────

export const SKY_COLORS = {
  dawn: { top: "#4a6fa1", bottom: "#e8a87c" },
  day: { top: "#87ceeb", bottom: "#e0f0ff" },
  dusk: { top: "#6a4c93", bottom: "#e07050" },
  night: { top: "#0b1a3e", bottom: "#1a2f5a" },
} as const;

// ── Module State ────────────────────────────────────────────────────────────

let totalMicroseconds = 0;

export function resetGameTime(): void {
  totalMicroseconds = 0;
}

export function setGameTime(microseconds: number): void {
  totalMicroseconds = microseconds;
}

export function getGameTime(): number {
  return totalMicroseconds;
}

// ── Phase Computation ───────────────────────────────────────────────────────

function phaseFromProgress(progress: number): TimePhase {
  if (progress < DAWN_START) return "night";
  if (progress < DAY_START) return "dawn";
  if (progress < DUSK_START) return "day";
  if (progress < NIGHT_START) return "dusk";
  return "night";
}

// ── Season Computation ──────────────────────────────────────────────────────

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

function seasonFromDay(
  dayNumber: number,
  seasonLength: number,
): { season: Season; seasonDay: number } {
  const yearLength = seasonLength * 4;
  const dayInYear = dayNumber % yearLength;
  const seasonIndex = Math.floor(dayInYear / seasonLength);
  return {
    season: SEASONS[seasonIndex],
    seasonDay: dayInYear % seasonLength,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Advance the game clock by deltaMicroseconds and return the new TimeState.
 */
export function advanceTime(deltaMicroseconds: number): TimeState {
  totalMicroseconds += deltaMicroseconds;
  return computeTimeState(totalMicroseconds);
}

/**
 * Compute a TimeState from an absolute microsecond timestamp.
 * Optionally override seasonLength (default 30 days).
 */
export function computeTimeState(
  microseconds: number,
  seasonLength = DEFAULT_SEASON_LENGTH,
): TimeState {
  const dayNumber = Math.floor(microseconds / MICROSECONDS_PER_DAY);
  const dayProgress = (microseconds % MICROSECONDS_PER_DAY) / MICROSECONDS_PER_DAY;
  const phase = phaseFromProgress(dayProgress);
  const { season, seasonDay } = seasonFromDay(dayNumber, seasonLength);
  const hour = Math.floor(dayProgress * 24);

  return {
    totalMicroseconds: microseconds,
    dayNumber,
    dayProgress,
    phase,
    season,
    seasonDay,
    hour,
  };
}

/**
 * Get light intensity for a given day progress [0, 1).
 * Night = 0.3, Day = 1.0, dawn/dusk interpolated.
 */
export function getLightIntensity(dayProgress: number): number {
  if (dayProgress < DAWN_START) return 0.3;
  if (dayProgress < DAY_START) {
    const t = (dayProgress - DAWN_START) / (DAY_START - DAWN_START);
    return 0.3 + t * 0.7;
  }
  if (dayProgress < DUSK_START) return 1.0;
  if (dayProgress < NIGHT_START) {
    const t = (dayProgress - DUSK_START) / (NIGHT_START - DUSK_START);
    return 1.0 - t * 0.7;
  }
  return 0.3;
}

/**
 * Get sky gradient colors for the current time of day.
 */
export function getSkyColors(dayProgress: number): {
  top: string;
  bottom: string;
} {
  const phase = phaseFromProgress(dayProgress);
  return SKY_COLORS[phase];
}

/**
 * Whether it's currently nighttime.
 */
export function isNightTime(dayProgress: number): boolean {
  return phaseFromProgress(dayProgress) === "night";
}
