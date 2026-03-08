/**
 * tickSurvival death-detection integration tests.
 * Spec §12.3 (death trigger), §12.5 (respawn).
 */

import type { DifficultyConfig } from "@/game/config/difficulty";
import { useGameStore } from "@/game/stores";
import { tickSurvival } from "./tickSurvival.ts";

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

describe("tickSurvival death detection (Spec §12.3)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ screen: "playing" });
  });

  it("triggers death screen when hearts reach 0 from starvation", () => {
    useGameStore.setState({
      hearts: 0.01,
      hunger: 0,
      difficulty: "sapling",
      permadeath: false,
    });

    // Tick long enough to drain last sliver of hearts
    const config = makeDiffConfig({ hungerDrainRate: 1, affectsGameplay: true });
    tickSurvival(config, 10);

    expect(useGameStore.getState().screen).toBe("death");
  });

  it("triggers permadeath screen for ironwood difficulty", () => {
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

  it("does not trigger death when hearts > 0", () => {
    useGameStore.setState({
      hearts: 3,
      hunger: 50,
      difficulty: "sapling",
    });

    const config = makeDiffConfig({ hungerDrainRate: 1, affectsGameplay: true });
    tickSurvival(config, 0.016);

    expect(useGameStore.getState().screen).toBe("playing");
  });

  it("skips death detection when affectsGameplay is false (Exploration)", () => {
    useGameStore.setState({
      hearts: 0,
      hunger: 0,
      difficulty: "seedling",
    });

    const config = makeDiffConfig({ affectsGameplay: false, hungerDrainRate: 0 });
    tickSurvival(config, 1);

    // Screen should remain playing — exploration mode doesn't kill
    expect(useGameStore.getState().screen).toBe("playing");
  });
});
