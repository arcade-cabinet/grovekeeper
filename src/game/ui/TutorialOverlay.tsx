import { useEffect, useRef, useState } from "react";
import { COLORS } from "../constants/config";

interface TutorialOverlayProps {
  /** data-tutorial-id value of the target element */
  targetId: string | null;
  /** Instruction text to show near the highlight */
  label: string | null;
}

export const TutorialOverlay = ({ targetId, label }: TutorialOverlayProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!targetId) {
      setRect(null);
      return;
    }

    const track = () => {
      const el = document.querySelector(`[data-tutorial-id="${targetId}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    track();
    intervalRef.current = setInterval(track, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetId]);

  if (!targetId || !rect) return null;

  // Determine if label should go above or below the ring
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const labelAbove = spaceBelow < 80;

  // Clamp label horizontal position to stay within viewport
  const labelCenterX = rect.left + rect.width / 2;
  const viewportWidth = window.innerWidth;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <style>
        {`
          @keyframes tutorialPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        `}
      </style>

      {/* Pulsing gold ring */}
      <div
        style={{
          position: "absolute",
          left: rect.left - 6,
          top: rect.top - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: 12,
          border: `3px solid ${COLORS.autumnGold}`,
          boxShadow: `0 0 12px ${COLORS.autumnGold}80, inset 0 0 12px ${COLORS.autumnGold}40`,
          animation: "tutorialPulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Label */}
      {label && (
        <div
          style={{
            position: "absolute",
            left: Math.max(8, Math.min(labelCenterX, viewportWidth - 8)),
            top: labelAbove ? rect.top - 44 : rect.bottom + 12,
            transform: "translateX(-50%)",
            background: COLORS.soilDark,
            color: "white",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            pointerEvents: "none",
            maxWidth: "90vw",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
