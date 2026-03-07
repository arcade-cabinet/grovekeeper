/**
 * NPC animation system — Lego-style rigid body part rotation.
 *
 * Computes sine-wave rotation angles from NpcComponent animation state.
 * No Three.js or anime.js runtime dependency — returns plain rotation values
 * that R3F components apply to mesh refs each frame.
 *
 * Supported states:
 *   walk  — arm/leg swing + vertical bounce
 *   idle  — breathing torso bob + gentle head sway
 *   talk  — head nod + single-arm gesture + slight torso bob
 *
 * Spec: GAME_SPEC.md §15 — NPC Animation
 */

import type { NpcComponent } from "@/game/ecs/components/npc";
import npcAnimConfig from "@/config/game/npcAnimation.json" with { type: "json" };

const { animations, bodyParts } = npcAnimConfig;

/** Per-frame limb rotation output (radians / metres) for an NPC mesh. */
export interface NpcLimbRotations {
  /** Left arm X-axis rotation (forward/back swing). Walk only. */
  leftArm: number;
  /** Right arm X-axis rotation (forward/back swing). Walk only. */
  rightArm: number;
  /** Left leg X-axis rotation (forward/back swing). Walk only. */
  leftLeg: number;
  /** Right leg X-axis rotation (forward/back swing). Walk only. */
  rightLeg: number;
  /** Vertical body bounce offset (metres, always >= 0). Walk only. */
  bounceY: number;
  /** Torso vertical breathing offset (metres). Idle and talk. */
  torsoY: number;
  /** Head Y-axis sway/nod rotation (radians). Idle and talk. */
  headSway: number;
  /** Single-arm gesture Y-rotation (radians). Talk only. */
  armGesture: number;
}

const ZERO_ROTATIONS: NpcLimbRotations = {
  leftArm: 0,
  rightArm: 0,
  leftLeg: 0,
  rightLeg: 0,
  bounceY: 0,
  torsoY: 0,
  headSway: 0,
  armGesture: 0,
};

/**
 * Advance NPC animation progress for this frame.
 *
 * Mutates `npc.animProgress` in place. Advances during walk, idle, and talk
 * animation states. Sleep and work states remain stationary.
 *
 * @param npc - NPC component to update.
 * @param dt - Delta time in seconds.
 */
export function advanceNpcAnimation(npc: NpcComponent, dt: number): void {
  if (
    npc.currentAnim === "walk" ||
    npc.currentAnim === "idle" ||
    npc.currentAnim === "talk"
  ) {
    npc.animProgress += dt * npc.animSpeed;
  }
}

/**
 * Compute rigid-body limb rotation angles for the current NPC animation state.
 *
 * Walk: arm/leg swing + vertical bounce.
 * Idle: breathing torso bob (torsoY) + gentle head sway (headSway).
 * Talk: head nod (headSway) + arm gesture (armGesture) + slight torso bob (torsoY).
 * Other states: all zeros.
 *
 * The R3F component applies these values:
 *   leftArm/rightArm/leftLeg/rightLeg → mesh.rotation.x
 *   bounceY / torsoY                  → mesh.position.y offset
 *   headSway                          → head mesh.rotation.y
 *   armGesture                        → one arm mesh.rotation.y
 *
 * @param npc - NPC component with current animation state.
 * @returns Computed limb rotations for this frame.
 */
export function computeNpcLimbRotations(npc: NpcComponent): NpcLimbRotations {
  const t = npc.animProgress;

  if (npc.currentAnim === "walk") {
    const { armSwing, legSwing, bodyBob } = animations.walk;
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
      torsoY: 0,
      headSway: 0,
      armGesture: 0,
    };
  }

  if (npc.currentAnim === "idle") {
    const { bodyBob, headTurn } = animations.idle;
    return {
      ...ZERO_ROTATIONS,
      // Smooth sine for breathing (not abs — oscillates up and down)
      torsoY: Math.sin(t * bodyBob.frequency) * bodyBob.amplitude,
      headSway: Math.sin(t * headTurn.frequency) * headTurn.maxAngle,
    };
  }

  if (npc.currentAnim === "talk") {
    const { bodyBob, headTurn, armSwing } = animations.talk;
    return {
      ...ZERO_ROTATIONS,
      torsoY: Math.sin(t * bodyBob.frequency) * bodyBob.amplitude,
      headSway: Math.sin(t * headTurn.frequency) * headTurn.maxAngle,
      armGesture: Math.sin(t * armSwing.frequency) * armSwing.maxAngle,
    };
  }

  return ZERO_ROTATIONS;
}
