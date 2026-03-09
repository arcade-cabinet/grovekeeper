/**
 * Toast system tests (Spec §UI).
 *
 * Covers:
 * - showToast adds entry to store
 * - auto-expiry removes toast after 3000ms
 * - subscribeToasts notifies listeners
 * - getToasts returns snapshot
 */

import { _resetToastsForTesting, getToasts, showToast, subscribeToasts } from "./Toast.ts";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
  // Reset module-level toast state so tests don't bleed into each other
  _resetToastsForTesting();
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

describe("showToast (Spec §UI)", () => {
  it("adds a toast to the store", () => {
    showToast("Hello!", "success");
    const toasts = getToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.message).toBe("Hello!");
    expect(toasts[0]?.type).toBe("success");
  });

  it("assigns a unique id to each toast", () => {
    showToast("A", "info");
    showToast("B", "info");
    const toasts = getToasts();
    expect(toasts).toHaveLength(2);
    expect(toasts[0]?.id).not.toBe(toasts[1]?.id);
  });

  it("defaults type to 'info' when not specified", () => {
    showToast("Default type");
    const toasts = getToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.type).toBe("info");
  });

  it("records a timestamp", () => {
    const before = Date.now();
    showToast("Timestamp test", "reward");
    const toasts = getToasts();
    expect(toasts[0]?.timestamp).toBeGreaterThanOrEqual(before);
  });

  it("supports all toast types without throwing", () => {
    const types = ["success", "error", "info", "reward", "achievement", "warning"] as const;
    for (const type of types) {
      expect(() => showToast(`Test ${type}`, type)).not.toThrow();
    }
  });
});

describe("auto-expiry (Spec §UI)", () => {
  it("removes the toast after 3000ms", () => {
    showToast("Expiring toast", "info");
    expect(getToasts()).toHaveLength(1);

    jest.advanceTimersByTime(3000);

    expect(getToasts()).toHaveLength(0);
  });

  it("does not remove the toast before 3000ms", () => {
    showToast("Still here", "success");

    jest.advanceTimersByTime(2999);

    const toasts = getToasts();
    const found = toasts.find((t) => t.message === "Still here");
    expect(found).toBeDefined();
  });

  it("each toast expires independently", () => {
    showToast("First", "info");
    jest.advanceTimersByTime(1000);
    showToast("Second", "info");

    // At t=3000: First expires (added at t=0), Second (added at t=1000) expires at t=4000
    jest.advanceTimersByTime(2000);
    const after3s = getToasts();
    expect(after3s.find((t) => t.message === "First")).toBeUndefined();
    expect(after3s.find((t) => t.message === "Second")).toBeDefined();
  });
});

describe("subscribeToasts (Spec §UI)", () => {
  it("calls listener when a toast is added", () => {
    const listener = jest.fn();
    const unsub = subscribeToasts(listener);

    showToast("Subscribed toast", "success");

    expect(listener).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ message: "Subscribed toast" })]),
    );

    unsub();
  });

  it("calls listener when a toast expires", () => {
    const listener = jest.fn();
    const unsub = subscribeToasts(listener);

    showToast("Expiring", "info");
    listener.mockClear();

    jest.advanceTimersByTime(3000);

    // After expiry, listener should be called with empty array
    expect(listener).toHaveBeenCalledWith([]);

    unsub();
  });

  it("stops calling listener after unsubscribe", () => {
    const listener = jest.fn();
    const unsub = subscribeToasts(listener);
    unsub();
    listener.mockClear();

    showToast("Should not notify", "info");

    expect(listener).not.toHaveBeenCalled();
  });
});
