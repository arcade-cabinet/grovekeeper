/**
 * ambientAudio tests (Spec §27.2)
 *
 * Pure functions tested without Tone.js — no mocking needed for math layer.
 * Runtime layer management tests use Tone.js mock (same pattern as audioEngine.test.ts).
 */

import type { TimeOfDay } from "@/game/ecs/components/procedural/atmosphere";
import type { AmbientSoundscape } from "@/game/ecs/components/procedural/audio";
import {
  applyTimeGate,
  computeAmbientMix,
  computeZoneGain,
  type LayerName,
  layersForBiome,
  type ZoneInput,
} from "./ambientAudio.ts";

// ---------------------------------------------------------------------------
// computeZoneGain (Spec §27.2 — distance-based crossfade)
// ---------------------------------------------------------------------------

describe("computeZoneGain (Spec §27.2)", () => {
  it("returns full volume at zone center (dist=0)", () => {
    expect(computeZoneGain(0, 10, 0.8)).toBeCloseTo(0.8);
  });

  it("returns 0 at zone edge (dist=radius)", () => {
    expect(computeZoneGain(10, 10, 0.8)).toBeCloseTo(0);
  });

  it("returns 0 beyond radius", () => {
    expect(computeZoneGain(15, 10, 0.8)).toBe(0);
  });

  it("interpolates linearly at midpoint (dist=radius/2 → volume/2)", () => {
    expect(computeZoneGain(5, 10, 1.0)).toBeCloseTo(0.5);
  });

  it("volume=0 always returns 0", () => {
    expect(computeZoneGain(0, 10, 0)).toBe(0);
  });

  it("radius=0 returns 0 even at center (degenerate zone)", () => {
    expect(computeZoneGain(0, 0, 1.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// layersForBiome (Spec §27.2 — biome → layer weight lookup)
// ---------------------------------------------------------------------------

describe("layersForBiome (Spec §27.2)", () => {
  it("forest soundscape activates vegetation layer", () => {
    const layers = layersForBiome("forest");
    expect(layers.vegetation).toBeGreaterThan(0);
  });

  it("water soundscape activates water layer", () => {
    const layers = layersForBiome("water");
    expect(layers.water).toBeGreaterThan(0);
  });

  it("night soundscape activates crickets layer", () => {
    const layers = layersForBiome("night");
    expect(layers.crickets).toBeGreaterThan(0);
  });

  it("meadow soundscape activates insects layer", () => {
    const layers = layersForBiome("meadow");
    expect(layers.insects).toBeGreaterThan(0);
  });

  it("all biomes activate wind layer (wind is universal)", () => {
    const biomes: AmbientSoundscape[] = [
      "forest",
      "meadow",
      "water",
      "cave",
      "village",
      "night",
      "storm",
      "wind",
    ];
    for (const b of biomes) {
      expect(layersForBiome(b).wind).toBeGreaterThan(0);
    }
  });

  it("storm soundscape activates water layer", () => {
    const layers = layersForBiome("storm");
    expect(layers.water).toBeGreaterThan(0);
  });

  it("returns Record with all 6 layer keys", () => {
    const layers = layersForBiome("forest");
    const keys: LayerName[] = ["wind", "birds", "insects", "crickets", "water", "vegetation"];
    for (const key of keys) {
      expect(typeof layers[key]).toBe("number");
    }
  });
});

// ---------------------------------------------------------------------------
// applyTimeGate (Spec §27.2 — time-of-day layer gating)
// ---------------------------------------------------------------------------

describe("applyTimeGate (Spec §27.2)", () => {
  const fullLayers = (): Record<LayerName, number> => ({
    wind: 0.5,
    birds: 0.6,
    insects: 0.4,
    crickets: 0.8,
    water: 0.3,
    vegetation: 0.7,
  });

  it("night time gates out birds layer", () => {
    const result = applyTimeGate(fullLayers(), "night");
    expect(result.birds).toBe(0);
  });

  it("night time gates out insects layer", () => {
    const result = applyTimeGate(fullLayers(), "night");
    expect(result.insects).toBe(0);
  });

  it("day (noon) time gates out crickets layer", () => {
    const result = applyTimeGate(fullLayers(), "noon");
    expect(result.crickets).toBe(0);
  });

  it("dawn keeps birds active", () => {
    const result = applyTimeGate(fullLayers(), "dawn");
    expect(result.birds).toBeGreaterThan(0);
  });

  it("afternoon keeps birds and insects active", () => {
    const result = applyTimeGate(fullLayers(), "afternoon");
    expect(result.birds).toBeGreaterThan(0);
    expect(result.insects).toBeGreaterThan(0);
  });

  it("evening activates crickets (not day)", () => {
    const result = applyTimeGate(fullLayers(), "evening");
    expect(result.crickets).toBeGreaterThan(0);
  });

  it("wind layer is never gated", () => {
    const times: TimeOfDay[] = [
      "dawn",
      "morning",
      "noon",
      "afternoon",
      "dusk",
      "evening",
      "night",
      "midnight",
    ];
    for (const t of times) {
      expect(applyTimeGate(fullLayers(), t).wind).toBeGreaterThan(0);
    }
  });

  it("water layer is never gated by time", () => {
    const times: TimeOfDay[] = [
      "dawn",
      "morning",
      "noon",
      "afternoon",
      "dusk",
      "evening",
      "night",
      "midnight",
    ];
    for (const t of times) {
      expect(applyTimeGate(fullLayers(), t).water).toBeGreaterThan(0);
    }
  });

  it("does not mutate input", () => {
    const input = fullLayers();
    applyTimeGate(input, "night");
    expect(input.birds).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeAmbientMix (Spec §27.2 — full pipeline: zones + position + time)
// ---------------------------------------------------------------------------

describe("computeAmbientMix (Spec §27.2)", () => {
  it("all layers are 0 when no zones", () => {
    const mix = computeAmbientMix([], { x: 0, z: 0 }, "noon");
    const keys: LayerName[] = ["wind", "birds", "insects", "crickets", "water", "vegetation"];
    for (const k of keys) {
      expect(mix[k]).toBe(0);
    }
  });

  it("player at center of forest zone → vegetation layer active", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "forest", radius: 10, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 0, z: 0 }, "noon");
    expect(mix.vegetation).toBeGreaterThan(0);
  });

  it("player at center of water zone → water layer at full config volume", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "water", radius: 10, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 0, z: 0 }, "noon");
    // water biome has water=1.0 in config, player at center (gain=1.0)
    expect(mix.water).toBeCloseTo(1.0);
  });

  it("player outside all zones → all layers at 0", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "forest", radius: 5, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 100, z: 100 }, "noon");
    const keys: LayerName[] = ["wind", "birds", "insects", "crickets", "water", "vegetation"];
    for (const k of keys) {
      expect(mix[k]).toBe(0);
    }
  });

  it("crossfade: closer zone contributes more to its layers", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "forest", radius: 20, volume: 1.0 },
      { pos: { x: 18, z: 0 }, soundscape: "water", radius: 20, volume: 1.0 },
    ];
    // Player closer to forest zone (dist=2) than water zone (dist=16)
    const mix = computeAmbientMix(zones, { x: 2, z: 0 }, "noon");
    expect(mix.vegetation).toBeGreaterThan(mix.water);
  });

  it("time gate applied — crickets = 0 at noon", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "night", radius: 10, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 0, z: 0 }, "noon");
    expect(mix.crickets).toBe(0);
  });

  it("time gate not applied at night — crickets active in night biome", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "night", radius: 10, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 0, z: 0 }, "night");
    expect(mix.crickets).toBeGreaterThan(0);
  });

  it("layer volumes are clamped to [0, 1] when zones overlap and add up", () => {
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "forest", radius: 10, volume: 1.0 },
      { pos: { x: 1, z: 0 }, soundscape: "forest", radius: 10, volume: 1.0 },
      { pos: { x: 2, z: 0 }, soundscape: "forest", radius: 10, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 0, z: 0 }, "noon");
    const keys: LayerName[] = ["wind", "birds", "insects", "crickets", "water", "vegetation"];
    for (const k of keys) {
      expect(mix[k]).toBeLessThanOrEqual(1.0);
      expect(mix[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it("distance computed in XZ plane (Y ignored)", () => {
    // Player at x=3, z=4 → XZ dist to origin = 5
    const zones: ZoneInput[] = [
      { pos: { x: 0, z: 0 }, soundscape: "forest", radius: 6, volume: 1.0 },
    ];
    const mix = computeAmbientMix(zones, { x: 3, z: 4 }, "noon");
    // dist=5 < radius=6 → inside zone, vegetation should be active
    expect(mix.vegetation).toBeGreaterThan(0);
  });
});
