/**
 * audioZonePlacer.test.ts -- Tests for placeAudioZones (Spec §27)
 *
 * Audio zones are auto-created near water bodies with soundscape='water'.
 * Radius scales with water body size (max(width, depth) * waterRadiusScale).
 * Volume comes from config/game/procedural.json ambientZones.soundscapeVolumes.water.
 */

import { placeAudioZones } from "./audioZonePlacer.ts";
import type { WaterBodyPlacement } from "./waterPlacer.ts";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const pondPlacement: WaterBodyPlacement = {
  position: { x: 10, y: -0.3, z: 20 },
  waterBody: {
    waterType: "pond",
    waveLayers: [],
    color: "#4a90d9",
    opacity: 0.8,
    size: { width: 6, depth: 6 },
    foamEnabled: false,
    foamThreshold: 0.5,
    causticsEnabled: true,
    flowDirection: [1, 0],
    flowSpeed: 0,
  },
};

const riverPlacement: WaterBodyPlacement = {
  position: { x: 50, y: -0.5, z: 80 },
  waterBody: {
    waterType: "river",
    waveLayers: [],
    color: "#3a7fbf",
    opacity: 0.85,
    size: { width: 4, depth: 16 },
    foamEnabled: true,
    foamThreshold: 0.5,
    causticsEnabled: true,
    flowDirection: [0.7, 0.7],
    flowSpeed: 1.2,
  },
};

const streamPlacement: WaterBodyPlacement = {
  position: { x: 30, y: -0.4, z: 60 },
  waterBody: {
    waterType: "stream",
    waveLayers: [],
    color: "#5a9fd4",
    opacity: 0.75,
    size: { width: 2, depth: 8 },
    foamEnabled: false,
    foamThreshold: 0.5,
    causticsEnabled: true,
    flowDirection: [1, 0],
    flowSpeed: 1.8,
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("placeAudioZones (Spec §27)", () => {
  it("returns empty array for empty water placements", () => {
    expect(placeAudioZones([])).toHaveLength(0);
  });

  it("creates one audio zone per water body", () => {
    expect(placeAudioZones([pondPlacement])).toHaveLength(1);
  });

  it("maps 3 water placements to 3 audio zones (1:1)", () => {
    const zones = placeAudioZones([pondPlacement, riverPlacement, streamPlacement]);
    expect(zones).toHaveLength(3);
  });

  it("zone soundscape is always 'water'", () => {
    const zones = placeAudioZones([pondPlacement, riverPlacement, streamPlacement]);
    for (const zone of zones) {
      expect(zone.ambientZone.soundscape).toBe("water");
    }
  });

  it("zone position matches the water body position exactly", () => {
    const [zone] = placeAudioZones([pondPlacement]);
    expect(zone.position).toEqual(pondPlacement.position);
  });

  it("river zone position matches the river water body position", () => {
    const [zone] = placeAudioZones([riverPlacement]);
    expect(zone.position).toEqual(riverPlacement.position);
  });

  it("pond radius = max(width=6, depth=6) * waterRadiusScale(1.5) = 9", () => {
    const [zone] = placeAudioZones([pondPlacement]);
    expect(zone.ambientZone.radius).toBeCloseTo(9);
  });

  it("river radius uses max dimension (depth=16, not width=4): 16 * 1.5 = 24", () => {
    const [zone] = placeAudioZones([riverPlacement]);
    expect(zone.ambientZone.radius).toBeCloseTo(24);
  });

  it("stream radius uses max dimension (depth=8): 8 * 1.5 = 12", () => {
    const [zone] = placeAudioZones([streamPlacement]);
    expect(zone.ambientZone.radius).toBeCloseTo(12);
  });

  it("zone volume matches config soundscapeVolumes.water (0.7)", () => {
    const [zone] = placeAudioZones([pondPlacement]);
    expect(zone.ambientZone.volume).toBeCloseTo(0.7);
  });

  it("result objects are independent — mutating position of one does not affect another", () => {
    const zones = placeAudioZones([pondPlacement, riverPlacement]);
    zones[0].position.x = 999;
    expect(zones[1].position.x).toBe(riverPlacement.position.x);
  });

  it("result is an array (not a generator or lazy iterable)", () => {
    const result = placeAudioZones([pondPlacement]);
    expect(Array.isArray(result)).toBe(true);
  });
});
