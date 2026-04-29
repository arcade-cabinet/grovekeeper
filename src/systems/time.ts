/**
 * Time System - Day/Night cycle with seasons and microsecond precision
 *
 * Time scales:
 * - 1 real second = 12 game seconds
 * - 5 real seconds = 1 game minute
 * - 2 real hours = 1 game day
 * - 30 game days = 1 game month
 * - 3 game months = 1 season
 * - 12 game months = 1 game year
 */

export type Season = "spring" | "summer" | "autumn" | "winter";
export type TimeOfDay =
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "dusk"
  | "evening"
  | "night"
  | "midnight";

export interface GameTime {
  // Microsecond precision timestamp (game time in microseconds)
  microseconds: number;

  // Derived values
  seconds: number;
  minutes: number;
  hours: number;
  day: number;
  month: number;
  year: number;
  season: Season;
  timeOfDay: TimeOfDay;

  // Normalized values (0-1)
  dayProgress: number; // 0 at midnight, 0.5 at noon
  seasonProgress: number; // Progress through current season
  yearProgress: number;

  // Light values
  sunIntensity: number; // 0-1
  ambientIntensity: number; // 0-1
}

// Time configuration
export const TIME_CONFIG = {
  // How fast game time passes relative to real time
  timeScale: 12, // 1 real second = 12 game seconds (1 game minute per 5 real seconds)

  // Day structure (in game hours, 0-24)
  dawn: 5,
  sunrise: 6,
  morning: 8,
  noon: 12,
  afternoon: 14,
  dusk: 18,
  sunset: 19,
  evening: 20,
  night: 22,
  midnight: 0,

  // Season boundaries (months 1-12)
  seasons: {
    spring: { startMonth: 3, endMonth: 5 },
    summer: { startMonth: 6, endMonth: 8 },
    autumn: { startMonth: 9, endMonth: 11 },
    winter: { startMonth: 12, endMonth: 2 },
  },

  // Constants
  microsecondsPerSecond: 1_000_000,
  secondsPerMinute: 60,
  minutesPerHour: 60,
  hoursPerDay: 24,
  daysPerMonth: 30,
  monthsPerYear: 12,
};

// Game time state
let gameTimeMicroseconds = 0;
let isPaused = false;

// Start at spring, day 1, 8:00 AM
const INITIAL_GAME_TIME = (() => {
  const hours = 8;
  const day = 1;
  const month = 3; // March (Spring)
  const year = 1;

  const totalDays =
    (year - 1) * TIME_CONFIG.monthsPerYear * TIME_CONFIG.daysPerMonth +
    (month - 1) * TIME_CONFIG.daysPerMonth +
    (day - 1);
  const totalHours = totalDays * TIME_CONFIG.hoursPerDay + hours;
  const totalMinutes = totalHours * TIME_CONFIG.minutesPerHour;
  const totalSeconds = totalMinutes * TIME_CONFIG.secondsPerMinute;
  const totalMicroseconds = totalSeconds * TIME_CONFIG.microsecondsPerSecond;

  return totalMicroseconds;
})();

export const initializeTime = (savedMicroseconds?: number) => {
  gameTimeMicroseconds = savedMicroseconds ?? INITIAL_GAME_TIME;
  isPaused = false;
};

export const pauseTime = () => {
  isPaused = true;
};

export const resumeTime = () => {
  isPaused = false;
};

export const setTimeScale = (scale: number) => {
  TIME_CONFIG.timeScale = Math.max(0.1, Math.min(1000, scale));
};

// Main update function - call every frame
export const updateTime = (realDeltaMs: number): GameTime => {
  if (!isPaused) {
    // Cap deltaTime to prevent death spirals on mobile tab switches
    const clampedDelta = Math.min(realDeltaMs, 100);
    // Convert real milliseconds to game microseconds
    const gameDeltaMicroseconds = clampedDelta * 1000 * TIME_CONFIG.timeScale;
    gameTimeMicroseconds += gameDeltaMicroseconds;
  }

  return getGameTime();
};

// Get current game time without updating
export const getGameTime = (): GameTime => {
  const microseconds = gameTimeMicroseconds;

  // Convert microseconds to larger units
  const totalSeconds = Math.floor(
    microseconds / TIME_CONFIG.microsecondsPerSecond,
  );
  const totalMinutes = Math.floor(totalSeconds / TIME_CONFIG.secondsPerMinute);
  const totalHours = Math.floor(totalMinutes / TIME_CONFIG.minutesPerHour);
  const totalDays = Math.floor(totalHours / TIME_CONFIG.hoursPerDay);
  const totalMonths = Math.floor(totalDays / TIME_CONFIG.daysPerMonth);

  // Current values
  const seconds = totalSeconds % TIME_CONFIG.secondsPerMinute;
  const minutes = totalMinutes % TIME_CONFIG.minutesPerHour;
  const hours = totalHours % TIME_CONFIG.hoursPerDay;
  const day = (totalDays % TIME_CONFIG.daysPerMonth) + 1;
  const month = (totalMonths % TIME_CONFIG.monthsPerYear) + 1;
  const year = Math.floor(totalMonths / TIME_CONFIG.monthsPerYear) + 1;

  // Calculate season
  const season = getSeasonFromMonth(month);
  const seasonProgress = getSeasonProgress(month, day);

  // Calculate time of day
  const timeOfDay = getTimeOfDay(hours);
  const dayProgress = hours / 24;

  // Calculate year progress
  const yearProgress =
    ((month - 1) * TIME_CONFIG.daysPerMonth + day) /
    (TIME_CONFIG.monthsPerYear * TIME_CONFIG.daysPerMonth);

  // Calculate light values
  const { sunIntensity, ambientIntensity } = calculateLightValues(
    hours,
    minutes,
  );

  return {
    microseconds,
    seconds,
    minutes,
    hours,
    day,
    month,
    year,
    season,
    timeOfDay,
    dayProgress,
    seasonProgress,
    yearProgress,
    sunIntensity,
    ambientIntensity,
  };
};

const getSeasonFromMonth = (month: number): Season => {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};

// Module-scope constant — avoids allocating a new Record every frame in
// getSeasonProgress(), which is called from getGameTime() (hot path).
const SEASON_START_MONTHS: Record<Season, number> = {
  spring: 3,
  summer: 6,
  autumn: 9,
  winter: 12,
};

const getSeasonProgress = (month: number, day: number): number => {
  const season = getSeasonFromMonth(month);
  const startMonth = SEASON_START_MONTHS[season];

  // Handle winter wrapping
  if (season === "winter" && month <= 2) {
    // We're in Jan/Feb, treat December as month 0
    const adjustedMonth = month + 12;
    const daysSinceSeasonStart =
      (adjustedMonth - 12) * TIME_CONFIG.daysPerMonth + (day - 1);
    const totalSeasonDays = 3 * TIME_CONFIG.daysPerMonth;
    return daysSinceSeasonStart / totalSeasonDays;
  }

  const daysSinceSeasonStart =
    (month - startMonth) * TIME_CONFIG.daysPerMonth + (day - 1);
  const totalSeasonDays = 3 * TIME_CONFIG.daysPerMonth;
  return daysSinceSeasonStart / totalSeasonDays;
};

const getTimeOfDay = (hours: number): TimeOfDay => {
  if (hours >= 5 && hours < 6) return "dawn";
  if (hours >= 6 && hours < 12) return "morning";
  if (hours >= 12 && hours < 14) return "noon";
  if (hours >= 14 && hours < 18) return "afternoon";
  if (hours >= 18 && hours < 20) return "dusk";
  if (hours >= 20 && hours < 22) return "evening";
  if (hours >= 22) return "night";
  return "midnight";
};

const calculateLightValues = (
  hours: number,
  minutes: number,
): { sunIntensity: number; ambientIntensity: number } => {
  const hourFraction = hours + minutes / 60;

  // Sun intensity curve (peaks at noon)
  let sunIntensity: number;
  if (hourFraction < 5) {
    sunIntensity = 0;
  } else if (hourFraction < 7) {
    // Dawn to morning
    sunIntensity = (hourFraction - 5) / 2;
  } else if (hourFraction < 12) {
    // Morning to noon
    sunIntensity = 1 - (12 - hourFraction) * 0.05;
  } else if (hourFraction < 17) {
    // Noon to afternoon
    sunIntensity = 1 - (hourFraction - 12) * 0.05;
  } else if (hourFraction < 19) {
    // Afternoon to dusk
    sunIntensity = 0.75 - (hourFraction - 17) * 0.35;
  } else if (hourFraction < 21) {
    // Dusk to evening
    sunIntensity = 0.05 - (hourFraction - 19) * 0.025;
  } else {
    sunIntensity = 0;
  }

  // Ambient light (never fully dark)
  const ambientIntensity = Math.max(0.15, sunIntensity * 0.6 + 0.2);

  return {
    sunIntensity: Math.max(0, Math.min(1, sunIntensity)),
    ambientIntensity: Math.max(0.15, Math.min(0.8, ambientIntensity)),
  };
};

// Color calculations for sky
export interface SkyColors {
  zenith: string;
  horizon: string;
  sun: string;
  ambient: string;
}

// ---------------------------------------------------------------------------
// Sky color palette — module-scope constants (no allocation per frame).
// Previously defined inside getSkyColors() causing 8+ object allocations
// every frame.
// ---------------------------------------------------------------------------

type SkyColorKey = {
  zenith: string;
  horizon: string;
  sun: string;
  ambient: string;
};

const SKY_MIDNIGHT: SkyColorKey = {
  zenith: "#0a1628",
  horizon: "#1a2a4a",
  sun: "#2a3a5a",
  ambient: "#1a2030",
};
const SKY_DAWN: SkyColorKey = {
  zenith: "#2a3a5a",
  horizon: "#ff9966",
  sun: "#ffcc88",
  ambient: "#4a4a60",
};
const SKY_MORNING: SkyColorKey = {
  zenith: "#4a90d9",
  horizon: "#87ceeb",
  sun: "#fff5e6",
  ambient: "#6090b0",
};
const SKY_NOON: SkyColorKey = {
  zenith: "#1e90ff",
  horizon: "#87ceeb",
  sun: "#ffffff",
  ambient: "#80b0d0",
};
const SKY_AFTERNOON: SkyColorKey = {
  zenith: "#4a90d9",
  horizon: "#87ceeb",
  sun: "#fff8dc",
  ambient: "#6090b0",
};
const SKY_DUSK: SkyColorKey = {
  zenith: "#5a4a7a",
  horizon: "#ff7744",
  sun: "#ff9900",
  ambient: "#6a5a70",
};
const SKY_EVENING: SkyColorKey = {
  zenith: "#2a2a4a",
  horizon: "#4a3a5a",
  sun: "#ff6644",
  ambient: "#3a3a50",
};
const SKY_NIGHT: SkyColorKey = {
  zenith: "#0a1628",
  horizon: "#1a2a4a",
  sun: "#3a4a6a",
  ambient: "#1a2030",
};

// Reusable output buffer for getSkyColors — mutated in place each frame.
// Callers must read all fields before the next getSkyColors() call.
const _skyColorsOut: SkyColors = {
  zenith: "#0a1628",
  horizon: "#1a2a4a",
  sun: "#2a3a5a",
  ambient: "#1a2030",
};

// ---------------------------------------------------------------------------
// Allocation-free hex color helpers
// ---------------------------------------------------------------------------

/**
 * Parse two-character hex substring at position `start` into an integer.
 * Zero-allocation replacement for parseInt(result[n], 16) inside hexToRgb.
 */
function hexByte(s: string, start: number): number {
  const hi = s.charCodeAt(start);
  const lo = s.charCodeAt(start + 1);
  const hiN =
    hi >= 48 && hi <= 57 ? hi - 48 : hi >= 65 && hi <= 70 ? hi - 55 : hi - 87;
  const loN =
    lo >= 48 && lo <= 57 ? lo - 48 : lo >= 65 && lo <= 70 ? lo - 55 : lo - 87;
  return (hiN << 4) | loN;
}

/** Hex digit character for value 0-15 (lowercase). */
const HEX_CHARS = "0123456789abcdef";

/**
 * Format an RGB triplet as a #rrggbb string.
 * Uses character lookup instead of .toString(16) + template literal,
 * avoiding the intermediate array allocation from the old [r,g,b].map().join() pattern.
 */
function rgbToHexStr(r: number, g: number, b: number): string {
  return (
    "#" +
    HEX_CHARS[(r >> 4) & 0xf] +
    HEX_CHARS[r & 0xf] +
    HEX_CHARS[(g >> 4) & 0xf] +
    HEX_CHARS[g & 0xf] +
    HEX_CHARS[(b >> 4) & 0xf] +
    HEX_CHARS[b & 0xf]
  );
}

/**
 * Lerp a single hex color channel between two #rrggbb strings.
 * Uses hexByte() for allocation-free parsing.
 */
function lerpColorStr(a: string, b: string, t: number): string {
  const ao = a.charCodeAt(0) === 0x23 ? 1 : 0;
  const bo = b.charCodeAt(0) === 0x23 ? 1 : 0;
  const ar = hexByte(a, ao);
  const ag = hexByte(a, ao + 2);
  const ab = hexByte(a, ao + 4);
  const br = hexByte(b, bo);
  const bg = hexByte(b, bo + 2);
  const bb = hexByte(b, bo + 4);
  return rgbToHexStr(
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t),
  );
}

/**
 * Write the lerped sky colors between `a` and `b` into `_skyColorsOut`.
 * Called instead of `lerpColors()` to avoid allocating a new SkyColors object.
 */
function lerpColorsInto(a: SkyColorKey, b: SkyColorKey, t: number): void {
  _skyColorsOut.zenith = lerpColorStr(a.zenith, b.zenith, t);
  _skyColorsOut.horizon = lerpColorStr(a.horizon, b.horizon, t);
  _skyColorsOut.sun = lerpColorStr(a.sun, b.sun, t);
  _skyColorsOut.ambient = lerpColorStr(a.ambient, b.ambient, t);
}

export const getSkyColors = (time: GameTime): SkyColors => {
  const { hours, minutes } = time;
  const hourFraction = hours + minutes / 60;

  if (hourFraction < 5 || hourFraction >= 22) {
    // No lerp — copy reference fields directly into output buffer
    _skyColorsOut.zenith = SKY_MIDNIGHT.zenith;
    _skyColorsOut.horizon = SKY_MIDNIGHT.horizon;
    _skyColorsOut.sun = SKY_MIDNIGHT.sun;
    _skyColorsOut.ambient = SKY_MIDNIGHT.ambient;
  } else if (hourFraction < 6) {
    lerpColorsInto(SKY_MIDNIGHT, SKY_DAWN, hourFraction - 5);
  } else if (hourFraction < 8) {
    lerpColorsInto(SKY_DAWN, SKY_MORNING, (hourFraction - 6) / 2);
  } else if (hourFraction < 11) {
    lerpColorsInto(SKY_MORNING, SKY_NOON, (hourFraction - 8) / 3);
  } else if (hourFraction < 14) {
    _skyColorsOut.zenith = SKY_NOON.zenith;
    _skyColorsOut.horizon = SKY_NOON.horizon;
    _skyColorsOut.sun = SKY_NOON.sun;
    _skyColorsOut.ambient = SKY_NOON.ambient;
  } else if (hourFraction < 17) {
    lerpColorsInto(SKY_NOON, SKY_AFTERNOON, (hourFraction - 14) / 3);
  } else if (hourFraction < 19) {
    lerpColorsInto(SKY_AFTERNOON, SKY_DUSK, (hourFraction - 17) / 2);
  } else if (hourFraction < 21) {
    lerpColorsInto(SKY_DUSK, SKY_EVENING, (hourFraction - 19) / 2);
  } else {
    lerpColorsInto(SKY_EVENING, SKY_NIGHT, hourFraction - 21);
  }

  return _skyColorsOut;
};

// Get seasonal colors for trees and ground
export interface SeasonalColors {
  leafColors: string[];
  groundColor: string;
  grassColor: string;
}

export const getSeasonalColors = (
  season: Season,
  _seasonProgress: number,
): SeasonalColors => {
  const colors: Record<Season, SeasonalColors> = {
    spring: {
      leafColors: ["#90EE90", "#7CFC00", "#98FB98", "#00FA9A", "#66CDAA"],
      groundColor: "#2d5a27",
      grassColor: "#4a9a3a",
    },
    summer: {
      leafColors: ["#228B22", "#2E8B57", "#3CB371", "#32CD32", "#006400"],
      groundColor: "#3d6b35",
      grassColor: "#4a7c42",
    },
    autumn: {
      leafColors: ["#FF6347", "#FF4500", "#FFD700", "#FFA500", "#8B4513"],
      groundColor: "#5a4a27",
      grassColor: "#8B7355",
    },
    winter: {
      leafColors: ["#1C4C27", "#2F4F4F", "#1a3a1a", "#2B4B2B", "#365C36"],
      groundColor: "#4a4a52",
      grassColor: "#6a6a70",
    },
  };

  return colors[season];
};

// Serialization
export const saveTime = (): number => gameTimeMicroseconds;
export const loadTime = (microseconds: number) => {
  gameTimeMicroseconds = microseconds;
};
