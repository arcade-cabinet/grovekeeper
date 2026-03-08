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
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";

import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import type { BlueprintId } from "@/game/ecs/components/structures";
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
 * Build a merged BufferGeometry from a list of BoxSpecs with per-vertex colors.
 *
 * No index buffer — each triangle is an independent vertex triplet (flat shading
 * normals computed by the GPU from unshared vertices). Vertex colors encode the
 * material type so one MeshStandardMaterial covers the entire building.
 */
function buildMergedGeometry(
  boxes: BoxSpec[],
  materialType: "brick" | "plaster" | "timber",
): BufferGeometry {
  const totalVerts = boxes.length * VERTS_PER_BOX;
  const positions = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);

  let vIdx = 0;

  for (const box of boxes) {
    const { cx, cy, cz, w, h, d, mat } = box;
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    const [r, g, b] = resolveBoxColor(mat, materialType);

    for (const [dx, dy, dz] of CUBE_FACE_VERTS) {
      positions[vIdx * 3] = cx + dx * hw;
      positions[vIdx * 3 + 1] = cy + dy * hh;
      positions[vIdx * 3 + 2] = cz + dz * hd;

      colors[vIdx * 3] = r;
      colors[vIdx * 3 + 1] = g;
      colors[vIdx * 3 + 2] = b;

      vIdx++;
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
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

  return (
    <RigidBody type="fixed" position={position}>
      <TrimeshCollider args={[collider.vertices, collider.indices]} />
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors />
      </mesh>
    </RigidBody>
  );
};
