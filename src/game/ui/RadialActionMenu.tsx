/**
 * RadialActionMenu — Circular arrangement of action buttons around
 * the projected selection ring center.
 *
 * Actions are placed on a circle of RING_RADIUS pixels, starting from
 * the top (12 o'clock). The entire ring shifts inward when near viewport
 * edges. Dismissed by tapping the invisible backdrop.
 */

import { useEffect } from "react";
import { COLORS } from "../constants/config";
import type { RadialAction } from "./radialActions";

const RING_RADIUS = 70; // px from center to button center
const BUTTON_SIZE = 52; // px — above 44px minimum touch target
const EDGE_PADDING = 8; // px from viewport edge

interface Props {
  /** CSS pixel coordinate of the ring center. */
  centerX: number;
  centerY: number;
  actions: RadialAction[];
  onSelect: (actionId: string) => void;
  onDismiss: () => void;
}

export const RadialActionMenu = ({
  centerX,
  centerY,
  actions,
  onSelect,
  onDismiss,
}: Props) => {
  // Document-level Escape key listener (reliable regardless of focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  if (actions.length === 0) return null;

  // Viewport clamping: shift center so all buttons stay inside the screen
  const pad = RING_RADIUS + BUTTON_SIZE / 2 + EDGE_PADDING;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = Math.min(Math.max(centerX, pad), vw - pad);
  const cy = Math.min(Math.max(centerY, pad), vh - pad);

  return (
    <>
      {/* Invisible backdrop for dismissal */}
      <div
        role="button"
        tabIndex={-1}
        className="fixed inset-0 z-40"
        onClick={onDismiss}
      />

      {/* Radial buttons */}
      {actions.map((action, i) => {
        const angle = (2 * Math.PI * i) / actions.length - Math.PI / 2;
        const x = cx + Math.cos(angle) * RING_RADIUS - BUTTON_SIZE / 2;
        const y = cy + Math.sin(angle) * RING_RADIUS - BUTTON_SIZE / 2;

        return (
          <button
            key={action.id}
            className="fixed z-50 flex flex-col items-center justify-center rounded-full shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:transition-transform active:scale-90 touch-manipulation"
            style={{
              left: x,
              top: y,
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              background: `${action.color}e0`,
              border: `2px solid ${COLORS.soilDark}`,
              animationDelay: `${i * 40}ms`,
              animationFillMode: "backwards",
            }}
            onClick={() => onSelect(action.id)}
          >
            <span className="text-lg leading-none">{action.icon}</span>
          </button>
        );
      })}

      {/* Labels below each button (separate layer to avoid clipping) */}
      {actions.map((action, i) => {
        const angle = (2 * Math.PI * i) / actions.length - Math.PI / 2;
        const x = cx + Math.cos(angle) * RING_RADIUS;
        const y = cy + Math.sin(angle) * RING_RADIUS + BUTTON_SIZE / 2 + 2;

        return (
          <span
            key={`label-${action.id}`}
            className="fixed z-50 text-[10px] font-semibold text-white text-center pointer-events-none motion-safe:animate-in motion-safe:fade-in"
            style={{
              left: x,
              top: y,
              transform: "translateX(-50%)",
              textShadow: `0 1px 3px ${COLORS.soilDark}`,
              animationDelay: `${i * 40 + 20}ms`,
              animationFillMode: "backwards",
            }}
          >
            {action.label}
          </span>
        );
      })}
    </>
  );
};
