import {
  canAffordToolUpgrade,
  getDamageMultiplierForTier,
  getEffectWithUpgrade,
  getSpeedMultiplierForTier,
  getStaminaCostWithUpgrade,
  getToolTierName,
  getToolUpgradeTier,
  requiresForgeForUpgrade,
  TOOL_UPGRADE_TIERS,
} from "./toolUpgrades.ts";

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

    it("each tier has a name and requiresForge field (from config)", () => {
      expect(typeof TOOL_UPGRADE_TIERS[0].name).toBe("string");
      expect(typeof TOOL_UPGRADE_TIERS[0].requiresForge).toBe("boolean");
    });

    it("final tier is named grovekeeper (Spec §11.2)", () => {
      expect(TOOL_UPGRADE_TIERS[2].name).toBe("grovekeeper");
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

  describe("getToolTierName (Spec §11.2)", () => {
    it("returns basic for tier 0", () => {
      expect(getToolTierName(0)).toBe("basic");
    });

    it("returns iron for tier 1", () => {
      expect(getToolTierName(1)).toBe("iron");
    });

    it("returns grovekeeper for max tier", () => {
      expect(getToolTierName(3)).toBe("grovekeeper");
    });

    it("returns basic for negative tier", () => {
      expect(getToolTierName(-1)).toBe("basic");
    });

    it("returns basic for unknown tier beyond max", () => {
      expect(getToolTierName(99)).toBe("basic");
    });
  });

  describe("requiresForgeForUpgrade (Spec §11.2)", () => {
    it("returns true when upgrading from basic (forge required)", () => {
      expect(requiresForgeForUpgrade(0)).toBe(true);
    });

    it("returns true when upgrading from iron", () => {
      expect(requiresForgeForUpgrade(1)).toBe(true);
    });

    it("returns false at max tier (no upgrade available)", () => {
      expect(requiresForgeForUpgrade(3)).toBe(false);
    });
  });

  describe("getDamageMultiplierForTier (Spec §11.2)", () => {
    it("returns 1.0 for tier 0 (basic)", () => {
      expect(getDamageMultiplierForTier(0)).toBe(1.0);
    });

    it("returns 1.5 for tier 1 (iron)", () => {
      expect(getDamageMultiplierForTier(1)).toBe(1.5);
    });

    it("returns 2.0 for tier 3 (grovekeeper)", () => {
      expect(getDamageMultiplierForTier(3)).toBe(2.0);
    });

    it("returns 1.0 for unknown tier", () => {
      expect(getDamageMultiplierForTier(-1)).toBe(1.0);
    });
  });

  describe("getSpeedMultiplierForTier (Spec §11.2)", () => {
    it("returns 1.0 for tier 0 (basic)", () => {
      expect(getSpeedMultiplierForTier(0)).toBe(1.0);
    });

    it("returns 1.25 for tier 1 (iron)", () => {
      expect(getSpeedMultiplierForTier(1)).toBe(1.25);
    });

    it("returns 1.5 for tier 3 (grovekeeper)", () => {
      expect(getSpeedMultiplierForTier(3)).toBe(1.5);
    });
  });
});
