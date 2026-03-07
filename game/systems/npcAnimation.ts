/**
 * NPC walk-cycle animation system — Lego-style rigid body part rotation.
 *
 * Computes sine-wave arm/leg rotation angles from NpcComponent animation state.
 * No Three.js or anime.js runtime dependency — returns plain rotation values
 * that R3F components apply to mesh refs each frame.
 *
 * Spec: GAME_SPEC.md §15 — NPC Animation
 */

import type { NpcComponent } from "@/game/ecs/components/npc";
import npcAnimConfig from "@/config/game/npcAnimation.json" with { type: "json" };

const { animations, bodyParts } = npcAnimConfig;

/** Per-frame limb rotation output (radians) for an NPC mesh. */
export interface NpcLimbRotations {
  /** Left arm X-axis rotation (forward/back swing). */
  leftArm: number;
  /** Right arm X-axis rotation (forward/back swing). */
  rightArm: number;
  /** Left leg X-axis rotation (forward/back swing). */
  leftLeg: number;
  /** Right leg X-axis rotation (forward/back swing). */
  rightLeg: number;
  /** Vertical body bounce offset (metres, always >= 0). */
  bounceY: number;
}

const ZERO_ROTATIONS: NpcLimbRotations = {
  leftArm: 0,
  rightArm: 0,
  leftLeg: 0,
  rightLeg: 0,
  bounceY: 0,
};

/**
 * Advance NPC animation progress for this frame.
 *
 * Mutates `npc.animProgress` in place. Only advances during the 'walk'
 * animation state — other states are handled by future US implementations.
 *
 * @param npc - NPC component to update.
 * @param dt - Delta time in seconds.
 */
export function advanceNpcAnimation(npc: NpcComponent, dt: number): void {
  if (npc.currentAnim === "walk") {
    npc.animProgress += dt * npc.animSpeed;
  }
}

/**
 * Compute rigid-body limb rotation angles for the current NPC animation state.
 *
 * Returns zero rotations for any non-walk state. The R3F component applies
 * these values to mesh ref `.rotation.x` (arms/legs) and `.position.y` (bounce).
 *
 * Phase offsets from npcAnimation.json ensure arms/legs swing in opposition:
 *   leftArm phase=0, rightArm phase=π  → counter-swing
 *   leftLeg phase=π, rightLeg phase=0  → counter-swing, opposite to arms
 *
 * @param npc - NPC component with current animation state.
 * @returns Computed limb rotations for this frame.
 */
export function computeNpcLimbRotations(npc: NpcComponent): NpcLimbRotations {
  if (npc.currentAnim !== "walk") {
    return ZERO_ROTATIONS;
  }

  const { armSwing, legSwing, bodyBob } = animations.walk;
  const t = npc.animProgress;

  return {
    leftArm:
      Math.sin(t * armSwing.frequency + bodyParts.leftArm.phaseOffset) *
      armSwing.maxAngle,
    rightArm:
      Math.sin(t * armSwing.frequency + bodyParts.rightArm.phaseOffset) *
      armSwing.maxAngle,
    leftLeg:
      Math.sin(t * legSwing.frequency + bodyParts.leftLeg.phaseOffset) *
      legSwing.maxAngle,
    rightLeg:
      Math.sin(t * legSwing.frequency + bodyParts.rightLeg.phaseOffset) *
      legSwing.maxAngle,
    bounceY: Math.abs(Math.sin(t * bodyBob.frequency)) * bodyBob.amplitude,
  };
}
