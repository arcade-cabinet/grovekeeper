/**
 * Pure procedural building geometry generator — structural boxes.
 * Spec §42 — Procedural Architecture.
 *
 * Produces axis-aligned box specs for walls, floors, stairs, and roof.
 * No Three.js dependency — pure math, fully testable.
 *
 * Config values from config/game/structures.json "proceduralBuilding".
 */

import structuresConfig from "../../../config/game/structures.json" with { type: "json" };

const cfg = structuresConfig.proceduralBuilding;

/** Material type for vertex colouring. §42 base + §43.3 interiors/openings. */
export type BoxMatType =
  | "wall"
  | "floor"
  | "stair"
  | "roof"
  | "furniture"
  | "chimney"
  | "hay"
  | "door"
  | "window"
  | "timber_wall";

/** Axis-aligned box spec. Center + half-extents + material tag. */
export interface BoxSpec {
  /** Center X */
  cx: number;
  /** Center Y */
  cy: number;
  /** Center Z */
  cz: number;
  /** Width (X) */
  w: number;
  /** Height (Y) */
  h: number;
  /** Depth (Z) */
  d: number;
  /** Material tag for vertex colouring */
  mat: BoxMatType;
}

/**
 * Top walking surface Y for a given floor level.
 * Level 0 = ground (y=0), level 1 = first upper floor, etc.
 */
export function floorSurfaceY(level: number): number {
  return level * cfg.wallH;
}

/**
 * Generate all box specs for a single building.
 *
 * Building origin is at (0, 0, 0) bottom-left corner.
 * Caller translates to world position.
 *
 * @param footprintW — building width in world units (along X)
 * @param footprintD — building depth in world units (along Z)
 * @param stories — number of floors (1 = ground only)
 */
export function generateBuildingBoxes(
  footprintW: number,
  footprintD: number,
  stories: number,
): BoxSpec[] {
  const boxes: BoxSpec[] = [];
  const { wallH, wallThickness: t, floorThickness: ft } = cfg;
  const { stairWidth: sw, stairDepth: sd, stairSteps } = cfg;

  const halfW = footprintW / 2;
  const halfD = footprintD / 2;

  for (let st = 0; st < stories; st++) {
    const baseY = floorSurfaceY(st);

    // --- PERIMETER WALLS (4 sides) ---
    // Left wall (X = 0)
    boxes.push({
      cx: t / 2,
      cy: baseY + wallH / 2,
      cz: halfD,
      w: t,
      h: wallH,
      d: footprintD,
      mat: "wall",
    });
    // Right wall (X = footprintW)
    boxes.push({
      cx: footprintW - t / 2,
      cy: baseY + wallH / 2,
      cz: halfD,
      w: t,
      h: wallH,
      d: footprintD,
      mat: "wall",
    });
    // Back wall (Z = 0)
    boxes.push({
      cx: halfW,
      cy: baseY + wallH / 2,
      cz: t / 2,
      w: footprintW,
      h: wallH,
      d: t,
      mat: "wall",
    });
    // Front wall (Z = footprintD)
    boxes.push({
      cx: halfW,
      cy: baseY + wallH / 2,
      cz: footprintD - t / 2,
      w: footprintW,
      h: wallH,
      d: t,
      mat: "wall",
    });

    // --- FLOOR ---
    if (st === 0) {
      // Ground floor: solid slab at y=0
      boxes.push({
        cx: halfW,
        cy: ft / 2,
        cz: halfD,
        w: footprintW,
        h: ft,
        d: footprintD,
        mat: "floor",
      });
    } else {
      // Upper floor: center slab so top surface = floorSurfaceY(st)
      // STAIR CLIPPING FIX: cy = baseY - ft/2 → top = baseY exactly
      const floorY = baseY - ft / 2;

      if (st < stories) {
        // Floor with stair hole cut out (back-right corner)
        // Part 1: front strip (full width, depth minus stair zone)
        const frontD = footprintD - sd;
        boxes.push({
          cx: halfW,
          cy: floorY,
          cz: sd + frontD / 2,
          w: footprintW,
          h: ft,
          d: frontD,
          mat: "floor",
        });
        // Part 2: left of stair hole
        const leftW = footprintW - sw;
        boxes.push({
          cx: leftW / 2,
          cy: floorY,
          cz: sd / 2,
          w: leftW,
          h: ft,
          d: sd,
          mat: "floor",
        });
      }
    }

    // --- STAIRS to next floor (only if not top story) ---
    if (st < stories - 1) {
      const stepH = wallH / stairSteps;
      const stepD = sd / stairSteps;

      for (let i = 0; i < stairSteps; i++) {
        // Thin slab: each step is exactly stepH tall
        // Bottom of step i = baseY + i * stepH
        // Center Y = baseY + (i + 0.5) * stepH
        const stepCY = baseY + (i + 0.5) * stepH;

        // Steps go from front of stair zone (Z = sd) toward back (Z = 0)
        // Step 0 at front, step N-1 at back
        const stepCZ = sd - i * stepD - stepD / 2;

        boxes.push({
          cx: footprintW - sw / 2,
          cy: stepCY,
          cz: stepCZ,
          w: sw,
          h: stepH,
          d: stepD,
          mat: "stair",
        });
      }

      // Stairwell divider wall (separates stairs from room)
      boxes.push({
        cx: footprintW - sw,
        cy: baseY + wallH / 2,
        cz: sd / 2,
        w: t,
        h: wallH,
        d: sd,
        mat: "wall",
      });
    }
  }

  // --- ROOF CAP ---
  const roofOverhang = 0.3;
  boxes.push({
    cx: halfW,
    cy: floorSurfaceY(stories) + ft / 2,
    cz: halfD,
    w: footprintW + roofOverhang * 2,
    h: ft,
    d: footprintD + roofOverhang * 2,
    mat: "roof",
  });

  return boxes;
}

/**
 * Build flat vertex/index arrays from box specs for a Rapier TrimeshCollider.
 *
 * Each box contributes 8 vertices and 12 triangles (36 indices).
 * Vertex offsets are adjusted so all boxes share one index buffer.
 */
export function buildColliderArrays(boxes: BoxSpec[]): {
  vertices: Float32Array;
  indices: Uint32Array;
} {
  const vertCount = boxes.length * 8;
  const triCount = boxes.length * 12;

  const verts = new Float32Array(vertCount * 3);
  const idxs = new Uint32Array(triCount * 3);

  // Cube face indices (12 triangles, 36 values)
  // prettier-ignore
  const CUBE_INDICES = [
    0,
    1,
    2,
    2,
    3,
    0, // front
    4,
    5,
    6,
    6,
    7,
    4, // back
    0,
    4,
    7,
    7,
    3,
    0, // left
    1,
    5,
    6,
    6,
    2,
    1, // right
    3,
    2,
    6,
    6,
    7,
    3, // top
    0,
    1,
    5,
    5,
    4,
    0, // bottom
  ];

  for (let b = 0; b < boxes.length; b++) {
    const { cx, cy, cz, w, h, d } = boxes[b];
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;

    const vOff = b * 24; // 8 verts * 3 floats
    // 8 corner vertices
    // 0: left-bottom-front
    verts[vOff] = cx - hw;
    verts[vOff + 1] = cy - hh;
    verts[vOff + 2] = cz + hd;
    // 1: right-bottom-front
    verts[vOff + 3] = cx + hw;
    verts[vOff + 4] = cy - hh;
    verts[vOff + 5] = cz + hd;
    // 2: right-top-front
    verts[vOff + 6] = cx + hw;
    verts[vOff + 7] = cy + hh;
    verts[vOff + 8] = cz + hd;
    // 3: left-top-front
    verts[vOff + 9] = cx - hw;
    verts[vOff + 10] = cy + hh;
    verts[vOff + 11] = cz + hd;
    // 4: left-bottom-back
    verts[vOff + 12] = cx - hw;
    verts[vOff + 13] = cy - hh;
    verts[vOff + 14] = cz - hd;
    // 5: right-bottom-back
    verts[vOff + 15] = cx + hw;
    verts[vOff + 16] = cy - hh;
    verts[vOff + 17] = cz - hd;
    // 6: right-top-back
    verts[vOff + 18] = cx + hw;
    verts[vOff + 19] = cy + hh;
    verts[vOff + 20] = cz - hd;
    // 7: left-top-back
    verts[vOff + 21] = cx - hw;
    verts[vOff + 22] = cy + hh;
    verts[vOff + 23] = cz - hd;

    const iOff = b * 36; // 12 tris * 3 indices
    const vertBase = b * 8;
    for (let i = 0; i < 36; i++) {
      idxs[iOff + i] = CUBE_INDICES[i] + vertBase;
    }
  }

  return { vertices: verts, indices: idxs };
}
