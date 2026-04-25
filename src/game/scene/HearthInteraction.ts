/**
 * HearthInteraction — Sub-wave A.
 *
 * Pure logic for "is the player in range of a hearth, and what should
 * the prompt say?". Decoupled from any runtime/Actor wiring so it can
 * be unit-tested without `@jolly-pixel/engine`. The runtime's per-frame
 * adapter calls `tick()` with the live state and routes the result to
 * `eventBus.emitHearthPrompt(...)`.
 *
 * The host owns:
 *   - looking up placed structures in the active grove
 *     (`structuresRepo.listStructuresInGrove`),
 *   - reading `groves.hearthLitAt` to decide variant
 *     (light vs fast-travel),
 *   - projecting the chosen hearth's world position to screen px.
 *
 * This module just decides which hearth (if any) is closest within
 * range and what variant the prompt should be.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Hearth and claim ritual" — interactive prompt to light, single
 *   interaction; once lit, the same hearth becomes a fast-travel node.
 */

/** Default proximity radius (XZ, voxels) for surfacing the prompt. */
export const HEARTH_PROXIMITY_RADIUS = 2;

/** A placed hearth + its grove. */
export interface HearthCandidate {
  structureId: string;
  groveId: string;
  /** World-space position of the hearth's anchor voxel. */
  position: { x: number; y: number; z: number };
  /** Whether the hearth's grove already has `hearthLitAt` set. */
  lit: boolean;
}

export interface HearthPromptPick {
  candidate: HearthCandidate;
  variant: "light" | "fast-travel";
}

/**
 * Pick the nearest in-range hearth for the player's XZ position. Pure;
 * returns `null` when no hearth is within `radius` voxels.
 *
 * If multiple hearths are equidistant, the first in list order wins —
 * the caller's listing order is the tiebreaker.
 */
export function pickHearthPrompt(
  player: { x: number; z: number },
  hearths: readonly HearthCandidate[],
  radius: number = HEARTH_PROXIMITY_RADIUS,
): HearthPromptPick | null {
  const r2 = radius * radius;
  let best: HearthCandidate | null = null;
  let bestDsq = Number.POSITIVE_INFINITY;
  for (const h of hearths) {
    const dx = h.position.x - player.x;
    const dz = h.position.z - player.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > r2) continue;
    if (d2 < bestDsq) {
      bestDsq = d2;
      best = h;
    }
  }
  if (!best) return null;
  return {
    candidate: best,
    variant: best.lit ? "fast-travel" : "light",
  };
}
