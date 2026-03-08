import { useGameStore } from "./index.ts";

describe("Settings Store (Spec §15, §25.1, §26, §32.3)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("Settings actions", () => {
    it("setHasSeenRules persists", () => {
      useGameStore.getState().setHasSeenRules(true);
      expect(useGameStore.getState().hasSeenRules).toBe(true);
    });

    it("setHapticsEnabled persists", () => {
      useGameStore.getState().setHapticsEnabled(false);
      expect(useGameStore.getState().hapticsEnabled).toBe(false);
    });

    it("setSoundEnabled persists", () => {
      useGameStore.getState().setSoundEnabled(false);
      expect(useGameStore.getState().soundEnabled).toBe(false);
    });
  });

  describe("discoverSpirit (Spec §32.3)", () => {
    it("starts with no discovered spirits", () => {
      expect(useGameStore.getState().discoveredSpiritIds).toEqual([]);
    });

    it("returns true and records spirit on first discovery", () => {
      const result = useGameStore.getState().discoverSpirit("spirit-0");
      expect(result).toBe(true);
      expect(useGameStore.getState().discoveredSpiritIds).toContain("spirit-0");
    });

    it("returns false and does not double-count the same spirit", () => {
      useGameStore.getState().discoverSpirit("spirit-1");
      const result = useGameStore.getState().discoverSpirit("spirit-1");
      expect(result).toBe(false);
      const ids = useGameStore.getState().discoveredSpiritIds;
      expect(ids.filter((id) => id === "spirit-1").length).toBe(1);
    });

    it("auto-starts main-quest-spirits chain on first discovery", () => {
      useGameStore.getState().discoverSpirit("spirit-2");
      const chainState = useGameStore.getState().questChainState;
      expect("main-quest-spirits" in chainState.activeChains).toBe(true);
    });

    it("each discovery advances the main quest objective", () => {
      for (let i = 0; i < 3; i++) {
        useGameStore.getState().discoverSpirit(`spirit-${i}`);
      }
      const chainState = useGameStore.getState().questChainState;
      const step = chainState.activeChains["main-quest-spirits"]?.steps[0];
      expect(step?.objectives[0]?.currentProgress).toBe(3);
    });

    it("does not start the chain again if already active", () => {
      useGameStore.getState().discoverSpirit("spirit-a");
      useGameStore.getState().discoverSpirit("spirit-b");
      const chainState = useGameStore.getState().questChainState;
      expect("main-quest-spirits" in chainState.activeChains).toBe(true);
    });
  });
});
