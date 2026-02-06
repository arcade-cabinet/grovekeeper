import nipplejs from "nipplejs";
import { useEffect, useRef } from "react";
import { COLORS } from "../constants/config";

interface JoystickProps {
  onMove: (x: number, z: number) => void;
  onEnd: () => void;
}

export const Joystick = ({ onMove, onEnd }: JoystickProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<nipplejs.JoystickManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    managerRef.current = nipplejs.create({
      zone: containerRef.current,
      mode: "static",
      position: { left: "50%", top: "50%" },
      size: 100,
      color: COLORS.forestGreen,
      restOpacity: 0.7,
      fadeTime: 100,
    });

    managerRef.current.on("move", (_evt, data) => {
      if (data.vector) {
        // Joystick X maps to scene X (left/right)
        // Joystick Y (up) maps to scene -Z (forward in isometric view)
        // The camera is at 45 degrees, so we need to rotate the input
        const angle = Math.PI / 4; // 45 degrees to match camera
        const rawX = data.vector.x;
        const rawY = data.vector.y;
        
        // Rotate input to match isometric camera orientation
        const x = rawX * Math.cos(angle) - rawY * Math.sin(angle);
        const z = -(rawX * Math.sin(angle) + rawY * Math.cos(angle));
        
        onMove(x, z);
      }
    });

    managerRef.current.on("end", () => {
      onEnd();
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [onMove, onEnd]);

  return (
    <div
      className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32"
      style={{
        background: `radial-gradient(circle, ${COLORS.soilDark}40 0%, ${COLORS.soilDark}80 100%)`,
        borderRadius: "50%",
        border: `3px solid ${COLORS.barkBrown}`,
        boxShadow: `inset 0 2px 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)`,
      }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 touch-manipulation"
        style={{ touchAction: "none" }}
      />
      {/* Inner decorative ring */}
      <div
        className="absolute inset-2 sm:inset-3 rounded-full pointer-events-none"
        style={{
          border: `2px dashed ${COLORS.forestGreen}40`,
        }}
      />
    </div>
  );
};
