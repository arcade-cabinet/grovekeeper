/**
 * Procedural particle ECS components.
 *
 * Instanced billboard quad emitters for rain, snow, leaves,
 * fireflies, sparks, smoke, dust, splash, and bubbles.
 */

export type ParticleType =
  | "rain"
  | "snow"
  | "leaves"
  | "pollen"
  | "fireflies"
  | "sparks"
  | "smoke"
  | "dust"
  | "splash"
  | "bubbles";

/** Procedural particle emitter — instanced billboard quads. */
export interface ParticleEmitterComponent {
  /** Particle visual type. */
  particleType: ParticleType;
  /** Emission rate (particles per second). */
  emissionRate: number;
  /** Particle lifetime in seconds. */
  lifetime: number;
  /** Emission radius from entity position. */
  emissionRadius: number;
  /** Base particle size. */
  size: number;
  /** Particle color. */
  color: string;
  /** Gravity multiplier (-1 for rising, 1 for falling). */
  gravity: number;
  /** Whether particles are affected by wind. */
  windAffected: boolean;
  /** Max particles alive at once (performance budget). */
  maxParticles: number;
  /** Whether emitter is currently active. */
  active: boolean;
}
