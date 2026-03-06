import { keysToWorld } from "./useInput";

describe("keysToWorld", () => {
  it("returns zero movement when no keys pressed", () => {
    const result = keysToWorld(new Set());
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });

  it("converts W to forward (positive Z)", () => {
    const result = keysToWorld(new Set(["w"]));
    expect(result.x).toBe(0);
    expect(result.z).toBe(1);
  });

  it("converts S to backward (negative Z)", () => {
    const result = keysToWorld(new Set(["s"]));
    expect(result.x).toBe(0);
    expect(result.z).toBe(-1);
  });

  it("converts D to right (positive X)", () => {
    const result = keysToWorld(new Set(["d"]));
    expect(result.x).toBe(1);
    expect(result.z).toBe(0);
  });

  it("converts A to left (negative X)", () => {
    const result = keysToWorld(new Set(["a"]));
    expect(result.x).toBe(-1);
    expect(result.z).toBe(0);
  });

  it("normalizes diagonal movement to magnitude <= 1", () => {
    const result = keysToWorld(new Set(["w", "d"]));
    const mag = Math.sqrt(result.x * result.x + result.z * result.z);
    expect(mag).toBeCloseTo(1, 5);
    expect(result.x).toBeGreaterThan(0);
    expect(result.z).toBeGreaterThan(0);
  });

  it("normalizes W+A diagonal", () => {
    const result = keysToWorld(new Set(["w", "a"]));
    const mag = Math.sqrt(result.x * result.x + result.z * result.z);
    expect(mag).toBeCloseTo(1, 5);
    expect(result.x).toBeLessThan(0);
    expect(result.z).toBeGreaterThan(0);
  });

  it("arrow keys work the same as WASD", () => {
    const wasd = keysToWorld(new Set(["w"]));
    const arrow = keysToWorld(new Set(["arrowup"]));
    expect(wasd.x).toBe(arrow.x);
    expect(wasd.z).toBe(arrow.z);

    const wasdRight = keysToWorld(new Set(["d"]));
    const arrowRight = keysToWorld(new Set(["arrowright"]));
    expect(wasdRight.x).toBe(arrowRight.x);
    expect(wasdRight.z).toBe(arrowRight.z);
  });

  it("opposite keys cancel out to zero", () => {
    expect(keysToWorld(new Set(["w", "s"]))).toEqual({ x: 0, z: 0 });
    expect(keysToWorld(new Set(["a", "d"]))).toEqual({ x: 0, z: 0 });
    expect(keysToWorld(new Set(["w", "s", "a", "d"]))).toEqual({
      x: 0,
      z: 0,
    });
  });

  it("mixed arrow and WASD keys combine correctly", () => {
    const result = keysToWorld(new Set(["w", "arrowright"]));
    const mag = Math.sqrt(result.x * result.x + result.z * result.z);
    expect(mag).toBeCloseTo(1, 5);
    expect(result.x).toBeGreaterThan(0);
    expect(result.z).toBeGreaterThan(0);
  });

  it("ignores non-movement keys", () => {
    const result = keysToWorld(new Set(["e", "space", "shift"]));
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });
});
