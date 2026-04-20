import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { createSimpleStore } from "@/shared/utils/simpleStore";

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

export const toastStore = createSimpleStore<{ toasts: ToastItem[] }>({
  toasts: [],
});

function addToast(message: string, type: ToastType = "info"): void {
  toastCounter += 1;
  const id = `toast-${Date.now()}-${toastCounter}`;
  const item: ToastItem = { id, message, type, createdAt: Date.now() };

  toastStore.set((state) => {
    const next = [...state.toasts, item];
    while (next.length > MAX_VISIBLE) {
      next.shift();
    }
    return { toasts: next };
  });

  setTimeout(() => {
    removeToast(id);
  }, AUTO_DISMISS_MS);
}

function removeToast(id: string): void {
  toastStore.set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  }));
}

export const showToast = (message: string, type?: ToastType) => {
  addToast(message, type);
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

const AnimatedToast = (props: AnimatedToastProps) => {
  const [phase, setPhase] = createSignal<"enter" | "visible" | "exit">("enter");
  const reduceMotion = prefersReducedMotion();

  // Enter animation on mount
  const frame = requestAnimationFrame(() => setPhase("visible"));
  onCleanup(() => cancelAnimationFrame(frame));

  // Schedule exit slightly before auto-dismiss
  const remaining = AUTO_DISMISS_MS - (Date.now() - props.item.createdAt);
  const exitDelay = Math.max(remaining - TRANSITION_MS, 0);
  const exitTimer = setTimeout(() => setPhase("exit"), exitDelay);
  onCleanup(() => clearTimeout(exitTimer));

  // After exit transition completes, tell parent to remove from DOM
  createEffect(() => {
    if (phase() !== "exit") return;
    const t = setTimeout(() => props.onDismissed(props.item.id), TRANSITION_MS);
    onCleanup(() => clearTimeout(t));
  });

  const colors = () => TOAST_COLORS[props.item.type];

  const translateY = () => {
    if (reduceMotion) return "0px";
    const p = phase();
    return p === "enter" || p === "exit" ? "-20px" : "0px";
  };
  const opacity = () => (phase() === "visible" ? 1 : 0);
  const transitionCSS = () =>
    reduceMotion
      ? "none"
      : `transform ${TRANSITION_MS}ms ease-out, opacity ${TRANSITION_MS}ms ease-out`;

  return (
    <div
      role="status"
      aria-live="polite"
      class="flex items-center justify-center pointer-events-auto"
      style={{
        background: colors().bg,
        color: colors().text,
        "font-weight": 700,
        "font-size": "14px",
        "line-height": "20px",
        padding: "8px 16px",
        "border-radius": "9999px",
        "box-shadow": "0 2px 8px rgba(0,0,0,0.25)",
        transform: `translateY(${translateY()})`,
        opacity: opacity(),
        transition: transitionCSS(),
        "max-width": "calc(100vw - 48px)",
        "text-align": "center",
        "white-space": "nowrap",
        overflow: "hidden",
        "text-overflow": "ellipsis",
      }}
      onClick={() => setPhase("exit")}
    >
      <Show when={props.item.type === "achievement"}>
        <span style={{ "margin-right": "6px" }} aria-hidden="true">
          {"\u2728"}
        </span>
      </Show>
      {props.item.message}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Container — mount this once near the app root
// ---------------------------------------------------------------------------

export const ToastContainer = () => {
  const toasts = toastStore.use((s) => s.toasts);

  const [dismissed, setDismissed] = createSignal<Set<string>>(new Set());

  const handleDismissed = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Clean up dismissed set when the store already removed the toast
  createEffect(() => {
    const ids = new Set(toasts().map((t) => t.id));
    setDismissed((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  });

  const visible = () => toasts().filter((t) => !dismissed().has(t.id));

  return (
    <Show when={visible().length > 0}>
      <div
        class="fixed left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
        style={{ top: "52px", "z-index": 9999 }}
      >
        <For each={visible()}>
          {(item) => (
            <AnimatedToast item={item} onDismissed={handleDismissed} />
          )}
        </For>
      </div>
    </Show>
  );
};
