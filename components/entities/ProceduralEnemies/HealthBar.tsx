/**
 * HealthBar — billboard health bar rendered above a damaged enemy.
 *
 * Hidden when hp === maxHp. Non-interactive (raycast null).
 * Exported pure function computeHealthBarColor is tested independently.
 *
 * See GAME_SPEC.md §20.
 */

import { useMemo } from "react";
import { PlaneGeometry } from "three";

// ---------------------------------------------------------------------------
// Shared geometry (module-scope — created once)
// ---------------------------------------------------------------------------

const GEO_PLANE_HP_BG = new PlaneGeometry(1.0, 0.08);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HP_BAR_WIDTH = 1.0;
const HP_BAR_HEIGHT = 0.08;
const HP_BAR_BG_COLOR = "#333333";

// ---------------------------------------------------------------------------
// Pure utility (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute the health bar fill color interpolated from red (0%) to green (100%).
 *
 * @param hp      Current hit points.
 * @param maxHp   Maximum hit points.
 * @returns       A hex color string, e.g. `"#ff0000"`.
 */
export function computeHealthBarColor(hp: number, maxHp: number): string {
  const ratio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / maxHp));
  const r = Math.round(255 * (1 - ratio));
  const g = Math.round(255 * ratio);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}00`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface HealthBarProps {
  hp: number;
  maxHp: number;
  position: [number, number, number];
}

/** Billboard health bar rendered above an enemy. Hidden at full health. */
export const HealthBar = ({ hp, maxHp, position }: HealthBarProps) => {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const fillWidth = HP_BAR_WIDTH * ratio;
  const color = computeHealthBarColor(hp, maxHp);
  if (hp >= maxHp) return null;

  // biome-ignore lint/correctness/useHookAtTopLevel: this is a component function
  const fillGeo = useMemo(() => new PlaneGeometry(fillWidth, HP_BAR_HEIGHT), [fillWidth]);

  return (
    <group position={position}>
      <mesh
        geometry={GEO_PLANE_HP_BG}
        // biome-ignore lint/suspicious/noExplicitAny: drei type compat
        raycast={() => null as any}
      >
        <meshBasicMaterial color={HP_BAR_BG_COLOR} transparent opacity={0.7} />
      </mesh>
      <mesh
        geometry={fillGeo}
        position={[-(HP_BAR_WIDTH - fillWidth) / 2, 0, 0.001]}
        // biome-ignore lint/suspicious/noExplicitAny: drei type compat
        raycast={() => null as any}
      >
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};
