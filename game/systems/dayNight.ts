/**
 * Day/Night Cycle System (Spec §31.3)
 *
 * 600 real seconds = 1 game day (24 game hours).
 * Drives DayNightComponent and SkyComponent — ambient/directional light,
 * sun angle, star intensity, and time-of-day label.
 *
 * Pure exports (no Three.js / ECS imports — fully unit testable):
 *   computeGameHour      — elapsed seconds → game hour [0, 24)
 *   classifyTimeOfDay    — game hour → TimeOfDay label
 *   computeSunAngle      — game hour → sun elevation in radians [−PI/2, PI/2]
 *   computeStarIntensity — game hour → star visibility [0, 1]
 *   computeLighting      — TimeOfDay → lighting parameter snapshot
 *   initDayNight         — creates a fresh DayNightComponent
 *   tickDayNight         — mutates DayNightComponent + SkyComponent each frame
 */

import dayNightConfig from "@/config/game/dayNight.json" with { type: "json" };
import type { DayNightComponent, SkyComponent, TimeOfDay } from "@/game/ecs/components/procedural/atmosphere";

// ---------------------------------------------------------------------------
// Derived constants from config
// ---------------------------------------------------------------------------

const DAY_LENGTH = dayNightConfig.dayLengthSeconds;
const SECONDS_PER_HOUR = dayNightConfig.secondsPerHour;
const DAYS_PER_SEASON = dayNightConfig.daysPerSeason;
const SEASONS = dayNightConfig.seasons as Array<DayNightComponent["season"]>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LightingSnapshot {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  shadowOpacity: number;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Convert total elapsed real-time seconds into a game hour [0, 24).
 * 600s = 24 game hours, so 25s = 1 game hour.
 */
export function computeGameHour(elapsedSeconds: number): number {
  const dayFraction = (elapsedSeconds % DAY_LENGTH) / DAY_LENGTH;
  return dayFraction * 24;
}

/**
 * Map a game hour to its TimeOfDay label using config slot boundaries.
 * "midnight" spans 23h→5h (wraps past midnight).
 */
export function classifyTimeOfDay(gameHour: number): TimeOfDay {
  const h = ((gameHour % 24) + 24) % 24;
  const slots = dayNightConfig.timeSlots;

  if (h >= slots.dawn.hourStart && h < slots.dawn.hourEnd) return "dawn";
  if (h >= slots.morning.hourStart && h < slots.morning.hourEnd) return "morning";
  if (h >= slots.noon.hourStart && h < slots.noon.hourEnd) return "noon";
  if (h >= slots.afternoon.hourStart && h < slots.afternoon.hourEnd) return "afternoon";
  if (h >= slots.dusk.hourStart && h < slots.dusk.hourEnd) return "dusk";
  if (h >= slots.evening.hourStart && h < slots.evening.hourEnd) return "evening";
  if (h >= slots.night.hourStart && h < slots.night.hourEnd) return "night";
  return "midnight";
}

/**
 * Compute sun elevation angle in radians.
 * 0 at the horizon (sunrise ~6h, sunset ~18h), PI/2 at zenith (noon 12h),
 * negative when below horizon (night).
 *
 * Uses a cosine mapping centered on noon:
 *   angle = (PI/2) * cos(PI * (h - 12) / 12)
 *
 * At h=0:  cos(PI) = -1  → -PI/2 (deepest below)
 * At h=6:  cos(PI/2) = 0 → 0 (horizon)
 * At h=12: cos(0) = 1    → PI/2 (zenith)
 * At h=18: cos(PI/2) = 0 → 0 (horizon, sunset)
 * At h=24: cos(PI) = -1  → -PI/2 (deepest below)
 */
export function computeSunAngle(gameHour: number): number {
  const h = ((gameHour % 24) + 24) % 24;
  return (Math.PI / 2) * Math.cos((Math.PI * (h - 12)) / 12);
}

/**
 * Star visibility [0, 1] for the current time slot.
 * 0 at full daylight, 1 at peak night.
 */
export function computeStarIntensity(timeOfDay: TimeOfDay): number {
  return dayNightConfig.starIntensity[timeOfDay];
}

/**
 * Lighting parameters for a given time-of-day slot (from config).
 * Returns a snapshot object — callers assign fields to DayNightComponent.
 */
export function computeLighting(timeOfDay: TimeOfDay): LightingSnapshot {
  return dayNightConfig.lighting[timeOfDay];
}

/**
 * Derive the season from the day number using config daysPerSeason.
 */
export function computeSeason(dayNumber: number): DayNightComponent["season"] {
  const totalSeasons = SEASONS.length;
  const seasonIndex = Math.floor(dayNumber / DAYS_PER_SEASON) % totalSeasons;
  return SEASONS[seasonIndex];
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Create a fresh DayNightComponent at game start (hour 6, dawn).
 */
export function initDayNight(): DayNightComponent {
  const startHour = 6;
  const timeOfDay = classifyTimeOfDay(startHour);
  const lighting = computeLighting(timeOfDay);
  return {
    gameHour: startHour,
    timeOfDay,
    dayNumber: 0,
    season: "spring",
    ambientColor: lighting.ambientColor,
    ambientIntensity: lighting.ambientIntensity,
    directionalColor: lighting.directionalColor,
    directionalIntensity: lighting.directionalIntensity,
    shadowOpacity: lighting.shadowOpacity,
  };
}

// ---------------------------------------------------------------------------
// Tick — mutates both components each frame
// ---------------------------------------------------------------------------

/**
 * Advance the day/night cycle by `dt` real seconds.
 * Mutates DayNightComponent and SkyComponent in-place.
 */
export function tickDayNight(dayNight: DayNightComponent, sky: SkyComponent, dt: number): void {
  const hoursPerSecond = 24 / DAY_LENGTH;
  dayNight.gameHour += dt * hoursPerSecond;

  // Wrap at 24 hours — increment day number and derive season
  if (dayNight.gameHour >= 24) {
    dayNight.gameHour -= 24;
    dayNight.dayNumber += 1;
    dayNight.season = computeSeason(dayNight.dayNumber);
  }

  // Classify time slot
  dayNight.timeOfDay = classifyTimeOfDay(dayNight.gameHour);

  // Update lighting
  const lighting = computeLighting(dayNight.timeOfDay);
  dayNight.ambientColor = lighting.ambientColor;
  dayNight.ambientIntensity = lighting.ambientIntensity;
  dayNight.directionalColor = lighting.directionalColor;
  dayNight.directionalIntensity = lighting.directionalIntensity;
  dayNight.shadowOpacity = lighting.shadowOpacity;

  // Drive sky
  sky.sunAngle = computeSunAngle(dayNight.gameHour);
  sky.starIntensity = computeStarIntensity(dayNight.timeOfDay);
}
