/**
 * Procedural atmosphere ECS components.
 *
 * Sky dome, day/night cycle, weather state, and fog volumes.
 * These are mostly singletons but use the same ECS query pattern.
 */

/** Procedural sky dome — sun/moon, gradient stops, stars. */
export interface SkyComponent {
  /** Current sun angle in radians (0 = horizon, PI/2 = zenith). */
  sunAngle: number;
  /** Sun azimuth in radians. */
  sunAzimuth: number;
  /** Sky gradient color stops (8-stop from spec). */
  gradientStops: Array<{ position: number; color: string }>;
  /** Star visibility (0 = day, 1 = full night). */
  starIntensity: number;
  /** Moon phase 0-7 (new, waxing crescent, ... full, ... waning). */
  moonPhase: number;
  /** Cloud coverage 0-1. */
  cloudCoverage: number;
  /** Cloud scroll speed. */
  cloudSpeed: number;
}

export type TimeOfDay =
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "dusk"
  | "evening"
  | "night"
  | "midnight";

/** Day/night cycle state — drives sky, lighting, NPC schedules. */
export interface DayNightComponent {
  /** Current game time in hours (0-24). */
  gameHour: number;
  /** Current time-of-day label. */
  timeOfDay: TimeOfDay;
  /** Day number since game start. */
  dayNumber: number;
  /** Current season. */
  season: "spring" | "summer" | "autumn" | "winter";
  /** Ambient light color for current time (lerped between slots). */
  ambientColor: string;
  /** Ambient light intensity 0-1 (lerped between slots). */
  ambientIntensity: number;
  /** Directional (sun/moon) light color (lerped between slots). */
  directionalColor: string;
  /** Directional light intensity 0-1 — alias for sun/moon intensity. */
  directionalIntensity: number;
  /** Convenience alias so renderers can read sunIntensity directly. */
  sunIntensity: number;
  /** Shadow opacity 0-1 (fades at dawn/dusk). */
  shadowOpacity: number;
  /** Sky zenith color hex string (lerped between 8 config stops). */
  skyZenithColor: string;
  /** Sky horizon color hex string (lerped between 8 config stops). */
  skyHorizonColor: string;
  /** Star visibility 0-1 (0 = day, 1 = full night, lerped between slots). */
  starIntensity: number;
}

export type WeatherType = "clear" | "rain" | "snow" | "fog" | "windstorm" | "thunderstorm";

/** Weather state — drives particle emission, audio, gameplay effects. */
export interface WeatherComponent {
  /** Current active weather. */
  weatherType: WeatherType;
  /** Intensity 0-1 (light drizzle vs downpour). */
  intensity: number;
  /** Wind direction (normalized). */
  windDirection: [number, number];
  /** Wind speed multiplier. */
  windSpeed: number;
  /** Time remaining in seconds for current weather event. */
  timeRemaining: number;
  /** Whether weather affects gameplay (Survival mode only). */
  affectsGameplay: boolean;
}

/** Localized fog volume — denser fog in valleys, swamps, etc. */
export interface FogVolumeComponent {
  /** Fog density 0-1. */
  density: number;
  /** Fog color (biome-tinted). */
  color: string;
  /** Radius of the fog volume in world units. */
  radius: number;
  /** Vertical extent (how tall the fog is). */
  height: number;
  /** Whether fog animates (swirls slowly). */
  animated: boolean;
}
