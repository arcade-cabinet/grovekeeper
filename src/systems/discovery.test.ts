import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import { koota } from "@/koota";
import { PlayerProgress, WorldMeta } from "@/traits";
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

  describe("Koota integration", () => {
    beforeEach(() => {
      gameActions().resetGame();
    });

    it("starting grove is always in initial discovered zones", () => {
      const zones = koota.get(WorldMeta)?.discoveredZones ?? [];
      expect(zones).toContain("starting-grove");
    });

    it("discoverZone action adds a new zone and returns true", () => {
      const result = gameActions().discoverZone("forest-east");
      expect(result).toBe(true);
      expect(koota.get(WorldMeta)?.discoveredZones).toContain("forest-east");
    });

    it("discoverZone action returns false for already discovered zone", () => {
      const result = gameActions().discoverZone("starting-grove");
      expect(result).toBe(false);
    });

    it("discoverZone action awards XP", () => {
      const xpBefore = koota.get(PlayerProgress)?.xp ?? 0;
      gameActions().discoverZone("forest-east");
      expect(koota.get(PlayerProgress)?.xp).toBe(xpBefore + 50);
    });
  });
});
