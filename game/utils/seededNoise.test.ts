import { SeededNoise } from "@/game/utils/seededNoise";

// Tests reference GAME_SPEC.md §31.1:
//   "Heightmap: AdvancedSeededNoise (Perlin + fBm + ridged multifractal + domain warping)"

describe("SeededNoise (Spec §31.1)", () => {
  describe("constructor", () => {
    it("constructs without throwing", () => {
      expect(() => new SeededNoise(42)).not.toThrow();
    });

    it("accepts seed 0", () => {
      expect(() => new SeededNoise(0)).not.toThrow();
    });

    it("accepts negative seeds", () => {
      expect(() => new SeededNoise(-12345)).not.toThrow();
    });
  });

  describe("perlin", () => {
    it("is deterministic: same seed+coords always returns same value", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(42);
      expect(n1.perlin(1.5, 2.7)).toBe(n2.perlin(1.5, 2.7));
    });

    it("differs for different seeds at same coords", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(99);
      expect(n1.perlin(1.5, 2.7)).not.toBe(n2.perlin(1.5, 2.7));
    });

    it("differs for different coords with same seed", () => {
      const n = new SeededNoise(42);
      expect(n.perlin(1.5, 2.7)).not.toBe(n.perlin(3.1, 4.9));
    });

    it("returns values in [-1, 1] range", () => {
      const n = new SeededNoise(7);
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const v = n.perlin(x * 0.37 + 0.1, y * 0.41 + 0.2);
          expect(v).toBeGreaterThanOrEqual(-1);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it("produces varied output (not constant)", () => {
      const n = new SeededNoise(42);
      const values = new Set<number>();
      for (let i = 0; i < 20; i++) {
        values.add(n.perlin(i * 0.3, i * 0.17));
      }
      expect(values.size).toBeGreaterThan(10);
    });

    it("works at integer coordinates (lattice points return 0 for Perlin)", () => {
      const n = new SeededNoise(42);
      // At integer grid points xf=0 and yf=0, so all grad contributions are 0
      expect(n.perlin(0, 0)).toBe(0);
      expect(n.perlin(1, 0)).toBe(0);
      expect(n.perlin(0, 1)).toBe(0);
    });
  });

  describe("fbm", () => {
    it("is deterministic: same seed+coords always returns same value", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(42);
      expect(n1.fbm(1.5, 2.7)).toBe(n2.fbm(1.5, 2.7));
    });

    it("differs for different seeds", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(99);
      expect(n1.fbm(1.5, 2.7)).not.toBe(n2.fbm(1.5, 2.7));
    });

    it("returns values in [-1, 1] range", () => {
      const n = new SeededNoise(7);
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const v = n.fbm(x * 0.37 + 0.1, y * 0.41 + 0.2);
          expect(v).toBeGreaterThanOrEqual(-1);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it("varies with octave count", () => {
      const n = new SeededNoise(42);
      const v1 = n.fbm(1.5, 2.7, 1);
      const v4 = n.fbm(1.5, 2.7, 4);
      // More octaves = more detail = different value
      expect(v1).not.toBe(v4);
    });

    it("produces varied output across space", () => {
      const n = new SeededNoise(42);
      const values = new Set<number>();
      for (let i = 0; i < 20; i++) {
        values.add(n.fbm(i * 0.3, i * 0.17));
      }
      expect(values.size).toBeGreaterThan(10);
    });
  });

  describe("ridged", () => {
    it("is deterministic: same seed+coords always returns same value", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(42);
      expect(n1.ridged(1.5, 2.7)).toBe(n2.ridged(1.5, 2.7));
    });

    it("differs for different seeds", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(99);
      expect(n1.ridged(1.5, 2.7)).not.toBe(n2.ridged(1.5, 2.7));
    });

    it("returns values in [0, 1] range", () => {
      const n = new SeededNoise(7);
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const v = n.ridged(x * 0.37 + 0.1, y * 0.41 + 0.2);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it("produces varied output across space", () => {
      const n = new SeededNoise(42);
      const values = new Set<number>();
      for (let i = 0; i < 20; i++) {
        values.add(n.ridged(i * 0.3, i * 0.17));
      }
      expect(values.size).toBeGreaterThan(10);
    });

    it("differs from fbm at same coords (ridged ≠ fbm)", () => {
      const n = new SeededNoise(42);
      expect(n.ridged(1.5, 2.7)).not.toBe(n.fbm(1.5, 2.7));
    });
  });

  describe("domainWarp", () => {
    it("is deterministic: same seed+coords always returns same value", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(42);
      expect(n1.domainWarp(1.5, 2.7)).toBe(n2.domainWarp(1.5, 2.7));
    });

    it("differs for different seeds", () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(99);
      expect(n1.domainWarp(1.5, 2.7)).not.toBe(n2.domainWarp(1.5, 2.7));
    });

    it("returns values in [-1, 1] range", () => {
      const n = new SeededNoise(7);
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const v = n.domainWarp(x * 0.37 + 0.1, y * 0.41 + 0.2);
          expect(v).toBeGreaterThanOrEqual(-1);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it("differs from plain fbm at same coords (warp displaces sample point)", () => {
      const n = new SeededNoise(42);
      expect(n.domainWarp(1.5, 2.7)).not.toBe(n.fbm(1.5, 2.7));
    });

    it("warpStrength=0 equals plain fbm (no displacement)", () => {
      const n = new SeededNoise(42);
      expect(n.domainWarp(1.5, 2.7, 0, 4)).toBe(n.fbm(1.5, 2.7, 4));
    });

    it("produces varied output across space", () => {
      const n = new SeededNoise(42);
      const values = new Set<number>();
      for (let i = 0; i < 20; i++) {
        values.add(n.domainWarp(i * 0.3, i * 0.17));
      }
      expect(values.size).toBeGreaterThan(10);
    });
  });

  describe("cross-method determinism", () => {
    it("all four methods produce stable values across instantiations", () => {
      const coords = [
        [0.5, 0.5],
        [3.14, 2.71],
        [-1.5, 7.3],
        [100.1, 200.2],
      ];
      const n1 = new SeededNoise(12345);
      const n2 = new SeededNoise(12345);

      for (const [x, y] of coords) {
        expect(n1.perlin(x, y)).toBe(n2.perlin(x, y));
        expect(n1.fbm(x, y)).toBe(n2.fbm(x, y));
        expect(n1.ridged(x, y)).toBe(n2.ridged(x, y));
        expect(n1.domainWarp(x, y)).toBe(n2.domainWarp(x, y));
      }
    });
  });
});
