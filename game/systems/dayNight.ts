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
 *   lerpLightingForHour  — game hour → lerped lighting snapshot between 8 slots
 *   lerpSkyColorsForHour — game hour → lerped zenith + horizon colors between 8 slots
 *   initDayNight         — creates a fresh DayNightComponent
 *   tickDayNight         — mutates DayNightComponent + SkyComponent each frame
 */

import dayNightConfig from "@/config/game/dayNight.json" with { type: "json" };
import type {
  DayNightComponent,
  SkyComponent,
  TimeOfDay,
} from "@/game/ecs/components/procedural/atmosphere";

// ---------------------------------------------------------------------------
// Derived constants from config
// ---------------------------------------------------------------------------

const DAY_LENGTH = dayNightConfig.dayLengthSeconds;
const DAYS_PER_SEASON = dayNightConfig.daysPerSeason;
const SEASONS = dayNightConfig.seasons as Array<DayNightComponent["season"]>;

// Ordered list of 8 slots with their representative hour (anchor).
// Used for lerp: each slot covers a range; we interpolate between slot anchors.
const SLOT_ANCHORS: Array<{ hour: number; slot: TimeOfDay }> = [
  { hour: 6, slot: "dawn" },
  { hour: 9, slot: "morning" },
  { hour: 12, slot: "noon" },
  { hour: 15, slot: "afternoon" },
  { hour: 18, slot: "dusk" },
  { hour: 20, slot: "evening" },
  { hour: 22, slot: "night" },
  { hour: 2, slot: "midnight" }, // anchor at 2 (next day)
];

// ---------------------------------------------------------------------------
// Color lerp helpers (hex string in, hex string out)
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

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

export interface SkyColorSnapshot {
  zenith: string;
  horizon: string;
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
 * Find the two surrounding SLOT_ANCHORS for a given game hour and return
 * lerp factor [0,1] between them. Midnight anchor (h=2) wraps correctly.
 */
function findLerpPair(hour: number): { a: TimeOfDay; b: TimeOfDay; t: number } {
  const h = ((hour % 24) + 24) % 24;

  // Place anchors in a comparable space. Midnight (h=2) shifts to h+24=26
  // so it sorts after night (h=22) without special-casing.
  const anchors = SLOT_ANCHORS.map((a) => ({
    h: a.hour < 5 ? a.hour + 24 : a.hour,
    slot: a.slot,
  }));
  const hNorm = h < 5 ? h + 24 : h;

  let nextIdx = anchors.findIndex((a) => a.h > hNorm);
  if (nextIdx === -1) nextIdx = anchors.length;

  const prevIdx = (nextIdx - 1 + anchors.length) % anchors.length;
  const prev = anchors[prevIdx];
  const next = anchors[nextIdx % anchors.length];

  const nextH = nextIdx >= anchors.length ? next.h + 24 : next.h;
  const span = nextH - prev.h;
  const t = span > 0 ? (hNorm - prev.h) / span : 0;

  return { a: prev.slot, b: next.slot, t: Math.max(0, Math.min(1, t)) };
}

/**
 * Lerped lighting snapshot between the two surrounding 8-slot anchors.
 * Produces smooth transitions across slot boundaries instead of hard snaps.
 */
export function lerpLightingForHour(hour: number): LightingSnapshot {
  const { a, b, t } = findLerpPair(hour);
  const la = dayNightConfig.lighting[a];
  const lb = dayNightConfig.lighting[b];
  return {
    ambientColor: lerpColor(la.ambientColor, lb.ambientColor, t),
    ambientIntensity: lerpNumber(la.ambientIntensity, lb.ambientIntensity, t),
    directionalColor: lerpColor(la.directionalColor, lb.directionalColor, t),
    directionalIntensity: lerpNumber(la.directionalIntensity, lb.directionalIntensity, t),
    shadowOpacity: lerpNumber(la.shadowOpacity, lb.shadowOpacity, t),
  };
}

/**
 * Lerped sky zenith + horizon colors between the two surrounding 8-slot anchors.
 * Produces the smooth 8-stop gradient described in Spec §5.3.
 */
export function lerpSkyColorsForHour(hour: number): SkyColorSnapshot {
  const { a, b, t } = findLerpPair(hour);
  const sa = dayNightConfig.skyColors[a];
  const sb = dayNightConfig.skyColors[b];
  return {
    zenith: lerpColor(sa.zenith, sb.zenith, t),
    horizon: lerpColor(sa.horizon, sb.horizon, t),
  };
}

/**
 * Lerped star intensity between the two surrounding slot anchors.
 */
export function lerpStarIntensity(hour: number): number {
  const { a, b, t } = findLerpPair(hour);
  return lerpNumber(dayNightConfig.starIntensity[a], dayNightConfig.starIntensity[b], t);
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
 * Create a fresh DayNightComponent, optionally seeded from saved game time.
 *
 * When `gameTimeMicroseconds` is provided the component is initialised to the
 * correct hour, day, and season so a resumed game starts at the right time of
 * day instead of always at dawn (hour 6).
 */
export function initDayNight(gameTimeMicroseconds?: number): DayNightComponent {
  let startHour: number;
  let dayNumber: number;
  let season: DayNightComponent["season"];

  if (gameTimeMicroseconds != null && gameTimeMicroseconds > 0) {
    const microPerDay = DAY_LENGTH * 1_000_000;
    dayNumber = Math.floor(gameTimeMicroseconds / microPerDay);
    const dayProgress = (gameTimeMicroseconds % microPerDay) / microPerDay;
    startHour = dayProgress * 24;
    season = computeSeason(dayNumber);
  } else {
    startHour = 6;
    dayNumber = 0;
    season = "spring";
  }

  const timeOfDay = classifyTimeOfDay(startHour);
  const lighting = lerpLightingForHour(startHour);
  const skyColors = lerpSkyColorsForHour(startHour);
  const starIntensity = lerpStarIntensity(startHour);
  return {
    gameHour: startHour,
    timeOfDay,
    dayNumber,
    season,
    ambientColor: lighting.ambientColor,
    ambientIntensity: lighting.ambientIntensity,
    directionalColor: lighting.directionalColor,
    directionalIntensity: lighting.directionalIntensity,
    sunIntensity: lighting.directionalIntensity,
    shadowOpacity: lighting.shadowOpacity,
    skyZenithColor: skyColors.zenith,
    skyHorizonColor: skyColors.horizon,
    starIntensity,
  };
}

// ---------------------------------------------------------------------------
// Tick — mutates both components each frame
// ---------------------------------------------------------------------------

/**
 * Advance the day/night cycle by `dt` real seconds.
 * Mutates DayNightComponent and SkyComponent in-place.
 * All sky/lighting values are lerped between the 8 config slots (Spec §5.3, §31.3).
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

  applyDayNightVisuals(dayNight, sky);
}

/**
 * Sync the DayNight entity to the authoritative TimeState from time.ts.
 *
 * Instead of independently advancing time (which drifts from the canonical
 * clock over many frames), this sets gameHour / dayNumber / season from the
 * already-computed TimeState and then refreshes all derived lighting/sky
 * values.  Call this each frame AFTER advanceTime() returns.
 */
export function syncDayNight(
  dayNight: DayNightComponent,
  sky: SkyComponent,
  gameTimeMicroseconds: number,
): void {
  const microPerDay = DAY_LENGTH * 1_000_000;
  const dayNumber = Math.floor(gameTimeMicroseconds / microPerDay);
  const dayProgress = (gameTimeMicroseconds % microPerDay) / microPerDay;

  dayNight.gameHour = dayProgress * 24;
  dayNight.dayNumber = dayNumber;
  dayNight.season = computeSeason(dayNumber);

  applyDayNightVisuals(dayNight, sky);
}

/**
 * Shared helper: refresh lighting, sky colors, star intensity, and sun angle
 * from the current gameHour on the DayNightComponent.
 */
function applyDayNightVisuals(dayNight: DayNightComponent, sky: SkyComponent): void {
  // Classify time slot (for label / NPC schedules)
  dayNight.timeOfDay = classifyTimeOfDay(dayNight.gameHour);

  // Update lighting — lerped between surrounding slots
  const lighting = lerpLightingForHour(dayNight.gameHour);
  dayNight.ambientColor = lighting.ambientColor;
  dayNight.ambientIntensity = lighting.ambientIntensity;
  dayNight.directionalColor = lighting.directionalColor;
  dayNight.directionalIntensity = lighting.directionalIntensity;
  dayNight.sunIntensity = lighting.directionalIntensity;
  dayNight.shadowOpacity = lighting.shadowOpacity;

  // Update sky colors — lerped between 8 config stops (Spec §5.3)
  const skyColors = lerpSkyColorsForHour(dayNight.gameHour);
  dayNight.skyZenithColor = skyColors.zenith;
  dayNight.skyHorizonColor = skyColors.horizon;

  // Update star intensity — lerped
  dayNight.starIntensity = lerpStarIntensity(dayNight.gameHour);

  // Drive SkyComponent (legacy / parallel path)
  sky.sunAngle = computeSunAngle(dayNight.gameHour);
  sky.starIntensity = dayNight.starIntensity;
}
