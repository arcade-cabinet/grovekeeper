import { describe, it, expect, beforeEach } from "vitest";
import { world, generateEntityId, treesQuery, playerQuery, gridCellsQuery } from "./world";
import { createTreeEntity, createPlayerEntity, createGridCellEntity } from "./archetypes";

describe("ECS World", () => {
  beforeEach(() => {
    // Clear world between tests
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("generateEntityId", () => {
    it("generates unique IDs", () => {
      const id1 = generateEntityId();
      const id2 = generateEntityId();
      expect(id1).not.toBe(id2);
    });

    it("generates IDs with entity_ prefix", () => {
      const id = generateEntityId();
      expect(id.startsWith("entity_")).toBe(true);
    });
  });

  describe("Entity creation", () => {
    it("creates a tree entity with correct components", () => {
      const tree = createTreeEntity(5, 5, "white-oak");
      world.add(tree);

      expect(tree.position).toEqual({ x: 5, y: 0, z: 5 });
      expect(tree.tree?.speciesId).toBe("white-oak");
      expect(tree.tree?.stage).toBe(0);
      expect(tree.tree?.progress).toBe(0);
      expect(tree.tree?.watered).toBe(false);
      expect(tree.tree?.meshSeed).toBeTypeOf("number");
      expect(tree.renderable).toBeDefined();
    });

    it("creates a player entity with default values", () => {
      const player = createPlayerEntity();
      world.add(player);

      expect(player.id).toBe("player");
      expect(player.player?.coins).toBe(100);
      expect(player.player?.level).toBe(1);
      expect(player.player?.currentTool).toBe("trowel");
      expect(player.farmerState?.stamina).toBe(100);
      expect(player.farmerState?.maxStamina).toBe(100);
    });

    it("creates a grid cell entity", () => {
      const cell = createGridCellEntity(3, 4, "soil");
      world.add(cell);

      expect(cell.gridCell?.gridX).toBe(3);
      expect(cell.gridCell?.gridZ).toBe(4);
      expect(cell.gridCell?.type).toBe("soil");
      expect(cell.gridCell?.occupied).toBe(false);
    });
  });

  describe("Queries", () => {
    it("treesQuery finds tree entities", () => {
      const tree1 = createTreeEntity(0, 0, "white-oak");
      const tree2 = createTreeEntity(1, 1, "ghost-birch");
      world.add(tree1);
      world.add(tree2);

      const trees = [...treesQuery];
      expect(trees.length).toBe(2);
    });

    it("playerQuery finds player entity", () => {
      const player = createPlayerEntity();
      world.add(player);

      const players = [...playerQuery];
      expect(players.length).toBe(1);
      expect(players[0].id).toBe("player");
    });

    it("gridCellsQuery finds grid cells", () => {
      world.add(createGridCellEntity(0, 0));
      world.add(createGridCellEntity(0, 1));
      world.add(createGridCellEntity(1, 0));

      const cells = [...gridCellsQuery];
      expect(cells.length).toBe(3);
    });
  });
});
