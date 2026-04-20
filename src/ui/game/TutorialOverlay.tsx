import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { COLORS } from "@/config/config";

interface Props {
  targetId: string | null;
  label: string | null;
}

export const TutorialOverlay = (props: Props) => {
  const [rect, setRect] = createSignal<DOMRect | null>(null);

  createEffect(() => {
    const id = props.targetId;
    if (!id) {
      setRect(null);
      return;
    }

    const track = () => {
      const safeId = id
        .split("")
        .filter((c) => /[a-zA-Z0-9-]/.test(c))
        .join("");
      const el = document.querySelector(`[data-tutorial-id="${safeId}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    track();
    const interval = setInterval(track, 300);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <Show when={props.targetId && rect()}>
      {(r) => {
        const viewportHeight = globalThis.innerHeight;
        const spaceBelow = viewportHeight - r().bottom;
        const labelAbove = spaceBelow < 80;
        const labelCenterX = r().left + r().width / 2;
        const viewportWidth = globalThis.innerWidth;

        return (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: "0",
              "pointer-events": "none",
              "z-index": 9999,
            }}
          >
            <style>
              {`
                @keyframes tutorialPulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.7; transform: scale(1.05); }
                }
                .tutorial-overlay-ring {
                  animation: tutorialPulse 1.5s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .tutorial-overlay-ring {
                    animation: none !important;
                  }
                }
              `}
            </style>

            <div
              class="tutorial-overlay-ring"
              style={{
                position: "absolute",
                left: `${r().left - 6}px`,
                top: `${r().top - 6}px`,
                width: `${r().width + 12}px`,
                height: `${r().height + 12}px`,
                "border-radius": "12px",
                border: `3px solid ${COLORS.autumnGold}`,
                "box-shadow": `0 0 12px ${COLORS.autumnGold}80, inset 0 0 12px ${COLORS.autumnGold}40`,
                "pointer-events": "none",
              }}
            />

            <Show when={props.label}>
              <div
                style={{
                  position: "absolute",
                  left: `${Math.max(8, Math.min(labelCenterX, viewportWidth - 8))}px`,
                  top: labelAbove
                    ? `${r().top - 44}px`
                    : `${r().bottom + 12}px`,
                  transform: "translateX(-50%)",
                  background: COLORS.soilDark,
                  color: "white",
                  padding: "6px 14px",
                  "border-radius": "8px",
                  "font-size": "13px",
                  "font-weight": 600,
                  "white-space": "nowrap",
                  "box-shadow": "0 4px 12px rgba(0,0,0,0.3)",
                  "pointer-events": "none",
                  "max-width": "90vw",
                  overflow: "hidden",
                  "text-overflow": "ellipsis",
                }}
              >
                {props.label}
              </div>
            </Show>
          </div>
        );
      }}
    </Show>
  );
};
