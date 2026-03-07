/**
 * Toast notification system.
 *
 * Module-level observable store for toast messages. Components subscribe
 * via useToasts(). Each toast auto-expires after 3000ms.
 *
 * Kept framework-free so it can be imported from game systems, stores,
 * and pure utilities without pulling in React.
 */

export type ToastType = "success" | "error" | "info" | "reward" | "achievement" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Module-level store
// ---------------------------------------------------------------------------

/** Current active toasts. Mutated in-place; subscribers notified via callbacks. */
let toasts: Toast[] = [];

type Listener = (toasts: Toast[]) => void;
const listeners = new Set<Listener>();

function notify(): void {
  const snapshot = [...toasts];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Show a toast notification. Auto-expires after 3000ms.
 *
 * @param message - Text to display.
 * @param type    - Visual style variant.
 */
export function showToast(
  message: string,
  type: ToastType = "info",
): void {
  const id = `toast-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const toast: Toast = { id, message, type, timestamp: Date.now() };

  toasts = [...toasts, toast];
  notify();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3000);
}

/**
 * Subscribe to toast changes. Returns an unsubscribe function.
 * Useful for imperative consumers (non-React).
 */
export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get a snapshot of current toasts (non-reactive).
 */
export function getToasts(): Toast[] {
  return [...toasts];
}

/**
 * Reset toast state. Only for use in test environments.
 * Clears all toasts and notifies subscribers.
 */
export function _resetToastsForTesting(): void {
  toasts = [];
  notify();
}

/**
 * React hook — returns current toasts array and re-renders on change.
 * Import React lazily to avoid crashing in pure-TS test environments.
 */
export function useToasts(): Toast[] {
  // Lazy React import so this module stays importable in non-React contexts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useState, useEffect } = require("react") as typeof import("react");

  const [current, setCurrent] = useState<Toast[]>(() => [...toasts]);

  useEffect(() => {
    const unsub = subscribeToasts(setCurrent);
    return unsub;
  }, []);

  return current;
}
