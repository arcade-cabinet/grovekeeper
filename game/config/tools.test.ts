import { getToolById, TOOLS } from "@/game/config/tools";

describe("tools config", () => {
  describe("TOOLS", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(TOOLS)).toBe(true);
      expect(TOOLS.length).toBeGreaterThan(0);
    });

    it("contains 13 tools", () => {
      expect(TOOLS.length).toBe(13);
    });

    it("all tools have required fields", () => {
      for (const tool of TOOLS) {
        expect(typeof tool.id).toBe("string");
        expect(tool.id.length).toBeGreaterThan(0);
        expect(typeof tool.name).toBe("string");
        expect(tool.name.length).toBeGreaterThan(0);
        expect(typeof tool.description).toBe("string");
        expect(typeof tool.icon).toBe("string");
        expect(typeof tool.unlockLevel).toBe("number");
        expect(typeof tool.staminaCost).toBe("number");
        expect(typeof tool.action).toBe("string");
      }
    });

    it("all tools have unique IDs", () => {
      const ids = TOOLS.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("stamina costs are non-negative", () => {
      for (const tool of TOOLS) {
        expect(tool.staminaCost).toBeGreaterThanOrEqual(0);
      }
    });

    it("unlock levels are positive", () => {
      for (const tool of TOOLS) {
        expect(tool.unlockLevel).toBeGreaterThanOrEqual(1);
      }
    });

    it("trowel is unlocked at level 1", () => {
      const trowel = TOOLS.find((t) => t.id === "trowel");
      expect(trowel).toBeDefined();
      expect(trowel!.unlockLevel).toBe(1);
      expect(trowel!.staminaCost).toBe(5);
      expect(trowel!.action).toBe("PLANT");
    });

    it("watering-can is unlocked at level 1", () => {
      const can = TOOLS.find((t) => t.id === "watering-can");
      expect(can).toBeDefined();
      expect(can!.unlockLevel).toBe(1);
      expect(can!.staminaCost).toBe(3);
      expect(can!.action).toBe("WATER");
    });

    it("almanac has 0 stamina cost", () => {
      const almanac = TOOLS.find((t) => t.id === "almanac");
      expect(almanac).toBeDefined();
      expect(almanac!.staminaCost).toBe(0);
    });

    it("seed-pouch has 0 stamina cost", () => {
      const pouch = TOOLS.find((t) => t.id === "seed-pouch");
      expect(pouch).toBeDefined();
      expect(pouch!.staminaCost).toBe(0);
    });

    it("axe has highest stamina cost among basic tools", () => {
      const axe = TOOLS.find((t) => t.id === "axe");
      expect(axe).toBeDefined();
      expect(axe!.staminaCost).toBe(10);
    });
  });

  describe("getToolById", () => {
    it("finds a known tool", () => {
      const tool = getToolById("trowel");
      expect(tool).toBeDefined();
      expect(tool!.name).toBe("Trowel");
    });

    it("returns undefined for unknown tool ID", () => {
      expect(getToolById("nonexistent-tool")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(getToolById("")).toBeUndefined();
    });

    it("returns correct data for axe", () => {
      const tool = getToolById("axe");
      expect(tool).toBeDefined();
      expect(tool!.name).toBe("Axe");
      expect(tool!.unlockLevel).toBe(7);
      expect(tool!.staminaCost).toBe(10);
      expect(tool!.action).toBe("CHOP");
    });

    it("returns correct data for grafting-tool (highest unlock level)", () => {
      const tool = getToolById("grafting-tool");
      expect(tool).toBeDefined();
      expect(tool!.unlockLevel).toBe(20);
      expect(tool!.staminaCost).toBe(15);
    });

    it("finds all tools by ID", () => {
      for (const tool of TOOLS) {
        const found = getToolById(tool.id);
        expect(found).toBeDefined();
        expect(found!.id).toBe(tool.id);
      }
    });
  });
});
