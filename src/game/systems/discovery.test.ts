import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "../stores/gameStore";
import { discoverZone, isZoneDiscovered } from "./discovery";

describe("discovery", () => {
  describe("discoverZone", () => {
    it("adds new zone to discovered list", () => {
      const result = discoverZone(["starting-grove"], "forest-east");
      expect(result.newZones).toContain("forest-east");
      expect(result.newZones).toContain("starting-grove");
      expect(result.isNew).toBe(true);
    });

    it("returns isNew: false for already discovered zone", () => {
      const result = discoverZone(
        ["starting-grove", "forest-east"],
        "forest-east",
      );
      expect(result.isNew).toBe(false);
      expect(result.newZones).toEqual(["starting-grove", "forest-east"]);
    });

    it("does not mutate the original array", () => {
      const original = ["starting-grove"];
      discoverZone(original, "forest-east");
      expect(original).toEqual(["starting-grove"]);
    });
  });

  describe("isZoneDiscovered", () => {
    it("returns true for discovered zone", () => {
      expect(
        isZoneDiscovered(["starting-grove", "forest-east"], "forest-east"),
      ).toBe(true);
    });

    it("returns false for undiscovered zone", () => {
      expect(isZoneDiscovered(["starting-grove"], "forest-east")).toBe(false);
    });

    it("returns false for empty discovered list", () => {
      expect(isZoneDiscovered([], "starting-grove")).toBe(false);
    });
  });

  describe("gameStore integration", () => {
    beforeEach(() => {
      useGameStore.getState().resetGame();
    });

    it("starting grove is always in initial discovered zones", () => {
      const state = useGameStore.getState();
      expect(state.discoveredZones).toContain("starting-grove");
    });

    it("discoverZone action adds a new zone and returns true", () => {
      const result = useGameStore.getState().discoverZone("forest-east");
      expect(result).toBe(true);
      expect(useGameStore.getState().discoveredZones).toContain("forest-east");
    });

    it("discoverZone action returns false for already discovered zone", () => {
      const result = useGameStore.getState().discoverZone("starting-grove");
      expect(result).toBe(false);
    });

    it("discoverZone action awards XP", () => {
      const xpBefore = useGameStore.getState().xp;
      useGameStore.getState().discoverZone("forest-east");
      expect(useGameStore.getState().xp).toBe(xpBefore + 50);
    });
  });
});
