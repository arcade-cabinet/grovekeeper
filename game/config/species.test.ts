import {
  getSpeciesById,
  PRESTIGE_TREE_SPECIES,
  TREE_SPECIES,
} from "@/game/config/species";

describe("species config", () => {
  describe("TREE_SPECIES", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(TREE_SPECIES)).toBe(true);
      expect(TREE_SPECIES.length).toBeGreaterThan(0);
    });

    it("contains 12 base species", () => {
      expect(TREE_SPECIES.length).toBe(12);
    });

    it("all species have required fields", () => {
      for (const species of TREE_SPECIES) {
        expect(typeof species.id).toBe("string");
        expect(species.id.length).toBeGreaterThan(0);
        expect(typeof species.name).toBe("string");
        expect(typeof species.difficulty).toBe("number");
        expect(species.difficulty).toBeGreaterThanOrEqual(1);
        expect(species.difficulty).toBeLessThanOrEqual(5);
        expect(typeof species.unlockLevel).toBe("number");
        expect(typeof species.biome).toBe("string");
        expect(Array.isArray(species.baseGrowthTimes)).toBe(true);
        expect(species.baseGrowthTimes.length).toBe(5);
        expect(Array.isArray(species.yield)).toBe(true);
        expect(species.yield.length).toBeGreaterThan(0);
        expect(typeof species.harvestCycleSec).toBe("number");
        expect(typeof species.seedCost).toBe("object");
        expect(typeof species.special).toBe("string");
        expect(typeof species.evergreen).toBe("boolean");
      }
    });

    it("all species have valid meshParams", () => {
      for (const species of TREE_SPECIES) {
        expect(species.meshParams).toBeDefined();
        expect(typeof species.meshParams.trunkHeight).toBe("number");
        expect(typeof species.meshParams.trunkRadius).toBe("number");
        expect(typeof species.meshParams.canopyRadius).toBe("number");
        expect(typeof species.meshParams.canopySegments).toBe("number");
        expect(species.meshParams.color).toBeDefined();
        expect(typeof species.meshParams.color.trunk).toBe("string");
        expect(typeof species.meshParams.color.canopy).toBe("string");
      }
    });

    it("all species have unique IDs", () => {
      const ids = TREE_SPECIES.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("yields reference valid resource types", () => {
      const validResources = ["timber", "sap", "fruit", "acorns"];
      for (const species of TREE_SPECIES) {
        for (const y of species.yield) {
          expect(validResources).toContain(y.resource);
          expect(y.amount).toBeGreaterThan(0);
        }
      }
    });

    it("includes white-oak as the starter species", () => {
      const oak = TREE_SPECIES.find((s) => s.id === "white-oak");
      expect(oak).toBeDefined();
      expect(oak!.difficulty).toBe(1);
      expect(oak!.unlockLevel).toBe(1);
    });
  });

  describe("PRESTIGE_TREE_SPECIES", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(PRESTIGE_TREE_SPECIES)).toBe(true);
      expect(PRESTIGE_TREE_SPECIES.length).toBeGreaterThan(0);
    });

    it("contains 3 prestige species", () => {
      expect(PRESTIGE_TREE_SPECIES.length).toBe(3);
    });

    it("all prestige species have requiredPrestiges field", () => {
      for (const species of PRESTIGE_TREE_SPECIES) {
        expect(typeof species.requiredPrestiges).toBe("number");
        expect(species.requiredPrestiges).toBeGreaterThanOrEqual(1);
      }
    });

    it("prestige species have unique IDs not overlapping with base species", () => {
      const baseIds = new Set(TREE_SPECIES.map((s) => s.id));
      for (const species of PRESTIGE_TREE_SPECIES) {
        expect(baseIds.has(species.id)).toBe(false);
      }
    });

    it("includes crystal-oak prestige species", () => {
      const crystalOak = PRESTIGE_TREE_SPECIES.find(
        (s) => s.id === "crystal-oak",
      );
      expect(crystalOak).toBeDefined();
      expect(crystalOak!.requiredPrestiges).toBe(1);
    });
  });

  describe("getSpeciesById", () => {
    it("finds a known base species", () => {
      const species = getSpeciesById("white-oak");
      expect(species).toBeDefined();
      expect(species!.name).toBe("White Oak");
    });

    it("finds a known prestige species", () => {
      const species = getSpeciesById("crystal-oak");
      expect(species).toBeDefined();
      expect(species!.name).toBe("Crystalline Oak");
    });

    it("returns undefined for unknown species ID", () => {
      expect(getSpeciesById("nonexistent-tree")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(getSpeciesById("")).toBeUndefined();
    });

    it("returns species with correct difficulty for cherry-blossom", () => {
      const species = getSpeciesById("cherry-blossom");
      expect(species).toBeDefined();
      expect(species!.difficulty).toBe(3);
    });
  });
});
