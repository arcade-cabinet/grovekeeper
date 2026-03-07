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
  action: string;
}

export const TOOLS: ToolData[] = toolsData as ToolData[];

export const getToolById = (id: string): ToolData | undefined => TOOLS.find((t) => t.id === id);
