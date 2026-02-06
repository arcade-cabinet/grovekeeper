import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "./gameStore";

describe("Game Store", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("Initial state", () => {
    it("starts on menu screen", () => {
      expect(useGameStore.getState().screen).toBe("menu");
    });

    it("has initial coins", () => {
      expect(useGameStore.getState().coins).toBe(100);
    });

    it("has default tools unlocked", () => {
      const tools = useGameStore.getState().unlockedTools;
      expect(tools).toContain("trowel");
      expect(tools).toContain("watering-can");
    });

    it("has starter species unlocked", () => {
      const species = useGameStore.getState().unlockedSpecies;
      expect(species).toContain("white-oak");
    });
  });

  describe("Actions", () => {
    it("setScreen changes current screen", () => {
      useGameStore.getState().setScreen("playing");
      expect(useGameStore.getState().screen).toBe("playing");
    });

    it("addCoins increases coin count", () => {
      const initial = useGameStore.getState().coins;
      useGameStore.getState().addCoins(50);
      expect(useGameStore.getState().coins).toBe(initial + 50);
    });

    it("addXp increases XP and can level up", () => {
      useGameStore.getState().addXp(500);
      expect(useGameStore.getState().xp).toBe(500);
      expect(useGameStore.getState().level).toBe(2);
    });

    it("unlockTool adds new tool without duplicates", () => {
      useGameStore.getState().unlockTool("axe");
      useGameStore.getState().unlockTool("axe");

      const tools = useGameStore.getState().unlockedTools;
      expect(tools.filter((t) => t === "axe").length).toBe(1);
    });

    it("unlockSpecies adds new species without duplicates", () => {
      useGameStore.getState().unlockSpecies("pine");
      useGameStore.getState().unlockSpecies("pine");

      const species = useGameStore.getState().unlockedSpecies;
      expect(species.filter((s) => s === "pine").length).toBe(1);
    });

    it("incrementTreesPlanted tracks planted trees", () => {
      useGameStore.getState().incrementTreesPlanted();
      useGameStore.getState().incrementTreesPlanted();
      expect(useGameStore.getState().treesPlanted).toBe(2);
    });

    it("resetGame restores initial state", () => {
      useGameStore.getState().addCoins(1000);
      useGameStore.getState().setScreen("playing");
      useGameStore.getState().resetGame();

      expect(useGameStore.getState().coins).toBe(100);
      expect(useGameStore.getState().screen).toBe("menu");
    });
  });

  describe("Resource system", () => {
    it("starts with zero resources", () => {
      const state = useGameStore.getState();
      expect(state.resources).toEqual({ timber: 0, sap: 0, fruit: 0, acorns: 0 });
    });

    it("addResource increases a specific resource", () => {
      useGameStore.getState().addResource("timber", 10);
      expect(useGameStore.getState().resources.timber).toBe(10);
    });

    it("spendResource decreases a specific resource", () => {
      useGameStore.getState().addResource("sap", 20);
      const success = useGameStore.getState().spendResource("sap", 15);
      expect(success).toBe(true);
      expect(useGameStore.getState().resources.sap).toBe(5);
    });

    it("spendResource returns false if insufficient", () => {
      useGameStore.getState().addResource("fruit", 5);
      const success = useGameStore.getState().spendResource("fruit", 10);
      expect(success).toBe(false);
      expect(useGameStore.getState().resources.fruit).toBe(5);
    });
  });

  describe("Seed inventory", () => {
    it("starts with 10 white-oak seeds", () => {
      expect(useGameStore.getState().seeds["white-oak"]).toBe(10);
    });

    it("addSeed increases seed count", () => {
      useGameStore.getState().addSeed("elder-pine", 5);
      expect(useGameStore.getState().seeds["elder-pine"]).toBe(5);
    });

    it("spendSeed decreases seed count", () => {
      useGameStore.getState().addSeed("cherry-blossom", 3);
      const success = useGameStore.getState().spendSeed("cherry-blossom", 1);
      expect(success).toBe(true);
      expect(useGameStore.getState().seeds["cherry-blossom"]).toBe(2);
    });

    it("spendSeed returns false if insufficient", () => {
      const success = useGameStore.getState().spendSeed("redwood", 1);
      expect(success).toBe(false);
    });
  });

  describe("Stamina", () => {
    it("starts with 100 stamina", () => {
      expect(useGameStore.getState().stamina).toBe(100);
      expect(useGameStore.getState().maxStamina).toBe(100);
    });

    it("setStamina updates stamina value", () => {
      useGameStore.getState().setStamina(50);
      expect(useGameStore.getState().stamina).toBe(50);
    });

    it("resetGame restores stamina to 100", () => {
      useGameStore.getState().setStamina(0);
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().stamina).toBe(100);
    });
  });

  describe("Level progression", () => {
    it("level increases at 500 XP intervals", () => {
      useGameStore.getState().addXp(499);
      expect(useGameStore.getState().level).toBe(1);

      useGameStore.getState().addXp(1);
      expect(useGameStore.getState().level).toBe(2);
    });

    it("calculates correct level for large XP values", () => {
      useGameStore.getState().addXp(2500);
      expect(useGameStore.getState().level).toBe(6);
    });
  });
});
