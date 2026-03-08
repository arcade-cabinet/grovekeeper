/**
 * Interior furnishings for specialized/production blueprints.
 * Spec §43.3 — forge, kitchen, apothecary, watchtower, storehouse.
 */

import structuresConfig from "../../../../config/game/structures.json" with { type: "json" };
import type { BoxSpec } from "../core.ts";
import { floorSurfaceY } from "../core.ts";
import { jitter } from "./residential.ts";

const cfg = structuresConfig.proceduralBuilding;
const WALL_INSET = cfg.wallThickness + 0.2;

export function forgeInterior(
  footprintW: number,
  footprintD: number,
  stories: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const minX = WALL_INSET;
  const maxX = footprintW - WALL_INSET;
  const minZ = WALL_INSET;
  const chimneyH = cfg.wallH * stories + cfg.wallH;

  return [
    // Anvil (0.6×0.8×0.4) — center
    {
      cx: footprintW / 2 + jitter(variation, 0),
      cy: g0 + 0.4,
      cz: footprintD / 2 + jitter(variation, 1),
      w: 0.6,
      h: 0.8,
      d: 0.4,
      mat: "furniture",
    },
    // Coal bin (0.8×0.5×0.8) — left side
    {
      cx: minX + 0.4 + jitter(variation, 2),
      cy: g0 + 0.25,
      cz: footprintD / 2 + jitter(variation, 3),
      w: 0.8,
      h: 0.5,
      d: 0.8,
      mat: "chimney",
    },
    // Chimney column — back corner, reaches through roof
    {
      cx: maxX - 0.25 + jitter(variation, 4),
      cy: chimneyH / 2,
      cz: minZ + 0.25,
      w: 0.5,
      h: chimneyH,
      d: 0.5,
      mat: "chimney",
    },
  ];
}

export function kitchenInterior(
  footprintW: number,
  footprintD: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const maxX = footprintW - WALL_INSET;
  const minZ = WALL_INSET;

  return [
    // Cooking pot (0.5×0.4×0.5) — center
    {
      cx: footprintW / 2 + jitter(variation, 0),
      cy: g0 + 0.2,
      cz: footprintD / 2 + jitter(variation, 1),
      w: 0.5,
      h: 0.4,
      d: 0.5,
      mat: "furniture",
    },
    // Counter (1.5×1.0×0.4) — right side wall
    {
      cx: maxX - 0.2 + jitter(variation, 2),
      cy: g0 + 0.5,
      cz: footprintD / 2 + jitter(variation, 3),
      w: 1.5,
      h: 1.0,
      d: 0.4,
      mat: "furniture",
    },
    // Shelf (0.8×1.5×0.3) — back wall
    {
      cx: footprintW / 2 + jitter(variation, 4),
      cy: g0 + 1.5,
      cz: minZ + 0.15,
      w: 0.8,
      h: 1.5,
      d: 0.3,
      mat: "furniture",
    },
  ];
}

export function apothecaryInterior(
  footprintW: number,
  footprintD: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const minX = WALL_INSET;
  const maxX = footprintW - WALL_INSET;
  const maxZ = footprintD - WALL_INSET;
  const minZ = WALL_INSET;

  return [
    // Planter 1 — front left
    {
      cx: minX + 0.4 + jitter(variation, 0),
      cy: g0 + 0.2,
      cz: maxZ - 0.15 + jitter(variation, 1),
      w: 0.8,
      h: 0.4,
      d: 0.3,
      mat: "furniture",
    },
    // Planter 2 — front right
    {
      cx: maxX - 0.4 + jitter(variation, 2),
      cy: g0 + 0.2,
      cz: maxZ - 0.15 + jitter(variation, 3),
      w: 0.8,
      h: 0.4,
      d: 0.3,
      mat: "furniture",
    },
    // Shelf (1.5×1.5×0.3) — back wall
    {
      cx: footprintW / 2 + jitter(variation, 4),
      cy: g0 + 1.0,
      cz: minZ + 0.15,
      w: 1.5,
      h: 1.5,
      d: 0.3,
      mat: "furniture",
    },
  ];
}

export function watchtowerInterior(
  footprintW: number,
  footprintD: number,
  stories: number,
): BoxSpec[] {
  const topFloor = floorSurfaceY(stories - 1);
  const railH = 0.9;
  const t = 0.1;

  return [
    // Front railing
    {
      cx: footprintW / 2,
      cy: topFloor + railH / 2,
      cz: footprintD - t / 2,
      w: footprintW,
      h: railH,
      d: t,
      mat: "furniture",
    },
    // Back railing
    {
      cx: footprintW / 2,
      cy: topFloor + railH / 2,
      cz: t / 2,
      w: footprintW,
      h: railH,
      d: t,
      mat: "furniture",
    },
    // Left railing
    {
      cx: t / 2,
      cy: topFloor + railH / 2,
      cz: footprintD / 2,
      w: t,
      h: railH,
      d: footprintD,
      mat: "furniture",
    },
    // Right railing
    {
      cx: footprintW - t / 2,
      cy: topFloor + railH / 2,
      cz: footprintD / 2,
      w: t,
      h: railH,
      d: footprintD,
      mat: "furniture",
    },
  ];
}

export function storehouseInterior(
  footprintW: number,
  footprintD: number,
  variation: number,
): BoxSpec[] {
  const g0 = floorSurfaceY(0);
  const minX = WALL_INSET;
  const maxX = footprintW - WALL_INSET;
  const minZ = WALL_INSET;
  const maxZ = footprintD - WALL_INSET;

  const cratePositions = [
    { x: minX + 0.3, z: minZ + 0.3 },
    { x: minX + 1.1, z: minZ + 0.3 },
    { x: maxX - 0.3, z: minZ + 0.3 },
    { x: maxX - 1.1, z: minZ + 0.3 },
  ];

  const boxes: BoxSpec[] = cratePositions.map((cp, i) => ({
    cx: cp.x + jitter(variation, i * 2),
    cy: g0 + 0.3,
    cz: cp.z + jitter(variation, i * 2 + 1),
    w: 0.6,
    h: 0.6,
    d: 0.6,
    mat: "furniture" as const,
  }));

  // Barrel 1
  boxes.push({
    cx: footprintW / 2 - 0.4 + jitter(variation, 8),
    cy: g0 + 0.4,
    cz: maxZ - 0.2 + jitter(variation, 9),
    w: 0.4,
    h: 0.8,
    d: 0.4,
    mat: "furniture",
  });
  // Barrel 2
  boxes.push({
    cx: footprintW / 2 + 0.4 + jitter(variation, 10),
    cy: g0 + 0.4,
    cz: maxZ - 0.2 + jitter(variation, 11),
    w: 0.4,
    h: 0.8,
    d: 0.4,
    mat: "furniture",
  });

  return boxes;
}
