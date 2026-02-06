import { describe, it, expect } from "vitest";
import { keysToIsometric } from "./useKeyboardInput";

describe("useKeyboardInput", () => {
  describe("keysToIsometric", () => {
    it("returns zero movement when no keys pressed", () => {
      const result = keysToIsometric(new Set());
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });

    it("converts W to iso NW direction", () => {
      const result = keysToIsometric(new Set(["w"]));
      expect(result.x).toBeLessThan(0); // left on screen = -x iso
      expect(result.z).toBeLessThan(0); // up on screen = -z iso
    });

    it("converts S to iso SE direction", () => {
      const result = keysToIsometric(new Set(["s"]));
      expect(result.x).toBeGreaterThan(0);
      expect(result.z).toBeGreaterThan(0);
    });

    it("converts D to iso NE direction", () => {
      const result = keysToIsometric(new Set(["d"]));
      expect(result.x).toBeGreaterThan(0);
      expect(result.z).toBeLessThan(0);
    });

    it("converts A to iso SW direction", () => {
      const result = keysToIsometric(new Set(["a"]));
      expect(result.x).toBeLessThan(0);
      expect(result.z).toBeGreaterThan(0);
    });

    it("normalizes diagonal movement to magnitude <= 1", () => {
      const result = keysToIsometric(new Set(["w", "d"]));
      const mag = Math.sqrt(result.x * result.x + result.z * result.z);
      expect(mag).toBeLessThanOrEqual(1.01); // small float tolerance
    });

    it("arrow keys work the same as WASD", () => {
      const wasd = keysToIsometric(new Set(["w"]));
      const arrow = keysToIsometric(new Set(["arrowup"]));
      expect(wasd.x).toBeCloseTo(arrow.x);
      expect(wasd.z).toBeCloseTo(arrow.z);
    });

    it("opposite keys cancel out", () => {
      const result = keysToIsometric(new Set(["w", "s"]));
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });
  });
});
