/**
 * Kitbashing system -- Fallout-style modular base building.
 *
 * Players snap modular pieces (walls, floors, roofs, pillars) together
 * on a coarse 1-unit grid. Pieces connect via snap points. Progressive
 * unlock by player level: wood L5, stone L10, metal L15, decorative L20.
 *
 * Spec §35
 */

export type { KitbashCommitStore, KitbashPlacementWorld } from "./commit.ts";
export { placeModularPiece } from "./commit.ts";
export { getAvailableSnapPoints, validatePlacement } from "./placement.ts";
export type { KitbashRapierModule, KitbashRapierWorld } from "./rapier.ts";
export {
  checkClearance,
  checkGroundContact,
  checkSnapDirectionMatch,
  validatePlacementWithRapier,
} from "./rapier.ts";
export { calculateBaseValue, getUnlockedMaterials, getUnlockedPieces } from "./unlocks.ts";
