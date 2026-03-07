/**
 * Tests for StaticInstances — shared InstancedMesh batching primitive (Spec §28).
 *
 * Tests pure functions without WebGL/R3F context.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: {
      traverse: jest.fn(),
      clone: jest.fn().mockReturnValue({}),
    },
  }),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

import {
  StaticModelInstances,
  groupByModelPath,
  type StaticEntityInput,
} from "./StaticInstances";

// ---------------------------------------------------------------------------
// groupByModelPath — grouping entities by modelPath (Spec §28)
// ---------------------------------------------------------------------------

const makeEntity = (
  id: string,
  modelPath: string,
  x = 0,
  z = 0,
): StaticEntityInput => ({
  id,
  modelPath,
  position: { x, y: 0, z },
  rotationY: 0,
});

describe("groupByModelPath (Spec §28)", () => {
  it("returns empty Map for empty input", () => {
    const result = groupByModelPath([]);
    expect(result.size).toBe(0);
  });

  it("groups a single entity into a map with one entry", () => {
    const entities = [makeEntity("e1", "assets/models/barn.glb")];
    const result = groupByModelPath(entities);
    expect(result.size).toBe(1);
    expect(result.has("assets/models/barn.glb")).toBe(true);
  });

  it("groups two entities with the same modelPath into one entry", () => {
    const entities = [
      makeEntity("e1", "assets/models/barn.glb"),
      makeEntity("e2", "assets/models/barn.glb"),
    ];
    const result = groupByModelPath(entities);
    expect(result.size).toBe(1);
    expect(result.get("assets/models/barn.glb")).toHaveLength(2);
  });

  it("groups entities with different modelPaths into separate entries", () => {
    const entities = [
      makeEntity("e1", "assets/models/barn.glb"),
      makeEntity("e2", "assets/models/windmill.glb"),
    ];
    const result = groupByModelPath(entities);
    expect(result.size).toBe(2);
    expect(result.has("assets/models/barn.glb")).toBe(true);
    expect(result.has("assets/models/windmill.glb")).toBe(true);
  });

  it("preserves all entity data within each group", () => {
    const e1 = makeEntity("e1", "assets/models/barn.glb", 10, 20);
    const e2 = makeEntity("e2", "assets/models/barn.glb", 30, 40);
    const result = groupByModelPath([e1, e2]);
    const group = result.get("assets/models/barn.glb");
    expect(group).toBeDefined();
    expect(group![0].id).toBe("e1");
    expect(group![1].id).toBe("e2");
    expect(group![0].position.x).toBe(10);
    expect(group![1].position.z).toBe(40);
  });

  it("handles many entities with three distinct models", () => {
    const entities: StaticEntityInput[] = [
      makeEntity("e1", "a.glb"),
      makeEntity("e2", "b.glb"),
      makeEntity("e3", "a.glb"),
      makeEntity("e4", "c.glb"),
      makeEntity("e5", "b.glb"),
      makeEntity("e6", "a.glb"),
    ];
    const result = groupByModelPath(entities);
    expect(result.size).toBe(3);
    expect(result.get("a.glb")).toHaveLength(3);
    expect(result.get("b.glb")).toHaveLength(2);
    expect(result.get("c.glb")).toHaveLength(1);
  });

  it("returns Map with correct keys for each unique modelPath", () => {
    const paths = ["path/a.glb", "path/b.glb", "path/c.glb"];
    const entities = paths.map((p, i) => makeEntity(`e${i}`, p));
    const result = groupByModelPath(entities);
    for (const p of paths) {
      expect(result.has(p)).toBe(true);
    }
  });

  it("each group contains entities with the matching modelPath", () => {
    const entities = [
      makeEntity("e1", "fences/wooden.glb"),
      makeEntity("e2", "fences/brick.glb"),
      makeEntity("e3", "fences/wooden.glb"),
    ];
    const result = groupByModelPath(entities);
    for (const [modelPath, group] of result) {
      for (const entity of group) {
        expect(entity.modelPath).toBe(modelPath);
      }
    }
  });

  it("does not mutate the input array", () => {
    const entities = [
      makeEntity("e1", "a.glb"),
      makeEntity("e2", "b.glb"),
    ];
    const original = [...entities];
    groupByModelPath(entities);
    expect(entities).toEqual(original);
  });

  it("returns a new Map on each call (not the same reference)", () => {
    const entities = [makeEntity("e1", "a.glb")];
    const r1 = groupByModelPath(entities);
    const r2 = groupByModelPath(entities);
    expect(r1).not.toBe(r2);
  });

  it("handles a single entity with rotationY preserved in group", () => {
    const entity: StaticEntityInput = {
      id: "e1",
      modelPath: "fence.glb",
      position: { x: 1, y: 0, z: 2 },
      rotationY: Math.PI / 2,
    };
    const result = groupByModelPath([entity]);
    const group = result.get("fence.glb");
    expect(group![0].rotationY).toBe(Math.PI / 2);
  });

  it("correctly counts total entities across all groups", () => {
    const entities = Array.from({ length: 10 }, (_, i) =>
      makeEntity(`e${i}`, `model_${i % 3}.glb`),
    );
    const result = groupByModelPath(entities);
    let total = 0;
    for (const group of result.values()) total += group.length;
    expect(total).toBe(10);
  });

  it("handles entities with identical position but different models", () => {
    const entities = [
      { id: "e1", modelPath: "a.glb", position: { x: 0, y: 0, z: 0 }, rotationY: 0 },
      { id: "e2", modelPath: "b.glb", position: { x: 0, y: 0, z: 0 }, rotationY: 0 },
    ];
    const result = groupByModelPath(entities);
    expect(result.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// StaticModelInstances — component export check (Spec §28)
// ---------------------------------------------------------------------------

describe("StaticModelInstances (Spec §28)", () => {
  it("exports StaticModelInstances as a function component", () => {
    expect(typeof StaticModelInstances).toBe("function");
  });
});
