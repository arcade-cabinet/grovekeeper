/**
 * bridgeQueries — ECS serialisation tests (Spec §D.1).
 *
 * Tests §D.1.3 queryEntities and §D.1.4 getStructureDetails.
 * All tests run without an R3F scene (world is imported but empty).
 */

import { world } from "@/game/ecs/world";
import { getStructureDetails, queryEntities } from "./bridgeQueries.ts";
import type {
  EnemyEntitySnapshot,
  NpcEntitySnapshot,
  StructureEntitySnapshot,
  TreeEntitySnapshot,
} from "./bridgeTypes.ts";

function pos(x: number, y: number, z: number) {
  return { x, y, z };
}

function makeTree(id: string, x = 0, y = 0, z = 0) {
  return {
    id,
    position: pos(x, y, z),
    renderable: { visible: true, modelPath: "oak.glb", scale: 1 },
    tree: {
      speciesId: "white-oak",
      stage: 1 as const,
      progress: 20,
      watered: false,
      totalGrowthTime: 300,
      plantedAt: 0,
      meshSeed: 1,
      wild: false,
      pruned: false,
      fertilized: false,
      baseModel: "oak.glb",
      winterModel: "oak_w.glb",
      useWinterModel: false,
      seasonTint: "#ffffff",
    },
  };
}

afterEach(() => {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
});

// ── §D.1.3 — queryEntities ────────────────────────────────────────────────────

describe("Debug Bridge §D.1.3 — queryEntities", () => {
  it("returns empty array for unknown type", () => {
    expect(queryEntities("unicorn")).toEqual([]);
  });

  it("returns empty array when no trees exist", () => {
    expect(queryEntities("trees")).toEqual([]);
  });

  it("serialises a tree entity with correct fields", () => {
    world.add({
      id: "tree_1",
      position: pos(1, 0, 2),
      renderable: { visible: true, modelPath: "oak.glb", scale: 1 },
      tree: {
        speciesId: "white-oak",
        stage: 2 as const,
        progress: 50,
        watered: true,
        totalGrowthTime: 300,
        plantedAt: 0,
        meshSeed: 42,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "oak.glb",
        winterModel: "oak_winter.glb",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });

    const results = queryEntities("trees");
    expect(results).toHaveLength(1);

    const snap = results[0] as TreeEntitySnapshot;
    expect(snap.id).toBe("tree_1");
    expect(snap.position).toEqual([1, 0, 2]);
    expect(snap.speciesId).toBe("white-oak");
    expect(snap.stage).toBe(2);
    expect(snap.watered).toBe(true);
    expect(snap.wild).toBe(false);
  });

  it("serialises an NPC entity with correct fields", () => {
    world.add({
      id: "npc_1",
      position: pos(5, 0, 5),
      renderable: { visible: true, modelPath: "chibi.glb", scale: 1 },
      npc: {
        templateId: "miller",
        function: "trading",
        interactable: true,
        requiredLevel: 1,
        baseModel: "chibi.glb",
        useEmission: false,
        items: {},
        colorPalette: "warm",
        name: "Granya",
        personality: "cheerful",
        dialogue: "hello",
        schedule: [],
        currentAnim: "idle",
        animProgress: 0,
        animSpeed: 1,
      },
    });

    const results = queryEntities("npcs");
    expect(results).toHaveLength(1);

    const snap = results[0] as NpcEntitySnapshot;
    expect(snap.name).toBe("Granya");
    expect(snap.function).toBe("trading");
    expect(snap.personality).toBe("cheerful");
    expect(snap.position).toEqual([5, 0, 5]);
  });

  it("serialises an enemy entity with correct fields", () => {
    world.add({
      id: "enemy_1",
      position: pos(10, 0, 10),
      renderable: { visible: true, modelPath: "wolf.glb", scale: 1 },
      enemy: {
        enemyType: "werewolf",
        tier: 2,
        behavior: "patrol",
        aggroRange: 8,
        deaggroRange: 12,
        attackPower: 5,
        attackCooldown: 1.5,
        lootTableId: "beast_common",
      },
    });

    const results = queryEntities("enemies");
    expect(results).toHaveLength(1);

    const snap = results[0] as EnemyEntitySnapshot;
    expect(snap.enemyType).toBe("werewolf");
    expect(snap.tier).toBe(2);
    expect(snap.behavior).toBe("patrol");
  });

  it("serialises a structure entity with durability fields", () => {
    world.add({
      id: "struct_1",
      position: pos(3, 0, 7),
      structure: {
        templateId: "well",
        category: "essential",
        modelPath: "well.glb",
        level: 1,
        durability: 80,
        maxDurability: 100,
        buildCost: [],
      },
    });

    const results = queryEntities("structures");
    expect(results).toHaveLength(1);

    const snap = results[0] as StructureEntitySnapshot;
    expect(snap.templateId).toBe("well");
    expect(snap.durability).toBe(80);
    expect(snap.maxDurability).toBe(100);
  });

  it("result is JSON-serialisable (no circular refs)", () => {
    world.add(makeTree("tree_json"));
    expect(() => JSON.stringify(queryEntities("trees"))).not.toThrow();
  });

  it("returns multiple entities when multiple exist", () => {
    for (let i = 0; i < 3; i++) {
      world.add(makeTree(`tree_multi_${i}`, i, 0, i));
    }
    expect(queryEntities("trees")).toHaveLength(3);
  });
});

// ── §D.1.4 — getStructureDetails ─────────────────────────────────────────────

describe("Debug Bridge §D.1.4 — getStructureDetails", () => {
  it("returns empty array when no procedural buildings exist", () => {
    expect(getStructureDetails()).toEqual([]);
  });

  it("serialises a proceduralBuilding with all required fields", () => {
    world.add({
      id: "pb_1",
      position: pos(8, 0, 4),
      proceduralBuilding: {
        footprintW: 8,
        footprintD: 6,
        stories: 2,
        materialType: "brick",
        blueprintId: "cottage",
        facing: 90,
        variation: 7,
      },
    });

    const results = getStructureDetails();
    expect(results).toHaveLength(1);

    const snap = results[0];
    expect(snap.id).toBe("pb_1");
    expect(snap.blueprintId).toBe("cottage");
    expect(snap.facing).toBe(90);
    expect(snap.variation).toBe(7);
    expect(snap.stories).toBe(2);
    expect(snap.materialType).toBe("brick");
    expect(snap.position).toEqual([8, 0, 4]);
  });

  it("result is JSON-serialisable", () => {
    world.add({
      id: "pb_json",
      position: pos(0, 0, 0),
      proceduralBuilding: {
        footprintW: 6,
        footprintD: 6,
        stories: 1,
        materialType: "timber",
        blueprintId: "barn",
        facing: 0,
        variation: 3,
      },
    });
    expect(() => JSON.stringify(getStructureDetails())).not.toThrow();
  });
});
