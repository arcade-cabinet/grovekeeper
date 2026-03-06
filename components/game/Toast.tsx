import { Pressable, View } from "react-native";
import Animated, {
  Layout,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";
import { create } from "zustand";
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
// Store
// ---------------------------------------------------------------------------

let toastCounter = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = "info") => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    const item: ToastItem = { id, message, type, createdAt: Date.now() };

    set((state) => {
      const next = [...state.toasts, item];
      while (next.length > MAX_VISIBLE) {
        next.shift();
      }
      return { toasts: next };
    });

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

export function showToast(message: string, type?: ToastType) {
  useToastStore.getState().addToast(message, type);
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
      layout={Layout.duration(200)}
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
