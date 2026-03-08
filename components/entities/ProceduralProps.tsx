/**
 * ProceduralProps — renders all ECS prop entities as instanced procedural geometry.
 *
 * Replaces GLB-based PropInstances with per-type InstancedMeshes:
 *   - barrel: CylinderGeometry — wood texture
 *   - crate:  BoxGeometry — wood texture
 *   - default: CylinderGeometry — stone texture
 *
 * Prop type is inferred from entity.prop.modelPath string content.
 * Each type has its own InstancedMesh (one draw call per prop type).
 *
 * Geometry parameters from config/game/proceduralMesh.json.
 * No inline constants. No Math.random().
 *
 * See GAME_SPEC.md §42.3.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
} from "three";

import proceduralMeshCfg from "@/config/game/proceduralMesh.json" with { type: "json" };
import { propsQuery } from "@/game/ecs/world";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROP_CFG = proceduralMeshCfg.props;
const _TEX_SIZE = proceduralMeshCfg.texture.size;

// ---------------------------------------------------------------------------
// Prop type inference
// ---------------------------------------------------------------------------

export type PropType = "barrel" | "crate" | "default";

/**
 * Infer prop type from modelPath string.
 *
 * Exported as a pure function for unit testing (Spec §42.3).
 * Checks for "barrel" and "crate" substrings. Everything else is "default".
 */
export function inferPropType(modelPath: string | undefined): PropType {
  if (!modelPath) return "default";
  const lower = modelPath.toLowerCase();
  if (lower.includes("barrel")) return "barrel";
  if (lower.includes("crate")) return "crate";
  return "default";
}

// ---------------------------------------------------------------------------
// Module-scope temps
// ---------------------------------------------------------------------------

const _dummy = new Object3D();
const _zero = new Matrix4();

// ---------------------------------------------------------------------------
// Geometry + Material builders
// ---------------------------------------------------------------------------

function buildBarrelGeometry(): CylinderGeometry {
  const { radiusTop, radiusBottom, height, segments } = PROP_CFG.barrel;
  return new CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

function buildCrateGeometry(): BoxGeometry {
  const { width, height, depth } = PROP_CFG.crate;
  return new BoxGeometry(width, height, depth);
}

function buildDefaultGeometry(): CylinderGeometry {
  const { radiusTop, radiusBottom, height, segments } = PROP_CFG.default;
  return new CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

function buildMaterial(type: "wood" | "stone"): MeshStandardMaterial {
  const baseColor = type === "wood" ? "#8B6914" : "#888888";
  return new MeshStandardMaterial({
    color: baseColor,
    roughness: type === "wood" ? 0.9 : 0.7,
  });
}

// ---------------------------------------------------------------------------
// ProceduralProps component
// ---------------------------------------------------------------------------

/**
 * ProceduralProps renders all ECS prop entities as per-type InstancedMeshes.
 *
 * Props are classified by modelPath into barrel / crate / default.
 * Each type gets one InstancedMesh, giving at most 3 draw calls for all world props.
 *
 * See GAME_SPEC.md §42.3.
 */
export const ProceduralProps = () => {
  const barrelRef = useRef<InstancedMesh>(null);
  const crateRef = useRef<InstancedMesh>(null);
  const defaultRef = useRef<InstancedMesh>(null);

  const { barrelGeo, crateGeo, defaultGeo, woodMat, stoneMat } = useMemo(
    () => ({
      barrelGeo: buildBarrelGeometry(),
      crateGeo: buildCrateGeometry(),
      defaultGeo: buildDefaultGeometry(),
      woodMat: buildMaterial("wood"),
      stoneMat: buildMaterial("stone"),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      barrelGeo.dispose();
      crateGeo.dispose();
      defaultGeo.dispose();
      woodMat.map?.dispose();
      woodMat.dispose();
      stoneMat.map?.dispose();
      stoneMat.dispose();
    };
  }, [barrelGeo, crateGeo, defaultGeo, woodMat, stoneMat]);

  const capacityRef = useRef(128);

  useFrame(() => {
    const barrel = barrelRef.current;
    const crate = crateRef.current;
    const def = defaultRef.current;
    if (!barrel || !crate || !def) return;

    const cap = capacityRef.current;
    let bi = 0;
    let ci = 0;
    let di = 0;

    for (const entity of propsQuery.entities) {
      const propType = inferPropType(entity.prop.modelPath);
      const { position } = entity;
      const rotY = entity.rotationY ?? 0;

      _dummy.position.set(position.x, position.y, position.z);
      _dummy.rotation.set(0, rotY, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();

      if (propType === "barrel" && bi < cap) {
        barrel.setMatrixAt(bi, _dummy.matrix);
        bi++;
      } else if (propType === "crate" && ci < cap) {
        crate.setMatrixAt(ci, _dummy.matrix);
        ci++;
      } else if (di < cap) {
        def.setMatrixAt(di, _dummy.matrix);
        di++;
      }
    }

    // Zero out unused slots.
    _zero.identity();
    for (let j = bi; j < cap; j++) barrel.setMatrixAt(j, _zero);
    for (let j = ci; j < cap; j++) crate.setMatrixAt(j, _zero);
    for (let j = di; j < cap; j++) def.setMatrixAt(j, _zero);

    barrel.count = bi;
    crate.count = ci;
    def.count = di;
    barrel.instanceMatrix.needsUpdate = true;
    crate.instanceMatrix.needsUpdate = true;
    def.instanceMatrix.needsUpdate = true;
  });

  const cap = capacityRef.current;

  return (
    <>
      <instancedMesh
        ref={barrelRef}
        args={[barrelGeo, woodMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={crateRef}
        args={[crateGeo, woodMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={defaultRef}
        args={[defaultGeo, stoneMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
    </>
  );
};
