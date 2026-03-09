/**
 * ProceduralBuilding — Renders a single procedural building as one merged mesh.
 *
 * Calls generateBuildingBoxes() for structure, generateBlueprintInterior() for
 * furnishings, and generateBlueprintOpenings() for doors/windows. All merged
 * into a single BufferGeometry with vertex colors — one draw call per building.
 * Wraps in a fixed Rapier RigidBody + TrimeshCollider for physics.
 *
 * Colors read from config/game/structures.json proceduralBuilding.colors.
 * Spec §42 (Procedural Architecture), §43 (Town Generation).
 */

import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  type Mesh,
  type MeshStandardMaterial,
} from "three";

import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import type { BlueprintId } from "@/game/ecs/components/structures";
import { getPBRMaterial } from "@/game/materials/PBRMaterialCache";
import type { BoxMatType, BoxSpec } from "@/game/systems/buildingGeometry";
import {
  buildColliderArrays,
  generateBlueprintInterior,
  generateBlueprintOpenings,
  generateBuildingBoxes,
} from "@/game/systems/buildingGeometry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLOR_CFG = structuresConfig.proceduralBuilding.colors;

/**
 * Map a BoxSpec material tag + building materialType to an [r, g, b] triplet.
 * Wall color depends on whether the building is brick, plaster, or timber.
 * Extended for §43.3 interior/opening material types.
 */
function resolveBoxColor(
  mat: BoxMatType,
  materialType: "brick" | "plaster" | "timber",
): [number, number, number] {
  switch (mat) {
    case "wall":
      return COLOR_CFG[materialType] as [number, number, number];
    case "timber_wall":
      return COLOR_CFG.timber as [number, number, number];
    case "floor":
      return COLOR_CFG.floor as [number, number, number];
    case "stair":
      return COLOR_CFG.stair as [number, number, number];
    case "roof":
      return COLOR_CFG.roof as [number, number, number];
    case "furniture":
      return COLOR_CFG.furniture as [number, number, number];
    case "chimney":
      return COLOR_CFG.chimney as [number, number, number];
    case "hay":
      return COLOR_CFG.hay as [number, number, number];
    case "door":
      return COLOR_CFG.door as [number, number, number];
    case "window":
      return COLOR_CFG.window as [number, number, number];
  }
}

/**
 * CUBE_FACES_POSITIONS — local offsets for the 36 vertex positions of a unit
 * cube's 12 triangles (6 faces × 2 tris). Each row is [dx, dy, dz] where
 * each value is -1 or +1 (half-extents multiplier).
 *
 * Winding order: counter-clockwise from outside (standard Three.js).
 */
// prettier-ignore
const CUBE_FACE_VERTS: Array<[number, number, number]> = [
  // front (z+)
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
  // back (z-)
  [1, -1, -1],
  [-1, -1, -1],
  [-1, 1, -1],
  [1, -1, -1],
  [-1, 1, -1],
  [1, 1, -1],
  // left (x-)
  [-1, -1, -1],
  [-1, -1, 1],
  [-1, 1, 1],
  [-1, -1, -1],
  [-1, 1, 1],
  [-1, 1, -1],
  // right (x+)
  [1, -1, 1],
  [1, -1, -1],
  [1, 1, -1],
  [1, -1, 1],
  [1, 1, -1],
  [1, 1, 1],
  // top (y+)
  [-1, 1, 1],
  [1, 1, 1],
  [1, 1, -1],
  [-1, 1, 1],
  [1, 1, -1],
  [-1, 1, -1],
  // bottom (y-)
  [-1, -1, -1],
  [1, -1, -1],
  [1, -1, 1],
  [-1, -1, -1],
  [1, -1, 1],
  [-1, -1, 1],
];

const VERTS_PER_BOX = 36; // 12 triangles × 3 vertices

/**
 * Per-face UV projection axes. Each face of a unit cube maps positions from
 * two of the three world axes to U,V. The scale factor normalizes UVs to
 * tile at 1 texture repeat per 2 world units (Spec §47.5).
 */
const UV_SCALE = 0.5;

/**
 * Build a merged BufferGeometry from a list of BoxSpecs with per-vertex colors
 * and UV coordinates for PBR textures.
 *
 * No index buffer — each triangle is an independent vertex triplet (flat shading
 * normals computed by the GPU from unshared vertices). Vertex colors encode the
 * material type so one MeshStandardMaterial covers the entire building.
 * UV coords use box projection: each face maps from the two world axes
 * perpendicular to its normal (Spec §47.5).
 */
function buildMergedGeometry(
  boxes: BoxSpec[],
  materialType: "brick" | "plaster" | "timber",
): BufferGeometry {
  const totalVerts = boxes.length * VERTS_PER_BOX;
  const positions = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let vIdx = 0;

  for (const box of boxes) {
    const { cx, cy, cz, w, h, d, mat } = box;
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    const [r, g, b] = resolveBoxColor(mat, materialType);

    // 6 faces × 6 verts each. Face order matches CUBE_FACE_VERTS:
    // front(z+), back(z-), left(x-), right(x+), top(y+), bottom(y-)
    for (let fi = 0; fi < 6; fi++) {
      for (let vi = 0; vi < 6; vi++) {
        const [dx, dy, dz] = CUBE_FACE_VERTS[fi * 6 + vi];
        const px = cx + dx * hw;
        const py = cy + dy * hh;
        const pz = cz + dz * hd;

        positions[vIdx * 3] = px;
        positions[vIdx * 3 + 1] = py;
        positions[vIdx * 3 + 2] = pz;

        colors[vIdx * 3] = r;
        colors[vIdx * 3 + 1] = g;
        colors[vIdx * 3 + 2] = b;

        // Box UV projection: use the two axes perpendicular to face normal
        let u: number;
        let v: number;
        if (fi < 2) {
          // front/back (z-normal) → project X,Y
          u = px * UV_SCALE;
          v = py * UV_SCALE;
        } else if (fi < 4) {
          // left/right (x-normal) → project Z,Y
          u = pz * UV_SCALE;
          v = py * UV_SCALE;
        } else {
          // top/bottom (y-normal) → project X,Z
          u = px * UV_SCALE;
          v = pz * UV_SCALE;
        }
        uvs[vIdx * 2] = u;
        uvs[vIdx * 2 + 1] = v;

        vIdx++;
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ProceduralBuildingProps {
  footprintW: number;
  footprintD: number;
  stories: number;
  materialType: "brick" | "plaster" | "timber";
  blueprintId: BlueprintId;
  facing: 0 | 90 | 180 | 270;
  variation: number;
  position: [number, number, number];
}

/**
 * ProceduralBuilding — single merged mesh for one ECS building entity.
 *
 * Combines structure boxes (walls/floors/stairs/roof) with interior furnishings
 * and door/window openings into one draw call per building (§43.8).
 * Physics: fixed TrimeshCollider from buildColliderArrays().
 */
/** Map building materialType to PBR texture key. */
function materialTypeToKey(materialType: "brick" | "plaster" | "timber"): string {
  switch (materialType) {
    case "brick":
      return "building/stone_wall";
    case "plaster":
      return "building/plaster_white";
    case "timber":
      return "building/wood_planks";
  }
}

export const ProceduralBuilding = ({
  footprintW,
  footprintD,
  stories,
  materialType,
  blueprintId,
  facing,
  variation,
  position,
}: ProceduralBuildingProps) => {
  const wallBoxes = useMemo(
    () => generateBuildingBoxes(footprintW, footprintD, stories),
    [footprintW, footprintD, stories],
  );

  const interiorBoxes = useMemo(
    () => generateBlueprintInterior(blueprintId, footprintW, footprintD, stories, variation),
    [blueprintId, footprintW, footprintD, stories, variation],
  );

  const openingBoxes = useMemo(
    () => generateBlueprintOpenings(blueprintId, footprintW, footprintD, stories, facing),
    [blueprintId, footprintW, footprintD, stories, facing],
  );

  const allBoxes = useMemo(
    () => [...wallBoxes, ...interiorBoxes, ...openingBoxes],
    [wallBoxes, interiorBoxes, openingBoxes],
  );

  const geometry = useMemo(
    () => buildMergedGeometry(allBoxes, materialType),
    [allBoxes, materialType],
  );

  const collider = useMemo(() => buildColliderArrays(allBoxes), [allBoxes]);

  // Load PBR material for this building's material type and swap onto mesh (Spec §47.6).
  // Errors propagate — no fallbacks.
  const meshRef = useRef<Mesh>(null);
  useEffect(() => {
    let cancelled = false;
    const key = materialTypeToKey(materialType);
    const load = async () => {
      const mat = await getPBRMaterial(key, { repeatX: 1, repeatY: 1 });
      if (cancelled || !meshRef.current) return;
      const clone = mat.clone() as MeshStandardMaterial;
      clone.vertexColors = true;
      meshRef.current.material = clone;
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [materialType]);

  return (
    <RigidBody type="fixed" position={position}>
      <TrimeshCollider args={[collider.vertices, collider.indices]} />
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors />
      </mesh>
    </RigidBody>
  );
};
