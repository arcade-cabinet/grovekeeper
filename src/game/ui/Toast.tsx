import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "warning" | "info" | "achievement";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 2500;

const TOAST_COLORS: Record<ToastType, { bg: string; text: string }> = {
  success: { bg: "#2D5A27", text: "#FFFFFF" },
  warning: { bg: "#FFB74D", text: "#FFFFFF" },
  info: { bg: "#64B5F6", text: "#FFFFFF" },
  achievement: { bg: "#FFD700", text: "#3E2723" },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let toastCounter = 0;

export const toastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = "info") => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    const item: ToastItem = { id, message, type, createdAt: Date.now() };

    set((state) => {
      const next = [...state.toasts, item];
      // Trim to max visible — oldest removed first
      while (next.length > MAX_VISIBLE) {
        next.shift();
      }
      return { toasts: next };
    });

    // Auto-dismiss
    setTimeout(() => {
      get().removeToast(id);
    }, AUTO_DISMISS_MS);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// ---------------------------------------------------------------------------
// Convenience helper
// ---------------------------------------------------------------------------

export const showToast = (message: string, type?: ToastType) => {
  toastStore.getState().addToast(message, type);
};

// ---------------------------------------------------------------------------
// Animated toast wrapper — handles enter/exit transitions
// ---------------------------------------------------------------------------

const TRANSITION_MS = 250;

interface AnimatedToastProps {
  item: ToastItem;
  onDismissed: (id: string) => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const AnimatedToast = ({ item, onDismissed }: AnimatedToastProps) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useRef(prefersReducedMotion());

  // Enter animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPhase("visible");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Schedule exit slightly before auto-dismiss so animation finishes in time
  useEffect(() => {
    const remaining = AUTO_DISMISS_MS - (Date.now() - item.createdAt);
    const exitDelay = Math.max(remaining - TRANSITION_MS, 0);

    timerRef.current = setTimeout(() => {
      setPhase("exit");
    }, exitDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.createdAt]);

  // After exit transition completes, tell parent to remove from DOM
  useEffect(() => {
    if (phase !== "exit") return;
    const t = setTimeout(() => onDismissed(item.id), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [phase, item.id, onDismissed]);

  const colors = TOAST_COLORS[item.type];

  const noMotion = reduceMotion.current;
  const translateY =
    noMotion ? "0px"
    : phase === "enter" ? "-20px" : phase === "exit" ? "-20px" : "0px";
  const opacity = phase === "visible" ? 1 : 0;
  const transitionCSS = noMotion
    ? "none"
    : `transform ${TRANSITION_MS}ms ease-out, opacity ${TRANSITION_MS}ms ease-out`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center pointer-events-auto"
      style={{
        background: colors.bg,
        color: colors.text,
        fontWeight: 700,
        fontSize: 14,
        lineHeight: "20px",
        padding: "8px 16px",
        borderRadius: 9999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        transform: `translateY(${translateY})`,
        opacity,
        transition: transitionCSS,
        maxWidth: "calc(100vw - 48px)",
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      onClick={() => {
        setPhase("exit");
      }}
    >
      {item.type === "achievement" && (
        <span style={{ marginRight: 6 }} aria-hidden="true">
          {"\u2728"}
        </span>
      )}
      {item.message}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Container — mount this once near the app root
// ---------------------------------------------------------------------------

export const ToastContainer = () => {
  const toasts = toastStore((s) => s.toasts);

  // Track which toasts have been removed after their exit animation
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismissed = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Clean up dismissed set when the store already removed the toast
  useEffect(() => {
    setDismissed((prev) => {
      const ids = new Set(toasts.map((t) => t.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [toasts]);

  const visible = toasts.filter((t) => !dismissed.has(t.id));

  if (visible.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
      style={{ top: 52, zIndex: 9999 }}
    >
      {visible.map((item) => (
        <AnimatedToast
          key={item.id}
          item={item}
          onDismissed={handleDismissed}
        />
      ))}
    </div>
  );
};
