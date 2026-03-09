/**
 * Building material mapping tests (Spec §47)
 *
 * Covers:
 * - Every named surface resolves to a valid building key
 * - Unknown surfaces throw (no fallbacks)
 * - All returned keys exist in BUILDING_TEXTURE_KEYS
 */

import { BUILDING_TEXTURE_KEYS, getBuildingMaterialKey } from "./buildingMaterials.ts";

describe("Building Materials — surface mapping (Spec §47.4)", () => {
  it("maps wall surface to building/stone_wall", () => {
    expect(getBuildingMaterialKey("wall")).toBe("building/stone_wall");
  });

  it("maps floor surface to building/stone_wall", () => {
    expect(getBuildingMaterialKey("floor")).toBe("building/stone_wall");
  });

  it("maps wood surface to building/wood_planks", () => {
    expect(getBuildingMaterialKey("wood")).toBe("building/wood_planks");
  });

  it("maps plaster surface to building/plaster_white", () => {
    expect(getBuildingMaterialKey("plaster")).toBe("building/plaster_white");
  });

  it("maps roof surface to building/thatch_roof", () => {
    expect(getBuildingMaterialKey("roof")).toBe("building/thatch_roof");
  });

  it("maps door surface to building/wood_planks", () => {
    expect(getBuildingMaterialKey("door")).toBe("building/wood_planks");
  });

  it("maps fence surface to building/wood_planks", () => {
    expect(getBuildingMaterialKey("fence")).toBe("building/wood_planks");
  });

  it("unknown surface throws — no fallback", () => {
    expect(() => getBuildingMaterialKey("brick")).toThrow("unknown surface 'brick'");
    expect(() => getBuildingMaterialKey("")).toThrow("unknown surface ''");
    expect(() => getBuildingMaterialKey("metal")).toThrow("unknown surface 'metal'");
  });

  it("all named surfaces return a key in BUILDING_TEXTURE_KEYS", () => {
    const surfaces = [
      "wall",
      "wood",
      "plaster",
      "roof",
      "floor",
      "door",
      "fence",
      "barrel",
      "crate",
      "stone",
    ];
    for (const surface of surfaces) {
      const key = getBuildingMaterialKey(surface);
      expect(BUILDING_TEXTURE_KEYS).toContain(key);
    }
  });

  it("BUILDING_TEXTURE_KEYS contains exactly 4 distinct keys", () => {
    expect(new Set(BUILDING_TEXTURE_KEYS).size).toBe(4);
  });
});
