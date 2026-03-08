/**
 * settingsLogic.ts -- Pure functions for SettingsScreen (Spec §26).
 *
 * No React / React Native imports. Extracted for unit testability.
 * SettingsScreen.tsx imports and uses these; tests import from here.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingsValues {
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  drawDistance: number;
  touchSensitivity: number;
  reducedMotion: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SETTINGS_DEFAULTS: SettingsValues = {
  masterVolume: 1.0,
  sfxVolume: 1.0,
  ambientVolume: 0.7,
  drawDistance: 3,
  touchSensitivity: 1.0,
  reducedMotion: false,
};

export const DRAW_DISTANCE_MIN = 1;
export const DRAW_DISTANCE_MAX = 5;
export const TOUCH_SENSITIVITY_MIN = 0.5;
export const TOUCH_SENSITIVITY_MAX = 2.0;

// ---------------------------------------------------------------------------
// Clamping helpers
// ---------------------------------------------------------------------------

/** Clamp a volume value to [0, 1] with 2 decimal precision. */
export function clampVolume(v: number): number {
  return Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
}

/** Clamp draw distance to integer in [1, 5]. */
export function clampDrawDistance(v: number): number {
  return Math.round(Math.min(DRAW_DISTANCE_MAX, Math.max(DRAW_DISTANCE_MIN, v)));
}

/** Clamp touch sensitivity to [0.5, 2.0] with 2 decimal precision. */
export function clampTouchSensitivity(v: number): number {
  return (
    Math.round(Math.min(TOUCH_SENSITIVITY_MAX, Math.max(TOUCH_SENSITIVITY_MIN, v)) * 100) / 100
  );
}

/**
 * Apply a partial update to settings, clamping all numeric fields.
 * Returns a new SettingsValues object.
 */
export function applySettingsUpdate(
  current: SettingsValues,
  partial: Partial<SettingsValues>,
): SettingsValues {
  const merged = { ...current, ...partial };
  return {
    ...merged,
    masterVolume: clampVolume(merged.masterVolume),
    sfxVolume: clampVolume(merged.sfxVolume),
    ambientVolume: clampVolume(merged.ambientVolume),
    drawDistance: clampDrawDistance(merged.drawDistance),
    touchSensitivity: clampTouchSensitivity(merged.touchSensitivity),
  };
}

/** Format a volume (0–1) as a percentage string for display. */
export function formatVolumePct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** Format draw distance as a label. */
export function formatDrawDistance(v: number): string {
  const labels: Record<number, string> = {
    1: "Near",
    2: "Short",
    3: "Medium",
    4: "Far",
    5: "Max",
  };
  return labels[v] ?? `${v}`;
}

/** Format touch sensitivity as a multiplier string. */
export function formatTouchSensitivity(v: number): string {
  return `${v.toFixed(1)}×`;
}
