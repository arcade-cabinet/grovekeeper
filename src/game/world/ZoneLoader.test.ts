import { beforeEach, describe, expect, it } from "vitest";
import { gridCellsQuery, world } from "../ecs/world";
import type { ZoneDefinition } from "./types";
import { loadZoneEntities, unloadZoneEntities } from "./ZoneLoader";

const testZone: ZoneDefinition = {
  id: "test-zone",
  name: "Test Zone",
  type: "grove",
  origin: { x: 5, z: 10 },
  size: { width: 3, height: 3 },
  groundMaterial: "soil",
  tiles: [
    { x: 1, z: 1, type: "water" },
    { x: 2, z: 0, type: "rock" },
  ],
  plantable: true,
  connections: [],
};

describe("ZoneLoader", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("loadZoneEntities", () => {
    it("creates grid cell entities for each tile in the zone", () => {
      const entities = loadZoneEntities(testZone);
      // 3x3 = 9 entities
      expect(entities).toHaveLength(9);
    });

    it("positions entities in world space using zone origin", () => {
      const entities = loadZoneEntities(testZone);
      // First entity: local (0,0) + origin (5,10) = world (5,10)
      const first = entities[0];
      expect(first.gridCell?.gridX).toBe(5);
      expect(first.gridCell?.gridZ).toBe(10);
    });

    it("applies default ground material as cell type", () => {
      const entities = loadZoneEntities(testZone);
      // Default for "soil" is "soil"
      const soilCell = entities.find(
        (e) => e.gridCell?.gridX === 5 && e.gridCell?.gridZ === 10,
      );
      expect(soilCell?.gridCell?.type).toBe("soil");
    });

    it("applies tile overrides from zone definition", () => {
      const entities = loadZoneEntities(testZone);
      // Water at local (1,1) = world (6, 11)
      const waterCell = entities.find(
        (e) => e.gridCell?.gridX === 6 && e.gridCell?.gridZ === 11,
      );
      expect(waterCell?.gridCell?.type).toBe("water");

      // Rock at local (2,0) = world (7, 10)
      const rockCell = entities.find(
        (e) => e.gridCell?.gridX === 7 && e.gridCell?.gridZ === 10,
      );
      expect(rockCell?.gridCell?.type).toBe("rock");
    });

    it("adds entities to the ECS world", () => {
      const countBefore = [...gridCellsQuery].length;
      loadZoneEntities(testZone);
      const countAfter = [...gridCellsQuery].length;
      expect(countAfter - countBefore).toBe(9);
    });

    it("tags entities with zoneId", () => {
      const entities = loadZoneEntities(testZone);
      for (const entity of entities) {
        expect((entity as { zoneId?: string }).zoneId).toBe("test-zone");
      }
    });
  });

  describe("unloadZoneEntities", () => {
    it("removes entities from the ECS world", () => {
      const entities = loadZoneEntities(testZone);
      const countAfterLoad = [...gridCellsQuery].length;
      expect(countAfterLoad).toBe(9);

      unloadZoneEntities(entities);
      const countAfterUnload = [...gridCellsQuery].length;
      expect(countAfterUnload).toBe(0);
    });
  });

  describe("wild tree spawning", () => {
    const wildZone: ZoneDefinition = {
      id: "wild-test",
      name: "Wild Test",
      type: "forest",
      origin: { x: 0, z: 0 },
      size: { width: 6, height: 6 },
      groundMaterial: "grass",
      plantable: false,
      connections: [],
      wildTrees: [
        { speciesId: "white-oak", weight: 3 },
        { speciesId: "elder-pine", weight: 2 },
      ],
      wildTreeDensity: 0.5,
    };

    it("spawns wild tree entities when zone has wildTrees", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.tree);
      expect(trees.length).toBeGreaterThan(0);
    });

    it("wild trees have wild flag set to true", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.tree);
      for (const tree of trees) {
        expect(tree.tree!.wild).toBe(true);
      }
    });

    it("wild trees start at stage 2-4", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.tree);
      for (const tree of trees) {
        expect(tree.tree!.stage).toBeGreaterThanOrEqual(2);
        expect(tree.tree!.stage).toBeLessThanOrEqual(4);
      }
    });

    it("marks grid cells as occupied for wild trees", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.tree);
      for (const tree of trees) {
        const cell = entities.find(
          (e) =>
            e.gridCell &&
            e.gridCell.gridX === tree.position!.x &&
            e.gridCell.gridZ === tree.position!.z,
        );
        expect(cell?.gridCell?.occupied).toBe(true);
        expect(cell?.gridCell?.treeEntityId).toBe(tree.id);
      }
    });

    it("does not spawn wild trees in zone without wildTrees", () => {
      const entities = loadZoneEntities(testZone); // testZone has no wildTrees
      const trees = entities.filter((e) => e.tree);
      expect(trees.length).toBe(0);
    });

    it("spawns count proportional to density", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.tree);
      // 6x6 = 36 tiles, with water overrides some are non-soil
      // wildTreeDensity = 0.5, so expect roughly 50% of soil tiles
      // Exact count depends on RNG but should be > 5 and < 36
      expect(trees.length).toBeGreaterThan(5);
      expect(trees.length).toBeLessThan(36);
    });

    it("uses species from weighted list", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.tree);
      const speciesSet = new Set(trees.map((t) => t.tree!.speciesId));
      // At least one of the two species should appear
      expect(speciesSet.has("white-oak") || speciesSet.has("elder-pine")).toBe(
        true,
      );
    });
  });

  describe("ground material mapping", () => {
    it("maps grass to soil cell type", () => {
      const grassZone: ZoneDefinition = {
        ...testZone,
        id: "grass-zone",
        groundMaterial: "grass",
        tiles: [],
        size: { width: 1, height: 1 },
      };
      const entities = loadZoneEntities(grassZone);
      expect(entities[0].gridCell?.type).toBe("soil");
    });

    it("maps stone to path cell type", () => {
      const stoneZone: ZoneDefinition = {
        ...testZone,
        id: "stone-zone",
        groundMaterial: "stone",
        tiles: [],
        size: { width: 1, height: 1 },
      };
      const entities = loadZoneEntities(stoneZone);
      expect(entities[0].gridCell?.type).toBe("path");
    });

    it("maps dirt to soil cell type", () => {
      const dirtZone: ZoneDefinition = {
        ...testZone,
        id: "dirt-zone",
        groundMaterial: "dirt",
        tiles: [],
        size: { width: 1, height: 1 },
      };
      const entities = loadZoneEntities(dirtZone);
      expect(entities[0].gridCell?.type).toBe("soil");
    });
  });
});
