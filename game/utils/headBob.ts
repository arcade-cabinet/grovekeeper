/**
 * headBob.ts — Pure head bob computation for FPS camera (Spec §9).
 *
 * Produces a vertical offset to add to camera eye height each frame,
 * creating a subtle walking oscillation when the player is moving.
 *
 * All tuning values loaded from config/game/input.json.
 */

import inputConfig from "@/config/game/input.json" with { type: "json" };

const { frequencyHz, amplitudeMeters, minSpeedThreshold } = inputConfig.headBob;

/**
 * Computes the vertical head bob offset for the current frame.
 *
 * @param elapsedTime - Total elapsed time in seconds (e.g., from Three.js Clock).
 * @param speed - Current horizontal movement speed (magnitude of moveX/moveZ vector).
 * @returns Vertical offset in meters to add to camera Y position.
 *          Returns 0 when speed is at or below the minimum threshold.
 */
export function computeHeadBob(elapsedTime: number, speed: number): number {
  if (speed <= minSpeedThreshold) return 0;
  return Math.sin(2 * Math.PI * frequencyHz * elapsedTime) * amplitudeMeters;
}
