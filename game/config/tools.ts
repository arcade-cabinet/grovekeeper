/**
 * Tool data accessors backed by config/game/tools.json.
 */

import toolsData from "@/config/game/tools.json" with { type: "json" };

export interface ToolData {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockLevel: number;
  staminaCost: number;
  /** Maximum uses before the tool breaks (0 = no durability wear). Spec §11.3 */
  maxDurability: number;
  action: string;
  /** Melee damage power for combat tools (axe, shovel, shears). Spec §34.2 */
  effectPower?: number;
}

export const TOOLS: ToolData[] = toolsData as ToolData[];

export const getToolById = (id: string): ToolData | undefined => TOOLS.find((t) => t.id === id);
