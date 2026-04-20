import { For, onCleanup, onMount, Show } from "solid-js";
import { COLORS } from "@/config/config";
import type { RadialAction } from "./radialActions";

const RING_RADIUS = 70;
const BUTTON_SIZE = 52;
const EDGE_PADDING = 8;

interface Props {
  centerX: number;
  centerY: number;
  actions: RadialAction[];
  onSelect: (actionId: string) => void;
  onDismiss: () => void;
}

export const RadialActionMenu = (props: Props) => {
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  const clamped = () => {
    const pad = RING_RADIUS + BUTTON_SIZE / 2 + EDGE_PADDING;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      cx: Math.min(Math.max(props.centerX, pad), vw - pad),
      cy: Math.min(Math.max(props.centerY, pad), vh - pad),
    };
  };

  const positioned = () =>
    props.actions.map((action, i) => {
      const angle = (2 * Math.PI * i) / props.actions.length - Math.PI / 2;
      const { cx, cy } = clamped();
      return {
        action,
        i,
        x: cx + Math.cos(angle) * RING_RADIUS - BUTTON_SIZE / 2,
        y: cy + Math.sin(angle) * RING_RADIUS - BUTTON_SIZE / 2,
        labelX: cx + Math.cos(angle) * RING_RADIUS,
        labelY: cy + Math.sin(angle) * RING_RADIUS + BUTTON_SIZE / 2 + 2,
      };
    });

  return (
    <Show when={props.actions.length > 0}>
      <div
        role="button"
        tabIndex={-1}
        aria-label="Dismiss action menu"
        class="fixed inset-0 z-40"
        onClick={props.onDismiss}
      />

      <For each={positioned()}>
        {(p) => (
          <button
            class="fixed z-50 flex flex-col items-center justify-center rounded-full shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:transition-transform active:scale-90 touch-manipulation"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: `${BUTTON_SIZE}px`,
              height: `${BUTTON_SIZE}px`,
              background: `${p.action.color}e0`,
              border: `2px solid ${COLORS.soilDark}`,
              "animation-delay": `${p.i * 40}ms`,
              "animation-fill-mode": "backwards",
            }}
            onClick={() => props.onSelect(p.action.id)}
            aria-label={p.action.label}
          >
            <span class="text-lg leading-none" aria-hidden="true">{p.action.icon}</span>
          </button>
        )}
      </For>

      <For each={positioned()}>
        {(p) => (
          <span
            aria-hidden="true"
            class="fixed z-50 text-[10px] font-semibold text-white text-center pointer-events-none motion-safe:animate-in motion-safe:fade-in"
            style={{
              left: `${p.labelX}px`,
              top: `${p.labelY}px`,
              transform: "translateX(-50%)",
              "text-shadow": `0 1px 3px ${COLORS.soilDark}`,
              "animation-delay": `${p.i * 40 + 20}ms`,
              "animation-fill-mode": "backwards",
            }}
          >
            {p.action.label}
          </span>
        )}
      </For>
    </Show>
  );
};
