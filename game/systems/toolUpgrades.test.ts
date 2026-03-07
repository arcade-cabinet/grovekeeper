import {
  canAffordToolUpgrade,
  getEffectWithUpgrade,
  getStaminaCostWithUpgrade,
  getToolUpgradeTier,
  TOOL_UPGRADE_TIERS,
} from "./toolUpgrades";

describe("tool upgrades system", () => {
  describe("TOOL_UPGRADE_TIERS", () => {
    it("has 3 tiers", () => {
      expect(TOOL_UPGRADE_TIERS).toHaveLength(3);
    });

    it("has increasing stamina reduction per tier", () => {
      expect(TOOL_UPGRADE_TIERS[0].staminaReduction).toBe(0.1);
      expect(TOOL_UPGRADE_TIERS[1].staminaReduction).toBe(0.2);
      expect(TOOL_UPGRADE_TIERS[2].staminaReduction).toBe(0.3);
    });

    it("has increasing effect boost per tier", () => {
      expect(TOOL_UPGRADE_TIERS[0].effectBoost).toBe(0.1);
      expect(TOOL_UPGRADE_TIERS[1].effectBoost).toBe(0.2);
      expect(TOOL_UPGRADE_TIERS[2].effectBoost).toBe(0.3);
    });

    it("has increasing costs per tier", () => {
      const cost1Keys = Object.keys(TOOL_UPGRADE_TIERS[0].cost);
      const cost3Keys = Object.keys(TOOL_UPGRADE_TIERS[2].cost);
      expect(cost3Keys.length).toBeGreaterThan(cost1Keys.length);
    });
  });

  describe("getToolUpgradeTier", () => {
    it("returns tier 1 data for current tier 0", () => {
      const tier = getToolUpgradeTier(0);
      expect(tier).toEqual(TOOL_UPGRADE_TIERS[0]);
    });

    it("returns tier 2 data for current tier 1", () => {
      const tier = getToolUpgradeTier(1);
      expect(tier).toEqual(TOOL_UPGRADE_TIERS[1]);
    });

    it("returns tier 3 data for current tier 2", () => {
      const tier = getToolUpgradeTier(2);
      expect(tier).toEqual(TOOL_UPGRADE_TIERS[2]);
    });

    it("returns null when already at max tier (3)", () => {
      expect(getToolUpgradeTier(3)).toBeNull();
    });

    it("returns null for tiers beyond max", () => {
      expect(getToolUpgradeTier(5)).toBeNull();
    });
  });

  describe("getStaminaCostWithUpgrade", () => {
    it("returns base cost at tier 0", () => {
      expect(getStaminaCostWithUpgrade(10, 0)).toBe(10);
    });

    it("reduces cost by 10% at tier 1", () => {
      expect(getStaminaCostWithUpgrade(10, 1)).toBe(9);
    });

    it("reduces cost by 20% at tier 2", () => {
      expect(getStaminaCostWithUpgrade(10, 2)).toBe(8);
    });

    it("reduces cost by 30% at tier 3", () => {
      expect(getStaminaCostWithUpgrade(10, 3)).toBe(7);
    });

    it("never goes below 1", () => {
      expect(getStaminaCostWithUpgrade(1, 3)).toBe(1);
    });

    it("returns base cost for negative tier", () => {
      expect(getStaminaCostWithUpgrade(10, -1)).toBe(10);
    });

    it("clamps to tier 3 for higher values", () => {
      expect(getStaminaCostWithUpgrade(10, 5)).toBe(7); // same as tier 3
    });
  });

  describe("getEffectWithUpgrade", () => {
    it("returns base effect at tier 0", () => {
      expect(getEffectWithUpgrade(10, 0)).toBe(10);
    });

    it("increases effect by 10% at tier 1", () => {
      expect(getEffectWithUpgrade(10, 1)).toBe(11);
    });

    it("increases effect by 20% at tier 2", () => {
      expect(getEffectWithUpgrade(10, 2)).toBe(12);
    });

    it("increases effect by 30% at tier 3", () => {
      expect(getEffectWithUpgrade(10, 3)).toBe(13);
    });

    it("returns base effect for negative tier", () => {
      expect(getEffectWithUpgrade(10, -1)).toBe(10);
    });
  });

  describe("canAffordToolUpgrade", () => {
    it("returns true when player has enough resources", () => {
      const resources = { timber: 20, sap: 10 };
      expect(canAffordToolUpgrade(TOOL_UPGRADE_TIERS[0], resources)).toBe(true);
    });

    it("returns true with exactly matching resources", () => {
      const resources = { timber: 20, sap: 10 };
      expect(canAffordToolUpgrade(TOOL_UPGRADE_TIERS[0], resources)).toBe(true);
    });

    it("returns false when lacking any resource", () => {
      const resources = { timber: 19, sap: 10 };
      expect(canAffordToolUpgrade(TOOL_UPGRADE_TIERS[0], resources)).toBe(false);
    });

    it("returns false when resource key is missing", () => {
      const resources = { timber: 100 };
      expect(canAffordToolUpgrade(TOOL_UPGRADE_TIERS[0], resources)).toBe(false);
    });

    it("checks tier 3 costs (4 resource types)", () => {
      const resources = { timber: 80, sap: 40, fruit: 20, acorns: 10 };
      expect(canAffordToolUpgrade(TOOL_UPGRADE_TIERS[2], resources)).toBe(true);
      const insufficient = { timber: 80, sap: 40, fruit: 20, acorns: 9 };
      expect(canAffordToolUpgrade(TOOL_UPGRADE_TIERS[2], insufficient)).toBe(false);
    });
  });
});
