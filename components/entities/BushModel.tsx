/**
 * BushModel — renders a seasonal bush GLB, swapping the model when season changes.
 *
 * Every bush always renders a GLB (no procedural fallback stages).
 * The GLB path is derived from bushShape + season: `assets/models/bushes/{shape}_{season}.glb`.
 * 52 shapes × 5 seasons = 260 combinations (Spec §6.3, §8).
 *
 * See GAME_SPEC.md §6.3, §8.
 */

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import vegetationConfig from "@/config/game/vegetation.json" with { type: "json" };
import type { VegetationSeason } from "@/game/ecs/components/vegetation";
import { resolveAssetUrl } from "@/game/utils/resolveAssetUrl";

// ---------------------------------------------------------------------------
// Constants (Spec §6.3)
// ---------------------------------------------------------------------------

/** All valid seasons — matches VegetationSeason union type. */
export const VALID_SEASONS: readonly VegetationSeason[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "dead",
];

/** All valid bush shape identifiers from vegetation.json (Spec §8). */
export const VALID_BUSH_SHAPES: readonly string[] = vegetationConfig.bushShapes as string[];

// ---------------------------------------------------------------------------
// Pure mapping functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Build the model key for a given bushShape + season combination.
 * Pattern: `{bushShape}_{season}` (Spec §8).
 */
export function buildModelKey(bushShape: string, season: VegetationSeason): string {
  return `${bushShape}_${season}`;
}

/**
 * Resolve the GLB asset path for a bush given its shape and season.
 *
 * Throws if the bushShape is unknown — no silent fallbacks (Spec §8 hard rule).
 * Path convention: `assets/models/bushes/{bushShape}_{season}.glb`
 */
export function resolveBushGLBPath(bushShape: string, season: VegetationSeason): string {
  if (!VALID_BUSH_SHAPES.includes(bushShape)) {
    throw new Error(
      `[BushModel] Unknown bushShape: "${bushShape}". Check config/game/vegetation.json bushShapes.`,
    );
  }
  return `assets/models/bushes/${season}/${buildModelKey(bushShape, season)}.glb`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BushGLBModelProps {
  glbPath: string;
  tintColor?: string;
}

/**
 * Renders a GLB bush via useGLTF.
 *
 * Separated from BushModel so useGLTF is only called when this component is
 * mounted (Rules of Hooks). Clones the scene so material tints don't pollute
 * the useGLTF cache.
 */
const BushGLBModel = ({ glbPath, tintColor }: BushGLBModelProps) => {
  const { scene } = useGLTF(resolveAssetUrl(glbPath));
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    if (tintColor) {
      s.traverse((obj) => {
        if (!(obj instanceof Mesh)) return;
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => {
            if (m instanceof MeshStandardMaterial) {
              const c = m.clone();
              c.color.set(tintColor);
              return c;
            }
            return m;
          });
        } else if (obj.material instanceof MeshStandardMaterial) {
          const c = obj.material.clone();
          c.color.set(tintColor);
          obj.material = c;
        }
      });
    }
    return s;
  }, [scene, tintColor]);
  return <primitive object={cloned} castShadow />;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BushModelProps {
  /** Bush shape identifier — must match a key in vegetation.json bushShapes. */
  bushShape: string;
  /** Current season — determines which GLB variant to render (Spec §6.3). */
  season: VegetationSeason;
  /** World-space position [x, y, z]. */
  position?: [number, number, number];
  /**
   * Optional hex color tint applied to all MeshStandardMaterial in the GLB.
   * Useful for additional seasonal tinting on top of the seasonal GLB swap.
   */
  tintColor?: string;
}

/**
 * BushModel renders the correct GLB for a bush at the given season.
 *
 * When season changes, the GLB path changes and a new model is rendered.
 * Supports 52 shapes × 5 seasons = 260 bush variations (Spec §6.3, §8).
 */
export const BushModel = ({
  bushShape,
  season,
  position = [0, 0, 0],
  tintColor,
}: BushModelProps) => {
  const glbPath = resolveBushGLBPath(bushShape, season);

  return (
    <group position={position}>
      <BushGLBModel glbPath={glbPath} tintColor={tintColor} />
    </group>
  );
};
