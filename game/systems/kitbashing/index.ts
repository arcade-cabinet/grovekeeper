/**
 * Kitbashing system -- Fallout-style modular base building.
 *
 * Players snap modular pieces (walls, floors, roofs, pillars) together
 * on a coarse 1-unit grid. Pieces connect via snap points. Progressive
 * unlock by player level: wood L5, stone L10, metal L15, decorative L20.
 *
 * Spec §35
 */

export { getAvailableSnapPoints, validatePlacement } from "./placement";
export { calculateBaseValue, getUnlockedPieces, getUnlockedMaterials } from "./unlocks";
export type { KitbashRapierWorld, KitbashRapierModule } from "./rapier";
export {
  checkSnapDirectionMatch,
  checkClearance,
  checkGroundContact,
  validatePlacementWithRapier,
} from "./rapier";
