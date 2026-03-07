/**
 * TreeModel — renders a single tree entity at the correct visual for its growth stage.
 *
 * Stages 0 (Seed) and 1 (Sprout) use hardcoded geometry.
 * Stages 2 (Sapling), 3 (Mature), and 4 (Old Growth) load the species GLB via useGLTF.
 * Applies seasonTint to GLB materials. Swaps to winterModel when isWinter + useWinterModel.
 *
 * See GAME_SPEC.md §8.1, §6.3.
 */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import speciesConfig from "@/config/game/species.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Species data type
// ---------------------------------------------------------------------------

interface SpeciesEntry {
  id: string;
  glbPath: string;
  winterModel: string;
  useWinterModel: boolean;
}

const ALL_SPECIES: SpeciesEntry[] = [
  ...(speciesConfig.base as SpeciesEntry[]),
  ...(speciesConfig.prestige as SpeciesEntry[]),
];

// ---------------------------------------------------------------------------
// Constants (Spec §8.1)
// ---------------------------------------------------------------------------

/**
 * Scale multipliers per growth stage (Spec §8.1).
 * Stages 0-1 use procedural geometry; 2-4 use the species GLB.
 */
export const STAGE_SCALES: Readonly<Record<number, number>> = {
  0: 0.05,
  1: 0.15,
  2: 0.5,
  3: 1.0,
  4: 1.3,
};

/** Highest stage index that uses hardcoded geometry (not a GLB). */
export const PROCEDURAL_STAGE_MAX = 1;

// ---------------------------------------------------------------------------
// Pure mapping function (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB asset path for a given speciesId using species.json config.
 *
 * Throws if the speciesId is unknown — no silent fallbacks (Spec §8.1 hard rule).
 */
export function resolveGLBPath(speciesId: string): string {
  const species = ALL_SPECIES.find((s) => s.id === speciesId);
  if (!species) {
    throw new Error(
      `[TreeModel] Unknown speciesId: "${speciesId}". Check config/game/species.json.`,
    );
  }
  return species.glbPath;
}

/**
 * Resolve the correct GLB path for a tree, swapping to the winter variant
 * when isWinter=true AND the species has useWinterModel=true (Spec §6.3).
 */
export function resolveModelPath(speciesId: string, isWinter: boolean): string {
  const species = ALL_SPECIES.find((s) => s.id === speciesId);
  if (!species) {
    throw new Error(
      `[TreeModel] Unknown speciesId: "${speciesId}". Check config/game/species.json.`,
    );
  }
  if (isWinter && species.useWinterModel) {
    return species.winterModel;
  }
  return species.glbPath;
}

/**
 * Returns whether the given species swaps to a dedicated winter GLB (Spec §6.3).
 * Throws if the speciesId is unknown.
 */
export function getSpeciesUseWinterModel(speciesId: string): boolean {
  const species = ALL_SPECIES.find((s) => s.id === speciesId);
  if (!species) {
    throw new Error(
      `[TreeModel] Unknown speciesId: "${speciesId}". Check config/game/species.json.`,
    );
  }
  return species.useWinterModel;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TreeGLBModelProps {
  glbPath: string;
  scale: number;
  tintColor?: string;
}

/**
 * Renders a GLB tree model via useGLTF.
 *
 * This is a separate component so useGLTF is only called when stage >= 2
 * (i.e. when this component is actually mounted). Rules of Hooks satisfied.
 *
 * tintColor applies a color override to all MeshStandardMaterial in the scene
 * by cloning materials — preserves the useGLTF cache (Spec §6.3).
 */
const TreeGLBModel = ({ glbPath, scale, tintColor }: TreeGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
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
  return <primitive object={cloned} scale={scale} castShadow />;
};

interface TreeSeedMeshProps {
  scale: number;
}

/** Tiny mound geometry for Seed stage (Spec §8.1 stage 0). */
const TreeSeedMesh = ({ scale }: TreeSeedMeshProps) => (
  <mesh scale={scale} castShadow>
    <sphereGeometry args={[0.15, 8, 6]} />
    <meshStandardMaterial color="#795548" roughness={0.9} />
  </mesh>
);

interface TreeSproutMeshProps {
  scale: number;
}

/** Small stem geometry for Sprout stage (Spec §8.1 stage 1). */
const TreeSproutMesh = ({ scale }: TreeSproutMeshProps) => (
  <mesh scale={scale} castShadow>
    <cylinderGeometry args={[0.04, 0.06, 0.3, 8]} />
    <meshStandardMaterial color="#4CAF50" roughness={0.8} />
  </mesh>
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TreeModelProps {
  /** Species identifier from config/game/species.json. */
  speciesId: string;
  /** Growth stage 0-4 (Spec §8.1). */
  stage: 0 | 1 | 2 | 3 | 4;
  /** World-space position [x, y, z]. */
  position?: [number, number, number];
  /**
   * Hex color tint applied to all MeshStandardMaterial in the GLB (Spec §6.3).
   * Set by the seasonal system via TreeComponent.seasonTint.
   * Stages 0 and 1 (procedural geometry) ignore this — their colors are hardcoded.
   */
  seasonTint?: string;
  /**
   * When true and the species has useWinterModel=true, renders the winter GLB
   * variant instead of the base model (Spec §6.3).
   */
  isWinter?: boolean;
}

/**
 * TreeModel renders the correct visual for a tree at the given growth stage.
 *
 * - Stage 0 (Seed): hardcoded mound geometry
 * - Stage 1 (Sprout): hardcoded stem geometry
 * - Stage 2 (Sapling): species GLB at 0.5x scale, with optional seasonTint + winter swap
 * - Stage 3 (Mature): species GLB at 1.0x scale, with optional seasonTint + winter swap
 * - Stage 4 (Old Growth): species GLB at 1.3x scale, with optional seasonTint + winter swap
 */
export const TreeModel = ({
  speciesId,
  stage,
  position = [0, 0, 0],
  seasonTint,
  isWinter = false,
}: TreeModelProps) => {
  const scale = STAGE_SCALES[stage] ?? STAGE_SCALES[3];
  const glbPath = stage >= 2 ? resolveModelPath(speciesId, isWinter) : "";

  return (
    <group position={position}>
      {stage === 0 && <TreeSeedMesh scale={scale} />}
      {stage === 1 && <TreeSproutMesh scale={scale} />}
      {stage >= 2 && (
        <TreeGLBModel glbPath={glbPath} scale={scale} tintColor={seasonTint} />
      )}
    </group>
  );
};
