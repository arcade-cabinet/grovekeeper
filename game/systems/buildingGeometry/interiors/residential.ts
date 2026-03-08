/**
 * Interior furnishings for residential + hospitality blueprints.
 * Spec §43.3 — cottage, townhouse, inn, barn, chapel.
 */

import structuresConfig from "../../../../config/game/structures.json" with { type: "json" };
import type { BoxSpec } from "../core.ts";
import { floorSurfaceY } from "../core.ts";

const cfg = structuresConfig.proceduralBuilding;
const WALL_INSET = cfg.wallThickness + 0.2;

/** Positional jitter: range [-0.1, +0.1). No Math.random(). */
export function jitter(variation: number, i: number): number {
  return ((variation * 7 + i * 13) % 100) / 500 - 0.1;
}

export function cottageInterior(
  footprintW: number,
  footprintD: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const minX = WALL_INSET;
  const maxX = footprintW - WALL_INSET;
  const minZ = WALL_INSET;
  const maxZ = footprintD - WALL_INSET;

  return [
    // Bed (1.0×0.5×2.0) — back-left
    {
      cx: minX + 0.5 + jitter(variation, 0),
      cy: g0 + 0.25,
      cz: minZ + 1.0 + jitter(variation, 1),
      w: 1.0,
      h: 0.5,
      d: 2.0,
      mat: "furniture",
    },
    // Chest (0.6×0.5×0.6) — front-right
    {
      cx: maxX - 0.3 + jitter(variation, 2),
      cy: g0 + 0.25,
      cz: maxZ - 0.3 + jitter(variation, 3),
      w: 0.6,
      h: 0.5,
      d: 0.6,
      mat: "furniture",
    },
  ];
}

export function townhouseInterior(
  footprintW: number,
  footprintD: number,
  stories: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const g1 = floorSurfaceY(1);
  const minX = WALL_INSET;
  const minZ = WALL_INSET;
  const boxes: BoxSpec[] = [
    // Table (1.2×0.8×0.8) — ground floor center
    {
      cx: footprintW / 2 + jitter(variation, 0),
      cy: g0 + 0.4,
      cz: footprintD / 2 + jitter(variation, 1),
      w: 1.2,
      h: 0.8,
      d: 0.8,
      mat: "furniture",
    },
  ];
  if (stories >= 2) {
    boxes.push({
      cx: minX + 0.5 + jitter(variation, 2),
      cy: g1 + 0.25,
      cz: minZ + 1.0 + jitter(variation, 3),
      w: 1.0,
      h: 0.5,
      d: 2.0,
      mat: "furniture",
    });
  }
  return boxes;
}

export function innInterior(
  footprintW: number,
  footprintD: number,
  stories: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const g1 = floorSurfaceY(1);
  const minX = WALL_INSET;
  const maxX = footprintW - WALL_INSET;
  const minZ = WALL_INSET;
  const maxZ = footprintD - WALL_INSET;

  const boxes: BoxSpec[] = [
    // Counter (2.5×1.0×0.5) — ground floor front
    {
      cx: footprintW / 2 + jitter(variation, 0),
      cy: g0 + 0.5,
      cz: maxZ - 0.25 + jitter(variation, 1),
      w: 2.5,
      h: 1.0,
      d: 0.5,
      mat: "furniture",
    },
    // Fireplace wall (0.8×2.0×0.2) — ground floor back wall
    {
      cx: footprintW / 2 + jitter(variation, 2),
      cy: g0 + 1.0,
      cz: minZ + 0.1,
      w: 0.8,
      h: 2.0,
      d: 0.2,
      mat: "chimney",
    },
  ];
  if (stories >= 2) {
    // Bed 1
    boxes.push({
      cx: minX + 0.5 + jitter(variation, 4),
      cy: g1 + 0.25,
      cz: minZ + 1.0 + jitter(variation, 5),
      w: 1.0,
      h: 0.5,
      d: 2.0,
      mat: "furniture",
    });
    // Bed 2
    boxes.push({
      cx: maxX - 0.5 + jitter(variation, 6),
      cy: g1 + 0.25,
      cz: minZ + 1.0 + jitter(variation, 7),
      w: 1.0,
      h: 0.5,
      d: 2.0,
      mat: "furniture",
    });
  }
  return boxes;
}

export function barnInterior(footprintW: number, footprintD: number, variation: number): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const maxX = footprintW - WALL_INSET;
  const minZ = WALL_INSET;

  const balePositions = [
    { x: WALL_INSET + 0.5, z: minZ + 0.5 },
    { x: WALL_INSET + 1.8, z: minZ + 0.5 },
    { x: maxX - 0.5, z: minZ + 0.5 },
  ];

  const boxes: BoxSpec[] = balePositions.map((bp, i) => ({
    cx: bp.x + jitter(variation, i * 2),
    cy: g0 + 0.4,
    cz: bp.z + jitter(variation, i * 2 + 1),
    w: 1.0,
    h: 0.8,
    d: 1.0,
    mat: "hay" as const,
  }));

  // Trough — right side wall
  boxes.push({
    cx: maxX - 0.75 + jitter(variation, 6),
    cy: g0 + 0.2,
    cz: footprintD / 2 + jitter(variation, 7),
    w: 1.5,
    h: 0.4,
    d: 0.5,
    mat: "furniture",
  });

  return boxes;
}

export function chapelInterior(
  footprintW: number,
  footprintD: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const minZ = WALL_INSET;
  const pewCount = 4;
  const pewSpacing = (footprintD - WALL_INSET * 2) / (pewCount + 1);

  return Array.from({ length: pewCount }, (_, i) => ({
    cx: footprintW / 2 + jitter(variation, i * 2),
    cy: g0 + 0.25,
    cz: minZ + pewSpacing * (i + 1) + jitter(variation, i * 2 + 1),
    w: 2.0,
    h: 0.5,
    d: 0.4,
    mat: "furniture" as const,
  }));
}
