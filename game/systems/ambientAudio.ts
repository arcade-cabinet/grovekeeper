/**
 * ambientAudio -- 6-layer ambient soundscape system (Spec §27.2).
 *
 * Pure functions (exported for tests):
 *   - computeZoneGain    — distance-based crossfade gain for a zone
 *   - layersForBiome     — per-biome layer weights from config
 *   - applyTimeGate      — zero out layers gated by time-of-day
 *   - computeAmbientMix  — full pipeline: zones + playerPos + time → per-layer volumes
 *
 * Runtime management (Tone.js-dependent):
 *   - AmbientAudioState   — holds 6 layer nodes + per-zone Panner3D refs
 *   - initAmbientLayers   — creates 6 synthesis nodes via the audio engine
 *   - tickAmbientAudio    — updates layer volumes each frame
 *   - disposeAmbientLayers — tears down all nodes
 *
 * 6 synthesis layers (Spec §27.2 table):
 *   wind        — Brown noise, LPF 380Hz  — Always
 *   birds       — FM synth                — Dawn/day
 *   insects     — White noise, BPF 5200Hz — Day
 *   crickets    — Pulse osc 2400Hz        — Dusk/night
 *   water       — Brown noise, LPF 240Hz  — Near water
 *   vegetation  — Pink noise, BPF 620Hz   — Near plants
 */

import ambientConfig from "@/config/game/ambientAudio.json" with { type: "json" };
import type { TimeOfDay } from "@/game/ecs/components/procedural/atmosphere";
import type { AmbientSoundscape } from "@/game/ecs/components/procedural/audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The 6 ambient synthesis layer identifiers (Spec §27.2). */
export type LayerName = "wind" | "birds" | "insects" | "crickets" | "water" | "vegetation";

/** Per-layer volume record — values in [0, 1]. */
export type LayerVolumes = Record<LayerName, number>;

/** Minimal zone description for pure computation (no ECS dependency). */
export interface ZoneInput {
  pos: { x: number; z: number };
  soundscape: AmbientSoundscape;
  radius: number;
  volume: number;
}

/** Minimal interface for a controllable audio layer node. */
export interface AmbientLayerNode {
  setVolume(v: number): void;
  dispose(): void;
}

/** Runtime state — 6 layer nodes + optional Panner3D refs per zone entity. */
export interface AmbientAudioState {
  layerNodes: Record<LayerName, AmbientLayerNode>;
  /** Entity IDs that have an active Panner3D slot acquired from the engine pool. */
  zoneEntityIds: Set<string>;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

const ALL_LAYERS: LayerName[] = ["wind", "birds", "insects", "crickets", "water", "vegetation"];

const ZERO_LAYERS: LayerVolumes = {
  wind: 0,
  birds: 0,
  insects: 0,
  crickets: 0,
  water: 0,
  vegetation: 0,
};

/**
 * Compute the linear distance-based gain for a zone.
 * Returns volume at center, linearly fading to 0 at the edge. Zero outside.
 */
export function computeZoneGain(dist: number, radius: number, volume: number): number {
  if (radius <= 0 || dist >= radius) return 0;
  return volume * (1 - dist / radius);
}

/**
 * Return per-layer base volumes for a biome soundscape, as configured.
 * All values are in [0, 1].
 */
export function layersForBiome(soundscape: AmbientSoundscape): LayerVolumes {
  const row = (ambientConfig.layerVolumes as Record<AmbientSoundscape, LayerVolumes>)[soundscape];
  return { ...row };
}

/**
 * Apply time-of-day gating: zero out any layer whose active time windows
 * do not include the current time-of-day. Returns a new object (no mutation).
 */
export function applyTimeGate(layers: LayerVolumes, timeOfDay: TimeOfDay): LayerVolumes {
  const result = { ...layers };
  const gates = ambientConfig.timeGates as Record<LayerName, string[]>;
  for (const layer of ALL_LAYERS) {
    const allowed = gates[layer];
    if (allowed && !allowed.includes(timeOfDay)) {
      result[layer] = 0;
    }
  }
  return result;
}

/**
 * Full ambient mix computation (Spec §27.2).
 *
 * For each zone: compute distance gain, scale per-biome layer weights,
 * apply time gate, accumulate into output. Final values clamped to [0, 1].
 */
export function computeAmbientMix(
  zones: ZoneInput[],
  playerPos: { x: number; z: number },
  timeOfDay: TimeOfDay,
): LayerVolumes {
  const acc: LayerVolumes = { ...ZERO_LAYERS };

  for (const zone of zones) {
    const dx = playerPos.x - zone.pos.x;
    const dz = playerPos.z - zone.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const gain = computeZoneGain(dist, zone.radius, zone.volume);
    if (gain <= 0) continue;

    const baseWeights = layersForBiome(zone.soundscape);
    const gated = applyTimeGate(baseWeights, timeOfDay);

    for (const layer of ALL_LAYERS) {
      acc[layer] += gain * gated[layer];
    }
  }

  // Clamp to [0, 1]
  for (const layer of ALL_LAYERS) {
    acc[layer] = Math.min(1, Math.max(0, acc[layer]));
  }

  return acc;
}

// ---------------------------------------------------------------------------
// Runtime management (Tone.js-dependent)
// ---------------------------------------------------------------------------

/**
 * Initialize 6 ambient layer nodes using injected factory.
 * The factory should return a node that obeys AmbientLayerNode interface.
 * In production, pass `() => createToneLayerNode(layer)`.
 * In tests, pass `() => ({ setVolume: jest.fn(), dispose: jest.fn() })`.
 */
export function initAmbientLayers(
  nodeFactory: (layer: LayerName) => AmbientLayerNode,
): AmbientAudioState {
  const layerNodes = {} as Record<LayerName, AmbientLayerNode>;
  for (const layer of ALL_LAYERS) {
    layerNodes[layer] = nodeFactory(layer);
  }
  return { layerNodes, zoneEntityIds: new Set() };
}

/**
 * Apply a pre-computed ambient mix to the 6 layer nodes.
 * Call each frame after computeAmbientMix.
 */
export function tickAmbientAudio(state: AmbientAudioState, mix: LayerVolumes): void {
  for (const layer of ALL_LAYERS) {
    state.layerNodes[layer].setVolume(mix[layer]);
  }
}

/**
 * Dispose all 6 layer nodes and clear zone entity tracking.
 */
export function disposeAmbientLayers(state: AmbientAudioState): void {
  for (const layer of ALL_LAYERS) {
    state.layerNodes[layer].dispose();
  }
  state.zoneEntityIds.clear();
}
