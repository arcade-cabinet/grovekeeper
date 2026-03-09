/**
 * Blueprint door and window opening generator.
 * Spec §43.4 — Door and Window Openings.
 *
 * Openings are dark-colored recessed boxes placed at the wall face position,
 * sized to doorWidth×doorHeight or windowWidth×windowHeight × wallThickness.
 * No Three.js dependency — pure math, fully testable.
 *
 * Config values from config/game/structures.json "proceduralBuilding".
 */

import structuresConfig from "../../../config/game/structures.json" with { type: "json" };
import type { BlueprintId } from "../../ecs/components/structures.ts";
import type { BoxSpec } from "./core.ts";
import { floorSurfaceY } from "./core.ts";

const cfg = structuresConfig.proceduralBuilding;

/**
 * Wall axis enum — which wall a door or window sits on.
 * Derived from the building's facing direction.
 *
 * facing 0   → door on +Z wall (cz = footprintD − t/2)
 * facing 90  → door on +X wall (cx = footprintW − t/2)
 * facing 180 → door on −Z wall (cz = t/2)
 * facing 270 → door on −X wall (cx = t/2)
 */

/**
 * Returns a BoxSpec for a single door opening on the facing wall.
 * Door bottom is at floorSurfaceY(story). Center of door Y = doorHeight/2 above floor.
 */
function doorBox(
  facing: 0 | 90 | 180 | 270,
  footprintW: number,
  footprintD: number,
  story: number,
  doorW: number,
): BoxSpec {
  const { doorHeight, wallThickness: t } = cfg;
  const floorY = floorSurfaceY(story);
  const cy = floorY + doorHeight / 2;
  const halfW = footprintW / 2;
  const halfD = footprintD / 2;

  switch (facing) {
    case 0:
      // Door on +Z wall (front face, cz = footprintD)
      return {
        cx: halfW,
        cy,
        cz: footprintD - t / 2,
        w: doorW,
        h: doorHeight,
        d: t,
        mat: "door",
      };
    case 90:
      // Door on +X wall (right face)
      return {
        cx: footprintW - t / 2,
        cy,
        cz: halfD,
        w: t,
        h: doorHeight,
        d: doorW,
        mat: "door",
      };
    case 180:
      // Door on −Z wall (back face)
      return {
        cx: halfW,
        cy,
        cz: t / 2,
        w: doorW,
        h: doorHeight,
        d: t,
        mat: "door",
      };
    case 270:
      // Door on −X wall (left face)
      return {
        cx: t / 2,
        cy,
        cz: halfD,
        w: t,
        h: doorHeight,
        d: doorW,
        mat: "door",
      };
  }
}

/**
 * Returns BoxSpec[] for windows on the side walls of a given story.
 * Side walls are left (X=0) and right (X=footprintW).
 * One window per side wall, centered on the wall's Z span.
 */
function windowBoxesForStory(story: number, footprintW: number, footprintD: number): BoxSpec[] {
  const { windowWidth, windowHeight, windowSillHeight, wallThickness: t } = cfg;
  const floorY = floorSurfaceY(story);
  const cy = floorY + windowSillHeight + windowHeight / 2;
  const halfD = footprintD / 2;

  return [
    // Left wall window (cx = t/2)
    {
      cx: t / 2,
      cy,
      cz: halfD,
      w: t,
      h: windowHeight,
      d: windowWidth,
      mat: "window",
    },
    // Right wall window (cx = footprintW − t/2)
    {
      cx: footprintW - t / 2,
      cy,
      cz: halfD,
      w: t,
      h: windowHeight,
      d: windowWidth,
      mat: "window",
    },
  ] satisfies BoxSpec[];
}

/**
 * Generate door and window opening BoxSpecs for a given blueprint.
 *
 * @param blueprintId  — building type
 * @param footprintW   — building width (X) in world units
 * @param footprintD   — building depth (Z) in world units
 * @param stories      — number of floors
 * @param facing       — street-facing direction in degrees (0/90/180/270)
 */
export function generateBlueprintOpenings(
  blueprintId: BlueprintId,
  footprintW: number,
  footprintD: number,
  stories: number,
  facing: 0 | 90 | 180 | 270,
): BoxSpec[] {
  const boxes: BoxSpec[] = [];

  // --- DOOR ---
  // Watchtower: no ground-floor door (accessed from 2nd floor)
  if (blueprintId !== "watchtower") {
    const doorW = blueprintId === "barn" ? cfg.doorWidth * 2 : cfg.doorWidth;
    boxes.push(doorBox(facing, footprintW, footprintD, 0, doorW));
  }

  // --- WINDOWS ---
  // Every story gets windows on side walls (left and right walls — not facing, not back).
  // Side walls are always the X-axis walls (left/right) regardless of facing,
  // because the building box is axis-aligned and facing only picks which Z/X wall is "front".
  for (let st = 0; st < stories; st++) {
    const wins = windowBoxesForStory(st, footprintW, footprintD);
    for (const win of wins) {
      boxes.push(win);
    }
  }

  return boxes;
}
