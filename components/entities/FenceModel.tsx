/**
 * FenceModel — renders a fence segment GLB by FenceComponent.fenceType + variant.
 *
 * Covers all 7 fence types: brick, drystone, wooden, metal, plackard, plaster, picket.
 * Supports auto-connect: when `connections` prop is provided, automatically selects
 * the correct variant (straight/corner/isolated) and rotation based on adjacent fences.
 *
 * See GAME_SPEC.md §14.
 */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { FenceType } from "@/game/ecs/components/terrain";
import fencesConfig from "@/config/game/fences.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Config data type
// ---------------------------------------------------------------------------

interface FenceEntry {
  fenceType: string;
  variant: string;
  modelPath: string;
}

/** Map keyed by "{fenceType}:{variant}" → modelPath */
const FENCE_MAP = new Map<string, string>(
  (fencesConfig.fences as FenceEntry[]).map((f) => [
    `${f.fenceType}:${f.variant}`,
    f.modelPath,
  ]),
);

// ---------------------------------------------------------------------------
// Auto-connect types and helpers
// ---------------------------------------------------------------------------

/** Which cardinal neighbors have a fence placed adjacent to this one. */
export interface FenceConnections {
  north?: boolean;
  south?: boolean;
  east?: boolean;
  west?: boolean;
}

/**
 * Select the best-fit variant for the given fence type and neighbor connectivity.
 *
 * Prefers corner pieces when available (brick, plackard).
 * Falls back to straight piece for all other topologies.
 * Returns isolated/pole piece when no neighbors are connected.
 *
 * See GAME_SPEC.md §14.
 */
export function resolveConnectedVariant(
  fenceType: FenceType,
  connections: FenceConnections,
): string {
  const n = connections.north ?? false;
  const s = connections.south ?? false;
  const e = connections.east ?? false;
  const w = connections.west ?? false;
  const count = [n, s, e, w].filter(Boolean).length;
  const isCorner = (n || s) && (e || w) && count === 2;

  switch (fenceType) {
    case "brick":
      if (count === 0) return "brick_wall_pole";
      if (count === 1) return "brick_wall_small";
      if (isCorner) return "brick_Wall_corner";
      return "brick_wall";

    case "drystone":
      if (count === 0) return "drystone_column";
      return "drystone_wall";

    case "wooden":
      if (count === 0) return "wooden_fence_pole";
      return "wooden_fence_closed";

    case "metal":
      if (count === 0) return "metalfence_one_side_no_topbar";
      return "metalfence_both_sides_topbar";

    case "plackard":
      if (count === 0 || count === 1) return "plackard_slab_single";
      if (isCorner) return "plackard_corner";
      return "plackard_closed";

    case "plaster":
      if (count === 0) return "plaster_wall_column";
      return "plaster_wall";

    case "picket":
      if (count === 0) return "white_picket_fence_pole";
      return "white_picket_fence_closed_left";
  }
}

/**
 * Determine the Y-axis rotation (radians) for the fence piece given its connections.
 *
 * East-West aligned segments rotate 90° (π/2). All other topologies use 0.
 */
export function resolveConnectedRotation(connections: FenceConnections): number {
  const n = connections.north ?? false;
  const s = connections.south ?? false;
  const e = connections.east ?? false;
  const w = connections.west ?? false;
  const isEWAligned = (e || w) && !(n || s);
  return isEWAligned ? Math.PI / 2 : 0;
}

// ---------------------------------------------------------------------------
// Pure mapping function (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB asset path for a fence by type and variant, using fences.json.
 *
 * Throws if the combination is unknown — no silent fallbacks (Spec §14 hard rule).
 */
export function resolveFenceGLBPath(fenceType: FenceType, variant: string): string {
  const key = `${fenceType}:${variant}`;
  const path = FENCE_MAP.get(key);
  if (!path) {
    throw new Error(
      `[FenceModel] Unknown fence type/variant: "${fenceType}:${variant}". Check config/game/fences.json.`,
    );
  }
  return path;
}

// ---------------------------------------------------------------------------
// Sub-component (useGLTF called only when mounted — Rules of Hooks)
// ---------------------------------------------------------------------------

interface FenceGLBModelProps {
  glbPath: string;
}

/**
 * Renders a fence GLB via useGLTF.
 *
 * Separate sub-component so useGLTF is only called when this component is mounted.
 * Clones the scene to avoid mutating the shared GLTF cache.
 */
const FenceGLBModel = ({ glbPath }: FenceGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} castShadow receiveShadow />;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FenceModelProps {
  /** Fence material type. */
  fenceType: FenceType;
  /**
   * Specific variant name — must match a variant in fences.json for this fenceType.
   * Ignored when `connections` is provided (auto-connect mode selects variant automatically).
   */
  variant: string;
  /** World-space position [x, y, z]. */
  position?: [number, number, number];
  /**
   * Y-axis rotation in radians. Ignored when `connections` is provided
   * (auto-connect mode computes rotation from neighbor topology).
   */
  rotationY?: number;
  /**
   * Optional adjacency map. When provided, FenceModel auto-selects the correct
   * variant and rotation based on which neighbors also have fences placed.
   */
  connections?: FenceConnections;
}

/**
 * FenceModel renders the GLB for a fence segment.
 *
 * When `connections` is provided, auto-connect mode selects the best variant
 * (straight, corner, isolated) and rotation for the given neighbor topology.
 * Without `connections`, the explicit `variant` and `rotationY` are used directly.
 *
 * See GAME_SPEC.md §14.
 */
export const FenceModel = ({
  fenceType,
  variant,
  position = [0, 0, 0],
  rotationY = 0,
  connections,
}: FenceModelProps) => {
  const resolvedVariant = connections
    ? resolveConnectedVariant(fenceType, connections)
    : variant;
  const resolvedRotationY = connections
    ? resolveConnectedRotation(connections)
    : rotationY;
  const glbPath = resolveFenceGLBPath(fenceType, resolvedVariant);

  return (
    <group position={position} rotation={[0, resolvedRotationY, 0]}>
      <FenceGLBModel glbPath={glbPath} />
    </group>
  );
};
