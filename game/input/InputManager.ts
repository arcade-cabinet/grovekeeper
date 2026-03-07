/**
 * InputManager -- Unified input polling system (Spec §23)
 *
 * Game code NEVER reads raw events. It reads an InputFrame per tick,
 * merged from all registered providers.
 *
 * Architecture: game/input/InputManager.ts
 * See docs/architecture/input-system.md for full spec.
 */

// ──────────────────────────────────────────────
// InputFrame -- per-tick snapshot of all input
// ──────────────────────────────────────────────

export interface InputFrame {
  /** Strafe: -1 = left, +1 = right (normalized, clamped to unit circle with moveZ) */
  moveX: number;
  /** Forward/back: -1 = backward, +1 = forward (normalized, clamped to unit circle with moveX) */
  moveZ: number;
  /** Yaw delta in radians this frame */
  lookDeltaX: number;
  /** Pitch delta in radians this frame */
  lookDeltaY: number;
  /** Jump action */
  jump: boolean;
  /** Interact action (NPC talk, structure activate) */
  interact: boolean;
  /** Tool swap: -1 = prev slot, 0 = no change, +1 = next slot */
  toolSwap: number;
  /** Sprint modifier */
  sprint: boolean;
}

function emptyFrame(): InputFrame {
  return {
    moveX: 0,
    moveZ: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    jump: false,
    interact: false,
    toolSwap: 0,
    sprint: false,
  };
}

// ──────────────────────────────────────────────
// IInputProvider -- implemented by each input source
// ──────────────────────────────────────────────

export interface IInputProvider {
  readonly type: string;
  enabled: boolean;
  /** Returns this provider's contribution for the current frame. */
  poll(dt: number): Partial<InputFrame>;
  /** Called after the frame is consumed -- reset accumulators (look deltas, etc). */
  postFrame(): void;
  /** Returns false if the provider's device is unavailable (e.g. no gamepad). */
  isAvailable(): boolean;
  dispose(): void;
}

// ──────────────────────────────────────────────
// InputManager -- merges providers into one InputFrame
// ──────────────────────────────────────────────

export class InputManager {
  private providers: IInputProvider[] = [];
  private currentFrame: InputFrame = emptyFrame();

  register(provider: IInputProvider): void {
    this.providers.push(provider);
  }

  unregister(provider: IInputProvider): void {
    this.providers = this.providers.filter((p) => p !== provider);
  }

  /**
   * Poll all providers and merge into one InputFrame.
   * Merge rules per arch spec:
   *   - Movement: sum, clamp to unit circle
   *   - Look deltas: sum
   *   - Booleans (jump, interact, sprint): OR
   *   - toolSwap: first non-zero wins
   */
  poll(dt: number): InputFrame {
    const frame = emptyFrame();

    for (const provider of this.providers) {
      if (!provider.enabled || !provider.isAvailable()) continue;

      const partial = provider.poll(dt);

      if (partial.moveX !== undefined) frame.moveX += partial.moveX;
      if (partial.moveZ !== undefined) frame.moveZ += partial.moveZ;
      if (partial.lookDeltaX !== undefined) frame.lookDeltaX += partial.lookDeltaX;
      if (partial.lookDeltaY !== undefined) frame.lookDeltaY += partial.lookDeltaY;
      if (partial.jump) frame.jump = true;
      if (partial.interact) frame.interact = true;
      if (partial.sprint) frame.sprint = true;
      if (partial.toolSwap !== undefined && partial.toolSwap !== 0 && frame.toolSwap === 0) {
        frame.toolSwap = partial.toolSwap;
      }
    }

    // Clamp movement to unit circle
    const mag = Math.sqrt(frame.moveX * frame.moveX + frame.moveZ * frame.moveZ);
    if (mag > 1) {
      frame.moveX /= mag;
      frame.moveZ /= mag;
    }

    this.currentFrame = frame;
    return frame;
  }

  /** Call after consuming the frame each tick to let providers reset accumulators. */
  postFrame(): void {
    for (const provider of this.providers) {
      if (provider.enabled) provider.postFrame();
    }
  }

  /** Returns the frame from the last poll(). Returns zeroed frame before first poll. */
  getFrame(): InputFrame {
    return this.currentFrame;
  }

  dispose(): void {
    for (const provider of this.providers) {
      provider.dispose();
    }
    this.providers = [];
  }
}

/** Shared singleton for game code. Providers register at app init. */
export const inputManager = new InputManager();
