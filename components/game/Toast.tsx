import { observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { Pressable, View } from "react-native";
import Animated, { LinearTransition, SlideInUp, SlideOutUp } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

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

const TOAST_STYLES: Record<ToastType, string> = {
  success: "bg-forest-green",
  warning: "bg-autumn-gold",
  info: "bg-blue-400",
  achievement: "bg-prestige-gold",
};

const TOAST_TEXT: Record<ToastType, string> = {
  success: "text-white",
  warning: "text-white",
  info: "text-white",
  achievement: "text-soil-dark",
};

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

let toastCounter = 0;

const toastState$ = observable({ toasts: [] as ToastItem[] });

function addToast(message: string, type: ToastType = "info") {
  toastCounter += 1;
  const id = `toast-${Date.now()}-${toastCounter}`;
  const item: ToastItem = { id, message, type, createdAt: Date.now() };

  const next = [...toastState$.toasts.peek(), item];
  while (next.length > MAX_VISIBLE) {
    next.shift();
  }
  toastState$.toasts.set(next);

  setTimeout(() => {
    removeToast(id);
  }, AUTO_DISMISS_MS);
}

function removeToast(id: string) {
  toastState$.toasts.set(toastState$.toasts.peek().filter((t) => t.id !== id));
}

// ---------------------------------------------------------------------------
// Hook -- selector-compatible API for consumers
// ---------------------------------------------------------------------------

export function useToastStore<
  T = { toasts: ToastItem[]; addToast: typeof addToast; removeToast: typeof removeToast },
>(
  selector?: (state: {
    toasts: ToastItem[];
    addToast: typeof addToast;
    removeToast: typeof removeToast;
  }) => T,
): T {
  const toasts = useSelector(() => toastState$.toasts.get());
  const state = { toasts, addToast, removeToast };
  if (selector) return selector(state);
  return state as unknown as T;
}

// ---------------------------------------------------------------------------
// Convenience helper
// ---------------------------------------------------------------------------

export function showToast(message: string, type?: ToastType) {
  addToast(message, type);
}

// ---------------------------------------------------------------------------
// Toast item component
// ---------------------------------------------------------------------------

function ToastBubble({ item }: { item: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <Animated.View
      entering={SlideInUp.duration(250)}
      exiting={SlideOutUp.duration(250)}
      layout={LinearTransition.duration(200)}
    >
      <Pressable
        className={`rounded-full px-4 py-2 shadow-lg ${TOAST_STYLES[item.type]}`}
        onPress={() => removeToast(item.id)}
        accessibilityRole="alert"
      >
        <Text
          className={`text-center text-sm font-bold ${TOAST_TEXT[item.type]}`}
          numberOfLines={1}
        >
          {item.type === "achievement" ? "\u2728 " : ""}
          {item.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Container -- mount once near the app root
// ---------------------------------------------------------------------------

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 items-center gap-2"
      style={{ top: 52, zIndex: 9999 }}
      pointerEvents="box-none"
    >
      {toasts.map((item) => (
        <ToastBubble key={item.id} item={item} />
      ))}
    </View>
  );
}
