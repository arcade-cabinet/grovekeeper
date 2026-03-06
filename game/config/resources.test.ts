import {
  emptyResources,
  RESOURCE_INFO,
  RESOURCE_TYPES,
} from "@/game/config/resources";

describe("resources config", () => {
  describe("RESOURCE_TYPES", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(RESOURCE_TYPES)).toBe(true);
      expect(RESOURCE_TYPES.length).toBeGreaterThan(0);
    });

    it("contains exactly 4 resource types", () => {
      expect(RESOURCE_TYPES.length).toBe(4);
    });

    it("contains timber, sap, fruit, and acorns", () => {
      expect(RESOURCE_TYPES).toContain("timber");
      expect(RESOURCE_TYPES).toContain("sap");
      expect(RESOURCE_TYPES).toContain("fruit");
      expect(RESOURCE_TYPES).toContain("acorns");
    });

    it("all entries are strings", () => {
      for (const type of RESOURCE_TYPES) {
        expect(typeof type).toBe("string");
      }
    });
  });

  describe("RESOURCE_INFO", () => {
    it("has entries for all resource types", () => {
      for (const type of RESOURCE_TYPES) {
        expect(RESOURCE_INFO[type]).toBeDefined();
      }
    });

    it("each entry has a name and icon", () => {
      for (const type of RESOURCE_TYPES) {
        const info = RESOURCE_INFO[type];
        expect(typeof info.name).toBe("string");
        expect(info.name.length).toBeGreaterThan(0);
        expect(typeof info.icon).toBe("string");
        expect(info.icon.length).toBeGreaterThan(0);
      }
    });

    it("timber has correct info", () => {
      expect(RESOURCE_INFO.timber.name).toBe("Timber");
      expect(RESOURCE_INFO.timber.icon).toBe("tree");
    });

    it("sap has correct info", () => {
      expect(RESOURCE_INFO.sap.name).toBe("Sap");
      expect(RESOURCE_INFO.sap.icon).toBe("droplet");
    });

    it("fruit has correct info", () => {
      expect(RESOURCE_INFO.fruit.name).toBe("Fruit");
      expect(RESOURCE_INFO.fruit.icon).toBe("apple");
    });

    it("acorns has correct info", () => {
      expect(RESOURCE_INFO.acorns.name).toBe("Acorns");
      expect(RESOURCE_INFO.acorns.icon).toBe("nut");
    });
  });

  describe("emptyResources", () => {
    it("returns an object with all resources set to 0", () => {
      const empty = emptyResources();
      expect(empty).toEqual({
        timber: 0,
        sap: 0,
        fruit: 0,
        acorns: 0,
      });
    });

    it("returns a new object each time (not shared reference)", () => {
      const a = emptyResources();
      const b = emptyResources();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it("returned object is mutable without affecting future calls", () => {
      const a = emptyResources();
      a.timber = 100;
      const b = emptyResources();
      expect(b.timber).toBe(0);
    });

    it("has exactly 4 keys", () => {
      const empty = emptyResources();
      expect(Object.keys(empty).length).toBe(4);
    });
  });
});
