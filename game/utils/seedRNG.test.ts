import { createRNG, hashString } from "@/game/utils/seedRNG";

describe("seedRNG", () => {
  describe("createRNG", () => {
    it("produces deterministic output for the same seed", () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(42);
      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];
      expect(seq1).toEqual(seq2);
    });

    it("produces different output for different seeds", () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(99);
      const val1 = rng1();
      const val2 = rng2();
      expect(val1).not.toBe(val2);
    });

    it("produces values in [0, 1) range", () => {
      const rng = createRNG(12345);
      for (let i = 0; i < 1000; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("reproduces the same sequence on repeated calls", () => {
      const rng = createRNG(7);
      const sequence: number[] = [];
      for (let i = 0; i < 10; i++) {
        sequence.push(rng());
      }
      const rng2 = createRNG(7);
      for (let i = 0; i < 10; i++) {
        expect(rng2()).toBe(sequence[i]);
      }
    });

    it("works with seed 0", () => {
      const rng = createRNG(0);
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it("works with negative seeds", () => {
      const rng = createRNG(-999);
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it("produces varied distribution (not all same value)", () => {
      const rng = createRNG(42);
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        values.add(rng());
      }
      // Should produce many unique values
      expect(values.size).toBeGreaterThan(90);
    });

    it("works with very large seeds", () => {
      const rng = createRNG(2147483647);
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  describe("hashString", () => {
    it("returns the same hash for the same input", () => {
      expect(hashString("hello")).toBe(hashString("hello"));
    });

    it("returns different hashes for different inputs", () => {
      expect(hashString("hello")).not.toBe(hashString("world"));
    });

    it("returns a non-negative 32-bit integer", () => {
      const hash = hashString("test");
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it("handles empty string", () => {
      const hash = hashString("");
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it("produces different hashes for similar strings", () => {
      const h1 = hashString("white-oak-3-5");
      const h2 = hashString("white-oak-3-6");
      const h3 = hashString("white-oak-4-5");
      expect(h1).not.toBe(h2);
      expect(h1).not.toBe(h3);
      expect(h2).not.toBe(h3);
    });

    it("handles unicode strings", () => {
      const hash = hashString("tree-\u{1F333}");
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it("is consistent across calls for species-grid pattern", () => {
      const key = "elder-pine-7-12";
      const hash1 = hashString(key);
      const hash2 = hashString(key);
      expect(hash1).toBe(hash2);
    });
  });
});
