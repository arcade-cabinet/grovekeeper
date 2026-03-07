/**
 * TreeModel — renders a single tree entity at the correct visual for its growth stage.
 *
 * Stages 0 (Seed) and 1 (Sprout) use hardcoded geometry.
 * Stages 2 (Sapling), 3 (Mature), and 4 (Old Growth) load the species GLB via useGLTF.
 *
 * See GAME_SPEC.md §8.1.
 */

import { useGLTF } from "@react-three/drei";
import speciesConfig from "@/config/game/species.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Species data type
// ---------------------------------------------------------------------------

interface SpeciesEntry {
  id: string;
  glbPath: string;
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TreeGLBModelProps {
  glbPath: string;
  scale: number;
}

/**
 * Renders a GLB tree model via useGLTF.
 *
 * This is a separate component so useGLTF is only called when stage >= 2
 * (i.e. when this component is actually mounted). Rules of Hooks satisfied.
 */
const TreeGLBModel = ({ glbPath, scale }: TreeGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  return <primitive object={scene.clone()} scale={scale} castShadow />;
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
}

/**
 * TreeModel renders the correct visual for a tree at the given growth stage.
 *
 * - Stage 0 (Seed): hardcoded mound geometry
 * - Stage 1 (Sprout): hardcoded stem geometry
 * - Stage 2 (Sapling): species GLB at 0.5x scale
 * - Stage 3 (Mature): species GLB at 1.0x scale
 * - Stage 4 (Old Growth): species GLB at 1.3x scale
 */
export const TreeModel = ({ speciesId, stage, position = [0, 0, 0] }: TreeModelProps) => {
  const scale = STAGE_SCALES[stage] ?? STAGE_SCALES[3];

  return (
    <group position={position}>
      {stage === 0 && <TreeSeedMesh scale={scale} />}
      {stage === 1 && <TreeSproutMesh scale={scale} />}
      {stage >= 2 && <TreeGLBModel glbPath={resolveGLBPath(speciesId)} scale={scale} />}
    </group>
  );
};
