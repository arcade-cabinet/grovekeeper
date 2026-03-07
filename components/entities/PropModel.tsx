/**
 * PropModel — renders a prop or food item GLB by modelPath.
 *
 * Covers all world-placed props (barrels, haybales, kitchen items, traps,
 * weapons, misc) and food items (raw crops). Both PropComponent and
 * FoodComponent carry a modelPath; this component renders it.
 *
 * Pure helper functions exported for testing:
 *   - resolvePropGLBPath(propId)  — unified lookup across all propAssets categories
 *   - resolveFoodGLBPath(foodId)  — crop-based lookup for raw food items
 *
 * See GAME_SPEC.md §14.
 */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import propAssetsConfig from "@/config/game/propAssets.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Config data types
// ---------------------------------------------------------------------------

interface PropEntry {
  id: string;
  path: string;
}

interface PropAssetsConfig {
  structures: PropEntry[];
  crops: PropEntry[];
  kitchen: PropEntry[];
  traps: PropEntry[];
  weapons: PropEntry[];
  misc: PropEntry[];
}

// ---------------------------------------------------------------------------
// Unified prop map — all categories flattened into a single id → path map
// ---------------------------------------------------------------------------

const cfg = propAssetsConfig as PropAssetsConfig;

const ALL_PROP_ENTRIES: PropEntry[] = [
  ...cfg.structures,
  ...cfg.crops,
  ...cfg.kitchen,
  ...cfg.traps,
  ...cfg.weapons,
  ...cfg.misc,
];

const PROP_MAP = new Map<string, string>(
  ALL_PROP_ENTRIES.map((e) => [e.id, e.path]),
);

// Food items are raw crops — keyed by cropId (same as foodId for raw items)
const FOOD_MAP = new Map<string, string>(
  cfg.crops.map((e) => [e.id, e.path]),
);

// ---------------------------------------------------------------------------
// Pure mapping functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB asset path for a world prop by propId.
 *
 * Searches all categories in config/game/propAssets.json.
 * Throws for unknown propIds — no silent fallbacks (Spec §14 hard rule).
 */
export function resolvePropGLBPath(propId: string): string {
  const path = PROP_MAP.get(propId);
  if (!path) {
    throw new Error(
      `[PropModel] Unknown propId: "${propId}". Check config/game/propAssets.json.`,
    );
  }
  return path;
}

/**
 * Resolve the GLB asset path for a raw food item by foodId.
 *
 * Raw food items (apple, carrot, cucumber, pumpkin, tomato) map to crop GLBs.
 * Throws for unknown foodIds — no silent fallbacks (Spec §14 hard rule).
 */
export function resolveFoodGLBPath(foodId: string): string {
  const path = FOOD_MAP.get(foodId);
  if (!path) {
    throw new Error(
      `[PropModel] Unknown foodId: "${foodId}". Check config/game/propAssets.json crops.`,
    );
  }
  return path;
}

// ---------------------------------------------------------------------------
// Sub-component (useGLTF called only when mounted — Rules of Hooks)
// ---------------------------------------------------------------------------

interface PropGLBModelProps {
  glbPath: string;
}

/**
 * Renders a prop GLB via useGLTF.
 *
 * Separate sub-component so useGLTF is only called when this component is mounted.
 * Clones the scene to avoid mutating the shared GLTF cache.
 */
const PropGLBModel = ({ glbPath }: PropGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} castShadow receiveShadow />;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PropModelProps {
  /** Resolved GLB path from PropComponent.modelPath or FoodComponent.modelPath. */
  modelPath: string;
  /** World-space position [x, y, z]. */
  position?: [number, number, number];
  /** Y-axis rotation in radians. */
  rotationY?: number;
}

/**
 * PropModel renders a GLB for a world prop or food item.
 *
 * Pass the modelPath from either a PropComponent or a FoodComponent entity.
 * For PropComponent with an unset modelPath, resolve it first via resolvePropGLBPath(propId).
 * For FoodComponent, use modelPath directly (always set) or resolveFoodGLBPath(foodId) for raw foods.
 *
 * See GAME_SPEC.md §14.
 */
export const PropModel = ({
  modelPath,
  position = [0, 0, 0],
  rotationY = 0,
}: PropModelProps) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <PropGLBModel glbPath={modelPath} />
    </group>
  );
};
