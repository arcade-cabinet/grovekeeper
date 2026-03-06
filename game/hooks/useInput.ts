import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export interface InputState {
  moveDirection: { x: number; z: number };
  isTouching: boolean;
  tapPosition: { x: number; z: number } | null;
  activeKeys: Set<string>;
}

const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

/**
 * Convert a set of pressed keys to world movement vector.
 * W/ArrowUp = +Z (forward), S/ArrowDown = -Z (back)
 * D/ArrowRight = +X (right), A/ArrowLeft = -X (left)
 * Diagonal movement is normalized to magnitude 1.
 */
export function keysToWorld(keys: Set<string>): { x: number; z: number } {
  const inputX =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const inputZ =
    (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
    (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

  if (inputX === 0 && inputZ === 0) return { x: 0, z: 0 };

  let worldX = inputX;
  let worldZ = inputZ;

  const mag = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (mag > 1) {
    worldX /= mag;
    worldZ /= mag;
  }

  return { x: worldX, z: worldZ };
}

/**
 * Unified input hook. On web, listens for keyboard events (WASD/Arrow keys).
 * On native, accepts touch drag direction via setTouchDirection.
 * Returns a stable InputState that updates reactively.
 */
export function useInput() {
  const keysRef = useRef(new Set<string>());
  const [state, setState] = useState<InputState>({
    moveDirection: { x: 0, z: 0 },
    isTouching: false,
    tapPosition: null,
    activeKeys: new Set(),
  });

  const updateMovement = useCallback(() => {
    const dir = keysToWorld(keysRef.current);
    setState((prev) => {
      if (prev.moveDirection.x === dir.x && prev.moveDirection.z === dir.z) {
        return prev;
      }
      return {
        ...prev,
        moveDirection: dir,
        activeKeys: new Set(keysRef.current),
      };
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        updateMovement();
      }
    },
    [updateMovement],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        keysRef.current.delete(key);
        updateMovement();
      }
    },
    [updateMovement],
  );

  const handleBlur = useCallback(() => {
    keysRef.current.clear();
    setState((prev) => ({
      ...prev,
      moveDirection: { x: 0, z: 0 },
      isTouching: false,
      activeKeys: new Set(),
    }));
  }, []);

  // Set up keyboard listeners on web
  useEffect(() => {
    if (Platform.OS !== "web") return;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleBlur]);

  /** Set touch drag direction (called from gesture handler on native). */
  const setTouchDirection = useCallback((x: number, z: number) => {
    // Normalize if magnitude > 1
    let nx = x;
    let nz = z;
    const mag = Math.sqrt(nx * nx + nz * nz);
    if (mag > 1) {
      nx /= mag;
      nz /= mag;
    }
    setState((prev) => ({
      ...prev,
      moveDirection: { x: nx, z: nz },
      isTouching: true,
    }));
  }, []);

  /** Clear touch input (called on gesture end). */
  const clearTouch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      moveDirection:
        keysRef.current.size > 0
          ? keysToWorld(keysRef.current)
          : { x: 0, z: 0 },
      isTouching: false,
    }));
  }, []);

  /** Set a tap position in world coordinates. */
  const setTapPosition = useCallback((pos: { x: number; z: number } | null) => {
    setState((prev) => ({ ...prev, tapPosition: pos }));
  }, []);

  return {
    ...state,
    setTouchDirection,
    clearTouch,
    setTapPosition,
  };
}
