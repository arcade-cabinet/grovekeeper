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

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight';

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
let lastRealTime = 0;
let isPaused = false;

// Start at spring, day 1, 8:00 AM
const INITIAL_GAME_TIME = (() => {
  const hours = 8;
  const day = 1;
  const month = 3; // March (Spring)
  const year = 1;
  
  const totalDays = ((year - 1) * TIME_CONFIG.monthsPerYear * TIME_CONFIG.daysPerMonth) +
                   ((month - 1) * TIME_CONFIG.daysPerMonth) +
                   (day - 1);
  const totalHours = totalDays * TIME_CONFIG.hoursPerDay + hours;
  const totalMinutes = totalHours * TIME_CONFIG.minutesPerHour;
  const totalSeconds = totalMinutes * TIME_CONFIG.secondsPerMinute;
  const totalMicroseconds = totalSeconds * TIME_CONFIG.microsecondsPerSecond;
  
  return totalMicroseconds;
})();

export const initializeTime = (savedMicroseconds?: number) => {
  gameTimeMicroseconds = savedMicroseconds ?? INITIAL_GAME_TIME;
  lastRealTime = performance.now();
  isPaused = false;
};

export const pauseTime = () => {
  isPaused = true;
};

export const resumeTime = () => {
  lastRealTime = performance.now();
  isPaused = false;
};

export const setTimeScale = (scale: number) => {
  TIME_CONFIG.timeScale = Math.max(0.1, Math.min(1000, scale));
};

// Main update function - call every frame
export const updateTime = (realDeltaMs: number): GameTime => {
  if (!isPaused) {
    // Convert real milliseconds to game microseconds
    const gameDeltaMicroseconds = realDeltaMs * 1000 * TIME_CONFIG.timeScale;
    gameTimeMicroseconds += gameDeltaMicroseconds;
  }
  
  return getGameTime();
};

// Get current game time without updating
export const getGameTime = (): GameTime => {
  const microseconds = gameTimeMicroseconds;
  
  // Convert microseconds to larger units
  const totalSeconds = Math.floor(microseconds / TIME_CONFIG.microsecondsPerSecond);
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
  const yearProgress = ((month - 1) * TIME_CONFIG.daysPerMonth + day) / 
                       (TIME_CONFIG.monthsPerYear * TIME_CONFIG.daysPerMonth);
  
  // Calculate light values
  const { sunIntensity, ambientIntensity } = calculateLightValues(hours, minutes);
  
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
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const getSeasonProgress = (month: number, day: number): number => {
  const seasonStartMonths: Record<Season, number> = {
    spring: 3,
    summer: 6,
    autumn: 9,
    winter: 12,
  };
  
  const season = getSeasonFromMonth(month);
  let startMonth = seasonStartMonths[season];
  
  // Handle winter wrapping
  if (season === 'winter' && month <= 2) {
    // We're in Jan/Feb, treat December as month 0
    const adjustedMonth = month + 12;
    const daysSinceSeasonStart = ((adjustedMonth - 12) * TIME_CONFIG.daysPerMonth) + (day - 1);
    const totalSeasonDays = 3 * TIME_CONFIG.daysPerMonth;
    return daysSinceSeasonStart / totalSeasonDays;
  }
  
  const daysSinceSeasonStart = ((month - startMonth) * TIME_CONFIG.daysPerMonth) + (day - 1);
  const totalSeasonDays = 3 * TIME_CONFIG.daysPerMonth;
  return daysSinceSeasonStart / totalSeasonDays;
};

const getTimeOfDay = (hours: number): TimeOfDay => {
  if (hours >= 5 && hours < 6) return 'dawn';
  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 14) return 'noon';
  if (hours >= 14 && hours < 18) return 'afternoon';
  if (hours >= 18 && hours < 20) return 'dusk';
  if (hours >= 20 && hours < 22) return 'evening';
  if (hours >= 22 || hours < 0) return 'night';
  return 'midnight';
};

const calculateLightValues = (hours: number, minutes: number): { sunIntensity: number; ambientIntensity: number } => {
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

export const getSkyColors = (time: GameTime): SkyColors => {
  const { hours, minutes, season } = time;
  const hourFraction = hours + minutes / 60;
  
  // Base colors for different times
  const timeColors: Record<string, { zenith: string; horizon: string; sun: string; ambient: string }> = {
    midnight: { zenith: '#0a1628', horizon: '#1a2a4a', sun: '#2a3a5a', ambient: '#1a2030' },
    dawn: { zenith: '#2a3a5a', horizon: '#ff9966', sun: '#ffcc88', ambient: '#4a4a60' },
    morning: { zenith: '#4a90d9', horizon: '#87ceeb', sun: '#fff5e6', ambient: '#6090b0' },
    noon: { zenith: '#1e90ff', horizon: '#87ceeb', sun: '#ffffff', ambient: '#80b0d0' },
    afternoon: { zenith: '#4a90d9', horizon: '#87ceeb', sun: '#fff8dc', ambient: '#6090b0' },
    dusk: { zenith: '#5a4a7a', horizon: '#ff7744', sun: '#ff9900', ambient: '#6a5a70' },
    evening: { zenith: '#2a2a4a', horizon: '#4a3a5a', sun: '#ff6644', ambient: '#3a3a50' },
    night: { zenith: '#0a1628', horizon: '#1a2a4a', sun: '#3a4a6a', ambient: '#1a2030' },
  };
  
  // Season modifiers
  const seasonMods: Record<Season, { saturation: number; warmth: number }> = {
    spring: { saturation: 1.1, warmth: 0.05 },
    summer: { saturation: 1.2, warmth: 0.1 },
    autumn: { saturation: 0.9, warmth: 0.15 },
    winter: { saturation: 0.8, warmth: -0.1 },
  };
  
  // Get time-based colors
  let colors: typeof timeColors.noon;
  if (hourFraction < 5 || hourFraction >= 22) {
    colors = timeColors.midnight;
  } else if (hourFraction < 6) {
    colors = lerpColors(timeColors.midnight, timeColors.dawn, hourFraction - 5);
  } else if (hourFraction < 8) {
    colors = lerpColors(timeColors.dawn, timeColors.morning, (hourFraction - 6) / 2);
  } else if (hourFraction < 11) {
    colors = lerpColors(timeColors.morning, timeColors.noon, (hourFraction - 8) / 3);
  } else if (hourFraction < 14) {
    colors = timeColors.noon;
  } else if (hourFraction < 17) {
    colors = lerpColors(timeColors.noon, timeColors.afternoon, (hourFraction - 14) / 3);
  } else if (hourFraction < 19) {
    colors = lerpColors(timeColors.afternoon, timeColors.dusk, (hourFraction - 17) / 2);
  } else if (hourFraction < 21) {
    colors = lerpColors(timeColors.dusk, timeColors.evening, (hourFraction - 19) / 2);
  } else {
    colors = lerpColors(timeColors.evening, timeColors.night, (hourFraction - 21));
  }
  
  return colors;
};

// Helper to lerp between color objects
const lerpColors = (
  a: { zenith: string; horizon: string; sun: string; ambient: string },
  b: { zenith: string; horizon: string; sun: string; ambient: string },
  t: number
): { zenith: string; horizon: string; sun: string; ambient: string } => {
  return {
    zenith: lerpColor(a.zenith, b.zenith, t),
    horizon: lerpColor(a.horizon, b.horizon, t),
    sun: lerpColor(a.sun, b.sun, t),
    ambient: lerpColor(a.ambient, b.ambient, t),
  };
};

const lerpColor = (a: string, b: string, t: number): string => {
  const aRgb = hexToRgb(a);
  const bRgb = hexToRgb(b);
  const r = Math.round(aRgb.r + (bRgb.r - aRgb.r) * t);
  const g = Math.round(aRgb.g + (bRgb.g - aRgb.g) * t);
  const blue = Math.round(aRgb.b + (bRgb.b - aRgb.b) * t);
  return rgbToHex(r, g, blue);
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Get seasonal colors for trees and ground
export interface SeasonalColors {
  leafColors: string[];
  groundColor: string;
  grassColor: string;
}

export const getSeasonalColors = (season: Season, seasonProgress: number): SeasonalColors => {
  const colors: Record<Season, SeasonalColors> = {
    spring: {
      leafColors: ['#90EE90', '#7CFC00', '#98FB98', '#00FA9A', '#66CDAA'],
      groundColor: '#2d5a27',
      grassColor: '#4a9a3a',
    },
    summer: {
      leafColors: ['#228B22', '#2E8B57', '#3CB371', '#32CD32', '#006400'],
      groundColor: '#3d6b35',
      grassColor: '#4a7c42',
    },
    autumn: {
      leafColors: ['#FF6347', '#FF4500', '#FFD700', '#FFA500', '#8B4513'],
      groundColor: '#5a4a27',
      grassColor: '#8B7355',
    },
    winter: {
      leafColors: ['#1C4C27', '#2F4F4F', '#1a3a1a', '#2B4B2B', '#365C36'],
      groundColor: '#4a4a52',
      grassColor: '#6a6a70',
    },
  };
  
  return colors[season];
};

// Serialization
export const saveTime = (): number => gameTimeMicroseconds;
export const loadTime = (microseconds: number) => {
  gameTimeMicroseconds = microseconds;
};
