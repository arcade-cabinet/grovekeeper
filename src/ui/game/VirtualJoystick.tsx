import type { JSX } from "solid-js";
import { For } from "solid-js";
import { COLORS } from "@/config/config";
import { hapticLight } from "@/systems/platform";

interface VirtualJoystickProps {
  movementRef: { current: { x: number; z: number } | null };
  onActiveChange?: (active: boolean) => void;
}

const BASE_SIZE = 120;
const KNOB_SIZE = 52;
const MAX_RADIUS = (BASE_SIZE - KNOB_SIZE) / 2;
const DEAD_ZONE = 5;

export const VirtualJoystick = (props: VirtualJoystickProps) => {
  let baseRef: HTMLDivElement | undefined;
  let knobRef: HTMLDivElement | undefined;
  let activePointerId = -1;
  let centerX = 0;
  let centerY = 0;

  const resetKnob = () => {
    if (knobRef) {
      knobRef.style.transition = "transform 150ms ease-out";
      knobRef.style.transform = "translate(-50%, -50%)";
    }
    if (props.movementRef.current) {
      props.movementRef.current.x = 0;
      props.movementRef.current.z = 0;
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (activePointerId !== -1) return;
    activePointerId = e.pointerId;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (baseRef) {
      const rect = baseRef.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }

    if (knobRef) {
      knobRef.style.transition = "none";
    }

    props.onActiveChange?.(true);
    hapticLight();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DEAD_ZONE) {
      if (knobRef) knobRef.style.transform = "translate(-50%, -50%)";
      if (props.movementRef.current) {
        props.movementRef.current.x = 0;
        props.movementRef.current.z = 0;
      }
      return;
    }

    const clampedDist = Math.min(dist, MAX_RADIUS);
    const magnitude = (clampedDist - DEAD_ZONE) / (MAX_RADIUS - DEAD_ZONE);
    const nx = dx / dist;
    const ny = dy / dist;

    if (props.movementRef.current) {
      props.movementRef.current.x = nx * magnitude;
      props.movementRef.current.z = -(ny * magnitude);
    }

    if (knobRef) {
      const knobX = nx * clampedDist;
      const knobY = ny * clampedDist;
      knobRef.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    activePointerId = -1;
    resetKnob();
    props.onActiveChange?.(false);
  };

  const dots: JSX.CSSProperties[] = [
    { top: "6px", left: "50%", transform: "translateX(-50%)" },
    { bottom: "6px", left: "50%", transform: "translateX(-50%)" },
    { left: "6px", top: "50%", transform: "translateY(-50%)" },
    { right: "6px", top: "50%", transform: "translateY(-50%)" },
  ];

  return (
    <div
      ref={baseRef}
      class="md:hidden pointer-events-auto"
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        left: "calc(24px + env(safe-area-inset-left, 0px))",
        width: `${BASE_SIZE}px`,
        height: `${BASE_SIZE}px`,
        "z-index": "var(--gk-z-joystick)",
        "touch-action": "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        style={{
          position: "absolute",
          inset: "0",
          "border-radius": "50%",
          background: `${COLORS.parchment}d9`,
          border: `3px solid ${COLORS.barkBrown}`,
          "box-shadow": `0 4px 12px rgba(26, 58, 42, 0.15), inset 0 0 0 8px ${COLORS.barkBrown}10`,
        }}
      >
        <For each={dots}>
          {(pos) => (
            <div
              style={{
                position: "absolute",
                width: "4px",
                height: "4px",
                "border-radius": "50%",
                background: `${COLORS.barkBrown}50`,
                ...pos,
              }}
            />
          )}
        </For>
      </div>

      <div
        ref={knobRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${KNOB_SIZE}px`,
          height: `${KNOB_SIZE}px`,
          "border-radius": "50%",
          background: `linear-gradient(135deg, ${COLORS.leafLight}, ${COLORS.forestGreen})`,
          border: `2px solid ${COLORS.soilDark}`,
          "box-shadow": `0 2px 8px ${COLORS.soilDark}40, inset 0 1px 3px rgba(255,255,255,0.25)`,
          "pointer-events": "none",
        }}
      />
    </div>
  );
};
