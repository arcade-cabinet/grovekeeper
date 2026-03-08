/**
 * Tool stamina/durability and selection actions.
 */
import { getToolById } from "@/game/config/tools";
import { useGameStore } from "@/game/stores";

/**
 * Spend stamina for a tool action (checks tool cost and spends stamina).
 * Returns true if stamina was available and spent.
 */
export function spendToolStamina(toolId: string): boolean {
  const tool = getToolById(toolId);
  if (!tool || tool.staminaCost === 0) return true;

  const store = useGameStore.getState();
  return store.spendStamina(tool.staminaCost);
}

/**
 * Drain 1 durability use from a tool (Spec §11.3: standard use = 1 per action).
 * Tools with maxDurability === 0 are exempt (almanac, seed-pouch, etc.).
 * Returns false when the tool is already broken (durability === 0).
 * Returns true (no-op) for unknown tool IDs.
 */
export function drainToolDurability(toolId: string, amount = 1): boolean {
  const tool = getToolById(toolId);
  if (!tool || tool.maxDurability === 0) return true;

  const store = useGameStore.getState();
  return store.drainToolDurability(toolId, tool.maxDurability, amount);
}

/** Select a tool in the store. */
export function selectTool(toolId: string): void {
  useGameStore.getState().setSelectedTool(toolId);
}

/** Select a species in the store. */
export function selectSpecies(speciesId: string): void {
  useGameStore.getState().setSelectedSpecies(speciesId);
}
