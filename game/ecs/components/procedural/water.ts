/**
 * Procedural water ECS components.
 *
 * Gerstner wave surfaces with foam, caustics, and flow for
 * oceans, rivers, ponds, streams, and waterfalls.
 */

export type WaterBodyType = "ocean" | "river" | "pond" | "stream" | "waterfall";

/** Gerstner wave layer parameters. */
export interface GerstnerWaveLayer {
  amplitude: number;
  wavelength: number;
  speed: number;
  steepness: number;
  direction: [number, number];
}

/** Procedural water body — Gerstner wave surface with foam + caustics. */
export interface WaterBodyComponent {
  waterType: WaterBodyType;
  /** Gerstner wave layers (4-8 for ocean, 1-2 for ponds). */
  waveLayers: GerstnerWaveLayer[];
  /** Base water color (tinted by biome). */
  color: string;
  /** Opacity 0-1 (ponds more transparent, ocean less). */
  opacity: number;
  /** Width/depth of the water body in world units. */
  size: { width: number; depth: number };
  /** Whether this body generates foam at edges/steep waves. */
  foamEnabled: boolean;
  /** Foam threshold (steepness value where foam appears). */
  foamThreshold: number;
  /** Whether to project caustic patterns below surface. */
  causticsEnabled: boolean;
  /** Flow direction for rivers/streams (normalized). */
  flowDirection: [number, number];
  /** Flow speed multiplier. */
  flowSpeed: number;
}
