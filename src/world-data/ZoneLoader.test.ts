import { beforeEach, describe, expect, it } from "vitest";
import { destroyAllEntitiesExceptWorld, koota } from "@/koota";
import { GridCell, Position, Tree, Zone } from "@/traits";
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
    destroyAllEntitiesExceptWorld();
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
      const gc = first.get(GridCell);
      expect(gc.gridX).toBe(5);
      expect(gc.gridZ).toBe(10);
    });

    it("applies default ground material as cell type", () => {
      const entities = loadZoneEntities(testZone);
      // Default for "soil" is "soil"
      const soilCell = entities.find((e) => {
        if (!e.has(GridCell)) return false;
        const gc = e.get(GridCell);
        return gc.gridX === 5 && gc.gridZ === 10;
      });
      expect(soilCell).toBeDefined();
      expect(soilCell?.get(GridCell).type).toBe("soil");
    });

    it("applies tile overrides from zone definition", () => {
      const entities = loadZoneEntities(testZone);
      // Water at local (1,1) = world (6, 11)
      const waterCell = entities.find((e) => {
        if (!e.has(GridCell)) return false;
        const gc = e.get(GridCell);
        return gc.gridX === 6 && gc.gridZ === 11;
      });
      expect(waterCell?.get(GridCell).type).toBe("water");

      // Rock at local (2,0) = world (7, 10)
      const rockCell = entities.find((e) => {
        if (!e.has(GridCell)) return false;
        const gc = e.get(GridCell);
        return gc.gridX === 7 && gc.gridZ === 10;
      });
      expect(rockCell?.get(GridCell).type).toBe("rock");
    });

    it("adds entities to the ECS world", () => {
      const countBefore = Array.from(koota.query(GridCell, Position)).length;
      loadZoneEntities(testZone);
      const countAfter = Array.from(koota.query(GridCell, Position)).length;
      expect(countAfter - countBefore).toBe(9);
    });

    it("tags entities with zoneId", () => {
      const entities = loadZoneEntities(testZone);
      for (const entity of entities) {
        expect(entity.has(Zone)).toBe(true);
        expect(entity.get(Zone).zoneId).toBe("test-zone");
      }
    });
  });

  describe("unloadZoneEntities", () => {
    it("removes entities from the ECS world", () => {
      const entities = loadZoneEntities(testZone);
      const countAfterLoad = Array.from(
        koota.query(GridCell, Position),
      ).length;
      expect(countAfterLoad).toBe(9);

      unloadZoneEntities(entities);
      const countAfterUnload = Array.from(
        koota.query(GridCell, Position),
      ).length;
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
      const trees = entities.filter((e) => e.has(Tree));
      expect(trees.length).toBeGreaterThan(0);
    });

    it("wild trees have wild flag set to true", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.has(Tree));
      for (const tree of trees) {
        expect(tree.get(Tree).wild).toBe(true);
      }
    });

    it("wild trees start at stage 2-4", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.has(Tree));
      for (const tree of trees) {
        const t = tree.get(Tree);
        expect(t.stage).toBeGreaterThanOrEqual(2);
        expect(t.stage).toBeLessThanOrEqual(4);
      }
    });

    it("marks grid cells as occupied for wild trees", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.has(Tree));
      for (const tree of trees) {
        const pos = tree.get(Position);
        const cell = entities.find((e) => {
          if (!e.has(GridCell)) return false;
          const gc = e.get(GridCell);
          return gc.gridX === pos.x && gc.gridZ === pos.z;
        });
        expect(cell).toBeDefined();
        const gc = cell?.get(GridCell);
        expect(gc?.occupied).toBe(true);
        expect(gc?.treeEntity).toBe(tree);
      }
    });

    it("does not spawn wild trees in zone without wildTrees", () => {
      const entities = loadZoneEntities(testZone); // testZone has no wildTrees
      const trees = entities.filter((e) => e.has(Tree));
      expect(trees.length).toBe(0);
    });

    it("spawns count proportional to density", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.has(Tree));
      // 6x6 = 36 tiles, with water overrides some are non-soil
      // wildTreeDensity = 0.5, so expect roughly 50% of soil tiles
      // Exact count depends on RNG but should be > 5 and < 36
      expect(trees.length).toBeGreaterThan(5);
      expect(trees.length).toBeLessThan(36);
    });

    it("uses species from weighted list", () => {
      const entities = loadZoneEntities(wildZone);
      const trees = entities.filter((e) => e.has(Tree));
      const speciesSet = new Set(trees.map((t) => t.get(Tree).speciesId));
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
      expect(entities[0].get(GridCell).type).toBe("soil");
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
      expect(entities[0].get(GridCell).type).toBe("path");
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
      expect(entities[0].get(GridCell).type).toBe("soil");
    });
  });
});
