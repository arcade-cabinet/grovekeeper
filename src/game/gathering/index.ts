/**
 * Gathering barrel — Wave 16.
 *
 * Public surface for the resource-gathering system. Importing from
 * `@/game/gathering` keeps callers (`scene/runtime.ts`, future HUD
 * waves) decoupled from the internal file split.
 */

export { GatherTickBehavior } from "./GatherTickBehavior";
export {
  type AddInventoryFn,
  type BlockAtFn,
  GatherSystem,
  type GatherSystemOptions,
  type RemoveBlockFn,
} from "./gatherSystem";
export {
  type AddWithCapResult,
  applyInventoryCap,
  INVENTORY_CAP_CONFIG,
  type InventoryCapState,
} from "./inventoryCap";
export type { GatheringHit, GatheringTarget, GatherTickEvent } from "./types";
