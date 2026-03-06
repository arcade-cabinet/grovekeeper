import { advancePathFollow, createPathFollow } from "./pathFollowing";

// cellSize is 1 per grid.json, so tile centers = tile coords * 1

describe("createPathFollow", () => {
  it("creates state from a tile path", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ];
    const state = createPathFollow(path);
    expect(state.waypoints).toHaveLength(3);
    expect(state.currentIndex).toBe(1); // skips first (current tile)
    expect(state.done).toBe(false);
  });

  it("starts at index 0 for single-waypoint path", () => {
    const path = [{ x: 5, z: 5 }];
    const state = createPathFollow(path);
    expect(state.currentIndex).toBe(0);
    expect(state.done).toBe(false);
  });

  it("marks done immediately for empty path", () => {
    const state = createPathFollow([]);
    expect(state.waypoints).toHaveLength(0);
    expect(state.done).toBe(true);
  });

  it("converts tile coordinates to world-space centers", () => {
    // With cellSize = 1, world center = tile * 1
    const path = [{ x: 3, z: 7 }];
    const state = createPathFollow(path);
    expect(state.waypoints[0]).toEqual({ x: 3, z: 7 });
  });
});

describe("advancePathFollow", () => {
  it("returns normalized direction vector toward target", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ];
    const state = createPathFollow(path);
    // Player is at (0, 0), target waypoint is at (1, 0)
    const dir = advancePathFollow(state, { x: 0, z: 0 });
    expect(dir.x).toBeCloseTo(1);
    expect(dir.z).toBeCloseTo(0);
    expect(state.done).toBe(false);
  });

  it("returns zero vector when path is done", () => {
    const state = createPathFollow([]);
    const dir = advancePathFollow(state, { x: 0, z: 0 });
    expect(dir).toEqual({ x: 0, z: 0 });
  });

  it("advances to next waypoint when close enough", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ];
    const state = createPathFollow(path);
    // Player is very close to waypoint 1
    const dir = advancePathFollow(state, { x: 1.0, z: 0 });
    // Should skip waypoint 1 and head to waypoint 2
    expect(state.currentIndex).toBe(2);
    expect(dir.x).toBeCloseTo(1);
    expect(dir.z).toBeCloseTo(0);
  });

  it("completes when player reaches final waypoint", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ];
    const state = createPathFollow(path);
    // Player is at the final waypoint
    const dir = advancePathFollow(state, { x: 1.0, z: 0 });
    expect(dir).toEqual({ x: 0, z: 0 });
    expect(state.done).toBe(true);
  });

  it("returns zero when already marked done", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ];
    const state = createPathFollow(path);
    state.done = true;
    const dir = advancePathFollow(state, { x: 0, z: 0 });
    expect(dir).toEqual({ x: 0, z: 0 });
  });

  it("skips multiple close waypoints iteratively", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 0.05, z: 0 },
      { x: 0.1, z: 0 },
      { x: 5, z: 0 },
    ];
    const state = createPathFollow(path);
    // Player at origin, close to waypoints 1 and 2
    const dir = advancePathFollow(state, { x: 0, z: 0 });
    // Should skip past waypoints within threshold and target waypoint 3
    expect(state.currentIndex).toBeGreaterThanOrEqual(3);
    expect(dir.x).toBeGreaterThan(0);
    expect(state.done).toBe(false);
  });

  it("normalizes direction vector", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 3, z: 4 },
    ];
    const state = createPathFollow(path);
    const dir = advancePathFollow(state, { x: 0, z: 0 });
    const magnitude = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    expect(magnitude).toBeCloseTo(1);
    expect(dir.x).toBeCloseTo(3 / 5);
    expect(dir.z).toBeCloseTo(4 / 5);
  });
});
