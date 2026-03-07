/**
 * audioZonePlacer -- Derives ambient audio zones from water body placements.
 *
 * Spec §27: Spatial audio zones using Tone.js Panner3D HRTF sources.
 * Each water body automatically generates a co-located 'water' soundscape zone.
 * Zone radius scales with body size: radius = max(width, depth) * waterRadiusScale.
 *
 * Pure function — given the same water placements, always produces identical zones.
 */

import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };
import type { SoundscapeComponent } from "@/game/ecs/components/procedural/audio";
import type { WaterBodyPlacement } from "./waterPlacer.ts";

const cfg = proceduralConfig.ambientZones;
const WATER_VOLUME: number = cfg.soundscapeVolumes.water;
const WATER_RADIUS_SCALE: number = cfg.waterRadiusScale;

// ── Types ──────────────────────────────────────────────────────────────────────

/** An ambient audio zone ready to be added to ECS. */
export interface AudioZonePlacement {
  /** World-space center position — co-located with the water body. */
  position: { x: number; y: number; z: number };
  /** SoundscapeComponent data for the ambient zone entity. */
  ambientZone: SoundscapeComponent;
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Derive ambient audio zones from water body placements.
 *
 * Creates one audio zone per water body. Each zone:
 *   - soundscape: "water"
 *   - position: same as the water body center
 *   - radius: max(size.width, size.depth) * waterRadiusScale
 *   - volume: soundscapeVolumes.water from procedural config
 *
 * @param waterPlacements  Water bodies returned by placeWaterBodies().
 * @returns                One AudioZonePlacement per water body.
 */
export function placeAudioZones(waterPlacements: WaterBodyPlacement[]): AudioZonePlacement[] {
  return waterPlacements.map((wp) => {
    const { size } = wp.waterBody;
    const radius = Math.max(size.width, size.depth) * WATER_RADIUS_SCALE;
    return {
      position: { ...wp.position },
      ambientZone: {
        soundscape: "water",
        radius,
        volume: WATER_VOLUME,
      },
    };
  });
}
