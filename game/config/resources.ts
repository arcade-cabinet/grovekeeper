/**
 * Resource type helpers backed by config/game/resources.json.
 */

import resourcesConfig from "@/config/game/resources.json" with { type: "json" };

/** Grove harvest resources (organic) + building materials. */
export type ResourceType =
  | "timber"
  | "sap"
  | "fruit"
  | "acorns"
  | "wood"
  | "stone"
  | "metal_scrap"
  | "fiber";

export const RESOURCE_TYPES: ResourceType[] = resourcesConfig.types as ResourceType[];

export const RESOURCE_INFO: Record<ResourceType, { name: string; icon: string }> =
  resourcesConfig.info as Record<ResourceType, { name: string; icon: string }>;

export function emptyResources(): Record<ResourceType, number> {
  return {
    timber: 0,
    sap: 0,
    fruit: 0,
    acorns: 0,
    wood: 0,
    stone: 0,
    metal_scrap: 0,
    fiber: 0,
  };
}
