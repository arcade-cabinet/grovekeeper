/**
 * Building material key mapping (Spec §47.4)
 *
 * Maps structural surface identifiers to PBR texture keys.
 * All keys must exist in PBRMaterialCache's TEXTURE_REGISTRY.
 */

/** All valid building texture keys. Exported so tests can validate returned keys. */
export const BUILDING_TEXTURE_KEYS = [
  "building/stone_wall",
  "building/wood_planks",
  "building/plaster_white",
  "building/thatch_roof",
] as const;

export type BuildingTextureKey = (typeof BUILDING_TEXTURE_KEYS)[number];

const SURFACE_TO_KEY: Record<string, BuildingTextureKey> = {
  wall: "building/stone_wall",
  floor: "building/stone_wall",
  wood: "building/wood_planks",
  plaster: "building/plaster_white",
  roof: "building/thatch_roof",
};

/**
 * Returns the PBR texture key for a given structural surface identifier.
 * Unknown surfaces default to building/stone_wall (Spec §47.4).
 * This is a safe default unlike terrain/bark — building surfaces are
 * always controlled interior strings.
 */
export function getBuildingMaterialKey(surface: string): BuildingTextureKey {
  return SURFACE_TO_KEY[surface] ?? "building/stone_wall";
}
