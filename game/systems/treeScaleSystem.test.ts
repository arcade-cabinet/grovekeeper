/**
 * Tests for treeScaleSystem (Spec §8).
 *
 * US-034: TreeComponent.stage (0-4) maps to scale (0.2, 0.4, 0.6, 0.8, 1.0).
 */

import { MAX_STAGE, STAGE_VISUALS } from "@/game/systems/growth";
import {
  applyTreeScale,
  type TreeScaleEntity,
  treeScaleSystem,
} from "@/game/systems/treeScaleSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(stage: number, progress = 0): TreeScaleEntity {
  return {
    tree: { stage, progress },
    renderable: { scale: 0, visible: true },
  };
}

// ---------------------------------------------------------------------------
// applyTreeScale
// ---------------------------------------------------------------------------

describe("applyTreeScale (Spec §8)", () => {
  it("stage 0 → scale 0.1 at progress 0 (Spec §8: Seed)", () => {
    const entity = makeEntity(0, 0);
    applyTreeScale(entity);
    expect(entity.renderable.scale).toBeCloseTo(0.1, 6);
  });

  it("stage 1 → scale 0.3 at progress 0 (Spec §8: Sprout)", () => {
    const entity = makeEntity(1, 0);
    applyTreeScale(entity);
    expect(entity.renderable.scale).toBeCloseTo(0.3, 6);
  });

  it("stage 2 → scale 0.5 at progress 0 (Spec §8: Sapling)", () => {
    const entity = makeEntity(2, 0);
    applyTreeScale(entity);
    expect(entity.renderable.scale).toBeCloseTo(0.5, 6);
  });

  it("stage 3 → scale 1.0 at progress 0 (Spec §8: Mature)", () => {
    const entity = makeEntity(3, 0);
    applyTreeScale(entity);
    expect(entity.renderable.scale).toBeCloseTo(1.0, 6);
  });

  it("stage 4 → scale 1.3 at progress 0 (Spec §8: Old Growth)", () => {
    const entity = makeEntity(4, 0);
    applyTreeScale(entity);
    expect(entity.renderable.scale).toBeCloseTo(1.3, 6);
  });

  it("stage 0 trees are visibly smaller than stage 4 trees", () => {
    const seed = makeEntity(0, 0);
    const old = makeEntity(4, 0);
    applyTreeScale(seed);
    applyTreeScale(old);
    expect(seed.renderable.scale).toBeLessThan(old.renderable.scale);
  });

  it("scale increases monotonically from stage 0 to 4", () => {
    const scales = [0, 1, 2, 3, 4].map((stage) => {
      const e = makeEntity(stage, 0);
      applyTreeScale(e);
      return e.renderable.scale;
    });
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThan(scales[i - 1]);
    }
  });

  it("mutates renderable.scale in-place", () => {
    const entity = makeEntity(3, 0);
    const renderable = entity.renderable;
    applyTreeScale(entity);
    // Same object reference
    expect(renderable.scale).toBeCloseTo(STAGE_VISUALS[3].scale, 6);
  });

  it("scale interpolates slightly upward with progress > 0 (before max stage)", () => {
    const at0 = makeEntity(2, 0);
    const atHalf = makeEntity(2, 0.5);
    applyTreeScale(at0);
    applyTreeScale(atHalf);
    // Progress gives a partial preview toward the next stage scale
    expect(atHalf.renderable.scale).toBeGreaterThan(at0.renderable.scale);
  });

  it("scale at max stage does not change with progress", () => {
    const atProgress0 = makeEntity(MAX_STAGE, 0);
    const atProgress1 = makeEntity(MAX_STAGE, 1);
    applyTreeScale(atProgress0);
    applyTreeScale(atProgress1);
    expect(atProgress0.renderable.scale).toBeCloseTo(atProgress1.renderable.scale, 6);
  });
});

// ---------------------------------------------------------------------------
// treeScaleSystem
// ---------------------------------------------------------------------------

describe("treeScaleSystem (Spec §8)", () => {
  it("updates all entities in the query", () => {
    const entities = [makeEntity(0, 0), makeEntity(2, 0), makeEntity(4, 0)];
    treeScaleSystem({ entities });

    expect(entities[0].renderable.scale).toBeCloseTo(0.1, 6);
    expect(entities[1].renderable.scale).toBeCloseTo(0.5, 6);
    expect(entities[2].renderable.scale).toBeCloseTo(1.3, 6);
  });

  it("handles an empty query without error", () => {
    expect(() => treeScaleSystem({ entities: [] })).not.toThrow();
  });

  it("updates scale on each call (stage can change between ticks)", () => {
    const entity = makeEntity(1, 0);
    treeScaleSystem({ entities: [entity] });
    const scaleBefore = entity.renderable.scale;

    // Simulate stage advance
    entity.tree.stage = 3;
    treeScaleSystem({ entities: [entity] });

    expect(entity.renderable.scale).toBeGreaterThan(scaleBefore);
    expect(entity.renderable.scale).toBeCloseTo(1.0, 6);
  });
});
