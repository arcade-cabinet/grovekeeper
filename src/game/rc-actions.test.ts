import { beforeEach, describe, expect, it } from "vitest";
import { koota } from "@/koota";
import {
  Build,
  FarmerState,
  GameScreen,
  IsPlayer,
  LifetimeResources,
  Resources,
  Settings,
  Tracking,
  WorldMeta,
} from "@/traits";
import { actions } from "./rc-actions";

describe("rc-actions", () => {
  beforeEach(() => {
    koota.set(GameScreen, { value: "menu" });
    koota.set(Resources, { timber: 0, sap: 0, fruit: 0, acorns: 0 });
    koota.set(LifetimeResources, { timber: 0, sap: 0, fruit: 0, acorns: 0 });
    koota.set(Build, { mode: false, templateId: null, placedStructures: [] });
    koota.set(Settings, {
      hasSeenRules: false,
      hapticsEnabled: true,
      soundEnabled: true,
    });
    koota.set(WorldMeta, {
      currentZoneId: "starting-grove",
      worldSeed: "",
      discoveredZones: ["starting-grove"],
    });
    koota.set(Tracking, {
      treesPlanted: 0,
      treesMatured: 0,
      treesHarvested: 0,
      treesWatered: 0,
      wildTreesHarvested: 0,
      wildTreesRegrown: 0,
      treesPlantedInSpring: 0,
      treesHarvestedInAutumn: 0,
      toolUseCounts: {},
      visitedZoneTypes: [],
      wildSpeciesHarvested: [],
      speciesPlanted: [],
      seasonsExperienced: [],
    });
  });

  describe("setScreen", () => {
    it("updates GameScreen trait", () => {
      actions().setScreen("playing");
      expect(koota.get(GameScreen)?.value).toBe("playing");
    });

    it("can set to menu", () => {
      actions().setScreen("playing");
      actions().setScreen("menu");
      expect(koota.get(GameScreen)?.value).toBe("menu");
    });
  });

  describe("setBuildMode", () => {
    it("enables build mode with template", () => {
      actions().setBuildMode(true, "blueprint.hearth");
      const build = koota.get(Build);
      expect(build?.mode).toBe(true);
      expect(build?.templateId).toBe("blueprint.hearth");
    });

    it("disables build mode and clears template", () => {
      actions().setBuildMode(true, "blueprint.hearth");
      actions().setBuildMode(false);
      const build = koota.get(Build);
      expect(build?.mode).toBe(false);
      expect(build?.templateId).toBeNull();
    });
  });

  describe("addPlacedStructure", () => {
    it("appends to placedStructures", () => {
      actions().addPlacedStructure("blueprint.hearth", 10, 20);
      const build = koota.get(Build);
      expect(build?.placedStructures).toHaveLength(1);
      expect(build?.placedStructures[0]).toEqual({
        templateId: "blueprint.hearth",
        worldX: 10,
        worldZ: 20,
      });
    });

    it("accumulates multiple placements", () => {
      actions().addPlacedStructure("blueprint.hearth", 10, 20);
      actions().addPlacedStructure("blueprint.wall", 15, 25);
      expect(koota.get(Build)?.placedStructures).toHaveLength(2);
    });
  });

  describe("addResource", () => {
    it("increments resource count", () => {
      actions().addResource("timber", 5);
      expect(koota.get(Resources)?.timber).toBe(5);
    });

    it("also increments lifetime resources", () => {
      actions().addResource("sap", 3);
      expect(koota.get(LifetimeResources)?.sap).toBe(3);
    });

    it("accumulates multiple calls", () => {
      actions().addResource("timber", 3);
      actions().addResource("timber", 7);
      expect(koota.get(Resources)?.timber).toBe(10);
    });
  });

  describe("incrementTreesHarvested", () => {
    it("increments treesHarvested tracking counter", () => {
      actions().incrementTreesHarvested();
      expect(koota.get(Tracking)?.treesHarvested).toBe(1);
    });

    it("accumulates", () => {
      actions().incrementTreesHarvested();
      actions().incrementTreesHarvested();
      expect(koota.get(Tracking)?.treesHarvested).toBe(2);
    });
  });

  describe("discoverZone", () => {
    it("adds new zone to discoveredZones", () => {
      const result = actions().discoverZone("forest-grove-1");
      expect(result).toBe(true);
      expect(koota.get(WorldMeta)?.discoveredZones).toContain("forest-grove-1");
    });

    it("returns false for already-discovered zone", () => {
      const result = actions().discoverZone("starting-grove");
      expect(result).toBe(false);
    });

    it("does not duplicate discovered zones", () => {
      actions().discoverZone("forest-grove-1");
      actions().discoverZone("forest-grove-1");
      const zones = koota.get(WorldMeta)?.discoveredZones ?? [];
      expect(zones.filter((z) => z === "forest-grove-1")).toHaveLength(1);
    });
  });

  describe("setWorldSeed", () => {
    it("updates worldSeed in WorldMeta", () => {
      actions().setWorldSeed("TESTABCD");
      expect(koota.get(WorldMeta)?.worldSeed).toBe("TESTABCD");
    });
  });

  describe("setSoundEnabled", () => {
    it("sets sound enabled flag", () => {
      actions().setSoundEnabled(false);
      expect(koota.get(Settings)?.soundEnabled).toBe(false);
    });

    it("can re-enable sound", () => {
      actions().setSoundEnabled(false);
      actions().setSoundEnabled(true);
      expect(koota.get(Settings)?.soundEnabled).toBe(true);
    });
  });

  describe("hydrateFromDb", () => {
    it("hydrates worldSeed from db state", () => {
      actions().hydrateFromDb({ worldSeed: "HYDRATED" });
      expect(koota.get(WorldMeta)?.worldSeed).toBe("HYDRATED");
    });

    it("hydrates soundEnabled setting", () => {
      actions().hydrateFromDb({ soundEnabled: false });
      expect(koota.get(Settings)?.soundEnabled).toBe(false);
    });

    it("hydrates resources", () => {
      actions().hydrateFromDb({
        resources: { timber: 50, sap: 10, fruit: 5, acorns: 3 },
      });
      expect(koota.get(Resources)?.timber).toBe(50);
    });

    it("no-ops on empty state", () => {
      const before = koota.get(GameScreen)?.value;
      actions().hydrateFromDb({});
      expect(koota.get(GameScreen)?.value).toBe(before);
    });

    it("hydrates discovered zones", () => {
      actions().hydrateFromDb({
        discoveredZones: ["starting-grove", "forest-grove-1"],
      });
      expect(koota.get(WorldMeta)?.discoveredZones).toContain("forest-grove-1");
    });

    it("hydrates player tracking", () => {
      actions().hydrateFromDb({ treesHarvested: 42 });
      expect(koota.get(Tracking)?.treesHarvested).toBe(42);
    });

    it("hydrates FarmerState stamina on existing player entity", () => {
      const player = koota.spawn(IsPlayer(), FarmerState());
      actions().hydrateFromDb({ stamina: 75 });
      expect(player.get(FarmerState)?.stamina).toBe(75);
      player.destroy();
    });
  });
});
