import { emptyResources } from "@/game/config/resources";
import { useGameStore } from "./index.ts";

describe("Inventory Store (Spec §5, §7)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("Resource system", () => {
    it("starts with zero resources", () => {
      const state = useGameStore.getState();
      expect(state.resources).toEqual(emptyResources());
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

  describe("Lifetime resource tracking", () => {
    it("addResource increments lifetime totals", () => {
      useGameStore.getState().addResource("timber", 50);
      useGameStore.getState().addResource("timber", 30);
      expect(useGameStore.getState().lifetimeResources.timber).toBe(80);
    });

    it("spendResource does NOT reduce lifetime totals", () => {
      useGameStore.getState().addResource("sap", 100);
      useGameStore.getState().spendResource("sap", 60);
      expect(useGameStore.getState().lifetimeResources.sap).toBe(100);
      expect(useGameStore.getState().resources.sap).toBe(40);
    });

    it("tracks all 4 resource types independently", () => {
      useGameStore.getState().addResource("timber", 10);
      useGameStore.getState().addResource("sap", 20);
      useGameStore.getState().addResource("fruit", 30);
      useGameStore.getState().addResource("acorns", 40);
      const lr = useGameStore.getState().lifetimeResources;
      expect(lr.timber).toBe(10);
      expect(lr.sap).toBe(20);
      expect(lr.fruit).toBe(30);
      expect(lr.acorns).toBe(40);
    });
  });
});
