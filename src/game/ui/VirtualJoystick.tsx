import { useCallback, useRef } from "react";
import { hapticLight } from "../systems/platform";

interface VirtualJoystickProps {
  movementRef: React.RefObject<{ x: number; z: number }>;
  onActiveChange?: (active: boolean) => void;
}

const BASE_SIZE = 120;
const KNOB_SIZE = 52;
const MAX_RADIUS = (BASE_SIZE - KNOB_SIZE) / 2; // 34px
const DEAD_ZONE = 5; // ~15% of maxRadius

export const VirtualJoystick = ({
  movementRef,
  onActiveChange,
}: VirtualJoystickProps) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number>(-1);
  const centerRef = useRef({ x: 0, y: 0 });

  const resetKnob = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transition = "transform 150ms ease-out";
      knobRef.current.style.transform = "translate(-50%, -50%)";
    }
    if (movementRef.current) {
      movementRef.current.x = 0;
      movementRef.current.z = 0;
    }
  }, [movementRef]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Single pointer only
      if (activePointerRef.current !== -1) return;
      activePointerRef.current = e.pointerId;

      // Capture pointer for reliable tracking
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // May fail in some environments
      }

      // Record center of the base ring
      if (baseRef.current) {
        const rect = baseRef.current.getBoundingClientRect();
        centerRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      // Remove spring transition during active drag
      if (knobRef.current) {
        knobRef.current.style.transition = "none";
      }

      onActiveChange?.(true);
      hapticLight();
    },
    [onActiveChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;

      const dx = e.clientX - centerRef.current.x;
      const dy = e.clientY - centerRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < DEAD_ZONE) {
        // Inside dead zone — zero output, center knob
        if (knobRef.current) {
          knobRef.current.style.transform = "translate(-50%, -50%)";
        }
        if (movementRef.current) {
          movementRef.current.x = 0;
          movementRef.current.z = 0;
        }
        return;
      }

      const clampedDist = Math.min(dist, MAX_RADIUS);
      const magnitude = (clampedDist - DEAD_ZONE) / (MAX_RADIUS - DEAD_ZONE);
      const nx = dx / dist;
      const ny = dy / dist;

      // Write movement (invert Y for world Z)
      if (movementRef.current) {
        movementRef.current.x = nx * magnitude;
        movementRef.current.z = -(ny * magnitude);
      }

      // Position knob via direct DOM mutation (no React re-render)
      if (knobRef.current) {
        const knobX = nx * clampedDist;
        const knobY = ny * clampedDist;
        knobRef.current.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      }
    },
    [movementRef],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      activePointerRef.current = -1;
      resetKnob();
      onActiveChange?.(false);
    },
    [resetKnob, onActiveChange],
  );

  return (
    <div
      ref={baseRef}
      className="md:hidden pointer-events-auto"
      style={{
        position: "fixed",
        bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        left: "calc(24px + env(safe-area-inset-left, 0px))",
        width: BASE_SIZE,
        height: BASE_SIZE,
        zIndex: "var(--gk-z-joystick)" as unknown as number,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Base ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(245, 240, 227, 0.85)",
          border: "3px solid #5D4037",
          boxShadow:
            "0 4px 12px rgba(26, 58, 42, 0.15), inset 0 0 0 8px rgba(93, 64, 55, 0.06)",
        }}
      >
        {/* Cardinal dots — N/S/E/W compass hints */}
        {[
          { top: 6, left: "50%", transform: "translateX(-50%)" },
          { bottom: 6, left: "50%", transform: "translateX(-50%)" },
          { left: 6, top: "50%", transform: "translateY(-50%)" },
          { right: 6, top: "50%", transform: "translateY(-50%)" },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(93, 64, 55, 0.3)",
              ...pos,
            }}
          />
        ))}
      </div>

      {/* Knob */}
      <div
        ref={knobRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #4A7C59, #2D6A4F)",
          border: "2px solid #3E2723",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 3px rgba(255,255,255,0.25)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
