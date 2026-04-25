/**
 * inventoryCap — Wave 16.
 *
 * Cozy-tier carry-cap helper. The spec says the inventory should feel
 * "cap'd" not "punishing" — the player can carry plenty of every
 * material but not infinite, and the limit is per-stack-type rather
 * than per-individual-item-weight (so a satchel with a hundred logs
 * still has room for one stone).
 *
 * Two constraints, both sourced from `inventory.config.json`:
 *   - `maxItemsPerStack` — per-id ceiling. Adding past this caps.
 *   - `maxStackTypes`    — count of distinct item ids the player may
 *     hold simultaneously. Adding a NEW id when this is full rejects
 *     entirely (no partial credit — the satchel is full of other
 *     materials).
 *
 * Returns:
 *   - `accepted` — number of units actually added (0..count).
 *   - `capped`   — true if any portion of the requested count was
 *     rejected. The caller uses this to decide between the "+pickup"
 *     chime and the "satchel full" buzz.
 */

import inventoryConfig from "@/content/inventory.config.json";

export interface InventoryCapState {
  /** Existing per-id counts at the time of the add. */
  readonly currentCounts: ReadonlyMap<string, number> | Record<string, number>;
}

export interface AddWithCapOptions {
  /** Max units of any single item id. Defaults to config. */
  maxItemsPerStack?: number;
  /** Max distinct item ids in the satchel. Defaults to config. */
  maxStackTypes?: number;
}

export interface AddWithCapResult {
  accepted: number;
  capped: boolean;
}

/**
 * Pure cap arithmetic. Decoupled from the database — the runtime
 * adapter calls `inventoryRepo.listItems` to build the snapshot map,
 * runs this, and writes back via `inventoryRepo.addItem` with the
 * accepted count.
 */
export function applyInventoryCap(
  itemId: string,
  count: number,
  state: InventoryCapState,
  options: AddWithCapOptions = {},
): AddWithCapResult {
  const maxItemsPerStack =
    options.maxItemsPerStack ?? inventoryConfig.maxItemsPerStack;
  const maxStackTypes = options.maxStackTypes ?? inventoryConfig.maxStackTypes;

  const counts = readCounts(state.currentCounts);
  const existing = counts.get(itemId) ?? 0;
  const distinctTypes = counts.size;

  // New id? Need a free slot.
  if (existing === 0 && distinctTypes >= maxStackTypes) {
    return { accepted: 0, capped: true };
  }

  const room = Math.max(0, maxItemsPerStack - existing);
  const accepted = Math.min(count, room);
  const capped = accepted < count;
  return { accepted, capped };
}

function readCounts(
  src: ReadonlyMap<string, number> | Record<string, number>,
): Map<string, number> {
  if (src instanceof Map) return src as Map<string, number>;
  const out = new Map<string, number>();
  for (const [k, v] of Object.entries(src)) out.set(k, v);
  return out;
}

export const INVENTORY_CAP_CONFIG = inventoryConfig as {
  readonly maxItemsPerStack: number;
  readonly maxStackTypes: number;
};
