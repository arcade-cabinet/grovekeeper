/**
 * Tests for hedge maze instance geometry helpers.
 * Spec §42 — Procedural Architecture (hedge maze subsystem).
 *
 * Covers:
 *   - classifyHedgeZone: zone boundary correctness for outer / mid / deep
 *   - generateHedgeInstances: count (2× pieces), zone propagation, range guards
 */

import { createRNG } from "@/game/utils/seedRNG";
import { classifyHedgeZone, generateHedgeInstances } from "./hedgeGeometry.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 12×12 maze, cellScale=3 → world extent 36. Center at world (18, 18). */
const MAZE_SIZE = 12;
const CELL_SCALE = 3;
const CENTER_WORLD = (MAZE_SIZE * CELL_SCALE) / 2; // 18

const rng = createRNG(42);

// ---------------------------------------------------------------------------
// classifyHedgeZone (Spec §42)
// ---------------------------------------------------------------------------

describe("classifyHedgeZone (Spec §42)", () => {
  it("classifies a corner piece (far from center) as outer", () => {
    // (0, 0) is at the far corner — normalised dist ≈ 1.0
    expect(classifyHedgeZone(0, 0, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE)).toBe("outer");
  });

  it("classifies the far edge midpoint as outer", () => {
    // (0, CENTER_WORLD) — dx = 18, dz = 0 → dist = 1.0
    expect(classifyHedgeZone(0, CENTER_WORLD, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE)).toBe("outer");
  });

  it("classifies pieces just beyond 60% half-extent as outer", () => {
    const halfExtent = CENTER_WORLD;
    // 63% of halfExtent away from center
    const x = CENTER_WORLD + halfExtent * 0.63;
    expect(classifyHedgeZone(x, CENTER_WORLD, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE)).toBe("outer");
  });

  it("classifies pieces between 25% and 60% half-extent as mid", () => {
    const halfExtent = CENTER_WORLD;
    // 40% of halfExtent away from center
    const x = CENTER_WORLD + halfExtent * 0.4;
    expect(classifyHedgeZone(x, CENTER_WORLD, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE)).toBe("mid");
  });

  it("classifies pieces within 25% half-extent as deep", () => {
    const halfExtent = CENTER_WORLD;
    // 10% of halfExtent away from center
    const x = CENTER_WORLD + halfExtent * 0.1;
    expect(classifyHedgeZone(x, CENTER_WORLD, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE)).toBe("deep");
  });

  it("classifies the exact center position as deep", () => {
    expect(
      classifyHedgeZone(CENTER_WORLD, CENTER_WORLD, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE),
    ).toBe("deep");
  });

  it("handles mazeSize=0 without division by zero (returns outer)", () => {
    expect(classifyHedgeZone(0, 0, 0, 0, 0)).toBe("outer");
  });

  it("is symmetric: negative and positive offsets produce the same zone", () => {
    const offset = CENTER_WORLD * 0.5;
    const zonePos = classifyHedgeZone(
      CENTER_WORLD + offset,
      CENTER_WORLD,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
    );
    const zoneNeg = classifyHedgeZone(
      CENTER_WORLD - offset,
      CENTER_WORLD,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
    );
    expect(zonePos).toBe(zoneNeg);
  });
});

// ---------------------------------------------------------------------------
// generateHedgeInstances (Spec §42)
// ---------------------------------------------------------------------------

describe("generateHedgeInstances (Spec §42)", () => {
  const pieces = [
    { x: 0, y: 0, z: 0 }, // corner — outer
    { x: CENTER_WORLD, y: 0, z: CENTER_WORLD }, // center — deep
    { x: CENTER_WORLD + 6, y: 0, z: CENTER_WORLD }, // mid-range
  ];

  it("produces exactly 2 instances per input piece", () => {
    const instances = generateHedgeInstances(
      pieces,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(1),
    );
    expect(instances).toHaveLength(pieces.length * 2);
  });

  it("the two instances for a piece have y=terrainY and y=terrainY+cellScale", () => {
    const terrainY = 2.5;
    const singlePiece = [{ x: 0, y: terrainY, z: 0 }];
    const instances = generateHedgeInstances(
      singlePiece,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(2),
    );
    const ys = instances.map((i) => i.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(terrainY);
    expect(ys[1]).toBeCloseTo(terrainY + CELL_SCALE);
  });

  it("y=0 terrain produces ground layer at 0 and upper layer at cellScale", () => {
    const singlePiece = [{ x: 0, y: 0, z: 0 }];
    const instances = generateHedgeInstances(
      singlePiece,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(2),
    );
    const ys = instances.map((i) => i.y).sort((a, b) => a - b);
    expect(ys[0]).toBe(0);
    expect(ys[1]).toBe(CELL_SCALE);
  });

  it("all instances inherit correct zone from their source piece", () => {
    const instances = generateHedgeInstances(
      pieces,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(3),
    );
    // First two instances come from the corner piece — zone must be "outer"
    expect(instances[0].zone).toBe("outer");
    expect(instances[1].zone).toBe("outer");
    // Last two come from the center piece — zone must be "deep"
    expect(instances[2].zone).toBe("deep");
    expect(instances[3].zone).toBe("deep");
  });

  it("scale values stay within [0.8, 1.2]", () => {
    const instances = generateHedgeInstances(
      pieces,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(4),
    );
    for (const inst of instances) {
      expect(inst.scale).toBeGreaterThanOrEqual(0.8);
      expect(inst.scale).toBeLessThanOrEqual(1.2 + 1e-9);
    }
  });

  it("scaleY values stay within [1.1, 1.5]", () => {
    const instances = generateHedgeInstances(
      pieces,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(5),
    );
    for (const inst of instances) {
      expect(inst.scaleY).toBeGreaterThanOrEqual(1.1);
      expect(inst.scaleY).toBeLessThanOrEqual(1.5 + 1e-9);
    }
  });

  it("rotY values stay within [0, 2π)", () => {
    const instances = generateHedgeInstances(
      pieces,
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(6),
    );
    for (const inst of instances) {
      expect(inst.rotY).toBeGreaterThanOrEqual(0);
      expect(inst.rotY).toBeLessThan(Math.PI * 2 + 1e-9);
    }
  });

  it("returns empty array for empty input", () => {
    const instances = generateHedgeInstances([], CENTER_WORLD, CENTER_WORLD, MAZE_SIZE, rng);
    expect(instances).toHaveLength(0);
  });

  it("is deterministic: same seed produces identical output", () => {
    const a = generateHedgeInstances(pieces, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE, createRNG(7));
    const b = generateHedgeInstances(pieces, CENTER_WORLD, CENTER_WORLD, MAZE_SIZE, createRNG(7));
    expect(a).toEqual(b);
  });

  it("preserves x / z world positions on each instance", () => {
    const piece = { x: 9, y: 0, z: 15 };
    const instances = generateHedgeInstances(
      [piece],
      CENTER_WORLD,
      CENTER_WORLD,
      MAZE_SIZE,
      createRNG(8),
    );
    for (const inst of instances) {
      expect(inst.x).toBe(9);
      expect(inst.z).toBe(15);
    }
  });
});
