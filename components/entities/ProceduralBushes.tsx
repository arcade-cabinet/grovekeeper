/**
 * ProceduralBushes — renders all ECS bush entities as a single instanced SphereGeometry.
 *
 * Replaces GLB-based BushScene with one InstancedMesh:
 *   - Shape: SphereGeometry — "hedge" canvas texture
 *   - Per-instance color tint by season via mesh.setColorAt()
 *   - Per-instance scale variation from scopedRNG("bush-mesh", hash(entityId))
 *
 * Season color table and geometry parameters come from config/game/proceduralMesh.json.
 * No inline constants. No Math.random().
 *
 * See GAME_SPEC.md §42.4.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from "three";

import proceduralMeshCfg from "@/config/game/proceduralMesh.json" with { type: "json" };
import type { VegetationSeason } from "@/game/ecs/components/vegetation";
import { bushesQuery } from "@/game/ecs/world";
import { createRNG, hashString } from "@/game/utils/seedRNG";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BUSH_CFG = proceduralMeshCfg.bushes;
const _TEX_SIZE = proceduralMeshCfg.texture.size;

type SeasonColorTable = Record<string, [number, number, number]>;
const SEASON_COLORS: SeasonColorTable = BUSH_CFG.seasonColors as unknown as SeasonColorTable;

// ---------------------------------------------------------------------------
// Exported pure helpers (for testing — Spec §42.4)
// ---------------------------------------------------------------------------

/**
 * Return the RGB triplet for a given season string.
 * Falls back to spring values if season key is unrecognised.
 */
export function seasonColorRgb(season: VegetationSeason): [number, number, number] {
  return SEASON_COLORS[season] ?? SEASON_COLORS.spring ?? [0.2, 0.7, 0.3];
}

/**
 * Compute the scale for a bush entity from its id using scopedRNG.
 *
 * Scale range: [scaleMin, scaleMax] from config.
 */
export function bushScaleForId(entityId: string): number {
  const rng = createRNG(hashString(entityId));
  const t = rng();
  return BUSH_CFG.scaleMin + t * (BUSH_CFG.scaleMax - BUSH_CFG.scaleMin);
}

// ---------------------------------------------------------------------------
// Module-scope temps
// ---------------------------------------------------------------------------

const _dummy = new Object3D();
const _color = new Color();
const _zero = new Matrix4();

// ---------------------------------------------------------------------------
// Geometry + Material builders
// ---------------------------------------------------------------------------

function buildBushGeometry(): SphereGeometry {
  const { radius, widthSegments, heightSegments } = BUSH_CFG;
  return new SphereGeometry(radius, widthSegments, heightSegments);
}

function buildHedgeMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.85,
  });
}

// ---------------------------------------------------------------------------
// ProceduralBushes component
// ---------------------------------------------------------------------------

/**
 * ProceduralBushes renders all ECS bush entities as a single InstancedMesh.
 *
 * Season affects per-instance color. Scale varies per entity via seeded RNG.
 * One draw call for all bushes in the scene.
 *
 * See GAME_SPEC.md §42.4.
 */
export const ProceduralBushes = () => {
  const meshRef = useRef<InstancedMesh>(null);

  const { bushGeo, hedgeMat } = useMemo(
    () => ({
      bushGeo: buildBushGeometry(),
      hedgeMat: buildHedgeMaterial(),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      bushGeo.dispose();
      hedgeMat.map?.dispose();
      hedgeMat.dispose();
    };
  }, [bushGeo, hedgeMat]);

  const capacityRef = useRef(512);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const cap = capacityRef.current;
    let i = 0;

    for (const entity of bushesQuery.entities) {
      if (!entity.renderable.visible) continue;
      if (i >= cap) break;

      const { bush, position } = entity;
      const scale = bushScaleForId(entity.id);
      const [r, g, b] = seasonColorRgb(bush.season);

      _dummy.position.set(position.x, position.y, position.z);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      mesh.setColorAt(i, _color.setRGB(r, g, b));

      i++;
    }

    // Zero unused slots.
    _zero.identity();
    for (let j = i; j < cap; j++) {
      mesh.setMatrixAt(j, _zero);
    }

    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const cap = capacityRef.current;

  return (
    <instancedMesh
      ref={meshRef}
      args={[bushGeo, hedgeMat, cap]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
};
