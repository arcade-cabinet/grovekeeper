/**
 * Procedural ambient audio ECS components.
 *
 * Spatial audio zones using Tone.js Panner3D HRTF sources.
 * Zones crossfade based on player distance.
 */

export type AmbientSoundscape =
  | "forest"
  | "meadow"
  | "water"
  | "cave"
  | "village"
  | "night"
  | "storm"
  | "wind";

/** Spatial ambient audio zone — Tone.js Panner3D HRTF source. */
export interface AmbientZoneComponent {
  /** Primary soundscape type. */
  soundscape: AmbientSoundscape;
  /** Blend radius — full volume at center, fades to edge. */
  radius: number;
  /** Volume 0-1 at zone center. */
  volume: number;
  /** Secondary soundscape for layering (e.g., forest + water near river). */
  secondarySoundscape?: AmbientSoundscape;
  /** Secondary volume 0-1. */
  secondaryVolume?: number;
}
