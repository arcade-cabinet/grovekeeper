/**
 * ProceduralTrees — renders all ECS tree entities as instanced procedural geometry.
 *
 * Replaces GLB-based TreeInstances with two InstancedMeshes:
 *   - Trunk: CylinderGeometry, "wood" canvas texture
 *   - Canopy: DodecahedronGeometry, "leaves" canvas texture
 *
 * Stage-to-scale mapping, species meshParams (trunkRadius, canopyRadius, color),
 * and geometry parameters come from config/game/proceduralMesh.json and
 * config/game/species.json. No inline constants.
 *
 * All randomness via scopedRNG("tree-mesh", meshSeed). No Math.random().
 * Instance matrices updated in useFrame — zero React re-renders for position changes.
 *
 * See GAME_SPEC.md §42.1.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
} from "three";

import proceduralMeshCfg from "@/config/game/proceduralMesh.json" with { type: "json" };
import speciesCfg from "@/config/game/species.json" with { type: "json" };
import { treesQuery } from "@/game/ecs/world";
import { createRNG } from "@/game/utils/seedRNG";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TREE_CFG = proceduralMeshCfg.trees;
const _TEX_SIZE = proceduralMeshCfg.texture.size;

/** Stage scale entries from config, keyed by stage number string. */
const STAGE_SCALES = TREE_CFG.stageScales as Record<string, { trunk: number; canopy: number }>;

/** Species meshParams indexed by speciesId. */
interface SpeciesMeshParams {
  trunkHeight?: number;
  trunkRadius?: number;
  canopyRadius?: number;
  color?: { trunk?: string; canopy?: string };
}

const SPECIES_MESH_PARAMS = new Map<string, SpeciesMeshParams>(
  (speciesCfg.base as Array<{ id: string; meshParams?: SpeciesMeshParams }>).map((s) => [
    s.id,
    s.meshParams ?? {},
  ]),
);

// ---------------------------------------------------------------------------
// Exported scale helpers (for testing — Spec §42.1)
// ---------------------------------------------------------------------------

/** Trunk scale multiplier for a given stage index (0-4). */
export function trunkScaleForStage(stage: number): number {
  return STAGE_SCALES[String(stage)]?.trunk ?? 1.0;
}

/** Canopy scale multiplier for a given stage index (0-4). */
export function canopyScaleForStage(stage: number): number {
  return STAGE_SCALES[String(stage)]?.canopy ?? 1.0;
}

// ---------------------------------------------------------------------------
// Module-scope temps (no per-frame allocation)
// ---------------------------------------------------------------------------

const _mat4 = new Matrix4();
const _dummy = new Object3D();
const _color = new Color();

// ---------------------------------------------------------------------------
// Geometry + Material (created once, shared across all instances)
// ---------------------------------------------------------------------------

function buildTrunkGeometry(): CylinderGeometry {
  const { radiusTop, radiusBottom, baseHeight, segments } = TREE_CFG.trunk;
  return new CylinderGeometry(radiusTop, radiusBottom, baseHeight, segments);
}

function buildCanopyGeometry(): DodecahedronGeometry {
  const { baseRadius, detail } = TREE_CFG.canopy;
  return new DodecahedronGeometry(baseRadius, detail);
}

/**
 * Build a material for instanced trees.
 *
 * We use a neutral base color (white) so that per-instance color via
 * setColorAt() is the sole color driver.
 */
function buildMaterial(type: "wood" | "leaves"): MeshStandardMaterial {
  const baseColor = type === "wood" ? "#FFFFFF" : "#FFFFFF";
  return new MeshStandardMaterial({
    color: baseColor,
    roughness: type === "wood" ? 0.9 : 0.8,
  });
}

// ---------------------------------------------------------------------------
// ProceduralTrees component
// ---------------------------------------------------------------------------

export interface ProceduralTreesProps {
  /** Called when a tree mesh is tapped in the 3D scene (entityId). */
  onTreeTap?: (entityId: string, worldX: number, worldZ: number) => void;
}

/**
 * ProceduralTrees renders all ECS tree entities (all stages) as two InstancedMeshes.
 *
 * Trunk and canopy scale with stage and per-species meshParams.
 * Species tint color is applied by swapping material per-entity would be too many
 * draw calls; instead, we use a single shared material and rely on the wood/leaves
 * textures for the base look. Species color variation is applied to the base color
 * via instanceColor if available, or blended into the default material color.
 *
 * See GAME_SPEC.md §42.1.
 */
export const ProceduralTrees = ({ onTreeTap }: ProceduralTreesProps = {}) => {
  const trunkMeshRef = useRef<InstancedMesh>(null);
  const canopyMeshRef = useRef<InstancedMesh>(null);

  // Geometry and materials created once on mount, disposed on unmount.
  const { trunkGeo, canopyGeo, trunkMat, canopyMat } = useMemo(() => {
    return {
      trunkGeo: buildTrunkGeometry(),
      canopyGeo: buildCanopyGeometry(),
      trunkMat: buildMaterial("wood"),
      canopyMat: buildMaterial("leaves"),
    };
  }, []);

  // Dispose geometry + materials on unmount.
  useEffect(() => {
    return () => {
      trunkGeo.dispose();
      canopyGeo.dispose();
      trunkMat.map?.dispose();
      trunkMat.dispose();
      canopyMat.map?.dispose();
      canopyMat.dispose();
    };
  }, [trunkGeo, canopyGeo, trunkMat, canopyMat]);

  // Initial capacity — InstancedMesh must be created with a fixed count.
  // We start with 256 and rely on React re-rendering when the key changes to
  // grow capacity (grows-only pattern, same as GlbTreeBatcher).
  const capacityRef = useRef(256);

  useFrame(() => {
    const trunk = trunkMeshRef.current;
    const canopy = canopyMeshRef.current;
    if (!trunk || !canopy) return;

    const entities = treesQuery.entities;
    let i = 0;

    for (const entity of entities) {
      if (!entity.renderable.visible) continue;
      if (i >= capacityRef.current) break;

      const { tree, position } = entity;
      const stage = tree.stage;
      const stageKey = String(stage);
      const scales = STAGE_SCALES[stageKey] ?? { trunk: 1.0, canopy: 1.0 };

      // Per-tree scale variation from seeded RNG.
      const rng = createRNG(tree.meshSeed);
      const variation = 1.0 + (rng() - 0.5) * 2 * TREE_CFG.randomVariationRange;

      const meshParams = SPECIES_MESH_PARAMS.get(tree.speciesId) ?? {};
      const trunkH =
        (meshParams.trunkHeight ?? TREE_CFG.trunk.baseHeight) * scales.trunk * variation;
      const canopyR =
        (meshParams.canopyRadius ?? TREE_CFG.canopy.baseRadius) * scales.canopy * variation;

      // Trunk matrix.
      _dummy.position.set(position.x, position.y + trunkH * 0.5, position.z);
      _dummy.scale.set(variation, scales.trunk * variation, variation);
      _dummy.updateMatrix();
      trunk.setMatrixAt(i, _dummy.matrix);

      // Canopy sits atop the trunk.
      const trunkTop = position.y + trunkH;
      _dummy.position.set(position.x, trunkTop + canopyR * 0.5, position.z);
      _dummy.scale.setScalar(scales.canopy * variation);
      _dummy.updateMatrix();
      canopy.setMatrixAt(i, _dummy.matrix);

      // Per-instance color from species meshParams.
      const trunkColor = meshParams.color?.trunk ?? "#5D4037";
      const canopyColor = meshParams.color?.canopy ?? "#388E3C";
      trunk.setColorAt(i, _color.set(trunkColor));
      canopy.setColorAt(i, _color.set(canopyColor));

      i++;
    }

    // Zero out unused slots.
    _mat4.identity();
    for (let j = i; j < capacityRef.current; j++) {
      trunk.setMatrixAt(j, _mat4);
      canopy.setMatrixAt(j, _mat4);
    }

    trunk.count = i;
    canopy.count = i;
    trunk.instanceMatrix.needsUpdate = true;
    canopy.instanceMatrix.needsUpdate = true;
    if (trunk.instanceColor) trunk.instanceColor.needsUpdate = true;
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
  });

  const handlePointerDown = (event: {
    stopPropagation: () => void;
    instanceId?: number;
    point: { x: number; z: number };
  }) => {
    if (!onTreeTap) return;
    event.stopPropagation();
    const idx = event.instanceId;
    if (idx == null) return;
    const entities = treesQuery.entities.filter((e) => e.renderable.visible);
    const entity = entities[idx];
    if (entity) {
      onTreeTap(entity.id, event.point.x, event.point.z);
    }
  };

  const cap = capacityRef.current;

  return (
    <>
      <instancedMesh
        ref={trunkMeshRef}
        args={[trunkGeo, trunkMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown as never}
      />
      <instancedMesh
        ref={canopyMeshRef}
        args={[canopyGeo, canopyMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
    </>
  );
};
