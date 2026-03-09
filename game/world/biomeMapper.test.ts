/**
 * biomeMapper tests (Spec §17.3)
 *
 * Covers:
 *  - All 8 biome types produced for appropriate temperature + moisture inputs
 *  - Twilight Glade distance gate (>= 20 chunks from origin)
 *  - Determinism — same inputs always produce the same biome
 *  - BIOME_COLORS covers all 8 types with valid hex strings
 *  - getBiomeColor returns the correct color per biome
 */

import { assignBiome, BIOME_COLORS, type BiomeType, getBiomeColor } from "./biomeMapper.ts";

const ALL_BIOMES: BiomeType[] = [
  "starting-grove",
  "meadow",
  "ancient-forest",
  "wetlands",
  "rocky-highlands",
  "orchard-valley",
  "frozen-peaks",
  "twilight-glade",
];

// ─── assignBiome ──────────────────────────────────────────────────────────────

describe("assignBiome (Spec §17.3)", () => {
  it("returns 'frozen-peaks' for very cold temperature (< 0.2)", () => {
    expect(assignBiome(0.0, 0.3)).toBe("frozen-peaks");
    expect(assignBiome(0.1, 0.5)).toBe("frozen-peaks");
    expect(assignBiome(0.19, 0.4)).toBe("frozen-peaks");
  });

  it("returns 'wetlands' for very high moisture (> 0.8) and non-frozen temp", () => {
    expect(assignBiome(0.5, 0.9)).toBe("wetlands");
    expect(assignBiome(0.4, 1.0)).toBe("wetlands");
    expect(assignBiome(0.6, 0.85)).toBe("wetlands");
  });

  it("returns 'rocky-highlands' for cold + dry (temp 0.2–0.4, moisture < 0.3)", () => {
    expect(assignBiome(0.25, 0.1)).toBe("rocky-highlands");
    expect(assignBiome(0.35, 0.2)).toBe("rocky-highlands");
  });

  it("returns 'orchard-valley' for warm + moderate moisture (temp > 0.6, moisture 0.5–0.7)", () => {
    expect(assignBiome(0.7, 0.6)).toBe("orchard-valley");
    expect(assignBiome(0.8, 0.55)).toBe("orchard-valley");
    expect(assignBiome(0.65, 0.7)).toBe("orchard-valley");
  });

  it("returns 'twilight-glade' for moderate temp + moisture at >= 20 chunk distance", () => {
    expect(assignBiome(0.4, 0.6, 20)).toBe("twilight-glade");
    expect(assignBiome(0.35, 0.65, 25)).toBe("twilight-glade");
    expect(assignBiome(0.45, 0.55, 30)).toBe("twilight-glade");
  });

  it("does NOT return 'twilight-glade' within 20 chunks of origin", () => {
    // Same temp+moisture that would be twilight glade at distance 20+
    expect(assignBiome(0.4, 0.6, 0)).not.toBe("twilight-glade");
    expect(assignBiome(0.4, 0.6, 19)).not.toBe("twilight-glade");
    expect(assignBiome(0.4, 0.6)).not.toBe("twilight-glade"); // default distanceFromOrigin=0
  });

  it("returns 'ancient-forest' for moderate temp + high moisture (temp 0.3–0.5, moisture 0.6–0.8)", () => {
    expect(assignBiome(0.4, 0.7)).toBe("ancient-forest");
    expect(assignBiome(0.3, 0.75)).toBe("ancient-forest");
    expect(assignBiome(0.5, 0.65)).toBe("ancient-forest");
  });

  it("returns 'meadow' for warm + low moisture (temp > 0.5, moisture < 0.5)", () => {
    expect(assignBiome(0.6, 0.3)).toBe("meadow");
    expect(assignBiome(0.7, 0.2)).toBe("meadow");
    expect(assignBiome(0.55, 0.4)).toBe("meadow");
  });

  it("returns 'starting-grove' as default fallback", () => {
    // Mid-range values that don't hit any specific biome rule
    expect(assignBiome(0.5, 0.5)).toBe("starting-grove");
    expect(assignBiome(0.45, 0.45)).toBe("starting-grove");
  });

  it("is deterministic — same inputs always produce the same biome", () => {
    const inputs: [number, number, number][] = [
      [0.1, 0.3, 0],
      [0.5, 0.9, 0],
      [0.3, 0.2, 0],
      [0.7, 0.6, 0],
      [0.4, 0.6, 25],
      [0.4, 0.7, 0],
      [0.6, 0.3, 0],
      [0.5, 0.5, 0],
    ];
    for (const [temp, moist, dist] of inputs) {
      const first = assignBiome(temp, moist, dist);
      const second = assignBiome(temp, moist, dist);
      expect(first).toBe(second);
    }
  });

  it("frozen-peaks takes priority over wetlands at very cold + high moisture", () => {
    // temp=0.1 → frozen-peaks, even though moisture=0.9 would be wetlands
    expect(assignBiome(0.1, 0.9)).toBe("frozen-peaks");
  });
});

// ─── BIOME_COLORS ─────────────────────────────────────────────────────────────

describe("BIOME_COLORS (Spec §17.3)", () => {
  it("has entries for all 8 biome types", () => {
    for (const biome of ALL_BIOMES) {
      expect(BIOME_COLORS[biome]).toBeDefined();
    }
  });

  it("all colors are valid 6-digit hex strings", () => {
    for (const biome of ALL_BIOMES) {
      expect(BIOME_COLORS[biome]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("all biome colors are distinct from each other", () => {
    const colors = ALL_BIOMES.map((b) => BIOME_COLORS[b]);
    const unique = new Set(colors);
    expect(unique.size).toBe(ALL_BIOMES.length);
  });
});

// ─── getBiomeColor ────────────────────────────────────────────────────────────

describe("getBiomeColor", () => {
  it("returns the hex color for starting-grove", () => {
    expect(getBiomeColor("starting-grove")).toBe("#6db856");
  });

  it("returns the hex color for frozen-peaks", () => {
    expect(getBiomeColor("frozen-peaks")).toBe("#daf0f8");
  });

  it("returns the hex color for twilight-glade", () => {
    expect(getBiomeColor("twilight-glade")).toBe("#7a5aaa");
  });

  it("is consistent with BIOME_COLORS record", () => {
    for (const biome of ALL_BIOMES) {
      expect(getBiomeColor(biome)).toBe(BIOME_COLORS[biome]);
    }
  });
});
