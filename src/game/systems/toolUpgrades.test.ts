import { describe, it, expect } from "vitest";
import {
  getToolUpgradeTier,
  getStaminaCostWithUpgrade,
  getEffectWithUpgrade,
  canAffordToolUpgrade,
  TOOL_UPGRADE_TIERS,
} from "./toolUpgrades";

describe("toolUpgrades", () => {
  describe("getToolUpgradeTier", () => {
    it("returns tier 1 data for current tier 0", () => {
      const tier = getToolUpgradeTier(0);
      expect(tier).not.toBeNull();
      expect(tier!.tier).toBe(1);
      expect(tier!.staminaReduction).toBe(0.1);
    });

    it("returns tier 2 data for current tier 1", () => {
      const tier = getToolUpgradeTier(1);
      expect(tier).not.toBeNull();
      expect(tier!.tier).toBe(2);
      expect(tier!.staminaReduction).toBe(0.2);
    });

    it("returns tier 3 data for current tier 2", () => {
      const tier = getToolUpgradeTier(2);
      expect(tier).not.toBeNull();
      expect(tier!.tier).toBe(3);
      expect(tier!.staminaReduction).toBe(0.3);
    });

    it("returns null for tier 3 (max)", () => {
      const tier = getToolUpgradeTier(3);
      expect(tier).toBeNull();
    });
  });

  describe("getStaminaCostWithUpgrade", () => {
    it("reduces cost by 10% at tier 1", () => {
      // 10 * (1 - 0.1) = 9
      expect(getStaminaCostWithUpgrade(10, 1)).toBe(9);
    });

    it("reduces cost by 20% at tier 2", () => {
      // 10 * (1 - 0.2) = 8
      expect(getStaminaCostWithUpgrade(10, 2)).toBe(8);
    });

    it("reduces cost by 30% at tier 3", () => {
      // 10 * (1 - 0.3) = 7
      expect(getStaminaCostWithUpgrade(10, 3)).toBe(7);
    });

    it("returns baseCost for tier 0", () => {
      expect(getStaminaCostWithUpgrade(10, 0)).toBe(10);
    });

    it("never reduces below 1", () => {
      expect(getStaminaCostWithUpgrade(1, 3)).toBe(1);
    });
  });

  describe("getEffectWithUpgrade", () => {
    it("boosts effect by 10% at tier 1", () => {
      expect(getEffectWithUpgrade(100, 1)).toBeCloseTo(110);
    });

    it("boosts effect by 20% at tier 2", () => {
      expect(getEffectWithUpgrade(100, 2)).toBeCloseTo(120);
    });

    it("boosts effect by 30% at tier 3", () => {
      expect(getEffectWithUpgrade(100, 3)).toBeCloseTo(130);
    });

    it("returns baseEffect for tier 0", () => {
      expect(getEffectWithUpgrade(100, 0)).toBeCloseTo(100);
    });
  });

  describe("canAffordToolUpgrade", () => {
    it("returns true with enough resources", () => {
      const tier1 = TOOL_UPGRADE_TIERS[0];
      const resources = { timber: 20, sap: 10 };
      expect(canAffordToolUpgrade(tier1, resources)).toBe(true);
    });

    it("returns false with insufficient resources", () => {
      const tier1 = TOOL_UPGRADE_TIERS[0];
      const resources = { timber: 10, sap: 5 };
      expect(canAffordToolUpgrade(tier1, resources)).toBe(false);
    });

    it("returns false when a resource is missing entirely", () => {
      const tier1 = TOOL_UPGRADE_TIERS[0];
      const resources = { timber: 20 };
      expect(canAffordToolUpgrade(tier1, resources)).toBe(false);
    });
  });
});
