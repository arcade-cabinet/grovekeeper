import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InputManager } from "./InputManager";
import type { InputManagerConfig, InputManagerCallbacks } from "./InputManager";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockCanvas(): HTMLCanvasElement {
  const listeners: Record<string, ((e: Event) => void)[]> = {};
  return {
    addEventListener: vi.fn((type: string, fn: (e: Event) => void) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: (e: Event) => void) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((f) => f !== fn);
      }
    }),
    setPointerCapture: vi.fn(),
    // Expose for dispatching
    __listeners: listeners,
    __dispatch(type: string, e: Event) {
      for (const fn of listeners[type] ?? []) fn(e);
    },
  } as unknown as HTMLCanvasElement & {
    __listeners: Record<string, ((e: Event) => void)[]>;
    __dispatch: (type: string, e: Event) => void;
  };
}

function createMockConfig(
  overrides?: Partial<InputManagerConfig>,
): InputManagerConfig & {
  canvas: ReturnType<typeof createMockCanvas>;
  callbacks: InputManagerCallbacks;
} {
  const canvas = createMockCanvas();
  const callbacks: InputManagerCallbacks = {
    onAction: vi.fn(),
    onOpenSeeds: vi.fn(),
    onPause: vi.fn(),
    onSelectTool: vi.fn(),
  };
  const movementRef = { current: { x: 0, z: 0 } };

  return {
    canvas,
    movementRef,
    callbacks,
    getScene: () => null,
    getGridCells: () => [],
    getWorldBounds: () => ({ minX: 0, minZ: 0, maxX: 12, maxZ: 12 }),
    getPlayerWorldPos: () => ({ x: 5, z: 5 }),
    getPlayerTile: () => ({ x: 5, z: 5 }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InputManager", () => {
  let mgr: InputManager;
  let config: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    mgr = new InputManager();
    config = createMockConfig();
  });

  afterEach(() => {
    mgr.dispose();
  });

  it("starts in idle mode", () => {
    expect(mgr.getMode()).toBe("idle");
  });

  it("registers event listeners on init", () => {
    mgr.init(config);
    expect(config.canvas.addEventListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
    );
    expect(config.canvas.addEventListener).toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
    );
    expect(config.canvas.addEventListener).toHaveBeenCalledWith(
      "pointerup",
      expect.any(Function),
    );
  });

  it("removes event listeners on dispose", () => {
    mgr.init(config);
    mgr.dispose();
    expect(config.canvas.removeEventListener).toHaveBeenCalled();
  });

  describe("keyboard input", () => {
    beforeEach(() => {
      mgr.init(config);
    });

    it("WASD keys set movement vector", () => {
      // Press 'w'
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", bubbles: true }),
      );
      expect(config.movementRef.current.x).not.toBe(0);

      // Release 'w'
      window.dispatchEvent(
        new KeyboardEvent("keyup", { key: "w", bubbles: true }),
      );
      expect(config.movementRef.current).toEqual({ x: 0, z: 0 });
    });

    it("enters keyboard mode on WASD", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", bubbles: true }),
      );
      expect(mgr.getMode()).toBe("keyboard");
    });

    it("returns to idle on key release", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", bubbles: true }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keyup", { key: "d", bubbles: true }),
      );
      expect(mgr.getMode()).toBe("idle");
    });

    it("space triggers onAction", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true }),
      );
      expect(config.callbacks.onAction).toHaveBeenCalledTimes(1);
    });

    it("e triggers onOpenSeeds", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "e", bubbles: true }),
      );
      expect(config.callbacks.onOpenSeeds).toHaveBeenCalledTimes(1);
    });

    it("escape triggers onPause", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      expect(config.callbacks.onPause).toHaveBeenCalledTimes(1);
    });

    it("number keys trigger onSelectTool", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "3", bubbles: true }),
      );
      expect(config.callbacks.onSelectTool).toHaveBeenCalledWith(2); // 0-indexed
    });

    it("ignores keys when disabled (except Escape/P)", () => {
      mgr.setDisabled(true);
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", bubbles: true }),
      );
      expect(config.movementRef.current).toEqual({ x: 0, z: 0 });

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      expect(config.callbacks.onPause).toHaveBeenCalledTimes(1);
    });

    it("ignores keys when target is input field", () => {
      // jsdom doesn't allow overriding Event.target via Object.assign,
      // so we verify the guard exists by dispatching from an actual input element
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      // Dispatch keydown from the input — it will bubble to window,
      // and e.target will be the input element
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", bubbles: true }),
      );
      // Movement should not change because target is an input element
      expect(config.movementRef.current).toEqual({ x: 0, z: 0 });
      document.body.removeChild(input);
    });
  });

  describe("disabled state", () => {
    beforeEach(() => {
      mgr.init(config);
    });

    it("clears movement on disable", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", bubbles: true }),
      );
      expect(config.movementRef.current.x).not.toBe(0);

      mgr.setDisabled(true);
      expect(config.movementRef.current).toEqual({ x: 0, z: 0 });
      expect(mgr.getMode()).toBe("idle");
    });

    it("re-enables correctly", () => {
      mgr.setDisabled(true);
      mgr.setDisabled(false);

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", bubbles: true }),
      );
      expect(mgr.getMode()).toBe("keyboard");
    });
  });

  describe("blur handling", () => {
    it("resets to idle on blur", () => {
      mgr.init(config);
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", bubbles: true }),
      );
      expect(mgr.getMode()).toBe("keyboard");

      window.dispatchEvent(new Event("blur"));
      expect(mgr.getMode()).toBe("idle");
      expect(config.movementRef.current).toEqual({ x: 0, z: 0 });
    });
  });

  describe("path following via update()", () => {
    it("returns to idle when no path is active", () => {
      mgr.init(config);
      mgr.update(); // no-op when idle
      expect(mgr.getMode()).toBe("idle");
    });
  });

  describe("cancelPath", () => {
    it("is safe to call when no path active", () => {
      mgr.init(config);
      expect(() => mgr.cancelPath()).not.toThrow();
    });
  });
});
