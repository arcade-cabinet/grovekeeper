import { describe, it, expect } from "vitest";
import { createRNG, hashString } from "./seedRNG";

describe("seedRNG", () => {
  describe("createRNG", () => {
    it("returns a function", () => {
      const rng = createRNG(42);
      expect(typeof rng).toBe("function");
    });

    it("returns numbers between 0 and 1", () => {
      const rng = createRNG(42);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("is deterministic — same seed produces same sequence", () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);
      for (let i = 0; i < 50; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it("different seeds produce different sequences", () => {
      const rng1 = createRNG(1);
      const rng2 = createRNG(2);
      const vals1 = Array.from({ length: 10 }, () => rng1());
      const vals2 = Array.from({ length: 10 }, () => rng2());
      expect(vals1).not.toEqual(vals2);
    });
  });

  describe("hashString", () => {
    it("returns a number", () => {
      expect(typeof hashString("oak-3-5")).toBe("number");
    });

    it("is deterministic", () => {
      expect(hashString("oak-3-5")).toBe(hashString("oak-3-5"));
    });

    it("returns different values for different inputs", () => {
      expect(hashString("oak-3-5")).not.toBe(hashString("oak-3-6"));
    });
  });
});
