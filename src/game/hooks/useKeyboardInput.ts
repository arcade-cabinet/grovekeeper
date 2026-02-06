import { useCallback, useEffect, useRef } from "react";

/**
 * Convert a set of pressed keys to isometric world movement vector.
 *
 * Spec §13 WASD -> Isometric:
 *   inputX = (D ? 1 : 0) - (A ? 1 : 0)
 *   inputY = (W ? 1 : 0) - (S ? 1 : 0)
 *   worldX = inputX - inputY
 *   worldZ = -(inputX + inputY)
 *   Normalize if magnitude > 1
 */
export function keysToIsometric(keys: Set<string>): { x: number; z: number } {
  const inputX =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const inputY =
    (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
    (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

  if (inputX === 0 && inputY === 0) return { x: 0, z: 0 };

  let worldX = inputX - inputY;
  let worldZ = -(inputX + inputY);

  // Normalize if diagonal
  const mag = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (mag > 1) {
    worldX /= mag;
    worldZ /= mag;
  }

  return { x: worldX, z: worldZ };
}

interface KeyboardInputCallbacks {
  onMove: (x: number, z: number) => void;
  onMoveEnd: () => void;
  onAction: () => void;
  onOpenSeeds: () => void;
  onPause: () => void;
  onSelectTool: (index: number) => void;
  /** When true, all keyboard input is ignored (e.g. during dialogs/pause). */
  disabled?: boolean;
}

/**
 * Hook that captures WASD/arrow keys + action keys.
 * Returns nothing — calls callbacks directly.
 */
export function useKeyboardInput(callbacks: KeyboardInputCallbacks): void {
  const keysDown = useRef(new Set<string>());
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const updateMovement = useCallback(() => {
    const iso = keysToIsometric(keysDown.current);
    if (iso.x === 0 && iso.z === 0) {
      callbacksRef.current.onMoveEnd();
    } else {
      callbacksRef.current.onMove(iso.x, iso.z);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Allow Escape/P through even when disabled (to unpause)
      if (callbacksRef.current.disabled && key !== "escape" && key !== "p") {
        return;
      }

      // Movement keys
      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
      ) {
        e.preventDefault();
        keysDown.current.add(key);
        updateMovement();
        return;
      }

      // Action: Space or Enter
      if (key === " " || key === "enter") {
        e.preventDefault();
        callbacksRef.current.onAction();
        return;
      }

      // Seed selector: E
      if (key === "e") {
        e.preventDefault();
        callbacksRef.current.onOpenSeeds();
        return;
      }

      // Pause: Escape or P
      if (key === "escape" || key === "p") {
        e.preventDefault();
        callbacksRef.current.onPause();
        return;
      }

      // Tool selection: 1-8
      const num = Number.parseInt(key);
      if (num >= 1 && num <= 8) {
        e.preventDefault();
        callbacksRef.current.onSelectTool(num - 1);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.current.delete(key);
      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
      ) {
        updateMovement();
      }
    };

    // Clear keys on focus loss
    const handleBlur = () => {
      keysDown.current.clear();
      callbacksRef.current.onMoveEnd();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [updateMovement]);
}
