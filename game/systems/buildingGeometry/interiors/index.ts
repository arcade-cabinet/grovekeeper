/**
 * Blueprint interior furnishing generator — entry point.
 * Spec §43.3 — Building Interior Furnishings.
 *
 * Delegates to residential.ts (cottage/townhouse/inn/barn/chapel)
 * and specialized.ts (forge/kitchen/apothecary/watchtower/storehouse).
 */

import type { BlueprintId } from "../../../ecs/components/structures.ts";
import type { BoxSpec } from "../core.ts";
import {
  barnInterior,
  chapelInterior,
  cottageInterior,
  innInterior,
  townhouseInterior,
} from "./residential.ts";
import {
  apothecaryInterior,
  forgeInterior,
  kitchenInterior,
  storehouseInterior,
  watchtowerInterior,
} from "./specialized.ts";

/**
 * Generate interior furnishing BoxSpecs for a given blueprint.
 * All positions are relative to building origin (0,0,0).
 *
 * @param blueprintId  — building type
 * @param footprintW   — building width (X) in world units
 * @param footprintD   — building depth (Z) in world units
 * @param stories      — number of floors
 * @param variation    — seeded integer for minor positional jitter (±0.1)
 */
export function generateBlueprintInterior(
  blueprintId: BlueprintId,
  footprintW: number,
  footprintD: number,
  stories: number,
  variation: number,
): BoxSpec[] {
  switch (blueprintId) {
    case "cottage":
      return cottageInterior(footprintW, footprintD, variation);
    case "townhouse":
      return townhouseInterior(footprintW, footprintD, stories, variation);
    case "inn":
      return innInterior(footprintW, footprintD, stories, variation);
    case "barn":
      return barnInterior(footprintW, footprintD, variation);
    case "chapel":
      return chapelInterior(footprintW, footprintD, variation);
    case "forge":
      return forgeInterior(footprintW, footprintD, stories, variation);
    case "kitchen":
      return kitchenInterior(footprintW, footprintD, variation);
    case "apothecary":
      return apothecaryInterior(footprintW, footprintD, variation);
    case "watchtower":
      return watchtowerInterior(footprintW, footprintD, stories);
    case "storehouse":
      return storehouseInterior(footprintW, footprintD, variation);
  }
}
