/**
 * Tests for TreeInstances — stage-split rendering: procedural (0-1) vs GLB (2-4).
 *
 * Tests the exported pure functions without WebGL/R3F context (Spec §8.1, §6.3, §28).
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { traverse: jest.fn(), clone: jest.fn().mockReturnValue({}) },
  }),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  treesQuery: { entities: [] },
}));

jest.mock("@/game/stores/core", () => ({
  gameState$: {
    currentSeason: { get: jest.fn(() => "spring") },
  },
}));

jest.mock("./StaticInstances", () => ({
  StaticModelInstances: jest.fn(() => null),
}));

import {
  PROCEDURAL_STAGE_MAX,
  STAGE_SCALES,
  partitionTreeEntities,
  resolveTreeModelPath,
  TreeInstances,
} from "./TreeInstances.tsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEntity = (
  id: string,
  stage: 0 | 1 | 2 | 3 | 4,
  baseModel = `assets/models/trees/oak-${stage}.glb`,
  winterModel = "",
  useWinterModel = false,
  x = 0,
  z = 0,
) => ({
  id,
  tree: { stage, baseModel, winterModel, useWinterModel },
  position: { x, y: 0, z },
  renderable: { visible: true, scale: 1 },
  rotationY: 0,
});

// ---------------------------------------------------------------------------
// PROCEDURAL_STAGE_MAX
// ---------------------------------------------------------------------------

describe("PROCEDURAL_STAGE_MAX (Spec §8.1)", () => {
  it("is 1 (stages 0 and 1 use procedural geometry)", () => {
    expect(PROCEDURAL_STAGE_MAX).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// STAGE_SCALES
// ---------------------------------------------------------------------------

describe("STAGE_SCALES (Spec §8.1)", () => {
  it("stage 0 (Seed) has the smallest scale", () => {
    expect(STAGE_SCALES[0]).toBeLessThan(STAGE_SCALES[1]);
  });

  it("stage 1 (Sprout) has a scale smaller than stage 2", () => {
    expect(STAGE_SCALES[1]).toBeLessThan(STAGE_SCALES[2]);
  });

  it("stage 2 (Sapling) is 0.5", () => {
    expect(STAGE_SCALES[2]).toBe(0.5);
  });

  it("stage 3 (Mature) is 1.0", () => {
    expect(STAGE_SCALES[3]).toBe(1.0);
  });

  it("stage 4 (Old Growth) is 1.3", () => {
    expect(STAGE_SCALES[4]).toBe(1.3);
  });

  it("scales increase monotonically from stage 0 to 4", () => {
    for (let i = 0; i < 4; i++) {
      expect(STAGE_SCALES[i]).toBeLessThan(STAGE_SCALES[i + 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveTreeModelPath (Spec §6.3, §8.1)
// ---------------------------------------------------------------------------

describe("resolveTreeModelPath (Spec §6.3)", () => {
  it("returns baseModel when isWinter=false", () => {
    expect(resolveTreeModelPath("base.glb", "winter.glb", true, false)).toBe("base.glb");
  });

  it("returns baseModel when isWinter=true but useWinterModel=false", () => {
    expect(resolveTreeModelPath("base.glb", "winter.glb", false, true)).toBe("base.glb");
  });

  it("returns winterModel when isWinter=true AND useWinterModel=true AND winterModel non-empty", () => {
    expect(resolveTreeModelPath("base.glb", "winter.glb", true, true)).toBe("winter.glb");
  });

  it("returns baseModel when winterModel is empty even if isWinter+useWinterModel=true", () => {
    expect(resolveTreeModelPath("base.glb", "", true, true)).toBe("base.glb");
  });

  it("throws when baseModel is empty string", () => {
    expect(() => resolveTreeModelPath("", "winter.glb", false, false)).toThrow(
      "[TreeInstances] Tree entity has empty baseModel",
    );
  });

  it("throws when baseModel is empty string even in winter", () => {
    expect(() => resolveTreeModelPath("", "winter.glb", true, true)).toThrow(
      "[TreeInstances] Tree entity has empty baseModel",
    );
  });
});

// ---------------------------------------------------------------------------
// partitionTreeEntities — stage 0-1 → procedural, stage 2-4 → GLB
// ---------------------------------------------------------------------------

describe("partitionTreeEntities (Spec §8.1, §28)", () => {
  it("returns empty buckets for empty input", () => {
    const { procedural, glbByModel } = partitionTreeEntities([], false);
    expect(procedural).toHaveLength(0);
    expect(glbByModel.size).toBe(0);
  });

  it("puts stage 0 entity in procedural bucket", () => {
    const { procedural, glbByModel } = partitionTreeEntities([makeEntity("e1", 0)], false);
    expect(procedural).toHaveLength(1);
    expect(procedural[0].id).toBe("e1");
    expect(procedural[0].stage).toBe(0);
    expect(glbByModel.size).toBe(0);
  });

  it("puts stage 1 entity in procedural bucket", () => {
    const { procedural, glbByModel } = partitionTreeEntities([makeEntity("e1", 1)], false);
    expect(procedural).toHaveLength(1);
    expect(procedural[0].stage).toBe(1);
    expect(glbByModel.size).toBe(0);
  });

  it("puts stage 2 entity in glbByModel bucket", () => {
    const entity = makeEntity("e1", 2, "assets/models/trees/oak.glb");
    const { procedural, glbByModel } = partitionTreeEntities([entity], false);
    expect(procedural).toHaveLength(0);
    expect(glbByModel.size).toBe(1);
    expect(glbByModel.has("assets/models/trees/oak.glb")).toBe(true);
  });

  it("puts stage 3 entity in glbByModel bucket", () => {
    const entity = makeEntity("e1", 3, "assets/models/trees/oak.glb");
    const { glbByModel } = partitionTreeEntities([entity], false);
    expect(glbByModel.has("assets/models/trees/oak.glb")).toBe(true);
  });

  it("puts stage 4 entity in glbByModel bucket", () => {
    const entity = makeEntity("e1", 4, "assets/models/trees/oak.glb");
    const { glbByModel } = partitionTreeEntities([entity], false);
    expect(glbByModel.has("assets/models/trees/oak.glb")).toBe(true);
  });

  it("correctly partitions mixed stages", () => {
    const entities = [
      makeEntity("e0", 0),
      makeEntity("e1", 1),
      makeEntity("e2", 2, "oak.glb"),
      makeEntity("e3", 3, "oak.glb"),
      makeEntity("e4", 4, "pine.glb"),
    ];
    const { procedural, glbByModel } = partitionTreeEntities(entities, false);
    expect(procedural).toHaveLength(2);
    expect(glbByModel.get("oak.glb")).toHaveLength(2);
    expect(glbByModel.get("pine.glb")).toHaveLength(1);
  });

  it("groups stage 2-4 trees by baseModel path", () => {
    const entities = [
      makeEntity("e1", 2, "oak.glb"),
      makeEntity("e2", 3, "oak.glb"),
      makeEntity("e3", 4, "pine.glb"),
    ];
    const { glbByModel } = partitionTreeEntities(entities, false);
    expect(glbByModel.size).toBe(2);
    expect(glbByModel.get("oak.glb")).toHaveLength(2);
    expect(glbByModel.get("pine.glb")).toHaveLength(1);
  });

  it("uses winterModel path when isWinter=true and useWinterModel=true", () => {
    const entity = makeEntity("e1", 3, "oak.glb", "oak-winter.glb", true);
    const { glbByModel } = partitionTreeEntities([entity], true);
    expect(glbByModel.has("oak-winter.glb")).toBe(true);
    expect(glbByModel.has("oak.glb")).toBe(false);
  });

  it("uses baseModel path in winter when useWinterModel=false", () => {
    const entity = makeEntity("e1", 3, "oak.glb", "oak-winter.glb", false);
    const { glbByModel } = partitionTreeEntities([entity], true);
    expect(glbByModel.has("oak.glb")).toBe(true);
    expect(glbByModel.has("oak-winter.glb")).toBe(false);
  });

  it("uses baseModel path in non-winter season even when useWinterModel=true", () => {
    const entity = makeEntity("e1", 3, "oak.glb", "oak-winter.glb", true);
    const { glbByModel } = partitionTreeEntities([entity], false);
    expect(glbByModel.has("oak.glb")).toBe(true);
    expect(glbByModel.has("oak-winter.glb")).toBe(false);
  });

  it("preserves position data for procedural entities", () => {
    const entity = makeEntity("e1", 0, "unused.glb", "", false, 5, 10);
    const { procedural } = partitionTreeEntities([entity], false);
    expect(procedural[0].position.x).toBe(5);
    expect(procedural[0].position.z).toBe(10);
  });

  it("preserves position data for GLB entities in StaticEntityInput shape", () => {
    const entity = makeEntity("e1", 3, "oak.glb", "", false, 7, 13);
    const { glbByModel } = partitionTreeEntities([entity], false);
    const group = glbByModel.get("oak.glb");
    expect(group![0].position.x).toBe(7);
    expect(group![0].position.z).toBe(13);
  });

  it("stage 2-4 entries have correct modelPath field matching the map key", () => {
    const entities = [
      makeEntity("e1", 2, "a.glb"),
      makeEntity("e2", 3, "b.glb"),
    ];
    const { glbByModel } = partitionTreeEntities(entities, false);
    for (const [modelPath, group] of glbByModel) {
      for (const entry of group) {
        expect(entry.modelPath).toBe(modelPath);
      }
    }
  });

  it("assigns correct STAGE_SCALES scale to procedural entities", () => {
    const s0 = partitionTreeEntities([makeEntity("e0", 0)], false).procedural[0];
    const s1 = partitionTreeEntities([makeEntity("e1", 1)], false).procedural[0];
    expect(s0.scale).toBe(STAGE_SCALES[0]);
    expect(s1.scale).toBe(STAGE_SCALES[1]);
  });

  it("does not mutate the input array", () => {
    const entities = [makeEntity("e1", 2, "oak.glb")];
    const original = [...entities];
    partitionTreeEntities(entities, false);
    expect(entities).toEqual(original);
  });

  it("two stage-2 trees with different baseModels produce two GLB groups", () => {
    const entities = [
      makeEntity("e1", 2, "oak.glb"),
      makeEntity("e2", 2, "pine.glb"),
    ];
    const { glbByModel } = partitionTreeEntities(entities, false);
    expect(glbByModel.size).toBe(2);
  });

  it("winter + non-winter trees with same species produce different groups in winter", () => {
    const entities = [
      makeEntity("e1", 3, "oak.glb", "oak-winter.glb", true),   // uses winterModel
      makeEntity("e2", 3, "oak.glb", "oak-winter.glb", false),  // uses baseModel
    ];
    const { glbByModel } = partitionTreeEntities(entities, true);
    // oak-winter.glb (e1) + oak.glb (e2) → 2 groups
    expect(glbByModel.size).toBe(2);
    expect(glbByModel.get("oak-winter.glb")).toHaveLength(1);
    expect(glbByModel.get("oak.glb")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// TreeInstances component export
// ---------------------------------------------------------------------------

describe("TreeInstances (Spec §8.1)", () => {
  it("exports TreeInstances as a function component", () => {
    expect(typeof TreeInstances).toBe("function");
  });

  it("has component name TreeInstances", () => {
    expect(TreeInstances.name).toBe("TreeInstances");
  });
});
