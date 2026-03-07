/**
 * StructureModel — renders a farm structure GLB by StructureComponent.templateId.
 *
 * Loads the correct GLB from config/game/structures.json keyed by templateId.
 * Covers barns, windmills, wells, campfires, houses, storage, and decoration structures.
 *
 * See GAME_SPEC.md §14.
 */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import structuresConfig from "@/config/game/structures.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Config data type
// ---------------------------------------------------------------------------

interface StructureEntry {
  id: string;
  modelPath: string;
}

const STRUCTURE_MAP = new Map<string, StructureEntry>(
  (structuresConfig.structures as StructureEntry[]).map((s) => [s.id, s]),
);

// ---------------------------------------------------------------------------
// Pure mapping function (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB asset path for a given structure templateId using structures.json.
 *
 * Throws if the templateId is unknown — no silent fallbacks (Spec §14 hard rule).
 */
export function resolveStructureGLBPath(templateId: string): string {
  const entry = STRUCTURE_MAP.get(templateId);
  if (!entry) {
    throw new Error(
      `[StructureModel] Unknown templateId: "${templateId}". Check config/game/structures.json.`,
    );
  }
  return entry.modelPath;
}

// ---------------------------------------------------------------------------
// Sub-component (useGLTF called only when mounted — Rules of Hooks)
// ---------------------------------------------------------------------------

interface StructureGLBModelProps {
  glbPath: string;
}

/**
 * Renders a structure GLB via useGLTF.
 *
 * Separate sub-component so useGLTF is only called when this component is mounted.
 * Clones the scene to avoid mutating the shared GLTF cache.
 */
const StructureGLBModel = ({ glbPath }: StructureGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} castShadow receiveShadow />;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StructureModelProps {
  /** Template identifier from config/game/structures.json. */
  templateId: string;
  /** World-space position [x, y, z]. */
  position?: [number, number, number];
  /** Y-axis rotation in radians. */
  rotationY?: number;
}

/**
 * StructureModel renders the GLB for a farm structure identified by templateId.
 *
 * Used for barns, windmills, wells, campfires, houses, storage, and decorations.
 * The templateId is resolved to a modelPath via structures.json — unknown IDs throw.
 *
 * See GAME_SPEC.md §14.
 */
export const StructureModel = ({
  templateId,
  position = [0, 0, 0],
  rotationY = 0,
}: StructureModelProps) => {
  const glbPath = resolveStructureGLBPath(templateId);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <StructureGLBModel glbPath={glbPath} />
    </group>
  );
};
