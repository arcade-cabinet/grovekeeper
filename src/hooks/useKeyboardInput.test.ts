import { describe, expect, it } from "vitest";
import { keysToIsometric, keysToWorld } from "./useKeyboardInput";

describe("useKeyboardInput", () => {
  describe("keysToWorld", () => {
    it("returns zero movement when no keys pressed", () => {
      const result = keysToWorld(new Set());
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });

    it("converts W to forward (positive Z, away from camera)", () => {
      const result = keysToWorld(new Set(["w"]));
      expect(result.x).toBe(0);
      expect(result.z).toBeGreaterThan(0);
    });

    it("converts S to backward (negative Z, toward camera)", () => {
      const result = keysToWorld(new Set(["s"]));
      expect(result.x).toBe(0);
      expect(result.z).toBeLessThan(0);
    });

    it("converts D to right (positive X)", () => {
      const result = keysToWorld(new Set(["d"]));
      expect(result.x).toBeGreaterThan(0);
      expect(result.z).toBe(0);
    });

    it("converts A to left (negative X)", () => {
      const result = keysToWorld(new Set(["a"]));
      expect(result.x).toBeLessThan(0);
      expect(result.z).toBe(0);
    });

    it("normalizes diagonal movement to magnitude <= 1", () => {
      const result = keysToWorld(new Set(["w", "d"]));
      const mag = Math.sqrt(result.x * result.x + result.z * result.z);
      expect(mag).toBeLessThanOrEqual(1.01); // small float tolerance
    });

    it("arrow keys work the same as WASD", () => {
      const wasd = keysToWorld(new Set(["w"]));
      const arrow = keysToWorld(new Set(["arrowup"]));
      expect(wasd.x).toBeCloseTo(arrow.x);
      expect(wasd.z).toBeCloseTo(arrow.z);
    });

    it("opposite keys cancel out", () => {
      const result = keysToWorld(new Set(["w", "s"]));
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe("keysToIsometric (deprecated alias)", () => {
    it("is the same function as keysToWorld", () => {
      expect(keysToIsometric).toBe(keysToWorld);
    });
  });
});
