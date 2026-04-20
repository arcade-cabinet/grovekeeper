import resourcesData from "./resources.json";

export type ResourceType = "timber" | "sap" | "fruit" | "acorns";

export const RESOURCE_TYPES: ResourceType[] =
  resourcesData.types as ResourceType[];

export const RESOURCE_INFO: Record<
  ResourceType,
  { name: string; icon: string }
> = resourcesData.info as Record<ResourceType, { name: string; icon: string }>;

export function emptyResources(): Record<ResourceType, number> {
  return { timber: 0, sap: 0, fruit: 0, acorns: 0 };
}
