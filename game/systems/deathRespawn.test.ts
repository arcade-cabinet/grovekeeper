/**
 * Death/Respawn system tests.
 * Spec §12.3 (death trigger), §12.5 (respawn at campfire), §2.1 (difficulty), §2.2 (survival).
 */

import { emptyResources } from "@/game/config/resources";
import { useGameStore } from "@/game/stores";
import { startNewGame } from "@/game/stores/survivalState";
import {
  applyDeathPenalty,
  computeDeathScreen,
  computeResourceLoss,
  computeRespawnPosition,
} from "@/game/systems/deathRespawn";

describe("Death/Respawn System (Spec §12.3, §12.5, §2.1)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  // ── Screen routing ──────────────────────────────────────────────────────

  describe("computeDeathScreen — route to correct screen on death", () => {
    it("returns 'death' for seedling (non-permadeath difficulty)", () => {
      expect(computeDeathScreen("seedling", false)).toBe("death");
    });

    it("returns 'death' for sapling without permadeath", () => {
      expect(computeDeathScreen("sapling", false)).toBe("death");
    });

    it("returns 'death' for hardwood without permadeath", () => {
      expect(computeDeathScreen("hardwood", false)).toBe("death");
    });

    it("returns 'permadeath' for ironwood (always permadeath)", () => {
      expect(computeDeathScreen("ironwood", false)).toBe("permadeath");
    });

    it("returns 'permadeath' for hardwood with permadeath enabled", () => {
      expect(computeDeathScreen("hardwood", true)).toBe("permadeath");
    });

    it("returns 'permadeath' for sapling with permadeath enabled", () => {
      expect(computeDeathScreen("sapling", true)).toBe("permadeath");
    });

    it("returns 'death' for seedling even with permadeath flag (forced off)", () => {
      // Seedling permadeathForced === 'off', so permadeath flag is ignored
      expect(computeDeathScreen("seedling", true)).toBe("death");
    });
  });

  // ── Resource loss ───────────────────────────────────────────────────────

  describe("computeResourceLoss — partial resource drop on death (Spec §12.3)", () => {
    it("loses 25% of each resource (default fraction)", () => {
      const resources = { ...emptyResources(), timber: 100, sap: 40 };
      const lost = computeResourceLoss(resources, 0.25);
      expect(lost.timber).toBe(25);
      expect(lost.sap).toBe(10);
      expect(lost.fruit).toBe(0);
    });

    it("floors fractional losses", () => {
      const resources = { ...emptyResources(), timber: 3 };
      const lost = computeResourceLoss(resources, 0.25);
      // 3 * 0.25 = 0.75 → floor = 0
      expect(lost.timber).toBe(0);
    });

    it("handles zero resources gracefully", () => {
      const resources = emptyResources();
      const lost = computeResourceLoss(resources, 0.25);
      for (const v of Object.values(lost)) {
        expect(v).toBe(0);
      }
    });

    it("handles 0% loss fraction (seedling no-drop)", () => {
      const resources = { ...emptyResources(), timber: 100 };
      const lost = computeResourceLoss(resources, 0);
      expect(lost.timber).toBe(0);
    });
  });

  // ── Respawn position ────────────────────────────────────────────────────

  describe("computeRespawnPosition — teleport to last campfire (Spec §12.5)", () => {
    it("returns lastCampfirePosition when set", () => {
      const pos = computeRespawnPosition({ x: 10, y: 1, z: 20 });
      expect(pos).toEqual({ x: 10, y: 1, z: 20 });
    });

    it("returns default spawn position when no campfire visited", () => {
      const pos = computeRespawnPosition(null);
      expect(pos).toEqual({ x: 6, y: 0, z: 6 });
    });
  });

  // ── Full death penalty integration ──────────────────────────────────────

  describe("applyDeathPenalty — full non-permadeath respawn flow", () => {
    it("resets hearts to config value", () => {
      useGameStore.setState({ hearts: 0, maxHearts: 5, difficulty: "sapling" });
      applyDeathPenalty();
      const state = useGameStore.getState();
      expect(state.hearts).toBe(1);
    });

    it("resets hunger to 50% of max", () => {
      useGameStore.setState({ hunger: 0, maxHunger: 100, difficulty: "sapling" });
      applyDeathPenalty();
      expect(useGameStore.getState().hunger).toBe(50);
    });

    it("resets body temperature to 37", () => {
      useGameStore.setState({ bodyTemp: 20, difficulty: "sapling" });
      applyDeathPenalty();
      expect(useGameStore.getState().bodyTemp).toBe(37.0);
    });

    it("removes 25% of resources", () => {
      useGameStore.setState({
        resources: { ...emptyResources(), timber: 100, sap: 40 },
        difficulty: "sapling",
      });
      applyDeathPenalty();
      const resources = useGameStore.getState().resources;
      expect(resources.timber).toBe(75);
      expect(resources.sap).toBe(30);
    });

    it("sets screen to death", () => {
      useGameStore.setState({ hearts: 0, difficulty: "sapling", permadeath: false });
      applyDeathPenalty();
      expect(useGameStore.getState().screen).toBe("death");
    });
  });

  // ── Permadeath flow ─────────────────────────────────────────────────────

  describe("applyDeathPenalty — permadeath path (Spec §2.1)", () => {
    it("sets screen to permadeath for ironwood", () => {
      useGameStore.setState({ hearts: 0, difficulty: "ironwood", permadeath: false });
      applyDeathPenalty();
      expect(useGameStore.getState().screen).toBe("permadeath");
    });

    it("sets screen to permadeath for hardwood+permadeath", () => {
      useGameStore.setState({ hearts: 0, difficulty: "hardwood", permadeath: true });
      applyDeathPenalty();
      expect(useGameStore.getState().screen).toBe("permadeath");
    });

    it("resets level and XP on permadeath", () => {
      useGameStore.setState({
        hearts: 0,
        difficulty: "ironwood",
        level: 5,
        xp: 500,
      });
      applyDeathPenalty();
      const state = useGameStore.getState();
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
    });

    it("clears campfire data on permadeath", () => {
      useGameStore.setState({
        hearts: 0,
        difficulty: "ironwood",
        lastCampfireId: "fire-1",
        lastCampfirePosition: { x: 10, y: 1, z: 20 },
      });
      applyDeathPenalty();
      const state = useGameStore.getState();
      expect(state.lastCampfireId).toBeNull();
      expect(state.lastCampfirePosition).toBeNull();
    });
  });

  // ── startNewGame → deathRespawn permadeath wiring ─────────────────────────

  describe("startNewGame sets permadeath flag for deathRespawn (Spec §2.1)", () => {
    it("sets permadeath=true and routes to permadeath screen on hardwood death", () => {
      useGameStore.getState().resetGame("test-seed");
      startNewGame("hardwood", true);
      const state = useGameStore.getState();
      expect(state.difficulty).toBe("hardwood");
      expect(state.permadeath).toBe(true);

      // Simulate death
      useGameStore.setState({ hearts: 0 });
      applyDeathPenalty();
      expect(useGameStore.getState().screen).toBe("permadeath");
    });

    it("sets permadeath=false by default and routes to normal death screen", () => {
      useGameStore.getState().resetGame("test-seed");
      startNewGame("sapling");
      const state = useGameStore.getState();
      expect(state.difficulty).toBe("sapling");
      expect(state.permadeath).toBe(false);

      // Simulate death
      useGameStore.setState({ hearts: 0 });
      applyDeathPenalty();
      expect(useGameStore.getState().screen).toBe("death");
    });

    it("ironwood always routes to permadeath regardless of flag", () => {
      useGameStore.getState().resetGame("test-seed");
      startNewGame("ironwood", false);
      useGameStore.setState({ hearts: 0 });
      applyDeathPenalty();
      expect(useGameStore.getState().screen).toBe("permadeath");
    });
  });
});
