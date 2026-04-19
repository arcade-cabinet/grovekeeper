export type ResourceType = "timber" | "sap" | "fruit" | "acorns";

export const RESOURCE_TYPES: ResourceType[] = [
  "timber",
  "sap",
  "fruit",
  "acorns",
];

export const RESOURCE_INFO: Record<
  ResourceType,
  { name: string; icon: string }
> = {
  timber: { name: "Timber", icon: "tree" },
  sap: { name: "Sap", icon: "droplet" },
  fruit: { name: "Fruit", icon: "apple" },
  acorns: { name: "Acorns", icon: "nut" },
};

export function emptyResources(): Record<ResourceType, number> {
  return { timber: 0, sap: 0, fruit: 0, acorns: 0 };
}
