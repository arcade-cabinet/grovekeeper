/**
 * useMouseLook — Pointer lock + mouse delta camera rotation (Spec §23).
 *
 * Clicking the canvas requests pointer lock. While locked, mouse movement
 * accumulates into yaw (left/right) and pitch (up/down) refs. Each frame,
 * the default R3F camera is rotated to match. Pitch is clamped to avoid
 * flipping upside-down.
 *
 * Rotation order "YXZ" (Three.js Euler): yaw applied first (Y), then pitch (X).
 * This is the standard FPS camera order and prevents gimbal lock artifacts.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import gridConfig from "@/config/game/grid.json" with { type: "json" };

/** Mouse sensitivity in radians per pixel. Exported for unit testing (Spec §23). */
export const MOUSE_SENSITIVITY = gridConfig.mouseSensitivity;

/** Pitch clamp in radians (±pitchClampDeg°). */
export const PITCH_CLAMP_RAD = gridConfig.pitchClampDeg * (Math.PI / 180);

/**
 * Clamps a pitch angle to ±PITCH_CLAMP_RAD.
 * Exported for unit testing without requiring R3F context.
 */
export function clampPitch(pitch: number): number {
  return Math.max(-PITCH_CLAMP_RAD, Math.min(PITCH_CLAMP_RAD, pitch));
}

/**
 * Activates pointer lock on canvas click and routes mouse deltas into
 * the default R3F camera's yaw and pitch each frame (Spec §23).
 */
export function useMouseLook(): void {
  const { camera, gl } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      canvas.requestPointerLock();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      pitchRef.current = clampPitch(pitchRef.current - e.movementY * MOUSE_SENSITIVITY);
    };

    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [gl]);

  useFrame(() => {
    camera.rotation.order = "YXZ";
    camera.rotation.y = yawRef.current;
    camera.rotation.x = pitchRef.current;
  });
}
