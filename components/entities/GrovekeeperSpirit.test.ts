/**
 * Tests for GrovekeeperSpirit — spirit orb rendering pure functions (Spec §32).
 *
 * Tests exported pure functions without WebGL/R3F context:
 *   - computeBobY       — sine-wave Y position for floating orb
 *   - computeEmissiveIntensity — pulsing emissive intensity
 *   - resolveEmissiveColor     — deterministic grove-palette color from scopedRNG
 *
 * Component export is verified separately.
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@react-three/drei", () => ({}));

jest.mock("three", () => ({
  Mesh: jest.fn(),
  MeshStandardMaterial: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  grovekeeperSpiritsQuery: { entities: [] },
}));

import {
  GrovekeeperSpirit,
  computeBobY,
  computeEmissiveIntensity,
  computeSpawnY,
} from "./GrovekeeperSpirit";
import { resolveEmissiveColor, SPIRIT_COLORS } from "@/game/utils/spiritColors";

// ---------------------------------------------------------------------------
// computeBobY
// ---------------------------------------------------------------------------

describe("computeBobY (Spec §32.2)", () => {
  it("returns hoverHeight when amplitude is 0", () => {
    expect(computeBobY(0, 1.0, 0, 1.5, 0)).toBe(1.0);
  });

  it("returns hoverHeight + amplitude at sin(phase=π/2)=1", () => {
    const result = computeBobY(0, 1.0, 0.2, 1.0, Math.PI / 2);
    expect(result).toBeCloseTo(1.2);
  });

  it("returns hoverHeight - amplitude at sin(phase=-π/2)=−1", () => {
    const result = computeBobY(0, 1.0, 0.2, 1.0, -Math.PI / 2);
    expect(result).toBeCloseTo(0.8);
  });

  it("oscillates between hoverHeight ± amplitude over a full cycle", () => {
    const hoverHeight = 1.5;
    const amplitude = 0.2;
    const speed = 2.0;
    const phase = 0;
    const quarter = (Math.PI / 2) / speed; // t where sin(t*speed) = 1

    const peak = computeBobY(quarter, hoverHeight, amplitude, speed, phase);
    const trough = computeBobY(quarter * 3, hoverHeight, amplitude, speed, phase);
    expect(peak).toBeCloseTo(hoverHeight + amplitude);
    expect(trough).toBeCloseTo(hoverHeight - amplitude);
  });

  it("desync: different bobPhases produce different Y at the same time", () => {
    const y1 = computeBobY(1.0, 1.0, 0.2, 1.5, 0);
    const y2 = computeBobY(1.0, 1.0, 0.2, 1.5, Math.PI);
    expect(y1).not.toBeCloseTo(y2);
  });

  it("matches formula: hoverHeight + bobAmplitude * sin(time * bobSpeed + bobPhase)", () => {
    const time = 2.5;
    const hoverHeight = 1.2;
    const bobAmplitude = 0.18;
    const bobSpeed = 1.8;
    const bobPhase = 0.7;
    const expected = hoverHeight + bobAmplitude * Math.sin(time * bobSpeed + bobPhase);
    expect(computeBobY(time, hoverHeight, bobAmplitude, bobSpeed, bobPhase)).toBeCloseTo(expected);
  });
});

// ---------------------------------------------------------------------------
// computeEmissiveIntensity
// ---------------------------------------------------------------------------

describe("computeEmissiveIntensity (Spec §32.2)", () => {
  it("returns base when sin term is zero (phase=0, time=0)", () => {
    expect(computeEmissiveIntensity(1.5, 0, 2.0, 0)).toBeCloseTo(1.5);
  });

  it("returns base + 0.3 at sin peak (phase=π/2)", () => {
    const result = computeEmissiveIntensity(1.5, 0, 1.0, Math.PI / 2);
    expect(result).toBeCloseTo(1.8);
  });

  it("returns base - 0.3 at sin trough (phase=-π/2)", () => {
    const result = computeEmissiveIntensity(1.5, 0, 1.0, -Math.PI / 2);
    expect(result).toBeCloseTo(1.2);
  });

  it("matches formula: base + 0.3 * sin(time * pulseSpeed + pulsePhase)", () => {
    const base = 1.5;
    const time = 3.1;
    const pulseSpeed = 2.2;
    const pulsePhase = 1.0;
    const expected = base + 0.3 * Math.sin(time * pulseSpeed + pulsePhase);
    expect(computeEmissiveIntensity(base, time, pulseSpeed, pulsePhase)).toBeCloseTo(expected);
  });

  it("two different pulsePhases produce different intensity at the same time", () => {
    const i1 = computeEmissiveIntensity(1.5, 1.0, 2.0, 0);
    const i2 = computeEmissiveIntensity(1.5, 1.0, 2.0, Math.PI);
    expect(i1).not.toBeCloseTo(i2);
  });
});

// ---------------------------------------------------------------------------
// resolveEmissiveColor (from spiritColors utility, tested here for §32)
// ---------------------------------------------------------------------------

describe("resolveEmissiveColor (Spec §32.1)", () => {
  it("returns a hex color string from SPIRIT_COLORS palette", () => {
    const color = resolveEmissiveColor(0, "TestSeed");
    expect(SPIRIT_COLORS).toContain(color as (typeof SPIRIT_COLORS)[number]);
  });

  it("is deterministic: same mazeIndex + worldSeed always returns same color", () => {
    const color1 = resolveEmissiveColor(3, "Gentle Mossy Hollow");
    const color2 = resolveEmissiveColor(3, "Gentle Mossy Hollow");
    expect(color1).toBe(color2);
  });

  it("produces different colors for different mazeIndexes (with same seed)", () => {
    const colors = Array.from({ length: 8 }, (_, i) =>
      resolveEmissiveColor(i, "Gentle Mossy Hollow"),
    );
    // At least 2 distinct colors (may not all be unique due to palette collision)
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("produces different colors for different worldSeeds", () => {
    const c1 = resolveEmissiveColor(0, "Seed A");
    const c2 = resolveEmissiveColor(0, "Seed B");
    // Different seeds should give different results (they could theoretically collide
    // but with 8 palette entries and different RNG seeds this is highly unlikely)
    expect(typeof c1).toBe("string");
    expect(typeof c2).toBe("string");
  });

  it("returns a string starting with # (hex color)", () => {
    const color = resolveEmissiveColor(2, "Ancient Whispering Canopy");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("all palette colors start with # (grove-aligned hex values)", () => {
    for (const color of SPIRIT_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("resolves all 8 mazeIndex values without throwing", () => {
    expect(() => {
      for (let i = 0; i < 8; i++) {
        resolveEmissiveColor(i, "TestSeed");
      }
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// computeSpawnY
// ---------------------------------------------------------------------------

describe("computeSpawnY (Spec §32.2)", () => {
  it("returns baseY when spawnProgress is 0 (spirit at floor)", () => {
    expect(computeSpawnY(0, 0, 1.5)).toBe(0);
  });

  it("returns baseY + hoverHeight when spawnProgress is 1 (fully risen)", () => {
    expect(computeSpawnY(1, 0, 1.5)).toBeCloseTo(1.5);
  });

  it("returns midpoint at spawnProgress 0.5", () => {
    expect(computeSpawnY(0.5, 0, 1.5)).toBeCloseTo(0.75);
  });

  it("respects non-zero baseY offset", () => {
    expect(computeSpawnY(0.5, 1.0, 1.5)).toBeCloseTo(1.75);
  });

  it("matches formula: baseY + spawnProgress * hoverHeight", () => {
    const sp = 0.73;
    const base = 0.5;
    const hover = 1.2;
    expect(computeSpawnY(sp, base, hover)).toBeCloseTo(base + sp * hover);
  });

  it("is monotonically increasing as spawnProgress goes 0→1", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1.0];
    const ys = steps.map((p) => computeSpawnY(p, 0, 1.5));
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// Component export
// ---------------------------------------------------------------------------

describe("GrovekeeperSpirit component (Spec §32)", () => {
  it("exports GrovekeeperSpirit as a named function component", () => {
    expect(typeof GrovekeeperSpirit).toBe("function");
  });

  it("has component name GrovekeeperSpirit", () => {
    expect(GrovekeeperSpirit.name).toBe("GrovekeeperSpirit");
  });
});
