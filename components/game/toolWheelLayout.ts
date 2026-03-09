/**
 * toolWheelLayout -- Pure radial layout math for the ToolWheel.
 *
 * Computes (x, y) positions for tools arranged in a circle.
 * Spec S11: Tool selector radial/pie layout.
 */

export interface RadialPosition {
  /** X offset from center (px). */
  x: number;
  /** Y offset from center (px). */
  y: number;
  /** Angle in degrees (0 = top, clockwise). */
  angleDeg: number;
}

/**
 * Compute positions for `count` items arranged evenly around a circle.
 *
 * @param count   Number of items.
 * @param radius  Circle radius in px.
 * @param offsetDeg  Starting angle offset in degrees (default -90 = top).
 * @returns Array of RadialPosition, one per item.
 */
export function computeRadialPositions(
  count: number,
  radius: number,
  offsetDeg = -90,
): RadialPosition[] {
  if (count <= 0) return [];
  const positions: RadialPosition[] = [];
  const step = (2 * Math.PI) / count;
  const offsetRad = (offsetDeg * Math.PI) / 180;

  for (let i = 0; i < count; i++) {
    const angle = offsetRad + i * step;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const angleDeg = ((angle * 180) / Math.PI + 360) % 360;
    positions.push({ x, y, angleDeg });
  }

  return positions;
}

/**
 * Map tool IDs to emoji icons for the radial wheel.
 * Used as a visual fallback when Lucide icons aren't suitable for the pie layout.
 */
export const TOOL_EMOJI: Record<string, string> = {
  trowel: "\u{1F33F}", // herb
  "watering-can": "\u{1F4A7}", // droplet
  almanac: "\u{1F4D6}", // open book
  "pruning-shears": "\u2702\uFE0F", // scissors
  "seed-pouch": "\u{1F331}", // seedling
  shovel: "\u26CF\uFE0F", // pick
  axe: "\u{1FA93}", // axe
  "compost-bin": "\u267B\uFE0F", // recycle
  "rain-catcher": "\u{1F327}\uFE0F", // rain
  "fertilizer-spreader": "\u2728", // sparkles
  scarecrow: "\u{1F6E1}\uFE0F", // shield
  "grafting-tool": "\u{1FA9A}", // carpentry saw
};
