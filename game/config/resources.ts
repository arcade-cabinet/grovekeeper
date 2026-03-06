/**
 * Resource type helpers backed by config/game/resources.json.
 */

import resourcesConfig from "@/config/game/resources.json";

export type ResourceType = "timber" | "sap" | "fruit" | "acorns";

export const RESOURCE_TYPES: ResourceType[] =
  resourcesConfig.types as ResourceType[];

export const RESOURCE_INFO: Record<
  ResourceType,
  { name: string; icon: string }
> = resourcesConfig.info as Record<
  ResourceType,
  { name: string; icon: string }
>;

export function emptyResources(): Record<ResourceType, number> {
  return { timber: 0, sap: 0, fruit: 0, acorns: 0 };
}
