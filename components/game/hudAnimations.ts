/**
 * hudAnimations -- Reusable animation utilities for HUD components.
 *
 * Pure utility functions + Animated helpers for:
 * - Stamina arc path calculation (SVG)
 * - Spirit proximity glow intensity
 * - Hearts shake offset
 * - Temperature extremes detection
 */

/**
 * Generate an SVG arc path for a circular stamina ring.
 *
 * @param cx     Center X of the circle.
 * @param cy     Center Y of the circle.
 * @param radius Radius of the arc.
 * @param fraction  Fill fraction 0..1 (1 = full circle).
 * @returns SVG path `d` attribute string, or empty string if fraction <= 0.
 */
export function staminaArcPath(cx: number, cy: number, radius: number, fraction: number): string {
  if (fraction <= 0) return "";
  if (fraction >= 1) {
    // Full circle: two half-arcs to avoid SVG zero-length arc issue
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
    ].join(" ");
  }

  const startAngle = -Math.PI / 2; // 12 o'clock
  const endAngle = startAngle + fraction * 2 * Math.PI;
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = fraction > 0.5 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/**
 * Calculate glow intensity based on distance to nearest spirit.
 * Closer = brighter. Returns 0 when out of range.
 *
 * @param distance  Distance in world units to nearest spirit.
 * @param maxRange  Maximum detection range (default 20).
 * @returns Glow intensity 0..1 (1 = spirit is right next to player).
 */
export function spiritGlowIntensity(distance: number, maxRange = 20): number {
  if (distance <= 0) return 1;
  if (distance >= maxRange) return 0;
  // Inverse quadratic for more dramatic close-range glow
  const t = 1 - distance / maxRange;
  return t * t;
}

/**
 * Determine if body temperature is in an extreme range.
 *
 * @param bodyTemp  Player body temperature in celsius.
 * @returns "cold" | "hot" | null
 */
export function temperatureExtreme(bodyTemp: number): "cold" | "hot" | null {
  if (bodyTemp < 30) return "cold";
  if (bodyTemp > 80) return "hot";
  return null;
}

/**
 * Distance between two 2D points (for spirit proximity).
 */
export function distance2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Compass bearing in degrees from player to target.
 * 0 = North (-Z axis), 90 = East (+X), 180 = South (+Z), 270 = West (-X).
 */
export function resolveCompassBearing(
  playerX: number,
  playerZ: number,
  targetX: number,
  targetZ: number,
): number {
  const dx = targetX - playerX;
  const dz = targetZ - playerZ;
  const angle = Math.atan2(dx, -dz) * (180 / Math.PI);
  return ((angle % 360) + 360) % 360;
}

/**
 * Returns the world-space position of the nearest undiscovered Grovekeeper
 * spirit, or null when all spirits are discovered or none exist in the world.
 */
export function findNearestUndiscoveredSpirit(
  spirits: ReadonlyArray<{
    position: { x: number; z: number };
    grovekeeperSpirit: { discovered: boolean };
  }>,
  playerX: number,
  playerZ: number,
): { x: number; z: number; distance: number } | null {
  let nearest: { x: number; z: number; distance: number } | null = null;
  let minDist = Infinity;
  for (const s of spirits) {
    if (s.grovekeeperSpirit.discovered) continue;
    const dist = distance2D(playerX, playerZ, s.position.x, s.position.z);
    if (dist < minDist) {
      minDist = dist;
      nearest = { x: s.position.x, z: s.position.z, distance: dist };
    }
  }
  return nearest;
}
