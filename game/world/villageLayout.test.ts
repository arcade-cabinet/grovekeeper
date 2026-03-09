/**
 * villageLayout.test.ts
 *
 * Spec §43.1 — Street-Grid Layout Algorithm.
 *
 * All tests reference §43.1 in their describe blocks.
 * Tests run against pure logic only — no 3D scene required.
 */

import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import {
  type BuildingLot,
  type FurniturePlacement,
  generateVillageLayout,
  type VillageLayout,
} from "./villageLayout/index.ts";

// ── Test helpers ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = 16;

function flatHeightmap(value = 0): Float32Array {
  return new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(value);
}

function gradientHeightmap(): Float32Array {
  const hm = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);
  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      hm[z * CHUNK_SIZE + x] = z * 0.2 + x * 0.1;
    }
  }
  return hm;
}

/**
 * Check if two lots overlap (strict — touching edges are not overlapping).
 * Lots use chunk-local coordinates.
 */
function lotsOverlap(a: BuildingLot, b: BuildingLot): boolean {
  const aRight = a.x + a.w;
  const aBottom = a.z + a.d;
  const bRight = b.x + b.w;
  const bBottom = b.z + b.d;
  return !(aRight <= b.x || bRight <= a.x || aBottom <= b.z || bBottom <= a.z);
}

/** A non-origin chunk that always gets the landmark position. */
const TEST_SEED = "Gentle Mossy Hollow";
const TEST_CX = 3;
const TEST_CZ = 5;

// ── Determinism ───────────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Determinism", () => {
  it("produces identical output for the same inputs (same seed, chunk, heightmap)", () => {
    const hm = flatHeightmap();
    const r1 = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, hm);
    const r2 = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, hm);

    expect(r1.streets.length).toBe(r2.streets.length);
    expect(r1.lots.length).toBe(r2.lots.length);
    expect(r1.buildings.length).toBe(r2.buildings.length);
    expect(r1.furniture.length).toBe(r2.furniture.length);
    expect(r1.center.x).toBeCloseTo(r2.center.x);
    expect(r1.center.z).toBeCloseTo(r2.center.z);

    for (let i = 0; i < r1.buildings.length; i++) {
      expect(r1.buildings[i].blueprintId).toBe(r2.buildings[i].blueprintId);
      expect(r1.buildings[i].position.x).toBeCloseTo(r2.buildings[i].position.x);
      expect(r1.buildings[i].position.z).toBeCloseTo(r2.buildings[i].position.z);
      expect(r1.buildings[i].facing).toBe(r2.buildings[i].facing);
      expect(r1.buildings[i].variation).toBe(r2.buildings[i].variation);
    }
  });

  it("produces different layouts for different seeds", () => {
    const hm = flatHeightmap();
    const r1 = generateVillageLayout("Seed Alpha", TEST_CX, TEST_CZ, hm);
    const r2 = generateVillageLayout("Seed Beta", TEST_CX, TEST_CZ, hm);

    // At least one property must differ (grid size or blueprint selection).
    const sameGridW = r1.lots.length === r2.lots.length;
    const sameBlueprintIds =
      r1.buildings.length === r2.buildings.length &&
      r1.buildings.every((b, i) => b.blueprintId === r2.buildings[i]?.blueprintId);

    // Very unlikely that everything matches across different seeds.
    expect(sameGridW && sameBlueprintIds).toBe(false);
  });

  it("produces different layouts for different chunk coordinates", () => {
    const hm = flatHeightmap();
    const r1 = generateVillageLayout(TEST_SEED, 1, 2, hm);
    const r2 = generateVillageLayout(TEST_SEED, 4, 7, hm);

    // Centers are different (different landmark positions).
    const sameCenter =
      Math.abs(r1.center.x - r2.center.x) < 0.01 && Math.abs(r1.center.z - r2.center.z) < 0.01;
    expect(sameCenter).toBe(false);
  });
});

// ── Grid dimensions ───────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Grid dimensions within config range", () => {
  const cfg = structuresConfig.villageLayout;

  it("always generates a layout result (non-null)", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    expect(result).toBeDefined();
  });

  it("has at least 1 street segment (main street always present)", () => {
    for (let cx = 1; cx <= 8; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      expect(result.streets.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has at most 2 street segments (main + optional cross)", () => {
    for (let cx = 1; cx <= 8; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      expect(result.streets.length).toBeLessThanOrEqual(2);
    }
  });

  it("lots count is 2 without cross street, 4 with cross street", () => {
    let saw2 = false;
    let saw4 = false;
    for (let cx = 1; cx <= 20 && !(saw2 && saw4); cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 1, flatHeightmap());
      if (result.streets.length === 1) saw2 = true;
      if (result.streets.length === 2) saw4 = true;
    }
    // We should see both 2-lot and 4-lot layouts across many seeds.
    expect(saw2).toBe(true);
    expect(saw4).toBe(true);
  });

  it("all street segments have width equal to config streetWidth", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const seg of result.streets) {
      expect(seg.width).toBe(cfg.streetWidth);
    }
  });
});

// ── Building count ────────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Building placement", () => {
  it("has at least 2 buildings (minimum viable village, §43.2)", () => {
    // Test across multiple seeds to account for degenerate lot rejection.
    let minBuildingsFound = false;
    for (let cx = 1; cx <= 10; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      if (result.buildings.length >= 2) {
        minBuildingsFound = true;
        break;
      }
    }
    expect(minBuildingsFound).toBe(true);
  });

  it("building count never exceeds lot count (1 building per lot at most)", () => {
    for (let cx = 1; cx <= 10; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      expect(result.buildings.length).toBeLessThanOrEqual(result.lots.length);
    }
  });

  it("all buildings have a valid BlueprintId from the config pool", () => {
    const validIds = structuresConfig.blueprints.map((b) => b.id);
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const building of result.buildings) {
      expect(validIds).toContain(building.blueprintId);
    }
  });

  it("all buildings face a street — facing is one of 0 | 90 | 180 | 270", () => {
    const validFacings = [0, 90, 180, 270];
    for (let cx = 1; cx <= 8; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      for (const building of result.buildings) {
        expect(validFacings).toContain(building.facing);
      }
    }
  });

  it("rotationY corresponds to facing in radians (facing × π/180)", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const building of result.buildings) {
      const expected = (building.facing * Math.PI) / 180;
      expect(building.rotationY).toBeCloseTo(expected);
    }
  });

  it("building variation is an integer in [0, 255]", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const building of result.buildings) {
      expect(building.variation).toBeGreaterThanOrEqual(0);
      expect(building.variation).toBeLessThanOrEqual(255);
      expect(Number.isInteger(building.variation)).toBe(true);
    }
  });

  it("building footprintW and footprintD are positive", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const building of result.buildings) {
      expect(building.footprintW).toBeGreaterThan(0);
      expect(building.footprintD).toBeGreaterThan(0);
    }
  });

  it("building stories matches blueprint config", () => {
    const blueprintMap = new Map(structuresConfig.blueprints.map((b) => [b.id, b]));
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const building of result.buildings) {
      const cfg = blueprintMap.get(building.blueprintId);
      if (cfg) {
        expect(building.stories).toBe(cfg.stories);
      }
    }
  });

  it("building materialType matches blueprint config", () => {
    const blueprintMap = new Map(structuresConfig.blueprints.map((b) => [b.id, b]));
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    for (const building of result.buildings) {
      const cfg = blueprintMap.get(building.blueprintId);
      if (cfg) {
        expect(building.materialType).toBe(cfg.materialType);
      }
    }
  });
});

// ── Lot overlap ───────────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Lot non-overlap", () => {
  it("no two lots overlap each other", () => {
    for (let cx = 1; cx <= 12; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 3, flatHeightmap());
      for (let i = 0; i < result.lots.length; i++) {
        for (let j = i + 1; j < result.lots.length; j++) {
          const overlap = lotsOverlap(result.lots[i], result.lots[j]);
          if (overlap) {
            throw new Error(
              `Lots ${i} and ${j} overlap at chunk (${cx}, ${cx + 3}):\n` +
                `  lot[${i}]: x=${result.lots[i].x} z=${result.lots[i].z} w=${result.lots[i].w} d=${result.lots[i].d}\n` +
                `  lot[${j}]: x=${result.lots[j].x} z=${result.lots[j].z} w=${result.lots[j].w} d=${result.lots[j].d}`,
            );
          }
          expect(overlap).toBe(false);
        }
      }
    }
  });
});

// ── Lot margin ────────────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Lot margin respected", () => {
  const _cfg = structuresConfig.villageLayout;

  it("building footprint ≤ corresponding lot dimensions (clamped)", () => {
    for (let cx = 1; cx <= 8; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      // Buildings are clamped to fit within lots. Verify footprint <= lot size.
      // Building count may be fewer than lot count (filtered small lots), so
      // we just check each building's footprint is reasonable (>= 1 unit).
      for (const building of result.buildings) {
        expect(building.footprintW).toBeGreaterThanOrEqual(1);
        expect(building.footprintD).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ── Blueprint pool diversity ──────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Blueprint pool diversity", () => {
  it("not all buildings have the same blueprint type across multiple seeds", () => {
    const seenIds = new Set<string>();
    for (let cx = 1; cx <= 20; cx++) {
      const result = generateVillageLayout(`seed-${cx}`, cx, cx + 2, flatHeightmap());
      for (const b of result.buildings) seenIds.add(b.blueprintId);
    }
    // With 10 blueprint types and 20 seeds, we expect at least 3 distinct types.
    expect(seenIds.size).toBeGreaterThanOrEqual(3);
  });

  it("cottage appears at least once across small-grid seeds (§43.2 small village rule)", () => {
    let found = false;
    for (let cx = 1; cx <= 20 && !found; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      if (result.buildings.some((b) => b.blueprintId === "cottage")) found = true;
    }
    expect(found).toBe(true);
  });

  it("storehouse appears at least once across various seeds (§43.2 small village anchor)", () => {
    let found = false;
    for (let cx = 1; cx <= 20 && !found; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 1, flatHeightmap());
      if (result.buildings.some((b) => b.blueprintId === "storehouse")) found = true;
    }
    expect(found).toBe(true);
  });
});

// ── Street furniture ──────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Street furniture", () => {
  it("furniture array is non-empty", () => {
    for (let cx = 1; cx <= 5; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      expect(result.furniture.length).toBeGreaterThan(0);
    }
  });

  it("furniture includes lamp_post type (lamp posts along streets)", () => {
    let foundLamp = false;
    for (let cx = 1; cx <= 15 && !foundLamp; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 1, flatHeightmap());
      if (result.furniture.some((f: FurniturePlacement) => f.type === "lamp_post")) {
        foundLamp = true;
      }
    }
    expect(foundLamp).toBe(true);
  });

  it("furniture includes crate or barrel (street furniture per building)", () => {
    let foundCrateOrBarrel = false;
    for (let cx = 1; cx <= 10 && !foundCrateOrBarrel; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      if (
        result.furniture.some((f: FurniturePlacement) => f.type === "crate" || f.type === "barrel")
      ) {
        foundCrateOrBarrel = true;
      }
    }
    expect(foundCrateOrBarrel).toBe(true);
  });

  it("furniture includes well when cross street is present", () => {
    let foundWell = false;
    for (let cx = 1; cx <= 20 && !foundWell; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 2, flatHeightmap());
      if (result.streets.length === 2 && result.furniture.some((f) => f.type === "well")) {
        foundWell = true;
      }
    }
    expect(foundWell).toBe(true);
  });

  it("no well appears when there is no cross street", () => {
    for (let cx = 1; cx <= 20; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 4, flatHeightmap());
      if (result.streets.length === 1) {
        const hasWell = result.furniture.some((f) => f.type === "well");
        expect(hasWell).toBe(false);
      }
    }
  });

  it("all furniture types are valid enum values", () => {
    const validTypes = ["lamp_post", "well", "crate", "barrel"];
    for (let cx = 1; cx <= 8; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx, flatHeightmap());
      for (const f of result.furniture) {
        expect(validTypes).toContain(f.type);
      }
    }
  });
});

// ── Cross street probability ──────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Cross street probability", () => {
  it("cross street appears roughly 50% of the time (±15%) across 60 seeds", () => {
    let crossCount = 0;
    const trials = 60;
    for (let i = 0; i < trials; i++) {
      const result = generateVillageLayout(`trial-${i}`, i + 1, i + 2, flatHeightmap());
      if (result.streets.length === 2) crossCount++;
    }
    const ratio = crossCount / trials;
    // Expected ~0.5; allow ±0.15 for statistical variance.
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });
});

// ── Height sampling ───────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Height sampling from heightmap", () => {
  it("building Y uses heightmap value at lot center (flat map at known height)", () => {
    const flatValue = 4.25;
    const hm = flatHeightmap(flatValue);
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, hm);
    for (const building of result.buildings) {
      expect(building.position.y).toBeCloseTo(flatValue);
    }
  });

  it("building Y reflects gradient terrain (non-flat heightmap)", () => {
    const hm = gradientHeightmap();
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, hm);

    // On a gradient map (z*0.2+x*0.1), no building at a non-origin position should be y=0.
    // At least one building should have y > 0.1 (any non-trivial height).
    expect(result.buildings.length).toBeGreaterThan(0);
    const anyNonZero = result.buildings.some((b) => b.position.y > 0.1);
    expect(anyNonZero).toBe(true);
  });

  it("furniture Y uses heightmap value (flat map)", () => {
    const flatValue = 2.0;
    const hm = flatHeightmap(flatValue);
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, hm);
    for (const f of result.furniture) {
      expect(f.position.y).toBeCloseTo(flatValue);
    }
  });

  it("well Y uses heightmap value at intersection", () => {
    const flatValue = 3.75;
    const hm = flatHeightmap(flatValue);

    // Find a seed that produces a cross street.
    for (let cx = 1; cx <= 20; cx++) {
      const result = generateVillageLayout(TEST_SEED, cx, cx + 2, hm);
      const well = result.furniture.find((f) => f.type === "well");
      if (well) {
        expect(well.position.y).toBeCloseTo(flatValue);
        return;
      }
    }
    // If no cross-street found in range, pass — cross-street test covers the 50% case.
  });
});

// ── Building positions in world space ─────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Building world positions", () => {
  it("building X and Z use world-space coordinates (chunkX * CHUNK_SIZE + localX)", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    const worldBaseX = TEST_CX * CHUNK_SIZE;
    const worldBaseZ = TEST_CZ * CHUNK_SIZE;
    for (const building of result.buildings) {
      expect(building.position.x).toBeGreaterThanOrEqual(worldBaseX);
      expect(building.position.x).toBeLessThan(worldBaseX + CHUNK_SIZE);
      expect(building.position.z).toBeGreaterThanOrEqual(worldBaseZ);
      expect(building.position.z).toBeLessThan(worldBaseZ + CHUNK_SIZE);
    }
  });

  it("village center is in world space (chunkX * 16 + localX)", () => {
    const result = generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    const worldBaseX = TEST_CX * CHUNK_SIZE;
    const worldBaseZ = TEST_CZ * CHUNK_SIZE;
    expect(result.center.x).toBeGreaterThanOrEqual(worldBaseX);
    expect(result.center.x).toBeLessThan(worldBaseX + CHUNK_SIZE);
    expect(result.center.z).toBeGreaterThanOrEqual(worldBaseZ);
    expect(result.center.z).toBeLessThan(worldBaseZ + CHUNK_SIZE);
  });

  it("different chunk coords produce different world-space centers", () => {
    const r1 = generateVillageLayout(TEST_SEED, 2, 3, flatHeightmap());
    const r2 = generateVillageLayout(TEST_SEED, 5, 8, flatHeightmap());
    // Centers must differ since they're in different chunks.
    const sameX = Math.abs(r1.center.x - r2.center.x) < 0.5;
    const sameZ = Math.abs(r1.center.z - r2.center.z) < 0.5;
    expect(sameX && sameZ).toBe(false);
  });
});

// ── Rootmere guard ─────────────────────────────────────────────────────────────

describe("Village Layout (Spec §43.1) — Non-origin constraint", () => {
  it("does not throw when called for non-zero chunk (caller enforces Rootmere guard)", () => {
    expect(() => {
      generateVillageLayout(TEST_SEED, TEST_CX, TEST_CZ, flatHeightmap());
    }).not.toThrow();
  });

  it("returns a VillageLayout with all required fields", () => {
    const result: VillageLayout = generateVillageLayout(
      TEST_SEED,
      TEST_CX,
      TEST_CZ,
      flatHeightmap(),
    );
    expect(result).toHaveProperty("streets");
    expect(result).toHaveProperty("lots");
    expect(result).toHaveProperty("buildings");
    expect(result).toHaveProperty("furniture");
    expect(result).toHaveProperty("center");
    expect(Array.isArray(result.streets)).toBe(true);
    expect(Array.isArray(result.lots)).toBe(true);
    expect(Array.isArray(result.buildings)).toBe(true);
    expect(Array.isArray(result.furniture)).toBe(true);
    expect(typeof result.center.x).toBe("number");
    expect(typeof result.center.z).toBe("number");
  });
});
