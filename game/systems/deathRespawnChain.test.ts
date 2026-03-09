/**
 * End-to-end Death → Respawn chain tests.
 *
 * Verifies the full pipeline:
 *   hearts→0 → tickSurvival detects death → applyDeathPenalty →
 *   screen change → respawn/permadeath → player teleported to campfire
 *
 * Spec §12.3 (death trigger), §12.5 (respawn at campfire), §2.1 (difficulty tiers).
 */

import type { DifficultyConfig } from "@/game/config/difficulty";
import { emptyResources } from "@/game/config/resources";
import { tickSurvival } from "@/game/hooks/useGameLoop/tickSurvival";
import { useGameStore } from "@/game/stores";
import { computeRespawnPosition } from "@/game/systems/deathRespawn";

/** Minimal difficulty config for testing. */
function makeDiffConfig(overrides: Partial<DifficultyConfig> = {}): DifficultyConfig {
  return {
    id: "sapling",
    name: "Sapling",
    tagline: "",
    description: "",
    color: "",
    icon: "",
    affectsGameplay: true,
    permadeathForced: "optional",
    growthSpeedMult: 1,
    resourceYieldMult: 1,
    seedCostMult: 1,
    structureCostMult: 1,
    harvestCycleMult: 1,
    staminaDrainMult: 1,
    staminaRegenMult: 1,
    weatherFrequencyMult: 1,
    weatherDurationMult: 1,
    seasonLengthDays: 90,
    exposureEnabled: false,
    exposureDriftRate: 0,
    unconsciousnessHoursLost: 6,
    buildingDegradationRate: 0,
    disasterFrequency: 0,
    splitInventory: false,
    cropDiseaseEnabled: false,
    playerConditionsEnabled: false,
    deathDropsInventory: false,
    deathLosesSeason: false,
    startingResources: {},
    startingSeeds: {},
    windstormDamageChance: 0,
    rainGrowthBonus: 1,
    droughtGrowthPenalty: 1,
    damageMultiplier: 1,
    incomingDamageMultiplier: 1,
    hungerDrainRate: 1,
    maxHearts: 5,
    ...overrides,
  };
}

describe("Death → Respawn full chain (Spec §12.3, §12.5, §2.1)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ screen: "playing" });
  });

  describe("Step 1: hearts→0 triggers death via tickSurvival", () => {
    it("transitions from playing → death screen when hearts drain to 0", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        difficulty: "sapling",
        permadeath: false,
      });

      const config = makeDiffConfig({ hungerDrainRate: 1, affectsGameplay: true });
      tickSurvival(config, 10);

      const state = useGameStore.getState();
      expect(state.screen).toBe("death");
    });

    it("transitions from playing → permadeath for ironwood difficulty", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        difficulty: "ironwood",
        permadeath: false,
      });

      const config = makeDiffConfig({
        id: "ironwood",
        hungerDrainRate: 2,
        affectsGameplay: true,
        permadeathForced: "on",
      });
      tickSurvival(config, 10);

      expect(useGameStore.getState().screen).toBe("permadeath");
    });
  });

  describe("Step 2: applyDeathPenalty applies correct penalties", () => {
    it("resets vitals on normal death (hearts=1, hunger=50%, bodyTemp=37)", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        maxHunger: 100,
        bodyTemp: 15,
        difficulty: "sapling",
        permadeath: false,
      });

      const config = makeDiffConfig({ affectsGameplay: true });
      tickSurvival(config, 10);

      const state = useGameStore.getState();
      expect(state.hearts).toBe(1);
      expect(state.hunger).toBe(50);
      expect(state.bodyTemp).toBe(37.0);
    });

    it("deducts 25% of resources on death", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        resources: { ...emptyResources(), timber: 100, sap: 40 },
        difficulty: "sapling",
        permadeath: false,
      });

      const config = makeDiffConfig({ affectsGameplay: true });
      tickSurvival(config, 10);

      const resources = useGameStore.getState().resources;
      expect(resources.timber).toBe(75);
      expect(resources.sap).toBe(30);
    });

    it("resets level and XP on permadeath", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        difficulty: "ironwood",
        level: 10,
        xp: 5000,
      });

      const config = makeDiffConfig({
        id: "ironwood",
        affectsGameplay: true,
        permadeathForced: "on",
      });
      tickSurvival(config, 10);

      const state = useGameStore.getState();
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
    });

    it("clears campfire data on permadeath", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        difficulty: "ironwood",
        lastCampfireId: "fire-1",
        lastCampfirePosition: { x: 10, y: 1, z: 20 },
      });

      const config = makeDiffConfig({
        id: "ironwood",
        affectsGameplay: true,
        permadeathForced: "on",
      });
      tickSurvival(config, 10);

      const state = useGameStore.getState();
      expect(state.lastCampfireId).toBeNull();
      expect(state.lastCampfirePosition).toBeNull();
    });
  });

  describe("Step 3: respawn position computed correctly", () => {
    it("respawns at last campfire when set", () => {
      const pos = computeRespawnPosition({ x: 10, y: 1, z: 20 });
      expect(pos).toEqual({ x: 10, y: 1, z: 20 });
    });

    it("respawns at default spawn when no campfire visited", () => {
      const pos = computeRespawnPosition(null);
      expect(pos).toEqual({ x: 6, y: 0, z: 6 });
    });
  });

  describe("Step 4: death does not re-trigger", () => {
    it("does not call applyDeathPenalty again if screen is already death", () => {
      useGameStore.setState({
        hearts: 0,
        hunger: 0,
        difficulty: "sapling",
        permadeath: false,
        screen: "death",
      });

      const config = makeDiffConfig({ affectsGameplay: true });

      // Hearts are 0, but screen is already "death" — should not re-trigger
      tickSurvival(config, 1);

      // If it re-triggered, hearts would be reset to 1 again by applyDeathPenalty.
      // Since we set hearts to 0 and screen is already "death", hearts should stay 0.
      expect(useGameStore.getState().hearts).toBe(0);
    });

    it("does not trigger death when screen is paused", () => {
      useGameStore.setState({
        hearts: 0,
        hunger: 0,
        difficulty: "sapling",
        screen: "paused",
      });

      const config = makeDiffConfig({ affectsGameplay: true });
      tickSurvival(config, 1);

      expect(useGameStore.getState().screen).toBe("paused");
    });
  });

  describe("Step 5: exploration mode never triggers death", () => {
    it("keeps screen as playing even with 0 hearts in exploration mode", () => {
      useGameStore.setState({
        hearts: 0,
        hunger: 0,
        difficulty: "seedling",
        screen: "playing",
      });

      const config = makeDiffConfig({ affectsGameplay: false });
      tickSurvival(config, 10);

      expect(useGameStore.getState().screen).toBe("playing");
    });
  });

  describe("Step 6: hardwood respects permadeath flag", () => {
    it("goes to normal death screen for hardwood WITHOUT permadeath flag", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        difficulty: "hardwood",
        permadeath: false,
      });

      const config = makeDiffConfig({ id: "hardwood", affectsGameplay: true });
      tickSurvival(config, 10);

      expect(useGameStore.getState().screen).toBe("death");
    });

    it("goes to permadeath screen for hardwood WITH permadeath flag", () => {
      useGameStore.setState({
        hearts: 0.01,
        hunger: 0,
        difficulty: "hardwood",
        permadeath: true,
      });

      const config = makeDiffConfig({
        id: "hardwood",
        affectsGameplay: true,
        permadeathForced: "optional",
      });
      tickSurvival(config, 10);

      expect(useGameStore.getState().screen).toBe("permadeath");
    });
  });
});
